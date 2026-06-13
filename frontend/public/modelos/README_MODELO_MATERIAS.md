# Modelo de Planilha Excel - Matérias

## 📋 Estrutura da Planilha

A planilha de importação de matérias/disciplinas deve ter a seguinte estrutura:

### Colunas da Planilha

| Coluna | Descrição | Tipo | Obrigatória | Exemplo |
|--------|-----------|------|-------------|---------|
| **Nome da Matéria** | Nome da disciplina | Texto | ✅ Sim | Matemática |
| **Nome do Curso** | Curso ao qual pertence | Texto | ⬜ Não | Técnico em Informática |
| **É Técnica?** | Se é matéria técnica | Sim/Não | ⬜ Não | Sim |

### Exemplo de Planilha

```csv
Nome da Matéria,Nome do Curso,É Técnica?
Matemática,,Não
Português,,Não
Algoritmos e Programação,Técnico em Informática,Sim
Banco de Dados,Técnico em Informática,Sim
Anatomia,Técnico em Enfermagem,Sim
Primeiros Socorros,Técnico em Enfermagem,Sim
Gestão Empresarial,Técnico em Administração,Sim
```

## 📝 Instruções para Preenchimento

### 1. Nome da Matéria
- **Obrigatório:** ✅ Sim
- **Formato:** Texto livre (3-100 caracteres)
- **Exemplos válidos:**
  - "Matemática"
  - "Algoritmos e Programação"
  - "Primeiros Socorros"
- **Observações:**
  - Será criada com status "Ativa" automaticamente
  - Nomes duplicados serão ignorados

### 2. Nome do Curso (Opcional)
- **Obrigatório:** ⬜ Não
- **Formato:** Nome exato do curso cadastrado na escola
- **Exemplos válidos:**
  - "Técnico em Informática"
  - "Técnico em Enfermagem"
  - "Técnico em Administração"
  - "" (vazio - matéria sem curso)
- **Observações:**
  - Deixe em branco para matérias gerais (não vinculadas a curso)
  - O sistema buscará o curso **pelo nome** automaticamente
  - Se o curso não for encontrado, será exibido um erro
  - **⚠️ IMPORTANTE:** O curso deve estar cadastrado antes da importação

### 3. É Técnica?
- **Obrigatório:** ⬜ Não (padrão: Não)
- **Formato:** "Sim" ou "Não"
- **Exemplos válidos:**
  - "Sim" → matéria técnica
  - "Não" → matéria regular
  - "" (vazio) → considerado "Não"
- **Observações:**
  - Matérias técnicas requerem escola técnica
  - Se a escola não for técnica, a importação falhará

## 🎯 Regras de Importação

### Validações Automáticas

1. **Nome Único**
   - Se a matéria já existir na escola, será marcada como "duplicado"
   - Não será criada novamente

2. **Resolução de Curso por Nome**
   - Sistema busca curso **pelo nome exato** (case-insensitive)
   - Se curso não encontrado → erro de importação
   - Se curso em branco → matéria sem curso (válido)

3. **Matéria Técnica**
   - Se "É Técnica?" = "Sim", escola deve ser técnica
   - Caso contrário, importação falhará

4. **Permissões**
   - Apenas usuários com função de **Coordenação** ou **Direção** podem importar matérias

### Resultado da Importação

Após o processamento, você verá:
- ✅ **Criados:** Matérias novas que foram cadastradas
- ⚠️ **Duplicados:** Matérias que já existiam (ignorados)
- ❌ **Erros:** Matérias com problemas de validação

**Erros Comuns:**
- "Curso não encontrado" → Curso especificado não existe na escola
- "Matéria técnica só pode ser criada em escola técnica" → Escola não é técnica

## 📥 Como Usar

1. **Cadastrar cursos primeiro** (se for vincular matérias a cursos)
2. **Baixar o modelo** ou criar nova planilha seguindo a estrutura
3. **Preencher** as colunas:
   - "Nome da Matéria" (obrigatório)
   - "Nome do Curso" (opcional - deixe vazio se não vincular)
   - "É Técnica?" (opcional - padrão: Não)
4. **Salvar** como arquivo Excel (.xlsx ou .xls) ou CSV
5. **Importar** na página de Gestão de Matérias
6. **Revisar** o preview dos dados (até 5 primeiras matérias)
7. **Confirmar** a importação
8. **Verificar** o resultado:
   - Matérias criadas
   - Matérias duplicadas (já existiam)
   - Erros (curso não encontrado, validação, etc.)

