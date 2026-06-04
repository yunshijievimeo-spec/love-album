const config = window.LOVE_ALBUM_CONFIG || {};
const localKeys = {
  messages: "love-chat-room-messages",
  moods: "love-chat-room-moods",
  riddles: "love-chat-room-riddles",
  prompts: "love-chat-room-prompts",
  drawRounds: "love-chat-room-draw-rounds",
  localCanvas: "love-chat-room-local-canvas"
};

const tableNames = {
  messages: config.chatMessageTableName || "couple_chat_messages",
  moods: config.statusTableName || "couple_status_cards",
  riddles: config.riddleTableName || "couple_riddles",
  prompts: config.questionRoundTableName || "couple_question_rounds",
  drawRounds: config.drawRoundTableName || "couple_draw_rounds"
};

const promptPool = [
  { question: "What moment recently made you want to hug me right away?", hint: "A small moment is enough." },
  { question: "If we suddenly got a free day tomorrow, how would you want to spend it with me?", hint: "Specific answers are cuter." },
  { question: "What little habit of mine feels the cutest to you?", hint: "Be honest and sweet." },
  { question: "Which chat made you feel that we really understand each other?", hint: "Pick one real memory." },
  { question: "If our relationship had one movie line, what would it be?", hint: "Cheesy is allowed." },
  { question: "What small thing do you most want to unlock with me next?", hint: "Food, dates, travel, anything." },
  { question: "When do I make you feel especially safe?", hint: "A good place to quietly praise me." },
  { question: "If you could leave me only one sentence tonight, what would you say?", hint: "One sentence can still be precious." },
  { question: "What is one thing you wish I understood about you even more?", hint: "A good moment to be serious." },
  { question: "What tiny ritual do you want us to build together?", hint: "Good night, photos, walks, anything." }
];

const drawPromptPool = [
  "heart to heart",
  "head over heels",
  "puppy love",
  "butterflies",
  "wild guess",
  "love at first sight",
  "cat and mouse",
  "under the weather",
  "happy tears",
  "busy hands",
  "light bulb",
  "storm in a teacup"
];

const state = {
  hasSupabase: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase),
  supabase: null,
  currentPromptRound: null,
  currentDrawRound: null,
  drawPromptVisible: false
};

const chatElements = {
  modeBadge: document.querySelector("#modeBadge"),
  modeHint: document.querySelector("#modeHint"),
  refreshAllButton: document.querySelector("#refreshAllButton"),
  clearLocalCacheButton: document.querySelector("#clearLocalCacheButton"),
  chatForm: document.querySelector("#chatForm"),
  chatAuthorInput: document.querySelector("#chatAuthorInput"),
  chatTextInput: document.querySelector("#chatTextInput"),
  chatStream: document.querySelector("#chatStream"),
  messageCountBadge: document.querySelector("#messageCountBadge"),
  emptyChatTemplate: document.querySelector("#emptyChatTemplate"),
  moodForm: document.querySelector("#moodForm"),
  moodAuthorInput: document.querySelector("#moodAuthorInput"),
  moodSelect: document.querySelector("#moodSelect"),
  moodNoteInput: document.querySelector("#moodNoteInput"),
  moodCard: document.querySelector("#moodCard"),
  riddleForm: document.querySelector("#riddleForm"),
  riddleAuthorInput: document.querySelector("#riddleAuthorInput"),
  riddleQuestionInput: document.querySelector("#riddleQuestionInput"),
  riddleAnswerInput: document.querySelector("#riddleAnswerInput"),
  riddleList: document.querySelector("#riddleList"),
  riddleCountBadge: document.querySelector("#riddleCountBadge"),
  nextPromptButton: document.querySelector("#nextPromptButton"),
  promptQuestionText: document.querySelector("#promptQuestionText"),
  promptHintText: document.querySelector("#promptHintText"),
  promptAnswerForm: document.querySelector("#promptAnswerForm"),
  promptAuthorInput: document.querySelector("#promptAuthorInput"),
  promptAnswerInput: document.querySelector("#promptAnswerInput"),
  promptAnswers: document.querySelector("#promptAnswers"),
  drawRoundForm: document.querySelector("#drawRoundForm"),
  drawRoundAuthorInput: document.querySelector("#drawRoundAuthorInput"),
  drawRoundPromptInput: document.querySelector("#drawRoundPromptInput"),
  randomDrawPromptButton: document.querySelector("#randomDrawPromptButton"),
  drawRoundBadge: document.querySelector("#drawRoundBadge"),
  drawRoundAuthorText: document.querySelector("#drawRoundAuthorText"),
  drawRoundPromptText: document.querySelector("#drawRoundPromptText"),
  toggleDrawPromptButton: document.querySelector("#toggleDrawPromptButton"),
  drawCanvas: document.querySelector("#drawCanvas"),
  brushColorInput: document.querySelector("#brushColorInput"),
  brushSizeInput: document.querySelector("#brushSizeInput"),
  clearCanvasButton: document.querySelector("#clearCanvasButton"),
  saveCanvasButton: document.querySelector("#saveCanvasButton"),
  drawGuessForm: document.querySelector("#drawGuessForm"),
  drawGuessAuthorInput: document.querySelector("#drawGuessAuthorInput"),
  drawGuessInput: document.querySelector("#drawGuessInput"),
  drawGuessCard: document.querySelector("#drawGuessCard")
};

