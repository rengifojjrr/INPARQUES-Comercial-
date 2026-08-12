import type { OpcionesShell } from '../shell';

export interface Contexto {
  params: Record<string, string>;
  consulta: URLSearchParams;
  ruta: string;
}

export interface Pagina extends OpcionesShell {
  contenido: string;
}

export type Render = (ctx: Contexto) => Pagina;
