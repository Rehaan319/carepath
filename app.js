const topics = {
  headache: {
    terms: ['headache', 'head pain', 'migraine', 'head hurts', 'head ache'],
    title: 'Headache',
    guidance: [
      'Headaches can have many causes, including dehydration, stress, missed meals, eye strain, or an illness. I can’t tell which cause applies to you.',
      'If this feels like a familiar, mild headache, resting somewhere quiet, drinking water, and eating if you have missed a meal may help. Use over-the-counter medicine only as directed on its label, and check with a pharmacist or clinician if you have questions.',
      'Seek urgent medical care for a sudden, extremely severe headache, or one with weakness, confusion, fainting, trouble speaking, vision loss, fever with a stiff neck, or after a head injury.'
    ],
    keywords: ['headache', 'head pain', 'migraine', 'stress', 'dehydration', 'head injury']
  },
  sleep: {
    terms: ['sleep', 'insomnia', 'can’t sleep', "can't sleep", 'trouble sleeping', 'waking up'],
    title: 'Sleep',
    guidance: [
      'Sleep can be affected by stress, schedule changes, caffeine, alcohol, medicines, and health conditions. A short stretch of disrupted sleep is common, though persistent problems deserve attention.',
      'A steady wake-up time, a wind-down routine, daylight and movement during the day, and limiting late caffeine can support sleep. If you’re awake for a while, try a quiet low-light activity until you feel sleepy.',
      'Consider talking with a clinician if sleep problems continue for weeks, affect your daily life, or come with loud snoring, gasping, or significant mood changes.'
    ],
    keywords: ['sleep', 'insomnia', 'caffeine', 'routine', 'snoring', 'stress']
  },
  allergy: {
    terms: ['allerg', 'hay fever', 'sneez', 'itchy eyes', 'pollen', 'runny nose'],
    title: 'Seasonal allergies',
    guidance: [
      'Seasonal allergies often cause sneezing, a runny or stuffy nose, and itchy or watery eyes. Colds can look similar; fever and body aches are less typical of allergies.',
      'Checking local pollen levels, keeping windows closed on high-pollen days, changing clothes after time outdoors, and rinsing with sterile or distilled water may reduce exposure. A pharmacist can help you choose an appropriate nonprescription option.',
      'Get urgent help for trouble breathing, throat or tongue swelling, or faintness. Ask a clinician about symptoms that persist, worsen, or interfere with daily activities.'
    ],
    keywords: ['allergy', 'pollen', 'sneezing', 'itchy eyes', 'runny nose', 'breathing']
  },
  cough: {
    terms: ['cough', 'coughing', 'sore throat', 'chest congestion', 'phlegm'],
    title: 'Cough',
    guidance: [
      'Coughs commonly happen with viral infections, allergies, asthma, or irritation, but a chat cannot identify the cause. Note how long it has lasted and any other symptoms.',
      'Rest and fluids may help. Honey can soothe a cough for adults and children over 1 year old; never give honey to an infant. Ask a pharmacist before using cough medicines, especially for young children or if you take other medicines.',
      'Seek urgent care for difficulty breathing, bluish lips, severe chest pain, confusion, or coughing up blood. Contact a clinician if symptoms are worsening or the cough lasts more than about 3 weeks.'
    ],
    keywords: ['cough', 'breathing', 'viral', 'allergy', 'chest pain', 'blood']
  },
  stomach: {
    terms: ['stomach', 'nausea', 'vomit', 'diarrhea', 'belly', 'abdominal pain'],
    title: 'Stomach discomfort',
    guidance: [
      'Stomach discomfort can come from many causes, from a temporary illness to food or medication effects. The timing, severity, and other symptoms matter.',
      'For mild symptoms, small frequent sips of fluid and rest may be useful. If you have vomiting or diarrhea, an oral rehydration solution can help replace fluids.',
      'Get urgent medical care for severe or worsening pain, blood in vomit or stool, fainting, inability to keep fluids down, or signs of dehydration. Seek advice sooner for pregnancy, a young child, or significant medical conditions.'
    ],
    keywords: ['stomach', 'nausea', 'vomiting', 'diarrhea', 'hydration', 'abdominal pain']
  },
  stress: {
    terms: ['stress', 'anxious', 'anxiety', 'overwhelmed', 'panic', 'worried'],
    title: 'Stress & emotional wellbeing',
    guidance: [
      'Feeling stressed or anxious can affect sleep, focus, and the body. I can listen and share general coping ideas, but I can’t assess your mental health.',
      'You might try slowing your breathing, naming what feels most urgent, taking a brief walk, or reaching out to someone you trust. Small, manageable steps can make a difficult moment feel more workable.',
      'If this is persistent or interfering with daily life, a mental health professional or primary care clinician can help. If you might hurt yourself or someone else, contact local emergency services or a crisis line now.'
    ],
    keywords: ['stress', 'anxiety', 'breathing', 'support', 'mental health', 'crisis']
  }
};

