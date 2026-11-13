# Briefing: a LLM do Remy.IA e o site

> **Atenção:** este briefing descreve a primeira versão (base Food.com). Na versão 13.11 a base passou a ser o TudoGostoso e o contrato ganhou campos novos (`tipo`, `max_faltantes`, `quantidades`, `perfil`, os pedidos `acao: "ingredientes"` e `acao: "dica"`, e nos cards `porcoes`, `avaliacoes`, `calorias_aprox`, `pouco`, `ingredientes` por seção e `fonte`). O contrato atual está no `README.md`.

Este texto explica o site do Remy.IA para quem vai construir e treinar a IA. O objetivo é que a IA receba exatamente o que o site manda e devolva exatamente o que o site sabe mostrar.

## 1. O projeto em uma frase

Remy.IA é um assistente de culinária em português: o usuário diz quais ingredientes tem em casa e o Remy sugere receitas reais (da base Food.com, Kaggle `shuyangli94/food-com-recipes-and-user-interactions`), mostra o que falta comprar e monta um cardápio do dia dentro de uma meta de calorias.

Arquitetura planejada: entrada em português, normalização (tradução PT para EN, singular, sinônimos), busca RAG nas receitas (embeddings + FAISS), LLM escreve a resposta, saída em português.

## 2. A interface (o que o usuário vê)

Site estático (HTML, CSS e JavaScript puro), parecido com ChatGPT/Claude, tema "cozinha escura premium" inspirado em Ratatouille, mascote: ratinho chef em pixel art.

- **Barra lateral**: histórico de conversas ("Caderno de receitas"), botão "Nova receita", botão "Minha geladeira", botão "Conectar modelo" e status da conexão.
- **Tela inicial**: frase "Qualquer um pode cozinhar." e 4 cards de sugestão clicáveis.
- **Caixa de mensagem**: o usuário digita; cada vírgula transforma o texto em um "chip" de ingrediente. Enter envia. Uma palavra solta sem espaço também vira ingrediente.
- **Seletor de modo**: "Receitas" ou "Cardápio do dia". No cardápio aparece um campo de meta de calorias (padrão 2000 kcal).
- **Minha geladeira**: janela onde o usuário lista o que tem em casa (abre sozinha na primeira visita). Quando o ingrediente é genérico, a janela pergunta o tipo (ex.: "farinha" vira "farinha de trigo", "polvilho", "fubá"...). Essa lista fica só no navegador e **não é enviada automaticamente**: ela só chega à IA quando o usuário clica numa sugestão da tela inicial ou no botão "Usar minha geladeira", que colocam os itens como chips.
- **Resposta do Remy**: um balão de texto curto e, abaixo, **cards de receita**.

### O que cada card mostra

- Rótulo da refeição em cima (só no cardápio): "Café da manhã", "Prato principal", "Acompanhamento", "Sobremesa".
- Nome da receita.
- Etiquetas: tempo (min), nota (0 a 5, uma casa decimal), calorias (kcal), "Brasileira".
- "Você tem:" ingredientes da receita que o usuário já tem.
- "Falta comprar:" ingredientes que faltam. Se a lista vier vazia, o card mostra "Tem tudo! Pode ir pro fogão."
- "Modo de preparo": lista numerada que abre e fecha.
- **Variantes**: receitas do mesmo tipo (ex.: 3 jeitos de fazer arroz) podem vir num card só, com botões para trocar entre elas.

O site **não gera nem mostra imagens**. A IA nunca deve devolver imagens nem links de imagem.

## 3. Como a IA é chamada

O site fala com a IA de duas formas, escolhidas em "Conectar modelo".

### Forma A (principal): servidor Gradio

Pode ser o Colab (link `https://xxxx.gradio.live`, durante os testes) ou um Space do Hugging Face (depois).

- Endpoint: **`/responder`**.
- Entrada: **um único texto** contendo um JSON (o "pedido").
- Saída: **um único texto** contendo um JSON (a "resposta").

Exemplo mínimo do servidor:

