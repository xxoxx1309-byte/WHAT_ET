const STORAGE_KEY = "what_et.characterNote.v2";

const themes = [
  { name: "민트", accent: "#87a9ad", paper: "#ffffff", text: "#33434a" },
  { name: "블루", accent: "#5d8cc2", paper: "#fbfdff", text: "#243448" },
  { name: "라일락", accent: "#9b8ac4", paper: "#fffaff", text: "#352e42" },
  { name: "로즈", accent: "#c47b91", paper: "#fffafa", text: "#433037" },
  { name: "먹색", accent: "#30363a", paper: "#ffffff", text: "#25292c" },
];

const templates = {
  profile: {
    name: "기본 설정",
    description: "프로필, 외형, 성격을 빠르게 정리합니다.",
    theme: themes[0],
    meta: [
      { label: "나이", value: "" },
      { label: "성별", value: "" },
      { label: "신장", value: "" },
      { label: "직업", value: "" },
    ],
    sections: [
      { title: "개요", type: "plain", body: "" },
      { title: "외형", type: "plain", body: "" },
      { title: "성격", type: "plain", body: "" },
      { title: "기타", type: "box", body: "" },
    ],
  },
  story: {
    name: "서사 기록",
    description: "현재, 과거, 전환점, 숨겨진 기록을 나눕니다.",
    theme: themes[1],
    meta: [
      { label: "나이", value: "" },
      { label: "성별", value: "" },
      { label: "신장", value: "" },
      { label: "직업", value: "" },
    ],
    sections: [
      { title: "현재", type: "plain", body: "" },
      { title: "과거", type: "plain", body: "" },
      { title: "전환점", type: "plain", body: "" },
      { title: "숨겨진 기록", type: "fold", body: "" },
    ],
  },
  interview: {
    name: "인터뷰 로그",
    description: "기록자, 대상, 날짜와 인터뷰 박스를 만듭니다.",
    theme: themes[4],
    meta: [
      { label: "기록자", value: "" },
      { label: "대상", value: "" },
      { label: "날짜", value: "" },
    ],
    sections: [
      { title: "인터뷰 로그", type: "box", body: "" },
      { title: "관찰 메모", type: "plain", body: "" },
    ],
  },
  relation: {
    name: "관계 정리",
    description: "호칭, 상태, 중요 사건을 관계표처럼 정리합니다.",
    theme: themes[3],
    meta: [
      { label: "관계", value: "" },
      { label: "호칭", value: "" },
      { label: "상태", value: "" },
    ],
    sections: [
      { title: "첫 인상", type: "plain", body: "" },
      { title: "현재 관계", type: "plain", body: "" },
      { title: "중요 사건", type: "box", body: "" },
    ],
  },
};

const defaultNote = {
  name: "",
  alias: "",
  tagline: "",
  accent: "#87a9ad",
  paper: "#ffffff",
  text: "#33434a",
  meta: [],
  sections: [
    {
      title: "",
      type: "plain",
      body: "",
    },
  ],
  signature: "",
  scratch: "",
  format: {
    paperWidth: 860,
    bodySize: 15,
    lineHeight: 1.88,
    fontFamily: "Pretendard",
  },
};

let note = loadNote();
let history = [];

const fields = {
  name: document.querySelector("#characterName"),
  alias: document.querySelector("#characterAlias"),
  tagline: document.querySelector("#tagline"),
  accent: document.querySelector("#accentColor"),
  paper: document.querySelector("#paperColor"),
  text: document.querySelector("#textColor"),
  scratch: document.querySelector("#scratchNote"),
  fontFamily: document.querySelector("#fontFamily"),
  paperWidth: document.querySelector("#paperWidth"),
  bodySize: document.querySelector("#bodySize"),
  lineHeight: document.querySelector("#lineHeight"),
};

