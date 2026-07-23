import bcrypt from "bcrypt";
import ErrorResponse from "../utils/ErrorResponse";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model";
import Usuario from "../entities/usuario.model";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { UsuarioxEscolaAcessoDAO } from "../repositories/usuarioxescolaacesso.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { getAuditoriaService } from "./auditoria.service";
import { normalizeCPF } from "../utils/helpers/cpf.helper";
import { gerarSenhaTemporaria } from "../utils/helpers/password-generator.helper";
import { EmailAlunoService } from "./email-aluno.service";

const SALT_ROUNDS = 10;

export interface VinculoEmMassaItem {
  CPF: string;
  Nome?: string;
  Email?: string;
}

export interface VinculoBatchItemResult {
  cpf: string;
  sucesso: boolean;
  mensagem: string;
  dados?: EscolaxUsuarioxFuncaoDTO;
  contaCriada?: boolean;
  senhaTemporaria?: string;
  tipo?: "criado" | "duplicado" | "erro";
}

export interface VinculoBatchCreateResponse {
  totalProcessados: number;
  criados: number;
  duplicados: number;
  erros: number;
  resultados: VinculoBatchItemResult[];
}

export interface EscolaxUsuarioxFuncaoDTO {
  EscolaxUsuarioxFuncaoId: number;
  UsuarioCPF: string;
  UsuarioNome: string | null;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  DataInicio: string | null; // ISO date YYYY-MM-DD
  DataFim: string | null; // ISO date YYYY-MM-DD
  Status: string; // "Ativo" | "Inativo" | "Finalizado"
  CreatedAt: string; // ISO timestamp
  UpdatedAt: string; // ISO timestamp
  UltimoAcessoEm: string | null; // ISO timestamp — só populado quando filtrado por EscolaGUID
}

interface FindFiltersDTO {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  FuncaoId?: number;
}

export default class EscolaxUsuarioxFuncaoService {
  #relacaoDAO: EscolaxUsuarioxFuncaoDAO;
  #acessoDAO: UsuarioxEscolaAcessoDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaDAO: EscolaDAO;

  constructor(
    relacaoDAODependency: EscolaxUsuarioxFuncaoDAO,
    acessoDAODependency: UsuarioxEscolaAcessoDAO,
    usuarioDAODependency: UsuarioDAO,
    escolaDAODependency: EscolaDAO
  ) {
    console.log("Service: EscolaxUsuarioxFuncaoService.constructor()");
    this.#relacaoDAO = relacaoDAODependency;
    this.#acessoDAO = acessoDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
    this.#escolaDAO = escolaDAODependency;
  }

  createRelacao = async (
    payload: Record<string, unknown>,
    usuarioCPFAtor?: string
  ): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.createRelacao()");

    const usuarioCPF = payload.UsuarioCPF as string;
    const escolaGUID = payload.EscolaGUID as string;
    const funcaoId = Number(payload.FuncaoId);

    await this.validateReferences(usuarioCPF, escolaGUID, funcaoId);

    const duplicated = await this.#relacaoDAO.findByTripla(usuarioCPF, escolaGUID, funcaoId);
    if (duplicated) {
      throw new ErrorResponse(409, "Relacao ja existe", {
        message:
          "Ja existe um vinculo para este UsuarioCPF, EscolaGUID e FuncaoId.",
      });
    }

    const relacao = new EscolaxUsuarioxFuncao();
    relacao.UsuarioCPF = usuarioCPF;
    relacao.EscolaGUID = escolaGUID;
    relacao.FuncaoId = funcaoId;
    relacao.DataInicio = payload.DataInicio ? new Date(payload.DataInicio as string) : null;
    relacao.DataFim = payload.DataFim ? new Date(payload.DataFim as string) : null;
    relacao.Status = (payload.Status as "Ativo" | "Inativo" | "Finalizado") ?? "Ativo";

    const id = await this.#relacaoDAO.create(relacao);
    const created = await this.#relacaoDAO.findById(id);

    if (!created) {
      throw new ErrorResponse(500, "Erro ao criar relacao", {
        message: "Falha ao recuperar registro apos criacao.",
      });
    }

