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

function corpoReceita(r) {
  const falta = r.falta || [];
  return `<h4>${esc(r.nome)}</h4>
    <div class="tags">
      ${r.minutos != null ? `<span class="tag">${ic("relogio")}${esc(r.minutos)} min</span>` : ""}
      ${r.nota != null ? `<span class="tag">${ic("estrela")}${nota(r.nota)}</span>` : ""}
      ${r.calorias != null ? `<span class="tag">${ic("fogo")}${Math.round(r.calorias)} kcal</span>` : ""}
      ${r.brasileira ? `<span class="tag">${ic("chapeu")}Brasileira</span>` : ""}
    </div>
    ${r.tem?.length ? `<p class="tem">${ic("talheres")}<span><b>Você tem:</b> ${r.tem.map(esc).join(", ")}</span></p>` : ""}
    ${falta.length ? `<p class="falta">${ic("cesta")}<span><b>Falta comprar:</b> ${falta.map(esc).join(", ")}</span></p>` : `<p class="ok">${ic("check")}<span>Tem tudo! Pode ir pro fogão.</span></p>`}
    ${r.passos?.length ? `<details><summary>${ic("livro")}Modo de preparo</summary><ol>${r.passos.map(p => `<li>${esc(p)}</li>`).join("")}</ol></details>` : ""}`;
}

// Receitas do mesmo tipo (ex.: 3 tipos de arroz) chegam num card só, com "variantes" para o usuário escolher.
function renderReceita(r) {
  const vs = r.variantes || [];
  if (vs.length < 2) {
    return `<article class="card">${r.refeicao ? `<span class="refeicao">${esc(r.refeicao)}</span>` : ""}${corpoReceita(r)}</article>`;
  }
  return `<article class="card grupo">
    <span class="refeicao">${esc(r.grupo || "Receita")} · ${vs.length} variantes</span>
    <div class="variantes" role="tablist">${vs.map((v, i) =>
      `<button type="button" class="variante-btn ${i ? "" : "ativo"}" data-variante="${i}" title="${esc(v.nome)}">${esc(v.rotulo || v.nome)}</button>`).join("")}</div>
    ${vs.map((v, i) => `<div class="variante" data-v="${i}" ${i ? "hidden" : ""}>${corpoReceita(v)}</div>`).join("")}
  </article>`;
}

