"""
Sistema de Gerenciamento de Figurinhas - Copa do Mundo 2026
Aplicação para catalogar e gerenciar coleção de figurinhas em 3 álbuns físicos
Álbuns: Prata, Normal e Ouro
"""

import sys
import os

# Adicionar o diretório raiz ao path para permitir imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.gui import main

if __name__ == '__main__':
    print("🚀 Iniciando Sistema de Gerenciamento de Figurinhas...")
    print("📚 Copa do Mundo 2026")
    print("-" * 50)
    main()
