# Modelo de Planilha Excel - Cursos

## 📋 Estrutura da Planilha

A planilha de importação de cursos deve ter a seguinte estrutura:

### Colunas Obrigatórias

| Coluna | Descrição | Tipo | Exemplo |
|--------|-----------|------|---------|
| **Nome do Curso** | Nome completo do curso técnico | Texto | Técnico em Informática |

### Exemplo de Planilha

```
| Nome do Curso                      |
|------------------------------------|
| Técnico em Informática             |
| Técnico em Enfermagem              |
| Técnico em Administração           |
| Técnico em Eletrônica              |
| Técnico em Mecânica                |
```

## 📝 Instruções para Preenchimento

### 1. Nome do Curso
- **Obrigatório:** Sim
- **Formato:** Texto livre
- **Exemplos válidos:**
  - "Técnico em Informática"
  - "Técnico em Enfermagem"
  - "Técnico em Administração"
- **Observações:**
  - Será criado com status "Ativo" automaticamente
  - Nomes duplicados serão ignorados (não serão criados novamente)
  - Recomendado seguir o padrão "Técnico em [Área]"

## 🎯 Regras de Importação

### Validações Automáticas

1. **Nome Único**
   - Se o curso já existir na escola, será marcado como "duplicado"
   - Não será criado novamente

2. **Escola Técnica**
   - Cursos só podem ser criados em escolas marcadas como técnicas
   - Se a escola não for técnica, a importação falhará

3. **Permissões**
   - Apenas usuários com função de **Coordenação** ou **Direção** podem importar cursos

### Resultado da Importação

Após o processamento, você verá:
- ✅ **Criados:** Cursos novos que foram cadastrados
- ⚠️ **Duplicados:** Cursos que já existiam (ignorados)
- ❌ **Erros:** Cursos com problemas de validação

## 📥 Como Usar

1. **Baixar o modelo** (se disponível) ou criar nova planilha
2. **Preencher** a coluna "Nome do Curso" com os cursos desejados
3. **Salvar** como arquivo Excel (.xlsx ou .xls)
4. **Importar** na página de Gestão de Cursos
5. **Revisar** o preview dos dados
6. **Confirmar** a importação
7. **Verificar** o resultado (criados/duplicados/erros)

## ⚠️ Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| "Coluna 'Nome do Curso' não encontrada" | Cabeçalho incorreto | Certifique-se de usar exatamente "Nome do Curso" |
| "Curso já existe" | Nome duplicado | Normal - curso não será criado novamente |
| "Cursos só podem ser criados em escolas técnicas" | Escola não técnica | Marque a escola como técnica no cadastro |
| "Sem permissão" | Usuário sem autorização | Apenas Coordenação e Direção podem importar |

## 🔄 Processo de Importação

```
1. Upload da Planilha
   ↓
2. Validação das Colunas
   ↓
3. Preview dos Dados (até 5 primeiros)
   ↓
4. Confirmação do Usuário
   ↓
5. Processamento em Massa
   ↓
6. Relatório de Resultados
   ↓
7. Atualização da Lista
```

## 💡 Dicas

1. **Organize seus dados antes:** Prepare uma lista limpa de cursos sem duplicatas
2. **Teste com poucos cursos primeiro:** Importe 2-3 cursos para testar
3. **Mantenha nomes consistentes:** Use sempre o mesmo padrão de nomenclatura
4. **Revise o preview:** Sempre confira os dados antes de confirmar
5. **Verifique duplicatas:** O sistema detecta automaticamente, mas é bom conferir

## 📊 Exemplo Prático

### Planilha Correta ✅

```excel
Nome do Curso
Técnico em Informática
Técnico em Enfermagem
Técnico em Administração
```

### Planilha Incorreta ❌

```excel
Curso  (nome da coluna errado)
Informática  (falta "Técnico em")
Técnico em Enfermagem
```

### Resultado Esperado

- ✅ Técnico em Informática (criado)
- ⚠️ Técnico em Enfermagem (duplicado - já existe)
- ✅ Técnico em Administração (criado)

**Total:** 2 criados, 1 duplicado, 0 erros

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se seguiu todas as instruções
2. Confira as mensagens de erro detalhadas
3. Entre em contato com o suporte técnico se necessário
