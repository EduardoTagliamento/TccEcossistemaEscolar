import re
import urllib.request
import os

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "fonts")
os.makedirs(OUT_DIR, exist_ok=True)

FAMILIAS = {
    "Poppins": {"weights": ["400", "500", "600", "700", "800"], "slug": "poppins"},
    "Figtree": {"weights": ["400", "500", "600", "700"], "slug": "figtree"},
    "Baloo+2": {"weights": ["600", "700", "800"], "slug": "baloo2"},
    "JetBrains+Mono": {"weights": ["400", "500", "700"], "slug": "jetbrains-mono"},
}


def buscar_css(familia, weights):
    wght = ";".join(weights)
    url = f"https://fonts.googleapis.com/css2?family={familia}:wght@{wght}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


def extrair_latin_urls(css, weights):
    # Cada peso tem 3 blocos (devanagari/latin-ext/latin); pegamos só o bloco
    # cujo comentário é exatamente "/* latin */" e cujo font-weight bate.
    blocos = re.split(r"/\* (\w[\w-]*) \*/\n", css)
    # blocos[0] é lixo antes do primeiro comentário; depois alterna nome, conteúdo
    resultado = {}
    for i in range(1, len(blocos), 2):
        nome = blocos[i]
        conteudo = blocos[i + 1]
        if nome != "latin":
            continue
        peso_match = re.search(r"font-weight:\s*(\d+);", conteudo)
        url_match = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", conteudo)
        if peso_match and url_match:
            resultado[peso_match.group(1)] = url_match.group(1)
    faltando = [w for w in weights if w not in resultado]
    if faltando:
        raise RuntimeError(f"Pesos não encontrados: {faltando}")
    return resultado


for familia, info in FAMILIAS.items():
    print(f"=== {familia} ===")
    css = buscar_css(familia, info["weights"])
    urls_por_peso = extrair_latin_urls(css, info["weights"])
    for peso, url in urls_por_peso.items():
        destino = os.path.join(OUT_DIR, f"{info['slug']}-{peso}.woff2")
        print(f"  baixando peso {peso} -> {destino}")
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req) as resp:
            with open(destino, "wb") as f:
                f.write(resp.read())

print("Concluído.")
