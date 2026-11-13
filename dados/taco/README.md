# Tabela TACO

Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada, NEPA/Unicamp (2011).
O Remy usa a TACO para estimar as calorias das receitas (seção 4 do `notebooks/RemyIA_Final.ipynb`).

| Arquivo | O que tem |
|---|---|
| `food.csv` | Os 597 alimentos da TACO: `id`, `categoryId`, `name` |
| `nutrients.csv` | Os nutrientes de cada alimento (`foodId`); o Remy usa a coluna `kcal` (por 100 g) |

**Origem desta cópia:** projeto aberto [taco-api](https://github.com/raulfdm/taco-api), de Raul de Melo, que converteu a tabela oficial para CSV
(pasta `references/csv`, versão de fevereiro de 2025). Licença MIT, reproduzida em `LICENSE-taco-api.md`.

Os arquivos `food.csv` e `nutrients.csv` não foram alterados.

## complementos.csv: o que a TACO não tem

A TACO não tem alguns ingredientes comuns nas receitas (ketchup, bacon, cream cheese, vinho, licor, sorvete, salsicha,
champignon, peito de peru, chantilly, uva passa...) e deixa o leite sem kcal. Esses valores estão em `complementos.csv`,
tirados da tabela oficial do IBGE: **Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil** (POF 2008-2009, IBGE, 2011).

| Coluna | O que é |
|---|---|
| `ingrediente` | Nome do ingrediente como o Remy o reconhece (sem acento) |
| `kcal_100g` | Energia por 100 g, da Tabela 1 do IBGE |
| `alimento_na_fonte` | Nome do item na tabela do IBGE |
| `codigo_ibge` | Código do item, para conferir |
| `observacao` | Quando o valor é uma aproximação (ex.: vinho do Porto usa o valor de vinho) |

Para revisar ou acrescentar um item, basta editar este CSV: o notebook lê a tabela a cada execução.
