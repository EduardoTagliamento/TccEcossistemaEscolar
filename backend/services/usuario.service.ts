import bcrypt from "bcrypt";
import ErrorResponse from "../utils/ErrorResponse";
import Usuario from "../entities/usuario.model";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { gerarSenhaTemporaria } from "../utils/helpers/password-generator.helper";
import { EmailAlunoService } from "./email-aluno.service";

export interface UsuarioDTO {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioFotoUrl: string | null;
  UsuarioTema: "light" | "dark" | "system";
  UsuarioModoDaltonico: boolean;
  UsuarioEscalaFonte: "small" | "medium" | "large";
  UsuarioReduzirMovimento: boolean;
  UsuarioAltoContraste: boolean;
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

// Interfaces para operações em massa
export interface BatchItemResult {
  item: Record<string, any>;
  sucesso: boolean;
  mensagem: string;
  dados?: UsuarioDTO;
  senhaTemporaria?: string;
  tipo?: 'criado' | 'existente' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  existentes: number;
  erros: number;
  resultados: BatchItemResult[];
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
    usuario.UsuarioNome = this.normalizeNomeCompleto(jsonUsuario);
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
    if (jsonUsuario.UsuarioNome !== undefined || jsonUsuario.UsuarioSobrenome !== undefined) {
      const nomeNormalizado = this.normalizeNomeCompleto(jsonUsuario, existente.UsuarioNome);
      existente.UsuarioNome = nomeNormalizado;
    }
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

    // Preferências visuais (tema + modo daltônico) — painel "Meu Perfil",
    // seção "Preferências de acessibilidade". Persistidas por conta (sem
    // localStorage) pra sincronizar entre dispositivos.
    if (jsonUsuario.UsuarioTema !== undefined) {
      existente.UsuarioTema = jsonUsuario.UsuarioTema as "light" | "dark" | "system";
    }

    if (jsonUsuario.UsuarioModoDaltonico !== undefined) {
      existente.UsuarioModoDaltonico = jsonUsuario.UsuarioModoDaltonico as boolean;
    }

    if (jsonUsuario.UsuarioEscalaFonte !== undefined) {
      existente.UsuarioEscalaFonte = jsonUsuario.UsuarioEscalaFonte as "small" | "medium" | "large";
    }

    if (jsonUsuario.UsuarioReduzirMovimento !== undefined) {
      existente.UsuarioReduzirMovimento = jsonUsuario.UsuarioReduzirMovimento as boolean;
    }