const emergencyTerms = [
  'chest pain', 'can’t breathe', "can't breathe", 'cannot breathe', 'trouble breathing', 'difficulty breathing',
  'stroke', 'face drooping', 'one side weak', 'severe bleeding', 'unconscious', 'overdose', 'suicidal',
  'kill myself', 'hurt myself', 'throat swelling', 'tongue swelling'
];

const conversationGraph = {
  start: ['headache', 'sleep', 'allergy', 'cough', 'stomach', 'stress'],
  headache: ['sleep', 'stress'],
  sleep: ['stress', 'headache'],
  allergy: ['cough'],
  cough: ['allergy'],
  stomach: ['stress'],
  stress: ['sleep']
};

const conversation = document.querySelector('#conversation');
const welcome = document.querySelector('#welcome');
const messages = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const newChatButton = document.querySelector('#new-chat');
const sendButton = document.querySelector('.send-button');
const typingIndicator = document.querySelector('#typing-indicator');
const profileDialog = document.querySelector('#profile-dialog');
const profileForm = document.querySelector('#profile-form');
const ageSelect = document.querySelector('#age-range');
const contextInput = document.querySelector('#health-context');
const shareWithAiInput = document.querySelector('#share-with-ai');
const toast = document.querySelector('#toast');
const authButton = document.querySelector('#auth-button');
const authDialog = document.querySelector('#auth-dialog');
const authForm = document.querySelector('#auth-form');
const authNameField = document.querySelector('#auth-name-field');
const authNameInput = document.querySelector('#auth-name');
const authEmailInput = document.querySelector('#auth-email');
const authPasswordInput = document.querySelector('#auth-password');
const authError = document.querySelector('#auth-error');
const authSubmit = document.querySelector('#auth-submit');

let profile = readProfile();
let toastTimeout;
let accountUser = null;
let authMode = 'signup';
const conversationHistory = [];
const CHAT_STORAGE_KEY = 'carepath-chat-history';
const chatHistoryList = document.querySelector('#chat-history');
let savedChats = readChats();
let currentChat = savedChats[0] || createEmptyChat();
const apiAvailability = fetch('/api/status').then(response => response.ok ? response.json() : { configured: false }).catch(() => ({ configured: false }));

function readProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('carepath-profile') || '{}');
    return { age: typeof saved.age === 'string' ? saved.age : '', context: typeof saved.context === 'string' ? saved.context.slice(0, 300) : '', shareWithAi: saved.shareWithAi === true };
  } catch {
    return { age: '', context: '', shareWithAi: false };
  }
}

function createEmptyChat() {
  return { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: 'New conversation', updatedAt: Date.now(), messages: [] };
}

