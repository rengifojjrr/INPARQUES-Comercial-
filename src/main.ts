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
import { estadoUi, restaurarCarrito } from './ui/estado-ui';
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
}

/** Vuelve a dibujar la ruta actual sin navegar. */
function repintar(): void {
  if (ultimoResultado) pintar(ultimoResultado, true);
}

function pintar(r: ResultadoNavegacion, esRepintado = false): void {
  ultimoResultado = r;
  const ruta = router.actual();

  if (!esRepintado) cerrarHoja();

  if (RUTAS_DEV.includes(ruta)) {
    renderizarMapa(raiz);
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

  const { contenido, ...opciones } = pagina;
  raiz.innerHTML = pagina.standalone
    ? `<div class="stitch-pagina bg-background text-on-background min-h-screen flex flex-col antialiased">${contenido}</div>`
    : marco(contenido, opciones, ruta);

  if (!esRepintado) {
    window.scrollTo({ top: 0 });
    const anuncios = document.getElementById('anuncios');
    if (anuncios) anuncios.textContent = pagina.titulo;
  }
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

void arrancar();
