const config = window.LOVE_ALBUM_CONFIG || {};

const localKeys = {
  hugs: "love-room-hugs",
  lamps: "love-room-lamps",
  scores: "love-room-scores",
  syncRounds: "love-room-sync-rounds",
  capsules: "love-room-capsules",
  gardenWatering: "love-room-garden-watering",
  babyFeeds: "love-room-baby-feeds",
  identity: "love-room-identity"
};

const ROW_CACHE_TTL_MS = 12000;
const AUTO_REFRESH_INTERVAL_MS = 20000;

const tableNames = {
  hugs: config.hugTableName || "couple_hugs",
  lamps: config.lampTableName || "couple_goodnight_lamps",
  scores: config.scoreTableName || "couple_miss_scores",
  syncRounds: config.syncQuestionTableName || "couple_sync_questions",
  capsules: config.capsuleTableName || "couple_capsules",
  gardenWatering: config.gardenWaterTableName || "couple_garden_watering",
  babyFeeds: config.babyFeedTableName || "couple_baby_feeds"
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
const GARDEN_WATER_PER_BLOOM = 720;
const GARDEN_MAX_BLOOMS = 12;
const BABY_FEED_AMOUNT = 50;
const BABY_FEED_INTERVAL_MS = 3 * 60 * 60 * 1000;
const BABY_DAILY_LIMIT_PER_PERSON = 3;
const BABY_TOTAL_TARGET = 3000;
const GARDEN_PEOPLE = ["号号", "秀琴"];
const GARDEN_MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const GARDEN_PHRASES = [
  "齐心协力",
  "慢慢变甜",
  "一起长大",
  "今天也在",
  "你浇一半",
  "我浇一半",
  "把爱养满",
  "同频发芽",
  "稳稳幸福",
  "心意满瓶",
  "小小丰收",
  "来年再见"
];

const state = {
  hasSupabase: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase),
  supabase: null,
  identity: localStorage.getItem(localKeys.identity) || "号号",
  currentSyncRound: null,
  gardenRows: [],
  babyRows: [],
  babyFeedSyncMode: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase) ? "cloud" : "local",
  isBooting: true,
  refreshPromise: null
};

const rowRequestCache = new Map();
let autoRefreshTimer = 0;
let supabaseBootstrapTimer = 0;

state.identity = normalizeIdentity(state.identity);

const elements = {
  modeBadge: document.querySelector("#modeBadge"),
  modeHint: document.querySelector("#modeHint"),
  heroBoardStamp: document.querySelector("#heroBoardStamp"),
  heroBoardBabyCount: document.querySelector("#heroBoardBabyCount"),
  heroBoardWaterCount: document.querySelector("#heroBoardWaterCount"),
  heroBoardCapsuleCount: document.querySelector("#heroBoardCapsuleCount"),
  heroBoardList: document.querySelector("#heroBoardList"),
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
  gardenYearline: document.querySelector("#gardenYearline"),
  gardenBottle: document.querySelector("#gardenBottle"),
  gardenFruit: document.querySelector("#gardenFruit"),
  gardenBottleWater: document.querySelector("#gardenBottleWater"),
  gardenBottleLabel: document.querySelector("#gardenBottleLabel"),
  gardenWateringLayer: document.querySelector("#gardenWateringLayer"),
  gardenStageBadge: document.querySelector("#gardenStageBadge"),
  gardenTodayTotal: document.querySelector("#gardenTodayTotal"),
  gardenHaohaoCount: document.querySelector("#gardenHaohaoCount"),
  gardenXiuqinCount: document.querySelector("#gardenXiuqinCount"),
  gardenProgressText: document.querySelector("#gardenProgressText"),
  gardenProgressFill: document.querySelector("#gardenProgressFill"),
  gardenProgressHint: document.querySelector("#gardenProgressHint"),
  waterOneButton: document.querySelector("#waterOneButton"),
  waterTwoButton: document.querySelector("#waterTwoButton"),
  gardenSummary: document.querySelector("#gardenSummary"),
  babyRoom: document.querySelector("#babyRoom"),
  babyEffects: document.querySelector("#babyEffects"),
  babyStatusBadge: document.querySelector("#babyStatusBadge"),
  babyCardText: document.querySelector(".baby-card .card-text"),
  babyTotalAmount: document.querySelector("#babyTotalAmount"),
  babyCurrentAge: document.querySelector("#babyCurrentAge"),
  babyNextAgeCountdown: document.querySelector("#babyNextAgeCountdown"),
  babyHaohaoCount: document.querySelector("#babyHaohaoCount"),
  babyXiuqinCount: document.querySelector("#babyXiuqinCount"),
  babyFeedState: document.querySelector("#babyFeedState"),
  babyProgressFill: document.querySelector("#babyProgressFill"),
  babyProgressHint: document.querySelector("#babyProgressHint"),
  babyFeedButton: document.querySelector("#babyFeedButton"),
  babySummary: document.querySelector("#babySummary")
};

ensureSupabaseClient();

bootRoom();

async function bootRoom() {
  syncIdentityUi();
  setModeStatus();
  bindEvents();
  await ensureSyncQuestion();
  await refreshAll();
  startAutoRefreshLoop();
  startSupabaseBootstrapPoll();
}

function ensureSupabaseClient() {
  if (state.supabase || !config.supabaseUrl || !config.supabaseAnonKey || !window.supabase?.createClient) {
    return Boolean(state.supabase);
  }

  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  state.hasSupabase = true;
  return true;
}

