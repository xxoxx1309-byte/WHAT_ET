const canvas = document.querySelector("#sheet");
const ctx = canvas.getContext("2d");
const picker = document.querySelector("#imagePicker");
const STORAGE_KEY = "what_et.savedCharacters.v1";
const textFieldIds = ["name", "age", "height", "gender", "keywords", "credit", "summary", "memo"];

const slots = {
  main: { label: "메인 전신", x: 110, y: 340, w: 480, h: 660, r: 28 },
  detail1: { label: "상세컷 1", x: 720, y: 330, w: 230, h: 210, r: 24 },
  detail2: { label: "상세컷 2", x: 980, y: 330, w: 230, h: 210, r: 24 },
  detail3: { label: "상세컷 3", x: 1240, y: 330, w: 230, h: 210, r: 24 },
};

const state = {
  name: "",
  age: "",
  height: "",
  gender: "",
  keywords: "",
  credit: "",
  summary: "",
  memo: "",
  characterColors: [
    { label: "테마", color: "#5d5696", fixed: true, set: false },
    { label: "머리", color: "#ffffff", fixed: true, set: false },
    { label: "눈", color: "#ffffff", fixed: true, set: false },
    { label: "피부", color: "#ffffff", fixed: true, set: false },
  ],
  images: {},
};

let selectedSlot = "main";
let pendingSlot = null;
let drag = null;
let activeSaveId = null;

function init() {
  Object.keys(slots).forEach((id) => {
    state.images[id] = { src: "", img: null, zoom: 1, x: 0, y: 0, mode: "fill" };
  });

  textFieldIds.forEach((id) => {
    const input = document.querySelector(`#${id}`);
    const sync = () => {
      state[id] = input.value;
      draw();
    };
    input.addEventListener("input", sync);
    input.addEventListener("compositionend", sync);
    input.addEventListener("change", sync);
    input.addEventListener("keyup", sync);
  });

  document.querySelector("#zoom").addEventListener("input", updateSelectedImage);
  document.querySelector("#offsetX").addEventListener("input", updateSelectedImage);
  document.querySelector("#offsetY").addEventListener("input", updateSelectedImage);
  document.querySelector("#fitImage").addEventListener("click", () => setImageMode("fit"));
  document.querySelector("#fillImage").addEventListener("click", () => setImageMode("fill"));
  document.querySelector("#clearImage").addEventListener("click", clearSelectedImage);
  document.querySelector("#exportPng").addEventListener("click", exportPng);
  document.querySelector("#addColor").addEventListener("click", addColor);
  document.querySelector("#saveCharacter").addEventListener("click", saveCharacter);
  document.querySelector("#newCharacter").addEventListener("click", resetCharacter);
  picker.addEventListener("change", importImage);

  canvas.addEventListener("dblclick", openClickedSlot);
  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointerleave", stopDrag);

  renderSlots();
  renderSwatches();
  renderSaveList();
  syncAdjust();
  draw();
  document.fonts?.ready.then(draw);
}

function renderSlots() {
  const list = document.querySelector("#slotList");
  list.innerHTML = "";
  Object.entries(slots).forEach(([id, slot]) => {
    const card = document.createElement("button");
    card.className = `slot-card ${id === selectedSlot ? "active" : ""}`;
    card.type = "button";
    card.innerHTML = `<span>${slot.label}</span><small>${state.images[id].src ? "이미지 있음" : "업로드"}</small>`;
    card.addEventListener("click", () => {
      selectSlot(id);
      requestImage(id);
    });
    list.append(card);
  });
}

