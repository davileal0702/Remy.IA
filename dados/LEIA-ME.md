# Pasta de dados

| Pasta | O que tem | No GitHub? |
|---|---|---|
| `taco/` | Tabela TACO (calorias por 100 g) e `complementos.csv` com o que a TACO não tem (valores do IBGE). Veja `taco/README.md`. O notebook lê esta pasta direto do GitHub. | **Sim** (pública e pequena) |
| `tudogostoso/` | Cópia local da base de receitas atual: `receitas_tudogostoso.parquet`, gerada pelo `notebooks/RemyIA_Coleta_TudoGostoso.ipynb`. A original fica no Google Drive do grupo, em `MyDrive/RemyIA_dados/`, que é de onde o `RemyIA_Final.ipynb` lê. | Não |
| `antigos/foodcom/` | Base antiga do Food.com (Kaggle `shuyangli94/food-com-recipes-and-user-interactions`): `RAW_recipes.csv` e `RAW_interactions.csv`. Usada na primeira versão, em inglês. Guardada só como histórico. | Não |

As bases de receitas ficam fora do GitHub por causa do `.gitignore`: são grandes e o uso foi autorizado só para o trabalho.
