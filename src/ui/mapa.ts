/**
 * Mapa esquemático interactivo del parque.
 *
 * El HTML de Stitch dibuja el mapa como una imagen de fondo generada por IA
 * con un pin encima: bonito en la maqueta, pero inerte y además dependiente
 * de una URL externa que la política de contenido bloquea. Aquí se dibuja de
 * verdad, en SVG, a partir de las coordenadas que ya viven en el modelo de
 * datos (`zona.mapa` y `punto.mapa`, en porcentaje), y cada punto es un
 * control real: se puede enfocar con el teclado y al pulsarlo abre la ficha
 * del comercio que ocupa ese punto.
 *
 * No se usa ningún servicio de mapas de pago ni ninguna tesela remota: es un
 * esquema propio del parque, que es lo que el encargo pedía.
 */

import { esc } from './componentes';
import { store } from '../data/store';
import type { PuntoComercial, Zona } from '../domain/types';

const ANCHO = 1000;
const ALTO = 640;

const ICONO_CATEGORIA: Record<string, string> = {
  comida: 'restaurant', bebidas: 'local_cafe', juguetes: 'toys', artesania: 'palette',
  recuerdos: 'redeem', alquileres: 'pedal_bike', atracciones: 'star', paseos: 'hiking',
};

function px(v: number): number {
  return Math.round((v / 100) * ANCHO);
}
function py(v: number): number {
  return Math.round((v / 100) * ALTO);
}

function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** Mancha orgánica alrededor de una zona, para que el mapa se lea como terreno. */
function manchaZona(z: Zona, i: number): string {
  const cx = px(z.mapa.x);
  const cy = py(z.mapa.y);
  const r = 118 + (hash(z.id) % 46);
  const d = 0.55 + ((hash(z.id) >> 5) % 30) / 100;
  return `
<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${Math.round(r * d)}"
  fill="${i % 2 ? '#c0edd4' : '#a4d0b8'}" opacity="0.45"/>
<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r * 0.72)}" ry="${Math.round(r * d * 0.72)}"
  fill="#88d7a8" opacity="0.30"/>`;
}

/** Senderos: unen las zonas en el orden en que vienen. */
function senderos(zonas: Zona[]): string {
  if (zonas.length < 2) return '';
  const puntos = zonas.map((z) => `${px(z.mapa.x)} ${py(z.mapa.y)}`);
  return `<polyline points="${puntos.join(' ')}" fill="none" stroke="#d5e7dd" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
<polyline points="${puntos.join(' ')}" fill="none" stroke="#bfc9c0" stroke-width="3" stroke-dasharray="12 10" stroke-linecap="round" opacity="0.8"/>`;
}

export interface OpcionesMapa {
  /** Ruta a la que navega un punto ocupado. Por defecto, la ficha del comercio. */
  rutaPunto?: (negocioId: string, punto: PuntoComercial) => string;
  /** Ruta de la etiqueta de zona. Por defecto, la zona del visitante. */
  rutaZona?: (zonaId: string) => string;
  /** Muestra también los puntos libres e inhabilitados (vista institucional). */
  mostrarNoOcupados?: boolean;
  clases?: string;
}

/**
 * Dibuja el mapa de un parque. Devuelve el SVG listo para insertar; los
 * controles usan el mismo `data-accion="ir"` que el resto de la aplicación,
 * así que no hace falta cablear nada aparte.
 */
