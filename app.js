const $ = s => document.querySelector(s);
const CHAVE = "remy.conversas";

let conversas = JSON.parse(localStorage.getItem(CHAVE) || "[]");
let atual = null;
let chips = [];
let modo = "receitas";
let enviando = false;

const entrada = $("#entrada"), chipsEl = $("#chips"), mensagensEl = $("#mensagens");

let salvar = () => localStorage.setItem(CHAVE, JSON.stringify(conversas));
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

const milhar = n => n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(n);

function corpoReceita(r) {
  const falta = r.falta || [];
  const ingredientes = r.ingredientes || [];          // [{secao, itens}] — receita completa
  const kcal = r.calorias != null ? `${r.calorias_aprox ? "≈ " : ""}${Math.round(r.calorias)} kcal${r.porcoes ? "/porção" : ""}` : "";
  const completa = ingredientes.length || r.passos?.length;
  return `<h4>${esc(r.nome)}</h4>
    <div class="tags">
      ${r.minutos != null ? `<span class="tag">${ic("relogio")}${esc(r.minutos)} min</span>` : ""}
      ${r.nota != null ? `<span class="tag" title="${r.avaliacoes || ""} avaliações">${ic("estrela")}${nota(r.nota)}${r.avaliacoes ? ` <small>(${milhar(r.avaliacoes)})</small>` : ""}</span>` : ""}
      ${r.porcoes ? `<span class="tag">${ic("talheres")}${esc(r.porcoes)} porções</span>` : ""}
      ${kcal ? `<span class="tag" title="Estimativa pela Tabela TACO">${ic("fogo")}${kcal}</span>` : ""}
    </div>
    ${r.tem?.length ? `<p class="tem">${ic("talheres")}<span><b>Você tem:</b> ${r.tem.map(esc).join(", ")}</span></p>` : ""}
    ${r.pouco?.length ? `<p class="pouco">${ic("cesta")}<span><b>Pode faltar:</b> ${r.pouco.map(esc).join("; ")}</span></p>` : ""}
    ${falta.length ? `<p class="falta">${ic("cesta")}<span><b>Falta comprar:</b> ${falta.map(esc).join("; ")}</span></p>` : `<p class="ok">${ic("check")}<span>Tem tudo! Pode ir pro fogão.</span></p>`}
    ${completa ? `<details><summary>${ic("livro")}${ingredientes.length ? "Receita completa" : "Modo de preparo"}</summary>
      ${ingredientes.map(g => `${g.secao ? `<h5>${esc(g.secao)}</h5>` : `<h5>Ingredientes</h5>`}<ul class="lista-ing">${g.itens.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`).join("")}
      ${r.passos?.length ? `<h5>Modo de preparo</h5><ol>${r.passos.map(p => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}
    </details>` : ""}
    <button type="button" class="btn-escolher ${conversaAtual()?.escolhida === r.nome ? "ativo" : ""}" data-escolher="${esc(r.nome)}">${ic("check")}${conversaAtual()?.escolhida === r.nome ? "Receita escolhida" : "Escolher esta receita"}</button>
    ${r.fonte ? `<p class="fonte">Receita: ${esc(r.fonte)}${r.calorias_aprox && r.calorias != null ? " · calorias estimadas (TACO)" : ""}</p>` : ""}`;
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

function renderMensagem(m, i) {
  const el = document.createElement("div");
  el.className = "msg " + m.role;
  if (m.role === "user") {
    const TIPO_NOME = { cafe: "Café da manhã", principal: "Prato principal", sobremesa: "Sobremesa" };
    el.innerHTML = `<div class="bolha">
      ${m.tipo ? `<span class="tag-tipo">${TIPO_NOME[m.tipo] || esc(m.tipo)}</span>` : ""}
      ${m.faltar && m.faltar !== "2" ? `<span class="tag-tipo">${{ "0": "Só com o que tenho", "5": "Pode faltar até 5", livre: "Pode faltar o que for" }[m.faltar] || ""}</span>` : ""}
      ${m.ingredientes?.length ? `<div class="chips-msg">${m.ingredientes.map(i => `<span class="chip">${esc(i)}</span>`).join("")}</div>` : ""}
      ${m.texto ? `<p>${esc(m.texto)}</p>` : ""}
      ${m.modo === "cardapio" ? `<span class="tag" style="margin-top:8px">${ic("cloche")}Cardápio · ${esc(m.meta)} kcal</span>` : ""}
    </div>`;
  } else if (m.dados?.receitaEscolhida) {
    el.innerHTML = `<span class="avatar">${Remy.svg(30)}</span><div class="conteudo">${renderEscolhida(m, i)}</div>`;
  } else {
    const d = m.dados || {};
    el.innerHTML = `<span class="avatar">${Remy.svg(30)}</span>
      <div class="conteudo ${d.erro ? "erro" : ""}">
        ${md(d.texto || "")}
        ${(() => { const cards = d.cardapio ? cardsDoCardapio(d) : d.receitas || [];
          return cards.length ? `<div class="cards">${cards.map(renderReceita).join("")}</div>${avisoRestricao(m)}` : ""; })()}
      </div>`;
  }
  return el;
}

function renderChat() {
  const c = conversaAtual();
  mensagensEl.innerHTML = "";
  $("#welcome").hidden = !!c?.mensagens.length;
  $("#tituloConversa").textContent = c?.titulo || "Nova receita";
  c?.mensagens.forEach((m, i) => mensagensEl.appendChild(renderMensagem(m, i)));
  // Depois da última resposta com receitas, um botão para pedir mais (o Remy pula as que já mostrou)
  const ultima = c?.mensagens[c.mensagens.length - 1];
  const ultimaBusca = [...(c?.mensagens || [])].reverse().find(m => m.role === "assistant" && !m.dados?.receitaEscolhida);
  if (ultima?.role === "assistant" && ultimaBusca?.dados?.receitas?.length && !ultimaBusca.dados.cardapio && !ultimaBusca.dados.erro) {
    const el = document.createElement("div");
    el.className = "mais-receitas";
    el.innerHTML = `<button type="button" class="btn-mais">${ic("frigideira")}Mais receitas</button>`;
    mensagensEl.appendChild(el);
  }
  if (c?.mensagens.length) rolar(); else $("#chat").scrollTop = 0;
}

function renderLista() {
  $("#listaConversas").innerHTML = conversas.map(c =>
    `<div class="conv ${c.id === atual ? "ativa" : ""}" data-id="${c.id}">
      ${ic(c.escolhida ? "chapeu" : c.mensagens.some(m => m.modo === "cardapio") ? "cloche" : "frigideira")}<span title="${c.escolhida ? "Receita escolhida" : "Escolha uma receita para dar nome a esta conversa"}">${esc(c.titulo)}</span><button class="apagar" data-apagar="${c.id}" aria-label="Apagar conversa">${ic("fechar")}</button>
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
  $("#tipo").hidden = m !== "receitas";
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
    const t = (chips.join(", ") || texto).slice(0, 40);
    c = { id: Date.now().toString(36), titulo: t, tituloOriginal: t, mensagens: [] };
    conversas.unshift(c); atual = c.id;
  }
  const meta = +$("#metaCalorias").value || 2000;
  const tipo = modo === "receitas" ? $("#tipoReceita").value : "";
  const msg = { role: "user", texto, ingredientes: [...chips], modo, meta, tipo, faltar: $("#maxFaltantes").value };
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
    dados = await RemyAPI.responder({ mensagem: texto, ingredientes: msg.ingredientes, modo, meta_calorias: meta, tipo,
                                      quantidades: quantidadesDe(msg.ingredientes.length ? msg.ingredientes : nomesGeladeira()),
                                      max_faltantes: msg.faltar, perfil, historico });
  } catch (e) {
    dados = { erro: true, texto: `Ops! A cozinha pegou fogo: ${e.message || e}\n\nConfira a conexão em **Conectar modelo**.` };
  }
  c.mensagens.push({ role: "assistant", dados, restricoes: temPerfil() ? resumoPerfil() : "" });
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
  const escolher = e.target.closest("[data-escolher]");
  if (escolher) {                                    // a receita escolhida vira o nome da conversa no Caderno
    const c = conversaAtual(); if (!c) return;
    const nome = escolher.dataset.escolher;
    c.escolhida = c.escolhida === nome ? null : nome;
    c.titulo = c.escolhida || c.tituloOriginal || c.titulo;
    salvar(); renderLista();
    if (c.escolhida) { escolherReceita(nome); return; }
    mensagensEl.querySelectorAll("[data-escolher]").forEach(b => {
      const ativo = b.dataset.escolher === c.escolhida;
      b.classList.toggle("ativo", ativo);
      b.innerHTML = `${ic("check")}${ativo ? "Receita escolhida" : "Escolher esta receita"}`;
    });
    return;
  }
  const porcao = e.target.closest("[data-porcao]");
  if (porcao) {
    const m = msgDoEvento(e); if (!m) return;
    m.porcoes = Math.max(1, Math.min(100, (m.porcoes || m.dados.receitaEscolhida.porcoes || 1) + +porcao.dataset.porcao));
    salvar(); renderChat(); return;
  }
  const bt = e.target.closest("[data-timer]");
  if (bt) { iniciarTimer(+bt.dataset.timer, bt.dataset.receita); return; }
  if (e.target.closest(".btn-mais")) {
    chips = []; renderChips(); setModo("receitas");
    const ultimoUser = [...(conversaAtual()?.mensagens || [])].reverse().find(m => m.role === "user");
    if (ultimoUser?.tipo !== undefined) definirMenu("#tipoReceita", ultimoUser.tipo || "");
    if (ultimoUser?.faltar) definirMenu("#maxFaltantes", ultimoUser.faltar);
    entrada.value = "Mais receitas, por favor"; enviar(); return;
  }
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


