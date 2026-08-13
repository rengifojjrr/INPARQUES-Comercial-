/**
 * Pantalla de acceso de la demostración: la portada del enlace que se
 * comparte.
 *
 * No existe en las 119 páginas de Stitch una pantalla de "selector de
 * perfiles": es propia de esta demo. Se compone con el mismo lenguaje visual
 * del resto del material (tarjeta sobre lienzo, campos de `p_gina_8_identificaci_n_y_checkout`,
 * chips de `p_gina_3_explorar_y_resultados`), no con un estilo inventado.
 *
 * Funciona como un acceso real —correo, contraseña y el mismo
 * `data-formulario="acceso"` que ya valida la sesión— y encima ofrece las
 * cuentas de prueba: al pulsar una, se rellenan las credenciales y se puede
 * entrar. Así el enlace sirve tanto para enseñar el acceso como para saltar
 * a cualquiera de los once roles sin tener que recordar un correo.
 */

import { esc } from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { estadoUi } from '../estado-ui';
import { ROLES } from '../../domain/roles';
import { CLAVE_DEMO } from '../../app/session';
import { CODIGO_MFA_DEMO } from '../../adapters/simulados';
import type { RoleId } from '../../domain/types';

/** Cuentas de prueba, agrupadas por la superficie a la que entran. */
const GRUPOS: Array<{ titulo: string; icono: string; usuarios: string[] }> = [
  { titulo: 'Visitante', icono: 'hiking', usuarios: ['us_visitante'] },
  {
    titulo: 'Comercio',
    icono: 'storefront',
    usuarios: ['us_prop_cedros', 'us_admin_cedros', 'us_operador_cedros', 'us_contador_cedros'],
  },
  {
    titulo: 'INPARQUES',
    icono: 'account_balance',
    usuarios: [
      'us_superadmin', 'us_direccion', 'us_finanzas',
      'us_admin_parque', 'us_inspector', 'us_soporte',
    ],
  },
];

/** Nombre corto del rol para el chip; el completo es largo para este sitio. */
const CORTO: Record<string, string> = {
  'visitante.cliente': 'Visitante',
  'comercio.propietario': 'Propietario',
  'comercio.admin_local': 'Admin. de local',
  'comercio.operador': 'Operador',
  'comercio.contador': 'Contador',
  'inparques.superadmin': 'Superadmin',
  'inparques.direccion_comercial': 'Dirección comercial',
  'inparques.finanzas': 'Finanzas',
  'inparques.admin_parque': 'Admin. de parque',
  'inparques.inspector': 'Inspector',
  'inparques.soporte': 'Soporte',
};

