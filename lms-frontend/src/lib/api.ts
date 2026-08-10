export type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
};

export type ApiStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
};

export class ApiError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;

  constructor(status: number, code: string, issues?: Record<string, string[] | undefined>) {
    super(code);
    this.status = status;
    this.issues = issues;
  }
}

async function requestUrl<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'request_failed', data?.issues);
  }

  return data as T;
}

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestUrl<T>(`/api/lms${path}`, options);
}

export function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return request<{ user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logout() {
  return request<{ ok: true }>('/auth/logout', { method: 'POST' });
}

export function me() {
  return request<{ user: ApiUser }>('/auth/me');
}

// ---------- Cursos ----------

export type ApiCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string | null;
  category: string | null;
  priceCents: number;
  durationMinutes: number | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: number;
  updatedAt: number;
};

export type CourseInput = {
  title: string;
  description?: string;
  coverImageUrl?: string;
  instructorName?: string;
  category?: string;
  priceCents?: number;
  durationMinutes?: number;
  status?: ApiCourse['status'];
};

export function listCourses() {
  return request<{ courses: ApiCourse[] }>('/courses');
}

export function getCourse(id: string) {
  return request<{ course: ApiCourse }>(`/courses/${id}`);
}

export function createCourse(input: CourseInput) {
  return request<{ course: ApiCourse }>('/courses', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCourse(id: string, input: Partial<CourseInput>) {
  return request<{ course: ApiCourse }>(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteCourse(id: string) {
  return request<{ ok: true }>(`/courses/${id}`, { method: 'DELETE' });
}

// ---------- Talleres ----------

export type ApiWorkshop = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  priceCents: number;
  eventDate: string | null;
  eventTime: string | null;
  durationMinutes: number | null;
  modality: 'online' | 'presencial' | null;
  instructorName: string | null;
  videoUrl: string | null;
  pdfUrl: string | null;
  status: 'available' | 'locked' | 'upcoming' | 'finished';
  createdAt: number;
  updatedAt: number;
};

export type WorkshopInput = {
  title: string;
  description?: string;
  coverImageUrl?: string;
  priceCents?: number;
  eventDate?: string;
  eventTime?: string;
  durationMinutes?: number;
  modality?: 'online' | 'presencial';
  instructorName?: string;
  videoUrl?: string;
  pdfUrl?: string;
  status?: ApiWorkshop['status'];
};

export function listWorkshops() {
  return request<{ workshops: ApiWorkshop[] }>('/workshops');
}

export function createWorkshop(input: WorkshopInput) {
  return request<{ workshop: ApiWorkshop }>('/workshops', { method: 'POST', body: JSON.stringify(input) });
}

export function updateWorkshop(id: string, input: Partial<WorkshopInput>) {
  return request<{ workshop: ApiWorkshop }>(`/workshops/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteWorkshop(id: string) {
  return request<{ ok: true }>(`/workshops/${id}`, { method: 'DELETE' });
}

// ---------- Estudiantes (solo admin) ----------

export function listStudents() {
  return request<{ students: ApiStudent[] }>('/users/students');
}

export function deleteStudent(id: string) {
  return request<{ ok: true }>(`/users/${id}`, { method: 'DELETE' });
}

// ---------- Inscripciones (solo admin) ----------

export type ApiEnrollment = {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  accessStatus: 'locked' | 'active' | 'revoked';
  paymentStatus: 'pending' | 'paid' | 'rejected' | 'cancelled';
  requestedAt: string;
  activatedAt: string | null;
};

export function listEnrollments() {
  return request<{ enrollments: ApiEnrollment[] }>('/enrollments');
}

export function enrollStudent(input: { userId: string; courseId: string }) {
  return request<{ enrollment: ApiEnrollment }>('/enrollments', { method: 'POST', body: JSON.stringify(input) });
}

export function unenrollStudent(enrollmentId: string) {
  return request<{ ok: true }>(`/enrollments/${enrollmentId}`, { method: 'DELETE' });
}

// ---------- Contenido del curso: módulos y lecciones (solo admin) ----------

export type ApiLesson = {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  contentType: 'video' | 'text' | 'pdf' | 'mixed';
  videoUrl: string | null;
  textContent: string | null;
  pdfUrl: string | null;
  createdAt: string;
};

export type ApiModule = {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  lessons: ApiLesson[];
};

export type LessonInput = {
  moduleId: string;
  title: string;
  contentType?: ApiLesson['contentType'];
  videoUrl?: string;
  textContent?: string;
  pdfUrl?: string;
};

export function listModules(courseId: string) {
  return request<{ modules: ApiModule[] }>(`/modules?courseId=${encodeURIComponent(courseId)}`);
}

export function createModule(input: { courseId: string; title: string }) {
  return request<{ module: ApiModule }>('/modules', { method: 'POST', body: JSON.stringify(input) });
}

export function updateModule(id: string, input: { title?: string; orderIndex?: number }) {
  return request<{ module: ApiModule }>(`/modules/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteModule(id: string) {
  return request<{ ok: true }>(`/modules/${id}`, { method: 'DELETE' });
}

export function createLesson(input: LessonInput) {
  return request<{ lesson: ApiLesson }>('/lessons', { method: 'POST', body: JSON.stringify(input) });
}

export function updateLesson(id: string, input: Partial<Omit<LessonInput, 'moduleId'>>) {
  return request<{ lesson: ApiLesson }>(`/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteLesson(id: string) {
  return request<{ ok: true }>(`/lessons/${id}`, { method: 'DELETE' });
}

// ---------- Tests del curso: preguntas y respuestas (solo admin) ----------

export type ApiQuizOption = {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
};

export type ApiQuizQuestion = {
  id: string;
  quizId: string;
  prompt: string;
  orderIndex: number;
  createdAt: string;
  options: ApiQuizOption[];
};

export type ApiQuiz = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  questions: ApiQuizQuestion[];
};

export type QuizOptionInput = { text: string; isCorrect: boolean };

export function listQuizzes(courseId: string) {
  return request<{ quizzes: ApiQuiz[] }>(`/quizzes?courseId=${encodeURIComponent(courseId)}`);
}

export function createQuiz(input: { courseId: string; title: string; description?: string }) {
  return request<{ quiz: ApiQuiz }>('/quizzes', { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuiz(id: string, input: { title?: string; description?: string }) {
  return request<{ quiz: ApiQuiz }>(`/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteQuiz(id: string) {
  return request<{ ok: true }>(`/quizzes/${id}`, { method: 'DELETE' });
}

export function createQuizQuestion(input: { quizId: string; prompt: string; options: QuizOptionInput[] }) {
  return request<{ question: ApiQuizQuestion }>('/quiz-questions', { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuizQuestion(id: string, input: { prompt?: string; options?: QuizOptionInput[] }) {
  return request<{ question: ApiQuizQuestion }>(`/quiz-questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteQuizQuestion(id: string) {
  return request<{ ok: true }>(`/quiz-questions/${id}`, { method: 'DELETE' });
}

// ---------- Eventos del sitio (agenda pública, no es un recurso de /lms) ----------

export type ApiEvent = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventInput = {
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function listEvents() {
  return requestUrl<{ events: ApiEvent[] }>('/api/events');
}

export function createEvent(input: EventInput) {
  return requestUrl<{ event: ApiEvent }>('/api/events', { method: 'POST', body: JSON.stringify(input) });
}

export function updateEvent(id: string, input: Partial<EventInput>) {
  return requestUrl<{ event: ApiEvent }>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteEvent(id: string) {
  return requestUrl<{ ok: true }>(`/api/events/${id}`, { method: 'DELETE' });
}

// ---------- Subida de archivos (afiches de eventos) ----------

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  // Sin cabecera Content-Type manual: el navegador arma el boundary del
  // multipart automáticamente. Por eso no reutiliza requestUrl (fuerza JSON).
  const res = await fetch('/api/uploads', { method: 'POST', body: formData, credentials: 'include' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'request_failed');
  }

  return data as { url: string };
}
