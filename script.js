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
const COUPONS = [
  {
    store: "Nova Trend",
    icon: "👗",
    category: "moda",
    discount: "25% OFF",
    desc: "Em toda a coleção de inverno, sem valor mínimo.",
    code: "TREND25",
    expiry: "Válido até 15/07",
    tag: "hot"
  },
  {
    store: "TechPoint",
    icon: "📱",
    category: "eletronicos",
    discount: "R$150 OFF",
    desc: "Em smartphones acima de R$1.500.",
    code: "TECH150",
    expiry: "Válido até 20/07",
    tag: "new"
  },
  {
    store: "Belle Cosméticos",
    icon: "💄",
    category: "beleza",
    discount: "30% OFF",
    desc: "Perfumaria importada, todas as marcas.",
    code: "BELLE30",
    expiry: "Válido até 12/07",
    tag: "hot"
  },
  {
    store: "Casa Aconchego",
    icon: "🏠",
    category: "casa",
    discount: "20% OFF",
    desc: "Móveis e decoração, frete grátis acima de R$300.",
    code: "CASA20",
    expiry: "Válido até 18/07",
    tag: null
  },
  {
    store: "Sabor Express",
    icon: "🍔",
    category: "alimentacao",
    discount: "R$15 OFF",
    desc: "No primeiro pedido pelo app, todas as lojas.",
    code: "SABOR15",
    expiry: "Válido até 09/07",
    tag: "new"
  },
  {
    store: "VoeMais",
    icon: "✈️",
    category: "viagem",
    discount: "12% OFF",
    desc: "Passagens nacionais compradas via app.",
    code: "VOE12",
    expiry: "Válido até 30/07",
    tag: null
  },
  {
    store: "Urban Fit",
    icon: "👟",
    category: "moda",
    discount: "R$40 OFF",
    desc: "Tênis esportivos, a partir de R$200.",
    code: "URBAN40",
    expiry: "Válido até 14/07",
    tag: null
  },
  {
    store: "GigaStore",
    icon: "💻",
    category: "eletronicos",
    discount: "10% OFF",
    desc: "Notebooks e periféricos gamer.",
    code: "GIGA10",
    expiry: "Válido até 22/07",
    tag: "hot"
  },
  {
    store: "Vita Beauty",
    icon: "✨",
    category: "beleza",
    discount: "Leve 3 pague 2",
    desc: "Em toda linha de skincare selecionada.",
    code: "VITA3X2",
    expiry: "Válido até 16/07",
    tag: null
  }
];

/* -----------------------------------------------------------
   2) RENDERIZAÇÃO DOS CARDS
------------------------------------------------------------ */
const grid = document.getElementById("couponsGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");

function badgeLabel(tag){
  if(tag === "hot") return "🔥 Em alta";
  if(tag === "new") return "Novo";
  return "";
}

function renderCoupons(list){
  grid.innerHTML = "";

  if(list.length === 0){
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
  }

  resultCount.textContent = list.length
    ? `${list.length} cupom${list.length > 1 ? "s" : ""} encontrado${list.length > 1 ? "s" : ""}`
    : "";

  list.forEach((c, i) => {
    const card = document.createElement("article");
    card.className = "coupon-card";
    card.style.animationDelay = `${Math.min(i, 8) * 0.05}s`;

    card.innerHTML = `
      <div class="coupon-top">
        <div class="coupon-store-row">
          <div class="coupon-store">
            <span class="coupon-store-icon">${c.icon}</span>
            ${c.store}
          </div>
          ${c.tag ? `<span class="coupon-badge ${c.tag}">${badgeLabel(c.tag)}</span>` : ""}
        </div>
        <div class="coupon-discount">${c.discount}</div>
        <p class="coupon-desc">${c.desc}</p>
        <span class="coupon-expiry">${c.expiry}</span>
      </div>

      <div class="coupon-seam"></div>

      <div class="coupon-bottom">
        <div class="coupon-code">${c.code}</div>
        <button class="coupon-copy" data-code="${c.code}" aria-label="Copiar código ${c.code}" title="Copiar código">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="2"/></svg>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

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
