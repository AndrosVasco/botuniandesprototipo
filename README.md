# MONTOYADIGITALBOND

Landing comercial de Andrés Montoya Vélez para servicios de atención al cliente, automatización e integraciones.

## Stack

- React 19 + TypeScript.
- Vite 6.
- CSS nativo y `lucide-react` para iconografía.
- Sitio completamente estático: no requiere backend, base de datos ni variables de entorno.

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

## Despliegue en Vercel

El archivo `vercel.json` conserva el despliegue desde la raíz del repositorio, ejecuta el build del workspace frontend y publica `frontend/dist`. La URL canónica configurada es `https://www.montoyadigitalbond.com/`.

No se necesitan las credenciales del prototipo anterior. Cualquier variable histórica puede retirarse manualmente desde Vercel cuando se confirme que no la usa otro entorno; este repositorio no la expone ni la consume.

## Recursos visuales

Las imágenes originales entregadas se conservan en `frontend/public/images` y sus versiones WebP optimizadas son las que usa la landing. La imagen social está preparada a 1200 × 630 px.

## Respaldo

El estado anterior a la transformación se conserva en la rama local `backup/pre-montoyadigitalbond-20261007`.
