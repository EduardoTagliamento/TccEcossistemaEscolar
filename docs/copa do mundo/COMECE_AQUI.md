# 🏆 BEM-VINDO AO SISTEMA DE FIGURINHAS COPA 2026!

## ⚡ Início Rápido (3 Passos)

### 1️⃣ Execute a Aplicação
```bash
python main.py
```

### 2️⃣ Comece a Usar
- **Pesquisar**: Digite `GHA` ou `GHA01` na barra lateral
- **Ver Faltantes**: Clique nas abas 🥈 📘 🥇
- **Marcar Figurinha**: Clique em qualquer card

### 3️⃣ Aproveite! 🎉
O sistema já está populado com seus dados. Todas as alterações salvam automaticamente!

---

## 📚 Documentação Disponível

Escolha o guia adequado para você:

### 🚀 Para Começar Agora
→ **[GUIA_RAPIDO.md](GUIA_RAPIDO.md)** - Tutorial de 5 minutos

### 📖 Para Uso Completo
→ **[README.md](README.md)** - Documentação completa do sistema

### 💼 Para Casos Práticos
→ **[CASOS_DE_USO.md](CASOS_DE_USO.md)** - 10 cenários reais de uso

### 📊 Para Ver o Status
→ **[STATUS.md](STATUS.md)** - Estado atual do projeto

### 🌐 Para Migração Web
→ **[MIGRACAO_WEB.md](MIGRACAO_WEB.md)** - Roadmap para versão web

### 📋 Para Visão Executiva
→ **[SUMARIO_EXECUTIVO.md](SUMARIO_EXECUTIVO.md)** - Overview completo

---

## 🎯 Suas Estatísticas Atuais

```
🥈 Álbum PRATA:  977/994 (98.3%) - Faltam apenas 17!
📘 Álbum NORMAL: 955/994 (96.1%) - Faltam 39
🥇 Álbum OURO:   717/994 (72.1%) - Faltam 277

🏆 Completas nos 3 álbuns: 715 (71.9%)
```

---

## 🎨 Interface Visual

### Tela Principal
```
┌────────────────────────────────────────────────────────────┐
│  🏆 Copa do Mundo 2026 - Gerenciador de Figurinhas        │
│  ┌──────────┬──────────┬──────────┐                       │
│  │ 🥈 Prata │ 📘 Normal│ 🥇 Ouro  │  ← Estatísticas       │
│  │ 977/994  │ 955/994  │ 717/994  │                       │
│  └──────────┴──────────┴──────────┘                       │
├─────────────┬──────────────────────────────────────────────┤
│ 🔍 Busca   │  [🔍 Pesquisa] [🥈 Prata] [📘 Normal] [🥇 Ouro]│
│             │                                               │
│ Pesquisar: │  ┌─────┬─────┬─────┬─────┬─────┬─────┐      │
│ [GHA      ]│  │GHA01│GHA02│GHA03│GHA04│GHA05│GHA06│      │
│             │  └─────┴─────┴─────┴─────┴─────┴─────┘      │
│ Tipo:       │  ┌─────┬─────┬─────┬─────┬─────┬─────┐      │
│ [all ▼]    │  │GHA07│GHA08│GHA09│GHA10│GHA11│GHA12│      │
│             │  └─────┴─────┴─────┴─────┴─────┴─────┘      │
│ Status:     │  ┌─────┬─────┬─────┬─────┬─────┬─────┐      │
│ [all ▼]    │  │GHA13│GHA14│GHA15│GHA16│GHA17│GHA18│      │
│             │  └─────┴─────┴─────┴─────┴─────┴─────┘      │
│ [Buscar]   │  ┌─────┬─────┐                               │
│ [Limpar]   │  │GHA19│GHA20│                               │
│             │  └─────┴─────┘                               │
└─────────────┴──────────────────────────────────────────────┘
```

### Card de Figurinha
```
┌──────────┐
│  GHA01   │  ← Código da figurinha
│ ┌─┬─┬─┐ │
│ │P│N│O│ │  ← Status: P(rata), N(ormal), O(uro)
│ └─┴─┴─┘ │     Verde = Tem | Cinza = Falta
└──────────┘
   ↑
Borda Verde = Completa nos 3 álbuns
Borda Cinza = Falta em algum álbum
```