const ctx = chatElements.drawCanvas.getContext("2d");
let drawing = false;
let lastPoint = null;

if (state.hasSupabase) {
  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

bootChatRoom();

async function bootChatRoom() {
  setModeStatus();
  bindEvents();
  setupCanvas();
  await refreshAll();
}

function bindEvents() {
  chatElements.refreshAllButton.addEventListener("click", refreshAll);
  chatElements.clearLocalCacheButton.addEventListener("click", clearLocalCache);
  chatElements.chatForm.addEventListener("submit", handleChatSubmit);
  chatElements.moodForm.addEventListener("submit", handleMoodSubmit);
  chatElements.riddleForm.addEventListener("submit", handleRiddleSubmit);
  chatElements.nextPromptButton.addEventListener("click", handleNextPrompt);
  chatElements.promptAnswerForm.addEventListener("submit", handlePromptAnswerSubmit);
  chatElements.drawRoundForm.addEventListener("submit", handleDrawRoundSubmit);
  chatElements.randomDrawPromptButton.addEventListener("click", fillRandomDrawPrompt);
  chatElements.toggleDrawPromptButton.addEventListener("click", toggleDrawPrompt);
  chatElements.clearCanvasButton.addEventListener("click", clearCanvas);
  chatElements.saveCanvasButton.addEventListener("click", saveCanvasToCurrentRound);
  chatElements.drawGuessForm.addEventListener("submit", handleDrawGuessSubmit);
  chatElements.drawCanvas.addEventListener("pointerdown", startDraw);
  chatElements.drawCanvas.addEventListener("pointermove", draw);
  chatElements.drawCanvas.addEventListener("pointerup", endDraw);
  chatElements.drawCanvas.addEventListener("pointerleave", endDraw);
}

function setModeStatus(message) {
  if (state.hasSupabase) {
    chatElements.modeBadge.textContent = "Cloud Sync";
    chatElements.modeHint.textContent =
      message || "Open the same deployed link on both devices to share the same data.";
    return;
  }

  chatElements.modeBadge.textContent = "Local Demo";
  chatElements.modeHint.textContent =
    message || "If cloud tables are missing, the page falls back to local browser storage.";
}

async function refreshAll() {
  setModeStatus();
  await Promise.all([
    hydrateChat(),
    hydrateMood(),
    hydrateRiddles(),
    hydratePromptRound(),
    hydrateDrawRound()
  ]);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const author = chatElements.chatAuthorInput.value.trim();
  const content = chatElements.chatTextInput.value.trim();
  if (!author || !content) return;

  const payload = {
    id: crypto.randomUUID(),
    author,
    content,
    created_at: new Date().toISOString()
  };

  await insertRow(tableNames.messages, localKeys.messages, payload);
  chatElements.chatForm.reset();
  await hydrateChat();
}

async function hydrateChat() {
  const messages = await fetchRows(tableNames.messages, localKeys.messages, {
    orderColumn: "created_at",
    ascending: true,
    limit: 120
  });

  chatElements.chatStream.innerHTML = "";
  chatElements.messageCountBadge.textContent = `${messages.length}`;

  if (!messages.length) {
    chatElements.chatStream.append(chatElements.emptyChatTemplate.content.cloneNode(true));
    return;
  }

  messages.forEach((message, index) => {
    const bubble = document.createElement("article");
    bubble.className = `chat-bubble ${index % 2 === 0 ? "self" : "other"}`;

    const meta = document.createElement("div");
    meta.className = "bubble-meta";
    meta.textContent = `${message.author} · ${formatTime(message.created_at)}`;

    const text = document.createElement("p");
    text.textContent = message.content;

    bubble.append(meta, text);
    chatElements.chatStream.append(bubble);
  });

  chatElements.chatStream.scrollTop = chatElements.chatStream.scrollHeight;
}

async function handleMoodSubmit(event) {
  event.preventDefault();
  const author = chatElements.moodAuthorInput.value.trim();
  if (!author) return;

  const payload = {
    id: crypto.randomUUID(),
    author,
    feeling: chatElements.moodSelect.value,
    note: chatElements.moodNoteInput.value.trim(),
    created_at: new Date().toISOString()
  };

  await insertRow(tableNames.moods, localKeys.moods, payload);
  chatElements.moodForm.reset();
  chatElements.moodSelect.value = "Miss you";
  await hydrateMood();
}

async function hydrateMood() {
  const moods = await fetchRows(tableNames.moods, localKeys.moods, {
    orderColumn: "created_at",
    ascending: false,
    limit: 1
  });

  const mood = moods[0];
  chatElements.moodCard.innerHTML = "";

  if (!mood) {
    chatElements.moodCard.innerHTML = "<p>No mood card yet. Save one first.</p>";
    return;
  }

  const badge = document.createElement("strong");
  badge.textContent = `${mood.author}: ${mood.feeling}`;

  const note = document.createElement("p");
  note.textContent = mood.note || "Still thinking about you.";

  const time = document.createElement("small");
  time.textContent = `Updated ${formatTime(mood.created_at)}`;

  chatElements.moodCard.append(badge, note, time);
}

async function handleRiddleSubmit(event) {
  event.preventDefault();
  const author = chatElements.riddleAuthorInput.value.trim();
  const question = chatElements.riddleQuestionInput.value.trim();
  const answer = chatElements.riddleAnswerInput.value.trim();
  if (!author || !question || !answer) return;

  const payload = {
    id: crypto.randomUUID(),
    author,
    question,
    answer,
    revealed: false,
    created_at: new Date().toISOString()
  };

  await insertRow(tableNames.riddles, localKeys.riddles, payload);
  chatElements.riddleForm.reset();
  await hydrateRiddles();
}

async function hydrateRiddles() {
  const riddles = await fetchRows(tableNames.riddles, localKeys.riddles, {
    orderColumn: "created_at",
    ascending: false,
    limit: 20
  });

  chatElements.riddleList.innerHTML = "";
  chatElements.riddleCountBadge.textContent = `${riddles.length}`;

  if (!riddles.length) {
    chatElements.riddleList.innerHTML = "<p class='empty-inline'>No riddles yet.</p>";
    return;
  }

  riddles.forEach((riddle) => {
    const card = document.createElement("article");
    card.className = "riddle-item";

    const title = document.createElement("strong");
    title.textContent = `${riddle.author} asks`;

    const question = document.createElement("p");
    question.textContent = riddle.question;

    const answer = document.createElement("p");
    answer.className = "riddle-answer";
    answer.textContent = riddle.revealed ? `Answer: ${riddle.answer}` : "Answer hidden";

    const actions = document.createElement("div");
    actions.className = "riddle-actions";

    const revealButton = document.createElement("button");
    revealButton.type = "button";
    revealButton.textContent = riddle.revealed ? "Hide" : "Reveal";
    revealButton.addEventListener("click", async () => {
      await updateRow(tableNames.riddles, localKeys.riddles, riddle.id, {
        revealed: !riddle.revealed
      });
      await hydrateRiddles();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      await deleteRow(tableNames.riddles, localKeys.riddles, riddle.id);
      await hydrateRiddles();
    });

    actions.append(revealButton, deleteButton);
    card.append(title, question, answer, actions);
    chatElements.riddleList.append(card);
  });
}

async function handleNextPrompt() {
  const currentQuestion = state.currentPromptRound?.prompt || "";
  const nextPrompt = pickRandomPrompt(currentQuestion);

  const payload = {
    id: crypto.randomUUID(),
    prompt: nextPrompt.question,
    hint: nextPrompt.hint,
    author_a: "",
    answer_a: "",
    author_b: "",
    answer_b: "",
    created_at: new Date().toISOString()
  };

  await insertRow(tableNames.prompts, localKeys.prompts, payload);
  await hydratePromptRound();
}

async function hydratePromptRound() {
  const rounds = await fetchRows(tableNames.prompts, localKeys.prompts, {
    orderColumn: "created_at",
    ascending: false,
    limit: 1
  });

  state.currentPromptRound = rounds[0] || null;

  if (!state.currentPromptRound) {
    chatElements.promptQuestionText.textContent = "No prompt yet";
    chatElements.promptHintText.textContent = "Tap Next Prompt to create one.";
    chatElements.promptAnswers.innerHTML = "<p class='empty-inline'>No answers yet.</p>";
    return;
  }

  chatElements.promptQuestionText.textContent = state.currentPromptRound.prompt;
  chatElements.promptHintText.textContent =
    state.currentPromptRound.hint || "A good prompt for a sweet serious little talk.";

  renderPromptAnswers(state.currentPromptRound);
}

function renderPromptAnswers(round) {
  chatElements.promptAnswers.innerHTML = "";

  const answers = [
    { author: round.author_a, answer: round.answer_a },
    { author: round.author_b, answer: round.answer_b }
  ].filter((item) => item.author || item.answer);

  if (!answers.length) {
    chatElements.promptAnswers.innerHTML = "<p class='empty-inline'>No answers yet.</p>";
    return;
  }

  answers.forEach((item) => {
    const card = document.createElement("article");
    card.className = "answer-item";

    const title = document.createElement("strong");
    title.textContent = item.author;

    const text = document.createElement("p");
    text.textContent = item.answer;

    card.append(title, text);
    chatElements.promptAnswers.append(card);
  });
}

async function handlePromptAnswerSubmit(event) {
  event.preventDefault();
  if (!state.currentPromptRound) {
    await handleNextPrompt();
  }

  const round = state.currentPromptRound;
  const author = chatElements.promptAuthorInput.value.trim();
  const answer = chatElements.promptAnswerInput.value.trim();
  if (!round || !author || !answer) return;

  const updatePayload = buildDualAnswerUpdate(round, author, answer);
  await updateRow(tableNames.prompts, localKeys.prompts, round.id, updatePayload);
  chatElements.promptAnswerForm.reset();
  await hydratePromptRound();
}

async function handleDrawRoundSubmit(event) {
  event.preventDefault();
  const drawer = chatElements.drawRoundAuthorInput.value.trim();
  const prompt = chatElements.drawRoundPromptInput.value.trim();
  if (!drawer || !prompt) return;

  const existingRounds = await fetchRows(tableNames.drawRounds, localKeys.drawRounds, {
    orderColumn: "created_at",
    ascending: false,
    limit: 100
  });

  const payload = {
    id: crypto.randomUUID(),
    drawer,
    prompt,
    drawing_data: "",
    guess_author: "",
    guess_text: "",
    created_at: new Date().toISOString(),
    round_index: existingRounds.length + 1
  };

  await insertRow(tableNames.drawRounds, localKeys.drawRounds, payload);
  chatElements.drawRoundForm.reset();
  state.drawPromptVisible = false;
  clearCanvas();
  await hydrateDrawRound();
}

function fillRandomDrawPrompt() {
  chatElements.drawRoundPromptInput.value =
    drawPromptPool[Math.floor(Math.random() * drawPromptPool.length)];
}

async function hydrateDrawRound() {
  const rounds = await fetchRows(tableNames.drawRounds, localKeys.drawRounds, {
    orderColumn: "created_at",
    ascending: false,
    limit: 1
  });

  state.currentDrawRound = rounds[0] || null;
  renderDrawRound();
}

function renderDrawRound() {
  const round = state.currentDrawRound;

  if (!round) {
    chatElements.drawRoundBadge.textContent = "Round 0";
    chatElements.drawRoundAuthorText.textContent = "No round yet";
    chatElements.drawRoundPromptText.textContent = "Create the first round";
    renderGuessCard(null);
    fillCanvasBase();
    return;
  }

  chatElements.drawRoundBadge.textContent = `Round ${round.round_index || 1}`;
  chatElements.drawRoundAuthorText.textContent = round.drawer;
  chatElements.drawRoundPromptText.textContent = state.drawPromptVisible ? round.prompt : "******";

  renderGuessCard(round);

  restoreCanvasFromRound(round.drawing_data);
}

function renderGuessCard(round) {
  chatElements.drawGuessCard.innerHTML = "";

  if (!round || !round.guess_author) {
    const text = document.createElement("p");
    text.textContent = "No guess yet. Let the other person try.";
    chatElements.drawGuessCard.append(text);
    return;
  }

  const title = document.createElement("strong");
  title.textContent = `${round.guess_author} guessed`;

  const text = document.createElement("p");
  text.textContent = round.guess_text || "No text";

  chatElements.drawGuessCard.append(title, text);
}

function toggleDrawPrompt() {
  state.drawPromptVisible = !state.drawPromptVisible;
  renderDrawRound();
}

async function handleDrawGuessSubmit(event) {
  event.preventDefault();
  if (!state.currentDrawRound) return;

  const guessAuthor = chatElements.drawGuessAuthorInput.value.trim();
  const guessText = chatElements.drawGuessInput.value.trim();
  if (!guessAuthor || !guessText) return;

  await updateRow(tableNames.drawRounds, localKeys.drawRounds, state.currentDrawRound.id, {
    guess_author: guessAuthor,
    guess_text: guessText
  });

  chatElements.drawGuessForm.reset();
  await hydrateDrawRound();
}

async function saveCanvasToCurrentRound() {
  if (!state.currentDrawRound) {
    window.alert("Start a round first.");
    return;
  }

  const dataUrl = exportCanvasDataUrl();
  await updateRow(tableNames.drawRounds, localKeys.drawRounds, state.currentDrawRound.id, {
    drawing_data: dataUrl
  });
  await hydrateDrawRound();
}

function setupCanvas() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  fillCanvasBase();
}