// ---------- Receita escolhida: lista de compras, ingredientes para marcar, passo a passo e dica do Remy ----------
const FRAC = { "½": .5, "¼": .25, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3 };
const PALAVRAS_NUM = { meia: .5, meio: .5, uma: 1, um: 1, duas: 2, dois: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6 };
function lerNum(t) {
  t = t.trim();
  let m;
  if ((m = t.match(/^(\d+)\s*(?:e\s*)?(\d+)\/(\d+)$/))) return +m[1] + m[2] / m[3];
  if ((m = t.match(/^(\d+)\s*([½¼¾⅓⅔])$/))) return +m[1] + FRAC[m[2]];
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return m[1] / m[2];
  if (FRAC[t]) return FRAC[t];
  if (PALAVRAS_NUM[t.toLowerCase()]) return PALAVRAS_NUM[t.toLowerCase()];
  return +t.replace(",", ".");
}
function fmtNum(v) {
  if (v >= 10) return String(Math.round(v));
  const int = Math.floor(v + 1e-9), resto = v - int;
  const fr = [[0, ""], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, ""]]
    .reduce((a, b) => Math.abs(b[0] - resto) < Math.abs(a[0] - resto) ? b : a);
  if (Math.abs(fr[0] - resto) < .05) {
    const n = fr[0] === 1 ? int + 1 : int;
    return fr[1] ? (n ? `${n} ${fr[1]}` : fr[1]) : String(n);
  }
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
const NUM = String.raw`(?:\d+\s*(?:e\s*)?\d+\/\d+|\d+\s*[½¼¾⅓⅔]|\d+\/\d+|\d+[.,]\d+|\d+|[½¼¾⅓⅔]|meia|meio|uma|um|duas|dois|três|tres|quatro|cinco|seis)`;
const RE_QTD = new RegExp(String.raw`^(\s*)(${NUM})(\s*(?:a|ou|-)\s*(${NUM}))?(?=\s|\(|$)`, "i");
// "2 xícaras de farinha" para 6 porções em vez de 12 -> "1 xícaras de farinha"
const PLURAIS = { "xícara": "xícaras", "xicara": "xicaras", "colher": "colheres", "lata": "latas", "caixa": "caixas",
  "caixinha": "caixinhas", "pacote": "pacotes", "copo": "copos", "ovo": "ovos", "dente": "dentes", "unidade": "unidades",
  "fatia": "fatias", "pitada": "pitadas", "envelope": "envelopes", "tablete": "tabletes", "gema": "gemas", "clara": "claras",
  "banana": "bananas", "cebola": "cebolas", "tomate": "tomates", "batata": "batatas", "cenoura": "cenouras", "limão": "limões" };
