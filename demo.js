// Modo demonstração: imita a resposta do modelo com algumas receitas de exemplo.
// shortcut: base fixa de 13 receitas; some quando o Space do Hugging Face estiver no ar.
const RemyDemo = (() => {
  const BASICOS = ["sal", "agua", "oleo", "pimenta"]; // ignorados na cobertura, como no RAG real

  const receitas = [
    { nome: "Arroz mexicano da Adriana", cat: "principal", minutos: 30, nota: 4.5, calorias: 320,
      ing: ["arroz", "tomate", "cebola", "alho", "frango"],
      passos: ["Refogue cebola e alho no óleo.", "Junte o frango em cubos e doure.", "Adicione arroz e tomate picado.", "Cubra com água, tempere com sal e cozinhe por 20 min."] },
    { nome: "Arroz de tomate", cat: "acompanhamento", minutos: 30, nota: 4.7, calorias: 280,
      ing: ["arroz", "tomate", "cebola", "caldo de legumes"],
      passos: ["Refogue a cebola.", "Junte o tomate e deixe desmanchar.", "Adicione arroz e caldo de legumes e cozinhe até secar."] },
    { nome: "Arroz doce de cebola", cat: "acompanhamento", minutos: 30, nota: 3.9, calorias: 300,
      ing: ["arroz", "cebola", "caldo de galinha", "manteiga"],
      passos: ["Caramelize a cebola na manteiga.", "Junte o arroz e o caldo de galinha.", "Cozinhe em fogo baixo por 18 min."] },
    { nome: "Frango ao alho e limão", cat: "principal", minutos: 40, nota: 4.6, calorias: 410,
      ing: ["frango", "alho", "limao", "azeite"],
      passos: ["Tempere o frango com alho, limão e sal.", "Descanse por 15 min.", "Grelhe no azeite até dourar dos dois lados."] },
    { nome: "Panqueca simples", cat: "cafe", minutos: 20, nota: 4.8, calorias: 250,
      ing: ["ovo", "leite", "farinha", "acucar"],
      passos: ["Bata ovo, leite, farinha e açúcar.", "Despeje uma concha na frigideira untada.", "Vire quando formar bolhas."] },
    { nome: "Omelete de queijo e tomate", cat: "cafe", minutos: 15, nota: 4.4, calorias: 290,
      ing: ["ovo", "queijo", "tomate", "cebola"],
      passos: ["Bata os ovos com sal.", "Refogue cebola e tomate.", "Despeje os ovos, junte o queijo e dobre."] },
    { nome: "Pão de queijo caseiro", cat: "cafe", minutos: 40, nota: 4.7, calorias: 300,
      ing: ["polvilho", "queijo", "ovo", "leite"],
      passos: ["Escalde o polvilho com leite e óleo quentes.", "Junte ovo e queijo e sove.", "Faça bolinhas e asse a 200 °C por 25 min."] },
    { nome: "Macarrão alho e óleo com queijo", cat: "principal", minutos: 20, nota: 4.6, calorias: 450,
      ing: ["macarrao", "alho", "queijo", "salsinha"],
      passos: ["Cozinhe o macarrão al dente.", "Doure o alho fatiado no óleo.", "Misture tudo com queijo e salsinha."] },
    { nome: "Carne de panela com batata", cat: "principal", minutos: 90, nota: 4.7, calorias: 520,
      ing: ["carne", "batata", "cebola", "cenoura", "tomate"],
      passos: ["Sele a carne em pedaços.", "Junte cebola e tomate e refogue.", "Cubra com água e cozinhe na pressão por 40 min.", "Adicione batata e cenoura e cozinhe mais 10 min."] },
    { nome: "Batata rústica", cat: "acompanhamento", minutos: 45, nota: 4.5, calorias: 220,
      ing: ["batata", "alho", "alecrim"],
      passos: ["Corte as batatas em gomos com casca.", "Tempere com alho, alecrim, sal e óleo.", "Asse a 220 °C por 35 min."] },
    { nome: "Salada de tomate e cebola", cat: "acompanhamento", minutos: 10, nota: 4.2, calorias: 90,
      ing: ["tomate", "cebola", "salsinha", "limao"],
      passos: ["Fatie tomate e cebola.", "Tempere com limão, sal e salsinha."] },
    { nome: "Banana caramelizada", cat: "sobremesa", minutos: 10, nota: 4.5, calorias: 210,
      ing: ["banana", "acucar", "canela", "manteiga"],
      passos: ["Derreta açúcar com manteiga.", "Doure a banana em rodelas.", "Polvilhe canela."] },
    { nome: "Mousse de chocolate", cat: "sobremesa", minutos: 25, nota: 4.8, calorias: 380,
      ing: ["chocolate", "creme de leite", "ovo", "acucar"],
      passos: ["Derreta o chocolate com o creme de leite.", "Bata as claras em neve com açúcar.", "Misture delicadamente e gele por 3 h."] },
  ];

  const REFEICOES = [["cafe", "Café da manhã"], ["principal", "Prato principal"], ["acompanhamento", "Acompanhamento"], ["sobremesa", "Sobremesa"]];
  const NOMES = { limao: "limão", acucar: "açúcar", macarrao: "macarrão", agua: "água", oleo: "óleo" };

  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/(.{3,})s$/, "$1");
  const bonito = i => NOMES[i] || i;
  const conhecidos = [...new Set(receitas.flatMap(r => r.ing))];

  function extrair(ingredientes, mensagem) {
    const lista = ingredientes.map(norm);
    const texto = " " + norm(mensagem || "") + " ";
    conhecidos.forEach(i => { if (texto.includes(i) && !lista.includes(i)) lista.push(i); });
    return lista.filter(i => !BASICOS.includes(i));
  }

  function pontuar(lista) {
    return receitas.map(r => {
      const tem = r.ing.filter(i => lista.includes(i));
      return { r, tem, falta: r.ing.filter(i => !lista.includes(i)), cob: tem.length / r.ing.length };
    }).filter(x => x.tem.length).sort((a, b) => b.tem.length - a.tem.length || b.cob - a.cob || b.r.nota - a.r.nota);
  }

  const paraCard = x => ({ nome: x.r.nome, minutos: x.r.minutos, nota: x.r.nota, calorias: x.r.calorias,
    tem: x.tem.map(bonito), falta: x.falta.map(bonito), passos: x.r.passos });

  function responder(pedido) {
    const lista = extrair(pedido.ingredientes || [], pedido.mensagem);
    if (!lista.length) return { texto: "Não reconheci ingredientes aí. Me diga o que tem na geladeira, por exemplo: **frango, arroz, tomate**.\n\n*(modo demonstração)*" };
    const ranking = pontuar(lista);

    if (pedido.modo === "cardapio") {
      const meta = pedido.meta_calorias || 2000;
      let resta = meta; const usados = new Set(); const aproveitados = new Set(); const itens = [];
      const novos = x => x.tem.filter(i => !aproveitados.has(i)).length;
      for (const [cat, rotulo] of REFEICOES) {
        const op = ranking.filter(x => x.r.cat === cat).sort((a, b) => novos(b) - novos(a));
        const todas = op.length ? op : receitas.filter(r => r.cat === cat).map(r => ({ r, tem: [], falta: r.ing }));
        const esc = todas.find(x => x.r.calorias <= resta && !usados.has(x.r.ing[0])) || todas.find(x => x.r.calorias <= resta);
        if (!esc) continue;
        usados.add(esc.r.ing[0]); esc.tem.forEach(i => aproveitados.add(i)); resta -= esc.r.calorias;
        itens.push({ refeicao: rotulo, nome: esc.r.nome, calorias: esc.r.calorias, receita: paraCard(esc) });
      }
      const total = meta - resta;
      return {
        texto: `Montei seu cardápio do dia com **${total} kcal**, dentro da meta de ${meta} kcal, aproveitando ao máximo o que você tem.\n\n*(modo demonstração)*`,
        cardapio: { meta_calorias: meta, total_calorias: total, itens: itens.map(({ receita, ...i }) => i) },
        receitas: itens.map(i => i.receita),
      };
    }

    const top = ranking.slice(0, 3);
    if (!top.length) return { texto: "Hmm, não achei receitas com esses ingredientes na minha despensa de exemplo.\n\n*(modo demonstração)*" };
    const completa = top[0].falta.length === 0;
    return {
      texto: `Com **${lista.map(bonito).join(", ")}** encontrei ${top.length} ${top.length > 1 ? "receitas" : "receita"}. ${completa ? "A primeira você já pode fazer agora, tem tudo!" : "Falta pouca coisa para a primeira."}\n\n*(modo demonstração)*`,
      receitas: top.map(paraCard),
    };
  }

  return { responder, _norm: norm };
})();

// Autoteste rápido: abra o console e rode RemyDemo._teste()
RemyDemo._teste = () => {
  const r = RemyDemo.responder({ ingredientes: ["frango", "arroz", "tomate", "cebola", "alho"], modo: "receitas" });
  console.assert(r.receitas[0].nome === "Arroz mexicano da Adriana" && r.receitas[0].falta.length === 0, "ranking receitas");
  const c = RemyDemo.responder({ ingredientes: ["ovo", "batata", "banana"], modo: "cardapio", meta_calorias: 1000 });
  console.assert(c.cardapio.total_calorias <= 1000, "meta de calorias");
  console.assert(RemyDemo._norm("Tomates") === "tomate", "plural");
  return "ok";
};