```python
import json
import gradio as gr

def responder(pedido_json: str) -> str:
    pedido = json.loads(pedido_json)
    # normalizar -> buscar receitas (RAG) -> LLM escreve o texto
    resposta = {"texto": "...", "receitas": [...]}
    return json.dumps(resposta, ensure_ascii=False)

demo = gr.Interface(fn=responder, inputs=gr.Textbox(), outputs=gr.Textbox(), api_name="responder")
demo.launch(share=True)  # share=True gera o link gradio.live no Colab
```

O site chama assim (biblioteca oficial `@gradio/client`): `client.predict("/responder", [textoDoPedido])` e lê `data[0]`.

### Forma B (secundária): API compatível com OpenAI

Para testar o LLM puro (TGI, vLLM, Ollama, Groq). **Não tem busca RAG.** O site manda `POST {url}/chat/completions` com:

- mensagem de sistema: "Você é o Remy, um chef que sugere receitas em português a partir dos ingredientes que o usuário tem. Diga o nome da receita, tempo, ingredientes, modo de preparo e o que falta comprar."
- o histórico da conversa;
- a pergunta em texto natural, montada pelo site: `"Tenho frango, arroz. O que posso cozinhar?"`. No cardápio, o site acrescenta: `"Monte um cardápio do dia (café, prato principal, acompanhamento e sobremesa) com até 1800 kcal."`

A resposta (`choices[0].message.content`) pode ser texto ou o mesmo JSON da Forma A.

## 4. O pedido (o que a IA recebe)

```json
{
  "mensagem": "algo rápido",
  "ingredientes": ["frango", "arroz", "tomate", "cebola", "alho"],
  "modo": "receitas",
  "meta_calorias": 2000,
  "historico": [
    { "role": "user", "content": "ovo, leite. quero algo doce" },
    { "role": "assistant", "content": "Com ovo e leite dá para fazer..." }
  ]
}
```

| Campo | O que é | Cuidados |
|---|---|---|
| `mensagem` | Texto livre que o usuário digitou, sem os chips. | Pode vir **vazio** (só chips). Pode conter ingredientes ("o que faço com frango e arroz?"), pedidos ("algo rápido", "receitas brasileiras", "sem forno", "pra 4 pessoas") ou conversa ("e de sobremesa?"). |
| `ingredientes` | Lista dos chips, em português, como o usuário escreveu. | Pode vir **vazia**. Pode ter acentos, maiúsculas, plural, nomes compostos ("feijão carioca", "farinha de trigo", "creme de leite"), genéricos ("queijo", "farinha") ou erros de digitação. |
| `modo` | `"receitas"` ou `"cardapio"`. | Define o formato da resposta. |
| `meta_calorias` | Meta do dia em kcal. | **Sempre vem**, mesmo no modo receitas (padrão 2000). Só importa no modo cardápio. |
| `historico` | Até as **10 últimas mensagens** antes da atual. | Mensagens do usuário vêm como `"ingredientes. texto"`. Mensagens do Remy vêm **só com o `texto`**: a IA **não vê os cards** que mandou antes. Se a última resposta foi um erro do site, ela aparece como texto começando com "Ops! A cozinha pegou fogo". |

## 5. A resposta (o que a IA devolve)

