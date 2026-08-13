/**
 * Despachador de acciones.
 *
 * Un único escuchador delegado en el documento: cada control lleva
 * `data-accion` y opcionalmente `data-valor`. Ningún botón queda sin destino,
 * y añadir uno nuevo no exige registrar oyentes.
 */

import { store } from '../data/store';
import { sesion, CLAVE_DEMO } from '../app/session';
import { router, inicioDeRol } from '../app/router';
import { conectividad } from '../net/connectivity';
import { colaSincronizacion } from '../net/sync-queue';
import { adaptadores } from '../adapters/simulados';
import { estadoUi, fijarCarrito, fijarFiltro, fijarTexto, vaciarCarrito } from './estado-ui';
import { agregarAlCarrito, cambiarCantidad, quitarDelCarrito, reiniciarCon } from '../domain/cart';
import { validarAccion } from '../domain/sensitive-actions';
import * as op from './operaciones';
import { esc } from './componentes';
import { formatearUsd } from '../domain/money';
import { alternarCajon } from './stitch-shell';
import type { EstadoOrden, MetodoPago } from '../domain/types';

type Repintar = () => void;

let repintar: Repintar = () => {};

export function configurarAcciones(fn: Repintar): void {
  repintar = fn;
  document.addEventListener('click', alPulsar);
  document.addEventListener('input', alEscribir);
  document.addEventListener('submit', alEnviar);
  document.addEventListener('keydown', alTeclear);
}

// ------------------------------------------------------------------- Avisos

export function brindis(texto: string, error = false): void {
  const previo = document.querySelector('.brindis');
  previo?.remove();
  const el = document.createElement('div');
  el.className = `brindis${error ? ' brindis--error' : ''}`;
  el.setAttribute('role', 'status');
  el.textContent = texto;
  document.body.appendChild(el);
  const anuncios = document.getElementById('anuncios');
  if (anuncios) anuncios.textContent = texto;
  setTimeout(() => el.remove(), 3600);
}

export interface OpcionesHoja {
  titulo: string;
  cuerpo: string;
  confirmar: string;
  accionConfirmar: string;
  valor?: string;
  peligro?: boolean;
}

/** Hoja inferior de confirmación: sube desde abajo, alcanzable con el pulgar. */
export function abrirHoja(o: OpcionesHoja): void {
  cerrarHoja();
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.id = 'hoja-activa';
  velo.setAttribute('role', 'dialog');
  velo.setAttribute('aria-modal', 'true');
  velo.setAttribute('aria-label', o.titulo);
  velo.innerHTML = `
    <div class="hoja">
      <div class="hoja__asa" aria-hidden="true"></div>
      <h2 class="hoja__tit">${esc(o.titulo)}</h2>
      <div class="hoja__cuerpo">${o.cuerpo}</div>
      <div class="hoja__pie">
        <button class="bt ${o.peligro ? 'bt--peligro' : 'bt--principal'} bt--bloque"
          data-accion="${esc(o.accionConfirmar)}"${o.valor !== undefined ? ` data-valor="${esc(o.valor)}"` : ''}>${esc(o.confirmar)}</button>
        <button class="bt bt--secundario bt--bloque" data-accion="cerrar-hoja">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(velo);
  velo.addEventListener('click', (ev) => {
    if (ev.target === velo) cerrarHoja();
  });
  velo.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
}

export function cerrarHoja(): void {
  document.getElementById('hoja-activa')?.remove();
}

function valorCampo(nombre: string): string {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${nombre}"]`);
  return el?.value.trim() ?? '';
}

function valorRadio(nombre: string): string {
  const el = document.querySelector<HTMLInputElement>(`input[name="${nombre}"]:checked`);
  return el?.value ?? '';
}

