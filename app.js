const canvas = document.querySelector("#sheet");
const ctx = canvas.getContext("2d");
const picker = document.querySelector("#imagePicker");

const slots = {
  main: { label: "메인 전신", x: 160, y: 345, w: 520, h: 650, r: 28 },
  outfit: { label: "의상", x: 730, y: 345, w: 220, h: 220, r: 24 },
  face: { label: "얼굴", x: 985, y: 345, w: 220, h: 220, r: 24 },
  expression: { label: "표정", x: 1240, y: 345, w: 220, h: 220, r: 24 },
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
  colors: ["#5d5696", "#c7bfff", "#f4abdb", "#ffffff", "#1c1b1f"],
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
  state.colors.forEach((color, index) => {
    const label = document.createElement("label");
    label.className = "swatch";
    label.innerHTML = `컬러 ${index + 1}<input type="color" value="${color}">`;
    label.querySelector("input").addEventListener("input", (event) => {
      state.colors[index] = event.target.value;
      draw();
    });
    wrap.append(label);
  });
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
  ctx.fillStyle = "#fcf8fe";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  softCard(70, 88, 1460, 1028, 34);
  ctx.fillStyle = "#f7f3fb";
  ctx.fillRect(70, 88, 1460, 145);
  roundRect(125, 180, 680, 10, 6, "#e4dfff");

  drawText(state.name || "CHARACTER NAME", 125, 150, 58, 720, 900, "left", "#766fb0");
  drawText(metaText(), 130, 215, 24, 760, 700, "left", "#1c1b1f");
  drawText(state.credit || "@credit", 1380, 150, 22, 220, 700, "right", "#5f5b75");

  state.colors.forEach((color, index) => {
    ctx.beginPath();
    ctx.arc(1290 + index * 48, 205, 18, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  Object.entries(slots).forEach(([id, slot]) => drawImageSlot(id, slot));

  softCard(730, 600, 300, 320, 18);
  softCard(1060, 600, 300, 320, 18);
  drawText("헤어 & 얼굴", 760, 650, 29, 240, 900, "left", "#1c1b1f");
  drawWrapped(state.summary || "외관 특징을 입력하세요.", 760, 705, 24, 230, 34, 700);
  drawText("의상 & 기타", 1090, 650, 29, 240, 900, "left", "#1c1b1f");
  drawWrapped(clampText(state.memo || "의상과 소품 설명을 입력하세요.", 62), 1090, 705, 22, 230, 31, 700);

  roundRect(755, 1012, 430, 12, 6, "#c7bfff");
  drawText(hashKeywords(state.keywords), 125, 1056, 26, 650, 800, "left", "#787581");
}

function drawImageSlot(id, slot) {
  ctx.save();
  pathRoundRect(slot.x, slot.y, slot.w, slot.h, slot.r);
  ctx.clip();
  ctx.fillStyle = "#fbfafc";
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

  const image = state.images[id];
  if (image?.img) {
    drawFittedImage(image.img, slot, image);
  } else {
    drawText(slot.label, slot.x + slot.w / 2, slot.y + slot.h / 2 - 12, 24, slot.w - 36, 800, "center", "#1c1b1f");
    drawText("이미지 업로드", slot.x + slot.w / 2, slot.y + slot.h / 2 + 24, 17, slot.w - 36, 600, "center", "#787581");
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
  return `Age: ${state.age || "--"}    Height: ${state.height || "--"}    Gender: ${state.gender || "--"}`;
}

function hashKeywords(text) {
  const words = String(text).split(/,|\s/).map((word) => word.trim()).filter(Boolean).slice(0, 3);
  return words.length ? words.map((word) => `#${word}`).join("  ") : "#keyword  #keyword  #keyword";
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

function softCard(x, y, w, h, r) {
  ctx.save();
  ctx.shadowColor = "rgba(93, 86, 150, 0.12)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(x, y, w, h, r, "#fff");
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

function drawWrapped(text, x, y, size, maxWidth, lineHeight, weight = 700) {
  ctx.save();
  ctx.font = `${weight} ${size}px "SUIT", "Malgun Gothic", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#1c1b1f";
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

init();