function renderSwatches() {
  const wrap = document.querySelector("#swatches");
  wrap.innerHTML = "";
  state.characterColors.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML = `
      <input class="color-name" type="text" value="${escapeHtml(item.label)}" aria-label="색 이름">
      <label class="color-swatch-button" style="--swatch:${item.color}">
        <input class="color-picker" type="color" value="${item.color}" aria-label="${escapeHtml(item.label)} 색">
      </label>
      <input class="hex-input" type="text" value="${item.set ? item.color.toUpperCase() : ""}" placeholder="#HEX" maxlength="7" aria-label="헥스코드">
      <button class="color-reset" type="button">${item.set ? "해제" : "미설정"}</button>
      <button class="color-remove" type="button" ${item.fixed ? "disabled" : ""}>삭제</button>
    `;
    row.querySelector(".color-name").addEventListener("input", (event) => {
      state.characterColors[index].label = event.target.value;
      draw();
    });
    const swatchButton = row.querySelector(".color-swatch-button");
    const colorPicker = row.querySelector(".color-picker");
    const hexInput = row.querySelector(".hex-input");
    colorPicker.addEventListener("input", (event) => {
      const value = event.target.value;
      state.characterColors[index].color = value;
      state.characterColors[index].set = true;
      swatchButton.style.setProperty("--swatch", value);
      hexInput.value = value.toUpperCase();
      draw();
    });
    colorPicker.addEventListener("change", renderSwatches);
    hexInput.addEventListener("input", (event) => {
      const value = normalizeHex(event.target.value);
      if (!value) return;
      state.characterColors[index].color = value;
      state.characterColors[index].set = true;
      swatchButton.style.setProperty("--swatch", value);
      colorPicker.value = value;
      draw();
    });
    hexInput.addEventListener("change", renderSwatches);
    row.querySelector(".color-reset").addEventListener("click", () => {
      state.characterColors[index].set = false;
      draw();
      renderSwatches();
    });
    row.querySelector(".color-remove").addEventListener("click", () => {
      state.characterColors.splice(index, 1);
      renderSwatches();
      draw();
    });
    wrap.append(row);
  });
}

function addColor() {
  state.characterColors.push({ label: "", color: "#ffffff", fixed: false, set: false });
  renderSwatches();
  draw();
}

function saveCharacter() {
  const saved = readSavedCharacters();
  const now = new Date().toISOString();
  const id = activeSaveId || makeId();
  const index = saved.findIndex((item) => item.id === id);
  const entry = {
    id,
    name: state.name.trim() || "이름 없음",
    updatedAt: now,
    data: serializeState(),
  };

  if (index >= 0) saved[index] = entry;
  else saved.unshift(entry);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    activeSaveId = id;
    renderSaveList();
    setSaveStatus(`저장됨 · ${formatSavedAt(now)}`);
  } catch (error) {
    setSaveStatus("저장 공간이 부족해요. 이미지 용량을 줄이거나 일부 저장본을 삭제해주세요.");
  }
}

function renderSaveList() {
  const list = document.querySelector("#saveList");
  const saved = readSavedCharacters();
  list.innerHTML = "";
  if (!saved.length) {
    list.innerHTML = `<p class="empty-save">저장된 캐릭터가 없습니다.</p>`;
    return;
  }

  saved.forEach((item) => {
    const row = document.createElement("div");
    row.className = `save-item ${item.id === activeSaveId ? "active" : ""}`;
    row.innerHTML = `
      <button class="save-load" type="button">
        <span>${escapeHtml(item.name)}</span>
        <small>${formatSavedAt(item.updatedAt)}</small>
      </button>
      <button class="save-delete" type="button" aria-label="${escapeHtml(item.name)} 삭제">삭제</button>
    `;
    row.querySelector(".save-load").addEventListener("click", () => loadCharacter(item.id));
    row.querySelector(".save-delete").addEventListener("click", () => deleteCharacter(item.id));
    list.append(row);
  });
}

async function loadCharacter(id) {
  const item = readSavedCharacters().find((saved) => saved.id === id);
  if (!item) return;
  activeSaveId = id;
  await applySavedData(item.data);
  renderSaveList();
  setSaveStatus(`${item.name} 불러옴`);
}

function deleteCharacter(id) {
  const saved = readSavedCharacters();
  const item = saved.find((entry) => entry.id === id);
  if (!item || !confirm(`${item.name} 저장본을 삭제할까요?`)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.filter((entry) => entry.id !== id)));
  if (activeSaveId === id) activeSaveId = null;
  renderSaveList();
  setSaveStatus("저장본 삭제됨");
}

function resetCharacter() {
  if (!confirm("현재 입력을 비우고 새 작업을 시작할까요? 저장하지 않은 내용은 사라집니다.")) return;
  activeSaveId = null;
  textFieldIds.forEach((id) => {
    state[id] = "";
    document.querySelector(`#${id}`).value = "";
  });
  state.characterColors = defaultCharacterColors();
  Object.keys(slots).forEach((id) => {
    state.images[id] = { src: "", img: null, zoom: 1, x: 0, y: 0, mode: "fill" };
  });
  selectedSlot = "main";
  renderSlots();
  renderSwatches();
  renderSaveList();
  syncAdjust();
  draw();
  setSaveStatus("새 작업 시작");
}

