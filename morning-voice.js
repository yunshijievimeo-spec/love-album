const config = window.LOVE_ALBUM_CONFIG || {};
const PEOPLE = ["号号", "秀琴"];
const MAX_DURATION_MS = 30 * 1000;
const AUTO_REFRESH_MS = 10000;
const DEFAULT_TABLE = config.morningVoiceTableName || "couple_morning_voices";
const LOCAL_KEYS = {
  records: "love-morning-voices-records",
  identity: "love-room-identity"
};

const elements = {
  syncModeBadge: document.querySelector("#syncModeBadge"),
  syncModeHint: document.querySelector("#syncModeHint"),
  identitySelect: document.querySelector("#identitySelect"),
  todayBadge: document.querySelector("#todayBadge"),
  recordCard: document.querySelector(".record-card"),
  recordSun: document.querySelector("#recordSun"),
  recordButton: document.querySelector("#recordButton"),
  stopButton: document.querySelector("#stopButton"),
  deleteButton: document.querySelector("#deleteButton"),
  recordStateBadge: document.querySelector("#recordStateBadge"),
  recordTimer: document.querySelector("#recordTimer"),
  recordSummaryTitle: document.querySelector("#recordSummaryTitle"),
  recordSummaryText: document.querySelector("#recordSummaryText"),
  recordStatus: document.querySelector("#recordStatus"),
  myVoicePlayer: document.querySelector("#myVoicePlayer"),
  receiveCard: document.querySelector("#receiveCard"),
  receiveBadge: document.querySelector("#receiveBadge"),
  receiveSun: document.querySelector("#receiveSun"),
  receiveEffects: document.querySelector("#receiveEffects"),
  receiveEmpty: document.querySelector("#receiveEmpty"),
  receiveContent: document.querySelector("#receiveContent"),
  receiveTitle: document.querySelector("#receiveTitle"),
  receiveText: document.querySelector("#receiveText"),
  playButton: document.querySelector("#playButton"),
  playButtonText: document.querySelector("#playButtonText"),
  replyButton: document.querySelector("#replyButton"),
  receiveStatus: document.querySelector("#receiveStatus"),
  receivePlayer: document.querySelector("#receivePlayer")
};

const state = {
  identity: normalizeIdentity(localStorage.getItem(LOCAL_KEYS.identity) || "号号"),
  records: readLocalRecords(),
  supabase: null,
  hasCloud: false,
  bootstrapTimer: 0,
  refreshTimer: 0,
  stream: null,
  recorder: null,
  recordChunks: [],
  recordMimeType: "",
  recordStartedAt: 0,
  recordDurationSeconds: 0,
  recordTickTimer: 0,
  recordStopTimer: 0,
  saveInFlight: false,
  playingRecordId: null,
  particleTimer: 0
};

elements.identitySelect.value = state.identity;
elements.todayBadge.textContent = formatDisplayDate(getTodayString());
setSyncMode("本地预览准备中", "先把今天的小甜音准备好，再尝试连上云端。");
bindEvents();
renderAll();
startSupabaseBootstrapPoll();

function bindEvents() {
  elements.identitySelect.addEventListener("change", () => {
    state.identity = normalizeIdentity(elements.identitySelect.value);
    localStorage.setItem(LOCAL_KEYS.identity, state.identity);
    stopPlayback();
    renderAll();
    void refreshAll();
  });

  elements.recordButton.addEventListener("click", () => {
    void startRecording();
  });

  elements.stopButton.addEventListener("click", () => {
    stopRecording();
  });

  elements.deleteButton.addEventListener("click", () => {
    const record = getTodayRecordFor(state.identity);
    if (record) {
      void deleteRecord(record);
    }
  });

  elements.playButton.addEventListener("click", () => {
    void togglePlayback();
  });

  elements.replyButton.addEventListener("click", () => {
    const record = getTodayRecordFor(getPartnerIdentity());
    if (record) {
      void sendReply(record);
    }
  });

  elements.receivePlayer.addEventListener("play", () => {
    const record = getTodayRecordFor(getPartnerIdentity());
    state.playingRecordId = record?.id || null;
    startParticleBurst();
    renderReceiveCard();
  });

  elements.receivePlayer.addEventListener("pause", () => {
    if (!elements.receivePlayer.ended) {
      stopParticleBurst();
      state.playingRecordId = null;
      renderReceiveCard();
    }
  });

  elements.receivePlayer.addEventListener("ended", () => {
    stopParticleBurst();
    state.playingRecordId = null;
    renderReceiveCard();
  });

  window.addEventListener("focus", () => {
    void refreshAll();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void refreshAll();
    }
  });
}