function readChats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(chat => chat && typeof chat.id === 'string' && Array.isArray(chat.messages))
      .map(chat => ({
        id: chat.id,
        title: typeof chat.title === 'string' ? chat.title.slice(0, 80) : 'Conversation',
        updatedAt: Number.isFinite(chat.updatedAt) ? chat.updatedAt : 0,
        messages: chat.messages.filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string')
          .map(message => ({
            role: message.role,
            text: message.text.slice(0, 5000),
            meta: message.meta && typeof message.meta.method === 'string'
              ? { method: message.meta.method.slice(0, 40), detail: String(message.meta.detail || '').slice(0, 100) }
              : null
          }))
      }))
      .sort((first, second) => second.updatedAt - first.updatedAt)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function persistCurrentChat() {
  if (!currentChat.messages.length) return;
  const firstMessage = currentChat.messages.find(message => message.role === 'user')?.text || 'Conversation';
  currentChat.title = firstMessage.length > 36 ? `${firstMessage.slice(0, 36).trimEnd()}…` : firstMessage;
  currentChat.updatedAt = Date.now();
  savedChats = [currentChat, ...savedChats.filter(chat => chat.id !== currentChat.id)]
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .slice(0, 30);
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(savedChats));
  } catch {
    showToast('This conversation could not be saved in this browser.');
  }
  renderChatHistory();
}

function renderChatHistory() {
  chatHistoryList.replaceChildren();
  if (!savedChats.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Your conversations will appear here.';
    chatHistoryList.append(empty);
    return;
  }

  savedChats.forEach(chat => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `history-item${chat.id === currentChat.id ? ' active' : ''}`;
    button.dataset.chatId = chat.id;
    button.title = chat.title;
    const dot = document.createElement('span');
    dot.className = 'recent-dot';
    dot.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span');
    title.textContent = chat.title;
    button.append(dot, title);
    chatHistoryList.append(button);
  });
}

function restoreChat(chat) {
  currentChat = chat;
  messages.replaceChildren();
  conversationHistory.length = 0;
  chat.messages.forEach(message => {
    addMessage(message.text, message.role, message.role === 'assistant' ? savedTextToHtml(message.text) : null, message.meta);
    conversationHistory.push({ role: message.role, content: message.text });
  });
  welcome.hidden = chat.messages.length > 0;
  renderChatHistory();
  scrollToLatest();
}

function assistantHtmlToText(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(parsed.body.querySelectorAll('p, li')).map(block => {
    const text = block.textContent.trim();
    return block.tagName === 'LI' ? `- ${text}` : text;
  }).filter(Boolean);
  return blocks.join('\n\n') || parsed.body.textContent.trim();
}

function savedTextToHtml(text) {
  const output = [];
  let paragraph = [];
  let bullets = [];
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${paragraph.map(escapeHtml).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) output.push(`<ul>${bullets.map(line => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`);
    bullets = [];
  };

  text.split('\n').forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      return;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      bullets.push(line);
      return;
    }
    flushBullets();
    paragraph.push(line);
  });
  flushParagraph();
  flushBullets();
  return output.join('');
}

chatHistoryList.addEventListener('click', event => {
  const button = event.target.closest('[data-chat-id]');
  const chat = savedChats.find(item => item.id === button?.dataset.chatId);
  if (chat) restoreChat(chat);
});

function updateAuthButton() {
  authButton.textContent = accountUser ? accountUser.name : 'Sign up';
  authButton.title = accountUser ? `Signed in as ${accountUser.email}. Click to sign out.` : 'Create a Carepath account';
  authButton.setAttribute('aria-label', accountUser ? `Sign out ${accountUser.name}` : 'Sign up or sign in');
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === 'signup';
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  authNameField.hidden = !signingUp;
  authNameInput.required = signingUp;
  authPasswordInput.minLength = signingUp ? 12 : 1;
  authPasswordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  document.querySelector('#auth-title').textContent = signingUp ? 'Create your account' : 'Welcome back';
  authSubmit.textContent = signingUp ? 'Create account' : 'Sign in';
  authError.hidden = true;
}

function openAuthDialog(mode = 'signup') {
  setAuthMode(mode);
  authForm.reset();
  authDialog.showModal();
  (mode === 'signup' ? authNameInput : authEmailInput).focus();
}

async function refreshAccount() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    accountUser = data.user || null;
  } catch {
    accountUser = null;
  }
  updateAuthButton();
}

