import { describe, expect, it } from 'vitest';
import {
  agregarAlCarrito,
  cambiarCantidad,
  carritoVacio,
  quitarDelCarrito,
  reiniciarCon,
  totalesCarrito,
  unidadesEnCarrito,
} from '../src/domain/cart';
import { construirEstadoInicial } from '../src/data/seed';
import type { Articulo } from '../src/domain/types';

const estado = construirEstadoInicial();
const art = (id: string): Articulo => estado.articulos.find((a) => a.id === id)!;

const sel = (id: string, cantidad = 1, modificadores: Array<{ modificadorId: string; opcionId: string }> = []) => ({
  articulo: art(id),
  cantidad,
  variantes: [],
  modificadores,
});

const CACHITO = [{ modificadorId: 'md_calentar', opcionId: 'op_caliente' }];

describe('regla de un solo comercio por carrito', () => {
  it('acepta articulos del mismo comercio', () => {
    let c = carritoVacio();
    const r1 = agregarAlCarrito(c, sel('ar_cafe_guayoyo'));
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    c = r1.carrito;

    const r2 = agregarAlCarrito(c, sel('ar_cachito', 1, CACHITO));
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(unidadesEnCarrito(r2.carrito)).toBe(2);
  });

  it('rechaza un articulo de otro comercio e informa cuales son', () => {
    const r1 = agregarAlCarrito(carritoVacio(), sel('ar_cafe_guayoyo'));
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const r2 = agregarAlCarrito(r1.carrito, sel('ar_rompecabezas'));
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.razon).toBe('otro_comercio');
    if (r2.razon === 'otro_comercio') {
      expect(r2.negocioActual).toBe('ng_cedros');
      expect(r2.negocioNuevo).toBe('ng_orinoco');
    }
  });

  it('vaciar y comenzar de nuevo deja solo el articulo nuevo', () => {
    const r = reiniciarCon(sel('ar_rompecabezas'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.carrito.negocioId).toBe('ng_orinoco');
    expect(r.carrito.items).toHaveLength(1);
  });

  it('el carrito vuelve a quedar libre de comercio al vaciarse', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_cafe_guayoyo'));
    if (!r.ok) throw new Error('no se agrego');
    const vacio = quitarDelCarrito(r.carrito, r.carrito.items[0].id);
    expect(vacio.negocioId).toBeNull();

    const otro = agregarAlCarrito(vacio, sel('ar_rompecabezas'));
    expect(otro.ok).toBe(true);
  });
});

describe('disponibilidad e inventario', () => {
  it('rechaza un articulo marcado como agotado', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_tequeyoyo'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.razon).toBe('no_disponible');
  });

  it('no permite superar el stock disponible', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_papagayo', 5));
    expect(r.ok).toBe(false);
    if (!r.ok && r.razon === 'sin_stock') expect(r.disponible).toBe(3);
  });

  it('cuenta lo que ya esta en el carrito al validar el stock', () => {
    const r1 = agregarAlCarrito(carritoVacio(), sel('ar_papagayo', 2));
    if (!r1.ok) throw new Error('no se agrego');
    const r2 = agregarAlCarrito(r1.carrito, sel('ar_papagayo', 2));
    expect(r2.ok).toBe(false);
    if (!r2.ok && r2.razon === 'sin_stock') expect(r2.disponible).toBe(1);
  });

  it('exige los modificadores obligatorios', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_cachito', 1, []));
    expect(r.ok).toBe(false);
    if (!r.ok && r.razon === 'modificador_obligatorio') expect(r.modificador).toBe('Preparacion');
  });
});

describe('totales del carrito', () => {
  it('separa subtotal, impuesto y total, y calcula el monto en bolivares', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_cafe_guayoyo', 2));
    if (!r.ok) throw new Error('no se agrego');
    const t = totalesCarrito(r.carrito, 50);
    expect(t.subtotalUsd).toBe(2.4);
    expect(t.impuestosUsd).toBe(0.38);
    expect(t.totalUsd).toBe(2.78);
    expect(t.totalVes).toBe(139);
  });

  it('cambiar la cantidad a cero retira la linea', () => {
    const r = agregarAlCarrito(carritoVacio(), sel('ar_cafe_guayoyo'));
    if (!r.ok) throw new Error('no se agrego');
    const c = cambiarCantidad(r.carrito, r.carrito.items[0].id, 0);
    expect(c.items).toHaveLength(0);
  });
});