function startSupabaseBootstrapPoll() {
  if (state.supabase || supabaseBootstrapTimer || !config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  let attempts = 0;
  supabaseBootstrapTimer = window.setInterval(() => {
    attempts += 1;

    if (ensureSupabaseClient()) {
      window.clearInterval(supabaseBootstrapTimer);
      supabaseBootstrapTimer = 0;
      setModeStatus();
      refreshAll({ force: true });
      return;
    }

    if (attempts >= 30) {
      window.clearInterval(supabaseBootstrapTimer);
      supabaseBootstrapTimer = 0;
    }
  }, 1000);
}

function bindEvents() {
  elements.identitySelect.addEventListener("change", handleIdentityChange);
  elements.refreshAllButton.addEventListener("click", () => refreshAll({ force: true }));
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
  elements.babyFeedButton?.addEventListener("click", handleBabyFeed);
  window.addEventListener("focus", handleRoomVisibilityRefresh);
  document.addEventListener("visibilitychange", handleRoomVisibilityRefresh);
}

function syncIdentityUi() {
  elements.identitySelect.value = state.identity;
  elements.identityHint.textContent = `当前默认会以 ${state.identity} 的身份保存互动内容。`;
  elements.identityHint.textContent = `当前默认会以 ${state.identity} 的身份保存互动内容。`;
  syncScorePreview();
}

function normalizeIdentity(value) {
  if (value === "浩浩" || value === "鍙峰彿" || value === "号号") {
    return "号号";
  }

  if (value === "秀琴" || value === "绉€鐞?" || value === "绉€鐞?" || value === "秀琴") {
    return "秀琴";
  }

  return "号号";
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

function handleRoomVisibilityRefresh() {
  if (document.hidden) {
    return;
  }

  refreshAll({ force: true });
}

function startAutoRefreshLoop() {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
  }

  autoRefreshTimer = window.setInterval(() => {
    if (document.hidden) {
      return;
    }

    refreshAll({ force: true });
  }, AUTO_REFRESH_INTERVAL_MS);
}

async function refreshAll(options = {}) {
  ensureSupabaseClient();

  if (options.force) {
    invalidateRowsCache();
  }

  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  state.refreshPromise = (async () => {
    setModeStatus();
    await Promise.all([
      hydrateHugs(),
      hydrateLamps(),
      hydrateScores(),
      hydrateSyncRound(),
      hydrateCapsules(),
      hydrateGarden(),
      hydrateBabyFeeds()
    ]);

    if (typeof hydrateHeroBoard === "function") {
      await hydrateHeroBoard();
    }
  })();

  try {
    await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
    state.isBooting = false;
  }
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

async function fetchBabyFeedRows(options = {}) {
  if (!state.hasSupabase || !state.supabase) {
    state.babyFeedSyncMode = "local";
    return sortLocalRows(readJson(localKeys.babyFeeds, []), options);
  }

  let query = state.supabase.from(tableNames.babyFeeds).select("*");
  if (options.orderColumn) {
    query = query.order(options.orderColumn, { ascending: Boolean(options.ascending) });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await (async () => {
    try {
      return {
        data: await fetchRemoteRowsWithCache(tableNames.babyFeeds, options, async () => query),
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  })();
  if (error) {
    state.babyFeedSyncMode = "local";
    return sortLocalRows(readJson(localKeys.babyFeeds, []), options);
  }

  state.babyFeedSyncMode = "cloud";
  return data || [];
}

async function insertBabyFeedRow(payload) {
  if (!state.hasSupabase || !state.supabase) {
    const rows = readJson(localKeys.babyFeeds, []);
    rows.push(payload);
    writeJson(localKeys.babyFeeds, rows);
    invalidateRowsCache(tableNames.babyFeeds);
    state.babyFeedSyncMode = "local";
    return;
  }

  const { error } = await state.supabase.from(tableNames.babyFeeds).insert(payload);
  invalidateRowsCache(tableNames.babyFeeds);
  if (error) {
    const rows = readJson(localKeys.babyFeeds, []);
    rows.push(payload);
    writeJson(localKeys.babyFeeds, rows);
    state.babyFeedSyncMode = "local";
    return;
  }

  state.babyFeedSyncMode = "cloud";
}

function formatBabyDuration(ms) {
  if (ms <= 0) {
    return "刚刚";
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}小时${minutes}分钟`;
  }

  if (hours) {
    return `${hours}小时`;
  }

  return `${Math.max(1, minutes)}分钟`;
}

function formatBabyClock(timestamp) {
  if (!timestamp) {
    return "--:--";
  }

  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getBabyFeedStats(rows = state.babyRows) {
  const today = getTodayKey();
  const normalizedRows = [...rows].sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    return leftTime - rightTime;
  });
  const totalAmount = Math.min(BABY_TOTAL_TARGET, normalizedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const todayRows = normalizedRows.filter((item) => item.feed_date === today);
  const haohaoToday = todayRows.filter((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[0]).length;
  const xiuqinToday = todayRows.filter((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[1]).length;
  const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? haohaoToday : xiuqinToday;
  const bothDailyFull = haohaoToday >= BABY_DAILY_LIMIT_PER_PERSON && xiuqinToday >= BABY_DAILY_LIMIT_PER_PERSON;
  const myRows = normalizedRows.filter((item) => normalizeIdentity(item.person) === state.identity);
  const myLastRow = myRows[myRows.length - 1] || null;
  const myLastFeedAt = myLastRow ? new Date(myLastRow.created_at || 0).getTime() : 0;
  const myNextFeedAt = myLastFeedAt ? myLastFeedAt + BABY_FEED_INTERVAL_MS : 0;
  const myCooldownRemaining = myNextFeedAt ? Math.max(0, myNextFeedAt - Date.now()) : 0;
  const lastRow = normalizedRows[normalizedRows.length - 1] || null;
  const lastFeedAt = lastRow ? new Date(lastRow.created_at || 0).getTime() : 0;
  const nextFeedAt = lastFeedAt ? lastFeedAt + BABY_FEED_INTERVAL_MS : 0;
  const cooldownRemaining = nextFeedAt ? Math.max(0, nextFeedAt - Date.now()) : 0;
  const overdueMs = nextFeedAt ? Math.max(0, Date.now() - nextFeedAt) : 0;
  const canFeed =
    totalAmount < BABY_TOTAL_TARGET &&
    myTodayCount < BABY_DAILY_LIMIT_PER_PERSON &&
    (!myLastFeedAt || myCooldownRemaining <= 0);

  let scene = "is-waiting";
  let statusText = "等第一顿奶";

  if (totalAmount >= BABY_TOTAL_TARGET) {
    scene = "is-complete";
    statusText = "喂养毕业";
  } else if (!lastFeedAt) {
    scene = "is-waiting";
    statusText = "等第一顿奶";
  } else if (bothDailyFull || cooldownRemaining > 0) {
    scene = "is-sleeping";
    statusText = "睡觉中";
  } else {
    scene = "is-crying";
    statusText = "哭哭中";
  }

  return {
    totalAmount,
    todayRows,
    haohaoToday,
    xiuqinToday,
    myRows,
    myTodayCount,
    bothDailyFull,
    myLastFeedAt,
    myNextFeedAt,
    myCooldownRemaining,
    lastFeedAt,
    nextFeedAt,
    cooldownRemaining,
    overdueMs,
    canFeed,
    scene,
    statusText,
    progressPercent: (totalAmount / BABY_TOTAL_TARGET) * 100,
    remainingAmount: Math.max(0, BABY_TOTAL_TARGET - totalAmount)
  };
}

function renderBabyFeeds() {
  if (!elements.babyRoom) {
    return;
  }

  const stats = getBabyFeedStats();
  const myRemaining = Math.max(0, BABY_DAILY_LIMIT_PER_PERSON - stats.myTodayCount);

  elements.babyRoom.className = `baby-room ${stats.scene}`;
  elements.babyStatusBadge.textContent = stats.statusText;
  elements.babyTotalAmount.textContent = `${stats.totalAmount} / ${BABY_TOTAL_TARGET}ml`;
  elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
  elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
  elements.babyFeedState.textContent = stats.statusText;
  elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

  if (stats.totalAmount >= BABY_TOTAL_TARGET) {
    elements.babyProgressHint.textContent = "3000ml 已经喂满啦，这对宝宝被你们一起稳稳养大了。";
  } else if (!stats.lastFeedAt) {
    elements.babyProgressHint.textContent = "先喂第一顿奶吧，喝完 50ml 后宝宝会安稳睡 3 小时。";
  } else if (stats.bothDailyFull) {
    elements.babyProgressHint.textContent = "今天你们两个人都已经喂满 3 次了，宝宝先睡觉，明天再继续。";
  } else if (stats.cooldownRemaining > 0) {
    elements.babyProgressHint.textContent = `刚喝完奶，宝宝会睡到 ${formatBabyClock(stats.nextFeedAt)} 左右。`;
  } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
    elements.babyProgressHint.textContent = "这顿该换对方来喂了，你今天的 3 次已经用满。";
  } else {
    elements.babyProgressHint.textContent = `距离上次喂奶已经过去 ${formatBabyDuration(stats.overdueMs)}，宝宝在哭，快来补这 50ml。`;
  }

  elements.babyFeedButton.disabled = !stats.canFeed;
  if (stats.totalAmount >= BABY_TOTAL_TARGET) {
    elements.babyFeedButton.textContent = "3000ml 已养满";
  } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
    elements.babyFeedButton.textContent = "你今天喂满了";
  } else if (stats.bothDailyFull) {
    elements.babyFeedButton.textContent = "明天再来喂";
  } else if (stats.cooldownRemaining > 0 && stats.lastFeedAt) {
    elements.babyFeedButton.textContent = `还要等 ${formatBabyDuration(stats.cooldownRemaining)}`;
  } else {
    elements.babyFeedButton.textContent = `喂 ${BABY_FEED_AMOUNT}ml 奶`;
  }

  const syncHint =
    state.babyFeedSyncMode === "local" && state.hasSupabase
      ? "这张卡当前先保存在本机，等云端补上宝宝喂养表后，两部手机也能同步。"
      : `你今天还可以再喂 ${myRemaining} 次，这对宝宝还差 ${stats.remainingAmount}ml 长大。`;

  renderInfoPanel(
    elements.babySummary,
    `今天一共喂了 ${stats.todayRows.length * BABY_FEED_AMOUNT}ml，累计 ${stats.totalAmount} / ${BABY_TOTAL_TARGET}ml。`,
    syncHint
  );
}

function spawnBabyFeedAnimation(person = state.identity) {
  if (!elements.babyEffects) {
    return;
  }

  const message = person === GARDEN_PEOPLE[0] ? "谢谢爸爸" : "谢谢妈妈";
  const leftBase = person === GARDEN_PEOPLE[0] ? 88 : 292;

  const thanks = document.createElement("span");
  thanks.className = "baby-thanks";
  thanks.textContent = message;
  thanks.style.left = `${leftBase}px`;
  thanks.style.top = "98px";
  elements.babyEffects.append(thanks);

  for (let index = 0; index < 3; index += 1) {
    const heart = document.createElement("span");
    heart.className = "baby-heart-float";
    heart.textContent = "❤";
    heart.style.left = `${leftBase + 14 + index * 16}px`;
    heart.style.top = `${132 + (index % 2) * 10}px`;
    heart.style.animationDelay = `${index * 0.08}s`;
    elements.babyEffects.append(heart);

    window.setTimeout(() => {
      heart.remove();
    }, 2100);
  }

  window.setTimeout(() => {
    thanks.remove();
  }, 2100);
}

async function hydrateBabyFeeds() {
  if (!elements.babyRoom) {
    return;
  }

  const rows = await fetchBabyFeedRows({
    orderColumn: "created_at",
    ascending: true,
    limit: 500
  });

  state.babyRows = rows;
  renderBabyFeeds();
}

async function handleBabyFeed() {
  const rows = state.babyRows.length
    ? state.babyRows
    : await fetchBabyFeedRows({
        orderColumn: "created_at",
        ascending: true,
        limit: 500
      });

  state.babyRows = rows;
  const stats = getBabyFeedStats(rows);
  if (!stats.canFeed) {
    renderBabyFeeds();
    return;
  }

  await insertBabyFeedRow({
    id: crypto.randomUUID(),
    person: state.identity,
    feed_date: getTodayKey(),
    amount: BABY_FEED_AMOUNT,
    created_at: new Date().toISOString()
  });

  spawnBabyFeedAnimation(state.identity);
  await hydrateBabyFeeds();
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
  const initialCreditDays = Math.max(0, (GARDEN_TIMELINE_START?.day || 1) - 1);
  const initialCreditWater = initialCreditDays * GARDEN_DAILY_LIMIT_TOTAL;
  const totalWater = state.gardenRows.reduce((sum, item) => sum + Number(item.count || 0), 0) + initialCreditWater;
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

function getRowCacheKey(tableName, options = {}) {
  const orderColumn = options.orderColumn || "";
  const sortDirection = options.ascending ? "asc" : "desc";
  const limit = options.limit || "all";
  return `${tableName}::${orderColumn}::${sortDirection}::${limit}`;
}

function invalidateRowsCache(tableName = "") {
  for (const key of rowRequestCache.keys()) {
    if (!tableName || key.startsWith(`${tableName}::`)) {
      rowRequestCache.delete(key);
    }
  }
}

async function fetchRemoteRowsWithCache(tableName, options, buildQuery) {
  const cacheKey = getRowCacheKey(tableName, options);
  const now = Date.now();
  const cached = rowRequestCache.get(cacheKey);

  if (cached?.data && now - cached.ts < ROW_CACHE_TTL_MS) {
    return cached.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const requestPromise = (async () => {
    const { data, error } = await buildQuery();
    if (error) {
      throw error;
    }

    const nextData = data || [];
    rowRequestCache.set(cacheKey, {
      data: nextData,
      ts: Date.now()
    });
    return nextData;
  })();

  rowRequestCache.set(cacheKey, {
    promise: requestPromise,
    ts: now
  });

  try {
    return await requestPromise;
  } catch (error) {
    rowRequestCache.delete(cacheKey);
    throw error;
  }
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

  const { data, error } = await (async () => {
    try {
      return {
        data: await fetchRemoteRowsWithCache(tableName, options, async () => query),
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  })();
  if (error) {
    console.error(error);
    setModeStatus(`云端表 ${tableName} 暂时没连上，稍后会继续重试。`);
    return sortLocalRows(readJson(localKey, []), options);
  }

  return data || [];
}

async function insertRow(tableName, localKey, payload) {
  if (!state.hasSupabase) {
    const rows = readJson(localKey, []);
    rows.push(payload);
    writeJson(localKey, rows);
    invalidateRowsCache(tableName);
    return;
  }

  const { error } = await state.supabase.from(tableName).insert(payload);
  invalidateRowsCache(tableName);
  if (error) {
    console.error(error);
    window.alert(`云端写入失败：${tableName} 可能还没有建好，请先执行新的 SQL。`);
  }
}

async function updateRow(tableName, localKey, id, patch) {
  if (!state.hasSupabase) {
    const rows = readJson(localKey, []).map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeJson(localKey, rows);
    invalidateRowsCache(tableName);
    return;
  }

  const { error } = await state.supabase.from(tableName).update(patch).eq("id", id);
  invalidateRowsCache(tableName);
  if (error) {
    console.error(error);
    window.alert(`云端更新失败：${tableName} 的更新权限可能还没打开。`);
  }
}

function clearLocalCache() {
  Object.values(localKeys).forEach((key) => localStorage.removeItem(key));
  invalidateRowsCache();
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

function normalizeIdentity(value) {
  if (value === "浩浩" || value === "鍙峰彿" || value === "号号") {
    return "号号";
  }

  if (value === "秀琴" || value === "绉€鐞?" || value === "绉€鐞?" || value === "秀琴") {
    return "秀琴";
  }

  return "号号";
}

function syncIdentityUi() {
  state.identity = normalizeIdentity(state.identity);
  elements.identitySelect.value = state.identity;
  elements.identityHint.textContent = `当前默认会以 ${state.identity} 的身份保存互动内容。`;
  syncScorePreview();
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
  const me = todayRows.find((item) => normalizeIdentity(item.person) === state.identity);
  const myCount = Number(me?.count || 0);
  const totalCount = todayRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const allowedByMe = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myCount);
  const allowedByTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - totalCount);
  const actualAmount = Math.min(amount, allowedByMe, allowedByTotal);

  if (actualAmount <= 0) {
    renderGarden();
    return;
  }

  spawnWateringAnimation(actualAmount);

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

  elements.gardenStageBadge.textContent =
    stats.completedMonths >= GARDEN_MAX_BLOOMS
      ? `第 ${GARDEN_MAX_BLOOMS} / ${GARDEN_MAX_BLOOMS} 月`
      : `第 ${stats.activeMonthNumber} / ${GARDEN_MAX_BLOOMS} 月`;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${formatGardenDays(stats.dayEquivalent)} / 30 天`;
  elements.gardenProgressFill.style.width = `${stats.progressPercent}%`;

  if (elements.gardenBottleWater) {
    elements.gardenBottleWater.style.height = `${stats.waterLevelPercent}%`;
    elements.gardenBottleWater.classList.toggle("is-empty", stats.visibleDayCount <= 0);
  }

  if (elements.gardenBottleLabel) {
    elements.gardenBottleLabel.textContent = GARDEN_PHRASES[stats.activeMonthIndex];
  }

  if (elements.gardenFruit) {
    elements.gardenFruit.classList.toggle("is-on", stats.completedCurrentMonth);
  }

  renderGardenYearline(stats);

  const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? stats.haohaoToday : stats.xiuqinToday;
  const remainMine = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myTodayCount);
  const remainTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - stats.todayTotal);
  const canWaterOne = remainMine >= 1 && remainTotal >= 1 && stats.completedMonths < GARDEN_MAX_BLOOMS;
  const canWaterTwo = remainMine >= 2 && remainTotal >= 2 && stats.completedMonths < GARDEN_MAX_BLOOMS;

  elements.waterOneButton.disabled = !canWaterOne;
  elements.waterTwoButton.disabled = !canWaterTwo;

  if (stats.completedMonths >= GARDEN_MAX_BLOOMS) {
    elements.gardenProgressHint.textContent = "12 个月的小果子都已经养满了，这一年被你们照顾得很圆满。";
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "今天的 24 点水已经浇满了，明天继续一起把这瓶养甜。";
  } else {
    elements.gardenProgressHint.textContent = `离这瓶结出小果子还差 ${formatGardenDays(
      stats.remainingForNextBloom / GARDEN_DAILY_LIMIT_TOTAL
    )} 天的水量。`;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `累计养成 ${stats.completedMonths} / ${GARDEN_MAX_BLOOMS} 月，相当于 ${formatGardenDays(
      stats.totalWater / GARDEN_DAILY_LIMIT_TOTAL
    )} / 360 天水量`,
    `今天还能再浇 ${remainTotal} 点，你当前身份还能再浇 ${remainMine} 点。`
  );
}

function getGardenStats() {
  const today = getTodayKey();
  const initialCreditDays = Math.max(0, (GARDEN_TIMELINE_START?.day || 1) - 1);
  const initialCreditWater = initialCreditDays * GARDEN_DAILY_LIMIT_TOTAL;
  const totalWater = state.gardenRows.reduce((sum, item) => sum + Number(item.count || 0), 0) + initialCreditWater;
  const cappedTotalWater = Math.min(totalWater, GARDEN_WATER_PER_BLOOM * GARDEN_MAX_BLOOMS);
  const completedMonths = getGardenCompletedMonthsByCalendar();
  const activeMonthIndex = Math.min(completedMonths, GARDEN_MAX_BLOOMS - 1);
  const activeMonthMeta = GARDEN_TIMELINE_MONTHS[activeMonthIndex];
  const currentMonthRows =
    completedMonths >= GARDEN_MAX_BLOOMS
      ? []
      : state.gardenRows.filter((item) => {
          const dateSource = item.water_date || item.created_at || "";
          const waterDate = new Date(dateSource);

          if (Number.isNaN(waterDate.getTime())) {
            return false;
          }

          return (
            waterDate.getFullYear() === activeMonthMeta.year &&
            waterDate.getMonth() + 1 === activeMonthMeta.month
          );
        });
  const currentMonthWater = currentMonthRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const currentProgress =
    completedMonths >= GARDEN_MAX_BLOOMS ? GARDEN_WATER_PER_BLOOM : Math.min(GARDEN_WATER_PER_BLOOM, currentMonthWater);
  const todayRows = state.gardenRows.filter((item) => item.water_date === today);
  const todayTotal = todayRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const haohaoRow = todayRows.find((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[0]);
  const xiuqinRow = todayRows.find((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[1]);
  const haohaoToday = Number(haohaoRow?.count || 0);
  const xiuqinToday = Number(xiuqinRow?.count || 0);
  const remainingForNextBloom =
    completedMonths >= GARDEN_MAX_BLOOMS ? 0 : Math.max(0, GARDEN_WATER_PER_BLOOM - currentProgress);
  const dayEquivalent = currentProgress / GARDEN_DAILY_LIMIT_TOTAL;
  const visibleDayCount = Math.floor(currentProgress / GARDEN_DAILY_LIMIT_TOTAL);

  return {
    totalWater: cappedTotalWater,
    completedMonths,
    currentProgress,
    progressPercent: completedMonths >= GARDEN_MAX_BLOOMS ? 100 : (currentProgress / GARDEN_WATER_PER_BLOOM) * 100,
    waterLevelPercent: completedMonths >= GARDEN_MAX_BLOOMS ? 100 : (visibleDayCount / 30) * 100,
    todayTotal,
    haohaoToday,
    xiuqinToday,
    remainingForNextBloom,
    activeMonthIndex,
    activeMonthNumber: Math.min(completedMonths + 1, GARDEN_MAX_BLOOMS),
    dayEquivalent,
    visibleDayCount,
    completedCurrentMonth: currentProgress >= GARDEN_WATER_PER_BLOOM || completedMonths >= GARDEN_MAX_BLOOMS
  };
}

function renderGardenYearline(stats) {
  if (!elements.gardenYearline) {
    return;
  }

  elements.gardenYearline.innerHTML = "";
  const slotMap = [
    { column: 1, row: 1 },
    { column: 2, row: 1 },
    { column: 3, row: 1 },
    { column: 4, row: 1 },
    { column: 1, row: 2 },
    { column: 4, row: 2 },
    { column: 1, row: 3 },
    { column: 4, row: 3 },
    { column: 1, row: 4 },
    { column: 2, row: 4 },
    { column: 3, row: 4 },
    { column: 4, row: 4 }
  ];

  GARDEN_MONTH_LABELS.forEach((label, index) => {
    const isComplete = index < stats.completedMonths;
    const isCurrent = index === stats.activeMonthIndex && stats.completedMonths < GARDEN_MAX_BLOOMS;
    const miniWaterLevel = isComplete ? 100 : isCurrent ? (stats.visibleDayCount / 30) * 100 : 0;
    const miniWaterClass = miniWaterLevel > 0 ? "garden-mini-bottle-water" : "garden-mini-bottle-water is-empty";
    const month = document.createElement("div");
    month.className = "garden-mini-month";
    month.classList.toggle("is-complete", isComplete);
    month.classList.toggle("is-current", isCurrent);
    month.style.gridColumn = String(slotMap[index].column);
    month.style.gridRow = String(slotMap[index].row);
    month.innerHTML = `
      <span class="garden-mini-month-name">${label}</span>
      <div class="garden-mini-bottle">
        <div class="garden-mini-bottle-mouth"></div>
        <div class="garden-mini-fruit${isComplete ? " is-on" : ""}">
          <span class="garden-fruit-stem"></span>
          <span class="garden-fruit-leaf left"></span>
          <span class="garden-fruit-leaf right"></span>
          <span class="garden-fruit-berry left"></span>
          <span class="garden-fruit-berry right"></span>
          <span class="garden-fruit-spark"></span>
        </div>
        <div class="garden-mini-bottle-neck"></div>
        <div class="garden-mini-bottle-body">
          <div class="${miniWaterClass}" style="height: ${miniWaterLevel}%"></div>
        </div>
        <div class="garden-mini-bottle-base"></div>
      </div>
      <span class="garden-mini-month-note">${GARDEN_PHRASES[index]}</span>
    `;
    elements.gardenYearline.append(month);
  });
}

function spawnWateringAnimation(amount = 1) {
  if (!elements.gardenWateringLayer || !elements.gardenBottle) {
    return;
  }

  elements.gardenWateringLayer.innerHTML = "";
  elements.gardenBottle.classList.remove("is-wiggling");
  void elements.gardenBottle.offsetWidth;
  elements.gardenBottle.classList.add("is-wiggling");

  for (let index = 0; index < amount; index += 1) {
    window.setTimeout(() => {
      const drop = document.createElement("span");
      drop.className = "water-drop";
      drop.style.marginLeft = `${-10 + Math.random() * 20}px`;

      const heart = document.createElement("span");
      heart.className = "water-heart";
      heart.textContent = "❤";
      heart.style.marginLeft = `${-18 + Math.random() * 36}px`;

      elements.gardenWateringLayer.append(drop, heart);

      window.setTimeout(() => {
        drop.remove();
        heart.remove();
      }, 1450);
    }, index * 180);
  }

  window.setTimeout(() => {
    elements.gardenBottle.classList.remove("is-wiggling");
  }, amount * 180 + 1000);
}

function formatGardenDays(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  if (value > 0 && value < 0.1) {
    return "0.1";
  }

  return (Math.round(value * 10) / 10).toFixed(1);
}

const SCORE_DAILY_LIMIT = 3;
const SCORE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

function getScoreSubmitButton() {
  return elements.scoreForm?.querySelector('button[type="submit"]') || null;
}

function getScoreRowTime(row) {
  return new Date(row.updated_at || row.created_at || 0).getTime();
}

function getTodayScoreRows(rows, person = "") {
  const today = getTodayKey();
  return rows
    .filter((item) => item.score_date === today)
    .filter((item) => !person || normalizeIdentity(item.person) === person)
    .sort((left, right) => getScoreRowTime(left) - getScoreRowTime(right));
}

function getScoreAttemptState(rows, person = state.identity) {
  const mineRows = getTodayScoreRows(rows, person);
  const attempts = mineRows.length;
  const nextAttempt = Math.min(attempts + 1, SCORE_DAILY_LIMIT);
  const lastRow = mineRows[attempts - 1] || null;
  const lastTime = lastRow ? getScoreRowTime(lastRow) : 0;
  const cooldownRemaining = lastTime ? Math.max(0, SCORE_COOLDOWN_MS - (Date.now() - lastTime)) : 0;
  const canSubmit = attempts < SCORE_DAILY_LIMIT && cooldownRemaining <= 0;

  return {
    mineRows,
    attempts,
    nextAttempt,
    cooldownRemaining,
    canSubmit,
    totalScore: mineRows.reduce((sum, item) => sum + Number(item.score || 0), 0)
  };
}

function formatScoreCooldown(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} 小时 ${minutes} 分钟`;
  }

  if (hours) {
    return `${hours} 小时`;
  }

  return `${Math.max(1, minutes)} 分钟`;
}

function syncScorePreview() {
  const attemptLabel = elements.scoreForm?.dataset.attemptLabel || "X1";
  elements.scorePreview.textContent = `${elements.scoreInput.value} 分 ${attemptLabel}`;
}

async function handleScoreSubmit(event) {
  event.preventDefault();

  const rows = await fetchRows(tableNames.scores, localKeys.scores, {
    orderColumn: "created_at",
    ascending: false,
    limit: 120
  });
  const scoreState = getScoreAttemptState(rows);

  if (!scoreState.canSubmit) {
    await hydrateScores();
    return;
  }

  await insertRow(tableNames.scores, localKeys.scores, {
    id: crypto.randomUUID(),
    person: state.identity,
    score_date: getTodayKey(),
    score: Number(elements.scoreInput.value),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await hydrateScores();
}

async function hydrateScores() {
  const rows = await fetchRows(tableNames.scores, localKeys.scores, {
    orderColumn: "created_at",
    ascending: false,
    limit: 120
  });
  const todayRows = getTodayScoreRows(rows);
  const scoreState = getScoreAttemptState(rows);
  const scoreButton = getScoreSubmitButton();
  const attemptLabel = `X${scoreState.nextAttempt}`;

  if (elements.scoreForm) {
    elements.scoreForm.dataset.attemptLabel = attemptLabel;
  }

  if (scoreState.mineRows.length) {
    const latestMine = scoreState.mineRows[scoreState.mineRows.length - 1];
    elements.scoreInput.value = `${latestMine.score}`;
  }

  elements.scoreInput.disabled = !scoreState.canSubmit;
  if (scoreButton) {
    scoreButton.disabled = !scoreState.canSubmit;
    scoreButton.textContent = scoreState.attempts >= SCORE_DAILY_LIMIT ? "今天想满了" : `保存 ${attemptLabel}`;
  }

  if (scoreState.attempts >= SCORE_DAILY_LIMIT) {
    elements.scoreStatusBadge.textContent = "今天满格";
  } else if (scoreState.cooldownRemaining > 0) {
    elements.scoreStatusBadge.textContent = `${attemptLabel} 冷却中`;
  } else {
    elements.scoreStatusBadge.textContent = `${attemptLabel} 可记录`;
  }

  syncScorePreview();

  if (!todayRows.length) {
    renderInfoPanel(elements.scoreSummary, "今天还没有想你值。", "每人今天最多 3 次，每次要间隔 3 小时。");
    return;
  }

  const groupedRows = new Map();
  todayRows.forEach((item) => {
    const person = normalizeIdentity(item.person);
    const bucket = groupedRows.get(person) || [];
    bucket.push(item);
    groupedRows.set(person, bucket);
  });

  const wrap = document.createElement("div");
  GARDEN_PEOPLE.filter((person) => groupedRows.has(person)).forEach((person) => {
    const personRows = groupedRows.get(person);
    const total = personRows.reduce((sum, item) => sum + Number(item.score || 0), 0);
    const line = document.createElement("p");
    line.innerHTML = `<strong>${person}</strong>：${total} 分（${personRows.length} 次）`;
    wrap.append(line);

    const detail = document.createElement("p");
    detail.textContent = personRows.map((item, index) => `X${index + 1} ${item.score}分`).join(" / ");
    wrap.append(detail);
  });

  const hint = document.createElement("p");
  if (scoreState.attempts >= SCORE_DAILY_LIMIT) {
    hint.textContent = `你今天已经想满 3 次了，累计 ${scoreState.totalScore} 分。`;
  } else if (scoreState.cooldownRemaining > 0) {
    hint.textContent = `${attemptLabel} 还要再等 ${formatScoreCooldown(scoreState.cooldownRemaining)}。`;
  } else {
    hint.textContent = `${attemptLabel} 已经可以继续记录了，你今天已累计 ${scoreState.totalScore} 分。`;
  }
  wrap.prepend(hint);

  elements.scoreSummary.innerHTML = "";
  elements.scoreSummary.append(wrap);
}

const GARDEN_TIMELINE_START = {
  year: 2026,
  month: 6,
  day: 5
};

const GARDEN_TIMELINE_MONTHS = createGardenTimelineMonths(GARDEN_TIMELINE_START, GARDEN_MAX_BLOOMS);
const GARDEN_TIMELINE_START_LABEL = formatGardenTimelineLabel(GARDEN_TIMELINE_MONTHS[0]);
const GARDEN_TIMELINE_END_LABEL = formatGardenTimelineLabel(
  GARDEN_TIMELINE_MONTHS[GARDEN_TIMELINE_MONTHS.length - 1]
);

function createGardenTimelineMonths(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const monthOffset = start.month - 1 + index;
    const year = start.year + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1;
    return { year, month };
  });
}

function formatGardenTimelineLabel(monthMeta) {
  return `${monthMeta.year}年${monthMeta.month}月`;
}

function getGardenCalendarDaysLeft(monthMeta, now = new Date()) {
  if (!monthMeta) {
    return null;
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (monthMeta.year !== currentYear || monthMeta.month !== currentMonth) {
    return null;
  }

  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  return Math.max(0, lastDayOfMonth - now.getDate());
}

function getGardenCompletedMonthsByCalendar(now = new Date()) {
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const startMonthIndex = GARDEN_TIMELINE_START.year * 12 + (GARDEN_TIMELINE_START.month - 1);
  return Math.max(0, Math.min(GARDEN_MAX_BLOOMS, currentMonthIndex - startMonthIndex));
}

function renderGarden() {
  const stats = getGardenStats();
  const activeMonth = GARDEN_TIMELINE_MONTHS[stats.activeMonthIndex];
  const calendarDaysLeft = getGardenCalendarDaysLeft(activeMonth);
  const gardenIntroText = elements.gardenIntroText || document.querySelector("#gardenIntroText");

  if (gardenIntroText && !elements.gardenIntroText) {
    elements.gardenIntroText = gardenIntroText;
  }

  elements.gardenStageBadge.textContent =
    stats.completedMonths >= GARDEN_MAX_BLOOMS
      ? `${GARDEN_TIMELINE_END_LABEL} 已养满`
      : `当前 ${formatGardenTimelineLabel(activeMonth)}`;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${formatGardenDays(stats.dayEquivalent)} / 30 天`;
  elements.gardenProgressFill.style.width = `${stats.progressPercent}%`;

  if (elements.gardenIntroText) {
    elements.gardenIntroText.textContent = `这一轮从 ${GARDEN_TIMELINE_START_LABEL} 开始，一直排到 ${GARDEN_TIMELINE_END_LABEL}。每天每人最多浇 12 点，两个人一天最多 24 点；这个月里慢慢把它养甜就好，只要过完整个月，这瓶就会按时结出一对小果子。`;
  }

  if (elements.gardenBottleWater) {
    elements.gardenBottleWater.style.height = `${stats.waterLevelPercent}%`;
    elements.gardenBottleWater.classList.toggle("is-empty", stats.visibleDayCount <= 0);
  }

  if (elements.gardenBottleLabel) {
    elements.gardenBottleLabel.textContent = GARDEN_PHRASES[stats.activeMonthIndex];
  }

  if (elements.gardenFruit) {
    elements.gardenFruit.classList.toggle("is-on", stats.completedCurrentMonth);
  }

  renderGardenYearline(stats);

  const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? stats.haohaoToday : stats.xiuqinToday;
  const remainMine = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myTodayCount);
  const remainTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - stats.todayTotal);
  const canWaterOne = remainMine >= 1 && remainTotal >= 1 && stats.completedMonths < GARDEN_MAX_BLOOMS;
  const canWaterTwo = remainMine >= 2 && remainTotal >= 2 && stats.completedMonths < GARDEN_MAX_BLOOMS;

  elements.waterOneButton.disabled = !canWaterOne;
  elements.waterTwoButton.disabled = !canWaterTwo;

  if (stats.completedMonths >= GARDEN_MAX_BLOOMS) {
    elements.gardenProgressHint.textContent = "12 个月的小果子都已经养满了，这一轮被你们照顾得很圆满。";
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "今天的 24 点水已经浇满了，明天继续一起把这瓶养甜。";
  } else if (calendarDaysLeft !== null) {
    elements.gardenProgressHint.textContent = `离 ${formatGardenTimelineLabel(activeMonth)} 这瓶结出小果子，还剩 ${calendarDaysLeft} 天。`;
  } else {
    elements.gardenProgressHint.textContent = `等到了 ${formatGardenTimelineLabel(activeMonth)} 这个月结束，这瓶就会自然结出小果子。`;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `本轮周期：${GARDEN_TIMELINE_START_LABEL} - ${GARDEN_TIMELINE_END_LABEL}，累计养成 ${stats.completedMonths} / ${GARDEN_MAX_BLOOMS} 瓶，相当于 ${formatGardenDays(
      stats.totalWater / GARDEN_DAILY_LIMIT_TOTAL
    )} / 360 天水量。`,
    `今天还能再浇 ${remainTotal} 点，你当前身份还能再浇 ${remainMine} 点。`
  );
}

function renderGardenYearline(stats) {
  if (!elements.gardenYearline) {
    return;
  }

  elements.gardenYearline.innerHTML = "";
  const slotMap = [
    { column: 1, row: 1 },
    { column: 2, row: 1 },
    { column: 3, row: 1 },
    { column: 4, row: 1 },
    { column: 1, row: 2 },
    { column: 4, row: 2 },
    { column: 1, row: 3 },
    { column: 4, row: 3 },
    { column: 1, row: 4 },
    { column: 2, row: 4 },
    { column: 3, row: 4 },
    { column: 4, row: 4 }
  ];

  GARDEN_TIMELINE_MONTHS.forEach((monthMeta, index) => {
    const isComplete = index < stats.completedMonths;
    const isCurrent = index === stats.activeMonthIndex && stats.completedMonths < GARDEN_MAX_BLOOMS;
    const miniWaterLevel = isComplete ? 100 : isCurrent ? (stats.visibleDayCount / 30) * 100 : 0;
    const miniWaterClass = miniWaterLevel > 0 ? "garden-mini-bottle-water" : "garden-mini-bottle-water is-empty";
    const month = document.createElement("div");
    month.className = "garden-mini-month";
    month.classList.toggle("is-complete", isComplete);
    month.classList.toggle("is-current", isCurrent);
    month.style.gridColumn = String(slotMap[index].column);
    month.style.gridRow = String(slotMap[index].row);
    month.innerHTML = `
      <span class="garden-mini-month-name">
        <span class="garden-mini-month-year">${monthMeta.year}</span>
        <span class="garden-mini-month-label">${monthMeta.month}月</span>
      </span>
      <div class="garden-mini-bottle">
        <div class="garden-mini-bottle-mouth"></div>
        <div class="garden-mini-fruit${isComplete ? " is-on" : ""}">
          <span class="garden-fruit-stem"></span>
          <span class="garden-fruit-leaf left"></span>
          <span class="garden-fruit-leaf right"></span>
          <span class="garden-fruit-berry left"></span>
          <span class="garden-fruit-berry right"></span>
          <span class="garden-fruit-spark"></span>
        </div>
        <div class="garden-mini-bottle-neck"></div>
        <div class="garden-mini-bottle-body">
          <div class="${miniWaterClass}" style="height: ${miniWaterLevel}%"></div>
        </div>
        <div class="garden-mini-bottle-base"></div>
      </div>
      <span class="garden-mini-month-note">${GARDEN_PHRASES[index]}</span>
    `;
    elements.gardenYearline.append(month);
  });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}
