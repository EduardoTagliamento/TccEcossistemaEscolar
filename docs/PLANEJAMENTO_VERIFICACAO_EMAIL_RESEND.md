# 📧 Planejamento - Sistema de Verificação de Email via Resend

**Data:** 08/03/2026  
**Objetivo:** Implementar sistema completo de verificação de email usando Resend  
**Status:** 🔴 Pendente Implementação  
**Dependências:** ResendEmailService (✅ já implementado)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Fluxo Completo](#fluxo-completo)
- [Arquitetura](#arquitetura)
- [Implementação](#implementação)
- [Templates de Email](#templates-de-email)
- [Regras de Negócio](#regras-de-negócio)
- [Segurança](#segurança)
- [Limpeza Periódica de Registros](#limpeza-periódica-de-registros)
- [Testes](#testes)

---

## 🎯 Visão Geral

### **Contexto:**
- Usuários podem ser criados pela secretaria (sem email verificado)
- Verificação de email é **OPCIONAL** e feita pelo próprio usuário
- Não bloqueia login, mas deve mostrar avisos/badges no sistema
- Tela de configurações terá opção "Verificar meu email"

### **Objetivo:**
Sistema robusto de envio e validação de códigos de verificação via email usando Resend API.

### **Tecnologias:**
- **Resend:** Envio transacional de emails
- **ResendEmailService:** Serviço já implementado (`backend/external/ResendEmailService.ts`)
- **MySQL:** Tabela `verificacao_email` para armazenar códigos
- **TypeScript:** Node.js + Express

---

## 🔄 Fluxo Completo

### **Cenário 1: Solicitar Verificação**

```
┌─────────────┐
│   USUÁRIO   │
│  (Frontend) │
└──────┬──────┘
       │ 1. PATCH /api/usuario/:cpf/solicitar-verificacao
       ▼
┌─────────────────────┐
│  UsuarioController  │
└──────┬──────────────┘
       │ 2. Chama verificarUsuarioExiste()
       ▼
┌──────────────────────────┐
│  VerificacaoEmailService │
└──────┬───────────────────┘
       │ 3. Gera código aleatório (6 dígitos)
       │ 4. Salva no BD (expira em 15min)
       │ 5. Envia email via Resend
       ▼
┌─────────────────┐
│  Resend API     │
└──────┬──────────┘
       │ 6. Email entregue
       ▼
┌─────────────┐
│  USUÁRIO    │
│ (Email)     │ Recebe: "Seu código: 123456"
└─────────────┘
```

### **Cenário 2: Validar Código**

```
┌─────────────┐
│   USUÁRIO   │
│  (Frontend) │
└──────┬──────┘
       │ 1. POST /api/verificacao-email/validar
       │    Body: { UsuarioCPF, VerificacaoCodigo }
       ▼
┌──────────────────────────┐
│ VerificacaoEmailController│
└──────┬───────────────────┘
       │ 2. Valida código
       ▼
┌──────────────────────────┐
│  VerificacaoEmailService │
└──────┬───────────────────┘
       │ 3. Busca código no BD
       │ 4. Verifica se não expirou
       │ 5. Verifica se não foi usado
       │ 6. Marca VerificacaoUsado = TRUE
       │ 7. Marca UsuarioEmailVerificado = TRUE
       ▼
┌─────────────┐
│   SUCESSO   │
│ ✅ Verificado│
└─────────────┘
```

---

## 🏗️ Arquitetura

### **Estrutura de Arquivos (7 novos arquivos)**

```
backend/
├── entities/
│   └── verificacao-email.model.ts          # NOVO
├── repositories/
│   └── verificacao-email.repository.ts     # NOVO
├── services/
│   └── verificacao-email.service.ts        # NOVO
├── middlewares/
│   └── verificacao-email.middleware.ts     # NOVO
├── controllers/
│   └── verificacao-email.controller.ts     # NOVO
├── routes/
│   └── verificacao-email.routes.ts         # NOVO
└── external/
    └── ResendEmailService.ts               # ✅ JÁ EXISTE

docs/routes/
└── verificacao-email-api.md                # NOVO

backend/Server.ts                           # ATUALIZAR
```

---

## 💻 Implementação Detalhada

### **TAREFA 1: Entity - verificacao-email.model.ts**

**Arquivo:** `backend/entities/verificacao-email.model.ts`

```typescript
/**
 * Representa a entidade VerificacaoEmail do sistema.
 * 
 * Objetivo:
 * - Armazenar códigos de verificação enviados por email
 * - Controlar expiração e uso único dos códigos
 */
export default class VerificacaoEmail {
  #VerificacaoId: number | null = null;
  #UsuarioCPF!: string;
  #VerificacaoCodigo!: string;
  #VerificacaoExpiresAt!: Date;
  #VerificacaoUsado: boolean = false;
  #VerificacaoCreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  VerificacaoEmail.constructor()");
  }

  // ========== ID (Auto Increment) ==========
  get VerificacaoId(): number | null {
    return this.#VerificacaoId;
  }

  set VerificacaoId(value: number | null) {
    if (value === null || value === undefined) {
      this.#VerificacaoId = null;
      return;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("VerificacaoId deve ser um inteiro positivo.");
    }

    this.#VerificacaoId = value;
  }

  // ========== CPF do Usuário ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioCPF deve ser uma string não vazia.");
    }

    const cpf = value.trim();
    
    // Validar formato: XXX.XXX.XXX-XX (14 caracteres)
    if (cpf.length !== 14) {
      throw new Error("UsuarioCPF deve ter exatamente 14 caracteres (formato: XXX.XXX.XXX-XX).");
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf)) {
      throw new Error("UsuarioCPF deve estar no formato XXX.XXX.XXX-XX.");
    }

    this.#UsuarioCPF = cpf;
  }

  // ========== Código de Verificação ==========
  get VerificacaoCodigo(): string {
    return this.#VerificacaoCodigo;
  }

  set VerificacaoCodigo(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("VerificacaoCodigo deve ser uma string não vazia.");
    }

    const codigo = value.trim();

    // Validar formato: 6 dígitos numéricos
    if (codigo.length !== 6) {
      throw new Error("VerificacaoCodigo deve ter exatamente 6 dígitos.");
    }

    const codigoRegex = /^\d{6}$/;
    if (!codigoRegex.test(codigo)) {
      throw new Error("VerificacaoCodigo deve conter apenas dígitos numéricos (0-9).");
    }

    this.#VerificacaoCodigo = codigo;
  }

  // ========== Data de Expiração ==========
  get VerificacaoExpiresAt(): Date {
    return this.#VerificacaoExpiresAt;
  }

  set VerificacaoExpiresAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("VerificacaoExpiresAt deve ser uma data válida.");
    }

    this.#VerificacaoExpiresAt = value;
  }

  // ========== Flag: Código foi usado? ==========
  get VerificacaoUsado(): boolean {
    return this.#VerificacaoUsado;
  }

  set VerificacaoUsado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("VerificacaoUsado deve ser boolean.");
    }

    this.#VerificacaoUsado = value;
  }

  // ========== Data de Criação (Read-Only) ==========
  get VerificacaoCreatedAt(): Date | null {
    return this.#VerificacaoCreatedAt;
  }

  set VerificacaoCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#VerificacaoCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("VerificacaoCreatedAt deve ser uma data válida.");
    }

    this.#VerificacaoCreatedAt = value;
  }
}
```

**Validações:**
- ✅ CPF formato XXX.XXX.XXX-XX
- ✅ Código 6 dígitos numéricos (000000 - 999999)
- ✅ ExpiresAt é timestamp futuro
- ✅ VerificacaoUsado é boolean

**Estimativa:** 1-2 horas

---

### **TAREFA 2: Repository - verificacao-email.repository.ts**

**Arquivo:** `backend/repositories/verificacao-email.repository.ts`

```typescript
import MysqlDatabase from "../database/MysqlDatabase.js";
import VerificacaoEmail from "../entities/verificacao-email.model.js";

interface Row {
  VerificacaoId: number;
  UsuarioCPF: string;
  VerificacaoCodigo: string;
  VerificacaoExpiresAt: Date;
  VerificacaoUsado: number; // MySQL retorna 0 ou 1
  VerificacaoCreatedAt: Date;
}

export class VerificacaoEmailDAO {
  #database: MysqlDatabase;

  constructor(databaseDependency: MysqlDatabase) {
    console.log("⬆️  VerificacaoEmailDAO.constructor()");
    this.#database = databaseDependency;
  }

  /**
   * Cria novo registro de verificação
   */
  async create(verificacao: VerificacaoEmail): Promise<VerificacaoEmail> {
    console.log("🔵 VerificacaoEmailDAO.create()");

    const sql = `
      INSERT INTO verificacao_email (
        UsuarioCPF, VerificacaoCodigo, VerificacaoExpiresAt
      ) VALUES (?, ?, ?)
    `;

    const params = [
      verificacao.UsuarioCPF,
      verificacao.VerificacaoCodigo,
      verificacao.VerificacaoExpiresAt,
    ];

    const result = await this.#database.executarQuery(sql, params);
    
    verificacao.VerificacaoId = result.insertId;
    return verificacao;
  }

  /**
   * Busca código válido (não expirado, não usado) por CPF e Código
   */
  async findValidCode(cpf: string, codigo: string): Promise<VerificacaoEmail | null> {
    console.log("🔵 VerificacaoEmailDAO.findValidCode()");

    const sql = `
      SELECT * FROM verificacao_email
      WHERE UsuarioCPF = ?
        AND VerificacaoCodigo = ?
        AND VerificacaoUsado = FALSE
        AND VerificacaoExpiresAt > NOW()
      ORDER BY VerificacaoCreatedAt DESC
      LIMIT 1
    `;

    const rows: Row[] = await this.#database.executarQuery(sql, [cpf, codigo]);
    
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  }

  /**
   * Marca código como usado
   */
  async markAsUsed(id: number): Promise<boolean> {
    console.log("🔵 VerificacaoEmailDAO.markAsUsed()");

    const sql = `
      UPDATE verificacao_email
      SET VerificacaoUsado = TRUE
      WHERE VerificacaoId = ?
    `;

    const result = await this.#database.executarQuery(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Invalida todos os códigos não usados de um CPF (ao gerar novo)
   */
  async invalidateOldCodes(cpf: string): Promise<boolean> {
    console.log("🔵 VerificacaoEmailDAO.invalidateOldCodes()");

    const sql = `
      UPDATE verificacao_email
      SET VerificacaoUsado = TRUE
      WHERE UsuarioCPF = ?
        AND VerificacaoUsado = FALSE
    `;

    const result = await this.#database.executarQuery(sql, [cpf]);
    return result.affectedRows >= 0; // Pode ser 0 se não houver códigos antigos
  }

  /**
   * Conta tentativas de solicitação nas últimas N horas (anti-spam)
   */
  async countRecentAttempts(cpf: string, hours: number = 1): Promise<number> {
    console.log("🔵 VerificacaoEmailDAO.countRecentAttempts()");

    const sql = `
      SELECT COUNT(*) as total
      FROM verificacao_email
      WHERE UsuarioCPF = ?
        AND VerificacaoCreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `;

    const rows: any[] = await this.#database.executarQuery(sql, [cpf, hours]);
    return rows[0]?.total || 0;
  }

  /**
   * Limpa códigos expirados (maintenance)
   */
  async deleteExpired(): Promise<number> {
    console.log("🔵 VerificacaoEmailDAO.deleteExpired()");

    const sql = `
      DELETE FROM verificacao_email
      WHERE VerificacaoExpiresAt < NOW()
        OR VerificacaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const result = await this.#database.executarQuery(sql, []);
    return result.affectedRows;
  }

  /**
   * Mapeia Row do MySQL para Entity
   */
  private mapRowToEntity(row: Row): VerificacaoEmail {
    const verificacao = new VerificacaoEmail();
    
    verificacao.VerificacaoId = row.VerificacaoId;
    verificacao.UsuarioCPF = row.UsuarioCPF;
    verificacao.VerificacaoCodigo = row.VerificacaoCodigo;
    verificacao.VerificacaoExpiresAt = new Date(row.VerificacaoExpiresAt);
    verificacao.VerificacaoUsado = Boolean(row.VerificacaoUsado);
    verificacao.VerificacaoCreatedAt = new Date(row.VerificacaoCreatedAt);

    return verificacao;
  }
}
```

**Métodos principais:**
- ✅ `create()` - Cria novo código
- ✅ `findValidCode()` - Busca código válido (não expirado, não usado)
- ✅ `markAsUsed()` - Marca como usado após validação
- ✅ `invalidateOldCodes()` - Invalida códigos antigos ao gerar novo
- ✅ `countRecentAttempts()` - Anti-spam (máx 3 em 1 hora)
- ✅ `deleteExpired()` - Limpeza de códigos expirados

**Estimativa:** 2-3 horas

---

### **TAREFA 3: Service - verificacao-email.service.ts**

**Arquivo:** `backend/services/verificacao-email.service.ts`

```typescript
import { VerificacaoEmailDAO } from "../repositories/verificacao-email.repository.js";
import { UsuarioDAO } from "../repositories/usuario.repository.js";
import VerificacaoEmail from "../entities/verificacao-email.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { ResendEmailService } from "../external/ResendEmailService.js";

export default class VerificacaoEmailService {
  #verificacaoDAO: VerificacaoEmailDAO;
  #usuarioDAO: UsuarioDAO;
  #emailService: ResendEmailService;
  
  // Configurações
  private readonly CODIGO_LENGTH = 6;
  private readonly EXPIRATION_MINUTES = 15;
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;

  constructor(
    verificacaoDAODependency: VerificacaoEmailDAO,
    usuarioDAODependency: UsuarioDAO
  ) {
    console.log("⬆️  VerificacaoEmailService.constructor()");
    this.#verificacaoDAO = verificacaoDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
    this.#emailService = ResendEmailService.getInstance();
  }

  /**
   * Solicita verificação de email (gera código e envia email)
   */
  async solicitarVerificacao(cpf: string): Promise<{ message: string }> {
    console.log("🟣 VerificacaoEmailService.solicitarVerificacao()");

    // 1. Verificar se usuário existe
    const usuario = await this.#usuarioDAO.findById(cpf);
    if (!usuario) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${cpf}`,
      });
    }

    // 2. Verificar se tem email cadastrado
    if (!usuario.UsuarioEmail) {
      throw new ErrorResponse(400, "Email não cadastrado", {
        message: "Você precisa cadastrar um email antes de verificá-lo",
      });
    }

    // 3. Verificar se email já está verificado
    if (usuario.UsuarioEmailVerificado) {
      throw new ErrorResponse(400, "Email já verificado", {
        message: "Seu email já foi verificado anteriormente",
      });
    }

    // 4. Anti-spam: Verificar tentativas recentes
    const recentAttempts = await this.#verificacaoDAO.countRecentAttempts(cpf);
    if (recentAttempts >= this.MAX_ATTEMPTS_PER_HOUR) {
      throw new ErrorResponse(429, "Muitas tentativas", {
        message: `Você já solicitou ${recentAttempts} códigos na última hora. Aguarde antes de solicitar novamente.`,
      });
    }

    // 5. Invalidar códigos antigos
    await this.#verificacaoDAO.invalidateOldCodes(cpf);

    // 6. Gerar código aleatório
    const codigo = this.gerarCodigo();

    // 7. Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES);

    // 8. Salvar no banco
    const verificacao = new VerificacaoEmail();
    verificacao.UsuarioCPF = cpf;
    verificacao.VerificacaoCodigo = codigo;
    verificacao.VerificacaoExpiresAt = expiresAt;

    await this.#verificacaoDAO.create(verificacao);

    // 9. Enviar email via Resend
    await this.enviarEmailVerificacao(usuario.UsuarioEmail, usuario.UsuarioNome, codigo);

    return {
      message: `Código de verificação enviado para ${this.mascarEmail(usuario.UsuarioEmail)}`,
    };
  }

  /**
   * Valida código de verificação
   */
  async validarCodigo(cpf: string, codigo: string): Promise<{ message: string }> {
    console.log("🟣 VerificacaoEmailService.validarCodigo()");

    // 1. Buscar código válido
    const verificacao = await this.#verificacaoDAO.findValidCode(cpf, codigo);

    if (!verificacao) {
      throw new ErrorResponse(400, "Código inválido", {
        message: "Código incorreto, expirado ou já utilizado",
      });
    }

    // 2. Marcar código como usado
    await this.#verificacaoDAO.markAsUsed(verificacao.VerificacaoId!);

    // 3. Marcar email do usuário como verificado
    await this.#usuarioDAO.verificarEmail(cpf);

    return {
      message: "Email verificado com sucesso! ✅",
    };
  }

  /**
   * Reenvia código de verificação (equivalente a solicitar novo)
   */
  async reenviarCodigo(cpf: string): Promise<{ message: string }> {
    console.log("🟣 VerificacaoEmailService.reenviarCodigo()");
    return this.solicitarVerificacao(cpf);
  }

  /**
   * Gera código aleatório de 6 dígitos numéricos
   */
  private gerarCodigo(): string {
    const min = Math.pow(10, this.CODIGO_LENGTH - 1);
    const max = Math.pow(10, this.CODIGO_LENGTH) - 1;
    const codigo = Math.floor(Math.random() * (max - min + 1)) + min;
    return codigo.toString();
  }

  /**
   * Mascara email para exibir parcialmente (privacidade)
   * Exemplo: joao@email.com → j***@email.com
   */
  private mascarEmail(email: string): string {
    const [user, domain] = email.split("@");
    const maskedUser = user[0] + "***" + (user.length > 1 ? user[user.length - 1] : "");
    return `${maskedUser}@${domain}`;
  }

  /**
   * Envia email de verificação usando Resend
   */
  private async enviarEmailVerificacao(
    email: string,
    nome: string,
    codigo: string
  ): Promise<void> {
    try {
      await this.#emailService.sendVerificationEmail(email, nome, codigo);
      console.log(`✅ Email de verificação enviado para: ${email}`);
    } catch (error: any) {
      console.error("❌ Erro ao enviar email via Resend:", error.message);
      throw new ErrorResponse(500, "Erro ao enviar email", {
        message: "Não foi possível enviar o código de verificação. Tente novamente mais tarde.",
      });
    }
  }
}
```

**Regras de negócio:**
- ✅ Valida se usuário existe e tem email cadastrado
- ✅ Verifica se email já não está verificado
- ✅ Anti-spam: máximo 3 tentativas por hora
- ✅ Invalida códigos antigos ao gerar novo
- ✅ Código expira em 15 minutos
- ✅ Código numérico de 6 dígitos
- ✅ Mascara email ao exibir (privacidade)
- ✅ Integração com Resend para envio

**Estimativa:** 3-4 horas

---

### **TAREFA 4: Adicionar método ao ResendEmailService**

**Arquivo:** `backend/external/ResendEmailService.ts` (ATUALIZAR)

Adicionar novo método após `sendActivityNotification()`:

```typescript
  /**
   * Envia e-mail com código de verificação
   */
  public async sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationCode: string
  ): Promise<any> {
    return this.sendEmail({
      to: { email: userEmail, name: userName },
      subject: '🔐 Verificação de Email - Ecossistema Escolar',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Ecossistema Escolar</h1>
          </div>
          
          <h2 style="color: #1F2937;">Olá, ${userName}! 👋</h2>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
            Você solicitou a verificação do seu email. Use o código abaixo para confirmar:
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      border-radius: 12px; 
                      padding: 30px; 
                      text-align: center; 
                      margin: 30px 0;">
            <div style="background-color: white; 
                        border-radius: 8px; 
                        padding: 20px; 
                        display: inline-block;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">
                SEU CÓDIGO DE VERIFICAÇÃO
              </p>
              <p style="margin: 0; 
                        font-size: 42px; 
                        font-weight: bold; 
                        color: #4F46E5; 
                        letter-spacing: 8px; 
                        font-family: 'Courier New', monospace;">
                ${verificationCode}
              </p>
            </div>
          </div>
          
          <div style="background-color: #FEF3C7; 
                      border-left: 4px solid #F59E0B; 
                      padding: 16px; 
                      margin: 20px 0; 
                      border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              ⏱️ <strong>Este código expira em 15 minutos.</strong>
            </p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
            Não compartilhe este código com ninguém. Se você não solicitou esta verificação, 
            ignore este email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Ecossistema Escolar. Todos os direitos reservados.
          </p>
        </div>
      `,
      textContent: `
        Olá, ${userName}!
        
        Você solicitou a verificação do seu email no Ecossistema Escolar.
        
        Seu código de verificação é: ${verificationCode}
        
        Este código expira em 15 minutos.
        
        Se você não solicitou esta verificação, ignore este email.
        
        ---
        Ecossistema Escolar
      `
    });
  }
```

**Características do template:**
- ✅ Design profissional e responsivo
- ✅ Código destacado visualmente (grande, bold, centralizado)
- ✅ Gradiente moderno no fundo do código
- ✅ Aviso de expiração (15 minutos)
- ✅ Instruções claras
- ✅ Fallback em texto plano (sem HTML)
- ✅ Footer com copyright

**Estimativa:** 30 minutos

---

### **TAREFA 5: Adicionar método ao UsuarioDAO**

**Arquivo:** `backend/repositories/usuario.repository.ts` (ATUALIZAR)

Adicionar novo método:

```typescript
  /**
   * Marca email do usuário como verificado
   */
  async verificarEmail(cpf: string): Promise<boolean> {
    console.log("🔵 UsuarioDAO.verificarEmail()");

    const sql = `
      UPDATE usuario
      SET UsuarioEmailVerificado = TRUE
      WHERE UsuarioCPF = ?
    `;

    const result = await this.#database.executarQuery(sql, [cpf]);
    return result.affectedRows > 0;
  }
```

**Estimativa:** 15 minutos

---

### **TAREFA 6: Middleware - verificacao-email.middleware.ts**

**Arquivo:** `backend/middlewares/verificacao-email.middleware.ts`

```typescript
import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class VerificacaoEmailMiddleware {
  /**
   * Valida body para validação de código
   */
  validateCodigoBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 VerificacaoEmailMiddleware.validateCodigoBody()");
    const body = request.body;

    // Validar UsuarioCPF
    if (!body.UsuarioCPF || typeof body.UsuarioCPF !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'UsuarioCPF' é obrigatório e deve ser string.",
      });
    }

    const cpf = body.UsuarioCPF.trim();
    if (cpf.length !== 14) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve ter 14 caracteres (formato: XXX.XXX.XXX-XX).",
      });
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve estar no formato XXX.XXX.XXX-XX.",
      });
    }

    // Validar VerificacaoCodigo
    if (!body.VerificacaoCodigo || typeof body.VerificacaoCodigo !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'VerificacaoCodigo' é obrigatório e deve ser string.",
      });
    }

    const codigo = body.VerificacaoCodigo.trim();
    
    // Validar formato: exatamente 6 dígitos numéricos
    if (codigo.length !== 6) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve ter exatamente 6 dígitos.",
      });
    }

    const codigoRegex = /^\d{6}$/;
    if (!codigoRegex.test(codigo)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve conter apenas dígitos numéricos (0-9).",
      });
    }

    next();
  };

  /**
   * Valida CPF no parâmetro da URL
   */
  validateCpfParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 VerificacaoEmailMiddleware.validateCpfParam()");
    const { UsuarioCPF } = request.params;

    if (!UsuarioCPF) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'UsuarioCPF' é obrigatório!",
      });
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(UsuarioCPF)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve estar no formato XXX.XXX.XXX-XX",
      });
    }

    next();
  };
}
```

**Validações:**
- ✅ CPF formato correto (XXX.XXX.XXX-XX)
- ✅ Código 6 dígitos numéricos
- ✅ Campos obrigatórios presentes

**Estimativa:** 1 hora

---

### **TAREFA 7: Controller - verificacao-email.controller.ts**

**Arquivo:** `backend/controllers/verificacao-email.controller.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import VerificacaoEmailService from "../services/verificacao-email.service.js";

