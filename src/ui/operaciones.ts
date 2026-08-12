/**
 * Operaciones de negocio.
 *
 * Aquí es donde las tres superficies se encuentran: todas escriben sobre el
 * mismo estado, respetando las máquinas de estado y dejando auditoría. Si el
 * operador marca un pedido listo, el visitante lo ve en su seguimiento porque
 * leen el mismo registro, no porque exista un mecanismo de sincronización.
 */

import { store } from '../data/store';
import { registrar } from '../data/audit';
import { sesion } from '../app/session';
import { conectividad } from '../net/connectivity';
import { colaSincronizacion } from '../net/sync-queue';
import { adaptadores } from '../adapters/simulados';
import {
  exigirFactura,
  exigirLiquidacion,
  exigirOrden,
  exigirPago,
} from '../domain/state-machines';
import { calcularTotales } from '../domain/money';
import type {
  EstadoOrden,
  ItemOrden,
  MetodoCumplimiento,
  MetodoPago,
  Orden,
  RoleId,
} from '../domain/types';
import { estadoUi } from './estado-ui';

function actor() {
  const u = sesion.usuario();
  const s = sesion.activa();
  return {
    id: u?.id ?? s?.usuarioId ?? 'invitado',
    nombre: u?.nombre ?? (s?.invitado ? 'Invitado' : 'Sistema'),
    rol: (u?.rol ?? s?.rol ?? 'visitante.cliente') as RoleId,
    scope: u?.scope ?? { level: 'propio' as const, ids: [] },
  };
}

function codigo(prefijo: string): string {
  const n = Math.floor(1000 + Math.random() * 8999);
  return `${prefijo}-${n}`;
}

// ------------------------------------------------------------------ Órdenes

export interface DatosCheckout {
  cumplimiento: MetodoCumplimiento;
  programadaPara?: string;
  franjaId?: string;
  clienteNombre: string;
  metodo: MetodoPago;
  referencia?: string;
  telefono?: string;
}

