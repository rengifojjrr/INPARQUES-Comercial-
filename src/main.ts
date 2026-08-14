/**
 * Arranque de la demo.
 *
 * Orden: datos -> sesión -> conectividad -> cola -> acciones -> router.
 * Todo ocurre en el navegador; no hay backend ni servicio remoto.
 */

import './ui/stitch-base.css';
import './ui/estilos.css';
import './dev/andamiaje.css';

import { store } from './data/store';
import { sesion } from './app/session';
import { conectividad } from './net/connectivity';
import { colaSincronizacion, type AccionEncolada } from './net/sync-queue';
import { inicioDeRol, router, type ResultadoNavegacion } from './app/router';
import { renderizarMapa } from './dev/product-map';
import { marco } from './ui/shell';
import { VISTAS_POR_ID } from './ui/vistas';
import { configurarAcciones, cerrarHoja } from './ui/acciones';
import { estadoUi, esOrdenDeEsteInvitado, restaurarCarrito, restaurarOrdenesInvitado } from './ui/estado-ui';
import { instalarRegistroInvitado } from './domain/ownership';
import * as compartidas from './ui/vistas/compartidas';
import type { Pagina } from './ui/vistas/tipos';

const raiz = document.getElementById('app')!;

/** Rutas internas de desarrollo. No pertenecen al producto. */
const RUTAS_DEV = ['/__mapa'];

let ultimoResultado: ResultadoNavegacion | null = null;

async function arrancar(): Promise<void> {
  await store.iniciar();
  sesion.restaurar();
  restaurarCarrito();
  restaurarOrdenesInvitado();
  // El dominio pregunta "¿este pedido anónimo es de este dispositivo?" y la
  // respuesta solo la tiene la interfaz, que lleva ese registro.
  instalarRegistroInvitado(esOrdenDeEsteInvitado);
  conectividad.iniciar();
  configurarCola();
  configurarAcciones(repintar);
  exponerHerramientasDeDemo();

  router.iniciar(pintar);

  // Al recuperar la conexión se intenta vaciar la cola automáticamente.
  conectividad.suscribir(async (modo) => {
    if (modo === 'conectado' && colaSincronizacion.pendientes().length > 0) {
      await colaSincronizacion.sincronizar();
      estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
    }
    repintar();
  });
}

/**
 * La cola necesita saber leer la versión actual de un registro y aplicar la
 * acción. Ambas cosas viven en el store, no en la cola.
 */
function configurarCola(): void {
  colaSincronizacion.configurar(
    (tipo, entidadId) => {
      const e = store.leer();
      if (tipo.startsWith('orden.')) {
        return e.ordenes.find((o) => o.id === entidadId)?.estado ?? null;
      }
      if (tipo === 'catalogo.disponibilidad') {
        const a = e.articulos.find((x) => x.id === entidadId);
        return a ? String(a.disponible) : null;
      }
      if (tipo === 'caja.venta_mostrador' || tipo === 'inspeccion.registrar') return 'pendiente';
      return null;
    },
    (accion: AccionEncolada) => {
      store.actualizar((e) => {
        if (accion.tipo === 'catalogo.disponibilidad') {
          const a = e.articulos.find((x) => x.id === accion.entidadId);
          if (a) a.disponible = Boolean(accion.carga.disponible);
          return;
        }
        const o = e.ordenes.find((x) => x.id === accion.entidadId);
        if (!o) return;
        const destino = String(accion.carga.estado ?? '');
        if (destino) {
          o.historial.push({
            en: new Date().toISOString(),
            de: o.estado,
            a: destino,
            porUsuarioId: sesion.activa()?.usuarioId ?? 'sistema',
            porRol: sesion.rol() ?? 'comercio.operador',
            motivo: 'Sincronización de acción encolada sin conexión',
          });
          o.estado = destino as typeof o.estado;
        }
      });
    },
  );
  // La cola sobrevive a la recarga: sin esto, operar sin señal y refrescar
  // borraba en silencio todo lo encolado.
  colaSincronizacion.restaurar();
  estadoUi.colaPendientes = colaSincronizacion.pendientes().length;
}

/** Vuelve a dibujar la ruta actual sin navegar. */
function repintar(): void {
  if (ultimoResultado) pintar(ultimoResultado, true);
}

