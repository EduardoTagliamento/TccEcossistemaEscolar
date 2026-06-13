# Modelo de Planilha Excel - Professores

## 📋 Estrutura da Planilha

A planilha de importação de professores deve ter a seguinte estrutura:

### Colunas da Planilha

| Coluna | Descrição | Tipo | Obrigatória | Exemplo |
|--------|-----------|------|-------------|---------|
| **CPF** | CPF do professor | Texto/Número | ✅ Sim | 12345678901 |
| **Nome** | Nome completo do professor | Texto | ✅ Sim | João Silva Santos |
| **Email** | Email do professor | Texto | ⬜ Não | professor@email.com |
| **Telefone** | Telefone de contato | Texto | ⬜ Não | (11) 91234-5678 |
| **Data de Nascimento** | Data de nascimento | Data | ⬜ Não | 1985-05-15 |
| **Matérias** | Matérias que leciona | Texto | ⬜ Não | Matemática; Física |
| **Turmas** | Turmas em que leciona | Texto | ⬜ Não | 1º Ano A; 1º Ano B |

### Exemplo de Planilha

```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Matérias,Turmas
12345678901,João Silva Santos,joao.prof@email.com,(11) 91234-5678,1985-05-15,Matemática,1º Ano A; 1º Ano B
98765432100,Maria Santos Oliveira,maria.prof@email.com,(11) 98765-4321,1990-08-20,Português; Literatura,2º Ano A; 2º Ano B
11122233344,Pedro Costa Lima,pedro.prof@email.com,(11) 99999-8888,1988-03-10,Física; Química,3º Ano A
```

## 📝 Instruções para Preenchimento

### 1. CPF
- **Obrigatório:** ✅ Sim
- **Formato:** 11 dígitos (com ou sem formatação)
- **Exemplos válidos:**
  - "12345678901"
  - "123.456.789-01"
- **Observações:**
  - CPF será validado automaticamente
  - Se o CPF já existir no sistema, o usuário será vinculado como professor na escola
  - Não serão criadas contas duplicadas

### 2. Nome
- **Obrigatório:** ✅ Sim
- **Formato:** Nome completo (mínimo 3 caracteres)
- **Exemplos válidos:**
  - "João Silva Santos"
  - "Maria Oliveira"
- **Observações:**
  - Usado para gerar a senha temporária (primeiro nome + 2 dígitos)
  - Exemplo: "João Silva" → senha: "Joao42"

### 3. Email
- **Obrigatório:** ⬜ Não (mas altamente recomendado)
- **Formato:** email válido
- **Exemplos válidos:**
  - "joao.professor@email.com"
  - "maria@escola.edu.br"
- **Observações:**
  - **IMPORTANTE:** Se fornecido, um email será enviado automaticamente com as credenciais de acesso
  - Se não fornecido, a senha temporária deverá ser comunicada manualmente ao professor

### 4. Telefone
- **Obrigatório:** ⬜ Não
- **Formato:** Texto livre
- **Exemplos válidos:**
  - "(11) 91234-5678"
  - "11912345678"
  - "+55 11 91234-5678"

### 5. Data de Nascimento
- **Obrigatório:** ⬜ Não
- **Formato:** AAAA-MM-DD (ISO) ou DD/MM/AAAA
- **Exemplos válidos:**
  - "1985-05-15"
  - "15/05/1985"

### 6. Matérias
- **Obrigatório:** ⬜ Não (mas recomendado)
- **Formato:** Nomes das matérias separados por **ponto-e-vírgula (;)**
- **Exemplos válidos:**
  - "Matemática"
  - "Matemática; Física"
  - "Português; Literatura; Redação"
- **Observações:**
  - Os nomes devem ser **exatos** às matérias cadastradas na escola
  - Se a matéria não for encontrada, será exibido um erro
  - **⚠️ IMPORTANTE:** As matérias devem estar cadastradas antes da importação
  - Deixe em branco se não quiser alocar matérias agora

### 7. Turmas
- **Obrigatório:** ⬜ Não (mas recomendado)
- **Formato:** Nomes das turmas separados por **ponto-e-vírgula (;)**
- **Exemplos válidos:**
  - "1º Ano A"
  - "1º Ano A; 1º Ano B"
  - "1º Ano A; 2º Ano A; 3º Ano A"
- **Observações:**
  - Os nomes devem ser **exatos** às turmas cadastradas na escola
  - Se a turma não for encontrada, será exibido um erro
  - **⚠️ IMPORTANTE:** As turmas devem estar cadastradas antes da importação
  - Deixe em branco se não quiser alocar turmas agora

## 🎯 Regras de Importação

### Validações Automáticas

1. **CPF Único**
   - Se CPF já existe: vincula como professor na escola (não cria usuário duplicado)
   - Se CPF novo: cria usuário e vincula como professor

2. **Resolução de Matérias por Nome**
   - Sistema busca matéria **pelo nome exato** (case-insensitive)
   - Se matéria não encontrada → erro de importação
   - Se matérias em branco → professor criado sem alocações