export async function crearOrdenDesdeCarrito(d: DatosCheckout): Promise<{ ordenId: string; estadoPago: string }> {
  const e = store.leer();
  const carrito = estadoUi.carrito;
  const local = e.locales.find((l) => l.id === carrito.localId)!;
  const tasa = e.tasaBcv.valor;
  const s = sesion.activa();

  const totales = calcularTotales(
    carrito.items.map((i) => ({
      cantidad: i.cantidad,
      precioUnitarioUsd: i.precioUnitarioUsd,
      extrasUsd:
        i.seleccionVariantes.reduce((a, x) => a + x.deltaUsd, 0) +
        i.seleccionModificadores.reduce((a, x) => a + x.deltaUsd, 0),
    })),
    tasa,
  );

  const esReserva = carrito.items.some((i) => e.articulos.find((a) => a.id === i.articuloId)?.tipo === 'servicio');
  const cod = codigo(esReserva ? 'RE' : 'PE');
  const ordenId = `or_${Date.now().toString(36)}`;
  const ahora = new Date().toISOString();
  const a = actor();

  const orden: Orden = {
    id: ordenId,
    codigo: cod,
    negocioId: carrito.negocioId!,
    localId: local.id,
    parqueId: local.parqueId,
    puntoId: local.puntoId,
    clienteId: s?.invitado ? undefined : s?.usuarioId,
    clienteNombre: d.clienteNombre,
    invitado: Boolean(s?.invitado),
    canal: 'app',
    tipo: esReserva ? 'reserva' : 'pedido',
    cumplimiento: d.cumplimiento,
    programadaPara: d.programadaPara,
    franjaId: d.franjaId,
    items: carrito.items,
    estado: 'creada',
    subtotalUsd: totales.subtotalUsd,
    impuestosUsd: totales.impuestosUsd,
    descuentoUsd: 0,
    totalUsd: totales.totalUsd,
    // La tasa se congela aquí y no vuelve a recalcularse.
    tasaBcv: tasa,
    tasaBcvFecha: e.tasaBcv.fecha,
    totalVes: totales.totalVes,
    codigoRetiro: cod.replace('-', ''),
    creadaEn: ahora,
    historial: [{ en: ahora, de: null, a: 'creada', porUsuarioId: a.id, porRol: a.rol }],
  };

  const resultado = await adaptadores.banco.crearIntencion({
    ordenId,
    montoVes: totales.totalVes,
    metodo: d.metodo,
    referencia: d.referencia,
    claveIdempotencia: `idem_${ordenId}`,
  });

  store.actualizar((st) => {
    st.ordenes.push(orden);

    st.pagos.push({
      id: `pg_${ordenId}`,
      ordenId,
      metodo: d.metodo,
      estado: resultado.estado === 'fallido' ? 'fallido' : resultado.estado,
      montoVes: totales.totalVes,
      montoUsd: totales.totalUsd,
      tasaBcv: tasa,
      referencia: 'referencia' in resultado ? resultado.referencia : undefined,
      bancoEmisor: d.metodo === 'efectivo' ? undefined : 'Banco Demo Nacional',
      adaptador: resultado.adaptador,
      claveIdempotencia: `idem_${ordenId}`,
      creadoEn: ahora,
      confirmadoEn: resultado.estado === 'confirmado' ? ahora : undefined,
      historial: [{ en: ahora, de: null, a: resultado.estado, porUsuarioId: a.id, porRol: a.rol }],
    });

    // La orden solo pasa a esperar aceptación si el pago no falló.
    const o = st.ordenes.find((x) => x.id === ordenId)!;
    if (resultado.estado !== 'fallido') {
      exigirOrden(o.estado, 'pendiente_aceptacion');
      o.estado = 'pendiente_aceptacion';
      o.historial.push({ en: ahora, de: 'creada', a: 'pendiente_aceptacion', porUsuarioId: a.id, porRol: a.rol });
    }

    // Reserva: se toma el cupo de la franja.
    if (d.franjaId) {
      const f = st.franjas.find((x) => x.id === d.franjaId);
      if (f) f.cupoTomado += orden.items.reduce((n, i) => n + i.cantidad, 0);
    }

    // Producto: baja el inventario.
    for (const it of orden.items) {
      const art = st.articulos.find((x) => x.id === it.articuloId);
      if (art && typeof art.stock === 'number') art.stock = Math.max(0, art.stock - it.cantidad);
    }

    st.notificaciones.push({
      id: `nt_${ordenId}`,
      destinatarioRol: 'comercio.operador',
      ambitoId: local.id,
      titulo: `Nuevo ${esReserva ? 'reserva' : 'pedido'} ${cod}`,
      cuerpo: `${orden.items.length} línea(s) por atender.`,
      tipo: 'orden',
      rutaDestino: `/c/pedido/${ordenId}`,
      leida: false,
      creadaEn: ahora,
    });

    registrar(st, {
      usuario: a,
      accion: 'orden.crear',
      entidad: 'orden',
      entidadId: ordenId,
      despues: { codigo: cod, totalUsd: totales.totalUsd, metodo: d.metodo },
    });
  });

  return { ordenId, estadoPago: resultado.estado };
}