function pintar(r: ResultadoNavegacion, esRepintado = false): void {
  ultimoResultado = r;
  const ruta = router.actual();

  if (!esRepintado) cerrarHoja();

  // El índice técnico es una herramienta interna: lista las 137 rutas con sus
  // roles y la estructura entera. Antes se pintaba antes de mirar la sesión,
  // así que cualquiera que abriera el enlace público podía verlo escribiendo
  // `#/__mapa`. Ahora exige sesión y rol institucional, como el resto.
  if (RUTAS_DEV.includes(ruta)) {
    const rol = sesion.rol();
    if (rol && rol.startsWith('inparques.')) {
      renderizarMapa(raiz);
      return;
    }
    // Se pinta el 403 aquí mismo. Volver a llamar a `pintar` no sirve: la ruta
    // sigue siendo `/__mapa` y la llamada vuelve a entrar por este mismo `if`,
    // en bucle hasta agotar la pila.
    const ctx403 = { params: {}, consulta: new URLSearchParams(), ruta };
    const p403 = compartidas.error403(ctx403);
    const { contenido: c403, ...op403 } = p403;
    raiz.innerHTML = marco(c403, op403, ruta);
    return;
  }

  const ctx = {
    params: r.tipo === 'ok' ? r.coincidencia.params : {},
    consulta: r.tipo === 'ok' ? r.coincidencia.consulta : new URLSearchParams(),
    ruta,
  };

  let pagina: Pagina;

  switch (r.tipo) {
    case 'ok': {
      const render = VISTAS_POR_ID[r.coincidencia.vista.id];
      pagina = render
        ? render(ctx)
        : {
            titulo: r.coincidencia.vista.titulo,
            contenido: `<div class="estado"><div class="estado__ic" aria-hidden="true">◻</div>
              <p class="estado__t">Vista sin implementar</p>
              <p class="estado__d">La ruta <code>${r.coincidencia.vista.ruta}</code> está registrada pero no tiene vista asociada.</p></div>`,
          };
      break;
    }

    case 'no_encontrada':
      pagina = compartidas.error404(ctx);
      break;

    case 'sin_sesion':
      // Sin sesión no se muestra el destino: se envía al acceso.
      router.ir('/acceso', true);
      return;

    case 'mfa_pendiente':
      router.ir('/mfa', true);
      return;

    case 'prohibida':
      pagina = compartidas.error403(ctx);
      break;
  }

  // Cada repintado reemplaza el documento entero, así que antes de hacerlo hay
  // que anotar dónde estaba el usuario. Sin esto, pulsar un chip de filtro
  // devolvía el foco al `<body>`: quien navega con teclado tenía que tabular
  // desde el principio de la página tras cada clic, y el desplazamiento
  // saltaba arriba en listas largas.
  const foco = esRepintado ? marcaDeFoco() : null;
  const desplazamiento = esRepintado ? window.scrollY : 0;

  const { contenido, ...opciones } = pagina;
  raiz.innerHTML = pagina.standalone
    ? `<div class="stitch-pagina bg-background text-on-background min-h-screen flex flex-col antialiased">${contenido}</div>`
    : marco(contenido, opciones, ruta);

  if (esRepintado) {
    if (desplazamiento) window.scrollTo({ top: desplazamiento });
    restaurarFoco(foco);
  } else {
    window.scrollTo({ top: 0 });
    const anuncios = document.getElementById('anuncios');
    if (anuncios) anuncios.textContent = pagina.titulo;
  }
}

/**
 * Cómo volver a encontrar el control que tenía el foco.
 *
 * El elemento en sí no sirve: el repintado lo destruye. Se guarda cómo
 * localizar al que ocupa su lugar en el documento nuevo — por `id` si lo
 * tiene, y si no por su par acción/valor, que es lo que identifica a un
 * control en esta aplicación.
 */
function marcaDeFoco(): string | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const accion = el.dataset?.accion;
  if (!accion) return null;
  const valor = el.dataset.valor;
  return valor === undefined
    ? `[data-accion="${CSS.escape(accion)}"]`
    : `[data-accion="${CSS.escape(accion)}"][data-valor="${CSS.escape(valor)}"]`;
}

function restaurarFoco(marca: string | null): void {
  if (!marca) return;
  const el = document.querySelector<HTMLElement>(marca);
  // `preventScroll` porque el desplazamiento ya se restauró arriba: sin él, el
  // navegador volvería a centrar el elemento y desharía ese trabajo.
  el?.focus({ preventScroll: true });
}

/**
 * Herramientas de demostración accesibles desde la consola del navegador.
 */
function exponerHerramientasDeDemo(): void {
  Object.defineProperty(window, 'demoInparques', {
    value: {
      restablecer: () => store.restablecer().then(() => repintar()),
      exportar: () => store.exportarJson(),
      alternarConexion: () => {
        const m = conectividad.alternarDemo();
        repintar();
        return m;
      },
      conexion: () => conectividad.actual(),
      cola: () => colaSincronizacion.listar(),
      sincronizar: () => colaSincronizacion.sincronizar(),
      sesion: () => sesion.activa(),
      cerrarSesion: () => sesion.cerrar(),
      inicioDeRol,
    },
    writable: false,
  });
}

/**
 * Registro del service worker.
 *
 * Va al final y sin bloquear: si falla —navegador viejo, `file://`, sitio sin
 * HTTPS— la demo funciona igual, solo que sin poder abrirse sin conexión.
 */
function registrarServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (window.location.protocol === 'file:') return;   // archivo único abierto directo
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => {
      /* sin service worker: la demo sigue funcionando con red */
    });
  });
}

void arrancar();
registrarServiceWorker();
