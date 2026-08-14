/**
 * Guardia contra el escapado olvidado.
 *
 * Conviven dos sistemas de vistas: las antiguas usan la plantilla etiquetada
 * `html\`` de `componentes.ts`, que escapa sola cada interpolacion, y las
 * portadas de Stitch usan literales normales, donde escapar es manual. Esa
 * asimetria ya produjo un fallo real —un nombre de articulo con comillas se
 * convertia en atributos del `<svg>`— y no da error de tipos ni de consola:
 * solo aparece cuando alguien escribe una comilla en el nombre de su producto.
 *
 * Esta prueba lee el codigo fuente y falla si una vista sin plantilla
 * etiquetada interpola un campo de texto que escribe una persona sin pasarlo
 * por `esc()`. No es un analisis completo —no lo pretende—, pero cubre
 * exactamente la forma en que el fallo aparecio.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR_VISTAS = join(process.cwd(), 'src/ui/vistas');
const OTROS = ['src/ui/mapa.ts', 'src/ui/ilustraciones.ts', 'src/ui/stitch-shell.ts', 'src/ui/stitch-comun.ts'];

/** Campos que rellena una persona y acaban en pantalla. */
const CAMPOS = [
  'nombre', 'nombreComercial', 'razonSocial', 'titular', 'descripcion',
  'notas', 'motivo', 'comentario', 'observacion', 'direccion', 'correo',
  'telefono', 'respuesta', 'detalle',
].join('|');

/**
 * `${algo.campo}` puesto crudo en un sitio donde el navegador lee marcado.
 *
 * Dos formas, que son las peligrosas:
 *   - dentro de un atributo entrecomillado — `aria-label="${a.nombre}"` —,
 *     donde una comilla cierra el atributo y lo que siga pasa a ser atributos
 *     del elemento. Asi aparecio el fallo real.
 *   - como contenido de un elemento — `<h3>${a.nombre}</h3>` —, donde un `<`
 *     abre una etiqueta nueva.
 *
 * No se marca el mismo campo pasado como argumento a una funcion —
 * `ilustracion(..., \`Imagen de ${a.nombre}\`)` —, porque ahi el escapado le
 * toca a quien lo mete en el marcado, y esas funciones ya lo hacen. Marcar
 * codigo correcto es la forma mas rapida de que alguien silencie la prueba.
 */
const CAMPO = String.raw`\$\{\s*[A-Za-z_$][\w$]*(?:\?)?\.(?:${CAMPOS})[A-Za-z]*\s*\}`;
const EN_ATRIBUTO = new RegExp(String.raw`[a-zA-Z-]+="[^"\n]*${CAMPO}`, 'g');
const EN_CONTENIDO = new RegExp(String.raw`>\s*${CAMPO}`, 'g');

function archivosAExaminar(): string[] {
  const vistas = readdirSync(DIR_VISTAS)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join('src/ui/vistas', f));
  return [...vistas, ...OTROS];
}

describe('las vistas escapan lo que escribe una persona', () => {
  const hallazgos: string[] = [];

  for (const relativo of archivosAExaminar()) {
    const fuente = readFileSync(join(process.cwd(), relativo), 'utf8');

    // Las vistas antiguas usan la plantilla etiquetada `html`, que escapa
    // sola cada interpolacion, asi que no aplican.
    //
    // La comprobacion mira el `import`, no la aparicion del texto "html`":
    // esa cadena tambien sale en comentarios que citan el HTML original
    // (`code.html` entre comillas invertidas), y con eso se exoneraba por
    // error a archivos que si escapan a mano.
    if (/import\s*\{[^}]*\bhtml\b[^}]*\}\s*from\s*'[^']*componentes'/.test(fuente)) continue;

    for (const [n, texto] of fuente.split('\n').entries()) {
      const m = [...(texto.match(EN_ATRIBUTO) ?? []), ...(texto.match(EN_CONTENIDO) ?? [])];
      if (m.length) hallazgos.push(`${relativo}:${n + 1}  ${m.join(' ')}`);
    }
  }

  it('ninguna interpolacion de texto libre va sin esc()', () => {
    expect(hallazgos, `Interpolaciones sin esc():\n${hallazgos.join('\n')}`).toEqual([]);
  });
});
