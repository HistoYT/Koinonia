import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import { ApiError, type ApiEvent, type EventInput } from '../lib/api';

type FieldErrors = Record<string, string[] | undefined>;

const emptyForm: EventInput = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '',
  location: '',
  imageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
};

function formatDate(isoDate: string) {
  // Se arma en horario local a partir de las partes, para no correr el día
  // por interpretar "2026-09-12" como medianoche UTC.
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isPast(isoDate: string) {
  return isoDate < new Date().toISOString().slice(0, 10);
}

export default function AdminEvents() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function loadEvents() {
    setLoadingList(true);
    api
      .listEvents()
      .then((res) => setEvents(res.events))
      .catch(() => setEvents([]))
      .finally(() => setLoadingList(false));
  }

  useEffect(loadEvents, []);

  function startEdit(event: ApiEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      eventTime: event.eventTime ?? '',
      location: event.location ?? '',
      imageUrl: event.imageUrl ?? '',
      ctaLabel: event.ctaLabel ?? '',
      ctaUrl: event.ctaUrl ?? '',
    });
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    const payload: EventInput = {
      ...form,
      description: form.description || undefined,
      eventTime: form.eventTime || undefined,
      location: form.location || undefined,
      imageUrl: form.imageUrl || undefined,
      ctaLabel: form.ctaLabel || undefined,
      ctaUrl: form.ctaUrl || undefined,
    };

    try {
      if (editingId) {
        await api.updateEvent(editingId, payload);
      } else {
        await api.createEvent(payload);
      }
      cancelEdit();
      loadEvents();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues) {
        setFieldErrors(err.issues);
      } else {
        setFormError('No se pudo guardar el evento. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      setUploadError('No se pudo subir la imagen. Usa JPG, PNG, WEBP o GIF de máximo 5 MB.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(event: ApiEvent) {
    if (!confirm(`¿Eliminar el evento "${event.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteEvent(event.id);
      if (editingId === event.id) cancelEdit();
      loadEvents();
    } catch {
      alert('No se pudo eliminar el evento.');
    }
  }

  return (
    <AppShell>
      <div className="admin-main">
        <h1>Eventos de Koinonía</h1>
        <p className="admin-subtitle">
          Administra la agenda que aparece en la sección "Eventos" de la página principal.
        </p>

        {!formOpen && (
          <button type="button" className="admin-btn admin-btn-primary admin-new-btn" onClick={() => setFormOpen(true)}>
            + Nuevo evento
          </button>
        )}

        {formOpen && (
          <div className="admin-form-card">
            <p className="admin-form-title">{editingId ? 'Editar evento' : 'Nuevo evento'}</p>
            <form onSubmit={handleSubmit} className="admin-form">
              <label className="admin-field-full">
                Título
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                {fieldErrors.title?.map((m) => (
                  <p key={m} className="admin-field-error">{m}</p>
                ))}
              </label>

              <label className="admin-field-full">
                Descripción
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <label>
                Fecha
                <input
                  required
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
                {fieldErrors.eventDate?.map((m) => (
                  <p key={m} className="admin-field-error">{m}</p>
                ))}
              </label>
              <label>
                Hora (opcional)
                <input
                  type="time"
                  value={form.eventTime}
                  onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                />
              </label>

              <label className="admin-field-full">
                Lugar (opcional)
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ej. Auditorio principal, Koinonía"
                />
              </label>

              <label className="admin-field-full">
                Imagen o afiche (opcional)
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageSelect} />
              </label>
              {uploading && <p className="admin-subtitle" style={{ margin: '-8px 0 0' }}>Subiendo imagen…</p>}
              {uploadError && <p className="admin-field-error">{uploadError}</p>}
              {form.imageUrl && !uploading && (
                <div className="admin-field-full event-image-preview">
                  <img src={form.imageUrl} alt="Vista previa del afiche" />
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setForm({ ...form, imageUrl: '' })}>
                    Quitar imagen
                  </button>
                </div>
              )}

              <label>
                Texto del botón (opcional)
                <input
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                  placeholder="Ej. Registrarme"
                />
              </label>
              <label>
                Enlace del botón (opcional)
                <input
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="https://…"
                />
              </label>

              {formError && <p className="admin-form-error">{formError}</p>}

              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting || uploading}>
                  {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear evento'}
                </button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="admin-list-title">Eventos ({events.length})</p>
        {loadingList && <p className="admin-subtitle">Cargando…</p>}
        {!loadingList && events.length === 0 && (
          <div className="admin-empty">Todavía no has creado ningún evento.</div>
        )}
        {!loadingList && events.length > 0 && (
          <div className="admin-grid">
            {events.map((event) => (
              <div key={event.id} className="admin-card">
                {isPast(event.eventDate) && <span className="admin-status-badge admin-status-finished">Pasado</span>}
                <p className="admin-card-title">{event.title}</p>
                <p className="admin-card-meta">
                  {formatDate(event.eventDate)}
                  {event.eventTime ? ` · ${event.eventTime}` : ''}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
                <div className="admin-card-actions">
                  <button type="button" onClick={() => startEdit(event)}>Editar</button>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDelete(event)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
