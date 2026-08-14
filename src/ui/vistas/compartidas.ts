/**
 * Vistas compartidas: acceso, identidad, cuenta, estados y conectividad.
 */

import { html, crudo, esc, boton, tarjeta, insignia, listaDatos, vacio, aviso, etiquetaDemo, entradaTexto, seccion, conmutador, barraAccion } from '../componentes';
import type { Pagina, Render } from './tipos';
import { ROLES, ROLE_IDS } from '../../domain/roles';
import { store } from '../../data/store';
import { sesion, CLAVE_DEMO } from '../../app/session';
import { resolverAmbito } from '../../domain/scope';
import { CODIGO_MFA_DEMO, inventarioAdaptadores } from '../../adapters/simulados';
import { conectividad } from '../../net/connectivity';
import { colaSincronizacion } from '../../net/sync-queue';
import { enlacesComercio, enlacesInparques } from '../shell';
import { formatearTasa } from '../../domain/money';
import { fechaCorta, horaCorta } from '../formato';

const PERFILES_DEMO: Array<{ id: string; grupo: string }> = [
  { id: 'us_visitante', grupo: 'Visitante' },
  { id: 'us_prop_cedros', grupo: 'Comercio' },
  { id: 'us_admin_cedros', grupo: 'Comercio' },
  { id: 'us_operador_cedros', grupo: 'Comercio' },
  { id: 'us_contador_cedros', grupo: 'Comercio' },
  { id: 'us_superadmin', grupo: 'INPARQUES' },
  { id: 'us_direccion', grupo: 'INPARQUES' },
  { id: 'us_finanzas', grupo: 'INPARQUES' },
  { id: 'us_admin_parque', grupo: 'INPARQUES' },
  { id: 'us_inspector', grupo: 'INPARQUES' },
  { id: 'us_soporte', grupo: 'INPARQUES' },
];

/** Selector de perfiles: la puerta de entrada de la demo. */
export const selectorPerfiles: Render = () => {
  const e = store.leer();
  const grupos = ['Visitante', 'Comercio', 'INPARQUES'];

  const bloques = grupos.map((g) => {
    const perfiles = PERFILES_DEMO.filter((p) => p.grupo === g);
    return html`<section class="seccion">
      <div class="seccion__cab"><h2 class="seccion__tit">${g}</h2></div>
      <div class="pila">
        ${perfiles.map((p) => {
          const u = e.usuarios.find((x) => x.id === p.id);
          if (!u) return '';
          const d = ROLES[u.rol];
          return crudo(
            tarjeta(
              html`<div class="fila">
                <div class="crece">
                  <div style="font-weight:650;font-size:15px">${d.nombre}</div>
                  <div class="tenue-2">${u.nombre} · ${u.correo}</div>
                  <div class="fila fila--envuelve" style="gap:6px;margin-top:7px">
                    ${crudo(insignia(d.ambito, 'neutro'))}
                    ${d.requiereMfa ? crudo(insignia('MFA', 'alerta')) : ''}
                    ${d.puedeVerDatosBancarios ? '' : crudo(insignia('Sin datos bancarios', 'progreso'))}
                  </div>
                </div>
                <span aria-hidden="true" style="color:var(--texto-3);font-size:20px">›</span>
              </div>`,
              { accionIr: `#perfil:${u.id}` },
            ),
          );
        })}
      </div>
    </section>`;
  });

  return {
    titulo: 'INPARQUES Comercial',
    subtitulo: 'Demostración',
    cabeceraClara: true,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Elija un perfil</h1>
      <p class="bajada">
        Once roles con permisos, ámbitos y navegación distintos. Puede cambiar de perfil
        en cualquier momento desde el menú de la cuenta.
      </p>
      ${crudo(etiquetaDemo('Datos ficticios · ningún servicio real'))}
      <div class="mt-2">${crudo(aviso('info', 'Clave única de la demo', `Si prefiere el formulario de acceso, la contraseña de todos los perfiles es ${CLAVE_DEMO} y el código de verificación es ${CODIGO_MFA_DEMO}.`))}</div>
      <div class="mt-3">${bloques}</div>
      <div class="seccion">
        <div class="seccion__cab"><h2 class="seccion__tit">Otras entradas</h2></div>
        <div class="pila">
          ${crudo(boton('Comprar como invitado, sin cuenta', { variante: 'secundario', bloque: true, accion: 'invitado' }))}
          ${crudo(boton('Formulario de acceso del visitante', { variante: 'texto', bloque: true, accion: 'ir', valor: '/acceso/visitante' }))}
          ${crudo(boton('Formulario de acceso del comercio', { variante: 'texto', bloque: true, accion: 'ir', valor: '/acceso/comercio' }))}
          ${crudo(boton('Formulario de acceso institucional', { variante: 'texto', bloque: true, accion: 'ir', valor: '/acceso/inparques' }))}
        </div>
      </div>
    `,
  };
};

