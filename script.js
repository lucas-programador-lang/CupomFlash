/* =========================================================
   CupomFlash — script.js  (v2 · revisado + integrado ao novo CSS)
   - Carrega os cupons de data.json
   - Renderiza os cards, filtros por categoria e busca
   - Copiar código, favoritar, menu mobile, contador animado,
     header com sombra ao rolar, "voltar ao topo", loading e erros
   ========================================================= */

/* -----------------------------------------------------------
   0) CONFIGURAÇÃO
------------------------------------------------------------ */
const CONFIG = {
  diasParaUrgente: 2,          // a partir de quantos dias antes do vencimento o badge "urgente" aparece
  skeletonCount: 6,            // quantos cards fantasma mostrar enquanto data.json carrega
  favoritosKey: "cupomflash:favoritos",
  ultimaVisitaKey: "cupomflash:ultimaVisita",
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -----------------------------------------------------------
   1) ELEMENTOS (com verificação — nada quebra se algum não existir na página)
------------------------------------------------------------ */
const grid = document.getElementById("couponsGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");
const pills = document.querySelectorAll(".pill");
const searchInput = document.getElementById("searchInput");
const heroSearchForm = document.getElementById("heroSearch");
const toast = document.getElementById("toast");
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");
const navOverlay = document.getElementById("navOverlay"); // NOVO: opcional, combina com .nav-overlay do CSS
const backToTop = document.getElementById("backToTop");
const header = document.querySelector(".header"); // NOVO: pra alternar .is-scrolled
const whatsappBtn = document.getElementById("whatsappBtn");

let COUPONS = [];
let activeCategory = "todos";
let toastTimer = null;

/* -----------------------------------------------------------
   2) UTILITÁRIOS
------------------------------------------------------------ */

// Escapa texto vindo do data.json antes de jogar no innerHTML.
// Protege contra HTML/script acidental (ex: um "&" ou "<" digitado sem querer
// num nome de loja) mesmo sendo um arquivo que só você edita.
function escapeHTML(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Retorna a data de hoje como "AAAA-MM-DD" no fuso local.
// Comparar strings ISO (em vez de objetos Date) evita o bug clássico de
// cupom "expirar" umas horas antes do fim do dia por causa de fuso horário/UTC.
function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function diasAteExpirar(validUntil) {
  if (!validUntil) return Infinity;
  const hoje = new Date(hojeISO() + "T00:00:00");
  const alvo = new Date(validUntil + "T00:00:00");
  const diffMs = alvo - hoje;
  return Math.round(diffMs / 86400000);
}

function estaExpirado(validUntil) {
  if (!validUntil) return false; // sem data de validade = considerado sempre válido
  return validUntil < hojeISO(); // comparação de strings ISO, sem cilada de fuso horário
}

function badgeLabel(tag) {
  if (tag === "hot") return "🔥 Em alta";
  if (tag === "new") return "Novo";
  if (tag === "premium") return "⭐ Premium";
  return "";
}

/* NOVO: toast agora aceita um tipo, combinando com as variantes do CSS
   (.is-error / .is-warning / .is-info). Uso: showToast("texto", "error") */
function showToast(message, type = "success") {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("is-error", "is-warning", "is-info");
  if (type !== "success") toast.classList.add(`is-${type}`);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

/* NOVO: debounce simples pra não refiltrar a cada tecla digitada na busca */
function debounce(fn, delay = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* -----------------------------------------------------------
   3) FAVORITOS (NOVO — persistido no localStorage)
------------------------------------------------------------ */
function getFavoritos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CONFIG.favoritosKey)) || []);
  } catch {
    return new Set();
  }
}

function salvarFavoritos(set) {
  localStorage.setItem(CONFIG.favoritosKey, JSON.stringify([...set]));
}

function idDoCupom(c) {
  return `${c.store}::${c.code}`;
}

function toggleFavorito(id) {
  const favoritos = getFavoritos();
  const jaFavoritado = favoritos.has(id);
  jaFavoritado ? favoritos.delete(id) : favoritos.add(id);
  salvarFavoritos(favoritos);
  return !jaFavoritado;
}

