const SUPPORT_KEY = "what_et.supportConfig.v1";

const defaultSupport = {
  title: "WHAT_ET 후원",
  message: "WHAT_ET를 유용하게 쓰고 있다면 작은 응원이 제작과 유지보수에 큰 힘이 됩니다.",
  buttonLabel: "후원 링크 준비 중",
  link: "",
  contact: "관리 페이지에서 연락처나 후원 링크를 설정할 수 있습니다.",
  usage: "호스팅 유지, 기능 개선, 폰트와 레이아웃 테스트",
  notice: "후원은 선택 사항이며, 사이트 기능은 계속 무료로 사용할 수 있습니다.",
};

function initSupportPage() {
  const config = readSupportConfig();
  renderSupport(config);
  bindSupportForm(config);
}

function renderSupport(config) {
  document.querySelectorAll("[data-support='title']").forEach((node) => {
    node.textContent = config.title || defaultSupport.title;
  });
  document.querySelectorAll("[data-support='message']").forEach((node) => {
    node.textContent = config.message || defaultSupport.message;
  });
  document.querySelectorAll("[data-support='contact']").forEach((node) => {
    node.textContent = config.contact || defaultSupport.contact;
  });
  document.querySelectorAll("[data-support='usage']").forEach((node) => {
    node.textContent = config.usage || defaultSupport.usage;
  });
  document.querySelectorAll("[data-support='notice']").forEach((node) => {
    node.textContent = config.notice || defaultSupport.notice;
  });
  document.querySelectorAll("#supportActions").forEach((wrap) => {
    wrap.innerHTML = "";
    const label = config.buttonLabel || defaultSupport.buttonLabel;
    if (config.link) {
      const link = document.createElement("a");
      link.className = "support-button primary";
      link.href = config.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      wrap.append(link);
    } else {
      const button = document.createElement("span");
      button.className = "support-button";
      button.setAttribute("aria-disabled", "true");
      button.textContent = label;
      wrap.append(button);
    }
  });
}

function bindSupportForm(config) {
  const form = document.querySelector("#supportForm");
  if (!form) return;
  const fields = {
    title: document.querySelector("#supportTitle"),
    message: document.querySelector("#supportMessage"),
    buttonLabel: document.querySelector("#supportButtonLabel"),
    link: document.querySelector("#supportLink"),
    contact: document.querySelector("#supportContact"),
    usage: document.querySelector("#supportUsage"),
    notice: document.querySelector("#supportNotice"),
  };
  Object.entries(fields).forEach(([key, field]) => {
    field.value = config[key] || "";
    field.addEventListener("input", () => {
      const draft = collectForm(fields);
      renderSupport(draft);
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = collectForm(fields);
    localStorage.setItem(SUPPORT_KEY, JSON.stringify(next));
    renderSupport(next);
    setStatus("저장됨");
  });
  document.querySelector("#resetSupport").addEventListener("click", () => {
    localStorage.removeItem(SUPPORT_KEY);
    Object.entries(fields).forEach(([key, field]) => {
      field.value = defaultSupport[key] || "";
    });
    renderSupport(defaultSupport);
    setStatus("초기화됨");
  });
}

function collectForm(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
}

function readSupportConfig() {
  try {
    return { ...defaultSupport, ...JSON.parse(localStorage.getItem(SUPPORT_KEY) || "{}") };
  } catch (error) {
    return { ...defaultSupport };
  }
}

function setStatus(text) {
  const status = document.querySelector("#supportStatus");
  if (status) status.textContent = text;
}

initSupportPage();
