const config = window.LOVE_ALBUM_CONFIG || {};
const sessionKey = "love-album-unlocked";
const localMemoriesKey = "love-album-demo-memories";
const localMessagesKey = "love-album-demo-messages";
const storageLimitBytes = 2 * 1024 * 1024 * 1024;
const fallbackAveragePhotoBytes = 3 * 1024 * 1024;
const messageTableName = config.messageTableName || "messages";

const elements = {
  lockScreen: document.querySelector("#lockScreen"),
  albumApp: document.querySelector("#albumApp"),
  loginForm: document.querySelector("#loginForm"),
  loginError: document.querySelector("#loginError"),
  sitePassword: document.querySelector("#sitePassword"),
  logoutButton: document.querySelector("#logoutButton"),
  memoryForm: document.querySelector("#memoryForm"),
  editingIdInput: document.querySelector("#editingIdInput"),
  photoInput: document.querySelector("#photoInput"),
  previewImage: document.querySelector("#previewImage"),
  uploadTitle: document.querySelector("#uploadTitle"),
  uploadHint: document.querySelector("#uploadHint"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  locationInput: document.querySelector("#locationInput"),
  noteInput: document.querySelector("#noteInput"),
  saveStatus: document.querySelector("#saveStatus"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  submitMemoryButton: document.querySelector("#submitMemoryButton"),
  refreshButton: document.querySelector("#refreshButton"),
  memoryGrid: document.querySelector("#memoryGrid"),
  memoryCount: document.querySelector("#memoryCount"),
  storageUsed: document.querySelector("#storageUsed"),
  storageMeter: document.querySelector("#storageMeter"),
  storageSummary: document.querySelector("#storageSummary"),
  daysTogether: document.querySelector("#daysTogether"),
  hoursTogether: document.querySelector("#hoursTogether"),
  minutesTogether: document.querySelector("#minutesTogether"),
  secondsTogether: document.querySelector("#secondsTogether"),
  metDateText: document.querySelector("#metDateText"),
  emptyTemplate: document.querySelector("#emptyTemplate"),
  photoLightbox: document.querySelector("#photoLightbox"),
  lightboxClose: document.querySelector("#lightboxClose"),
  lightboxImage: document.querySelector("#lightboxImage"),
  messageForm: document.querySelector("#messageForm"),
  messageAuthorInput: document.querySelector("#messageAuthorInput"),
  messageDateInput: document.querySelector("#messageDateInput"),
  messageTextInput: document.querySelector("#messageTextInput"),
  messageStatus: document.querySelector("#messageStatus"),
  submitMessageButton: document.querySelector("#submitMessageButton"),
  messageTableBody: document.querySelector("#messageTableBody")
};

const metDate = new Date(2026, 0, 1);

const hasSupabase =
  Boolean(config.supabaseUrl) &&
  Boolean(config.supabaseAnonKey) &&
  Boolean(window.supabase);

const supabaseClient = hasSupabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

elements.dateInput.valueAsDate = new Date();
if (elements.messageDateInput) elements.messageDateInput.valueAsDate = new Date();

updateDaysTogether();
window.setInterval(updateDaysTogether, 1000);
restoreSession();

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (elements.sitePassword.value === config.sitePassword) {
    elements.sitePassword.value = "";
    elements.loginError.textContent = "";
    sessionStorage.setItem(sessionKey, "true");
    unlock();
    return;
  }

  elements.loginError.textContent = "密码不对，再试一次。";
});

elements.logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(sessionKey);
  closeLightbox();
  elements.albumApp.hidden = true;
  elements.lockScreen.hidden = false;
});

elements.refreshButton.addEventListener("click", async () => {
  await Promise.all([loadMemories(), loadMessages()]);
});
elements.cancelEditButton.addEventListener("click", resetMemoryForm);
elements.lightboxClose.addEventListener("click", closeLightbox);

if (elements.messageForm) {
  elements.messageForm.addEventListener("submit", handleMessageSubmit);
}