// Cardápio vira cards: cada item do cardápio usa a receita completa (se veio) e ganha o rótulo da refeição.
function cardsDoCardapio(d) {
  const receitas = d.receitas || [];
  return (d.cardapio.itens || []).map(i => ({
    ...(receitas.find(r => r.nome === i.nome) || { nome: i.nome, calorias: i.calorias }),
    refeicao: i.refeicao,
  }));
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
        ${(() => { const cards = d.cardapio ? cardsDoCardapio(d) : d.receitas || [];
          return cards.length ? `<div class="cards">${cards.map(renderReceita).join("")}</div>` : ""; })()}
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
  const endereco = c.modo === "openai" ? c.url : c.space;
  $("#status").innerHTML = endereco ? `<i class="ponto on"></i>${esc(endereco)}` : `<i class="ponto demo"></i>Modelo não conectado`;
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
$("#sugestoes").addEventListener("click", e => {
  const b = e.target.closest(".sugestao");
  if (!b) return;
  if (b.dataset.acao === "geladeira") return abrirGeladeira();
  chips = []; b.dataset.ing.split(",").forEach(addChip); renderChips();
  entrada.value = b.dataset.msg || ""; ajustarAltura();
  setModo(b.dataset.modo || "receitas");
  enviar();
});
mensagensEl.addEventListener("click", e => {
  const b = e.target.closest(".variante-btn");
  if (!b) return;
  const card = b.closest(".card");
  card.querySelectorAll(".variante-btn").forEach(x => x.classList.toggle("ativo", x === b));
  card.querySelectorAll(".variante").forEach(v => { v.hidden = v.dataset.v !== b.dataset.variante; });
});
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

// Minha geladeira: ingredientes que o usuário tem em casa, guardados neste navegador.
const CHAVE_GELADEIRA = "remy.geladeira", CHAVE_ONBOARDING = "remy.onboarding";
const COMUNS = ["ovo", "arroz", "feijão preto", "feijão carioca", "frango", "carne moída", "batata", "cebola", "alho", "tomate",
  "cenoura", "leite", "muçarela", "queijo minas", "parmesão", "manteiga", "farinha de trigo", "polvilho", "farinha de mandioca",
  "fubá", "açúcar", "macarrão", "banana", "limão", "pão", "presunto", "mandioca", "milho verde", "creme de leite",
  "leite condensado", "chocolate em pó", "fermento químico", "fermento biológico", "linguiça", "abobrinha"];
// Ingredientes com tipos que mudam a receita: o Remy pergunta qual é.
const TIPOS = {
  farinha: ["farinha de trigo", "farinha de mandioca", "polvilho", "fubá", "farinha de milho", "farinha de arroz", "farinha de aveia", "farinha de rosca"],
  fermento: ["fermento químico", "fermento biológico"],
  queijo: ["muçarela", "queijo prato", "parmesão", "queijo minas", "requeijão", "cream cheese", "ricota"],
  feijao: ["feijão preto", "feijão carioca", "feijão branco", "feijão vermelho", "feijão fradinho"],
  chocolate: ["chocolate ao leite", "chocolate meio amargo", "chocolate branco", "chocolate em pó", "gotas de chocolate"],
  milho: ["milho verde", "fubá", "amido de milho", "pipoca", "canjica"],
  pimenta: ["pimenta-do-reino", "pimenta dedo-de-moça", "pimenta calabresa", "pimentão"],
};
const chaveTipo = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/s$/, "");
let geladeira = JSON.parse(localStorage.getItem(CHAVE_GELADEIRA) || "[]");
let rascunho = [];
const dlgG = $("#dlgGeladeira"), entradaG = $("#entradaGeladeira");

const EXEMPLOS = [
  { titulo: "Jantar com o que sobrou", ing: "frango, arroz, tomate, cebola, alho", icone: "frigideira" },
  { titulo: "Café da manhã rápido", ing: "ovo, leite, farinha, queijo", icone: "xicara" },
  { titulo: "Massa em 20 minutos", ing: "macarrão, alho, queijo, salsinha", icone: "panela" },
  { titulo: "Cardápio do dia", ing: "carne, batata, cebola, ovo, banana, açúcar", icone: "cloche", modo: "cardapio" },
];

function renderSugestoes() {
  const minha = geladeira.join(", ");
  const lista = geladeira.length ? [
    { titulo: "O que dá para fazer?", ing: minha, icone: "frigideira" },
    { titulo: "Algo rápido", ing: minha, msg: "algo rápido", icone: "relogio" },
    { titulo: "Receitas brasileiras", ing: minha, msg: "receitas brasileiras", icone: "chapeu" },
    { titulo: "Cardápio do dia", ing: minha, icone: "cloche", modo: "cardapio" },
  ] : EXEMPLOS;
  $("#sugestoes").innerHTML = lista.map(x => `<button class="sugestao" data-ing="${esc(x.ing)}" data-msg="${esc(x.msg || "")}" data-modo="${x.modo || "receitas"}">
      ${ic(x.icone)}<span><b>${esc(x.titulo)}</b><small>${esc(x.ing)}</small></span></button>`).join("");
  const aviso = $("#geladeiraAviso");
  aviso.hidden = false;
  aviso.innerHTML = geladeira.length
    ? `<span>${ic("cesta")} <b>Sua geladeira:</b> ${geladeira.length} ingredientes</span><button type="button" data-acao="editar">Editar</button>`
    : `<span>Quer sugestões com o que <b>você</b> tem? Os cards abaixo são só exemplos.</span><button type="button" data-acao="editar">Montar minha geladeira</button>`;
  $("#usarGeladeira").hidden = !geladeira.length;
}

