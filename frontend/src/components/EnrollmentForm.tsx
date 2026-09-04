import { ArrowLeft, GraduationCap } from "lucide-react";

export function EnrollmentForm() {
  return <main className="enrollment-shell">
    <section className="enrollment-page">
      <header className="enrollment-header"><div><GraduationCap size={25} /></div><span><strong>Formulario de inscripción</strong><small>Admisiones Uniandes</small></span></header>
      <div className="demo-notice"><strong>Formulario exclusivamente simulado</strong><span>No envía, almacena ni procesa ningún dato. Todos sus controles están deshabilitados.</span></div>
      <div className="enrollment-copy"><h1>Inicia tu proceso de admisión</h1><p>Completa la información básica para continuar con la inscripción al programa seleccionado.</p></div>
      <form className="enrollment-form">
        <label>Nombre completo<input type="text" placeholder="Escribe tu nombre" disabled /></label>
        <label>Correo electrónico<input type="email" placeholder="nombre@correo.com" disabled /></label>
        <label>Número de celular<input type="tel" placeholder="+57 300 123 4567" disabled /></label>
        <label>Programa de interés<select defaultValue="" disabled><option value="">Selecciona un programa</option><option>Medicina</option><option>Ingeniería de Sistemas</option><option>Diseño</option><option>Arquitectura</option></select></label>
        <label>Periodo de ingreso<select defaultValue="2027-1" disabled><option>2027-1</option></select></label>
        <label className="enrollment-consent"><input type="checkbox" disabled /> Autorización de tratamiento de datos (simulada).</label>
        <button type="button" disabled>Enviar inscripción (simulación)</button>
      </form>
      <button className="back-link" type="button" onClick={() => window.location.assign("/")}><ArrowLeft size={16} /> Volver al asistente</button>
    </section>
  </main>;
}
