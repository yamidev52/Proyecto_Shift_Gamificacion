# Proyecto Shift Gamificacion

Plataforma de aprendizaje asíncrono MAPS, construida con **React 19, TypeScript, Tailwind CSS 4, Vite, Express y SQLite**.

## Abrir la plataforma

Si el servidor está encendido: **http://127.0.0.1:5173**.

Para iniciarlo de nuevo, abre `Iniciar Shift.command`, o ejecuta dentro de esta carpeta:

```sh
npm install
npm run dev
```

Requiere Node.js 22.13 o superior (SQLite integrado). El navegador usa el puerto 5173 y la API el 3001. Ambos servicios escuchan únicamente en la interfaz local.

```sh
npm run build  # Comprobación de TypeScript y compilación
npm test       # Pruebas del dominio, API y lanzamientos LTI firmados
npm start      # Sirve dist/ y API desde http://127.0.0.1:3001
```

## Lo que puedes probar

- Dashboard de las cuatro materias de la página APP, búsqueda, barras de progreso y accesos a RoadMap, calificaciones y misiones.
- Ruta vertical con 15 misiones por materia: completadas, disponibles, en progreso y bloqueadas.
- Panel lateral con ideas clave, ejemplo laboral, narración sintética, pregunta de comprobación y XP.
- Prerrequisitos y premios validados en el servidor; una misión no otorga XP dos veces.
- Metas de tres días distintos o 60 minutos estimados por semana, en la zona horaria de Ciudad de México. El tiempo se suma por misiones completadas, no es un cronómetro de presencia.
- Congeladores que se compran con XP y se aplican a la semana actual; conservan la racha cuando esa semana no se alcanza la meta. Una semana posterior sin meta ni protección reinicia la racha.
- Catálogo de seis beneficios, confirmación de canje, saldo e historial persistente.
- Copiloto contextual sin chat vacío: quiz de tres tarjetas, analogías, organizador de tiempo y flashcards de temas completados.
- Gremio con retos, respuestas y votos útiles; el autor recibe 25 XP una sola vez por votante. No se puede votar por una respuesta propia.
- Perfil editable con industria, rol, objetivo, habilidades y enlace al portafolio, además de encuesta NPS.
- Diseño adaptable a escritorio y móvil, paneles navegables con teclado, foco contenido y cierre con Escape.

## Referencia de Figma

Archivo: [Canvas Gamificacion — APP](https://www.figma.com/design/jddTdkXwDgX1tgoEFOTMC6/Canvas-Gamificacion?node-id=1-2).

Se inspeccionaron la estructura de APP (`1:2`) y visualmente los marcos Dashboard (`1:4`) y Ruta de Misiones (`48:740`). La extracción de código fue solicitada, pero el plan Starter de Figma agotó el cupo del conector; por eso no se pudo obtener el contexto completo ni exportar sus recursos.

La implementación conserva las cuatro materias, barra lateral oscura, acentos amarillo/turquesa/morado/verde, progreso segmentado y colores de los estados. Se añadió la identidad **Shift**, se simplificaron las tarjetas conforme al brief y el recorrido horizontal se transformó en vertical. No se presenta como copia píxel a píxel: los iconos son de Lucide, las fuentes se sirven localmente y los porcentajes se calculan según misiones reales de la demo (en lugar de textos estáticos del diseño).

## Estado de las integraciones

| Área                              | Disponible                                                                                                            | Pendiente para uso académico real                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas LTI 1.3                    | Inicio OIDC, JWT RS256, issuer/audience/deployment/nonce/state, protección de replay, sesión y separación de cohortes | Registro institucional, HTTPS y prueba en la instancia real. No se afirma certificación LTI Advantage.                                            |
| Calificaciones                    | Tabla y avance local                                                                                                  | Sincronización AGS con Canvas; no se fabrican calificaciones oficiales.                                                                           |
| Prórrogas                         | Solicitud y descuento de XP                                                                                           | Política institucional, asignación de tarea y API de Canvas. No cambia fechas automáticamente.                                                    |
| Credenciales                      | Solicitud de validación                                                                                               | Emisor autorizado, firma Open Badges y enlace verificable para LinkedIn. No se generan insignias certificadas ficticias.                          |
| Networking                        | Foros persistentes, votos, perfiles de ejemplo y registro local de interés                                            | Directorio NRPS, invitaciones reales, supervisión docente y moderación.                                                                           |
| Masterclasses, mentorías y empleo | Catálogo y solicitudes                                                                                                | Oferta real, agenda, proveedores y aprobación institucional.                                                                                      |
| IA                                | Biblioteca de práctica y adaptador privado configurable para analogías                                                | Servicio de inferencia real; el quiz y las flashcards actuales se construyen de la biblioteca, no de un LLM.                                      |
| Contenido                         | 60 misiones de demostración con casos de trabajo                                                                      | Validación curricular, evaluaciones específicas y videos o audios originales del docente. La narración actual usa la voz sintética del navegador. |

## Datos y sesiones

Los datos viven en `data/shift.sqlite`, con transacciones para el saldo y los votos. Esta carpeta y `.env` están excluidos de Git. Cada sesión de demostración recibe su propio perfil; las conversaciones de prueba se comparten dentro del proyecto local. La sesión dura ocho horas. Recargar conserva los cambios; una sesión de demostración nueva crea otro perfil. En Canvas, la identidad validada permite recuperar siempre el mismo perfil.

La demo comienza con progreso y XP de ejemplo. Los estudiantes que ingresan mediante LTI comienzan con cero progreso. No se han copiado datos de estudiantes desde Figma o Canvas.

## Arquitectura

- `src/App.tsx`: navegación, dashboard, roadmap, catálogo, metas y coordinación.
- `src/learning.tsx`: misión, narración y copiloto.
- `src/community.tsx`: gremio y perfil.
- `src/ui.tsx`: componentes visuales y paneles accesibles.
- `src/styles.css`: tokens, diseño y breakpoints, junto con utilidades Tailwind.
- `shared/catalog.ts`: catálogo, contenido y contratos compartidos.
- `server/domain.ts`: XP, acceso a misiones, metas y congeladores.
- `server/index.ts`: API, SQLite, sesiones y lanzamiento LTI.
- `tests/`: casos de negocio, API y plataforma LTI simulada con claves temporales.

Configuración de Canvas: [docs/CANVAS.md](docs/CANVAS.md). Alcance y medición: [docs/PRODUCTO.md](docs/PRODUCTO.md).

Este proyecto es un MVP local funcional. No está publicado ni conectado a una institución. La reducción de deserción del 25% y el NPS 60–70 son metas de evaluación, no resultados demostrados.

## Guía para el equipo

Empieza por [CONTRIBUTING.md](CONTRIBUTING.md): instalación, ramas, revisiones y archivo que corresponde a cada cambio. También están documentados [la arquitectura](docs/ARQUITECTURA.md) y [los contratos de API](docs/API.md).

El código contiene comentarios en español sobre responsabilidades, reglas de XP, transacciones, sesiones y accesibilidad. Ejecuta `npm run format` para aplicar el formato compartido y `npm run format:check` para comprobarlo.

El repositorio público permite consultar el código y proponer cambios mediante forks y pull requests. Para subir ramas directamente, el propietario debe añadir al integrante como colaborador. La publicación del código no pone en línea el servidor ni conecta Canvas automáticamente.