document.querySelectorAll('[data-auth-mode]').forEach(button => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

authButton.addEventListener('click', async () => {
  if (!accountUser) return openAuthDialog('signup');
  const confirmSignout = window.confirm(`Signed in as ${accountUser.name} (${accountUser.email}).\n\nDo you want to sign out?`);
  if (!confirmSignout) return;
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Sign out failed');
    accountUser = null;
    updateAuthButton();
    showToast('You have been signed out.');
  } catch {
    showToast('Could not sign out. Please try again.');
  }
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  authError.hidden = true;
  authSubmit.disabled = true;
  const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
  const payload = { email: authEmailInput.value, password: authPasswordInput.value };
  if (authMode === 'signup') payload.name = authNameInput.value;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Account request failed.');
    accountUser = data.user;
    updateAuthButton();
    authDialog.close();
    showToast(authMode === 'signup' ? `Welcome to Carepath, ${accountUser.name}.` : `Welcome back, ${accountUser.name}.`);
    authForm.reset();
  } catch (error) {
    authError.textContent = error.message || 'Could not reach the account service.';
    authError.hidden = false;
  } finally {
    authSubmit.disabled = false;
  }
});

function normalize(text) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isEmergency(text) {
  const clean = normalize(text);
  return emergencyTerms.some(term => clean.includes(normalize(term)));
}

function countMatches(text, words) {
  const clean = normalize(text);
  return words.reduce((score, word) => score + (clean.includes(normalize(word)) ? 1 : 0), 0);
}