function formularioAcceso(
  superficie: 'visitante' | 'comercio' | 'inparques',
  titulo: string,
  bajada: string,
  pie: string,
): Pagina {
  return {
    titulo,
    atras: '/acceso',
    cabeceraClara: true,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">${titulo}</h1>
      <p class="bajada">${bajada}</p>
      ${crudo(etiquetaDemo())}
      <form class="mt-2" data-formulario="acceso" data-superficie="${superficie}">
        ${crudo(entradaTexto('correo', 'Correo electrónico', { tipo: 'email', requerido: true, autocompletar: 'username', marcador: 'nombre@ejemplo.ve' }))}
        ${crudo(entradaTexto('clave', 'Contraseña', { tipo: 'password', requerido: true, autocompletar: 'current-password', ayuda: `En la demo la contraseña es ${CLAVE_DEMO}` }))}
        <div id="error-acceso"></div>
        ${crudo(boton('Entrar', { variante: 'principal', bloque: true, tipo: 'submit' }))}
      </form>
      <div class="mt-2 centrado">
        ${crudo(boton('¿Olvidó su contraseña?', { variante: 'texto', accion: 'ir', valor: '/acceso/recuperar' }))}
      </div>
      <hr class="sep" />
      <p class="tenue">${pie}</p>
    `,
  };
}

export const accesoVisitante: Render = () =>
  formularioAcceso(
    'visitante',
    'Acceso de visitante',
    'Entre con su cuenta o compre como invitado.',
    'También puede comprar sin cuenta desde el inicio del parque.',
  );

export const accesoComercio: Render = () =>
  formularioAcceso(
    'comercio',
    'Acceso de comercio',
    'Para propietarios, administradores de local, operadores y contadores.',
    'Las cuentas de comercio se crean por invitación del propietario o de INPARQUES. No hay registro público.',
  );

export const accesoInparques: Render = () =>
  formularioAcceso(
    'inparques',
    'Acceso institucional',
    'Personal de INPARQUES autorizado.',
    'Las cuentas institucionales se activan solo por invitación y exigen verificación en dos pasos.',
  );

export const registroVisitante: Render = () => ({
  titulo: 'Crear cuenta',
  atras: '/acceso/visitante',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Crear cuenta de visitante</h1>
    <p class="bajada">Solo se pide lo necesario para el pedido y el comprobante.</p>
    <form data-formulario="registro">
      ${crudo(entradaTexto('nombre', 'Nombre y apellido', { requerido: true, autocompletar: 'name' }))}
      ${crudo(entradaTexto('correo', 'Correo electrónico', { tipo: 'email', requerido: true, autocompletar: 'email' }))}
      ${crudo(entradaTexto('telefono', 'Teléfono', { tipo: 'tel', modo: 'tel', marcador: '0414-0000000', ayuda: 'Se usa para avisarle cuando el pedido esté listo.' }))}
      ${crudo(entradaTexto('clave', 'Contraseña', { tipo: 'password', requerido: true, autocompletar: 'new-password', ayuda: 'Mínimo 8 caracteres.' }))}
      <div id="error-registro"></div>
      <div class="mt-2">${crudo(aviso('info', 'Privacidad', 'No se solicitan datos bancarios ni documentos. Puede consultar, corregir o suprimir sus datos desde el perfil.'))}</div>
      <div class="mt-2">${crudo(boton('Crear cuenta', { variante: 'principal', bloque: true, tipo: 'submit' }))}</div>
    </form>
  `,
});

