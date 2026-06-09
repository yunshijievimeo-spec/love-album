const config = window.LOVE_ALBUM_CONFIG || {};
const PEOPLE = ["号号", "秀琴"];
const MAX_RECORDS = 30;
const MAX_PER_DAY = 2;
const MAX_IMAGE_BYTES = 450 * 1024;
const CLOUD_REFRESH_MS = 8000;
const DEFAULT_TABLE = config.momentPuzzleTableName || "couple_moment_puzzles";
const LOCAL_KEYS = {
  records: "love-moment-puzzles-records",
  identity: "love-room-identity",
  historyUnlocked: "love-moment-history-unlocked"
};

const elements = {
  syncModeBadge: document.querySelector("#syncModeBadge"),
  syncModeHint: document.querySelector("#syncModeHint"),
  identitySelect: document.querySelector("#identitySelect"),
  todayBadge: document.querySelector("#todayBadge"),
  uploadForm: document.querySelector("#uploadForm"),
  photoInput: document.querySelector("#photoInput"),
  uploadPreview: document.querySelector("#uploadPreview"),
  uploadPlaceholder: document.querySelector("#uploadPlaceholder"),
  noteInput: document.querySelector("#noteInput"),
  submitButton: document.querySelector("#submitButton"),
  deleteTodayButton: document.querySelector("#deleteTodayButton"),
  slotOneButton: document.querySelector("#slotOneButton"),
  slotTwoButton: document.querySelector("#slotTwoButton"),
  saveStatus: document.querySelector("#saveStatus"),
  todayRecordTitle: document.querySelector("#todayRecordTitle"),
  uploadStatusText: document.querySelector("#uploadStatusText"),
  reshuffleButton: document.querySelector("#reshuffleButton"),
  emptyState: document.querySelector("#emptyState"),
  puzzleWrap: document.querySelector("#puzzleWrap"),
  puzzleStage: document.querySelector("#puzzleStage"),
  puzzleBoard: document.querySelector("#puzzleBoard"),
  stageReveal: document.querySelector("#stageReveal"),
  stageRevealImage: document.querySelector("#stageRevealImage"),
  stageRevealTitle: document.querySelector("#stageRevealTitle"),
  moveCount: document.querySelector("#moveCount"),
  selectedTip: document.querySelector("#selectedTip"),
  viewerTitle: document.querySelector("#viewerTitle"),
  viewerMeta: document.querySelector("#viewerMeta"),
  viewerHint: document.querySelector("#viewerHint"),
  deleteSelectedButton: document.querySelector("#deleteSelectedButton"),
  haohaoCompletionStatus: document.querySelector("#haohaoCompletionStatus"),
  xiuqinCompletionStatus: document.querySelector("#xiuqinCompletionStatus"),
  revealPanel: document.querySelector("#revealPanel"),
  revealImage: document.querySelector("#revealImage"),
  revealTitle: document.querySelector("#revealTitle"),
  revealNote: document.querySelector("#revealNote"),
  historyGate: document.querySelector("#historyGate"),
  historyUnlockForm: document.querySelector("#historyUnlockForm"),
  historyPasswordInput: document.querySelector("#historyPasswordInput"),
  historyUnlockButton: document.querySelector("#historyUnlockButton"),
  historyLockButton: document.querySelector("#historyLockButton"),
  historyUnlockStatus: document.querySelector("#historyUnlockStatus"),
  historyList: document.querySelector("#historyList"),
  heartBurst: document.querySelector("#heartBurst")
};

const state = {
  identity: normalizePerson(localStorage.getItem(LOCAL_KEYS.identity) || "号号"),
  records: readLocalRecords(),
  selectedId: null,
  currentSlot: 1,
  selectedTile: null,
  pieces: [],
  moves: 0,
  solved: false,
  supabaseClient: null,
  hasCloud: false,
  syncTimer: 0,
  syncInFlight: false,
  previewUrl: "",
  shouldAnimateReveal: false,
  historyUnlocked: readHistoryUnlockState()
};

elements.identitySelect.value = state.identity;
elements.todayBadge.textContent = formatDisplayDate(getTodayString());
setSyncMode("本地预览准备中", "页面先用本地内容起步，再去尝试连接云端。");
refreshSelectedRecord();
updateSlotButtons();
renderAll();

elements.identitySelect.addEventListener("change", () => {
  state.identity = normalizePerson(elements.identitySelect.value);
  localStorage.setItem(LOCAL_KEYS.identity, state.identity);
  state.selectedId = null;
  refreshSelectedRecord();
  renderAll();
  void syncMomentsFromCloud();
});

