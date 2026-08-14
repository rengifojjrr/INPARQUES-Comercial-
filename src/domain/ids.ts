/**
 * Identificadores unicos.
 *
 * Antes cada sitio improvisaba: `Date.now().toString(36)` (dos registros
 * creados en el mismo milisegundo comparten id), `Math.random().slice(2,10)`,
 * o directamente una clave derivada del contenido —`nt_${ordenId}_${destino}`—
 * que colisiona a proposito cuando el mismo hecho ocurre dos veces.
 *
 * Aqui hay una sola fuente: reloj para que los ids salgan ordenados en el
 * tiempo, mas un contador que garantiza que dos llamadas seguidas nunca
 * coinciden, mas azar para que no sean adivinables.
 */

let contador = 0;

export function identificador(prefijo: string): string {
  contador = (contador + 1) % 46656; // 3 digitos en base 36
  const tiempo = Date.now().toString(36);
  const secuencia = contador.toString(36).padStart(3, '0');
  const azar = Math.random().toString(36).slice(2, 6);
  return `${prefijo}_${tiempo}${secuencia}${azar}`;
}