export const compraInvitado: Render = () => ({
  titulo: 'Compra como invitado',
  atras: '/acceso',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Continuar sin cuenta</h1>
    <p class="bajada">Puede pedir y pagar como invitado. Solo se guarda lo indispensable para entregarle el pedido.</p>
    ${crudo(listaDatos([
      ['Qué se guarda', 'Nombre y pedido'],
      ['Qué no se guarda', 'Contraseña ni historial'],
      ['Comprobante', 'Se muestra al finalizar'],
    ]))}
    <div class="mt-2">${crudo(aviso('alerta', 'Sin cuenta no hay historial', 'El pedido se pierde al cerrar el navegador. Puede crear la cuenta después sin repetir la compra.'))}</div>
    <div class="mt-3">
      ${crudo(boton('Continuar como invitado', { variante: 'principal', bloque: true, accion: 'invitado' }))}
      <div class="mt-1">${crudo(boton('Prefiero crear una cuenta', { variante: 'secundario', bloque: true, accion: 'ir', valor: '/registro/visitante' }))}</div>
    </div>
  `,
});

export const invitacionComercio: Render = () => {
  const e = store.leer();
  const inv = e.invitaciones.find((i) => i.rol === 'comercio.propietario' && i.estado === 'pendiente');
  return {
    titulo: 'Invitación',
    atras: '/acceso',
    cabeceraClara: true,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Ha recibido una invitación</h1>
      ${inv
        ? crudo(html`
            <p class="bajada">Complete la activación para acceder al portal del comercio.</p>
            ${crudo(listaDatos([
              ['Correo invitado', inv.correo],
              ['Rol asignado', ROLES[inv.rol].nombre],
              ['Invitado por', e.usuarios.find((u) => u.id === inv.emitidaPor)?.nombre ?? '—'],
              ['Vence', fechaCorta(inv.expiraEn)],
              ['Código', `<span class="mono">${esc(inv.codigo)}</span>`],
            ]))}
            <div class="mt-2">${crudo(aviso('info', 'Sin envío real', 'En la demo no se envía correo ni SMS: el código aparece arriba.'))}</div>
            <div class="mt-3">${crudo(boton('Activar mi usuario', { variante: 'principal', bloque: true, accion: 'ir', valor: '/invitacion/comercio/activar' }))}</div>
          `)
        : crudo(vacio('✉', 'Sin invitaciones pendientes', 'No hay ninguna invitación de comercio activa en los datos de demostración.'))}
    `,
  };
};

export const activacionComercio: Render = () => ({
  titulo: 'Activar usuario',
  atras: '/invitacion/comercio',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Active su acceso</h1>
    <p class="bajada">Defina su contraseña. El rol y el ámbito ya vienen asignados en la invitación.</p>
    <form data-formulario="activacion">
      ${crudo(entradaTexto('codigo', 'Código de invitación', { requerido: true, valor: 'DEMO-4821', modo: 'numeric' }))}
      ${crudo(entradaTexto('clave', 'Contraseña nueva', { tipo: 'password', requerido: true, autocompletar: 'new-password', ayuda: 'Mínimo 8 caracteres.' }))}
      ${crudo(entradaTexto('clave2', 'Repita la contraseña', { tipo: 'password', requerido: true, autocompletar: 'new-password' }))}
      <div id="error-activacion"></div>
      <div class="mt-2">${crudo(boton('Activar y entrar', { variante: 'principal', bloque: true, tipo: 'submit' }))}</div>
    </form>
  `,
});

export const activacionInstitucional: Render = () => ({
  titulo: 'Activación institucional',
  atras: '/acceso/inparques',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Activación solo por invitación</h1>
    <p class="bajada">Las cuentas de INPARQUES no se crean por registro público.</p>
    ${crudo(aviso('alerta', 'Procedimiento cerrado', 'Un superadministrador o la Dirección Comercial emite la invitación con rol y ámbito. Sin esa invitación no existe forma de crear la cuenta.'))}
    <div class="mt-2">
      ${crudo(listaDatos([
        ['Quién invita', 'Superadministrador nacional o Dirección Comercial'],
        ['Qué define la invitación', 'Rol, ámbito y vigencia'],
        ['Segundo factor', 'Obligatorio en el primer acceso'],
        ['Cuenta compartida', 'No permitida'],
      ]))}
    </div>
    <form class="mt-3" data-formulario="activacion-institucional">
      ${crudo(entradaTexto('codigo', 'Código recibido', { requerido: true, marcador: 'INP-000000' }))}
      <div id="error-activacion-institucional"></div>
      ${crudo(boton('Verificar código', { variante: 'principal', bloque: true, tipo: 'submit' }))}
    </form>
  `,
});