function init() {
  fields.name.addEventListener("input", () => updateField("name", fields.name.value));
  fields.alias.addEventListener("input", () => updateField("alias", fields.alias.value));
  fields.tagline.addEventListener("input", () => updateField("tagline", fields.tagline.value));
  fields.accent.addEventListener("input", () => updateField("accent", fields.accent.value));
  fields.paper.addEventListener("input", () => updateField("paper", fields.paper.value));
  fields.text.addEventListener("input", () => updateField("text", fields.text.value));
  fields.scratch.addEventListener("input", () => updateField("scratch", fields.scratch.value));
  fields.fontFamily.addEventListener("change", () => updateFormat("fontFamily", fields.fontFamily.value));
  fields.paperWidth.addEventListener("input", () => updateFormat("paperWidth", Number(fields.paperWidth.value)));
  fields.bodySize.addEventListener("input", () => updateFormat("bodySize", Number(fields.bodySize.value)));
  fields.lineHeight.addEventListener("input", () => updateFormat("lineHeight", Number(fields.lineHeight.value)));
  document.querySelector("#focusMode").addEventListener("click", toggleFocusMode);
  document.querySelector("#exitFocus").addEventListener("click", exitFocusMode);
  document.querySelector("#undoAction").addEventListener("click", undoAction);
  document.querySelector("#addMeta").addEventListener("click", addMeta);
  document.querySelector("#addSection").addEventListener("click", addSection);
  document.querySelector("#saveNote").addEventListener("click", () => saveNote("저장됨"));
  document.querySelector("#newNote").addEventListener("click", resetNote);
  document.querySelector("#shareNote").addEventListener("click", shareNote);
  document.querySelector("#exportPng").addEventListener("click", exportPng);
  document.querySelector("#exportPdf").addEventListener("click", () => window.print());
  renderThemes();
  renderTemplateCards();
  renderAll();
  updateUndoButton();
}

function renderAll() {
  ensureNoteShape();
  fields.name.value = note.name;
  fields.alias.value = note.alias;
  fields.tagline.value = note.tagline;
  fields.accent.value = note.accent;
  fields.paper.value = note.paper;
  fields.text.value = note.text;
  fields.scratch.value = note.scratch;
  fields.fontFamily.value = note.format.fontFamily;
  fields.paperWidth.value = note.format.paperWidth;
  fields.bodySize.value = note.format.bodySize;
  fields.lineHeight.value = note.format.lineHeight;
  applyTheme();
  applyFormat();
  renderMetaEditor();
  renderSectionEditor();
  renderPreview();
  updateStats();
  updateUndoButton();
}

function renderThemes() {
  const wrap = document.querySelector("#themePresets");
  wrap.innerHTML = "";
  themes.forEach((theme) => {
    const button = document.createElement("button");
    button.className = "theme-button";
    button.type = "button";
    button.innerHTML = `
      <span class="theme-chip" style="--chip:${theme.accent}"></span>
      <span>${theme.name}</span>
    `;
    button.addEventListener("click", () => {
      note.accent = theme.accent;
      note.paper = theme.paper;
      note.text = theme.text;
      renderAll();
      touch();
    });
    wrap.append(button);
  });
}

function renderTemplateCards() {
  const wrap = document.querySelector("#templateCards");
  wrap.innerHTML = "";
  Object.entries(templates).forEach(([key, template]) => {
    const button = document.createElement("button");
    button.className = "template-card";
    button.type = "button";
    button.innerHTML = `
      <span class="template-card-head">
        <strong>${template.name}</strong>
        <span class="theme-chip" style="--chip:${template.theme.accent}"></span>
      </span>
      <span>${template.description}</span>
      <small>${template.meta.length}개 항목 · ${template.sections.length}개 섹션</small>
    `;
    button.addEventListener("click", () => insertTemplate(key));
    wrap.append(button);
  });
}

function renderMetaEditor() {
  const wrap = document.querySelector("#metaEditor");
  wrap.innerHTML = "";
  note.meta.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "meta-row";
    row.innerHTML = `
      <input type="text" value="${escapeHtml(item.label)}" aria-label="항목 이름">
      <input type="text" value="${escapeHtml(item.value)}" aria-label="항목 내용">
      <button class="danger" type="button" aria-label="항목 삭제">삭제</button>
    `;
    const [label, value] = row.querySelectorAll("input");
    label.addEventListener("input", () => {
      note.meta[index].label = label.value;
      touch();
    });
    value.addEventListener("input", () => {
      note.meta[index].value = value.value;
      touch();
    });
    row.querySelector("button").addEventListener("click", () => {
      remember();
      note.meta.splice(index, 1);
      renderAll();
      touch();
    });
    wrap.append(row);
  });
}

function renderSectionEditor() {
  const wrap = document.querySelector("#sectionEditor");
  wrap.innerHTML = "";
  note.sections.forEach((section, index) => {
    const card = document.createElement("div");
    card.className = "section-card";
    card.innerHTML = `
      <input class="section-title-input" type="text" value="${escapeHtml(section.title)}" aria-label="섹션 제목">
      <select aria-label="섹션 형식">
        <option value="plain" ${section.type === "plain" ? "selected" : ""}>일반 본문</option>
        <option value="box" ${section.type === "box" ? "selected" : ""}>테두리 박스</option>
        <option value="fold" ${section.type === "fold" ? "selected" : ""}>접기 박스</option>
      </select>
      <textarea aria-label="섹션 본문">${escapeHtml(section.body)}</textarea>
      <div class="section-actions">
        <button type="button" data-action="up">위로</button>
        <button type="button" data-action="down">아래로</button>
        <button type="button" data-action="copy">복제</button>
        <button class="danger" type="button" data-action="delete">삭제</button>
      </div>
    `;
    card.querySelector(".section-title-input").addEventListener("input", (event) => {
      note.sections[index].title = event.target.value;
      touch();
    });
    card.querySelector("select").addEventListener("change", (event) => {
      note.sections[index].type = event.target.value;
      touch();
    });
    card.querySelector("textarea").addEventListener("input", (event) => {
      note.sections[index].body = event.target.value;
      touch();
    });
    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => handleSectionAction(button.dataset.action, index));
    });
    wrap.append(card);
  });
}