Um JSON em texto. **Todos os campos são opcionais.** Se vier texto puro (não JSON), o site mostra como mensagem normal, sem cards. O site também aceita o JSON dentro de um bloco ```json.

```json
{
  "texto": "Com o que você tem dá para fazer um **arroz mexicano** agora mesmo. Se passar no mercado, um caldo de legumes abre mais duas opções.",
  "receitas": [
    {
      "nome": "Arroz mexicano da Adriana",
      "minutos": 30,
      "nota": 4.5,
      "calorias": 320,
      "brasileira": false,
      "tem": ["arroz", "tomate", "cebola", "alho"],
      "falta": [],
      "passos": ["Refogue a cebola e o alho.", "Junte o arroz e o tomate.", "Cubra com água e cozinhe por 20 min."]
    },
    {
      "grupo": "Arroz",
      "variantes": [
        { "rotulo": "De tomate", "nome": "Arroz de tomate", "minutos": 30, "nota": 4.7, "calorias": 280, "tem": ["arroz", "tomate"], "falta": ["caldo de legumes"], "passos": ["..."] },
        { "rotulo": "Doce de cebola", "nome": "Arroz doce de cebola", "minutos": 30, "nota": 3.9, "calorias": 300, "tem": ["arroz", "cebola"], "falta": ["caldo de galinha"], "passos": ["..."] }
      ]
    }
  ]
}
```

### Campos de cada receita

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | Nome da receita em português. Deve existir na base (não inventar). |
| `minutos` | número inteiro | Tempo total. |
| `nota` | número 0 a 5 | Nota média dos usuários. O site mostra com uma casa decimal. |
| `calorias` | número | Por porção. O site arredonda. |
| `brasileira` | true/false | Mostra a etiqueta "Brasileira". |
| `tem` | lista de textos | Ingredientes da receita que o usuário **já tem**, em português. |
| `falta` | lista de textos | O que falta comprar, em português. **Não incluir básicos** (sal, água, óleo, pimenta-do-reino). Lista vazia significa "Tem tudo!". |
| `passos` | lista de textos | Modo de preparo em português, um passo por item, sem numeração (o site numera). |
| `grupo` + `variantes` | texto + lista | Opcional. Com 2 ou mais variantes, vira um card só com botões. Cada variante tem os mesmos campos de uma receita, mais `rotulo` (texto curto do botão). Com menos de 2 variantes, o site trata como receita comum. |

Qualquer campo ausente simplesmente não aparece no card.

### Modo cardápio

```json
{
  "texto": "Montei seu dia com **1420 kcal**, dentro da meta de 1800 kcal.",
  "cardapio": {
    "meta_calorias": 1800,
    "total_calorias": 1420,
    "itens": [
      { "refeicao": "Café da manhã", "nome": "Panqueca simples", "calorias": 250 },
      { "refeicao": "Prato principal", "nome": "Carne de panela com batata", "calorias": 520 },
      { "refeicao": "Acompanhamento", "nome": "Batata rústica", "calorias": 220 },
      { "refeicao": "Sobremesa", "nome": "Banana caramelizada", "calorias": 210 }
    ]
  },
  "receitas": [ { "nome": "Panqueca simples", "...": "card completo" } ]
}
```

- Cada item de `cardapio.itens` vira um card com o rótulo `refeicao` em cima.
- Para o card sair completo (tempo, nota, o que tem, o que falta, preparo), mande a receita completa em `receitas` com **o mesmo `nome` exato** do item. Sem isso, o card mostra só nome e calorias.
- Rótulos esperados: "Café da manhã", "Prato principal", "Acompanhamento", "Sobremesa" (tags da base: `breakfast`, `main-dish`, `side-dishes`, `desserts`).
- `total_calorias` deve ser menor ou igual a `meta_calorias`. Evitar repetir o mesmo ingrediente principal em duas refeições.

### Regras do campo `texto`

O site mostra o texto com um markdown **bem limitado**:

- Funciona: parágrafos, `**negrito**`, `*itálico*`, listas com `- ` e listas com `1. `.
- **Não funciona** (aparece como texto cru): títulos `#`, links, tabelas, imagens, código, HTML (é escapado por segurança).

Como escrever:

- Português do Brasil, tom de chef simpático, **curto: 2 a 5 frases**.
- **Não repetir** o que já está nos cards (lista de ingredientes, passos, números). O texto comenta e orienta; os cards trazem os dados.
- Falar só das receitas que vieram da busca. Nunca citar receita que não está nos cards.

## 6. O que a IA precisa estar preparada para fazer