function normalizeIdentity(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (text === "浩浩" || text === "号号" || text === "鍙峰彿" || lower === "haohao") return "号号";
  if (text === "秀琴" || text === "绉€鐞?" || text === "绉€鐞" || lower === "xiuqin") return "秀琴";
  return "号号";
}

function setSyncMode(title, hint) {
  elements.syncModeBadge.textContent = title;
  elements.syncModeHint.textContent = hint;
}

function startSupabaseBootstrapPoll() {
  if (ensureSupabaseClient()) {
    void refreshAll();
    startRefreshLoop();
    return;
  }

  let attempts = 0;
  state.bootstrapTimer = window.setInterval(() => {
    attempts += 1;

    if (ensureSupabaseClient()) {
      window.clearInterval(state.bootstrapTimer);
      state.bootstrapTimer = 0;
      void refreshAll();
      startRefreshLoop();
      return;
    }

    if (attempts >= 20) {
      window.clearInterval(state.bootstrapTimer);
      state.bootstrapTimer = 0;
      setSyncMode("本地预览模式", "云端还没连上时，先在当前设备里预览今天的小甜音。");
    }
  }, 1000);
}

function ensureSupabaseClient() {
  if (state.supabase || !config.supabaseUrl || !config.supabaseAnonKey || !window.supabase?.createClient) {
    return Boolean(state.supabase);
  }

  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  state.hasCloud = true;
  setSyncMode("云端同步中", "今天的小甜音会优先读云端，手机和电脑会更容易保持一致。");
  return true;
}

function startRefreshLoop() {
  if (state.refreshTimer) return;
  state.refreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    void refreshAll();
  }, AUTO_REFRESH_MS);
}

async function refreshAll() {
  await refreshRecords();
  renderAll();
}

