# Cómo colaborar en Shift

## Preparar tu computadora

1. Instala Node.js 22.13 o superior; con nvm puedes usar `nvm install` y `nvm use`.
2. Clona este repositorio y abre su carpeta en tu editor:

   ```sh
   git clone https://github.com/yamidev52/Proyecto_Shift_Gamificacion.git
   cd Proyecto_Shift_Gamificacion
   ```

3. Ejecuta `npm ci`. Usa el lockfile para trabajar con las mismas versiones que el equipo.
4. Ejecuta `npm run dev` y abre http://127.0.0.1:5173.
5. Opcionalmente copia `.env.example` a `.env` para configurar servicios. No hacen falta claves para la demo.

La base de datos se crea en tu equipo. No compartas `data/`, archivos `.env` ni cookies.

## Flujo de trabajo recomendado

Si tienes permiso de escritura, crea una rama desde `main`:

```sh
git switch main
git pull --ff-only
git switch -c codex/descripcion-del-cambio
```

Haz un cambio enfocado y ejecuta:

```sh
npm run format
npm run format:check
npm run build
npm test
```

Después guarda y sube tu rama:

```sh
git add src docs
# Incluye también cualquier otro archivo que hayas cambiado intencionalmente.
git commit -m "Describe el comportamiento que cambia"
git push -u origin codex/descripcion-del-cambio
```

Abre un pull request hacia `main`. Explica el problema, el resultado y cómo lo comprobaste. Para cambios visuales incluye capturas de escritorio y móvil. Pide revisión a otra persona antes de integrar.

Si no tienes permiso de escritura, crea un **fork**, trabaja en su rama y envía un pull request al repositorio original. Que el repositorio sea público no concede permiso para subir cambios directamente. El propietario puede invitar colaboradores desde Settings → Collaborators; nunca compartan credenciales.

## ¿Dónde cambio cada cosa?

| Quiero cambiar…                             | Empieza aquí                         |
| ------------------------------------------- | ------------------------------------ |
| Materias, contenidos o recompensas          | `shared/catalog.ts`                  |
| Dashboard, navegación y RoadMap             | `src/App.tsx`                        |
| Panel de misión, audio o copiloto           | `src/learning.tsx`                   |
| Gremio, formularios o perfil                | `src/community.tsx`                  |
| Iconos, badges o comportamiento de diálogos | `src/ui.tsx`                         |
| Colores, espaciado o diseño adaptable       | `src/styles.css`                     |
| Prerrequisitos, XP o rachas                 | `server/domain.ts`                   |
| Endpoints, persistencia y sesiones          | `server/index.ts`                    |
| Integración Canvas                          | `server/index.ts` y `docs/CANVAS.md` |

## Convenciones

- Comentarios y documentación en español, explicando intención, contratos y límites.
- Usa TypeScript y reutiliza los tipos de `shared/catalog.ts`.
- Mantén los IDs persistentes del catálogo; renombrarlos requiere migración.
- El cliente no es autoridad de saldo, premios, autorización ni notas.
- Usa `act` para las mutaciones desde las pantallas y recarga el snapshot tras guardar.
- Las reglas económicas deben permanecer dentro de transacciones; no mezcles llamadas de red con una transacción SQLite abierta.
- Las evaluaciones de práctica y los datos ficticios deben seguir claramente identificados.
- Escribe pruebas cuando cambies reglas de negocio, autorización o persistencia. No hacen falta pruebas repetitivas para cada texto o estilo.

## Problemas frecuentes

- **Puerto ocupado:** cierra otra instancia de Shift. Desarrollo utiliza 5173 y 3001; integración usa 3012 y 3013.
- **`node:sqlite` no disponible:** revisa `node --version`; necesitas Node 22.13 o superior.
- **Aviso experimental de SQLite:** es esperado en Node 22; no indica por sí mismo un fallo.
- **Pantalla sin datos:** verifica que estén activos Vite y el backend, y recarga para recuperar la sesión.
- **Datos distintos entre navegadores:** cada sesión de demo tiene su propio perfil. Los perfiles LTI se asocian a la identidad validada.
- **No funciona Canvas:** la demo no incluye registro institucional. Revisa `docs/CANVAS.md`.

Consulta [arquitectura](docs/ARQUITECTURA.md) y [API](docs/API.md) antes de ampliar el backend. Los pendientes reales de integración están enumerados en el README.
