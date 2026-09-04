# Asistente de Aspirantes — prototipo técnico

Adaptación breve del widget existente a un asistente web de programas y admisiones. Toda la información académica, disponibilidad y actividad de contacto es simulada; no se usan logos ni datos oficiales de la Universidad de los Andes.

## Stack y alcance

- React + Vite + TypeScript.
- Express + TypeScript.
- Modos Demo e IA, con OpenAI consumido solamente desde backend.
- Fallback local controlado y memoria por `sessionId`.
- Idiomas ES, EN y PT.
- Tres programas simulados: Ingeniería de Sistemas, Diseño y Programa Especial.
- Seis herramientas internas: `consultProgram`, `checkCohort`, `registerInterest`, `checkAdvisorAvailability`, `requestAdvisorContact` y `cancelInterest`.

No incluye base de datos, autenticación, RAG, analítica, CRM, mensajería ni llamadas reales. El canal y flujo internos son `web` y `aspirantes`.

## Comportamiento por modo

- **Demo:** Admisiones aparece cerrado con horario simulado de lunes a viernes, 8:00 a. m. a 5:00 p. m., y permite dejar una solicitud de contacto.
- **IA:** el asistente conversa como bot sobre temas del prototipo. Puede consultar una carrera escrita por el usuario; para demostrar ambos estados, la primera consulta de esa carrera muestra cohorte simulada abierta y la segunda muestra que no hay cohorte ni fecha confirmada.
- En modo IA, el backend detecta ES, EN o PT a partir de cada mensaje y conserva ese idioma durante respuestas cortas del mismo flujo, aunque el selector estuviera en otro idioma.
- Al solicitar Admisiones en modo IA, la sesión cambia a una experiencia de asesor humano simulado, limitada a carreras, admisiones, requisitos, costos, cohortes, matrícula y pagos del prototipo.
- La matrícula genera solo un identificador `MATR-DEMO`; los enlaces de pago usan el dominio reservado `demo.invalid` y no ejecutan cobros.
- Cualquier pregunta fuera del alcance se bloquea en backend antes de llamar a OpenAI.

Al activar **IA**, la interfaz muestra tres controles de demostración:

- Admisiones `Online / Offline`.
- Cohorte `Disponible / No disponible`.
- Conexión IA `Conectada / Simular error`.

El error controlado no llama a OpenAI y ofrece reintentar, volver más tarde o usar el teléfono y correo ficticios de demostración. Al pulsar **Reintentar IA**, el frontend restablece la conexión simulada antes de enviar el nuevo intento.

## Ejecución

Requiere Node.js 20 o superior.

```powershell
npm run install:all
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Salud: `GET http://localhost:3001/api/health`
- Chat: `POST http://localhost:3001/api/chat`

El modo Demo no requiere configuración. Para IA, crea `backend/.env` a partir de `backend/.env.example` y configura `OPENAI_API_KEY`; si no existe o el proveedor falla, el recorrido continúa mediante fallback local.

```env
OPENAI_API_KEY=tu-api-key
OPENAI_MODEL=gpt-4.1-mini
APP_ACCESS_CODE=tu-codigo-privado-de-acceso
AI_ACCESS_CODE=tu-codigo-privado-para-ia
AUTH_SECRET=un-secreto-aleatorio-largo-para-firmar-sesiones
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

SMTP es opcional. Sin SMTP, el registro por correo finaliza correctamente como simulación. Todo correo emitido incluye `PROTOTIPO TÉCNICO — MENSAJE DE DEMOSTRACIÓN`.

## Recorridos de demostración

1. `Quiero consultar un programa y sus fechas.` muestra una tarjeta única de Ingeniería de Sistemas.
2. `Quiero saber si hay una cohorte disponible.` informa que Diseño no tiene cohorte ni fecha confirmada y permite registrar interés con autorización.
3. `Programa Especial` muestra información no disponible con opciones para reintentar o contactar a Admisiones.

`Quiero hablar con Admisiones.` demuestra la disponibilidad y transferencia simuladas. `Genera una tesis.` valida el límite de alcance en backend antes de ejecutar herramientas o llamar a OpenAI. `Simular falla` permite comprobar el manejo seguro de una acción fallida.

## Scripts

```powershell
npm run dev
npm run dev:backend
npm run dev:frontend
npm run build
npm run start
```

## Notas para Vercel

No se ha realizado ningún despliegue. El frontend admite `VITE_API_URL`; en producción usa rutas relativas si no se define. La memoria y los registros simulados viven en RAM y pueden reiniciarse cuando una función serverless cambia de instancia o entra en reposo. Esto es deliberado para el prototipo y no debe considerarse persistencia.

Los procesos actuales operan sobre solo tres registros fijos. Si el catálogo o los registros se llevaran a persistencia real, las consultas deberán paginarse y cualquier carga masiva deberá usar encabezado de proceso, lotes reintentables de aproximadamente 300–500 elementos y consolidación posterior.

## Seguridad

- Las claves y credenciales se leen únicamente en backend.
- `.env` debe permanecer fuera de Git; solo se versiona `.env.example`.
- El frontend no incluye ni recibe la API key.
- No se solicita identificación ni datos personales para consultar programas.
- Se solicita autorización antes de registrar cualquier dato de contacto.

## Acceso temporal

La aplicación exige un código inicial y un segundo código para habilitar IA. Ambos se validan exclusivamente en backend mediante `APP_ACCESS_CODE` y `AI_ACCESS_CODE`; nunca deben usar el prefijo `VITE_` ni escribirse en el frontend. `AUTH_SECRET` firma el token temporal.

La sesión expira cinco minutos después del acceso inicial. Habilitar IA no reinicia ni amplía ese plazo. El frontend conserva el token solo en memoria y el backend protege `/api/chat` y `/api/session/reset`, por lo que ocultar la pantalla no es la única barrera. Los intentos fallidos tienen un límite básico por instancia.

En Vercel, agrega las tres variables en **Settings → Environment Variables** para Production y Preview y vuelve a desplegar. Si faltan, el backend devuelve `Acceso temporal no configurado` sin permitir el ingreso.
