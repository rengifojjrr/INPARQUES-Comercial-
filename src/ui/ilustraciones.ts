/**
 * Ilustraciones de la demo.
 *
 * El HTML original de Stitch traía fotografías generadas por IA servidas
 * desde `lh3.googleusercontent.com`. Esas URLs no se pueden usar: la
 * política de contenido del artefacto publicado bloquea cualquier host
 * externo, y aunque no lo hiciera son enlaces que caducan. Hasta ahora se
 * sustituían por un recuadro gris con un ícono, que es honesto pero deja la
 * demo con huecos donde el diseño pedía una imagen.
 *
 * Aquí se generan escenas SVG completas, sin red y sin binarios: cada una
 * se dibuja con degradados y formas en los mismos verdes del sistema de
 * diseño. No son fotografías —son ilustraciones— pero ocupan el lugar que
 * el diseño reservaba para una imagen y hacen que la pantalla se lea como
 * terminada en vez de como un marcador de posición.
 *
 * Son deterministas: el mismo identificador produce siempre la misma
 * escena, así que un comercio no cambia de imagen al repintar la vista.
 */

import { esc } from './componentes';
import { etiquetaFoto } from './fotos';

/** Paleta derivada de `tailwind.config.js` (el sistema real de Stitch). */
const C = {
  crema: '#fbf9f3',
  cremaCalida: '#f7f5ef',
  verdeOscuro: '#002114',
  verde: '#005131',
  verdeMedio: '#176b45',
  verdeClaro: '#88d7a8',
  verdeSuave: '#c0edd4',
  menta: '#a4f4c3',
  piedra: '#e4e2dd',
  piedraOscura: '#bfc9c0',
  tierra: '#6f7a71',
  arena: '#d5e7dd',
  sol: '#f0d9a8',
  agua: '#a4d0b8',
};

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Generador determinista: misma semilla, misma secuencia. */
function azar(semilla: number): () => number {
  let s = semilla || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * La etiqueta suele venir de un nombre que escribe el comercio ("Imagen de
 * ${articulo.nombre}"), asi que hay que escaparla: sin esto, un nombre con
 * comillas cierra el atributo y lo que siga se convierte en atributos del
 * `<svg>`.
 */
function envolver(contenido: string, clases: string, etiqueta: string): string {
  return `<svg class="${esc(clases)}" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(etiqueta)}" xmlns="http://www.w3.org/2000/svg">${contenido}</svg>`;
}

// ---------------------------------------------------------------- Paisajes

/**
 * Paisaje de parque: cielo con sol, tres cordilleras y una arboleda.
 * Es la escena de los encabezados de parque y de las tarjetas de zona.
 */
function paisaje(semilla: number, id: string): string {
  const r = azar(semilla);
  const solX = 70 + r() * 260;
  const solY = 55 + r() * 35;

  // Tres cordilleras, de la más lejana (clara) a la más cercana (oscura).
  const cordillera = (base: number, altura: number, picos: number, color: string, op: number) => {
    const paso = 400 / picos;
    let d = `M -20 300 L -20 ${base}`;
    for (let i = 0; i <= picos; i++) {
      const x = i * paso;
      const y = base - altura * (0.45 + r() * 0.55);
      d += ` Q ${x - paso / 2} ${y} ${x} ${base - altura * (0.15 + r() * 0.25)}`;
    }
    d += ` L 420 300 Z`;
    return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
  };

  // Copas de árbol: triángulos redondeados en la franja inferior.
  let arboles = '';
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const x = 10 + r() * 380;
    const y = 232 + r() * 46;
    const alto = 26 + r() * 30;
    const ancho = alto * 0.62;
    arboles += `<path d="M ${x} ${y - alto} Q ${x + ancho / 2} ${y - alto * 0.32} ${x + ancho / 2} ${y} L ${x - ancho / 2} ${y} Q ${x - ancho / 2} ${y - alto * 0.32} ${x} ${y - alto} Z" fill="${C.verdeOscuro}" opacity="${(0.30 + r() * 0.4).toFixed(2)}"/>`;
  }

  return `
<defs>
  <linearGradient id="cielo${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.crema}"/>
    <stop offset="58%" stop-color="${C.arena}"/>
    <stop offset="100%" stop-color="${C.verdeSuave}"/>
  </linearGradient>
  <radialGradient id="sol${id}" cx="50%" cy="50%">
    <stop offset="0%" stop-color="${C.sol}" stop-opacity="0.95"/>
    <stop offset="100%" stop-color="${C.sol}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="400" height="300" fill="url(#cielo${id})"/>
<circle cx="${solX.toFixed(0)}" cy="${solY.toFixed(0)}" r="62" fill="url(#sol${id})"/>
<circle cx="${solX.toFixed(0)}" cy="${solY.toFixed(0)}" r="19" fill="${C.sol}" opacity="0.85"/>
${cordillera(210, 118, 4, C.verdeClaro, 0.55)}
${cordillera(232, 96, 5, C.verdeMedio, 0.62)}
${cordillera(252, 74, 6, C.verde, 0.82)}
<rect y="252" width="400" height="48" fill="${C.verdeOscuro}" opacity="0.14"/>
${arboles}`;
}

// -------------------------------------------------------------- Bodegones

/** Fondo común de los bodegones: mesa cálida con luz suave. */
function mesa(id: string, tono: string): string {
  return `
<defs>
  <linearGradient id="fondo${id}" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%" stop-color="${C.crema}"/>
    <stop offset="100%" stop-color="${tono}"/>
  </linearGradient>
  <radialGradient id="luz${id}" cx="34%" cy="24%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="400" height="300" fill="url(#fondo${id})"/>
<rect width="400" height="300" fill="url(#luz${id})"/>
<ellipse cx="200" cy="248" rx="150" ry="26" fill="${C.verdeOscuro}" opacity="0.10"/>`;
}

/** Plato servido: para comida. */
function bodegonComida(semilla: number, id: string): string {
  const r = azar(semilla);
  let guarnicion = '';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r();
    const rad = 34 + r() * 22;
    guarnicion += `<circle cx="${(200 + Math.cos(a) * rad).toFixed(0)}" cy="${(178 + Math.sin(a) * rad * 0.5).toFixed(0)}" r="${(5 + r() * 6).toFixed(0)}" fill="${i % 2 ? C.verdeMedio : C.verdeClaro}" opacity="0.85"/>`;
  }
  return `${mesa(id, C.arena)}
<ellipse cx="200" cy="182" rx="108" ry="54" fill="#ffffff"/>
<ellipse cx="200" cy="178" rx="108" ry="54" fill="${C.piedra}" opacity="0.5"/>
<ellipse cx="200" cy="176" rx="80" ry="39" fill="#ffffff"/>
<ellipse cx="200" cy="172" rx="52" ry="26" fill="${C.sol}" opacity="0.9"/>
<ellipse cx="200" cy="168" rx="38" ry="18" fill="${C.verdeMedio}" opacity="0.55"/>
${guarnicion}
<rect x="66" y="120" width="7" height="86" rx="3.5" fill="${C.tierra}" opacity="0.55"/>
<rect x="328" y="120" width="7" height="86" rx="3.5" fill="${C.tierra}" opacity="0.55"/>`;
}

