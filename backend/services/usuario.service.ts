import bcrypt from "bcrypt";
import ErrorResponse from "../utils/ErrorResponse.js";
import Usuario from "../entities/usuario.model.js";
import { UsuarioDAO } from "../repositories/usuario.repository";

export interface UsuarioDTO {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioEmailVerificado: boolean;
  UsuarioDataNascimento: string | null; // ISO string
  UsuarioStatus: "Ativo" | "Inativo" | "Bloqueado";
  UsuarioUltimoAcesso: string | null; // ISO string
  UsuarioCreatedAt: string | null; // ISO string
  UsuarioUpdatedAt: string | null; // ISO string
  // Nota: UsuarioSenha e UsuarioDeletedAt NUNCA são retornados no DTO por questões de segurança
}

export default class UsuarioService {
  #usuarioDAO: UsuarioDAO;
  private readonly SALT_ROUNDS = 10;

  constructor(usuarioDAODependency: UsuarioDAO) {
    console.log("⬆️  UsuarioService.constructor()");
    this.#usuarioDAO = usuarioDAODependency;
  }

  createUsuario = async (jsonUsuario: Record<string, unknown>): Promise<UsuarioDTO> => {
    console.log("🟣 UsuarioService.createUsuario()");

    // Validar CPF único
    if (jsonUsuario.UsuarioCPF) {
      const cpfExistente = await this.#usuarioDAO.findById(jsonUsuario.UsuarioCPF as string);
      if (cpfExistente) {
        throw new ErrorResponse(400, "CPF já cadastrado", {
          message: `O CPF ${jsonUsuario.UsuarioCPF} já está cadastrado no sistema`,
        });
      }
    }

    // Validar Email único (se fornecido)
    if (jsonUsuario.UsuarioEmail) {
      const emailExistente = await this.#usuarioDAO.findByEmail(jsonUsuario.UsuarioEmail as string);
      if (emailExistente) {
        throw new ErrorResponse(400, "Email já cadastrado", {
          message: `O email ${jsonUsuario.UsuarioEmail} já está cadastrado no sistema`,
        });
      }
    }

    const usuario = new Usuario();
    usuario.UsuarioCPF = jsonUsuario.UsuarioCPF as string;
    usuario.UsuarioNome = jsonUsuario.UsuarioNome as string;
    usuario.UsuarioEmail = (jsonUsuario.UsuarioEmail as string | null) ?? null;
    usuario.UsuarioId = (jsonUsuario.UsuarioId as string | null) ?? null;
    usuario.UsuarioTelefone = (jsonUsuario.UsuarioTelefone as string | null) ?? null;

    // Novos campos opcionais
    usuario.UsuarioEmailVerificado = (jsonUsuario.UsuarioEmailVerificado as boolean) ?? false;
    usuario.UsuarioStatus = (jsonUsuario.UsuarioStatus as "Ativo" | "Inativo" | "Bloqueado") ?? "Ativo";
    
    if (jsonUsuario.UsuarioDataNascimento) {
      usuario.UsuarioDataNascimento = new Date(jsonUsuario.UsuarioDataNascimento as string);
    }

    // Hash da senha com bcrypt
    const senhaPlana = jsonUsuario.UsuarioSenha as string;
    const senhaHash = await bcrypt.hash(senhaPlana, this.SALT_ROUNDS);
    usuario.UsuarioSenha = senhaHash;

    await this.#usuarioDAO.create(usuario);
    return this.toDTO(usuario);
  };

  findAll = async (nome?: string): Promise<UsuarioDTO[]> => {
    console.log("🟣 UsuarioService.findAll()");
    const usuarios = await this.#usuarioDAO.findAll(nome);
    return usuarios.map((usuario) => this.toDTO(usuario));
  };

