import type { OpcionesShell } from '../shell';

export interface Contexto {
  params: Record<string, string>;
  consulta: URLSearchParams;
  ruta: string;
}

export interface Pagina extends OpcionesShell {
  contenido: string;
  /**
   * true = la vista trae su propia cabecera, barra lateral o navegación
   * inferior (markup original de Stitch) y no debe pasar por `marco()`.
   * `contenido` se monta directamente como el árbol completo de la página.
   */
  standalone?: boolean;
}

export type Render = (ctx: Contexto) => Pagina;