export const mfa: Render = () => {
  const u = sesion.usuario();
  return {
    titulo: 'Verificación en dos pasos',
    cabeceraClara: true,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Confirme su identidad</h1>
      <p class="bajada">
        ${u ? `${ROLES[u.rol].nombre}. ` : ''}Este rol exige un segundo factor antes de entrar.
      </p>
      ${crudo(aviso('info', 'Código de demostración', `No se envía ningún SMS. Introduzca ${CODIGO_MFA_DEMO}.`))}
      <form class="mt-2" data-formulario="mfa">
        ${crudo(entradaTexto('codigo', 'Código de 6 dígitos', { modo: 'numeric', requerido: true, marcador: '000000', autocompletar: 'one-time-code' }))}
        <div id="error-mfa"></div>
        ${crudo(boton('Verificar', { variante: 'principal', bloque: true, tipo: 'submit' }))}
      </form>
      <div class="mt-2 centrado">${crudo(boton('Usar otro perfil', { variante: 'texto', accion: 'cerrar-sesion' }))}</div>
    `,
  };
};

export const mfaConfigurar: Render = () => ({
  titulo: 'Segundo factor',
  atras: '/perfil',
  contenido: html`
    <h1 class="titulo-pag">Configuración del segundo factor</h1>
    <p class="bajada">Método de verificación de la cuenta.</p>
    ${crudo(tarjeta(html`
      <div class="pila">
        ${crudo(conmutador('mfa-app', 'Aplicación de códigos', true, 'nada', 'mfa-app'))}
        <hr class="sep" />
        ${crudo(conmutador('mfa-sms', 'Mensaje de texto', false, 'nada', 'mfa-sms'))}
      </div>
    `))}
    <div class="mt-2">${crudo(aviso('info', 'Adaptador simulado', 'La verificación la resuelve mfa.simulado. No hay proveedor real ni envío de mensajes.'))}</div>
  `,
});

export const recuperarSolicitud: Render = () => ({
  titulo: 'Recuperar acceso',
  atras: '/acceso',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Recuperar acceso</h1>
    <p class="bajada">Le enviaremos un código de verificación al correo registrado.</p>
    <form data-formulario="recuperar">
      ${crudo(entradaTexto('correo', 'Correo electrónico', { tipo: 'email', requerido: true, autocompletar: 'email' }))}
      <div id="error-recuperar"></div>
      ${crudo(boton('Enviar código', { variante: 'principal', bloque: true, tipo: 'submit' }))}
    </form>
    <div class="mt-2">${crudo(aviso('info', 'Sin envío real', 'La demo no envía correos. Al continuar verá el código en pantalla.'))}</div>
  `,
});

export const recuperarCodigo: Render = () => ({
  titulo: 'Código de verificación',
  atras: '/acceso/recuperar',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Introduzca el código</h1>
    <p class="bajada">Válido por 10 minutos.</p>
    ${crudo(aviso('info', 'Código de demostración', `Use ${CODIGO_MFA_DEMO}.`))}
    <form class="mt-2" data-formulario="recuperar-codigo">
      ${crudo(entradaTexto('codigo', 'Código de 6 dígitos', { modo: 'numeric', requerido: true, marcador: '000000' }))}
      <div id="error-recuperar-codigo"></div>
      ${crudo(boton('Continuar', { variante: 'principal', bloque: true, tipo: 'submit' }))}
    </form>
  `,
});

export const recuperarClave: Render = () => ({
  titulo: 'Nueva contraseña',
  atras: '/acceso/recuperar/codigo',
  cabeceraClara: true,
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Defina su nueva contraseña</h1>
    <form data-formulario="nueva-clave">
      ${crudo(entradaTexto('clave', 'Contraseña nueva', { tipo: 'password', requerido: true, autocompletar: 'new-password', ayuda: 'Mínimo 8 caracteres.' }))}
      ${crudo(entradaTexto('clave2', 'Repita la contraseña', { tipo: 'password', requerido: true, autocompletar: 'new-password' }))}
      <div id="error-nueva-clave"></div>
      ${crudo(boton('Guardar y entrar', { variante: 'principal', bloque: true, tipo: 'submit' }))}
    </form>
  `,
});

export const sesiones: Render = () => {
  const e = store.leer();
  const s = sesion.activa();
  const propias = e.sesiones.filter((x) => x.usuarioId === s?.usuarioId);
  return {
    titulo: 'Mis sesiones',
    atras: '/perfil',
    contenido: html`
      <h1 class="titulo-pag">Sesiones activas</h1>
      <p class="bajada">Dispositivos donde su cuenta está abierta.</p>
      ${propias.length === 0
        ? crudo(vacio('⧉', 'Sin sesiones registradas', 'Esta sesión es de invitado o aún no se ha registrado.'))
        : crudo(html`<div class="pila">
            ${propias.map((x) =>
              crudo(tarjeta(html`
                <div class="fila fila--sep">
                  <div class="crece">
                    <div style="font-weight:650">${x.dispositivo}</div>
                    <div class="tenue-2">Desde ${fechaCorta(x.iniciadaEn)} · última actividad ${horaCorta(x.ultimaActividad)}</div>
                  </div>
                  ${crudo(insignia(x.vigente ? 'Vigente' : 'Cerrada', x.vigente ? 'exito' : 'neutro'))}
                </div>
                ${x.vigente ? crudo(`<div class="mt-1">${boton('Cerrar esta sesión', { variante: 'texto', pequeno: true, accion: 'revocar-sesion', valor: x.id })}</div>`) : ''}
              `)),
            )}
          </div>`)}
    `,
  };
};