elements.photoLightbox.addEventListener("click", (event) => {
  if (event.target === elements.photoLightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.photoLightbox.hidden) closeLightbox();
});

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files?.[0];
  if (!file) return;
  elements.previewImage.src = URL.createObjectURL(file);
  elements.previewImage.hidden = false;
});

elements.memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingId = elements.editingIdInput.value;
  const file = elements.photoInput.files?.[0];
  if (!editingId && !file) return;

  setSaving(true, "正在保存...");

  try {
    const memory = {
      title: elements.titleInput.value.trim(),
      memory_date: elements.dateInput.value,
      location: elements.locationInput.value.trim(),
      note: elements.noteInput.value.trim()
    };

    if (editingId) {
      await updateMemory(editingId, memory);
    } else if (hasSupabase) {
      await saveToSupabase(file, memory);
    } else {
      await saveToLocalDemo(file, memory);
    }

    resetMemoryForm();
    setSaving(false, editingId ? "修改好了。" : "保存好了。");
    await loadMemories();
  } catch (error) {
    console.error(error);
    setSaving(false, "保存失败，请检查配置或网络。");
  }
});

async function unlock() {
  elements.lockScreen.hidden = true;
  elements.albumApp.hidden = false;
  await Promise.all([loadMemories(), loadMessages()]);
}

function restoreSession() {
  if (sessionStorage.getItem(sessionKey) === "true") unlock();
}

function setSaving(isSaving, message) {
  elements.submitMemoryButton.disabled = isSaving;
  elements.submitMemoryButton.textContent = isSaving
    ? "保存中..."
    : elements.editingIdInput.value
      ? "保存修改"
      : "保存这一刻";
  elements.saveStatus.textContent = message;
}

function resetMemoryForm() {
  elements.memoryForm.reset();
  elements.editingIdInput.value = "";
  elements.dateInput.valueAsDate = new Date();
  elements.photoInput.required = true;
  elements.previewImage.hidden = true;
  elements.previewImage.removeAttribute("src");
  elements.uploadTitle.textContent = "上传一张照片";
  elements.uploadHint.textContent = "手机拍的照片也可以直接上传";
  elements.cancelEditButton.hidden = true;
  elements.submitMemoryButton.textContent = "保存这一刻";
}

function resetMessageForm() {
  if (!elements.messageForm) return;
  elements.messageForm.reset();
  elements.messageDateInput.valueAsDate = new Date();
}

function updateDaysTogether() {
  const today = new Date();
  const start = new Date(metDate.getFullYear(), metDate.getMonth(), metDate.getDate());
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.floor((current - start) / dayMs) + 1);
  elements.daysTogether.textContent = days.toString();

  const diffMs = Math.max(0, today.getTime() - metDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (elements.hoursTogether) elements.hoursTogether.textContent = hours.toString();
  if (elements.minutesTogether) elements.minutesTogether.textContent = String(minutes).padStart(2, "0");
  if (elements.secondsTogether) elements.secondsTogether.textContent = String(seconds).padStart(2, "0");

  elements.metDateText.dateTime = formatDateValue(start);
  elements.metDateText.textContent = formatCounterDate(start);
}

async function saveToSupabase(file, memory) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseClient.storage
    .from(config.bucketName)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(config.bucketName).getPublicUrl(path);
  const { error: insertError } = await supabaseClient.from(config.tableName).insert({
    ...memory,
    photo_path: path,
    photo_url: data.publicUrl
  });

  if (insertError) throw insertError;
}

async function saveToLocalDemo(file, memory) {
  const dataUrl = await fileToDataUrl(file);
  const memories = readLocalMemories();
  memories.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    photo_url: dataUrl,
    photo_path: "",
    ...memory
  });
  localStorage.setItem(localMemoriesKey, JSON.stringify(memories.slice(0, 24)));
}