elements.photoInput.addEventListener("change", handlePreviewChange);
elements.uploadForm.addEventListener("submit", handleSaveRecord);
elements.historyUnlockForm?.addEventListener("submit", handleHistoryUnlock);
elements.historyLockButton?.addEventListener("click", lockHistorySection);
elements.slotOneButton?.addEventListener("click", () => switchComposerSlot(1));
elements.slotTwoButton?.addEventListener("click", () => switchComposerSlot(2));
elements.deleteTodayButton.addEventListener("click", async () => {
  const record = getTodayRecordForPerson(state.identity, state.currentSlot);
  if (record) await deleteRecord(record);
});
elements.deleteSelectedButton.addEventListener("click", async () => {
  const record = getSelectedRecord();
  if (record) await deleteRecord(record);
});
elements.reshuffleButton.addEventListener("click", () => {
  const record = getSelectedRecord();
  if (!record) return;
  setupPuzzle(record);
  renderPuzzleArea();
});

window.addEventListener("focus", () => {
  void syncMomentsFromCloud();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void syncMomentsFromCloud();
  }
});

connectCloudIfPossible();

function normalizePerson(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (text === "浩浩" || text === "号号" || text === "鍙峰彿" || lower === "haohao") return "号号";
  if (text === "秀琴" || text === "绉€鐞?" || text === "绉€鐞" || lower === "xiuqin") return "秀琴";
  return "号号";
}

function getHistoryPassword() {
  return String(config.momentHistoryPassword || config.sitePassword || "").trim();
}

function readHistoryUnlockState() {
  if (!getHistoryPassword()) return true;

  try {
    return sessionStorage.getItem(LOCAL_KEYS.historyUnlocked) === "1";
  } catch (error) {
    console.error(error);
    return false;
  }
}

