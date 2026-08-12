/**
 * Indice tecnico interno: mapa del producto.
 *
 * No es una pantalla para usuarios finales. Vive bajo `#/__mapa`, no se enlaza
 * desde ninguna navegacion de producto y su unico proposito es revisar la
 * cobertura: que vistas existen, por que ruta se alcanzan, que roles las ven,
 * cual es su HTML de referencia y en que estado esta cada una.
 */

import {
  VISTAS,
  VISTAS_ESPERADAS_SEGUN_ENUNCIADO,
  gruposDe,
  resumenCobertura,
  vistasDeSuperficie,
  type EstadoVista,
  type Vista,
} from '../app/registry';
import { ROLES, ROLE_IDS } from '../domain/roles';
import { emparejar } from '../app/router';
import type { RoleId } from '../domain/types';
import { inventarioAdaptadores } from '../adapters/simulados';

const SUPERFICIES: Array<{ clave: Vista['superficie']; nombre: string; nota: string }> = [
  { clave: 'compartida', nombre: 'Compartidas', nota: 'Acceso, identidad, estados de error y conectividad.' },
  { clave: 'visitante', nombre: 'Visitante (PWA movil)', nota: 'Mobile-first, usable con una mano, accesible por QR.' },
  { clave: 'comercio', nombre: 'Comercio (portal)', nota: 'Optimizado para tablet y escritorio.' },
  { clave: 'inparques', nombre: 'INPARQUES (panel institucional)', nota: 'Tablas, filtros, drill-down y trazabilidad en escritorio.' },
];

const ETIQUETA_ESTADO: Record<EstadoVista, { texto: string; clase: string }> = {
  pendiente_html: { texto: 'Pendiente de HTML', clase: 'and-marca--pendiente' },
  implementada: { texto: 'Implementada', clase: '' },
  conectada: { texto: 'Conectada', clase: 'and-marca--ok' },
  revisada: { texto: 'Revisada', clase: 'and-marca--ok' },
  bloqueada: { texto: 'Bloqueada', clase: 'and-marca--error' },
};

interface Filtros {
  rol: RoleId | 'todos';
  texto: string;
  soloPendientes: boolean;
}

const filtros: Filtros = { rol: 'todos', texto: '', soloPendientes: false };

export function renderizarMapa(raiz: HTMLElement): void {
  raiz.innerHTML = '';
  raiz.append(cinta(), envoltura());
  conectarControles(raiz);
}

function cinta(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'and-cinta';
  el.innerHTML = `
    <strong>Indice tecnico interno</strong>
    <span>Uso de desarrollo. No forma parte de la navegacion del producto.</span>
    <code>#/__mapa</code>
  `;
  return el;
}

function envoltura(): HTMLElement {
  const r = resumenCobertura();
  const el = document.createElement('main');
  el.className = 'and-envoltura';
  el.id = 'contenido';

  el.innerHTML = `
    <h1 class="and-titulo">Mapa del producto - INPARQUES Comercial</h1>
    <p class="and-bajada">
      Todas las paginas agrupadas por superficie y rol, con su ruta, sus roles autorizados,
      su HTML de referencia y su estado de revision.
    </p>

    <div class="and-aviso">
      <h2>Aspecto provisional</h2>
      <p>
        Las ${VISTAS.length} rutas de abajo funcionan con datos reales, pero su aspecto es
        provisional: las plantillas HTML del cliente todavia no se han recibido, asi que ninguna
        tiene HTML de referencia asignado. El enunciado menciona
        ${VISTAS_ESPERADAS_SEGUN_ENUNCIADO} vistas y la diferencia de
        ${Math.abs(r.diferencia)} solo puede reconciliarse contra los archivos entregados.
      </p>
    </div>

    ${cifras(r)}
    ${controles()}
    <div id="and-listado"></div>
    ${seccionAdaptadores()}
    ${seccionDiagnostico()}
  `;
  return el;
}

function cifras(r: ReturnType<typeof resumenCobertura>): string {
  const items: Array<[string, string | number]> = [
    ['Rutas registradas', r.total],
    ['Segun enunciado', r.esperadasSegunEnunciado],
    ['Compartidas', r.porSuperficie.compartida],
    ['Visitante', r.porSuperficie.visitante],
    ['Comercio', r.porSuperficie.comercio],
    ['INPARQUES', r.porSuperficie.inparques],
    ['Pendientes de HTML', r.porEstado.pendiente_html],
    ['Revisadas', r.porEstado.revisada],
  ];
  return `<div class="and-cifras">${items
    .map(([etiqueta, valor]) => `<div class="and-cifra"><b>${valor}</b><span>${etiqueta}</span></div>`)
    .join('')}</div>`;
}

