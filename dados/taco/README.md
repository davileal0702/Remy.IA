# Tabela TACO

Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada, NEPA/Unicamp (2011).
O Remy usa a TACO para estimar as calorias das receitas (seção 4 do `notebooks/RemyIA_Final.ipynb`).

| Arquivo | O que tem |
|---|---|
| `food.csv` | Os 597 alimentos da TACO: `id`, `categoryId`, `name` |
| `nutrients.csv` | Os nutrientes de cada alimento (`foodId`); o Remy usa a coluna `kcal` (por 100 g) |

**Origem desta cópia:** projeto aberto [taco-api](https://github.com/raulfdm/taco-api), de Raul de Melo, que converteu a tabela oficial para CSV
(pasta `references/csv`, versão de fevereiro de 2025). Licença MIT, reproduzida em `LICENSE-taco-api.md`.

Os arquivos não foram alterados. Três alimentos vêm sem kcal na TACO (leite integral, leite desnatado e iogurte);
o notebook completa esses valores com médias, no próprio código.
