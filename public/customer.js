import { mountLatticeLoader } from "/lattice-loader.js";

const root = document.querySelector("#customerRoot");
const toast = document.querySelector("#toast");
const customerId = (() => {
  const key = "oliveBetterCustomerId";
  let value = localStorage.getItem(key);
  if (!value) { value = `customer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem(key, value); }
  return value;
})();

const ICONS = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
};

function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
function money(value) { return `${Number(value || 0).toLocaleString("ko-KR")}원`; }

function iconButton(icon, label, cls = "icon-btn") {
  const button = node("button", cls);
  button.type = "button";
  button.innerHTML = ICONS[icon] || "";
  button.setAttribute("aria-label", label);
  button.title = label;
  return button;
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "요청에 실패했습니다.");
  return payload;
}

function notify(message) {
  toast.textContent = message; toast.classList.add("show"); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

async function record(type, sectionId, productId, button) {
  const original = button.innerHTML; button.disabled = true;
  try {
    await api("/api/reactions", { method: "POST", body: JSON.stringify({ type, sectionId, productId, customerId }) });
    notify(type === "click" ? "상세 관심을 기록했습니다." : type === "like" ? "좋아요를 기록했습니다." : "모의 구매를 기록했습니다.");
  } catch (error) { notify(error.message); }
  setTimeout(() => { button.innerHTML = original; button.disabled = false; }, 900);
}

function productCard(product, sectionId) {
  const card = node("article", "product-card");
  const image = node("div", "product-image"); image.append(node("span", "", product.brand?.slice(0, 6) || "BETTER"));
  if (product.imageUrl) { const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.src = product.imageUrl; img.onerror = () => img.remove(); image.append(img); }
  const body = node("div", "product-body"); body.append(node("div", "product-brand", product.brand), node("h3", "", product.name), node("p", "functional", product.functional), node("p", "product-meta", `${product.wellLabel} · ${money(product.price)} · ★ ${product.rating}`));
  const actions = node("div", "card-actions");
  for (const [type, icon] of [["click", "eye"], ["like", "heart"], ["purchase", "bag"]]) {
    const label = type === "click" ? "상세 보기" : type === "like" ? "좋아요" : "모의 구매";
    const button = iconButton(icon, label, `icon-btn${type === "purchase" ? " primary" : ""}`);
    button.addEventListener("click", () => record(type, sectionId, product.id, button));
    actions.append(button);
  }
  body.append(actions); card.append(image, body); return card;
}

function section(sectionData) {
  const wrap = node("section", `customer-section ${sectionData.type === "hero" ? "customer-hero" : ""}`); const inner = node("div", "inner");
  if (sectionData.type === "hero") {
    const hero = node("div", "hero-preview"); const copy = node("div"); copy.append(node("span", "step-label", "OLIVE BETTER CURATION"), node("h2", "", sectionData.title), node("p", "", sectionData.subtitle), node("span", "badge pass", sectionData.cta)); hero.append(copy, node("div", "hero-visual", "BETTER")); inner.append(hero);
  } else if (["product-grid", "product-carousel"].includes(sectionData.type)) {
    const header = node("div", "panel-header"); const title = node("div"); title.append(node("h2", "", sectionData.title), node("p", "", sectionData.reactionBoostApplied ? "고객 반응을 반영해 더 자세히 보여드려요." : "안전 기준과 요청 적합도를 확인한 상품입니다.")); header.append(title); inner.append(header);
    const grid = node("div", sectionData.type === "product-carousel" ? "product-rail" : "product-grid"); for (const product of sectionData.products || []) grid.append(productCard(product, sectionData.id)); inner.append(grid);
  } else if (sectionData.type === "signal-board") {
    const panel = node("div", "panel"); panel.append(node("h2", "", sectionData.title)); const list = node("ul", "compact-list"); for (const item of sectionData.signals || []) list.append(node("li", "", `${item.title} · ${item.source}`)); if (!list.children.length) list.append(node("li", "muted", "공개 근거를 준비 중입니다.")); panel.append(list); inner.append(panel);
  } else if (sectionData.type === "reason-list") {
    const panel = node("div", "panel"); panel.append(node("h2", "", sectionData.title)); const list = node("ul", "compact-list"); for (const item of sectionData.reasons || []) list.append(node("li", "", item)); panel.append(list); inner.append(panel);
  } else inner.append(node("div", "panel muted", "지원하지 않는 화면 영역을 건너뛰었습니다."));
  wrap.append(inner); return wrap;
}

async function load() {
  const slot = document.querySelector("#customerLoader");
  const loader = slot ? mountLatticeLoader(slot, { label: "불러오는 중", color: "#4ade80", glow: true }) : null;
  try {
    const payload = await api("/api/published");
    if (!payload.published) {
      const empty = node("section", "customer-empty"); empty.append(node("div", "brand-mark", "OB"), node("h1", "", "아직 발행된 기획전이 없습니다"), node("p", "", "운영자가 검토를 마치고 발행하면 이곳에 표시됩니다.")); root.replaceChildren(empty); return;
    }
    root.replaceChildren(...payload.published.sections.map(section));
  } finally {
    if (loader) { loader.setStatus("done"); setTimeout(() => loader.destroy(), 500); }
  }
}

load().catch((error) => { const empty = node("section", "customer-empty"); empty.append(node("h1", "", "기획전을 불러오지 못했습니다"), node("p", "", error.message)); root.replaceChildren(empty); });
