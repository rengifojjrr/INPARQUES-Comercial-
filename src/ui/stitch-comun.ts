/**
 * Utilidades compartidas por las vistas portadas del HTML de Stitch.
 */

const PALETA_AVATAR = ['#005131', '#3e6753', '#516159', '#176b45', '#3a4942'];

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2);
  return letras.toUpperCase();
}

/**
 * Avatar local (círculo de color + iniciales) en vez de las fotos generadas
 * por IA (lh3.googleusercontent.com) que trae el HTML original: esas URLs
 * están bloqueadas en tiempo de ejecución y no son estables a largo plazo.
 */
export function avatar(nombre: string, clases = 'w-8 h-8 text-[11px]'): string {
  const color = PALETA_AVATAR[hash(nombre) % PALETA_AVATAR.length];
  return `<div class="${clases} rounded-full flex items-center justify-center font-label-sm font-bold text-white shrink-0" style="background-color:${color}">${iniciales(nombre)}</div>`;
}

/**
 * Reemplaza las fotografías generadas por IA del HTML original (locales,
 * parques, productos) por un marcador local: un bloque de color suave con
 * un ícono de Material Symbols. Mismo motivo que `avatar()`.
 */
export function marcadorFoto(icono: string, clases = 'w-full h-full'): string {
  const color = PALETA_AVATAR[hash(icono) % PALETA_AVATAR.length];
  return `<div class="${clases} flex items-center justify-center" style="background-color:${color}1a">
    <span class="material-symbols-outlined" style="font-size:40px;color:${color}">${icono}</span>
  </div>`;
}
