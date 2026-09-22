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
  const [chatCourse, setChatCourse] = useState('procesos');
  const [chatMsg, setChatMsg] = useState('');
  const [showChatNote, setShowChatNote] = useState(true);
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
        className={tab === 'Chat' ? 'selected' : ''} 
        onClick={() => setTab('Chat')}
        >Chat en vivo
        </button>
        <button
          className={tab === 'Conexiones' ? 'selected' : ''}
          onClick={() => setTab('Conexiones')}
        >
          Conexiones de la semana
        </button>
      </div>
      {tab === 'Mastermind' && (
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
      )}

      {/* 2. CHAT EN VIVO */}
      {tab === 'Chat' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfdfa', borderRadius: '13px 13px 0 0' }}>
            <label className="course-select" style={{ minWidth: '200px' }}>
              <span>Sala de Materia</span>
              <select value={chatCourse} onChange={(e) => setChatCourse(e.target.value)} style={{ padding: '8px' }}>
                <option value="procesos">Modelación de procesos</option>
                <option value="estadistica">Estadística y pronósticos</option>
                <option value="sistemas">Sistemas operativos</option>
                <option value="proyectos">Proyectos de tecnología</option>
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#688c57', fontWeight: 600 }}>
              <span className="live-dot" style={{ background: '#7bb941', width: '8px', height: '8px' }}/> 3 en línea
            </div>
          </div>

          {showChatNote && (
            <div className="notice" style={{ margin: '15px 20px 0', background: '#eef4e7', border: '1px solid #d4e2c9', color: '#637a50', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <Icon name="clock" size={16} /> Chat informal. Para proteger tu privacidad, los mensajes se limpian automáticamente cada semana.
              </span>
              <button className="icon-button" onClick={() => setShowChatNote(false)}><Icon name="close" size={16}/></button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {snapshot.chatMessages.filter(m => m.courseId === chatCourse).length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', margin: 'auto' }}>No hay mensajes recientes en esta sala. ¡Sé el primero en saludar!</p>
            ) : (
              snapshot.chatMessages.filter(m => m.courseId === chatCourse).map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span className="avatar small" style={{ flexShrink: 0 }}>{msg.authorName.charAt(0)}</span>
                  <div style={{ background: msg.author === snapshot.userId ? '#eef5e6' : '#f4f6f3', padding: '10px 14px', borderRadius: '0 12px 12px 12px', border: '1px solid #e7ebe5', maxWidth: '85%' }}>
                    <div style={{ fontSize: '10px', color: '#88987b', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{msg.author === snapshot.userId ? 'Tú' : msg.authorName}</strong>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{new Date(msg.created).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {msg.author === snapshot.userId && (
                          <button 
                            type="button"
                            title="Eliminar mensaje"
                            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: '#a1ada2' }}
                            onClick={() => act('/chat/' + msg.id + '/delete', {}, 'Mensaje eliminado')}
                          >
                            <Icon name="close" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4a5c43', lineHeight: 1.5 }}>{msg.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form style={{ padding: '15px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }} onSubmit={async (e) => {
            e.preventDefault();
            if (await act('/chat', { courseId: chatCourse, body: chatMsg }, '')) setChatMsg('');
          }}>
            <input placeholder="Escribe un mensaje al grupo..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} required maxLength={500} style={{ flex: 1, background: '#f7f9f7' }}/>
            <button className="primary" disabled={busy || !chatMsg.trim()}><Icon name="arrow" size={16}/></button>
          </form>
        </div>
      )}

      {/* 3. CONEXIONES */}
      {tab === 'Conexiones' && (
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
                  {snapshot.progress.connections.includes(person.id) ? (
                    <a href={person.linkedin} target="_blank" rel="noreferrer" className="secondary w-full" style={{ color: '#0a66c2', borderColor: '#cfe0f0', background: '#f3f8fd', justifyContent: 'center', marginBottom: '10px' }}>
                      <Icon name="linkedin" size={17} /> Ver LinkedIn
                    </a>
                  ) : (
                    <button className="secondary w-full" disabled style={{ justifyContent: 'center', marginBottom: '10px', opacity: 0.6 }}>
                      <Icon name="lock" size={15} /> LinkedIn oculto
                    </button>
                  )}
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
                ['linkedin', 'Enlace a tu LinkedIn'],
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
              {p.profile.linkedin && (
                <a className="text-button" href={p.profile.linkedin} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', marginTop: '10px' }}>
                  Conectar en LinkedIn <Icon name="external" size={17} />
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