export const notificaciones: Render = () => {
  const e = store.leer();
  const rol = sesion.rol();
  const s = sesion.activa();
  // El ámbito importa tanto como el rol: sin esta comprobación el operador de
  // un local veía los pedidos de todos los demás locales del país, en una
  // pantalla que promete por escrito lo contrario.
  const u = sesion.usuario();
  const ambito = u ? resolverAmbito(u, e) : null;
  const alcanza = (ambitoId?: string): boolean => {
    if (!ambitoId) return true;              // aviso general, sin ámbito
    if (!ambito || ambito.nacional) return true;
    return (
      ambito.localIds.includes(ambitoId) ||
      ambito.negocioIds.includes(ambitoId) ||
      ambito.parqueIds.includes(ambitoId)
    );
  };
  const mias = e.notificaciones
    .filter((n) => n.destinatarioRol === rol && (!n.destinatarioId || n.destinatarioId === s?.usuarioId))
    .filter((n) => alcanza(n.ambitoId))
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  const iconos: Record<string, string> = {
    orden: '▤', pago: '▣', documento: '≡', permiso: '✓', inspeccion: '⚑', disputa: '⚠', sistema: 'ℹ',
  };

  return {
    titulo: 'Notificaciones',
    acciones: mias.some((n) => !n.leida)
      ? `<button class="icono-bt" data-accion="leer-todo" aria-label="Marcar todas como leídas"><span aria-hidden="true">✓</span></button>`
      : undefined,
    contenido: html`
      <h1 class="titulo-pag">Notificaciones</h1>
      <p class="bajada">Solo las de su rol y su ámbito.</p>
      ${mias.length === 0
        ? crudo(vacio('◔', 'Sin notificaciones', 'Cuando ocurra algo en su ámbito aparecerá aquí.'))
        : crudo(html`<div class="pila">
            ${mias.map((n) =>
              crudo(
                tarjeta(
                  html`<div class="fila">
                    <span aria-hidden="true" style="font-size:19px;color:var(--verde-600)">${iconos[n.tipo] ?? '•'}</span>
                    <div class="crece">
                      <div style="font-weight:650;font-size:14.5px">${n.titulo}</div>
                      <div class="tenue">${n.cuerpo}</div>
                      <div class="tenue-2 mt-1">${fechaCorta(n.creadaEn)} · ${horaCorta(n.creadaEn)}</div>
                    </div>
                    ${n.leida ? '' : crudo(insignia('Nueva', 'progreso'))}
                  </div>`,
                  n.rutaDestino ? { accionIr: n.rutaDestino } : {},
                ),
              ),
            )}
          </div>`)}
    `,
  };
};

export const perfil: Render = () => {
  const u = sesion.usuario();
  const s = sesion.activa();
  const e = store.leer();
  const d = u ? ROLES[u.rol] : null;

  return {
    titulo: 'Perfil',
    contenido: html`
      <h1 class="titulo-pag">${u?.nombre ?? 'Invitado'}</h1>
      <p class="bajada">${d?.nombre ?? 'Visitante sin cuenta'}</p>

      ${u
        ? crudo(listaDatos([
            ['Correo', esc(u.correo)],
            ['Rol', esc(d!.nombre)],
            ['Ámbito', esc(d!.limite)],
            ['Origen de la cuenta', u.origen === 'invitacion' ? 'Por invitación' : 'Registro público'],
            ['Segundo factor', d!.requiereMfa ? 'Obligatorio' : 'No requerido'],
            ['Datos bancarios', d!.puedeVerDatosBancarios ? 'Visibles enmascarados' : 'No accesibles para este rol'],
          ]))
        : crudo(aviso('info', 'Sesión de invitado', 'Puede crear una cuenta para conservar su historial y sus comprobantes.'))}

      ${crudo(seccion('Cuenta', html`<div class="pila">
        ${crudo(boton('Notificaciones', { bloque: true, accion: 'ir', valor: '/notificaciones' }))}
        ${crudo(boton('Accesibilidad', { bloque: true, accion: 'ir', valor: '/perfil/accesibilidad' }))}
        ${crudo(boton('Privacidad y datos', { bloque: true, accion: 'ir', valor: '/perfil/privacidad' }))}
        ${u ? crudo(boton('Sesiones activas', { bloque: true, accion: 'ir', valor: '/sesiones' })) : ''}
        ${u && ROLES[u.rol].requiereMfa ? crudo(boton('Segundo factor', { bloque: true, accion: 'ir', valor: '/mfa/configurar' })) : ''}
        ${crudo(boton('Ayuda', { bloque: true, accion: 'ir', valor: '/ayuda' }))}
      </div>`))}

      ${crudo(seccion('Demostración', html`<div class="pila">
        ${crudo(boton('Cambiar de perfil', { variante: 'principal', bloque: true, accion: 'cerrar-sesion' }))}
        ${crudo(boton('Índice técnico de páginas', { bloque: true, accion: 'ir', valor: '/__mapa' }))}
        ${crudo(boton(`Conexión: ${conectividad.etiqueta()}`, { bloque: true, accion: 'alternar-conexion' }))}
        ${crudo(boton('Restablecer datos de la demo', { variante: 'peligro', bloque: true, accion: 'restablecer' }))}
      </div>`))}

      <p class="tenue-2 mt-2">${formatearTasa(e.tasaBcv)} · almacenamiento: ${store.backendNombre} · sesión ${s?.invitado ? 'de invitado' : 'con cuenta'}</p>
    `,
  };
};

