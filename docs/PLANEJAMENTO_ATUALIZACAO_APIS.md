# 📋 Planejamento de Atualização das REST APIs

**Data:** 08/03/2026  
**Objetivo:** Atualizar APIs de Usuario, Escola e EscolaxUsuarioxFuncao para refletir mudanças no schema SQL  
**Status:** 🔴 Pendente Implementação

---

## 📊 Análise de Incompatibilidades

### 🔴 **API Usuario - Campos Faltando (7 campos)**

| Campo SQL | Tipo | Presente na Entity? | Impacto | Prioridade |
|-----------|------|---------------------|---------|------------|
| `UsuarioEmailVerificado` | BOOLEAN | ❌ Não | 🔴 Alto - Sistema de verificação | **CRÍTICO** |
| `UsuarioDataNascimento` | DATE | ❌ Não | 🟡 Médio - Validações de idade | Médio |
| `UsuarioStatus` | ENUM | ❌ Não | 🔴 Alto - Controle de acesso | **ALTO** |
| `UsuarioUltimoAcesso` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |
| `UsuarioCreatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |
| `UsuarioUpdatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |
| `UsuarioDeletedAt` | TIMESTAMP | ❌ Não | 🟡 Médio - Soft delete | Médio |

**Campos já implementados:** ✅ UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, UsuarioNome, UsuarioSenha

---

### 🔴 **API Escola - Campos Faltando (6 campos)**

| Campo SQL | Tipo | Presente na Entity? | Impacto | Prioridade |
|-----------|------|---------------------|---------|------------|
| `EscolaCNPJ` | VARCHAR(18) | ❌ Não | 🟡 Médio - Identificação legal (opcional) | Médio |
| `EscolaTelefone` | VARCHAR(15) | ❌ Não | 🟡 Médio - Contato | Médio |
| `EscolaEmail` | VARCHAR(60) | ❌ Não | 🟡 Médio - Contato | Médio |
| `EscolaEndereco` | VARCHAR(200) | ❌ Não | 🟡 Médio - Localização | Médio |
| `EscolaStatus` | ENUM | ❌ Não | 🔴 Alto - Controle de escolas ativas | **ALTO** |
| `EscolaCreatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |
| `EscolaUpdatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |

**Campos já implementados:** ✅ EscolaGUID, EscolaNome, EscolaCorPriEs, EscolaCorPriCl, EscolaCorSecEs, EscolaCorSecCl, EscolaIcone

---

### 🔴 **API EscolaxUsuarioxFuncao - Campos Faltando (5 campos)**