/** Avance de estado de una orden, con cola cuando no hay red. */
export function avanzarOrden(ordenId: string, destino: EstadoOrden, motivo?: string): { ok: boolean; encolada?: boolean; error?: string } {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === ordenId);
  if (!orden) return { ok: false, error: 'La orden ya no existe.' };

  try {
    exigirOrden(orden.estado, destino);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Transición no permitida.' };
  }

  // Sin red, la acción operativa se encola en lugar de perderse.
  if (!conectividad.hayRed()) {
    colaSincronizacion.encolar(
      destino === 'aceptada' ? 'orden.aceptar' : destino === 'lista' ? 'orden.listo' : destino === 'entregada' ? 'orden.entregar' : 'orden.preparar',
      ordenId,
      { estado: destino },
      orden.estado,
    );
    estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
    return { ok: true, encolada: true };
  }

  const a = actor();
  store.actualizar((st) => {
    const o = st.ordenes.find((x) => x.id === ordenId)!;
    o.historial.push({ en: new Date().toISOString(), de: o.estado, a: destino, porUsuarioId: a.id, porRol: a.rol, motivo });
    o.estado = destino;
    if (destino === 'aceptada') o.operadorId = a.id;

    // Cancelar libera cupo e inventario.
    if (destino === 'cancelada') {
      if (o.franjaId) {
        const f = st.franjas.find((x) => x.id === o.franjaId);
        if (f) f.cupoTomado = Math.max(0, f.cupoTomado - o.items.reduce((n, i) => n + i.cantidad, 0));
      }
      for (const it of o.items) {
        const art = st.articulos.find((x) => x.id === it.articuloId);
        if (art && typeof art.stock === 'number') art.stock += it.cantidad;
      }
    }

    if (o.clienteId || o.invitado) {
      st.notificaciones.push({
        id: `nt_${ordenId}_${destino}`,
        destinatarioRol: 'visitante.cliente',
        destinatarioId: o.clienteId,
        titulo: `Su pedido ${o.codigo} ${destino === 'lista' ? 'está listo' : destino === 'entregada' ? 'fue entregado' : `pasó a ${destino}`}`,
        cuerpo: destino === 'lista' ? `Presente el código ${o.codigoRetiro} en el punto.` : 'Consulte el seguimiento para más detalle.',
        tipo: 'orden',
        rutaDestino: `/v/pedido/${ordenId}`,
        leida: false,
        creadaEn: new Date().toISOString(),
      });
    }

    registrar(st, {
      usuario: a, accion: `orden.${destino}`, entidad: 'orden', entidadId: ordenId,
      antes: { estado: orden.estado }, despues: { estado: destino }, motivo,
    });
  });

  return { ok: true };
}

// -------------------------------------------------------------------- Pagos

export async function verificarPago(pagoId: string): Promise<{ ok: boolean; mensaje: string }> {
  const e = store.leer();
  const pago = e.pagos.find((p) => p.id === pagoId);
  if (!pago) return { ok: false, mensaje: 'Pago no encontrado.' };

  if (!conectividad.puedePrometer('pago_confirmado')) {
    return { ok: false, mensaje: 'Sin conexión plena no puede confirmarse un pago. Quedará pendiente hasta recuperar la red.' };
  }

  const r = await adaptadores.banco.verificar(pago.referencia ?? '');
  const a = actor();

  store.actualizar((st) => {
    const p = st.pagos.find((x) => x.id === pagoId)!;
    const destino = r.estado === 'confirmado' ? 'confirmado' : 'fallido';
    exigirPago(p.estado, destino);
    p.historial.push({ en: new Date().toISOString(), de: p.estado, a: destino, porUsuarioId: a.id, porRol: a.rol });
    p.estado = destino;
    if (destino === 'confirmado') p.confirmadoEn = new Date().toISOString();
    registrar(st, { usuario: a, accion: `pago.${destino}`, entidad: 'pago', entidadId: pagoId, despues: { estado: destino } });
  });

  return {
    ok: r.estado === 'confirmado',
    mensaje: r.estado === 'confirmado' ? 'Pago confirmado por el banco simulado.' : 'El banco no reporta el movimiento.',
  };
}

// ------------------------------------------------------------------ Catálogo

