# 💼 Casos de Uso Práticos

Exemplos reais de como usar o sistema no dia a dia para gerenciar sua coleção.

---

## 📖 Cenário 1: Acabei de Abrir um Pacote Novo

Você comprou pacotes novos e quer catalogar rapidamente as figurinhas repetidas.

### Passo a Passo:

1. **Abra a aplicação**
   ```bash
   python main.py
   ```

2. **Para cada figurinha do pacote:**
   - Digite o código na busca (ex: `BRA05`)
   - Clique na figurinha que aparecer
   - Marque os checkboxes nos álbuns onde você VAI colar
   - Feche o modal (salva automaticamente)

3. **Dica Rápida:**
   - Se a figurinha é repetida e você já tem nos 3 álbuns, ela ficará com borda verde ✅
   - Se ainda falta em algum álbum, a borda fica cinza

---

## 📖 Cenário 2: Organizar uma Sessão de Trocas

Você vai se encontrar com amigos para trocar figurinhas.

### Antes do Encontro:

1. **Veja o que você precisa:**
   - Vá nas abas de cada álbum (🥈 🥇 📘)
   - Anote as figurinhas faltantes por seleção
   - Ou tire prints das telas para mostrar aos amigos

2. **Use filtros para priorizar:**
   ```
   Filtro: Status = "missing"
   Tipo = "all"
   ```
   - Mostra todas que faltam em pelo menos 1 álbum
   - Foque nas que aparecem com menos ícones coloridos

3. **Crie uma lista de prioridades:**
   - Olhe o álbum OURO primeiro (tem mais faltantes)
   - Depois NORMAL
   - Por último PRATA (já está quase completo)

### Durante a Troca:

1. **Para verificar se precisa de uma figurinha:**
   - Digite o código na busca rápida
   - Veja instantaneamente o status nos 3 álbuns

2. **Após conseguir figurinha:**
   - Clique no card
   - Marque no(s) álbum(s) onde vai colar
   - Sistema atualiza estatísticas automaticamente

---

## 📖 Cenário 3: Completar uma Seleção Específica

Você está focado em completar todas as figurinhas do Brasil nos 3 álbuns.

### Passo a Passo:

1. **Pesquisar seleção:**
   ```
   Digite: BRA
   ```

2. **Análise visual:**
   - Verá todas as 20 figurinhas: BRA01 até BRA20
   - Ícones P/N/O mostram status em cada álbum
   - Borda verde = já tem nos 3 álbuns ✅

3. **Identificar faltantes:**
   - Figurinhas sem borda verde = falta em algum álbum
   - Olhe os ícones: cinza escuro = falta naquele álbum

4. **Exemplo do que você pode ver:**
   ```
   BRA01 - [P] [N] [O] ✅ Verde = Completa!
   BRA07 - [P] [■] [O] ⚪ Cinza = Falta no Normal
   BRA17 - [P] [■] [■] ⚪ Cinza = Falta em 2 álbuns
   ```

5. **Foque nas incompletas:**
   - Peça essas específicas em trocas
   - Procure em novos pacotes

---

## 📖 Cenário 4: Verificar Progresso Geral

É domingo à tarde e você quer ver como está sua coleção.

### Dashboard Principal:

1. **Ao abrir, veja o topo:**
   ```
   🥈 Prata: 977/994 (98.3%)
   📘 Normal: 955/994 (96.1%)
   🥇 Ouro: 717/994 (72.1%)
   ```

2. **Interpretação:**
   - **Prata quase completo!** Só 17 faltando
   - **Normal indo bem** - 39 faltantes
   - **Ouro precisa de atenção** - 277 faltantes

3. **Estratégia:**
   - Completar PRATA primeiro (mais perto do objetivo)
   - Focar em conseguir figurinhas para OURO

### Ver Detalhes por Álbum:

1. **Clicar na aba 🥈 Prata:**
   - Vê exatamente quais 17 faltam
   - Organizadas por seleção
   - Anota para procurar

2. **Exemplo do que aparece:**
   ```
   ▸ TUR
     TUR04
   
   ▸ TUN
     TUN19
   
   ▸ IRQ
     IRQ09
   ```

---

## 📖 Cenário 5: Encontrou uma Figurinha Difícil!

Finalmente conseguiu aquela figurinha que faltava em todos os 3 álbuns!

### Celebrar a Conquista:

1. **Buscar a figurinha:**
   ```
   Digite: TUR04
   ```

2. **Modal aparece mostrando:**
   ```
   Figurinha TUR04
   Sufixo: TUR | Número: 04
   
   ☐ Álbum Prata
   ☐ Álbum Normal  
   ☐ Álbum Ouro
   
   Falta em: Prata, Normal, Ouro
   ```

3. **Marcar nos 3 álbuns:**
   - Click ✅ em todos os checkboxes
   - Aparece: **✅ COMPLETA NOS 3 ÁLBUNS!**
   - Sistema salva automaticamente

4. **Resultado:**
   - Card da TUR04 agora tem borda verde
   - Estatísticas atualizadas automaticamente
   - Desaparece da lista de faltantes

---

## 📖 Cenário 6: Preparar Relatório para Grupo de WhatsApp

Você quer compartilhar o que falta com o grupo de trocas.

### Opção 1: Print das Abas

1. **Ir em cada aba:**
   - 🥈 Prata → Print
   - 📘 Normal → Print  
   - 🥇 Ouro → Print

2. **Mandar prints no grupo:**
   - "Pessoal, estes são os que me faltam!"
   - Amigos podem ver claramente

### Opção 2: Lista Textual Rápida

