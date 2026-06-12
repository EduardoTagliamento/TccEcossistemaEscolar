"""
Módulo de gerenciamento de dados das figurinhas
Responsável por carregar, salvar e manipular o JSON
"""

import json
import os
from typing import List, Dict, Optional


class DataManager:
    """Gerencia os dados das figurinhas e operações CRUD"""
    
    def __init__(self, data_path: str = "data/stickers.json"):
        self.data_path = data_path
        self.data = None
        self.stickers = []
        self.load_data()
    
    def load_data(self) -> None:
        """Carrega os dados do arquivo JSON"""
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Arquivo de dados não encontrado: {self.data_path}")
        
        with open(self.data_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
            self.stickers = self.data.get("stickers", [])
    
    def save_data(self) -> None:
        """Salva os dados no arquivo JSON"""
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
    
    def get_all_stickers(self) -> List[Dict]:
        """Retorna todas as figurinhas"""
        return self.stickers
    
    def get_sticker_by_code(self, code: str) -> Optional[Dict]:
        """Busca uma figurinha pelo código (ex: GHA01, FWC05)"""
        code = code.upper()
        for sticker in self.stickers:
            if sticker["code"] == code:
                return sticker
        return None
    
    def get_stickers_by_prefix(self, prefix: str) -> List[Dict]:
        """Busca todas as figurinhas de um sufixo (ex: GHA)"""
        prefix = prefix.upper()
        return [s for s in self.stickers if s["prefix"] == prefix]
    
    def update_sticker_status(self, code: str, album: str, status: bool) -> bool:
        """
        Atualiza o status de uma figurinha em um álbum específico
        
        Args:
            code: Código da figurinha (ex: GHA01)
            album: Nome do álbum (prata, normal, ouro)
            status: True se tem, False se falta
        
        Returns:
            True se atualizado com sucesso, False caso contrário
        """
        sticker = self.get_sticker_by_code(code)
        if sticker and album in ["prata", "normal", "ouro"]:
            sticker[album] = status
            self.save_data()
            return True
        return False
    
    def is_sticker_complete(self, code: str) -> bool:
        """Verifica se uma figurinha está completa nos 3 álbuns"""
        sticker = self.get_sticker_by_code(code)
        if sticker:
            return sticker["prata"] and sticker["normal"] and sticker["ouro"]
        return False
    
    def get_album_statistics(self, album: str) -> Dict:
        """
        Retorna estatísticas de um álbum específico
        
        Returns:
            Dict com total, completas, faltantes e percentual
        """
        if album not in ["prata", "normal", "ouro"]:
            return {}
        
        total = len(self.stickers)
        complete = sum(1 for s in self.stickers if s[album])
        missing = total - complete
        percentage = (complete / total * 100) if total > 0 else 0
        
        return {
            "total": total,
            "complete": complete,
            "missing": missing,
            "percentage": percentage
        }
    
    def get_missing_stickers(self, album: str) -> List[Dict]:
        """Retorna lista de figurinhas faltantes em um álbum"""
        if album not in ["prata", "normal", "ouro"]:
            return []
        
        return [s for s in self.stickers if not s[album]]
    
    def get_stickers_by_group(self, album: str = None) -> Dict[str, List[Dict]]:
        """
        Retorna figurinhas agrupadas por sufixo na ordem correta do álbum
        
        Args:
            album: Se especificado, filtra apenas as faltantes daquele álbum
        
        Returns:
            Dict com sufixo como chave e lista de figurinhas como valor
        """
        # Ordem correta dos sufixos no álbum
        order = ["FWC_START"] + [
            "MEX", "RSA", "KOR", "CZE",
            "CAN", "BIH", "QAT", "SUI",
            "BRA", "MAR", "HAI", "SCO",
            "USA", "PAR", "AUS", "TUR",
            "GER", "CUW", "CIV", "ECU",
            "NED", "JPN", "SWE", "TUN",
            "BEL", "EGY", "IRN", "NZL",
            "ESP", "CPV", "KSA", "URU",
            "FRA", "SEN", "IRQ", "NOR",
            "ARG", "ALG", "AUT", "JOR",
            "POR", "COD", "UZB", "COL",
            "ENG", "CRO", "GHA", "PAN"
        ] + ["FWC_END", "CC"]
        
        grouped = {}
        
        for sticker in self.stickers:
            prefix = sticker["prefix"]
            
            # Separa FWC em início (00-07) e fim (08-19)
            if prefix == "FWC":
                if sticker["number"] < 8:
                    key = "FWC_START"
                else:
                    key = "FWC_END"
            else:
                key = prefix
            
            # Filtra por álbum se especificado
            if album and sticker[album]:
                continue  # Pula se já tem no álbum
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(sticker)
        
        # Ordena cada grupo por número
        for key in grouped:
            grouped[key].sort(key=lambda x: x["number"])
        
        # Retorna na ordem correta
        ordered_grouped = {}
        for key in order:
            if key in grouped and grouped[key]:
                ordered_grouped[key] = grouped[key]
        
        return ordered_grouped
    
    def get_album_info(self, album: str) -> Dict:
        """Retorna informações sobre um álbum"""
        albums_info = self.data.get("meta", {}).get("albums", {})
        return albums_info.get(album, {})
    
    def search_stickers(self, query: str, filters: Dict = None) -> List[Dict]:
        """
        Busca figurinhas com filtros avançados
        
        Args:
            query: Termo de busca (código ou prefixo)
            filters: Dict com filtros opcionais:
                - album: filtrar por álbum específico (prata/normal/ouro)
                - status: 'complete' (tem nos 3), 'missing' (falta em algum), 'has' (tem no álbum), 'missing_album' (falta no álbum)
                - type: 'FWC', 'selection', 'CC'
        
        Returns:
            Lista de figurinhas que correspondem à busca
        """
        query = query.upper().strip()
        results = []
        
        # Busca por código exato ou prefixo
        if query:
            # Tenta busca exata primeiro
            exact_match = self.get_sticker_by_code(query)
            if exact_match:
                results = [exact_match]
            else:
                # Busca por prefixo
                results = self.get_stickers_by_prefix(query)
        else:
            results = self.stickers.copy()
        
        # Aplica filtros
        if filters:
            # Filtro por tipo
            if filters.get("type"):
                type_filter = filters["type"]
                if type_filter == "FWC":
                    results = [s for s in results if s["prefix"] == "FWC"]
                elif type_filter == "CC":
                    results = [s for s in results if s["prefix"] == "CC"]
                elif type_filter == "selection":
                    results = [s for s in results if s["prefix"] not in ["FWC", "CC"]]
            
            # Filtro por status
            if filters.get("status"):
                status = filters["status"]
                album = filters.get("album", "prata")
                
                if status == "complete":
                    results = [s for s in results if s["prata"] and s["normal"] and s["ouro"]]
                elif status == "missing":
                    results = [s for s in results if not (s["prata"] and s["normal"] and s["ouro"])]
                elif status == "has" and album:
                    results = [s for s in results if s[album]]
                elif status == "missing_album" and album:
                    results = [s for s in results if not s[album]]
        
        return results