    if (usuarioCPFAtor) {
      void getAuditoriaService().registrar({
        EscolaGUID: created.EscolaGUID,
        UsuarioCPFAtor: usuarioCPFAtor,
        AcaoTipo: "Create",
        EntidadeTipo: "escolaxusuarioxfuncao",
        EntidadeGUID: String(created.EscolaxUsuarioxFuncaoId),
        EntidadeDescricao: `Vínculo de ${created.UsuarioCPF} como função ${created.FuncaoId} na escola`,
        CategoriaAuditoriaId: 3,
      });
    }

    return this.toDTO(created);
  };

  /**
   * Vincula em massa uma lista de usuários a uma função numa escola — usado
   * pela importação via planilha das telas de Secretaria/Coordenação. Se o
   * CPF já existe na plataforma, só cria o vínculo; se não existe, cria a
   * conta (senha temporária, mesmo padrão de `ProfessorService.criarProfessoresEmMassa`)
   * e envia e-mail de boas-vindas com a senha antes de vincular.
   */
  criarVinculosEmMassa = async (
    itens: VinculoEmMassaItem[],
    escolaGUID: string,
    funcaoId: number,
    usuarioCPFAtor?: string
  ): Promise<VinculoBatchCreateResponse> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.criarVinculosEmMassa()");

    if (itens.length === 0) {
      throw new ErrorResponse(400, "Nenhum item fornecido", {
        message: "A lista de itens esta vazia",
      });
    }

    const [escola, funcaoExists] = await Promise.all([
      this.#escolaDAO.findById(escolaGUID),
      this.#relacaoDAO.funcaoExists(funcaoId),
    ]);

    if (!escola) {
      throw new ErrorResponse(404, "Escola nao encontrada", {
        message: `Nao existe escola com GUID ${escolaGUID}`,
      });
    }

    if (!funcaoExists) {
      throw new ErrorResponse(404, "Funcao nao encontrada", {
        message: `Nao existe funcao com id ${funcaoId}`,
      });
    }

    const resultados: VinculoBatchItemResult[] = [];
    const emailsParaEnviar: Array<{ tipo: "novo"; dados: Record<string, string> }> = [];
    let criados = 0;
    let duplicados = 0;
    let erros = 0;

    for (const item of itens) {
      let cpf: string;
      try {
        cpf = normalizeCPF(String(item.CPF));
      } catch {
        erros++;
        resultados.push({
          cpf: String(item.CPF),
          sucesso: false,
          mensagem: `CPF "${item.CPF}" invalido.`,
          tipo: "erro",
        });
        continue;
      }

      try {
        const duplicated = await this.#relacaoDAO.findByTripla(cpf, escolaGUID, funcaoId);
        if (duplicated) {
          duplicados++;
          resultados.push({
            cpf,
            sucesso: true,
            mensagem: "Ja existe um vinculo para este usuario nesta funcao.",
            tipo: "duplicado",
          });
          continue;
        }

        let usuario = await this.#usuarioDAO.findById(cpf);
        let senhaTemporaria: string | undefined;
        const contaCriada = !usuario;

        if (!usuario) {
          const nome = item.Nome?.trim();
          if (!nome) {
            erros++;
            resultados.push({
              cpf,
              sucesso: false,
              mensagem: `Nenhum usuario cadastrado com o CPF ${cpf} e o nome nao foi informado na planilha para criar a conta.`,
              tipo: "erro",
            });
            continue;
          }

          senhaTemporaria = gerarSenhaTemporaria(nome);
          const senhaHash = await bcrypt.hash(senhaTemporaria, SALT_ROUNDS);

          const novoUsuario = new Usuario();
          novoUsuario.UsuarioCPF = cpf;
          novoUsuario.UsuarioNome = nome;
          novoUsuario.UsuarioEmail = item.Email || null;
          novoUsuario.UsuarioId = null;
          novoUsuario.UsuarioTelefone = null;
          novoUsuario.UsuarioEmailVerificado = false;
          novoUsuario.UsuarioStatus = "Ativo";
          novoUsuario.UsuarioSenha = senhaHash;

          await this.#usuarioDAO.create(novoUsuario);
          usuario = novoUsuario;

          if (usuario.UsuarioEmail) {
            emailsParaEnviar.push({
              tipo: "novo",
              dados: {
                para: usuario.UsuarioEmail,
                nomeAluno: usuario.UsuarioNome,
                nomeEscola: escola.EscolaNome || "Escola",
                cpf: usuario.UsuarioCPF,
                senhaTemporaria,
                linkLogin: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:3000/login",
              },
            });
          }
        }

        const relacao = new EscolaxUsuarioxFuncao();
        relacao.UsuarioCPF = cpf;
        relacao.EscolaGUID = escolaGUID;
        relacao.FuncaoId = funcaoId;
        relacao.DataInicio = null;
        relacao.DataFim = null;
        relacao.Status = "Ativo";

        const id = await this.#relacaoDAO.create(relacao);
        const created = await this.#relacaoDAO.findById(id);
        if (!created) {
          throw new Error("Falha ao recuperar registro apos criacao.");
        }

        if (usuarioCPFAtor) {
          void getAuditoriaService().registrar({
            EscolaGUID: created.EscolaGUID,
            UsuarioCPFAtor: usuarioCPFAtor,
            AcaoTipo: "Create",
            EntidadeTipo: "escolaxusuarioxfuncao",
            EntidadeGUID: String(created.EscolaxUsuarioxFuncaoId),
            EntidadeDescricao: `Vínculo de ${created.UsuarioCPF} como função ${created.FuncaoId} na escola`,
            CategoriaAuditoriaId: 3,
          });
        }

        criados++;
        resultados.push({
          cpf,
          sucesso: true,
          mensagem: contaCriada ? "Conta criada e usuario vinculado com sucesso." : "Usuario vinculado com sucesso.",
          dados: this.toDTO(created, null, usuario.UsuarioNome),
          contaCriada,
          senhaTemporaria,
          tipo: "criado",
        });
      } catch (error) {
        erros++;
        const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
        resultados.push({
          cpf,
          sucesso: false,
          mensagem: `Erro: ${mensagem}`,
          tipo: "erro",
        });
      }
    }

    if (emailsParaEnviar.length > 0) {
      EmailAlunoService.enviarEmailsEmLote(emailsParaEnviar as any).catch((erro) => {
        console.error("Erro ao enviar emails em lote (vinculo em massa):", erro);
      });
    }

    return {
      totalProcessados: itens.length,
      criados,
      duplicados,
      erros,
      resultados,
    };
  };

  findAll = async (filters?: FindFiltersDTO): Promise<EscolaxUsuarioxFuncaoDTO[]> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findAll()");
    const relacoes = await this.#relacaoDAO.findAll(filters);

    // UltimoAcessoEm só faz sentido quando a consulta já está escopada a
    // uma escola (GET /api/escolaxusuarioxfuncao?EscolaGUID=) — é aí que a
    // escola quer ver quem está de fato usando o sistema.
    const acessoMap = filters?.EscolaGUID
      ? await this.#acessoDAO.findByEscola(filters.EscolaGUID)
      : new Map<string, Date>();

    const nomesMap = await this.#usuarioDAO.findNomesByCPFs([...new Set(relacoes.map((r) => r.UsuarioCPF))]);

    return relacoes.map((item) =>
      this.toDTO(item, acessoMap.get(item.UsuarioCPF) ?? null, nomesMap.get(item.UsuarioCPF) ?? null)
    );
  };

  findById = async (EscolaxUsuarioxFuncaoId: number): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findById()");

    const relacao = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!relacao) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    const nomesMap = await this.#usuarioDAO.findNomesByCPFs([relacao.UsuarioCPF]);
    return this.toDTO(relacao, null, nomesMap.get(relacao.UsuarioCPF) ?? null);
  };

  updateRelacao = async (
    EscolaxUsuarioxFuncaoId: number,
    payload: Record<string, unknown>,
    usuarioCPFAtor?: string
  ): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.updateRelacao()");

    const existente = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!existente) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    const usuarioCPF =
      payload.UsuarioCPF !== undefined
        ? (payload.UsuarioCPF as string)
        : existente.UsuarioCPF;

    const escolaGUID =
      payload.EscolaGUID !== undefined
        ? (payload.EscolaGUID as string)
        : existente.EscolaGUID;

    const funcaoId =
      payload.FuncaoId !== undefined
        ? Number(payload.FuncaoId)
        : existente.FuncaoId;

    await this.validateReferences(usuarioCPF, escolaGUID, funcaoId);

    const duplicated = await this.#relacaoDAO.findByTripla(usuarioCPF, escolaGUID, funcaoId);
    if (
      duplicated &&
      duplicated.EscolaxUsuarioxFuncaoId !== EscolaxUsuarioxFuncaoId
    ) {
      throw new ErrorResponse(409, "Relacao ja existe", {
        message:
          "Ja existe um vinculo para este UsuarioCPF, EscolaGUID e FuncaoId.",
      });
    }

    const relacao = new EscolaxUsuarioxFuncao();
    relacao.EscolaxUsuarioxFuncaoId = EscolaxUsuarioxFuncaoId;
    relacao.UsuarioCPF = usuarioCPF;
    relacao.EscolaGUID = escolaGUID;
    relacao.FuncaoId = funcaoId;

    if (payload.DataInicio !== undefined) {
      relacao.DataInicio = payload.DataInicio ? new Date(payload.DataInicio as string) : null;
    } else {
      relacao.DataInicio = existente.DataInicio;
    }

    if (payload.DataFim !== undefined) {
      relacao.DataFim = payload.DataFim ? new Date(payload.DataFim as string) : null;
    } else {
      relacao.DataFim = existente.DataFim;
    }

    if (payload.Status !== undefined) {
      relacao.Status = payload.Status as "Ativo" | "Inativo" | "Finalizado";
    } else {
      relacao.Status = existente.Status;
    }

    const updated = await this.#relacaoDAO.update(relacao);
    if (!updated) {
      throw new ErrorResponse(500, "Erro ao atualizar relacao", {
        message: "Nao foi possivel atualizar o registro.",
      });
    }

    const refreshed = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!refreshed) {
      throw new ErrorResponse(500, "Erro ao atualizar relacao", {
        message: "Falha ao recuperar registro apos atualizacao.",
      });
    }

    if (usuarioCPFAtor) {
      void getAuditoriaService().registrar({
        EscolaGUID: refreshed.EscolaGUID,
        UsuarioCPFAtor: usuarioCPFAtor,
        AcaoTipo: "Update",
        EntidadeTipo: "escolaxusuarioxfuncao",
        EntidadeGUID: String(refreshed.EscolaxUsuarioxFuncaoId),
        EntidadeDescricao: `Vínculo de ${refreshed.UsuarioCPF} como função ${refreshed.FuncaoId} na escola`,
        CategoriaAuditoriaId: 3,
      });
    }

    return this.toDTO(refreshed);
  };

  deleteRelacao = async (EscolaxUsuarioxFuncaoId: number, usuarioCPFAtor?: string): Promise<boolean> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.deleteRelacao()");

    const existente = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!existente) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    const deleted = await this.#relacaoDAO.delete(EscolaxUsuarioxFuncaoId);
    if (!deleted) {
      throw new ErrorResponse(500, "Erro ao deletar relacao", {
        message: "Nao foi possivel remover o registro.",
      });
    }

    if (usuarioCPFAtor) {
      void getAuditoriaService().registrar({
        EscolaGUID: existente.EscolaGUID,
        UsuarioCPFAtor: usuarioCPFAtor,
        AcaoTipo: "Delete",
        EntidadeTipo: "escolaxusuarioxfuncao",
        EntidadeGUID: String(EscolaxUsuarioxFuncaoId),
        EntidadeDescricao: `Vínculo de ${existente.UsuarioCPF} como função ${existente.FuncaoId} na escola`,
        CategoriaAuditoriaId: 3,
      });
    }

    return true;
  };

  private validateReferences = async (
    usuarioCPF: string,
    escolaGUID: string,
    funcaoId: number
  ): Promise<void> => {
    const [usuarioExists, escolaExists, funcaoExists] = await Promise.all([
      this.#relacaoDAO.usuarioExists(usuarioCPF),
      this.#relacaoDAO.escolaExists(escolaGUID),
      this.#relacaoDAO.funcaoExists(funcaoId),
    ]);

    if (!usuarioExists) {
      throw new ErrorResponse(404, "Usuario nao encontrado", {
        message: `Nao existe usuario com CPF ${usuarioCPF}`,
      });
    }

    if (!escolaExists) {
      throw new ErrorResponse(404, "Escola nao encontrada", {
        message: `Nao existe escola com GUID ${escolaGUID}`,
      });
    }

    if (!funcaoExists) {
      throw new ErrorResponse(404, "Funcao nao encontrada", {
        message: `Nao existe funcao com id ${funcaoId}`,
      });
    }
  };

  /**
   * Busca todas as escolas vinculadas a um usuário
   * Retorna estrutura completa com dados da escola e funções associadas
   */
  findEscolasByUsuario = async (UsuarioCPF: string): Promise<Array<{
    escola: {
      EscolaGUID: string;
      EscolaNome: string;
      EscolaEmail: string | null;
      EscolaCor1: string | null;
      EscolaCor2: string | null;
      EscolaCor3: string | null;
      EscolaCor4: string | null;
      EscolaLogo: string | null;
    };
    funcoes: Array<{
      EscolaxUsuarioxFuncaoId: number;
      FuncaoId: number;
      FuncaoNome: string;
      DataInicio: string | null;
      DataFim: string | null;
      Status: "Ativo" | "Inativo" | "Finalizado";
    }>;
    UltimoAcessoEm: string | null;
  }>> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findEscolasByUsuario()");

    // Buscar dados no repositório
    const [escolas, acessoMap] = await Promise.all([
      this.#relacaoDAO.findEscolasByUsuarioCPF(UsuarioCPF),
      this.#acessoDAO.findByUsuario(UsuarioCPF),
    ]);

    // Converter datas para strings ISO
    return escolas.map(item => ({
      escola: item.escola,
      funcoes: item.funcoes.map(funcao => ({
        EscolaxUsuarioxFuncaoId: funcao.EscolaxUsuarioxFuncaoId,
        FuncaoId: funcao.FuncaoId,
        FuncaoNome: funcao.FuncaoNome,
        DataInicio: funcao.DataInicio ? funcao.DataInicio.toISOString().split('T')[0] : null,
        DataFim: funcao.DataFim ? funcao.DataFim.toISOString().split('T')[0] : null,
        Status: funcao.Status,
      })),
      UltimoAcessoEm: acessoMap.get(item.escola.EscolaGUID)?.toISOString() ?? null,
    }));
  };

  /**
   * Registra/atualiza (upsert com throttle de 1h) o "último acesso" do
   * usuário autenticado numa escola. NÃO é registro de auditoria — ver
   * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 3.4.
   */
  registrarAcesso = async (usuarioCPF: string, escolaGUID: string): Promise<void> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.registrarAcesso()");
    await this.#acessoDAO.upsert(usuarioCPF, escolaGUID);
  };

  private toDTO = (
    relacao: EscolaxUsuarioxFuncao,
    ultimoAcessoEm: Date | null = null,
    usuarioNome: string | null = null
  ): EscolaxUsuarioxFuncaoDTO => {
    const id = relacao.EscolaxUsuarioxFuncaoId;
    if (id === null) {
      throw new Error("EscolaxUsuarioxFuncaoId nao pode ser nulo ao converter para DTO.");
    }

    if (relacao.CreatedAt === null || relacao.UpdatedAt === null) {
      throw new Error("CreatedAt e UpdatedAt nao podem ser nulos para registros existentes.");
    }

    return {
      EscolaxUsuarioxFuncaoId: id,
      UsuarioCPF: relacao.UsuarioCPF,
      UsuarioNome: usuarioNome,
      EscolaGUID: relacao.EscolaGUID,
      FuncaoId: relacao.FuncaoId,
      FuncaoNome: relacao.FuncaoNome,
      DataInicio: relacao.DataInicio ? relacao.DataInicio.toISOString().split('T')[0] : null,
      DataFim: relacao.DataFim ? relacao.DataFim.toISOString().split('T')[0] : null,
      Status: relacao.Status,
      CreatedAt: relacao.CreatedAt.toISOString(),
      UpdatedAt: relacao.UpdatedAt.toISOString(),
      UltimoAcessoEm: ultimoAcessoEm ? ultimoAcessoEm.toISOString() : null,
    };
  };
}
