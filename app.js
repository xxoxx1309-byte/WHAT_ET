const canvas = document.querySelector("#sheet");
const ctx = canvas.getContext("2d");
const picker = document.querySelector("#imagePicker");

const slots = {
  main: { label: "메인 전신", x: 160, y: 345, w: 520, h: 650, r: 28 },
  detail1: { label: "상세컷 1", x: 730, y: 345, w: 220, h: 220, r: 24 },
  detail2: { label: "상세컷 2", x: 985, y: 345, w: 220, h: 220, r: 24 },
  detail3: { label: "상세컷 3", x: 1240, y: 345, w: 220, h: 220, r: 24 },
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

function init() {
  Object.keys(slots).forEach((id) => {
    state.images[id] = { src: "", img: null, zoom: 1, x: 0, y: 0, mode: "fill" };
  });

  ["name", "age", "height", "gender", "keywords", "credit", "summary", "memo"].forEach((id) => {
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
  picker.addEventListener("change", importImage);

  canvas.addEventListener("dblclick", openClickedSlot);
  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointerleave", stopDrag);

  renderSlots();
  renderSwatches();
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
      <input class="color-picker" type="color" value="${item.color}" aria-label="${escapeHtml(item.label)} 색">
      <button class="color-reset" type="button">${item.set ? "해제" : "미설정"}</button>
      <button class="color-remove" type="button" ${item.fixed ? "disabled" : ""}>삭제</button>
    `;
    row.querySelector(".color-name").addEventListener("input", (event) => {
      state.characterColors[index].label = event.target.value;
      draw();
    });
    row.querySelector(".color-picker").addEventListener("input", (event) => {
      state.characterColors[index].color = event.target.value;
      state.characterColors[index].set = true;
      renderSwatches();
      draw();
    });
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
      state.images[pendingSlot] = { src: reader.result, img, zoom: 1, x: 0, y: 0, mode: "fill" };
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
  ctx.fillRect(70, 88, 1460, 162);
  roundRect(125, 184, 680, 10, 6, theme.line);

  drawText(state.name || "CHARACTER NAME", 125, 150, 58, 720, 900, "left", theme.primary);
  drawText(metaText(), 130, 218, 22, 760, 700, "left", theme.text);
  drawText(state.credit || "@credit", 1380, 150, 22, 220, 700, "right", theme.muted);

  state.characterColors.filter((item) => item.set).slice(0, 7).forEach((item, index) => {
    ctx.beginPath();
    ctx.arc(1240 + index * 42, 205, 16, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
  });

  Object.entries(slots).forEach(([id, slot]) => drawImageSlot(id, slot, theme));

  softCard(730, 600, 300, 320, 18, theme.surface, theme.shadow);
  softCard(1060, 600, 300, 320, 18, theme.surface, theme.shadow);
  drawText("헤어 & 얼굴", 760, 650, 29, 240, 900, "left", theme.text);
  drawWrapped(state.summary || "외관 특징을 입력하세요.", 760, 705, 24, 230, 34, 700, theme.text);
  drawText("의상 & 기타", 1090, 650, 29, 240, 900, "left", theme.text);
  drawWrapped(clampText(state.memo || "의상과 소품 설명을 입력하세요.", 62), 1090, 705, 22, 230, 31, 700, theme.text);

  roundRect(755, 1012, 430, 12, 6, theme.secondary);
  drawText(hashKeywords(state.keywords), 125, 1056, 26, 650, 800, "left", theme.muted);
}

function drawImageSlot(id, slot, theme) {
  ctx.save();
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

function metaText() {
  return `나이 ${state.age || "--"}    키 ${state.height || "--"}    성별 ${state.gender || "--"}`;
}

function hashKeywords(text) {
  const words = String(text).split(/,|\s/).map((word) => word.trim()).filter(Boolean).slice(0, 3);
  return words.length ? words.map((word) => `#${word}`).join("  ") : "";
}

function clampText(text, maxLength) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
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

function drawText(text, x, y, size, maxWidth, weight = 700, align = "left", color = "#1c1b1f") {
  ctx.save();
  ctx.font = `${weight} ${size}px "SUIT", "Malgun Gothic", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function drawWrapped(text, x, y, size, maxWidth, lineHeight, weight = 700, color = "#1c1b1f") {
  ctx.save();
  ctx.font = `${weight} ${size}px "SUIT", "Malgun Gothic", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  String(text).split("\n").forEach((paragraph) => {
    let line = "";
    paragraph.split(" ").forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y, maxWidth);
        y += lineHeight;
        line = word;
      } else {
        line = test;
      }
    });
    ctx.fillText(line, x, y, maxWidth);
    y += lineHeight;
  });
  ctx.restore();
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
  const primary = hslToHex(hsl.h, clamp(hsl.s * 0.9, 0.24, 0.72), clamp(hsl.l, 0.28, 0.58));
  const secondary = hslToHex(hsl.h, clamp(hsl.s * 0.55, 0.18, 0.48), isDark ? 0.78 : 0.84);
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