export function cambiarDisponibilidad(articuloId: string, disponible: boolean): { encolada: boolean } {
  const e = store.leer();
  const art = e.articulos.find((a) => a.id === articuloId);
  if (!art) return { encolada: false };

  if (!conectividad.hayRed()) {
    colaSincronizacion.encolar('catalogo.disponibilidad', articuloId, { disponible }, String(art.disponible));
    estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
    return { encolada: true };
  }

  const a = actor();
  store.actualizar((st) => {
    const x = st.articulos.find((y) => y.id === articuloId)!;
    registrar(st, {
      usuario: a, accion: 'catalogo.disponibilidad', entidad: 'articulo', entidadId: articuloId,
      antes: { disponible: x.disponible }, despues: { disponible },
    });
    x.disponible = disponible;
  });
  return { encolada: false };
}

export function cambiarPrecio(articuloId: string, precioUsd: number, motivo: string): void {
  const a = actor();
  store.actualizar((st) => {
    const x = st.articulos.find((y) => y.id === articuloId);
    if (!x) return;
    registrar(st, {
      usuario: a, accion: 'catalogo.precio', entidad: 'articulo', entidadId: articuloId,
      antes: { precioUsd: x.precioUsd }, despues: { precioUsd }, motivo,
    });
    x.precioUsd = precioUsd;
  });
}

// --------------------------------------------------------------------- Caja

export function registrarVentaMostrador(
  localId: string,
  lineas: Array<{ articuloId: string; cantidad: number }>,
  metodo: MetodoPago,
): string {
  const e = store.leer();
  const local = e.locales.find((l) => l.id === localId)!;
  const tasa = e.tasaBcv.valor;
  const ahora = new Date().toISOString();
  const a = actor();

  const items: ItemOrden[] = lineas.map((l, i) => {
    const art = e.articulos.find((x) => x.id === l.articuloId)!;
    return {
      id: `it_${Date.now()}_${i}`,
      articuloId: art.id,
      nombre: art.nombre,
      cantidad: l.cantidad,
      precioUnitarioUsd: art.precioUsd,
      seleccionVariantes: [],
      seleccionModificadores: [],
    };
  });

  const totales = calcularTotales(
    items.map((i) => ({ cantidad: i.cantidad, precioUnitarioUsd: i.precioUnitarioUsd, extrasUsd: 0 })),
    tasa,
  );

  const cod = codigo('MO');
  const ordenId = `or_${Date.now().toString(36)}`;

  store.actualizar((st) => {
    st.ordenes.push({
      id: ordenId, codigo: cod, negocioId: local.negocioId, localId, parqueId: local.parqueId,
      puntoId: local.puntoId, clienteNombre: 'Venta de mostrador', invitado: true,
      canal: 'mostrador', tipo: 'pedido', cumplimiento: 'retiro_inmediato',
      items, estado: 'entregada',
      subtotalUsd: totales.subtotalUsd, impuestosUsd: totales.impuestosUsd, descuentoUsd: 0,
      totalUsd: totales.totalUsd, tasaBcv: tasa, tasaBcvFecha: st.tasaBcv.fecha, totalVes: totales.totalVes,
      codigoRetiro: cod.replace('-', ''), operadorId: a.id, creadaEn: ahora,
      historial: [
        { en: ahora, de: null, a: 'creada', porUsuarioId: a.id, porRol: a.rol },
        { en: ahora, de: 'creada', a: 'entregada', porUsuarioId: a.id, porRol: a.rol, motivo: 'Venta directa en mostrador' },
      ],
    });

    st.pagos.push({
      id: `pg_${ordenId}`, ordenId, metodo, estado: 'confirmado',
      montoVes: totales.totalVes, montoUsd: totales.totalUsd, tasaBcv: tasa,
      adaptador: metodo === 'efectivo' ? 'caja.local' : 'banco.simulado',
      claveIdempotencia: `idem_${ordenId}`, creadoEn: ahora, confirmadoEn: ahora,
      historial: [{ en: ahora, de: null, a: 'confirmado', porUsuarioId: a.id, porRol: a.rol }],
    });

    // El turno abierto acumula lo esperado por método: la venta de mostrador
    // entra en el mismo libro que las ventas de la aplicación.
    const turno = st.turnos.find((t) => t.localId === localId && t.estado === 'abierto');
    if (turno) turno.esperadoPorMetodo[metodo] += totales.totalVes;

    for (const it of items) {
      const art = st.articulos.find((x) => x.id === it.articuloId);
      if (art && typeof art.stock === 'number') art.stock = Math.max(0, art.stock - it.cantidad);
    }

    registrar(st, {
      usuario: a, accion: 'caja.venta_mostrador', entidad: 'orden', entidadId: ordenId,
      despues: { codigo: cod, totalUsd: totales.totalUsd, metodo },
    });
  });

  return ordenId;
}

