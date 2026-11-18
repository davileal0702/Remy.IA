# Pasta de dados

## Como os dados finais foram feitos

```
TudoGostoso (site)
   │  notebooks/RemyIA_Coleta_TudoGostoso.ipynb
   ▼
tudogostoso/receitas_tudogostoso.parquet      ← base bruta: 21.316 receitas, sem calorias
   │  scripts/calorias_taco.py  +  taco/food.csv, taco/nutrients.csv, taco/complementos.csv
   ▼
tudogostoso/receitas_com_calorias.parquet     ← BASE FINAL: mesmas receitas e colunas, com `calorias` (kcal por porção)
```

Para gerar de novo a base final (da pasta do projeto): `python scripts/calorias_taco.py`.
Resultado: 16.194 das 21.316 receitas (76%) com calorias, mediana de 282 kcal por porção. A receita fica sem calorias quando menos de 80% dos ingredientes foram entendidos, quando falta o número de porções ou quando o valor passa de 2.000 kcal por porção.

## Pastas

| Pasta | O que tem | No GitHub? |
|---|---|---|
| `tudogostoso/` | `receitas_com_calorias.parquet` (**base final do projeto**) e `receitas_tudogostoso.parquet` (base bruta da coleta). | Não |
| `taco/` | Tabela TACO (calorias por 100 g: `food.csv` e `nutrients.csv`) e `complementos.csv`, com 52 ingredientes que a TACO não tem (IBGE; quando nem o IBGE tem, USDA, rótulo ou estimativa, indicado na coluna `fonte`). Veja `taco/README.md`. O notebook lê esta pasta direto do GitHub. | **Sim** (pública e pequena) |
| `antigos/foodcom/` | Base antiga do Food.com (Kaggle `shuyangli94/food-com-recipes-and-user-interactions`): `RAW_recipes.csv` e `RAW_interactions.csv`. Usada na primeira versão, em inglês. Guardada só como histórico. | Não |

As bases de receitas ficam fora do GitHub por causa do `.gitignore`: são grandes e o uso foi autorizado só para o trabalho. O `RemyIA_Final.ipynb` lê a base pelo Google Drive do grupo (`MyDrive/RemyIA_dados/`).
