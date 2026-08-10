import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import { ApiError, type ApiWorkshop, type WorkshopInput } from '../lib/api';

type FieldErrors = Record<string, string[] | undefined>;

const STATUS_LABEL: Record<ApiWorkshop['status'], string> = {
  available: 'Disponible',
  locked: 'Bloqueado',
  upcoming: 'Próximamente',
  finished: 'Finalizado',
};

const emptyForm: WorkshopInput = {
  title: '',
  description: '',
  coverImageUrl: '',
  priceCents: 0,
  eventDate: '',
  eventTime: '',
  durationMinutes: undefined,
  modality: undefined,
  instructorName: '',
  videoUrl: '',
  pdfUrl: '',
  status: 'upcoming',
};

function formatPrice(cents: number) {
  if (cents <= 0) return 'Gratis';
  return `$${cents.toLocaleString('es-CO')} COP`;
}

export default function AdminWorkshops() {
  const [workshops, setWorkshops] = useState<ApiWorkshop[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkshopInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadWorkshops() {
    setLoadingList(true);
    api
      .listWorkshops()
      .then((res) => setWorkshops(res.workshops))
      .catch(() => setWorkshops([]))
      .finally(() => setLoadingList(false));
  }

  useEffect(loadWorkshops, []);

  function startEdit(workshop: ApiWorkshop) {
    setEditingId(workshop.id);
    setForm({
      title: workshop.title,
      description: workshop.description,
      coverImageUrl: workshop.coverImageUrl ?? '',
      priceCents: workshop.priceCents,
      eventDate: workshop.eventDate ?? '',
      eventTime: workshop.eventTime ?? '',
      durationMinutes: workshop.durationMinutes ?? undefined,
      modality: workshop.modality ?? undefined,
      instructorName: workshop.instructorName ?? '',
      videoUrl: workshop.videoUrl ?? '',
      pdfUrl: workshop.pdfUrl ?? '',
      status: workshop.status,
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

    const payload: WorkshopInput = {
      ...form,
      coverImageUrl: form.coverImageUrl || undefined,
      instructorName: form.instructorName || undefined,
      description: form.description || undefined,
      eventDate: form.eventDate || undefined,
      eventTime: form.eventTime || undefined,
      videoUrl: form.videoUrl || undefined,
      pdfUrl: form.pdfUrl || undefined,
    };

    try {
      if (editingId) {
        await api.updateWorkshop(editingId, payload);
      } else {
        await api.createWorkshop(payload);
      }
      cancelEdit();
      loadWorkshops();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues) {
        setFieldErrors(err.issues);
      } else {
        setFormError('No se pudo guardar el taller. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(workshop: ApiWorkshop) {
    if (!confirm(`¿Eliminar el taller "${workshop.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteWorkshop(workshop.id);
      if (editingId === workshop.id) cancelEdit();
      loadWorkshops();
    } catch {
      alert('No se pudo eliminar el taller.');
    }
  }

  return (
    <AppShell>
      <div className="admin-main">
        <h1>Gestión de talleres</h1>
        <p className="admin-subtitle">Crea, edita y publica los talleres que verán los estudiantes.</p>

        {!formOpen && (
          <button type="button" className="admin-btn admin-btn-primary admin-new-btn" onClick={() => setFormOpen(true)}>
            + Nuevo taller
          </button>
        )}

        {formOpen && (
        <div className="admin-form-card">
          <p className="admin-form-title">
            {editingId ? 'Editar taller' : 'Nuevo taller'}
          </p>
          <form onSubmit={handleSubmit} className="admin-form">
            <label className="admin-field-full">
              Título
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {fieldErrors.title?.map((m) => <p key={m} className="admin-field-error">{m}</p>)}
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
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                value={form.eventTime}
                onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
              />
            </label>

            <label>
              Duración (minutos)
              <input
                type="number"
                min={0}
                value={form.durationMinutes ?? ''}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
            <label>
              Modalidad
              <select
                value={form.modality ?? ''}
                onChange={(e) =>
                  setForm({ ...form, modality: (e.target.value || undefined) as WorkshopInput['modality'] })
                }
              >
                <option value="">Sin definir</option>
                <option value="online">En línea</option>
                <option value="presencial">Presencial</option>
              </select>
            </label>

            <label>
              Instructor
              <input
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
              />
            </label>
            <label>
              Precio (COP, 0 = gratis)
              <input
                type="number"
                min={0}
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
              />
            </label>

            <label>
              URL de imagen de portada
              <input
                value={form.coverImageUrl}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label>
              Estado
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ApiWorkshop['status'] })}
              >
                <option value="upcoming">Próximamente</option>
                <option value="available">Disponible</option>
                <option value="locked">Bloqueado</option>
                <option value="finished">Finalizado</option>
              </select>
            </label>

            <label>
              URL de video (opcional)
              <input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label>
              URL de PDF (opcional)
              <input
                value={form.pdfUrl}
                onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                placeholder="https://…"
              />
            </label>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear taller'}
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
        )}

        <p className="admin-list-title">Talleres existentes ({workshops.length})</p>
        {loadingList && <p className="admin-subtitle">Cargando…</p>}
        {!loadingList && workshops.length === 0 && (
          <div className="admin-empty">Todavía no has creado ningún taller.</div>
        )}
        {!loadingList && workshops.length > 0 && (
          <div className="admin-grid">
            {workshops.map((workshop) => (
              <div key={workshop.id} className="admin-card">
                <span className={`admin-status-badge admin-status-${workshop.status}`}>
                  {STATUS_LABEL[workshop.status]}
                </span>
                <p className="admin-card-title">{workshop.title}</p>
                <p className="admin-card-meta">
                  {workshop.eventDate || 'Sin fecha'} · {formatPrice(workshop.priceCents)}
                </p>
                <div className="admin-card-actions">
                  <button type="button" onClick={() => startEdit(workshop)}>Editar</button>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDelete(workshop)}>
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