function startDraw(event) {
  drawing = true;
  lastPoint = getCanvasPoint(event);
}

function draw(event) {
  if (!drawing || !lastPoint) return;
  const nextPoint = getCanvasPoint(event);

  ctx.strokeStyle = chatElements.brushColorInput.value;
  ctx.lineWidth = Number(chatElements.brushSizeInput.value);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(nextPoint.x, nextPoint.y);
  ctx.stroke();

  lastPoint = nextPoint;
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  lastPoint = null;
  localStorage.setItem(localKeys.localCanvas, exportCanvasDataUrl());
}

function getCanvasPoint(event) {
  const rect = chatElements.drawCanvas.getBoundingClientRect();
  const scaleX = chatElements.drawCanvas.width / rect.width;
  const scaleY = chatElements.drawCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function clearCanvas() {
  fillCanvasBase();
  localStorage.removeItem(localKeys.localCanvas);
}

function fillCanvasBase() {
  ctx.clearRect(0, 0, chatElements.drawCanvas.width, chatElements.drawCanvas.height);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, chatElements.drawCanvas.width, chatElements.drawCanvas.height);
}

function restoreCanvasFromRound(dataUrl) {
  fillCanvasBase();
  const localCache = localStorage.getItem(localKeys.localCanvas);
  const source = dataUrl || localCache;
  if (!source) return;

  const image = new Image();
  image.onload = () => {
    fillCanvasBase();
    ctx.drawImage(image, 0, 0, chatElements.drawCanvas.width, chatElements.drawCanvas.height);
  };
  image.src = source;
}

