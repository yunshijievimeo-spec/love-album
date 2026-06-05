const config = window.LOVE_ALBUM_CONFIG || {};

const localKeys = {
  hugs: "love-room-hugs",
  lamps: "love-room-lamps",
  scores: "love-room-scores",
  syncRounds: "love-room-sync-rounds",
  capsules: "love-room-capsules",
  gardenWatering: "love-room-garden-watering",
  identity: "love-room-identity"
};

const tableNames = {
  hugs: config.hugTableName || "couple_hugs",
  lamps: config.lampTableName || "couple_goodnight_lamps",
  scores: config.scoreTableName || "couple_miss_scores",
  syncRounds: config.syncQuestionTableName || "couple_sync_questions",
  capsules: config.capsuleTableName || "couple_capsules",
  gardenWatering: config.gardenWaterTableName || "couple_garden_watering"
};

const syncQuestionPool = [
  { question: "今天最想和对方一起做什么？", hint: "试着写下第一个跳出来的答案。" },
  { question: "如果今晚多出一小时，你最想怎么陪对方？", hint: "可以很日常，也可以很甜。" },
  { question: "最近最想听对方说的一句话是什么？", hint: "简短一点也会很戳心。" },
  { question: "今天想到对方时，脑子里先冒出的画面是什么？", hint: "场景越具体越可爱。" },
  { question: "下一次见面，你最想先做的动作是什么？", hint: "抱抱、牵手、看着笑都算。" },
  { question: "你觉得我们最适合一起度过哪种傍晚？", hint: "是散步、吃饭、发呆，还是别的。" },
  { question: "如果今天只能留下一个小仪式，你最想选什么？", hint: "越像你们越好。" },
  { question: "对方今天最需要你给的是什么？", hint: "关心、陪伴、夸夸、拥抱都可以。" }
];

const GARDEN_DAILY_LIMIT_PER_PERSON = 12;
const GARDEN_DAILY_LIMIT_TOTAL = 24;
const GARDEN_WATER_PER_BLOOM = 480;
const GARDEN_MAX_BLOOMS = 12;

const state = {
  hasSupabase: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase),
  supabase: null,
  identity: localStorage.getItem(localKeys.identity) || "号号",
  currentSyncRound: null,
  gardenRows: []
};

const elements = {
  modeBadge: document.querySelector("#modeBadge"),
  modeHint: document.querySelector("#modeHint"),
  identitySelect: document.querySelector("#identitySelect"),
  identityHint: document.querySelector("#identityHint"),
  refreshAllButton: document.querySelector("#refreshAllButton"),
  clearLocalCacheButton: document.querySelector("#clearLocalCacheButton"),
  hugButton: document.querySelector("#hugButton"),
  hugScene: document.querySelector("#hugScene"),
  lampButton: document.querySelector("#lampButton"),
  lampScene: document.querySelector("#lampScene"),
  scoreForm: document.querySelector("#scoreForm"),
  scoreInput: document.querySelector("#scoreInput"),
  scorePreview: document.querySelector("#scorePreview"),
  scoreStatusBadge: document.querySelector("#scoreStatusBadge"),
  scoreSummary: document.querySelector("#scoreSummary"),
  syncQuestionText: document.querySelector("#syncQuestionText"),
  syncHintText: document.querySelector("#syncHintText"),
  syncAnswerForm: document.querySelector("#syncAnswerForm"),
  syncAnswerInput: document.querySelector("#syncAnswerInput"),
  syncAnswers: document.querySelector("#syncAnswers"),
  syncStatusBadge: document.querySelector("#syncStatusBadge"),
  nextQuestionButton: document.querySelector("#nextQuestionButton"),
  capsuleForm: document.querySelector("#capsuleForm"),
  capsuleInput: document.querySelector("#capsuleInput"),
  capsuleList: document.querySelector("#capsuleList"),
  gardenVisual: document.querySelector("#gardenVisual"),
  gardenBlooms: document.querySelector("#gardenBlooms"),
  gardenSprout: document.querySelector("#gardenSprout"),
  gardenFlower: document.querySelector("#gardenFlower"),
  gardenStageBadge: document.querySelector("#gardenStageBadge"),
  gardenTodayTotal: document.querySelector("#gardenTodayTotal"),
  gardenHaohaoCount: document.querySelector("#gardenHaohaoCount"),
  gardenXiuqinCount: document.querySelector("#gardenXiuqinCount"),
  gardenProgressText: document.querySelector("#gardenProgressText"),
  gardenProgressFill: document.querySelector("#gardenProgressFill"),
  gardenProgressHint: document.querySelector("#gardenProgressHint"),
  waterOneButton: document.querySelector("#waterOneButton"),
  waterTwoButton: document.querySelector("#waterTwoButton"),
  gardenSummary: document.querySelector("#gardenSummary")
};