function mostrarError(id: string, mensaje: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<p class="campo__err" role="alert">${esc(mensaje)}</p>`;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  brindis(mensaje, true);
}

// ------------------------------------------------------------------ Eventos

function alTeclear(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') cerrarHoja();
  // Las filas de tabla son pulsables: deben responder también al teclado.
  if (ev.key === 'Enter') {
    const fila = (ev.target as HTMLElement).closest<HTMLElement>('tr[data-ir]');
    if (fila?.dataset.valor) {
      ev.preventDefault();
      router.ir(fila.dataset.valor);
    }
  }
}

function alEscribir(ev: Event): void {
  const el = ev.target as HTMLInputElement;
  const accion = el.dataset.accion;
  if (!accion) return;

  const mapa: Record<string, string> = {
    buscar: 'buscar',
    'buscar-inicio': 'buscar',
    'buscar-catalogo': 'catalogo',
    'buscar-negocios': 'negocios',
    'buscar-auditoria': 'auditoria',
  };
  const clave = mapa[accion];
  if (!clave) return;

  fijarTexto(clave, el.value);
  if (accion === 'buscar-inicio' && el.value.length > 0) {
    router.ir('/v/buscar');
    return;
  }
  repintarConservandoFoco(el);
}

/** Repinta sin perder el cursor del campo activo. */
function repintarConservandoFoco(el: HTMLInputElement): void {
  const id = el.id;
  const pos = el.selectionStart;
  repintar();
  const nuevo = document.getElementById(id) as HTMLInputElement | null;
  if (nuevo) {
    nuevo.focus();
    if (pos !== null) nuevo.setSelectionRange(pos, pos);
  }
}

function alEnviar(ev: Event): void {
  const form = ev.target as HTMLFormElement;
  if (!form.dataset.formulario) return;
  ev.preventDefault();

  switch (form.dataset.formulario) {
    case 'acceso':
      acceder(form.dataset.superficie as 'visitante' | 'comercio' | 'inparques');
      break;
    case 'mfa':
      void verificarMfa();
      break;
    case 'registro':
      registrar();
      break;
    case 'qr':
      leerQr();
      break;
    case 'recuperar':
      router.ir('/acceso/recuperar/codigo');
      brindis('Código generado. En la demo no se envía correo.');
      break;
    case 'recuperar-codigo':
      if (valorCampo('codigo') === '123456') router.ir('/acceso/recuperar/nueva-clave');
      else mostrarError('error-recuperar-codigo', 'El código no es válido. En la demo es 123456.');
      break;
    case 'nueva-clave':
      cambiarClave();
      break;
    case 'activacion':
      activarComercio();
      break;
    case 'activacion-institucional':
      mostrarError('error-activacion-institucional', 'Este código no corresponde a ninguna invitación vigente. Las cuentas institucionales solo se activan con una invitación emitida por INPARQUES.');
      break;
    default:
      break;
  }
}

function alPulsar(ev: Event): void {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-accion]');
  if (!el) return;
  const accion = el.dataset.accion!;
  const valor = el.dataset.valor ?? '';
  ev.preventDefault();
  despachar(accion, valor);
}

// --------------------------------------------------------------- Despachador

function despachar(accion: string, valor: string): void {
  // Filtros y chips: `filtro-<clave>` cambia el filtro y repinta.
  if (accion.startsWith('filtro-')) {
    fijarFiltro(accion.replace('filtro-', ''), valor);
    repintar();
    return;
  }
  if (accion.startsWith('filtro-cat:')) {
    fijarFiltro(`cat-${accion.split(':')[1]}`, valor);
    repintar();
    return;
  }

  switch (accion) {
    case 'nada':
      break;

    case 'abrir-cajon':
      alternarCajon(true);
      break;

    case 'cerrar-cajon':
      alternarCajon(false);
      break;

    case 'ir':
      if (valor.startsWith('#perfil:')) {
        entrarComoPerfil(valor.replace('#perfil:', ''));
      } else if (valor && valor !== '#') {
        cerrarHoja();
        router.ir(valor);
      }
      break;

    /**
     * Carga en el formulario de acceso las credenciales de una cuenta de
     * prueba. No entra por su cuenta: quien mira la demo ve el correo y la
     * contraseña rellenados y pulsa "Ingresar", que es el mismo camino que
     * seguiría un usuario real.
     */
    case 'usar-cuenta': {
      const u = store.leer().usuarios.find((x) => x.id === valor);
      if (!u) break;
      estadoUi.seleccion['acceso-perfil'] = u.id;
      estadoUi.seleccion['acceso-correo'] = u.correo;
      estadoUi.seleccion['acceso-clave'] = CLAVE_DEMO;
      repintar();
      break;
    }

    case 'cerrar-hoja':
      cerrarHoja();
      break;

    case 'recargar':
      window.location.reload();
      break;

    case 'imprimir':
      window.print();
      break;

    case 'invitado':
      sesion.continuarComoInvitado();
      router.ir('/v');
      brindis('Puede comprar sin cuenta.');
      break;

    case 'cerrar-sesion':
      sesion.cerrar();
      vaciarCarrito();
      router.ir('/acceso');
      break;

    case 'alternar-conexion': {
      const modo = conectividad.alternarDemo();
      repintar();
      brindis(`Conexión: ${conectividad.etiqueta()}`, modo !== 'conectado');
      break;
    }

    case 'restablecer':
      abrirHoja({
        titulo: 'Restablecer la demostración',
        cuerpo: '<p class="tenue">Se borrarán los pedidos, pagos y cambios que haya hecho, y los datos volverán a su estado inicial. Esta acción no se puede deshacer.</p>',
        confirmar: 'Restablecer',
        accionConfirmar: 'confirmar-restablecer',
        peligro: true,
      });
      break;

    case 'confirmar-restablecer':
      void store.restablecer().then(() => {
        vaciarCarrito();
        cerrarHoja();
        repintar();
        brindis('Datos restablecidos.');
      });
      break;

    case 'aviso':
      brindis(valor);
      break;

    case 'leer-todo':
      op.marcarNotificacionesLeidas();
      repintar();
      brindis('Notificaciones marcadas como leídas.');
      break;

    // ----------------------------------------------------------- Carrito

    case 'cant-mas':
    case 'cant-menos': {
      const actual = Number(estadoUi.seleccion[`cant-${valor}`] ?? '1');
      const siguiente = accion === 'cant-mas' ? actual + 1 : Math.max(1, actual - 1);
      estadoUi.seleccion[`cant-${valor}`] = String(siguiente);
      repintar();
      break;
    }

    case 'agregar-carrito':
      agregarArticulo(valor);
      break;

    case 'agregar-servicio':
      agregarServicio(valor);
      break;

    case 'item-mas':
    case 'item-menos': {
      const item = estadoUi.carrito.items.find((i) => i.id === valor);
      if (!item) break;
      fijarCarrito(cambiarCantidad(estadoUi.carrito, valor, item.cantidad + (accion === 'item-mas' ? 1 : -1)));
      repintar();
      break;
    }

    case 'quitar-item':
      fijarCarrito(quitarDelCarrito(estadoUi.carrito, valor));
      repintar();
      brindis('Artículo retirado del carrito.');
      break;

    case 'limpiar-filtros':
      estadoUi.filtros = {};
      repintar();
      brindis('Filtros limpiados.');
      break;

    case 'fecha-servicio': {
      const [art, fecha] = valor.split('|');
      estadoUi.seleccion[`fecha-${art}`] = fecha;
      delete estadoUi.seleccion[`franja-${art}`];
      repintar();
      break;
    }

    case 'franja-servicio': {
      const [art, franja] = valor.split('|');
      estadoUi.seleccion[`franja-${art}`] = franja;
      repintar();
      break;
    }

    case 'conservar-carrito':
      cerrarHoja();
      router.ir('/v/carrito');
      break;

    case 'vaciar-y-agregar': {
      const r = reiniciarCon(pendienteSeleccion!);
      if (r.ok) {
        fijarCarrito(r.carrito);
        cerrarHoja();
        router.ir('/v/carrito');
        brindis('Carrito nuevo iniciado.');
      }
      break;
    }

    // ---------------------------------------------------------- Checkout

    case 'ir-pago': {
      const nombre = valorCampo('nombre');
      if (!nombre) {
        mostrarError('error-checkout', 'Indique un nombre para el pedido.');
        break;
      }
      estadoUi.seleccion['checkout-nombre'] = nombre;
      estadoUi.seleccion['checkout-cumplimiento'] = valorRadio('cumplimiento') || 'retiro_inmediato';
      router.ir('/v/checkout/pago');
      break;
    }

    case 'pagar':
      void pagar(valor as MetodoPago);
      break;

    // ------------------------------------------------------- Operación

    case 'avanzar-orden': {
      const [ordenId, destino] = valor.split('|');
      const r = op.avanzarOrden(ordenId, destino as EstadoOrden);
      repintar();
      if (!r.ok) brindis(r.error ?? 'No se pudo avanzar el pedido.', true);
      else if (r.encolada) brindis('Sin conexión: la acción quedó en la cola de sincronización.');
      else brindis('Pedido actualizado. El visitante ya lo ve.');
      break;
    }

    case 'cancelar-orden':
      abrirHoja({
        titulo: 'Cancelar pedido',
        cuerpo: `<p class="tenue mb-1">Indique el motivo. Quedará registrado en la bitácora y el cliente lo verá.</p>
          <textarea class="area" name="motivo-cancelar" placeholder="Motivo de la cancelación…" required></textarea>`,
        confirmar: 'Cancelar pedido',
        accionConfirmar: 'confirmar-cancelar',
        valor,
        peligro: true,
      });
      break;

    case 'confirmar-cancelar': {
      const motivo = valorCampo('motivo-cancelar');
      if (!motivo) {
        brindis('El motivo es obligatorio.', true);
        break;
      }
      const r = op.avanzarOrden(valor, 'cancelada', motivo);
      cerrarHoja();
      repintar();
      brindis(r.ok ? 'Pedido cancelado. Motivo registrado.' : r.error ?? 'No se pudo cancelar.', !r.ok);
      break;
    }

    case 'verificar-pago':
      void verificarPago(valor);
      break;

    case 'emitir-factura':
      void emitirFactura(valor);
      break;

    case 'nota-credito':
      abrirHoja({
        titulo: 'Emitir nota de crédito',
        cuerpo: `<p class="tenue mb-1">Una factura emitida no se edita ni se borra: se corrige con una nota que deja trazabilidad.</p>
          <textarea class="area" name="motivo-nota" placeholder="Motivo de la nota de crédito…" required></textarea>`,
        confirmar: 'Emitir nota',
        accionConfirmar: 'confirmar-nota',
        valor,
      });
      break;

    case 'confirmar-nota': {
      const motivo = valorCampo('motivo-nota');
      if (!motivo) {
        brindis('El motivo es obligatorio.', true);
        break;
      }
      void op.emitirNotaCredito(valor, motivo).then((n) => {
        cerrarHoja();
        repintar();
        brindis(`Nota de crédito ${n} emitida.`);
      });
      break;
    }

    case 'toggle-disponible': {
      const art = store.leer().articulos.find((a) => a.id === valor);
      if (!art) break;
      const r = op.cambiarDisponibilidad(valor, !art.disponible);
      repintar();
      brindis(
        r.encolada
          ? 'Sin conexión: el cambio quedó en cola.'
          : art.disponible
            ? 'Artículo marcado como agotado. El visitante ya no puede pedirlo.'
            : 'Artículo disponible de nuevo.',
      );
      break;
    }

    case 'toggle-abierto':
      store.actualizar((st) => {
        const l = st.locales.find((x) => x.id === valor);
        if (l) l.abierto = !l.abierto;
      });
      repintar();
      brindis('Estado del local actualizado.');
      break;

    case 'guardar-articulo':
      guardarArticulo(valor);
      break;

    // --------------------------------------------------------------- Caja

    case 'mostrador-mas':
    case 'mostrador-menos': {
      const clave = `mostrador-${valor}`;
      const actual = Number(estadoUi.seleccion[clave] ?? '0');
      const siguiente = accion === 'mostrador-mas' ? actual + 1 : Math.max(0, actual - 1);
      if (siguiente === 0) delete estadoUi.seleccion[clave];
      else estadoUi.seleccion[clave] = String(siguiente);
      repintar();
      break;
    }

    case 'registrar-mostrador':
      registrarMostrador(valor);
      break;

    case 'confirmar-abrir-turno': {
      const local = valorRadio('local') || valorCampo('local');
      const fondo = Number(valorCampo('fondo'));
      if (!local || Number.isNaN(fondo) || fondo < 0) {
        mostrarError('error-abrir-turno', 'Indique un fondo inicial válido.');
        break;
      }
      op.abrirTurno(local, fondo);
      router.ir('/c/caja');
      brindis('Turno abierto.');
      break;
    }

    case 'confirmar-cerrar-turno': {
      const declarado = Number(valorCampo('declarado'));
      const motivo = valorCampo('motivo');
      if (Number.isNaN(declarado)) {
        mostrarError('error-cerrar-turno', 'Indique el efectivo contado.');
        break;
      }
      if (!motivo) {
        mostrarError('error-cerrar-turno', 'El motivo del cierre es obligatorio.');
        break;
      }
      const { diferencia } = op.cerrarTurno(valor, declarado, motivo);
      router.ir('/c/caja');
      brindis(diferencia === 0 ? 'Turno cerrado sin diferencia.' : `Turno cerrado con diferencia de ${diferencia.toFixed(2)} Bs.`, diferencia !== 0);
      break;
    }

    // ---------------------------------------------------- Documentación

    case 'aprobar-documento':
      op.revisarDocumento(valor, 'aprobado', 'Documento conforme');
      repintar();
      brindis('Documento aprobado.');
      break;

    case 'observar-documento':
      abrirHoja({
        titulo: 'Observar documento',
        cuerpo: `<p class="tenue mb-1">El comercio verá la observación y podrá cargar una nueva versión.</p>
          <textarea class="area" name="obs" placeholder="Qué debe corregirse…" required></textarea>`,
        confirmar: 'Registrar observación',
        accionConfirmar: 'confirmar-observar',
        valor,
      });
      break;

    case 'confirmar-observar': {
      const obs = valorCampo('obs');
      if (!obs) {
        brindis('La observación es obligatoria.', true);
        break;
      }
      op.revisarDocumento(valor, 'observado', obs);
      cerrarHoja();
      repintar();
      brindis('Documento observado. El comercio fue notificado.');
      break;
    }

    case 'aprobar-expediente':
      abrirHoja({
        titulo: 'Aprobar expediente',
        cuerpo: `<p class="tenue mb-1">El negocio quedará activo y podrá publicar su catálogo. Indique el motivo de la decisión.</p>
          <textarea class="area" name="motivo-exp" placeholder="Documentación completa y conforme…" required></textarea>`,
        confirmar: 'Aprobar',
        accionConfirmar: 'confirmar-aprobar-expediente',
        valor,
      });
      break;

    case 'confirmar-aprobar-expediente': {
      const motivo = valorCampo('motivo-exp');
      if (!motivo) {
        brindis('El motivo es obligatorio.', true);
        break;
      }
      op.resolverExpediente(valor, 'aprobado', motivo);
      cerrarHoja();
      router.ir('/i/solicitudes');
      brindis('Expediente aprobado. El negocio ya puede operar.');
      break;
    }

    case 'rechazar-expediente':
      abrirHoja({
        titulo: 'Rechazar expediente',
        cuerpo: `<textarea class="area" name="motivo-exp" placeholder="Motivo del rechazo…" required></textarea>`,
        confirmar: 'Rechazar',
        accionConfirmar: 'confirmar-rechazar-expediente',
        valor,
        peligro: true,
      });
      break;

    case 'confirmar-rechazar-expediente': {
      const motivo = valorCampo('motivo-exp');
      if (!motivo) {
        brindis('El motivo es obligatorio.', true);
        break;
      }
      op.resolverExpediente(valor, 'rechazado', motivo);
      cerrarHoja();
      router.ir('/i/solicitudes');
      brindis('Expediente rechazado.');
      break;
    }

    case 'suspender-negocio':
      abrirHoja({
        titulo: 'Suspender negocio',
        cuerpo: `<p class="tenue mb-1">Acción sensible: exige motivo, evidencia, verificación en dos pasos y una segunda aprobación.</p>
          <textarea class="area mb-1" name="motivo-susp" placeholder="Motivo de la suspensión…" required></textarea>
          <input class="entrada mb-1" name="evidencia-susp" placeholder="Documento de respaldo (p. ej. acta-inspeccion.pdf)" value="acta-inspeccion.pdf" />
          <input class="entrada" name="mfa-susp" inputmode="numeric" placeholder="Código de verificación (123456)" />`,
        confirmar: 'Suspender',
        accionConfirmar: 'confirmar-suspender',
        valor,
        peligro: true,
      });
      break;

    case 'confirmar-suspender':
      confirmarSuspension(valor);
      break;

    // -------------------------------------------------------- Finanzas

    case 'conciliar':
      op.conciliarLiquidacion(valor);
      repintar();
      brindis('Liquidación actualizada.');
      break;

    case 'cerrar-liquidacion':
      abrirHoja({
        titulo: 'Cerrar liquidación',
        cuerpo: `<p class="tenue mb-1">Un cierre es inmutable: después solo se corrige con un ajuste. Exige motivo, verificación y segunda aprobación.</p>
          <textarea class="area mb-1" name="motivo-cierre" placeholder="Cierre mensual conforme…" required></textarea>
          <input class="entrada" name="mfa-cierre" inputmode="numeric" placeholder="Código de verificación (123456)" />`,
        confirmar: 'Cerrar liquidación',
        accionConfirmar: 'confirmar-cerrar-liquidacion',
        valor,
      });
      break;

    case 'confirmar-cerrar-liquidacion': {
      const motivo = valorCampo('motivo-cierre');
      const mfa = valorCampo('mfa-cierre');
      const rol = sesion.rol()!;
      const val = validarAccion({
        accion: 'liquidacion.cerrar',
        rol,
        motivo,
        mfaVerificado: mfa === '123456',
        aprobadoPor: { usuarioId: 'us_superadmin', rol: 'inparques.superadmin' },
      });
      if (!val.ok) {
        brindis(val.mensaje, true);
        break;
      }
      op.cerrarLiquidacion(valor, motivo, 'us_superadmin');
      cerrarHoja();
      repintar();
      brindis('Liquidación cerrada. Solo admite ajustes desde ahora.');
      break;
    }

    case 'aprobar-reembolso': {
      const r = store.leer().reembolsos.find((x) => x.id === valor);
      abrirHoja({
        titulo: 'Aprobar reembolso',
        cuerpo: `<p class="tenue mb-1">${r && r.montoUsd >= 50 ? `Monto de ${esc(formatearUsd(r.montoUsd))}: por superar el umbral exige doble aprobación.` : 'Indique motivo y evidencia.'}</p>
          <textarea class="area mb-1" name="motivo-reem" placeholder="Motivo del reembolso…" required></textarea>
          <input class="entrada mb-1" name="evidencia-reem" placeholder="Evidencia" value="soporte-caso.pdf" />
          <input class="entrada" name="mfa-reem" inputmode="numeric" placeholder="Código de verificación (123456)" />`,
        confirmar: 'Aprobar reembolso',
        accionConfirmar: 'confirmar-reembolso',
        valor,
      });
      break;
    }

    case 'confirmar-reembolso':
      confirmarReembolso(valor);
      break;

    case 'nuevo-ajuste':
    case 'solicitar-ajuste':
      abrirHoja({
        titulo: 'Registrar ajuste',
        cuerpo: `<p class="tenue mb-1">Los cierres no se editan: las correcciones se registran como ajuste con motivo y evidencia.</p>
          <input class="entrada mb-1" name="concepto-aj" placeholder="Concepto del ajuste" required />
          <input class="entrada mb-1" name="monto-aj" inputmode="decimal" placeholder="Monto en USD" required />
          <textarea class="area mb-1" name="motivo-aj" placeholder="Motivo…" required></textarea>
          <input class="entrada" name="evidencia-aj" placeholder="Evidencia" value="soporte-ajuste.pdf" />`,
        confirmar: 'Registrar',
        accionConfirmar: 'confirmar-ajuste',
      });
      break;

    case 'confirmar-ajuste': {
      const concepto = valorCampo('concepto-aj');
      const monto = Number(valorCampo('monto-aj'));
      const motivo = valorCampo('motivo-aj');
      const evidencia = valorCampo('evidencia-aj');
      if (!concepto || Number.isNaN(monto) || !motivo || !evidencia) {
        brindis('Concepto, monto, motivo y evidencia son obligatorios.', true);
        break;
      }
      op.crearAjuste(concepto, monto, motivo, evidencia);
      cerrarHoja();
      repintar();
      brindis('Ajuste registrado con trazabilidad.');
      break;
    }

    // --------------------------------------------------------- Soporte

    case 'resolver-disputa': {
      const [id, aFavor] = valor.split('|');
      abrirHoja({
        titulo: `Resolver a favor del ${aFavor}`,
        cuerpo: `<textarea class="area" name="motivo-disp" placeholder="Fundamento de la resolución…" required></textarea>`,
        confirmar: 'Resolver',
        accionConfirmar: 'confirmar-disputa',
        valor,
      });
      void id;
      break;
    }

    case 'confirmar-disputa': {
      const [id, aFavor] = valor.split('|');
      const motivo = valorCampo('motivo-disp');
      if (!motivo) {
        brindis('El fundamento es obligatorio.', true);
        break;
      }
      op.resolverDisputa(id, aFavor === 'cliente' ? 'resuelta_favor_cliente' : 'resuelta_favor_comercio', motivo);
      cerrarHoja();
      router.ir('/i/disputas');
      brindis('Disputa resuelta.');
      break;
    }

    // ------------------------------------------------------ Inspección

    case 'nueva-inspeccion':
      nuevaInspeccion();
      break;

    case 'confirmar-inspeccion': {
      const negocioId = valorRadio('negocio-insp');
      const resultado = valorRadio('resultado-insp');
      const hallazgos = valorCampo('hallazgos-insp');
      if (!negocioId || !resultado) {
        brindis('Elija el comercio y el resultado.', true);
        break;
      }
      const local = store.leer().locales.find((l) => l.negocioId === negocioId);
      op.registrarInspeccion(negocioId, local?.id ?? '', resultado as 'conforme' | 'observado' | 'no_conforme', hallazgos ? hallazgos.split('\n').filter(Boolean) : []);
      cerrarHoja();
      repintar();
      brindis('Inspección registrada.');
      break;
    }

    case 'nueva-incidencia':
      abrirHoja({
        titulo: 'Reportar incidencia',
        cuerpo: `<textarea class="area" name="desc-inc" placeholder="Describa la incidencia…" required></textarea>`,
        confirmar: 'Reportar',
        accionConfirmar: 'confirmar-incidencia',
      });
      break;

    case 'confirmar-incidencia': {
      const desc = valorCampo('desc-inc');
      if (!desc) {
        brindis('La descripción es obligatoria.', true);
        break;
      }
      store.actualizar((st) => {
        st.incidencias.push({
          id: `ic_${Date.now().toString(36)}`,
          parqueId: 'pq_este',
          reportadaPor: sesion.activa()?.usuarioId ?? 'sistema',
          tipo: 'otro',
          descripcion: desc,
          estado: 'abierta',
          creadaEn: new Date().toISOString(),
        });
      });
      cerrarHoja();
      repintar();
      brindis('Incidencia registrada.');
      break;
    }

    // ---------------------------------------------------------- Cuenta

    case 'cambiar-cuenta':
      cambiarCuenta();
      break;

    case 'revocar-sesion':
      store.actualizar((st) => {
        const s = st.sesiones.find((x) => x.id === valor);
        if (s) s.vigente = false;
      });
      repintar();
      brindis('Sesión cerrada.');
      break;

    case 'enviar-invitacion': {
      const correo = valorCampo('correo');
      const rol = valorRadio('rol');
      if (!correo.includes('@')) {
        mostrarError('error-invitar', 'Indique un correo válido.');
        break;
      }
      const codigo = `DEMO-${Math.floor(1000 + Math.random() * 8999)}`;
      store.actualizar((st) => {
        st.invitaciones.push({
          id: `inv_${Date.now().toString(36)}`,
          correo,
          rol: rol as never,
          scope: { level: 'local', ids: [] },
          emitidaPor: sesion.activa()?.usuarioId ?? '',
          emitidaEn: new Date().toISOString(),
          expiraEn: new Date(Date.now() + 30 * 86400000).toISOString(),
          codigo,
          estado: 'pendiente',
        });
      });
      void adaptadores.mensajeria.enviar({ canal: 'correo', destino: correo, asunto: 'Invitación', cuerpo: `Su código es ${codigo}` });
      router.ir('/c/equipo');
      brindis(`Invitación creada. Código de demostración: ${codigo}`);
      break;
    }

    case 'cargar-documento':
      brindis('En la demostración no se suben archivos reales.');
      break;

    // ------------------------------------------------------- Visitante

    case 'estrellas': {
      const [ordenId, n] = valor.split('|');
      estadoUi.seleccion[`estrellas-${ordenId}`] = n;
      repintar();
      break;
    }

    case 'enviar-valoracion': {
      const n = Number(estadoUi.seleccion[`estrellas-${valor}`] ?? '0');
      if (n === 0) {
        mostrarError('error-valorar', 'Elija una calificación.');
        break;
      }
      op.valorar(valor, n, valorCampo('comentario'));
      router.ir(`/v/pedido/${valor}`);
      brindis('Gracias por su valoración.');
      break;
    }

    case 'enviar-reclamo': {
      const motivo = valorRadio('motivo');
      const desc = valorCampo('descripcion');
      if (!desc) {
        mostrarError('error-reclamo', 'Describa lo ocurrido.');
        break;
      }
      op.abrirReclamo(valor, motivo || 'Otro', desc);
      router.ir('/v/reclamos');
      brindis('Reclamo enviado. Soporte responderá dentro de 48 horas.');
      break;
    }

    // ------------------------------------------------------------ Cola

    case 'sincronizar':
      void colaSincronizacion.sincronizar().then((r) => {
        estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
        repintar();
        if (r.conflictos.length) brindis(`${r.conflictos.length} conflicto(s) por resolver.`, true);
        else brindis(`${r.sincronizadas} acción(es) sincronizada(s).`);
      });
      break;

    case 'cola-forzar':
      colaSincronizacion.forzar(valor);
      void colaSincronizacion.sincronizar().then(() => {
        estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
        repintar();
        brindis('Acción aplicada sobre el estado actual.');
      });
      break;

    case 'cola-descartar':
      colaSincronizacion.descartar(valor);
      estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
      repintar();
      brindis('Acción descartada.');
      break;

    case 'exportar-csv':
      exportarCsv(valor);
      break;

    default:
      brindis('Acción no reconocida.', true);
  }
}

// ------------------------------------------------------------- Sub-rutinas

function entrarComoPerfil(usuarioId: string): void {
  const r = sesion.accederComoPerfil(usuarioId);
  if (!r.ok) {
    brindis(r.mensaje, true);
    return;
  }
  if (r.requiereMfa) {
    router.ir('/mfa');
    void sesion.solicitarCodigoMfa();
  } else {
    router.ir(inicioDeRol(r.sesion.rol));
  }
}

function acceder(superficie: 'visitante' | 'comercio' | 'inparques'): void {
  const r = sesion.acceder(valorCampo('correo'), valorCampo('clave'), superficie);
  if (!r.ok) {
    mostrarError('error-acceso', r.mensaje);
    return;
  }
  if (r.requiereMfa) router.ir('/mfa');
  else router.ir(inicioDeRol(r.sesion.rol));
}

async function verificarMfa(): Promise<void> {
  const ok = await sesion.verificarMfa(valorCampo('codigo'));
  if (!ok) {
    mostrarError('error-mfa', 'El código no es válido. En la demostración es 123456.');
    return;
  }
  const rol = sesion.rol()!;
  router.ir(inicioDeRol(rol));
  brindis('Identidad verificada.');
}

function registrar(): void {
  const correo = valorCampo('correo');
  const clave = valorCampo('clave');
  if (!correo.includes('@')) {
    mostrarError('error-registro', 'Indique un correo válido.');
    return;
  }
  if (clave.length < 8) {
    mostrarError('error-registro', 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  sesion.continuarComoInvitado();
  router.ir('/v');
  brindis('Cuenta creada. En la demostración entra como visitante.');
}

function cambiarClave(): void {
  const a = valorCampo('clave');
  const b = valorCampo('clave2');
  if (a.length < 8) {
    mostrarError('error-nueva-clave', 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (a !== b) {
    mostrarError('error-nueva-clave', 'Las contraseñas no coinciden.');
    return;
  }
  router.ir('/acceso');
  brindis('Contraseña actualizada. Ya puede entrar.');
}

function activarComercio(): void {
  const codigo = valorCampo('codigo');
  const a = valorCampo('clave');
  const b = valorCampo('clave2');
  const inv = store.leer().invitaciones.find((i) => i.codigo === codigo && i.estado === 'pendiente');
  if (!inv) {
    mostrarError('error-activacion', 'El código no corresponde a ninguna invitación vigente.');
    return;
  }
  if (a.length < 8) {
    mostrarError('error-activacion', 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (a !== b) {
    mostrarError('error-activacion', 'Las contraseñas no coinciden.');
    return;
  }
  store.actualizar((st) => {
    const i = st.invitaciones.find((x) => x.id === inv.id);
    if (i) i.estado = 'aceptada';
    const u = st.usuarios.find((x) => x.correo === inv.correo);
    if (u) u.estado = 'activo';
  });
  router.ir('/acceso/comercio');
  brindis('Usuario activado. Ya puede entrar con su correo.');
}

function leerQr(): void {
  const codigo = valorCampo('codigo').trim().toUpperCase();
  const e = store.leer();
  const punto = e.puntos.find((p) => p.qr === codigo);
  if (!punto) {
    mostrarError('error-qr', 'El código no corresponde a ningún punto del parque.');
    return;
  }
  const local = e.locales.find((l) => l.puntoId === punto.id);
  fijarFiltro('parque', punto.parqueId);
  if (local) {
    router.ir(`/v/comercio/${local.negocioId}`);
    brindis(`Bienvenido a ${e.negocios.find((n) => n.id === local.negocioId)?.nombreComercial}.`);
  } else {
    router.ir(`/v/parque/${punto.parqueId}`);
  }
}

/** Selección pendiente cuando el carrito choca con otro comercio. */
let pendienteSeleccion: Parameters<typeof reiniciarCon>[0] | null = null;

function agregarArticulo(articuloId: string): void {
  const e = store.leer();
  const art = e.articulos.find((a) => a.id === articuloId);
  if (!art) return;

  const cantidad = Number(estadoUi.seleccion[`cant-${articuloId}`] ?? '1');
  const variantes = art.variantes
    .map((v) => ({ varianteId: v.id, opcionId: valorRadio(`var-${v.id}`) }))
    .filter((x) => x.opcionId);
  const modificadores = art.modificadores
    .map((m) => ({ modificadorId: m.id, opcionId: valorRadio(`mod-${m.id}`) }))
    .filter((x) => x.opcionId);

  const sel = { articulo: art, cantidad, variantes, modificadores, notas: valorCampo('notas') || undefined };
  const r = agregarAlCarrito(estadoUi.carrito, sel);

  if (r.ok) {
    fijarCarrito(r.carrito);
    router.ir('/v/carrito');
    brindis(`${art.nombre} agregado.`);
    return;
  }

  if (r.razon === 'otro_comercio') {
    pendienteSeleccion = sel;
    const actual = e.negocios.find((n) => n.id === r.negocioActual)?.nombreComercial ?? '';
    const nuevo = e.negocios.find((n) => n.id === r.negocioNuevo)?.nombreComercial ?? '';
    abrirHoja({
      titulo: 'Su carrito es de otro comercio',
      cuerpo: `<p class="tenue">Tiene un carrito de <strong>${esc(actual)}</strong>. En esta beta un pedido solo puede contener artículos de un comercio.</p>
        <p class="tenue mt-1">Puede conservar el carrito actual o vaciarlo y comenzar uno nuevo en <strong>${esc(nuevo)}</strong>.</p>`,
      confirmar: `Vaciar y pedir en ${nuevo}`,
      accionConfirmar: 'vaciar-y-agregar',
      peligro: true,
    });
    const pie = document.querySelector('.hoja__pie');
    if (pie) {
      const btn = document.createElement('button');
      btn.className = 'bt bt--secundario bt--bloque';
      btn.dataset.accion = 'conservar-carrito';
      btn.textContent = 'Conservar mi carrito actual';
      pie.appendChild(btn);
    }
    return;
  }

  const mensajes: Record<string, string> = {
    no_disponible: 'Este artículo está agotado.',
    sin_stock: `Solo quedan ${'disponible' in r ? r.disponible : 0} unidades.`,
    modificador_obligatorio: `Elija una opción en "${'modificador' in r ? r.modificador : ''}".`,
  };
  mostrarError('error-agregar', mensajes[r.razon] ?? 'No se pudo agregar.');
}

function agregarServicio(articuloId: string): void {
  const e = store.leer();
  const art = e.articulos.find((a) => a.id === articuloId);
  const franjaId = estadoUi.seleccion[`franja-${articuloId}`];
  if (!art || !franjaId) return;

  const cantidad = Number(estadoUi.seleccion[`cant-${articuloId}`] ?? '1');
  const franja = e.franjas.find((f) => f.id === franjaId);
  if (!franja || franja.cupoTotal - franja.cupoTomado < cantidad) {
    mostrarError('error-agregar', 'No hay cupo suficiente en esa franja.');
    return;
  }

  const variantes = art.variantes
    .map((v) => ({ varianteId: v.id, opcionId: valorRadio(`var-${v.id}`) }))
    .filter((x) => x.opcionId);

  const r = agregarAlCarrito(estadoUi.carrito, { articulo: art, cantidad, variantes, modificadores: [] });
  if (r.ok) {
    const carrito = { ...r.carrito, franjaId, programadaPara: `${franja.fecha}T${franja.desde}:00.000Z` };
    fijarCarrito(carrito);
    router.ir('/v/carrito');
    brindis('Reserva agregada al carrito.');
    return;
  }
  if (r.razon === 'otro_comercio') {
    pendienteSeleccion = { articulo: art, cantidad, variantes, modificadores: [] };
    abrirHoja({
      titulo: 'Su carrito es de otro comercio',
      cuerpo: '<p class="tenue">Un pedido solo puede contener artículos de un comercio.</p>',
      confirmar: 'Vaciar y reservar',
      accionConfirmar: 'vaciar-y-agregar',
      peligro: true,
    });
  }
}

async function pagar(metodo: MetodoPago): Promise<void> {
  const referencia = valorCampo('referencia');
  if ((metodo === 'pago_movil' || metodo === 'transferencia') && !referencia) {
    mostrarError('error-pago', 'Indique el número de referencia.');
    return;
  }
  if (metodo === 'tarjeta' && valorCampo('numero').replace(/\s/g, '').length < 12) {
    mostrarError('error-pago', 'Indique un número de tarjeta de prueba válido.');
    return;
  }

  estadoUi.cargando = true;
  repintar();

  try {
    const { ordenId } = await op.crearOrdenDesdeCarrito({
      cumplimiento: (estadoUi.seleccion['checkout-cumplimiento'] as never) ?? 'retiro_inmediato',
      clienteNombre: estadoUi.seleccion['checkout-nombre'] ?? 'Cliente',
      metodo,
      referencia: referencia || undefined,
      franjaId: estadoUi.carrito.franjaId,
      programadaPara: estadoUi.carrito.programadaPara,
    });
    vaciarCarrito();
    estadoUi.cargando = false;
    router.ir(`/v/checkout/confirmacion?orden=${ordenId}`);
  } catch (e) {
    estadoUi.cargando = false;
    repintar();
    mostrarError('error-pago', e instanceof Error ? e.message : 'No se pudo procesar el pago.');
  }
}

async function verificarPago(pagoId: string): Promise<void> {
  brindis('Consultando al banco simulado…');
  const r = await op.verificarPago(pagoId);
  repintar();
  brindis(r.mensaje, !r.ok);
}

async function emitirFactura(ordenId: string): Promise<void> {
  const r = await op.emitirFactura(ordenId);
  repintar();
  brindis(r.mensaje, !r.ok);
}

function guardarArticulo(articuloId: string): void {
  const precio = Number(valorCampo('precio'));
  if (Number.isNaN(precio) || precio <= 0) {
    mostrarError('error-articulo', 'Indique un precio válido.');
    return;
  }
  const nombre = valorCampo('nombre');
  const stock = valorCampo('stock');
  store.actualizar((st) => {
    const a = st.articulos.find((x) => x.id === articuloId);
    if (!a) return;
    a.nombre = nombre || a.nombre;
    a.descripcion = valorCampo('descripcion') || a.descripcion;
    if (stock !== '') a.stock = Number(stock);
    const prep = Number(valorCampo('prep'));
    if (!Number.isNaN(prep)) a.tiempoPrepMin = prep;
  });
  op.cambiarPrecio(articuloId, precio, 'Actualización desde el portal del comercio');
  router.ir('/c/catalogo');
  brindis('Artículo actualizado. El visitante ya ve el cambio.');
}

function registrarMostrador(localId: string): void {
  const lineas = Object.entries(estadoUi.seleccion)
    .filter(([k]) => k.startsWith('mostrador-'))
    .map(([k, v]) => ({ articuloId: k.replace('mostrador-', ''), cantidad: Number(v) }))
    .filter((l) => l.cantidad > 0);

  if (lineas.length === 0) {
    mostrarError('error-mostrador', 'Agregue al menos un artículo.');
    return;
  }
  const metodo = (valorRadio('metodo-mostrador') || 'efectivo') as MetodoPago;
  op.registrarVentaMostrador(localId, lineas, metodo);
  for (const k of Object.keys(estadoUi.seleccion)) {
    if (k.startsWith('mostrador-')) delete estadoUi.seleccion[k];
  }
  router.ir('/c/caja');
  brindis('Venta registrada. Ya aparece en la caja y en los reportes.');
}

function confirmarSuspension(negocioId: string): void {
  const motivo = valorCampo('motivo-susp');
  const evidencia = valorCampo('evidencia-susp');
  const mfa = valorCampo('mfa-susp');
  const rol = sesion.rol()!;
  const val = validarAccion({
    accion: 'negocio.suspender',
    rol,
    motivo,
    evidencia,
    mfaVerificado: mfa === '123456',
    aprobadoPor: { usuarioId: 'us_superadmin', rol: 'inparques.superadmin' },
  });
  if (!val.ok) {
    brindis(val.mensaje, true);
    return;
  }
  op.suspenderNegocio(negocioId, motivo, evidencia, 'us_superadmin');
  cerrarHoja();
  repintar();
  brindis('Negocio suspendido. Sus locales dejaron de publicarse.');
}

function confirmarReembolso(reembolsoId: string): void {
  const r = store.leer().reembolsos.find((x) => x.id === reembolsoId);
  const motivo = valorCampo('motivo-reem');
  const evidencia = valorCampo('evidencia-reem');
  const mfa = valorCampo('mfa-reem');
  const rol = sesion.rol()!;
  const val = validarAccion({
    accion: 'reembolso.aprobar',
    rol,
    motivo,
    evidencia,
    montoUsd: r?.montoUsd,
    mfaVerificado: mfa === '123456',
    aprobadoPor: { usuarioId: 'us_superadmin', rol: 'inparques.superadmin' },
  });
  if (!val.ok) {
    brindis(val.mensaje, true);
    return;
  }
  op.aprobarReembolso(reembolsoId, motivo, evidencia, 'us_superadmin');
  cerrarHoja();
  repintar();
  brindis('Reembolso aprobado y registrado.');
}

function nuevaInspeccion(): void {
  const e = store.leer();
  const negocios = e.negocios.filter((n) => n.estado === 'activo');
  abrirHoja({
    titulo: 'Registrar inspección',
    cuerpo: `
      <p class="campo__et">Comercio</p>
      ${negocios.map((n, i) => `<label class="opcion"><input type="radio" name="negocio-insp" value="${esc(n.id)}"${i === 0 ? ' checked' : ''} /><span>${esc(n.nombreComercial)}</span></label>`).join('')}
      <p class="campo__et mt-2">Resultado</p>
      <label class="opcion"><input type="radio" name="resultado-insp" value="conforme" checked /><span>Conforme</span></label>
      <label class="opcion"><input type="radio" name="resultado-insp" value="observado" /><span>Observado</span></label>
      <label class="opcion"><input type="radio" name="resultado-insp" value="no_conforme" /><span>No conforme</span></label>
      <textarea class="area mt-2" name="hallazgos-insp" placeholder="Un hallazgo por línea…"></textarea>`,
    confirmar: 'Registrar',
    accionConfirmar: 'confirmar-inspeccion',
  });
}

function cambiarCuenta(): void {
  const banco = valorCampo('banco');
  const titular = valorCampo('titular');
  const numero = valorCampo('numero');
  const motivo = valorCampo('motivo');
  const evidencia = valorCampo('evidencia');
  const rol = sesion.rol()!;

  if (!banco || !titular || numero.replace(/\D/g, '').length < 10) {
    mostrarError('error-cuenta-bancaria', 'Complete banco, titular y un número de cuenta válido.');
    return;
  }

  const val = validarAccion({
    accion: 'bancario.cambiar_cuenta',
    rol,
    motivo,
    evidencia,
    mfaVerificado: false,
    aprobadoPor: { usuarioId: 'us_direccion', rol: 'inparques.direccion_comercial' },
  });

  if (!val.ok && !val.faltan.includes('mfa')) {
    mostrarError('error-cuenta-bancaria', val.mensaje);
    return;
  }

  // Falta solo el segundo factor: se pide en una hoja aparte.
  abrirHoja({
    titulo: 'Verificación en dos pasos',
    cuerpo: `<p class="tenue mb-1">Este cambio exige verificación. Introduzca el código de la demostración.</p>
      <input class="entrada" name="mfa-banco" inputmode="numeric" placeholder="123456" />
      <p class="tenue-2 mt-1">Al confirmar se solicita además la aprobación de la Dirección Comercial.</p>`,
    confirmar: 'Confirmar cambio',
    accionConfirmar: 'confirmar-cambio-cuenta',
    valor: JSON.stringify({ banco, titular, numero, motivo, evidencia }),
  });
}

// Registrada aparte porque el despachador principal ya es extenso.
document.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-accion="confirmar-cambio-cuenta"]');
  if (!el) return;
  const datos = JSON.parse(el.dataset.valor ?? '{}');
  const mfa = valorCampo('mfa-banco');
  const rol = sesion.rol()!;
  const val = validarAccion({
    accion: 'bancario.cambiar_cuenta',
    rol,
    motivo: datos.motivo,
    evidencia: datos.evidencia,
    mfaVerificado: mfa === '123456',
    aprobadoPor: { usuarioId: 'us_direccion', rol: 'inparques.direccion_comercial' },
  });
  if (!val.ok) {
    brindis(val.mensaje, true);
    return;
  }
  const negocio = sesion.usuario()?.scope.ids[0];
  if (negocio) {
    op.cambiarCuentaBancaria(negocio, datos, datos.motivo, datos.evidencia, 'us_direccion');
  }
  cerrarHoja();
  router.ir('/c/cobro');
  brindis('Cuenta actualizada. Queda pendiente de verificación bancaria.');
});

async function exportarCsv(tipo: string): Promise<void> {
  const e = store.leer();
  let filas: string[][] = [];

  if (tipo === 'ventas') {
    filas = [
      ['codigo', 'comercio', 'canal', 'estado', 'total_usd', 'total_ves', 'tasa', 'fecha'],
      ...e.ordenes.map((o) => [
        o.codigo,
        e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial ?? '',
        o.canal,
        o.estado,
        String(o.totalUsd),
        String(o.totalVes),
        String(o.tasaBcv),
        o.creadaEn,
      ]),
    ];
  } else if (tipo === 'pagos') {
    filas = [
      ['orden', 'metodo', 'estado', 'referencia', 'monto_ves', 'adaptador'],
      ...e.pagos.map((p) => [
        e.ordenes.find((o) => o.id === p.ordenId)?.codigo ?? '',
        p.metodo, p.estado, p.referencia ?? '', String(p.montoVes), p.adaptador,
      ]),
    ];
  } else if (tipo === 'catalogo') {
    filas = [
      ['nombre', 'categoria', 'precio_usd', 'disponible', 'stock'],
      ...e.articulos.map((a) => [a.nombre, a.categoria, String(a.precioUsd), String(a.disponible), String(a.stock ?? '')]),
    ];
  } else if (tipo === 'negocios') {
    filas = [
      ['nombre', 'rif', 'categoria', 'estado'],
      ...e.negocios.map((n) => [n.nombreComercial, n.rif, n.categoria, n.estado]),
    ];
  } else if (tipo === 'auditoria') {
    filas = [
      ['fecha', 'usuario', 'rol', 'accion', 'entidad', 'motivo'],
      ...e.auditoria.map((a) => [a.en, a.usuarioNombre, a.rol, a.accion, `${a.entidad}:${a.entidadId}`, a.motivo ?? '']),
    ];
  }

  const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const contenido = `﻿${csv}`;
  const nombreArchivo = `inparques-${tipo}.csv`;

  // Publicada como artefacto, la página corre en un iframe aislado: un
  // <a download> normal no descarga nada ahí. window.claude.downloads es la
  // via que el visor ofrece para eso; fuera de ese visor (desarrollo local,
  // GitHub Pages, el archivo unico abierto directo) no existe y se sigue
  // usando el metodo de blob + enlace de siempre.
  const descargasClaude = (window as { claude?: { downloads?: { save(r: { filename: string; data: string }): Promise<unknown> } } }).claude
    ?.downloads;
  if (descargasClaude) {
    try {
      await descargasClaude.save({ filename: nombreArchivo, data: contenido });
      brindis(`Archivo ${tipo}.csv descargado.`);
    } catch {
      brindis('La descarga no está disponible en este enlace de demostración.');
    }
    return;
  }

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
  brindis(`Archivo ${tipo}.csv descargado.`);
}
