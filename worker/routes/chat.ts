import { Hono } from 'hono';
import { asc, gte } from 'drizzle-orm';
import type { AuthEnv } from '../middleware/auth';
import { getDb } from '../db/client';
import { events } from '../db/schema';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_TOKENS = 500;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;
const MAX_EVENTS_IN_PROMPT = 6;

const BASE_SYSTEM_PROMPT = `Eres el asistente virtual del sitio web de Koinonía, una Iglesia Cristiana de Formación y Liderazgo en Medellín, Colombia.

Responde SOLO con la información que se te da a continuación (incluye todo lo que aparece en la página web: inicio, horarios, misión y visión, Escuela de Liderazgo, agenda, galería y contacto). Sé breve, cálido y directo (máximo 3-4 frases). Si te preguntan algo que no está en esta información (peticiones de oración personalizadas, temas doctrinales complejos, casos pastorales, quejas, o cualquier cosa que no puedas responder con certeza), dile amablemente a la persona que escriba por WhatsApp usando el botón debajo del chat para hablar directamente con el equipo de Koinonía. Nunca inventes información que no esté aquí.

INFORMACIÓN DE LA IGLESIA:
- Nombre: Koinonía — Iglesia Cristiana de Formación y Liderazgo.
- Koinonía (del griego, "comunión profunda") es una familia donde se forman líderes que trascienden: una iglesia que forma discípulos y levanta líderes para impactar cada esfera de la vida.
- Misión: formar líderes íntegros, multiplicadores y comprometidos, con convicción sobre principios y valores sólidos. Viven la Palabra de Dios en comunidad para moldear el carácter antes que la posición, preparando agentes de cambio con un profundo sentido de servicio.
- Visión: ser una iglesia y escuela de liderazgo de referencia, reconocida por formar líderes con propósito que generan un impacto positivo y duradero en sus familias, sus organizaciones y su ciudad.
- Ubicación: Carrera 42A # 1 Sur - 17, El Poblado, Medellín.
- Correo: contacto@koinonia.org. Para hablar directo con el equipo, o para pedir oración, el botón de WhatsApp del chat es la mejor vía.

HORARIOS DE REUNIÓN (todos en la sede física, salvo el que se indique como virtual):
- Domingos 9:00 a.m.: Servicio dominical.
- Domingos 7:00 p.m.: Servicio dominical virtual.
- Martes 7:00 p.m.: Escuela de Liderazgo.
- Miércoles 5:00 a.m.: Intercesión.
- Miércoles 7:30 p.m.: Intercesión.
- Sábados 6:00 a.m.: Intercesión.

ESCUELA DE LIDERAZGO (sección "Formación" de la página) — un mismo propósito, dos brazos:
1. Escuela Koinonía: formación de liderazgo dentro de la iglesia, cada martes 7:00 p.m. Carácter, servicio y multiplicación para toda la familia Koinonía.
2. Escuela de LideresVIP: formación de liderazgo con visión global, para líderes que multiplican en cada esfera de influencia. Tiene su propia plataforma en /LideresVIP con registro, inicio de sesión, cursos y talleres.
Los 4 pilares que atraviesan la formación: Liderazgo y carácter, Liderazgo en el hogar, Liderazgo y servicio, Liderazgo en comunidad.

OTRAS SECCIONES DE LA PÁGINA:
- Agenda ("Próximos encuentros"): la lista de eventos programados va más abajo, en PRÓXIMOS EVENTOS.
- Galería ("Collage de Koinonía"): fotos de los encuentros, retiros y celebraciones de la comunidad.
- Novedades: reflexiones, historias y enseñanzas del blog de Koinonía para acompañar la semana.
- Necesito Oración: si alguien pide oración, dirígelo con calidez al botón de WhatsApp para hablar con el equipo pastoral.`;

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatEventDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
}

async function buildEventsBlock(db: ReturnType<typeof getDb>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(events)
    .where(gte(events.eventDate, today))
    .orderBy(asc(events.eventDate))
    .limit(MAX_EVENTS_IN_PROMPT);

  if (rows.length === 0) {
    return 'PRÓXIMOS EVENTOS:\nPor ahora no hay eventos nuevos publicados en la agenda; invita a la persona a revisar la sección "Próximos encuentros" del sitio más adelante.';
  }

  const lines = rows.map((row) => {
    const parts = [formatEventDate(row.eventDate)];
    if (row.eventTime) parts.push(row.eventTime);
    if (row.location) parts.push(row.location);
    const details = parts.join(', ');
    const description = row.description ? ` — ${row.description}` : '';
    return `- "${row.title}" (${details})${description}`;
  });

  return `PRÓXIMOS EVENTOS (agenda actual del sitio):\n${lines.join('\n')}`;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function sanitizeHistory(rawMessages: unknown): ChatMessage[] | null {
  if (!Array.isArray(rawMessages)) return null;

  const trimmed = rawMessages
    .filter(
      (m): m is ChatMessage =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH).trim() }))
    .filter((m) => m.content.length > 0);

  if (trimmed.length === 0) return null;

  const firstUserIndex = trimmed.findIndex((m) => m.role === 'user');
  if (firstUserIndex === -1) return null;

  return trimmed.slice(firstUserIndex);
}

const chat = new Hono<AuthEnv>();

chat.post('/', async (c) => {
  if (!c.env.AI) {
    return c.json({ error: 'server_misconfigured' }, 500);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const messages = sanitizeHistory((payload as { messages?: unknown })?.messages);
  if (!messages) {
    return c.json({ error: 'invalid_messages' }, 400);
  }

  // Los eventos se consultan en cada pregunta para que el bot nunca hable de
  // una agenda vieja: si alguien publica o borra un evento, el chat lo sabe
  // de inmediato sin tener que tocar este código.
  let eventsBlock: string;
  try {
    eventsBlock = await buildEventsBlock(getDb(c.env.DB));
  } catch {
    eventsBlock = 'PRÓXIMOS EVENTOS:\nNo se pudo consultar la agenda en este momento; invita a la persona a revisar la sección "Próximos encuentros" del sitio.';
  }
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${eventsBlock}\n\nResponde siempre en español.`;

  let result: { response?: string };
  try {
    result = await c.env.AI.run(MODEL, {
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: MAX_TOKENS,
    });
  } catch {
    return c.json({ error: 'upstream_error' }, 502);
  }

  const reply = typeof result?.response === 'string' ? result.response.trim() : '';
  if (!reply) {
    return c.json({ error: 'empty_reply' }, 502);
  }

  return c.json({ reply });
});

export default chat;