function writeHistoryUnlockState(value) {
  try {
    sessionStorage.setItem(LOCAL_KEYS.historyUnlocked, value ? "1" : "0");
  } catch (error) {
    console.error(error);
  }
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatShortDate(dateString) {
  const [, month, day] = dateString.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function formatDateTime(isoString) {
  const date = new Date(isoString || Date.now());
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function personKey(person) {
  return person === "秀琴" ? "xiuqin" : "haohao";
}

function isSamePerson(left, right) {
  return personKey(normalizePerson(left)) === personKey(normalizePerson(right));
}

function isRecordOwnedByViewer(record) {
  return isSamePerson(record.person, state.identity);
}

function setSyncMode(title, hint) {
  elements.syncModeBadge.textContent = title;
  elements.syncModeHint.textContent = hint;
}

function getSolvedAtField(person) {
  return person === "秀琴" ? "solved_by_xiuqin_at" : "solved_by_haohao_at";
}

function getSlotKey(record) {
  return `${record.person}-${record.moment_date}-${record.puzzle_slot || 1}`;
}

function updateSlotButtons() {
  [elements.slotOneButton, elements.slotTwoButton].forEach((button, index) => {
    if (!button) return;
    const slot = index + 1;
    const isActive = slot === state.currentSlot;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function switchComposerSlot(slot) {
  state.currentSlot = slot;
  clearPreviewUrl();
  updateSlotButtons();
  renderComposer();
}

function readLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.records);
    const parsed = raw ? JSON.parse(raw) : [];
    return trimRecords(parsed.map(normalizeRecord));
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveLocalRecords(records) {
  const trimmed = trimRecords(records);
  localStorage.setItem(LOCAL_KEYS.records, JSON.stringify(trimmed));
  state.records = trimmed;
}

function normalizeRecord(record) {
  return {
    id: record.id || crypto.randomUUID(),
    person: normalizePerson(record.person),
    moment_date: record.moment_date || getTodayString(),
    puzzle_slot: Number(record.puzzle_slot || 1),
    note: (record.note || "").trim(),
    image_path: record.image_path || "",
    image_url: record.image_url || "",
    image_size: Number(record.image_size || 0),
    width: Number(record.width || 0),
    height: Number(record.height || 0),
    solved_by_haohao_at: record.solved_by_haohao_at || "",
    solved_by_xiuqin_at: record.solved_by_xiuqin_at || "",
    created_at: record.created_at || new Date().toISOString()
  };
}

function compareRecords(left, right) {
  const leftTime = new Date(left.moment_date).getTime();
  const rightTime = new Date(right.moment_date).getTime();
  if (rightTime !== leftTime) return rightTime - leftTime;
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

function trimRecords(records) {
  const merged = [];
  const seen = new Set();

  records
    .map(normalizeRecord)
    .sort(compareRecords)
    .forEach((record) => {
      const key = getSlotKey(record);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(record);
    });

  return merged.slice(0, MAX_RECORDS);
}

function mergeRecords(primary, secondary) {
  const merged = new Map();

  [...primary, ...secondary].forEach((record) => {
    const normalized = normalizeRecord(record);
    const key = getSlotKey(normalized);
    const existing = merged.get(key);
    merged.set(key, existing ? mergeDuplicateRecord(existing, normalized) : normalized);
  });

  return trimRecords(Array.from(merged.values()));
}

function mergeDuplicateRecord(left, right) {
  const normalizedLeft = normalizeRecord(left);
  const normalizedRight = normalizeRecord(right);
  const newer = compareRecords(normalizedLeft, normalizedRight) <= 0 ? normalizedLeft : normalizedRight;
  const older = newer === normalizedLeft ? normalizedRight : normalizedLeft;

  return normalizeRecord({
    ...older,
    ...newer,
    note: newer.note || older.note || "",
    image_path: newer.image_path || older.image_path || "",
    image_url: newer.image_url || older.image_url || "",
    image_size: newer.image_size || older.image_size || 0,
    width: newer.width || older.width || 0,
    height: newer.height || older.height || 0,
    solved_by_haohao_at: newer.solved_by_haohao_at || older.solved_by_haohao_at || "",
    solved_by_xiuqin_at: newer.solved_by_xiuqin_at || older.solved_by_xiuqin_at || ""
  });
}

function getTodayRecordsForPerson(person) {
  return state.records
    .filter((record) => record.person === person && record.moment_date === getTodayString())
    .sort((left, right) => left.puzzle_slot - right.puzzle_slot);
}

function getTodayRecordForPerson(person, slot = state.currentSlot) {
  return getTodayRecordsForPerson(person).find((record) => record.puzzle_slot === slot) || null;
}

function getSelectedRecord() {
  return state.records.find((record) => record.id === state.selectedId) || null;
}

function pickDefaultRecord() {
  const opposite = PEOPLE.find((person) => person !== state.identity);
  const unsolvedRecord = state.records.find(
    (record) => record.person === opposite && !record[getSolvedAtField(state.identity)]
  );
  return unsolvedRecord || state.records.find((record) => record.person === opposite) || state.records[0] || null;
}

function refreshSelectedRecord() {
  const selected = getSelectedRecord();
  if (selected) return;
  const record = pickDefaultRecord();
  state.selectedId = record ? record.id : null;
  state.selectedTile = null;
  state.moves = 0;
  state.solved = false;
  state.pieces = [];
}

function renderAll() {
  renderComposer();
  renderHistoryGate();
  renderHistory();
  renderPuzzleArea();
}

function renderHistoryGate() {
  if (!elements.historyGate) return;

  const password = getHistoryPassword();
  const needsPassword = Boolean(password);

  elements.historyGate.hidden = false;
  elements.historyLockButton.hidden = !needsPassword || !state.historyUnlocked;
  elements.historyUnlockButton.hidden = !needsPassword && state.historyUnlocked;
  elements.historyPasswordInput.disabled = !needsPassword || state.historyUnlocked;
  elements.historyUnlockButton.disabled = !needsPassword || state.historyUnlocked;

  if (!needsPassword) {
    elements.historyUnlockStatus.textContent = "没有单独配置密码，这里会直接显示最近 30 张。";
    return;
  }

  if (state.historyUnlocked) {
    elements.historyUnlockStatus.textContent = "密码正确，最近 30 张已经展开。";
    elements.historyPasswordInput.value = "";
    elements.historyPasswordInput.placeholder = "已经解锁，想重新隐藏可以点右边按钮";
  } else {
    elements.historyUnlockStatus.textContent = "输入密码后，下面才会显示最近 30 张已经拼开的图。";
    elements.historyPasswordInput.placeholder = "输入密码后查看";
  }
}

async function handleHistoryUnlock(event) {
  event.preventDefault();

  const password = getHistoryPassword();
  if (!password) {
    state.historyUnlocked = true;
    renderAll();
    return;
  }

  const input = elements.historyPasswordInput.value.trim();
  if (!input) {
    elements.historyUnlockStatus.textContent = "先输入密码，再看最近 30 张。";
    return;
  }

  if (input !== password) {
    elements.historyUnlockStatus.textContent = "密码不对，再试一次。";
    elements.historyPasswordInput.select();
    return;
  }

  state.historyUnlocked = true;
  writeHistoryUnlockState(true);
  renderAll();
}

function lockHistorySection() {
  state.historyUnlocked = false;
  writeHistoryUnlockState(false);
  elements.historyPasswordInput.value = "";
  renderAll();
}

function renderComposer() {
  const todayRecords = getTodayRecordsForPerson(state.identity);
  const todayRecord = getTodayRecordForPerson(state.identity, state.currentSlot);
  const previewSource = state.previewUrl || todayRecord?.image_url || "";
  const countText = `${todayRecords.length} / ${MAX_PER_DAY}`;

  if (previewSource) {
    elements.uploadPreview.src = previewSource;
    elements.uploadPreview.hidden = false;
    elements.uploadPlaceholder.hidden = true;
  } else {
    elements.uploadPreview.hidden = true;
    elements.uploadPlaceholder.hidden = false;
  }

  if (todayRecord) {
    elements.todayRecordTitle.textContent = `${state.identity}今天第 ${state.currentSlot} 张已经藏好`;
    elements.uploadStatusText.textContent = `今天已放 ${countText} 张。上次保存时间：${formatDateTime(todayRecord.created_at)}，可以换图，也可以只改留言。`;
    elements.deleteTodayButton.disabled = false;
    if (!state.previewUrl) elements.noteInput.value = todayRecord.note || "";
  } else {
    elements.todayRecordTitle.textContent = `今天第 ${state.currentSlot} 张还空着`;
    elements.uploadStatusText.textContent = `今天已放 ${countText} 张。选一张照片就能开始，今天最多可以放 2 张。`;
    elements.deleteTodayButton.disabled = true;
    if (!state.previewUrl) elements.noteInput.value = "";
  }
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  if (!state.historyUnlocked) {
    const locked = document.createElement("div");
    locked.className = "empty-state";
    locked.innerHTML = "<strong>最近 30 张已上锁</strong><p>先在上面输入密码，再看已经拼开的那些小瞬间。</p>";
    elements.historyList.append(locked);
    return;
  }

  if (!state.records.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>最近还没有小瞬间</strong><p>等你们传进来第一张图，这里就会慢慢排起来。</p>";
    elements.historyList.append(empty);
    return;
  }

  state.records.forEach((record) => {
    const article = document.createElement("article");
    article.className = `history-item${record.id === state.selectedId ? " is-active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-select-button";
    button.addEventListener("click", () => {
      state.selectedId = record.id;
      setupPuzzle(record);
      renderAll();
    });

    const isUnlocked = isRecordUnlockedForViewer(record);
    let thumb = null;

    if (isUnlocked) {
      thumb = document.createElement("img");
      thumb.className = "history-thumb";
      thumb.alt = `${record.person} 的小瞬间`;
      thumb.src = record.image_url;
      thumb.loading = "lazy";
    } else {
      thumb = document.createElement("div");
      thumb.className = "history-thumb history-thumb-locked";
      thumb.innerHTML = "<span>待拼开</span><small>先去上面把这张拼图解锁</small>";
    }

    const title = document.createElement("div");
    title.className = "history-title";
    title.textContent = `${record.person} · ${formatShortDate(record.moment_date)} · 第 ${record.puzzle_slot} 张`;

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = isUnlocked
      ? `${formatDateTime(record.created_at)} · ${formatBytes(record.image_size)} · 已拼开 ${getSolvedCount(record)}/2`
      : `${formatDateTime(record.created_at)} · 等你先拼开`;

    const note = document.createElement("div");
    note.className = "history-note";
    note.textContent = isUnlocked ? record.note || "拼开后，会看到留给你的那一句话。" : "这张还没有对你揭晓，先去拼图区把它拼开吧。";

    button.append(thumb, title, meta, note);
    article.append(button);

    if (isRecordOwnedByViewer(record)) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "history-delete-button";
      deleteButton.textContent = "删除这张";
      deleteButton.addEventListener("click", async () => {
        await deleteRecord(record);
      });
      article.append(deleteButton);
    }

    elements.historyList.append(article);
  });
}

function renderPuzzleArea() {
  const record = getSelectedRecord();

  if (!record) {
    elements.emptyState.hidden = false;
    elements.puzzleWrap.hidden = true;
    elements.reshuffleButton.disabled = true;
    hideRevealState();
    return;
  }

  if (!state.pieces.length) setupPuzzle(record);

  elements.emptyState.hidden = true;
  elements.puzzleWrap.hidden = false;
  elements.reshuffleButton.disabled = false;
  elements.viewerTitle.textContent = `${record.person} 的 ${formatShortDate(record.moment_date)} · 第 ${record.puzzle_slot} 张`;
  elements.viewerMeta.textContent = `上传于 ${formatDateTime(record.created_at)}${record.image_size ? ` · ${formatBytes(record.image_size)}` : ""}`;
  elements.moveCount.textContent = `已交换 ${state.moves} 次`;
  elements.selectedTip.textContent = state.selectedTile === null ? "还没有选中图块" : `已选中第 ${state.selectedTile + 1} 块，再点另一块交换`;
  elements.deleteSelectedButton.hidden = !isRecordOwnedByViewer(record);
  renderCompletionStatus(record);
  elements.viewerHint.textContent = state.solved
    ? "已经拼开了，想再玩一次的话可以重新打乱。"
    : "点一块，再点另一块交换位置，把照片拼回去就会揭晓。";

  renderBoard(record);

  if (state.solved) {
    const revealTitle = `你拼开了${record.person}的今天`;
    elements.revealPanel.hidden = false;
    elements.revealImage.src = record.image_url;
    elements.revealTitle.textContent = revealTitle;
    elements.revealNote.textContent = record.note || "今天的小瞬间，被你认真拼开了。";
    elements.stageReveal.hidden = false;
    elements.stageRevealImage.src = record.image_url;
    elements.stageRevealTitle.textContent = revealTitle;
    showRevealState();
  } else {
    hideRevealState();
  }
}

function renderBoard(record) {
  elements.puzzleBoard.innerHTML = "";

  state.pieces.forEach((piece, position) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `puzzle-piece${state.selectedTile === position ? " is-selected" : ""}${state.solved ? " is-solved" : ""}`;
    button.dataset.piece = String(piece + 1);
    button.style.backgroundImage = `url("${record.image_url}")`;
    button.style.backgroundSize = "300% 300%";
    button.style.backgroundPosition = `${(piece % 3) * 50}% ${Math.floor(piece / 3) * 50}%`;
    button.addEventListener("click", () => {
      void handlePieceClick(position);
    });
    elements.puzzleBoard.append(button);
  });
}

function renderCompletionStatus(record) {
  updateCompletionPill(elements.haohaoCompletionStatus, Boolean(record.solved_by_haohao_at), record.solved_by_haohao_at);
  updateCompletionPill(elements.xiuqinCompletionStatus, Boolean(record.solved_by_xiuqin_at), record.solved_by_xiuqin_at);
}

function getSolvedCount(record) {
  return Number(Boolean(record.solved_by_haohao_at)) + Number(Boolean(record.solved_by_xiuqin_at));
}

function isRecordUnlockedForViewer(record) {
  if (isRecordOwnedByViewer(record)) return true;
  return Boolean(record[getSolvedAtField(state.identity)]);
}

function updateCompletionPill(element, isDone, solvedAt) {
  if (!element) return;
  element.classList.toggle("is-done", isDone);
  element.textContent = isDone ? `已拼开 · ${formatStatusTime(solvedAt)}` : "还没拼开";
}

function formatStatusTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function setupPuzzle(record) {
  state.selectedId = record.id;
  state.selectedTile = null;
  state.moves = 0;
  state.solved = false;
  state.pieces = buildShuffledPieces();
  state.shouldAnimateReveal = false;
}

function buildShuffledPieces() {
  const base = Array.from({ length: 9 }, (_, index) => index);
  let pieces = [...base];

  do {
    pieces = shuffleArray([...base]);
  } while (pieces.every((value, index) => value === index));

  return pieces;
}

function shuffleArray(source) {
  const array = [...source];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

async function handlePieceClick(position) {
  if (state.solved) return;

  if (state.selectedTile === null) {
    state.selectedTile = position;
    renderPuzzleArea();
    return;
  }

  if (state.selectedTile === position) {
    state.selectedTile = null;
    renderPuzzleArea();
    return;
  }

  const pieces = [...state.pieces];
  [pieces[state.selectedTile], pieces[position]] = [pieces[position], pieces[state.selectedTile]];
  state.pieces = pieces;
  state.selectedTile = null;
  state.moves += 1;
  state.solved = pieces.every((value, index) => value === index);

  if (state.solved) {
    state.shouldAnimateReveal = true;
    launchHeartBurst();
    await markPuzzleSolved(getSelectedRecord());
  }

  renderPuzzleArea();
}

async function markPuzzleSolved(record) {
  if (!record) return;

  const solvedField = getSolvedAtField(state.identity);
  if (record[solvedField]) return;

  const solvedAt = new Date().toISOString();

  if (state.hasCloud) {
    try {
      const { data, error } = await state.supabaseClient
        .from(DEFAULT_TABLE)
        .update({ [solvedField]: solvedAt })
        .eq("id", record.id)
        .select("*")
        .single();
      if (error) throw error;
      replaceRecordInState(normalizeRecord(data));
      return;
    } catch (error) {
      console.error(error);
    }
  }

  replaceRecordInState({
    ...record,
    [solvedField]: solvedAt
  });
}

function replaceRecordInState(record) {
  state.records = trimRecords(state.records.map((item) => (item.id === record.id ? normalizeRecord(record) : item)));
  localStorage.setItem(LOCAL_KEYS.records, JSON.stringify(state.records));
}

function showRevealState() {
  elements.puzzleStage.classList.remove("is-revealed");
  elements.revealPanel.classList.remove("is-active");

  if (state.shouldAnimateReveal) {
    void elements.puzzleStage.offsetWidth;
  }

  elements.puzzleStage.classList.add("is-revealed");
  elements.revealPanel.classList.add("is-active");
  state.shouldAnimateReveal = false;
}

function hideRevealState() {
  elements.puzzleStage.classList.remove("is-revealed");
  elements.revealPanel.classList.remove("is-active");
  elements.revealPanel.hidden = true;
  elements.revealImage.removeAttribute("src");
  elements.stageReveal.hidden = true;
  elements.stageRevealImage.removeAttribute("src");
}

function launchHeartBurst() {
  elements.heartBurst.innerHTML = "";

  for (let index = 0; index < 10; index += 1) {
    const heart = document.createElement("span");
    heart.className = "burst-heart";
    heart.textContent = index % 3 === 0 ? "❤" : "♡";
    heart.style.left = `${42 + Math.random() * 18}%`;
    heart.style.top = `${52 + Math.random() * 16}%`;
    heart.style.setProperty("--drift-x", `${-90 + Math.random() * 180}px`);
    heart.style.setProperty("--drift-y", `${-30 + Math.random() * 40}px`);
    heart.style.animationDelay = `${index * 55}ms`;
    elements.heartBurst.append(heart);

    window.setTimeout(() => {
      heart.remove();
    }, 1900);
  }
}

function handlePreviewChange() {
  const file = elements.photoInput.files?.[0];
  if (!file) {
    clearPreviewUrl();
    renderComposer();
    return;
  }

  clearPreviewUrl();
  state.previewUrl = URL.createObjectURL(file);
  renderComposer();
}

async function handleSaveRecord(event) {
  event.preventDefault();

  const existing = getTodayRecordForPerson(state.identity, state.currentSlot);
  const file = elements.photoInput.files?.[0];
  const note = elements.noteInput.value.trim();

  if (!file && !existing) {
    elements.saveStatus.textContent = "先选一张照片，再保存今天的小瞬间。";
    return;
  }

  setSavingState(true, "正在整理和压缩照片...");

  try {
    let nextRecord = existing ? { ...existing, note } : null;

    if (file) {
      const compressed = await compressImage(file);
      const uploaded = state.hasCloud
        ? await saveRecordToCloud(existing, compressed, note, state.currentSlot)
        : await saveRecordToLocal(existing, compressed, note, state.currentSlot);
      nextRecord = normalizeRecord(uploaded);
    } else if (existing) {
      nextRecord = state.hasCloud ? await updateCloudNote(existing, note) : updateLocalNote(existing, note);
    }

    clearPreviewUrl();
    elements.photoInput.value = "";
    elements.noteInput.value = nextRecord.note || "";
    elements.saveStatus.textContent = state.hasCloud
      ? "今天的小瞬间已经同步到云端。"
      : "今天的小瞬间已经保存在本地预览里。";

    await refreshRecords();
    state.selectedId = nextRecord.id;
    setupPuzzle(nextRecord);
    renderAll();
  } catch (error) {
    console.error(error);
    elements.saveStatus.textContent = state.hasCloud
      ? "云端保存失败了，先检查表和存储权限。"
      : "本地保存失败了，可以换张图再试一次。";
  } finally {
    setSavingState(false);
  }
}

function setSavingState(isSaving, text = "") {
  elements.submitButton.disabled = isSaving;
  elements.deleteTodayButton.disabled = isSaving || !getTodayRecordForPerson(state.identity, state.currentSlot);
  elements.deleteSelectedButton.disabled = isSaving;
  elements.reshuffleButton.disabled = isSaving || !getSelectedRecord();
  elements.slotOneButton.disabled = isSaving;
  elements.slotTwoButton.disabled = isSaving;
  if (text) elements.saveStatus.textContent = text;
}

async function compressImage(file) {
  const image = await loadImageFromFile(file);
  let scale = Math.min(1, 1080 / Math.max(image.width, image.height));
  let quality = 0.9;
  let blob = null;
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));

  for (let outer = 0; outer < 6; outer += 1) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      blob = await renderWebp(image, width, height, quality);
      if (blob.size <= MAX_IMAGE_BYTES) break;
      quality = Math.max(0.48, quality - 0.08);
    }

    if (blob.size <= MAX_IMAGE_BYTES) break;
    scale *= 0.88;
    width = Math.max(720, Math.round(image.width * scale));
    height = Math.max(720, Math.round(image.height * scale));
    quality = 0.82;
  }

  const extensionless = file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") || "moment";
  const compressedFile = new File([blob], `${extensionless}.webp`, { type: "image/webp" });

  return {
    file: compressedFile,
    width,
    height,
    imageSize: blob.size
  };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed."));
    };
    image.src = url;
  });
}

function renderWebp(image, width, height, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed."));
        return;
      }
      resolve(blob);
    }, "image/webp", quality);
  });
}

async function saveRecordToCloud(existing, compressed, note, slot) {
  const today = getTodayString();
  const path = `tiny-moments/${today}/${personKey(state.identity)}-slot-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  const { error: uploadError } = await state.supabaseClient.storage
    .from(config.bucketName)
    .upload(path, compressed.file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicData } = state.supabaseClient.storage.from(config.bucketName).getPublicUrl(path);
  const payload = {
    person: state.identity,
    moment_date: today,
    puzzle_slot: slot,
    note,
    image_path: path,
    image_url: publicData.publicUrl,
    image_size: compressed.imageSize,
    width: compressed.width,
    height: compressed.height,
    solved_by_haohao_at: null,
    solved_by_xiuqin_at: null
  };

  let savedRecord = null;
  if (existing) {
    const { data, error } = await state.supabaseClient
      .from(DEFAULT_TABLE)
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    savedRecord = data;

    if (existing.image_path && existing.image_path !== path) {
      await state.supabaseClient.storage.from(config.bucketName).remove([existing.image_path]);
    }
  } else {
    const { data, error } = await state.supabaseClient.from(DEFAULT_TABLE).insert(payload).select("*").single();
    if (error) {
      if (isMomentSlotConflict(error)) {
        const cloudExisting = await fetchCloudRecordBySlot(today, slot, state.identity);
        if (!cloudExisting) throw error;

        const { data: fallbackData, error: fallbackError } = await state.supabaseClient
          .from(DEFAULT_TABLE)
          .update(payload)
          .eq("id", cloudExisting.id)
          .select("*")
          .single();

        if (fallbackError) throw fallbackError;
        savedRecord = fallbackData;

        if (cloudExisting.image_path && cloudExisting.image_path !== path) {
          await state.supabaseClient.storage.from(config.bucketName).remove([cloudExisting.image_path]);
        }
      } else {
        throw error;
      }
    } else {
      savedRecord = data;
    }
  }

  return savedRecord;
}

async function saveRecordToLocal(existing, compressed, note, slot) {
  const dataUrl = await fileToDataUrl(compressed.file);
  const payload = normalizeRecord({
    id: existing?.id || crypto.randomUUID(),
    person: state.identity,
    moment_date: getTodayString(),
    puzzle_slot: slot,
    note,
    image_path: "",
    image_url: dataUrl,
    image_size: compressed.imageSize,
    width: compressed.width,
    height: compressed.height,
    created_at: existing?.created_at || new Date().toISOString()
  });

  const others = state.records.filter((record) => record.id !== payload.id);
  saveLocalRecords([payload, ...others]);
  return payload;
}

async function updateCloudNote(existing, note) {
  const { data, error } = await state.supabaseClient
    .from(DEFAULT_TABLE)
    .update({ note })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeRecord(data);
}

function isMomentSlotConflict(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "23505" || message.includes("couple_moment_puzzles_person_date_slot_uidx");
}

async function fetchCloudRecordBySlot(date, slot, person) {
  const { data, error } = await state.supabaseClient
    .from(DEFAULT_TABLE)
    .select("*")
    .eq("person", person)
    .eq("moment_date", date)
    .eq("puzzle_slot", slot)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRecord(data) : null;
}

function updateLocalNote(existing, note) {
  const updated = normalizeRecord({ ...existing, note });
  const others = state.records.filter((record) => record.id !== existing.id);
  saveLocalRecords([updated, ...others]);
  return updated;
}

async function refreshRecords() {
  if (!state.hasCloud) {
    state.records = readLocalRecords();
    return;
  }

  const { data, error } = await state.supabaseClient
    .from(DEFAULT_TABLE)
    .select("*")
    .order("moment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;

  state.records = mergeRecords(data || [], readLocalRecords());
}

async function syncMomentsFromCloud() {
  if (!state.hasCloud || state.syncInFlight) return;

  state.syncInFlight = true;

  try {
    await refreshRecords();
    refreshSelectedRecord();
    renderAll();
  } catch (error) {
    console.error(error);
  } finally {
    state.syncInFlight = false;
  }
}

function startCloudSyncLoop() {
  if (state.syncTimer) return;

  state.syncTimer = window.setInterval(() => {
    if (document.hidden) return;
    void syncMomentsFromCloud();
  }, CLOUD_REFRESH_MS);
}

async function deleteRecord(record) {
  const okay = window.confirm(`确定删除 ${record.person} 在 ${formatShortDate(record.moment_date)} 的这张小瞬间吗？`);
  if (!okay) return;

  setSavingState(true, "正在删除这张小瞬间...");

  try {
    if (state.hasCloud) {
      if (record.image_path) {
        await state.supabaseClient.storage.from(config.bucketName).remove([record.image_path]);
      }

      const { error } = await state.supabaseClient.from(DEFAULT_TABLE).delete().eq("id", record.id);
      if (error) throw error;
      await refreshRecords();
    } else {
      saveLocalRecords(state.records.filter((item) => item.id !== record.id));
    }

    if (state.selectedId === record.id) {
      state.selectedId = null;
      state.pieces = [];
      state.solved = false;
    }

    refreshSelectedRecord();
    elements.noteInput.value = getTodayRecordForPerson(state.identity, state.currentSlot)?.note || "";
    elements.photoInput.value = "";
    clearPreviewUrl();
    elements.saveStatus.textContent = state.hasCloud ? "这张小瞬间已经从云端删除。" : "这张小瞬间已经从本地预览里删除。";
    renderAll();
  } catch (error) {
    console.error(error);
    elements.saveStatus.textContent = "删除失败了，稍后再试一次。";
  } finally {
    setSavingState(false);
  }
}

async function connectCloudIfPossible() {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.bucketName) {
    setSyncMode("本地预览模式", "还没有配好云端参数，现在保存的内容只会留在这台设备上。");
    return;
  }

  try {
    await loadExternalScript("https://unpkg.com/@supabase/supabase-js@2", 7000);
    if (!window.supabase) throw new Error("Supabase SDK unavailable.");
    state.supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    state.hasCloud = true;
    setSyncMode("云端连接成功", "现在这页会优先读云端数据，手机和电脑打开会更容易同步。");
    await syncMomentsFromCloud();
    startCloudSyncLoop();
  } catch (error) {
    console.error(error);
    state.hasCloud = false;
    setSyncMode("本地预览模式", "云端这会儿没连上，页面依然可以预览，但上传的数据只会先存在当前浏览器。");
  }
}

function loadExternalScript(src, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script load failed.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      script.remove();
      reject(new Error("Script load timeout."));
    }, timeoutMs);

    script.src = src;
    script.async = true;
    script.dataset.dynamicSrc = src;
    script.addEventListener(
      "load",
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Script load failed."));
      },
      { once: true }
    );

    document.head.append(script);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("FileReader failed."));
    reader.readAsDataURL(file);
  });
}

function clearPreviewUrl() {
  if (!state.previewUrl) return;
  URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = "";
}

function formatBytes(bytes) {
  if (!bytes) return "未记录大小";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
