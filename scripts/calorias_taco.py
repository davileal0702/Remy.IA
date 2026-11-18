"""
Calorias por porção das receitas do TudoGostoso usando a TACO (4ª ed., NEPA/UNICAMP)
e os complementos da equipe (IBGE/POF).

COMO RODAR (da pasta do projeto):
    python scripts/calorias_taco.py
Lê dados/tudogostoso/receitas_tudogostoso.parquet e dados/taco/{food,nutrients,complementos}.csv.
Gera um arquivo NOVO, dados/tudogostoso/receitas_com_calorias.parquet (o original não é alterado).

linha "2 xícaras de leite"  ->  quantidade 2 · unidade xícara · alimento leite
                            ->  gramas (medida caseira)  ->  kcal = gramas × kcal/100 g (TACO) / 100
receita: soma das kcal / porções. Só calcula se a maior parte dos ingredientes foi entendida.
"""
import re
import unicodedata

import pandas as pd

import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # pasta do projeto
TACO_DIR = os.path.join(RAIZ, "dados", "taco")                         # food.csv, nutrients.csv, complementos.csv
RECEITAS_DIR = os.path.join(RAIZ, "dados", "tudogostoso")


def n(t):
    t = unicodedata.normalize("NFKD", str(t).lower()).encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-z0-9/ ]", " ", t).split())


