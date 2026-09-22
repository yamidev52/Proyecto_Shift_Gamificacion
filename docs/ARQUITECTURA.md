# Arquitectura para el equipo

## Recorrido de una acción

```text
Persona → pantalla React → act(path, body) → API Express
                                             │
                                   sesión + CSRF + validación
                                             │
                                   regla de negocio (domain)
                                             │
                                   transacción en SQLite
                                             │
                      React ← GET /api/state ← resultado
```

`App` carga un snapshot completo. Los componentes mantienen solo estado de interfaz: filtros, respuesta seleccionada, formularios y paneles abiertos. Tras una escritura exitosa se vuelve a consultar el servidor. No se anticipan premios en el cliente, evitando que el saldo visual difiera del persistido.

## Capas y responsabilidades

- **`shared/catalog.ts`:** contenido y contratos compartidos. Los IDs no dependen del título visible. El orden de las misiones es significativo.
- **`src/`:** vistas React, primitivas y estilos. No contiene credenciales ni accede al sistema de archivos.
- **`server/domain.ts`:** reglas mutables sobre `Progress`, independientes de Express y SQLite. Reciben fechas cuando hace falta probar transiciones temporales.
- **`server/index.ts`:** transporte HTTP, validación Zod, autorización de cohortes, transacciones y lanzamientos LTI.
- **`tests/`:** pruebas de reglas y de API con recursos temporales. No requieren servicios institucionales.

El backend está concentrado en un archivo para este MVP. Si crece, separar primero persistencia, sesiones, rutas del gremio y LTI; preservar el orden de middlewares y las transacciones durante esa extracción.

## Modelo de persistencia

| Tabla      | Propósito y restricciones                                                |
| ---------- | ------------------------------------------------------------------------ |
| `users`    | ID estable y JSON `Progress`; incluye perfil, saldo, actividad y canjes. |
| `sessions` | Hash del token, usuario, CSRF, expiración, modo y cohorte.               |
| `threads`  | Retos separados por cohorte.                                             |
| `answers`  | Respuestas vinculadas al hilo y al autor.                                |
| `votes`    | Clave compuesta `answer_id,user_id`; evita votar dos veces.              |
| `events`   | Eventos mínimos de producto para futura analítica.                       |
| `oidc`     | State, nonce, vínculo al navegador y expiración de un lanzamiento.       |

Las relaciones se verifican principalmente en las rutas; el esquema actual no declara todas las claves foráneas. No asumir que `PRAGMA foreign_keys` valida relaciones que no se han definido.

`mutate` abre `BEGIN IMMEDIATE`, carga el usuario, aplica una regla, guarda y confirma. Un error revierte el saldo y el evento. Los votos usan otra transacción que abarca voto y premio al autor. Las funciones de dominio no deben invocarse sobre estado React compartido.

## Invariantes que debemos preservar

- `xp` es saldo gastable; `earned` es experiencia histórica y determina nivel.
- Una misión completada no vuelve a premiarse, aunque se reintente la petición.
- Acceso secuencial: la misión anterior tiene que estar completada.
- Un voto útil solo puede premiar al autor, nunca al votante ni a uno mismo.
- `creditedWeeks` impide acreditar dos veces una semana al cambiar la meta.
- Un congelador protege la semana actual y no incrementa por sí mismo la racha.
- Un canje académico no implica que Canvas haya modificado una entrega.

## Tiempo y sesiones

El día se calcula en `America/Mexico_City`; las semanas empiezan en lunes. La meta de minutos suma duraciones estimadas, no un reloj de actividad. Al leer un perfil, `settleWeeks` procesa semanas vencidas: no hay cron en esta versión.

Las sesiones duran ocho horas. Los perfiles LTI se recuperan por issuer/client ID/subject. Una nueva sesión de demo crea otro perfil, y todas las demos locales comparten el gremio de prueba. En producción debe deshabilitarse la demo.

## Interfaz y accesibilidad

Las fuentes están empaquetadas, los iconos pasan por `Icon` y los paneles por `Modal`. La pila de diálogos asegura que Escape y Tab afecten al panel superior. El cierre devuelve el foco a su origen. Los breakpoints están en `styles.css`, al final de las reglas base; las últimas reglas ajustan contraste y densidad. No duplicar un panel sin conservar ese comportamiento.

## Configuración y despliegue

Vite reenvía `/api` y `/lti` al puerto 3001 en desarrollo. Después de compilar, Express sirve `dist/` y la API desde un solo origen. Se necesita almacenamiento persistente para SQLite y un proxy HTTPS para usar Canvas real. Publicar el repositorio en GitHub no despliega la aplicación ni la convierte en un sitio de GitHub Pages compatible con su backend.

Las variables privadas se leen solo en el servidor. El único archivo de entorno que se comparte es `.env.example`. Ver `docs/CANVAS.md` para los límites de LTI, AGS, NRPS e IA externa.