function renderPreview() {
  const preview = document.querySelector("#notePreview");
  const hasMeta = note.meta.some((item) => item.label || item.value);
  const hasContent = note.name || note.alias || note.tagline || hasMeta || note.sections.some((section) => section.title || section.body);
  preview.innerHTML = `
    <header class="paper-head">
      ${note.alias ? `<div class="paper-alias">${escapeHtml(note.alias)}</div>` : ""}
      <h2 class="paper-title">${escapeHtml(note.name || "무제 설정")}</h2>
      <div class="meta-list">
        ${note.meta.filter((item) => item.label || item.value).map((item) => `
          <div class="meta-line">
            <span class="meta-label">${escapeHtml(item.label || "항목")}</span>
            <span>${escapeHtml(item.value || "-")}</span>
          </div>
        `).join("")}
      </div>
    </header>
    ${note.tagline ? `<p class="quote">${escapeHtml(note.tagline)}</p>` : ""}
    ${note.sections.map(renderPreviewSection).join("")}
    ${note.signature ? `<p class="signature">${escapeHtml(note.signature)}</p>` : ""}
    ${hasContent ? "" : `<p class="empty-paper">왼쪽에서 설정을 작성하면 여기에 문서처럼 정리됩니다.</p>`}
  `;
}

function renderPreviewSection(section) {
  const title = escapeHtml(section.title || "제목 없음");
  const body = escapeHtml(section.body || "");
  if (section.type === "fold") {
    return `
      <details class="note-section" open>
        <summary>${title}</summary>
        <div class="note-section-body">${body}</div>
      </details>
    `;
  }
  const extra = section.type === "box" ? " boxed-section" : "";
  return `
    <section class="note-section${extra}">
      ${section.title ? `<h3>${title}</h3>` : ""}
      <div class="note-section-body">${body}</div>
    </section>
  `;
}

function updateField(key, value) {
  note[key] = value;
  if (["accent", "paper", "text"].includes(key)) applyTheme();
  touch();
}

function applyTheme() {
  document.documentElement.style.setProperty("--accent", note.accent);
  document.documentElement.style.setProperty("--accent-dark", darken(note.accent, 0.24));
  document.documentElement.style.setProperty("--paper", note.paper);
  document.documentElement.style.setProperty("--ink", note.text);
  document.documentElement.style.setProperty("--muted", mix(note.text, "#ffffff", 0.42));
}

function updateFormat(key, value) {
  note.format[key] = value;
  applyFormat();
  touch();
}

function applyFormat() {
  document.documentElement.style.setProperty("--paper-width", `${note.format.paperWidth}px`);
  document.documentElement.style.setProperty("--body-size", `${note.format.bodySize}px`);
  document.documentElement.style.setProperty("--body-leading", note.format.lineHeight);
  document.documentElement.style.setProperty("--note-font", `"${note.format.fontFamily}"`);
}

function addMeta() {
  remember();
  note.meta.push({ label: "", value: "" });
  renderAll();
  touch();
}

function addSection() {
  remember();
  note.sections.push({ title: "", type: "plain", body: "" });
  renderAll();
  touch();
}

function insertTemplate(kind) {
  remember();
  const template = structuredClone(templates[kind] || templates.profile);
  if (!note.meta.length) note.meta.push(...template.meta);
  note.sections.push(...template.sections);
  if (!note.accent || note.accent === defaultNote.accent) {
    note.accent = template.theme.accent;
    note.paper = template.theme.paper;
    note.text = template.theme.text;
  }
  renderAll();
  touch();
  saveNote(`${template.name} 추가됨`, false);
}

function toggleFocusMode() {
  document.body.classList.toggle("focus-mode");
}

function exitFocusMode() {
  document.body.classList.remove("focus-mode");
}

