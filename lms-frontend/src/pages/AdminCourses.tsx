import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import { ApiError, type ApiCourse, type CourseInput } from '../lib/api';

type FieldErrors = Record<string, string[] | undefined>;

const STATUS_LABEL: Record<ApiCourse['status'], string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

const emptyForm: CourseInput = {
  title: '',
  description: '',
  coverImageUrl: '',
  instructorName: '',
  category: '',
  priceCents: 0,
  durationMinutes: undefined,
  status: 'draft',
};

function formatPrice(cents: number) {
  if (cents <= 0) return 'Gratis';
  return `$${cents.toLocaleString('es-CO')} COP`;
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadCourses() {
    setLoadingList(true);
    api
      .listCourses()
      .then((res) => setCourses(res.courses))
      .catch(() => setCourses([]))
      .finally(() => setLoadingList(false));
  }

  useEffect(loadCourses, []);

  function startEdit(course: ApiCourse) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl ?? '',
      instructorName: course.instructorName ?? '',
      category: course.category ?? '',
      priceCents: course.priceCents,
      durationMinutes: course.durationMinutes ?? undefined,
      status: course.status,
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

    const payload: CourseInput = {
      ...form,
      coverImageUrl: form.coverImageUrl || undefined,
      instructorName: form.instructorName || undefined,
      category: form.category || undefined,
      description: form.description || undefined,
    };

    try {
      if (editingId) {
        await api.updateCourse(editingId, payload);
      } else {
        await api.createCourse(payload);
      }
      cancelEdit();
      loadCourses();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues) {
        setFieldErrors(err.issues);
      } else {
        setFormError('No se pudo guardar el curso. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(course: ApiCourse) {
    if (!confirm(`¿Eliminar el curso "${course.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteCourse(course.id);
      if (editingId === course.id) cancelEdit();
      loadCourses();
    } catch {
      alert('No se pudo eliminar el curso.');
    }
  }

  return (
    <AppShell>
      <div className="admin-main">
        <h1>Gestión de cursos</h1>
        <p className="admin-subtitle">Crea, edita y publica los cursos que verán los estudiantes.</p>

        {!formOpen && (
          <button type="button" className="admin-btn admin-btn-primary admin-new-btn" onClick={() => setFormOpen(true)}>
            + Nuevo curso
          </button>
        )}

        {formOpen && (
        <div className="admin-form-card">
          <p className="admin-form-title">
            {editingId ? 'Editar curso' : 'Nuevo curso'}
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
              Categoría
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ej. Liderazgo"
              />
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
                onChange={(e) => setForm({ ...form, status: e.target.value as ApiCourse['status'] })}
              >
                <option value="draft">Borrador (oculto)</option>
                <option value="published">Publicado (visible)</option>
                <option value="archived">Archivado</option>
              </select>
            </label>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear curso'}
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
        )}

        <p className="admin-list-title">Cursos existentes ({courses.length})</p>
        {loadingList && <p className="admin-subtitle">Cargando…</p>}
        {!loadingList && courses.length === 0 && (
          <div className="admin-empty">Todavía no has creado ningún curso.</div>
        )}
        {!loadingList && courses.length > 0 && (
          <div className="admin-grid">
            {courses.map((course) => (
              <div key={course.id} className="admin-card">
                <span className={`admin-status-badge admin-status-${course.status}`}>
                  {STATUS_LABEL[course.status]}
                </span>
                <p className="admin-card-title">{course.title}</p>
                <p className="admin-card-meta">
                  {course.category || 'Sin categoría'} · {formatPrice(course.priceCents)}
                </p>
                <div className="admin-card-actions">
                  <button type="button" onClick={() => startEdit(course)}>Editar</button>
                  <Link to={`/admin/courses/${course.id}/content`}>Contenido y tests</Link>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDelete(course)}>
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