// Breadth-first traversal keeps the first reachable, relevant topic at the shallowest depth.
function breadthFirstTopicSearch(text) {
  const queue = ['start'];
  const visited = new Set();
  while (queue.length) {
    const topicKey = queue.shift();
    if (visited.has(topicKey)) continue;
    visited.add(topicKey);
    const topic = topics[topicKey];
    if (topic && countMatches(text, topic.terms) > 0) return { key: topicKey, depth: 1 };
    for (const neighbor of conversationGraph[topicKey] || []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return null;
}

// A* ranks topic cards by keyword distance; missed query concepts add the heuristic cost.
function aStarTopicSearch(text) {
  const queryWords = normalize(text).split(' ').filter(word => word.length > 3);
  const candidates = Object.entries(topics).map(([key, topic]) => {
    const matched = queryWords.filter(word => topic.keywords.some(keyword => normalize(keyword).includes(word) || word.includes(normalize(keyword))));
    const relevant = new Set(topic.keywords.map(normalize));
    const uncovered = queryWords.filter(word => !Array.from(relevant).some(keyword => keyword.includes(word) || word.includes(keyword))).length;
    const heuristic = uncovered / Math.max(1, queryWords.length);
    const cost = 1 - matched.length / Math.max(1, queryWords.length);
    return { key, topic, matched: matched.length, score: cost + heuristic * 0.5 };
  }).filter(result => result.matched > 0).sort((a, b) => a.score - b.score);
  return candidates[0] || null;
}

function chooseTopic(text) {
  const bfs = breadthFirstTopicSearch(text);
  const ranked = aStarTopicSearch(text);
  if (!ranked) return { topic: null, method: 'BFS', detail: 'topic graph explored' };
  const selected = bfs && countMatches(text, topics[bfs.key].terms) >= 2 ? bfs.key : ranked.key;
  return { topic: topics[selected], method: selected === bfs?.key ? 'BFS' : 'A*', detail: selected === bfs?.key ? 'breadth-first topic match' : 'heuristic relevance ranking' };
}

function addMessage(text, role, contentHtml = null, meta = null) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'user' ? 'Y' : 'c';
  const content = document.createElement('div');
  content.className = 'message-content';
  const name = document.createElement('div');
  name.className = 'message-name';
  name.textContent = role === 'user' ? 'You' : 'Carepath';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (contentHtml) bubble.innerHTML = contentHtml;
  else bubble.textContent = text;
  content.append(name, bubble);
  if (meta) {
    const chips = document.createElement('div');
    chips.className = 'message-meta';
    const algorithm = document.createElement('span');
    algorithm.className = 'reasoning-chip';
    algorithm.innerHTML = `<b>${meta.method}</b> ${meta.detail}`;
    chips.append(algorithm);
    if (profile.age || profile.context) {
      const personal = document.createElement('span');
      personal.className = 'reasoning-chip';
      personal.innerHTML = '<b>Personalized</b> profile context considered';
      chips.append(personal);
    }
    content.append(chips);
  }
  article.append(avatar, content);
  messages.append(article);
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function makeTopicResponse(topic, method, detail) {
  const contextNote = profile.context
    ? `<p><strong>One detail to keep in mind:</strong> You mentioned ${escapeHtml(profile.context)}. That context may affect what is suitable, so check with a clinician or pharmacist before trying a new treatment.</p>`
    : '';
  const ageNote = profile.age === 'Under 18'
    ? '<p><strong>Since you indicated you are under 18:</strong> Please involve a parent, guardian, or trusted adult, especially if symptoms are severe or getting worse.</p>'
    : '';
  const userMessages = currentChat.messages.filter(message => message.role === 'user');
  const asksForCauses = /\b(why|cause|causes|caused|what could)\b/i.test(userMessages.at(-1)?.text || '');
  const asksForSteps = /\b(what should i do|how can i|help|relief|treat|treatment|what helps)\b/i.test(userMessages.at(-1)?.text || '');
  const followUp = userMessages.length > 1;
  const intro = asksForCauses
      ? `There are several possible reasons for ${escapeHtml(topic.title.toLowerCase())}; the information below can help frame what to consider, but it can't identify the cause.`
      : followUp
        ? `Thanks for adding that. For ${escapeHtml(topic.title.toLowerCase())}, the details and how symptoms change over time matter.`
      : asksForSteps
        ? `For general next steps with ${escapeHtml(topic.title.toLowerCase())}, these lower-risk options and warning signs may be useful.`
        : `Here’s general information about ${escapeHtml(topic.title.toLowerCase())}. It can help you decide what to ask next, but it isn’t a diagnosis.`;
  const selectedGuidance = asksForCauses
      ? [topic.guidance[0], topic.guidance[2]]
      : followUp
        ? [topic.guidance[0], topic.guidance[2]]
      : asksForSteps
        ? [topic.guidance[1], topic.guidance[2]]
        : topic.guidance;
  const question = followUp
    ? '<p>To make the next step more relevant: when did this start, and is it getting better, worse, or staying about the same?</p>'
    : '<p>What matters most right now: understanding possible causes, finding safe self-care ideas, or knowing when to seek care?</p>';
  const list = selectedGuidance.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const html = `<p>${intro}</p><ul>${list}</ul>${question}${contextNote}${ageNote}`;
  return { html, meta: { method, detail } };
}

function makeEmergencyResponse() {
  return {
    html: '<p><strong>This could be an emergency.</strong> Please call your local emergency number now or go to the nearest emergency department. Don’t wait for a chat response. If possible, ask someone nearby to stay with you.</p><p>I can’t assess emergencies or provide real-time medical help.</p>',
    meta: { method: 'Safety check', detail: 'urgent language detected' }
  };
}

function makeFallbackResponse() {
  return {
    html: '<p>I don’t have a close match for that yet. I can offer general information about headaches, sleep, seasonal allergies, coughs, stomach discomfort, or stress.</p><p>What are you experiencing, when did it begin, and what would you most like help figuring out?</p><p>If symptoms are severe or worsening quickly, contact a medical professional. For an emergency, call your local emergency number now.</p>',
    meta: { method: 'BFS', detail: 'no close topic found' }
  };
}

async function getAssistantResponse(text) {
  if (isEmergency(text)) return makeEmergencyResponse();

  const availability = await apiAvailability;
  if (profile.shareWithAi && availability.configured) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          profile: { age: profile.age, context: profile.context },
          history: conversationHistory.slice(-11, -1)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI request failed');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('AI response was empty');
      const providerLabel = availability.provider || 'AI';
      const detailLabel = availability.model ? `${availability.model} response` : 'AI response';
      return { html: `<p>${escapeHtml(data.reply.trim()).replace(/\n/g, '<br>')}</p>`, meta: { method: providerLabel, detail: detailLabel }, historyText: data.reply.trim() };
    } catch (err) {
      const fallback = localAssistantResponse(text);
      fallback.meta.detail = `AI notice: ${err.message || 'using local guidance'}`;
      return fallback;
    }
  }

  return localAssistantResponse(text);
}

