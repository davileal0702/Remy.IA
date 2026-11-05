const $ = s => document.querySelector(s);
const CHAVE = "remy.conversas";

let conversas = JSON.parse(localStorage.getItem(CHAVE) || "[]");
let atual = null;
let chips = [];
let modo = "receitas";
let enviando = false;

const entrada = $("#entrada"), chipsEl = $("#chips"), mensagensEl = $("#mensagens");

const salvar = () => localStorage.setItem(CHAVE, JSON.stringify(conversas));
const conversaAtual = () => conversas.find(c => c.id === atual);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = nome => `<svg class="ic"><use href="#i-${nome}"/></svg>`;
const nota = n =>Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Markdown mínimo: **negrito**, *itálico*, listas. O HTML é escapado antes.
const inline = s => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(\S.*?)\*/g, "<em>$1</em>");
function md(t) {
  let html = "", lista = null;
  for (const l of esc(t).split("\n")) {
    const m = l.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)/);
    if (m) {
      const tipo = m[1] ? "ol" : "ul";
      if (lista !== tipo) { if (lista) html += `</${lista}>`; html += `<${tipo}>`; lista = tipo; }
      html += `<li>${inline(m[2])}</li>`;
      continue;
    }
    if (lista) { html += `</${lista}>`; lista = null; }
    if (l.trim()) html += `<p>${inline(l)}</p>`;
  }
  return lista ? html + `</${lista}>` : html;
}

function renderReceita(r) {
  const falta = r.falta || [];
  return `<article class="card">
    <h4>${esc(r.nome)}</h4>
    <div class="tags">
      ${r.minutos != null ? `<span class="tag">${ic("relogio")}${esc(r.minutos)} min</span>` : ""}
      ${r.nota != null ? `<span class="tag">${ic("estrela")}${nota(r.nota)}</span>` : ""}
      ${r.calorias != null ? `<span class="tag">${ic("fogo")}${Math.round(r.calorias)} kcal</span>` : ""}
    </div>
    ${r.tem?.length ? `<p class="tem">${ic("talheres")}<span><b>Você tem:</b> ${r.tem.map(esc).join(", ")}</span></p>` : ""}
    ${falta.length ? `<p class="falta">${ic("cesta")}<span><b>Falta comprar:</b> ${falta.map(esc).join(", ")}</span></p>` : `<p class="ok">${ic("check")}<span>Tem tudo! Pode ir pro fogão.</span></p>`}
    ${r.passos?.length ? `<details><summary>${ic("livro")}Modo de preparo</summary><ol>${r.passos.map(p => `<li>${esc(p)}</li>`).join("")}</ol></details>` : ""}
  </article>`;
}

function renderCardapio(c) {
  const itens = c.itens || [];
  const total = c.total_calorias ?? itens.reduce((s, i) => s + (i.calorias || 0), 0);
  return `<div class="cardapio">
    <p class="sobretitulo">Chez Remy</p>
    <h5>Menu du jour</h5>
    <div class="ornamento"><i></i><b></b><i></i></div>
    ${itens.map(i => `<div class="prato"><small>${esc(i.refeicao)}</small>
      <div class="linha-prato"><strong>${esc(i.nome)}</strong><i class="pontilhado"></i><span>${Math.round(i.calorias || 0)} kcal</span></div></div>`).join("")}
    <div class="cardapio-total">TOTAL <b>${Math.round(total)}</b>${c.meta_calorias ? ` de ${esc(c.meta_calorias)}` : ""} kcal</div>
  </div>`;
}

function renderMensagem(m) {
  const el = document.createElement("div");
  el.className = "msg " + m.role;
  if (m.role === "user") {
    el.innerHTML = `<div class="bolha">
      ${m.ingredientes?.length ? `<div class="chips-msg">${m.ingredientes.map(i => `<span class="chip">${esc(i)}</span>`).join("")}</div>` : ""}
      ${m.texto ? `<p>${esc(m.texto)}</p>` : ""}
      ${m.modo === "cardapio" ? `<span class="tag" style="margin-top:8px">${ic("cloche")}Cardápio · ${esc(m.meta)} kcal</span>` : ""}
    </div>`;
  } else {
    const d = m.dados || {};
    el.innerHTML = `<span class="avatar">${Remy.svg(30)}</span>
      <div class="conteudo ${d.erro ? "erro" : ""}">
        ${md(d.texto || "")}
        ${d.cardapio ? renderCardapio(d.cardapio) : ""}
        ${d.receitas?.length ? `<div class="cards">${d.receitas.map(renderReceita).join("")}</div>` : ""}
      </div>`;
  }
  return el;
}

function renderChat() {
  const c = conversaAtual();
  mensagensEl.innerHTML = "";
  $("#welcome").hidden = !!c?.mensagens.length;
  $("#tituloConversa").textContent = c?.titulo || "Nova receita";
  c?.mensagens.forEach(m => mensagensEl.appendChild(renderMensagem(m)));
  if (c?.mensagens.length) rolar(); else $("#chat").scrollTop = 0;
}

function renderLista() {
  $("#listaConversas").innerHTML = conversas.map(c =>
    `<div class="conv ${c.id === atual ? "ativa" : ""}" data-id="${c.id}">
      ${ic(c.mensagens.some(m => m.modo === "cardapio") ? "cloche" : "frigideira")}<span>${esc(c.titulo)}</span><button class="apagar" data-apagar="${c.id}" aria-label="Apagar conversa">${ic("fechar")}</button>
    </div>`).join("") || `<p class="vazio">Nenhuma receita ainda.</p>`;
}