# --- alimento -> (id da TACO | kcal por 100 g quando a TACO não tem)  e gramas por xícara (densidade)
#     chave: palavras que identificam o alimento na linha (sem acento); a mais longa que casar vence
ALIMENTOS = {
    "leite condensado": (453, 300), "creme de leite": (447, 220), "leite de coco": ("kcal", 166, 240),
    "leite em po": (456, 100), "leite": ("kcal", 61, 240), "iogurte": ("kcal", 51, 240),
    "requeijao": ("kcal", 257, 240), "cream cheese": ("kcal", 342, 230), "doce de leite": ("kcal", 306, 300),
    "acucar mascavo": (493, 150), "acucar": (494, 180), "mel": ("kcal", 309, 340),
    "farinha de trigo": (35, 120), "farinha de rosca": (34, 110), "farinha de mandioca": ("kcal", 361, 150),
    "farinha de milho": (33, 110), "fuba": (43, 120), "amido de milho": (42, 130), "maisena": (42, 130), "maizena": (42, 130),
    "polvilho": ("kcal", 351, 130), "farinha": (35, 120), "aveia": (6, 80),
    "fermento": (513, 180), "bicarbonato": ("kcal", 0, 200),
    "chocolate em po": ("kcal", 400, 90), "cacau": ("kcal", 300, 90), "achocolatado": (491, 90), "nescau": (491, 90),
    "chocolate": (498, 150), "granulado": ("kcal", 480, 150), "gelatina": (515, 200), "coco ralado": (590, 80),
    "manteiga": (261, 200), "margarina": (263, 200), "oleo": (272, 220), "azeite": ("kcal", 884, 220),
    "maionese": (524, 230), "catchup": ("kcal", 112, 260), "ketchup": ("kcal", 112, 260), "mostarda": ("kcal", 66, 250),
    "ovo": (489, None), "ovos": (489, None), "gema": ("kcal", 352, None), "clara": ("kcal", 48, None),
    "arroz": (4, 185), "feijao": (562, 180), "lentilha": ("kcal", 339, 190), "grao de bico": ("kcal", 355, 200),
    "macarrao": (40, 100), "espaguete": (40, 100), "talharim": (40, 100), "penne": (40, 100), "trigo": (35, 120),
    "molho branco": ("kcal", 110, 250), "lasanha": (40, None), "pao de forma": ("kcal", 253, None), "pao": ("kcal", 300, None),
    "biscoito": (8, 100), "bolacha": (8, 100),
    "queijo parmesao": (464, 80), "parmesao": (464, 80), "queijo ralado": (464, 80), "mussarela": (463, 120),
    "mucarela": (463, 120), "queijo": (463, 120), "presunto": (439, None), "bacon": ("kcal", 541, None),
    "calabresa": ("kcal", 310, None), "linguica": (421, None), "salsicha": ("kcal", 257, None),
    "peito de frango": ("kcal", 159, 140), "frango": ("kcal", 159, 140), "carne moida": (327, 220),
    "carne": (329, 220), "file": (329, None), "patinho": (329, None), "costela": ("kcal", 358, None),
    "carne de porco": ("kcal", 216, None), "lombo": ("kcal", 176, None), "peixe": ("kcal", 120, None),
    "atum": ("kcal", 166, None), "sardinha": ("kcal", 285, None), "camarao": ("kcal", 90, 140), "bacalhau": ("kcal", 136, None),
    "batata doce": (89, 150), "batata": (91, 150), "cenoura": ("kcal", 34, 130), "cebola": (107, 160),
    "alho": ("kcal", 113, None), "tomate": (157, 180), "extrato de tomate": (158, 260), "molho de tomate": (159, 250), "massa de tomate": (158, 260),
    "pomarola": (159, 250), "polpa de tomate": (160, 250), "passata": (160, 250),
    "pimentao": ("kcal", 21, 150), "abobrinha": ("kcal", 19, 130), "abobora": ("kcal", 40, 130),
    "brocolis": ("kcal", 25, 90), "espinafre": ("kcal", 16, 60), "milho": (45, 165), "ervilha": ("kcal", 74, 160),
    "mandioca": ("kcal", 151, 150), "aipim": ("kcal", 151, 150), "palmito": ("kcal", 26, 150),
    "cogumelo": ("kcal", 22, 90), "champignon": ("kcal", 22, 90), "azeitona": ("kcal", 137, 140),
    "banana": ("kcal", 98, 150), "maca": ("kcal", 56, 120), "morango": ("kcal", 30, 150), "abacaxi": ("kcal", 48, 165),
    "limao": ("kcal", 32, 240), "suco de limao": ("kcal", 22, 240), "laranja": ("kcal", 37, 240),
    "suco de laranja": ("kcal", 45, 240), "maracuja": ("kcal", 68, 240), "suco de maracuja": ("kcal", 68, 240),
    "uva passa": ("kcal", 299, 150), "nozes": ("kcal", 620, 100), "amendoim": ("kcal", 544, 140),
    "castanha": ("kcal", 643, 130), "coco": (590, 80), "chantilly": ("kcal", 300, 70),
    "batata palha": ("kcal", 543, 50), "caldo de carne": ("kcal", 250, None), "caldo de galinha": ("kcal", 250, None),
    "caldo de legumes": ("kcal", 250, None), "biscoito maisena": (8, 100),
    "sorvete": ("kcal", 207, 140), "gelo": ("kcal", 0, 240), "salsa": ("kcal", 33, 40), "coentro": ("kcal", 23, 40),
    "manjericao": ("kcal", 23, 40), "hortela": ("kcal", 44, 40), "alecrim": ("kcal", 0, 40), "cominho": ("kcal", 0, 100),
    "paprica": ("kcal", 0, 100), "colorau": ("kcal", 0, 100), "acafrao": ("kcal", 0, 100), "curry": ("kcal", 0, 100),
    "tempero": ("kcal", 0, 100), "glucose": ("kcal", 316, 330), "leite de vaca": ("kcal", 61, 240),
    "abacate": ("kcal", 96, 230), "manga": ("kcal", 64, 165), "pessego": ("kcal", 63, 160), "ameixa": ("kcal", 240, 150),
    "goiabada": ("kcal", 269, None), "doce de goiaba": ("kcal", 269, None), "pacoca": ("kcal", 487, None),
    "pao de queijo": ("kcal", 363, None), "pao frances": ("kcal", 300, None), "torrada": ("kcal", 377, None),
    "massa folhada": ("kcal", 390, None), "massa de pastel": ("kcal", 310, None), "massa de pizza": ("kcal", 280, None),
    "tapioca": ("kcal", 336, 150), "granola": ("kcal", 471, 100), "rapadura": ("kcal", 352, None),
    "queijo minas": (461, 120), "ricota": ("kcal", 140, 240), "catupiry": ("kcal", 257, 240),
    "peito de peru": ("kcal", 110, None), "carne seca": ("kcal", 313, 150), "file mignon": ("kcal", 143, None),
    "alcatra": ("kcal", 162, None), "picanha": ("kcal", 213, None), "coxa": ("kcal", 160, None), "sobrecoxa": ("kcal", 183, None),
    "asa": (391, None), "tilapia": ("kcal", 96, None), "salmao": ("kcal", 170, None), "lula": ("kcal", 75, None),
    "abacaxi": ("kcal", 48, 165), "melancia": ("kcal", 33, 150), "mamao": ("kcal", 40, 150), "uva": ("kcal", 53, 150),
    "kiwi": ("kcal", 51, None), "pera": ("kcal", 53, None), "chuchu": ("kcal", 17, 130), "berinjela": ("kcal", 20, 90),
    "beterraba": ("kcal", 49, 140), "repolho": ("kcal", 17, 70), "couve": ("kcal", 27, 60), "alface": ("kcal", 11, 50),
    "pepino": ("kcal", 10, 120), "quiabo": ("kcal", 30, 100), "vagem": ("kcal", 25, 110), "inhame": ("kcal", 97, 150), "creme de cebola": ("kcal", 350, None), "caldo": ("kcal", 250, None),
    "agua": ("kcal", 0, 240), "cafe": ("kcal", 2, 240), "vinho": ("kcal", 85, 240), "cerveja": ("kcal", 41, 240),
    "refrigerante": ("kcal", 40, 240), "vinagre": ("kcal", 18, 240), "molho shoyu": ("kcal", 53, 240),
    "shoyu": ("kcal", 53, 240), "molho ingles": ("kcal", 78, 240), "essencia de baunilha": ("kcal", 288, 240),
    "baunilha": ("kcal", 288, 240), "canela": ("kcal", 261, 120), "sal": ("kcal", 0, 290), "pimenta": ("kcal", 0, 100),
    "louro": ("kcal", 0, 10), "cravo": ("kcal", 0, 40), "noz moscada": ("kcal", 0, 100), "gengibre": ("kcal", 80, 100),
    "salsinha": ("kcal", 33, 40), "cheiro verde": ("kcal", 33, 40), "cebolinha": ("kcal", 20, 40), "oregano": ("kcal", 0, 40),
}
# peso de 1 unidade (quando a linha conta itens: "3 ovos", "1 cebola")
UNIDADE_G = {"abacaxi": 1000, "abacate": 400, "manga": 300, "mamao": 500, "melancia": 3000, "pera": 170,
             "kiwi": 75, "pessego": 150, "chuchu": 250, "berinjela": 250, "beterraba": 150, "pepino": 200,
             "coxa": 110, "sobrecoxa": 130, "asa": 60, "file mignon": 150, "pao frances": 50, "pao de queijo": 30,
             "tilapia": 120, "salmao": 150, "inhame": 150, "torrada": 10, "creme de leite": 200,
             "leite condensado": 395, "caldo de carne": 10, "caldo de galinha": 10, "caldo de legumes": 10, "caldo": 10,
             "coco ralado": 100, "sorvete": 60, "pomarola": 340, "extrato de tomate": 140, "gelatina": 30,
             "ovo": 50, "ovos": 50, "gema": 18, "clara": 32, "cebola": 150, "tomate": 100, "batata": 150,
             "batata doce": 200, "cenoura": 100, "alho": 5, "banana": 100, "maca": 130, "limao": 70, "laranja": 180,
             "pimentao": 150, "abobrinha": 200, "pao": 50, "pao de forma": 25, "peito de frango": 300,
             "file": 150, "salsicha": 50, "calabresa": 250, "linguica": 100, "maracuja": 100, "mandioca": 300,
             "morango": 12, "lasanha": 20, "presunto": 15, "queijo": 20, "mussarela": 20, "bacon": 10}