/** Vaso alto con bebida: para bebidas. */
function bodegonBebida(semilla: number, id: string): string {
  const r = azar(semilla);
  let burbujas = '';
  for (let i = 0; i < 9; i++) {
    burbujas += `<circle cx="${(172 + r() * 56).toFixed(0)}" cy="${(140 + r() * 74).toFixed(0)}" r="${(2 + r() * 4).toFixed(0)}" fill="#ffffff" opacity="0.5"/>`;
  }
  return `${mesa(id, C.agua)}
<path d="M 166 106 L 234 106 L 226 232 Q 200 242 174 232 Z" fill="#ffffff" opacity="0.55"/>
<path d="M 170 138 L 230 138 L 224 230 Q 200 239 176 230 Z" fill="${C.verdeMedio}" opacity="0.8"/>
<path d="M 170 138 L 230 138 L 228 158 L 172 158 Z" fill="${C.verdeClaro}" opacity="0.9"/>
${burbujas}
<ellipse cx="200" cy="106" rx="34" ry="9" fill="#ffffff" opacity="0.85"/>
<rect x="196" y="72" width="5" height="42" rx="2.5" fill="${C.verde}" opacity="0.7" transform="rotate(12 198 93)"/>
<path d="M 246 150 q 22 -16 30 4 q -18 22 -30 -4 Z" fill="${C.verde}" opacity="0.65"/>`;
}

/** Piezas de artesanía sobre un tapete: artesanía y recuerdos. */
function bodegonArtesania(semilla: number, id: string): string {
  const r = azar(semilla);
  let motivos = '';
  for (let i = 0; i < 5; i++) {
    const x = 118 + i * 42;
    motivos += `<rect x="${x}" y="${(152 + r() * 12).toFixed(0)}" width="8" height="${(28 + r() * 26).toFixed(0)}" rx="4" fill="${i % 2 ? C.verde : C.verdeClaro}" opacity="0.8"/>`;
  }
  return `${mesa(id, C.piedra)}
<path d="M 128 214 Q 118 158 152 140 Q 200 118 248 140 Q 282 158 272 214 Z" fill="${C.verdeMedio}" opacity="0.28"/>
<ellipse cx="200" cy="214" rx="74" ry="16" fill="${C.verde}" opacity="0.35"/>
<path d="M 158 208 q -14 -52 42 -60 q 56 8 42 60 Z" fill="${C.sol}" opacity="0.75"/>
${motivos}
<circle cx="200" cy="132" r="15" fill="${C.verdeSuave}"/>
<circle cx="200" cy="132" r="7" fill="${C.verde}" opacity="0.7"/>`;
}