## ⚠️ Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Coluna 'Nome da Matéria' não encontrada" | Cabeçalho incorreto | Use exatamente "Nome da Matéria" |
| "Matéria já existe" | Nome duplicado | Normal - matéria não será criada novamente |
| "Curso não encontrado" | Nome do curso incorreto ou não cadastrado | Verifique se o curso existe e o nome está correto |
| "Matéria técnica só pode ser criada em escola técnica" | Escola não técnica | Marque a escola como técnica ou altere "É Técnica?" para "Não" |
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
   ├─ Resolução de nomes de cursos → GUIDs
   ├─ Validação de duplicatas
   └─ Criação das matérias
   ↓
6. Relatório de Resultados
   ├─ Total processados
   ├─ Criados com sucesso
   ├─ Duplicados (ignorados)
   └─ Erros (com detalhes)
   ↓
7. Atualização da Lista
```

## 💡 Dicas Importantes

1. **Organize seus dados antes:** Prepare uma lista limpa de matérias sem duplicatas
2. **Cadastre cursos primeiro:** Se for vincular matérias a cursos, cadastre os cursos antes
3. **Nomes exatos:** O nome do curso na planilha deve ser **exatamente igual** ao cadastrado
4. **Matérias gerais primeiro:** Importe matérias gerais (sem curso) separadamente das técnicas
5. **Teste com poucos dados:** Importe 2-3 matérias primeiro para validar o processo
6. **Use Excel ou CSV:** Formatos .xlsx, .xls e .csv são aceitos
7. **Revise o preview:** Antes de confirmar, revise os dados no preview
8. **Leia os erros:** Se houver erros, leia a mensagem completa para entender o problema

## 🔍 Fluxo de Resolução Nome → GUID

O sistema realiza a resolução automática de nomes de curso:

1. **Busca curso na escola:**
   - Compara nome (case-insensitive)
   - Exemplo: "técnico em informática" = "Técnico em Informática"

2. **Resultado da busca:**
   - ✅ **Curso encontrado:** Vincula matéria ao curso (usando GUID interno)
   - ❌ **Curso não encontrado:** Marca como erro na importação
   - ⬜ **Curso vazio:** Matéria sem curso (válido)

3. **Vantagens:**
   - Usuário não precisa saber GUIDs técnicos
   - Usa nomes amigáveis na planilha
   - Sistema garante integridade referencial

## 📊 Exemplo Completo de Planilha

### Matérias Gerais (Sem Curso)
```csv
Nome da Matéria,Nome do Curso,É Técnica?
Matemática,,Não
Português,,Não
História,,Não
Geografia,,Não
```

### Matérias de Curso Técnico
```csv
Nome da Matéria,Nome do Curso,É Técnica?
Algoritmos e Programação,Técnico em Informática,Sim
Banco de Dados,Técnico em Informática,Sim
Redes de Computadores,Técnico em Informática,Sim
```

### Matérias Mistas (Planilha Completa)
```csv
Nome da Matéria,Nome do Curso,É Técnica?
Matemática,,Não
Português,,Não
Algoritmos e Programação,Técnico em Informática,Sim
Banco de Dados,Técnico em Informática,Sim
Anatomia,Técnico em Enfermagem,Sim
Primeiros Socorros,Técnico em Enfermagem,Sim
```

## 🎓 Boas Práticas

1. **Nomeação Clara:**
   - Use nomes descritivos para as matérias
   - Evite abreviações não padronizadas

2. **Organização:**
   - Agrupe matérias por curso na planilha
   - Facilita revisão e manutenção

3. **Documentação:**
   - Mantenha uma cópia da planilha original
   - Útil para futuras atualizações

4. **Validação Prévia:**
   - Certifique-se de que os cursos estão cadastrados
   - Verifique se a escola é técnica (se importar matérias técnicas)

5. **Importação Incremental:**
   - Importe em lotes menores
   - Mais fácil de gerenciar erros

## 🔗 Recursos Relacionados

- 📄 Modelo CSV: `modelo-materias.csv`
- 📚 Fase 2: Gestão de Matérias (PLANO_GESTAO_DADOS_ESCOLA.md)
- 🎓 Modelo de Cursos: `modelo-cursos.csv`

---

**Versão:** 1.0 - Fase 2  
**Última Atualização:** Implementação Fase 2 - Matérias  
**Suporte:** Documentação completa em `docs/PLANO_GESTAO_DADOS_ESCOLA.md`