async function refreshRecords() {
  if (!state.hasCloud) {
    state.records = readLocalRecords();
    return;
  }

  try {
    const { data, error } = await state.supabase
      .from(DEFAULT_TABLE)
      .select("*")
      .order("morning_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    await cleanupExpiredCloudRecords((data || []).map(normalizeRecord));
    state.records = mergeRecords(data || [], readLocalRecords());
    saveLocalRecords(state.records);
  } catch (error) {
    console.error(error);
    state.records = readLocalRecords();
    state.hasCloud = false;
    setSyncMode("临时切回本地", "刚刚连云端有点慢，这页先显示当前设备里的内容。");
  }
}

async function cleanupExpiredCloudRecords(records) {
  const expired = records.filter((record) => record.morning_date !== getTodayString());
  if (!expired.length) return;

  for (const record of expired) {
    try {
      if (record.audio_path) {
        await state.supabase.storage.from(config.bucketName).remove([record.audio_path]);
      }
      await state.supabase.from(DEFAULT_TABLE).delete().eq("id", record.id);
    } catch (error) {
      console.error(error);
    }
  }
}

function renderAll() {
  renderRecordCard();
  renderReceiveCard();
}

function renderRecordCard() {
  const record = getTodayRecordFor(state.identity);
  const isRecording = Boolean(state.recorder);

  elements.recordCard.classList.toggle("is-recording", isRecording);
  elements.recordButton.disabled = isRecording || state.saveInFlight;
  elements.stopButton.disabled = !isRecording;
  elements.deleteButton.disabled = !record || isRecording || state.saveInFlight;
  elements.recordStateBadge.textContent = isRecording ? "录音中" : record ? "今天已留好" : "等待中";

  if (!isRecording && !record) {
    elements.recordTimer.textContent = "00:00";
  }

  if (record) {
    elements.recordSummaryTitle.textContent = `${state.identity}今天的早安已经留好了`;
    elements.recordSummaryText.textContent = `这句小甜音时长 ${formatDuration(record.duration_seconds)}。如果想换一句新的，也可以重新录。`;
    elements.myVoicePlayer.hidden = false;
    elements.myVoicePlayer.src = getRecordAudioUrl(record);
    elements.recordButton.textContent = "重新录今天这句";
  } else {
    elements.recordSummaryTitle.textContent = "今天还没录早安";
    elements.recordSummaryText.textContent = "点下面的按钮开始录制，录完就会自动保存成今天这句小甜音。";
    elements.myVoicePlayer.hidden = true;
    elements.myVoicePlayer.removeAttribute("src");
    elements.recordButton.textContent = "开始录音";
  }
}

function renderReceiveCard() {
  const record = getTodayRecordFor(getPartnerIdentity());
  const heard = Boolean(record?.[getHeardField(state.identity)]);
  const replied = Boolean(record?.[getReplyField(state.identity)]);
  const isPlaying = Boolean(record && state.playingRecordId === record.id && !elements.receivePlayer.paused);
  const isOpen = Boolean(record && (heard || isPlaying));

  elements.receiveCard.classList.toggle("is-open", isOpen);
  elements.receiveCard.classList.toggle("is-playing", isPlaying);

  if (!record) {
    elements.receiveBadge.textContent = "等待中";
    elements.receiveEmpty.hidden = false;
    elements.receiveContent.hidden = true;
    elements.replyButton.hidden = true;
    return;
  }

  elements.receiveBadge.textContent = heard ? "已收到" : "待拆开";
  elements.receiveEmpty.hidden = true;
  elements.receiveContent.hidden = false;
  elements.receiveTitle.textContent = `${record.person}给你留了今天的第一句早安`;
  elements.receiveText.textContent = heard
    ? "今天这张声音卡已经对你打开了，小太阳会陪你慢慢闪着听完。"
    : "点一下爱心播放，卡片会慢慢打开，这句早安就会轻轻放出来。";
  elements.playButtonText.textContent = isPlaying ? "暂停小甜音" : "播放小甜音";
  elements.playButton.classList.toggle("is-playing", isPlaying);
  elements.replyButton.hidden = !heard || replied;
  elements.receiveStatus.textContent = replied
    ? "抱抱早安已经送回去啦。"
    : heard
      ? "今天这句早安，你已经收到了"
      : "今天这句小甜音还在等你拆开。";
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

function readLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.records);
    const records = raw ? JSON.parse(raw) : [];
    return trimRecords(records.map(normalizeRecord));
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveLocalRecords(records) {
  localStorage.setItem(LOCAL_KEYS.records, JSON.stringify(trimRecords(records)));
}

function normalizeRecord(record) {
  return {
    id: record.id || crypto.randomUUID(),
    person: normalizeIdentity(record.person),
    morning_date: record.morning_date || getTodayString(),
    audio_path: record.audio_path || "",
    audio_url: record.audio_url || "",
    audio_data_url: record.audio_data_url || "",
    audio_size: Number(record.audio_size || 0),
    duration_seconds: Number(record.duration_seconds || 0),
    mime_type: record.mime_type || "audio/webm",
    heard_by_haohao_at: record.heard_by_haohao_at || "",
    heard_by_xiuqin_at: record.heard_by_xiuqin_at || "",
    reply_by_haohao_at: record.reply_by_haohao_at || "",
    reply_by_xiuqin_at: record.reply_by_xiuqin_at || "",
    created_at: record.created_at || new Date().toISOString()
  };
}

function trimRecords(records) {
  const today = getTodayString();
  const map = new Map();

  records
    .map(normalizeRecord)
    .filter((record) => record.morning_date === today)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .forEach((record) => {
      const key = `${record.person}-${record.morning_date}`;
      const existing = map.get(key);
      map.set(key, existing ? mergeDuplicateRecord(existing, record) : record);
    });

  return Array.from(map.values());
}

function mergeRecords(primary, secondary) {
  const map = new Map();

  [...primary, ...secondary].forEach((record) => {
    const normalized = normalizeRecord(record);
    const key = `${normalized.person}-${normalized.morning_date}`;
    const existing = map.get(key);
    map.set(key, existing ? mergeDuplicateRecord(existing, normalized) : normalized);
  });

  return trimRecords(Array.from(map.values()));
}

function mergeDuplicateRecord(left, right) {
  const newer = new Date(left.created_at).getTime() >= new Date(right.created_at).getTime() ? left : right;
  const older = newer === left ? right : left;

  return normalizeRecord({
    ...older,
    ...newer,
    audio_path: newer.audio_path || older.audio_path || "",
    audio_url: newer.audio_url || older.audio_url || "",
    audio_data_url: newer.audio_data_url || older.audio_data_url || "",
    audio_size: newer.audio_size || older.audio_size || 0,
    duration_seconds: newer.duration_seconds || older.duration_seconds || 0,
    mime_type: newer.mime_type || older.mime_type || "audio/webm",
    heard_by_haohao_at: newer.heard_by_haohao_at || older.heard_by_haohao_at || "",
    heard_by_xiuqin_at: newer.heard_by_xiuqin_at || older.heard_by_xiuqin_at || "",
    reply_by_haohao_at: newer.reply_by_haohao_at || older.reply_by_haohao_at || "",
    reply_by_xiuqin_at: newer.reply_by_xiuqin_at || older.reply_by_xiuqin_at || ""
  });
}

function getTodayRecordFor(person) {
  return state.records.find((record) => record.person === normalizeIdentity(person) && record.morning_date === getTodayString()) || null;
}

function getPartnerIdentity() {
  return PEOPLE.find((person) => person !== state.identity) || "秀琴";
}

function getHeardField(person) {
  return normalizeIdentity(person) === "秀琴" ? "heard_by_xiuqin_at" : "heard_by_haohao_at";
}

function getReplyField(person) {
  return normalizeIdentity(person) === "秀琴" ? "reply_by_xiuqin_at" : "reply_by_haohao_at";
}

function getRecordAudioUrl(record) {
  return record.audio_url || record.audio_data_url || "";
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const remain = String(total % 60).padStart(2, "0");
  return `${minutes}:${remain}`;
}

function updateRecordTimer() {
  const elapsed = Math.min(Date.now() - state.recordStartedAt, MAX_DURATION_MS);
  const seconds = Math.floor(elapsed / 1000);
  state.recordDurationSeconds = seconds;
  elements.recordTimer.textContent = formatDuration(seconds);
}

async function startRecording() {
  if (state.recorder || state.saveInFlight) return;

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    elements.recordStatus.textContent = "这台设备暂时不支持网页直接录音。";
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordMimeType = pickSupportedMimeType();
    state.recordChunks = [];
    state.recorder = state.recordMimeType
      ? new MediaRecorder(state.stream, { mimeType: state.recordMimeType })
      : new MediaRecorder(state.stream);

    state.recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) {
        state.recordChunks.push(event.data);
      }
    });

    state.recorder.addEventListener("stop", () => {
      void finalizeRecording();
    });

    state.recordStartedAt = Date.now();
    state.recorder.start(300);
    state.recordTickTimer = window.setInterval(updateRecordTimer, 200);
    state.recordStopTimer = window.setTimeout(() => {
      stopRecording();
    }, MAX_DURATION_MS);

    elements.recordStatus.textContent = "正在录今天的小甜音，最多 30 秒。";
    updateRecordTimer();
    renderRecordCard();
  } catch (error) {
    console.error(error);
    releaseRecorder();
    elements.recordStatus.textContent = "麦克风没有打开成功，检查一下浏览器权限。";
    renderRecordCard();
  }
}

