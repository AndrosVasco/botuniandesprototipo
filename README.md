# MONTOYADIGITALBOND

Landing comercial de Andrés Montoya Vélez para servicios de atención al cliente, automatización e integraciones.

## Stack

- React 19 + TypeScript.
- Vite 6.
- CSS nativo y `lucide-react` para iconografía.
- Funciones serverless de Vercel para Spark y la API de OpenAI.
- Notificación directa por correo mediante la cuenta corporativa de Spark.

## Desarrollo

Requiere Node.js 20 o superior.

```powershell
npm install
npm run dev
```

La aplicación se sirve por defecto en `http://127.0.0.1:5173`.

## Validación y build

```powershell
npm run build
npm run preview
```

El resultado se genera en `frontend/dist`.

## Spark

Spark convierte el relato de un visitante en una orientación preliminar. La conversación admite un máximo de tres preguntas de aclaración controladas por el servidor. La propuesta pública contiene únicamente problema, solución, herramientas, alcance, supuestos e inversión total; la estimación de esfuerzo permanece en el servidor.

Rutas:

- `POST /api/spark/chat`: conversación y propuesta estructurada.
- `POST /api/spark/lead`: autorización, correo directo y enlace de WhatsApp.

La configuración editable del perfil y la matriz de esfuerzo se encuentran en `api/_lib/spark-config.js`. No deben importarse desde el frontend.

### Variables requeridas

Copiar `.env.example` únicamente como referencia y configurar estos valores en Vercel:

- `OPENAI_API_KEY`: clave privada de servidor.
- `OPENAI_MODEL`: modelo compatible con Structured Outputs.
- `SPARK_SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `SPARK_INTERNAL_HOURLY_RATE_COP`: tarifa privada utilizada por el cálculo del servidor.
- `SMTP_HOST`, `SMTP_PORT` y `SMTP_SECURE`: conexión del proveedor de correo corporativo.
- `SMTP_USER` y `SMTP_APP_PASSWORD`: credenciales SMTP de `spark@montoyadigitalbond.com`.
- `SMTP_FROM`: remitente autorizado; debe ser `spark@montoyadigitalbond.com`.
- `SPARK_NOTIFICATION_EMAIL`: destinatario del aviso; por defecto `felipemvelez@outlook.es`.

### Modo demostración

`SPARK_DEMO_MODE=true` permite revisar localmente la conversación sin llamar a OpenAI. La interfaz lo identifica de forma visible y el registro de prospectos permanece desactivado, por lo que nunca simula persistencia ni notificaciones reales.

### Correo de notificación

El servidor envía directamente un correo con referencia, contacto, necesidad, preguntas y respuestas, propuesta, herramientas, alcance e inversión. No interviene ningún orquestador externo.

Si falla el correo, la interfaz informa el problema y permite reintentar el envío. No se persisten datos del prospecto en una base de datos.

## Despliegue en Vercel

El archivo `vercel.json` conserva el despliegue desde la raíz del repositorio, ejecuta el build del workspace frontend y publica `frontend/dist`. La URL canónica configurada es `https://www.montoyadigitalbond.com/`.

Las credenciales de OpenAI y SMTP deben configurarse únicamente como variables cifradas del proyecto en Vercel. Ninguna utiliza el prefijo `VITE_` y ninguna se entrega al navegador.

## Recursos visuales

Las imágenes originales entregadas se conservan en `frontend/public/images` y sus versiones WebP optimizadas son las que usa la landing. La imagen social está preparada a 1200 × 630 px.

## Respaldo

El estado anterior a la transformación se conserva en la rama local `backup/pre-montoyadigitalbond-20261007`.