# medidas caseiras (g ou ml ~ g); "xícara" usa a densidade do alimento
MEDIDAS = [
    (r"kg|quilos?", "fixo", 1000), (r"g|gr|gramas?", "fixo", 1), (r"l|litros?", "fixo", 1000), (r"ml|mililitros?", "fixo", 1),
    (r"x[ií]caras?(?: \(?(?:de )?ch[aá]\)?)?|xic\.?", "xicara", 1), (r"copos?(?: americanos?)?", "xicara", 0.8),
    (r"colher(?:es)?(?: \(?de)? ?\(?sopa\)?|cs", "fixo_d", 15), (r"colher(?:es)?(?: \(?de)? ?\(?ch[aá]\)?|cc", "fixo_d", 5),
    (r"colher(?:es)?(?: \(?de)? ?\(?(?:caf[eé]|sobremesa)\)?", "fixo_d", 3), (r"colher(?:es)?", "fixo_d", 15),
    (r"latas?", "lata", 0), (r"caixas?|caixinhas?", "caixa", 0), (r"pacotes?|pct", "pacote", 0),
    (r"envelopes?|sach[eê]s?", "fixo", 12), (r"tabletes?", "tablete", 0), (r"dentes?", "fixo", 5),
    (r"fatias?", "fatia", 0), (r"pitadas?", "fixo", 0.5), (r"ma[cç]os?", "fixo", 150), (r"ramos?|raminhos?", "fixo", 10),
    (r"pedacos?|peda[cç]os?", "fixo", 50), (r"vidros?|garrafinhas?", "fixo", 200), (r"cubos?", "fixo", 10), (r"bolas?", "fixo", 60), (r"potes?", "fixo", 200),
    (r"folhas?", "fixo", 1), (r"cabe[cç]as?", "fixo", 50), (r"talos?", "fixo", 40), (r"bandejas?", "fixo", 300), (r"punhados?", "fixo", 30), (r"unidades?|un", "unidade", 0),
]
LATA = {"leite de vaca": 395, "pomarola": 340, "polpa de tomate": 340, "leite em po": 400, "achocolatado": 400, "nescau": 400, "pessego": 450, "abacaxi": 400, "leite de coco": 200,
        "leite condensado": 395, "creme de leite": 300, "milho": 200, "ervilha": 200, "atum": 120, "sardinha": 125,
        "extrato de tomate": 140, "molho de tomate": 340, "leite": 395, "palmito": 300, "cerveja": 350}