function exportCanvasDataUrl() {
  return chatElements.drawCanvas.toDataURL("image/webp", 0.72);
}

function clearLocalCache() {
  localStorage.removeItem(localKeys.localCanvas);

  if (!state.hasSupabase) {
    Object.values(localKeys).forEach((key) => localStorage.removeItem(key));
    state.currentPromptRound = null;
    state.currentDrawRound = null;
    refreshAll();
    return;
  }

  state.drawPromptVisible = false;
  fillCanvasBase();
  renderDrawRound();
}

function buildDualAnswerUpdate(round, author, answer) {
  if (!round.author_a || round.author_a === author) {
    return {
      author_a: author,
      answer_a: answer
    };
  }

  if (!round.author_b || round.author_b === author) {
    return {
      author_b: author,
      answer_b: answer
    };
  }

  return {
    author_b: author,
    answer_b: answer
  };
}

function pickRandomPrompt(currentQuestion) {
  const pool = promptPool.filter((item) => item.question !== currentQuestion);
  return pool[Math.floor(Math.random() * pool.length)] || promptPool[0];
}

async function fetchRows(tableName, localKey, options = {}) {
  if (!state.hasSupabase) {
    return sortLocalRows(readJson(localKey, []), options);
  }

  let query = state.supabase.from(tableName).select("*");
  if (options.orderColumn) {
    query = query.order(options.orderColumn, { ascending: Boolean(options.ascending) });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    state.hasSupabase = false;
    setModeStatus(`Cloud table ${tableName} is not ready. Falling back to local mode.`);
    return sortLocalRows(readJson(localKey, []), options);
  }

  return data || [];
}

