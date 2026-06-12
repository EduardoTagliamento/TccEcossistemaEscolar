# 🚀 Guia Rápido de Uso

## Iniciando a Aplicação

```bash
python main.py
```

## Principais Funcionalidades

### 1️⃣ Pesquisar Figurinhas

**Na barra lateral esquerda:**

- Digite `GHA` para ver todas as 20 figurinhas de Gana
- Digite `GHA01` ou `GHA1` para ver apenas a figurinha específica
- Digite `FWC05` para buscar uma figurinha FWC específica
- Digite `CC10` para buscar uma Coca-Cola específica

### 2️⃣ Usar Filtros

**Combine filtros para refinar sua busca:**

- **Tipo**: 
  - `all` - Todas as figurinhas
  - `FWC` - Apenas figurinhas FWC (00-19)
  - `selection` - Apenas seleções
  - `CC` - Apenas Coca-Cola (1-14)

- **Status**:
  - `all` - Todas as figurinhas
  - `complete` - Apenas figurinhas completas nos 3 álbuns (borda verde)
  - `missing` - Figurinhas faltando em pelo menos 1 álbum

### 3️⃣ Visualizar Álbuns

**Clique nas abas superiores:**

- 🥈 **Álbum Prata** - Veja o que falta no álbum prata
- 📘 **Álbum Normal** - Veja o que falta no álbum normal (azul)
- 🥇 **Álbum Ouro** - Veja o que falta no álbum dourado

Cada aba mostra:
- Estatísticas de completude no topo
- Figurinhas faltantes organizadas por grupo/seleção
- Clique em qualquer figurinha para editar

### 4️⃣ Marcar/Desmarcar Figurinhas

**Clique em qualquer card de figurinha:**

1. Abre um modal com detalhes
2. Use os checkboxes para marcar/desmarcar em cada álbum:
   - ☑️ Marcado = Você TEM essa figurinha naquele álbum
   - ☐ Desmarcado = Você NÃO TEM (está faltando)
3. As alterações são salvas automaticamente
4. Quando completa nos 3 álbuns, aparece ✅ "COMPLETA NOS 3 ÁLBUNS!"

### 5️⃣ Entender os Indicadores Visuais

**No card de cada figurinha:**

- **P** (Prata/Cinza) - Status no álbum Prata
- **N** (Azul) - Status no álbum Normal
- **O** (Dourado) - Status no álbum Ouro

**Cores dos indicadores:**
- 🟢 Colorido = Você TEM naquele álbum
- ⚫ Cinza escuro = Está FALTANDO

**Borda do card:**
- 🟢 **Verde** = Completa nos 3 álbuns
- ⚪ **Cinza** = Falta em pelo menos 1 álbum

### 6️⃣ Ver Estatísticas Gerais

**No topo da janela, há um resumo:**

```
🥈 Prata          📘 Normal         🥇 Ouro
977/994           955/994           717/994
98.3%             96.1%             72.1%
```

Isso mostra quantas figurinhas você tem em cada álbum e o percentual de conclusão.

## 💡 Dicas Úteis

### Busca Rápida de Figurinhas Faltantes

1. Vá para a aba do álbum que você quer completar
2. As figurinhas faltantes aparecem agrupadas por seleção
3. Clique e marque conforme conseguir novas figurinhas

### Completar Seleções Inteiras

1. Pesquise a seleção (ex: `BRA`)
2. Veja todas as 20 figurinhas de uma vez
3. Identifique rapidamente quais faltam em cada álbum

### Priorizar Figurinhas Difíceis

1. Use o filtro **Status: missing**
2. Veja todas as figurinhas que ainda faltam em algum álbum
3. Foque nas que faltam em múltiplos álbuns

### Celebrar Conquistas

1. Use o filtro **Status: complete**
2. Veja todas as figurinhas que você completou nos 3 álbuns
3. Cards com borda verde = vitória! 🎉

## 📱 Atalhos de Teclado

- **Enter** na busca = Executar busca
- **Clicar** em figurinha = Abrir modal
- **Esc** no modal = Fechar

## 🔄 Backup dos Dados

Seus dados ficam salvos em: `data/stickers.json`

**Para fazer backup:**
1. Copie o arquivo `data/stickers.json` para um local seguro
2. Para restaurar, substitua o arquivo pelo backup

## ❓ Solução de Problemas

### Aplicação não abre
```bash
# Reinstale as dependências
pip install -r requirements.txt

# Execute novamente
python main.py
```

### Dados não salvam
- Verifique se o arquivo `data/stickers.json` existe
- Certifique-se de ter permissão de escrita na pasta

### Estatísticas desatualizadas
- Feche e reabra a aplicação
- Os dados são recarregados a cada início

---

**Divirta-se completando sua coleção! ⚽🏆**