| Campo SQL | Tipo | Presente na Entity? | Impacto | Prioridade |
|-----------|------|---------------------|---------|------------|
| `DataInicio` | DATE | ❌ Não | 🟡 Médio - Histórico de vínculos | Médio |
| `DataFim` | DATE | ❌ Não | 🟡 Médio - Vínculos temporários | Médio |
| `Status` | ENUM | ❌ Não | 🔴 Alto - Controle de vínculos ativos | **ALTO** |
| `CreatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |
| `UpdatedAt` | TIMESTAMP | ❌ Não | 🟢 Baixo - Auditoria | Baixo |

**Campos já implementados:** ✅ EscolaxUsuarioxFuncaoId, UsuarioCPF, EscolaGUID, FuncaoId, FuncaoNome

---

### 🆕 **Nova API - VerificacaoEmail (NÃO EXISTE)**

**Status:** ❌ API completa precisa ser criada

Tabela SQL:
```sql
CREATE TABLE verificacao_email (
  VerificacaoId INT AUTO_INCREMENT PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,
  VerificacaoCodigo VARCHAR(10) NOT NULL,
  VerificacaoExpiresAt TIMESTAMP NOT NULL,
  VerificacaoUsado BOOLEAN DEFAULT FALSE,
  VerificacaoCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Endpoints necessários:**
1. `POST /api/verificacao-email/solicitar` - Gera código e envia email
2. `POST /api/verificacao-email/validar` - Valida código informado
3. `POST /api/verificacao-email/reenviar` - Reenvia código

---

## 🎯 Plano de Implementação

### **FASE 1: Atualização API Usuario** (Prioridade: CRÍTICA)

#### **1.1. Entity: usuario.model.ts**

**Adicionar campos privados:**
```typescript
#UsuarioEmailVerificado: boolean = false;
#UsuarioDataNascimento: Date | null = null;
#UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado' = 'Ativo';
#UsuarioUltimoAcesso: Date | null = null;
#UsuarioCreatedAt: Date | null = null;
#UsuarioUpdatedAt: Date | null = null;
#UsuarioDeletedAt: Date | null = null;
```

**Adicionar getters/setters com validações:**
- `UsuarioEmailVerificado`: boolean simples, readonly (apenas service pode alterar)
- `UsuarioDataNascimento`: validar data válida, idade mínima (ex: 5 anos)
- `UsuarioStatus`: validar enum ('Ativo', 'Inativo', 'Bloqueado')
- `UsuarioUltimoAcesso`: readonly, apenas service atualiza
- `UsuarioCreatedAt/UpdatedAt`: readonly, gerenciados pelo DB
- `UsuarioDeletedAt`: readonly, soft delete

**Estimativa:** 2-3 horas

---

#### **1.2. Repository: usuario.repository.ts**

**Atualizar queries SQL:**

```typescript
// CREATE - Adicionar novos campos
INSERT INTO usuario (
  UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, 
  UsuarioNome, UsuarioSenha, UsuarioEmailVerificado, 
  UsuarioDataNascimento, UsuarioStatus
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

// FIND - Incluir novos campos no SELECT
SELECT 
  UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, 
  UsuarioNome, UsuarioSenha, UsuarioEmailVerificado,
  UsuarioDataNascimento, UsuarioStatus, UsuarioUltimoAcesso,
  UsuarioCreatedAt, UsuarioUpdatedAt, UsuarioDeletedAt
FROM usuario

// UPDATE - Suportar novos campos
UPDATE usuario SET
  UsuarioNome = ?, UsuarioEmail = ?, UsuarioTelefone = ?,
  UsuarioDataNascimento = ?, UsuarioStatus = ?
WHERE UsuarioCPF = ?

// DELETE - Implementar soft delete
UPDATE usuario SET UsuarioDeletedAt = CURRENT_TIMESTAMP WHERE UsuarioCPF = ?
```

**Novos métodos necessários:**
```typescript
softDelete(cpf: string): Promise<boolean>
restore(cpf: string): Promise<boolean>  // Limpa DeletedAt
findActive(): Promise<Usuario[]>  // WHERE DeletedAt IS NULL
findByStatus(status: string): Promise<Usuario[]>
updateUltimoAcesso(cpf: string): Promise<void>
verificarEmail(cpf: string): Promise<boolean>  // Marca EmailVerificado = TRUE
```

**Estimativa:** 3-4 horas

---

#### **1.3. Service: usuario.service.ts**

**Atualizar DTO:**
```typescript
interface UsuarioDTO {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioEmailVerificado: boolean;           // NOVO
  UsuarioDataNascimento: string | null;      // NOVO (ISO date)
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';  // NOVO
  UsuarioUltimoAcesso: string | null;        // NOVO (ISO timestamp)
  UsuarioCreatedAt: string;                  // NOVO (ISO timestamp)
  UsuarioUpdatedAt: string;                  // NOVO (ISO timestamp)
  // UsuarioSenha: NUNCA retornado
  // UsuarioDeletedAt: NUNCA retornado (interno)
}
```

**Novos métodos:**
```typescript
marcarEmailVerificado(cpf: string): Promise<void>
atualizarUltimoAcesso(cpf: string): Promise<void>
alterarStatus(cpf: string, novoStatus: string): Promise<UsuarioDTO>
softDelete(cpf: string): Promise<boolean>
listarAtivos(): Promise<UsuarioDTO[]>
listarPorStatus(status: string): Promise<UsuarioDTO[]>
```

**Regras de negócio:**
- Usuário só pode ser criado com Status = 'Ativo'
- EmailVerificado = FALSE por padrão
- Soft delete: não permite login se DeletedAt != NULL
- Bloquear ações se Status = 'Bloqueado' ou 'Inativo'

**Estimativa:** 3-4 horas

---

#### **1.4. Middleware: usuario.middleware.ts**

**Validações adicionais:**
```typescript
// validateCreateBody - adicionar
if (usuario.UsuarioDataNascimento) {
  const dataNasc = new Date(usuario.UsuarioDataNascimento);
  const idade = calcularIdade(dataNasc);
  if (idade < 5) {
    throw new ErrorResponse(400, "Usuário deve ter pelo menos 5 anos");
  }
}

// validateUpdateBody - adicionar
if (usuario.UsuarioStatus) {
  const statusValidos = ['Ativo', 'Inativo', 'Bloqueado'];
  if (!statusValidos.includes(usuario.UsuarioStatus)) {
    throw new ErrorResponse(400, "Status inválido");
  }
}
```

**Novos middlewares:**
```typescript
validateStatus(req, res, next)  // Valida enum Status
checkEmailVerificado(req, res, next)  // Bloqueia se EmailVerificado = FALSE
checkUsuarioAtivo(req, res, next)  // Bloqueia se Status != 'Ativo'
```

**Estimativa:** 1-2 horas

---

#### **1.5. Controller: usuario.controller.ts**

**Endpoints a adicionar:**
```typescript
// PATCH /api/usuario/:cpf/status
alterarStatus = async (req: Request, res: Response, next: NextFunction)

// PATCH /api/usuario/:cpf/verificar-email
verificarEmail = async (req: Request, res: Response, next: NextFunction)

// GET /api/usuario/ativos
listarAtivos = async (req: Request, res: Response, next: NextFunction)

// GET /api/usuario/status/:status
listarPorStatus = async (req: Request, res: Response, next: NextFunction)

// DELETE /api/usuario/:cpf/soft (soft delete)
softDelete = async (req: Request, res: Response, next: NextFunction)

// PATCH /api/usuario/:cpf/restaurar
restaurar = async (req: Request, res: Response, next: NextFunction)
```

**Estimativa:** 2-3 horas

---

#### **1.6. Routes: usuario.routes.ts**

**Rotas a adicionar:**
```typescript
router.patch("/:UsuarioCPF/status", validateCpfParam, validateStatus, alterarStatus);
router.patch("/:UsuarioCPF/verificar-email", validateCpfParam, verificarEmail);
router.get("/ativos", listarAtivos);
router.get("/status/:status", validateStatus, listarPorStatus);
router.delete("/:UsuarioCPF/soft", validateCpfParam, softDelete);
router.patch("/:UsuarioCPF/restaurar", validateCpfParam, restaurar);
```

**Estimativa:** 1 hora

---

#### **1.7. Documentação: usuario-api.md**

**Atualizar:**
- Data Models com novos campos
- Exemplos de request/response
- Novos endpoints (6 endpoints)
- Business Rules atualizadas
- Status codes para novos erros

**Estimativa:** 2 horas

---

### **FASE 2: Atualização API Escola** (Prioridade: ALTA)

#### **2.1. Entity: escola.model.ts**

**Adicionar campos privados:**
```typescript
#EscolaCNPJ: string | null = null;
#EscolaTelefone: string | null = null;
#EscolaEmail: string | null = null;
#EscolaEndereco: string | null = null;
#EscolaStatus: 'Ativa' | 'Inativa' = 'Ativa';
#EscolaCreatedAt: Date | null = null;
#EscolaUpdatedAt: Date | null = null;
```

**Validações:**
- `EscolaCNPJ`: formato XX.XXX.XXX/XXXX-XX (18 chars) - OPCIONAL
- `EscolaTelefone`: formato (XX) XXXXX-XXXX (15 chars)
- `EscolaEmail`: regex de email
- `EscolaEndereco`: 10-200 caracteres
- `EscolaStatus`: enum ('Ativa', 'Inativa')

**Estimativa:** 2-3 horas

---

#### **2.2. Repository: escola.repository.ts**

**Atualizar queries:**
```typescript
// CREATE
INSERT INTO escola (
  EscolaGUID, EscolaNome, EscolaCNPJ, EscolaTelefone,
  EscolaEmail, EscolaEndereco, EscolaCorPriEs, EscolaCorPriCl,
  EscolaCorSecEs, EscolaCorSecCl, EscolaIcone, EscolaStatus
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

// SELECT - Incluir novos campos
SELECT * FROM escola

// UPDATE - Incluir novos campos
UPDATE escola SET
  EscolaNome = ?, EscolaCNPJ = ?, EscolaTelefone = ?,
  EscolaEmail = ?, EscolaEndereco = ?, EscolaStatus = ?
WHERE EscolaGUID = ?
```

**Novos métodos:**
```typescript
findByCNPJ(cnpj: string): Promise<Escola | null>
findByStatus(status: string): Promise<Escola[]>
findActive(): Promise<Escola[]>
alterarStatus(guid: string, status: string): Promise<boolean>
```

**Estimativa:** 2-3 horas

---

#### **2.3. Service: escola.service.ts**

**Atualizar DTO:**
```typescript
interface EscolaDTO {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCNPJ: string | null;              // NOVO
  EscolaTelefone: string | null;          // NOVO
  EscolaEmail: string | null;             // NOVO
  EscolaEndereco: string | null;          // NOVO
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null;  // Base64
  EscolaStatus: 'Ativa' | 'Inativa';      // NOVO
  EscolaCreatedAt: string;                // NOVO
  EscolaUpdatedAt: string;                // NOVO
}
```

**Validação de unicidade:**
- CNPJ único (se fornecido)

**Novos métodos:**
```typescript
alterarStatus(guid: string, novoStatus: string): Promise<EscolaDTO>
listarAtivas(): Promise<EscolaDTO[]>
```

**Regra de negócio crítica:**
- **Escola Inativa bloqueia login:** Ao marcar escola como Inativa, nenhum usuário vinculado pode fazer login

**Estimativa:** 2-3 horas

---

#### **2.4. Middleware: escola.middleware.ts**

**Validações:**
```typescript
// CNPJ: XX.XXX.XXX/XXXX-XX
if (escola.EscolaCNPJ && escola.EscolaCNPJ.length !== 18) {
  throw new ErrorResponse(400, "CNPJ deve ter 18 caracteres");
}

// Telefone: (XX) XXXXX-XXXX
if (escola.EscolaTelefone && escola.EscolaTelefone.length !== 15) {
  throw new ErrorResponse(400, "Telefone deve ter 15 caracteres");
}

// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (escola.EscolaEmail && !emailRegex.test(escola.EscolaEmail)) {
  throw new ErrorResponse(400, "Email inválido");
}

// Status
const statusValidos = ['Ativa', 'Inativa'];
if (escola.EscolaStatus && !statusValidos.includes(escola.EscolaStatus)) {
  throw new ErrorResponse(400, "Status inválido");
}
```

**Estimativa:** 1-2 horas

---

#### **2.5. Controller: escola.controller.ts**

**Endpoints a adicionar:**
```typescript
// PATCH /api/escola/:guid/status
alterarStatus = async (req: Request, res: Response, next: NextFunction)

// GET /api/escola/ativas
listarAtivas = async (req: Request, res: Response, next: NextFunction)
```

**Estimativa:** 1 hora

---

#### **2.6. Routes: escola.routes.ts**

**Rotas a adicionar:**
```typescript
router.patch("/:EscolaGUID/status", validateGuidParam, validateStatus, alterarStatus);
router.get("/ativas", listarAtivas);
```

**Estimativa:** 30 minutos

---

#### **2.7. Documentação: escola-api.md**

**Atualizar:**
- Data Models com 7 novos campos
- Exemplos de request/response
- 2 novos endpoints
- Validações de CNPJ, telefone, email

**Estimativa:** 1-2 horas

---

### **FASE 3: Atualização API EscolaxUsuarioxFuncao** (Prioridade: MÉDIA)

#### **3.1. Entity: escolaxusuarioxfuncao.model.ts**

**Adicionar campos:**
```typescript
#DataInicio: Date | null = null;
#DataFim: Date | null = null;
#Status: 'Ativo' | 'Inativo' = 'Ativo';
#CreatedAt: Date | null = null;
#UpdatedAt: Date | null = null;
```

**Validações:**
- `DataInicio`: não pode ser futura
- `DataFim`: deve ser >= DataInicio
- `Status`: enum ('Ativo', 'Inativo')

**Estimativa:** 1-2 horas

---

#### **3.2. Repository: escolaxusuarioxfuncao.repository.ts**

**Atualizar queries:**
```typescript
// CREATE
INSERT INTO escolaxusuarioxfuncao (
  UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, Status
) VALUES (?, ?, ?, ?, ?)

// SELECT
SELECT * FROM escolaxusuarioxfuncao

// UPDATE
UPDATE escolaxusuarioxfuncao SET
  DataFim = ?, Status = ?
WHERE EscolaxUsuarioxFuncaoId = ?
```

**Novos métodos:**
```typescript
findActiveByUsuario(cpf: string): Promise<EscolaxUsuarioxFuncao[]>
findActiveByEscola(guid: string): Promise<EscolaxUsuarioxFuncao[]>
finalizarVinculo(id: number, dataFim: Date): Promise<boolean>
alterarStatus(id: number, status: string): Promise<boolean>
```

**Estimativa:** 2 horas

---

#### **3.3. Service: escolaxusuarioxfuncao.service.ts**

**Atualizar DTO:**
```typescript
interface EscolaxUsuarioxFuncaoDTO {
  EscolaxUsuarioxFuncaoId: number | null;
  UsuarioCPF: string;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  DataInicio: string | null;          // NOVO (ISO date)
  DataFim: string | null;             // NOVO (ISO date)
  Status: 'Ativo' | 'Inativo';        // NOVO
  CreatedAt: string;                  // NOVO (ISO timestamp)
  UpdatedAt: string;                  // NOVO (ISO timestamp)
}
```

**Novos métodos:**
```typescript
finalizarVinculo(id: number, dataFim: Date): Promise<EscolaxUsuarioxFuncaoDTO>
alterarStatus(id: number, status: string): Promise<EscolaxUsuarioxFuncaoDTO>
listarAtivos(): Promise<EscolaxUsuarioxFuncaoDTO[]>
```

**Estimativa:** 2 horas

---

#### **3.4-3.7. Middleware, Controller, Routes, Docs**

**Endpoints novos:**
```typescript
// PATCH /api/escolaxusuarioxfuncao/:id/finalizar
finalizarVinculo

// PATCH /api/escolaxusuarioxfuncao/:id/status
alterarStatus

// GET /api/escolaxusuarioxfuncao/ativos
listarAtivos
```

**Estimativa:** 2-3 horas

---

### **FASE 4: Nova API VerificacaoEmail** (Prioridade: CRÍTICA)

#### **4.1. Arquivos a criar (7 arquivos):**

1. ✅ `entities/verificacao-email.model.ts`
2. ✅ `repositories/verificacao-email.repository.ts`
3. ✅ `services/verificacao-email.service.ts`
4. ✅ `middlewares/verificacao-email.middleware.ts`
5. ✅ `controllers/verificacao-email.controller.ts`
6. ✅ `routes/verificacao-email.routes.ts`
7. ✅ `docs/routes/verificacao-email-api.md`

#### **4.2. Funcionalidades:**

**Endpoints:**
```typescript
POST /api/verificacao-email/solicitar
  Body: { UsuarioCPF, UsuarioEmail }
  - Gera código aleatório (6-10 dígitos)
  - Salva no BD com expiração (15 minutos)
  - Envia email com código
  - Retorna: { success, message: "Código enviado" }

POST /api/verificacao-email/validar
  Body: { UsuarioCPF, VerificacaoCodigo }
  - Valida código
  - Verifica se não expirou
  - Verifica se não foi usado
  - Marca UsuarioEmailVerificado = TRUE
  - Marca VerificacaoUsado = TRUE
  - Retorna: { success, message: "Email verificado" }

POST /api/verificacao-email/reenviar
  Body: { UsuarioCPF }
  - Invalida códigos anteriores
  - Gera novo código
  - Envia email
  - Retorna: { success, message: "Código reenviado" }
```

**Integração com serviço de email:**
- Usar `ResendEmailService` ou `SendBrevoEmailService`
- Template: "Seu código de verificação: XXXXXX"

**Regras de negócio:**
- Código expira em 15 minutos
- Máximo 3 tentativas por CPF em 1 hora
- Código só pode ser usado 1 vez
- Invalidar códigos antigos ao gerar novo

**Estimativa total:** 6-8 horas

---

## 📊 Resumo de Esforço

| Fase | Componente | Tempo Estimado | Prioridade |
|------|-----------|----------------|------------|
| 1 | API Usuario (7 tarefas) | 14-19 horas | 🔴 CRÍTICA |
| 2 | API Escola (7 tarefas) | 8-12 horas | 🔴 ALTA |
| 3 | API EscolaxUsuarioxFuncao (4 tarefas) | 5-7 horas | 🟡 MÉDIA |
| 4 | Nova API VerificacaoEmail | 6-8 horas | 🔴 CRÍTICA |
| **TOTAL** | **25 tarefas** | **33-46 horas** | - |

**Nota:** Tempo reduzido na API Escola devido à remoção do campo EscolaLogo (sem utilidade).

---

## 🎯 Ordem de Implementação Recomendada

### **Sprint 1 (Crítico - 18-25h):**
1. ✅ Nova API VerificacaoEmail completa (6-8h)
2. ✅ API Usuario - Campos críticos (Status, EmailVerificado) (6-8h)
3. ✅ API Usuario - Novos endpoints de Status (2-3h)
4. ✅ API Escola - Campo Status (BLOQUEIA login quando Inativa) (4-6h)

### **Sprint 2 (Importante - 10-14h):**
5. ✅ API Usuario - Campos auditoria (DataNascimento, timestamps) (4-6h)
6. ✅ API Escola - Campos complementares (CNPJ, Telefone, Email, Endereço) (4-6h)
7. ✅ API Usuario - Soft delete (2h)

### **Sprint 3 (Melhorias - 5-7h):**
8. ✅ API EscolaxUsuarioxFuncao - Todos os campos (5-7h)

**Total estimado:** 33-46 horas

---

## ⚠️ Breaking Changes

### **API Usuario:**
- DTO retorna 7 novos campos (frontend precisa adaptar)
- DELETE passa a ser soft delete (comportamento diferente)
- Campos no CREATE: EmailVerificado = FALSE (padrão), Status = 'Ativo' (padrão)
- ⚠️ Email NÃO verificado NÃO bloqueia login (alunos podem entrar com credenciais da secretaria)

### **API Escola:**
- DTO retorna 6 novos campos (EscolaLogo foi REMOVIDO)
- CNPJ é opcional (pode ser NULL)
- 🔴 **CRÍTICO:** Escola com Status = 'Inativa' BLOQUEIA login de todos os usuários vinculados

### **API EscolaxUsuarioxFuncao:**
- DTO retorna 5 novos campos
- Status = 'Ativo' por padrão
- DataInicio = CURRENT_DATE por padrão

---

## 📦 Dependências Externas

1. **Serviço de Email:**
   - `ResendEmailService` ou `SendBrevoEmailService`
   - Template HTML para código de verificação

2. **Validações:**
   - Biblioteca de validação de CNPJ (opcional)
   - Biblioteca de validação de CPF (opcional)

3. **Testes:**
   - Atualizar testes existentes
   - Criar testes para novos endpoints
   - Testar integração com email

---

## 🔍 Considerações Importantes

### **Email Verificado (NÃO obrigatório):**
- ✅ Usuários criados pela secretaria podem fazer login SEM email verificado
- ✅ Verificação é opcional e feita pelo próprio usuário nas configurações
- ⚠️ Implementar tela de configurações com opção "Verificar Email"
- 💡 Mostrar badge/aviso no sistema quando email não verificado

### **Soft Delete:**
- Todas as queries devem filtrar `WHERE DeletedAt IS NULL`
- Criar índice em DeletedAt para performance
- Permitir restauração de usuários deletados (endpoint PATCH /restaurar)

### **Timestamps:**
- CreatedAt/UpdatedAt gerenciados automaticamente pelo MySQL
- Não enviar esses campos no body de CREATE/UPDATE
- Apenas retornar no DTO (read-only)

### **Status:**
- **Usuario:** 'Ativo', 'Inativo', 'Bloqueado'
  - Ativo: pode fazer login normalmente
  - Inativo: não pode fazer login
  - Bloqueado: não pode fazer login (usado para punições/suspensões)
  
- **Escola:** 'Ativa', 'Inativa'
  - ⚠️ **Ativa:** Usuários vinculados podem fazer login
  - 🔴 **Inativa:** BLOQUEIA login de TODOS os usuários vinculados à escola
  
- **EscolaxUsuarioxFuncao:** 'Ativo', 'Inativo'
  - Permite desativar vínculo sem deletar (ex: professor de licença)

### **Verificação de Email:**
- Código aleatório com 6-10 caracteres
- Validade: 15 minutos (configurável)
- Máximo 3 tentativas por CPF em 1 hora (anti-spam)
- Código usado 1 vez apenas (flag VerificacaoUsado)
- Invalidar códigos antigos ao gerar novo

---

## ✅ Checklist de Validação

Após implementação, verificar:

- [ ] Todas as entities têm todos os campos do SQL
- [ ] Todos os repositories fazem SELECT/INSERT/UPDATE com campos corretos
- [ ] DTOs não incluem campos sensíveis (Senha, DeletedAt)
- [ ] Middlewares validam novos campos
- [ ] Controllers tratam novos erros (status bloqueado, escola inativa)
- [ ] Routes registradas no Server.ts
- [ ] Documentação API atualizada
- [ ] Testes unitários criados/atualizados
- [ ] Testes de integração com banco de dados
- [ ] Frontend atualizado para novos campos
- [ ] Serviço de email funcionando (Brevo)
- [ ] Migration/seed do banco executados
- [ ] **Campo EscolaLogo REMOVIDO do sql.txt** (sem utilidade)
- [ ] Tela de configurações implementada (verificar email pelo usuário)

---

## ✅ Decisões de Negócio Definidas

1. **Email verificado é obrigatório?**
   - [ ] Sim - Usuário não pode fazer login sem verificar
   - [x] **NÃO** - Alunos podem entrar com logins criados pela secretaria. Verificação é opcional e feita pelo usuário nas configurações

2. **CNPJ da escola é obrigatório?**
   - [ ] Sim - Todas as escolas devem ter CNPJ
   - [x] **NÃO** - Opcional (pode ser escola online/cursinhos)

3. **Soft delete ou hard delete?**
   - [x] **SOFT DELETE** - Permite auditoria e recuperação
   - [ ] Hard delete - Remove permanentemente

4. **DataNascimento obrigatório?**
   - [ ] Sim - Para todos os usuários
   - [x] **OPCIONAL** - Pode ser informado posteriormente

5. **Status de Escola Inativa bloqueia login?**
   - [x] **SIM** - Escola Inativa bloqueia acesso de todos os usuários vinculados
   - [ ] Não - Apenas oculta da lista

6. **Campo EscolaLogo?**
   - [ ] Sim - Necessário
   - [x] **NÃO** - Campo removido (sem utilidade, já existe EscolaIcone)

---

**Última atualização:** 08/03/2026  
**Autor:** GitHub Copilot  
**Versão do planejamento:** 1.0