export function abrirTurno(localId: string, fondoInicialVes: number): string {
  const a = actor();
  const id = `tn_${Date.now().toString(36)}`;
  store.actualizar((st) => {
    st.turnos.push({
      id, localId, operadorId: a.id,
      abiertoEn: new Date().toISOString(),
      fondoInicialVes,
      esperadoPorMetodo: { pago_movil: 0, transferencia: 0, tarjeta: 0, efectivo: 0 },
      estado: 'abierto',
    });
    registrar(st, { usuario: a, accion: 'caja.abrir_turno', entidad: 'turno', entidadId: id, despues: { fondoInicialVes } });
  });
  return id;
}

export function cerrarTurno(turnoId: string, efectivoDeclaradoVes: number, motivo: string): { diferencia: number } {
  const a = actor();
  let diferencia = 0;
  store.actualizar((st) => {
    const t = st.turnos.find((x) => x.id === turnoId);
    if (!t || t.estado === 'cerrado') return;
    const esperadoEfectivo = t.esperadoPorMetodo.efectivo + t.fondoInicialVes;
    diferencia = Math.round((efectivoDeclaradoVes - esperadoEfectivo) * 100) / 100;
    t.efectivoDeclaradoVes = efectivoDeclaradoVes;
    t.diferenciaVes = diferencia;
    t.responsableCierreId = a.id;
    t.cerradoEn = new Date().toISOString();
    t.estado = 'cerrado';
    registrar(st, {
      usuario: a, accion: 'caja.cerrar_turno', entidad: 'turno', entidadId: turnoId,
      despues: { efectivoDeclaradoVes, diferencia }, motivo,
    });
  });
  return { diferencia };
}

// --------------------------------------------------------------- Documentos

export function revisarDocumento(
  documentoId: string,
  resultado: 'aprobado' | 'observado',
  observacion: string,
): void {
  const a = actor();
  store.actualizar((st) => {
    const d = st.documentos.find((x) => x.id === documentoId);
    if (!d) return;
    registrar(st, {
      usuario: a, accion: `documento.${resultado}`, entidad: 'documento', entidadId: documentoId,
      antes: { estado: d.estado }, despues: { estado: resultado }, motivo: observacion,
    });
    d.estado = resultado;
    d.observacion = resultado === 'observado' ? observacion : undefined;
    d.revisadoPor = a.id;
  });
}

export function resolverExpediente(negocioId: string, decision: 'aprobado' | 'rechazado', motivo: string): void {
  const a = actor();
  store.actualizar((st) => {
    const n = st.negocios.find((x) => x.id === negocioId);
    if (!n) return;
    registrar(st, {
      usuario: a, accion: `expediente.${decision}`, entidad: 'negocio', entidadId: negocioId,
      antes: { estado: n.estado }, despues: { estado: decision }, motivo,
    });
    n.estado = decision === 'aprobado' ? 'activo' : 'rechazado';
    st.notificaciones.push({
      id: `nt_exp_${negocioId}_${Date.now()}`,
      destinatarioRol: 'comercio.propietario',
      titulo: `Expediente ${decision === 'aprobado' ? 'aprobado' : 'rechazado'}`,
      cuerpo: motivo,
      tipo: 'documento',
      leida: false,
      creadaEn: new Date().toISOString(),
    });
  });
}