1. **Aba OURO (exemplo):**
   ```
   Olhando a tela:
   
   FWC: 5, 7, 17, 19
   MEX: 3, 7, 9, 11, 17
   KOR: 4, 9, 18
   ... continua
   ```

2. **Copiar e mandar:**
   - Pessoal pode conferir se tem

---

## 📖 Cenário 7: Filtros Avançados para Estratégia

Você quer ser estratégico sobre quais figurinhas buscar.

### Encontrar Figurinhas que Faltam em Todos os Álbuns:

**Problema:** Essas são as mais urgentes!

1. **Usar a busca da aba de pesquisa**
2. **Aplicar filtros:**
   ```
   Busca: (deixar vazio)
   Tipo: all
   Status: missing
   ```

3. **Percorrer resultados:**
   - Todas as figurinhas mostradas faltam em pelo menos 1 álbum
   - As com 3 ícones cinzos (■■■) = faltam nos 3
   - Priorize essas em trocas!

### Focar em um Tipo Específico:

**Exemplo: Só figurinhas FWC**

1. **Filtros:**
   ```
   Busca: (vazio)
   Tipo: FWC
   Status: missing
   ```

2. **Resultado:**
   - Mostra apenas FWC00-FWC19 que estão faltando
   - Fácil de ver quais procurar

### Encontrar as Coca-Cola Faltantes:

1. **Filtros:**
   ```
   Busca: (vazio)
   Tipo: CC
   Status: all
   ```

2. **Resultado:**
   - Mostra todas as 14 Coca-Cola
   - Segundo seus dados, todas estão faltando nos 3 álbuns
   - São as últimas do álbum físico

---

## 📖 Cenário 8: Sistema de Backup Manual

Toda semana, fazer backup dos dados.

### Passo a Passo:

1. **Navegar até a pasta:**
   ```
   F:\Area de Trabalho\copa do mundo\data\
   ```

2. **Copiar o arquivo:**
   ```
   stickers.json
   ```

3. **Colar em local seguro:**
   ```
   Exemplo: OneDrive/Dropbox/Google Drive
   
   Nomear: stickers_backup_YYYY-MM-DD.json
   Exemplo: stickers_backup_2026-06-06.json
   ```

4. **Frequência recomendada:**
   - Backup semanal
   - Ou sempre antes de sessão grande de trocas
   - Antes de atualizar a aplicação

### Para Restaurar um Backup:

1. **Fechar a aplicação**
2. **Substituir `data/stickers.json` pelo backup**
3. **Reabrir a aplicação**

---

## 📖 Cenário 9: Monitorar Progresso ao Longo do Tempo

Você quer ver como sua coleção evolui.

### Anotar Estatísticas Semanalmente:

1. **Criar planilha ou nota:**
   ```
   Data       | Prata  | Normal | Ouro
   ---------- | ------ | ------ | -----
   01/06/2026 | 98.3%  | 96.1%  | 72.1%
   08/06/2026 | 99.0%  | 97.5%  | 75.0%
   15/06/2026 | 100%   | 98.8%  | 78.3%
   ```

2. **Analisar tendências:**
   - Quantas figurinhas por semana?
   - Projetar quando vai completar
   - Motivação visual!

### Calcular Figurinhas Conseguidas:

**Exemplo de cálculo:**
```
Semana 1: Normal = 955/994 (96.1%)
Semana 2: Normal = 960/994 (96.6%)
Diferença: 5 figurinhas conseguidas!
```

---

## 📖 Cenário 10: Identificar Seleções Completas

Ver quais seleções você já completou 100%.

### Método Manual:

1. **Para cada seleção de interesse:**
   ```
   Digite: BRA, ARG, GER, etc
   ```

2. **Verificar visualmente:**
   - Se todas as 20 figurinhas têm borda verde ✅
   - Significa que a seleção está completa nos 3 álbuns!

3. **Exemplo de seleções completas (baseado nos dados):**
   ```
   Segundo suas listas:
   - PAR (Paraguai) = Completo no Ouro
   - GER (Alemanha) = Completo no Ouro
   - NZL (Nova Zelândia) = Completo no Ouro
   - ALG (Argélia) = Completo no Ouro
   - UZB (Uzbequistão) = Completo no Ouro
   
   (Complete = todas presentes naquele álbum específico)
   ```

---

## 💡 Dicas Profissionais

### 🎯 Otimização de Tempo

1. **Use prefixos, não códigos completos:**
   - Digite `GHA` ao invés de clicar 20 vezes
   - Veja a seleção inteira de uma vez

2. **Mantenha a janela sempre aberta:**
   - Durante trocas, verifique instantaneamente
   - Evite confusão sobre o que você precisa

3. **Foque um álbum por vez:**
   - Complete o Prata primeiro (já está em 98.3%)
   - Depois Normal, depois Ouro
   - Sensação de conquista!

### 🔄 Workflow Eficiente

**Rotina Pós-Compra de Pacotes:**
```
1. Abrir aplicação
2. Separar figurinhas fisicamente: novas vs. repetidas
3. Para cada nova:
   - Buscar código
   - Marcar checkbox
   - Colar no álbum físico
4. Guardar repetidas para troca
```

**Rotina de Troca Presencial:**
```
1. Levar notebook/tablet com aplicação aberta
2. Para cada figurinha oferecida:
   - Buscar código
   - Verificar se precisa
   - Aceitar ou recusar
3. Marcar imediatamente após troca
```

---

## 🎓 Conclusão

O sistema foi feito para ser **rápido, visual e intuitivo**. Não existe jeito "certo" ou "errado" de usar - adapte ao seu estilo!

O mais importante: **mantenha sempre atualizado** para não perder o controle da coleção! ⚽🏆

---

*Boa sorte completando seus álbuns!* 🌟

