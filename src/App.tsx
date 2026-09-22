/**
 * Composición de la aplicación: navegación, dashboard, ruta y recompensas.
 * El servidor es la fuente de verdad del saldo y del progreso. Las vistas solo
 * mantienen estado de presentación (página, búsqueda, paneles y formularios).
 * Para agregar una pantalla, actualiza Page/nav y conserva el flujo act → load.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  courses,
  rewards,
  people,
  type Course,
  type Lesson,
  type Snapshot,
} from '../shared/catalog';
import { Icon, ProgressBar, Modal, Badge } from './ui';
import { LessonPanel, Assistant } from './learning';
import { Community, Profile } from './community';
type Page = 'dashboard' | 'roadmap' | 'rewards' | 'community' | 'profile';
const nav: [Page, string, string][] = [
  ['dashboard', 'dashboard', 'Mi aprendizaje'],
  ['roadmap', 'route', 'Mi ruta'],
  ['rewards', 'gift', 'Recompensas'],
  ['community', 'users', 'Mi gremio'],
];
/** Contenedor de pantallas; los cambios persistentes se delegan a la API. */
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [page, setPage] = useState<Page>('dashboard');
  const [courseId, setCourseId] = useState('procesos');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [assistant, setAssistant] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [grades, setGrades] = useState<{ course: Course; view: 'grades' | 'missions' } | null>(
    null,
  );
  const [goalOpen, setGoalOpen] = useState(false);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [rewardFilter, setRewardFilter] = useState('Todas');
  // Recuperar sesión existente; una demo nueva se crea únicamente cuando falta sesión.
  const load = useCallback(async () => {
    let r = await fetch('/api/state');
    if (r.status === 401) {
      const d = await fetch('/api/demo', { method: 'POST' });
      if (!d.ok) throw Error((await d.json()).error);
      r = await fetch('/api/state');
    }
    if (!r.ok) throw Error('No pudimos cargar tu espacio. Intenta otra vez.');
    setSnapshot(await r.json());
  }, []);
  useEffect(() => {
    load()
      .catch((e) => setFatal(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  /** Escribe con CSRF y recarga el snapshot para no calcular saldos optimistas en el cliente. */
  async function act(path: string, body: unknown = {}, message = 'Cambios guardados') {
    if (busy) return false;
    setBusy(true);
    try {
      const r = await fetch('/api' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': snapshot?.csrf || '' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
      if (message) setToast(message);
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'No pudimos guardar el cambio.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  /** Cambia la vista sin recargar y devuelve el scroll al inicio en móvil y escritorio. */
  function navigate(next: Page) {
    setPage(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const closeLesson = useCallback(() => setLesson(null), []);
  const closeAssistant = useCallback(() => setAssistant(false), []);
  const closeGrades = useCallback(() => setGrades(null), []);
  const closeGoal = useCallback(() => setGoalOpen(false), []);
  const closeReward = useCallback(() => setRewardId(null), []);
  if (loading)
    return (
      <div className="loading">
        <div className="brand-mark">s</div>
        <h2>Preparando tu siguiente paso…</h2>
      </div>
    );
  if (!snapshot)
    return (
      <div className="loading">
        <h1>Tu espacio Shift</h1>
        <p>{fatal}</p>
        <button className="primary" onClick={() => location.reload()}>
          Volver a intentar
        </button>
      </div>
    );
  const p = snapshot.progress;
  const course = courses.find((c) => c.id === courseId)!;
  const activity = p.activity[snapshot.week] || { days: [], minutes: 0 };
  const target = p.goal === 'days' ? 3 : 60;
  const current = p.goal === 'days' ? activity.days.length : activity.minutes;
  const goalPct = Math.min(100, Math.round((current / target) * 100));
  const isProtected = p.protectedWeeks.includes(snapshot.week);
  const level = Math.floor(p.earned / 1000) + 1;
  const courseProgress = (c: Course) =>
    Math.round(
      (c.lessons.filter((l) => p.completed.includes(l.id)).length / c.lessons.length) * 100,
    );
  const nextLesson = course.lessons.find((l) => !p.completed.includes(l.id));
  const navigateCourse = (c: Course) => {
    setCourseId(c.id);
    navigate('roadmap');
  };
  const selectedReward = rewards.find((r) => r.id === rewardId);
  const weekly = (
    <section className="panel weekly">
      <div className="section-heading">
        <h3>Tu ritmo, tus reglas</h3>
        <span className="soft-icon orange">
          <Icon name="flame" />
        </span>
      </div>
      <p className="muted">Cada pequeño paso cuenta.</p>
      <div className="weekly-number">
        <strong>
          {current}
          <span> / {target}</span>
        </strong>
        <span>{p.goal === 'days' ? 'días esta semana' : 'minutos esta semana'}</span>
      </div>
      <ProgressBar value={goalPct} label="Meta semanal" />
      <div className="week-days">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
          const date = new Date(snapshot.week + 'T12:00:00Z');
          date.setUTCDate(date.getUTCDate() + i);
          const done = activity.days.includes(date.toISOString().slice(0, 10));
          return (
            <span key={i} className={done ? 'done' : ''} title={date.toISOString().slice(0, 10)}>
              {done ? <Icon name="check" size={13} /> : d}
            </span>
          );
        })}
      </div>
      <button className="text-button" onClick={() => setGoalOpen(true)}>
        Ajustar mi meta <Icon name="arrow" size={15} />
      </button>
      <div className="freeze-row">
        <Icon name="snow" />
        <div>
          <strong>
            {isProtected
              ? 'Semana protegida'
              : `${p.freezes} congelador${p.freezes !== 1 ? 'es' : ''} disponible${p.freezes !== 1 ? 's' : ''}`}
          </strong>
          <span>Un respiro cuando lo necesitas.</span>
        </div>
        <button
          disabled={busy || isProtected || p.freezes === 0}
          className="text-button"
          onClick={() => act('/freeze', {}, 'Tu semana está protegida. Sigue a tu ritmo.')}
        >
          {isProtected ? 'Activo' : 'Usar'}
        </button>
      </div>
    </section>
  );
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a
          aria-label="Shift, inicio"
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('dashboard');
          }}
        >
          <span className="brand-mark">
            s<span>↗</span>
          </span>
          <span>
            shift<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">TU ESPACIO DE APRENDIZAJE</div>
        <nav>
          {nav.map(([id, icon, title]) => (
            <button
              key={id}
              aria-label={title}
              aria-current={page === id ? 'page' : undefined}
              title={title}
              className={page === id ? 'active' : ''}
              onClick={() => navigate(id)}
            >
              <Icon name={icon} />
              <span>{title}</span>
              {id === 'rewards' && <small>6</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="program">
            <Icon name="graduation" size={26} />
            <div>
              <strong>Asíncrono MAPS</strong>
              <span>Tecmilenio · Semestre 3</span>
            </div>
          </div>
          <button
            aria-label="Mi perfil profesional"
            className={`profile-button ${page === 'profile' ? 'active' : ''}`}
            onClick={() => navigate('profile')}
          >
            <span className="avatar">
              {p.profile.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </span>
            <span>
              <strong>{p.profile.name}</strong>
              <small>Nivel {level} · Explorador</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir navegación"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb">
              Mi espacio <span>/</span>{' '}
              <strong>
                {page === 'profile' ? 'Mi perfil' : nav.find((n) => n[0] === page)?.[2]}
              </strong>
            </span>
          </div>
          <div className="top-stats">
            <span className="demo-label">
              {snapshot.mode === 'demo' ? 'Vista de demostración' : 'Conectado a Canvas'}
            </span>
            <span className="streak-pill">
              <Icon name="flame" size={17} />
              <strong>{p.streak}</strong>
              <span>semanas</span>
            </span>
            <button onClick={() => navigate('rewards')} className="xp-pill">
              <Icon name="zap" size={17} />
              <strong>{p.xp.toLocaleString('es-MX')}</strong> XP
            </button>
            <button
              className="avatar small"
              aria-label="Mi perfil"
              onClick={() => navigate('profile')}
            >
              {p.profile.name[0]}
            </button>
          </div>
        </header>
        <main id="main">
          {page === 'dashboard' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">UN PASO MÁS CERCA DE TU META</div>
                  <h1>
                    Hola, {p.profile.name.split(' ')[0]} <span className="wave">✦</span>
                  </h1>
                  <p>Tu futuro se construye a tu ritmo. ¿Qué vas a aprender hoy?</p>
                </div>
                <span className="semester">
                  <Icon name="calendar" size={17} /> Semestre 3
                </span>
              </div>
              {p.rescueActive && (
                <section className="continue-banner" style={{ background: '#fdf6e3', borderColor: '#f7e4b5', marginBottom: '25px', minHeight: 'auto', padding: '20px' }}>
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <span className="badge" style={{ background: '#f4d173', color: '#5c4a16', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Icon name="sparkles" size={14} /> ASISTENTE IA: PROTOCOLO DE RESCATE
                    </span>
                    <h2 style={{ color: '#5c4a16', marginTop: '10px' }}>Notamos que tuviste una semana pesada.</h2>
                    <p style={{ color: '#826f34', fontSize: '13px', maxWidth: '600px' }}>
                      Perder una racha es normal cuando se estudia y trabaja. No te desmotives. Te hemos regalado <strong>1 Congelador de Racha</strong> como cortesía para que vuelvas al curso sin estrés.
                    </p>
                    <div className="banner-bottom" style={{ marginTop: '15px' }}>
                      <button className="primary" style={{ background: '#a88422', borderColor: '#a88422' }} 
                        onClick={() => act('/rescue', {}, '¡Recuperaste el ritmo! Congelador de cortesía añadido a tu inventario.')}>
                        Aceptar cortesía y continuar <Icon name="arrow" size={17} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              <div className="dashboard-layout">
                <div className="main-column">
                  <section className="continue-banner">
                    <div>
                      <Badge>
                        <span className="live-dot" /> RETOMA DONDE TE QUEDASTE
                      </Badge>
                      <h2>{nextLesson ? nextLesson.title : '¡Una ruta completada!'}</h2>
                      <p>{course.short}</p>
                      <div className="banner-bottom">
                        <button
                          className="primary"
                          onClick={() => {
                            navigate('roadmap');
                            if (nextLesson) setLesson(nextLesson);
                          }}
                        >
                          Continuar aprendiendo <Icon name="arrow" size={17} />
                        </button>
                        <span>
                          <Icon name="clock" size={15} />
                          {nextLesson?.minutes || 10} min <i /> +{nextLesson?.points || 80} XP
                        </span>
                      </div>
                    </div>
                    <div className="banner-progress">
                      <div
                        className="progress-ring"
                        style={
                          {
                            '--progress': `${courseProgress(course) * 3.6}deg`,
                          } as React.CSSProperties
                        }
                      >
                        <div>
                          <Icon name="route" size={28} />
                          <strong>
                            {courseProgress(course)}
                            <small>%</small>
                          </strong>
                        </div>
                      </div>
                      <span>Tu camino avanza</span>
                    </div>
                  </section>
                  <div className="section-heading courses-heading">
                    <div>
                      <h2>
                        Mis materias <span className="count">04</span>
                      </h2>
                      <p className="muted">Pequeñas misiones. Grandes avances.</p>
                    </div>
                    <label className="search">
                      <Icon name="search" size={17} />
                      <input
                        aria-label="Buscar materia"
                        placeholder="Buscar materia"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="course-grid">
                    {courses
                      .filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
                      .map((c) => (
                        <article className={`subject-card ${c.color}`} key={c.id}>
                          <div className="subject-top">
                            <span className={`course-icon ${c.color}`}>
                              <Icon name={c.icon} size={22} />
                            </span>
                            <Badge>SEMESTRE 3</Badge>
                          </div>
                          <h3>{c.title}</h3>
                          <div className="course-progress-label">
                            <span>Progreso del curso</span>
                            <strong>
                              {courseProgress(c)}
                              <small>%</small>
                            </strong>
                          </div>
                          <ProgressBar
                            value={courseProgress(c)}
                            segmented
                            label={`Progreso de ${c.title}`}
                          />
                          <div className="course-actions">
                            <button onClick={() => navigateCourse(c)}>
                              <Icon name="route" size={16} />
                              RoadMap
                            </button>
                            <button onClick={() => setGrades({ course: c, view: 'grades' })}>
                              <Icon name="percent" size={16} />
                              Calificaciones
                            </button>
                            <button onClick={() => setGrades({ course: c, view: 'missions' })}>
                              <Icon name="table" size={16} />
                              Misiones
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!courses.some((c) => c.title.toLowerCase().includes(query.toLowerCase())) && (
                    <div className="empty">No encontramos esa materia. Prueba con otro nombre.</div>
                  )}
                  <section className="bottom-note">
                    <span className="soft-icon">
                      <Icon name="headphones" />
                    </span>
                    <div>
                      <strong>¿Solo tienes unos minutos?</strong>
                      <p>Encuentra una misión que se adapte a tu día.</p>
                    </div>
                    <button className="text-button" onClick={() => setAssistant(true)}>
                      Organizar mi tiempo <Icon name="arrow" size={16} />
                    </button>
                  </section>
                </div>
                <aside className="right-column">
                  {weekly}
                  <section className="panel level-card">
                    <div className="section-heading">
                      <h3>Tu esfuerzo abre puertas</h3>
                      <Icon name="award" />
                    </div>
                    <div className="level-summary">
                      <span className="level-medal">
                        <Icon name="award" size={32} />
                      </span>
                      <div>
                        <span>NIVEL {level}</span>
                        <h3>Explorador</h3>
                        <p>{p.earned.toLocaleString('es-MX')} XP acumulados</p>
                      </div>
                    </div>
                    <ProgressBar value={(p.earned % 1000) / 10} />
                    <p className="muted small-text">
                      {1000 - (p.earned % 1000)} XP para tu siguiente nivel
                    </p>
                    <button className="secondary w-full" onClick={() => navigate('rewards')}>
                      Descubrir recompensas <Icon name="arrow" size={16} />
                    </button>
                  </section>
                  <section className="community-teaser">
                    <div className="eyebrow">APRENDEMOS MEJOR JUNTOS</div>
                    <div className="avatar-stack">
                      {people.map((x) => (
                        <span className="avatar" key={x.id}>
                          {x.initials}
                        </span>
                      ))}
                      <span className="avatar">+</span>
                    </div>
                    <h3>
                      Tu siguiente conexión
                      <br />
                      puede cambiar tu camino.
                    </h3>
                    <p>Comparte un reto real con tu gremio.</p>
                    <button className="text-button" onClick={() => navigate('community')}>
                      Explorar mi gremio <Icon name="arrow" size={16} />
                    </button>
                  </section>
                </aside>
              </div>
            </>
          )}
          {page === 'roadmap' && (
            <>
              <div className="page-title">
                <div>
                  <button className="text-button back" onClick={() => navigate('dashboard')}>
                    <Icon name="back" size={16} />
                    Mis materias
                  </button>
                  <h1>Tu ruta de aprendizaje</h1>
                  <p>Una misión a la vez. Cada paso tiene un propósito.</p>
                </div>
                <label className="course-select">
                  <span>Materia</span>
                  <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.short}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="roadmap-layout">
                <section className="roadmap-panel">
                  <div className={`route-header ${course.color}`}>
                    <span className={`course-icon ${course.color}`}>
                      <Icon name={course.icon} size={26} />
                    </span>
                    <div>
                      <Badge>SEMESTRE 3 · 15 MISIONES</Badge>
                      <h2>{course.title}</h2>
                    </div>
                    <div className="route-percent">
                      <strong>{courseProgress(course)}%</strong>
                      <span>completado</span>
                    </div>
                  </div>
                  <div className="route-summary">
                    <span>
                      <Icon name="check" size={16} />
                      {course.lessons.filter((l) => p.completed.includes(l.id)).length} de 15
                      misiones
                    </span>
                    <span>
                      <Icon name="clock" size={16} />
                      10–15 min por misión
                    </span>
                  </div>
                  <div className="roadmap">
                    {course.lessons.map((l, i) => {
                      const done = p.completed.includes(l.id),
                        available = i === 0 || p.completed.includes(course.lessons[i - 1].id),
                        started = p.started.includes(l.id) && !done;
                      const status = done ? 'done' : available ? 'current' : 'locked';
                      return (
                        <div className={`roadmap-stop ${status} stop-${i % 4}`} key={l.id}>
                          {i % 5 === 0 && (
                            <div className="chapter-label">
                              {
                                [
                                  'EXPLORA LOS FUNDAMENTOS',
                                  'LLEVA LA TEORÍA A LA PRÁCTICA',
                                  'CONSTRUYE TU SIGUIENTE LOGRO',
                                ][Math.floor(i / 5)]
                              }
                            </div>
                          )}
                          <div className="stop-row">
                            <button
                              className="mission-node"
                              disabled={!available}
                              onClick={() => setLesson(l)}
                              aria-label={`Misión ${i + 1}: ${l.title}. ${done ? 'Completada' : available ? 'Disponible' : 'Bloqueada'}`}
                            >
                              <span>
                                {done ? (
                                  <Icon name="check" size={27} />
                                ) : available ? (
                                  <Icon name={started ? 'play' : 'book'} size={25} />
                                ) : (
                                  <Icon name="lock" size={22} />
                                )}
                              </span>
                            </button>
                            <div className="stop-content">
                              <span className="eyebrow">
                                MISIÓN {String(i + 1).padStart(2, '0')}
                                {available && !done && (
                                  <Badge>{started ? 'EN PROGRESO' : 'TU SIGUIENTE PASO'}</Badge>
                                )}
                              </span>
                              <h3>{l.title}</h3>
                              <span className="muted">
                                {l.minutes} min · {l.points} XP {done ? '· Completada' : ''}
                              </span>
                              {available && !done && (
                                <button className="text-button" onClick={() => setLesson(l)}>
                                  {started ? 'Continuar misión' : 'Explorar misión'}{' '}
                                  <Icon name="arrow" size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="finish">
                      <Icon name="award" size={32} />
                      <h3>El siguiente nivel de tu carrera</h3>
                      <p>Aplica lo aprendido en tu proyecto final.</p>
                    </div>
                  </div>
                </section>
                <aside className="right-column sticky-column">
                  {weekly}
                  <section className="panel">
                    <h3>Así funciona tu camino</h3>
                    <ul className="legend">
                      <li>
                        <span className="legend-dot done" />
                        Misión completada
                      </li>
                      <li>
                        <span className="legend-dot current" />
                        Disponible o en progreso
                      </li>
                      <li>
                        <span className="legend-dot locked" />
                        Completa el paso anterior
                      </li>
                    </ul>
                    <p className="muted small-text">
                      Puedes volver a cualquier misión completada para repasar, sin perder tu
                      avance.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
          {page === 'rewards' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">TU CONSTANCIA TIENE VALOR</div>
                  <h1>Recompensas para tu vida real</h1>
                  <p>Más flexibilidad, nuevas habilidades y mejores conexiones.</p>
                </div>
                <div className="balance">
                  <Icon name="zap" size={26} />
                  <div>
                    <strong>{p.xp.toLocaleString('es-MX')} XP</strong>
                    <span>Disponibles para canjear</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderLeft: '1px solid #dbe7c9', paddingLeft: '20px' }}>
                  <span style={{ color: '#dcca6e', display: 'inline-flex' }}>
                    <Icon name="award" size={26} />
                  </span>
                  <div>
                    <strong>{p.raffleTickets} Boletos</strong>
                    <span>Sorteo de Becas</span>
                  </div>
                </div>
              </div>
              <div className="notice">
                <Icon name="shield" />
                <span>
                  {snapshot.mode === 'demo'
                    ? 'Estás en una demostración. Los canjes académicos son solicitudes de prueba; no modifican Canvas ni emiten certificaciones.'
                    : 'Los beneficios académicos requieren validación de tu institución antes de aplicarse.'}
                </span>
              </div>
              <div className="tabs">
                {['Todas', 'Tu ritmo', 'Flexibilidad', 'Tu carrera', 'Networking'].map((f) => (
                  <button
                    key={f}
                    className={rewardFilter === f ? 'selected' : ''}
                    onClick={() => setRewardFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="rewards-grid">
                {rewards
                  .filter((r) => rewardFilter === 'Todas' || r.category === rewardFilter)
                  .map((r, i) => (
                    <article className="reward-card" key={r.id}>
                      <div className={`reward-art art-${i % 4}`}>
                        <Icon name={r.icon} size={52} />
                        <Badge>{r.category}</Badge>
                      </div>
                      <div className="reward-body">
                        <h3>{r.title}</h3>
                        <p>{r.description}</p>
                        <div className="reward-footer">
                          <strong>
                            <Icon name="zap" size={17} />
                            {r.cost} XP
                          </strong>
                          <button
                            className="secondary"
                            disabled={p.xp < r.cost || level < r.level}
                            onClick={() => setRewardId(r.id)}
                          >
                            {level < r.level
                              ? `Nivel ${r.level}`
                              : p.xp < r.cost
                                ? 'Faltan XP'
                                : 'Canjear'}
                            <Icon name={level < r.level ? 'lock' : 'arrow'} size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              <section className="panel redemption-history">
                <h2>Mis canjes</h2>
                {p.redemptions.length === 0 ? (
                  <p className="muted">
                    Aquí aparecerán tus recompensas. Elige la que mejor se adapte a tu momento.
                  </p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Recompensa</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.redemptions.map((r) => (
                          <tr key={r.id}>
                            <td>{rewards.find((x) => x.id === r.rewardId)?.title}</td>
                            <td>{new Date(r.date).toLocaleDateString('es-MX')}</td>
                            <td>
                              <Badge>{r.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
          {page === 'community' && <Community snapshot={snapshot} act={act} busy={busy} />}
          {page === 'profile' && <Profile snapshot={snapshot} act={act} busy={busy} />}
          <footer>
            <span>
              <strong>shift.</strong> Aprender también es avanzar a tu manera.
            </span>
            <span>Asíncrono MAPS · Tecmilenio</span>
          </footer>
        </main>
      </div>
      <button
        className="assistant-fab"
        onClick={() => setAssistant(true)}
        aria-label="Abrir asistente de aprendizaje"
      >
        <Icon name="sparkles" size={21} />
        <span>Tu copiloto</span>
        <span className="fab-dot" />
      </button>
      {toast && (
        <div className="toast" role="status">
          <Icon name="message" size={19} />
          <span>{toast}</span>
          <button className="icon-button" aria-label="Cerrar aviso" onClick={() => setToast('')}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {lesson && (
        <LessonPanel
          lesson={lesson}
          snapshot={snapshot}
          act={act}
          busy={busy}
          onClose={closeLesson}
          openAssistant={() => setAssistant(true)}
        />
      )}
      {assistant && (
        <Assistant
          snapshot={snapshot}
          lesson={lesson}
          onClose={closeAssistant}
          onOpenLesson={(l) => {
            setLesson(l);
            setAssistant(false);
          }}
        />
      )}
      {grades && (
        <Modal
          title={grades.view === 'grades' ? 'Calificaciones' : 'Progreso de misiones'}
          onClose={closeGrades}
        >
          <h2>{grades.course.title}</h2>
          <p className="muted">
            {grades.view === 'grades'
              ? 'El avance en las misiones es independiente de tu calificación oficial. Canvas aún no está sincronizado.'
              : 'Tus misiones completadas y experiencia obtenida.'}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Misión</th>
                  <th>{grades.view === 'grades' ? 'Evaluación' : 'Estado'}</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {grades.course.lessons.map((l) => (
                  <tr key={l.id}>
                    <td>{l.title}</td>
                    <td>
                      {grades.view === 'grades'
                        ? 'Sin sincronizar'
                        : p.completed.includes(l.id)
                          ? 'Completada'
                          : p.started.includes(l.id)
                            ? 'En progreso'
                            : 'Pendiente'}
                    </td>
                    <td>{p.completed.includes(l.id) ? l.points : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {goalOpen && (
        <Modal title="Aprende a tu ritmo" onClose={closeGoal}>
          <h2>Una meta que cabe en tu semana</h2>
          <p className="muted">
            No necesitas conectarte todos los días. Elige cómo quieres avanzar.
          </p>
          <div className="goal-options">
            {[
              ['days', '3 días por semana', 'Una misión en tres días distintos.', 'calendar'],
              [
                'minutes',
                '60 minutos por semana',
                'Completa misiones que sumen una hora estimada.',
                'clock',
              ],
            ].map(([id, title, desc, icon]) => (
              <button
                key={id}
                className={p.goal === id ? 'selected' : ''}
                disabled={busy}
                onClick={async () => {
                  if (await act('/goal', { goal: id }, 'Tu meta semanal está actualizada.'))
                    setGoalOpen(false);
                }}
              >
                <Icon name={icon} size={28} />
                <strong>{title}</strong>
                <span>{desc}</span>
                {p.goal === id && <Icon name="check" />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {selectedReward && (
        <Modal title="Canjear recompensa" onClose={closeReward}>
          <span className="reward-confirm-icon">
            <Icon name={selectedReward.icon} size={38} />
          </span>
          <h2>{selectedReward.title}</h2>
          <p>{selectedReward.description}</p>
          <div className="confirm-cost">
            <span>
              Saldo actual <strong>{p.xp} XP</strong>
            </span>
            <span>
              Costo <strong>−{selectedReward.cost} XP</strong>
            </span>
            <span>
              Tu saldo después <strong>{p.xp - selectedReward.cost} XP</strong>
            </span>
          </div>
          {selectedReward.id !== 'freeze' && (
            <p className="notice">
              La solicitud quedará pendiente de validación académica; este canje no cambia fechas ni
              genera una credencial oficial.
            </p>
          )}
          <button
            className="primary w-full"
            disabled={busy}
            onClick={async () => {
              if (
                await act(
                  '/rewards/' + selectedReward.id,
                  {},
                  selectedReward.id === 'freeze'
                    ? 'Congelador agregado a tu inventario.'
                    : 'Solicitud de recompensa guardada.',
                )
              )
                setRewardId(null);
            }}
          >
            {busy ? 'Guardando…' : `Confirmar canje · ${selectedReward.cost} XP`}
          </button>
        </Modal>
      )}
    </div>
  );
}
export type Act = (path: string, body?: unknown, message?: string) => Promise<boolean>;
