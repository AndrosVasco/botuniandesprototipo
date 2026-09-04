import { X } from "lucide-react";

export function HelpVideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-video-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="help-video-card">
        <div className="help-video-header">
          <div><h2 id="help-video-title">Guía de uso</h2><p>Conoce cómo ingresar y utilizar el asistente.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar guía"><X size={20} /></button>
        </div>
        <video controls autoPlay playsInline preload="metadata">
          <source src="/guiademo.mp4" type="video/mp4" />
          Tu navegador no permite reproducir este video.
        </video>
      </section>
    </div>
  );
}
