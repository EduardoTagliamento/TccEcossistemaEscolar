# Modelo de Planilha Excel - Alunos

## 📋 Estrutura da Planilha

A planilha de importação de alunos deve ter a seguinte estrutura:

### Colunas da Planilha

| Coluna | Descrição | Tipo | Obrigatória | Exemplo |
|--------|-----------|------|-------------|---------|
| **CPF** | CPF do aluno | Texto/Número | ✅ Sim | 12345678901 |
| **Nome** | Nome completo do aluno | Texto | ✅ Sim | João Silva Santos |
| **Email** | Email do aluno | Texto | ⬜ Não | joao.silva@email.com |
| **Telefone** | Telefone de contato | Texto | ⬜ Não | (11) 91234-5678 |
| **Data de Nascimento** | Data de nascimento | Data | ⬜ Não | 2010-05-15 |
| **Turma** | Nome da turma | Texto | ✅ Sim | 1º Ano A |

### Exemplo de Planilha

```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Turma
12345678901,João Silva Santos,joao.silva@email.com,(11) 91234-5678,2010-05-15,1º Ano A
98765432100,Maria Santos Oliveira,maria.santos@email.com,(11) 98765-4321,2010-08-20,1º Ano A
11122233344,Pedro Costa Lima,pedro.costa@email.com,(11) 99999-8888,2010-03-10,1º Ano B
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
  - Se o CPF já existir no sistema, o aluno será vinculado à turma especificada
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
  - "joao.silva@email.com"
  - "maria@escola.edu.br"
- **Observações:**
  - **IMPORTANTE:** Se fornecido, um email será enviado automaticamente com as credenciais de acesso
  - Se não fornecido, a senha temporária deverá ser comunicada manualmente ao aluno

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
  - "2010-05-15"
  - "15/05/2010"

### 6. Turma
- **Obrigatório:** ✅ Sim
- **Formato:** Nome exato da turma cadastrada na escola
- **Exemplos válidos:**
  - "1º Ano A"
  - "2º Ano B"
  - "1º Ano Técnico Manhã"
- **Observações:**
  - O sistema buscará a turma **pelo nome** automaticamente
  - Se a turma não for encontrada, será exibido um erro
  - **⚠️ IMPORTANTE:** A turma deve estar cadastrada antes da importação

## 🎯 Regras de Importação

### Validações Automáticas

1. **CPF Único**
   - Se CPF já existe: vincula à nova turma (não cria usuário duplicado)
   - Se CPF novo: cria usuário e matrícula

2. **Resolução de Turma por Nome**
   - Sistema busca turma **pelo nome exato** (case-insensitive)
   - Se turma não encontrada → erro de importação
   - Se turma em branco → erro de importação

3. **Geração de Senha Automática**
   - Padrão: PrimeiroNome + 2 dígitos aleatórios
   - Exemplo: "João Silva" → "Joao42"
   - Senha é hashada e armazenada com segurança

4. **Envio de Email Automático**
   - Se email fornecido: envia credenciais automaticamente
   - Email contém: CPF, senha temporária, link de login
   - Aluno deve trocar senha no primeiro acesso

5. **Matrícula Automática**
   - Após criar/encontrar usuário, cria matrícula na turma
   - Se aluno já tem matrícula ativa → marcado como "já cadastrado"
   - Status da matrícula: "Ativa"

6. **Permissões**
   - Apenas usuários com função de **Coordenação** ou **Direção** podem importar alunos

### Resultado da Importação

Após o processamento, você verá:
- ✅ **Criados:** Novos alunos cadastrados com matrícula
- ⚠️ **Já cadastrados:** Alunos que já existiam (CPF ou matrícula ativa)
- ❌ **Erros:** Alunos com problemas de validação

**Erros Comuns:**
- "Turma não encontrada" → Turma especificada não existe na escola
- "CPF inválido" → CPF com formato incorreto ou dígitos verificadores inválidos
- "Email inválido" → Formato de email incorreto
- "Aluno já possui matrícula ativa" → Aluno já está matriculado em outra turma

## 📥 Como Usar

1. **Cadastrar turmas primeiro** (alunos serão vinculados a turmas existentes)
2. **Baixar o modelo** ou criar nova planilha seguindo a estrutura
3. **Preencher** as colunas:
   - CPF (obrigatório)
   - Nome (obrigatório)
   - Email (opcional - mas recomendado para envio de credenciais)
   - Telefone (opcional)
   - Data de Nascimento (opcional)
   - Turma (obrigatório - nome exato da turma)
4. **Salvar** como arquivo Excel (.xlsx ou .xls) ou CSV
5. **Importar** na página de Gestão de Alunos
6. **Revisar** o preview dos dados (até 5 primeiros alunos)
7. **Confirmar** a importação
8. **Verificar** o resultado:
   - Alunos criados (emails enviados automaticamente)
   - Alunos já cadastrados (não criados novamente)
   - Erros (turma não encontrada, CPF inválido, etc.)

## ⚠️ Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Coluna 'CPF' não encontrada" | Cabeçalho incorreto | Use exatamente "CPF" |
| "Coluna 'Nome' não encontrada" | Cabeçalho incorreto | Use exatamente "Nome" |
| "Coluna 'Turma' não encontrada" | Cabeçalho incorreto | Use exatamente "Turma" |
| "CPF inválido" | CPF com formato incorreto | Verifique os 11 dígitos |
| "Turma não encontrada" | Nome da turma incorreto ou não cadastrada | Verifique se a turma existe e o nome está correto |
| "Email inválido" | Formato de email incorreto | Use formato válido: usuario@dominio.com |
| "Aluno já possui matrícula ativa" | Aluno já está matriculado | Normal - aluno não será matriculado novamente |
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
   ├─ Para cada aluno:
   │  ├─ Validar CPF
   │  ├─ Buscar/criar usuário
   │  ├─ Gerar senha (se novo)
   │  ├─ Resolver TurmaNome → TurmaGUID
   │  ├─ Criar matrícula
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

1. **Emails são essenciais:** Sempre forneça emails para que alunos recebam credenciais automaticamente
2. **Cadastre turmas primeiro:** Importação falhará se turmas não existirem
3. **Nomes exatos:** Nome da turma deve ser exatamente igual ao cadastrado
4. **CPF único:** Um CPF não pode ter múltiplas matrículas ativas simultâneas
5. **Teste com poucos dados:** Importe 2-3 alunos primeiro para validar o processo
6. **Use Excel ou CSV:** Formatos .xlsx, .xls e .csv são aceitos
7. **Revise o preview:** Antes de confirmar, revise os dados no preview
8. **Leia os erros:** Se houver erros, leia a mensagem completa para entender o problema
9. **Senhas temporárias:** Alunos devem trocar senha no primeiro acesso
10. **Emails automáticos:** Processo pode levar alguns minutos para enviar todos os emails

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
- Falha no envio de email não bloqueia criação do aluno

### Privacidade
- CPF é usado como identificador único
- Senhas NUNCA são retornadas em APIs
- Apenas coordenação e direção têm acesso

## 📊 Exemplos Completos

### Exemplo 1: Turma Regular
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Turma
12345678901,João Silva Santos,joao@email.com,(11) 91234-5678,2010-05-15,1º Ano A
98765432100,Maria Oliveira,maria@email.com,(11) 98765-4321,2010-08-20,1º Ano A
11122233344,Pedro Costa,pedro@email.com,(11) 99999-8888,2010-03-10,1º Ano B
```

