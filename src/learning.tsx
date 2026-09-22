/**
 * Experiencia de microlearning y copiloto contextual.
 * LessonPanel acredita una misión a través de la API; el quiz del Assistant es
 * únicamente repaso y no otorga XP ni modifica una calificación institucional.
 * El modo guiado usa el catálogo local. La IA externa solo se invoca en analogy.
 */
import { useEffect, useState } from 'react';
import { courses, type Lesson, type Snapshot } from '../shared/catalog';
import { Icon, Modal, Badge, ProgressBar } from './ui';
import type { Act } from './App';
/** Panel del tema; cancelar la narración al cerrarlo evita audio fuera de contexto. */
export function LessonPanel({
  lesson,
  snapshot,
  act,
  busy,
  onClose,
  openAssistant,
}: {
  lesson: Lesson;
  snapshot: Snapshot;
  act: Act;
  busy: boolean;
  onClose: () => void;
  openAssistant: () => void;
}) {
  const p = snapshot.progress,
    done = p.completed.includes(lesson.id),
    started = p.started.includes(lesson.id);
  const [answer, setAnswer] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [audioError, setAudioError] = useState('');
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  // La voz es sintética y depende del navegador; no representa una grabación docente.
  function listen() {
    if (!('speechSynthesis' in window)) {
      setAudioError('Tu navegador no admite lectura en voz alta. Puedes leer el contexto aquí.');
      return;
    }
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const speech = new SpeechSynthesisUtterance(
      `${lesson.title}. ${lesson.bullets.join(' ')}. Ejemplo práctico: ${lesson.example}. Piensa en una situación similar en tu trabajo. Identifica quién participa, cuál es el resultado esperado y qué podrías mejorar. No necesitas transformar toda la organización. Empieza por un caso sencillo y comprueba tu propuesta con una persona de tu equipo.`,
    );
    speech.lang = 'es-MX';
    speech.rate = 0.88;
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => {
      setSpeaking(false);
      setAudioError('No fue posible reproducir la voz en este navegador.');
    };
    speechSynthesis.speak(speech);
    setSpeaking(true);
  }
  return (
    <Modal title={`Misión ${lesson.id.split('-')[1].padStart(2, '0')}`} onClose={onClose} drawer>
      <div className="lesson-hero">
        <span className="lesson-symbol">
          <Icon name={done ? 'check' : 'book'} size={31} />
        </span>
        <Badge>{done ? 'COMPLETADA' : started ? 'EN PROGRESO' : 'DISPONIBLE'}</Badge>
        <h2>{lesson.title}</h2>
        <div className="lesson-meta">
          <span>
            <Icon name="clock" size={16} />
            {lesson.minutes} min
          </span>
          <span>
            <Icon name="zap" size={16} />
            {lesson.points} XP
          </span>
        </div>
      </div>
      <p className="lesson-intro">Una idea práctica que puedes llevar hoy a tu trabajo.</p>
      {!started && !done ? (
        <>
          <section className="lesson-preview">
            <h3>En esta misión vas a…</h3>
            <ul>
              {lesson.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
          <button
            className="primary w-full"
            disabled={busy}
            onClick={() => act('/lessons/' + lesson.id + '/start', {}, '')}
          >
            Comenzar misión <Icon name="arrow" size={18} />
          </button>
        </>
      ) : (
        <>
          <button className={`audio-card ${speaking ? 'playing' : ''}`} onClick={listen}>
            <span className="audio-play">
              <Icon name={speaking ? 'volume' : 'play'} size={20} />
            </span>
            <span>
              <strong>{speaking ? 'Escuchando contexto…' : 'Escucha el contexto'}</strong>
              <small>Guía de voz sintética · aprox. 60 s</small>
            </span>
            <Icon name="headphones" />
          </button>
          {audioError && (
            <p role="status" className="feedback">
              {audioError}
            </p>
          )}
          <section className="lesson-content">
            <div className="eyebrow">01 · LAS IDEAS CLAVE</div>
            <ul>
              {lesson.bullets.map((b, i) => (
                <li key={b}>
                  <span>{i + 1}</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="example">
              <div className="eyebrow">
                <Icon name="briefcase" size={15} />
                EN TU TRABAJO
              </div>
              <p>{lesson.example}</p>
            </div>
            <button className="secondary w-full" onClick={openAssistant}>
              <Icon name="sparkles" size={18} />
              Explícamelo con una analogía
            </button>
          </section>
          <section className="lesson-check">
            <div className="eyebrow">02 · COMPRUEBA LO APRENDIDO</div>
            <h3>{lesson.question}</h3>
            <div className="answer-options">
              {lesson.options.map((option, i) => (
                <button
                  key={option}
                  className={answer === i ? 'selected' : ''}
                  onClick={() => setAnswer(i)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {option}
                </button>
              ))}
            </div>
            {answer !== null && (
              <p className={`feedback ${answer === lesson.answer ? 'correct' : ''}`}>
                {answer === lesson.answer
                  ? 'Exacto. Un objetivo claro permite aplicar el concepto y evaluar el resultado.'
                  : 'Antes de actuar, aclara qué quieres resolver y con qué información cuentas. Intenta otra opción.'}
              </p>
            )}
          </section>
          <button
            className="primary w-full"
            disabled={busy || done || answer !== lesson.answer}
            onClick={() =>
              act(
                '/lessons/' + lesson.id + '/complete',
                { answer },
                `¡Misión completada! Ganaste ${lesson.points} XP.`,
              )
            }
          >
            {done ? (
              <>
                <Icon name="check" />
                Misión completada
              </>
            ) : (
              <>
                Completar misión · +{lesson.points} XP <Icon name="arrow" size={17} />
              </>
            )}
          </button>
          {done && (
            <button className="text-button lesson-return" onClick={onClose}>
              Volver a mi ruta <Icon name="arrow" size={16} />
            </button>
          )}
        </>
      )}
      <p className="lesson-footnote">
        Contenido de demostración. La versión académica requiere revisión docente y sus recursos
        multimedia.
      </p>
    </Modal>
  );
}
/** Acciones disponibles según exista un tema abierto o se esté en el dashboard. */
export function Assistant({
  snapshot,
  lesson,
  onClose,
  onOpenLesson,
}: {
  snapshot: Snapshot;
  lesson: Lesson | null;
  onClose: () => void;
  onOpenLesson: (l: Lesson) => void;
}) {
  const [mode, setMode] = useState<'home' | 'time' | 'cards' | 'quiz' | 'analogy'>('home');
  const [minutes, setMinutes] = useState(20);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState('');
  const [working, setWorking] = useState(false);
  const p = snapshot.progress;
  const completed = courses.flatMap((c) => c.lessons).filter((l) => p.completed.includes(l.id));
  const candidates = courses
    .map((c) => c.lessons.find((l) => !p.completed.includes(l.id)))
    .filter((l): l is Lesson => !!l);
  const recommend = candidates
    .filter((l) => l.minutes <= minutes)
    .sort((a, b) => b.minutes - a.minutes)[0];
  const quiz = lesson
    ? [
        { question: lesson.question, options: lesson.options, answer: lesson.answer },
        {
          question: `¿Qué idea describe mejor «${lesson.title}»?`,
          options: [
            lesson.bullets[0],
            'La solución es idéntica para todas las organizaciones',
            'No necesitas observar el contexto para aplicarlo',
          ],
          answer: 0,
        },
        {
          question: '¿Cuál es una aplicación práctica de este tema?',
          options: [
            'Cambiar todas las herramientas sin un diagnóstico',
            'Copiar el proceso de otra empresa sin revisarlo',
            lesson.example,
          ],
          answer: 2,
        },
      ]
    : [];
  // El backend elige biblioteca guiada o proveedor configurado; no exponer su clave aquí.
  async function analogy() {
    setMode('analogy');
    setWorking(true);
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': snapshot.csrf },
        body: JSON.stringify({ lessonId: lesson?.id, action: 'analogy' }),
      });
      const data = await r.json();
      setResult(r.ok ? data.text : data.error);
    } catch {
      setResult('No se pudo conectar. Intenta otra vez en un momento.');
    } finally {
      setWorking(false);
    }
  }
  return (
    <Modal title="Tu copiloto de aprendizaje" onClose={onClose} drawer>
      <div className="copilot-heading">
        <span className="copilot-symbol">
          <Icon name="sparkles" size={30} />
        </span>
        <h2>
          Un poco de ayuda.
          <br />
          Un gran siguiente paso.
        </h2>
        <p className="muted">
          {lesson
            ? `Estás explorando: ${lesson.title}`
            : 'Hagamos espacio para aprender, incluso en un día lleno.'}
        </p>
        <Badge>
          {snapshot.aiEnabled ? 'ASISTENCIA CON IA' : 'MODO GUIADO · IA EXTERNA SIN CONECTAR'}
        </Badge>
      </div>
      {mode !== 'home' && (
        <button
          className="text-button back"
          onClick={() => {
            setMode('home');
            setIndex(0);
            setChoice(null);
            setScore(0);
          }}
        >
          <Icon name="back" size={16} />
          Ver acciones
        </button>
      )}
      {mode === 'home' && (
        <div className="assistant-actions">
          {lesson ? (
            <>
              <button onClick={() => setMode('quiz')}>
                <Icon name="checks" size={24} />
                <span>
                  <strong>Quiz rápido</strong>
                  <small>3 preguntas para poner tus ideas a prueba</small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
              <button onClick={analogy}>
                <Icon name="sparkles" size={24} />
                <span>
                  <strong>Explícamelo sencillo</strong>
                  <small>Una analogía para conectar los conceptos</small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMode('time')}>
                <Icon name="clock" size={24} />
                <span>
                  <strong>Organizar mi tiempo</strong>
                  <small>Una misión que se ajuste a tu disponibilidad</small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
              <button onClick={() => setMode('cards')}>
                <Icon name="book" size={24} />
                <span>
                  <strong>Repasar con flashcards</strong>
                  <small>Refuerza lo que ya has aprendido</small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
            </>
          )}
        </div>
      )}
      {mode === 'time' && (
        <section className="assistant-section">
          <h3>¿Cuánto tiempo tienes hoy?</h3>
          <div className="time-options">
            {[10, 15, 20, 30].map((n) => (
              <button
                className={minutes === n ? 'selected' : ''}
                key={n}
                onClick={() => setMinutes(n)}
              >
                {n} min
              </button>
            ))}
          </div>
          {recommend ? (
            <div className="recommendation">
              <Badge>UNA BUENA OPCIÓN PARA TI</Badge>
              <h3>{recommend.title}</h3>
              <p className="muted">
                {recommend.minutes} minutos · {recommend.points} XP
              </p>
              <p>
                Te quedan {minutes - recommend.minutes} minutos para revisar tus notas o tomar una
                pausa.
              </p>
              <button className="primary w-full" onClick={() => onOpenLesson(recommend)}>
                Ir a esta misión <Icon name="arrow" size={17} />
              </button>
            </div>
          ) : (
            <div className="empty">
              {candidates.length
                ? 'Tus siguientes misiones necesitan un poco más de tiempo. Puedes repasar una tarjeta en unos minutos.'
                : '¡Completaste todas las rutas! Repasa tus tarjetas.'}
              <button className="secondary" onClick={() => setMode('cards')}>
                Abrir flashcards
              </button>
            </div>
          )}
        </section>
      )}
      {mode === 'cards' && (
        <section className="assistant-section">
          <h3>Lo aprendido se queda contigo</h3>
          {completed.length ? (
            <>
              <p className="muted">
                Tarjeta {index + 1} de {completed.length} · Temas completados
              </p>
              <button
                className={`flashcard ${flipped ? 'flipped' : ''}`}
                onClick={() => setFlipped(!flipped)}
              >
                <Icon name={flipped ? 'sparkles' : 'book'} size={32} />
                <span className="eyebrow">{flipped ? 'IDEA CLAVE' : '¿QUÉ RECUERDAS SOBRE…?'}</span>
                <strong>{flipped ? completed[index].bullets[0] : completed[index].title}</strong>
                <small>Toca para {flipped ? 'ver el tema' : 'revelar la respuesta'}</small>
              </button>
              <div className="flash-controls">
                <button
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => {
                    setIndex(index - 1);
                    setFlipped(false);
                  }}
                >
                  <Icon name="back" size={16} />
                  Anterior
                </button>
                <button
                  className="secondary"
                  disabled={index === completed.length - 1}
                  onClick={() => {
                    setIndex(index + 1);
                    setFlipped(false);
                  }}
                >
                  Siguiente
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </>
          ) : (
            <p className="empty">
              Completa tu primera misión y encontrarás aquí tus tarjetas de repaso.
            </p>
          )}
        </section>
      )}
      {mode === 'analogy' && (
        <section className="assistant-section analogy">
          <Icon name="sparkles" size={26} />
          <h3>Imagina una situación cotidiana</h3>
          <p>{working ? 'Preparando la explicación…' : result}</p>
          <small className="muted">
            {snapshot.aiEnabled
              ? 'Verifica esta explicación con el material de tu curso.'
              : 'Analogía de la biblioteca de práctica, sin generación por IA.'}
          </small>
        </section>
      )}
      {mode === 'quiz' && (
        <section className="assistant-section">
          {index < quiz.length ? (
            <>
              <div className="section-heading">
                <h3>Quiz de repaso</h3>
                <span>
                  {index + 1} / {quiz.length}
                </span>
              </div>
              <ProgressBar value={(index / quiz.length) * 100} />
              <h3 className="quiz-question">{quiz[index].question}</h3>
              <div className="answer-options">
                {quiz[index].options.map((o, i) => (
                  <button
                    key={o}
                    disabled={choice !== null}
                    className={choice === i ? 'selected' : ''}
                    onClick={() => {
                      setChoice(i);
                      if (i === quiz[index].answer) setScore(score + 1);
                    }}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {o}
                  </button>
                ))}
              </div>
              {choice !== null && (
                <>
                  <p className="feedback">
                    {choice === quiz[index].answer
                      ? '¡Bien! Vas conectando las ideas.'
                      : `Puedes seguir practicando. La respuesta es: ${quiz[index].options[quiz[index].answer]}.`}
                  </p>
                  <button
                    className="primary w-full"
                    onClick={() => {
                      setIndex(index + 1);
                      setChoice(null);
                    }}
                  >
                    {index === quiz.length - 1 ? 'Ver resultado' : 'Siguiente pregunta'}
                    <Icon name="arrow" size={17} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="quiz-complete">
              <Icon name="award" size={48} />
              <h2>
                {score} de {quiz.length}
              </h2>
              <p>
                Repasar también es avanzar. Este quiz de práctica no modifica tu calificación ni
                otorga XP.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setIndex(0);
                  setScore(0);
                  setChoice(null);
                }}
              >
                Volver a practicar
              </button>
            </div>
          )}
        </section>
      )}
    </Modal>
  );
}
