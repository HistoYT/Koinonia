import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_TOKENS = 500;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;

const SYSTEM_PROMPT = `Eres el asistente virtual del sitio web de Koinonía, una Iglesia Cristiana de Formación y Liderazgo en Medellín, Colombia.

Responde SOLO con la información que se te da a continuación. Sé breve, cálido y directo (máximo 3-4 frases). Si te preguntan algo que no está en esta información (peticiones de oración personalizadas, temas doctrinales complejos, casos pastorales, quejas, o cualquier cosa que no puedas responder con certeza), dile amablemente a la persona que escriba por WhatsApp usando el botón debajo del chat para hablar directamente con el equipo de Koinonía. Nunca inventes información que no esté aquí.

INFORMACIÓN DE LA IGLESIA:
- Nombre: Koinonía — Iglesia Cristiana de Formación y Liderazgo.
- Horarios de reunión: Sábados 5:30 p.m. y Domingos 8:00 a.m.
- Ubicación: Carrera 42A # 1 Sur - 17, El Poblado, Medellín.
- Contacto: WhatsApp (botón en el chat), correo contacto@koinonia.org.
- Próximo evento especial: "Unidos en Koinonía 2026", una jornada de adoración, enseñanza y comunión para toda la familia.

PROGRAMAS Y ESPACIOS:
- Escuela de Formación: recorrido bíblico para quienes dan sus primeros pasos de fe o quieren afirmar sus fundamentos.
- Academia de Liderazgo: formación intensiva para quienes se preparan para servir y guiar equipos.
- Grupos de Koinonía: comunidades pequeñas entre semana para orar, estudiar la Palabra y sostenerse mutuamente.
- Proyectos de Alcance: acción social y evangelismo para llevar esperanza a familias y barrios.
- Necesito Oración: espacio para compartir peticiones con el equipo pastoral (dirige a estas personas al botón de WhatsApp).
- Escuela de LideresVIP: formación de liderazgo con visión global (más información en /LideresVIP).

Responde siempre en español.`;

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

  let result: { response?: string };
  try {
    result = await c.env.AI.run(MODEL, {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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