/** Sendero con mirador: paseos y atracciones. */
function bodegonPaseo(semilla: number, id: string): string {
  const r = azar(semilla);
  let piedras = '';
  for (let i = 0; i < 6; i++) {
    piedras += `<ellipse cx="${(150 + r() * 110).toFixed(0)}" cy="${(214 + i * 13).toFixed(0)}" rx="${(16 + r() * 12).toFixed(0)}" ry="5" fill="${C.piedraOscura}" opacity="0.55"/>`;
  }
  return `${paisaje(semilla, id)}
<path d="M 200 158 Q 176 214 128 300 L 272 300 Q 224 214 200 158 Z" fill="${C.arena}" opacity="0.85"/>
${piedras}
<rect x="286" y="176" width="6" height="62" rx="3" fill="${C.tierra}"/>
<path d="M 292 180 l 40 11 l -40 11 Z" fill="${C.verde}" opacity="0.85"/>`;
}

/** Bicicletas y equipo en fila: alquileres. */
function bodegonAlquiler(semilla: number, id: string): string {
  const r = azar(semilla);
  const inclinacion = (r() - 0.5) * 10;
  const rueda = (cx: number) =>
    `<circle cx="${cx}" cy="196" r="30" fill="none" stroke="${C.verde}" stroke-width="7" opacity="0.85"/>
     <circle cx="${cx}" cy="196" r="8" fill="${C.verdeClaro}"/>`;
  return `${mesa(id, C.verdeSuave)}
${rueda(132)}${rueda(268)}
<path d="M 132 196 L 186 140 L 250 140 L 268 196 M 186 140 L 218 196 L 132 196" fill="none" stroke="${C.verde}" stroke-width="8" stroke-linejoin="round" opacity="0.9"/>
<rect x="176" y="128" width="42" height="9" rx="4.5" fill="${C.verdeOscuro}" opacity="0.8"/>
<rect x="244" y="120" width="30" height="8" rx="4" fill="${C.verdeOscuro}" opacity="0.8" transform="rotate(${inclinacion.toFixed(1)} 259 124)"/>`;
}

/** Juguetes apilados: juguetes. */
function bodegonJuguete(semilla: number, id: string): string {
  const r = azar(semilla);
  const colores = [C.verde, C.verdeClaro, C.sol, C.verdeMedio, C.menta];
  let bloques = '';
  for (let i = 0; i < 4; i++) {
    const lado = 52 - i * 6;
    const x = 200 - lado / 2 + (r() - 0.5) * 16;
    const y = 214 - (i + 1) * (lado * 0.82);
    bloques += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${lado}" height="${(lado * 0.8).toFixed(0)}" rx="8" fill="${colores[i % colores.length]}" opacity="0.9"/>`;
  }
  return `${mesa(id, C.menta)}
${bloques}
<circle cx="290" cy="192" r="26" fill="${C.sol}" opacity="0.85"/>
<circle cx="290" cy="192" r="11" fill="${C.verde}" opacity="0.6"/>
<path d="M 96 214 l 24 -42 l 24 42 Z" fill="${C.verdeMedio}" opacity="0.85"/>`;
}

/** Fachada de local: la escena por defecto de un comercio. */
function bodegonLocal(semilla: number, id: string): string {
  const r = azar(semilla + 3);
  let toldo = '';
  for (let i = 0; i < 7; i++) {
    toldo += `<rect x="${104 + i * 28}" y="122" width="28" height="30" fill="${i % 2 ? C.verde : C.verdeSuave}" opacity="0.9"/>`;
  }
  return `${paisaje(semilla + 7, id)}
<rect x="104" y="152" width="196" height="106" rx="6" fill="${C.crema}" opacity="0.97"/>
<path d="M 96 124 L 308 124 L 300 152 L 104 152 Z" fill="${C.verde}" opacity="0.25"/>
<g clip-path="inset(0 round 0)">${toldo}</g>
<rect x="128" y="180" width="60" height="54" rx="4" fill="${C.arena}"/>
<rect x="216" y="180" width="60" height="78" rx="4" fill="${C.verdeMedio}" opacity="0.65"/>
<circle cx="${(224 + r() * 6).toFixed(0)}" cy="220" r="4" fill="${C.crema}"/>
<rect x="104" y="252" width="196" height="8" fill="${C.verdeOscuro}" opacity="0.25"/>`;
}