export const entradaStitch: Render = (): Pagina => {
  const e = store.leer();
  const correo = estadoUi.seleccion['acceso-correo'] ?? '';
  const clave = estadoUi.seleccion['acceso-clave'] ?? '';
  const elegido = estadoUi.seleccion['acceso-perfil'] ?? '';

  const chips = GRUPOS.map((g) => {
    const botones = g.usuarios
      .map((id) => {
        const u = e.usuarios.find((x) => x.id === id);
        if (!u) return '';
        const d = ROLES[u.rol as RoleId];
        const on = elegido === id;
        return `
        <button type="button" data-accion="usar-cuenta" data-valor="${esc(id)}"
          title="${esc(u.nombre)} · ${esc(u.correo)}"
          class="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border font-label-md text-label-md transition-colors ${
            on
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container-high'
          }">
          ${esc(CORTO[u.rol] ?? d.nombre)}
          ${d.requiereMfa ? `<span class="text-[10px] font-bold ${on ? 'opacity-80' : 'text-on-surface-variant'}">MFA</span>` : ''}
        </button>`;
      })
      .join('');
    return `
    <div class="flex flex-col gap-2">
      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[15px]">${esc(g.icono)}</span>
        ${esc(g.titulo)}
      </span>
      <div class="flex flex-wrap gap-2">${botones}</div>
    </div>`;
  }).join('');

  const usuarioElegido = elegido ? e.usuarios.find((x) => x.id === elegido) : undefined;

  const contenido = `
<div class="min-h-screen w-full flex flex-col items-center justify-center px-md py-xl relative overflow-hidden bg-surface">
  <!-- Lienzo: la misma banda de verdes de las portadas del sistema. -->
  <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
    <div class="absolute inset-0 bg-gradient-to-b from-secondary-container/40 via-surface to-surface"></div>
    <svg class="absolute bottom-0 left-0 w-full h-[46%]" viewBox="0 0 1440 420" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 250 Q 240 150 480 236 Q 720 322 960 216 Q 1200 110 1440 200 L1440 420 L0 420 Z" fill="#c0edd4" opacity="0.55"/>
      <path d="M0 300 Q 260 214 520 292 Q 780 370 1040 280 Q 1240 210 1440 268 L1440 420 L0 420 Z" fill="#88d7a8" opacity="0.45"/>
      <path d="M0 356 Q 300 292 600 348 Q 900 404 1200 344 Q 1330 318 1440 336 L1440 420 L0 420 Z" fill="#005131" opacity="0.16"/>
    </svg>
  </div>

  <main class="relative z-10 w-full max-w-[420px]">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_8px_32px_rgba(40,51,46,0.10)] p-lg md:p-xl flex flex-col gap-lg">

      <div class="flex flex-col gap-sm">
        <div class="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
          <span class="material-symbols-outlined icon-fill">park</span>
        </div>
        <div>
          <h1 class="font-headline-lg text-headline-lg-mobile text-on-surface">INPARQUES Comercial</h1>
          <p class="font-body-md text-body-md text-on-surface-variant mt-1">
            Comercio en parques nacionales — acceso a la plataforma
          </p>
        </div>
      </div>

      <form class="flex flex-col gap-md" data-formulario="acceso">
        <div class="flex flex-col gap-1.5">
          <label class="font-label-md text-label-md text-on-surface" for="acceso-correo">Correo</label>
          <input id="acceso-correo" name="correo" type="email" autocomplete="username"
            value="${esc(correo)}" placeholder="usuario@demo.ve"
            class="w-full h-touch-target px-4 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="font-label-md text-label-md text-on-surface" for="acceso-clave">Contraseña</label>
          <input id="acceso-clave" name="clave" type="password" autocomplete="current-password"
            value="${esc(clave)}"
            class="w-full h-touch-target px-4 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
        </div>
        <div id="error-acceso"></div>
        <button type="submit"
          class="w-full h-touch-target rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors">
          Ingresar
          <span class="material-symbols-outlined text-[18px]">login</span>
        </button>
      </form>

      <div class="flex flex-wrap justify-center gap-x-lg gap-y-2">
        <button type="button" data-accion="ir" data-valor="/registro/visitante"
          class="font-label-md text-label-md text-primary hover:underline">¿No tienes cuenta? Regístrate</button>
        <button type="button" data-accion="invitado"
          class="font-label-md text-label-md text-primary hover:underline">Entrar como invitado</button>
      </div>

      <div class="border-t border-outline-variant pt-lg flex flex-col gap-md">
        <p class="font-label-md text-label-md text-on-surface-variant">
          Cuentas de prueba (contraseña <strong class="text-on-surface font-mono">${esc(CLAVE_DEMO)}</strong>):
        </p>
        ${chips}
        ${
          usuarioElegido
            ? `<div class="flex items-start gap-2 bg-secondary-container/30 border border-secondary-container rounded-lg p-3">
                <span class="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span>
                <div class="min-w-0">
                  <p class="font-label-md text-label-md text-on-surface">${esc(usuarioElegido.nombre)}</p>
                  <p class="font-body-md text-sm text-on-surface-variant break-all">${esc(usuarioElegido.correo)}</p>
                  <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Credenciales cargadas. Pulse <strong class="text-on-surface">Ingresar</strong>.</p>
                </div>
              </div>`
            : `<p class="font-body-md text-sm text-on-surface-variant">
                Pulse una cuenta para cargar sus credenciales en el formulario.
                Los perfiles marcados <strong class="text-on-surface">MFA</strong> piden después el código
                <strong class="text-on-surface font-mono">${esc(CODIGO_MFA_DEMO)}</strong>.
              </p>`
        }
      </div>
    </div>

    <p class="text-center font-label-sm text-label-sm text-on-surface-variant mt-lg">
      Versión de demostración · datos ficticios · sin cobros reales
    </p>
  </main>
</div>`;

  return { titulo: 'INPARQUES Comercial', standalone: true, contenido };
};
