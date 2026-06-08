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
  { question: "浠婂ぉ鏈€鎯冲拰瀵规柟涓€璧峰仛浠€涔堬紵", hint: "璇曠潃鍐欎笅绗竴涓烦鍑烘潵鐨勭瓟妗堛€? },
  { question: "濡傛灉浠婃櫄澶氬嚭涓€灏忔椂锛屼綘鏈€鎯虫€庝箞闄鏂癸紵", hint: "鍙互寰堟棩甯革紝涔熷彲浠ュ緢鐢溿€? },
  { question: "鏈€杩戞渶鎯冲惉瀵规柟璇寸殑涓€鍙ヨ瘽鏄粈涔堬紵", hint: "绠€鐭竴鐐逛篃浼氬緢鎴冲績銆? },
  { question: "浠婂ぉ鎯冲埌瀵规柟鏃讹紝鑴戝瓙閲屽厛鍐掑嚭鐨勭敾闈㈡槸浠€涔堬紵", hint: "鍦烘櫙瓒婂叿浣撹秺鍙埍銆? },
  { question: "涓嬩竴娆¤闈紝浣犳渶鎯冲厛鍋氱殑鍔ㄤ綔鏄粈涔堬紵", hint: "鎶辨姳銆佺壍鎵嬨€佺湅鐫€绗戦兘绠椼€? },
  { question: "浣犺寰楁垜浠渶閫傚悎涓€璧峰害杩囧摢绉嶅倣鏅氾紵", hint: "鏄暎姝ャ€佸悆楗€佸彂鍛嗭紝杩樻槸鍒殑銆? },
  { question: "濡傛灉浠婂ぉ鍙兘鐣欎笅涓€涓皬浠紡锛屼綘鏈€鎯抽€変粈涔堬紵", hint: "瓒婂儚浣犱滑瓒婂ソ銆? },
  { question: "瀵规柟浠婂ぉ鏈€闇€瑕佷綘缁欑殑鏄粈涔堬紵", hint: "鍏冲績銆侀櫔浼淬€佸じ澶搞€佹嫢鎶遍兘鍙互銆? }
];

const GARDEN_DAILY_LIMIT_PER_PERSON = 12;
const GARDEN_DAILY_LIMIT_TOTAL = 24;
const GARDEN_WATER_PER_BLOOM = 720;
const GARDEN_MAX_BLOOMS = 12;
const LAMP_NIGHT_START_HOUR = 18;
const BABY_FEED_AMOUNT = 50;
const BABY_FEED_INTERVAL_MS = 3 * 60 * 60 * 1000;
const BABY_DAILY_LIMIT_PER_PERSON = 3;
const BABY_TOTAL_TARGET = 3000;
const GARDEN_PEOPLE = ["鍙峰彿", "绉€鐞?];
const GARDEN_MONTH_LABELS = ["1鏈?, "2鏈?, "3鏈?, "4鏈?, "5鏈?, "6鏈?, "7鏈?, "8鏈?, "9鏈?, "10鏈?, "11鏈?, "12鏈?];
const GARDEN_PHRASES = [
  "榻愬績鍗忓姏",
  "鎱㈡參鍙樼敎",
  "涓€璧烽暱澶?,
  "浠婂ぉ涔熷湪",
  "浣犳祰涓€鍗?,
  "鎴戞祰涓€鍗?,
  "鎶婄埍鍏绘弧",
  "鍚岄鍙戣娊",
  "绋崇ǔ骞哥",
  "蹇冩剰婊＄摱",
  "灏忓皬涓版敹",
  "鏉ュ勾鍐嶈"
];

const state = {
  hasSupabase: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase),
  supabase: null,
  identity: localStorage.getItem(localKeys.identity) || "鍙峰彿",
  currentSyncRound: null,
  gardenRows: [],
  babyRows: [],
  babyFeedSyncMode: Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase) ? "cloud" : "local",
  syncFallbackNoticeShown: false
};

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
  babyTotalAmount: document.querySelector("#babyTotalAmount"),
  babyHaohaoCount: document.querySelector("#babyHaohaoCount"),
  babyXiuqinCount: document.querySelector("#babyXiuqinCount"),
  babyFeedState: document.querySelector("#babyFeedState"),
  babyProgressFill: document.querySelector("#babyProgressFill"),
  babyProgressHint: document.querySelector("#babyProgressHint"),
  babyFeedButton: document.querySelector("#babyFeedButton"),
  babySummary: document.querySelector("#babySummary")
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
  elements.babyFeedButton?.addEventListener("click", handleBabyFeed);
}

function syncIdentityUi() {
  elements.identitySelect.value = state.identity;
  elements.identityHint.textContent = `褰撳墠榛樿浼氫互 ${state.identity} 鐨勮韩浠戒繚瀛樹簰鍔ㄥ唴瀹广€俙;
  elements.identityHint.textContent = `褰撳墠榛樿浼氫互 ${state.identity} 鐨勮韩浠戒繚瀛樹簰鍔ㄥ唴瀹广€俙;
  syncScorePreview();
}

function normalizeIdentity(value) {
  if (value === "娴╂旦" || value === "閸欏嘲褰? || value === "鍙峰彿") {
    return "鍙峰彿";
  }

  if (value === "绉€鐞? || value === "缁夆偓閻?" || value === "缁夆偓閻?" || value === "绉€鐞?) {
    return "绉€鐞?;
  }

  return "鍙峰彿";
}

function handleIdentityChange(event) {
  state.identity = event.target.value;
  localStorage.setItem(localKeys.identity, state.identity);
  syncIdentityUi();
  refreshAll();
}

function setModeStatus(message) {
  if (state.hasSupabase) {
    elements.modeBadge.textContent = "浜戠鍚屾涓?;
    elements.modeHint.textContent = message || "浣犱滑涓や釜浜烘墦寮€鍚屼竴涓嚎涓婇〉闈紝灏变細鐪嬪埌鍚屾牱鐨勪簰鍔ㄨ褰曘€?;
    return;
  }

  elements.modeBadge.textContent = "鏈湴婕旂ず";
  elements.modeHint.textContent = message || "濡傛灉浜戠琛ㄨ繕娌″缓濂斤紝椤甸潰浼氬厛閫€鍥炲綋鍓嶈澶囨湰鍦颁繚瀛樸€?;
}

async function refreshAll() {
  setModeStatus();
  await Promise.all([
    hydrateHugs(),
    hydrateLamps(),
    hydrateScores(),
    hydrateSyncRound(),
    hydrateCapsules(),
    hydrateGarden(),
    hydrateBabyFeeds(),
    typeof hydrateHeroBoard === "function" ? hydrateHeroBoard() : Promise.resolve()
  ]);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function syncScorePreview() {
  elements.scorePreview.textContent = `${elements.scoreInput.value} 鍒哷;
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

  elements.hugButton.textContent = mine ? "浠婂ぉ宸茬粡鎶辨姳" : "鎶变竴涓?;
  elements.hugButton.disabled = Boolean(mine);
  elements.hugScene.classList.toggle("is-on", bothDone);
  elements.hugScene.classList.toggle("is-off", !bothDone);
}

async function handleLampSubmit() {
  const now = new Date();
  if (!isLampNightOpen(now)) {
    await hydrateLamps();
    return;
  }

  const rows = await fetchRows(tableNames.lamps, localKeys.lamps, {
    orderColumn: "created_at",
    ascending: false,
    limit: 40
  });
  const tonightRows = getLampTonightRows(rows, now);
  const existing = tonightRows.find((item) => normalizeIdentity(item.person) === state.identity);
  if (existing) {
    await hydrateLamps();
    return;
  }

  animateLampInteraction();

  await insertRow(tableNames.lamps, localKeys.lamps, {
    id: crypto.randomUUID(),
    person: state.identity,
    action_date: getTodayKey(),
    created_at: new Date().toISOString()
  });

  await hydrateLamps();
  if (typeof hydrateHeroBoard === "function") {
    await hydrateHeroBoard();
  }
}

async function hydrateLamps() {
  const now = new Date();
  const rows = await fetchRows(tableNames.lamps, localKeys.lamps, {
    orderColumn: "created_at",
    ascending: false,
    limit: 20
  });

  const tonightRows = getLampTonightRows(rows, now);
  const mine = tonightRows.find((item) => normalizeIdentity(item.person) === state.identity);
  const bothDone = hasBothPeople(tonightRows);

  elements.lampButton.textContent = mine ? "浠婃櫄宸茬粡鐐逛寒" : "鐐逛寒鏅氬畨鐏?;
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

  elements.scoreStatusBadge.textContent = todayRows.length ? "浠婂ぉ宸茶褰? : "寰呭～鍐?;

  if (mine) {
    elements.scoreInput.value = `${mine.score}`;
    syncScorePreview();
  }

  if (!todayRows.length) {
    renderInfoPanel(elements.scoreSummary, "浠婂ぉ杩樻病鏈夋兂浣犲€笺€?);
    return;
  }

  const wrap = document.createElement("div");
  todayRows
    .sort((a, b) => a.person.localeCompare(b.person, "zh-CN"))
    .forEach((item) => {
      const line = document.createElement("p");
      line.innerHTML = `<strong>${item.person}</strong>锛?{item.score} 鍒哷;
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
    elements.syncQuestionText.textContent = "杩樻病鏈変粖澶╃殑榛樺棰樸€?;
    elements.syncHintText.textContent = "鐐逛竴涓嬫崲涓€棰橈紝灏变細鐢熸垚涓€涓柊鐨勫皬闂銆?;
    elements.syncStatusBadge.textContent = "寰呯敓鎴?;
    elements.syncAnswers.innerHTML = "<p class='empty'>杩樻病鏈夌瓟妗堛€?/p>";
    return;
  }

  elements.syncQuestionText.textContent = round.question;
  elements.syncHintText.textContent = round.hint || "鐪嬬湅浣犱滑浠婂ぉ浼氫笉浼氭兂鍒板悓涓€涓瓟妗堛€?;

  const answers = [
    { author: round.author_a, answer: round.answer_a },
    { author: round.author_b, answer: round.answer_b }
  ].filter((item) => item.author || item.answer);

  const mine = answers.find((item) => item.author === state.identity);

  if (answers.length >= 2) {
    elements.syncStatusBadge.textContent =
      normalizeAnswer(answers[0].answer) === normalizeAnswer(answers[1].answer) ? "榛樺鎴愬姛" : "宸叉彮鏅?;
  } else if (mine) {
    elements.syncStatusBadge.textContent = "浣犲凡浣滅瓟";
  } else {
    elements.syncStatusBadge.textContent = "绛変綘鍥炵瓟";
  }

  elements.syncAnswerInput.value = mine?.answer || "";
  renderSyncAnswers(answers);
}

function renderSyncAnswers(answers) {
  elements.syncAnswers.innerHTML = "";

  if (!answers.length) {
    elements.syncAnswers.innerHTML = "<p class='empty'>杩樻病鏈夌瓟妗堛€?/p>";
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
    elements.capsuleList.innerHTML = "<p class='empty'>杩樻病鏈夊皬绾告潯锛屽厛鐣欑涓€鍙ュ惂銆?/p>";
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = "capsule-item";

    const title = document.createElement("strong");
    title.textContent = `${item.person} 路 ${formatDateTime(item.created_at)}`;

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

  const { data, error } = await query;
  if (error) {
    state.babyFeedSyncMode = "local";
    return sortLocalRows(readJson(localKeys.babyFeeds, []), options);
  }

  state.babyFeedSyncMode = "cloud";
  return data || [];
}

function getTableFriendlyName(tableName) {
  if (tableName === tableNames.scores) return "\u4eca\u65e5\u60f3\u4f60\u503c";
  if (tableName === tableNames.hugs) return "\u4eca\u65e5\u62b1\u62b1";
  if (tableName === tableNames.lamps) return "\u665a\u5b89\u706f";
  if (tableName === tableNames.gardenWatering) return "\u6d47\u6c34\u517b\u679c\u5b50";
  if (tableName === tableNames.babyFeeds) return "\u5582\u5b9d\u5b9d";
  if (tableName === tableNames.capsules) return "\u5c0f\u7eb8\u6761\u80f6\u56ca";
  if (tableName === tableNames.syncRounds) return "\u4eca\u65e5\u9ed8\u5951\u9898";
  return "\u5c0f\u5c4b\u4e92\u52a8";
}

function fallbackInsertToLocal(localKey, payload) {
  const rows = readJson(localKey, []);
  rows.push(payload);
  writeJson(localKey, rows);
}

function fallbackUpdateToLocal(localKey, id, patch) {
  const rows = readJson(localKey, []).map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeJson(localKey, rows);
}

function enterLocalFallbackMode(tableName) {
  const featureName = getTableFriendlyName(tableName);
  state.hasSupabase = false;
  setModeStatus(`${featureName} \u4e91\u7aef\u540c\u6b65\u6682\u65f6\u5931\u8d25\uff0c\u5f53\u524d\u5148\u5207\u5230\u672c\u5730\u6a21\u5f0f\u3002`);

  if (!state.syncFallbackNoticeShown) {
    state.syncFallbackNoticeShown = true;
    window.alert(
      `${featureName} \u4e91\u7aef\u540c\u6b65\u6682\u65f6\u5931\u8d25\uff0c\u5df2\u5148\u4fdd\u5b58\u5728\u5f53\u524d\u8bbe\u5907\uff0c\u4e0d\u7528\u73b0\u5728\u53bb\u8dd1 SQL\u3002\u7a0d\u540e\u5237\u65b0\u9875\u9762\u518d\u8bd5\u5c31\u53ef\u4ee5\u3002`
    );
  }
}

async function insertBabyFeedRow(payload) {
  if (!state.hasSupabase || !state.supabase) {
    const rows = readJson(localKeys.babyFeeds, []);
    rows.push(payload);
    writeJson(localKeys.babyFeeds, rows);
    state.babyFeedSyncMode = "local";
    return;
  }

  const { error } = await state.supabase.from(tableNames.babyFeeds).insert(payload);
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
    return "鍒氬垰";
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}灏忔椂${minutes}鍒嗛挓`;
  }

  if (hours) {
    return `${hours}灏忔椂`;
  }

  return `${Math.max(1, minutes)}鍒嗛挓`;
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
  let statusText = "绛夌涓€椤垮ザ";

  if (totalAmount >= BABY_TOTAL_TARGET) {
    scene = "is-complete";
    statusText = "鍠傚吇姣曚笟";
  } else if (!lastFeedAt) {
    scene = "is-waiting";
    statusText = "绛夌涓€椤垮ザ";
  } else if (bothDailyFull || cooldownRemaining > 0) {
    scene = "is-sleeping";
    statusText = "鐫¤涓?;
  } else {
    scene = "is-crying";
    statusText = "鍝摥涓?;
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
  elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 娆;
  elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 娆;
  elements.babyFeedState.textContent = stats.statusText;
  elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

  if (stats.totalAmount >= BABY_TOTAL_TARGET) {
    elements.babyProgressHint.textContent = "3000ml 宸茬粡鍠傛弧鍟︼紝杩欏瀹濆疂琚綘浠竴璧风ǔ绋冲吇澶т簡銆?;
  } else if (!stats.lastFeedAt) {
    elements.babyProgressHint.textContent = "鍏堝杺绗竴椤垮ザ鍚э紝鍠濆畬 50ml 鍚庡疂瀹濅細瀹夌ǔ鐫?3 灏忔椂銆?;
  } else if (stats.bothDailyFull) {
    elements.babyProgressHint.textContent = "浠婂ぉ浣犱滑涓や釜浜洪兘宸茬粡鍠傛弧 3 娆′簡锛屽疂瀹濆厛鐫¤锛屾槑澶╁啀缁х画銆?;
  } else if (stats.cooldownRemaining > 0) {
    elements.babyProgressHint.textContent = `鍒氬枬瀹屽ザ锛屽疂瀹濅細鐫″埌 ${formatBabyClock(stats.nextFeedAt)} 宸﹀彸銆俙;
  } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
    elements.babyProgressHint.textContent = "杩欓】璇ユ崲瀵规柟鏉ュ杺浜嗭紝浣犱粖澶╃殑 3 娆″凡缁忕敤婊°€?;
  } else {
    elements.babyProgressHint.textContent = `璺濈涓婃鍠傚ザ宸茬粡杩囧幓 ${formatBabyDuration(stats.overdueMs)}锛屽疂瀹濆湪鍝紝蹇潵琛ヨ繖 50ml銆俙;
  }

  elements.babyFeedButton.disabled = !stats.canFeed;
  if (stats.totalAmount >= BABY_TOTAL_TARGET) {
    elements.babyFeedButton.textContent = "3000ml 宸插吇婊?;
  } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
    elements.babyFeedButton.textContent = "浣犱粖澶╁杺婊′簡";
  } else if (stats.bothDailyFull) {
    elements.babyFeedButton.textContent = "鏄庡ぉ鍐嶆潵鍠?;
  } else if (stats.cooldownRemaining > 0 && stats.lastFeedAt) {
    elements.babyFeedButton.textContent = `杩樿绛?${formatBabyDuration(stats.cooldownRemaining)}`;
  } else {
    elements.babyFeedButton.textContent = `鍠?${BABY_FEED_AMOUNT}ml 濂禶;
  }

  const syncHint =
    state.babyFeedSyncMode === "local" && state.hasSupabase
      ? "杩欏紶鍗″綋鍓嶅厛淇濆瓨鍦ㄦ湰鏈猴紝绛変簯绔ˉ涓婂疂瀹濆杺鍏昏〃鍚庯紝涓ら儴鎵嬫満涔熻兘鍚屾銆?
      : `浣犱粖澶╄繕鍙互鍐嶅杺 ${myRemaining} 娆★紝杩欏瀹濆疂杩樺樊 ${stats.remainingAmount}ml 闀垮ぇ銆俙;

  renderInfoPanel(
    elements.babySummary,
    `浠婂ぉ涓€鍏卞杺浜?${stats.todayRows.length * BABY_FEED_AMOUNT}ml锛岀疮璁?${stats.totalAmount} / ${BABY_TOTAL_TARGET}ml銆俙,
    syncHint
  );
}

function spawnBabyFeedAnimation(person = state.identity) {
  if (!elements.babyEffects) {
    return;
  }

  const message = person === GARDEN_PEOPLE[0] ? "璋㈣阿鐖哥埜" : "璋㈣阿濡堝";
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
    heart.textContent = "鉂?;
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

  elements.gardenStageBadge.textContent = `绗?${stats.openBlooms} / ${GARDEN_MAX_BLOOMS} 鏈礰;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${stats.currentProgress} / ${GARDEN_WATER_PER_BLOOM}`;
  elements.gardenProgressFill.style.width = `${stats.progressPercent}%`;
  const hasBloomed = stats.openBlooms > 0;
  elements.gardenFlower.classList.toggle("is-blooming", hasBloomed);
  elements.gardenSprout.classList.toggle("is-hidden", hasBloomed);

  renderGardenBlooms(stats.openBlooms);

  const myTodayCount = state.identity === "鍙峰彿" ? stats.haohaoToday : stats.xiuqinToday;
  const remainMine = Math.max(0, GARDEN_DAILY_LIMIT_PER_PERSON - myTodayCount);
  const remainTotal = Math.max(0, GARDEN_DAILY_LIMIT_TOTAL - stats.todayTotal);

  const canWaterOne = remainMine >= 1 && remainTotal >= 1 && stats.openBlooms < GARDEN_MAX_BLOOMS;
  const canWaterTwo = remainMine >= 2 && remainTotal >= 2 && stats.openBlooms < GARDEN_MAX_BLOOMS;

  elements.waterOneButton.disabled = !canWaterOne;
  elements.waterTwoButton.disabled = !canWaterTwo;

  if (stats.openBlooms >= GARDEN_MAX_BLOOMS) {
    elements.gardenProgressHint.textContent = "浣犱滑宸茬粡寮€婊?12 鏈佃姳鍟︼紝杩欑泦鑺辫浣犱滑鍏诲緱寰堝渾婊°€?;
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "浠婂ぉ鐨?24 娆℃按宸茬粡娴囨弧浜嗭紝鏄庡ぉ缁х画涓€璧峰吇銆?;
  } else {
    elements.gardenProgressHint.textContent = `璺濈寮€鍑轰笅涓€鏈佃姳杩樺樊 ${stats.remainingForNextBloom} 鐐规按閲忋€俙;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `绱姘撮噺锛?{stats.totalWater} / ${GARDEN_WATER_PER_BLOOM * GARDEN_MAX_BLOOMS}`,
    hasBloomed
      ? `浠婂ぉ杩樿兘鍐嶆祰 ${Math.max(0, remainTotal)} 娆★紝浣犲綋鍓嶈韩浠借繕鑳芥祰 ${Math.max(0, remainMine)} 娆°€俙
      : `鐜板湪杩樻槸灏忚姳鑻椼€備粖澶╄繕鑳藉啀娴?${Math.max(0, remainTotal)} 娆★紝浣犲綋鍓嶈韩浠借繕鑳芥祰 ${Math.max(0, remainMine)} 娆°€俙
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
  const haohaoRow = todayRows.find((item) => item.person === "鍙峰彿");
  const xiuqinRow = todayRows.find((item) => item.person === "绉€鐞?);
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
  heart.textContent = "鉂?;

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
  return names.has("鍙峰彿") && names.has("绉€鐞?);
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
    setModeStatus(`浜戠琛?${tableName} 杩樻病鍑嗗濂斤紝褰撳墠鍏堝垏鍒版湰鍦版ā寮忋€俙);
    return sortLocalRows(readJson(localKey, []), options);
  }

  return data || [];
}

async function insertRow(tableName, localKey, payload) {
  if (!state.hasSupabase) {
    fallbackInsertToLocal(localKey, payload);
    return;
  }

  const { error } = await state.supabase.from(tableName).insert(payload);
  if (error) {
    console.error(error);
    window.alert(`浜戠鍐欏叆澶辫触锛?{tableName} 鍙兘杩樻病鏈夊缓濂斤紝璇峰厛鎵ц鏂扮殑 SQL銆俙);
  }
}

async function updateRow(tableName, localKey, id, patch) {
  if (!state.hasSupabase) {
    fallbackUpdateToLocal(localKey, id, patch);
    return;
  }

  const { error } = await state.supabase.from(tableName).update(patch).eq("id", id);
  if (error) {
    console.error(error);
    window.alert(`浜戠鏇存柊澶辫触锛?{tableName} 鐨勬洿鏂版潈闄愬彲鑳借繕娌℃墦寮€銆俙);
  }
}

function clearLocalCache() {
  Object.values(localKeys).forEach((key) => localStorage.removeItem(key));
  state.identity = "鍙峰彿";
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
  if (value === "娴╂旦" || value === "閸欏嘲褰? || value === "鍙峰彿") {
    return "鍙峰彿";
  }

  if (value === "绉€鐞? || value === "缁夆偓閻?" || value === "缁夆偓閻?" || value === "绉€鐞?) {
    return "绉€鐞?;
  }

  return "鍙峰彿";
}

function syncIdentityUi() {
  state.identity = normalizeIdentity(state.identity);
  elements.identitySelect.value = state.identity;
  elements.identityHint.textContent = `褰撳墠榛樿浼氫互 ${state.identity} 鐨勮韩浠戒繚瀛樹簰鍔ㄥ唴瀹广€俙;
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
      ? `绗?${GARDEN_MAX_BLOOMS} / ${GARDEN_MAX_BLOOMS} 鏈坄
      : `绗?${stats.activeMonthNumber} / ${GARDEN_MAX_BLOOMS} 鏈坄;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${formatGardenDays(stats.dayEquivalent)} / 30 澶ー;
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
    elements.gardenProgressHint.textContent = "12 涓湀鐨勫皬鏋滃瓙閮藉凡缁忓吇婊′簡锛岃繖涓€骞磋浣犱滑鐓ч【寰楀緢鍦嗘弧銆?;
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "浠婂ぉ鐨?24 鐐规按宸茬粡娴囨弧浜嗭紝鏄庡ぉ缁х画涓€璧锋妸杩欑摱鍏荤敎銆?;
  } else {
    elements.gardenProgressHint.textContent = `绂昏繖鐡剁粨鍑哄皬鏋滃瓙杩樺樊 ${formatGardenDays(
      stats.remainingForNextBloom / GARDEN_DAILY_LIMIT_TOTAL
    )} 澶╃殑姘撮噺銆俙;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `绱鍏绘垚 ${stats.completedMonths} / ${GARDEN_MAX_BLOOMS} 鏈堬紝鐩稿綋浜?${formatGardenDays(
      stats.totalWater / GARDEN_DAILY_LIMIT_TOTAL
    )} / 360 澶╂按閲廯,
    `浠婂ぉ杩樿兘鍐嶆祰 ${remainTotal} 鐐癸紝浣犲綋鍓嶈韩浠借繕鑳藉啀娴?${remainMine} 鐐广€俙
  );
}

