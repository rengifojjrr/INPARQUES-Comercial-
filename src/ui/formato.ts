/**
 * Formato de fechas y textos, en español de Venezuela.
 *
 * Una franja de reserva es una hora *local del parque* ("09:00"), no un
 * instante universal. Pegarle una `Z` la convertía en 09:00 UTC, y como todo
 * usuario real de esto está en UTC−4, la pantalla mostraba 05:00: la reserva
 * se veía cuatro horas antes de la hora a la que hay que presentarse.
 *
 * Estas dos funciones son el puente correcto entre "fecha + hora local" y el
 * instante que se guarda.
 */

/** "2026-08-14" + "09:00" -> instante real de esa hora local. */
export function instanteLocal(fecha: string, hora: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  // Sin `Z`: el constructor interpreta los componentes en la zona del
  // dispositivo, que es justo lo que significa la hora de una franja.
  return new Date(a, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** Día de la semana abreviado ("mié") de una fecha `AAAA-MM-DD`. */
export function diaSemanaCorto(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '');
}


export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fechaSolo(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

export function fechaHora(iso: string): string {
  return `${fechaCorta(iso)} · ${horaCorta(iso)}`;
}

/** "hace 5 minutos", "hace 2 días". */
export function desde(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return fechaCorta(iso);
}

export function diasHasta(fecha: string): number {
  const ms = new Date(`${fecha}T00:00:00`).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

/** Primera letra en mayúscula, sin tocar el resto. */
export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