function stopRecording() {
  if (!state.recorder) return;
  if (state.recorder.state !== "inactive") {
    state.recorder.stop();
  }
}

async function finalizeRecording() {
  const durationSeconds = Math.max(1, Math.min(30, Math.round((Date.now() - state.recordStartedAt) / 1000)));
  const blob = new Blob(state.recordChunks, { type: state.recordMimeType || "audio/webm" });
  releaseRecorder();

  if (!blob.size) {
    elements.recordStatus.textContent = "这次没有录到声音，可以再试一次。";
    renderRecordCard();
    return;
  }

  await saveVoiceBlob(blob, durationSeconds);
}

function releaseRecorder() {
  window.clearInterval(state.recordTickTimer);
  window.clearTimeout(state.recordStopTimer);
  state.recordTickTimer = 0;
  state.recordStopTimer = 0;
  state.recordStartedAt = 0;
  state.recordChunks = [];
  state.recordDurationSeconds = 0;

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  state.stream = null;
  state.recorder = null;
}

function pickSupportedMimeType() {
  const types = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ];

  return types.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

async function saveVoiceBlob(blob, durationSeconds) {
  state.saveInFlight = true;
  renderRecordCard();

  try {
    const existing = getTodayRecordFor(state.identity);
    const payload = await (state.hasCloud ? saveCloudVoice(blob, durationSeconds, existing) : saveLocalVoice(blob, durationSeconds, existing));
    replaceRecord(payload);
    elements.recordStatus.textContent = "今天这句早安已经藏好了。";
    await refreshAll();
  } catch (error) {
    console.error(error);
    elements.recordStatus.textContent = "保存失败了，稍后再试一次。";
  } finally {
    state.saveInFlight = false;
    renderRecordCard();
  }
}