function controles(): string {
  const opciones = ROLE_IDS.map((r) => `<option value="${r}">${ROLES[r].nombre}</option>`).join('');
  return `
    <div class="and-controles">
      <label for="f-rol">Filtrar por rol</label>
      <select id="f-rol" aria-label="Filtrar vistas por rol">
        <option value="todos">Todos los roles</option>
        ${opciones}
      </select>
      <label for="f-texto">Buscar</label>
      <input id="f-texto" type="search" placeholder="ruta, titulo o grupo" aria-label="Buscar vistas" />
      <label for="f-pend"><input id="f-pend" type="checkbox" /> Solo pendientes de HTML</label>
      <button class="and-boton" id="b-csv" type="button">Exportar CSV</button>
    </div>
  `;
}

function aplicaFiltro(v: Vista): boolean {
  if (filtros.soloPendientes && v.estado !== 'pendiente_html') return false;
  if (filtros.rol !== 'todos' && v.roles.length > 0 && !v.roles.includes(filtros.rol)) return false;
  if (filtros.rol !== 'todos' && v.roles.length === 0) {
    // Las rutas publicas son alcanzables por cualquiera; se conservan.
  }
  if (filtros.texto) {
    const t = filtros.texto.toLowerCase();
    if (!`${v.ruta} ${v.titulo} ${v.grupo} ${v.id}`.toLowerCase().includes(t)) return false;
  }
  return true;
}

function listado(): string {
  const bloques = SUPERFICIES.map((s) => {
    const vistas = vistasDeSuperficie(s.clave).filter(aplicaFiltro);
    if (vistas.length === 0) return '';

    const grupos = gruposDe(s.clave)
      .map((g) => {
        const filas = vistas.filter((v) => v.grupo === g);
        if (filas.length === 0) return '';
        return `
          <h3 class="and-roles" style="margin:16px 0 6px">${g} (${filas.length})</h3>
          <div class="and-tabla-envoltura">
            <table class="and-tabla">
              <thead>
                <tr>
                  <th scope="col">Ruta</th>
                  <th scope="col">Vista</th>
                  <th scope="col">Roles autorizados</th>
                  <th scope="col">HTML de referencia</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>${filas.map(fila).join('')}</tbody>
            </table>
          </div>
        `;
      })
      .join('');

    return `
      <section class="and-grupo">
        <h2>${s.nombre} - ${vistas.length} vistas</h2>
        <p class="and-roles" style="margin:0 0 4px">${s.nota}</p>
        ${grupos}
      </section>
    `;
  }).join('');

  return bloques || '<div class="and-vacio">Ninguna vista coincide con el filtro aplicado.</div>';
}

function fila(v: Vista): string {
  const e = ETIQUETA_ESTADO[v.estado];
  const roles =
    v.roles.length === 0
      ? 'Publica (sin sesion)'
      : v.roles.length === ROLE_IDS.length
        ? 'Todos los roles'
        : v.roles.map((r) => ROLES[r].nombre).join(', ');
  return `
    <tr>
      <td><a href="#${v.ruta}"><code>${v.ruta}</code></a></td>
      <td>${v.titulo}${v.notas ? `<br><span class="and-roles">${v.notas}</span>` : ''}</td>
      <td class="and-roles">${roles}</td>
      <td><code>${v.htmlRef || '—'}</code></td>
      <td><span class="and-marca ${e.clase}">${e.texto}</span></td>
    </tr>
  `;
}

function seccionAdaptadores(): string {
  const filas = inventarioAdaptadores()
    .map(
      (a) => `
      <tr>
        <td><code>${a.id}</code></td>
        <td>${a.descripcion}</td>
        <td><span class="and-marca and-marca--pendiente">Simulado</span></td>
      </tr>`,
    )
    .join('');
  return `
    <section class="and-grupo">
      <h2>Adaptadores de integracion</h2>
      <p class="and-roles" style="margin:0 0 8px">
        Ninguno hace peticiones de red. Cada uno graba su identificador en los registros que produce.
      </p>
      <div class="and-tabla-envoltura">
        <table class="and-tabla">
          <thead><tr><th scope="col">Identificador</th><th scope="col">Que hace en la demo</th><th scope="col">Tipo</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </section>
  `;
}

