import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import * as api from '../lib/api';
import {
  type ApiCourse,
  type ApiModule,
  type ApiLesson,
  type ApiQuiz,
  type ApiQuizQuestion,
  type QuizOptionInput,
} from '../lib/api';
import './AdminCourseContent.css';

const CONTENT_TYPE_LABEL: Record<ApiLesson['contentType'], string> = {
  video: 'Video',
  text: 'Texto',
  pdf: 'PDF',
  mixed: 'Mixto',
};

// ---------- Formulario de lección (crear o editar) ----------

type LessonFormValue = {
  title: string;
  contentType: ApiLesson['contentType'];
  videoUrl: string;
  textContent: string;
  pdfUrl: string;
};

const emptyLessonForm: LessonFormValue = {
  title: '',
  contentType: 'text',
  videoUrl: '',
  textContent: '',
  pdfUrl: '',
};

function LessonForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: LessonFormValue;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (value: LessonFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch {
      setError('No se pudo guardar el archivo. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-inline-form">
      <input
        required
        placeholder="Título de la lección o archivo"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <select
        value={form.contentType}
        onChange={(e) => setForm({ ...form, contentType: e.target.value as ApiLesson['contentType'] })}
      >
        <option value="text">Texto</option>
        <option value="video">Video</option>
        <option value="pdf">PDF</option>
        <option value="mixed">Mixto</option>
      </select>

      {(form.contentType === 'video' || form.contentType === 'mixed') && (
        <input
          placeholder="URL del video (YouTube no listado, Vimeo, etc.)"
          value={form.videoUrl}
          onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
        />
      )}
      {(form.contentType === 'pdf' || form.contentType === 'mixed') && (
        <input
          placeholder="URL del PDF"
          value={form.pdfUrl}
          onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
        />
      )}
      {(form.contentType === 'text' || form.contentType === 'mixed') && (
        <textarea
          placeholder="Contenido en texto"
          value={form.textContent}
          onChange={(e) => setForm({ ...form, textContent: e.target.value })}
        />
      )}

      {error && <p className="admin-form-error">{error}</p>}

      <div className="cc-inline-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
          {submitting ? 'Guardando…' : submitLabel}
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------- Formulario de pregunta (crear o editar) ----------

type QuestionFormValue = {
  prompt: string;
  options: QuizOptionInput[];
};

const emptyQuestionForm: QuestionFormValue = {
  prompt: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
};

function QuestionForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: QuestionFormValue;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (value: QuestionFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOptionText(index: number, text: string) {
    setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, text } : o)) });
  }

  function setCorrect(index: number) {
    setForm({ ...form, options: form.options.map((o, i) => ({ ...o, isCorrect: i === index })) });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, { text: '', isCorrect: false }] });
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;
    const removedWasCorrect = form.options[index].isCorrect;
    const rest = form.options.filter((_, i) => i !== index);
    if (removedWasCorrect) rest[0] = { ...rest[0], isCorrect: true };
    setForm({ ...form, options: rest });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.options.some((o) => !o.text.trim())) {
      setError('Completa el texto de todas las respuestas.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch {
      setError('No se pudo guardar la pregunta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-inline-form cc-question-form">
      <textarea
        required
        placeholder="Escribe la pregunta"
        value={form.prompt}
        onChange={(e) => setForm({ ...form, prompt: e.target.value })}
      />

      <p className="cc-options-hint">Marca cuál respuesta es la correcta:</p>
      {form.options.map((option, index) => (
        <div className="cc-option-row" key={index}>
          <input
            type="radio"
            name="correct-option"
            checked={option.isCorrect}
            onChange={() => setCorrect(index)}
            aria-label="Marcar como respuesta correcta"
          />
          <input
            required
            placeholder={`Respuesta ${index + 1}`}
            value={option.text}
            onChange={(e) => updateOptionText(index, e.target.value)}
          />
          {form.options.length > 2 && (
            <button type="button" className="cc-remove-option" onClick={() => removeOption(index)} aria-label="Quitar respuesta">
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="admin-btn admin-btn-ghost cc-add-option-btn" onClick={addOption}>
        + Agregar respuesta
      </button>

      {error && <p className="admin-form-error">{error}</p>}

      <div className="cc-inline-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
          {submitting ? 'Guardando…' : submitLabel}
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------- Página principal ----------

export default function AdminCourseContent() {
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleEditTitle, setModuleEditTitle] = useState('');
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizEditForm, setQuizEditForm] = useState({ title: '', description: '' });
  const [activeQuizForQuestion, setActiveQuizForQuestion] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  function loadAll() {
    if (!courseId) return;
    setLoading(true);
    Promise.all([api.getCourse(courseId), api.listModules(courseId), api.listQuizzes(courseId)])
      .then(([courseRes, modulesRes, quizzesRes]) => {
        setCourse(courseRes.course);
        setModules(modulesRes.modules);
        setQuizzes(quizzesRes.quizzes);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [courseId]);

  if (!courseId) return null;

  // ---- Módulos ----

  async function handleCreateModule(e: FormEvent) {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    await api.createModule({ courseId: courseId!, title: moduleTitle.trim() });
    setModuleTitle('');
    setModuleFormOpen(false);
    loadAll();
  }

  function startEditModule(mod: ApiModule) {
    setEditingModuleId(mod.id);
    setModuleEditTitle(mod.title);
  }

  async function saveModuleEdit(mod: ApiModule) {
    if (!moduleEditTitle.trim()) return;
    await api.updateModule(mod.id, { title: moduleEditTitle.trim() });
    setEditingModuleId(null);
    loadAll();
  }

  async function handleDeleteModule(mod: ApiModule) {
    if (!confirm(`¿Eliminar el módulo "${mod.title}" y todas sus lecciones? Esta acción no se puede deshacer.`)) return;
    await api.deleteModule(mod.id);
    loadAll();
  }

  async function handleDeleteLesson(lesson: ApiLesson) {
    if (!confirm(`¿Eliminar la lección "${lesson.title}"? Esta acción no se puede deshacer.`)) return;
    await api.deleteLesson(lesson.id);
    loadAll();
  }

  // ---- Tests ----

  async function handleCreateQuiz(e: FormEvent) {
    e.preventDefault();
    if (!quizTitle.trim()) return;
    await api.createQuiz({ courseId: courseId!, title: quizTitle.trim(), description: quizDescription.trim() || undefined });
    setQuizTitle('');
    setQuizDescription('');
    setQuizFormOpen(false);
    loadAll();
  }

  function startEditQuiz(quiz: ApiQuiz) {
    setEditingQuizId(quiz.id);
    setQuizEditForm({ title: quiz.title, description: quiz.description });
  }

  async function saveQuizEdit(quiz: ApiQuiz) {
    if (!quizEditForm.title.trim()) return;
    await api.updateQuiz(quiz.id, { title: quizEditForm.title.trim(), description: quizEditForm.description });
    setEditingQuizId(null);
    loadAll();
  }

  async function handleDeleteQuiz(quiz: ApiQuiz) {
    if (!confirm(`¿Eliminar el test "${quiz.title}" y todas sus preguntas? Esta acción no se puede deshacer.`)) return;
    await api.deleteQuiz(quiz.id);
    loadAll();
  }

  async function handleDeleteQuestion(question: ApiQuizQuestion) {
    if (!confirm('¿Eliminar esta pregunta? Esta acción no se puede deshacer.')) return;
    await api.deleteQuizQuestion(question.id);
    loadAll();
  }

  return (
    <AppShell>
      <div className="admin-main">
        <Link to="/admin/courses" className="cc-back-link">← Volver a cursos</Link>
        <h1>{loading ? 'Cargando…' : course?.title}</h1>
        <p className="admin-subtitle">Contenido del curso y tests de evaluación.</p>

        {!loading && (
          <>
            {/* ---------- Módulos y lecciones ---------- */}
            <section className="cc-section">
              <div className="cc-section-head">
                <h2>Módulos y lecciones</h2>
                {!moduleFormOpen && (
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => setModuleFormOpen(true)}>
                    + Nuevo módulo
                  </button>
                )}
              </div>
              <p className="admin-subtitle">
                Cada módulo agrupa lecciones/archivos en orden. Se irán desbloqueando para el estudiante a medida
                que avance en el curso.
              </p>

              {moduleFormOpen && (
                <form onSubmit={handleCreateModule} className="cc-inline-form">
                  <input
                    required
                    autoFocus
                    placeholder="Título del módulo"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                  />
                  <div className="cc-inline-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary">Crear módulo</button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => {
                        setModuleFormOpen(false);
                        setModuleTitle('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {modules.length === 0 && <div className="admin-empty">Todavía no hay módulos en este curso.</div>}

              <div className="cc-module-list">
                {modules.map((mod, modIndex) => (
                  <div className="cc-module-card" key={mod.id}>
                    <div className="cc-module-head">
                      <span className="cc-order-badge">{modIndex + 1}</span>
                      {editingModuleId === mod.id ? (
                        <div className="cc-inline-edit">
                          <input value={moduleEditTitle} onChange={(e) => setModuleEditTitle(e.target.value)} autoFocus />
                          <button type="button" className="admin-btn admin-btn-primary" onClick={() => saveModuleEdit(mod)}>
                            Guardar
                          </button>
                          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditingModuleId(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="cc-module-title">{mod.title}</span>
                          <div className="cc-module-actions">
                            <button type="button" onClick={() => startEditModule(mod)}>Editar</button>
                            <button type="button" className="admin-delete-btn" onClick={() => handleDeleteModule(mod)}>
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="cc-lesson-list">
                      {mod.lessons.map((lesson, lessonIndex) =>
                        editingLessonId === lesson.id ? (
                          <LessonForm
                            key={lesson.id}
                            submitLabel="Guardar cambios"
                            initial={{
                              title: lesson.title,
                              contentType: lesson.contentType,
                              videoUrl: lesson.videoUrl ?? '',
                              textContent: lesson.textContent ?? '',
                              pdfUrl: lesson.pdfUrl ?? '',
                            }}
                            onCancel={() => setEditingLessonId(null)}
                            onSubmit={async (value) => {
                              await api.updateLesson(lesson.id, value);
                              setEditingLessonId(null);
                              loadAll();
                            }}
                          />
                        ) : (
                          <div className="cc-lesson-row" key={lesson.id}>
                            <span className="cc-order-badge cc-order-badge-sm">{lessonIndex + 1}</span>
                            <span className="cc-lesson-type">{CONTENT_TYPE_LABEL[lesson.contentType]}</span>
                            <span className="cc-lesson-title">{lesson.title}</span>
                            <div className="cc-lesson-actions">
                              <button type="button" onClick={() => setEditingLessonId(lesson.id)}>Editar</button>
                              <button type="button" className="admin-delete-btn" onClick={() => handleDeleteLesson(lesson)}>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ),
                      )}

                      {activeModuleForLesson === mod.id ? (
                        <LessonForm
                          initial={emptyLessonForm}
                          submitLabel="Agregar lección"
                          onCancel={() => setActiveModuleForLesson(null)}
                          onSubmit={async (value) => {
                            await api.createLesson({ moduleId: mod.id, ...value });
                            setActiveModuleForLesson(null);
                            loadAll();
                          }}
                        />
                      ) : (
                        <button type="button" className="cc-add-btn" onClick={() => setActiveModuleForLesson(mod.id)}>
                          + Agregar archivo o lección
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ---------- Tests ---------- */}
            <section className="cc-section">
              <div className="cc-section-head">
                <h2>Tests</h2>
                {!quizFormOpen && (
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => setQuizFormOpen(true)}>
                    + Nuevo test
                  </button>
                )}
              </div>
              <p className="admin-subtitle">Evalúa lo aprendido en el curso con preguntas de opción múltiple.</p>

              {quizFormOpen && (
                <form onSubmit={handleCreateQuiz} className="cc-inline-form">
                  <input
                    required
                    autoFocus
                    placeholder="Título del test"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="Descripción (opcional)"
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                  />
                  <div className="cc-inline-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary">Crear test</button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => {
                        setQuizFormOpen(false);
                        setQuizTitle('');
                        setQuizDescription('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {quizzes.length === 0 && <div className="admin-empty">Todavía no hay tests en este curso.</div>}

              <div className="cc-module-list">
                {quizzes.map((quiz) => (
                  <div className="cc-module-card" key={quiz.id}>
                    <div className="cc-module-head">
                      {editingQuizId === quiz.id ? (
                        <div className="cc-inline-edit cc-inline-edit-full">
                          <input
                            value={quizEditForm.title}
                            onChange={(e) => setQuizEditForm({ ...quizEditForm, title: e.target.value })}
                            autoFocus
                          />
                          <textarea
                            value={quizEditForm.description}
                            onChange={(e) => setQuizEditForm({ ...quizEditForm, description: e.target.value })}
                          />
                          <div className="cc-inline-form-actions">
                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => saveQuizEdit(quiz)}>
                              Guardar
                            </button>
                            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditingQuizId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="cc-module-title">{quiz.title}</span>
                          <div className="cc-module-actions">
                            <button type="button" onClick={() => startEditQuiz(quiz)}>Editar</button>
                            <button type="button" className="admin-delete-btn" onClick={() => handleDeleteQuiz(quiz)}>
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    {quiz.description && editingQuizId !== quiz.id && <p className="cc-quiz-description">{quiz.description}</p>}

                    <div className="cc-question-list">
                      {quiz.questions.map((question, qIndex) =>
                        editingQuestionId === question.id ? (
                          <QuestionForm
                            key={question.id}
                            submitLabel="Guardar cambios"
                            initial={{
                              prompt: question.prompt,
                              options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
                            }}
                            onCancel={() => setEditingQuestionId(null)}
                            onSubmit={async (value) => {
                              await api.updateQuizQuestion(question.id, value);
                              setEditingQuestionId(null);
                              loadAll();
                            }}
                          />
                        ) : (
                          <div className="cc-question-card" key={question.id}>
                            <div className="cc-question-card-head">
                              <span className="cc-order-badge cc-order-badge-sm">{qIndex + 1}</span>
                              <p className="cc-question-prompt">{question.prompt}</p>
                              <div className="cc-lesson-actions">
                                <button type="button" onClick={() => setEditingQuestionId(question.id)}>Editar</button>
                                <button type="button" className="admin-delete-btn" onClick={() => handleDeleteQuestion(question)}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                            <ul className="cc-option-list">
                              {question.options.map((option) => (
                                <li key={option.id} className={option.isCorrect ? 'cc-option-correct' : ''}>
                                  {option.isCorrect ? '✓ ' : ''}
                                  {option.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      )}

                      {activeQuizForQuestion === quiz.id ? (
                        <QuestionForm
                          initial={emptyQuestionForm}
                          submitLabel="Agregar pregunta"
                          onCancel={() => setActiveQuizForQuestion(null)}
                          onSubmit={async (value) => {
                            await api.createQuizQuestion({ quizId: quiz.id, ...value });
                            setActiveQuizForQuestion(null);
                            loadAll();
                          }}
                        />
                      ) : (
                        <button type="button" className="cc-add-btn" onClick={() => setActiveQuizForQuestion(quiz.id)}>
                          + Agregar pregunta
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
