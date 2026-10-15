const SPARK_PROFILE = {
  name: "Andrés Montoya Vélez",
  services: [
    "Consultoría y mentoría para diagnosticar, priorizar y mejorar digitalmente procesos manuales de cualquier área del negocio, incluso cuando todavía no hay una herramienta definida",
    "Consultoría en experiencia del cliente y mejora de procesos",
    "Implementación y optimización de software de gestión de solicitudes: canales, clasificación, reglas, niveles de servicio, reportes y operación",
    "Automatización low-code: notificaciones, sincronización de datos, integración de APIs y eliminación de tareas manuales",
    "Canales de mensajería empresarial: atención guiada, captura de datos y flujos conversacionales automatizados",
    "Asistentes con IA cuando aporten valor al problema",
    "Formularios, herramientas internas, integraciones, interfaces web, hosting y bases de datos administradas cuando sean pertinentes",
    "Levantamiento, priorización, producto mínimo viable, calibración, capacitación, monitoreo y documentación",
  ],
};

// Configuración privada. Nunca se serializa en respuestas públicas ni tokens de sesión.
const EFFORT_MATRIX = Object.freeze({
  discovery: { min: 4, max: 5 },
  process_consulting: { min: 12, max: 15 },
  zendesk_setup: { min: 24, max: 30 },
  zendesk_optimization: { min: 12, max: 15 },
  n8n_automation: { min: 12, max: 15 },
  whatsapp_bot: { min: 32, max: 40 },
  ai_assistant: { min: 32, max: 40 },
  internal_tool: { min: 40, max: 50 },
  integration: { min: 16, max: 20 },
  training_docs: { min: 8, max: 10 },
});

const SERVICE_KEYS = Object.keys(EFFORT_MATRIX);
const PUBLIC_NOTICE = "Inversión y alcance preliminares, pendientes de confirmación por Andrés.";
const THIRD_PARTY_NOTICE = "Licencias, consumo de APIs y servicios de terceros no están incluidos en esta estimación.";

module.exports = {
  SPARK_PROFILE,
  EFFORT_MATRIX,
  SERVICE_KEYS,
  PUBLIC_NOTICE,
  THIRD_PARTY_NOTICE,
};
