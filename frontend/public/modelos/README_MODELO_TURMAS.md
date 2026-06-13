# Modelo de Planilha Excel - Turmas

## 📋 Estrutura da Planilha

A planilha de importação de turmas deve ter a seguinte estrutura:

### Colunas da Planilha

| Coluna | Descrição | Tipo | Obrigatória | Exemplo |
|--------|-----------|------|-------------|---------|
| **Série** | Série/ano da turma | Texto | ✅ Sim | 1º Ano, 2º Ano, 3º Ano |
| **Nome da Turma** | Identificador da turma | Texto | ✅ Sim | A, B, Matutino, Noturno |
| **Nome do Curso** | Curso ao qual pertence | Texto | ⬜ Não | Técnico em Informática |
| **É Técnica?** | Se é turma técnica | Sim/Não | ⬜ Não | Sim |

### Exemplo de Planilha

```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,A,,Não
1º Ano,B,,Não
2º Ano,A,,Não
1º Ano,Técnico Manhã,Técnico em Informática,Sim
2º Ano,Técnico Manhã,Técnico em Informática,Sim
3º Ano,Técnico Manhã,Técnico em Informática,Sim
1º Ano,Enfermagem A,Técnico em Enfermagem,Sim
```

## 📝 Instruções para Preenchimento

### 1. Série
- **Obrigatório:** ✅ Sim
- **Formato:** Texto livre (1-20 caracteres)
- **Exemplos válidos:**
  - "1º Ano"
  - "2º Ano"
  - "3º Ano"
  - "1ª Série"
  - "Ensino Médio 1"
- **Observações:**
  - Será combinada com o Nome da Turma para formar identificação única
  - Exemplos: "1º Ano A", "2º Ano B"

### 2. Nome da Turma
- **Obrigatório:** ✅ Sim
- **Formato:** Texto livre (1-50 caracteres)
- **Exemplos válidos:**
  - "A", "B", "C"
  - "Matutino", "Vespertino", "Noturno"
  - "Técnico Manhã", "Técnico Tarde"
  - "Enfermagem A"
- **Observações:**
  - Combinado com Série forma chave única: "Série + Nome"
  - Exemplo: "1º Ano" + "A" = "1º Ano A"

### 3. Nome do Curso (Opcional)
- **Obrigatório:** ⬜ Não
- **Formato:** Nome exato do curso cadastrado na escola
- **Exemplos válidos:**
  - "Técnico em Informática"
  - "Técnico em Enfermagem"
  - "Técnico em Administração"
  - "" (vazio - turma sem curso)
- **Observações:**
  - Deixe em branco para turmas regulares (não vinculadas a curso)
  - O sistema buscará o curso **pelo nome** automaticamente
  - Se o curso não for encontrado, será exibido um erro
  - **⚠️ IMPORTANTE:** O curso deve estar cadastrado antes da importação

### 4. É Técnica?
- **Obrigatório:** ⬜ Não (padrão: Não)
- **Formato:** "Sim" ou "Não"
- **Exemplos válidos:**
  - "Sim" → turma técnica
  - "Não" → turma regular
  - "" (vazio) → considerado "Não"
- **Observações:**
  - Turmas técnicas requerem escola técnica
  - Se a escola não for técnica, a importação falhará

## 🎯 Regras de Importação

### Validações Automáticas

1. **Chave Única: Série + Nome**
   - Se a combinação Série + Nome já existir na escola, será marcada como "duplicado"
   - Exemplo: "1º Ano A" deve ser único na escola
   - Não será criada novamente

2. **Resolução de Curso por Nome**
   - Sistema busca curso **pelo nome exato** (case-insensitive)
   - Se curso não encontrado → erro de importação
   - Se curso em branco → turma sem curso (válido)

3. **Turma Técnica**
   - Se "É Técnica?" = "Sim", escola deve ser técnica
   - Caso contrário, importação falhará

4. **Escola Não-Técnica**
   - Força "É Técnica?" = "Não"
   - Remove vinculação de curso automaticamente

5. **Permissões**
   - Apenas usuários com função de **Coordenação** ou **Direção** podem importar turmas

### Resultado da Importação

Após o processamento, você verá:
- ✅ **Criados:** Turmas novas que foram cadastradas
- ⚠️ **Duplicados:** Turmas que já existiam (ignoradas)
- ❌ **Erros:** Turmas com problemas de validação

**Erros Comuns:**
- "Turma já existe com essa série e nome" → Duplicata
- "Curso não encontrado" → Curso especificado não existe na escola
- "Turma técnica só pode ser criada em escola técnica" → Escola não é técnica

## 📥 Como Usar

1. **Cadastrar cursos primeiro** (se for vincular turmas a cursos)
2. **Baixar o modelo** ou criar nova planilha seguindo a estrutura
3. **Preencher** as colunas:
   - "Série" (obrigatório)
   - "Nome da Turma" (obrigatório)
   - "Nome do Curso" (opcional - deixe vazio se não vincular)
   - "É Técnica?" (opcional - padrão: Não)
4. **Salvar** como arquivo Excel (.xlsx ou .xls) ou CSV
5. **Importar** na página de Gestão de Turmas
6. **Revisar** o preview dos dados (até 5 primeiras turmas)
7. **Confirmar** a importação
8. **Verificar** o resultado:
   - Turmas criadas
   - Turmas duplicadas (já existiam)
   - Erros (curso não encontrado, validação, etc.)

