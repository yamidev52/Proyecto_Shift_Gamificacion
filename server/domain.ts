/**
 * Reglas de gamificación, separadas de HTTP y de SQLite para poder probarlas.
 * Las operaciones modifican el Progress recibido; el servidor las ejecuta sobre
 * un objeto deserializado y guarda el resultado dentro de una transacción.
 * Las fechas inyectables permiten probar límites semanales sin esperar días.
 */
import { courses, rewards, type Progress } from '../shared/catalog';
/** Fecha civil de Ciudad de México: una conexión nocturna no cambia de día por UTC. */
export function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
/** Devuelve el lunes YYYY-MM-DD que identifica la semana local. */
export function weekKey(now = new Date()) {
  const d = new Date(dayKey(now) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
/** Inicializa ejemplos para la demo y un expediente vacío para usuarios LTI reales. */
export function createProgress(demo = true, name = 'Estudiante MAPS'): Progress {
  const counts = demo ? [9, 13, 5, 6] : [0, 0, 0, 0];
  return {
    completed: courses.flatMap((c, i) => c.lessons.slice(0, counts[i]).map((l) => l.id)),
    started: demo ? ['procesos-7'] : [],
    xp: demo ? 1450 : 0,
    earned: demo ? 3450 : 0,
    freezes: demo ? 1 : 0,
    protectedWeeks: [],
    streak: demo ? 4 : 0,
    creditedWeeks: [],
    lastWeek: weekKey(),
    goal: 'days',
    activity: {},
    profile: {
      name: demo ? 'Sergio Yamil' : name,
      role: 'Estudiante MAPS',
      industry: 'Tecnología',
      goal: 'Quiero mejorar procesos y conectar con profesionales',
      skills: 'Gestión de proyectos, Comunicación',
      portfolio: '',
    },
    redemptions: [],
    connections: [],
    nps: null,
    raffleTickets: demo ? 2 : 0, 
    rescueActive: false,
  };
}
/** Busca un ID estable en todas las materias; undefined significa que no existe. */
export function lessonById(id: string) {
  return courses.flatMap((c) => c.lessons).find((l) => l.id === id);
}
/** Una misión es accesible si es la primera o su antecesora está completada. */
export function canAccess(p: Progress, id: string) {
  const c = courses.find((c) => c.lessons.some((l) => l.id === id));
  if (!c) return false;
  const i = c.lessons.findIndex((l) => l.id === id);
  return i === 0 || p.completed.includes(c.lessons[i - 1].id);
}
/**
 * Valida inicio, prerrequisito y respuesta; después acredita XP y actividad.
 * Es idempotente: repetir una finalización no vuelve a premiar al estudiante.
 * creditedWeeks impide ganar dos rachas al cambiar la modalidad de la meta.
 * Los minutos son la duración estimada del catálogo, no tiempo cronometrado.
 */
export function complete(p: Progress, id: string, answer: number, now = new Date()) {
  const l = lessonById(id);
  if (!l || !canAccess(p, id)) throw Error('Completa la misión anterior primero.');
  if (answer !== l.answer) throw Error('Revisa la respuesta antes de completar.');
  if (!p.started.includes(id) && !p.completed.includes(id))
    throw Error('Inicia la misión antes de completarla.');
  if (p.completed.includes(id)) return p;
  p.completed.push(id);
  p.xp += l.points;
  p.earned += l.points;
  const week = weekKey(now);
  const a = p.activity[week] ?? { days: [], minutes: 0 };
  const before = p.goal === 'days' ? a.days.length >= 3 : a.minutes >= 60;
  const day = dayKey(now);
  if (!a.days.includes(day)) a.days.push(day);
  a.minutes += l.minutes;
  p.activity[week] = a;
  const after = p.goal === 'days' ? a.days.length >= 3 : a.minutes >= 60;
  if (!before && after && !(p.creditedWeeks || []).includes(week)) {
    p.streak += 1;
    p.creditedWeeks = [...(p.creditedWeeks || []), week];
  }
  return p;
}
/**
 * Descuenta XP disponible y registra el canje. El nivel depende de earned
 * (experiencia histórica), de modo que gastar XP no reduzca el nivel alcanzado.
 * Solo los congeladores se aplican aquí; los demás beneficios quedan pendientes.
 */
export function redeem(p: Progress, id: string) {
  const r = rewards.find((x) => x.id === id);
  if (!r) throw Error('Recompensa no encontrada.');
  if (p.xp < r.cost) throw Error('Todavía no tienes suficientes XP.');
  if (Math.floor(p.earned / 1000) + 1 < r.level)
    throw Error('Esta recompensa se desbloquea en un nivel superior.');
  p.xp -= r.cost;
  if (id === 'freeze') p.freezes += 1;
  if (id === 'ticket') p.raffleTickets += 1;
  p.redemptions.unshift({
    id: crypto.randomUUID(),
    rewardId: id,
    date: new Date().toISOString(),
    status: id === 'freeze' ? 'Disponible' : 'Pendiente de validación académica',
  });
  return p;
}
/** Consume un congelador una sola vez para proteger exclusivamente la semana actual. */
export function freeze(p: Progress, now = new Date()) {
  const week = weekKey(now);
  if (p.protectedWeeks.includes(week)) throw Error('Esta semana ya está protegida.');
  if (p.freezes < 1) throw Error('Necesitas un congelador disponible.');
  p.freezes--;
  p.protectedWeeks.push(week);
  return p;
}

/**
 * Revisa semanas transcurridas al recuperar el perfil, sin trabajos programados.
 * Una semana sin crédito ni protección rompe la racha; una protegida la conserva.
 * lastWeek evita reevaluar todo el historial en cada lectura.
 */
export function settleWeeks(p: Progress, now = new Date()) {
  const week = weekKey(now);
  let cursor = p.lastWeek || week;
  let checked = 0;
  while (cursor < week && checked++ < 520) {
    if (!(p.creditedWeeks || []).includes(cursor) && !p.protectedWeeks.includes(cursor))
      if (p.streak > 0) p.rescueActive = true;
      p.streak = 0;
    const d = new Date(cursor + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    cursor = d.toISOString().slice(0, 10);
  }
  p.lastWeek = week;
  return p;
}

export function claimRescue(p: Progress) {
  if (!p.rescueActive) throw Error('No tienes rescates pendientes.');
  p.rescueActive = false;
  p.freezes += 1;
  return p;
}