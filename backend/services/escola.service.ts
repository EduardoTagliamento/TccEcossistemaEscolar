import { v4 as uuidv4 } from "uuid";
import { RowDataPacket } from "mysql2";
import ErrorResponse from "../utils/ErrorResponse";
import Escola from "../entities/escola.model";
import { EscolaDAO } from "../repositories/escola.repository";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { getAuditoriaService } from "./auditoria.service";
import { getNotificacaoService } from "./notificacao.service";
import { pool } from "../database/mysql";

export interface TransferirDirecaoResultadoDTO {
  NovoDirecaoCPF: string;
  NovoCoordenacaoCPF: string;
}

export interface EscolaDTO {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCNPJ: string | null;
  EscolaTelefone: string | null;
  EscolaEmail: string | null;
  EscolaEndereco: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
  EscolaStatus: "Ativa" | "Inativa";
  EscolaIsTecnica: boolean;
  EscolaCreatedAt: string | null; // ISO string
  EscolaUpdatedAt: string | null; // ISO string
}

export default class EscolaService {
  #escolaDAO: EscolaDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    escolaDAODependency: EscolaDAO,
    escolaxusuarioxfuncaoDAODependency: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  EscolaService.constructor()");
    this.#escolaDAO = escolaDAODependency;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAODependency;
  }

  createEscola = async (
    jsonEscola: Record<string, unknown>,
    usuarioCPF?: string
  ): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.createEscola()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar escola.",
      });
    }

    const escola = new Escola();
    escola.EscolaGUID = (jsonEscola.EscolaGUID as string) || uuidv4();
    escola.EscolaNome = (jsonEscola.EscolaNome as string | null) ?? null;
    escola.EscolaCNPJ = (jsonEscola.EscolaCNPJ as string | null) ?? null;
    escola.EscolaTelefone = (jsonEscola.EscolaTelefone as string | null) ?? null;
    escola.EscolaEmail = (jsonEscola.EscolaEmail as string | null) ?? null;
    escola.EscolaEndereco = (jsonEscola.EscolaEndereco as string | null) ?? null;
    escola.EscolaCorPriEs = (jsonEscola.EscolaCorPriEs as string | null) ?? null;
    escola.EscolaCorPriCl = (jsonEscola.EscolaCorPriCl as string | null) ?? null;
    escola.EscolaCorSecEs = (jsonEscola.EscolaCorSecEs as string | null) ?? null;
    escola.EscolaCorSecCl = (jsonEscola.EscolaCorSecCl as string | null) ?? null;
    escola.EscolaStatus = (jsonEscola.EscolaStatus as "Ativa" | "Inativa") ?? "Ativa";
    escola.EscolaIsTecnica = (jsonEscola.EscolaIsTecnica as boolean) ?? false;

    if (jsonEscola.EscolaIcone !== undefined && jsonEscola.EscolaIcone !== null) {
      const base64Icone = jsonEscola.EscolaIcone as string;
      escola.EscolaIcone = base64Icone ? Buffer.from(base64Icone, "base64") : null;
    }

    if (jsonEscola.EscolaLogo !== undefined) {
      escola.EscolaLogo = (jsonEscola.EscolaLogo as string | null) ?? null;
    }

    // Validar CNPJ único (se fornecido)
    if (escola.EscolaCNPJ) {
      const existente = await this.#escolaDAO.findByField("EscolaCNPJ", escola.EscolaCNPJ);
      if (existente.length > 0) {
        throw new ErrorResponse(400, "CNPJ já cadastrado", {
          message: `O CNPJ ${escola.EscolaCNPJ} já está cadastrado no sistema`,
        });
      }
    }

    await this.#escolaDAO.create(escola);

    try {
      // Vincula automaticamente o usuário criador como Direção (FuncaoId = 6).
      const vinculoExistente = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
        usuarioCPF,
        escola.EscolaGUID,
        6
      );

      if (!vinculoExistente) {
        const relacao = new EscolaxUsuarioxFuncao();
        relacao.UsuarioCPF = this.normalizeCPF(usuarioCPF);
        relacao.EscolaGUID = escola.EscolaGUID;
        relacao.FuncaoId = 6;
        relacao.Status = "Ativo";
        relacao.DataInicio = new Date();
        relacao.DataFim = null;

        await this.#escolaxusuarioxfuncaoDAO.create(relacao);
      }
    } catch (error: any) {
      // Mantém consistência dos dados caso o vínculo obrigatório falhe.
      await this.#escolaDAO.delete(escola.EscolaGUID);
      throw new ErrorResponse(500, "Erro ao vincular usuário à escola", {
        message: error?.message || "A escola não pôde ser criada com vínculo de Direção.",
      });
    }

    void getAuditoriaService().registrar({
      EscolaGUID: escola.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Create",
      EntidadeTipo: "escola",
      EntidadeGUID: escola.EscolaGUID,
      EntidadeDescricao: escola.EscolaNome ?? undefined,
      CategoriaAuditoriaId: 2, // Operacional — dado institucional/config, não pessoal
    });

    return this.toDTO(escola);
  };

  findAll = async (nome?: string): Promise<EscolaDTO[]> => {
    console.log("🟣 EscolaService.findAll()");
    const escolas = await this.#escolaDAO.findAll(nome);
    return escolas.map((escola) => this.toDTO(escola));
  };

  findById = async (EscolaGUID: string): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.findById()");
    const escola = await this.#escolaDAO.findById(EscolaGUID);

    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    return this.toDTO(escola);
  };

  updateEscola = async (
    EscolaGUID: string,
    jsonEscola: Record<string, unknown>,
    usuarioCPF?: string
  ): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.updateEscola()");

    await this.validarPermissaoDirecao(usuarioCPF, EscolaGUID);

    const existente = await this.#escolaDAO.findById(EscolaGUID);
    if (!existente) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    // O frontend reenvia as 4 cores atuais em todo salvamento (mesmo sem
    // mudança) — por isso a checagem extra do representante legal só dispara
    // quando o valor recebido realmente DIFERE do já salvo, nunca só por o
    // campo estar presente no payload. Assim, quem não é representante legal
    // continua podendo salvar nome/logo sem esbarrar nessa restrição.
    const camposCor = ["EscolaCorPriEs", "EscolaCorPriCl", "EscolaCorSecEs", "EscolaCorSecCl"] as const;
    const alterandoCores = camposCor.some(
      (campo) => jsonEscola[campo] !== undefined && jsonEscola[campo] !== existente[campo]
    );
    if (alterandoCores) {
      await this.validarPermissaoRepresentanteLegal(usuarioCPF!, EscolaGUID);
    }

    const escola = new Escola();
    escola.EscolaGUID = EscolaGUID;
    escola.EscolaNome =
      jsonEscola.EscolaNome !== undefined
        ? (jsonEscola.EscolaNome as string | null)
        : existente.EscolaNome;
    escola.EscolaCNPJ =
      jsonEscola.EscolaCNPJ !== undefined
        ? (jsonEscola.EscolaCNPJ  as string | null)
        : existente.EscolaCNPJ;
    escola.EscolaTelefone =
      jsonEscola.EscolaTelefone !== undefined
        ? (jsonEscola.EscolaTelefone as string | null)
        : existente.EscolaTelefone;
    escola.EscolaEmail =
      jsonEscola.EscolaEmail !== undefined
        ? (jsonEscola.EscolaEmail as string | null)
        : existente.EscolaEmail;
    escola.EscolaEndereco =
      jsonEscola.EscolaEndereco !== undefined
        ? (jsonEscola.EscolaEndereco as string | null)
        : existente.EscolaEndereco;
    escola.EscolaCorPriEs =
      jsonEscola.EscolaCorPriEs !== undefined
        ? (jsonEscola.EscolaCorPriEs as string | null)
        : existente.EscolaCorPriEs;
    escola.EscolaCorPriCl =
      jsonEscola.EscolaCorPriCl !== undefined
        ? (jsonEscola.EscolaCorPriCl as string | null)
        : existente.EscolaCorPriCl;
    escola.EscolaCorSecEs =
      jsonEscola.EscolaCorSecEs !== undefined
        ? (jsonEscola.EscolaCorSecEs as string | null)
        : existente.EscolaCorSecEs;
    escola.EscolaCorSecCl =
      jsonEscola.EscolaCorSecCl !== undefined
        ? (jsonEscola.EscolaCorSecCl as string | null)
        : existente.EscolaCorSecCl;
    escola.EscolaStatus =
      jsonEscola.EscolaStatus !== undefined
        ? (jsonEscola.EscolaStatus as "Ativa" | "Inativa")
        : existente.EscolaStatus;
    escola.EscolaIsTecnica =
      jsonEscola.EscolaIsTecnica !== undefined
        ? (jsonEscola.EscolaIsTecnica as boolean)
        : existente.EscolaIsTecnica;

    if (jsonEscola.EscolaIcone === undefined) {
      escola.EscolaIcone = existente.EscolaIcone;
    } else if (jsonEscola.EscolaIcone === null || jsonEscola.EscolaIcone === "") {
      escola.EscolaIcone = null;
    } else {
      escola.EscolaIcone = Buffer.from(jsonEscola.EscolaIcone as string, "base64");
    }

    await this.#escolaDAO.update(escola);

    void getAuditoriaService().registrar({
      EscolaGUID: escola.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF!,
      AcaoTipo: "Update",
      EntidadeTipo: "escola",
      EntidadeGUID: escola.EscolaGUID,
      EntidadeDescricao: escola.EscolaNome ?? undefined,
      CategoriaAuditoriaId: 2, // Operacional
    });

    return this.toDTO(escola);
  };

  deleteEscola = async (EscolaGUID: string, usuarioCPF?: string): Promise<boolean> => {
    console.log("🟣 EscolaService.deleteEscola()");

    await this.validarPermissaoDirecao(usuarioCPF, EscolaGUID);

    await this.#escolaxusuarioxfuncaoDAO.deleteByEscolaGUID(EscolaGUID);
    const deletado = await this.#escolaDAO.delete(EscolaGUID);

    if (deletado) {
      void getAuditoriaService().registrar({
        EscolaGUID,
        UsuarioCPFAtor: usuarioCPF!,
        AcaoTipo: "Delete",
        EntidadeTipo: "escola",
        EntidadeGUID: EscolaGUID,
        CategoriaAuditoriaId: 2, // Operacional
      });
    }

    return deletado;
  };

  /**
   * Elege um Coordenação ativo da escola para assumir a Direção — troca
   * simétrica e imediata: quem chama (Direção atual) passa a Coordenação, o
   * eleito passa a Direção. Sem migration nova de schema — reaproveita
   * escolaxusuarioxfuncao (FuncaoId 1=Coordenação, 6=Direção), respeitando a
   * UNIQUE KEY (UsuarioCPF, EscolaGUID, FuncaoId): se qualquer um dos dois já
   * teve um vínculo anterior com a função de destino (ativo ou não), esse
   * vínculo é reativado em vez de duplicado.
   *
   * Tudo numa transação — uma falha no meio não pode deixar a escola sem
   * nenhum Direção ativo.
   */
  transferirDirecao = async (
    EscolaGUID: string,
    novoDirecaoCPF: string,
    direcaoAtualCPF?: string
  ): Promise<TransferirDirecaoResultadoDTO> => {
    console.log("🟣 EscolaService.transferirDirecao()");

    await this.validarPermissaoDirecao(direcaoAtualCPF, EscolaGUID);

    if (!direcaoAtualCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado");
    }

    if (novoDirecaoCPF === direcaoAtualCPF) {
      throw new ErrorResponse(400, "Sem alteração", {
        message: "Você já é a Direção desta escola.",
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [direcaoRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioCPF = ? AND EscolaGUID = ? AND FuncaoId = 6 AND Status = 'Ativo' LIMIT 1`,
        [direcaoAtualCPF, EscolaGUID]
      );
      if (direcaoRows.length === 0) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Você não é a Direção ativa desta escola.",
        });
      }
      const direcaoAtualId = direcaoRows[0].EscolaxUsuarioxFuncaoId;

      const [coordenacaoRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioCPF = ? AND EscolaGUID = ? AND FuncaoId = 1 AND Status = 'Ativo' LIMIT 1`,
        [novoDirecaoCPF, EscolaGUID]
      );
      if (coordenacaoRows.length === 0) {
        throw new ErrorResponse(400, "Usuário inválido", {
          message: "O usuário eleito precisa ser Coordenação ativo(a) desta escola.",
        });
      }
      const novoDirecaoVinculoAtualId = coordenacaoRows[0].EscolaxUsuarioxFuncaoId;

      // Desativa os dois vínculos atuais (Direção de quem sai, Coordenação de quem assume).
      await connection.execute(
        `UPDATE escolaxusuarioxfuncao SET Status = 'Inativo', DataFim = CURDATE() WHERE EscolaxUsuarioxFuncaoId = ?`,
        [direcaoAtualId]
      );
      await connection.execute(
        `UPDATE escolaxusuarioxfuncao SET Status = 'Inativo', DataFim = CURDATE() WHERE EscolaxUsuarioxFuncaoId = ?`,
        [novoDirecaoVinculoAtualId]
      );

      // Quem sai da Direção assume (ou reassume) Coordenação.
      const [coordenacaoExistenteRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioCPF = ? AND EscolaGUID = ? AND FuncaoId = 1 LIMIT 1`,
        [direcaoAtualCPF, EscolaGUID]
      );
      if (coordenacaoExistenteRows.length > 0) {
        await connection.execute(
          `UPDATE escolaxusuarioxfuncao SET Status = 'Ativo', DataInicio = CURDATE(), DataFim = NULL WHERE EscolaxUsuarioxFuncaoId = ?`,
          [coordenacaoExistenteRows[0].EscolaxUsuarioxFuncaoId]
        );
      } else {
        await connection.execute(
          `INSERT INTO escolaxusuarioxfuncao (UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, Status)
           VALUES (?, ?, 1, CURDATE(), 'Ativo')`,
          [direcaoAtualCPF, EscolaGUID]
        );
      }

      // Quem era Coordenação assume (ou reassume) Direção.
      const [direcaoExistenteRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioCPF = ? AND EscolaGUID = ? AND FuncaoId = 6 LIMIT 1`,
        [novoDirecaoCPF, EscolaGUID]
      );
      if (direcaoExistenteRows.length > 0) {
        await connection.execute(
          `UPDATE escolaxusuarioxfuncao SET Status = 'Ativo', DataInicio = CURDATE(), DataFim = NULL WHERE EscolaxUsuarioxFuncaoId = ?`,
          [direcaoExistenteRows[0].EscolaxUsuarioxFuncaoId]
        );
      } else {
        await connection.execute(
          `INSERT INTO escolaxusuarioxfuncao (UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, Status)
           VALUES (?, ?, 6, CURDATE(), 'Ativo')`,
          [novoDirecaoCPF, EscolaGUID]
        );
      }

      const [nomesRows] = await connection.execute<RowDataPacket[]>(
        `SELECT UsuarioCPF, UsuarioNome FROM usuario WHERE UsuarioCPF IN (?, ?)`,
        [direcaoAtualCPF, novoDirecaoCPF]
      );
      const nomePorCPF = new Map(nomesRows.map((r) => [r.UsuarioCPF as string, r.UsuarioNome as string]));

      await connection.commit();

      void getAuditoriaService().registrar({
        EscolaGUID,
        UsuarioCPFAtor: direcaoAtualCPF,
        AcaoTipo: "Update",
        EntidadeTipo: "escolaxusuarioxfuncao",
        EntidadeGUID: EscolaGUID,
        EntidadeDescricao: `Direção transferida de ${nomePorCPF.get(direcaoAtualCPF) ?? direcaoAtualCPF} para ${nomePorCPF.get(novoDirecaoCPF) ?? novoDirecaoCPF}`,
        CategoriaAuditoriaId: 5, // SegurancaConta — mudança de função/permissão
      });

      getNotificacaoService()
        .disparar({
          tipoSlug: "promovido_direcao",
          destinatarios: [novoDirecaoCPF],
          escolaGUID: EscolaGUID,
          titulo: "Você foi eleito(a) para a Direção da escola",
        })
        .catch((error) => console.error("🔴 EscolaService.transferirDirecao() falhou ao notificar novo Direção:", error));

      getNotificacaoService()
        .disparar({
          tipoSlug: "rebaixado_coordenacao",
          destinatarios: [direcaoAtualCPF],
          escolaGUID: EscolaGUID,
          titulo: `Você passou a Coordenação — ${nomePorCPF.get(novoDirecaoCPF) ?? "outro usuário"} assumiu a Direção`,
        })
        .catch((error) => console.error("🔴 EscolaService.transferirDirecao() falhou ao notificar antigo Direção:", error));

      return { NovoDirecaoCPF: novoDirecaoCPF, NovoCoordenacaoCPF: direcaoAtualCPF };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  /**
   * Valida se usuário tem papel de Direção na escola (FuncaoId = 6).
   * Alterar/excluir dados institucionais da escola é restrito à Direção.
   */
  private async validarPermissaoDirecao(usuarioCPF: string | undefined, escolaGUID: string): Promise<void> {
    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para realizar esta operação.",
      });
    }

    const direcao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(usuarioCPF, escolaGUID, 6);

    if (direcao && direcao.Status === "Ativo") {
      return; // Tem permissão
    }

    throw new ErrorResponse(403, "Sem permissão", {
      message: "Você não tem permissão para realizar esta operação. Apenas a Direção pode alterar os dados da escola.",
    });
  }

  /**
   * Personalização de cores é restrita ao representante legal da escola —
   * o Direção ativo há mais tempo (ver EscolaxUsuarioxFuncaoDAO.findRepresentanteLegal).
   * Demais campos da escola continuam liberados para qualquer Direção
   * (validarPermissaoDirecao), só as 4 cores exigem essa checagem extra.
   */
  private async validarPermissaoRepresentanteLegal(usuarioCPF: string, escolaGUID: string): Promise<void> {
    const representanteLegal = await this.#escolaxusuarioxfuncaoDAO.findRepresentanteLegal(escolaGUID);

    if (!representanteLegal || representanteLegal.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "A personalização de cores é restrita ao representante legal da escola (Direção ativo há mais tempo).",
      });
    }
  }

  private toDTO(escola: Escola): EscolaDTO {
    return {
      EscolaGUID: escola.EscolaGUID,
      EscolaNome: escola.EscolaNome,
      EscolaCNPJ: escola.EscolaCNPJ,
      EscolaTelefone: escola.EscolaTelefone,
      EscolaEmail: escola.EscolaEmail,
      EscolaEndereco: escola.EscolaEndereco,
      EscolaCorPriEs: escola.EscolaCorPriEs,
      EscolaCorPriCl: escola.EscolaCorPriCl,
      EscolaCorSecEs: escola.EscolaCorSecEs,
      EscolaCorSecCl: escola.EscolaCorSecCl,
      EscolaIcone: escola.EscolaIcone ? escola.EscolaIcone.toString("base64") : null,
      EscolaStatus: escola.EscolaStatus,
      EscolaIsTecnica: escola.EscolaIsTecnica,
      EscolaCreatedAt: escola.EscolaCreatedAt ? escola.EscolaCreatedAt.toISOString() : null,
      EscolaUpdatedAt: escola.EscolaUpdatedAt ? escola.EscolaUpdatedAt.toISOString() : null,
    };
  }

  private normalizeCPF(cpf: string): string {
    const normalized = cpf.trim();
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    const digits = normalized.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    return normalized;
  }
}