async function saveCloudVoice(blob, durationSeconds, existing) {
  const extension = guessExtension(blob.type);
  const today = getTodayString();
  const path = `morning-voices/${today}/${personKey(state.identity)}-${Date.now()}.${extension}`;
  const uploadResult = await state.supabase.storage.from(config.bucketName).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false
  });
  if (uploadResult.error) throw uploadResult.error;

  const audioUrl = state.supabase.storage.from(config.bucketName).getPublicUrl(path).data.publicUrl;
  const payload = normalizeRecord({
    ...(existing || {}),
    id: existing?.id || crypto.randomUUID(),
    person: state.identity,
    morning_date: today,
    audio_path: path,
    audio_url: audioUrl,
    audio_size: blob.size,
    duration_seconds: durationSeconds,
    mime_type: blob.type || "audio/webm",
    created_at: new Date().toISOString()
  });
  const cloudPayload = buildCloudPayload(payload);

  const query = existing
    ? state.supabase.from(DEFAULT_TABLE).update(cloudPayload).eq("id", existing.id)
    : state.supabase.from(DEFAULT_TABLE).insert(cloudPayload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;

  if (existing?.audio_path && existing.audio_path !== path) {
    await state.supabase.storage.from(config.bucketName).remove([existing.audio_path]);
  }

  return normalizeRecord(data);
}

async function saveLocalVoice(blob, durationSeconds, existing) {
  const audioDataUrl = await blobToDataUrl(blob);
  return normalizeRecord({
    ...(existing || {}),
    id: existing?.id || crypto.randomUUID(),
    person: state.identity,
    morning_date: getTodayString(),
    audio_data_url: audioDataUrl,
    audio_size: blob.size,
    duration_seconds: durationSeconds,
    mime_type: blob.type || "audio/webm",
    created_at: new Date().toISOString()
  });
}

async function deleteRecord(record) {
  const okay = window.confirm(`确定删除 ${record.person} 今天这句早安吗？`);
  if (!okay) return;

  try {
    if (state.hasCloud) {
      if (record.audio_path) {
        await state.supabase.storage.from(config.bucketName).remove([record.audio_path]);
      }
      const { error } = await state.supabase.from(DEFAULT_TABLE).delete().eq("id", record.id);
      if (error) throw error;
    }

    state.records = state.records.filter((item) => item.id !== record.id);
    saveLocalRecords(state.records);
    elements.recordStatus.textContent = "今天这句早安已经删掉了。";
    renderAll();
  } catch (error) {
    console.error(error);
    elements.recordStatus.textContent = "删除失败了，稍后再试一次。";
  }
}

function replaceRecord(record) {
  const next = state.records.filter((item) => item.id !== record.id && !(item.person === record.person && item.morning_date === record.morning_date));
  state.records = trimRecords([record, ...next]);
  saveLocalRecords(state.records);
}