const SINGULAR = Object.fromEntries(Object.entries(PLURAIS).map(([a, b]) => [b, a]));
function escalar(texto, fator) {
  if (Math.abs(fator - 1) < 1e-9) return texto;
  let novoValor = null;
  const out = texto.replace(RE_QTD, (tudo, esp, a, faixa, b) => {
    novoValor = lerNum(faixa ? b : a) * fator;
    return esp + fmtNum(lerNum(a) * fator) + (faixa ? faixa.replace(b, fmtNum(lerNum(b) * fator)) : "");
  });
  if (novoValor === null) return out;
  // concorda a palavra seguinte com o número: "1 xícaras" -> "1 xícara", "2 lata" -> "2 latas"
  return out.replace(/^(\s*[^\s]+(?:\s*(?:a|ou|-)\s*[^\s]+)?(?:\s[½¼¾⅓⅔])?\s+)([A-Za-zÀ-ú]+)/, (t, pre, w) => {
    const lw = w.toLowerCase();
    const troca = novoValor > 1 + 1e-9 ? PLURAIS[lw] : SINGULAR[lw];
    return pre + (troca ? (w[0] === w[0].toUpperCase() ? troca[0].toUpperCase() + troca.slice(1) : troca) : w);
  });
}

function acharCard(nome) {
  for (const m of [...(conversaAtual()?.mensagens || [])].reverse()) {
    for (const r of m.dados?.receitas || []) {
      for (const v of [r, ...(r.variantes || [])]) if (v.nome === nome) return v;
    }
  }
  return null;
}

// Quando há restrição no perfil, o Remy lembra que o filtro depende do texto das receitas
function avisoRestricao(m) {
  if (!m.restricoes) return "";
  return `<div class="aviso-restricao" role="note">${ic("alerta")}<p><b>Filtrei pelo seu perfil (${esc(m.restricoes)}).</b>
    O filtro lê o nome, os ingredientes e o modo de preparo, mas depende do que o autor escreveu. Se for alergia ou intolerância,
    confira os rótulos dos produtos (chocolate, margarina, caldos prontos...) antes de cozinhar.</p></div>`;
}

function renderEscolhida(m, i) {
  const r = m.dados.receitaEscolhida;
  const base = r.porcoes || 0, porcoes = m.porcoes || base, fator = base ? porcoes / base : 1;
  const marcados = new Set(m.marcados || []);
  const compras = [...(r.falta || []), ...(r.pouco || [])];
  const grupos = r.ingredientes?.length ? r.ingredientes : [{ secao: "", itens: r.tem || [] }];
  let k = 0;
  return `<div class="receita-escolhida" data-msg="${i}">
    <p class="rotulo-escolhida">${ic("chapeu")}Receita escolhida</p>
    <h3>${esc(r.nome)}</h3>
    <div class="tags">
      ${r.minutos != null ? `<span class="tag">${ic("relogio")}${esc(r.minutos)} min</span>` : ""}
      ${r.nota != null ? `<span class="tag">${ic("estrela")}${nota(r.nota)}${r.avaliacoes ? ` <small>(${milhar(r.avaliacoes)})</small>` : ""}</span>` : ""}
      ${r.calorias != null ? `<span class="tag">${ic("fogo")}≈ ${Math.round(r.calorias)} kcal/porção</span>` : ""}
    </div>
    ${base ? `<div class="porcoes-ctrl">${ic("talheres")}<span>Porções</span>
      <button type="button" data-porcao="-1" aria-label="Menos uma porção">−</button><b>${porcoes}</b>
      <button type="button" data-porcao="1" aria-label="Mais uma porção">+</button>
      ${porcoes !== base ? `<small>receita original: ${base} · quantidades ajustadas</small>` : `<small>ajuste para recalcular as quantidades</small>`}</div>` : ""}
    ${compras.length ? `<div class="compras"><h4>${ic("cesta")}Lista de compras</h4><ul>${compras.map(c => `<li>${esc(escalar(c, fator))}</li>`).join("")}</ul></div>`
      : `<p class="ok">${ic("check")}<span>Você tem tudo. Pode ir pro fogão!</span></p>`}
    ${avisoRestricao(m)}
    <h4>Ingredientes <small>(marque o que já separou)</small></h4>
    ${grupos.map(g => `${g.secao ? `<h5>${esc(g.secao)}</h5>` : ""}<div class="checklist">${g.itens.map(t => {
      const id = `i${k++}`;
      return `<label class="check ${marcados.has(id) ? "feito" : ""}"><input type="checkbox" data-check="${id}" ${marcados.has(id) ? "checked" : ""}><span>${esc(escalar(t, fator))}</span></label>`;
    }).join("")}</div>`).join("")}
    ${r.passos?.length ? `<h4>Modo de preparo</h4><ol class="passos">${r.passos.map(p => {
      const min = minutosDoPasso(p);
      return `<li>${esc(p)}${min ? `<button type="button" class="btn-timer" data-timer="${min}" data-receita="${esc(r.nome)}">${ic("relogio")}${/forno|assar|asse|airfryer/i.test(p) ? "Timer do forno" : "Timer"}: ${textoMin(min)}</button>` : ""}</li>`;
    }).join("")}</ol>` : ""}
    <div class="dica">${m.dados.dica ? md(m.dados.dica) : `<span class="pensando">${ic("panela")}O Remy está pensando numa dica<span class="pontinhos"></span></span>`}</div>
    ${r.fonte ? `<p class="fonte">Receita: ${esc(r.fonte)}${porcoes !== base ? " · quantidades recalculadas para " + porcoes + " porções" : ""}</p>` : ""}
  </div>`;
}

