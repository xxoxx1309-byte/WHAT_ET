const canvas = document.querySelector("#sheet");
const ctx = canvas.getContext("2d");
const picker = document.querySelector("#imagePicker");

const templates = {
  grid: { label: "파스텔 블루 자료표", width: 1600, height: 1200 },
  paper: { label: "종이 자료틀", width: 1024, height: 1024 },
};

const slotNames = {
  main: "메인 전신",
  outfit: "기본 의상",
  face: "얼굴",
  expression: "표정",
  shoes: "신발",
  detailA: "디테일 A",
  detailB: "디테일 B",
  chibi: "SD/미니",
};

const defaults = {
  template: "grid",
  name: "미야 밍",
  age: "중국",
  height: "156cm",
  gender: "여성",
  summary: "활발한 | 노력하는 | 성실한 | 속이 깊은 | 솔직한 정이 많은",
  features: "정별 + 흑발 브릿지 + 백안 + XX특이동공 | 숏컷 + 어깨 살짝 넘는 옆머리 | 파란 보석이 붙어있는 하얀 리본\n짧잔 B컵 | 내려간 눈썹 + 올라간 눈매 + 웃는 상",
  memo: "기본 의상은 왼쪽 상단의 의상 디자인을 따라주세요! 신발은 검은 워커입니다.\n의상 오마카세 + 정해져 있는 경우 테마컬러를 사용해주세요!!!",
  keywords: "바다, 파도, 리본",
  credit: "@식샤님",
  colors: ["#000000", "#315bd6", "#ffffff", "#17213b", "#fff5f0"],
  bgColor: "#315bd6",
  accentColor: "#315bd6",
  paperNoise: 0.18,
  images: {},
  stickers: [],
};

let state = structuredClone(defaults);
let selectedSlot = "main";
let pendingSlot = null;
let selectedSticker = null;
let drag = null;

function initImages() {
  Object.keys(slotNames).forEach((id) => {
    if (!state.images[id]) {
      state.images[id] = { src: "", zoom: 1, x: 0, y: 0, mode: "fill" };
    }
  });
}

function bindInputs() {
  ["template", "name", "age", "height", "gender", "summary", "features", "memo", "keywords", "credit"].forEach((id) => {
    const el = document.querySelector(`#${id}`);
    el.value = state[id];
    el.addEventListener("input", () => {
      state[id] = el.value;
      if (id === "template") resizeCanvas();
      draw();
    });
  });

  ["bgColor", "accentColor", "paperNoise"].forEach((id) => {
    const el = document.querySelector(`#${id}`);
    el.value = state[id];
    el.addEventListener("input", () => {
      state[id] = id === "paperNoise" ? Number(el.value) : el.value;
      draw();
    });
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab, .pane").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#${tab.dataset.tab}Pane`).classList.add("active");
    });
  });

  document.querySelector("#zoom").addEventListener("input", updateSelectedImage);
  document.querySelector("#offsetX").addEventListener("input", updateSelectedImage);
  document.querySelector("#offsetY").addEventListener("input", updateSelectedImage);
  document.querySelector("#fitImage").addEventListener("click", () => setImageMode("fit"));
  document.querySelector("#fillImage").addEventListener("click", () => setImageMode("fill"));
  document.querySelector("#clearImage").addEventListener("click", clearSelectedImage);
  document.querySelector("#exportPng").addEventListener("click", exportPng);
  document.querySelector("#addSticker").addEventListener("click", addSticker);
  document.querySelector("#deleteSticker").addEventListener("click", deleteSticker);
  document.querySelector("#clearStickers").addEventListener("click", clearStickers);
  document.querySelector("#saveSlot").addEventListener("click", saveSlot);
  document.querySelector("#loadSlot").addEventListener("click", loadSlot);
  document.querySelector("#downloadJson").addEventListener("click", downloadJson);
  document.querySelector("#importJson").addEventListener("change", importJson);
  document.querySelector("#resetAll").addEventListener("click", resetAll);
  document.querySelector("#prevTemplate").addEventListener("click", toggleTemplate);
  document.querySelector("#nextTemplate").addEventListener("click", toggleTemplate);

  picker.addEventListener("change", importImage);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointerleave", pointerUp);
  canvas.addEventListener("dblclick", openClickedSlot);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Delete" && selectedSticker) deleteSticker();
  });
}

