/**
 * Sesion de la demo.
 *
 * Persiste al recargar, puede cerrarse y registra el paso de MFA cuando el rol
 * lo exige. Las cuentas institucionales y de comercio se marcan como activadas
 * por invitacion; solo el visitante puede registrarse en publico.
 */

import type { RoleId, Scope, User } from '../domain/types';
import { ROLES } from '../domain/roles';
import { store } from '../data/store';
import { adaptadores } from '../adapters/simulados';
import { identificador } from '../domain/ids';

const CLAVE_SESION = 'inparques.demo.sesion';

/** Clave unica de la demo. Documentada en el README; no es un secreto. */
export const CLAVE_DEMO = 'demo1234';

/**
 * Claves cambiadas durante la sesion de demostracion.
 *
 * "Contrasena actualizada. Ya puede entrar" era mentira: no se guardaba nada
 * y la clave seguia siendo la de siempre, asi que quien completaba el flujo
 * de recuperacion y probaba su clave nueva no entraba. Aqui se recuerdan las
 * que se cambian, para que el mensaje sea cierto.
 *
 * Sigue siendo una demostracion: se guardan en el navegador y en claro. No es
 * un almacen de credenciales y no debe convertirse en uno — cuando esto
 * hable con un servidor de verdad, la clave no se guarda nunca del lado del
 * cliente.
 */
const CLAVE_CLAVES = 'inparques.demo.claves';

function clavesCambiadas(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_CLAVES) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Devuelve `false` si el correo no corresponde a ninguna cuenta. */
export function cambiarClaveDe(correo: string, nueva: string): boolean {
  const u = store.leer().usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());
  if (!u) return false;
  if (typeof window === 'undefined') return false;
  const mapa = clavesCambiadas();
  mapa[u.id] = nueva;
  window.localStorage.setItem(CLAVE_CLAVES, JSON.stringify(mapa));
  return true;
}

/** La clave vigente de un usuario: la que cambio, o la de la demo. */
export function claveVigente(usuarioId: string): string {
  return clavesCambiadas()[usuarioId] ?? CLAVE_DEMO;
}

/**
 * Cuanto dura una sesion antes de pedir credenciales otra vez.
 *
 * Doce horas: cubre una jornada entera de un operador de parque —que no
 * quiere volver a escribir la clave a media manana— sin dejar la sesion viva
 * indefinidamente en un telefono que se pierde.
 */
export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

export interface SesionActiva {
  usuarioId: string;
  rol: RoleId;
  /** Ambito seleccionado en el selector, dentro del ambito del usuario. */
  ambitoSeleccionado: string | null;
  mfaVerificado: boolean;
  iniciadaEn: string;
  /** Sesion de compra sin cuenta. */
  invitado: boolean;
}

type Oyente = (s: SesionActiva | null) => void;

export type ResultadoAcceso =
  | { ok: true; sesion: SesionActiva; requiereMfa: boolean }
  | { ok: false; motivo: 'credenciales' | 'usuario_inactivo' | 'superficie_incorrecta'; mensaje: string };

class Sesion {
  private actual: SesionActiva | null = null;
  private oyentes = new Set<Oyente>();

  /** Recupera la sesion tras recargar la pagina. */
  restaurar(): SesionActiva | null {
    if (typeof window === 'undefined') return null;
    try {
      const crudo = window.localStorage.getItem(CLAVE_SESION);
      if (!crudo) return null;
      const s = JSON.parse(crudo) as SesionActiva;

      if (!s.invitado) {
        // Solo se restaura si el usuario sigue existiendo y activo.
        const u = store.leer().usuarios.find((x) => x.id === s.usuarioId);
        if (!u || u.estado !== 'activo') return null;

        // La sesion caduca. `vencer()` existia desde el principio y no la
        // llamaba nadie: una sesion abierta lo seguia estando para siempre.
        if (this.vencida(s)) {
          this.vencer();
          return null;
        }

        // El rol se relee del usuario, no del blob guardado. Si a alguien le
        // cambian el cargo, antes conservaba el anterior —con sus permisos—
        // hasta que cerrara sesion por su cuenta.
        if (u.rol !== s.rol) {
          s.rol = u.rol;
          // Un rol distinto puede exigir MFA que esta sesion nunca paso.
          if (ROLES[u.rol].requiereMfa) s.mfaVerificado = false;
        }
      }

      this.actual = s;
      this.establecer(s);
      return s;
    } catch {
      return null;
    }
  }

  private vencida(s: SesionActiva): boolean {
    const inicio = new Date(s.iniciadaEn).getTime();
    if (Number.isNaN(inicio)) return true;
    return Date.now() - inicio > DURACION_SESION_MS;
  }

  usuario(): User | null {
    if (!this.actual) return null;
    return store.leer().usuarios.find((u) => u.id === this.actual!.usuarioId) ?? null;
  }

  activa(): SesionActiva | null {
    return this.actual;
  }

  rol(): RoleId | null {
    return this.actual?.rol ?? null;
  }

  /** true cuando la sesion esta completa: autenticada y con MFA si aplica. */
  autenticada(): boolean {
    if (!this.actual) return false;
    if (this.actual.invitado) return true;
    if (ROLES[this.actual.rol].requiereMfa && !this.actual.mfaVerificado) return false;
    return true;
  }

  requiereMfaPendiente(): boolean {
    if (!this.actual || this.actual.invitado) return false;
    return ROLES[this.actual.rol].requiereMfa && !this.actual.mfaVerificado;
  }