async function escolherReceita(nome) {
  const c = conversaAtual(); const card = acharCard(nome);
  if (!c || !card) return;
  const m = { role: "assistant", dados: { receitaEscolhida: JSON.parse(JSON.stringify(card)), dica: "" }, porcoes: card.porcoes || 0, marcados: [],
              restricoes: temPerfil() ? resumoPerfil() : "" };
  c.mensagens.push(m); salvar(); renderChat();
  let dica = "";
  try { dica = (await RemyAPI.responder({ acao: "dica", receita: card }))?.dica || ""; } catch { /* sem dica */ }
  m.dados.dica = dica || "Dica do Remy: separe e meça todos os ingredientes antes de começar.";
  salvar(); if (conversaAtual() === c) renderChat();
}

function msgDoEvento(e) {
  const box = e.target.closest(".receita-escolhida");
  return box ? conversaAtual()?.mensagens[+box.dataset.msg] : null;
}
mensagensEl.addEventListener("change", e => {
  const id = e.target.dataset.check; if (!id) return;
  const m = msgDoEvento(e); if (!m) return;
  const s = new Set(m.marcados || []); e.target.checked ? s.add(id) : s.delete(id);
  m.marcados = [...s]; salvar();
  e.target.closest(".check").classList.toggle("feito", e.target.checked);
});

// ---------- Timer: os passos com tempo ("asse por 40 minutos") ganham um botão de timer ----------
function minutosDoPasso(t) {
  const m = (t || "").match(/(\d+)\s*(?:a\s*\d+\s*)?(minutos?|min|horas?|h)\b/i);
  return m ? (+m[1]) * (/^h/i.test(m[2]) ? 60 : 1) : 0;
}
const textoMin = min => min >= 60 && min % 60 === 0 ? `${min / 60} h` : min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
let timer = { id: null, fim: 0, receita: "" };
function tocar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, .35, .7].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .3); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .3); });
  } catch {}
}
function tickTimer() {
  const el = $("#timerFlutuante"), resta = Math.max(0, Math.round((timer.fim - Date.now()) / 1000));
  el.hidden = false;
  el.innerHTML = resta
    ? `${ic("relogio")}<span><small>${esc(timer.receita)}</small><b>${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}</b></span><button type="button" id="timerParar">parar</button>`
    : `${ic("check")}<span><small>${esc(timer.receita)}</small><b>Tempo! Confira o ponto.</b></span><button type="button" id="timerParar">ok</button>`;
  if (!resta) { clearInterval(timer.id); timer.id = null; tocar(); }
}
function iniciarTimer(min, receita) {
  clearInterval(timer.id);
  timer = { id: setInterval(tickTimer, 1000), fim: Date.now() + min * 60000, receita: receita || "" };
  tickTimer();
}
$("#timerFlutuante").addEventListener("click", e => {
  if (e.target.id !== "timerParar") return;
  clearInterval(timer.id); timer.id = null; $("#timerFlutuante").hidden = true;
});

// Minha geladeira: ingredientes que o usuário tem em casa (com quantidade opcional), guardados neste navegador.
const CHAVE_GELADEIRA = "remy.geladeira", CHAVE_ONBOARDING = "remy.onboarding", CHAVE_INGREDIENTES = "remy.ingredientes";
// Lista curta para quando o site ainda não está ligado ao Colab. Ligado, vem a lista da base inteira.
const COMUNS = ["ovo", "arroz", "feijão preto", "feijão carioca", "frango", "carne moída", "batata", "cebola", "alho", "tomate",
  "cenoura", "leite", "muçarela", "queijo minas", "parmesão", "manteiga", "farinha de trigo", "polvilho", "farinha de mandioca",
  "fubá", "açúcar", "macarrão", "banana", "limão", "pão", "presunto", "mandioca", "milho verde", "creme de leite",
  "leite condensado", "chocolate em pó", "fermento químico", "fermento biológico", "linguiça", "abobrinha"];
