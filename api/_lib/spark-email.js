const nodemailer = require("nodemailer");

const DEFAULT_FROM = "spark@montoyadigitalbond.com";
const DEFAULT_RECIPIENT = "felipemvelez@outlook.es";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function list(value) {
  return Array.isArray(value) && value.length ? value.join("\n• ") : "No informado";
}

function transporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) throw new Error("Credenciales SMTP no configuradas.");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: { user, pass },
  });
}

async function sendSparkLeadEmail(payload) {
  const from = process.env.SMTP_FROM || DEFAULT_FROM;
  const to = process.env.SPARK_NOTIFICATION_EMAIL || DEFAULT_RECIPIENT;
  const contact = [
    `Nombre: ${payload.contact.name}`,
    `Empresa: ${payload.contact.company || "No informada"}`,
    `WhatsApp: ${payload.contact.whatsapp || "No informado"}`,
    `Correo: ${payload.contact.email || "No informado"}`,
  ].join("\n");
  const answers = payload.questionsAndAnswers.length
    ? payload.questionsAndAnswers.map(({ question, answer }, index) => `${index + 1}. ${question}\n${answer}`).join("\n\n")
    : "No se formularon preguntas adicionales.";
  const tools = payload.tools.map((tool) => `${tool.name}: ${tool.purpose}`);
  const investment = payload.investment.min === null || payload.investment.max === null
    ? "Pendiente de evaluación"
    : `${Number(payload.investment.min).toLocaleString("es-CO")}–${Number(payload.investment.max).toLocaleString("es-CO")} COP`;
  const text = [
    "NUEVO PROSPECTO DE SPARK", `Referencia: ${payload.reference}`, `Fecha: ${payload.date}`, "",
    contact, "", `Problema identificado:\n${payload.problem}`, "", `Solución propuesta:\n${payload.summary}`, "",
    `Alcance:\n• ${list(payload.scope)}`, "", `Herramientas:\n• ${list(tools)}`, "",
    `Preguntas y respuestas:\n${answers}`, "", `Inversión preliminar: ${investment}`,
  ].join("\n");
  const section = (title, value) => `<h2 style="font-size:18px">${title}</h2><p>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`;
  const html = `<div style="font-family:Arial,sans-serif;color:#17251f;line-height:1.55;max-width:720px;margin:auto">
    <p style="display:inline-block;background:#e4ad26;color:#17251f;padding:6px 10px;border-radius:6px;font-weight:700">SPARK</p>
    <h1 style="font-size:24px">Nuevo prospecto</h1><p><strong>Referencia:</strong> ${escapeHtml(payload.reference)}<br><strong>Fecha:</strong> ${escapeHtml(payload.date)}</p>
    <hr style="border:0;border-top:1px solid #d8d5c8;margin:20px 0">
    ${section("Contacto", contact)}${section("Necesidad identificada", payload.problem)}${section("Solución propuesta", payload.summary)}
    ${section("Alcance", `• ${list(payload.scope)}`)}${section("Herramientas", `• ${list(tools)}`)}${section("Preguntas y respuestas", answers)}
    <p style="background:#f4f0e4;padding:14px;border-radius:8px"><strong>Inversión preliminar:</strong> ${escapeHtml(investment)}</p></div>`;

  await transporter().sendMail({
    from: `Spark · MONTOYADIGITALBOND <${from}>`, to,
    replyTo: payload.contact.email || undefined,
    subject: `Nuevo prospecto Spark | ${payload.reference} | ${payload.contact.name}`,
    text, html,
  });
}

module.exports = { sendSparkLeadEmail };
