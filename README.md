# Remy.IA

> Qualquer um pode cozinhar. Agora, com o que você tem na geladeira.

Projeto da disciplina **Redes Neurais Artificiais e Machine Learning** (Uniso, Prof. Jaime Ranulfo Leite Filho).
Integrantes: Beatriz, Davi, Kayke e Guilherme.

O usuário diz o que tem em casa e o Remy devolve receitas brasileiras reais (base do TudoGostoso, com notas de usuários), o que falta comprar, as calorias estimadas pela Tabela TACO e um cardápio do dia. O texto da conversa é escrito pelo LLM **Qwen3.5-2B**.

## Como funciona

```
site (este repositório)  ──JSON──▶  notebook no Colab (Gradio /responder)
                                      ├─ entende os ingredientes (sinônimos, erros de digitação, embeddings + FAISS)
                                      ├─ busca as receitas na base do TudoGostoso (~21 mil receitas)
                                      ├─ calcula o que falta e as calorias (Tabela TACO)
                                      └─ Qwen3.5-2B escreve a resposta do Remy
```

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Tema (cozinha escura, detalhes dourados), responsivo do celular ao monitor grande |
| `app.js` | Chat, geladeira, perfil, cards, receita escolhida, timer, listas suspensas e histórico (no `localStorage`) |
| `api.js` | Conexão com o modelo (Gradio ou API compatível com OpenAI) |
| `remy.js` | Mascote em pixel art |
| `assets/cozinha.svg` | Ilustração de fundo |
| `notebooks/RemyIA_Coleta_TudoGostoso.ipynb` | Coleta as receitas do TudoGostoso e salva a base no Google Drive |
| `notebooks/RemyIA_Final.ipynb` | O cérebro: base + TACO + busca + Qwen3.5-2B, servindo o site pelo Gradio |
| `space/` | Modelo de Space do Hugging Face (ainda **não** tem o pipeline final; use o notebook) |

## Rodando

1. **Base de receitas.** Rode `notebooks/RemyIA_Coleta_TudoGostoso.ipynb` no Colab. Ele salva `RemyIA_dados/receitas_tudogostoso.parquet` no Google Drive e continua de onde parou se a sessão cair (a coleta completa leva umas 7 a 8 horas). A base **não vai para o GitHub**: o uso foi autorizado só para o trabalho, e a `.gitignore` bloqueia esses arquivos.
2. **Modelo.** Abra `notebooks/RemyIA_Final.ipynb` no Colab, escolha **GPU T4** (Ambiente de execução > Alterar o tipo) e clique em **Executar tudo**. A última célula mostra um link `https://xxxx.gradio.live`.
3. **Site.** Abra o `index.html` (ou o GitHub Pages), clique em **Conectar modelo**, escolha *Gradio*, cole o link, endpoint `/responder`, e salve.

O link vale enquanto o Colab estiver aberto. Se a sessão cair, rode de novo e cole o link novo. Sem modelo conectado, o site avisa "Modelo não conectado".

## Funções do site

- **Minha geladeira**: abre na primeira visita (dá para pular). O "Toque para adicionar" mostra os ingredientes da base. Quantidade é opcional; com ela, o Remy avisa quando a receita pede mais do que você tem. Para ingredientes com tipos (farinha, queijo, fermento...) o site pergunta qual é.
- **Meu perfil**: vegetariano, vegano, sem glúten, sem lactose e alimentos que a pessoa não come. Vale para toda busca e cardápio. O filtro olha nome, ingredientes e modo de preparo, e o site mostra um aviso para conferir os rótulos em caso de alergia.
- **Receitas**: tipo opcional (café da manhã, prato principal, sobremesa) e **Pode faltar** (nada, até 2, até 5, tanto faz). Cards em duas colunas, com variantes do mesmo prato num card só. Botão **Mais receitas** traz as próximas sem repetir.
- **Cardápio do dia**: café, almoço, acompanhamento, jantar e sobremesa dentro da meta de calorias.
- **Receita escolhida**: lista de compras, checklist de ingredientes (por parte: massa, recheio...), ajuste de porções que recalcula as quantidades, modo de preparo com **timer** nos passos que têm tempo e uma dica do Remy.
- **Caderno de receitas**: o histórico na barra lateral, com o nome da receita escolhida.

## Contrato com o modelo

O site manda para `/responder` um texto JSON:

```json
{
  "mensagem": "texto livre (pode ser vazio)",
  "ingredientes": ["frango", "arroz", "tomate"],
  "quantidades": { "leite": { "qtd": 1, "unidade": "l" } },
  "modo": "receitas",
  "tipo": "principal",
  "max_faltantes": "2",
  "meta_calorias": 2000,
  "perfil": { "dietas": ["sem lactose"], "evitar": ["amendoim"] },
  "historico": [{ "role": "user", "content": "..." }]
}
```

- `modo`: `"receitas"` ou `"cardapio"`. `tipo`: `""`, `"cafe"`, `"principal"` ou `"sobremesa"`. `max_faltantes`: `"0"`, `"2"`, `"5"` ou `"livre"`.
- Pedidos especiais: `{"acao": "ingredientes"}` devolve `{"ingredientes": [...]}` (lista do "Toque para adicionar"); `{"acao": "dica", "receita": {...}}` devolve `{"dica": "..."}`.

O modelo devolve um texto JSON:

```json
{
  "texto": "Resposta do Remy em markdown simples",
  "receitas": [
    {
      "nome": "Arroz de forno", "categoria": "Prato Único", "minutos": 50, "porcoes": 6,
      "nota": 4.6, "avaliacoes": 120, "calorias": 410, "calorias_aprox": true,
      "tem": ["2 xícaras de arroz cozido"], "falta": ["200 g de presunto"], "pouco": [],
      "ingredientes": [{ "secao": "Massa", "itens": ["2 xícaras de arroz cozido", "..."] }],
      "passos": ["Misture...", "Leve ao forno por 20 minutos."],
      "fonte": "TudoGostoso"
    },
    { "grupo": "Bolo de cenoura", "variantes": [{ "rotulo": "Bolo de cenoura fofinho", "nome": "...", "...": "mesmos campos" }] }
  ],
  "cardapio": { "meta_calorias": 2000, "total_calorias": 1850, "itens": [{ "refeicao": "Almoço", "nome": "Arroz de forno", "calorias": 410 }] }
}
```

- `tem` e `falta` vêm com quantidade, como estão na receita. `pouco` lista o que o usuário tem, mas em quantidade menor que a receita pede.
- Um item com `variantes` (2 ou mais) vira um card só, com um botão por variante.
- No cardápio, cada item de `cardapio.itens` usa a receita de mesmo `nome` em `receitas`.

## Limites conhecidos

- As calorias são estimadas pela TACO a partir do texto dos ingredientes (88% das receitas têm estimativa). É uma aproximação.
- Cerca de 40% das receitas da base não têm avaliação; nelas a nota entra pela média do site (nota bayesiana).
- Os filtros de dieta e alergia dependem do que o autor da receita escreveu. Em caso de alergia, confira os rótulos.
- `space/app.py` ainda é o modelo antigo, sem o pipeline final.