// Ingredientes com tipos que mudam a receita: o Remy pergunta qual é (mesma lista do notebook).
const TIPOS = {
  farinha: ["farinha de trigo", "farinha de mandioca", "polvilho", "fubá", "farinha de milho", "farinha de arroz", "farinha de aveia", "farinha de rosca"],
  fermento: ["fermento químico", "fermento biológico"],
  queijo: ["muçarela", "queijo prato", "parmesão", "queijo minas", "requeijão", "cream cheese", "ricota"],
  feijao: ["feijão preto", "feijão carioca", "feijão branco", "feijão vermelho", "feijão fradinho"],
  chocolate: ["chocolate ao leite", "chocolate meio amargo", "chocolate branco", "chocolate em pó", "gotas de chocolate"],
  milho: ["milho verde", "fubá", "amido de milho", "pipoca", "canjica"],
  pimenta: ["pimenta-do-reino", "pimenta dedo-de-moça", "pimenta calabresa", "pimentão"],
};
const UNIDADES_G = [["un", "unidade(s)"], ["g", "g"], ["kg", "kg"], ["ml", "ml"], ["l", "litro(s)"], ["xicara", "xícara(s)"], ["colher sopa", "colher(es) de sopa"], ["lata", "lata(s)"], ["caixa", "caixa(s)"], ["pacote", "pacote(s)"]];
const sem = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const chaveTipo = t => sem(t).replace(/s$/, "");
const lerJSON = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
// Versões antigas guardavam só o nome; agora cada item é {nome, qtd, un}
let geladeira = lerJSON(CHAVE_GELADEIRA, []).map(i => typeof i === "string" ? { nome: i, qtd: "", un: "un" } : i);
let rascunho = [];
let todosIngredientes = lerJSON(CHAVE_INGREDIENTES, null);   // lista da base, vinda do Colab
const dlgG = $("#dlgGeladeira"), entradaG = $("#entradaGeladeira");
const nomesGeladeira = () => geladeira.map(i => i.nome);
const textoQtd = i => i.qtd ? `${String(i.qtd).replace(".", ",")} ${(UNIDADES_G.find(u => u[0] === i.un) || [, i.un])[1]}` : "";

async function carregarIngredientes() {
  if (todosIngredientes?.length) return;
  const c = RemyAPI.config();
  if (!(c.modo === "openai" ? c.url : c.space)) return;          // sem modelo conectado, fica a lista curta
  try {
    const r = await RemyAPI.responder({ acao: "ingredientes" });
    if (r?.ingredientes?.length) {
      todosIngredientes = r.ingredientes;
      try { localStorage.setItem(CHAVE_INGREDIENTES, JSON.stringify(todosIngredientes)); } catch {}
      if (dlgG.open) renderGeladeira();
    }
  } catch { /* sem conexão: fica a lista curta */ }
}

const EXEMPLOS = [
  { titulo: "O que dá para fazer?", ing: "frango, arroz, tomate, cebola, alho", icone: "frigideira" },
  { titulo: "Cardápio do dia", ing: "carne, batata, cebola, ovo, banana, açúcar", icone: "cloche", modo: "cardapio" },
];

function renderSugestoes() {
  const minha = nomesGeladeira().join(", ");
  const lista = geladeira.length ? [
    { titulo: "O que dá para fazer?", ing: minha, icone: "frigideira" },
    { titulo: "Cardápio do dia", ing: minha, icone: "cloche", modo: "cardapio" },
  ] : EXEMPLOS;
  $("#sugestoes").innerHTML = lista.map(x => `<button class="sugestao" data-ing="${esc(x.ing)}" data-msg="${esc(x.msg || "")}" data-modo="${x.modo || "receitas"}">
      ${ic(x.icone)}<span><b>${esc(x.titulo)}</b></span></button>`).join("");
  const aviso = $("#geladeiraAviso");
  aviso.hidden = false;
  aviso.innerHTML = geladeira.length
    ? `<span>${ic("cesta")} <b>Sua geladeira:</b> ${geladeira.length} ingredientes</span><button type="button" data-acao="editar">Editar</button>`
    : `<span>Quer sugestões com o que <b>você</b> tem? Os cards abaixo são só exemplos.</span><button type="button" data-acao="editar">Montar minha geladeira</button>`;
  $("#usarGeladeira").hidden = !geladeira.length;
}