if (state.hasSupabase) {
  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

bootRoom();

async function bootRoom() {
  syncIdentityUi();
  setModeStatus();
  bindEvents();
  await ensureSyncQuestion();
  await refreshAll();
}

function bindEvents() {
  elements.identitySelect.addEventListener("change", handleIdentityChange);
  elements.refreshAllButton.addEventListener("click", refreshAll);
  elements.clearLocalCacheButton.addEventListener("click", clearLocalCache);
  elements.hugButton.addEventListener("click", handleHugSubmit);
  elements.lampButton.addEventListener("click", handleLampSubmit);
  elements.scoreInput.addEventListener("input", syncScorePreview);
  elements.scoreForm.addEventListener("submit", handleScoreSubmit);
  elements.syncAnswerForm.addEventListener("submit", handleSyncAnswerSubmit);
  elements.nextQuestionButton.addEventListener("click", handleNextQuestion);
  elements.capsuleForm.addEventListener("submit", handleCapsuleSubmit);
  elements.waterOneButton.addEventListener("click", () => handleGardenWater(1));
  elements.waterTwoButton.addEventListener("click", () => handleGardenWater(2));
}

function syncIdentityUi() {
  elements.identitySelect.value = state.identity;
  elements.identityHint.textContent = `当前默认会以 ${state.identity} 的身份保存互动内容。`;
  syncScorePreview();
}

function handleIdentityChange(event) {
  state.identity = event.target.value;
  localStorage.setItem(localKeys.identity, state.identity);
  syncIdentityUi();
  refreshAll();
}

function setModeStatus(message) {
  if (state.hasSupabase) {
    elements.modeBadge.textContent = "云端同步中";
    elements.modeHint.textContent = message || "你们两个人打开同一个线上页面，就会看到同样的互动记录。";
    return;
  }

  elements.modeBadge.textContent = "本地演示";
  elements.modeHint.textContent = message || "如果云端表还没建好，页面会先退回当前设备本地保存。";
}

async function refreshAll() {
  setModeStatus();
  await Promise.all([
    hydrateHugs(),
    hydrateLamps(),
    hydrateScores(),
    hydrateSyncRound(),
    hydrateCapsules(),
    hydrateGarden()
  ]);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function syncScorePreview() {
  elements.scorePreview.textContent = `${elements.scoreInput.value} 分`;
}

async function handleHugSubmit() {
  const today = getTodayKey();
  const existing = await findTodayPersonRow(tableNames.hugs, localKeys.hugs, today, state.identity);
  if (existing) {
    await hydrateHugs();
    return;
  }

  await insertRow(tableNames.hugs, localKeys.hugs, {
    id: crypto.randomUUID(),
    person: state.identity,
    action_date: today,
    created_at: new Date().toISOString()
  });

  await hydrateHugs();
}

async function hydrateHugs() {
  const today = getTodayKey();
  const rows = await fetchRows(tableNames.hugs, localKeys.hugs, {
    orderColumn: "created_at",
    ascending: false,
    limit: 20
  });

  const todayRows = rows.filter((item) => item.action_date === today);
  const mine = todayRows.find((item) => item.person === state.identity);
  const bothDone = hasBothPeople(todayRows);

  elements.hugButton.textContent = mine ? "今天已经抱抱" : "抱一下";
  elements.hugButton.disabled = Boolean(mine);
  elements.hugScene.classList.toggle("is-on", bothDone);
  elements.hugScene.classList.toggle("is-off", !bothDone);
}

async function handleLampSubmit() {
  const today = getTodayKey();
  const existing = await findTodayPersonRow(tableNames.lamps, localKeys.lamps, today, state.identity);
  if (existing) {
    await hydrateLamps();
    return;
  }

  await insertRow(tableNames.lamps, localKeys.lamps, {
    id: crypto.randomUUID(),
    person: state.identity,
    action_date: today,
    created_at: new Date().toISOString()
  });

  await hydrateLamps();
}

async function hydrateLamps() {
  const today = getTodayKey();
  const rows = await fetchRows(tableNames.lamps, localKeys.lamps, {
    orderColumn: "created_at",
    ascending: false,
    limit: 20
  });

  const todayRows = rows.filter((item) => item.action_date === today);
  const mine = todayRows.find((item) => item.person === state.identity);
  const bothDone = hasBothPeople(todayRows);

  elements.lampButton.textContent = mine ? "今晚已经点亮" : "点亮晚安灯";
  elements.lampButton.disabled = Boolean(mine);
  elements.lampScene.classList.toggle("is-on", bothDone);
  elements.lampScene.classList.toggle("is-off", !bothDone);
}

async function handleScoreSubmit(event) {
  event.preventDefault();

  const today = getTodayKey();
  const value = Number(elements.scoreInput.value);
  const existing = await findTodayPersonRow(tableNames.scores, localKeys.scores, today, state.identity);

  if (existing) {
    await updateRow(tableNames.scores, localKeys.scores, existing.id, {
      score: value,
      updated_at: new Date().toISOString()
    });
  } else {
    await insertRow(tableNames.scores, localKeys.scores, {
      id: crypto.randomUUID(),
      person: state.identity,
      score_date: today,
      score: value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  await hydrateScores();
}

async function hydrateScores() {
  const today = getTodayKey();
  const rows = await fetchRows(tableNames.scores, localKeys.scores, {
    orderColumn: "created_at",
    ascending: false,
    limit: 40
  });

  const todayRows = rows.filter((item) => item.score_date === today);
  const mine = todayRows.find((item) => item.person === state.identity);

  elements.scoreStatusBadge.textContent = todayRows.length ? "今天已记录" : "待填写";

  if (mine) {
    elements.scoreInput.value = `${mine.score}`;
    syncScorePreview();
  }

  if (!todayRows.length) {
    renderInfoPanel(elements.scoreSummary, "今天还没有想你值。");
    return;
  }

  const wrap = document.createElement("div");
  todayRows
    .sort((a, b) => a.person.localeCompare(b.person, "zh-CN"))
    .forEach((item) => {
      const line = document.createElement("p");
      line.innerHTML = `<strong>${item.person}</strong>：${item.score} 分`;
      wrap.append(line);
    });

  elements.scoreSummary.innerHTML = "";
  elements.scoreSummary.append(wrap);
}

async function ensureSyncQuestion() {
  const round = await getLatestSyncRound();
  if (!round) {
    await createNextSyncRound();
    return;
  }

  if (round.question_date !== getTodayKey()) {
    await createNextSyncRound(round.question);
  }
}

async function getLatestSyncRound() {
  const rows = await fetchRows(tableNames.syncRounds, localKeys.syncRounds, {
    orderColumn: "created_at",
    ascending: false,
    limit: 1
  });

  return rows[0] || null;
}

async function createNextSyncRound(currentQuestion = "") {
  const next = pickRandomQuestion(currentQuestion);
  await insertRow(tableNames.syncRounds, localKeys.syncRounds, {
    id: crypto.randomUUID(),
    question_date: getTodayKey(),
    question: next.question,
    hint: next.hint,
    author_a: "",
    answer_a: "",
    author_b: "",
    answer_b: "",
    created_at: new Date().toISOString()
  });
}

async function hydrateSyncRound() {
  const round = await getLatestSyncRound();
  state.currentSyncRound = round;

  if (!round) {
    elements.syncQuestionText.textContent = "还没有今天的默契题。";
    elements.syncHintText.textContent = "点一下换一题，就会生成一个新的小问题。";
    elements.syncStatusBadge.textContent = "待生成";
    elements.syncAnswers.innerHTML = "<p class='empty'>还没有答案。</p>";
    return;
  }

  elements.syncQuestionText.textContent = round.question;
  elements.syncHintText.textContent = round.hint || "看看你们今天会不会想到同一个答案。";

  const answers = [
    { author: round.author_a, answer: round.answer_a },
    { author: round.author_b, answer: round.answer_b }
  ].filter((item) => item.author || item.answer);

  const mine = answers.find((item) => item.author === state.identity);

  if (answers.length >= 2) {
    elements.syncStatusBadge.textContent =
      normalizeAnswer(answers[0].answer) === normalizeAnswer(answers[1].answer) ? "默契成功" : "已揭晓";
  } else if (mine) {
    elements.syncStatusBadge.textContent = "你已作答";
  } else {
    elements.syncStatusBadge.textContent = "等你回答";
  }

  elements.syncAnswerInput.value = mine?.answer || "";
  renderSyncAnswers(answers);
}

function renderSyncAnswers(answers) {
  elements.syncAnswers.innerHTML = "";

  if (!answers.length) {
    elements.syncAnswers.innerHTML = "<p class='empty'>还没有答案。</p>";
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
    elements.syncAnswers.append(card);
  });
}

async function handleSyncAnswerSubmit(event) {
  event.preventDefault();

  if (!state.currentSyncRound) {
    await ensureSyncQuestion();
    await hydrateSyncRound();
  }

  const round = state.currentSyncRound;
  const answer = elements.syncAnswerInput.value.trim();
  if (!round || !answer) return;

  const patch = buildDualAnswerUpdate(round, state.identity, answer);
  await updateRow(tableNames.syncRounds, localKeys.syncRounds, round.id, patch);
  await hydrateSyncRound();
}

async function handleNextQuestion() {
  await createNextSyncRound(state.currentSyncRound?.question || "");
  await hydrateSyncRound();
}

async function handleCapsuleSubmit(event) {
  event.preventDefault();

  const content = elements.capsuleInput.value.trim();
  if (!content) return;

  await insertRow(tableNames.capsules, localKeys.capsules, {
    id: crypto.randomUUID(),
    person: state.identity,
    content,
    created_at: new Date().toISOString()
  });

  elements.capsuleForm.reset();
  await hydrateCapsules();
}

async function hydrateCapsules() {
  const rows = await fetchRows(tableNames.capsules, localKeys.capsules, {
    orderColumn: "created_at",
    ascending: false,
    limit: 12
  });

  elements.capsuleList.innerHTML = "";

  if (!rows.length) {
    elements.capsuleList.innerHTML = "<p class='empty'>还没有小纸条，先留第一句吧。</p>";
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = "capsule-item";

    const title = document.createElement("strong");
    title.textContent = `${item.person} · ${formatDateTime(item.created_at)}`;

    const text = document.createElement("p");
    text.textContent = item.content;

    card.append(title, text);
    elements.capsuleList.append(card);
  });
}

async function hydrateGarden() {
  const rows = await fetchRows(tableNames.gardenWatering, localKeys.gardenWatering, {
    orderColumn: "water_date",
    ascending: true,
    limit: 500
  });

  state.gardenRows = rows;
  renderGarden();
}

async function handleGardenWater(amount) {
  const today = getTodayKey();
  const rows = state.gardenRows.length
    ? state.gardenRows
    : await fetchRows(tableNames.gardenWatering, localKeys.gardenWatering, {
        orderColumn: "water_date",
        ascending: true,
        limit: 500
      });

  const todayRows = rows.filter((item) => item.water_date === today);
  const me = todayRows.find((item) => item.person === state.identity);
  const myCount = Number(me?.count || 0);
  const totalCount = todayRows.reduce((sum, item) => sum + Number(item.count || 0), 0);

  const allowedByMe = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myCount);
  const allowedByTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - totalCount);
  const actualAmount = Math.min(amount, allowedByMe, allowedByTotal);

  if (actualAmount <= 0) {
    renderGarden();
    return;
  }

  spawnWateringAnimation();

  if (me) {
    await updateRow(tableNames.gardenWatering, localKeys.gardenWatering, me.id, {
      count: myCount + actualAmount
    });
  } else {
    await insertRow(tableNames.gardenWatering, localKeys.gardenWatering, {
      id: crypto.randomUUID(),
      water_date: today,
      person: state.identity,
      count: actualAmount,
      created_at: new Date().toISOString()
    });
  }

  await hydrateGarden();
}

function renderGarden() {
  const stats = getGardenStats();

  elements.gardenStageBadge.textContent = `第 ${stats.openBlooms} / ${GARDEN_MAX_BLOOMS} 朵`;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${stats.currentProgress} / ${GARDEN_WATER_PER_BLOOM}`;
  elements.gardenProgressFill.style.width = `${stats.progressPercent}%`;
  const hasBloomed = stats.openBlooms > 0;
  elements.gardenFlower.classList.toggle("is-blooming", hasBloomed);
  elements.gardenSprout.classList.toggle("is-hidden", hasBloomed);

  renderGardenBlooms(stats.openBlooms);

  const myTodayCount = state.identity === "号号" ? stats.haohaoToday : stats.xiuqinToday;
  const remainMine = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myTodayCount);
  const remainTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - stats.todayTotal);

  const canWaterOne = remainMine >= 1 && remainTotal >= 1 && stats.openBlooms < GARDEN_MAX_BLOOMS;
  const canWaterTwo = remainMine >= 2 && remainTotal >= 2 && stats.openBlooms < GARDEN_MAX_BLOOMS;

  elements.waterOneButton.disabled = !canWaterOne;
  elements.waterTwoButton.disabled = !canWaterTwo;

  if (stats.openBlooms >= GARDEN_MAX_BLOOMS) {
    elements.gardenProgressHint.textContent = "你们已经开满 12 朵花啦，这盆花被你们养得很圆满。";
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "今天的 24 次水已经浇满了，明天继续一起养。";
  } else {
    elements.gardenProgressHint.textContent = `距离开出下一朵花还差 ${stats.remainingForNextBloom} 点水量。`;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `累计水量：${stats.totalWater} / ${GARDEN_WATER_PER_BLOOM * GARDEN_MAX_BLOOMS}`,
    hasBloomed
      ? `今天还能再浇 ${Math.max(0, remainTotal)} 次，你当前身份还能浇 ${Math.max(0, remainMine)} 次。`
      : `现在还是小花苗。今天还能再浇 ${Math.max(0, remainTotal)} 次，你当前身份还能浇 ${Math.max(0, remainMine)} 次。`
  );
}

function getGardenStats() {
  const today = getTodayKey();
  const totalWater = state.gardenRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const cappedTotalWater = Math.min(totalWater, GARDEN_WATER_PER_BLOOM * GARDEN_MAX_BLOOMS);
  const openBlooms = Math.min(GARDEN_MAX_BLOOMS, Math.floor(cappedTotalWater / GARDEN_WATER_PER_BLOOM));
  const currentProgress =
    openBlooms >= GARDEN_MAX_BLOOMS ? GARDEN_WATER_PER_BLOOM : cappedTotalWater % GARDEN_WATER_PER_BLOOM;
  const todayRows = state.gardenRows.filter((item) => item.water_date === today);
  const todayTotal = todayRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const haohaoRow = todayRows.find((item) => item.person === "号号");
  const xiuqinRow = todayRows.find((item) => item.person === "秀琴");
  const haohaoToday = Number(haohaoRow?.count || 0);
  const xiuqinToday = Number(xiuqinRow?.count || 0);
  const remainingForNextBloom =
    openBlooms >= GARDEN_MAX_BLOOMS ? 0 : Math.max(0, GARDEN_WATER_PER_BLOOM - currentProgress);

  return {
    totalWater: cappedTotalWater,
    openBlooms,
    currentProgress,
    progressPercent: openBlooms >= GARDEN_MAX_BLOOMS ? 100 : (currentProgress / GARDEN_WATER_PER_BLOOM) * 100,
    todayTotal,
    haohaoToday,
    xiuqinToday,
    remainingForNextBloom
  };
}

function renderGardenBlooms(count) {
  elements.gardenBlooms.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const bloom = document.createElement("span");
    bloom.className = "bloom-dot";
    elements.gardenBlooms.append(bloom);
  }
}

function spawnWateringAnimation() {
  elements.gardenVisual.querySelectorAll(".water-drop, .water-heart").forEach((node) => node.remove());

  const drop = document.createElement("span");
  drop.className = "water-drop";

  const heart = document.createElement("span");
  heart.className = "water-heart";
  heart.textContent = "❤";

  const plant = elements.gardenVisual.querySelector(".garden-plant");
  plant.classList.remove("is-wiggling");
  void plant.offsetWidth;
  plant.classList.add("is-wiggling");

  elements.gardenVisual.append(drop, heart);

  window.setTimeout(() => {
    drop.remove();
    heart.remove();
    plant.classList.remove("is-wiggling");
  }, 1400);
}

function renderInfoPanel(target, mainText, subText = "") {
  target.innerHTML = "";
  const strong = document.createElement("strong");
  strong.textContent = mainText;
  target.append(strong);

  if (subText) {
    const sub = document.createElement("p");
    sub.textContent = subText;
    target.append(sub);
  }
}

function buildDualAnswerUpdate(round, author, answer) {
  if (!round.author_a || round.author_a === author) {
    return { author_a: author, answer_a: answer };
  }

  if (!round.author_b || round.author_b === author) {
    return { author_b: author, answer_b: answer };
  }

  return { author_b: author, answer_b: answer };
}

function normalizeAnswer(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function hasBothPeople(rows) {
  const names = new Set(rows.map((item) => item.person));
  return names.has("号号") && names.has("秀琴");
}

function pickRandomQuestion(currentQuestion) {
  const pool = syncQuestionPool.filter((item) => item.question !== currentQuestion);
  return pool[Math.floor(Math.random() * pool.length)] || syncQuestionPool[0];
}

async function findTodayPersonRow(tableName, localKey, dateKey, person) {
  const rows = await fetchRows(tableName, localKey, {
    orderColumn: "created_at",
    ascending: false,
    limit: 60
  });

  return rows.find(
    (item) =>
      item.person === person &&
      (item.action_date === dateKey || item.score_date === dateKey || item.question_date === dateKey)
  );
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
    setModeStatus(`云端表 ${tableName} 还没准备好，当前先切到本地模式。`);
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
    window.alert(`云端写入失败：${tableName} 可能还没有建好，请先执行新的 SQL。`);
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
    window.alert(`云端更新失败：${tableName} 的更新权限可能还没打开。`);
  }
}

function clearLocalCache() {
  Object.values(localKeys).forEach((key) => localStorage.removeItem(key));
  state.identity = "号号";
  syncIdentityUi();
  refreshAll();
}

function sortLocalRows(rows, options = {}) {
  const nextRows = [...rows];
  if (options.orderColumn) {
    nextRows.sort((a, b) => {
      const left = a[options.orderColumn] || "";
      const right = b[options.orderColumn] || "";
      if (left === right) return 0;
      if (options.ascending) {
        return left > right ? 1 : -1;
      }
      return left < right ? 1 : -1;
    });
  }
  return options.limit ? nextRows.slice(0, options.limit) : nextRows;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}
