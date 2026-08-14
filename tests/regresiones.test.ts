/**
 * Regresiones de la revision de codigo.
 *
 * Cada prueba de aqui corresponde a un defecto que estuvo en el codigo y que
 * no daba error visible: la aplicacion seguia funcionando y el fallo solo se
 * notaba mirando el resultado. Por eso quedan fijadas.
 */

import { describe, expect, it } from 'vitest';
import { emparejar } from '../src/app/router';
import { agregarAlCarrito, carritoVacio, topeDeLinea } from '../src/domain/cart';
import { ilustracion } from '../src/ui/ilustraciones';
import type { Articulo } from '../src/domain/types';

function articulo(over: Partial<Articulo> = {}): Articulo {
  return {
    id: 'ar_prueba',
    negocioId: 'ng_1',
    localId: 'lo_1',
    nombre: 'Café',
    descripcion: '',
    categoria: 'bebidas',
    tipo: 'producto',
    precioUsd: 2,
    disponible: true,
    tiempoPrepMin: 5,
    variantes: [],
    modificadores: [],
    alergenos: [],
    ...over,
  } as Articulo;
}

describe('router: URL malformada', () => {
  // Un porcentaje suelto hacia que decodeURIComponent lanzara URIError. La
  // excepcion subia hasta el manejador de hashchange y la pantalla se
  // quedaba congelada en la vista anterior, con la URL ya cambiada.
  const malformadas = ['/v/comercio/%E0%A4%A', '/v/articulo/%', '/c/pedido/%zz', '/v/comercio/%%%'];

  for (const ruta of malformadas) {
    it(`no lanza con ${ruta}`, () => {
      expect(() => emparejar(ruta)).not.toThrow();
    });
  }

  it('sigue decodificando bien lo que si es valido', () => {
    const m = emparejar('/v/comercio/ng%20uno');
    expect(m?.params.negocioId).toBe('ng uno');
  });
});

describe('carrito: el boton "+" respeta las existencias', () => {
  // agregarAlCarrito comprobaba el stock, pero el "+" del carrito llamaba a
  // cambiarCantidad directamente y se lo saltaba: se podian poner diez
  // unidades de un articulo con tres en existencia.
  it('el tope de una linea es el stock del articulo', () => {
    const art = articulo({ stock: 3 });
    const r = agregarAlCarrito(carritoVacio(), { articulo: art, cantidad: 1, variantes: [], modificadores: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const item = r.carrito.items[0];
    expect(topeDeLinea(r.carrito, item.id, art)).toBe(3);
  });

  it('otras lineas del mismo articulo descuentan del tope', () => {
    const art = articulo({ stock: 5 });
    const uno = agregarAlCarrito(carritoVacio(), { articulo: art, cantidad: 2, variantes: [], modificadores: [] });
    expect(uno.ok).toBe(true);
    if (!uno.ok) return;
    const dos = agregarAlCarrito(uno.carrito, { articulo: art, cantidad: 1, variantes: [], modificadores: [] });
    expect(dos.ok).toBe(true);
    if (!dos.ok) return;

    // La segunda linea puede subir hasta 3: las 5 existencias menos las 2 de
    // la primera linea.
    expect(topeDeLinea(dos.carrito, dos.carrito.items[1].id, art)).toBe(3);
  });

  it('un articulo sin control de existencias no tiene tope', () => {
    const art = articulo();
    const r = agregarAlCarrito(carritoVacio(), { articulo: art, cantidad: 1, variantes: [], modificadores: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(topeDeLinea(r.carrito, r.carrito.items[0].id, art)).toBe(Infinity);
  });
});

describe('ilustraciones: la etiqueta va escapada', () => {
  // La etiqueta se arma como `Imagen de ${articulo.nombre}` y el nombre lo
  // escribe el comercio. Sin escapar, unas comillas cerraban el atributo y
  // el resto se convertia en atributos del <svg>.
  it('un nombre con comillas no inyecta atributos', () => {
    const svg = ilustracion('comida', 'x', 'w-full', 'Imagen de Cafe" onload="alert(1)" data-x="');
    // Las comillas quedan dentro del valor, no cierran el atributo: por eso
    // no aparece la secuencia `" onload="` que seria un atributo nuevo.
    expect(svg).not.toContain('" onload="');
    expect(svg).toContain('&quot;');

    // La etiqueta entera sigue siendo un unico atributo de la etiqueta <svg>.
    const abertura = svg.slice(0, svg.indexOf('>') + 1);
    expect(abertura).toContain('aria-label="Imagen de Cafe&quot; onload=&quot;alert(1)&quot; data-x=&quot;"');
  });

  it('un nombre con < no rompe el marcado', () => {
    const svg = ilustracion('comida', 'x', 'w-full', 'Pan <script>');
    expect(svg).not.toContain('<script>');
  });
});