function renderGeladeira() {
  $("#chipsGeladeira").innerHTML = rascunho.map((c, i) => `<span class="chip ${TIPOS[chaveTipo(c.nome)] ? "duvida" : ""}">${esc(c.nome)}${c.qtd ? ` <small>· ${esc(textoQtd(c))}</small>` : ""}<button type="button" data-tirar="${i}" aria-label="Remover ${esc(c.nome)}">${ic("fechar")}</button></span>`).join("");
  const duvidas = rascunho.map((c, i) => [c.nome, i]).filter(([c]) => TIPOS[chaveTipo(c)]);
  $("#tiposGeladeira").innerHTML = duvidas.map(([c, i]) => `<div class="tipo-pergunta"><span>Qual <b>${esc(c)}</b>? O tipo muda a receita.</span>
    <div class="comuns">${TIPOS[chaveTipo(c)].map(o => `<button type="button" class="comum" data-trocar="${i}" data-por="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`).join("");
  // Quantidades (opcional)
  $("#qtdGeladeira").hidden = !rascunho.length;
  $("#listaQtd").innerHTML = rascunho.map((c, i) => `<div class="linha-qtd"><span>${esc(c.nome)}</span>
    <input type="number" min="0" step="any" inputmode="decimal" placeholder="—" value="${esc(c.qtd ?? "")}" data-qtd="${i}" aria-label="Quantidade de ${esc(c.nome)}">
    <select data-un="${i}" aria-label="Unidade de ${esc(c.nome)}">${UNIDADES_G.map(([v, t]) => `<option value="${v}" ${c.un === v ? "selected" : ""}>${t}</option>`).join("")}</select></div>`).join("");
  // Toque para adicionar: todos os ingredientes da base, filtrados pelo que está sendo digitado
  const base = todosIngredientes?.length ? todosIngredientes : COMUNS;
  const tem = new Set(rascunho.map(x => sem(x.nome)));
  const busca = sem(entradaG.value || "");
  const filtrados = base.filter(c => !tem.has(sem(c)) && (!busca || sem(c).includes(busca)));
  const LIMITE = 60;
  $("#comunsGeladeira").innerHTML = filtrados.slice(0, LIMITE).map(c => `<button type="button" class="comum" data-add="${esc(c)}">+ ${esc(c)}</button>`).join("")
    || `<span class="vazio-comuns">Nenhum ingrediente da base com “${esc(entradaG.value)}”. Aperte Enter para adicionar assim mesmo.</span>`;
  $("#contaComuns").textContent = filtrados.length > LIMITE
    ? `Mostrando ${LIMITE} de ${filtrados.length.toLocaleString("pt-BR")}${todosIngredientes?.length ? " ingredientes da base" : ""}. Digite para procurar.`
    : (todosIngredientes?.length ? `${filtrados.length.toLocaleString("pt-BR")} ingredientes da base` : "");
}
function addGeladeira(t) {
  t = t.trim();
  if (t && !rascunho.some(x => sem(x.nome) === sem(t))) rascunho.push({ nome: t, qtd: "", un: "un" });
}
function abrirGeladeira() {
  rascunho = geladeira.map(i => ({ ...i })); entradaG.value = ""; renderGeladeira(); dlgG.showModal(); entradaG.focus();
  carregarIngredientes();
}
entradaG.addEventListener("input", () => {
  if (entradaG.value.includes(",")) {
    const partes = entradaG.value.split(",");
    entradaG.value = partes.pop().trimStart();
    partes.forEach(addGeladeira);
  }
  renderGeladeira();
});
entradaG.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addGeladeira(entradaG.value); entradaG.value = ""; renderGeladeira(); }
  else if (e.key === "Backspace" && !entradaG.value && rascunho.length) { rascunho.pop(); renderGeladeira(); }
});
dlgG.addEventListener("input", e => {
  const iq = e.target.dataset.qtd, iu = e.target.dataset.un;
  if (iq != null) rascunho[+iq].qtd = e.target.value;
  if (iu != null) rascunho[+iu].un = e.target.value;
  if (iq != null || iu != null) {                              // atualiza só o chip, sem redesenhar os campos
    const chip = $("#chipsGeladeira").children[+(iq ?? iu)];
    const c = rascunho[+(iq ?? iu)];
    if (chip) chip.innerHTML = `${esc(c.nome)}${c.qtd ? ` <small>· ${esc(textoQtd(c))}</small>` : ""}<button type="button" data-tirar="${iq ?? iu}" aria-label="Remover ${esc(c.nome)}">${ic("fechar")}</button>`;
  }
});
dlgG.addEventListener("click", e => {
  const tirar = e.target.closest("[data-tirar]")?.dataset.tirar;
  if (tirar != null) { rascunho.splice(+tirar, 1); renderGeladeira(); entradaG.focus(); }
  const trocar = e.target.closest("[data-trocar]");
  if (trocar) {
    const por = trocar.dataset.por, i = +trocar.dataset.trocar;
    if (rascunho.some(x => sem(x.nome) === sem(por))) rascunho.splice(i, 1); else rascunho[i].nome = por;
    renderGeladeira(); return;
  }
  const add = e.target.closest("[data-add]")?.dataset.add;
  if (add) { addGeladeira(add); entradaG.value = ""; renderGeladeira(); entradaG.focus(); }
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
$("#usarGeladeira").addEventListener("click", () => { nomesGeladeira().forEach(addChip); renderChips(); entrada.focus(); });


// ---------- Meu perfil: dieta e alimentos que a pessoa não come, salvos e aplicados em toda busca ----------
const CHAVE_PERFIL = "remy.perfil";
const DIETAS = [["vegetariano", "Vegetariano", "sem carnes nem peixes"], ["vegano", "Vegano", "sem nada de origem animal"],
  ["sem glúten", "Sem glúten", "sem trigo, pão, macarrão..."], ["sem lactose", "Sem lactose", "sem leite e derivados"]];
const ALERGIAS_COMUNS = ["camarão", "frutos do mar", "peixe", "amendoim", "castanhas", "ovo", "soja", "carne de porco", "coentro", "pimenta"];
const ICONE_DIETA = { "vegetariano": "folha", "vegano": "broto", "sem glúten": "trigo-x", "sem lactose": "leite-x" };
let perfil = lerJSON(CHAVE_PERFIL, { dietas: [], evitar: [] });
let rascunhoPerfil = { dietas: [], evitar: [] };
const dlgP = $("#dlgPerfil"), entradaP = $("#entradaPerfil");
const temPerfil = () => perfil.dietas.length || perfil.evitar.length;
const resumoPerfil = () => [...perfil.dietas, ...perfil.evitar.map(e => "sem " + e)].join(" · ");

function renderPillPerfil() {
  $("#pillPerfil").hidden = !temPerfil();
  // Na barra fica curto ("Perfil · 2"); a lista completa aparece ao passar o mouse
  const nRestr = perfil.dietas.length + perfil.evitar.length;
  $("#pillPerfil").innerHTML = `${ic("chapeu")}<span>Perfil · ${nRestr}</span>`;
  $("#pillPerfil").title = `Seu perfil: ${resumoPerfil()}. Vale para todas as buscas. Clique para editar.`;
  $("#pillPerfil").setAttribute("aria-label", `Perfil: ${resumoPerfil()}. Clique para editar.`);
}
function renderPerfil() {
  $("#dietasPerfil").innerHTML = DIETAS.map(([v, t, d]) => `<label class="dieta"><input type="checkbox" value="${v}" ${rascunhoPerfil.dietas.includes(v) ? "checked" : ""}>
    <i class="dieta-marca">${ic("check")}</i><span class="dieta-icone">${ic(ICONE_DIETA[v])}</span><b>${t}</b><small>${d}</small></label>`).join("");
  $("#chipsPerfil").innerHTML = rascunhoPerfil.evitar.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-tirar-perfil="${i}" aria-label="Remover ${esc(c)}">${ic("fechar")}</button></span>`).join("");
  const tem = new Set(rascunhoPerfil.evitar.map(sem));
  const base = [...ALERGIAS_COMUNS, ...(todosIngredientes || [])];
  const busca = sem(entradaP.value || "");
  const lista = [...new Set(base)].filter(c => !tem.has(sem(c)) && (!busca || sem(c).includes(busca))).slice(0, busca ? 30 : ALERGIAS_COMUNS.length);
  $("#comunsPerfil").innerHTML = lista.map(c => `<button type="button" class="comum" data-add-perfil="${esc(c)}">+ ${esc(c)}</button>`).join("");
}
function addPerfil(t) { t = t.trim(); if (t && !rascunhoPerfil.evitar.some(x => sem(x) === sem(t))) rascunhoPerfil.evitar.push(t); }
function abrirPerfil() {
  rascunhoPerfil = JSON.parse(JSON.stringify(perfil)); entradaP.value = ""; renderPerfil(); dlgP.showModal(); carregarIngredientes();
}
entradaP.addEventListener("input", () => {
  if (entradaP.value.includes(",")) { const p = entradaP.value.split(","); entradaP.value = p.pop().trimStart(); p.forEach(addPerfil); }
  renderPerfil();
});
entradaP.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addPerfil(entradaP.value); entradaP.value = ""; renderPerfil(); }
});
dlgP.addEventListener("change", e => {
  if (e.target.type !== "checkbox") return;
  const v = e.target.value, s = new Set(rascunhoPerfil.dietas);
  e.target.checked ? s.add(v) : s.delete(v);
  if (v === "vegano" && e.target.checked) s.add("vegetariano");                 // vegano já é vegetariano
  rascunhoPerfil.dietas = [...s]; renderPerfil();
});
dlgP.addEventListener("click", e => {
  const i = e.target.closest("[data-tirar-perfil]")?.dataset.tirarPerfil;
  if (i != null) { rascunhoPerfil.evitar.splice(+i, 1); renderPerfil(); }
  const add = e.target.closest("[data-add-perfil]")?.dataset.addPerfil;
  if (add) { addPerfil(add); entradaP.value = ""; renderPerfil(); entradaP.focus(); }
});
dlgP.addEventListener("close", () => {
  if (dlgP.returnValue !== "ok") return;
  addPerfil(entradaP.value);
  perfil = rascunhoPerfil;
  try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil)); } catch {}
  renderPillPerfil();
});
$("#btnPerfil").addEventListener("click", () => { document.body.classList.remove("menu-aberto"); abrirPerfil(); });
$("#pillPerfil").addEventListener("click", abrirPerfil);

// Quantidades da geladeira que valem para os ingredientes deste pedido (o Remy avisa se for pouco)
function quantidadesDe(nomes) {
  const out = {};
  for (const n of nomes) {
    const g = geladeira.find(i => sem(i.nome) === sem(n));
    if (g?.qtd) out[n] = { qtd: +String(g.qtd).replace(",", "."), unidade: g.un };
  }
  return out;
}

// "Pode faltar" fica salvo para a próxima visita
try { const f = localStorage.getItem("remy.faltar"); if (f) definirMenu("#maxFaltantes", f); } catch {}
$("#maxFaltantes").addEventListener("change", e => { try { localStorage.setItem("remy.faltar", e.target.value); } catch {} });

// Início
Remy.montar();
renderSugestoes();
renderPillPerfil();
// Primeira visita: pergunta o que tem na geladeira (dá para pular). No modo apresentação, não pergunta.
if (!localStorage.getItem(CHAVE_ONBOARDING)) abrirGeladeira();
$("#favicon").href = "data:image/svg+xml," + encodeURIComponent(Remy.svg(64).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
renderLista(); renderChat(); renderStatus();

// ---------- Listas suspensas no visual do site (vale para TODOS os <select> da página) ----------
// O <select> continua lá (escondido) e guarda o valor; por cima vai um botão com uma lista própria.
// Funciona também para selects criados depois (ex.: unidades da geladeira) e dentro das janelas.
const _valor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
const _indice = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
function definirMenu(sel, v) { (typeof sel === "string" ? $(sel) : sel).value = v; }
function menuRemy(sel) {
  if (sel._menu) return;
  const opcoes = [...sel.options], comIcone = opcoes.some(o => o.dataset.icone);
  const titulo = sel.dataset.titulo || sel.closest(".meta")?.textContent.trim().split("\n")[0].trim()
    || sel.closest("label")?.childNodes[0]?.textContent.trim() || sel.getAttribute("aria-label") || "";
  const caixa = document.createElement("div"); caixa.className = "menu-remy";
  caixa.innerHTML = `<button type="button" class="menu-botao" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(sel.getAttribute("aria-label") || titulo)}"><span></span>${ic("seta")}</button>`;
  const lista = document.createElement("ul"); lista.className = "menu-lista" + (comIcone ? "" : " simples"); lista.setAttribute("role", "listbox"); lista.hidden = true;
  lista.innerHTML = `${titulo ? `<p class="menu-titulo">${esc(titulo)}</p>` : ""}${opcoes.map((o, i) => `<li role="option" data-i="${i}" tabindex="-1">
      ${comIcone ? `<span class="menu-icone">${ic(o.dataset.icone || "check")}</span>` : ""}<span class="menu-texto"><b>${esc(o.text)}</b>${o.dataset.desc ? `<small>${esc(o.dataset.desc)}</small>` : ""}</span>
      <i class="menu-ok">${ic("check")}</i></li>`).join("")}`;
  sel.classList.add("menu-nativo"); sel.after(caixa); sel.tabIndex = -1;
  // A lista vai para o <body> (ou para a janela aberta): assim nada corta o menu
  (sel.closest("dialog") || document.body).append(lista);
  const botao = caixa.firstElementChild, itens = [...lista.querySelectorAll("li")];
  const posicionar = () => {
    lista.style.maxHeight = "";
    if (matchMedia("(max-width: 640px)").matches) { lista.style.left = lista.style.top = lista.style.minWidth = ""; return; }   // celular: folha no rodapé (CSS)
    const r = botao.getBoundingClientRect();
    lista.style.minWidth = Math.max(r.width + 16, comIcone ? 280 : 180) + "px";
    const cima = r.top - 22, baixo = innerHeight - r.bottom - 22;            // espaço livre acima e abaixo do botão
    const paraBaixo = !sel.closest(".composer-wrap") && baixo >= Math.min(lista.offsetHeight, 260);   // a barra de baixo abre para cima
    const vai = paraBaixo || cima < lista.offsetHeight && baixo > cima;
    lista.style.maxHeight = Math.max(120, vai ? baixo : cima) + "px";
    lista.style.left = Math.max(12, Math.min(r.left - 8, innerWidth - lista.offsetWidth - 12)) + "px";
    lista.style.top = (vai ? r.bottom + 8 : r.top - 8 - lista.offsetHeight) + "px";
  };
  const atualizar = () => {
    const i = _indice.get.call(sel);
    botao.querySelector("span").textContent = sel.options[i]?.text || "";
    itens.forEach((li, k) => li.setAttribute("aria-selected", k === i));
  };
  const fechar = (foco = true) => { lista.hidden = true; botao.setAttribute("aria-expanded", "false"); caixa.classList.remove("aberto");
    document.body.classList.remove("lista-aberta"); if (foco) botao.focus({ preventScroll: true }); };
  const abrir = () => {
    document.querySelectorAll(".menu-remy.aberto").forEach(m => m._fechar(false));
    lista.hidden = false; botao.setAttribute("aria-expanded", "true"); caixa.classList.add("aberto");
    document.body.classList.add("lista-aberta"); posicionar();
    const atual = itens[Math.max(_indice.get.call(sel), 0)];
    atual.focus({ preventScroll: true });
    // Rola só a lista (nunca a página) até a opção escolhida
    if (atual.offsetTop + atual.offsetHeight > lista.scrollTop + lista.clientHeight) lista.scrollTop = atual.offsetTop - lista.clientHeight / 2;
    caixa._abertoEm = Date.now();
  };
  const escolher = i => {
    if (_indice.get.call(sel) !== i) {
      _indice.set.call(sel, i);
      sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    atualizar(); fechar();
  };
  botao.addEventListener("click", () => lista.hidden ? abrir() : fechar());
  botao.addEventListener("keydown", e => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); abrir(); } });
  lista.addEventListener("click", e => { const li = e.target.closest("li"); if (li) escolher(+li.dataset.i); });
  lista.addEventListener("keydown", e => {
    const i = itens.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); itens[Math.min(i + 1, itens.length - 1)].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); itens[Math.max(i - 1, 0)].focus(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(i); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); }      // Esc fecha só a lista, não a janela
    else if (e.key === "Tab") fechar(false);
  });
  // Quando o código muda o valor (sel.value = ...), o botão acompanha
  Object.defineProperty(sel, "value", { configurable: true, get() { return _valor.get.call(this); }, set(v) { _valor.set.call(this, v); atualizar(); } });
  Object.defineProperty(sel, "selectedIndex", { configurable: true, get() { return _indice.get.call(this); }, set(v) { _indice.set.call(this, v); atualizar(); } });
  caixa._fechar = fechar; caixa._lista = lista; lista._caixa = caixa;
  sel._menu = { atualizar, posicionar, lista };
  atualizar();
}
document.querySelectorAll("select").forEach(menuRemy);
// Selects que aparecem depois (a lista de quantidades da geladeira é redesenhada) e limpeza das listas antigas
new MutationObserver(() => {
  document.querySelectorAll("select:not(.menu-nativo)").forEach(menuRemy);
  document.querySelectorAll(".menu-lista").forEach(l => { if (!l._caixa?.isConnected) l.remove(); });
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", e => {
  document.querySelectorAll(".menu-remy.aberto").forEach(m => { if (!m.contains(e.target) && !m._lista.contains(e.target)) m._fechar(false); });
});
addEventListener("resize", () => document.querySelectorAll(".menu-remy.aberto").forEach(m => m.previousElementSibling?._menu?.posicionar()));
// Rolou a conversa ou a janela com uma lista aberta: fecha, para ela não ficar solta na tela
document.addEventListener("scroll", e => {
  if (e.target.closest?.(".menu-lista")) return;
  document.querySelectorAll(".menu-remy.aberto").forEach(m => { if (Date.now() - (m._abertoEm || 0) > 300) m._fechar(false); });
}, true);

// Barra de opções: o degradê no canto só aparece quando ela não cabe e dá para rolar
const barraModos = $(".modos");
const checarBarra = () => {
  const sobra = barraModos.scrollWidth - barraModos.clientWidth;
  barraModos.classList.toggle("transborda", sobra > 2);
  barraModos.classList.toggle("no-fim", sobra > 2 && barraModos.scrollLeft >= sobra - 2);
};
barraModos.addEventListener("scroll", checarBarra, { passive: true });
addEventListener("resize", checarBarra);
new MutationObserver(checarBarra).observe(barraModos, { subtree: true, childList: true, attributes: true, characterData: true });
checarBarra();