## ⚠️ Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Coluna 'Série' não encontrada" | Cabeçalho incorreto | Use exatamente "Série" |
| "Coluna 'Nome da Turma' não encontrada" | Cabeçalho incorreto | Use exatamente "Nome da Turma" |
| "Turma já existe" | Série + Nome duplicado | Normal - turma não será criada novamente |
| "Curso não encontrado" | Nome do curso incorreto ou não cadastrado | Verifique se o curso existe e o nome está correto |
| "Turma técnica só pode ser criada em escola técnica" | Escola não técnica | Marque a escola como técnica ou altere "É Técnica?" para "Não" |
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
   ├─ Validação de duplicatas (Série + Nome)
   └─ Criação das turmas
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

1. **Organize seus dados antes:** Prepare uma lista limpa de turmas sem duplicatas
2. **Cadastre cursos primeiro:** Se for vincular turmas a cursos, cadastre os cursos antes
3. **Nomes exatos:** O nome do curso na planilha deve ser **exatamente igual** ao cadastrado
4. **Turmas regulares primeiro:** Importe turmas regulares (sem curso) separadamente das técnicas
5. **Teste com poucos dados:** Importe 2-3 turmas primeiro para validar o processo
6. **Use Excel ou CSV:** Formatos .xlsx, .xls e .csv são aceitos
7. **Revise o preview:** Antes de confirmar, revise os dados no preview (Série + Nome)
8. **Leia os erros:** Se houver erros, leia a mensagem completa para entender o problema

## 🔍 Fluxo de Resolução Nome → GUID

O sistema realiza a resolução automática de nomes de curso:

1. **Busca curso na escola:**
   - Compara nome (case-insensitive)
   - Exemplo: "técnico em informática" = "Técnico em Informática"

2. **Resultado da busca:**
   - ✅ **Curso encontrado:** Vincula turma ao curso (usando GUID interno)
   - ❌ **Curso não encontrado:** Marca como erro na importação
   - ⬜ **Curso vazio:** Turma sem curso (válido)

3. **Vantagens:**
   - Usuário não precisa saber GUIDs técnicos
   - Usa nomes amigáveis na planilha
   - Sistema garante integridade referencial

## 📊 Exemplo Completo de Planilha

### Turmas Regulares (Sem Curso)
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,A,,Não
1º Ano,B,,Não
2º Ano,A,,Não
2º Ano,B,,Não
3º Ano,A,,Não
3º Ano,B,,Não
```

### Turmas de Curso Técnico
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,Técnico Manhã,Técnico em Informática,Sim
1º Ano,Técnico Tarde,Técnico em Informática,Sim
2º Ano,Técnico Manhã,Técnico em Informática,Sim
2º Ano,Técnico Tarde,Técnico em Informática,Sim
```

### Turmas Mistas (Planilha Completa)
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,A,,Não
1º Ano,B,,Não
1º Ano,Técnico Manhã,Técnico em Informática,Sim
1º Ano,Técnico Tarde,Técnico em Informática,Sim
2º Ano,A,,Não
2º Ano,Técnico Manhã,Técnico em Informática,Sim
1º Ano,Enfermagem A,Técnico em Enfermagem,Sim
2º Ano,Enfermagem A,Técnico em Enfermagem,Sim
```

## 🎓 Boas Práticas

1. **Nomeação Clara:**
   - Use nomes descritivos para as turmas
   - Diferencie turnos: "Manhã", "Tarde", "Noite"
   - Exemplo: "1º Ano Técnico Manhã"

2. **Organização:**
   - Agrupe turmas por série na planilha
   - Facilita revisão e manutenção

3. **Documentação:**
   - Mantenha uma cópia da planilha original
   - Útil para futuras atualizações

4. **Validação Prévia:**
   - Certifique-se de que os cursos estão cadastrados
   - Verifique se a escola é técnica (se importar turmas técnicas)

5. **Importação Incremental:**
   - Importe em lotes menores
   - Mais fácil de gerenciar erros

## 🎯 Casos de Uso Comuns

### Caso 1: Escola Regular (Não-Técnica)
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,A,,Não
1º Ano,B,,Não
2º Ano,A,,Não
2º Ano,B,,Não
3º Ano,A,,Não
3º Ano,B,,Não
```

### Caso 2: Escola Técnica (Com Cursos)
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,Informática Manhã,Técnico em Informática,Sim
1º Ano,Informática Tarde,Técnico em Informática,Sim
2º Ano,Informática Manhã,Técnico em Informática,Sim
1º Ano,Enfermagem A,Técnico em Enfermagem,Sim
2º Ano,Enfermagem A,Técnico em Enfermagem,Sim
```

### Caso 3: Escola Técnica Mista (Turmas Regulares + Técnicas)
```csv
Série,Nome da Turma,Nome do Curso,É Técnica?
1º Ano,A,,Não
1º Ano,B,,Não
1º Ano,Técnico,Técnico em Informática,Sim
2º Ano,A,,Não
2º Ano,Técnico,Técnico em Informática,Sim
```

## 🔗 Recursos Relacionados

- 📄 Modelo CSV: `modelo-turmas.csv`
- 📚 Fase 3: Gestão de Turmas (PLANO_GESTAO_DADOS_ESCOLA.md)
- 🎓 Modelo de Cursos: `modelo-cursos.csv`
- 📚 Modelo de Matérias: `modelo-materias.csv`

---

**Versão:** 1.0 - Fase 3  
**Última Atualização:** Implementação Fase 3 - Turmas  
**Suporte:** Documentação completa em `docs/PLANO_GESTAO_DADOS_ESCOLA.md`