### Modal de Edição
```
┌─────────────────────────────────┐
│     Figurinha GHA01             │
│                                 │
│ Sufixo: GHA | Número: 01       │
│                                 │
│ ☑ Álbum Prata    (cinza)       │
│ ☑ Álbum Normal   (azul)        │
│ ☑ Álbum Ouro     (dourado)     │
│                                 │
│ ✅ COMPLETA NOS 3 ÁLBUNS!      │
│                                 │
│         [   Fechar   ]          │
└─────────────────────────────────┘
```

---

## 💡 Dicas Rápidas

### 🎯 Para Pesquisar
- `GHA` → Todas as 20 figurinhas de Gana
- `GHA01` → Apenas GHA01
- `FWC05` → Figurinha FWC específica
- `CC10` → Coca-Cola número 10

### 🔍 Para Filtrar
- **Tipo: FWC** → Apenas FWC (00-19)
- **Tipo: CC** → Apenas Coca-Cola (1-14)
- **Tipo: selection** → Apenas seleções
- **Status: complete** → Completas nos 3
- **Status: missing** → Faltando em algum

### 📊 Para Ver Progresso
- Veja o topo da janela para estatísticas gerais
- Clique nas abas para ver faltantes de cada álbum
- Cards com borda verde = completos!

### ✏️ Para Marcar Figurinhas
- Clique no card da figurinha
- Marque/desmarque os checkboxes
- Fecha o modal (salva automaticamente)

---

## 🎮 Atalhos e Truques

| Ação | Como Fazer |
|------|------------|
| **Buscar** | Digite e pressione Enter |
| **Abrir modal** | Clique no card |
| **Fechar modal** | Clique em Fechar ou ESC |
| **Ver seleção inteira** | Digite só o prefixo (ex: BRA) |
| **Ver faltantes** | Vá na aba do álbum |
| **Limpar busca** | Clique em "Limpar Filtros" |

---

## 🆘 Precisa de Ajuda?

### Problema: Aplicação não abre
```bash
pip install customtkinter
python main.py
```

### Problema: Erro ao buscar
- Verifique se digitou o código corretamente
- Use MAIÚSCULAS (GHA, não gha)
- Prefixo sem número mostra todos (GHA)
- Com número mostra específico (GHA01)

### Problema: Não salva
- Verifique se o arquivo `data/stickers.json` existe
- Certifique que tem permissão de escrita na pasta

---

## 📞 Recursos Disponíveis

### Testes Automatizados
```bash
python test_system.py
```
Valida que tudo está funcionando corretamente.

### Backup Manual
1. Copie `data/stickers.json`
2. Cole em local seguro
3. Para restaurar, substitua o arquivo

### Arquivo de Logs
Todas as operações são refletidas no `stickers.json`.

---

## ⚽ Estrutura das Figurinhas

### FWC (20 figurinhas)
- **00-07**: Início do álbum
- **08-19**: Final do álbum

### Seleções (48 seleções × 20 cada = 960)
48 seleções em 12 grupos de 4
Cada uma tem figurinhas de 01 a 20

### Coca-Cola (14 figurinhas)
- **CC01-CC14**: Final do álbum
- Todas estão faltando nos 3 álbuns atualmente

---

## 🏁 Comece Agora!

**1. Execute:**
```bash
python main.py
```

**2. Explore as abas para ver suas figurinhas faltantes**

**3. Use a busca para encontrar figurinhas específicas**

**4. Clique em cards para marcar como você consegue novas figurinhas**

**5. Complete sua coleção! 🏆**

---

## 🌟 Recursos Futuros

Em breve:
- 📱 Versão Web (veja MIGRACAO_WEB.md)
- 📊 Gráficos de progresso
- 🤝 Sistema de trocas
- 📈 Estatísticas avançadas

---

**Boa sorte completando seus álbuns da Copa 2026!** ⚽🏆🎉

*Sistema desenvolvido com ❤️ para colecionadores*

---

📧 Dúvidas? Consulte os arquivos de documentação listados acima!