function selectSlot(id) {
  selectedSlot = id;
  renderSlots();
  syncAdjust();
}

function syncAdjust() {
  const image = state.images[selectedSlot];
  document.querySelector("#selectedName").textContent = `선택된 이미지: ${slots[selectedSlot].label}`;
  document.querySelector("#zoom").value = image.zoom;
  document.querySelector("#offsetX").value = image.x;
  document.querySelector("#offsetY").value = image.y;
}

function updateSelectedImage() {
  const image = state.images[selectedSlot];
  image.zoom = Number(document.querySelector("#zoom").value);
  image.x = Number(document.querySelector("#offsetX").value);
  image.y = Number(document.querySelector("#offsetY").value);
  draw();
}

function setImageMode(mode) {
  const image = state.images[selectedSlot];
  image.mode = mode;
  image.zoom = 1;
  image.x = 0;
  image.y = 0;
  syncAdjust();
  draw();
}

function clearSelectedImage() {
  state.images[selectedSlot] = { src: "", img: null, zoom: 1, x: 0, y: 0, mode: "fill" };
  renderSlots();
  syncAdjust();
  draw();
}

function requestImage(id) {
  pendingSlot = id;
  picker.value = "";
  picker.click();
}

function importImage(event) {
  const file = event.target.files[0];
  if (!file || !pendingSlot) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.images[pendingSlot] = {
        src: reader.result,
        img,
        zoom: 1,
        x: 0,
        y: 0,
        mode: pendingSlot === "main" ? "fit" : "fill",
      };
      selectSlot(pendingSlot);
      pendingSlot = null;
      draw();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function openClickedSlot(event) {
  const id = hitSlot(canvasPoint(event));
  if (id) {
    selectSlot(id);
    requestImage(id);
  }
}

function startDrag(event) {
  const point = canvasPoint(event);
  const id = hitSlot(point);
  if (!id) return;
  selectSlot(id);
  const image = state.images[id];
  if (!image.src) return;
  drag = { id, start: point, x: image.x, y: image.y };
}

function moveDrag(event) {
  if (!drag) return;
  const point = canvasPoint(event);
  const image = state.images[drag.id];
  image.x = Math.round(drag.x + point.x - drag.start.x);
  image.y = Math.round(drag.y + point.y - drag.start.y);
  syncAdjust();
  draw();
}

function stopDrag() {
  drag = null;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSheet();
}

function drawSheet() {
  const theme = getTheme();

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  softCard(70, 88, 1460, 1028, 34, theme.surface, theme.shadow);
  ctx.fillStyle = theme.header;
  ctx.fillRect(70, 88, 1460, 172);
  roundRect(125, 188, 680, 9, 5, theme.line);

  drawText(state.name || "CHARACTER NAME", 125, 154, 50, 720, 900, "left", theme.primary, "Pretendard");
  const info = metaText();
  if (info) drawText(info, 130, 224, 22, 760, 700, "left", theme.text);
  if (state.credit) drawText(state.credit, 1380, 150, 22, 220, 700, "right", theme.muted);

  state.characterColors.filter((item) => item.set).slice(0, 7).forEach((item, index) => {
    ctx.beginPath();
    ctx.arc(1240 + index * 42, 205, 16, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isLightHex(item.color) ? hexToRgba(theme.text, 0.28) : hexToRgba(theme.surface, 0.9);
    ctx.stroke();
  });

  Object.entries(slots).forEach(([id, slot]) => drawImageSlot(id, slot, theme));

  softCard(720, 595, 350, 330, 18, theme.surface, theme.shadow);
  softCard(1100, 595, 350, 330, 18, theme.surface, theme.shadow);
  drawText("헤어 & 얼굴", 750, 640, 27, 290, 900, "left", theme.text, "Pretendard");
  drawWrapped(state.summary || "외관 특징을 입력하세요.", 750, 695, 18, 295, 29, 500, theme.text);
  drawText("의상 & 기타", 1130, 640, 27, 290, 900, "left", theme.text, "Pretendard");
  drawWrapped(state.memo || "의상과 소품 설명을 입력하세요.", 1130, 695, 18, 295, 29, 500, theme.text);

  roundRect(780, 980, 390, 10, 5, theme.secondary);
  drawText(hashKeywords(state.keywords), 125, 1056, 26, 650, 800, "left", theme.muted);
}

function drawImageSlot(id, slot, theme) {
  ctx.save();
  ctx.beginPath();
  pathRoundRect(slot.x, slot.y, slot.w, slot.h, slot.r);
  ctx.clip();
  ctx.fillStyle = theme.slot;
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

  const image = state.images[id];
  if (image?.img) {
    drawFittedImage(image.img, slot, image);
  } else {
    drawText(slot.label, slot.x + slot.w / 2, slot.y + slot.h / 2 - 12, 24, slot.w - 36, 800, "center", theme.text);
    drawText("이미지 업로드", slot.x + slot.w / 2, slot.y + slot.h / 2 + 24, 17, slot.w - 36, 600, "center", theme.muted);
  }
  ctx.restore();
}

function drawFittedImage(img, slot, image) {
  const base = image.mode === "fit"
    ? Math.min(slot.w / img.width, slot.h / img.height)
    : Math.max(slot.w / img.width, slot.h / img.height);
  const scale = base * image.zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, slot.x + slot.w / 2 - w / 2 + image.x, slot.y + slot.h / 2 - h / 2 + image.y, w, h);
}

function exportPng() {
  const link = document.createElement("a");
  link.download = `${state.name || "WHAT_ET"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function serializeState() {
  const data = {
    version: 1,
    characterColors: state.characterColors.map((item) => ({ ...item })),
    images: {},
  };
  textFieldIds.forEach((id) => {
    data[id] = state[id];
  });
  Object.entries(state.images).forEach(([id, image]) => {
    data.images[id] = {
      src: image.src,
      zoom: image.zoom,
      x: image.x,
      y: image.y,
      mode: image.mode,
    };
  });
  return data;
}

async function applySavedData(data = {}) {
  textFieldIds.forEach((id) => {
    state[id] = data[id] || "";
    document.querySelector(`#${id}`).value = state[id];
  });
  state.characterColors = Array.isArray(data.characterColors) && data.characterColors.length
    ? data.characterColors.map((item) => ({
      label: item.label || "",
      color: normalizeHex(item.color || "") || "#ffffff",
      fixed: Boolean(item.fixed),
      set: Boolean(item.set),
    }))
    : defaultCharacterColors();

  await Promise.all(Object.keys(slots).map(async (id) => {
    const savedImage = data.images?.[id] || {};
    state.images[id] = {
      src: savedImage.src || "",
      img: null,
      zoom: Number(savedImage.zoom) || 1,
      x: Number(savedImage.x) || 0,
      y: Number(savedImage.y) || 0,
      mode: savedImage.mode === "fit" ? "fit" : "fill",
    };
    if (state.images[id].src) {
      state.images[id].img = await loadImage(state.images[id].src);
    }
  }));

  selectedSlot = "main";
  renderSlots();
  renderSwatches();
  syncAdjust();
  draw();
}

