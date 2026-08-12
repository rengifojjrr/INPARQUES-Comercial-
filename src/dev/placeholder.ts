/**
 * Marcador de vista pendiente.
 *
 * Se muestra en una ruta que existe en el registro pero todavia no tiene su
 * plantilla HTML. No es una propuesta de diseno: es un andamio que declara
 * que ruta es, quien puede verla y que le falta, para poder recorrer la
 * navegacion y los permisos antes de que lleguen los archivos.
 *
 * Al asociar el HTML original, esta funcion deja de invocarse para esa vista.
 */

import type { Vista } from '../app/registry';
import { ROLES, ROLE_IDS } from '../domain/roles';
import { sesion } from '../app/session';
import { conectividad } from '../net/connectivity';
import { store } from '../data/store';
import { formatearTasa } from '../domain/money';

export function renderizarPendiente(raiz: HTMLElement, vista: Vista, params: Record<string, string>): void {
  const u = sesion.usuario();
  const roles =
    vista.roles.length === 0
      ? 'Publica (sin sesion)'
      : vista.roles.length === ROLE_IDS.length
        ? 'Todos los roles'
        : vista.roles.map((r) => ROLES[r].nombre).join(', ');

  const clavesParams = Object.entries(params);

  raiz.innerHTML = `
    <div class="and-cinta">
      <strong>Vista pendiente de plantilla</strong>
      <span>${vista.superficie} · ${vista.grupo}</span>
      <code>${vista.ruta}</code>
      <a href="#/__mapa">Indice tecnico</a>
    </div>
    <main class="and-envoltura" id="contenido">
      <h1 class="and-titulo">${vista.titulo}</h1>
      <p class="and-bajada">
        Esta ruta esta registrada y protegida, pero su HTML de referencia aun no se ha
        incorporado. El andamio confirma que la navegacion, el rol y el ambito funcionan.
      </p>

      <div class="and-ficha">
        <h2 style="margin:0;font-size:15px">Ficha de la vista</h2>
        <dl>
          <dt>Identificador</dt><dd><code>${vista.id}</code></dd>
          <dt>Ruta</dt><dd><code>${vista.ruta}</code></dd>
          <dt>Superficie</dt><dd>${vista.superficie}</dd>
          <dt>Grupo</dt><dd>${vista.grupo}</dd>
          <dt>Roles autorizados</dt><dd>${roles}</dd>
          <dt>HTML de referencia</dt><dd><em>pendiente de entrega</em></dd>
          ${clavesParams.length ? `<dt>Parametros</dt><dd>${clavesParams.map(([k, v]) => `${k} = <code>${v}</code>`).join('<br>')}</dd>` : ''}
          ${vista.notas ? `<dt>Regla asociada</dt><dd>${vista.notas}</dd>` : ''}
        </dl>
      </div>

      <div class="and-ficha">
        <h2 style="margin:0;font-size:15px">Contexto activo</h2>
        <dl>
          <dt>Sesion</dt><dd>${u ? `${u.nombre} · ${ROLES[u.rol].nombre}` : sesion.activa()?.invitado ? 'Invitado' : 'Sin sesion'}</dd>
          <dt>Ambito</dt><dd>${sesion.activa()?.ambitoSeleccionado ?? 'no aplica'}</dd>
          <dt>Conexion</dt><dd>${conectividad.etiqueta()}</dd>
          <dt>Tasa de la demo</dt><dd>${formatearTasa(store.leer().tasaBcv)}</dd>
          <dt>Persistencia</dt><dd>${store.backendNombre}</dd>
        </dl>
      </div>

      <p>
        <a class="and-boton" href="#/__mapa">Ver indice tecnico</a>
        <button class="and-boton" type="button" onclick="history.back()">Volver</button>
      </p>
    </main>
  `;
}
