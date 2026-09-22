# Integración con Canvas LMS

## Implementado

`GET/POST /lti/login` acepta únicamente el issuer y client ID configurados. Genera state y nonce criptográficamente aleatorios, guarda su expiración y liga el flujo al navegador mediante una cookie HttpOnly.

`POST /lti/launch` comprueba JWT RS256 contra un JWKS de confianza configurado por el administrador. Verifica firma, issuer, audience, azp cuando corresponde, exp, iat, antigüedad, nonce, deployment, versión 1.3.0, tipo LtiResourceLinkRequest, target_link_uri, contexto y resource link. Los estados son de un solo uso. Nunca descarga claves de una dirección suministrada por el usuario.

La identidad usa un hash de issuer, client ID y subject. El gremio se separa por issuer/contexto. Las mutaciones requieren sesión y token CSRF. En producción se usan cookies Secure, HttpOnly, SameSite=None y Partitioned, y la política frame-ancestors limita los contenedores autorizados.

## Configuración institucional

1. Copiar `.env.example` a `.env` y completar `APP_ORIGIN` con el origen público HTTPS y `CANVAS_ORIGIN` con el origen exacto de la institución.
2. Registrar una Developer Key LTI 1.3 en Canvas con URL de inicio OIDC `https://tu-dominio/lti/login`, redirect URI y target link URI `https://tu-dominio/lti/launch`, y placement `course_navigation`.
3. Copiar el client ID y deployment ID aprobados por el administrador a `LTI_CLIENT_ID` y `LTI_DEPLOYMENT_ID`.
4. Completar `LTI_ISSUER`, `LTI_AUTH_URL` y `LTI_JWKS_URL` con los valores oficiales de esa instancia y entorno. No intercambiar valores de producción, beta y test.
5. Configurar `NODE_ENV=production` y `ALLOW_DEMO=false`. Construir con `npm run build` y servir la aplicación detrás de un proxy HTTPS hacia 127.0.0.1:3001. Ajustar el proceso y almacenamiento persistente para el despliegue elegido.
6. Probar desde un curso de ensayo: navegación, lanzamiento, expiración, cierre de sesión de Canvas, cohortes y cookies de terceros. Cuando el navegador no permita la cookie de enlace del flujo OIDC, usar lanzamiento en pestaña nueva. No está implementado el protocolo de platform storage para navegadores que bloqueen esas cookies en iframes.

No se incluyen claves institucionales, usuarios reales ni permisos administrativos.

## Servicios aún no activados

- **AGS:** requiere clave privada del tool, JWKS público propio, OAuth client credentials, scopes autorizados y asociación de cada misión con un line item. La interfaz no presenta el progreso como una nota oficial.
- **Prórrogas:** LTI no concede por sí mismo permiso para alterar vencimientos. Se necesita un servicio institucional autorizado para gestionar overrides de tareas y reglas de elegibilidad. Los canjes quedan pendientes.
- **NRPS:** sincronizar solo los perfiles autorizados del contexto de Canvas y respetar el alcance de visibilidad del curso.
- **Credenciales:** definir emisor, criterios y evidencia, firmar una credencial verificable y publicar un endpoint de verificación antes de ofrecer exportación certificada a LinkedIn.
- **Supervisión:** incorporar roles docentes, moderación y trazabilidad institucional antes de admitir foros reales.

## Asistencia de IA

Para conectar un servicio privado, establecer `AI_SERVICE_URL` y opcionalmente `AI_SERVICE_KEY`. El servidor hace un POST con timeout de 15 segundos:

```json
{
  "action": "analogy",
  "context": {
    "title": "Modelado BPMN",
    "bullets": ["Contenido del tema"],
    "example": "Caso laboral"
  },
  "language": "es",
  "audience": "adultos trabajadores"
}
```

El contrato de respuesta es `{ "text": "Explicación en español" }`, de 1 a 6000 caracteres. La clave permanece en el servidor y no se envían nombres ni perfiles al servicio. Si no hay servicio configurado se usa la biblioteca local y se indica “modo guiado”. La ruta no es un proxy abierto: únicamente admite temas accesibles de su catálogo. La biblioteca de quizzes y flashcards funciona sin un proveedor externo.

## Documentación de referencia

- [Instructure: Launch Overview](https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_launch_overview)
- [Instructure: Configuring LTI Developer Keys](https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_dev_key_config)
- [Tailwind: instalación con Vite](https://tailwindcss.com/docs/installation/using-vite)

El código se probó con una plataforma local que firma lanzamientos reales de prueba. No sustituye una prueba de interoperabilidad contra Canvas ni una auditoría de producción.
