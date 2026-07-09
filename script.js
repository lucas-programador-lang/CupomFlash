/* =========================================================
   CupomFlash — script.js
   - Dados dos cupons (edite o array COUPONS para adicionar/remover)
   - Renderização dos cards, filtros por categoria e busca
   - Copiar código, menu mobile, contador animado, scroll to top
   ========================================================= */

/* -----------------------------------------------------------
   1) BANCO DE CUPONS
   Para postar um cupom novo, copie um objeto abaixo e edite os
   campos. "category" precisa bater com o data-filter dos pills:
   moda | eletronicos | beleza | casa | alimentacao | viagem
------------------------------------------------------------ */
/* =========================================================
   CupomFlash — script.js (Versão com carregamento via JSON)
   ========================================================= */

/* 1) CARREGAR DADOS DO JSON */
let COUPONS = [];

async function carregarCupons() {
  try {
    const response = await fetch('data.json');
    COUPONS = await response.json();
    renderCoupons(COUPONS);
  } catch (error) {
    console.error("Erro ao carregar o arquivo data.json:", error);
  }
}

// Inicia o carregamento
carregarCupons();

/* 2) RENDERIZAÇÃO DOS CARDS */
const grid = document.getElementById("couponsGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");

function badgeLabel(tag){
  if(tag === "hot") return "🔥 Em alta";
  if(tag === "new") return "Novo";
  return "";
}

function renderCoupons(list) {
  grid.innerHTML = "";
  const hoje = new Date(); // Data atual

  if (list.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
  }

  list.forEach((c, i) => {
    // Verifica expiração: se a data de hoje for maior que a validUntil
    const dataExpiracao = new Date(c.validUntil);
    const expirado = hoje > dataExpiracao;

    const card = document.createElement("article");
    // Adiciona a classe 'expired' se estiver vencido para você estilizar no CSS
    card.className = expirado ? "coupon-card expired" : "coupon-card";
    
    card.innerHTML = `
      <div class="coupon-top">
        <div class="coupon-store-row">
          <div class="coupon-store">
            <span class="coupon-store-icon">${c.icon}</span>
            ${c.store}
          </div>
          ${c.tag && !expirado ? `<span class="coupon-badge ${c.tag}">${badgeLabel(c.tag)}</span>` : ""}
        </div>
        <div class="coupon-discount">${c.discount}</div>
        <p class="coupon-desc">${c.desc}</p>
        <span class="coupon-expiry">${expirado ? "Cupom Expirado" : c.expiry}</span>
      </div>
      <div class="coupon-seam"></div>
      <div class="coupon-bottom">
        <div class="coupon-code">${c.code}</div>
        <button class="coupon-copy" ${expirado ? "disabled" : ""} data-code="${c.code}">
          ${expirado ? "Vencido" : "Copiar"}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* 3) FILTROS, BUSCA, COPIAR, MENU, CONTADOR E TOPO (O restante do código permanece igual) */
// [Mantenha aqui as seções 3, 4, 5, 6 e 7 do seu script original]

/* -----------------------------------------------------------
   3) FILTROS + BUSCA
------------------------------------------------------------ */
const pills = document.querySelectorAll(".pill");
const searchInput = document.getElementById("searchInput");
const heroSearchForm = document.getElementById("heroSearch");

let activeCategory = "todos";

function applyFilters(){
  const term = searchInput.value.trim().toLowerCase();

  const filtered = COUPONS.filter(c => {
    const matchesCategory = activeCategory === "todos" || c.category === activeCategory;
    const matchesTerm = !term ||
      c.store.toLowerCase().includes(term) ||
      c.desc.toLowerCase().includes(term) ||
      c.discount.toLowerCase().includes(term);
    return matchesCategory && matchesTerm;
  });

  renderCoupons(filtered);
}

pills.forEach(pill => {
  pill.addEventListener("click", () => {
    pills.forEach(p => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    activeCategory = pill.dataset.filter;
    applyFilters();
  });
});

heroSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("cupons").scrollIntoView({ behavior: "smooth" });
  applyFilters();
});

searchInput.addEventListener("input", applyFilters);

/* -----------------------------------------------------------
   4) COPIAR CÓDIGO (delegação de evento, funciona pros cards
      renderizados dinamicamente)
------------------------------------------------------------ */
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message){
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".coupon-copy");
  if(!btn) return;

  const code = btn.dataset.code;

  try{
    await navigator.clipboard.writeText(code);
  } catch(err){
    // fallback para navegadores sem permissão de clipboard
    const temp = document.createElement("textarea");
    temp.value = code;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  btn.classList.add("is-copied");
  showToast(`Código ${code} copiado!`);
  setTimeout(() => btn.classList.remove("is-copied"), 1200);
});

/* -----------------------------------------------------------
   5) MENU MOBILE
------------------------------------------------------------ */
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

/* -----------------------------------------------------------
   6) CONTADOR ANIMADO (hero stats)
------------------------------------------------------------ */
function animateCount(el){
  const target = parseInt(el.dataset.count, 10);
  const duration = 1200;
  const start = performance.now();

  function tick(now){
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if(progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });

document.querySelectorAll(".stat-num").forEach(el => statObserver.observe(el));

/* -----------------------------------------------------------
   7) BOTÃO VOLTAR AO TOPO
------------------------------------------------------------ */
const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  backToTop.classList.toggle("is-visible", window.scrollY > 500);
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* -----------------------------------------------------------
   8) WHATSAPP — troque o número/link do canal aqui
------------------------------------------------------------ */
document.getElementById("whatsappBtn").href = "https://whatsapp.com/channel/SEU_LINK_AQUI";

/* -----------------------------------------------------------
   9) ANO NO RODAPÉ + RENDER INICIAL
------------------------------------------------------------ */
document.getElementById("year").textContent = new Date().getFullYear();

renderCoupons(COUPONS);
