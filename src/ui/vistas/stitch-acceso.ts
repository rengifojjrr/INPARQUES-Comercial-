/**
 * Pantalla de entrada, construida con los componentes reales de Stitch.
 *
 * No existe en las 119 páginas entregadas una pantalla literal de "selector
 * de perfiles": es específica de esta demostración. Se compone reutilizando
 * el mismo lenguaje visual que el resto del material (la tarjeta bento de
 * bienvenida de `50/p_gina_1_acceso_qr_selecci_n_parquef`, las tarjetas de
 * lista con icono + chip de `50/p_gina_1_inicio_y_estado_de_habilitaci_n`),
 * no un estilo propio.
 */

import { esc } from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { ROLES } from '../../domain/roles';
import { CLAVE_DEMO } from '../../app/session';
import { CODIGO_MFA_DEMO } from '../../adapters/simulados';
import type { RoleId } from '../../domain/types';

interface PerfilDemo {
  usuarioId: string;
  icono: string;
  descripcion: string;
}

const GRUPOS: Array<{ titulo: string; icono: string; perfiles: PerfilDemo[] }> = [
  {
    titulo: 'Visitante',
    icono: 'hiking',
    perfiles: [
      { usuarioId: 'us_visitante', icono: 'person', descripcion: 'Compra, reserva y consulta su propio historial.' },
    ],
  },
  {
    titulo: 'Comercio',
    icono: 'storefront',
    perfiles: [
      { usuarioId: 'us_prop_cedros', icono: 'storefront', descripcion: 'Cuenta bancaria, contratos, equipo y reportes.' },
      { usuarioId: 'us_admin_cedros', icono: 'store', descripcion: 'Catálogo, horarios, pedidos, caja y personal.' },
      { usuarioId: 'us_operador_cedros', icono: 'restaurant', descripcion: 'Acepta, prepara y marca listos los pedidos.' },
      { usuarioId: 'us_contador_cedros', icono: 'calculate', descripcion: 'Facturas, cierres, reportes y conciliación.' },
    ],
  },
  {
    titulo: 'INPARQUES',
    icono: 'account_balance',
    perfiles: [
      { usuarioId: 'us_superadmin', icono: 'admin_panel_settings', descripcion: 'Configuración global, usuarios y auditoría.' },
      { usuarioId: 'us_direccion', icono: 'business_center', descripcion: 'Expedientes, contratos, permisos y cánones.' },
      { usuarioId: 'us_finanzas', icono: 'account_balance_wallet', descripcion: 'Conciliación, liquidaciones y cuentas por cobrar.' },
      { usuarioId: 'us_admin_parque', icono: 'park', descripcion: 'Operación, zonas, horarios y desempeño del parque.' },
      { usuarioId: 'us_inspector', icono: 'verified', descripcion: 'Valida permisos, registra inspecciones e incidencias.' },
      { usuarioId: 'us_soporte', icono: 'support_agent', descripcion: 'Casos, evidencias y reembolsos sujetos a aprobación.' },
    ],
  },
];

function tarjetaPerfil(p: PerfilDemo): string {
  const e = store.leer();
  const u = e.usuarios.find((x) => x.id === p.usuarioId);
  if (!u) return '';
  const d = ROLES[u.rol as RoleId];
  return `
    <button type="button" data-accion="ir" data-valor="#perfil:${esc(u.id)}"
      class="w-full flex items-center gap-md bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-left hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] hover:border-primary/30 transition-all active:scale-[0.99]">
      <div class="w-11 h-11 shrink-0 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
        <span class="material-symbols-outlined text-[22px]">${esc(p.icono)}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-xs flex-wrap">
          <span class="font-label-md text-label-md text-on-surface">${esc(d.nombre)}</span>
          ${d.requiereMfa ? '<span class="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold px-2 py-0.5 rounded-full">MFA</span>' : ''}
        </div>
        <p class="font-body-md text-sm text-on-surface-variant mt-0.5 truncate">${esc(p.descripcion)}</p>
      </div>
      <span class="material-symbols-outlined text-on-surface-variant shrink-0">chevron_right</span>
    </button>`;
}

