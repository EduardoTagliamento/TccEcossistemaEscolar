# 🏆 Sistema de Gerenciamento de Figurinhas - Copa do Mundo 2026

Sistema completo para catalogar e gerenciar sua coleção de figurinhas da Copa do Mundo 2026 em 3 álbuns físicos diferentes.

## 📋 Características

- **3 Álbuns simultâneos**: Gerencie Álbum Prata 🥈, Normal 📘 e Ouro 🥇
- **994 figurinhas**: Sistema completo com todas as figurinhas do álbum oficial
- **Busca inteligente**: Pesquise por código específico (ex: GHA01) ou sufixo completo (ex: GHA)
- **Filtros avançados**: Filtre por tipo (FWC, Seleções, Coca-Cola), status de completude
- **Visualização por álbum**: Veja quais figurinhas faltam em cada álbum, organizadas por grupo
- **Interface moderna**: Design intuitivo e bonito usando CustomTkinter
- **Edição rápida**: Modal interativo para marcar/desmarcar figurinhas em cada álbum

## 🎯 Estrutura das Figurinhas

### Total: 994 figurinhas

1. **FWC (00-19)**: 20 figurinhas especiais
   - 00-07: Início do álbum
   - 08-19: Final do álbum (antes das Coca-Cola)

2. **Seleções (48 seleções × 20 figurinhas)**: 960 figurinhas
   - Organizadas em 12 grupos de 4 seleções cada
   - Cada seleção tem numeração de 01 a 20

3. **Coca-Cola CC (1-14)**: 14 figurinhas
   - Final do álbum

## 🚀 Como Usar

### Instalação

```bash
# Clonar ou baixar o projeto
cd "F:\Area de Trabalho\copa do mundo"

# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python main.py
```

### Funcionalidades Principais

#### 1. Pesquisa de Figurinhas 🔍
- Digite o código completo (ex: `GHA01`, `FWC05`) para encontrar uma figurinha específica
- Digite apenas o sufixo (ex: `GHA`, `BRA`) para ver todas as 20 figurinhas daquela seleção
- Use filtros para refinar sua busca:
  - **Tipo**: FWC, Seleções ou Coca-Cola
  - **Status**: Completas (nos 3 álbuns) ou Faltando

#### 2. Visualização por Álbum 📚
Cada álbum tem sua própria aba mostrando:
- Estatísticas de completude
- Figurinhas faltantes organizadas por grupo
- Percentual de conclusão

**Cores dos Álbuns:**
- 🥈 **Prata**: Cinza (#C0C0C0)
- 📘 **Normal**: Azul (#0066CC)
- 🥇 **Ouro**: Dourado (#FFD700)

#### 3. Edição de Status ✏️
Clique em qualquer figurinha para abrir o modal de edição:
- Visualize o status em cada um dos 3 álbuns
- Marque/desmarque checkboxes para atualizar
- Sistema salva automaticamente no JSON
- Borda verde indica figurinha completa nos 3 álbuns

#### 4. Indicadores Visuais 🎨
Cada card de figurinha mostra:
- **Código** da figurinha
- **Status nos 3 álbuns** (P/N/O com cores correspondentes)
- **Borda verde**: Completa nos 3 álbuns
- **Borda cinza**: Ainda falta em algum álbum

## 📁 Estrutura do Projeto

```
copa do mundo/
│
├── data/
│   └── stickers.json          # Base de dados (gerada automaticamente)
│
├── src/
│   ├── __init__.py
│   ├── data_manager.py        # Gerenciamento de dados e JSON
│   └── gui.py                 # Interface gráfica principal
│
├── main.py                    # Ponto de entrada da aplicação
├── generate_initial_data.py   # Script para gerar JSON inicial
├── requirements.txt           # Dependências
└── README.md                  # Este arquivo

```

## 🗂️ Grupos e Seleções

### Grupo 1
MEX (México), RSA (África do Sul), KOR (Coreia do Sul), CZE (República Tcheca)

### Grupo 2
CAN (Canadá), BIH (Bósnia), QAT (Catar), SUI (Suíça)

### Grupo 3
BRA (Brasil), MAR (Marrocos), HAI (Haiti), SCO (Escócia)

### Grupo 4
USA (Estados Unidos), PAR (Paraguai), AUS (Austrália), TUR (Turquia)

### Grupo 5
GER (Alemanha), CUW (Curaçao), CIV (Costa do Marfim), ECU (Equador)

### Grupo 6
NED (Holanda), JPN (Japão), SWE (Suécia), TUN (Tunísia)

### Grupo 7
BEL (Bélgica), EGY (Egito), IRN (Irã), NZL (Nova Zelândia)

### Grupo 8
ESP (Espanha), CPV (Cabo Verde), KSA (Arábia Saudita), URU (Uruguai)

### Grupo 9
FRA (França), SEN (Senegal), IRQ (Iraque), NOR (Noruega)

### Grupo 10
ARG (Argentina), ALG (Argélia), AUT (Áustria), JOR (Jordânia)

### Grupo 11
POR (Portugal), COD (Congo), UZB (Uzbequistão), COL (Colômbia)

### Grupo 12
ENG (Inglaterra), CRO (Croácia), GHA (Gana), PAN (Panamá)

## 💾 Formato de Dados (JSON)

```json
{
  "meta": {
    "total_stickers": 994,
    "version": "1.0",
    "albums": {
      "prata": {"name": "Prata", "color": "#C0C0C0"},
      "normal": {"name": "Normal", "color": "#0066CC"},
      "ouro": {"name": "Ouro", "color": "#FFD700"}
    }
  },
  "stickers": [
    {
      "id": 1,
      "prefix": "FWC",
      "number": 0,
      "code": "FWC00",
      "prata": true,
      "normal": true,
      "ouro": true
    }
    // ... mais 993 figurinhas
  ]
}
```

## 🔄 Próximos Passos (Migração para Web)

O código está estruturado pensando em facilitar a futura migração para um site:

1. **Backend**: Criar API REST com Flask/FastAPI
   - Usar `data_manager.py` como base
   - Migrar JSON para banco de dados (SQLite, PostgreSQL)
   
2. **Frontend**: Desenvolver interface web
   - HTML/CSS/JavaScript
   - React ou Vue.js para interatividade
   - Manter o mesmo design e fluxo da interface atual

3. **Recursos adicionais**:
   - Sistema de login/usuários
   - Múltiplas coleções
   - Sistema de troca entre usuários
   - Estatísticas avançadas
   - Backup na nuvem

## 📊 Estatísticas Iniciais

Baseado nos dados fornecidos:

- **Álbum Prata**: 977/994 (98.3%) ✨
- **Álbum Normal**: 955/994 (96.1%) 📘
- **Álbum Ouro**: 717/994 (72.1%) 🥇

## 🛠️ Tecnologias Utilizadas

- **Python 3.x**
- **CustomTkinter**: Interface gráfica moderna
- **JSON**: Armazenamento de dados
- **Tkinter**: Base para interface gráfica

## 📝 Licença

Projeto pessoal para gerenciamento de coleção de figurinhas.

---

**Desenvolvido com ⚽ para a Copa do Mundo 2026**