function getGardenStats() {
  const today = getTodayKey();
  const totalWater = state.gardenRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const cappedTotalWater = Math.min(totalWater, GARDEN_WATER_PER_BLOOM * GARDEN_MAX_BLOOMS);
  const completedMonths = Math.min(GARDEN_MAX_BLOOMS, Math.floor(cappedTotalWater / GARDEN_WATER_PER_BLOOM));
  const currentProgress =
    completedMonths >= GARDEN_MAX_BLOOMS ? GARDEN_WATER_PER_BLOOM : cappedTotalWater % GARDEN_WATER_PER_BLOOM;
  const todayRows = state.gardenRows.filter((item) => item.water_date === today);
  const todayTotal = todayRows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const haohaoRow = todayRows.find((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[0]);
  const xiuqinRow = todayRows.find((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[1]);
  const haohaoToday = Number(haohaoRow?.count || 0);
  const xiuqinToday = Number(xiuqinRow?.count || 0);
  const remainingForNextBloom =
    completedMonths >= GARDEN_MAX_BLOOMS ? 0 : Math.max(0, GARDEN_WATER_PER_BLOOM - currentProgress);
  const activeMonthIndex = Math.min(completedMonths, GARDEN_MAX_BLOOMS - 1);
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
      heart.textContent = "鉂?;
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
    return `${hours} 灏忔椂 ${minutes} 鍒嗛挓`;
  }

  if (hours) {
    return `${hours} 灏忔椂`;
  }

  return `${Math.max(1, minutes)} 鍒嗛挓`;
}

function syncScorePreview() {
  const attemptLabel = elements.scoreForm?.dataset.attemptLabel || "X1";
  elements.scorePreview.textContent = `${elements.scoreInput.value} 鍒?${attemptLabel}`;
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
    scoreButton.textContent = scoreState.attempts >= SCORE_DAILY_LIMIT ? "浠婂ぉ鎯虫弧浜? : `淇濆瓨 ${attemptLabel}`;
  }

  if (scoreState.attempts >= SCORE_DAILY_LIMIT) {
    elements.scoreStatusBadge.textContent = "浠婂ぉ婊℃牸";
  } else if (scoreState.cooldownRemaining > 0) {
    elements.scoreStatusBadge.textContent = `${attemptLabel} 鍐峰嵈涓璥;
  } else {
    elements.scoreStatusBadge.textContent = `${attemptLabel} 鍙褰昤;
  }

  syncScorePreview();

  if (!todayRows.length) {
    renderInfoPanel(elements.scoreSummary, "浠婂ぉ杩樻病鏈夋兂浣犲€笺€?, "姣忎汉浠婂ぉ鏈€澶?3 娆★紝姣忔瑕侀棿闅?3 灏忔椂銆?);
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
    line.innerHTML = `<strong>${person}</strong>锛?{total} 鍒嗭紙${personRows.length} 娆★級`;
    wrap.append(line);

    const detail = document.createElement("p");
    detail.textContent = personRows.map((item, index) => `X${index + 1} ${item.score}鍒哷).join(" / ");
    wrap.append(detail);
  });

  const hint = document.createElement("p");
  if (scoreState.attempts >= SCORE_DAILY_LIMIT) {
    hint.textContent = `浣犱粖澶╁凡缁忔兂婊?3 娆′簡锛岀疮璁?${scoreState.totalScore} 鍒嗐€俙;
  } else if (scoreState.cooldownRemaining > 0) {
    hint.textContent = `${attemptLabel} 杩樿鍐嶇瓑 ${formatScoreCooldown(scoreState.cooldownRemaining)}銆俙;
  } else {
    hint.textContent = `${attemptLabel} 宸茬粡鍙互缁х画璁板綍浜嗭紝浣犱粖澶╁凡绱 ${scoreState.totalScore} 鍒嗐€俙;
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
  return `${monthMeta.year}骞?{monthMeta.month}鏈坄;
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
      ? `${GARDEN_TIMELINE_END_LABEL} 宸插吇婊
      : `褰撳墠 ${formatGardenTimelineLabel(activeMonth)}`;
  elements.gardenTodayTotal.textContent = `${stats.todayTotal} / ${GARDEN_DAILY_LIMIT_TOTAL}`;
  elements.gardenHaohaoCount.textContent = `${stats.haohaoToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenXiuqinCount.textContent = `${stats.xiuqinToday} / ${GARDEN_DAILY_LIMIT_PER_PERSON}`;
  elements.gardenProgressText.textContent = `${formatGardenDays(stats.dayEquivalent)} / 30 澶ー;
  elements.gardenProgressFill.style.width = `${stats.progressPercent}%`;

  if (elements.gardenIntroText) {
    elements.gardenIntroText.textContent = `杩欎竴杞粠 ${GARDEN_TIMELINE_START_LABEL} 寮€濮嬶紝涓€鐩存帓鍒?${GARDEN_TIMELINE_END_LABEL}銆傛瘡澶╂瘡浜烘渶澶氭祰 12 鐐癸紝涓や釜浜轰竴澶╂渶澶?24 鐐癸紱鎶婅繖 24 鐐规參鎱㈡祰婊★紝绱鍏诲 30 澶╋紝杩欎釜鏈堢殑鐡跺彛灏变細缁撳嚭涓€瀵瑰皬鏋滃瓙銆俙;
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
    elements.gardenProgressHint.textContent = "\u8fd9 12 \u4e2a\u6708\u7684\u5c0f\u679c\u5b50\u90fd\u5df2\u7ecf\u517b\u6ee1\u4e86\uff0c\u8fd9\u4e00\u8f6e\u88ab\u4f60\u4eec\u7167\u987e\u5f97\u5f88\u5706\u6ee1\u3002";
  } else if (stats.todayTotal >= GARDEN_DAILY_LIMIT_TOTAL) {
    elements.gardenProgressHint.textContent = "\u4eca\u5929\u7684 24 \u70b9\u6c34\u5df2\u7ecf\u6d47\u6ee1\u4e86\uff0c\u660e\u5929\u7ee7\u7eed\u4e00\u8d77\u628a\u8fd9\u74f6\u517b\u751c\u3002";
  } else if (calendarDaysLeft !== null) {
    elements.gardenProgressHint.textContent = `\u79bb ${formatGardenTimelineLabel(activeMonth)} \u8fd9\u74f6\u7ed3\u51fa\u5c0f\u679c\u5b50\uff0c\u8fd8\u5269 ${calendarDaysLeft} \u5929\u3002`;
  } else {
    elements.gardenProgressHint.textContent = `\u79bb ${formatGardenTimelineLabel(activeMonth)} \u8fd9\u74f6\u7ed3\u51fa\u5c0f\u679c\u5b50\uff0c\u8fd8\u5dee ${formatGardenDays(stats.remainingForNextBloom / GARDEN_DAILY_LIMIT_TOTAL)} \u5929\u7684\u6c34\u91cf\u3002`;
  }

  renderInfoPanel(
    elements.gardenSummary,
    `鏈疆鍛ㄦ湡锛?{GARDEN_TIMELINE_START_LABEL} - ${GARDEN_TIMELINE_END_LABEL}锛岀疮璁″吇鎴?${stats.completedMonths} / ${GARDEN_MAX_BLOOMS} 鐡讹紝鐩稿綋浜?${formatGardenDays(
      stats.totalWater / GARDEN_DAILY_LIMIT_TOTAL
    )} / 360 澶╂按閲忋€俙,
    `浠婂ぉ杩樿兘鍐嶆祰 ${remainTotal} 鐐癸紝浣犲綋鍓嶈韩浠借繕鑳藉啀娴?${remainMine} 鐐广€俙
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
        <span class="garden-mini-month-label">${monthMeta.month}鏈?/span>
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
  return `${date.getMonth() + 1}鏈?{date.getDate()}鏃?${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}
