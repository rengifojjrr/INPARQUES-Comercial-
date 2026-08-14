/**
 * Fotografias reales, cuando las haya.
 *
 * Las ilustraciones SVG cumplen su papel, pero una foto cambia como se lee la
 * pantalla: de maqueta a producto. El problema era que meterlas exigia tocar
 * codigo en cada sitio donde hay una imagen.
 *
 * Aqui se resuelve de una vez: se deja caer el archivo en
 * `src/assets/fotos/<clave>.jpg` —donde `<clave>` es el identificador del
 * negocio, del articulo o del parque— y esa imagen aparece sola en todas las
 * pantallas que la usen. Sin fotografia, sigue saliendo la ilustracion. No
 * hace falta registrar nada ni cambiar ninguna vista.
 *
 * `import.meta.glob` con `eager` resuelve las rutas en tiempo de construccion,
 * asi que las fotos entran en el paquete como cualquier otro recurso y
 * funcionan igual servidas desde una subcarpeta o dentro del archivo unico.
 */

import { esc } from './componentes';

const MODULOS = import.meta.glob('../assets/fotos/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** `../assets/fotos/ng_cedros.jpg` -> `ng_cedros` */
const POR_CLAVE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULOS).map(([ruta, url]) => [ruta.replace(/^.*\/([^/]+)\.[^.]+$/, '$1'), url]),
);

export function hayFoto(clave: string): boolean {
  return clave in POR_CLAVE;
}

export function urlFoto(clave: string): string | null {
  return POR_CLAVE[clave] ?? null;
}

/** Cuantas fotografias trae la construccion. Util para el indice tecnico. */
export function totalFotos(): number {
  return Object.keys(POR_CLAVE).length;
}

/**
 * Etiqueta `<img>` lista para usar, o `null` si no hay foto para esa clave.
 * `loading="lazy"` porque las listas largas traen muchas.
 */
export function etiquetaFoto(clave: string, clases: string, alt: string): string | null {
  const url = POR_CLAVE[clave];
  if (!url) return null;
  return `<img src="${esc(url)}" alt="${esc(alt)}" class="${esc(clases)}" loading="lazy" decoding="async" />`;
}
