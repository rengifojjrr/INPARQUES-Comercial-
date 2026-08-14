/**
 * Carrito del visitante.
 *
 * Regla beta (documento, seccion 04): "Un carrito solo puede contener
 * articulos de un comercio." No existe carrito multicomercio ni delivery.
 *
 * Cuando el visitante intenta agregar un articulo de otro comercio, el
 * carrito no decide por su cuenta: devuelve `conflicto` y la interfaz abre el
 * modal previsto para conservar el carrito actual o vaciarlo y comenzar uno
 * nuevo.
 */

import type { Articulo, ItemOrden, MetodoCumplimiento } from './types';
import { calcularTotales, redondear } from './money';
import { identificador } from './ids';

export interface Carrito {
  negocioId: string | null;
  localId: string | null;
  items: ItemOrden[];
  cumplimiento: MetodoCumplimiento;
  programadaPara?: string;
  franjaId?: string;
}

export function carritoVacio(): Carrito {
  return { negocioId: null, localId: null, items: [], cumplimiento: 'retiro_inmediato' };
}

export interface SeleccionArticulo {
  articulo: Articulo;
  cantidad: number;
  variantes: Array<{ varianteId: string; opcionId: string }>;
  modificadores: Array<{ modificadorId: string; opcionId: string }>;
  notas?: string;
}

export type ResultadoAgregar =
  | { ok: true; carrito: Carrito }
  | { ok: false; razon: 'otro_comercio'; negocioActual: string; negocioNuevo: string }
  | { ok: false; razon: 'no_disponible' }
  | { ok: false; razon: 'sin_stock'; disponible: number }
  | { ok: false; razon: 'modificador_obligatorio'; modificador: string };

export function agregarAlCarrito(carrito: Carrito, sel: SeleccionArticulo): ResultadoAgregar {
  const { articulo } = sel;

  if (!articulo.disponible) return { ok: false, razon: 'no_disponible' };

  if (carrito.negocioId && carrito.negocioId !== articulo.negocioId) {
    return {
      ok: false,
      razon: 'otro_comercio',
      negocioActual: carrito.negocioId,
      negocioNuevo: articulo.negocioId,
    };
  }

  if (typeof articulo.stock === 'number') {
    const yaEnCarrito = carrito.items
      .filter((i) => i.articuloId === articulo.id)
      .reduce((s, i) => s + i.cantidad, 0);
    if (yaEnCarrito + sel.cantidad > articulo.stock) {
      return { ok: false, razon: 'sin_stock', disponible: Math.max(0, articulo.stock - yaEnCarrito) };
    }
  }

  for (const m of articulo.modificadores) {
    if (m.obligatorio && !sel.modificadores.some((s) => s.modificadorId === m.id)) {
      return { ok: false, razon: 'modificador_obligatorio', modificador: m.nombre };
    }
  }

  const seleccionVariantes = sel.variantes.map((s) => {
    const v = articulo.variantes.find((x) => x.id === s.varianteId)!;
    const o = v.opciones.find((x) => x.id === s.opcionId)!;
    return { varianteId: v.id, opcionId: o.id, nombre: `${v.nombre}: ${o.nombre}`, deltaUsd: o.deltaUsd };
  });

  const seleccionModificadores = sel.modificadores.map((s) => {
    const m = articulo.modificadores.find((x) => x.id === s.modificadorId)!;
    const o = m.opciones.find((x) => x.id === s.opcionId)!;
    return { modificadorId: m.id, opcionId: o.id, nombre: o.nombre, deltaUsd: o.deltaUsd };
  });

  const item: ItemOrden = {
    id: identificador('it'),
    articuloId: articulo.id,
    nombre: articulo.nombre,
    cantidad: sel.cantidad,
    precioUnitarioUsd: articulo.precioUsd,
    seleccionVariantes,
    seleccionModificadores,
    notas: sel.notas,
  };

  return {
    ok: true,
    carrito: {
      ...carrito,
      negocioId: articulo.negocioId,
      localId: articulo.localId,
      items: [...carrito.items, item],
    },
  };
}

/** Vaciar y comenzar uno nuevo: la segunda opcion del modal de conflicto. */
export function reiniciarCon(sel: SeleccionArticulo): ResultadoAgregar {
  return agregarAlCarrito(carritoVacio(), sel);
}

export function quitarDelCarrito(carrito: Carrito, itemId: string): Carrito {
  const items = carrito.items.filter((i) => i.id !== itemId);
  if (items.length === 0) return { ...carritoVacio(), cumplimiento: carrito.cumplimiento };
  return { ...carrito, items };
}

export function cambiarCantidad(carrito: Carrito, itemId: string, cantidad: number): Carrito {
  if (cantidad <= 0) return quitarDelCarrito(carrito, itemId);
  return {
    ...carrito,
    items: carrito.items.map((i) => (i.id === itemId ? { ...i, cantidad } : i)),
  };
}

/**
 * Tope al que puede subir una linea del carrito sin pasarse de las
 * existencias.
 *
 * `agregarAlCarrito` ya comprueba el stock, pero el boton "+" del carrito
 * llamaba a `cambiarCantidad` directamente y se saltaba la regla: se podian
 * poner diez unidades de un articulo con tres en existencia. Peor aun, al
 * crear la orden el inventario baja con `Math.max(0, ...)` y al cancelarla
 * vuelve a sumar la cantidad pedida, asi que la operacion inventaba
 * existencias que nunca hubo.
 *
 * Devuelve `Infinity` cuando el articulo no lleva control de existencias
 * (servicios, preparados al momento), que es el caso normal.
 */
export function topeDeLinea(
  carrito: Carrito,
  itemId: string,
  articulo: Pick<Articulo, 'id' | 'stock'> | undefined,
): number {
  if (!articulo || typeof articulo.stock !== 'number') return Infinity;
  // Otras lineas del mismo articulo ya consumen parte de las existencias.
  const otras = carrito.items
    .filter((i) => i.id !== itemId && i.articuloId === articulo.id)
    .reduce((s, i) => s + i.cantidad, 0);
  return Math.max(0, articulo.stock - otras);
}

export function extrasDeItem(item: ItemOrden): number {
  const v = item.seleccionVariantes.reduce((s, x) => s + x.deltaUsd, 0);
  const m = item.seleccionModificadores.reduce((s, x) => s + x.deltaUsd, 0);
  return redondear(v + m);
}

export function totalesCarrito(carrito: Carrito, tasa: number, descuentoUsd = 0) {
  return calcularTotales(
    carrito.items.map((i) => ({
      cantidad: i.cantidad,
      precioUnitarioUsd: i.precioUnitarioUsd,
      extrasUsd: extrasDeItem(i),
    })),
    tasa,
    descuentoUsd,
  );
}

export function unidadesEnCarrito(carrito: Carrito): number {
  return carrito.items.reduce((s, i) => s + i.cantidad, 0);
}