function renderGeladeira() {
  $("#chipsGeladeira").innerHTML = rascunho.map((c, i) => `<span class="chip ${TIPOS[chaveTipo(c)] ? "duvida" : ""}">${esc(c)}<button type="button" data-tirar="${i}" aria-label="Remover ${esc(c)}">${ic("fechar")}</button></span>`).join("");
  const duvidas = rascunho.map((c, i) => [c, i]).filter(([c]) => TIPOS[chaveTipo(c)]);
  $("#tiposGeladeira").innerHTML = duvidas.map(([c, i]) => `<div class="tipo-pergunta"><span>Qual <b>${esc(c)}</b>? O tipo muda a receita.</span>
    <div class="comuns">${TIPOS[chaveTipo(c)].map(o => `<button type="button" class="comum" data-trocar="${i}" data-por="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`).join("");
  const tem = new Set(rascunho.map(x => x.toLowerCase()));
  $("#comunsGeladeira").innerHTML = COMUNS.filter(c => !tem.has(c)).map(c => `<button type="button" class="comum" data-add="${esc(c)}">+ ${esc(c)}</button>`).join("");
}
function addGeladeira(t) {
  t = t.trim();
  if (t && !rascunho.some(x => x.toLowerCase() === t.toLowerCase())) rascunho.push(t);
}
function abrirGeladeira() {
  rascunho = [...geladeira]; entradaG.value = ""; renderGeladeira(); dlgG.showModal(); entradaG.focus();
}
entradaG.addEventListener("input", () => {
  if (!entradaG.value.includes(",")) return;
  const partes = entradaG.value.split(",");
  entradaG.value = partes.pop().trimStart();
  partes.forEach(addGeladeira); renderGeladeira();
});
entradaG.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addGeladeira(entradaG.value); entradaG.value = ""; renderGeladeira(); }
  else if (e.key === "Backspace" && !entradaG.value && rascunho.length) { rascunho.pop(); renderGeladeira(); }
});
dlgG.addEventListener("click", e => {
  const tirar = e.target.closest("[data-tirar]")?.dataset.tirar;
  if (tirar != null) { rascunho.splice(+tirar, 1); renderGeladeira(); entradaG.focus(); }
  const trocar = e.target.closest("[data-trocar]");
  if (trocar) {
    const por = trocar.dataset.por, i = +trocar.dataset.trocar;
    if (rascunho.some(x => x.toLowerCase() === por.toLowerCase())) rascunho.splice(i, 1); else rascunho[i] = por;
    renderGeladeira(); return;
  }
  const add = e.target.closest("[data-add]")?.dataset.add;
  if (add) { addGeladeira(add); renderGeladeira(); }
});
dlgG.addEventListener("close", () => {
  localStorage.setItem(CHAVE_ONBOARDING, dlgG.returnValue === "ok" ? "feito" : "depois");
  if (dlgG.returnValue !== "ok") return;
  addGeladeira(entradaG.value);
  geladeira = rascunho;
  localStorage.setItem(CHAVE_GELADEIRA, JSON.stringify(geladeira));
  renderSugestoes();
});
$("#btnGeladeira").addEventListener("click", () => { document.body.classList.remove("menu-aberto"); abrirGeladeira(); });
$("#geladeiraAviso").addEventListener("click", e => { if (e.target.closest("[data-acao]")) abrirGeladeira(); });
$("#usarGeladeira").addEventListener("click", () => { geladeira.forEach(addChip); renderChips(); entrada.focus(); });

// Início
Remy.montar();
renderSugestoes();
// Primeira visita: pergunta o que tem na geladeira (dá para pular).
if (!localStorage.getItem(CHAVE_ONBOARDING)) abrirGeladeira();
$("#favicon").href = "data:image/svg+xml," + encodeURIComponent(Remy.svg(64).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
renderLista(); renderChat(); renderStatus();