3. **Resolução de Turmas por Nome**
   - Sistema busca turma **pelo nome exato** (case-insensitive)
   - Se turma não encontrada → erro de importação
   - Se turmas em branco → professor criado sem alocações

4. **Geração de Senha Automática**
   - Padrão: PrimeiroNome + 2 dígitos aleatórios
   - Exemplo: "João Silva" → "Joao42"
   - Senha é hashada e armazenada com segurança

5. **Envio de Email Automático**
   - Se email fornecido: envia credenciais automaticamente
   - Email contém: CPF, senha temporária, link de login
   - Professor deve trocar senha no primeiro acesso

6. **Alocações Automáticas**
   - Se matérias e turmas fornecidas, cria **todas as combinações** matéria x turma
   - Exemplo: 2 matérias x 3 turmas = 6 alocações
   - Matérias: "Matemática; Física"
   - Turmas: "1º Ano A; 1º Ano B; 1º Ano C"
   - Resultado: 
     - Matemática → 1º Ano A
     - Matemática → 1º Ano B
     - Matemática → 1º Ano C
     - Física → 1º Ano A
     - Física → 1º Ano B
     - Física → 1º Ano C

7. **Permissões**
   - Apenas usuários com função de **Coordenação** ou **Direção** podem importar professores

### Resultado da Importação

Após o processamento, você verá:
- ✅ **Criados:** Novos professores cadastrados
- ⚠️ **Já cadastrados:** Professores que já existiam (CPF duplicado)
- ❌ **Erros:** Professores com problemas de validação

**Erros Comuns:**
- "Matéria não encontrada" → Matéria especificada não existe na escola
- "Turma não encontrada" → Turma especificada não existe na escola
- "CPF inválido" → CPF com formato incorreto ou dígitos verificadores inválidos
- "Email inválido" → Formato de email incorreto

## 📥 Como Usar

1. **Cadastrar matérias e turmas primeiro** (professores serão alocados a elas)
2. **Baixar o modelo** ou criar nova planilha seguindo a estrutura
3. **Preencher** as colunas:
   - CPF (obrigatório)
   - Nome (obrigatório)
   - Email (opcional - mas recomendado para envio de credenciais)
   - Telefone (opcional)
   - Data de Nascimento (opcional)
   - Matérias (opcional - nomes exatos separados por ";")
   - Turmas (opcional - nomes exatos separados por ";")
4. **Salvar** como arquivo Excel (.xlsx ou .xls) ou CSV
5. **Importar** na página de Gestão de Professores
6. **Revisar** o preview dos dados (até 5 primeiros professores)
7. **Confirmar** a importação
8. **Verificar** o resultado:
   - Professores criados (emails enviados automaticamente)
   - Professores já cadastrados (não criados novamente)
   - Erros (matéria/turma não encontrada, CPF inválido, etc.)

## ⚠️ Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Coluna 'CPF' não encontrada" | Cabeçalho incorreto | Use exatamente "CPF" |
| "Coluna 'Nome' não encontrada" | Cabeçalho incorreto | Use exatamente "Nome" |
| "CPF inválido" | CPF com formato incorreto | Verifique os 11 dígitos |
| "Matéria não encontrada" | Nome da matéria incorreto ou não cadastrada | Verifique se a matéria existe e o nome está correto |
| "Turma não encontrada" | Nome da turma incorreto ou não cadastrada | Verifique se a turma existe e o nome está correto |
| "Email inválido" | Formato de email incorreto | Use formato válido: usuario@dominio.com |
| "Professor já cadastrado" | CPF já é professor na escola | Normal - professor não será duplicado |
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
   ├─ Para cada professor:
   │  ├─ Validar CPF
   │  ├─ Buscar/criar usuário
   │  ├─ Gerar senha (se novo)
   │  ├─ Vincular como Professor (FuncaoId=3)
   │  ├─ Resolver Matérias por nome → MateriaGUID
   │  ├─ Resolver Turmas por nome → TurmaGUID
   │  ├─ Criar alocações (todas combinações matéria x turma)
   │  └─ Enviar email (se fornecido)
   ↓
6. Relatório de Resultados
   ├─ Total processados
   ├─ Criados com sucesso
   ├─ Já cadastrados
   └─ Erros (com detalhes)
   ↓