### Exemplo 2: Turma Técnica
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Turma
33344455566,Rafael Santos,rafael@email.com,(11) 97777-8888,2010-01-18,1º Ano Técnico Manhã
22211100099,Fernanda Lima,fernanda@email.com,(11) 92222-3333,2010-06-25,2º Ano Técnico Manhã
```

### Exemplo 3: Sem Email (não recomendado)
```csv
CPF,Nome,Email,Telefone,Data de Nascimento,Turma
44433322211,Juliana Alves,,,(11) 95555-6666,2010-09-30,3º Ano A
```
⚠️ **Observação:** Sem email, a senha temporária deverá ser comunicada manualmente ao aluno.

## 🎓 Fluxo do Aluno Após Importação

1. **Aluno recebe email** com credenciais (se email fornecido)
2. **Aluno acessa sistema** usando CPF e senha temporária
3. **Aluno troca senha** no primeiro acesso (obrigatório)
4. **Aluno visualiza:**
   - Turma matriculada
   - Tarefas acadêmicas
   - Provas agendadas
   - Notas e frequência

## 🔗 Recursos Relacionados

- 📄 Modelo CSV: `modelo-alunos.csv`
- 📚 Fase 4: Gestão de Alunos (PLANO_GESTAO_DADOS_ESCOLA.md)
- 🎓 Modelo de Turmas: `modelo-turmas.csv`
- 👨‍🏫 Modelo de Professores: `modelo-professores.csv`

---

**Versão:** 1.0 - Fase 4  
**Última Atualização:** Implementação Fase 4 - Alunos  
**Suporte:** Documentação completa em `docs/PLANO_GESTAO_DADOS_ESCOLA.md`