export const accesibilidad: Render = () => ({
  titulo: 'Accesibilidad',
  atras: '/perfil',
  contenido: html`
    <h1 class="titulo-pag">Accesibilidad</h1>
    <p class="bajada">Ajustes de lectura y navegación.</p>
    ${crudo(tarjeta(html`<div class="pila">
      ${crudo(conmutador('acc-contraste', 'Alto contraste', false, 'nada', 'contraste'))}
      <hr class="sep" />
      ${crudo(conmutador('acc-texto', 'Texto más grande', false, 'nada', 'texto'))}
      <hr class="sep" />
      ${crudo(conmutador('acc-movimiento', 'Reducir animaciones', false, 'nada', 'movimiento'))}
    </div>`))}
    ${crudo(seccion('Ya incorporado', html`${crudo(listaDatos([
      ['Zoom del navegador', 'Permitido, sin bloqueo'],
      ['Áreas táctiles', 'Mínimo 44 píxeles'],
      ['Estado por color', 'Siempre acompañado de texto y símbolo'],
      ['Foco visible', 'En todos los controles'],
      ['Lectores de pantalla', 'Etiquetas y anuncios de cambios'],
      ['Movimiento', 'Respeta la preferencia del sistema'],
    ]))}`))}
  `,
});

export const privacidad: Render = () => ({
  titulo: 'Privacidad',
  atras: '/perfil',
  contenido: html`
    <h1 class="titulo-pag">Privacidad y datos</h1>
    <p class="bajada">Qué se recoge, para qué y qué puede hacer con ello.</p>
    ${crudo(listaDatos([
      ['Identidad', 'Nombre y correo, para asociar el pedido'],
      ['Contacto', 'Teléfono opcional, para avisar del retiro'],
      ['Ubicación', 'Opcional y simulada; nunca impide el uso'],
      ['Datos financieros', 'Separados de la identidad y enmascarados'],
      ['Tarjetas', 'No se almacena número completo ni código'],
      ['Menores', 'No se solicitan datos de menores'],
    ]))}
    ${crudo(seccion('Sus derechos', html`<div class="pila">
      ${crudo(boton('Consultar mis datos', { bloque: true, accion: 'aviso', valor: 'Consulta registrada en la bitácora de la demo.' }))}
      ${crudo(boton('Rectificar mis datos', { bloque: true, accion: 'ir', valor: '/perfil' }))}
      ${crudo(boton('Solicitar supresión', { variante: 'peligro', bloque: true, accion: 'aviso', valor: 'Solicitud de supresión registrada. En la demo no se elimina nada.' }))}
    </div>`))}
    <p class="tenue-2">La Ley de Infogobierno exige informar medios, propósito, uso y protección de la información suministrada.</p>
  `,
});

export const ayuda: Render = () => ({
  titulo: 'Ayuda',
  contenido: html`
    <h1 class="titulo-pag">Ayuda</h1>
    <p class="bajada">Preguntas frecuentes de la demostración.</p>
    ${crudo(seccion('Cómo probar', html`${crudo(listaDatos([
      ['Cambiar de rol', 'Perfil › Cambiar de perfil'],
      ['Contraseña', esc(CLAVE_DEMO)],
      ['Código de verificación', esc(CODIGO_MFA_DEMO)],
      ['Simular sin conexión', 'Perfil › Conexión'],
      ['Volver a empezar', 'Perfil › Restablecer datos'],
      ['Ver todas las páginas', 'Perfil › Índice técnico'],
    ]))}`))}
    ${crudo(seccion('Qué está simulado', html`
      <div class="pila">
        ${inventarioAdaptadores().map((a) =>
          crudo(tarjeta(html`
            <div style="font-weight:650;font-size:14px" class="mono">${a.id}</div>
            <div class="tenue mt-1">${a.descripcion}</div>
          `, { clase: 'tarjeta--plana' })),
        )}
      </div>
    `))}
    ${crudo(seccion('Contacto', html`<div class="pila">
      ${crudo(boton('Abrir un reclamo sobre un pedido', { bloque: true, accion: 'ir', valor: '/v/historial' }))}
      ${crudo(boton('Ver estado del servicio', { bloque: true, accion: 'ir', valor: '/conexion/degradada' }))}
    </div>`))}
  `,
});