    if (jsonUsuario.UsuarioAltoContraste !== undefined) {
      existente.UsuarioAltoContraste = jsonUsuario.UsuarioAltoContraste as boolean;
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

  /**
   * Troca a senha do usuário — exige a senha atual (bcrypt.compare) antes de
   * gravar o hash da nova. Usada pelo painel de "Configuração do usuário"
   * (dropdown do avatar no dashboard).
   */
  trocarSenha = async (UsuarioCPF: string, senhaAtual: string, novaSenha: string): Promise<void> => {
    console.log("🟣 UsuarioService.trocarSenha()");

    const existente = await this.#usuarioDAO.findById(UsuarioCPF);
    if (!existente) {
      throw new ErrorResponse(404, "Usuário não encontrado", {
        message: `Não existe usuário com CPF ${UsuarioCPF}`,
      });
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, existente.UsuarioSenha);
    if (!senhaCorreta) {
      throw new ErrorResponse(400, "Senha atual incorreta", {
        message: "A senha atual informada não confere.",
      });
    }

    if (typeof novaSenha !== "string" || novaSenha.length < 6) {
      throw new ErrorResponse(400, "Nova senha inválida", {
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);
    existente.UsuarioSenha = novaSenhaHash;

    const atualizado = await this.#usuarioDAO.update(existente);
    if (!atualizado) {
      throw new ErrorResponse(500, "Erro ao trocar senha", {
        message: "Não foi possível atualizar a senha no banco de dados",
      });
    }
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
      UsuarioFotoUrl: usuario.UsuarioFotoUrl,
      UsuarioTema: usuario.UsuarioTema,
      UsuarioModoDaltonico: usuario.UsuarioModoDaltonico,
      UsuarioEscalaFonte: usuario.UsuarioEscalaFonte,
      UsuarioReduzirMovimento: usuario.UsuarioReduzirMovimento,
      UsuarioAltoContraste: usuario.UsuarioAltoContraste,
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

  private normalizeNomeCompleto(
    jsonUsuario: Record<string, unknown>,
    nomeAtual?: string
  ): string {
    const nome =
      typeof jsonUsuario.UsuarioNome === "string"
        ? jsonUsuario.UsuarioNome
        : nomeAtual || "";

    const sobrenome =
      typeof jsonUsuario.UsuarioSobrenome === "string"
        ? jsonUsuario.UsuarioSobrenome
        : "";

    const nomeBase = this.capitalizeWords(nome);
    const sobrenomeBase = this.capitalizeWords(sobrenome);
    const nomeCompleto = [nomeBase, sobrenomeBase].filter(Boolean).join(" ").trim();

    if (!nomeCompleto) {
      throw new ErrorResponse(400, "Nome inválido", {
        message: "Informe pelo menos o nome do usuário.",
      });
    }

    return nomeCompleto;
  }

  private capitalizeWords(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Criar usuários em massa (para importação de planilhas)
   * 
   * Lógica:
   * - Se CPF já existe: retorna usuário existente (não é erro)
   * - Se CPF novo: cria usuário com senha gerada
   * - Coleta emails para envio em lote
   * 
   * @param usuarios - Array de dados de usuários
   * @param escolaNome - Nome da escola (para email)
   * @param enviarEmails - Se true, envia emails automaticamente
   * @returns BatchCreateResponse com resultados detalhados
   */
  async criarUsuariosEmMassa(
    usuarios: Record<string, unknown>[],
    escolaNome: string,
    enviarEmails: boolean = true
  ): Promise<BatchCreateResponse> {
    const resultados: BatchItemResult[] = [];
    let criados = 0;
    let existentes = 0;
    let erros = 0;

    const emailsParaEnviar: Array<{ tipo: 'novo' | 'existente'; dados: any }> = [];

    for (const dados of usuarios) {
      try {
        const cpf = dados.UsuarioCPF as string;

        if (!cpf) {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: 'CPF é obrigatório',
            tipo: 'erro'
          });
          erros++;
          continue;
        }

        // Verificar se usuário já existe
        const usuarioExistente = await this.#usuarioDAO.findById(cpf);

        if (usuarioExistente) {
          // Usuário já cadastrado
          resultados.push({
            item: dados,
            sucesso: true,
            mensagem: 'Usuário já cadastrado',
            dados: this.toDTO(usuarioExistente),
            tipo: 'existente'
          });
          existentes++;

          // Email de usuário existente (se fornecido email e envio habilitado)
          if (enviarEmails && usuarioExistente.UsuarioEmail) {
            emailsParaEnviar.push({
              tipo: 'existente',
              dados: {
                para: usuarioExistente.UsuarioEmail,
                nomeAluno: usuarioExistente.UsuarioNome,
                nomeEscola: escolaNome,
                nomeTurma: (dados.TurmaNome as string) || 'Não especificada'
              }
            });
          }
        } else {
          // Criar novo usuário
          // Gerar senha temporária
          const senhaTemporaria = gerarSenhaTemporaria(dados.UsuarioNome as string);

          // Criar usuário
          const novoUsuario = new Usuario();
          novoUsuario.UsuarioCPF = cpf;
          novoUsuario.UsuarioNome = this.normalizeNomeCompleto(dados);
          novoUsuario.UsuarioEmail = (dados.UsuarioEmail as string | null) ?? null;
          novoUsuario.UsuarioId = (dados.UsuarioId as string | null) ?? null;
          novoUsuario.UsuarioTelefone = (dados.UsuarioTelefone as string | null) ?? null;
          novoUsuario.UsuarioEmailVerificado = false;
          novoUsuario.UsuarioStatus = 'Ativo';

          if (dados.UsuarioDataNascimento) {
            novoUsuario.UsuarioDataNascimento = new Date(dados.UsuarioDataNascimento as string);
          }

          // Hash da senha
          const senhaHash = await bcrypt.hash(senhaTemporaria, this.SALT_ROUNDS);
          novoUsuario.UsuarioSenha = senhaHash;

          await this.#usuarioDAO.create(novoUsuario);

          resultados.push({
            item: dados,
            sucesso: true,
            mensagem: 'Usuário criado com sucesso',
            dados: this.toDTO(novoUsuario),
            senhaTemporaria: senhaTemporaria,
            tipo: 'criado'
          });
          criados++;

          // Email de boas-vindas (se fornecido email e envio habilitado)
          if (enviarEmails && novoUsuario.UsuarioEmail) {
            emailsParaEnviar.push({
              tipo: 'novo',
              dados: {
                para: novoUsuario.UsuarioEmail,
                nomeAluno: novoUsuario.UsuarioNome,
                nomeEscola: escolaNome,
                cpf: novoUsuario.UsuarioCPF,
                senhaTemporaria: senhaTemporaria,
                linkLogin: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:3000/login'
              }
            });
          }
        }
      } catch (erro: any) {
        console.error('Erro ao processar usuário:', erro);
        resultados.push({
          item: dados,
          sucesso: false,
          mensagem: erro.message || 'Erro ao processar usuário',
          tipo: 'erro'
        });
        erros++;
      }
    }

    // Enviar emails em lote (não bloqueia se falhar)
    if (enviarEmails && emailsParaEnviar.length > 0) {
      EmailAlunoService.enviarEmailsEmLote(emailsParaEnviar).catch(erro => {
        console.error('Erro ao enviar emails em lote:', erro);
      });
    }

    return {
      totalProcessados: usuarios.length,
      criados,
      existentes,
      erros,
      resultados
    };
  }
}