function handleSectionAction(action, index) {
  remember();
  if (action === "up" && index > 0) {
    [note.sections[index - 1], note.sections[index]] = [note.sections[index], note.sections[index - 1]];
  }
  if (action === "down" && index < note.sections.length - 1) {
    [note.sections[index + 1], note.sections[index]] = [note.sections[index], note.sections[index + 1]];
  }
  if (action === "copy") {
    note.sections.splice(index + 1, 0, { ...note.sections[index] });
  }
  if (action === "delete") {
    note.sections.splice(index, 1);
  }
  renderAll();
  touch();
}

function undoAction() {
  const previous = history.pop();
  if (!previous) return;
  note = previous;
  renderAll();
  touch();
  saveNote("되돌림", false);
  updateUndoButton();
}

function remember() {
  history.push(structuredClone(note));
  if (history.length > 30) history.shift();
  updateUndoButton();
}

function updateUndoButton() {
  const button = document.querySelector("#undoAction");
  button.disabled = history.length === 0;
}

function touch() {
  renderPreview();
  updateStats();
  saveNote("자동 저장됨", false);
}

function saveNote(message = "저장됨", showTime = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(note));
  const suffix = showTime ? ` · ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}` : "";
  document.querySelector("#saveStatus").textContent = `${message}${suffix}`;
  document.querySelector("#savedState").textContent = message;
}

async function shareNote() {
  const text = noteToText();
  try {
    if (navigator.share) {
      await navigator.share({ title: note.name || "WHAT_ET 설정 노트", text });
      saveNote("공유 열림", false);
      return;
    }
    await navigator.clipboard.writeText(text);
    saveNote("본문 복사됨", false);
  } catch (error) {
    saveNote("공유 취소됨", false);
  }
}

async function exportPng() {
  const paper = document.querySelector("#notePreview");
  if (!window.html2canvas) {
    saveNote("PNG 모듈 로드 실패", false);
    return;
  }
  const canvas = await html2canvas(paper, { backgroundColor: note.paper, scale: 2 });
  const link = document.createElement("a");
  link.download = `${note.name || "WHAT_ET_NOTE"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  saveNote("PNG 저장됨", false);
}

function loadNote() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.meta) && Array.isArray(saved.sections)) return saved;
  } catch (error) {
    // Ignore broken local data and fall back to the starter document.
  }
  return structuredClone(defaultNote);
}

function resetNote() {
  if (!confirm("새 설정 문서를 시작할까요? 현재 내용은 저장본에서 사라집니다.")) return;
  remember();
  note = structuredClone(defaultNote);
  saveNote("새 문서 시작");
  renderAll();
}

function updateStats() {
  const text = [
    note.name,
    note.alias,
    note.tagline,
    ...note.meta.flatMap((item) => [item.label, item.value]),
    ...note.sections.flatMap((section) => [section.title, section.body]),
    note.scratch,
  ].join("");
  const count = [...text.replace(/\s/g, "")].length;
  document.querySelector("#charCount").textContent = `${count.toLocaleString("ko-KR")}자`;
  document.querySelector("#sectionCount").textContent = `${note.sections.length}섹션`;
  document.querySelector("#previewStats").textContent = `${count.toLocaleString("ko-KR")}자`;
}

function ensureNoteShape() {
  note.name ||= "";
  note.alias ||= "";
  note.tagline ||= "";
  note.accent ||= "#87a9ad";
  note.paper ||= "#ffffff";
  note.text ||= "#33434a";
  note.meta = Array.isArray(note.meta) ? note.meta : [];
  note.sections = Array.isArray(note.sections) ? note.sections : [];
  note.scratch ||= "";
  note.signature ||= "";
  note.format = {
    paperWidth: Number(note.format?.paperWidth) || 860,
    bodySize: Number(note.format?.bodySize) || 15,
    lineHeight: Number(note.format?.lineHeight) || 1.88,
    fontFamily: note.format?.fontFamily || "Pretendard",
  };
}

function noteToText() {
  const lines = [];
  if (note.name) lines.push(note.name);
  if (note.alias) lines.push(note.alias);
  if (note.tagline) lines.push(`> ${note.tagline}`);
  note.meta.filter((item) => item.label || item.value).forEach((item) => {
    lines.push(`${item.label || "항목"}: ${item.value || "-"}`);
  });
  note.sections.forEach((section) => {
    if (section.title) lines.push(`\n[${section.title}]`);
    if (section.body) lines.push(section.body);
  });
  if (note.scratch) lines.push(`\n[메모]\n${note.scratch}`);
  return lines.join("\n");
}

function darken(hex, amount) {
  const clean = hex.replace("#", "");
  const rgb = [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
  return `#${rgb.map((value) => Math.max(0, Math.round(value * (1 - amount))).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const mixed = ca.map((value, index) => Math.round(value * (1 - amount) + cb[index] * amount));
  return rgbToHex(mixed);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