function renderChips() {
  chipsEl.innerHTML = chips.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-tirar="${i}" aria-label="Remover ${esc(c)}">${ic("fechar")}</button></span>`).join("");
}

function renderStatus() {
  const c = RemyAPI.config();
  $("#status").innerHTML = c.modo === "demo" ? `<i class="ponto demo"></i>Modo demonstração`
    : `<i class="ponto on"></i>${esc(c.modo === "gradio" ? c.space : c.url) || "Sem endereço"}`;
}

const rolar = () => { const chat = $("#chat"); chat.scrollTop = chat.scrollHeight; };
const ajustarAltura = () => { entrada.style.height = "auto"; entrada.style.height = Math.min(entrada.scrollHeight, 160) + "px"; };

function addChip(texto) {
  const t = texto.trim();
  if (t && !chips.some(c => c.toLowerCase() === t.toLowerCase())) chips.push(t);
}

function setModo(m) {
  modo = m;
  document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("ativo", b.dataset.modo === m));
  $("#meta").hidden = m !== "cardapio";
}

function abrir(id) {
  atual = id;
  renderLista(); renderChat();
  document.body.classList.remove("menu-aberto");
}

async function enviar() {
  if (enviando) return;
  let texto = entrada.value.trim();
  if (texto && !/\s/.test(texto)) { addChip(texto); texto = ""; } // palavra solta vira ingrediente
  if (!texto && !chips.length) return;

  let c = conversaAtual();
  if (!c) {
    c = { id: Date.now().toString(36), titulo: (chips.join(", ") || texto).slice(0, 40), mensagens: [] };
    conversas.unshift(c); atual = c.id;
  }
  const meta = +$("#metaCalorias").value || 2000;
  const msg = { role: "user", texto, ingredientes: [...chips], modo, meta };
  const historico = c.mensagens.slice(-10).map(m => ({
    role: m.role,
    content: m.role === "user" ? [m.ingredientes.join(", "), m.texto].filter(Boolean).join(". ") : (m.dados?.texto || ""),
  }));
  c.mensagens.push(msg);
  chips = []; entrada.value = ""; renderChips(); ajustarAltura();
  salvar(); renderLista(); renderChat();

  enviando = true; $("#btnEnviar").disabled = true;
  const pensando = document.createElement("div");
  pensando.className = "msg assistant";
  pensando.innerHTML = `<span class="avatar cozinhando">${Remy.svg(30)}</span><div class="conteudo"><span class="pensando">${ic("panela")}Remy está cozinhando<span class="pontinhos"></span></span></div>`;
  mensagensEl.appendChild(pensando); rolar();

  let dados;
  try {
    dados = await RemyAPI.responder({ mensagem: texto, ingredientes: msg.ingredientes, modo, meta_calorias: meta, historico });
  } catch (e) {
    dados = { erro: true, texto: `Ops! A cozinha pegou fogo: ${e.message || e}\n\nConfira a conexão em **Conectar modelo**.` };
  }
  c.mensagens.push({ role: "assistant", dados });
  salvar();
  enviando = false; $("#btnEnviar").disabled = false;
  if (atual === c.id) renderChat();
}

// Eventos
entrada.addEventListener("input", () => {
  if (entrada.value.includes(",")) {
    const partes = entrada.value.split(",");
    entrada.value = partes.pop().trimStart();
    partes.forEach(addChip); renderChips();
  }
  ajustarAltura();
});
entrada.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  else if (e.key === "Backspace" && !entrada.value && chips.length) { chips.pop(); renderChips(); }
});
$("#composer").addEventListener("submit", e => { e.preventDefault(); enviar(); });
chipsEl.addEventListener("click", e => {
  const i = e.target.closest("[data-tirar]")?.dataset.tirar;
  if (i != null) { chips.splice(+i, 1); renderChips(); entrada.focus(); }
});
document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setModo(b.dataset.modo)));
document.querySelectorAll(".sugestao").forEach(b => b.addEventListener("click", () => {
  chips = []; b.dataset.ing.split(",").forEach(addChip); renderChips();
  setModo(b.dataset.modo || "receitas");
  enviar();
}));
$("#btnNova").addEventListener("click", () => { abrir(null); entrada.focus(); });
$("#listaConversas").addEventListener("click", e => {
  const apagar = e.target.closest("[data-apagar]")?.dataset.apagar;
  if (apagar) {
    conversas = conversas.filter(c => c.id !== apagar); salvar();
    if (atual === apagar) atual = null;
    renderLista(); renderChat();
    return;
  }
  const conv = e.target.closest(".conv");
  if (conv) abrir(conv.dataset.id);
});
$("#btnMenu").addEventListener("click", () => document.body.classList.toggle("menu-aberto"));
$("#overlay").addEventListener("click", () => document.body.classList.remove("menu-aberto"));

// Configuração do modelo
const dlg = $("#dlgConfig");
const campos = { modo: "#cfgModo", space: "#cfgSpace", endpoint: "#cfgEndpoint", url: "#cfgUrl", modelo: "#cfgModelo", token: "#cfgToken" };
const mostrarCampos = () => dlg.querySelectorAll("[data-para]").forEach(d => { d.hidden = !d.dataset.para.split(" ").includes($("#cfgModo").value); });
$("#cfgModo").addEventListener("change", mostrarCampos);
$("#btnConfig").addEventListener("click", () => {
  const c = RemyAPI.config();
  Object.entries(campos).forEach(([k, s]) => { $(s).value = c[k]; });
  mostrarCampos(); dlg.showModal();
});
dlg.addEventListener("close", () => {
  if (dlg.returnValue !== "ok") return;
  RemyAPI.salvarConfig(Object.fromEntries(Object.entries(campos).map(([k, s]) => [k, $(s).value.trim()])));
  renderStatus();
});

// Início
Remy.montar();
$("#favicon").href = "data:image/svg+xml," + encodeURIComponent(Remy.svg(64).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
renderLista(); renderChat(); renderStatus();
