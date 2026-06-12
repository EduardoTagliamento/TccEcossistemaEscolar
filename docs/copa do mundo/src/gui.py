"""
Interface gráfica principal da aplicação
Usando CustomTkinter para uma aparência moderna
"""

import customtkinter as ctk
from typing import Dict, List
from src.data_manager import DataManager


class StickerModal(ctk.CTkToplevel):
    """Modal para visualizar e editar o status de uma figurinha nos 3 álbuns"""
    
    def __init__(self, parent, sticker: Dict, data_manager: DataManager, callback=None):
        super().__init__(parent)
        
        self.sticker = sticker
        self.data_manager = data_manager
        self.callback = callback
        
        # Configuração da janela
        self.title(f"Figurinha {sticker['code']}")
        self.geometry("400x300")
        self.resizable(False, False)
        
        # Centralizar na tela
        self.transient(parent)
        self.grab_set()
        
        self.setup_ui()
    
    def setup_ui(self):
        """Configura a interface do modal"""
        # Título
        title_label = ctk.CTkLabel(
            self,
            text=f"Figurinha {self.sticker['code']}",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title_label.pack(pady=20)
        
        # Informações
        info_frame = ctk.CTkFrame(self)
        info_frame.pack(pady=10, padx=20, fill="x")
        
        info_text = f"Sufixo: {self.sticker['prefix']} | Número: {self.sticker['number']:02d}"
        info_label = ctk.CTkLabel(info_frame, text=info_text)
        info_label.pack(pady=10)
        
        # Checkboxes dos álbuns
        self.checkboxes = {}
        albums = [
            ("prata", "Álbum Prata", "#C0C0C0"),
            ("normal", "Álbum Normal", "#0066CC"),
            ("ouro", "Álbum Ouro", "#FFD700")
        ]
        
        checkbox_frame = ctk.CTkFrame(self)
        checkbox_frame.pack(pady=20, padx=20, fill="both", expand=True)
        
        for album_key, album_name, color in albums:
            var = ctk.BooleanVar(value=self.sticker[album_key])
            
            checkbox = ctk.CTkCheckBox(
                checkbox_frame,
                text=album_name,
                variable=var,
                command=lambda k=album_key, v=var: self.on_checkbox_change(k, v),
                font=ctk.CTkFont(size=14),
                fg_color=color,
                hover_color=self._darken_color(color)
            )
            checkbox.pack(pady=10, padx=20, anchor="w")
            self.checkboxes[album_key] = var
        
        # Status de completude
        self.status_label = ctk.CTkLabel(
            self,
            text="",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        self.status_label.pack(pady=10)
        self.update_status_label()
        
        # Botão Fechar
        close_button = ctk.CTkButton(
            self,
            text="Fechar",
            command=self.destroy,
            width=150
        )
        close_button.pack(pady=10)
    
    def _darken_color(self, hex_color: str) -> str:
        """Escurece uma cor hexadecimal para o hover"""
        rgb = tuple(int(hex_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        darker_rgb = tuple(max(0, int(c * 0.8)) for c in rgb)
        return f"#{darker_rgb[0]:02x}{darker_rgb[1]:02x}{darker_rgb[2]:02x}"
    
    def on_checkbox_change(self, album: str, var: ctk.BooleanVar):
        """Callback quando um checkbox é alterado"""
        new_status = var.get()
        self.data_manager.update_sticker_status(self.sticker['code'], album, new_status)
        self.sticker[album] = new_status
        self.update_status_label()
        
        if self.callback:
            self.callback()
    
    def update_status_label(self):
        """Atualiza o label de status de completude"""
        is_complete = self.sticker["prata"] and self.sticker["normal"] and self.sticker["ouro"]
        
        if is_complete:
            self.status_label.configure(
                text="✅ COMPLETA NOS 3 ÁLBUNS!",
                text_color="#00CC00"
            )
        else:
            missing = []
            if not self.sticker["prata"]:
                missing.append("Prata")
            if not self.sticker["normal"]:
                missing.append("Normal")
            if not self.sticker["ouro"]:
                missing.append("Ouro")
            
            self.status_label.configure(
                text=f"Falta em: {', '.join(missing)}",
                text_color="#FF6600"
            )


class StickerCard(ctk.CTkFrame):
    """Card para exibir uma figurinha"""
    
    def __init__(self, parent, sticker: Dict, data_manager: DataManager, on_click_callback):
        super().__init__(parent, cursor="hand2")
        
        self.sticker = sticker
        self.data_manager = data_manager
        self.on_click_callback = on_click_callback
        
        self.configure(corner_radius=8, border_width=2)
        self.update_border()
        
        # Código da figurinha
        code_label = ctk.CTkLabel(
            self,
            text=sticker['code'],
            font=ctk.CTkFont(size=14, weight="bold")
        )
        code_label.pack(pady=5, padx=10)
        
        # Status nos álbuns (ícones)
        status_frame = ctk.CTkFrame(self, fg_color="transparent")
        status_frame.pack(pady=5)
        
        albums = [
            ("prata", "P", "#C0C0C0"),
            ("normal", "N", "#0066CC"),
            ("ouro", "O", "#FFD700")
        ]
        
        for album_key, letter, color in albums:
            status_indicator = ctk.CTkLabel(
                status_frame,
                text=letter,
                font=ctk.CTkFont(size=10, weight="bold"),
                width=20,
                height=20,
                fg_color=color if sticker[album_key] else "#333333",
                corner_radius=10
            )
            status_indicator.pack(side="left", padx=2)
        
        # Bind click event
        self.bind("<Button-1>", lambda e: self.on_click())
        code_label.bind("<Button-1>", lambda e: self.on_click())
    
    def update_border(self):
        """Atualiza a borda baseado no status de completude"""
        is_complete = self.sticker["prata"] and self.sticker["normal"] and self.sticker["ouro"]
        
        if is_complete:
            self.configure(border_color="#00CC00")
        else:
            self.configure(border_color="#555555")
    
    def on_click(self):
        """Callback quando o card é clicado"""
        if self.on_click_callback:
            self.on_click_callback(self.sticker)
    
    def refresh(self):
        """Atualiza a visualização do card"""
        self.update_border()


class MainApp(ctk.CTk):
    """Aplicação principal"""
    
    def __init__(self):
        super().__init__()
        
        # Configurações da janela
        self.title("Gerenciador de Figurinhas - Copa 2026")
        self.geometry("1200x800")
        
        # Tema
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        
        # Data Manager
        self.data_manager = DataManager()
        
        # Variáveis de controle
        self.current_album_filter = ctk.StringVar(value="all")
        self.current_status_filter = ctk.StringVar(value="all")
        self.current_type_filter = ctk.StringVar(value="all")
        
        self.setup_ui()
        self.update_statistics()
    
    def setup_ui(self):
        """Configura a interface principal"""
        # Header
        header_frame = ctk.CTkFrame(self, height=100)
        header_frame.pack(fill="x", padx=10, pady=10)
        header_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(
            header_frame,
            text="🏆 Copa do Mundo 2026 - Gerenciador de Figurinhas",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title_label.pack(pady=10)
        
        # Estatísticas
        self.stats_frame = ctk.CTkFrame(header_frame)
        self.stats_frame.pack(fill="x", padx=20)
        
        # Container principal
        main_container = ctk.CTkFrame(self)
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Sidebar com busca e filtros
        sidebar = ctk.CTkFrame(main_container, width=300)
        sidebar.pack(side="left", fill="y", padx=(0, 10))
        sidebar.pack_propagate(False)
        
        self.setup_sidebar(sidebar)
        
        # Área de conteúdo com abas
        content_frame = ctk.CTkFrame(main_container)
        content_frame.pack(side="left", fill="both", expand=True)
        
        self.setup_content_area(content_frame)
    
    def setup_sidebar(self, parent):
        """Configura a sidebar com busca e filtros"""
        # Título
        search_title = ctk.CTkLabel(
            parent,
            text="🔍 Busca e Filtros",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        search_title.pack(pady=20)
        
        # Campo de busca
        search_label = ctk.CTkLabel(parent, text="Pesquisar:", anchor="w")
        search_label.pack(pady=(10, 5), padx=20, fill="x")
        
        self.search_entry = ctk.CTkEntry(
            parent,
            placeholder_text="Ex: GHA, GHA01, FWC05..."
        )
        self.search_entry.pack(pady=5, padx=20, fill="x")
        self.search_entry.bind("<KeyRelease>", lambda e: self.perform_search())
        
        # Botão de busca
        search_button = ctk.CTkButton(
            parent,
            text="Buscar",
            command=self.perform_search
        )
        search_button.pack(pady=5, padx=20, fill="x")
        
        # Separador
        separator = ctk.CTkFrame(parent, height=2)
        separator.pack(fill="x", padx=20, pady=20)
        
        # Filtros
        filters_label = ctk.CTkLabel(
            parent,
            text="Filtros:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        filters_label.pack(pady=10, padx=20, anchor="w")
        
        # Filtro por tipo
        type_label = ctk.CTkLabel(parent, text="Tipo:", anchor="w")
        type_label.pack(pady=(10, 5), padx=20, fill="x")
        
        type_menu = ctk.CTkOptionMenu(
            parent,
            variable=self.current_type_filter,
            values=["all", "FWC", "selection", "CC"],
            command=lambda _: self.perform_search()
        )
        type_menu.pack(pady=5, padx=20, fill="x")
        
        # Filtro por status
        status_label = ctk.CTkLabel(parent, text="Status:", anchor="w")
        status_label.pack(pady=(10, 5), padx=20, fill="x")
        
        status_menu = ctk.CTkOptionMenu(
            parent,
            variable=self.current_status_filter,
            values=["all", "complete", "missing"],
            command=lambda _: self.perform_search()
        )
        status_menu.pack(pady=5, padx=20, fill="x")
        
        # Botão limpar filtros
        clear_button = ctk.CTkButton(
            parent,
            text="Limpar Filtros",
            command=self.clear_filters,
            fg_color="#666666",
            hover_color="#555555"
        )
        clear_button.pack(pady=20, padx=20, fill="x")
    
    def setup_content_area(self, parent):
        """Configura a área de conteúdo com abas"""
        # Tabview (abas)
        self.tabview = ctk.CTkTabview(parent)
        self.tabview.pack(fill="both", expand=True)
        
        # Criar abas
        self.tab_search = self.tabview.add("🔍 Pesquisa")
        self.tab_prata = self.tabview.add("🥈 Álbum Prata")
        self.tab_normal = self.tabview.add("📘 Álbum Normal")
        self.tab_ouro = self.tabview.add("🥇 Álbum Ouro")
        
        # Configurar cada aba
        self.setup_search_tab()
        self.setup_album_tab(self.tab_prata, "prata")
        self.setup_album_tab(self.tab_normal, "normal")
        self.setup_album_tab(self.tab_ouro, "ouro")
    
    def setup_search_tab(self):
        """Configura a aba de pesquisa"""
        # Scrollable frame para resultados
        self.search_results_frame = ctk.CTkScrollableFrame(self.tab_search)
        self.search_results_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Mensagem inicial
        initial_label = ctk.CTkLabel(
            self.search_results_frame,
            text="Use a busca na barra lateral para encontrar figurinhas",
            font=ctk.CTkFont(size=14),
            text_color="#888888"
        )
        initial_label.pack(pady=50)
    
    def setup_album_tab(self, tab, album_key: str):
        """Configura uma aba de álbum específico"""
        # Frame com estatísticas do álbum
        stats_frame = ctk.CTkFrame(tab, height=60)
        stats_frame.pack(fill="x", padx=10, pady=10)
        stats_frame.pack_propagate(False)
        
        # Scrollable frame para as figurinhas faltantes
        scroll_frame = ctk.CTkScrollableFrame(tab)
        scroll_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Armazenar referências
        setattr(self, f"{album_key}_stats_frame", stats_frame)
        setattr(self, f"{album_key}_scroll_frame", scroll_frame)
        
        # Carregar figurinhas faltantes
        self.load_album_missing(album_key)
    
    def load_album_missing(self, album_key: str):
        """Carrega as figurinhas faltantes de um álbum"""
        scroll_frame = getattr(self, f"{album_key}_scroll_frame")
        stats_frame = getattr(self, f"{album_key}_stats_frame")
        
        # Limpar frame
        for widget in scroll_frame.winfo_children():
            widget.destroy()
        for widget in stats_frame.winfo_children():
            widget.destroy()
        
        # Estatísticas
        stats = self.data_manager.get_album_statistics(album_key)
        album_info = self.data_manager.get_album_info(album_key)
        
        stats_text = f"📊 {album_info['name']}: {stats['complete']}/{stats['total']} ({stats['percentage']:.1f}%) | Faltam: {stats['missing']}"
        stats_label = ctk.CTkLabel(
            stats_frame,
            text=stats_text,
            font=ctk.CTkFont(size=14, weight="bold")
        )
        stats_label.pack(pady=15)
        
        # Agrupar figurinhas faltantes por sufixo
        grouped = self.data_manager.get_stickers_by_group(album=album_key)
        
        if not grouped:
            no_missing_label = ctk.CTkLabel(
                scroll_frame,
                text=f"🎉 Parabéns! Não falta nenhuma figurinha no álbum {album_info['name']}!",
                font=ctk.CTkFont(size=16, weight="bold"),
                text_color="#00CC00"
            )
            no_missing_label.pack(pady=50)
            return
        
        # Exibir por grupo
        for prefix, stickers in grouped.items():
            # Título do grupo
            group_title = prefix.replace("_START", " (Início)").replace("_END", " (Final)")
            group_label = ctk.CTkLabel(
                scroll_frame,
                text=f"▸ {group_title}",
                font=ctk.CTkFont(size=14, weight="bold"),
                anchor="w"
            )
            group_label.pack(pady=(15, 5), padx=10, fill="x")
            
            # Frame para os cards
            cards_frame = ctk.CTkFrame(scroll_frame)
            cards_frame.pack(fill="x", padx=10, pady=5)
            
            # Grid de cards
            for i, sticker in enumerate(stickers):
                card = StickerCard(
                    cards_frame,
                    sticker,
                    self.data_manager,
                    self.open_sticker_modal
                )
                row = i // 6
                col = i % 6
                card.grid(row=row, column=col, padx=5, pady=5, sticky="ew")
            
            # Configurar colunas
            for col in range(6):
                cards_frame.grid_columnconfigure(col, weight=1)
    
    def perform_search(self):
        """Executa a busca com os filtros aplicados"""
        query = self.search_entry.get().strip()
        
        # Preparar filtros
        filters = {}
        
        if self.current_type_filter.get() != "all":
            filters["type"] = self.current_type_filter.get()
        
        if self.current_status_filter.get() != "all":
            filters["status"] = self.current_status_filter.get()
        
        # Executar busca
        results = self.data_manager.search_stickers(query, filters if filters else None)
        
        # Exibir resultados
        self.display_search_results(results, query)
    
    def display_search_results(self, results: List[Dict], query: str):
        """Exibe os resultados da busca"""
        # Limpar resultados anteriores
        for widget in self.search_results_frame.winfo_children():
            widget.destroy()
        
        # Título dos resultados
        if query:
            result_text = f"Resultados para '{query}': {len(results)} figurinha(s)"
        else:
            result_text = f"Total: {len(results)} figurinha(s)"
        
        title_label = ctk.CTkLabel(
            self.search_results_frame,
            text=result_text,
            font=ctk.CTkFont(size=16, weight="bold")
        )
        title_label.pack(pady=10)
        
        if not results:
            no_results_label = ctk.CTkLabel(
                self.search_results_frame,
                text="Nenhuma figurinha encontrada",
                font=ctk.CTkFont(size=14),
                text_color="#888888"
            )
            no_results_label.pack(pady=50)
            return
        
        # Grid de cards
        cards_container = ctk.CTkFrame(self.search_results_frame)
        cards_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        for i, sticker in enumerate(results):
            card = StickerCard(
                cards_container,
                sticker,
                self.data_manager,
                self.open_sticker_modal
            )
            row = i // 6
            col = i % 6
            card.grid(row=row, column=col, padx=5, pady=5, sticky="ew")
        
        # Configurar colunas
        for col in range(6):
            cards_container.grid_columnconfigure(col, weight=1)
    
    def clear_filters(self):
        """Limpa todos os filtros"""
        self.search_entry.delete(0, "end")
        self.current_type_filter.set("all")
        self.current_status_filter.set("all")
        self.perform_search()
    
    def open_sticker_modal(self, sticker: Dict):
        """Abre o modal de uma figurinha"""
        modal = StickerModal(self, sticker, self.data_manager, self.on_sticker_updated)
    
    def on_sticker_updated(self):
        """Callback quando uma figurinha é atualizada"""
        # Recarregar abas de álbuns
        self.load_album_missing("prata")
        self.load_album_missing("normal")
        self.load_album_missing("ouro")
        
        # Atualizar estatísticas
        self.update_statistics()
        
        # Atualizar pesquisa se houver
        if self.search_entry.get().strip():
            self.perform_search()
    
    def update_statistics(self):
        """Atualiza as estatísticas gerais no header"""
        for widget in self.stats_frame.winfo_children():
            widget.destroy()
        
        albums = [
            ("prata", "🥈 Prata", "#C0C0C0"),
            ("normal", "📘 Normal", "#0066CC"),
            ("ouro", "🥇 Ouro", "#FFD700")
        ]
        
        for album_key, album_name, color in albums:
            stats = self.data_manager.get_album_statistics(album_key)
            
            stat_frame = ctk.CTkFrame(self.stats_frame)
            stat_frame.pack(side="left", expand=True, fill="x", padx=5)
            
            name_label = ctk.CTkLabel(
                stat_frame,
                text=album_name,
                font=ctk.CTkFont(size=12, weight="bold")
            )
            name_label.pack(pady=(5, 2))
            
            value_label = ctk.CTkLabel(
                stat_frame,
                text=f"{stats['complete']}/{stats['total']}",
                font=ctk.CTkFont(size=16, weight="bold"),
                text_color=color
            )
            value_label.pack()
            
            percent_label = ctk.CTkLabel(
                stat_frame,
                text=f"{stats['percentage']:.1f}%",
                font=ctk.CTkFont(size=10)
            )
            percent_label.pack(pady=(0, 5))


def main():
    """Função principal para iniciar a aplicação"""
    app = MainApp()
    app.mainloop()


if __name__ == "__main__":
    main()