export function suspenderNegocio(negocioId: string, motivo: string, evidencia: string, aprobadoPor: string): void {
  const a = actor();
  store.actualizar((st) => {
    const n = st.negocios.find((x) => x.id === negocioId);
    if (!n) return;
    registrar(st, {
      usuario: a, accion: 'negocio.suspender', entidad: 'negocio', entidadId: negocioId,
      antes: { estado: n.estado }, despues: { estado: 'suspendido' },
      motivo, evidencia, mfaVerificado: true, aprobadoPor,
    });
    n.estado = 'suspendido';
    for (const l of st.locales.filter((x) => x.negocioId === negocioId)) l.abierto = false;
  });
}

// ------------------------------------------------------------- Inspecciones

export function registrarInspeccion(
  negocioId: string,
  localId: string,
  resultado: 'conforme' | 'observado' | 'no_conforme',
  hallazgos: string[],
): string {
  const a = actor();
  const id = `in_${Date.now().toString(36)}`;
  store.actualizar((st) => {
    st.inspecciones.push({
      id, negocioId, localId, inspectorId: a.id,
      fecha: new Date().toISOString(), resultado, hallazgos,
    });
    registrar(st, {
      usuario: a, accion: 'inspeccion.registrar', entidad: 'inspeccion', entidadId: id,
      despues: { resultado, hallazgos },
    });
    if (resultado !== 'conforme') {
      st.incidencias.push({
        id: `ic_${Date.now().toString(36)}`,
        parqueId: st.locales.find((l) => l.id === localId)?.parqueId ?? '',
        negocioId, reportadaPor: a.id, tipo: 'permiso',
        descripcion: hallazgos.join('; '),
        estado: 'abierta', creadaEn: new Date().toISOString(),
      });
    }
  });
  return id;
}

// ----------------------------------------------------------------- Finanzas

export function aprobarReembolso(reembolsoId: string, motivo: string, evidencia: string, aprobadoPor?: string): void {
  const a = actor();
  store.actualizar((st) => {
    const r = st.reembolsos.find((x) => x.id === reembolsoId);
    if (!r) return;
    const p = st.pagos.find((x) => x.id === r.pagoId);
    if (p) {
      exigirPago(p.estado, 'reembolsado');
      p.historial.push({ en: new Date().toISOString(), de: p.estado, a: 'reembolsado', porUsuarioId: a.id, porRol: a.rol, motivo });
      p.estado = 'reembolsado';
    }
    r.estado = 'ejecutado';
    r.aprobadoPor = aprobadoPor ?? a.id;
    registrar(st, {
      usuario: a, accion: 'reembolso.aprobar', entidad: 'reembolso', entidadId: reembolsoId,
      despues: { montoUsd: r.montoUsd }, motivo, evidencia, mfaVerificado: true, aprobadoPor,
    });
  });
}

export function conciliarLiquidacion(liquidacionId: string): void {
  const a = actor();
  store.actualizar((st) => {
    const l = st.liquidaciones.find((x) => x.id === liquidacionId);
    if (!l) return;
    const destino = l.estado === 'calculada' ? 'por_cobrar' : l.estado === 'por_cobrar' || l.estado === 'por_pagar' ? 'conciliada' : null;
    if (!destino) return;
    exigirLiquidacion(l.estado, destino);
    l.historial.push({ en: new Date().toISOString(), de: l.estado, a: destino, porUsuarioId: a.id, porRol: a.rol });
    l.estado = destino;
    registrar(st, { usuario: a, accion: `liquidacion.${destino}`, entidad: 'liquidacion', entidadId: liquidacionId, despues: { estado: destino } });
  });
}

