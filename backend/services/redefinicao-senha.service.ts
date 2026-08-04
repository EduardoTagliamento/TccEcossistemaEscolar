import crypto from "crypto";
import bcrypt from "bcrypt";
import { RedefinicaoSenhaDAO } from "../repositories/redefinicao-senha.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import RedefinicaoSenha from "../entities/redefinicao-senha.model";
import ErrorResponse from "../utils/ErrorResponse";
import { ResendEmailService } from "../external/ResendEmailService";

export default class RedefinicaoSenhaService {
  #redefinicaoDAO: RedefinicaoSenhaDAO;
  #usuarioDAO: UsuarioDAO;
  #emailService: ResendEmailService;

  private readonly SALT_ROUNDS = 10;
  private readonly EXPIRATION_MINUTES = 60;
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly MENSAGEM_GENERICA =
    "Se existir uma conta com esse e-mail, enviamos um link de redefinição de senha.";

  constructor(redefinicaoDAODependency: RedefinicaoSenhaDAO, usuarioDAODependency: UsuarioDAO) {
    console.log("⬆️  RedefinicaoSenhaService.constructor()");
    this.#redefinicaoDAO = redefinicaoDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
    this.#emailService = ResendEmailService.getInstance();
  }

  /**
   * Solicita redefinição de senha por e-mail.
   *
   * Mensagem de retorno é SEMPRE a mesma, exista ou não conta com esse
   * e-mail — diferente de `VerificacaoEmailService.solicitarVerificacao`
   * (que revela 404 pra CPF inexistente), porque ali o fluxo já pressupõe
   * alguém logado; aqui é um endpoint público e a resposta não pode virar
   * um jeito de descobrir quais e-mails têm conta no sistema.
   */
  async solicitarRedefinicao(email: string): Promise<{ message: string }> {
    console.log("🟣 RedefinicaoSenhaService.solicitarRedefinicao()");

    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await this.#usuarioDAO.findByEmail(emailNormalizado);

    // Sem conta com esse e-mail: retorna a mesma mensagem genérica, sem
    // gerar token nem enviar e-mail — não dá indício nenhum pro chamador.
    if (!usuario) {
      return { message: this.MENSAGEM_GENERICA };
    }

    // Anti-spam: mesmo limite/janela usado em VerificacaoEmailService.
    const tentativasRecentes = await this.#redefinicaoDAO.countRecentAttempts(usuario.UsuarioCPF, 1);
    if (tentativasRecentes >= this.MAX_ATTEMPTS_PER_HOUR) {
      // Ainda a mensagem genérica — um 429 aqui revelaria que a conta existe.
      return { message: this.MENSAGEM_GENERICA };
    }

    await this.#redefinicaoDAO.invalidateOldTokens(usuario.UsuarioCPF);

    const token = this.gerarTokenAleatorio();

    const redefinicao = new RedefinicaoSenha();
    redefinicao.UsuarioCPF = usuario.UsuarioCPF;
    redefinicao.RedefinicaoToken = token;
    redefinicao.RedefinicaoExpiresAt = this.calcularExpiracao();

    await this.#redefinicaoDAO.create(redefinicao);

    // Falha de envio não pode virar erro pro chamador — um 500 aqui, vs a
    // mensagem genérica pra e-mail inexistente, já seria um oráculo de
    // enumeração. O erro fica só no log do servidor.
    try {
      await this.enviarEmailRedefinicao(emailNormalizado, usuario.UsuarioNome, token);
    } catch (error) {
      console.error("❌ RedefinicaoSenhaService: falha ao enviar e-mail de redefinição:", error);
    }

    return { message: this.MENSAGEM_GENERICA };
  }

  /**
   * Redefine a senha a partir de um token válido.
   */
  async redefinirSenha(token: string, novaSenha: string): Promise<{ message: string }> {
    console.log("🟣 RedefinicaoSenhaService.redefinirSenha()");

    if (typeof novaSenha !== "string" || novaSenha.length < 6) {
      throw new ErrorResponse(400, "Nova senha inválida", {
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      });
    }

    const redefinicao = await this.#redefinicaoDAO.findValidToken(token);
    if (!redefinicao) {
      throw new ErrorResponse(400, "Token inválido", {
        message: "O link de redefinição é inválido, já foi usado ou expirou. Solicite um novo.",
      });
    }

    const usuario = await this.#usuarioDAO.findById(redefinicao.UsuarioCPF);
    if (!usuario) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${redefinicao.UsuarioCPF}`,
      });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);
    usuario.UsuarioSenha = novaSenhaHash;

    const atualizado = await this.#usuarioDAO.update(usuario);
    if (!atualizado) {
      throw new ErrorResponse(500, "Erro ao redefinir senha", {
        message: "Não foi possível atualizar a senha no banco de dados",
      });
    }

    await this.#redefinicaoDAO.markAsUsed(redefinicao.RedefinicaoId!);
    // Um reset bem-sucedido invalida qualquer outro link pendente pro
    // mesmo usuário — evita que um link antigo (ex.: vazado num e-mail
    // encaminhado por engano) continue valendo depois da senha já ter mudado.
    await this.#redefinicaoDAO.invalidateOldTokens(redefinicao.UsuarioCPF);

    return { message: "Senha redefinida com sucesso!" };
  }

  /**
   * Gera token aleatório de 32 bytes (64 caracteres hex) — inviável de
   * adivinhar por força bruta, ao contrário de um código curto digitável.
   */
  private gerarTokenAleatorio(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private calcularExpiracao(): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + this.EXPIRATION_MINUTES);
    return now;
  }

  private async enviarEmailRedefinicao(email: string, nome: string, token: string): Promise<void> {
    try {
      await this.#emailService.sendPasswordResetEmail(email, nome, token);
      console.log(`✅ Email de redefinição de senha enviado para: ${email}`);
    } catch (error: any) {
      console.error("❌ Erro ao enviar email via Resend:", error.message);
      throw new ErrorResponse(500, "Erro ao enviar email", {
        message: "Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde.",
      });
    }
  }
}
