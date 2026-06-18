const STORAGE_KEY = "what_et.characterNote.v1";

const defaultNote = {
  name: "사카",
  alias: "Saga",
  tagline: "영조海가 너를 내게로 인도했어.",
  accent: "#87a9ad",
  meta: [
    { label: "나이", value: "20세" },
    { label: "성별", value: "여성" },
    { label: "신장", value: "160cm" },
    { label: "직업", value: "등대지기" },
  ],
  sections: [
    {
      title: "기록",
      type: "plain",
      body: "검은 모래로 뒤덮인 해변가 인근 마을의 등대지기.\n자신이 태어난 마을과 바다를 끔찍이 사랑하는 소녀.\n\n언제부턴가 마을 바다에 일어나기 시작한 이상 현상으로 인해 전면 무인화된 등대를 지킬 누군가가 필요해졌다.\n소녀는 바다를 사랑하는 만큼 바닷가의 사람들을 사랑했다.\n그들을 자신이 무사히 인도할 수 있다면 무엇이든 하겠다는 생각으로 어린 나이에 공부를 시작했고,\n스무살이 되던 해 소녀는 그 마을의 등대를 지키기 시작했다.",
    },
    {
      title: "인터뷰 기록",
      type: "box",
      body: "약 삼 년 전부터 아이슬란드의 특정 해안 인근에서 괴현상이 보고되기 시작했어요.\n특히 그 현상 때문에 피해를 가장 크게 본 곳은 검은 모래 해변인데,\n그곳에는 매일 밤마다 절대 죽지 않는 수많은 해파리 떼가 나타났다고 봐요.\n\n중요한 건 그녀가 그 검은 모래 해변을 지키는 등대지기였다는 거고,\n그녀가 그 해파리 떼에게서 인간의 말을 들었다는 거예요.",
    },
  ],
  signature: "- 26M-RFT00의 처분을 결정한 AI의 인터뷰 中",
};

let note = loadNote();

const fields = {
  name: document.querySelector("#characterName"),
  alias: document.querySelector("#characterAlias"),
  tagline: document.querySelector("#tagline"),
  accent: document.querySelector("#accentColor"),
};

function init() {
  fields.name.addEventListener("input", () => updateField("name", fields.name.value));
  fields.alias.addEventListener("input", () => updateField("alias", fields.alias.value));
  fields.tagline.addEventListener("input", () => updateField("tagline", fields.tagline.value));
  fields.accent.addEventListener("input", () => updateField("accent", fields.accent.value));
  document.querySelector("#addMeta").addEventListener("click", addMeta);
  document.querySelector("#addSection").addEventListener("click", addSection);
  document.querySelector("#saveNote").addEventListener("click", () => saveNote("저장됨"));
  document.querySelector("#newNote").addEventListener("click", resetNote);
  document.querySelector("#printNote").addEventListener("click", () => window.print());
  renderAll();
}

function renderAll() {
  fields.name.value = note.name;
  fields.alias.value = note.alias;
  fields.tagline.value = note.tagline;
  fields.accent.value = note.accent;
  document.documentElement.style.setProperty("--accent", note.accent);
  document.documentElement.style.setProperty("--accent-dark", darken(note.accent, 0.24));
  renderMetaEditor();
  renderSectionEditor();
  renderPreview();
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
  preview.innerHTML = `
    <header class="paper-head">
      ${note.alias ? `<div class="paper-alias">${escapeHtml(note.alias)}</div>` : ""}
      <h2 class="paper-title">${escapeHtml(note.name || "이름 없음")}</h2>
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
  touch();
}

function addMeta() {
  note.meta.push({ label: "항목", value: "" });
  renderAll();
  touch();
}

function addSection() {
  note.sections.push({ title: "새 섹션", type: "plain", body: "" });
  renderAll();
  touch();
}

function handleSectionAction(action, index) {
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

function touch() {
  renderPreview();
  saveNote("자동 저장됨", false);
}

function saveNote(message = "저장됨", showTime = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(note));
  const suffix = showTime ? ` · ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}` : "";
  document.querySelector("#saveStatus").textContent = `${message}${suffix}`;
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
  note = structuredClone(defaultNote);
  saveNote("새 문서 시작");
  renderAll();
}

function darken(hex, amount) {
  const clean = hex.replace("#", "");
  const rgb = [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
  return `#${rgb.map((value) => Math.max(0, Math.round(value * (1 - amount))).toString(16).padStart(2, "0")).join("")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
