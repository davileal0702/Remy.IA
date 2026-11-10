# Remy.IA

> Qualquer um pode cozinhar. Agora, com o que você tem na geladeira.

Interface de chat do projeto **Remy.IA** (Redes Neurais Artificiais e Machine Learning, Prof. Jaime Ranulfo Leite Filho).
Integrantes: Beatriz, Davi, Kayke e Guilherme.

O usuário informa os ingredientes e o Remy sugere receitas, o que falta comprar e um cardápio do dia.

## Como abrir

É um site estático (HTML, CSS e JavaScript puro, sem build). Basta abrir o `index.html` no navegador.
O site só responde com o modelo conectado (veja abaixo).

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Tema (cozinha escura premium, detalhes dourados) |
| `assets/cozinha.svg` | Ilustração de fundo da cozinha |
| `remy.js` | Mascote em pixel art (ratinho chef com colher de pau) |
| `app.js` | Chat, chips de ingredientes, "Minha geladeira", cards e histórico (salvos no `localStorage`) |
| `api.js` | Conexão com o modelo |
| `space/` | Modelo de Space do Hugging Face no formato que o site espera |

## Funções do site

- **Chat** com histórico de conversas na barra lateral.
- **Chips de ingredientes**: a vírgula transforma o texto em ingrediente.
- **Receitas** ou **Cardápio do dia** (café, prato principal, acompanhamento e sobremesa) com meta de calorias.
- **Minha geladeira**: lista do que o usuário tem em casa. Abre sozinha na primeira visita (dá para pular). Pergunta o tipo quando o ingrediente é genérico (farinha, fermento, queijo, feijão, chocolate, milho, pimenta). As sugestões da tela inicial passam a usar essa lista, e o botão **Usar minha geladeira** coloca tudo nos chips.
- **Cards de receita**: tempo, nota, calorias, o que tem, o que falta comprar, modo de preparo e etiqueta "Brasileira". Receitas do mesmo tipo podem vir num card só, com botões para trocar de variante.

## Conectando o modelo

No site, clique em **⚙ Conectar modelo** e escolha a fonte:

1. **Gradio: Colab ou Hugging Face Space**, recomendado: o servidor roda o pipeline completo (busca RAG + LLM). Informe o link do Colab (`https://xxxx.gradio.live`) ou o ID do Space (ex.: `usuario/remy-ia`) e o endpoint (`/responder`).
2. **API compatível com OpenAI** (Hugging Face Inference Endpoints/TGI, vLLM, Ollama, Groq): fala direto com o LLM. Informe a URL base terminando em `/v1`. Esse modo **não faz a busca RAG**.

O token digitado em **Conectar modelo** fica salvo só no navegador de quem usa. Num site público, não deixe token no código: prefira um Space público.

### Testando pelo Colab

1. No notebook da LLM, sirva a função de resposta com Gradio no endpoint `/responder` e `launch(share=True)`.
2. A célula mostra um link `https://xxxx.gradio.live`.
3. No site: **Conectar modelo** > *Gradio: Colab ou Hugging Face Space* > cole o link > endpoint `/responder` > Salvar.

O link vale enquanto o Colab estiver aberto. Se a sessão cair, rode de novo e cole o link novo.

### Subindo o Space

1. Crie um Space novo no Hugging Face com SDK **Gradio**.
2. Envie os arquivos de `space/` (`app.py` e `requirements.txt`).
3. Troque o corpo da função `responder` em `app.py` pelo pipeline da LLM.

## Contrato de dados

O site envia para o endpoint `/responder` um texto JSON:

```json
{
  "mensagem": "texto livre digitado (pode ser vazio)",
  "ingredientes": ["frango", "arroz", "tomate"],
  "modo": "receitas",
  "meta_calorias": 2000,
  "historico": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

`modo` é `"receitas"` ou `"cardapio"`.

O servidor devolve um texto JSON. Todos os campos são opcionais; se vier texto puro, ele aparece como mensagem normal.

```json
{
  "texto": "Resposta em markdown simples (**negrito**, *itálico*, listas)",
  "receitas": [
    {
      "nome": "Arroz mexicano da Adriana",
      "minutos": 30,
      "nota": 4.5,
      "calorias": 320,
      "brasileira": false,
      "tem": ["arroz", "tomate"],
      "falta": ["caldo de legumes"],
      "passos": ["Refogue a cebola...", "Junte o arroz..."]
    },
    {
      "grupo": "Arroz",
      "variantes": [
        { "rotulo": "Com frango", "nome": "Arroz com frango", "minutos": 40, "tem": ["arroz", "frango"], "falta": [] },
        { "rotulo": "De forno", "nome": "Arroz de forno", "minutos": 50, "tem": ["arroz"], "falta": ["queijo"] }
      ]
    }
  ],
  "cardapio": {
    "meta_calorias": 2000,
    "total_calorias": 1850,
    "itens": [{ "refeicao": "Café da manhã", "nome": "Panqueca simples", "calorias": 250 }]
  }
}
```

- Cada item de `receitas` vira um card. `brasileira: true` mostra a etiqueta "Brasileira".
- Um item com `variantes` (2 ou mais) vira um card só, com o título `grupo` e um botão por variante (`rotulo`, ou `nome` se não tiver). Cada variante usa os mesmos campos de uma receita.
- No cardápio, cada item de `cardapio.itens` vira um card com o rótulo da refeição (usa a receita de mesmo `nome` em `receitas`, se houver).