const ESCENAS: Record<string, (s: number, id: string) => string> = {
  comida: bodegonComida,
  bebidas: bodegonBebida,
  artesania: bodegonArtesania,
  recuerdos: bodegonArtesania,
  juguetes: bodegonJuguete,
  alquileres: bodegonAlquiler,
  paseos: bodegonPaseo,
  atracciones: bodegonPaseo,
  parque: paisaje,
  local: bodegonLocal,
};

/**
 * La categoría de un negocio es un valor del enumerado (`comida`,
 * `artesania`…), pero la de un artículo es texto libre que escribe el propio
 * comercio ("Bebidas calientes", "Panadería", "Paseos en bote"). Sin esta
 * normalización cada artículo caía en la escena por defecto y un café salía
 * dibujado como una fachada.
 */
const PALABRAS: Array<[RegExp, string]> = [
  [/bebid|caf|jugo|refresc|batid|infusi|t[eé]\b|agua|cerve|limonad/i, 'bebidas'],
  [/pan|reposter|desayun|almuerz|cena|comid|plato|arepa|empanad|cachito|postre|dulce|helad|snack|merienda|parrilla|sopa/i, 'comida'],
  [/juguet|infantil|niñ/i, 'juguetes'],
  [/artesan|tejid|cer[aá]mic|talla|recuerd|souvenir|regal/i, 'artesania'],
  [/alquil|bicicl|kayak|bote|equipo|tabla|caballo/i, 'alquileres'],
  [/paseo|tour|sender|excursi|caminat|guia|guía|avistam/i, 'paseos'],
  [/entrad|atracci|ticket|acces/i, 'atracciones'],
];

function normalizar(categoria: string): string {
  const c = (categoria ?? '').trim();
  if (ESCENAS[c]) return c;
  for (const [patron, destino] of PALABRAS) if (patron.test(c)) return destino;
  return 'comida';
}

/**
 * Escena para una categoría dada. `clave` es lo que fija la variante (el id
 * del negocio, del artículo o del parque), de modo que dos comercios de la
 * misma categoría no salen idénticos.
 */
export function ilustracion(
  categoria: string,
  clave: string,
  clases = 'w-full h-full object-cover',
  etiqueta = '',
): string {
  const cat = normalizar(categoria);
  const escena = ESCENAS[cat] ?? ESCENAS.local;
  const semilla = hash(`${cat}:${clave}`);
  // El id evita que dos <defs> con el mismo nombre colisionen al haber
  // varias escenas en la misma página.
  const id = `g${(semilla % 100000).toString(36)}`;
  const alt = etiqueta || `Ilustración de ${cat}`;
  // Si alguien dejó una fotografía con este identificador, manda la foto.
  return etiquetaFoto(clave, clases, alt) ?? envolver(escena(semilla, id), clases, alt);
}

/**
 * Escena para un encabezado ancho (el héroe de la ficha de un comercio, la
 * portada de un parque). Los bodegones están compuestos en cuadrado y
 * centrados: al recortarlos en una franja apaisada se pierde el motivo y
 * queda una mancha. Estas dos escenas —fachada y paisaje— sí están
 * compuestas en horizontal y aguantan el recorte.
 */
export function ilustracionPortada(
  categoria: string,
  clave: string,
  clases = 'w-full h-full object-cover',
  etiqueta = '',
): string {
  const cat = normalizar(categoria);
  // Los servicios al aire libre se leen mejor como paisaje; el resto, como
  // fachada de local dentro del parque.
  const escena = cat === 'paseos' || cat === 'atracciones' || cat === 'alquileres' ? bodegonPaseo : bodegonLocal;
  const semilla = hash(`portada:${cat}:${clave}`);
  const id = `p${(semilla % 100000).toString(36)}`;
  const alt = etiqueta || 'Imagen de portada';
  // Portada propia si existe (`<clave>-portada.jpg`), y si no la misma foto.
  return (
    etiquetaFoto(`${clave}-portada`, clases, alt) ??
    etiquetaFoto(clave, clases, alt) ??
    envolver(escena(semilla, id), clases, alt)
  );
}

/** Paisaje de parque, para encabezados y tarjetas de zona. */
export function ilustracionParque(clave: string, clases = 'w-full h-full object-cover', etiqueta = 'Paisaje del parque'): string {
  return ilustracion('parque', clave, clases, etiqueta);
}
