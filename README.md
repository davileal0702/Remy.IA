# Remy.IA

> Qualquer um pode cozinhar. Agora, com o que você tem na geladeira.

Interface de chat do projeto **Remy.IA** (Redes Neurais Artificiais e Machine Learning, Prof. Jaime Ranulfo Leite Filho).
Integrantes: Beatriz, Davi, Kayke e Guilherme.

O usuário informa os ingredientes e o Remy sugere receitas, o que falta comprar e um cardápio do dia.

## Como abrir

É um site estático (HTML, CSS e JavaScript puro, sem build). Basta abrir o `index.html` no navegador.

Para publicar no GitHub Pages: suba a pasta no repositório, vá em **Settings > Pages** e escolha a branch `main`, pasta `/ (root)`.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Tema (bistrô de Paris, toalha xadrez) |
| `remy.js` | Mascote em pixel art (ratinho chef com colher de pau) |
| `app.js` | Chat, chips de ingredientes, histórico (salvo no `localStorage`) |
| `api.js` | Conexão com o modelo |
| `demo.js` | Respostas de exemplo enquanto o modelo não está no ar |
| `space/` | Modelo de Space do Hugging Face já compatível com o site |

## Conectando o modelo

No site, clique em **⚙ Conectar modelo** e escolha a fonte:

1. **Demonstração**: usa 13 receitas de exemplo. É o padrão.
2. **Hugging Face Space (Gradio)**, recomendado: o Space roda o pipeline completo (normalização, busca RAG com FAISS e o LLM com LoRA). Informe o ID do Space (ex.: `usuario/remy-ia`) e o endpoint (`/responder`).
3. **API compatível com OpenAI**: para falar direto com o LLM ajustado (Hugging Face Inference Endpoints/TGI, vLLM, Ollama). Informe a URL base terminando em `/v1`. Esse modo **não faz a busca RAG**, só conversa com o modelo.

### Subindo o Space

1. Crie um Space novo no Hugging Face com SDK **Gradio**.
2. Envie os arquivos de `space/` (`app.py` e `requirements.txt`).
3. Troque o corpo da função `responder` em `app.py` pelo pipeline do Colab.

## Contrato de dados

O site envia para o Space (endpoint `/responder`) um texto JSON:

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

O Space devolve um texto JSON. Todos os campos são opcionais; se vier texto puro, ele aparece como mensagem normal.

```json
{
  "texto": "Resposta em markdown simples (**negrito**, *itálico*, listas)",
  "receitas": [
    {
      "nome": "Arroz mexicano da Adriana",
      "minutos": 30,
      "nota": 4.5,
      "calorias": 320,
      "tem": ["arroz", "tomate"],
      "falta": ["caldo de legumes"],
      "passos": ["Refogue a cebola...", "Junte o arroz..."]
    }
  ],
  "cardapio": {
    "meta_calorias": 2000,
    "total_calorias": 1850,
    "itens": [{ "refeicao": "Café da manhã", "nome": "Panqueca simples", "calorias": 250 }]
  }
}
```

`receitas` vira cards. `cardapio` vira o "Menu du jour".

## Teste rápido

Abra o console do navegador e rode `RemyDemo._teste()`. Deve retornar `"ok"` sem avisos.
