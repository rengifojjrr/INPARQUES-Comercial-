/**
 * Navegación compartida de la PWA del visitante.
 *
 * Stitch dibujó la superficie del visitante como una app de teléfono: una
 * barra inferior fija, marcada `md:hidden`, y nada que la sustituya en
 * escritorio. En un teléfono funciona; en una computadora la barra
 * desaparece y la pantalla se queda literalmente sin forma de navegar —
 * exactamente el tipo de error técnico que sí corresponde corregir.
 *
 * La corrección es de comportamiento, no de estética: los mismos cinco
 * destinos, los mismos íconos y los mismos rótulos que la barra inferior
 * original, colocados en la cabecera cuando hay ancho para ellos. Por
 * debajo de `md` no cambia nada respecto al diseño entregado.
 *
 * Además, las pantallas del recorrido de compra (ficha, producto, carrito,
 * checkout…) eran "standalone" sin ninguna navegación persistente: solo
 * tenían un botón de volver. Ahora todas comparten esta misma cabecera y
 * esta misma barra, así que desde cualquier punto del recorrido se puede
 * volver a Inicio, Explorar, Pedidos o Perfil sin retroceder paso a paso.
 */

import { esc } from '../componentes';
import { estadoUi } from '../estado-ui';
import { unidadesEnCarrito } from '../../domain/cart';

/** Los cinco destinos de la barra inferior original de Stitch. */
const DESTINOS: Array<{ ruta: string; icono: string; texto: string }> = [
  { ruta: '/v', icono: 'home', texto: 'Inicio' },
  { ruta: '/v/buscar', icono: 'search', texto: 'Explorar' },
  { ruta: '/v/historial', icono: 'shopping_bag', texto: 'Pedidos' },
  { ruta: '/ayuda', icono: 'help', texto: 'Ayuda' },
  { ruta: '/v/perfil', icono: 'person', texto: 'Perfil' },
];

/**
 * Cabecera del visitante. En teléfono es la del diseño original (marca
 * centrada); a partir de `md` incorpora los destinos y el carrito, que es
 * donde la barra inferior deja de mostrarse.
 *
 * `atras` convierte el logotipo en un botón de volver, para las pantallas
 * interiores que en el original tenían cabecera propia con flecha.
 */
export function cabeceraVisitante(activa: string, titulo?: string, atras?: string): string {
  const unidades = unidadesEnCarrito(estadoUi.carrito);

  const enlace = (d: (typeof DESTINOS)[number]) => {
    const on = d.ruta === activa;
    return `<button type="button" data-accion="ir" data-valor="${esc(d.ruta)}"
      class="flex items-center gap-1.5 px-3 h-10 rounded-full transition-colors ${
        on ? 'bg-secondary-container text-on-secondary-container font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
      }"${on ? ' aria-current="page"' : ''}>
      <span class="material-symbols-outlined text-[20px] ${on ? 'icon-fill' : ''}">${d.icono}</span>
      <span class="font-label-md text-label-md">${esc(d.texto)}</span>
    </button>`;
  };

  return `
<header class="bg-surface top-0 border-b border-outline-variant flex justify-between items-center gap-md px-md md:px-lg w-full h-14 md:h-16 sticky z-40">
  <div class="flex items-center gap-sm min-w-0">
    ${
      atras
        ? `<button type="button" data-accion="ir" data-valor="${esc(atras)}" aria-label="Volver"
            class="h-touch-target w-touch-target flex items-center justify-center shrink-0 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>`
        : `<span class="material-symbols-outlined icon-fill text-primary shrink-0">park</span>`
    }
    <span class="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary truncate">${esc(titulo ?? 'INPARQUES Comercial')}</span>
  </div>

  <!-- Destinos en escritorio: sustituyen a la barra inferior, que a partir
       de md deja de mostrarse. -->
  <nav class="hidden md:flex items-center gap-1" aria-label="Navegación principal">
    ${DESTINOS.map(enlace).join('')}
  </nav>

  <div class="flex items-center gap-xs shrink-0">
    <button type="button" data-accion="ir" data-valor="/v/carrito" aria-label="Ver carrito"
      class="relative h-touch-target w-touch-target flex items-center justify-center text-primary hover:bg-surface-container-low rounded-full transition-colors">
      <span class="material-symbols-outlined">shopping_cart</span>
      ${
        unidades > 0
          ? `<span class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold flex items-center justify-center">${unidades}</span>`
          : ''
      }
    </button>
    <button type="button" data-accion="ir" data-valor="/notificaciones" aria-label="Notificaciones"
      class="hidden sm:flex h-touch-target w-touch-target items-center justify-center text-primary hover:bg-surface-container-low rounded-full transition-colors">
      <span class="material-symbols-outlined">notifications</span>
    </button>
  </div>
</header>`;
}

/**
 * Barra inferior tal cual la entregó Stitch: solo por debajo de `md`, donde
 * sigue siendo la navegación correcta para el pulgar.
 */
export function barraInferiorVisitante(activa: string): string {
  return `
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-safe bg-surface-container-lowest border-t border-outline-variant shadow-sm" aria-label="Navegación principal">
  ${DESTINOS.map((d) => {
    const on = d.ruta === activa;
    return `<button type="button" data-accion="ir" data-valor="${esc(d.ruta)}"
      class="flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all ${
        on ? 'bg-secondary-container text-on-secondary-container scale-90' : 'text-on-surface-variant hover:bg-surface-container-high'
      }"${on ? ' aria-current="page"' : ''}>
      <span class="material-symbols-outlined ${on ? 'icon-fill' : ''}">${d.icono}</span>
      <span class="font-label-sm text-label-sm mt-1">${esc(d.texto)}</span>
    </button>`;
  }).join('')}
</nav>`;
}

/**
 * Envuelve una pantalla del visitante con cabecera y barra inferior.
 * `pieFijo` es para las pantallas que traen su propia barra de acción fija
 * abajo (carrito, checkout): en móvil hay que dejarle sitio a las dos.
 */
export function marcoVisitante(
  contenido: string,
  opciones: { activa?: string; titulo?: string; atras?: string; pieFijo?: boolean } = {},
): string {
  const { activa = '', titulo, atras, pieFijo = false } = opciones;
  return `
${cabeceraVisitante(activa, titulo, atras)}
<div class="${pieFijo ? 'pb-44 md:pb-24' : 'pb-24 md:pb-8'}">${contenido}</div>
${barraInferiorVisitante(activa)}`;
}