CAIXA = {"creme de leite": 200, "leite condensado": 395, "gelatina": 30, "leite": 1000, "chantilly": 200,
         "molho de tomate": 340, "creme de cebola": 70}
PACOTE = {"queijo ralado": 50, "queijo parmesao": 50, "parmesao": 50, "polvilho": 500, "farinha de trigo": 1000,
          "biscoito maisena": 200, "massa folhada": 300, "massa de pastel": 500, "granulado": 150, "batata palha": 100,
          "macarrao": 500, "lasanha": 500, "biscoito": 200, "bolacha": 200, "gelatina": 30, "fermento": 10,
          "creme de cebola": 70, "coco ralado": 100, "queijo": 500, "mussarela": 500, "presunto": 200, "bacon": 250}
TABLETE = {"caldo de carne": 10, "caldo de galinha": 10, "caldo de legumes": 10, "caldo": 10, "fermento": 15, "manteiga": 200, "margarina": 250, "chocolate": 170}
FATIA = {"queijo": 20, "mussarela": 20, "presunto": 15, "pao": 25, "pao de forma": 25, "bacon": 10}
# Grãos e massas já cozidos (absorvem água: 1/3 das calorias do cru)
COZIDO = {"arroz": (3, None), "feijao": (561, None), "lentilha": (577, None),
          "macarrao": ("kcal", 148), "espaguete": ("kcal", 148), "talharim": ("kcal", 148), "penne": ("kcal", 148)}
IGNORAR = r"\b(?:a gosto|para untar|para polvilhar|para fritar|para decorar|opcional|q\.?b\.?)\b"


FONTE = {}          # chave -> de onde veio o valor: "TACO", "IBGE" (complementos da equipe) ou "aproximado"
REFERENCIA = {}     # chave -> nome do alimento na tabela de origem