async function loadMemories() {
  elements.memoryGrid.innerHTML = "";

  let memories = [];
  if (hasSupabase) {
    const { data, error } = await supabaseClient
      .from(config.tableName)
      .select("*")
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      elements.memoryGrid.append(createNotice("读取失败", "请检查 Supabase 表、存储桶和权限配置。"));
      return;
    }

    memories = data || [];
  } else {
    memories = readLocalMemories();
  }

  elements.memoryCount.textContent = memories.length;
  updateStorageStats(memories);

  if (!memories.length) {
    elements.memoryGrid.append(elements.emptyTemplate.content.cloneNode(true));
    return;
  }

  memories.forEach((memory) => elements.memoryGrid.append(createMemoryCard(memory)));
}

function createMemoryCard(memory) {
  const article = document.createElement("article");
  article.className = "memory-card";

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "memory-photo-button";
  previewButton.setAttribute("aria-label", `查看照片：${memory.title || "这条回忆"}`);
  previewButton.addEventListener("click", () => openLightbox(memory.photo_url, memory.title || "旅行照片"));

  const img = document.createElement("img");
  img.src = memory.photo_url;
  img.alt = memory.title || "旅行照片";

  const previewHint = document.createElement("span");
  previewHint.className = "memory-photo-hint";
  previewHint.textContent = "点击查看大图";

  previewButton.append(img, previewHint);

  const body = document.createElement("div");
  body.className = "memory-body";

  const meta = document.createElement("div");
  meta.className = "memory-meta";
  meta.append(createMetaItem(formatDate(memory.memory_date)));
  if (memory.location) meta.append(createMetaItem(memory.location));

  const title = document.createElement("h2");
  title.textContent = memory.title || "没有标题的一天";

  const note = document.createElement("p");
  note.textContent = memory.note || "";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "修改";
  editButton.addEventListener("click", () => startEditing(memory));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => deleteMemory(memory));

  actions.append(editButton, deleteButton);
  body.append(meta, title, note, actions);
  article.append(previewButton, body);
  return article;
}

async function handleMessageSubmit(event) {
  event.preventDefault();
  setMessageSaving(true, "正在写入留言...");

  const message = {
    author: elements.messageAuthorInput.value.trim(),
    message_date: elements.messageDateInput.value,
    content: elements.messageTextInput.value.trim()
  };

  try {
    if (hasSupabase) {
      await saveMessageToSupabase(message);
    } else {
      saveMessageToLocal(message);
    }

    resetMessageForm();
    setMessageSaving(false, "留言写好了。");
    await loadMessages();
  } catch (error) {
    console.error(error);
    setMessageSaving(false, "留言保存失败，先检查留言表配置。");
  }
}

function setMessageSaving(isSaving, message) {
  if (!elements.submitMessageButton) return;
  elements.submitMessageButton.disabled = isSaving;
  elements.submitMessageButton.textContent = isSaving ? "正在写入..." : "写下这条留言";
  elements.messageStatus.textContent = message;
}

async function saveMessageToSupabase(message) {
  const { error } = await supabaseClient.from(messageTableName).insert(message);
  if (error) throw error;
}

function saveMessageToLocal(message) {
  const messages = readLocalMessages();
  messages.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...message
  });
  localStorage.setItem(localMessagesKey, JSON.stringify(messages.slice(0, 50)));
}

async function loadMessages() {
  if (!elements.messageTableBody) return;
  elements.messageTableBody.innerHTML = "";

  let messages = [];
  if (hasSupabase) {
    const { data, error } = await supabaseClient
      .from(messageTableName)
      .select("*")
      .order("message_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      renderMessageRow("今天", "系统提示", "留言云端表还没建好，先支持本机留言。");
      return;
    }

    messages = data || [];
  } else {
    messages = readLocalMessages();
  }

  if (!messages.length) {
    renderMessageRow("今天", "留言条", "还没有留言，写下第一句吧。");
    return;
  }

  messages.forEach((message) => {
    renderMessageRow(formatDate(message.message_date), message.author || "", message.content || "");
  });
}

function renderMessageRow(date, author, content) {
  const row = document.createElement("tr");
  const dateCell = document.createElement("td");
  const authorCell = document.createElement("td");
  const contentCell = document.createElement("td");

  dateCell.textContent = date;
  authorCell.textContent = author;
  contentCell.textContent = content;

  row.append(dateCell, authorCell, contentCell);
  elements.messageTableBody.append(row);
}