export function cerrarLiquidacion(liquidacionId: string, motivo: string, aprobadoPor: string): void {
  const a = actor();
  store.actualizar((st) => {
    const l = st.liquidaciones.find((x) => x.id === liquidacionId);
    if (!l) return;
    exigirLiquidacion(l.estado, 'cerrada');
    l.historial.push({ en: new Date().toISOString(), de: l.estado, a: 'cerrada', porUsuarioId: a.id, porRol: a.rol, motivo });
    l.estado = 'cerrada';
    l.cerradaEn = new Date().toISOString();
    registrar(st, {
      usuario: a, accion: 'liquidacion.cerrar', entidad: 'liquidacion', entidadId: liquidacionId,
      motivo, mfaVerificado: true, aprobadoPor,
    });
  });
}

export function crearAjuste(concepto: string, montoUsd: number, motivo: string, evidencia: string, liquidacionId?: string): void {
  const a = actor();
  store.actualizar((st) => {
    const id = `aj_${Date.now().toString(36)}`;
    st.ajustes.push({
      id, liquidacionId, concepto, montoUsd, motivo, evidencia,
      solicitadoPor: a.id, estado: 'solicitado', creadoEn: new Date().toISOString(),
    });
    registrar(st, {
      usuario: a, accion: 'ajuste.crear', entidad: 'ajuste', entidadId: id,
      despues: { concepto, montoUsd }, motivo, evidencia,
    });
  });
}

// ---------------------------------------------------------------- Facturas

export async function emitirFactura(ordenId: string): Promise<{ ok: boolean; mensaje: string }> {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === ordenId);
  if (!orden) return { ok: false, mensaje: 'Orden no encontrada.' };
  if (e.facturas.some((f) => f.ordenId === ordenId)) return { ok: false, mensaje: 'La orden ya tiene factura.' };

  if (!conectividad.puedePrometer('factura_emitida')) {
    return { ok: false, mensaje: 'Sin conexión plena no puede emitirse una factura. Quedará pendiente.' };
  }

  const negocio = e.negocios.find((n) => n.id === orden.negocioId)!;
  const r = await adaptadores.fiscal.emitir({
    ordenId, emisorRif: negocio.rif, emisorRazonSocial: negocio.razonSocial,
    baseImponibleUsd: orden.subtotalUsd, ivaUsd: orden.impuestosUsd,
    totalUsd: orden.totalUsd, totalVes: orden.totalVes, tasaBcv: orden.tasaBcv,
  });

  const a = actor();
  store.actualizar((st) => {
    st.facturas.push({
      id: `fc_${ordenId}`, ordenId, negocioId: negocio.id,
      emisorRif: negocio.rif, emisorRazonSocial: negocio.razonSocial,
      numero: r.numero, numeroControl: r.numeroControl, estado: 'pendiente',
      baseImponibleUsd: orden.subtotalUsd, ivaUsd: orden.impuestosUsd,
      totalUsd: orden.totalUsd, totalVes: orden.totalVes, tasaBcv: orden.tasaBcv,
      adaptador: r.adaptador,
    });
    const f = st.facturas.find((x) => x.id === `fc_${ordenId}`)!;
    exigirFactura(f.estado, 'emitida');
    f.estado = 'emitida';
    f.emitidaEn = r.emitidaEn;
    registrar(st, { usuario: a, accion: 'factura.emitir', entidad: 'factura', entidadId: f.id, despues: { numero: r.numero } });
  });

  return { ok: true, mensaje: `Factura ${r.numero} emitida por ${negocio.razonSocial}.` };
}

export async function emitirNotaCredito(facturaId: string, motivo: string): Promise<string> {
  const r = await adaptadores.fiscal.notaDeCredito(facturaId, motivo);
  const a = actor();
  store.actualizar((st) => {
    const f = st.facturas.find((x) => x.id === facturaId);
    if (!f) return;
    exigirFactura(f.estado, 'nota_credito');
    const nueva = {
      ...f,
      id: `fc_nc_${Date.now().toString(36)}`,
      numero: r.numero,
      numeroControl: r.numeroControl,
      estado: 'nota_credito' as const,
      emitidaEn: r.emitidaEn,
      notaDe: f.id,
      motivoNota: motivo,
    };
    st.facturas.push(nueva);
    registrar(st, {
      usuario: a, accion: 'factura.nota_credito', entidad: 'factura', entidadId: nueva.id,
      antes: { facturaOriginal: f.numero }, despues: { numero: r.numero }, motivo, evidencia: 'solicitud-cliente.pdf',
    });
  });
  return r.numero;
}