export const entradaStitch: Render = (): Pagina => {
  const grupos = GRUPOS.map(
    (g) => `
    <section class="flex flex-col gap-sm">
      <h2 class="font-label-md text-label-md text-outline uppercase tracking-wider flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">${esc(g.icono)}</span>
        ${esc(g.titulo)}
      </h2>
      <div class="flex flex-col gap-xs">
        ${g.perfiles.map(tarjetaPerfil).join('')}
      </div>
    </section>`,
  ).join('');

  const contenido = `
<!-- TopAppBar, mismo patrón que 50/p_gina_1_acceso_qr_selecci_n_parquef -->
<header class="bg-surface text-primary font-headline-md flex justify-between items-center px-lg w-full h-14 border-b border-outline-variant sticky top-0 z-40">
  <div class="flex items-center gap-sm">
    <span class="material-symbols-outlined">park</span>
    <span class="font-bold">INPARQUES Comercial</span>
  </div>
  <span class="inline-flex items-center gap-1 bg-error-container/40 text-error text-[11px] font-bold px-2 py-1 rounded-full">
    <span class="material-symbols-outlined text-[14px]">warning</span>
    Demostración
  </span>
</header>

<main class="flex-grow flex flex-col p-lg gap-xl max-w-2xl mx-auto w-full pb-16">
  <section class="flex flex-col gap-sm">
    <h1 class="font-headline-lg text-headline-lg-mobile text-on-surface">Bienvenido</h1>
    <p class="font-body-md text-body-md text-on-surface-variant">
      Toque un perfil de demostración para entrar directamente con su rol, permisos y ámbito.
      Puede cambiar de perfil en cualquier momento.
    </p>
  </section>

  <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden flex flex-col gap-sm">
    <div class="absolute -right-12 -top-12 w-48 h-48 bg-secondary-container rounded-full opacity-30 blur-2xl pointer-events-none"></div>
    <div class="flex items-start gap-md z-10">
      <div class="w-11 h-11 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary">badge</span>
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="font-headline-md text-headline-lg-mobile text-on-surface" style="font-size:18px">Once roles, una sola base de datos</h3>
        <p class="font-body-md text-sm text-on-surface-variant">
          Lo que hace un rol lo ven los demás de inmediato: si el operador marca un pedido listo,
          el visitante lo ve en su seguimiento.
        </p>
      </div>
    </div>
    <button type="button" data-accion="invitado"
      class="w-full mt-2 bg-primary-container text-on-primary font-label-md text-label-md h-touch-target rounded-lg flex items-center justify-center gap-sm hover:bg-surface-tint transition-colors">
      <span>Comprar como invitado, sin cuenta</span>
      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
    </button>
  </section>

  <div class="flex items-center gap-md">
    <div class="h-px bg-outline-variant flex-grow"></div>
    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">O elija un perfil</span>
    <div class="h-px bg-outline-variant flex-grow"></div>
  </div>

  ${grupos}

  <div class="flex items-center gap-md">
    <div class="h-px bg-outline-variant flex-grow"></div>
    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Otras entradas</span>
    <div class="h-px bg-outline-variant flex-grow"></div>
  </div>

  <div class="flex flex-col gap-xs">
    <button type="button" data-accion="ir" data-valor="/acceso/visitante"
      class="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-md h-touch-target text-left hover:bg-surface-container-high transition-colors">
      <span class="font-label-md text-label-md text-on-surface">Formulario de acceso del visitante</span>
      <span class="material-symbols-outlined text-on-surface-variant text-[20px]">login</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/acceso/comercio"
      class="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-md h-touch-target text-left hover:bg-surface-container-high transition-colors">
      <span class="font-label-md text-label-md text-on-surface">Formulario de acceso del comercio</span>
      <span class="material-symbols-outlined text-on-surface-variant text-[20px]">login</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/acceso/inparques"
      class="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-md h-touch-target text-left hover:bg-surface-container-high transition-colors">
      <span class="font-label-md text-label-md text-on-surface">Formulario de acceso institucional</span>
      <span class="material-symbols-outlined text-on-surface-variant text-[20px]">login</span>
    </button>
  </div>

  <p class="font-body-md text-sm text-on-surface-variant text-center">
    Si usa el formulario, la contraseña de todos los perfiles es <strong class="text-on-surface">${esc(CLAVE_DEMO)}</strong>
    y el código de verificación es <strong class="text-on-surface">${esc(CODIGO_MFA_DEMO)}</strong>.
  </p>
</main>`;

  return {
    titulo: 'INPARQUES Comercial',
    standalone: true,
    contenido,
  };
};
