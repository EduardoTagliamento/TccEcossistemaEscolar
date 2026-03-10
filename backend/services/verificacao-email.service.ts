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
        message: "O usuário não possui email cadastrado no sistema.",
      });
    }

    // 3. Verificar se email já está verificado
    if (usuario.UsuarioEmailVerificado) {
      throw new ErrorResponse(400, "Email já verificado", {
        message: "O email deste usuário já está verificado.",
      });
    }

    // 4. Anti-spam: verificar tentativas recentes
    const tentativasRecentes = await this.#verificacaoDAO.countRecentAttempts(cpf, 1);
    if (tentativasRecentes >= this.MAX_ATTEMPTS_PER_HOUR) {
      throw new ErrorResponse(429, "Muitas tentativas", {
        message: `Você excedeu o limite de ${this.MAX_ATTEMPTS_PER_HOUR} solicitações por hora. Tente novamente mais tarde.`,
      });
    }

    // 5. Invalidar códigos antigos
    await this.#verificacaoDAO.invalidateOldCodes(cpf);

    // 6. Gerar código aleatório
    const codigo = this.gerarCodigoAleatorio();

    // 7. Criar registro no banco
    const verificacao = new VerificacaoEmail();
    verificacao.UsuarioCPF = cpf;
    verificacao.VerificacaoCodigo = codigo;
    verificacao.VerificacaoExpiresAt = this.calcularExpiracao();

    await this.#verificacaoDAO.create(verificacao);

    // 8. Enviar email via Resend
    await this.enviarEmailVerificacao(usuario.UsuarioEmail, usuario.UsuarioNome, codigo);

    return {
      message: `Código de verificação enviado para ${this.mascarEmail(usuario.UsuarioEmail)}`,
    };
  }

  /**
   * Valida código de verificação e marca email como verificado
   */
  async validarCodigo(cpf: string, codigo: string): Promise<{ message: string }> {
    console.log("🟣 VerificacaoEmailService.validarCodigo()");

    // 1. Buscar código válido no banco
    const verificacao = await this.#verificacaoDAO.findValidCode(cpf, codigo);
    
    if (!verificacao) {
      throw new ErrorResponse(400, "Código inválido", {
        message: "O código informado é inválido, já foi usado ou expirou.",
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
   * Reenvia código de verificação (usa mesma lógica de solicitar)
   */
  async reenviarCodigo(cpf: string): Promise<{ message: string }> {
    console.log("🟣 VerificacaoEmailService.reenviarCodigo()");
    
    // Reaproveita lógica de solicitação (inclui anti-spam)
    return this.solicitarVerificacao(cpf);
  }

  /**
   * Gera código aleatório de 6 dígitos numéricos
   */
  private gerarCodigoAleatorio(): string {
    const min = Math.pow(10, this.CODIGO_LENGTH - 1);
    const max = Math.pow(10, this.CODIGO_LENGTH) - 1;
    const codigo = Math.floor(Math.random() * (max - min + 1)) + min;
    return codigo.toString();
  }

  /**
   * Calcula data de expiração (15 minutos a partir de agora)
   */
  private calcularExpiracao(): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + this.EXPIRATION_MINUTES);
    return now;
  }

  /**
   * Mascara email para privacidade (j***o@email.com)
   */
  private mascarEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    const mascarado = `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}`;
    return `${mascarado}@${domain}`;
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
