/**
 * Gremio asíncrono y perfil profesional.
 * Los formularios envían datos a la API: no escriben directamente en SQLite.
 * Los perfiles sugeridos son ejemplos; registrar interés no envía invitaciones.
 * La autorización de hilos y la unicidad de votos se validan en el servidor.
 */
import { useState, type FormEvent } from 'react';
import { people, type Snapshot } from '../shared/catalog';
import { Icon, Badge, ProgressBar } from './ui';
import type { Act } from './App';
/** Hilos por área, respuestas y sugerencias locales de perfiles complementarios. */
export function Community({
  snapshot,
  act,
  busy,
}: {
  snapshot: Snapshot;
  act: Act;
  busy: boolean;
}) {
  const [tab, setTab] = useState('Mastermind');
  const [channel, setChannel] = useState('Todos');
  const [newPost, setNewPost] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});
  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (await act('/threads', data, 'Tu reto ya está publicado en el gremio.')) {
      form.reset();
      setNewPost(false);
    }
  }
  const sortedPeople = [...people].sort(
    (a, b) =>
      Number(b.industry !== snapshot.progress.profile.industry) -
      Number(a.industry !== snapshot.progress.profile.industry),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">EL CONOCIMIENTO CRECE CUANDO SE COMPARTE</div>
          <h1>Tu gremio profesional</h1>
          <p>Retos reales. Perspectivas distintas. Aprendizaje en comunidad.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setTab('Mastermind');
            setNewPost(!newPost);
          }}
        >
          <Icon name="plus" size={18} />
          Compartir un reto
        </button>
      </div>
      {snapshot.mode === 'demo' && (
        <div className="notice">
          <Icon name="users" />
          <span>
            Comunidad de demostración. Los perfiles sugeridos son ejemplos; tus publicaciones se
            guardan en este proyecto local.
          </span>
        </div>
      )}
      <div className="tabs">
        <button
          className={tab === 'Mastermind' ? 'selected' : ''}
          onClick={() => setTab('Mastermind')}
        >
          Foros Mastermind
        </button>
        <button
          className={tab === 'Conexiones' ? 'selected' : ''}
          onClick={() => setTab('Conexiones')}
        >
          Conexiones de la semana
        </button>
      </div>
      {tab === 'Mastermind' ? (
        <div className="community-layout">
          <section>
            {newPost && (
              <form className="panel post-form" onSubmit={post}>
                <h2>Un reto, muchas perspectivas</h2>
                <label>
                  Área
                  <select name="channel">
                    <option>Procesos de negocio</option>
                    <option>Datos y decisiones</option>
                    <option>Tecnología</option>
                  </select>
                </label>
                <label>
                  Título
                  <input
                    name="title"
                    required
                    minLength={8}
                    maxLength={150}
                    placeholder="¿Qué te gustaría resolver con tu equipo?"
                  />
                </label>
                <label>
                  Contexto
                  <textarea
                    name="body"
                    required
                    minLength={15}
                    maxLength={2000}
                    rows={4}
                    placeholder="Describe el reto sin incluir información confidencial de tu empresa."
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button type="button" className="secondary" onClick={() => setNewPost(false)}>
                    Cancelar
                  </button>
                  <button className="primary" disabled={busy}>
                    Publicar reto
                  </button>
                </div>
              </form>
            )}
            <div className="channel-filters">
              {['Todos', 'Procesos de negocio', 'Datos y decisiones', 'Tecnología'].map((c) => (
                <button
                  key={c}
                  className={channel === c ? 'selected' : ''}
                  onClick={() => setChannel(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {snapshot.threads
              .filter((t) => channel === 'Todos' || t.channel === channel)
              .map((t) => (
                <article className="thread panel" key={t.id}>
                  <div className="thread-author">
                    <span className="avatar light">
                      {t.authorName
                        ?.split(' ')
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join('')}
                    </span>
                    <div>
                      <strong>{t.authorName}</strong>
                      <span>Conversación asíncrona</span>
                    </div>
                    <Badge>{t.channel}</Badge>
                  </div>
                  <h2>{t.title}</h2>
                  <p>{t.body}</p>
                  <div className="thread-count">
                    <Icon name="message" size={17} />
                    {t.answers.length} aportes
                  </div>
                  <div className="thread-answers">
                    {t.answers.map((a) => (
                      <div className="reply" key={a.id}>
                        <strong>{a.authorName}</strong>
                        <p>{a.body}</p>
                        <button
                          className={`text-button ${a.voted ? 'voted' : ''}`}
                          disabled={busy || a.voted || a.author === snapshot.userId}
                          onClick={() =>
                            act(
                              '/answers/' + a.id + '/helpful',
                              {},
                              'Reconociste un aporte valioso. Su autor recibió 25 XP.',
                            )
                          }
                        >
                          <Icon name="like" size={16} />
                          {a.voted ? 'Marcado como útil' : 'Aporte valioso'} · {a.helpful}
                        </button>
                      </div>
                    ))}
                  </div>
                  <form
                    className="reply-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (
                        await act(
                          '/threads/' + t.id + '/reply',
                          { body: reply[t.id] },
                          'Tu propuesta ya está en la conversación.',
                        )
                      )
                        setReply({ ...reply, [t.id]: '' });
                    }}
                  >
                    <textarea
                      aria-label={'Responder a ' + t.title}
                      placeholder="Comparte una propuesta o experiencia…"
                      minLength={10}
                      maxLength={2000}
                      required
                      value={reply[t.id] || ''}
                      onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })}
                    />
                    <button className="secondary" disabled={busy}>
                      Aportar <Icon name="arrow" size={16} />
                    </button>
                  </form>
                </article>
              ))}
            {!snapshot.threads.some((t) => channel === 'Todos' || t.channel === channel) && (
              <div className="empty">Todavía no hay retos en esta área. Comparte el primero.</div>
            )}
          </section>
          <aside className="right-column">
            <section className="panel guild-rules">
              <span className="soft-icon">
                <Icon name="users" size={25} />
              </span>
              <h3>Tu experiencia vale</h3>
              <p>Comparte lo que te ha funcionado y construye sobre las ideas de tus compañeros.</p>
              <div className="xp-highlight">
                <Icon name="zap" />
                +25 XP<span>cuando alguien marca tu aporte como valioso</span>
              </div>
              <hr />
              <p className="small-text muted">
                No compartas datos confidenciales. Los espacios académicos deben contar con
                supervisión docente; esta demo no incluye moderación activa.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>Perspectivas que complementan la tuya</h2>
              <p className="muted">Sugerencias basadas en tu industria y áreas profesionales.</p>
            </div>
            <Badge>SEMANA DEL {snapshot.week}</Badge>
          </div>
          {snapshot.mode === 'demo' ? (
            <div className="people-grid">
              {sortedPeople.map((person) => (
                <article className="person-card panel" key={person.id}>
                  <span className="avatar large">{person.initials}</span>
                  <Badge>{person.industry}</Badge>
                  <h2>{person.name}</h2>
                  <p className="muted">{person.role}</p>
                  <p className="person-goal">“{person.goal}”</p>
                  <div className="skills">
                    {person.skills.map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                  <div className="contributions">
                    <Icon name="like" size={16} />
                    {person.contributions} aportes valiosos · ejemplo
                  </div>
                  <button
                    className="secondary w-full"
                    disabled={busy || snapshot.progress.connections.includes(person.id)}
                    onClick={() =>
                      act(
                        '/connect/' + person.id,
                        {},
                        'Interés guardado. Es un perfil de demostración; no se envió una invitación.',
                      )
                    }
                  >
                    <Icon
                      name={snapshot.progress.connections.includes(person.id) ? 'check' : 'plus'}
                      size={17}
                    />
                    {snapshot.progress.connections.includes(person.id)
                      ? 'Interés guardado'
                      : 'Me interesa conectar'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              Las conexiones se habilitarán al sincronizar el directorio de estudiantes de Canvas.
            </div>
          )}
        </>
      )}
    </>
  );
}
/** Perfil editable y encuesta NPS; sin emitir credenciales institucionales ficticias. */
export function Profile({ snapshot, act, busy }: { snapshot: Snapshot; act: Act; busy: boolean }) {
  const p = snapshot.progress;
  const [editing, setEditing] = useState(false);
  const [nps, setNps] = useState<number | null>(p.nps);
  const contributions = snapshot.threads
    .flatMap((t) => t.answers)
    .filter((a) => a.author === snapshot.userId)
    .reduce((n, a) => n + a.helpful, 0);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      await act(
        '/profile',
        Object.fromEntries(new FormData(e.currentTarget)),
        'Tu perfil está actualizado.',
      )
    )
      setEditing(false);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">LO QUE APRENDES HABLA DE TI</div>
          <h1>Mi perfil profesional</h1>
          <p>Tu experiencia, tus metas y los logros que vienen.</p>
        </div>
        <button className="secondary" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancelar edición' : 'Editar perfil'}
        </button>
      </div>
      <div className="profile-layout">
        <section className="panel profile-main">
          <div className="profile-cover" />
          <span className="avatar profile-avatar">
            {p.profile.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </span>
          {editing ? (
            <form className="profile-form" onSubmit={save}>
              {[
                ['name', 'Nombre'],
                ['role', 'Rol profesional'],
                ['industry', 'Industria'],
                ['goal', 'Objetivo profesional'],
                ['skills', 'Habilidades (separadas por comas)'],
                ['portfolio', 'Enlace a tu portafolio'],
              ].map(([name, label]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    defaultValue={p.profile[name as keyof typeof p.profile]}
                    required={name === 'name'}
                    type={name === 'portfolio' ? 'url' : 'text'}
                    maxLength={name === 'goal' ? 250 : 200}
                  />
                </label>
              ))}
              <button className="primary" disabled={busy}>
                Guardar perfil
              </button>
            </form>
          ) : (
            <div className="profile-details">
              <Badge>{p.profile.industry || 'Mi industria'}</Badge>
              <h2>{p.profile.name}</h2>
              <p className="muted">{p.profile.role}</p>
              <h3>Mi siguiente paso</h3>
              <p>{p.profile.goal}</p>
              <h3>Lo que puedo aportar</h3>
              <div className="skills">
                {p.profile.skills.split(',').map((s) => (
                  <Badge key={s}>{s.trim()}</Badge>
                ))}
              </div>
              {p.profile.portfolio && (
                <a
                  className="text-button"
                  href={p.profile.portfolio}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visitar mi portafolio <Icon name="external" size={17} />
                </a>
              )}
              <div className="profile-stats">
                <div>
                  <strong>{p.completed.length}</strong>
                  <span>Misiones completadas</span>
                </div>
                <div>
                  <strong>{contributions}</strong>
                  <span>Aportes valiosos</span>
                </div>
                <div>
                  <strong>{p.streak}</strong>
                  <span>Semanas de constancia</span>
                </div>
              </div>
            </div>
          )}
        </section>
        <aside className="right-column">
          <section className="panel">
            <div className="section-heading">
              <h3>Tu siguiente nivel</h3>
              <Icon name="award" />
            </div>
            <h2 className="big-level">Nivel {Math.floor(p.earned / 1000) + 1}</h2>
            <ProgressBar value={(p.earned % 1000) / 10} />
            <p className="muted">{p.earned.toLocaleString('es-MX')} XP acumulados</p>
          </section>
          <section className="panel">
            <h3>Ayúdanos a mejorar</h3>
            <p className="muted">
              ¿Qué tan probable es que recomiendes esta experiencia a un compañero?
            </p>
            <div className="nps-options">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} className={nps === i ? 'selected' : ''} onClick={() => setNps(i)}>
                  {i}
                </button>
              ))}
            </div>
            <div className="nps-labels">
              <span>Nada probable</span>
              <span>Muy probable</span>
            </div>
            <button
              disabled={nps === null || busy}
              className="secondary w-full"
              onClick={() =>
                act(
                  '/nps',
                  { score: nps },
                  'Gracias. Tu opinión nos ayuda a mejorar el aprendizaje.',
                )
              }
            >
              {p.nps === null ? 'Enviar opinión' : 'Actualizar opinión'}
            </button>
          </section>
          <section className="panel">
            <h3>Mis credenciales</h3>
            <p className="muted">
              Las insignias verificables aparecerán aquí cuando la institución valide tus
              habilidades. Todavía no hay credenciales emitidas.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