/* -----------------------------------------------------------
   4) CARREGAR DADOS DO JSON
------------------------------------------------------------ */
/* -----------------------------------------------------------
   4) CARREGAR DADOS DO JSON (Com Auto-Limpeza)
------------------------------------------------------------ */
async function carregarCupons() {
  renderSkeletons(CONFIG.skeletonCount);

  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const dados = await response.json();

    if (!Array.isArray(dados)) throw new Error("data.json não é uma lista de cupons");

    // 1. O SEGREDO MÁGICO: Filtra os dados originais e guarda APENAS os cupons que NÃO estão expirados.
    // Assim, cupons vencidos sequer existem para o restante do site.
    COUPONS = dados.filter(c => !estaExpirado(c.validUntil));

    // 2. LIMPEZA INTELIGENTE DE FAVORITOS:
    // Pega os favoritos salvos no navegador da pessoa.
    const favoritos = getFavoritos();
    let favoritosMudou = false;
    // Cria uma lista rápida só com os IDs dos cupons que ainda estão vivos hoje
    const idsAtivos = new Set(COUPONS.map(c => idDoCupom(c)));

    // Varre os favoritos. Se a pessoa favoritou algo que expirou, o site deleta sozinho!
    for (const fav of favoritos) {
      if (!idsAtivos.has(fav)) {
        favoritos.delete(fav);
        favoritosMudou = true;
      }
    }
    // Salva a lista de favoritos limpa de volta no navegador
    if (favoritosMudou) salvarFavoritos(favoritos);

    atualizarEstatisticas(COUPONS);
    applyFilters(); 
  } catch (error) {
    console.error("Erro ao carregar o arquivo data.json:", error);
    renderErro();
    showToast("Não foi possível carregar os cupons agora.", "error");
  }
}

function atualizarEstatisticas(lista) {
  const ativos = lista.filter((c) => !estaExpirado(c.validUntil)).length;
  const lojas = new Set(lista.map((c) => c.store)).size;

  const elCoupons = document.getElementById("totalCoupons");
  const elStores = document.getElementById("totalStores");

  if (elCoupons) {
    elCoupons.dataset.count = ativos;
    animateCount(elCoupons);
  }
  if (elStores) {
    elStores.dataset.count = lojas;
    animateCount(elStores);
  }
}

/* -----------------------------------------------------------
   5) RENDERIZAÇÃO DOS CARDS
------------------------------------------------------------ */

// NOVO: cards fantasma (skeleton) exibidos enquanto data.json ainda não chegou,
// usando a classe .skeleton já preparada no CSS.
function renderSkeletons(qtd) {
  if (!grid) return;
  if (emptyState) emptyState.hidden = true;
  if (resultCount) resultCount.textContent = "Carregando cupons...";

  grid.innerHTML = Array.from({ length: qtd })
    .map(
      () => `
      <article class="coupon-card" aria-hidden="true">
        <div class="coupon-top">
          <div class="coupon-store-row">
            <div class="coupon-store skeleton" style="width:120px;height:20px;border-radius:6px;"></div>
          </div>
          <div class="skeleton" style="width:100px;height:32px;border-radius:8px;"></div>
          <div class="skeleton" style="width:80%;height:14px;border-radius:6px;"></div>
        </div>
        <div class="coupon-seam"></div>
        <div class="coupon-bottom">
          <div class="skeleton" style="flex:1;height:44px;border-radius:10px;"></div>
        </div>
      </article>`
    )
    .join("");
}

// NOVO: estado de erro amigável (data.json ausente, corrompido, sem internet etc.)
function renderErro() {
  if (!grid) return;
  grid.innerHTML = "";
  if (resultCount) resultCount.textContent = "";
  if (emptyState) {
    emptyState.hidden = false;
    emptyState.textContent = "Não foi possível carregar os cupons. Tente recarregar a página.";
  }
}