function renderSlots() {
  const list = document.querySelector("#slotList");
  list.innerHTML = "";
  Object.entries(slotNames).forEach(([id, label]) => {
    const card = document.createElement("div");
    card.className = `slot-card ${id === selectedSlot ? "active" : ""}`;
    card.innerHTML = `<div><div class="slot-title">${label}</div><div class="slot-meta">${state.images[id].src ? "이미지 있음" : "비어 있음"}</div></div>`;
    const button = document.createElement("button");
    button.textContent = "업로드";
    button.addEventListener("click", () => {
      selectSlot(id);
      requestImage(id);
    });
    card.addEventListener("click", () => selectSlot(id));
    card.append(button);
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

function resizeCanvas() {
  const template = templates[state.template];
  canvas.width = template.width;
  canvas.height = template.height;
  document.querySelector("#canvasLabel").textContent = template.label;
  document.querySelector("#template").value = state.template;
  draw();
}

function getLayout() {
  if (state.template === "paper") {
    return {
      chibi: { x: 74, y: 98, w: 230, h: 485, shape: "free" },
      main: { x: 436, y: 80, w: 494, h: 494, r: 96, shape: "roundRect" },
      outfit: { x: 436, y: 650, w: 494, h: 362, shape: "rect" },
    };
  }
  return {
    main: { x: 70, y: 115, w: 360, h: 800, shape: "free" },
    outfit: { x: 975, y: 70, w: 520, h: 250, r: 48, shape: "roundRect" },
    face: { x: 555, y: 350, w: 420, h: 420, r: 34, shape: "roundRect" },
    expression: { x: 1000, y: 350, w: 500, h: 420, r: 34, shape: "roundRect" },
    shoes: { x: 80, y: 930, w: 420, h: 190, r: 34, shape: "roundRect" },
    detailA: { x: 580, y: 930, w: 500, h: 210, r: 48, shape: "roundRect" },
    detailB: { x: 1135, y: 930, w: 360, h: 210, r: 48, shape: "roundRect" },
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.template === "paper") drawPaperTemplate();
  else drawGridTemplate();
  drawStickers();
}

function drawGridTemplate() {
  ctx.fillStyle = "#eaf4ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#9bbfec";
  ctx.fillRect(160, 86, 560, 76);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#6fa3e2";
  ctx.beginPath();
  ctx.moveTo(620, 240);
  ctx.lineTo(700, 240);
  ctx.lineTo(480, 460);
  ctx.lineTo(440, 460);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const layout = getLayout();
  if (state.images.main?.src) drawImageSlot("main", layout.main);
  else drawSimpleSilhouette();

  softCard(465, 115, 640, 95, 0);
  drawText(`이름 ${state.name || "NAME"}`, 785, 162, 36, 560, "900", "center", "#333");
  softCard(505, 230, 500, 70, 35);
  drawText(hashKeywords(state.keywords), 755, 265, 28, 430, "900", "center", "#9b9b9b");
  drawText(state.height || "172cm", 390, 260, 27, 130, "900", "left", "#111");
  drawText(state.credit || "@출처", 88, 885, 25, 220, "900", "left", "#111", true);

  softCard(545, 340, 430, 430, 34);
  softCard(1010, 340, 500, 430, 34);
  softCard(80, 930, 420, 190, 34);
  softCard(580, 930, 500, 210, 48);
  softCard(1135, 930, 360, 210, 48);
  ["outfit", "detailA", "detailB"].forEach((id) => drawImageSlot(id, layout[id]));

  drawText("캐릭터소개란", 765, 430, 34, 330, "900", "center", "#333");
  drawWrapped(`성별 : ${state.gender}\n나이 : ${state.age}\n키 : ${state.height}\n\nLIKE :\nHATE :\nHOBBY :`, 615, 535, 29, 320, 40, "800");
  drawText("EVOL :", 1045, 390, 34, 260, "900", "left", "#333");
  drawText("특징", 1045, 510, 42, 260, "900", "left", "#333");
  drawWrapped(state.features || "캐릭터의 특징을 적어주세요!", 1045, 585, 27, 390, 38, "800");

  ["SKIN", "EYE", "HAIR", "ETC", "ETC"].forEach((label, index) => {
    const x = 570 + index * 180;
    ctx.beginPath();
    ctx.arc(x, 850, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    drawText(label, x, 782, 31, 120, "900", "center", "#111", true);
  });
  drawText("스포이드로 컬러 설정하세요!", 750, 935, 24, 380, "800", "center", "#111");
  drawWrapped(state.memo, 96, 990, 30, 360, 42, "900", "center");
  drawWrapped("소지품\n캐릭터 심볼\n\n자유롭게\n사용하세요.", 1315, 1010, 34, 260, 48, "900", "center");
}

function drawPaperTemplate() {
  ctx.fillStyle = "#f7f7f3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPaperNoise();
  Object.entries(getLayout()).forEach(([id, rect]) => drawImageSlot(id, rect));
  state.colors.slice(0, 4).forEach((color, index) => {
    const x = 322;
    const y = 124 + index * 108;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 82, 84);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 82, 84);
  });
  drawText("캐릭터 한 줄 요약", 683, 627, 39, 470, "900", "center");
  drawWrapped(state.summary, 436, 682, 24, 494, 32, "900", "center");
  drawWrapped(hashLines(state.features), 80, 745, 34, 310, 42, "900");
  drawText(`동물화: ${state.keywords.split(",")[0] || ""}`, 82, 900, 24, 300, "800");
  drawText(`오브젝트: ${state.keywords.split(",").slice(1).join(",").trim()}`, 82, 935, 24, 300, "800");
  drawWrapped(state.memo, 462, 720, 25, 430, 38, "800", "center");
}

function drawGrid(x, y, w, h, step, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  for (let gx = x; gx <= x + w; gx += step) {
    line(gx, y, gx, y + h);
  }
  for (let gy = y; gy <= y + h; gy += step) {
    line(x, gy, x + w, gy);
  }
  ctx.restore();
}

function drawPaperNoise() {
  ctx.save();
  ctx.globalAlpha = Number(state.paperNoise);
  for (let i = 0; i < 120; i += 1) {
    ctx.strokeStyle = i % 2 ? "#d9d5ce" : "#ffffff";
    ctx.lineWidth = 1 + seeded(i, 9) * 2;
    const x = seeded(i, 17) * canvas.width;
    const y = seeded(i, 31) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 40, y - 20, x + 80, y + 30, x + 150, y - 10);
    ctx.stroke();
  }
  ctx.restore();
}

function seeded(a, b) {
  return Math.abs(Math.sin(a * 91.7 + b * 13.3) * 10000) % 1;
}

function drawImageSlot(id, rect) {
  ctx.save();
  clipShape(rect);
  if (rect.shape === "free") {
    ctx.globalAlpha = 0;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = state.template === "paper" ? "#000" : "#fff";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  const data = state.images[id];
  if (data?.img) drawFittedImage(data.img, rect, data);
  else drawEmptySlot(rect, slotNames[id]);
  ctx.restore();

  if (selectedSlot === id) {
    ctx.save();
    ctx.strokeStyle = "#2f73c9";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.75;
    strokeShape(rect);
    ctx.restore();
  }

  if (rect.label) drawText(rect.label, rect.x + rect.w - 10, rect.y + rect.h - 18, 28, 180, "900", "right", "#fff", true);
}

function drawEmptySlot(rect, label) {
  ctx.fillStyle = state.template === "paper" ? "#050505" : "#f9faf8";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = state.template === "paper" ? "#fff" : "#404653";
  drawText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 12, 25, rect.w - 42, "900", "center");
  if (state.template !== "paper") {
    drawText("이미지 업로드", rect.x + rect.w / 2, rect.y + rect.h / 2 + 24, 18, rect.w - 42, "700", "center", "#8a92a3");
  }
}

function drawFittedImage(img, rect, data) {
  const base = data.mode === "fit"
    ? Math.min(rect.w / img.width, rect.h / img.height)
    : Math.max(rect.w / img.width, rect.h / img.height);
  const scale = base * data.zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = rect.x + rect.w / 2 - w / 2 + data.x;
  const y = rect.y + rect.h / 2 - h / 2 + data.y;
  ctx.drawImage(img, x, y, w, h);
}

function drawStickers() {
  state.stickers.forEach((sticker) => {
    drawText(sticker.text, sticker.x, sticker.y, sticker.size, 420, "900", "center", sticker.color || "#111", true);
    if (selectedSticker === sticker.id) {
      ctx.strokeStyle = "#ffcf33";
      ctx.lineWidth = 3;
      ctx.strokeRect(sticker.x - 90, sticker.y - sticker.size, 180, sticker.size + 12);
    }
  });
}

function clipShape(rect) {
  ctx.beginPath();
  if (rect.shape === "circle") ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
  else if (rect.shape === "roundRect") pathRoundRect(rect.x, rect.y, rect.w, rect.h, rect.r);
  else ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
}

function strokeShape(rect) {
  ctx.beginPath();
  if (rect.shape === "circle") ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
  else if (rect.shape === "roundRect") pathRoundRect(rect.x, rect.y, rect.w, rect.h, rect.r);
  else ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.stroke();
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  pathRoundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundStroke(x, y, w, h, r, fill, stroke, lineWidth = 3) {
  ctx.beginPath();
  pathRoundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function softCard(x, y, w, h, r) {
  ctx.save();
  ctx.shadowColor = "rgba(69, 104, 150, 0.12)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(x, y, w, h, r, "#fff");
  ctx.restore();
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

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawText(text, x, y, size, maxWidth, weight = "700", align = "left", color = "#111", outline = false) {
  ctx.save();
  ctx.font = `${weight} ${size}px "Malgun Gothic", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (outline) {
    ctx.lineWidth = Math.max(4, size / 6);
    ctx.strokeStyle = color === "#fff" ? "#111" : "#fff";
    ctx.strokeText(text, x, y, maxWidth);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function drawWrapped(text, x, y, size, maxWidth, lineHeight, weight = "700", align = "left") {
  ctx.save();
  ctx.font = `${weight} ${size}px "Malgun Gothic", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#111";
  const baseX = align === "center" ? x + maxWidth / 2 : align === "right" ? x + maxWidth : x;
  String(text).split("\n").forEach((paragraph) => {
    let lineText = "";
    paragraph.split(" ").flatMap((word) => splitLongWord(word, maxWidth)).forEach((word) => {
      const trial = lineText ? `${lineText} ${word}` : word;
      if (ctx.measureText(trial).width > maxWidth && lineText) {
        ctx.fillText(lineText, baseX, y, maxWidth);
        y += lineHeight;
        lineText = word;
      } else {
        lineText = trial;
      }
    });
    ctx.fillText(lineText, baseX, y, maxWidth);
    y += lineHeight;
  });
  ctx.restore();
}

function splitLongWord(word, maxWidth) {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const pieces = [];
  let current = "";
  [...word].forEach((char) => {
    if (ctx.measureText(current + char).width > maxWidth && current) {
      pieces.push(current);
      current = char;
    } else {
      current += char;
    }
  });
  if (current) pieces.push(current);
  return pieces;
}

function hashLines(text) {
  return String(text).split(/\n|\|/).map((line) => line.trim()).filter(Boolean).slice(0, 3).map((line) => `#${line}`).join("\n");
}

function hashKeywords(text) {
  const words = String(text).split(/,|\s/).map((word) => word.trim()).filter(Boolean).slice(0, 3);
  return words.length ? words.map((word) => `#${word}`).join("  ") : "#키워드  #키워드  #키워드";
}

function drawSimpleSilhouette() {
  if (state.images.main?.src) return;
  ctx.save();
  ctx.fillStyle = "#5a7fb8";
  ctx.beginPath();
  ctx.ellipse(235, 205, 70, 88, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(185, 285, 95, 265);
  ctx.beginPath();
  ctx.moveTo(185, 285);
  ctx.lineTo(125, 520);
  ctx.quadraticCurveTo(110, 610, 160, 650);
  ctx.lineTo(238, 470);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(280, 285);
  ctx.lineTo(350, 630);
  ctx.quadraticCurveTo(330, 665, 300, 650);
  ctx.lineTo(235, 470);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(178, 548);
  ctx.lineTo(230, 548);
  ctx.lineTo(215, 900);
  ctx.quadraticCurveTo(190, 932, 170, 895);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(245, 548);
  ctx.lineTo(295, 548);
  ctx.lineTo(345, 900);
  ctx.quadraticCurveTo(322, 940, 292, 905);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitSlot(point) {
  return Object.entries(getLayout()).find(([, rect]) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h)?.[0];
}

function hitSticker(point) {
  return [...state.stickers].reverse().find((sticker) => Math.abs(point.x - sticker.x) < 120 && Math.abs(point.y - sticker.y) < sticker.size);
}

function pointerDown(event) {
  const point = canvasPoint(event);
  const sticker = hitSticker(point);
  if (sticker) {
    selectedSticker = sticker.id;
    drag = { type: "sticker", start: point, id: sticker.id, x: sticker.x, y: sticker.y };
    draw();
    return;
  }
  const slot = hitSlot(point);
  if (slot) {
    selectSlot(slot);
    drag = { type: "image", start: point, id: slot, x: state.images[slot].x, y: state.images[slot].y };
  } else {
    selectedSticker = null;
    draw();
  }
}

function pointerMove(event) {
  if (!drag) return;
  const point = canvasPoint(event);
  const dx = point.x - drag.start.x;
  const dy = point.y - drag.start.y;
  if (drag.type === "image" && state.images[drag.id].src) {
    state.images[drag.id].x = Math.round(drag.x + dx);
    state.images[drag.id].y = Math.round(drag.y + dy);
    syncAdjust();
  }
  if (drag.type === "sticker") {
    const sticker = state.stickers.find((item) => item.id === drag.id);
    sticker.x = Math.round(drag.x + dx);
    sticker.y = Math.round(drag.y + dy);
  }
  draw();
}

function pointerUp() {
  drag = null;
}

function openClickedSlot(event) {
  const slot = hitSlot(canvasPoint(event));
  if (slot) requestImage(slot);
}

function selectSlot(id) {
  selectedSlot = id;
  selectedSticker = null;
  syncAdjust();
  renderSlots();
  draw();
}

function syncAdjust() {
  const data = state.images[selectedSlot];
  document.querySelector("#selectedName").textContent = `선택된 이미지: ${slotNames[selectedSlot]}`;
  document.querySelector("#zoom").value = data.zoom;
  document.querySelector("#offsetX").value = data.x;
  document.querySelector("#offsetY").value = data.y;
}

function updateSelectedImage() {
  const data = state.images[selectedSlot];
  data.zoom = Number(document.querySelector("#zoom").value);
  data.x = Number(document.querySelector("#offsetX").value);
  data.y = Number(document.querySelector("#offsetY").value);
  draw();
}

function setImageMode(mode) {
  state.images[selectedSlot].mode = mode;
  state.images[selectedSlot].zoom = 1;
  state.images[selectedSlot].x = 0;
  state.images[selectedSlot].y = 0;
  syncAdjust();
  draw();
}

function clearSelectedImage() {
  state.images[selectedSlot] = { src: "", zoom: 1, x: 0, y: 0, mode: "fill" };
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
    const image = new Image();
    image.onload = () => {
      state.images[pendingSlot] = { src: reader.result, img: image, zoom: 1, x: 0, y: 0, mode: "fill" };
      selectSlot(pendingSlot);
      pendingSlot = null;
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function addSticker() {
  state.stickers.push({
    id: crypto.randomUUID(),
    text: document.querySelector("#stickerText").value || "TEXT",
    size: Number(document.querySelector("#stickerSize").value) || 34,
    x: canvas.width * 0.75,
    y: canvas.height * 0.35,
    color: "#111111",
  });
  selectedSticker = state.stickers.at(-1).id;
  draw();
}

function deleteSticker() {
  if (!selectedSticker) return;
  state.stickers = state.stickers.filter((item) => item.id !== selectedSticker);
  selectedSticker = null;
  draw();
}

function clearStickers() {
  state.stickers = [];
  selectedSticker = null;
  draw();
}

function exportPng() {
  const previousSlot = selectedSlot;
  selectedSticker = null;
  selectedSlot = null;
  draw();
  const link = document.createElement("a");
  link.download = `${state.name || "외관표"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  selectedSlot = previousSlot;
  draw();
}

function cleanState() {
  const copy = structuredClone(state);
  Object.values(copy.images).forEach((image) => delete image.img);
  return copy;
}

function saveSlot() {
  localStorage.setItem("oc-sheet-maker-slot", JSON.stringify(cleanState()));
  alert("슬롯에 저장했어요.");
}

function loadSlot() {
  const raw = localStorage.getItem("oc-sheet-maker-slot");
  if (!raw) {
    alert("저장된 슬롯이 없어요.");
    return;
  }
  applyLoaded(JSON.parse(raw));
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(cleanState(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.name || "외관표"}-작업파일.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => applyLoaded(JSON.parse(reader.result));
  reader.readAsText(file);
}

async function applyLoaded(next) {
  state = { ...structuredClone(defaults), ...next };
  initImages();
  await hydrateImages();
  bindInputValues();
  renderSwatches();
  renderSlots();
  resizeCanvas();
  syncAdjust();
}

function bindInputValues() {
  ["template", "name", "age", "height", "gender", "summary", "features", "memo", "keywords", "credit", "bgColor", "accentColor", "paperNoise"].forEach((id) => {
    document.querySelector(`#${id}`).value = state[id];
  });
}

function hydrateImages() {
  const jobs = Object.values(state.images).map((image) => new Promise((resolve) => {
    if (!image.src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => {
      image.img = img;
      resolve();
    };
    img.onerror = resolve;
    img.src = image.src;
  }));
  return Promise.all(jobs);
}

function resetAll() {
  if (!confirm("현재 작업을 초기화할까요?")) return;
  state = structuredClone(defaults);
  init();
}

function toggleTemplate() {
  state.template = state.template === "grid" ? "paper" : "grid";
  bindInputValues();
  resizeCanvas();
}

function init() {
  initImages();
  bindInputValues();
  renderSwatches();
  renderSlots();
  resizeCanvas();
  syncAdjust();
}

bindInputs();
init();