# Correspondência revisada à mão: ingrediente -> nome EXATO na TACO (4ª ed.)
MAPA_TACO = {
    "abacate": "Abacate, cru", "abacaxi": "Abacaxi, cru", "abobora": "Abóbora, pescoço, crua",
    "abobrinha": "Abobrinha, italiana, crua", "alface": "Alface, lisa, crua", "alho": "Alho, cru",
    "ameixa": "Ameixa, em calda, enlatada, drenada", "amendoim": "Amendoim, grão, cru",
    "atum": "Atum, conserva em óleo", "batata": "Batata, inglesa, crua", "azeite": "Azeite, de oliva, extra virgem", "azeitona": "Azeitona, preta, conserva",
    "bacalhau": "Bacalhau, salgado, cru", "banana": "Banana, prata, crua", "berinjela": "Berinjela, crua",
    "beterraba": "Beterraba, crua", "brocolis": "Brócolis, cru", "caldo": "Caldo de carne, tablete",
    "caldo de carne": "Caldo de carne, tablete", "caldo de galinha": "Caldo de galinha, tablete",
    "camarao": "Camarão, Rio Grande, grande, cru", "carne seca": "Carne, bovina, seca, crua",
    "castanha": "Castanha-do-Brasil, crua", "cebolinha": "Cebolinha, crua", "cenoura": "Cenoura, crua",
    "cerveja": "Cerveja, pilsen 2", "chuchu": "Chuchu, cru", "couve": "Couve, manteiga, crua",
    "doce de leite": "Doce, de leite, cremoso", "ervilha": "Ervilha, enlatada, drenada",
    "espinafre": "Espinafre, Nova Zelândia, cru", "farinha de mandioca": "Farinha, de mandioca, crua",
    "frango": "Frango, peito, sem pele, cru", "peito de frango": "Frango, peito, sem pele, cru",
    "coxa": "Frango, coxa, sem pele, crua", "sobrecoxa": "Frango, sobrecoxa, sem pele, crua",
    "grao de bico": "Grão-de-bico, cru", "inhame": "Inhame, cru", "iogurte": "Iogurte, natural",
    "kiwi": "Kiwi, cru", "laranja": "Laranja, pêra, crua", "suco de laranja": "Laranja, pêra, suco",
    "leite de coco": "Leite, de coco", "lentilha": "Lentilha, crua", "limao": "Limão, tahiti, cru",
    "suco de limao": "Limão, galego, suco", "maca": "Maçã, Argentina, com casca, crua", "mamao": "Mamão, Papaia, cru",
    "mandioca": "Mandioca, crua", "aipim": "Mandioca, crua", "manga": "Manga, Haden, crua",
    "manjericao": "Manjericão, cru", "maracuja": "Maracujá, cru", "suco de maracuja": "Maracujá, suco concentrado, envasado",
    "mel": "Mel, de abelha", "melancia": "Melancia, crua", "morango": "Morango, cru", "pacoca": "Paçoca, amendoim",
    "palmito": "Palmito, juçara, em conserva", "pao frances": "Pão, trigo, francês", "pao": "Pão, trigo, francês",
    "pao de forma": "Pão, trigo, forma, integral", "pao de queijo": "Pão, de queijo, cru", "pepino": "Pepino, cru",
    "pera": "Pêra, Park, crua", "pessego": "Pêssego, enlatado, em calda", "pimentao": "Pimentão, verde, cru",
    "polvilho": "Polvilho, doce", "quiabo": "Quiabo, cru", "rapadura": "Rapadura", "refrigerante": "Refrigerante, tipo cola",
    "repolho": "Repolho, branco, cru", "salmao": "Salmão, sem pele, fresco, cru", "salsa": "Salsa, crua",
    "salsinha": "Salsa, crua", "cheiro verde": "Salsa, crua", "sardinha": "Sardinha, conserva em óleo",
    "shoyu": "Shoyu", "molho shoyu": "Shoyu", "torrada": "Torrada, pão francês", "uva": "Uva, Rubi, crua",
    "vagem": "Vagem, crua", "requeijao": "Queijo, requeijão, cremoso", "ricota": "Queijo, ricota", "nozes": "Noz, crua",
    "picanha": "Carne, bovina, picanha, com gordura, crua", "alcatra": "Carne, bovina, miolo de alcatra, sem gordura, cru",
    "costela": "Carne, bovina, costela, crua", "carne de porco": "Porco, lombo, cru", "lombo": "Porco, lombo, cru",
    "peixe": "Pescada, filé, cru", "tilapia": "Pescada, filé, cru", "gema": "Ovo, de galinha, gema, cozida/10minutos",
    "clara": "Ovo, de galinha, clara, cozida/10minutos", "glucose": "Glicose de milho",
    "queijo minas": "Queijo, minas, frescal", "milho": "Milho, verde, enlatado, drenado", "biscoito maisena": "Biscoito, doce, maisena",
    "goiabada": "Goiaba, doce em pasta", "doce de goiaba": "Goiaba, doce em pasta",
    "file mignon": "Carne, bovina, filé mingnon, sem gordura, cru",      # (o erro "mingnon" é da própria TACO)
    "massa de pastel": "Pastel, massa, crua", "catupiry": "Queijo, requeijão, cremoso",
    "cafe": "Café, infusão 10%", "calabresa": "Lingüiça, porco, crua",
}


