"""
Script de teste para validar o funcionamento do DataManager
"""

from src.data_manager import DataManager

def test_data_manager():
    print("🧪 Testando DataManager...\n")
    
    # Inicializar
    dm = DataManager()
    print(f"✅ DataManager inicializado")
    print(f"   Total de figurinhas: {len(dm.get_all_stickers())}\n")
    
    # Teste 1: Buscar por código exato
    print("📋 Teste 1: Buscar figurinha GHA01")
    sticker = dm.get_sticker_by_code("GHA01")
    if sticker:
        print(f"   ✅ Encontrada: {sticker['code']}")
        print(f"      Prata: {sticker['prata']}, Normal: {sticker['normal']}, Ouro: {sticker['ouro']}")
    else:
        print("   ❌ Não encontrada")
    print()
    
    # Teste 2: Buscar por prefixo
    print("📋 Teste 2: Buscar todas as figurinhas de Gana (GHA)")
    gha_stickers = dm.get_stickers_by_prefix("GHA")
    print(f"   ✅ Encontradas: {len(gha_stickers)} figurinhas")
    for s in gha_stickers[:3]:
        print(f"      - {s['code']}")
    print()
    
    # Teste 3: Estatísticas por álbum
    print("📊 Teste 3: Estatísticas dos álbuns")
    for album in ["prata", "normal", "ouro"]:
        stats = dm.get_album_statistics(album)
        print(f"   {album.capitalize()}: {stats['complete']}/{stats['total']} ({stats['percentage']:.1f}%)")
    print()
    
    # Teste 4: Figurinhas faltantes
    print("📋 Teste 4: Primeiras figurinhas faltantes no álbum Normal")
    missing = dm.get_missing_stickers("normal")
    print(f"   ✅ Total faltando: {len(missing)}")
    for s in missing[:5]:
        print(f"      - {s['code']}")
    print()
    
    # Teste 5: Busca com filtros
    print("📋 Teste 5: Buscar figurinhas FWC faltando no álbum Ouro")
    results = dm.search_stickers("", {"type": "FWC", "album": "ouro", "status": "missing_album"})
    print(f"   ✅ Encontradas: {len(results)} figurinhas")
    for s in results[:5]:
        print(f"      - {s['code']}")
    print()
    
    # Teste 6: Figurinhas completas nos 3 álbuns
    print("📋 Teste 6: Figurinhas completas nos 3 álbuns")
    complete = [s for s in dm.get_all_stickers() if dm.is_sticker_complete(s['code'])]
    print(f"   ✅ Total completas: {len(complete)}")
    print()
    
    print("✅ Todos os testes concluídos com sucesso!")

if __name__ == "__main__":
    test_data_manager()

