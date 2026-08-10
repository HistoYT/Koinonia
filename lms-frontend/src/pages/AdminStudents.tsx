import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import type { ApiStudent, ApiCourse, ApiEnrollment } from '../lib/api';

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StudentCard({
  student,
  courses,
  enrollments,
  onChange,
}: {
  student: ApiStudent;
  courses: ApiCourse[];
  enrollments: ApiEnrollment[];
  onChange: () => void;
}) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [busy, setBusy] = useState(false);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const availableCourses = courses.filter((c) => !enrolledCourseIds.has(c.id));

  async function handleDelete() {
    if (
      !confirm(
        `¿Eliminar a ${student.firstName} ${student.lastName}? Esta acción no se puede deshacer y borrará su progreso e inscripciones.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api.deleteStudent(student.id);
      onChange();
    } catch {
      alert('No se pudo eliminar al estudiante.');
      setBusy(false);
    }
  }

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    if (!selectedCourseId) return;
    setBusy(true);
    try {
      await api.enrollStudent({ userId: student.id, courseId: selectedCourseId });
      setSelectedCourseId('');
      setEnrollOpen(false);
      onChange();
    } catch {
      alert('No se pudo inscribir al estudiante en el curso.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnenroll(enrollment: ApiEnrollment) {
    if (!confirm(`¿Quitar la inscripción de "${enrollment.courseTitle}"?`)) return;
    setBusy(true);
    try {
      await api.unenrollStudent(enrollment.id);
      onChange();
    } catch {
      alert('No se pudo quitar la inscripción.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="student-card">
      <div className="student-card-head">
        <div>
          <p className="admin-card-title">
            {student.firstName} {student.lastName}
          </p>
          <p className="admin-card-meta">
            {student.email} · {student.phone || 'Sin teléfono'}
          </p>
        </div>
        <span className={`admin-status-badge admin-status-${student.status === 'active' ? 'published' : 'locked'}`}>
          {student.status === 'active' ? 'Activo' : 'Suspendido'}
        </span>
      </div>

      <p className="student-registered">Registrado el {formatDate(student.createdAt)}</p>

      <div className="student-courses">
        <p className="student-courses-label">Cursos inscritos</p>

        {enrollments.length > 0 && (
          <div className="student-course-chips">
            {enrollments.map((enr) => (
              <span key={enr.id} className="student-course-chip">
                {enr.courseTitle}
                <button
                  type="button"
                  onClick={() => handleUnenroll(enr)}
                  disabled={busy}
                  aria-label={`Quitar ${enr.courseTitle}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {enrollOpen ? (
          <form onSubmit={handleEnroll} className="student-enroll-form">
            <select
              required
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un curso…
              </option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !selectedCourseId}>
              Inscribir
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEnrollOpen(false)}>
              Cancelar
            </button>
          </form>
        ) : availableCourses.length > 0 ? (
          <button type="button" className="admin-add-btn" onClick={() => setEnrollOpen(true)}>
            + Inscribir en curso
          </button>
        ) : (
          enrollments.length === 0 && <p className="student-no-courses">Todavía no hay cursos creados.</p>
        )}
      </div>

      <div className="student-card-actions">
        <button type="button" className="admin-delete-btn" onClick={handleDelete} disabled={busy}>
          Eliminar estudiante
        </button>
      </div>
    </div>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    setLoading(true);
    Promise.all([api.listStudents(), api.listCourses(), api.listEnrollments()])
      .then(([studentsRes, coursesRes, enrollmentsRes]) => {
        setStudents(studentsRes.students);
        setCourses(coursesRes.courses);
        setEnrollments(enrollmentsRes.enrollments);
      })
      .catch(() => {
        setStudents([]);
        setCourses([]);
        setEnrollments([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  return (
    <AppShell>
      <div className="admin-main">
        <h1>Estudiantes</h1>
        <p className="admin-subtitle">
          Todas las personas registradas en la Escuela de LideresVIP ({students.length}).
        </p>

        {loading && <p className="admin-subtitle">Cargando…</p>}

        {!loading && students.length === 0 && (
          <div className="admin-empty">Todavía no hay estudiantes registrados.</div>
        )}

        {!loading && students.length > 0 && (
          <div className="student-list">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                courses={courses}
                enrollments={enrollments.filter((e) => e.userId === student.id)}
                onChange={loadAll}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
