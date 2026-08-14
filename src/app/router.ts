/**
 * Router con guardias por rol.
 *
 * Usa hash (`#/ruta`) para que la demo funcione servida desde cualquier
 * carpeta estatica sin reescritura del servidor.
 *
 * La proteccion no depende de ocultar enlaces: escribir la URL de un modulo
 * prohibido lleva a la pantalla 403, y una ruta inexistente a la 404.
 */

import type { RoleId } from '../domain/types';
import { VISTAS, type Vista } from './registry';
import { sesion } from './session';

export interface Coincidencia {
  vista: Vista;
  params: Record<string, string>;
  consulta: URLSearchParams;
}

export type ResultadoNavegacion =
  | { tipo: 'ok'; coincidencia: Coincidencia }
  | { tipo: 'no_encontrada'; ruta: string }
  | { tipo: 'sin_sesion'; destino: string }
  | { tipo: 'mfa_pendiente'; destino: string }
  | { tipo: 'prohibida'; vista: Vista; rol: RoleId };

type Render = (r: ResultadoNavegacion) => void;

/** Convierte "/v/pedido/:ordenId" en una expresion con grupos nombrados. */
function compilar(patron: string): { re: RegExp; claves: string[] } {
  const claves: string[] = [];
  const fuente = patron
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        claves.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { re: new RegExp(`^${fuente}$`), claves };
}

const COMPILADAS = VISTAS.map((vista) => ({ vista, ...compilar(vista.ruta) }));

/**
 * `decodeURIComponent` lanza `URIError` ante un porcentaje suelto o una
 * secuencia incompleta: `#/v/comercio/%E0%A4%A`. Eso pasa mas de lo que
 * parece — un enlace cortado al copiarlo, o recortado por un chat — y sin
 * proteccion la excepcion sube hasta el manejador de `hashchange`, que muere
 * sin pintar: la pantalla anterior se queda congelada con una URL que ya no
 * le corresponde. Ante un segmento ilegible se usa el texto crudo, que no
 * casara con ningun identificador y acabara en el 404 de siempre.
 */
function decodificar(segmento: string): string {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

export function emparejar(ruta: string): { vista: Vista; params: Record<string, string> } | null {
  // Coincidencia exacta primero: evita que "/c/pedido/:id" capture "/c/pedidos".
  const exacta = COMPILADAS.find((c) => c.vista.ruta === ruta);
  if (exacta) return { vista: exacta.vista, params: {} };

  for (const c of COMPILADAS) {
    const m = c.re.exec(ruta);
    if (!m) continue;
    const params: Record<string, string> = {};
    c.claves.forEach((k, i) => (params[k] = decodificar(m[i + 1])));
    return { vista: c.vista, params };
  }
  return null;
}

/** Decide si una ruta es alcanzable por el rol activo. */
export function evaluar(ruta: string, consulta = new URLSearchParams()): ResultadoNavegacion {
  const m = emparejar(ruta);
  if (!m) return { tipo: 'no_encontrada', ruta };

  const { vista, params } = m;
  const publica = vista.roles.length === 0;
  const activa = sesion.activa();

  if (publica) return { tipo: 'ok', coincidencia: { vista, params, consulta } };

  if (!activa) return { tipo: 'sin_sesion', destino: ruta };

  if (sesion.requiereMfaPendiente() && vista.ruta !== '/mfa') {
    return { tipo: 'mfa_pendiente', destino: ruta };
  }

  if (!vista.roles.includes(activa.rol)) {
    return { tipo: 'prohibida', vista, rol: activa.rol };
  }

  return { tipo: 'ok', coincidencia: { vista, params, consulta } };
}

export function inicioDeRol(rol: RoleId): string {
  if (rol === 'visitante.cliente') return '/v';
  if (rol.startsWith('comercio.')) return '/c';
  return '/i';
}

class Router {
  private render: Render = () => {};
  private rutaActual = '';

  iniciar(render: Render): void {
    this.render = render;
    window.addEventListener('hashchange', () => this.resolver());
    this.resolver();
  }

  actual(): string {
    return this.rutaActual;
  }

  ir(ruta: string, reemplazar = false): void {
    const destino = `#${ruta}`;
    if (reemplazar) {
      window.history.replaceState(null, '', destino);
      this.resolver();
    } else {
      window.location.hash = ruta;
    }
  }

  atras(): void {
    window.history.back();
  }

  /**
   * Destino cuando la URL no trae hash: es lo que ve quien abre el enlace
   * compartido. Con sesión abierta, su propio inicio; sin sesión, la
   * pantalla de acceso.
   *
   * Antes caía siempre en `/v`, que es publica: quien abriera el enlace
   * entraba directo a la PWA del visitante sin pasar por el acceso y sin
   * enterarse de que hay once perfiles que probar.
   */
  private rutaPorDefecto(): string {
    const rol = sesion.rol();
    return rol ? inicioDeRol(rol) : '/acceso';
  }

  private leerHash(): { ruta: string; consulta: URLSearchParams } {
    const crudo = window.location.hash.replace(/^#/, '') || this.rutaPorDefecto();
    const [ruta, qs] = crudo.split('?');
    return { ruta: ruta || this.rutaPorDefecto(), consulta: new URLSearchParams(qs ?? '') };
  }

  private resolver(): void {
    const { ruta, consulta } = this.leerHash();
    this.rutaActual = ruta;
    this.render(evaluar(ruta, consulta));
  }
}

export const router = new Router();
