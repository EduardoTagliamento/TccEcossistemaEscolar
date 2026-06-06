"""
Script temporário para gerar o JSON inicial com todas as figurinhas
baseado nas listas de faltantes fornecidas
"""

import json

# Definir os sufixos na ordem correta
PREFIXES = [
    # Grupo 1
    "MEX", "RSA", "KOR", "CZE",
    # Grupo 2
    "CAN", "BIH", "QAT", "SUI",
    # Grupo 3
    "BRA", "MAR", "HAI", "SCO",
    # Grupo 4
    "USA", "PAR", "AUS", "TUR",
    # Grupo 5
    "GER", "CUW", "CIV", "ECU",
    # Grupo 6
    "NED", "JPN", "SWE", "TUN",
    # Grupo 7
    "BEL", "EGY", "IRN", "NZL",
    # Grupo 8
    "ESP", "CPV", "KSA", "URU",
    # Grupo 9
    "FRA", "SEN", "IRQ", "NOR",
    # Grupo 10
    "ARG", "ALG", "AUT", "JOR",
    # Grupo 11
    "POR", "COD", "UZB", "COL",
    # Grupo 12
    "ENG", "CRO", "GHA", "PAN"
]

# Figurinhas faltantes por álbum
MISSING_PRATA = {
    "TUR": [4],
    "TUN": [19],
    "IRQ": [9]
}

MISSING_NORMAL = {
    "FWC": [7],
    "MEX": [11],
    "CZE": [1, 2, 13],
    "CAN": [13, 14],
    "BRA": [7, 17],
    "MAR": [12],
    "USA": [1, 8],
    "AUS": [6],
    "SWE": [1],
    "TUN": [4, 8],
    "BEL": [14, 18],
    "URU": [1],
    "FRA": [8],
    "IRQ": [9],
    "NOR": [1],
    "COL": [17],
    "ENG": [8],
    "CRO": [5]
}

MISSING_OURO = {
    "FWC": [5, 7, 17, 19],
    "MEX": [3, 7, 9, 11, 17],
    "KOR": [4, 9, 18],
    "CZE": [1, 2, 3, 13, 14],
    "CAN": [2, 4, 13, 14],
    "BIH": [1, 4],
    "QAT": [7],
    "SUI": [1, 4, 12, 19, 20],
    "BRA": [1, 2, 3, 9, 10, 15, 17],
    "MAR": [1, 12, 14, 17, 18],
    "HAI": [3, 20],
    "SCO": [4, 16],
    "USA": [1, 8, 9, 10, 13],
    "PAR": list(range(1, 21)),  # COMPLETO (todas faltam = todas presentes invertido)
    "AUS": [6],
    "TUR": [1, 4, 8, 13, 20],
    "GER": list(range(1, 21)),  # COMPLETO
    "CUW": [1, 3, 5, 13, 18, 20],
    "CIV": [1, 9, 17],
    "ECU": [4, 5],
    "NED": [1, 10, 15, 17, 19],
    "JPN": [4, 6, 10, 20],
    "SWE": [1, 6, 13, 17],
    "TUN": [4, 8],
    "BEL": [1, 2, 5, 14, 18, 20],
    "EGY": [4, 6, 10, 15],
    "IRN": [2, 3, 13],
    "NZL": list(range(1, 21)),  # COMPLETO
    "ESP": [13, 16, 17, 20],
    "CPV": [4, 8, 13, 14],
    "KSA": [3, 6, 7, 11],
    "URU": [1],
    "FRA": [2, 4, 8, 9],
    "SEN": [7, 12],
    "IRQ": [3, 9, 11, 12, 16, 17],
    "NOR": [1, 6, 7, 15, 19],
    "ALG": list(range(1, 21)),  # COMPLETO
    "ARG": [9, 11, 19],
    "AUT": [1, 11],
    "JOR": [5, 6, 10, 15],
    "POR": [1, 2, 9, 14],
    "COD": [1, 3, 5, 14, 18],
    "UZB": list(range(1, 21)),  # COMPLETO
    "COL": [1, 6, 8, 11, 12, 13, 15, 17, 20],
    "ENG": [8, 10],
    "CRO": [5, 9, 12, 14],
    "GHA": [3, 5, 10],
    "PAN": [10, 16]
}

def generate_stickers_data():
    """Gera a lista completa de figurinhas com seus estados"""
    stickers = []
    sticker_id = 1
    
    # FWC 00-07 (início do álbum)
    for num in range(0, 8):
        code = f"FWC{num:02d}"
        stickers.append({
            "id": sticker_id,
            "prefix": "FWC",
            "number": num,
            "code": code,
            "prata": num not in MISSING_PRATA.get("FWC", []),
            "normal": num not in MISSING_NORMAL.get("FWC", []),
            "ouro": num not in MISSING_OURO.get("FWC", [])
        })
        sticker_id += 1
    
    # Seleções (48 seleções x 20 figurinhas cada)
    for prefix in PREFIXES:
        for num in range(1, 21):
            code = f"{prefix}{num:02d}"
            stickers.append({
                "id": sticker_id,
                "prefix": prefix,
                "number": num,
                "code": code,
                "prata": num not in MISSING_PRATA.get(prefix, []),
                "normal": num not in MISSING_NORMAL.get(prefix, []),
                "ouro": num not in MISSING_OURO.get(prefix, [])
            })
            sticker_id += 1
    
    # FWC 08-19 (final do álbum, antes do CC)
    for num in range(8, 20):
        code = f"FWC{num:02d}"
        stickers.append({
            "id": sticker_id,
            "prefix": "FWC",
            "number": num,
            "code": code,
            "prata": num not in MISSING_PRATA.get("FWC", []),
            "normal": num not in MISSING_NORMAL.get("FWC", []),
            "ouro": num not in MISSING_OURO.get("FWC", [])
        })
        sticker_id += 1
    
    # CC 1-14 (Coca Cola - TODAS FALTAM nos 3 álbuns)
    for num in range(1, 15):
        code = f"CC{num:02d}"
        stickers.append({
            "id": sticker_id,
            "prefix": "CC",
            "number": num,
            "code": code,
            "prata": False,
            "normal": False,
            "ouro": False
        })
        sticker_id += 1
    
    return stickers

def main():
    stickers = generate_stickers_data()
    
    data = {
        "meta": {
            "total_stickers": len(stickers),
            "version": "1.0",
            "albums": {
                "prata": {"name": "Prata", "color": "#C0C0C0"},
                "normal": {"name": "Normal", "color": "#0066CC"},
                "ouro": {"name": "Ouro", "color": "#FFD700"}
            }
        },
        "stickers": stickers
    }
    
    # Salvar JSON
    with open("data/stickers.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Estatísticas
    prata_complete = sum(1 for s in stickers if s["prata"])
    normal_complete = sum(1 for s in stickers if s["normal"])
    ouro_complete = sum(1 for s in stickers if s["ouro"])
    
    print(f"✅ JSON gerado com sucesso!")
    print(f"📊 Total de figurinhas: {len(stickers)}")
    print(f"\n📈 Estatísticas iniciais:")
    print(f"   Prata: {prata_complete}/{len(stickers)} ({prata_complete/len(stickers)*100:.1f}%)")
    print(f"   Normal: {normal_complete}/{len(stickers)} ({normal_complete/len(stickers)*100:.1f}%)")
    print(f"   Ouro: {ouro_complete}/{len(stickers)} ({ouro_complete/len(stickers)*100:.1f}%)")

if __name__ == "__main__":
    main()

