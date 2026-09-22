# API del MVP

En desarrollo, usa el mismo origen que React (`http://127.0.0.1:5173`) para aprovechar el proxy. El backend escucha en 3001. Todas las rutas de la tabla, excepto demo y health, requieren cookie `shift_session`.

Las escrituras autenticadas requieren `Content-Type: application/json` y `X-CSRF-Token` con el valor del último `GET /api/state`. La cookie es HttpOnly: el frontend no necesita leerla. `act` ya implementa este contrato.

| Método y ruta                    | Cuerpo                               | Resultado / regla                                                                                         |
| -------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                | —                                    | `{ok:true}`; comprobación del proceso.                                                                    |
| `POST /api/demo`                 | —                                    | Crea perfil y cookie de prueba; prohibido en producción salvo `ALLOW_DEMO=true`.                          |
| `GET /api/state`                 | —                                    | `Snapshot`: mode, userId, progress, week, threads, csrf, aiEnabled.                                       |
| `POST /api/lessons/:id/start`    | `{}`                                 | Registra inicio si el prerrequisito permite acceso.                                                       |
| `POST /api/lessons/:id/complete` | `{answer:1}`                         | Índice 0–2, valida respuesta e inicio; otorga XP una sola vez.                                            |
| `POST /api/rewards/:id`          | `{}`                                 | Valida costo y nivel; guarda canje.                                                                       |
| `POST /api/freeze`               | `{}`                                 | Consume una unidad y protege la semana actual.                                                            |
| `POST /api/goal`                 | `{goal:"days"}` o `{goal:"minutes"}` | Cambia la modalidad de meta semanal.                                                                      |
| `POST /api/profile`              | Perfil completo                      | name, role, industry, goal, skills, portfolio. El enlace admite vacío o HTTP(S).                          |
| `POST /api/connect/:id`          | `{}`                                 | Registra interés por un perfil de demo; no envía mensajes.                                                |
| `POST /api/threads`              | `{channel,title,body}`               | Publica en la cohorte autenticada; áreas permitidas: Procesos de negocio, Datos y decisiones, Tecnología. |
| `POST /api/threads/:id/reply`    | `{body}`                             | Responde únicamente a un hilo accesible de su cohorte.                                                    |
| `POST /api/answers/:id/helpful`  | `{}`                                 | Voto único; +25 XP al autor, no admite voto propio.                                                       |
| `POST /api/nps`                  | `{score:9}`                          | Entero 0–10; conserva la última respuesta.                                                                |
| `POST /api/assistant`            | `{lessonId,action:"analogy"}`        | Explicación guiada o del servicio configurado. Solo temas accesibles.                                     |

La validación de `/api/assistant` también admite `quiz`, pero la interfaz actual genera el quiz desde la biblioteca local. La respuesta de este endpoint siempre tiene forma `{source:"guided"|"ai",text}`; no es un contrato de tarjetas generadas.

## Ejemplo desde el cliente

```ts
const snapshot = await fetch('/api/state').then((response) => response.json());
const response = await fetch('/api/goal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': snapshot.csrf,
  },
  body: JSON.stringify({ goal: 'days' }),
});
// Verificar response.ok y volver a consultar el snapshot después de guardar.
```

## Errores

- `400 {error}`: datos inválidos o regla de negocio incumplida.
- `401 {error}`: sesión ausente o vencida.
- `403 {error}`: CSRF inválido o demo deshabilitada.
- `503 {error}`: proveedor de IA configurado, pero no disponible.

Las mutaciones exitosas responden `{ok:true}`; no contienen el perfil actualizado. Las rutas LTI responden con redirecciones o mensajes de texto y tienen validación independiente. No implementar reintentos automáticos indiscriminados: los canjes no aceptan una clave de idempotencia y repetir un canje exitoso compra otra unidad.

## Lanzamiento LTI

`GET/POST /lti/login` inicia OIDC; `POST /lti/launch` consume `state` e `id_token`. Son rutas públicas que verifican la confianza de la plataforma antes de abrir una sesión. Consultar `CANVAS.md` para parámetros, seguridad y configuración institucional.
