import bcrypt from "bcrypt";
import Usuario from "../entities/usuario.model";
import { UsuarioDAO } from "../repositories/usuario.repository";
import ErrorResponse from "./ErrorResponse";
import { gerarSenhaTemporaria } from "./helpers/password-generator.helper";
import { WhatsappCredenciaisService } from "../services/whatsapp-credenciais.service";
import { EmailAlunoService } from "../services/email-aluno.service";

export interface ResultadoRedefinicaoSenha {
  enviadoPorWhatsapp: boolean;
  enviadoPorEmail: boolean;
}

/**
 * Ação "Redefinir senha" da Gestão de Dados (Coordenação/Direção, pra
 * Professores e Alunos): gera uma senha temporária nova, substitui a atual
 * e manda por WhatsApp/email pra pessoa — de propósito, a senha NUNCA é
 * devolvida pra quem chamou (o Diretor não vê a senha gerada, só se ela
 * conseguiu avisar a pessoa ou não). Compartilhado entre
 * ProfessorService/MatriculaService em vez de duplicar a lógica em cada um.
 */
export async function redefinirSenhaEEnviar(
  usuarioDAO: UsuarioDAO,
  usuario: Usuario,
  nomeEscola: string
): Promise<ResultadoRedefinicaoSenha> {
  if (!usuario.UsuarioTelefone && !usuario.UsuarioEmail) {
    throw new ErrorResponse(400, "Essa pessoa não tem telefone nem email cadastrado — não tem como enviar a senha nova pra ela.");
  }

  const senhaTemporaria = gerarSenhaTemporaria(usuario.UsuarioNome);
  usuario.UsuarioSenha = await bcrypt.hash(senhaTemporaria, 10);
  await usuarioDAO.update(usuario);

  const linkLogin = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:3000/login";

  let enviadoPorWhatsapp = false;
  if (usuario.UsuarioTelefone) {
    try {
      await WhatsappCredenciaisService.enviarSenhaRedefinida({
        para: usuario.UsuarioTelefone,
        nomeUsuario: usuario.UsuarioNome,
        nomeEscola,
        senhaTemporaria,
        linkLogin,
      });
      enviadoPorWhatsapp = true;
    } catch (erro) {
      console.error("❌ redefinirSenhaEEnviar() — falha ao enviar WhatsApp:", erro);
    }
  }

  let enviadoPorEmail = false;
  if (usuario.UsuarioEmail) {
    try {
      await EmailAlunoService.enviarEmailSenhaRedefinida({
        para: usuario.UsuarioEmail,
        nomeAluno: usuario.UsuarioNome,
        nomeEscola,
        cpf: usuario.UsuarioCPF ?? "",
        senhaTemporaria,
        linkLogin,
      });
      enviadoPorEmail = true;
    } catch (erro) {
      console.error("❌ redefinirSenhaEEnviar() — falha ao enviar email:", erro);
    }
  }

  return { enviadoPorWhatsapp, enviadoPorEmail };
}