export function mapaParque(parqueId: string, opciones: OpcionesMapa = {}): string {
  const e = store.leer();
  const {
    rutaPunto = (negocioId: string) => `/v/comercio/${negocioId}`,
    rutaZona = (zonaId: string) => `/v/zona/${zonaId}`,
    mostrarNoOcupados = false,
    clases = 'w-full h-auto block',
  } = opciones;

  const zonas = e.zonas.filter((z) => z.parqueId === parqueId);
  const puntos = e.puntos.filter(
    (p) => p.parqueId === parqueId && (mostrarNoOcupados || p.estado === 'ocupado'),
  );

  const marcadores = puntos
    .map((p) => {
      const local = e.locales.find((l) => l.puntoId === p.id);
      const negocio = local ? e.negocios.find((n) => n.id === local.negocioId) : undefined;
      const x = px(p.mapa.x);
      const y = py(p.mapa.y);
      const ocupado = p.estado === 'ocupado' && negocio;
      const color = ocupado ? '#005131' : p.estado === 'libre' ? '#6f7a71' : '#ba1a1a';
      const icono = negocio ? (ICONO_CATEGORIA[negocio.categoria] ?? 'storefront') : 'location_on';
      const etiqueta = negocio ? `${negocio.nombreComercial} — ${p.nombre}` : `${p.nombre} (${p.estado})`;

      // El grupo entero es el control: área táctil generosa (44px reales a
      // tamaño natural) aunque el pin dibujado sea más pequeño.
      const accion = ocupado
        ? `data-accion="ir" data-valor="${esc(rutaPunto(negocio!.id, p))}"`
        : 'data-accion="nada"';

      return `
<g class="mapa-pin ${ocupado ? 'cursor-pointer' : ''}" ${accion} role="${ocupado ? 'button' : 'img'}"
   ${ocupado ? 'tabindex="0"' : ''} aria-label="${esc(etiqueta)}">
  <title>${esc(etiqueta)}</title>
  <circle cx="${x}" cy="${y}" r="34" fill="transparent"/>
  <ellipse cx="${x}" cy="${y + 26}" rx="15" ry="5" fill="#002114" opacity="0.18"/>
  <path d="M ${x} ${y + 24} C ${x - 20} ${y - 4} ${x - 22} ${y - 34} ${x} ${y - 34}
           C ${x + 22} ${y - 34} ${x + 20} ${y - 4} ${x} ${y + 24} Z"
        fill="${color}"/>
  <circle cx="${x}" cy="${y - 20}" r="12" fill="#ffffff"/>
  <text x="${x}" y="${y - 14}" text-anchor="middle" font-family="Material Symbols Outlined"
        font-size="16" fill="${color}">${icono}</text>
</g>`;
    })
    .join('');

  const etiquetasZona = zonas
    .map((z) => {
      const x = px(z.mapa.x);
      const y = py(z.mapa.y);
      const ancho = Math.max(96, z.nombre.length * 11 + 28);
      return `
<g class="mapa-zona cursor-pointer" data-accion="ir" data-valor="${esc(rutaZona(z.id))}"
   role="button" tabindex="0" aria-label="Ver la zona ${esc(z.nombre)}">
  <title>Zona ${esc(z.nombre)}</title>
  <rect x="${x - ancho / 2}" y="${y - 78}" width="${ancho}" height="34" rx="17"
        fill="#ffffff" opacity="0.92" stroke="#bfc9c0"/>
  <text x="${x}" y="${y - 55}" text-anchor="middle" font-family="Manrope, sans-serif"
        font-size="16" font-weight="700" fill="#005131">${esc(z.nombre)}</text>
</g>`;
    })
    .join('');

  return `
<svg class="${clases}" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="http://www.w3.org/2000/svg"
     role="group" aria-label="Mapa del parque con ${zonas.length} zonas y ${puntos.length} puntos comerciales">
  <defs>
    <linearGradient id="terreno" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#f5f3ed"/>
      <stop offset="100%" stop-color="#e4e2dd"/>
    </linearGradient>
    <pattern id="reticula" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bfc9c0" stroke-width="1" opacity="0.35"/>
    </pattern>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#terreno)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#reticula)"/>

  <!-- Lámina de agua y arboleda: dan orientación sin pretender ser cartografía real. -->
  <path d="M -30 470 Q 150 430 310 476 Q 470 522 640 486 Q 810 450 1030 500 L 1030 670 L -30 670 Z"
        fill="#a4d0b8" opacity="0.55"/>
  <path d="M -30 500 Q 150 462 310 506 Q 470 550 640 516 Q 810 482 1030 530 L 1030 670 L -30 670 Z"
        fill="#88d7a8" opacity="0.45"/>

  ${zonas.map(manchaZona).join('')}
  ${senderos(zonas)}
  ${etiquetasZona}
  ${marcadores}
</svg>`;
}

/** Leyenda del mapa, en el mismo lenguaje visual de las tarjetas. */
export function leyendaMapa(mostrarNoOcupados = false): string {
  const item = (color: string, texto: string) => `
<div class="flex items-center gap-2">
  <span class="w-3 h-3 rounded-full" style="background:${color}"></span>
  <span class="font-label-sm text-label-sm text-on-surface-variant">${esc(texto)}</span>
</div>`;
  return `
<div class="flex flex-wrap gap-4 items-center">
  ${item('#005131', 'Punto con comercio abierto')}
  ${mostrarNoOcupados ? item('#6f7a71', 'Punto libre') : ''}
  ${mostrarNoOcupados ? item('#ba1a1a', 'Punto inhabilitado') : ''}
  ${item('#a4d0b8', 'Zona del parque')}
</div>`;
}