// ------------------------------------------------------------------ Disputas

export function abrirReclamo(ordenId: string, motivo: string, descripcion: string): string {
  const a = actor();
  const id = `ds_${Date.now().toString(36)}`;
  store.actualizar((st) => {
    const o = st.ordenes.find((x) => x.id === ordenId);
    st.disputas.push({
      id, ordenId, clienteId: o?.clienteId, motivo, descripcion,
      estado: 'abierta', slaHoras: 48, creadaEn: new Date().toISOString(),
    });
    st.notificaciones.push({
      id: `nt_${id}`, destinatarioRol: 'inparques.soporte',
      titulo: `Nuevo reclamo sobre ${o?.codigo ?? ordenId}`,
      cuerpo: motivo, tipo: 'disputa', rutaDestino: `/i/disputa/${id}`,
      leida: false, creadaEn: new Date().toISOString(),
    });
    registrar(st, { usuario: a, accion: 'disputa.abrir', entidad: 'disputa', entidadId: id, despues: { motivo } });
  });
  return id;
}

export function resolverDisputa(disputaId: string, resultado: 'resuelta_favor_cliente' | 'resuelta_favor_comercio', motivo: string): void {
  const a = actor();
  store.actualizar((st) => {
    const d = st.disputas.find((x) => x.id === disputaId);
    if (!d) return;
    registrar(st, {
      usuario: a, accion: 'disputa.resolver', entidad: 'disputa', entidadId: disputaId,
      antes: { estado: d.estado }, despues: { estado: resultado }, motivo,
    });
    d.estado = resultado;
    d.agenteId = a.id;
  });
}

export function valorar(ordenId: string, estrellas: number, comentario: string): void {
  const a = actor();
  store.actualizar((st) => {
    const o = st.ordenes.find((x) => x.id === ordenId);
    if (!o) return;
    st.valoraciones.push({
      id: `vl_${Date.now().toString(36)}`, ordenId, negocioId: o.negocioId,
      estrellas, comentario, creadaEn: new Date().toISOString(),
    });
    registrar(st, { usuario: a, accion: 'valoracion.crear', entidad: 'orden', entidadId: ordenId, despues: { estrellas } });
  });
}

// ------------------------------------------------------- Cuenta bancaria

export function cambiarCuentaBancaria(
  negocioId: string,
  datos: { banco: string; numero: string; titular: string },
  motivo: string,
  evidencia: string,
  aprobadoPor: string,
): void {
  const a = actor();
  store.actualizar((st) => {
    const c = st.cuentasBancarias.find((x) => x.negocioId === negocioId);
    if (!c) return;
    registrar(st, {
      usuario: a, accion: 'bancario.cambiar_cuenta', entidad: 'cuenta_bancaria', entidadId: c.id,
      // La auditoría guarda los últimos cuatro dígitos, nunca el número entero.
      antes: { banco: c.banco, ultimos4: c.numero.slice(-4) },
      despues: { banco: datos.banco, ultimos4: datos.numero.slice(-4) },
      motivo, evidencia, mfaVerificado: true, aprobadoPor,
    });
    c.banco = datos.banco;
    c.numero = datos.numero;
    c.titular = datos.titular;
    c.verificada = false;
    c.actualizadaEn = new Date().toISOString();
  });
}

export function marcarNotificacionesLeidas(): void {
  const rol = sesion.rol();
  const s = sesion.activa();
  if (!rol) return;
  store.actualizar((st) => {
    for (const n of st.notificaciones) {
      if (n.destinatarioRol === rol && (!n.destinatarioId || n.destinatarioId === s?.usuarioId)) n.leida = true;
    }
  });
}