1. **Entender ingredientes em português** e mapear para os nomes em inglês da base: plural ("tomates"), acentos ("feijão", "limão", "açúcar"), compostos ("creme de leite", "farinha de mandioca"), sinônimos e regionalismos ("aipim"/"macaxeira"/"mandioca", "jerimum"/"abóbora", "muçarela"/"mussarela"), erros de digitação.
2. **Tirar ingredientes do texto livre** quando `ingredientes` vier vazio ("o que faço com frango e arroz?").
3. **Lidar com genéricos**: "queijo", "farinha", "feijão" sem tipo. Usar o tipo mais comum ou considerar vários. A janela "Minha geladeira" já pergunta o tipo para: farinha, fermento, queijo, feijão, chocolate, milho e pimenta.
4. **Ignorar básicos** na cobertura e no "falta comprar": sal, água, óleo, pimenta-do-reino.
5. **Respeitar pedidos da mensagem**: "algo rápido" (priorizar `minutos` baixos), "receitas brasileiras" (marcar e priorizar `brasileira: true`), "doce", "salgado", "sem forno", "café da manhã", "vegetariano" etc.
6. **Usar o histórico** para continuar a conversa ("e de sobremesa?", "tem outra opção?", "sem o tomate"), lembrando que só o texto das respostas anteriores aparece no histórico.
7. **Montar o cardápio** com 4 refeições, dentro da meta de calorias.
8. **Responder sem cards** quando não houver o que sugerir: ingredientes não reconhecidos, nenhuma receita encontrada, saudação ("oi") ou pergunta fora do tema. Devolver só `{"texto": "..."}` pedindo os ingredientes com gentileza.
9. **Recusar ou redirecionar** pedidos fora de culinária, sem inventar.
10. **Traduzir a saída** para o português: nome, `tem`, `falta` e `passos` (a base é em inglês).
11. **Nunca inventar** receita, nota, tempo ou caloria. Esses números vêm da base.

## 7. Recomendação de divisão de trabalho (para não alucinar)

O jeito mais seguro de encaixar a IA no site:

- **O código (busca RAG) preenche os cards**: `nome`, `minutos`, `nota`, `calorias`, `tem`, `falta`, `passos`, `brasileira`, `variantes` e o `cardapio`. São dados da base, com tradução.
- **A LLM escreve só o `texto`**, a partir das receitas encontradas, da mensagem e do histórico.

Assim os cards nunca mostram dados inventados, e o ajuste fino (LoRA/QLoRA) só precisa ensinar o tom e o formato do texto.

### Formato sugerido para os exemplos de treino

Entrada (o que o modelo vê):

```
Pedido: {"mensagem": "algo rápido", "ingredientes": ["ovo", "queijo"], "modo": "receitas"}
Histórico: (vazio)
Receitas encontradas:
1. Omelete de queijo e tomate · 15 min · nota 4.4 · tem: ovo, queijo · falta: tomate
2. Ovos mexidos com queijo · 10 min · nota 4.6 · tem: ovo, queijo · falta: nada
```

Saída esperada:

```
Para algo rápido, os **ovos mexidos com queijo** ficam prontos em 10 minutos com o que você já tem. Se tiver um tomate, a omelete fica ainda melhor.
```

Exemplos de treino devem cobrir: só chips, só texto livre, chips + pedido, cardápio, continuação de conversa, nada encontrado, saudação, fora do tema, ingrediente genérico e ingrediente com erro de digitação. Usar receitas bem avaliadas (nota média 4 ou mais com 3 ou mais avaliações).

## 8. Checklist antes de conectar no site

- [ ] O endpoint se chama `/responder` e recebe/devolve **um texto**.
- [ ] A saída é JSON válido (`json.dumps(..., ensure_ascii=False)`), ou texto puro quando não houver cards.
- [ ] Tudo em português do Brasil.
- [ ] `falta` sem básicos; lista vazia quando o usuário tem tudo.
- [ ] `passos` sem numeração no começo.
- [ ] No cardápio, `cardapio.itens[].nome` igual a `receitas[].nome`.
- [ ] `texto` curto, sem títulos `#`, links ou imagens.
- [ ] Nenhuma receita fora da base.
- [ ] Testado com: pedido só com texto, pedido sem nada reconhecível, cardápio com meta baixa (ex.: 800 kcal) e histórico com 10 mensagens.
- [ ] Tempo de resposta razoável: o site espera sem limite mostrando "Remy está cozinhando", mas em CPU um LLM grande pode levar minutos.
