import nodemailer from "nodemailer";

interface DemoEmailInput {
  to: string;
  subject: string;
  title: string;
  body: string;
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user, pass }
  });
}

export async function sendDemoEmail({ to, subject, title, body }: DemoEmailInput) {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false as const, reason: "smtp_not_configured" };
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const safeSubject = `[Admisiones] ${subject}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.5">
      <p style="display:inline-block;background:#e8f3f1;color:#176b61;padding:6px 10px;border-radius:6px;font-weight:700">ADMISIONES</p>
      <h2>${title}</h2>
      <div>${body.replace(/\n/g, "<br />")}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#64748b;font-size:12px">Este mensaje confirma la recepción de tu solicitud y no representa una decisión de admisión ni reserva un cupo.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: safeSubject,
    text: `ADMISIONES\n\n${title}\n\n${body}\n\nEste mensaje confirma la recepción de tu solicitud y no representa una decisión de admisión ni reserva un cupo.`,
    html
  });

  return { ok: true as const };
}

export function sendInternalFeedback(reference: string, sessionId: string, detail: string) {
  const to = process.env.FEEDBACK_EMAIL;
  if (!to) return Promise.resolve({ ok: false as const, reason: "feedback_email_not_configured" });
  return sendDemoEmail({
    to,
    subject: `Comentario del asistente ${reference}`,
    title: "Oportunidad de mejora reportada",
    body: `Referencia: ${reference}\nSesión: ${sessionId}\n\n${detail}`
  });
}