  /**
   * Acceso por correo y clave. `superficie` restringe el formulario: el login
   * de comercio no acepta una cuenta institucional y viceversa.
   */
  acceder(correo: string, clave: string, superficie?: 'visitante' | 'comercio' | 'inparques'): ResultadoAcceso {
    const u = store.leer().usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());

    if (!u || clave !== claveVigente(u.id)) {
      return { ok: false, motivo: 'credenciales', mensaje: 'Correo o contrasena incorrectos.' };
    }
    if (u.estado !== 'activo') {
      return {
        ok: false,
        motivo: 'usuario_inactivo',
        mensaje:
          u.estado === 'invitado'
            ? 'Esta cuenta aun no ha completado su activacion por invitacion.'
            : 'Esta cuenta esta suspendida.',
      };
    }
    if (superficie && ROLES[u.rol].superficie !== superficie) {
      return {
        ok: false,
        motivo: 'superficie_incorrecta',
        mensaje: 'Esta cuenta no corresponde a este formulario de acceso.',
      };
    }

    return { ok: true, ...this.abrir(u) };
  }

  /** Entrada directa por perfil, para el selector de demostracion. */
  accederComoPerfil(usuarioId: string): ResultadoAcceso {
    const u = store.leer().usuarios.find((x) => x.id === usuarioId);
    if (!u) return { ok: false, motivo: 'credenciales', mensaje: 'Perfil de demostracion no encontrado.' };
    if (u.estado !== 'activo') {
      return { ok: false, motivo: 'usuario_inactivo', mensaje: 'Este perfil no esta activo.' };
    }
    return { ok: true, ...this.abrir(u) };
  }

  /** Compra como invitado: sin cuenta, con acceso solo a lo suyo. */
  continuarComoInvitado(): SesionActiva {
    const s: SesionActiva = {
      usuarioId: 'invitado',
      rol: 'visitante.cliente',
      ambitoSeleccionado: null,
      mfaVerificado: true,
      iniciadaEn: new Date().toISOString(),
      invitado: true,
    };
    this.establecer(s);
    return s;
  }

  async solicitarCodigoMfa(): Promise<string> {
    if (!this.actual) return '';
    const { pista } = await adaptadores.mfa.emitirCodigo(this.actual.usuarioId);
    return pista;
  }

  async verificarMfa(codigo: string): Promise<boolean> {
    if (!this.actual) return false;
    const ok = await adaptadores.mfa.verificar(this.actual.usuarioId, codigo);
    if (ok) {
      this.establecer({ ...this.actual, mfaVerificado: true });
      this.registrarSesionEnEstado();
    }
    return ok;
  }

  /** Cambio de ambito: parque, negocio o local dentro de lo permitido. */
  cambiarAmbito(ambitoId: string | null): void {
    if (!this.actual) return;
    this.establecer({ ...this.actual, ambitoSeleccionado: ambitoId });
  }

  cerrar(): void {
    const id = this.actual?.usuarioId;
    if (id && id !== 'invitado') {
      store.actualizar((e) => {
        for (const s of e.sesiones) {
          if (s.usuarioId === id) s.vigente = false;
        }
      });
    }
    this.actual = null;
    if (typeof window !== 'undefined') window.localStorage.removeItem(CLAVE_SESION);
    this.notificar();
  }

  /** Sesion vencida: se cierra sin registrar cierre voluntario. */
  vencer(): void {
    this.actual = null;
    if (typeof window !== 'undefined') window.localStorage.removeItem(CLAVE_SESION);
    this.notificar();
  }

  suscribir(o: Oyente): () => void {
    this.oyentes.add(o);
    return () => this.oyentes.delete(o);
  }

  private abrir(u: User): { sesion: SesionActiva; requiereMfa: boolean } {
    const requiereMfa = ROLES[u.rol].requiereMfa;
    const s: SesionActiva = {
      usuarioId: u.id,
      rol: u.rol,
      ambitoSeleccionado: u.scope.ids[0] ?? null,
      mfaVerificado: !requiereMfa,
      iniciadaEn: new Date().toISOString(),
      invitado: false,
    };
    this.establecer(s);
    this.registrarSesionEnEstado();
    return { sesion: s, requiereMfa };
  }

  private registrarSesionEnEstado(): void {
    const s = this.actual;
    if (!s || s.invitado) return;
    store.actualizar((e) => {
      const existente = e.sesiones.find((x) => x.usuarioId === s.usuarioId && x.vigente);
      const ahora = new Date().toISOString();
      if (existente) {
        existente.ultimaActividad = ahora;
        existente.mfaPendiente = !s.mfaVerificado;
        return;
      }
      e.sesiones.push({
        id: identificador('se'),
        usuarioId: s.usuarioId,
        dispositivo: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Demo',
        iniciadaEn: s.iniciadaEn,
        ultimaActividad: ahora,
        vigente: true,
        mfaPendiente: !s.mfaVerificado,
      });
      const u = e.usuarios.find((x) => x.id === s.usuarioId);
      if (u) u.ultimoAcceso = ahora;
    });
  }

  private establecer(s: SesionActiva): void {
    this.actual = s;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
    }
    this.notificar();
  }

  private notificar(): void {
    for (const o of this.oyentes) o(this.actual);
  }
}

export const sesion = new Sesion();

/** Ambito efectivo del usuario, ya limitado por su definicion de rol. */
export function ambitoEfectivo(u: User, seleccionado: string | null): Scope {
  if (!seleccionado) return u.scope;
  if (!u.scope.ids.includes(seleccionado) && u.scope.level !== 'nacional') return u.scope;
  return { level: u.scope.level, ids: u.scope.level === 'nacional' ? [] : [seleccionado] };
}