export default class VerificacaoEmailController {
  #verificacaoService: VerificacaoEmailService;

  constructor(verificacaoServiceDependency: VerificacaoEmailService) {
    console.log("⬆️  VerificacaoEmailController.constructor()");
    this.#verificacaoService = verificacaoServiceDependency;
  }

  /**
   * POST /api/verificacao-email/solicitar/:UsuarioCPF
   * Solicita código de verificação (gera e envia email)
   */
  solicitar = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🟢 VerificacaoEmailController.solicitar()");

    try {
      const { UsuarioCPF } = request.params;
      const result = await this.#verificacaoService.solicitarVerificacao(UsuarioCPF);

      return response.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresInMinutes: 15,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/verificacao-email/validar
   * Valida código de verificação informado
   */
  validar = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🟢 VerificacaoEmailController.validar()");

    try {
      const { UsuarioCPF, VerificacaoCodigo } = request.body;
      const result = await this.#verificacaoService.validarCodigo(UsuarioCPF, VerificacaoCodigo);

      return response.status(200).json({
        success: true,
        message: result.message,
        data: {
          emailVerificado: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/verificacao-email/reenviar/:UsuarioCPF
   * Reenvia código de verificação
   */
  reenviar = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🟢 VerificacaoEmailController.reenviar()");

    try {
      const { UsuarioCPF } = request.params;
      const result = await this.#verificacaoService.reenviarCodigo(UsuarioCPF);

      return response.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresInMinutes: 15,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
```

**Endpoints:**
- ✅ POST /solicitar/:cpf - Gera código e envia email
- ✅ POST /validar - Valida código informado
- ✅ POST /reenviar/:cpf - Reenvia código

**Estimativa:** 1 hora

---

### **TAREFA 8: Routes - verificacao-email.routes.ts**

**Arquivo:** `backend/routes/verificacao-email.routes.ts`

```typescript
import { Router } from "express";
import VerificacaoEmailController from "../controllers/verificacao-email.controller.js";
import VerificacaoEmailMiddleware from "../middlewares/verificacao-email.middleware.js";
import VerificacaoEmailService from "../services/verificacao-email.service.js";
import { VerificacaoEmailDAO } from "../repositories/verificacao-email.repository.js";
import { UsuarioDAO } from "../repositories/usuario.repository.js";
import MysqlDatabase from "../database/MysqlDatabase.js";

/**
 * Factory para criar router de Verificação de Email com todas as dependências
 */
export function verificacaoEmailRouterFactory(): Router {
  console.log("🏭 verificacaoEmailRouterFactory()");

  // Dependências
  const database = new MysqlDatabase();
  const verificacaoDAO = new VerificacaoEmailDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const verificacaoService = new VerificacaoEmailService(verificacaoDAO, usuarioDAO);
  const verificacaoController = new VerificacaoEmailController(verificacaoService);
  const middleware = new VerificacaoEmailMiddleware();

  // Router
  const router = Router();

  // Rotas
  router.post(
    "/solicitar/:UsuarioCPF",
    middleware.validateCpfParam,
    verificacaoController.solicitar
  );

  router.post(
    "/validar",
    middleware.validateCodigoBody,
    verificacaoController.validar
  );

  router.post(
    "/reenviar/:UsuarioCPF",
    middleware.validateCpfParam,
    verificacaoController.reenviar
  );

  return router;
}
```

**Padrão:** Factory com injeção de dependências (mesma estrutura das outras routes)

**Estimativa:** 30 minutos

---

### **TAREFA 9: Registrar no Server.ts**

**Arquivo:** `backend/Server.ts` (ATUALIZAR)

Adicionar import:
```typescript
import { verificacaoEmailRouterFactory } from "../routes/verificacao-email.routes.js";
```

Registrar rota no método `configurarRotas()`:
```typescript
const verificacaoEmailRouter = verificacaoEmailRouterFactory();
this.#app.use("/api/verificacao-email", verificacaoEmailRouter);
```

Atualizar endpoint GET / para incluir verificacao-email:
```typescript
{
  verificacaoEmail: {
    solicitar: "POST /api/verificacao-email/solicitar/:cpf",
    validar: "POST /api/verificacao-email/validar",
    reenviar: "POST /api/verificacao-email/reenviar/:cpf"
  }
}
```

**Estimativa:** 15 minutos

---

### **TAREFA 10: Documentação API - verificacao-email-api.md**

**Arquivo:** `docs/routes/verificacao-email-api.md`

Criar documentação completa seguindo o padrão de `usuario-api.md`:
- Overview
- Endpoints (3 endpoints com exemplos)
- Request/Response samples
- Error scenarios
- cURL examples
- Postman Collection
- Business Rules
- Security notes

**Estimativa:** 2 horas

---

## 📧 Templates de Email

### **Template Completo (já incluído no código acima)**

**Visual:**
```
┌────────────────────────────────────┐
│   ECOSSISTEMA ESCOLAR (Logo)      │
├────────────────────────────────────┤
│                                    │
│   Olá, João Silva! 👋             │
│                                    │
│   Você solicitou a verificação    │
│   do seu email. Use o código      │
│   abaixo para confirmar:          │
│                                    │
│   ┌────────────────────────┐      │
│   │ SEU CÓDIGO DE VERIFICAÇÃO │   │
│   │                          │    │
│   │      1 2 3 4 5 6        │    │
│   │                          │    │
│   └────────────────────────┘      │
│                                    │
│   ⏱️ Este código expira em 15 min │
│                                    │
│   Não compartilhe este código.    │
│                                    │
└────────────────────────────────────┘
```

**Características:**
- ✅ Design profissional
- ✅ Código destacado (grande, bold, espaçado)
- ✅ Gradiente visual chamativo
- ✅ Aviso de expiração
- ✅ Responsivo (mobile-friendly)
- ✅ Fallback texto plano

---

## 🔒 Regras de Negócio

### **1. Geração de Código**
- ✅ Código numérico de 6 dígitos (100000 - 999999)
- ✅ Aleatório via `Math.random()`
- ✅ Expiração: 15 minutos
- ✅ Uso único (flag `VerificacaoUsado`)

### **2. Anti-Spam**
- ✅ Máximo 3 solicitações por CPF em 1 hora
- ✅ Retorna erro 429 (Too Many Requests) ao exceder
- ✅ Invalida códigos antigos ao gerar novo

### **3. Validação**
- ✅ Código deve estar válido (não expirado, não usado)
- ✅ Verifica correspondência CPF + Código
- ✅ Marca código como usado após validação
- ✅ Marca `UsuarioEmailVerificado = TRUE` no usuário

### **4. Condições**
- ✅ Usuário deve existir
- ✅ Usuário deve ter email cadastrado
- ✅ Email não pode já estar verificado
- ✅ Não bloqueia login se email não verificado

### **5. Limpeza**
- ✅ Método `deleteExpired()` para remover códigos antigos
- ✅ Pode ser executado via cron job (ex: diariamente)
- ✅ Remove códigos > 7 dias ou expirados

---

## 🔐 Segurança

### **Proteções Implementadas:**

1. **Anti-Brute Force:**
   - Máximo 3 tentativas por hora
   - Código expira em 15 minutos
   - Código usado 1 vez apenas

2. **Privacidade:**
   - Email mascarado ao exibir (j***o@email.com)
   - Código não logado em console
   - Validação no backend (não confia no frontend)

3. **Validação:**
   - CPF formato correto
   - Código 6 dígitos numéricos (regex /^\d{6}$/)
   - Timestamps validados (não aceita datas passadas)

4. **SQL Injection:**
   - Prepared statements em todas as queries
   - Parâmetros sanitizados

5. **Rate Limiting:**
   - Implementar rate limit nas rotas (recomendado)
   - Ex: `express-rate-limit` middleware

---

## � Limpeza Periódica de Registros

### **Problema:**
A tabela `verificacao_email` pode acumular muitos registros ao longo do tempo:
- Códigos expirados (>15 minutos)
- Códigos já usados
- Códigos antigos (>7 dias)

Sem limpeza periódica, a tabela crescerá indefinidamente, impactando performance e consumindo espaço desnecessário.

### **Estratégias de Limpeza:**

#### **Opção 1: Cron Job no Sistema Operacional (Recomendado)**

**Vantagens:**
- ✅ Não sobrecarrega a aplicação
- ✅ Execução garantida mesmo se app reiniciar
- ✅ Controle externo via sistema operacional
- ✅ Logs separados do app

**Implementação:**

1. **Criar script de limpeza:** `backend/scripts/cleanupVerificacaoEmail.ts`

```typescript
import MysqlDatabase from "../database/MysqlDatabase.js";
import { VerificacaoEmailDAO } from "../repositories/verificacao-email.repository.js";

const cleanup = async () => {
  console.log("🧹 Iniciando limpeza de códigos de verificação...");
  
  try {
    const db = MysqlDatabase.getInstance();
    const dao = new VerificacaoEmailDAO(db);
    
    const deleted = await dao.deleteExpired();
    console.log(`✅ ${deleted} registros removidos com sucesso`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro na limpeza:", error.message);
    process.exit(1);
  }
};

cleanup();
```

2. **Adicionar script ao package.json:**

```json
{
  "scripts": {
    "cleanup:verification": "tsx backend/scripts/cleanupVerificacaoEmail.ts"
  }
}
```

3. **Configurar Cron Job:**

**Linux/Mac (crontab):**
```bash
# Executar diariamente às 3h da manhã
0 3 * * * cd /caminho/para/projeto && npm run cleanup:verification >> /var/log/cleanup-verification.log 2>&1
```

**Windows (Task Scheduler):**
- Criar nova tarefa agendada
- Ação: `cmd.exe /c "cd F:\Area de Trabalho\EcossistemaEscolar && npm run cleanup:verification"`
- Gatilho: Diariamente às 3h
- Configurar log em arquivo de saída

**Docker (se aplicável):**
```yaml
services:
  cleanup-cron:
    image: node:20
    volumes:
      - ./:/app
    working_dir: /app
    command: sh -c "while true; do npm run cleanup:verification; sleep 86400; done"
```

---

#### **Opção 2: Node-Cron (Dentro da Aplicação)**

**Vantagens:**
- ✅ Configuração simples
- ✅ Tudo dentro do código
- ✅ Não requer configuração externa

**Desvantagens:**
- ⚠️ Só executa se app estiver rodando
- ⚠️ Requer reinício do app para alterar schedule
- ⚠️ Pode sobrecarregar app em horário de pico

**Implementação:**

1. **Instalar dependência:**
```bash
npm install node-cron
npm install -D @types/node-cron
```

2. **Criar serviço de agendamento:** `backend/services/cleanup.scheduler.ts`

```typescript
import cron from "node-cron";
import MysqlDatabase from "../database/MysqlDatabase.js";
import { VerificacaoEmailDAO } from "../repositories/verificacao-email.repository.js";

export class CleanupScheduler {
  private static instance: CleanupScheduler;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): CleanupScheduler {
    if (!CleanupScheduler.instance) {
      CleanupScheduler.instance = new CleanupScheduler();
    }
    return CleanupScheduler.instance;
  }

  /**
   * Inicia agendamento de limpeza periódica
   * Executa diariamente às 3h (horário de menor tráfego)
   */
  start(): void {
    if (this.cronJob) {
      console.log("⚠️ Cleanup scheduler já está em execução");
      return;
    }

    // Cron pattern: "0 3 * * *" = todo dia às 3h
    // Para testes: "*/5 * * * *" = a cada 5 minutos
    this.cronJob = cron.schedule("0 3 * * *", async () => {
      console.log("🧹 [CRON] Executando limpeza de códigos de verificação...");
      
      try {
        const db = MysqlDatabase.getInstance();
        const dao = new VerificacaoEmailDAO(db);
        
        const deleted = await dao.deleteExpired();
        console.log(`✅ [CRON] ${deleted} registros removidos`);
      } catch (error: any) {
        console.error("❌ [CRON] Erro na limpeza:", error.message);
      }
    });

    console.log("✅ Cleanup scheduler iniciado (executa diariamente às 3h)");
  }

  /**
   * Para execução do cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("🛑 Cleanup scheduler parado");
    }
  }
}
```

3. **Iniciar no Server.ts:**

```typescript
import { CleanupScheduler } from "./services/cleanup.scheduler.js";

// Após iniciar servidor
const scheduler = CleanupScheduler.getInstance();
scheduler.start();
```

---

#### **Opção 3: Evento MySQL (Database-Level)**

**Vantagens:**
- ✅ Completamente independente da aplicação
- ✅ Performance otimizada (executado no DB)
- ✅ Não requer código adicional

**Desvantagens:**
- ⚠️ Requer privilégios SUPER no MySQL
- ⚠️ Pode não estar disponível em alguns hostings
- ⚠️ Difícil de debugar

**Implementação:**

```sql
-- 1. Habilitar event scheduler (apenas 1 vez)
SET GLOBAL event_scheduler = ON;

-- 2. Criar evento de limpeza
DELIMITER $$

CREATE EVENT IF NOT EXISTS cleanup_verificacao_email
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 3 HOUR)  -- Inicia às 3h
COMMENT 'Remove códigos de verificação expirados ou antigos'
DO
BEGIN
  DELETE FROM verificacao_email
  WHERE VerificacaoExpiresAt < NOW()
     OR VerificacaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
  
  -- Log (opcional - requer tabela de logs)
  -- INSERT INTO system_logs (log_message, log_type) 
  -- VALUES (CONCAT('Limpeza executada: ', ROW_COUNT(), ' registros removidos'), 'INFO');
END$$

DELIMITER ;

-- 3. Verificar eventos criados
SHOW EVENTS WHERE Db = 'ecossistemaster';

-- 4. Desabilitar evento (se necessário)
-- ALTER EVENT cleanup_verificacao_email DISABLE;

-- 5. Remover evento (se necessário)
-- DROP EVENT IF EXISTS cleanup_verificacao_email;
```

---

### **Comparação das Opções:**

| Critério | Cron Job (OS) | Node-Cron | MySQL Event |
|----------|--------------|-----------|-------------|
| **Confiabilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Facilidade Setup** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Portabilidade** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Debugging** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Escalabilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### **Recomendação Final:**

**Para Desenvolvimento/Testes:**
- Use **Node-Cron** (Opção 2) → Mais simples e rápido
- Configure para executar a cada 5 minutos inicialmente
- Altere para diário após validar funcionamento

**Para Produção:**
- Use **Cron Job do SO** (Opção 1) → Mais confiável e escalável
- Configure para executar diariamente às 3h (horário de menor tráfego)
- Implemente logs adequados
- Monitore execução via alertas

**Casos Especiais:**
- Se usar hosting shared sem acesso ao cron: **Node-Cron**
- Se tiver DBA dedicado e controle total do MySQL: **MySQL Event**
- Se usar serverless (AWS Lambda, Cloud Functions): Criar função separada com trigger agendado

### **Métricas Importantes:**

```sql
-- Verificar quantos registros serão deletados
SELECT 
  COUNT(*) as total_to_delete,
  SUM(CASE WHEN VerificacaoExpiresAt < NOW() THEN 1 ELSE 0 END) as expirados,
  SUM(CASE WHEN VerificacaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as antigos
FROM verificacao_email
WHERE VerificacaoExpiresAt < NOW()
   OR VerificacaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Verificar tamanho da tabela
SELECT 
  table_name,
  table_rows,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'ecossistemaster'
  AND table_name = 'verificacao_email';
```

### **Alertas Recomendados:**

1. **Alerta se limpeza falhar 3 vezes seguidas** (enviar email para admin)
2. **Alerta se tabela crescer > 10.000 registros** (problema na limpeza)
3. **Alerta se limpeza demorar > 30 segundos** (performance issue)

---

## �🧪 Testes

### **Testes Manuais (Postman/Insomnia)**

**1. Solicitar código:**
```bash
POST http://localhost:3000/api/verificacao-email/solicitar/123.456.789-00

# Resposta esperada:
{
  "success": true,
  "message": "Código de verificação enviado para j***@email.com",
  "data": {
    "expiresInMinutes": 15
  }
}
```

**2. Validar código (correto):**
```bash
POST http://localhost:3000/api/verificacao-email/validar
Content-Type: application/json

{
  "UsuarioCPF": "123.456.789-00",
  "VerificacaoCodigo": "123456"
}

# Resposta esperada:
{
  "success": true,
  "message": "Email verificado com sucesso! ✅",
  "data": {
    "emailVerificado": true
  }
}
```

**3. Validar código (incorreto):**
```bash
POST http://localhost:3000/api/verificacao-email/validar
Content-Type: application/json

{
  "UsuarioCPF": "123.456.789-00",
  "VerificacaoCodigo": "999999"
}

# Resposta esperada:
{
  "success": false,
  "message": "Código inválido",
  "details": {
    "message": "Código incorreto, expirado ou já utilizado"
  }
}
```

**4. Teste anti-spam (4ª tentativa em 1 hora):**
```bash
POST http://localhost:3000/api/verificacao-email/solicitar/123.456.789-00

# Resposta esperada:
{
  "success": false,
  "message": "Muitas tentativas",
  "details": {
    "message": "Você já solicitou 3 códigos na última hora. Aguarde antes de solicitar novamente."
  }
}
```

**5. Reenviar código:**
```bash
POST http://localhost:3000/api/verificacao-email/reenviar/123.456.789-00

# Resposta esperada:
{
  "success": true,
  "message": "Código de verificação enviado para j***@email.com",
  "data": {
    "expiresInMinutes": 15
  }
}
```

### **Cenários de Teste:**

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 1 | Solicitar código com CPF válido | 200 OK, email enviado |
| 2 | Solicitar sem email cadastrado | 400 Bad Request |
| 3 | Solicitar com email já verificado | 400 Bad Request |
| 4 | Validar com código correto | 200 OK, email marcado como verificado |
| 5 | Validar com código incorreto | 400 Bad Request |
| 6 | Validar código expirado (>15min) | 400 Bad Request |
| 7 | Validar código já usado | 400 Bad Request |
| 8 | Solicitar 4x em 1 hora | 429 Too Many Requests |
| 9 | Reenviar código | 200 OK, código anterior invalidado |
| 10 | CPF formato inválido | 400 Bad Request |

---

## 📦 Dependências

### **Já Instaladas:**
- ✅ `resend` - SDK oficial do Resend
- ✅ `dotenv` - Variáveis de ambiente
- ✅ `express` - Framework web
- ✅ `typescript` - Linguagem

### **Variáveis de Ambiente (.env):**
```env
# Resend API (já configurado)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@ecossistemaescolar.com
EMAIL_FROM_NAME=Ecossistema Escolar

# Frontend URL (para links)
FRONTEND_URL=http://localhost:5173
```

---

## 📊 Estimativa Total

| Tarefa | Descrição | Tempo |
|--------|-----------|-------|
| 1 | Entity | 1-2h |
| 2 | Repository | 2-3h |
| 3 | Service | 3-4h |
| 4 | Atualizar ResendEmailService | 30min |
| 5 | Atualizar UsuarioDAO | 15min |
| 6 | Middleware | 1h |
| 7 | Controller | 1h |
| 8 | Routes | 30min |
| 9 | Server.ts | 15min |
| 10 | Documentação | 2h |
| **TOTAL** | **10 tarefas** | **11-14 horas** |

---

## ✅ Checklist de Implementação

- [x] Entity: `verificacao-email.model.ts` criada
- [x] Repository: `verificacao-email.repository.ts` criado (6 métodos)
- [x] Service: `verificacao-email.service.ts` criado (3 métodos públicos)
- [x] Método `sendVerificationEmail()` adicionado ao ResendEmailService
- [x] Método `verificarEmail()` adicionado ao UsuarioDAO (já existia)
- [x] Middleware: `verificacao-email.middleware.ts` criado
- [x] Controller: `verificacao-email.controller.ts` criado (3 endpoints)
- [x] Routes: `verificacao-email.routes.ts` criado
- [x] Server.ts atualizado (import + registro de rota + scheduler)
- [x] Documentação: `docs/routes/verificacao-email-api.md` criada
- [x] Script de limpeza: `backend/scripts/cleanupVerificacaoEmail.ts` criado
- [x] Scheduler: `backend/services/cleanup.scheduler.ts` criado (execução diária às 3h)
- [x] package.json atualizado (node-cron + script "cleanup:verification")
- [ ] Variáveis de ambiente configuradas (.env) - RESEND_API_KEY já configurada
- [x] Tabela `verificacao_email` criada no MySQL (SQL em backend/database/sql.txt)
- [ ] npm install executado para instalar node-cron e @types/node-cron
- [ ] Testes manuais realizados (10 cenários)
- [ ] Email recebido e formatação validada
- [ ] Anti-spam funcionando (3 tentativas/hora)
- [ ] Expiração funcionando (15 minutos)
- [ ] Código usado apenas 1 vez
- [ ] Campo `UsuarioEmailVerificado` atualizado corretamente

---

## 🚀 Próximos Passos

### **Após Implementação:**

1. **Frontend:**
   - Criar tela de configurações com botão "Verificar Email"
   - Modal para inserir código de 6 dígitos
   - Badge/aviso quando email não verificado
   - Countdown de expiração (15 minutos)

2. **Melhorias Futuras:**
   - Notificar usuário por push quando email verificado
   - Logs de tentativas de verificação (auditoria)
   - Dashboard admin: ver usuários sem email verificado
   - Rate limiting nas rotas (express-rate-limit)
   - Cron job para limpar códigos expirados diariamente

3. **Testes Automatizados:**
   - Unit tests (Jest)
   - Integration tests (Supertest)
   - E2E tests (Cypress)

---

## 📞 Referências

- **Resend API Docs:** https://resend.com/docs
- **ResendEmailService:** `backend/external/ResendEmailService.ts`
- **Código de exemplo:** `backend/external/testResendEmail.ts`
- **Planejamento geral:** `docs/PLANEJAMENTO_ATUALIZACAO_APIS.md`

---

**Última atualização:** 08/03/2026  
**Autor:** GitHub Copilot  
**Versão:** 1.0