/** Comprobaciones automaticas de coherencia del propio registro. */
export function diagnostico() {
  const problemas: Array<{ severidad: 'error' | 'aviso'; detalle: string }> = [];

  const rutas = new Set<string>();
  for (const v of VISTAS) {
    if (rutas.has(v.ruta)) problemas.push({ severidad: 'error', detalle: `Ruta duplicada: ${v.ruta}` });
    rutas.add(v.ruta);
    if (!emparejar(v.ruta.replace(/:([^/]+)/g, 'demo'))) {
      problemas.push({ severidad: 'error', detalle: `La ruta ${v.ruta} no resuelve en el router.` });
    }
    for (const salida of v.salidas ?? []) {
      if (!VISTAS.some((x) => x.ruta === salida)) {
        problemas.push({ severidad: 'error', detalle: `${v.id} apunta a una ruta inexistente: ${salida}` });
      }
    }
    if (!v.htmlRef) {
      problemas.push({ severidad: 'aviso', detalle: `${v.id} (${v.ruta}) aun no tiene HTML de referencia.` });
    }
    if (v.estado === 'pendiente_html') {
      problemas.push({ severidad: 'error', detalle: `${v.id} (${v.ruta}) no tiene vista que la dibuje.` });
    }
  }

  for (const rol of ROLE_IDS) {
    const suyas = VISTAS.filter((v) => v.roles.includes(rol));
    if (suyas.length === 0) {
      problemas.push({ severidad: 'error', detalle: `El rol ${ROLES[rol].nombre} no tiene ninguna vista asignada.` });
    }
  }

  return problemas;
}

function seccionDiagnostico(): string {
  const p = diagnostico();
  const errores = p.filter((x) => x.severidad === 'error');
  const avisos = p.filter((x) => x.severidad === 'aviso');

  const lista = errores.length
    ? `<ul>${errores.map((x) => `<li>${x.detalle}</li>`).join('')}</ul>`
    : '<p class="and-roles">Sin errores de coherencia: ninguna ruta duplicada, ninguna ruta que no resuelva y ningun rol sin vistas.</p>';

  return `
    <section class="and-grupo" id="and-diagnostico">
      <h2>Diagnostico del registro</h2>
      <p>
        <span class="and-marca ${errores.length ? 'and-marca--error' : 'and-marca--ok'}">${errores.length} errores</span>
        <span class="and-marca and-marca--pendiente">${avisos.length} vistas sin HTML asignado</span>
      </p>
      ${lista}
    </section>
  `;
}

function conectarControles(raiz: HTMLElement): void {
  const listadoEl = raiz.querySelector<HTMLElement>('#and-listado');
  if (!listadoEl) return;
  listadoEl.innerHTML = listado();

  const refrescar = () => {
    listadoEl.innerHTML = listado();
    anunciar(`${VISTAS.filter(aplicaFiltro).length} vistas coinciden con el filtro.`);
  };

  raiz.querySelector<HTMLSelectElement>('#f-rol')?.addEventListener('change', (ev) => {
    filtros.rol = (ev.target as HTMLSelectElement).value as Filtros['rol'];
    refrescar();
  });
  raiz.querySelector<HTMLInputElement>('#f-texto')?.addEventListener('input', (ev) => {
    filtros.texto = (ev.target as HTMLInputElement).value;
    refrescar();
  });
  raiz.querySelector<HTMLInputElement>('#f-pend')?.addEventListener('change', (ev) => {
    filtros.soloPendientes = (ev.target as HTMLInputElement).checked;
    refrescar();
  });
  raiz.querySelector<HTMLButtonElement>('#b-csv')?.addEventListener('click', exportarCsv);
}

function anunciar(texto: string): void {
  const el = document.getElementById('anuncios');
  if (el) el.textContent = texto;
}

export function csvCobertura(): string {
  const cab = ['id', 'ruta', 'titulo', 'superficie', 'grupo', 'roles', 'html_referencia', 'estado'];
  const filas = VISTAS.map((v) =>
    [
      v.id,
      v.ruta,
      v.titulo,
      v.superficie,
      v.grupo,
      v.roles.length === 0 ? 'publica' : v.roles.join(' | '),
      v.htmlRef || '',
      v.estado,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [cab.join(','), ...filas].join('\n');
}

function exportarCsv(): void {
  const blob = new Blob([csvCobertura()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cobertura-vistas-inparques.csv';
  a.click();
  URL.revokeObjectURL(url);
  anunciar('Archivo CSV de cobertura descargado.');
}