function readSavedCharacters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function defaultCharacterColors() {
  return [
    { label: "테마", color: "#5d5696", fixed: true, set: false },
    { label: "머리", color: "#ffffff", fixed: true, set: false },
    { label: "눈", color: "#ffffff", fixed: true, set: false },
    { label: "피부", color: "#ffffff", fixed: true, set: false },
  ];
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `save-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setSaveStatus(message) {
  document.querySelector("#saveStatus").textContent = message;
}

function metaText() {
  return [
    state.age && `나이 ${state.age}`,
    state.height && `키 ${state.height}`,
    state.gender && `성별 ${state.gender}`,
  ].filter(Boolean).join("  ·  ");
}

function hashKeywords(text) {
  const words = String(text).split(/,|\s/).map((word) => word.trim()).filter(Boolean).slice(0, 3);
  return words.length ? words.map((word) => `#${word}`).join("  ") : "";
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitSlot(point) {
  return Object.entries(slots).find(([, slot]) => (
    point.x >= slot.x && point.x <= slot.x + slot.w && point.y >= slot.y && point.y <= slot.y + slot.h
  ))?.[0];
}

function softCard(x, y, w, h, r, fill = "#fff", shadow = "rgba(93, 86, 150, 0.12)") {
  ctx.save();
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(x, y, w, h, r, fill);
  ctx.restore();
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  pathRoundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function pathRoundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawText(text, x, y, size, maxWidth, weight = 700, align = "left", color = "#1c1b1f", family = "Pretendard") {
  ctx.save();
  let fitSize = size;
  ctx.font = `${weight} ${fitSize}px "${family}", "Malgun Gothic", sans-serif`;
  while (maxWidth && ctx.measureText(text).width > maxWidth && fitSize > 12) {
    fitSize -= 1;
    ctx.font = `${weight} ${fitSize}px "${family}", "Malgun Gothic", sans-serif`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawWrapped(text, x, y, size, maxWidth, lineHeight, weight = 700, color = "#1c1b1f") {
  ctx.save();
  ctx.font = `${weight} ${size}px "Pretendard", "Malgun Gothic", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  String(text).split("\n").forEach((paragraph) => {
    const lines = wrapManualLine(paragraph.trim(), maxWidth);
    if (!lines.length) {
      y += lineHeight;
      return;
    }
    lines.forEach((line) => {
      ctx.fillText(line, x, y);
      y += lineHeight;
    });
  });
  ctx.restore();
}

function wrapManualLine(line, maxWidth) {
  if (!line) return [];
  const output = [];
  let current = "";
  line.split(/(\s+)/).forEach((token) => {
    if (!token) return;
    const next = current + token;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current.trim()) output.push(current.trimEnd());
    current = "";
    if (ctx.measureText(token).width <= maxWidth) {
      current = token.trimStart();
      return;
    }
    let piece = "";
    Array.from(token).forEach((char) => {
      if (ctx.measureText(piece + char).width > maxWidth && piece) {
        output.push(piece);
        piece = char;
      } else {
        piece += char;
      }
    });
    current = piece;
  });
  if (current.trim()) output.push(current.trimEnd());
  return output;
}

function getTheme() {
  const [primary, secondary, accent, surface, text] = generatePalette(getThemeBaseColor());
  return {
    primary,
    secondary,
    accent,
    surface,
    text,
    palette: [primary, secondary, accent, surface, text],
    background: mix(surface, secondary, 0.16),
    header: mix(surface, secondary, 0.24),
    line: mix(surface, primary, 0.18),
    slot: mix(surface, secondary, 0.07),
    muted: mix(text, primary, 0.45),
    shadow: hexToRgba(primary, 0.14),
  };
}

function getThemeBaseColor() {
  return state.characterColors.find((item) => item.label.trim() === "테마" && item.set)?.color
    || state.characterColors.find((item) => item.set)?.color
    || "#5d5696";
}

function generatePalette(baseColor) {
  const hsl = hexToHsl(baseColor);
  const isDark = hsl.l < 0.38;
  const isVeryLight = hsl.l > 0.78;
  const primaryLightness = hsl.l > 0.62 ? 0.46 : clamp(hsl.l, 0.28, 0.58);
  const primary = hslToHex(hsl.h, clamp(hsl.s * 1.05, 0.34, 0.78), primaryLightness);
  const secondary = hslToHex(hsl.h, clamp(hsl.s * 0.48, 0.16, 0.46), isDark ? 0.78 : 0.86);
  const accentHue = (hsl.h + 28) % 360;
  const accent = hslToHex(accentHue, clamp(hsl.s * 0.65, 0.22, 0.58), isVeryLight ? 0.72 : 0.76);
  const surface = hslToHex(hsl.h, clamp(hsl.s * 0.12, 0.03, 0.12), 0.985);
  const text = isDark ? "#1c1b1f" : hslToHex(hsl.h, clamp(hsl.s * 0.28, 0.08, 0.28), 0.16);
  return [primary, secondary, accent, surface, text];
}

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let rgb = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex(rgb.map((value) => Math.round((value + m) * 255)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function isLightHex(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 214;
}

function normalizeHex(value) {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean.split("").map((char) => char + char).join("").toLowerCase()}`;
  }
  return "";
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
