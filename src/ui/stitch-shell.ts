/**
 * Adaptación técnica mínima para las páginas de escritorio de Stitch.
 *
 * Las páginas de "Portal de Concesionarios", "Portal Admin", "INPARQUES
 * Control Panel", etc. se diseñaron con una barra lateral fija de 256px
 * (`w-64 fixed left-0` + `ml-64` en el contenido) y sin conducta responsive:
 * en una pantalla de 390px la barra ocuparía dos tercios del ancho y el
 * contenido quedaría inutilizable.
 *
 * Esto es exactamente la excepción que contempla el encargo: "no debes
 * cambiar... comportamiento responsive, salvo cuando sea estrictamente
 * necesario para corregir un error técnico que impida que la interfaz
 * funcione". La corrección es mecánica, no visual: por debajo de 768px la
 * barra se convierte en un cajón que se abre con un botón de menú, en vez de
 * quedar fija. Ni un color, ni una tipografía, ni un espaciado cambia.
 */

export const ICONO_MENU = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
</svg>`;

/**
 * Envuelve un `<aside>` de barra lateral fija tal cual viene de Stitch y lo
 * hace deslizable en pantallas angostas. `aside` debe conservar sus clases
 * originales (w-64, fixed, left-0, etc.); esta función solo agrega el
 * comportamiento de apertura/cierre.
 *
 * El translate se aplica sobre el propio `<aside>` (no sobre un `<div>`
 * envolvente): `-translate-x-full` calcula el -100% respecto al ancho del
 * elemento al que se aplica, y como el `<aside>` original ya es `fixed`
 * (queda fuera del flujo), un `<div>` contenedor sin más contenido en flujo
 * colapsaría a 0px de ancho y el -100% de 0 seguiría siendo 0 — el cajón
 * nunca se ocultaría. Por eso las clases del cajón se inyectan directo en
 * el `<aside>`, que sí tiene un ancho real (`w-64`).
 *
 * Varias páginas de Stitch traen `hidden md:flex` en ese `<aside>`: su
 * propia estrategia (incompleta) para no romper el layout en móvil era
 * ocultarlo por completo ahí y ofrecer otra navegación en la cabecera
 * móvil. `hidden` fija `display:none`, y eso gana sobre cualquier
 * `transform` — el cajón deslizable nunca se vería así, sin importar la
 * animación. Por eso `hidden` y su pareja `(sm|md|lg|xl):flex` se quitan
 * aquí: el `<aside>` queda visible siempre (`flex` a secas) y es el
 * translate quien decide si está dentro o fuera de la pantalla.
 */
export function conCajonMovil(aside: string, boton = true): string {
  const asideConCajon = aside.replace(/<aside\b([^>]*)>/, (_m, atributos: string) => {
    let clases = (/class="([^"]*)"/.exec(atributos)?.[1] ?? '').replace(/\bz-\S+\b/g, '').trim();
    const teniaHidden = /\bhidden\b/.test(clases);
    clases = clases.replace(/\bhidden\b/g, '').replace(/\b(?:sm|md|lg|xl):flex\b/g, '').trim();
    if (teniaHidden && !/(?<![-\w])flex(?![-\w])/.test(clases)) clases = `flex ${clases}`;
    const restoAtributos = atributos.replace(/\s*class="[^"]*"/, '').trim();
    return `<aside data-cajon="panel" class="${clases} -translate-x-full lg:translate-x-0 transition-transform duration-200 z-[56] lg:z-auto"${restoAtributos ? ` ${restoAtributos}` : ''}>`;
  });
  return `
<div class="lg:hidden">
  ${boton ? `<button type="button" data-accion="abrir-cajon" aria-label="Abrir menú"
    class="fixed top-3 left-3 z-[60] w-10 h-10 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-on-surface shadow-sm">
    ${ICONO_MENU}
  </button>` : ''}
  <div data-cajon="fondo" class="fixed inset-0 bg-black/40 z-[55] hidden" data-accion="cerrar-cajon"></div>
</div>
${asideConCajon}`;
}

/** Abre o cierra el cajón. Se invoca desde el despachador de acciones. */
export function alternarCajon(abrir: boolean): void {
  const panel = document.querySelector<HTMLElement>('[data-cajon="panel"]');
  const fondo = document.querySelector<HTMLElement>('[data-cajon="fondo"]');
  if (!panel || !fondo) return;
  panel.classList.toggle('-translate-x-full', !abrir);
  fondo.classList.toggle('hidden', !abrir);
}
