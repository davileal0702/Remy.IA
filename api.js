// Ponte entre a interface e o modelo. Veja o contrato de dados no README.
const RemyAPI = (() => {
  const CHAVE = "remy.config";
  const PADRAO = { modo: "demo", space: "", endpoint: "/responder", url: "", modelo: "tgi", token: "" };
  const SISTEMA = "Você é o Remy, um chef que sugere receitas em português a partir dos ingredientes que o usuário tem. " +
    "Diga o nome da receita, tempo, ingredientes, modo de preparo e o que falta comprar.";

  const config = () => ({ ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") });
  const salvarConfig = c => localStorage.setItem(CHAVE, JSON.stringify(c));

  // Aceita objeto, JSON em texto (com ou sem ```json) ou texto livre.
  function interpretar(saida) {
    if (saida && typeof saida === "object") return saida;
    const txt = String(saida ?? "").trim();
    try {
      const o = JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      if (o && typeof o === "object") return o;
    } catch { /* não é JSON: vira texto */ }
    return { texto: txt };
  }

  async function viaGradio(pedido, c) {
    if (!c.space) throw new Error("Informe o ID do Space em Conectar modelo.");
    const { Client } = await import("https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js");
    const app = await Client.connect(c.space, c.token ? { hf_token: c.token } : {});
    const r = await app.predict(c.endpoint || "/responder", [JSON.stringify(pedido)]);
    return interpretar(r.data[0]);
  }

  // Só o LLM, sem a busca RAG. Útil para testar o modelo ajustado direto.
  async function viaOpenAI(pedido, c) {
    if (!c.url) throw new Error("Informe a URL base em Conectar modelo.");
    let pergunta = pedido.ingredientes.length ? `Tenho ${pedido.ingredientes.join(", ")}. ` : "";
    pergunta += pedido.mensagem || "O que posso cozinhar?";
    if (pedido.modo === "cardapio") pergunta += ` Monte um cardápio do dia (café, prato principal, acompanhamento e sobremesa) com até ${pedido.meta_calorias} kcal.`;
    const res = await fetch(c.url.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(c.token && { Authorization: "Bearer " + c.token }) },
      body: JSON.stringify({
        model: c.modelo || "tgi", max_tokens: 1024,
        messages: [{ role: "system", content: SISTEMA }, ...pedido.historico, { role: "user", content: pergunta }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return interpretar(j.choices?.[0]?.message?.content);
  }

  async function responder(pedido) {
    const c = config();
    if (c.modo === "gradio") return viaGradio(pedido, c);
    if (c.modo === "openai") return viaOpenAI(pedido, c);
    await new Promise(r => setTimeout(r, 900));
    return RemyDemo.responder(pedido);
  }

  return { responder, config, salvarConfig };
})();