function localAssistantResponse(text) {
  const recentQuestions = conversationHistory.filter(message => message.role === 'user').slice(-4, -1).map(message => message.content);
  const searchText = [...recentQuestions, text, personalizedDetails(text)].join(' ');
  const result = chooseTopic(searchText);
  const response = result.topic ? makeTopicResponse(result.topic, result.method, result.detail) : makeFallbackResponse();
  return { ...response, historyText: assistantHtmlToText(response.html) };
}

function personalizedDetails(text) {
  const parts = [];
  if (profile.age) parts.push(`Age range: ${profile.age}.`);
  if (profile.context) parts.push(`Health context the user chose to share: ${profile.context}.`);
  if (parts.length) return `\n\n[Optional user context for personalization: ${parts.join(' ')} Use this only to tailor general information. Do not diagnose, infer conditions, or recommend changing prescriptions.]`;
  return '';
}

function scrollToLatest() {
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' });
}

function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || sendButton.disabled) return;
  welcome.hidden = true;
  addMessage(trimmed, 'user');
  currentChat.messages.push({ role: 'user', text: trimmed });
  conversationHistory.push({ role: 'user', content: trimmed });
  persistCurrentChat();
  input.value = '';
  input.style.height = 'auto';
  sendButton.disabled = true;
  newChatButton.disabled = true;
  typingIndicator.hidden = false;
  scrollToLatest();

  window.setTimeout(async () => {
    const response = await getAssistantResponse(trimmed);
    typingIndicator.hidden = true;
    addMessage('', 'assistant', response.html, response.meta);
    const assistantText = response.historyText || assistantHtmlToText(response.html);
    currentChat.messages.push({ role: 'assistant', text: assistantText, meta: response.meta });
    conversationHistory.push({ role: 'assistant', content: assistantText });
    persistCurrentChat();
    sendButton.disabled = false;
    newChatButton.disabled = false;
    input.focus();
  }, 470);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2300);
}

document.querySelector('#suggestions').addEventListener('click', event => {
  const button = event.target.closest('[data-prompt]');
  if (button) sendMessage(button.dataset.prompt);
});

form.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

async function openProfile() {
  ageSelect.value = profile.age;
  contextInput.value = profile.context;
  shareWithAiInput.checked = profile.shareWithAi;
  const status = await apiAvailability;
  const hint = document.querySelector('.sharing-option small');
  if (hint) {
    if (status.configured) {
      hint.textContent = `AI responses available (${status.provider || 'AI'}: ${status.model || 'active'}). Check to send messages to the AI model.`;
    } else {
      hint.textContent = 'No server API key set. Add OPENAI_API_KEY in .env or deployment settings to enable AI responses.';
    }
  }
  profileDialog.showModal();
}

document.querySelector('#profile-button').addEventListener('click', openProfile);
document.querySelector('#open-profile').addEventListener('click', openProfile);
document.querySelector('#cancel-profile').addEventListener('click', () => profileDialog.close());

profileForm.addEventListener('submit', event => {
  event.preventDefault();
  profile = { age: ageSelect.value, context: contextInput.value.trim().slice(0, 300), shareWithAi: shareWithAiInput.checked };
  try {
    localStorage.setItem('carepath-profile', JSON.stringify(profile));
    showToast('Your profile is saved on this device.');
  } catch {
    showToast('Profile saved for this conversation only.');
  }
  profileDialog.close();
});

newChatButton.addEventListener('click', () => {
  persistCurrentChat();
  currentChat = createEmptyChat();
  messages.replaceChildren();
  conversationHistory.length = 0;
  welcome.hidden = false;
  typingIndicator.hidden = true;
  sendButton.disabled = false;
  newChatButton.disabled = false;
  input.value = '';
  input.focus();
  renderChatHistory();
  scrollToLatest();
});

renderChatHistory();
if (currentChat.messages.length) restoreChat(currentChat);
refreshAccount();