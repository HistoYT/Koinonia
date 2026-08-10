import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import type { ApiCourse, ApiWorkshop } from '../lib/api';
import './Dashboard.css';
import './Catalog.css';

const WORKSHOP_STATUS_LABEL: Record<ApiWorkshop['status'], string> = {
  available: 'Disponible',
  locked: 'Bloqueado',
  upcoming: 'Próximamente',
  finished: 'Finalizado',
};

function formatPrice(cents: number) {
  if (cents <= 0) return 'Gratis';
  return `$${cents.toLocaleString('es-CO')} COP`;
}

function groupByCategory(courses: ApiCourse[]) {
  const groups = new Map<string, ApiCourse[]>();
  for (const course of courses) {
    const key = course.category?.trim() || 'Otros cursos';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(course);
  }
  return groups;
}

export default function Catalog() {
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [workshops, setWorkshops] = useState<ApiWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([api.listCourses(), api.listWorkshops()])
      .then(([coursesRes, workshopsRes]) => {
        setCourses(coursesRes.courses);
        setWorkshops(workshopsRes.workshops);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByCategory(courses);

  return (
    <AppShell>
      <div className="catalog-main">
        <h1>Cursos y talleres</h1>
        <p className="dash-subtitle">Todo lo que Koinonía tiene disponible para tu formación.</p>

        {loading && <p className="dash-subtitle">Cargando…</p>}

        {!loading && error && (
          <div className="dash-empty-state">
            <p className="dash-empty-title">No se pudieron cargar los cursos y talleres</p>
            <p className="dash-empty-hint">
              Ocurrió un problema al conectar con el servidor. Intenta recargar la página en unos
              segundos.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="catalog-section">
              <h2 className="catalog-section-title">Cursos</h2>
              {courses.length === 0 && (
                <div className="dash-empty-state">
                  <p className="dash-empty-title">Todavía no hay cursos publicados</p>
                  <p className="dash-empty-hint">Vuelve pronto — el equipo de Koinonía está preparando contenido.</p>
                </div>
              )}
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category} className="catalog-group">
                  <h3 className="catalog-group-title">{category}</h3>
                  <div className="catalog-grid">
                    {items.map((course) => (
                      <article key={course.id} className="catalog-card">
                        {course.coverImageUrl && (
                          <img src={course.coverImageUrl} alt={course.title} className="catalog-card-image" />
                        )}
                        <div className="catalog-card-body">
                          <p className="catalog-card-title">{course.title}</p>
                          {course.instructorName && (
                            <p className="catalog-card-instructor">Con {course.instructorName}</p>
                          )}
                          {course.description && <p className="catalog-card-desc">{course.description}</p>}
                          <span className="catalog-price-badge">{formatPrice(course.priceCents)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="catalog-section">
              <h2 className="catalog-section-title">Talleres</h2>
              {workshops.length === 0 && (
                <div className="dash-empty-state">
                  <p className="dash-empty-title">Todavía no hay talleres programados</p>
                  <p className="dash-empty-hint">Vuelve pronto — el equipo de Koinonía está preparando contenido.</p>
                </div>
              )}
              {workshops.length > 0 && (
                <div className="catalog-grid">
                  {workshops.map((workshop) => (
                    <article key={workshop.id} className="catalog-card">
                      {workshop.coverImageUrl && (
                        <img src={workshop.coverImageUrl} alt={workshop.title} className="catalog-card-image" />
                      )}
                      <div className="catalog-card-body">
                        <span className={`admin-status-badge admin-status-${workshop.status}`}>
                          {WORKSHOP_STATUS_LABEL[workshop.status]}
                        </span>
                        <p className="catalog-card-title">{workshop.title}</p>
                        <p className="catalog-card-instructor">
                          {[workshop.eventDate, workshop.eventTime].filter(Boolean).join(' · ') || 'Fecha por confirmar'}
                        </p>
                        {workshop.description && <p className="catalog-card-desc">{workshop.description}</p>}
                        <span className="catalog-price-badge">{formatPrice(workshop.priceCents)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