function renderCoupons(list) {
  if (!grid) return;
  grid.innerHTML = "";

  if (emptyState) emptyState.hidden = list.length !== 0;

  if (resultCount) {
    resultCount.textContent = list.length
      ? `${list.length} cupom${list.length > 1 ? "s" : ""} encontrado${list.length > 1 ? "s" : ""}`
      : "Nenhum cupom encontrado";
  }

  const favoritos = getFavoritos();

 list.forEach((c, i) => {
    const expirado = estaExpirado(c.validUntil);
    const dias = diasAteExpirar(c.validUntil);
    const urgente = !expirado && dias <= CONFIG.diasParaUrgente;
    const favoritado = favoritos.has(idDoCupom(c));

    const card = document.createElement("article");
    card.className = [
      "coupon-card",
      expirado ? "expired" : "",
      c.featured && !expirado ? "is-featured" : "",
    ]
      .filter(Boolean)
      .join(" ");

    card.style.setProperty("--i", Math.min(i, 8));

    const badgeTag = urgente ? "urgent" : c.tag;
    const badgeText = urgente ? "⏳ Expira em breve" : badgeLabel(c.tag);

    // ESTE É O BLOCO MODIFICADO:
    card.innerHTML = `
      <button
        class="coupon-fav btn-icon${favoritado ? " is-active" : ""}"
        data-id="${escapeHTML(idDoCupom(c))}"
        aria-pressed="${favoritado}"
        aria-label="${favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}"
        title="Favoritar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${favoritado ? "currentColor" : "none"}">
          <path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.4 4.5 6.2 4.1c2.1-.2 3.9 1 5.8 3 1.9-2 3.7-3.2 5.8-3 3.8.4 5.7 4.3 4.2 7.8C19.5 16.4 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="coupon-top">
        <div class="coupon-store-row">
          <div class="coupon-store">
            <img 
             src="https://icons.duckduckgo.com/ip3/${c.domain || 'placeholder'}.ico" 
              alt="${c.store}" 
              style="width:20px;height:20px;margin-right:8px;border-radius:4px;vertical-align:middle;background:white;"
              onerror="this.style.display='none'"
            >
            ${escapeHTML(c.store)}
          </div>
          ${badgeTag && badgeText && !expirado ? `<span class="coupon-badge ${escapeHTML(badgeTag)}">${badgeText}</span>` : ""}
        </div>
        <div class="coupon-discount">${escapeHTML(c.discount)}</div>
        <p class="coupon-desc">${escapeHTML(c.desc)}</p>
        <span class="coupon-expiry${urgente ? " is-urgent" : ""}">${expirado ? "Expirado" : escapeHTML(c.expiry)}</span>
      </div>

      <div class="coupon-seam"></div>

      <div class="coupon-bottom">
        <div class="coupon-code">${escapeHTML(c.code)}</div>
        <button class="coupon-copy" ${expirado ? "disabled" : ""} data-code="${escapeHTML(c.code)}" aria-label="Copiar código" title="Copiar código">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="2"/></svg>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* -----------------------------------------------------------
   6) FILTROS + BUSCA
------------------------------------------------------------ */
function applyFilters() {
  const term = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filtered = COUPONS.filter((c) => {
    const matchesCategory =
      activeCategory === "todos" ||
      (activeCategory === "favoritos" ? getFavoritos().has(idDoCupom(c)) : c.category === activeCategory); // NOVO: suporta um pill opcional data-filter="favoritos"
    const matchesTerm =
      !term ||
      (c.store || "").toLowerCase().includes(term) ||
      (c.desc || "").toLowerCase().includes(term) ||
      (c.discount || "").toLowerCase().includes(term);
    return matchesCategory && matchesTerm;
  });

  renderCoupons(filtered);
}

const applyFiltersDebounced = debounce(applyFilters, 200);

pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    pills.forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    activeCategory = pill.dataset.filter;
    applyFilters();
  });
});

if (heroSearchForm) {
  heroSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("cupons")?.scrollIntoView({ behavior: "smooth" });
    applyFilters();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", applyFiltersDebounced);
}

/* -----------------------------------------------------------
   7) COPIAR CÓDIGO + FAVORITAR (delegação de evento — funciona
      nos cards renderizados dinamicamente)
------------------------------------------------------------ */
if (grid) {
  grid.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest(".coupon-copy");
    const favBtn = e.target.closest(".coupon-fav");

    if (copyBtn) {
      const code = copyBtn.dataset.code;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        // fallback para navegadores sem permissão de clipboard
        const temp = document.createElement("textarea");
        temp.value = code;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      copyBtn.classList.add("is-copied");
      showToast(`Código ${code} copiado!`);
      setTimeout(() => copyBtn.classList.remove("is-copied"), 1200);
      return;
    }

    if (favBtn) {
      const id = favBtn.dataset.id;
      const agoraFavoritado = toggleFavorito(id);
      favBtn.classList.toggle("is-active", agoraFavoritado);
      favBtn.setAttribute("aria-pressed", String(agoraFavoritado));
      favBtn.setAttribute("aria-label", agoraFavoritado ? "Remover dos favoritos" : "Adicionar aos favoritos");
      favBtn.querySelector("svg").setAttribute("fill", agoraFavoritado ? "currentColor" : "none");
      showToast(agoraFavoritado ? "Adicionado aos favoritos" : "Removido dos favoritos", "info");
      if (activeCategory === "favoritos" && !agoraFavoritado) applyFilters(); // some da lista se estava filtrando só favoritos
    }
  });
}

/* -----------------------------------------------------------
   8) MENU MOBILE
------------------------------------------------------------ */
function fecharMenu() {
  nav.classList.remove("is-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navOverlay?.classList.remove("is-visible");
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navOverlay?.classList.toggle("is-visible", isOpen); // NOVO: acompanha o overlay opcional do CSS
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  navOverlay?.addEventListener("click", fecharMenu); // NOVO: clicar fora fecha o menu
}

/* -----------------------------------------------------------
   9) CONTADOR ANIMADO (hero stats)
------------------------------------------------------------ */
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (Number.isNaN(target)) return;

  if (prefersReducedMotion) { // NOVO: respeita quem prefere menos animação
    el.textContent = target;
    return;
  }

  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll(".stat-num").forEach((el) => statObserver.observe(el));

/* -----------------------------------------------------------
   10) HEADER AO ROLAR + BOTÃO VOLTAR AO TOPO
------------------------------------------------------------ */
function onScroll() {
  if (header) header.classList.toggle("is-scrolled", window.scrollY > 10); // NOVO
  if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 500);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll(); // aplica o estado correto se a página já carregar rolada (ex: voltar com o navegador)

if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}

/* -----------------------------------------------------------
   11) WHATSAPP — configuração do link do canal
------------------------------------------------------------ */
if (whatsappBtn) {
  // Link oficial configurado:
  whatsappBtn.href = "https://whatsapp.com/channel/0029VbCjUCy9xVJXCvOFQR1r";
  whatsappBtn.target = "_blank";
  whatsappBtn.rel = "noopener noreferrer";

  whatsappBtn.addEventListener("click", function (e) {
    // Agora que o link é real, esta checagem não disparará mais o aviso
    if (this.href.includes("SEU_LINK_AQUI")) {
      e.preventDefault();
      showToast("⚠️ Link do canal do WhatsApp ainda não foi configurado!", "warning");
    }
  });
}
/* -----------------------------------------------------------
   12) ANO NO RODAPÉ + AVISO DE NOVOS CUPONS + INÍCIO
------------------------------------------------------------ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function verificarNovoCupom() {
  const hoje = hojeISO();
  const ultimaVisita = localStorage.getItem(CONFIG.ultimaVisitaKey);
  if (ultimaVisita !== hoje) {
    showToast("🔥 Temos novos cupons disponíveis hoje!");
    localStorage.setItem(CONFIG.ultimaVisitaKey, hoje);
  }
}
verificarNovoCupom();

// Único ponto de carregamento: carregarCupons() já chama applyFilters()/renderCoupons()
// quando data.json termina de carregar, então não há chamada duplicada aqui.
carregarCupons();
