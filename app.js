const config = window.LOVE_ALBUM_CONFIG || {};
const sessionKey = "love-album-unlocked";
const localMemoriesKey = "love-album-demo-memories";

const elements = {
  lockScreen: document.querySelector("#lockScreen"),
  albumApp: document.querySelector("#albumApp"),
  loginForm: document.querySelector("#loginForm"),
  loginError: document.querySelector("#loginError"),
  sitePassword: document.querySelector("#sitePassword"),
  logoutButton: document.querySelector("#logoutButton"),
  memoryForm: document.querySelector("#memoryForm"),
  photoInput: document.querySelector("#photoInput"),
  previewImage: document.querySelector("#previewImage"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  locationInput: document.querySelector("#locationInput"),
  noteInput: document.querySelector("#noteInput"),
  saveStatus: document.querySelector("#saveStatus"),
  refreshButton: document.querySelector("#refreshButton"),
  memoryGrid: document.querySelector("#memoryGrid"),
  memoryCount: document.querySelector("#memoryCount"),
  emptyTemplate: document.querySelector("#emptyTemplate")
};

const hasSupabase =
  Boolean(config.supabaseUrl) &&
  Boolean(config.supabaseAnonKey) &&
  Boolean(window.supabase);

const supabaseClient = hasSupabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

elements.dateInput.valueAsDate = new Date();

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (elements.sitePassword.value === config.sitePassword) {
    elements.sitePassword.value = "";
    elements.loginError.textContent = "";
    unlock();
    return;
  }

  elements.loginError.textContent = "密码不对，再试一次。";
});

elements.logoutButton.addEventListener("click", () => {
  elements.albumApp.hidden = true;
  elements.lockScreen.hidden = false;
});

elements.refreshButton.addEventListener("click", loadMemories);

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files?.[0];
  if (!file) return;

  elements.previewImage.src = URL.createObjectURL(file);
  elements.previewImage.hidden = false;
});

elements.memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = elements.photoInput.files?.[0];
  if (!file) return;

  setSaving(true, "正在保存...");

  try {
    const memory = {
      title: elements.titleInput.value.trim(),
      memory_date: elements.dateInput.value,
      location: elements.locationInput.value.trim(),
      note: elements.noteInput.value.trim()
    };

    if (hasSupabase) {
      await saveToSupabase(file, memory);
    } else {
      await saveToLocalDemo(file, memory);
    }

    elements.memoryForm.reset();
    elements.dateInput.valueAsDate = new Date();
    elements.previewImage.hidden = true;
    elements.previewImage.removeAttribute("src");
    setSaving(false, hasSupabase ? "保存好了。" : "已保存到本机演示数据。接入 Supabase 后可云端保存。");
    await loadMemories();
  } catch (error) {
    console.error(error);
    setSaving(false, "保存失败，请检查配置或网络。");
  }
});

async function unlock() {
  elements.lockScreen.hidden = true;
  elements.albumApp.hidden = false;
  await loadMemories();
}

function setSaving(isSaving, message) {
  const button = elements.memoryForm.querySelector("button[type='submit']");
  button.disabled = isSaving;
  button.textContent = isSaving ? "保存中" : "保存这一刻";
  elements.saveStatus.textContent = message;
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
    ...memory
  });
  localStorage.setItem(localMemoriesKey, JSON.stringify(memories.slice(0, 12)));
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

  if (!memories.length) {
    elements.memoryGrid.append(elements.emptyTemplate.content.cloneNode(true));
    return;
  }

  memories.forEach((memory) => elements.memoryGrid.append(createMemoryCard(memory)));
}

function createMemoryCard(memory) {
  const article = document.createElement("article");
  article.className = "memory-card";

  const img = document.createElement("img");
  img.src = memory.photo_url;
  img.alt = memory.title || "旅行照片";

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

  body.append(meta, title, note);
  article.append(img, body);
  return article;
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
