/**
 * Estado efímero de la interfaz: carrito en curso, filtros, hoja abierta y
 * avisos. Lo que debe sobrevivir a una recarga vive en el store; lo de aquí
 * solo persiste el carrito, porque perderlo a media compra sería un fallo.
 */

import { carritoVacio, type Carrito } from '../domain/cart';

const CLAVE_CARRITO = 'inparques.demo.carrito';
const CLAVE_ORDENES_INVITADO = 'inparques.demo.ordenes-invitado';

export interface Hoja {
  titulo: string;
  cuerpo: string;
  pie: string;
  /** Acción a ejecutar al confirmar; la resuelve el despachador. */
  alCerrar?: string;
}

export interface EstadoUi {
  carrito: Carrito;
  filtros: Record<string, string>;
  busqueda: Record<string, string>;
  hoja: Hoja | null;
  brindis: { texto: string; error: boolean } | null;
  colaPendientes: number;
  /** Selección temporal dentro de un formulario de artículo. */
  seleccion: Record<string, string>;
  cargando: boolean;
  /**
   * Pedidos hechos como invitado desde este dispositivo.
   *
   * Un invitado no tiene cuenta, así que no hay `clienteId` con el que
   * reconocerlo. Antes se resolvía con "cualquier pedido marcado como de
   * invitado", y eso hacía que un invitado viera los pedidos de todos los
   * demás invitados —incluido su código de retiro, que es lo que se presenta
   * para llevarse la comida—. Es lo único que ata un pedido anónimo a quien
   * lo hizo, así que vive aquí y se guarda en el navegador.
   */
  ordenesInvitado: string[];
}

export const estadoUi: EstadoUi = {
  carrito: carritoVacio(),
  filtros: {},
  busqueda: {},
  hoja: null,
  brindis: null,
  colaPendientes: 0,
  seleccion: {},
  cargando: false,
  ordenesInvitado: [],
};

export function restaurarCarrito(): void {
  if (typeof window === 'undefined') return;
  try {
    const crudo = window.localStorage.getItem(CLAVE_CARRITO);
    if (crudo) estadoUi.carrito = JSON.parse(crudo) as Carrito;
  } catch {
    estadoUi.carrito = carritoVacio();
  }
}

export function restaurarOrdenesInvitado(): void {
  if (typeof window === 'undefined') return;
  try {
    const crudo = window.localStorage.getItem(CLAVE_ORDENES_INVITADO);
    if (crudo) estadoUi.ordenesInvitado = JSON.parse(crudo) as string[];
  } catch {
    estadoUi.ordenesInvitado = [];
  }
}

export function recordarOrdenInvitado(ordenId: string): void {
  if (estadoUi.ordenesInvitado.includes(ordenId)) return;
  estadoUi.ordenesInvitado.push(ordenId);
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLAVE_ORDENES_INVITADO, JSON.stringify(estadoUi.ordenesInvitado));
}

export function esOrdenDeEsteInvitado(ordenId: string): boolean {
  return estadoUi.ordenesInvitado.includes(ordenId);
}

export function guardarCarrito(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(estadoUi.carrito));
}

export function fijarCarrito(c: Carrito): void {
  estadoUi.carrito = c;
  guardarCarrito();
}

export function vaciarCarrito(): void {
  estadoUi.carrito = carritoVacio();
  guardarCarrito();
}

export function filtro(clave: string, porDefecto = 'todos'): string {
  return estadoUi.filtros[clave] ?? porDefecto;
}

export function fijarFiltro(clave: string, valor: string): void {
  estadoUi.filtros[clave] = valor;
}

export function texto(clave: string): string {
  return estadoUi.busqueda[clave] ?? '';
}

export function fijarTexto(clave: string, valor: string): void {
  estadoUi.busqueda[clave] = valor;
}
