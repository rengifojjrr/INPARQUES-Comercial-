/**
 * Pertenencia: "¿esto es tuyo?".
 *
 * Era el hueco mas grande y no lo cubria ninguna prueba: las 88 que habia
 * ejercitaban carrito, permisos, maquinas de estado y conectividad, pero
 * ninguna tocaba una escritura. Por eso un operador podia escribir la URL del
 * pedido de otro comercio, verlo entero y moverlo de estado, con el historial
 * firmado a su nombre, sin que nada chillara.
 *
 * Se prueba contra el dominio, sin navegador: `alcanzaOrden` es la funcion
 * por la que pasan tanto las vistas (para devolver 403) como las operaciones
 * (para negarse a escribir).
 */

import { describe, expect, it } from 'vitest';
import { construirEstadoInicial } from '../src/data/seed';
import { alcanzaOrden, alcanzaLocalDe, alcanzaNegocioDe, instalarRegistroInvitado } from '../src/domain/ownership';
import { clientePuedeCancelar } from '../src/domain/state-machines';
import type { Orden, User } from '../src/domain/types';

const estado = construirEstadoInicial();
const usuario = (id: string): User => estado.usuarios.find((u) => u.id === id)!;
const orden = (id: string): Orden => estado.ordenes.find((o) => o.id === id)!;

// Pedidos de dos comercios distintos del mismo parque.
const DE_CEDROS = orden('or_1001');       // local lc_cedros_jc
const DE_AVENTURAS = orden('or_1004');    // local lc_aventuras_lg

describe('un comercio no alcanza los pedidos de otro', () => {
  it('el operador de Café Los Cedros no alcanza el pedido de Aventuras del Lago', () => {
    const op = usuario('us_operador_cedros');
    expect(alcanzaOrden(op, DE_CEDROS, estado)).toBe(true);
    expect(alcanzaOrden(op, DE_AVENTURAS, estado)).toBe(false);
  });

  it('el propietario alcanza todo su negocio, y solo el suyo', () => {
    const prop = usuario('us_prop_cedros');
    expect(alcanzaOrden(prop, DE_CEDROS, estado)).toBe(true);
    expect(alcanzaOrden(prop, DE_AVENTURAS, estado)).toBe(false);
  });

  it('tampoco alcanza sus locales ni su negocio', () => {
    const op = usuario('us_operador_cedros');
    expect(alcanzaLocalDe(op, 'lc_aventuras_lg', estado)).toBe(false);
    expect(alcanzaNegocioDe(op, 'ng_aventuras', estado)).toBe(false);
  });
});

describe('los roles institucionales alcanzan por ambito', () => {
  it('el administrador de parque alcanza los pedidos de su parque', () => {
    const admin = usuario('us_admin_parque');
    expect(alcanzaOrden(admin, DE_CEDROS, estado)).toBe(true);
    expect(alcanzaOrden(admin, DE_AVENTURAS, estado)).toBe(true);
  });

  it('un rol nacional alcanza cualquiera', () => {
    expect(alcanzaOrden(usuario('us_superadmin'), DE_AVENTURAS, estado)).toBe(true);
    expect(alcanzaOrden(usuario('us_finanzas'), DE_AVENTURAS, estado)).toBe(true);
  });
});

describe('el visitante solo alcanza lo suyo', () => {
  it('alcanza el pedido que hizo con su cuenta', () => {
    const v = usuario('us_visitante');
    expect(DE_CEDROS.clienteId).toBe('us_visitante');
    expect(alcanzaOrden(v, DE_CEDROS, estado)).toBe(true);
  });

  it('no alcanza un pedido de invitado que no hizo el', () => {
    // El pedido PE-1002 es de invitado; su codigo de retiro es lo que se
    // presenta para llevarse la comida, asi que no puede quedar a la vista.
    const deOtroInvitado = orden('or_1002');
    expect(deOtroInvitado.invitado).toBe(true);
    instalarRegistroInvitado(() => false);
    expect(alcanzaOrden(usuario('us_visitante'), deOtroInvitado, estado, true)).toBe(false);
    expect(alcanzaOrden(null, deOtroInvitado, estado, true)).toBe(false);
  });

  it('un invitado alcanza el pedido que hizo en este dispositivo', () => {
    const suyo = orden('or_1002');
    instalarRegistroInvitado((id) => id === suyo.id);
    expect(alcanzaOrden(null, suyo, estado, true)).toBe(true);
    // Y sigue sin alcanzar el de otro.
    instalarRegistroInvitado(() => false);
    expect(alcanzaOrden(null, suyo, estado, true)).toBe(false);
  });

  it('sin sesion no alcanza nada', () => {
    expect(alcanzaOrden(null, DE_CEDROS, estado)).toBe(false);
  });
});

describe('hasta donde cancela el propio cliente', () => {
  it('puede mientras el comercio no haya aceptado', () => {
    expect(clientePuedeCancelar('creada')).toBe(true);
    expect(clientePuedeCancelar('pendiente_aceptacion')).toBe(true);
  });

  it('no puede una vez que hay trabajo hecho', () => {
    for (const estadoOrden of ['aceptada', 'preparando', 'lista', 'entregada', 'cancelada'] as const) {
      expect(clientePuedeCancelar(estadoOrden)).toBe(false);
    }
  });
});