def carregar_complementos(arquivo):
    """complementos.csv: ingrediente,kcal_100g,alimento_na_fonte,codigo_ibge,observacao[,fonte]
    Itens que a TACO não tem. Coluna "fonte" vazia = IBGE (POF 2008-2009)."""
    c = pd.read_csv(arquivo, dtype={"codigo_ibge": "string"})
    for _, r in c.iterrows():
        chave = n(r["ingrediente"])
        dens = densidade(chave) if chave in ALIMENTOS else None
        if dens is None and chave in ("leite", "leite desnatado", "vinho", "licor", "nescafe", "cafe soluvel") or chave.startswith(("vinho", "licor")):
            dens = 240
        ALIMENTOS[chave] = ("kcal", float(r["kcal_100g"]), dens)
        fonte = r.get("fonte") if isinstance(r.get("fonte"), str) and r.get("fonte") else "IBGE"
        FONTE[chave] = fonte
        cod = f' {r["codigo_ibge"]}' if fonte == "IBGE" and pd.notna(r.get("codigo_ibge")) else ""
        REFERENCIA[chave] = f'{r["alimento_na_fonte"]} ({fonte}{cod})'
    for apelido, original in {"catchup": "ketchup", "leite de vaca": "leite"}.items():   # mesmo alimento, outro nome
        if original in ALIMENTOS and FONTE.get(original) == "IBGE":
            ALIMENTOS[apelido], FONTE[apelido], REFERENCIA[apelido] = ALIMENTOS[original], "IBGE", REFERENCIA[original]
    global _CHAVES
    _CHAVES = sorted(ALIMENTOS, key=len, reverse=True)


def carregar_taco(pasta=TACO_DIR, complementos=None):
    f = pd.read_csv(f"{pasta}/food.csv").merge(pd.read_csv(f"{pasta}/nutrients.csv"), left_on="id", right_on="foodId")
    por_nome = dict(zip(f["name"].str.strip(), f["id"]))
    nome_por_id = dict(zip(f["id"], f["name"]))
    for chave, nome_taco in MAPA_TACO.items():
        if nome_taco not in por_nome:
            raise KeyError(f"'{nome_taco}' não existe na TACO (ingrediente {chave})")
        dens = densidade(chave) if chave in ALIMENTOS else None
        ALIMENTOS[chave] = (int(por_nome[nome_taco]), dens)
    global _CHAVES
    _CHAVES = sorted(ALIMENTOS, key=len, reverse=True)
    for chave, v in ALIMENTOS.items():
        FONTE[chave] = "TACO" if v[0] != "kcal" else "aproximado"
        REFERENCIA[chave] = nome_por_id.get(v[0], "") if v[0] != "kcal" else ""
    if complementos:
        carregar_complementos(complementos)
    return dict(zip(f["id"], f["kcal"]))


def kcal_100g(chave, taco):
    v = ALIMENTOS[chave]
    if v[0] == "kcal":
        return v[1]
    k = taco.get(v[0])
    return None if k is None or pd.isna(k) else float(k)


def densidade(chave):
    v = ALIMENTOS[chave]
    return v[2] if v[0] == "kcal" else v[1]


_CHAVES = sorted(ALIMENTOS, key=len, reverse=True)


def _plural(chave):
    """'cebola' -> 'cebolas?', 'pimentao' -> 'piment(ao|oes)', 'gema de ovo' -> 'gemas? de ovos?'"""
    ps = []
    for w in chave.split():
        if w.endswith("ao"):
            ps.append(w[:-2] + "(?:ao|oes|aes)")
        elif w.endswith(("r", "z", "s")):
            ps.append(w + "(?:es)?")
        elif w.endswith("l"):
            ps.append(w[:-1] + "(?:l|is)")
        else:
            ps.append(w + "s?")
    return " ".join(ps)


def quantidade(txt):
    t = txt.replace("½", " 1/2").replace("¼", " 1/4").replace("¾", " 3/4").replace(",", ".")
    m = re.match(r"\s*(?:(\d+)/(\d+)|(\d+(?:\.\d+)?)(?:\s+(?:e\s+)?(\d+)/(\d+))?)(?:\s*(?:a|-|ou)\s*\d+(?:[./]\d+)?)?\s*", t)
    if not m:
        return None, t
    if m.group(1):
        q = float(m.group(1)) / float(m.group(2))
    else:
        q = float(m.group(3)) + (float(m.group(4)) / float(m.group(5)) if m.group(4) else 0)
    return q, t[m.end():]


