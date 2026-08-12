/**
 * Genera docs/MATRIZ-COBERTURA.md a partir del registro de vistas.
 *
 * La matriz no se escribe a mano: se deriva de src/app/registry.ts para que
 * no pueda quedar desincronizada del codigo. Ejecutar con:
 *   npm run matriz
 */

import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const TEMP = join(RAIZ, 'node_modules', '.cache', 'matriz');

await mkdir(TEMP, { recursive: true });

await build({
  entryPoints: [join(RAIZ, 'src/app/registry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(TEMP, 'registry.mjs'),
  logLevel: 'silent',
});

const { VISTAS, VISTAS_ESPERADAS_SEGUN_ENUNCIADO, resumenCobertura } = await import(
  join(TEMP, 'registry.mjs')
);
const { ROLES } = await import(join(TEMP, 'registry.mjs')).then(async () => {
  await build({
    entryPoints: [join(RAIZ, 'src/domain/roles.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: join(TEMP, 'roles.mjs'),
    logLevel: 'silent',
  });
  return import(join(TEMP, 'roles.mjs'));
});

const r = resumenCobertura();

const ESTADOS = {
  pendiente_html: 'Pendiente de HTML',
  implementada: 'Implementada',
  conectada: 'Conectada',
  revisada: 'Revisada',
  bloqueada: 'Bloqueada',
};

const SUPERFICIES = [
  ['compartida', 'Compartidas (acceso, identidad, estados, conectividad)'],
  ['visitante', 'Visitante — PWA movil'],
  ['comercio', 'Comercio — portal'],
  ['inparques', 'INPARQUES — panel institucional'],
];

function roles(v) {
  if (v.roles.length === 0) return 'Publica';
  if (v.roles.length === Object.keys(ROLES).length) return 'Todos';
  return v.roles.map((x) => ROLES[x].nombre).join('; ');
}

let md = `# Matriz de cobertura de vistas

> Generado automaticamente por \`npm run matriz\` desde \`src/app/registry.ts\`.
> No editar a mano: los cambios se pierden en la siguiente generacion.

## Estado general

| Concepto | Valor |
| --- | --- |
| Rutas registradas | ${r.total} |
| Vistas segun el enunciado | ${VISTAS_ESPERADAS_SEGUN_ENUNCIADO} |
| Diferencia por reconciliar | ${r.diferencia > 0 ? '+' : ''}${r.diferencia} |
| Compartidas | ${r.porSuperficie.compartida} |
| Visitante | ${r.porSuperficie.visitante} |
| Comercio | ${r.porSuperficie.comercio} |
| INPARQUES | ${r.porSuperficie.inparques} |

| Estado | Vistas |
| --- | --- |
${Object.entries(r.porEstado)
  .map(([k, v]) => `| ${ESTADOS[k]} | ${v} |`)
  .join('\n')}

**Nota sobre la diferencia.** Las plantillas HTML todavia no estan en el
repositorio. Las rutas listadas se derivaron del documento funcional y de los
recorridos descritos en el encargo; la cifra de ${VISTAS_ESPERADAS_SEGUN_ENUNCIADO}
vistas proviene del enunciado. La reconciliacion solo puede hacerse comparando
esta tabla con los archivos entregados.

`;

for (const [clave, titulo] of SUPERFICIES) {
  const vistas = VISTAS.filter((v) => v.superficie === clave);
  md += `\n## ${titulo} — ${vistas.length} vistas\n\n`;
  const grupos = [...new Set(vistas.map((v) => v.grupo))];
  for (const g of grupos) {
    const filas = vistas.filter((v) => v.grupo === g);
    md += `\n### ${g}\n\n`;
    md += '| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |\n';
    md += '| --- | --- | --- | --- | --- |\n';
    for (const v of filas) {
      md += `| \`${v.ruta}\` | ${v.titulo} | ${roles(v)} | ${v.htmlRef || '—'} | ${ESTADOS[v.estado]} |\n`;
    }
  }
}

await writeFile(join(RAIZ, 'docs/MATRIZ-COBERTURA.md'), md, 'utf-8');
await rm(TEMP, { recursive: true, force: true });

console.log(`Matriz generada: ${r.total} vistas en docs/MATRIZ-COBERTURA.md`);