function openLightbox(src, alt) {
  elements.lightboxImage.src = src;
  elements.lightboxImage.alt = alt || "照片大图";
  elements.photoLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  elements.photoLightbox.hidden = true;
  elements.lightboxImage.removeAttribute("src");
  elements.lightboxImage.alt = "";
  document.body.classList.remove("lightbox-open");
}

function startEditing(memory) {
  elements.editingIdInput.value = memory.id;
  elements.titleInput.value = memory.title || "";
  elements.dateInput.value = memory.memory_date || "";
  elements.locationInput.value = memory.location || "";
  elements.noteInput.value = memory.note || "";
  elements.photoInput.required = false;
  elements.photoInput.value = "";
  elements.previewImage.src = memory.photo_url;
  elements.previewImage.hidden = false;
  elements.uploadTitle.textContent = "正在修改这条记录";
  elements.uploadHint.textContent = "照片保持不变，只修改文字信息";
  elements.cancelEditButton.hidden = false;
  elements.submitMemoryButton.textContent = "保存修改";
  elements.saveStatus.textContent = "";
  elements.memoryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function updateMemory(id, memory) {
  if (hasSupabase) {
    const { error } = await supabaseClient.from(config.tableName).update(memory).eq("id", id);
    if (error) throw error;
    return;
  }

  const memories = readLocalMemories().map((item) => (item.id === id ? { ...item, ...memory } : item));
  localStorage.setItem(localMemoriesKey, JSON.stringify(memories));
}

async function deleteMemory(memory) {
  const ok = window.confirm(`确定删除「${memory.title || "这条回忆"}」吗？删除后不能恢复。`);
  if (!ok) return;

  try {
    if (hasSupabase) {
      if (memory.photo_path) {
        const { error: storageError } = await supabaseClient.storage.from(config.bucketName).remove([memory.photo_path]);
        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabaseClient.from(config.tableName).delete().eq("id", memory.id);
      if (deleteError) throw deleteError;
    } else {
      const memories = readLocalMemories().filter((item) => item.id !== memory.id);
      localStorage.setItem(localMemoriesKey, JSON.stringify(memories));
    }

    resetMemoryForm();
    await loadMemories();
  } catch (error) {
    console.error(error);
    elements.saveStatus.textContent = "删除失败，请检查 Supabase 删除权限。";
  }
}

function updateStorageStats(memories) {
  const usedBytes = memories.reduce((total, memory) => total + Number(memory.file_size || 0), 0);
  const countedMemories = memories.filter((memory) => Number(memory.file_size || 0) > 0);
  const averageBytes = countedMemories.length ? usedBytes / countedMemories.length : fallbackAveragePhotoBytes;
  const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
  const percent = Math.min(100, (usedBytes / storageLimitBytes) * 100);
  const remainingPhotos = Math.floor(remainingBytes / averageBytes);

  elements.storageUsed.textContent = `项目已用约 ${formatBytes(usedBytes)} / 2 GB`;
  elements.storageMeter.style.width = `${Math.max(percent, usedBytes ? 2 : 0)}%`;
  elements.storageSummary.textContent = `按项目 2 GB 空间估算，剩余约 ${formatBytes(remainingBytes)}，按目前照片大小预计还能上传约 ${remainingPhotos} 张。`;
}

function createNotice(title, text) {
  const node = elements.emptyTemplate.content.cloneNode(true);
  node.querySelector("h2").textContent = title;
  node.querySelector("p").textContent = text;
  return node;
}

function createMetaItem(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatCounterDate(date) {
  const weekNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${formatDateValue(date)} ${weekNames[date.getDay()]}`;
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readLocalMemories() {
  try {
    return JSON.parse(localStorage.getItem(localMemoriesKey) || "[]");
  } catch {
    return [];
  }
}

function readLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem(localMessagesKey) || "[]");
  } catch {
    return [];
  }
}