def linha_kcal(linha, taco):
    """Devolve (kcal ou None, motivo). None = não entendeu a linha."""
    t = n(linha)
    if re.search(IGNORAR, t):
        return 0.0, "ignorada"
    q, resto = quantidade(t)
    chave = next((c for c in _CHAVES if re.search(rf"\b{_plural(c)}\b", resto)), None)
    if not chave:
        return None, "alimento"
    k100 = kcal_100g(chave, taco)
    if re.search(r"\bcozid", resto) and chave in COZIDO:       # "3 xícaras de arroz cozido": não é arroz cru
        v = COZIDO[chave]
        k100 = v[1] if v[0] == "kcal" else taco.get(v[0], k100)
    if k100 is None:
        return None, "sem kcal"
    if q is None:                                   # "azeite", "alho", "queijo ralado para polvilhar"
        return 10 * k100 / 100, "ok"
    resto = re.sub(r"^\(?\d+\s*(?:g|ml)\)?\s*", "", resto)          # "1 (200 g) caixa..." -> raro; simplificação
    gramas = None
    for rx, tipo, val in MEDIDAS:
        if re.match(rf"(?:{rx})\b", resto):
            if tipo == "fixo":
                gramas = q * val
            elif tipo == "fixo_d":
                d = densidade(chave) or 240
                gramas = q * val * d / 240
            elif tipo == "xicara":
                d = densidade(chave)
                gramas = q * val * (d or 150)
            else:
                tab = {"lata": LATA, "caixa": CAIXA, "pacote": PACOTE, "tablete": TABLETE, "fatia": FATIA}.get(tipo, {})
                g1 = tab.get(chave) if tipo != "unidade" else UNIDADE_G.get(chave)
                gramas = q * g1 if g1 else None
            break
    if gramas is None:
        g1 = UNIDADE_G.get(chave)                                   # "3 ovos", "1 cebola"
        gramas = q * g1 if g1 else None
    if gramas is None:
        return None, "medida"
    return gramas * k100 / 100, "ok"


def receita_kcal(linhas, porcoes, taco, cobertura_min=0.8):
    total, entendidas, contadas = 0.0, 0, 0
    for l in linhas:
        k, motivo = linha_kcal(l, taco)
        if motivo == "ignorada":
            continue
        contadas += 1
        if k is not None:
            total += k
            entendidas += 1
    cobertura = entendidas / contadas if contadas else 0
    if porcoes is None or pd.isna(porcoes) or porcoes <= 0 or cobertura < cobertura_min:
        return None, cobertura
    return round(total / porcoes), cobertura


if __name__ == "__main__":
    import argparse
    import numpy as np
    ap = argparse.ArgumentParser(description="Preenche a coluna 'calorias' (kcal por porção) das receitas.")
    ap.add_argument("--receitas", default=os.path.join(RECEITAS_DIR, "receitas_tudogostoso.parquet"))
    ap.add_argument("--taco", default=TACO_DIR, help="pasta com food.csv e nutrients.csv")
    ap.add_argument("--complementos", default=os.path.join(TACO_DIR, "complementos.csv"))
    ap.add_argument("--saida", default=os.path.join(RECEITAS_DIR, "receitas_com_calorias.parquet"))
    a = ap.parse_args()

    print("Carregando TACO e complementos...")
    taco = carregar_taco(a.taco, complementos=a.complementos if os.path.exists(a.complementos) else None)
    print(f"Lendo receitas de {a.receitas} ...")
    df = pd.read_parquet(a.receitas)
    linhas = df["ingredientes_texto"].apply(lambda x: list(x) if x is not None else [])
    kcal = [receita_kcal(l, p, taco)[0] for l, p in zip(linhas, df["porcoes"])]
    kcal = pd.Series(kcal, index=df.index, dtype="float")
    kcal[kcal > 2000] = np.nan                     # valores absurdos (porções erradas no site)
    df["calorias"] = kcal.round().astype("Int64")  # vazio quando não deu para calcular
    df.to_parquet(a.saida, index=False)
    ok = df["calorias"].notna()
    print(f"Pronto: {ok.sum()} de {len(df)} receitas com calorias ({ok.mean():.0%}), "
          f"mediana {df.loc[ok, 'calorias'].median():.0f} kcal/porção.")
    print(f"Arquivo salvo em: {a.saida}")