async function togglePlayback() {
  const record = getTodayRecordFor(getPartnerIdentity());
  if (!record) return;

  if (state.playingRecordId === record.id && !elements.receivePlayer.paused) {
    stopPlayback();
    return;
  }

  const src = getRecordAudioUrl(record);
  if (!src) return;

  await markHeard(record);

  state.playingRecordId = record.id;
  elements.receivePlayer.src = src;
  launchImmediateParticles();

  try {
    await elements.receivePlayer.play();
  } catch (error) {
    console.error(error);
    state.playingRecordId = null;
    stopParticleBurst();
    elements.receiveStatus.textContent = "这句小甜音刚刚没有放出来，再点一次试试。";
  }

  renderReceiveCard();
}

function stopPlayback() {
  elements.receivePlayer.pause();
  elements.receivePlayer.currentTime = 0;
  state.playingRecordId = null;
  stopParticleBurst();
  renderReceiveCard();
}

async function markHeard(record) {
  const field = getHeardField(state.identity);
  if (record[field]) return;

  const heardAt = new Date().toISOString();
  const updated = normalizeRecord({
    ...record,
    [field]: heardAt
  });

  if (state.hasCloud) {
    const { data, error } = await state.supabase
      .from(DEFAULT_TABLE)
      .update({ [field]: heardAt })
      .eq("id", record.id)
      .select("*")
      .single();
    if (!error && data) {
      replaceRecord(normalizeRecord(data));
      return;
    }
  }

  replaceRecord(updated);
}

async function sendReply(record) {
  const field = getReplyField(state.identity);
  if (record[field]) return;

  const repliedAt = new Date().toISOString();
  const updated = normalizeRecord({
    ...record,
    [field]: repliedAt
  });

  try {
    if (state.hasCloud) {
      const { data, error } = await state.supabase
        .from(DEFAULT_TABLE)
        .update({ [field]: repliedAt })
        .eq("id", record.id)
        .select("*")
        .single();
      if (error) throw error;
      replaceRecord(normalizeRecord(data));
    } else {
      replaceRecord(updated);
    }

    elements.receiveStatus.textContent = "抱抱早安已经送回去啦。";
    renderReceiveCard();
  } catch (error) {
    console.error(error);
    elements.receiveStatus.textContent = "回应没有送出去，稍后再试一下。";
  }
}

function personKey(person) {
  return normalizeIdentity(person) === "秀琴" ? "xiuqin" : "haohao";
}

function buildCloudPayload(record) {
  return {
    id: record.id,
    person: record.person,
    morning_date: record.morning_date,
    audio_path: record.audio_path,
    audio_url: record.audio_url,
    audio_size: record.audio_size,
    duration_seconds: record.duration_seconds,
    mime_type: record.mime_type,
    heard_by_haohao_at: record.heard_by_haohao_at || null,
    heard_by_xiuqin_at: record.heard_by_xiuqin_at || null,
    reply_by_haohao_at: record.reply_by_haohao_at || null,
    reply_by_xiuqin_at: record.reply_by_xiuqin_at || null,
    created_at: record.created_at
  };
}

function guessExtension(mimeType) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("FileReader failed."));
    reader.readAsDataURL(blob);
  });
}

function startParticleBurst() {
  stopParticleBurst();
  launchImmediateParticles();
  state.particleTimer = window.setInterval(() => {
    spawnParticle(Math.random() > 0.45 ? "heart" : "note");
  }, 260);
}

function stopParticleBurst() {
  window.clearInterval(state.particleTimer);
  state.particleTimer = 0;
}

function spawnParticle(type) {
  const particle = document.createElement("span");
  particle.className = `float-particle ${type}`;
  particle.textContent = type === "heart" ? "❤" : Math.random() > 0.5 ? "♪" : "♫";
  particle.style.left = `${24 + Math.random() * 52}%`;
  particle.style.setProperty("--drift-x", `${-54 + Math.random() * 108}px`);
  elements.receiveEffects.append(particle);

  window.setTimeout(() => {
    particle.remove();
  }, 1900);
}

function launchImmediateParticles() {
  for (let index = 0; index < 6; index += 1) {
    window.setTimeout(() => {
      spawnParticle(index % 2 === 0 ? "heart" : "note");
    }, index * 80);
  }
}