// ------------------------------------------------------------------ Estados

function estadoPagina(icono: string, titulo: string, detalle: string, acciones: string): Pagina {
  return {
    titulo,
    cabeceraClara: true,
    sinNav: true,
    contenido: html`<div class="estado" style="padding-top:56px">
      <div class="estado__ic" aria-hidden="true">${icono}</div>
      <h1 class="estado__t" style="font-size:21px">${titulo}</h1>
      <p class="estado__d">${detalle}</p>
      ${crudo(acciones)}
    </div>`,
  };
}

export const error403: Render = () => {
  const rol = sesion.rol();
  const inicio = !rol ? '/acceso' : rol === 'visitante.cliente' ? '/v' : rol.startsWith('comercio.') ? '/c' : '/i';
  return estadoPagina(
    '⊘',
    'No tiene permiso para ver esta página',
    rol
      ? `El rol ${ROLES[rol].nombre} no está autorizado para este módulo. El intento queda registrado.`
      : 'Necesita iniciar sesión con un rol autorizado.',
    boton('Volver a mi inicio', { variante: 'principal', accion: 'ir', valor: inicio }),
  );
};

export const error404: Render = () =>
  estadoPagina(
    '◌',
    'Página no encontrada',
    'La dirección no corresponde a ninguna pantalla registrada.',
    boton('Volver al inicio', { variante: 'principal', accion: 'ir', valor: '/' }),
  );

export const sesionVencida: Render = () =>
  estadoPagina(
    '◷',
    'Su sesión ha vencido',
    'Por seguridad, la sesión se cerró tras un periodo de inactividad. Su carrito se conserva.',
    boton('Volver a entrar', { variante: 'principal', accion: 'ir', valor: '/acceso' }),
  );

export const mantenimiento: Render = () =>
  estadoPagina(
    '⚙',
    'En mantenimiento',
    'El servicio estará disponible nuevamente en unos minutos. Las operaciones en curso no se pierden.',
    boton('Reintentar', { variante: 'principal', accion: 'recargar' }),
  );

// ------------------------------------------------------------ Conectividad

export const conexionDegradada: Render = () => {
  const modo = conectividad.actual();
  return {
    titulo: 'Estado de la conexión',
    atras: '/perfil',
    contenido: html`
      <h1 class="titulo-pag">Conexión</h1>
      <p class="bajada">Control de demostración para probar los tres modos sin desconectar el equipo.</p>

      ${crudo(tarjeta(html`
        <div class="fila fila--sep">
          <div class="crece">
            <div style="font-weight:650">${conectividad.etiqueta()}</div>
            <div class="tenue-2">${
              modo === 'conectado'
                ? 'Todas las operaciones disponibles.'
                : modo === 'degradado'
                  ? 'Lectura de datos ya cargados; los cambios se encolan.'
                  : 'Solo consulta. Los cambios operativos quedan en cola.'
            }</div>
          </div>
          ${crudo(insignia(conectividad.etiqueta(), modo === 'conectado' ? 'exito' : modo === 'degradado' ? 'alerta' : 'error'))}
        </div>
        <div class="mt-2">${crudo(boton('Cambiar de modo', { variante: 'principal', bloque: true, accion: 'alternar-conexion' }))}</div>
      `))}

      <div class="mt-2">
        ${crudo(aviso('alerta', 'Lo que nunca se promete sin red', 'Un pago no se muestra como confirmado, una factura no se da por emitida y una liquidación no se marca como conciliada mientras la conexión no sea plena.'))}
      </div>

      ${crudo(seccion('Qué sí funciona sin conexión', html`${crudo(listaDatos([
        ['Consultar', 'Pedidos, catálogo y datos ya cargados'],
        ['Encolar', 'Aceptar, preparar, marcar listo y entregar'],
        ['Encolar', 'Cambios de disponibilidad y ventas de mostrador'],
        ['Bloqueado', 'Verificación bancaria y emisión de factura'],
      ]))}`, { texto: 'Ver cola', ruta: '/conexion/cola' }))}
    `,
  };
};

