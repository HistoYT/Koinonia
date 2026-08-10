document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const typingEl = document.getElementById('chatTyping');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');

  if (!toggle || !panel || !form) return;

  const WELCOME_MESSAGE = '¡Hola! Soy el asistente de Koinonía. Puedo ayudarte con horarios, ubicación, programas y eventos. ¿En qué te puedo ayudar?';
  const ERROR_MESSAGE = 'No pude responder en este momento. Intenta de nuevo o escríbenos por WhatsApp con el botón de abajo.';

  let history = [];
  let isOpen = false;
  let isSending = false;
  let hasShownWelcome = false;

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg ' + (role === 'user' ? 'chat-msg-user' : role === 'error' ? 'chat-msg-error' : 'chat-msg-bot');
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setSending(sending) {
    isSending = sending;
    input.disabled = sending;
    form.querySelector('button').disabled = sending;
    typingEl.hidden = !sending;
    if (sending) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('chat-open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar asistente de Koinonía');
    if (!hasShownWelcome) {
      hasShownWelcome = true;
      addMessage('bot', WELCOME_MESSAGE);
    }
    setTimeout(() => input.focus(), 200);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('chat-open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir asistente de Koinonía');
  }

  toggle.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
  closeBtn.addEventListener('click', closePanel);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    setSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });

      if (!response.ok) throw new Error('request_failed');

      const data = await response.json();
      if (!data.reply) throw new Error('empty_reply');

      addMessage('bot', data.reply);
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      addMessage('error', ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  });
});
