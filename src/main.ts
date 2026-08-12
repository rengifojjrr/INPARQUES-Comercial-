/**
 * Arranque de la demo.
 *
 * Orden: datos -> sesion -> conectividad -> cola -> router.
 * Todo ocurre en el navegador; no hay backend ni servicio remoto.
 */

import './dev/andamiaje.css';

import { store } from './data/store';
import { sesion } from './app/session';
import { conectividad } from './net/connectivity';
import { colaSincronizacion, type AccionEncolada } from './net/sync-queue';
import { evaluar, inicioDeRol, router, type ResultadoNavegacion } from './app/router';
import { renderizarMapa } from './dev/product-map';
import { renderizarPendiente } from './dev/placeholder';
import { ROLES } from './domain/roles';

const raiz = document.getElementById('app')!;

/** Rutas internas de desarrollo. No pertenecen al producto. */
const RUTAS_DEV = ['/__mapa'];

async function arrancar(): Promise<void> {
  await store.iniciar();
  sesion.restaurar();
  conectividad.iniciar();
  configurarCola();
  exponerHerramientasDeDemo();

  router.iniciar(pintar);

  // Al recuperar la conexion se intenta vaciar la cola automaticamente.
  conectividad.suscribir(async (modo) => {
    if (modo === 'conectado' && colaSincronizacion.pendientes().length > 0) {
      await colaSincronizacion.sincronizar();
    }
    pintar(evaluar(router.actual()));
  });
}

/**
 * La cola necesita saber leer la version actual de un registro y aplicar la
 * accion. Ambas cosas viven en el store, no en la cola.
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
      if (tipo === 'caja.venta_mostrador') return 'pendiente';
      if (tipo === 'inspeccion.registrar') return 'pendiente';
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
            motivo: 'Sincronizacion de accion encolada sin conexion',
          });
          o.estado = destino as typeof o.estado;
        }
      });
    },
  );
}

function pintar(r: ResultadoNavegacion): void {
  const ruta = router.actual();

  if (RUTAS_DEV.includes(ruta)) {
    renderizarMapa(raiz);
    return;
  }

  switch (r.tipo) {
    case 'ok':
      // Cuando la vista tenga su HTML asociado se montara aqui. Mientras
      // tanto se muestra el andamio con la ficha de la ruta.
      renderizarPendiente(raiz, r.coincidencia.vista, r.coincidencia.params);
      break;

    case 'no_encontrada':
      estadoSimple(
        '404',
        'Pagina no encontrada',
        `La ruta <code>${escapar(r.ruta)}</code> no existe en el registro de vistas.`,
        inicioActual(),
      );
      break;

    case 'sin_sesion':
      estadoSimple(
        'Acceso requerido',
        'Inicie sesion para continuar',
        `La ruta <code>${escapar(r.destino)}</code> requiere una sesion activa.`,
        '/acceso',
      );
      break;

    case 'mfa_pendiente':
      estadoSimple(
        'Verificacion pendiente',
        'Complete el segundo factor',
        'Este rol exige verificacion en dos pasos antes de acceder a sus modulos.',
        '/mfa',
      );
      break;

    case 'prohibida':
      estadoSimple(
        '403',
        'No tiene permiso para ver esta pagina',
        `El rol <strong>${ROLES[r.rol].nombre}</strong> no esta autorizado para <code>${escapar(r.vista.ruta)}</code>.`,
        inicioDeRol(r.rol),
      );
      break;
  }
}

function inicioActual(): string {
  const rol = sesion.rol();
  return rol ? inicioDeRol(rol) : '/acceso';
}

/**
 * Estados 403, 404, sesion vencida y mantenimiento. El andamio los resuelve
 * de forma neutra; cuando lleguen los HTML de estado se montaran en su lugar.
 */
function estadoSimple(marca: string, titulo: string, cuerpo: string, destino: string): void {
  raiz.innerHTML = `
    <div class="and-cinta">
      <strong>Estado del sistema</strong>
      <span>${marca}</span>
      <a href="#/__mapa">Indice tecnico</a>
    </div>
    <main class="and-envoltura" id="contenido">
      <h1 class="and-titulo">${titulo}</h1>
      <p class="and-bajada">${cuerpo}</p>
      <p><a class="and-boton and-boton--principal" href="#${destino}">Volver al inicio</a></p>
    </main>
  `;
  const el = document.getElementById('anuncios');
  if (el) el.textContent = titulo;
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Herramientas de demostracion accesibles desde la consola del navegador:
 * restablecer datos, alternar conexion y exportar el estado.
 */
function exponerHerramientasDeDemo(): void {
  Object.defineProperty(window, 'demoInparques', {
    value: {
      restablecer: () => store.restablecer(),
      exportar: () => store.exportarJson(),
      alternarConexion: () => conectividad.alternarDemo(),
      conexion: () => conectividad.actual(),
      cola: () => colaSincronizacion.listar(),
      sincronizar: () => colaSincronizacion.sincronizar(),
      sesion: () => sesion.activa(),
      cerrarSesion: () => sesion.cerrar(),
    },
    writable: false,
  });
}

void arrancar();
