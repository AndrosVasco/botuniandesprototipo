# Analítica GA4 de MONTOYADIGITALBOND

La landing utiliza el contenedor existente `GTM-W5W3TBCG`. No instala `gtag.js` ni una segunda etiqueta. El ID de medición expuesto al contenedor como `ga4_measurement_id` es `G-2D4N9MZ067`.

## Configuración requerida en Google Tag Manager

1. Confirmar que exista una sola etiqueta **Google tag** con ID `G-2D4N9MZ067` y activador para todas las páginas.
2. Crear un activador **Custom Event** que incluya: `section_view|scroll_depth|navigation_click|button_click|whatsapp_click|spark_open|spark_start|spark_proposal_view|spark_interest|generate_lead`.
3. En la etiqueta de evento GA4, enviar los parámetros indicados por cada evento. No crear una segunda llamada directa con `gtag`.
4. Publicar el contenedor solo después de validar en Preview/Tag Assistant.

## Eventos y parámetros

| Evento | Parámetros |
| --- | --- |
| `section_view` | `section_id`, `section_name`, `section_position` |
| `scroll_depth` | `scroll_percent` |
| `navigation_click` | `button_id`, `target_section`, `placement` |
| `button_click` | `section_id`, `button_id`, `button_label`, `action_type`, `placement` |
| `whatsapp_click` | `section_id`, `button_id`, `placement`, `source` |
| `spark_open`, `spark_start`, `spark_proposal_view`, `spark_interest` | `section_id`, `placement`, `source` |
| `generate_lead` | `section_id`, `source` |

No se envían nombres, datos de contacto, texto del chat, propuesta, referencia, tarifas ni URLs.

## Privacidad de clics salientes

GA4 puede medir automáticamente clics salientes y enviar `link_url`. Como los enlaces de WhatsApp contienen un mensaje precargado, desactivar manualmente **Outbound clicks** en: **GA4 → Administrar → Flujos de datos → Web → Medición mejorada → engranaje → Clics salientes**. La landing ya envía `whatsapp_click` sin número, mensaje ni URL.

## DebugView

1. Abrir la landing mediante Preview de Google Tag Manager y aceptar las cookies.
2. En la consola ejecutar `window.__MDB_ANALYTICS_DEBUG__ = true` antes de aceptar las cookies o interactuar.
3. Abrir **GA4 → Administrar → DebugView** y comprobar los eventos.
4. Recargar para repetir eventos de sección y scroll. Al terminar ejecutar `delete window.__MDB_ANALYTICS_DEBUG__`.

## Dimensiones personalizadas (alcance Evento)

Registrar: `section_id`, `section_name`, `section_position`, `button_id`, `button_label`, `target_section`, `action_type`, `placement`, `source` y `service_category` (reservada; no se envía si no existe una categoría controlada).

## Métrica personalizada

Registrar `scroll_percent` como métrica numérica con alcance Evento. `section_position` puede mantenerse como dimensión para ordenar y segmentar secciones.

## Eventos clave

Marcar `generate_lead` como evento clave. Mantener `whatsapp_click` como señal secundaria de intención de contacto: representa la apertura de WhatsApp, no confirma que se haya enviado un mensaje.