async function insertRow(tableName, localKey, payload) {
  if (!state.hasSupabase) {
    const rows = readJson(localKey, []);
    rows.push(payload);
    writeJson(localKey, rows);
    return;
  }

  const { error } = await state.supabase.from(tableName).insert(payload);
  if (error) {
    console.error(error);
    window.alert(`Cloud insert failed for ${tableName}. Run the SQL file first.`);
  }
}

async function updateRow(tableName, localKey, id, patch) {
  if (!state.hasSupabase) {
    const rows = readJson(localKey, []).map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeJson(localKey, rows);
    return;
  }

  const { error } = await state.supabase.from(tableName).update(patch).eq("id", id);
  if (error) {
    console.error(error);
    window.alert(`Cloud update failed for ${tableName}. Check update policy.`);
  }
}

async function deleteRow(tableName, localKey, id) {
  if (!state.hasSupabase) {
    const rows = readJson(localKey, []).filter((item) => item.id !== id);
    writeJson(localKey, rows);
    return;
  }

  const { error } = await state.supabase.from(tableName).delete().eq("id", id);
  if (error) {
    console.error(error);
    window.alert(`Cloud delete failed for ${tableName}. Check delete policy.`);
  }
}

function sortLocalRows(rows, options) {
  const sorted = [...rows];
  const orderColumn = options.orderColumn;

  if (orderColumn) {
    sorted.sort((left, right) => {
      const leftValue = left[orderColumn] || "";
      const rightValue = right[orderColumn] || "";
      const result = String(leftValue).localeCompare(String(rightValue));
      return options.ascending ? result : -result;
    });
  }

  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

function readJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