export const colaSincronizacionVista: Render = () => {
  const cola = colaSincronizacion.listar();
  const tonos: Record<string, 'neutro' | 'progreso' | 'exito' | 'alerta' | 'error'> = {
    pendiente: 'alerta', sincronizando: 'progreso', sincronizada: 'exito', conflicto: 'error', error: 'error',
  };
  return {
    titulo: 'Cola de sincronización',
    atras: '/conexion/degradada',
    contenido: html`
      <h1 class="titulo-pag">Cola de sincronización</h1>
      <p class="bajada">Acciones registradas sin conexión, a la espera de aplicarse.</p>
      ${cola.length === 0
        ? crudo(vacio('✓', 'Nada pendiente', 'Todas las acciones se han aplicado. Puede simular una desconexión y operar para ver la cola en uso.', 'Ir a conexión', '/conexion/degradada'))
        : crudo(html`
            <div class="pila">
              ${cola.map((a) =>
                crudo(tarjeta(html`
                  <div class="fila fila--sep">
                    <div class="crece">
                      <div style="font-weight:650;font-size:14.5px">${a.tipo}</div>
                      <div class="tenue-2 mono">${a.entidadId}</div>
                      ${a.detalle ? crudo(`<div class="tenue mt-1">${esc(a.detalle)}</div>`) : ''}
                    </div>
                    ${crudo(insignia(a.estado, tonos[a.estado] ?? 'neutro'))}
                  </div>
                  ${a.estado === 'conflicto'
                    ? crudo(`<div class="fila mt-2" style="gap:8px">
                        ${boton('Reintentar', { variante: 'principal', pequeno: true, accion: 'cola-forzar', valor: a.id })}
                        ${boton('Descartar', { variante: 'secundario', pequeno: true, accion: 'cola-descartar', valor: a.id })}
                      </div>`)
                    : ''}
                `)),
              )}
            </div>
            ${crudo(barraAccion([
              boton('Sincronizar ahora', { variante: 'principal', bloque: true, accion: 'sincronizar' }),
            ]))}
          `)}
    `,
  };
};

export const conflictoSincronizacion: Render = () => {
  const conflictos = colaSincronizacion.conflictos();
  return {
    titulo: 'Conflictos',
    atras: '/conexion/cola',
    contenido: html`
      <h1 class="titulo-pag">Conflictos de sincronización</h1>
      <p class="bajada">El registro cambió mientras la acción esperaba en cola.</p>
      ${conflictos.length === 0
        ? crudo(vacio('✓', 'Sin conflictos', 'Ninguna acción encolada choca con el estado actual.'))
        : crudo(html`<div class="pila">
            ${conflictos.map((a) =>
              crudo(tarjeta(html`
                <div style="font-weight:650">${a.tipo}</div>
                <div class="mt-1">${crudo(listaDatos([
                  ['Registro', `<span class="mono">${esc(a.entidadId)}</span>`],
                  ['Estado esperado', esc(a.versionOrigen)],
                  ['Estado actual', esc(a.detalle ?? '—')],
                ]))}</div>
                <div class="fila mt-2" style="gap:8px">
                  ${crudo(boton('Aplicar sobre el estado actual', { variante: 'principal', pequeno: true, accion: 'cola-forzar', valor: a.id }))}
                  ${crudo(boton('Descartar', { variante: 'secundario', pequeno: true, accion: 'cola-descartar', valor: a.id }))}
                </div>
              `)),
            )}
          </div>`)}
    `,
  };
};

/** Página "Más": el resto de módulos del rol, en teléfono. */
export const masOpciones = (superficie: 'comercio' | 'inparques'): Render => () => {
  const rol = sesion.rol();
  if (!rol) return error403({ params: {}, consulta: new URLSearchParams(), ruta: '' });

  // Se reutilizan exactamente los mismos enlaces que el lateral de escritorio,
  // para que teléfono y escritorio no puedan divergir.
  const grupos = superficie === 'comercio' ? enlacesComercio(rol) : enlacesInparques(rol);

  return {
    titulo: 'Más',
    contenido: html`
      <h1 class="titulo-pag">Todos los módulos</h1>
      <p class="bajada">${ROLE_IDS.includes(rol) ? ROLES[rol].nombre : ''} · solo lo autorizado para su rol.</p>
      ${grupos.map(
        (g) => crudo(seccion(g.grupo, html`<div class="pila">
          ${g.items.map((i) => crudo(boton(i.texto, { bloque: true, accion: 'ir', valor: i.ruta, icono: i.icono })))}
        </div>`)),
      )}
      ${crudo(seccion('Cuenta', html`<div class="pila">
        ${crudo(boton('Perfil', { bloque: true, accion: 'ir', valor: '/perfil', icono: '☺' }))}
        ${crudo(boton('Cambiar de perfil', { variante: 'principal', bloque: true, accion: 'cerrar-sesion' }))}
      </div>`))}
    `,
  };
};
