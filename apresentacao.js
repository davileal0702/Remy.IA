// Conversa simulada para a apresentação.
// 1) Uma conversa pronta ("Exemplo para a apresentação") aparece uma vez na barra lateral.
// 2) Abra index.html?apresentacao e o chat se "usa sozinho", pronto para gravar a tela.
(() => {
  const semAviso = d => ({ ...d, texto: d.texto.replace(/\s*\*\(modo demonstração\)\*/, "") });
  const pedido1 = { ingredientes: ["frango", "arroz", "tomate", "cebola", "alho"], mensagem: "", modo: "receitas", meta_calorias: 2000 };
  const pedido2 = { ingredientes: ["ovo", "banana", "batata"], mensagem: "monta um cardápio pro dia todo?", modo: "cardapio", meta_calorias: 1800 };

  // Conversa pronta, criada só na primeira visita (se apagar, não volta).
  if (!localStorage.getItem("remy.exemplo")) {
    conversas.unshift({
      id: "exemplo",
      titulo: "Exemplo para a apresentação",
      mensagens: [
        { role: "user", texto: "", ingredientes: pedido1.ingredientes, modo: "receitas", meta: 2000 },
        { role: "assistant", dados: semAviso(RemyDemo.responder(pedido1)) },
        { role: "user", texto: pedido2.mensagem, ingredientes: pedido2.ingredientes, modo: "cardapio", meta: 1800 },
        { role: "assistant", dados: semAviso(RemyDemo.responder(pedido2)) },
      ],
    });
    salvar();
    localStorage.setItem("remy.exemplo", "1");
    renderLista();
  }

  if (!new URLSearchParams(location.search).has("apresentacao")) return;

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const campo = document.querySelector("#entrada");

  async function digitar(texto, ms = 70) {
    campo.focus();
    for (const letra of texto) {
      campo.value += letra;
      campo.dispatchEvent(new Event("input"));
      await espera(letra === "," ? ms * 4 : ms);
    }
  }

  async function enviarEEsperar() {
    await espera(500);
    document.querySelector("#btnEnviar").click();
    await espera(200);
    while (enviando) await espera(100);
    await espera(400);
  }

  async function roteiro() {
    // Barra lateral de exemplo; nada da apresentação fica gravado.
    conversas = [
      { id: "ex2", titulo: "Panquecas de domingo", mensagens: [] },
      { id: "ex1", titulo: "Massa rápida pós-aula", mensagens: [] },
    ];
    salvar = () => {};
    abrir(null);
    setModo("receitas");
    await espera(2000);

    // Cena 1: ingredientes da geladeira viram receitas
    await digitar(pedido1.ingredientes.join(", "));
    await enviarEEsperar();
    await espera(1500);
    document.querySelector(".card details")?.setAttribute("open", "");
    rolar();
    await espera(4500);

    // Cena 2: cardápio do dia com meta de calorias
    document.querySelector('.seg-btn[data-modo="cardapio"]').click();
    const meta = document.querySelector("#metaCalorias");
    meta.value = "";
    for (const d of String(pedido2.meta_calorias)) { meta.value += d; await espera(120); }
    await espera(600);
    await digitar(pedido2.ingredientes.join(", ") + ", ");
    await digitar(pedido2.mensagem, 55);
    await enviarEEsperar();
    document.querySelector(".msg:last-child .cardapio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.addEventListener("load", roteiro);
})();
