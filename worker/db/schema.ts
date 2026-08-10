import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);
const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);

// ---------- EVENTOS DEL SITIO (agenda pública de Koinonía) ----------
export const events = sqliteTable('events', {
  id: id(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  eventDate: text('event_date').notNull(), // ISO date, ej. "2026-09-12"
  eventTime: text('event_time'), // ej. "18:30"
  location: text('location'),
  imageUrl: text('image_url'),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- USERS ----------
export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().$type<'admin' | 'user'>().default('user'),
  status: text('status').notNull().$type<'active' | 'suspended'>().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
});

// ---------- COURSES ----------
export const courses = sqliteTable('courses', {
  id: id(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  coverImageUrl: text('cover_image_url'),
  instructorName: text('instructor_name'),
  category: text('category'),
  priceCents: integer('price_cents').notNull().default(0), // 0 = gratuito
  durationMinutes: integer('duration_minutes'),
  status: text('status').notNull().$type<'draft' | 'published' | 'archived'>().default('draft'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const modules = sqliteTable('modules', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: createdAt(),
});

export const lessons = sqliteTable('lessons', {
  id: id(),
  moduleId: text('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  contentType: text('content_type').notNull().$type<'video' | 'text' | 'pdf' | 'mixed'>().default('text'),
  videoUrl: text('video_url'), // URL externa (YouTube no listado, Vimeo, etc.) — ver README sobre video
  textContent: text('text_content'),
  pdfUrl: text('pdf_url'),
  extraLinks: text('extra_links', { mode: 'json' }).$type<{ label: string; url: string }[]>(),
  createdAt: createdAt(),
});

// ---------- TESTS (quizzes de un curso) ----------
export const quizzes = sqliteTable('quizzes', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const quizQuestions = sqliteTable('quiz_questions', {
  id: id(),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: createdAt(),
});

export const quizOptions = sqliteTable('quiz_options', {
  id: id(),
  questionId: text('question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
});

// ---------- WORKSHOPS ----------
export const workshops = sqliteTable('workshops', {
  id: id(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  coverImageUrl: text('cover_image_url'),
  priceCents: integer('price_cents').notNull().default(0),
  eventDate: text('event_date'), // ISO date, ej. "2026-09-12"
  eventTime: text('event_time'), // ej. "18:30"
  durationMinutes: integer('duration_minutes'),
  modality: text('modality').$type<'online' | 'presencial'>(),
  instructorName: text('instructor_name'),
  videoUrl: text('video_url'),
  pdfUrl: text('pdf_url'),
  status: text('status').notNull().$type<'available' | 'locked' | 'upcoming' | 'finished'>().default('upcoming'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- ENROLLMENTS (acceso + pago) ----------
export const enrollments = sqliteTable('enrollments', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  accessStatus: text('access_status').notNull().$type<'locked' | 'active' | 'revoked'>().default('locked'),
  paymentStatus: text('payment_status').notNull().$type<'pending' | 'paid' | 'rejected' | 'cancelled'>().default('pending'),
  requestedAt: createdAt(),
  activatedAt: integer('activated_at', { mode: 'timestamp' }),
  activatedBy: text('activated_by').references(() => users.id),
});

export const workshopEnrollments = sqliteTable('workshop_enrollments', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workshopId: text('workshop_id').notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  accessStatus: text('access_status').notNull().$type<'locked' | 'active' | 'revoked'>().default('locked'),
  paymentStatus: text('payment_status').notNull().$type<'pending' | 'paid' | 'rejected' | 'cancelled'>().default('pending'),
  requestedAt: createdAt(),
  activatedAt: integer('activated_at', { mode: 'timestamp' }),
  activatedBy: text('activated_by').references(() => users.id),
});

// ---------- PROGRESS ----------
export const lessonProgress = sqliteTable('lesson_progress', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }),
});

// ---------- PAYMENTS (bitácora del flujo manual) ----------
export const payments = sqliteTable('payments', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => courses.id),
  workshopId: text('workshop_id').references(() => workshops.id),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull().$type<'pending' | 'paid' | 'rejected' | 'cancelled'>().default('pending'),
  notes: text('notes'),
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
});

// ---------- CERTIFICADOS (arquitectura lista, no implementado en v1) ----------
export const certificates = sqliteTable('certificates', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  verificationCode: text('verification_code').notNull().unique(),
  issuedAt: createdAt(),
});