  findById = async (UsuarioCPF: string): Promise<UsuarioDTO> => {
    console.log("🟣 UsuarioService.findById()");
    const usuario = await this.#usuarioDAO.findById(UsuarioCPF);

    if (!usuario) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${UsuarioCPF}`,
      });
    }

    return this.toDTO(usuario);
  };

  updateUsuario = async (UsuarioCPF: string, jsonUsuario: Record<string, unknown>): Promise<UsuarioDTO> => {
    console.log("🟣 UsuarioService.updateUsuario()");

    const existente = await this.#usuarioDAO.findById(UsuarioCPF);
    if (!existente) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${UsuarioCPF}`,
      });
    }

    // Validar Email único (se estiver sendo alterado)
    if (jsonUsuario.UsuarioEmail && jsonUsuario.UsuarioEmail !== existente.UsuarioEmail) {
      const emailExistente = await this.#usuarioDAO.findByEmail(jsonUsuario.UsuarioEmail as string);
      if (emailExistente) {
        throw new ErrorResponse(400, "Email já cadastrado", {
          message: `O email ${jsonUsuario.UsuarioEmail} já está cadastrado no sistema`,
        });
      }
    }

    // Atualizar campos (manter valores existentes se não fornecidos)
    existente.UsuarioNome = (jsonUsuario.UsuarioNome as string) ?? existente.UsuarioNome;
    existente.UsuarioEmail = (jsonUsuario.UsuarioEmail as string | null) ?? existente.UsuarioEmail;
    existente.UsuarioId = (jsonUsuario.UsuarioId as string | null) ?? existente.UsuarioId;
    existente.UsuarioTelefone = (jsonUsuario.UsuarioTelefone as string | null) ?? existente.UsuarioTelefone;

    // Novos campos opcionais
    if (jsonUsuario.UsuarioEmailVerificado !== undefined) {
      existente.UsuarioEmailVerificado = jsonUsuario.UsuarioEmailVerificado as boolean;
    }

    if (jsonUsuario.UsuarioStatus) {
      existente.UsuarioStatus = jsonUsuario.UsuarioStatus as "Ativo" | "Inativo" | "Bloqueado";
    }

    if (jsonUsuario.UsuarioDataNascimento !== undefined) {
      existente.UsuarioDataNascimento = jsonUsuario.UsuarioDataNascimento
        ? new Date(jsonUsuario.UsuarioDataNascimento as string)
        : null;
    }

    // Se nova senha foi fornecida, fazer hash
    if (jsonUsuario.UsuarioSenha) {
      const novaSenhaPlana = jsonUsuario.UsuarioSenha as string;
      const novaSenhaHash = await bcrypt.hash(novaSenhaPlana, this.SALT_ROUNDS);
      existente.UsuarioSenha = novaSenhaHash;
    }

    const atualizado = await this.#usuarioDAO.update(existente);
    if (!atualizado) {
      throw new ErrorResponse(500, "Erro ao atualizar usuário", {
        message: "Não foi possível atualizar o usuário no banco de dados",
      });
    }

    return this.toDTO(existente);
  };

  deleteUsuario = async (UsuarioCPF: string): Promise<boolean> => {
    console.log("🟣 UsuarioService.deleteUsuario()");

    const existente = await this.#usuarioDAO.findById(UsuarioCPF);
    if (!existente) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${UsuarioCPF}`,
      });
    }

    const deletado = await this.#usuarioDAO.delete(UsuarioCPF);
    if (!deletado) {
      throw new ErrorResponse(500, "Erro ao deletar usuário", {
        message: "Não foi possível deletar o usuário do banco de dados",
      });
    }

    return true;
  };

  /**
   * Converte entidade Usuario para DTO (sem senha e DeletedAt!)
   */
  private toDTO = (usuario: Usuario): UsuarioDTO => {
    return {
      UsuarioCPF: usuario.UsuarioCPF,
      UsuarioEmail: usuario.UsuarioEmail,
      UsuarioId: usuario.UsuarioId,
      UsuarioTelefone: usuario.UsuarioTelefone,
      UsuarioNome: usuario.UsuarioNome,
      UsuarioEmailVerificado: usuario.UsuarioEmailVerificado,
      UsuarioDataNascimento: usuario.UsuarioDataNascimento ? usuario.UsuarioDataNascimento.toISOString().split('T')[0] : null,
      UsuarioStatus: usuario.UsuarioStatus,
      UsuarioUltimoAcesso: usuario.UsuarioUltimoAcesso ? usuario.UsuarioUltimoAcesso.toISOString() : null,
      UsuarioCreatedAt: usuario.UsuarioCreatedAt ? usuario.UsuarioCreatedAt.toISOString() : null,
      UsuarioUpdatedAt: usuario.UsuarioUpdatedAt ? usuario.UsuarioUpdatedAt.toISOString() : null,
      // UsuarioSenha e UsuarioDeletedAt são omitidos intencionalmente por segurança
    };
  };
}