7. Atualização da Lista
```

## 💡 Dicas Importantes

1. **Emails são essenciais:** Sempre forneça emails para que professores recebam credenciais automaticamente
2. **Cadastre matérias e turmas primeiro:** Importação falhará se não existirem
3. **Nomes exatos:** Nomes de matérias e turmas devem ser exatamente iguais aos cadastrados
4. **Use ponto-e-vírgula:** Separe matérias e turmas com ";" e não com vírgula
5. **CPF único:** Um CPF não pode ser duplicado como professor na mesma escola
6. **Teste com poucos dados:** Importe 2-3 professores primeiro para validar o processo
7. **Use Excel ou CSV:** Formatos .xlsx, .xls e .csv são aceitos
8. **Revise o preview:** Antes de confirmar, revise os dados no preview
9. **Leia os erros:** Se houver erros, leia a mensagem completa para entender o problema
10. **Senhas temporárias:** Professores devem trocar senha no primeiro acesso
11. **Alocações podem ser feitas depois:** Pode criar professor sem matérias/turmas e alocar depois
12. **Combinações automáticas:** Sistema cria TODAS as combinações matéria x turma automaticamente

## 🔐 Segurança e Privacidade

### Geração de Senhas
- Senhas temporárias são geradas automaticamente
- Formato: PrimeiroNome + 2 dígitos aleatórios
- Exemplo: "João" → "Joao42"
- Senhas são hashadas com bcrypt antes de armazenar

### Envio de Emails
- Emails são enviados via Resend (serviço seguro)
- Contém: CPF, senha temporária, link de login
- Emails são enviados em lote com delay entre mensagens
- Falha no envio de email não bloqueia criação do professor

### Privacidade
- CPF é usado como identificador único
- Senhas NUNCA são retornadas em APIs
- Apenas coordenação e direção têm acesso

## 📊 Exemplos Completos

### Exemplo 1: Professor com 1 Matéria e 2 Turmas
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Matérias,Turmas
12345678901,João Silva,joao@email.com,(11) 91234-5678,1985-05-15,Matemática,1º Ano A; 1º Ano B
```
**Resultado:** 2 alocações criadas (Matemática → 1º Ano A, Matemática → 1º Ano B)

### Exemplo 2: Professor com 2 Matérias e 3 Turmas
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Matérias,Turmas
98765432100,Maria Santos,maria@email.com,(11) 98765-4321,1990-08-20,Português; Literatura,1º Ano A; 2º Ano A; 3º Ano A
```
**Resultado:** 6 alocações criadas (2 matérias x 3 turmas)

### Exemplo 3: Professor sem Alocações (pode alocar depois)
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Matérias,Turmas
11122233344,Pedro Costa,pedro@email.com,(11) 99999-8888,1988-03-10,,
```
**Resultado:** Professor criado sem alocações (pode adicionar depois manualmente)

### Exemplo 4: Múltiplos Professores
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Matérias,Turmas
12345678901,João Silva,joao@email.com,(11) 91234-5678,1985-05-15,Matemática,1º Ano A; 1º Ano B
98765432100,Maria Santos,maria@email.com,(11) 98765-4321,1990-08-20,Português,2º Ano A
11122233344,Pedro Costa,pedro@email.com,(11) 99999-8888,1988-03-10,Física; Química,3º Ano A
```
**Resultado:** 
- João: 2 alocações (Matemática → 1º Ano A, 1º Ano B)
- Maria: 1 alocação (Português → 2º Ano A)
- Pedro: 2 alocações (Física → 3º Ano A, Química → 3º Ano A)

## 🎓 Fluxo do Professor Após Importação

1. **Professor recebe email** com credenciais (se email fornecido)
2. **Professor acessa sistema** usando CPF e senha temporária
3. **Professor troca senha** no primeiro acesso (obrigatório)
4. **Professor visualiza:**
   - Matérias que leciona
   - Turmas alocadas
   - Alunos de cada turma
   - Tarefas acadêmicas atribuídas
   - Provas agendadas

## 🎯 Casos de Uso

### Caso 1: Professor Polivalente (leciona uma matéria para várias turmas)
```csv
CPF,Nome,Email,Matérias,Turmas
12345678901,João Silva,joao@email.com,Matemática,1º Ano A; 1º Ano B; 1º Ano C; 2º Ano A; 2º Ano B
```
**Resultado:** 5 alocações (Matemática em todas as turmas)

### Caso 2: Professor Especialista (leciona várias matérias para uma turma)
```csv
CPF,Nome,Email,Matérias,Turmas
98765432100,Maria Santos,maria@email.com,Física; Química; Biologia,3º Ano A
```
**Resultado:** 3 alocações (3 matérias na mesma turma)

### Caso 3: Professor Generalista (várias matérias e várias turmas)
```csv
CPF,Nome,Email,Matérias,Turmas
11122233344,Pedro Costa,pedro@email.com,Português; Literatura,1º Ano A; 1º Ano B; 2º Ano A; 2º Ano B
```
**Resultado:** 8 alocações (2 matérias x 4 turmas)

### Caso 4: Professor Novo (criar primeiro, alocar depois)
```csv
CPF,Nome,Email,Matérias,Turmas
55566677788,Ana Paula,ana@email.com,,
```
**Resultado:** Professor criado sem alocações. Coordenação pode alocar manualmente depois.

## 🔗 Recursos Relacionados

- 📄 Modelo CSV: `modelo-professores.csv`
- 📚 Fase 5: Gestão de Professores (PLANO_GESTAO_DADOS_ESCOLA.md)
- 🎓 Modelo de Matérias: `modelo-materias.csv`
- 🏫 Modelo de Turmas: `modelo-turmas.csv`
- 👨‍🎓 Modelo de Alunos: `modelo-alunos.csv`

---

**Versão:** 1.0 - Fase 5  
**Última Atualização:** Implementação Fase 5 - Professores  
**Suporte:** Documentação completa em `docs/PLANO_GESTAO_DADOS_ESCOLA.md`
