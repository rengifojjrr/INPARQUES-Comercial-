/**
 * Piezas reutilizables de interfaz.
 *
 * Las vistas devuelven cadenas HTML y el comportamiento se conecta por
 * delegación desde `atajos.ts`, con atributos `data-accion`. Así el marcado
 * de cada vista queda en un solo lugar y podrá sustituirse por el HTML
 * original sin reescribir la lógica.
 */

import type { Tono } from '../domain/state-machines';
import { formatearUsd, formatearVes, usdAVes } from '../domain/money';

// --------------------------------------------------------------- Plantillas

/** Escapa por defecto; usar `crudo()` para insertar HTML ya construido. */
export function html(partes: TemplateStringsArray, ...valores: unknown[]): string {
  return partes.reduce((acc, parte, i) => {
    if (i === 0) return parte;
    const v = valores[i - 1];
    return acc + interpolar(v) + parte;
  }, '');
}

const MARCA_CRUDO = '__crudo__';
type Crudo = { [MARCA_CRUDO]: string };

export function crudo(s: string): Crudo {
  return { [MARCA_CRUDO]: s };
}

function interpolar(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(interpolar).join('');
  if (typeof v === 'object' && MARCA_CRUDO in (v as Crudo)) return (v as Crudo)[MARCA_CRUDO];
  return esc(String(v));
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Atributo de acción: `${accion('ir', '/v/carrito')}` */
export function accion(nombre: string, valor?: string): Crudo {
  return crudo(`data-accion="${esc(nombre)}"${valor !== undefined ? ` data-valor="${esc(valor)}"` : ''}`);
}

// ------------------------------------------------------------------ Básicos

export function insignia(texto: string, tono: Tono = 'neutro', simbolo?: string): string {
  // El color nunca es el único indicador: cada tono lleva su símbolo textual.
  const simbolos: Record<Tono, string> = {
    neutro: '•', progreso: '◐', exito: '✓', alerta: '!', error: '×',
  };
  return html`<span class="insignia insignia--${crudo(tono)}"
    ><span aria-hidden="true">${simbolo ?? simbolos[tono]}</span>${texto}</span
  >`;
}

export function boton(
  texto: string,
  opciones: {
    variante?: 'principal' | 'secundario' | 'tenue' | 'peligro' | 'texto';
    accion?: string;
    valor?: string;
    bloque?: boolean;
    pequeno?: boolean;
    desactivado?: boolean;
    icono?: string;
    tipo?: 'button' | 'submit';
    etiquetaAccesible?: string;
  } = {},
): string {
  const clases = [
    'bt',
    `bt--${opciones.variante ?? 'secundario'}`,
    opciones.bloque ? 'bt--bloque' : '',
    opciones.pequeno ? 'bt--pequeno' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return html`<button
    class="${clases}"
    type="${opciones.tipo ?? 'button'}"
    ${opciones.accion ? accion(opciones.accion, opciones.valor) : ''}
    ${opciones.desactivado ? crudo('disabled') : ''}
    ${opciones.etiquetaAccesible ? crudo(`aria-label="${esc(opciones.etiquetaAccesible)}"`) : ''}
  >${opciones.icono ? crudo(`<span aria-hidden="true">${esc(opciones.icono)}</span>`) : ''}${texto}</button>`;
}

export function tarjeta(contenido: string, opciones: { accionIr?: string; clase?: string } = {}): string {
  if (opciones.accionIr) {
    return html`<button class="tarjeta tarjeta--pulsable ${opciones.clase ?? ''}" ${accion('ir', opciones.accionIr)}>
      ${crudo(contenido)}
    </button>`;
  }
  return html`<div class="tarjeta ${opciones.clase ?? ''}">${crudo(contenido)}</div>`;
}

export function seccion(titulo: string, contenido: string, enlace?: { texto: string; ruta: string }): string {
  return html`<section class="seccion">
    <div class="seccion__cab">
      <h2 class="seccion__tit">${titulo}</h2>
      ${enlace ? crudo(`<button class="seccion__enl" data-accion="ir" data-valor="${esc(enlace.ruta)}">${esc(enlace.texto)} ›</button>`) : ''}
    </div>
    ${crudo(contenido)}
  </section>`;
}

export function metrica(valor: string, etiqueta: string, delta?: { texto: string; tono: Tono }): string {
  const colores: Record<Tono, string> = {
    neutro: 'var(--texto-2)', progreso: 'var(--info)', exito: 'var(--exito)',
    alerta: 'var(--alerta)', error: 'var(--error)',
  };
  return html`<div class="metrica">
    <div class="metrica__v">${valor}</div>
    <div class="metrica__e">${etiqueta}</div>
    ${delta ? crudo(`<div class="metrica__d" style="color:${colores[delta.tono]}">${esc(delta.texto)}</div>`) : ''}
  </div>`;
}

export function listaDatos(filas: Array<[string, string] | null>): string {
  return html`<div class="lista-datos">
    ${filas.filter(Boolean).map((f) => crudo(`<div><span class="dt">${esc(f![0])}</span><span class="dd">${f![1]}</span></div>`))}
  </div>`;
}

export function vacio(icono: string, titulo: string, detalle: string, accionTexto?: string, ruta?: string): string {
  return html`<div class="estado">
    <div class="estado__ic" aria-hidden="true">${icono}</div>
    <p class="estado__t">${titulo}</p>
    <p class="estado__d">${detalle}</p>
    ${accionTexto && ruta ? crudo(boton(accionTexto, { variante: 'principal', accion: 'ir', valor: ruta })) : ''}
  </div>`;
}

export function cargando(filas = 3): string {
  return html`<div class="pila" aria-busy="true" aria-label="Cargando contenido">
    ${Array.from({ length: filas }, () => crudo('<div class="esqueleto" style="height:76px"></div>'))}
  </div>`;
}

export function aviso(
  tipo: 'info' | 'alerta' | 'error' | 'exito',
  titulo: string,
  cuerpo?: string,
): string {
  const iconos = { info: 'ℹ', alerta: '⚠', error: '✕', exito: '✓' };
  return html`<div class="aviso aviso--${crudo(tipo)}" role="${crudo(tipo === 'error' ? 'alert' : 'status')}">
    <span aria-hidden="true">${iconos[tipo]}</span>
    <div><b>${titulo}</b>${cuerpo ? crudo(`<span>${esc(cuerpo)}</span>`) : ''}</div>
  </div>`;
}

export function etiquetaDemo(texto = 'Modo demostración'): string {
  return html`<span class="etiqueta-demo"><span aria-hidden="true">◆</span>${texto}</span>`;
}

// ------------------------------------------------------------------ Importes

/** USD como referencia de lista, VES como monto pagadero. Siempre ambos. */
export function precio(montoUsd: number, tasa: number, opciones: { compacto?: boolean } = {}): string {
  if (opciones.compacto) {
    return html`<span class="precio">${formatearUsd(montoUsd)}</span>`;
  }
  return html`<span class="precio"
    >${formatearUsd(montoUsd)}<span class="precio__ves">${formatearVes(usdAVes(montoUsd, tasa))}</span></span
  >`;
}

// -------------------------------------------------------------- Formularios

export function campo(
  etiqueta: string,
  entrada: string,
  opciones: { ayuda?: string; error?: string } = {},
): string {
  return html`<div class="campo">
    ${crudo(etiqueta)}
    ${crudo(entrada)}
    ${opciones.ayuda ? crudo(`<p class="campo__ay">${esc(opciones.ayuda)}</p>`) : ''}
    ${opciones.error ? crudo(`<p class="campo__err" role="alert">${esc(opciones.error)}</p>`) : ''}
  </div>`;
}

export function entradaTexto(
  id: string,
  etiqueta: string,
  opciones: {
    tipo?: string;
    valor?: string;
    marcador?: string;
    ayuda?: string;
    error?: string;
    requerido?: boolean;
    modo?: string;
    autocompletar?: string;
  } = {},
): string {
  return campo(
    `<label class="campo__et" for="${esc(id)}">${esc(etiqueta)}${opciones.requerido ? ' *' : ''}</label>`,
    `<input class="entrada" id="${esc(id)}" name="${esc(id)}" type="${esc(opciones.tipo ?? 'text')}"
      value="${esc(opciones.valor ?? '')}" placeholder="${esc(opciones.marcador ?? '')}"
      ${opciones.modo ? `inputmode="${esc(opciones.modo)}"` : ''}
      ${opciones.autocompletar ? `autocomplete="${esc(opciones.autocompletar)}"` : ''}
      ${opciones.requerido ? 'required' : ''}
      ${opciones.error ? 'aria-invalid="true"' : ''}
      ${opciones.ayuda || opciones.error ? `aria-describedby="${esc(id)}-ay"` : ''} />`,
    { ayuda: opciones.ayuda, error: opciones.error },
  );
}

export function areaTexto(
  id: string,
  etiqueta: string,
  opciones: { valor?: string; marcador?: string; ayuda?: string; error?: string; requerido?: boolean } = {},
): string {
  return campo(
    `<label class="campo__et" for="${esc(id)}">${esc(etiqueta)}${opciones.requerido ? ' *' : ''}</label>`,
    `<textarea class="area" id="${esc(id)}" name="${esc(id)}" placeholder="${esc(opciones.marcador ?? '')}"
      ${opciones.requerido ? 'required' : ''} ${opciones.error ? 'aria-invalid="true"' : ''}>${esc(opciones.valor ?? '')}</textarea>`,
    { ayuda: opciones.ayuda, error: opciones.error },
  );
}

export function selector(
  id: string,
  etiqueta: string,
  opciones: Array<{ valor: string; texto: string }>,
  seleccionado?: string,
  ayuda?: string,
): string {
  return campo(
    `<label class="campo__et" for="${esc(id)}">${esc(etiqueta)}</label>`,
    `<select class="selector" id="${esc(id)}" name="${esc(id)}">
      ${opciones.map((o) => `<option value="${esc(o.valor)}"${o.valor === seleccionado ? ' selected' : ''}>${esc(o.texto)}</option>`).join('')}
    </select>`,
    { ayuda },
  );
}

export function opcionRadio(
  nombre: string,
  valor: string,
  titulo: string,
  detalle?: string,
  marcado = false,
  desactivado = false,
): string {
  return html`<label class="opcion" aria-checked="${crudo(String(marcado))}" ${desactivado ? crudo('style="opacity:.5"') : ''}>
    <input type="radio" name="${nombre}" value="${valor}" ${marcado ? crudo('checked') : ''} ${desactivado ? crudo('disabled') : ''} />
    <span class="crece">
      <span style="font-weight:600">${titulo}</span>
      ${detalle ? crudo(`<span class="tenue" style="display:block">${esc(detalle)}</span>`) : ''}
    </span>
  </label>`;
}

export function conmutador(id: string, etiqueta: string, activo: boolean, accionNombre: string, valor: string): string {
  return html`<div class="fila fila--sep">
    <span class="crece" id="${id}-et">${etiqueta}</span>
    <button class="conmutador" role="switch" aria-checked="${crudo(String(activo))}" aria-labelledby="${id}-et"
      ${accion(accionNombre, valor)}></button>
  </div>`;
}

export function contador(cantidad: number, accionMenos: string, accionMas: string, valor: string, max?: number): string {
  return html`<div class="contador">
    <button ${accion(accionMenos, valor)} aria-label="Quitar una unidad" ${cantidad <= 0 ? crudo('disabled') : ''}>−</button>
    <span aria-live="polite">${cantidad}</span>
    <button ${accion(accionMas, valor)} aria-label="Agregar una unidad" ${max !== undefined && cantidad >= max ? crudo('disabled') : ''}>+</button>
  </div>`;
}

// ---------------------------------------------------------------- Colecciones

export interface ColumnaTabla<T> {
  clave: string;
  titulo: string;
  render: (fila: T) => string;
  numerica?: boolean;
}

export function tabla<T>(
  columnas: Array<ColumnaTabla<T>>,
  filas: T[],
  opciones: { rutaFila?: (f: T) => string; vacio?: string } = {},
): string {
  if (filas.length === 0) {
    return vacio('◻', 'Sin resultados', opciones.vacio ?? 'No hay registros que coincidan con los filtros aplicados.');
  }
  return html`<div class="tabla-caja">
      <table class="tabla">
        <thead>
          <tr>${columnas.map((c) => crudo(`<th scope="col"${c.numerica ? ' class="num"' : ''}>${esc(c.titulo)}</th>`))}</tr>
        </thead>
        <tbody>
          ${filas.map(
            (f) => crudo(`<tr${opciones.rutaFila ? ` data-ir data-accion="ir" data-valor="${esc(opciones.rutaFila(f))}" tabindex="0"` : ''}>
              ${columnas.map((c) => `<td${c.numerica ? ' class="num"' : ''}>${c.render(f)}</td>`).join('')}
            </tr>`),
          )}
        </tbody>
      </table>
    </div>
    <p class="pista-rodar"><span aria-hidden="true">↔</span> Deslice la tabla para ver el resto de columnas.</p>`;
}

export function chips(
  opciones: Array<{ valor: string; texto: string }>,
  activo: string,
  accionNombre: string,
): string {
  return html`<div class="filtros" role="group" aria-label="Filtros">
    ${opciones.map(
      (o) => crudo(`<button class="chip" aria-pressed="${o.valor === activo}" data-accion="${esc(accionNombre)}" data-valor="${esc(o.valor)}">${esc(o.texto)}</button>`),
    )}
  </div>`;
}

export function buscador(id: string, marcador: string, valor = '', accionNombre = 'buscar'): string {
  return html`<div class="buscador">
    <span class="buscador__ic" aria-hidden="true">⌕</span>
    <label class="solo-lectores" for="${id}">${marcador}</label>
    <input class="entrada" id="${id}" type="search" placeholder="${marcador}" value="${valor}"
      ${accion(accionNombre)} autocomplete="off" />
  </div>`;
}

export function lineaTiempo(
  pasos: Array<{ titulo: string; detalle?: string; estado: 'hecho' | 'activo' | 'pendiente' }>,
): string {
  return html`<ol class="linea-tiempo" style="list-style:none;margin:0;padding-left:22px">
    ${pasos.map(
      (p) => crudo(`<li class="linea-tiempo__it linea-tiempo__it--${p.estado}">
        <div style="font-weight:600;font-size:14.5px">${esc(p.titulo)}</div>
        ${p.detalle ? `<div class="tenue-2">${esc(p.detalle)}</div>` : ''}
      </li>`),
    )}
  </ol>`;
}

export function barraAccion(botones: string[]): string {
  return html`<div class="barra-accion">${botones.map((b) => crudo(b))}</div>`;
}
