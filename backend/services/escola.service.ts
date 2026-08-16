import { gerarGUID } from "../utils/helpers/guid.helper";
import { RowDataPacket } from "mysql2";
import ErrorResponse from "../utils/ErrorResponse";
import Escola from "../entities/escola.model";
import { EscolaDAO } from "../repositories/escola.repository";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { ExclusaoEscolaDAO } from "../repositories/exclusao-escola.repository";
import ExclusaoEscola from "../entities/exclusao-escola.model";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { ResendEmailService } from "../external/ResendEmailService";
import { getAuditoriaService } from "./auditoria.service";
import { getNotificacaoService } from "./notificacao.service";
import { pool } from "../database/mysql";

export interface TransferirDirecaoResultadoDTO {
  NovoDirecaoGUID: string;
  NovoCoordenacaoGUID: string;
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
  #exclusaoEscolaDAO: ExclusaoEscolaDAO;
  #usuarioDAO: UsuarioDAO;
  #emailService: ResendEmailService;

  private readonly EXCLUSAO_CODIGO_LENGTH = 6;
  private readonly EXCLUSAO_EXPIRATION_MINUTES = 15;
  private readonly EXCLUSAO_MAX_ATTEMPTS_PER_HOUR = 3;

  constructor(
    escolaDAODependency: EscolaDAO,
    escolaxusuarioxfuncaoDAODependency: EscolaxUsuarioxFuncaoDAO,
    exclusaoEscolaDAODependency: ExclusaoEscolaDAO,
    usuarioDAODependency: UsuarioDAO
  ) {
    console.log("⬆️  EscolaService.constructor()");
    this.#escolaDAO = escolaDAODependency;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAODependency;
    this.#exclusaoEscolaDAO = exclusaoEscolaDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
    this.#emailService = ResendEmailService.getInstance();
  }

  createEscola = async (
    jsonEscola: Record<string, unknown>,
    usuarioGUIDAtor?: string
  ): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.createEscola()");

    if (!usuarioGUIDAtor) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar escola.",
      });
    }

    const escola = new Escola();
    escola.EscolaGUID = (jsonEscola.EscolaGUID as string) || gerarGUID();
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
        usuarioGUIDAtor,
        escola.EscolaGUID,
        6
      );

      if (!vinculoExistente) {
        const relacao = new EscolaxUsuarioxFuncao();
        relacao.UsuarioGUID = usuarioGUIDAtor;
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
      UsuarioGUIDAtor: usuarioGUIDAtor,
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
    usuarioGUIDAtor?: string
  ): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.updateEscola()");

    await this.validarPermissaoDirecao(usuarioGUIDAtor, EscolaGUID);

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
      await this.validarPermissaoRepresentanteLegal(usuarioGUIDAtor!, EscolaGUID);
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
      UsuarioGUIDAtor: usuarioGUIDAtor!,
      AcaoTipo: "Update",
      EntidadeTipo: "escola",
      EntidadeGUID: escola.EscolaGUID,
      EntidadeDescricao: escola.EscolaNome ?? undefined,
      CategoriaAuditoriaId: 2, // Operacional
    });

    return this.toDTO(escola);
  };

  /**
   * Exclusão definitiva por inatividade (30 dias desde confirmarExclusao,
   * sem reativação) — disparada pelo CleanupScheduler (job diário), não por
   * uma requisição de usuário. Sem checagem de permissão de Direção (não
   * tem usuário logado nesse fluxo) — a autorização já aconteceu quando a
   * exclusão foi confirmada com o código por email; isso só executa depois
   * que o prazo de reversão passou.
   */
  excluirDefinitivamentePorInatividade = async (EscolaGUID: string): Promise<boolean> => {
    console.log("🟣 EscolaService.excluirDefinitivamentePorInatividade()");

    await this.#escolaxusuarioxfuncaoDAO.deleteByEscolaGUID(EscolaGUID);
    const deletado = await this.#escolaDAO.delete(EscolaGUID);

    // Sem registro em `registroauditoria` aqui — a coluna do ator
    // (`UsuarioGUIDAtor`) tem FK pra `usuario`, e não existe um usuário
    // "SYSTEM" real pra apontar (o insert quebraria a FK). O log do
    // scheduler abaixo já deixa rastro durável (logs do Railway).
    if (deletado) {
      console.log(`[SCHEDULER] 🗑️ Escola ${EscolaGUID} excluída definitivamente (30 dias inativa sem reativação)`);
    }

    return deletado;
  };

  deleteEscola = async (EscolaGUID: string, usuarioGUIDAtor?: string): Promise<boolean> => {
    console.log("🟣 EscolaService.deleteEscola()");

    await this.validarPermissaoDirecao(usuarioGUIDAtor, EscolaGUID);

    await this.#escolaxusuarioxfuncaoDAO.deleteByEscolaGUID(EscolaGUID);
    const deletado = await this.#escolaDAO.delete(EscolaGUID);

    if (deletado) {
      void getAuditoriaService().registrar({
        EscolaGUID,
        UsuarioGUIDAtor: usuarioGUIDAtor!,
        AcaoTipo: "Delete",
        EntidadeTipo: "escola",
        EntidadeGUID: EscolaGUID,
        CategoriaAuditoriaId: 2, // Operacional
      });
    }

    return deletado;
  };

  /**
   * Solicita a exclusão da escola — envia um código de 6 dígitos pro email
   * do próprio usuário que está pedindo (não pra todos os Direção da
   * escola). Só desativa de fato em confirmarExclusao(), depois do código
   * validado. Mesmo padrão de VerificacaoEmailService.solicitarVerificacao.
   */
  solicitarExclusao = async (EscolaGUID: string, usuarioGUIDAtor?: string): Promise<{ message: string }> => {
    console.log("🟣 EscolaService.solicitarExclusao()");

    await this.validarPermissaoDirecao(usuarioGUIDAtor, EscolaGUID);

    const escola = await this.#escolaDAO.findById(EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUIDAtor!);
    if (!usuario || !usuario.UsuarioEmail) {
      throw new ErrorResponse(400, "Email não cadastrado", {
        message: "Você precisa ter um email cadastrado na sua conta para excluir a escola.",
      });
    }

    const tentativasRecentes = await this.#exclusaoEscolaDAO.countRecentAttempts(EscolaGUID, 1);
    if (tentativasRecentes >= this.EXCLUSAO_MAX_ATTEMPTS_PER_HOUR) {
      throw new ErrorResponse(429, "Muitas tentativas", {
        message: `Você excedeu o limite de ${this.EXCLUSAO_MAX_ATTEMPTS_PER_HOUR} solicitações por hora. Tente novamente mais tarde.`,
      });
    }

    await this.#exclusaoEscolaDAO.invalidateOldCodes(EscolaGUID);

    const codigo = this.gerarCodigoExclusao();

    const exclusao = new ExclusaoEscola();
    exclusao.EscolaGUID = EscolaGUID;
    exclusao.UsuarioGUIDSolicitante = usuarioGUIDAtor!;
    exclusao.ExclusaoCodigo = codigo;
    exclusao.ExclusaoExpiresAt = this.calcularExpiracaoExclusao();

    await this.#exclusaoEscolaDAO.create(exclusao);

    try {
      await this.#emailService.sendSchoolDeletionCode(
        usuario.UsuarioEmail,
        usuario.UsuarioNome,
        escola.EscolaNome ?? "sua escola",
        codigo
      );
    } catch (error: any) {
      console.error("❌ EscolaService.solicitarExclusao(): falha ao enviar email:", error?.message ?? error);
      throw new ErrorResponse(500, "Erro ao enviar email", {
        message: "Não foi possível enviar o código de confirmação. Tente novamente mais tarde.",
      });
    }

    return { message: `Código de confirmação enviado para ${usuario.UsuarioEmail}` };
  };

  /**
   * Confirma a exclusão com o código recebido por email — desativa a escola
   * (EscolaStatus='Inativa' + EscolaInativadaEm=NOW()). Exclusão definitiva
   * só acontece depois de 30 dias inativa, via job diário (CleanupScheduler).
   */
  confirmarExclusao = async (EscolaGUID: string, codigo: string, usuarioGUIDAtor?: string): Promise<{ message: string }> => {
    console.log("🟣 EscolaService.confirmarExclusao()");

    await this.validarPermissaoDirecao(usuarioGUIDAtor, EscolaGUID);

    const exclusao = await this.#exclusaoEscolaDAO.findValidCode(EscolaGUID, usuarioGUIDAtor!, codigo);
    if (!exclusao) {
      throw new ErrorResponse(400, "Código inválido", {
        message: "O código informado é inválido, já foi usado ou expirou.",
      });
    }

    await this.#exclusaoEscolaDAO.markAsUsed(exclusao.ExclusaoId!);
    await this.#escolaDAO.marcarInativa(EscolaGUID);

    void getAuditoriaService().registrar({
      EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor!,
      AcaoTipo: "Delete",
      EntidadeTipo: "escola",
      EntidadeGUID: EscolaGUID,
      EntidadeDescricao: "Escola desativada (exclusão solicitada) — exclusão definitiva em 30 dias se não reativada",
      CategoriaAuditoriaId: 2, // Operacional
    });

    return { message: "Escola desativada. Se não for reativada em 30 dias, os dados serão excluídos definitivamente." };
  };

  private gerarCodigoExclusao(): string {
    const min = Math.pow(10, this.EXCLUSAO_CODIGO_LENGTH - 1);
    const max = Math.pow(10, this.EXCLUSAO_CODIGO_LENGTH) - 1;
    const codigo = Math.floor(Math.random() * (max - min + 1)) + min;
    return codigo.toString();
  }

  private calcularExpiracaoExclusao(): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + this.EXCLUSAO_EXPIRATION_MINUTES);
    return now;
  }

  /**
   * Elege um Coordenação ativo da escola para assumir a Direção — troca
   * simétrica e imediata: quem chama (Direção atual) passa a Coordenação, o
   * eleito passa a Direção. Sem migration nova de schema — reaproveita
   * escolaxusuarioxfuncao (FuncaoId 1=Coordenação, 6=Direção), respeitando a
   * UNIQUE KEY (UsuarioGUID, EscolaGUID, FuncaoId): se qualquer um dos dois já
   * teve um vínculo anterior com a função de destino (ativo ou não), esse
   * vínculo é reativado em vez de duplicado.
   *
   * Tudo numa transação — uma falha no meio não pode deixar a escola sem
   * nenhum Direção ativo.
   */
  transferirDirecao = async (
    EscolaGUID: string,
    novoDirecaoGUID: string,
    direcaoAtualGUID?: string
  ): Promise<TransferirDirecaoResultadoDTO> => {
    console.log("🟣 EscolaService.transferirDirecao()");

    await this.validarPermissaoDirecao(direcaoAtualGUID, EscolaGUID);

    if (!direcaoAtualGUID) {
      throw new ErrorResponse(401, "Usuário não autenticado");
    }

    if (novoDirecaoGUID === direcaoAtualGUID) {
      throw new ErrorResponse(400, "Sem alteração", {
        message: "Você já é a Direção desta escola.",
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [direcaoRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioGUID = ? AND EscolaGUID = ? AND FuncaoId = 6 AND Status = 'Ativo' LIMIT 1`,
        [direcaoAtualGUID, EscolaGUID]
      );
      if (direcaoRows.length === 0) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Você não é a Direção ativa desta escola.",
        });
      }
      const direcaoAtualId = direcaoRows[0].EscolaxUsuarioxFuncaoId;

      const [coordenacaoRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioGUID = ? AND EscolaGUID = ? AND FuncaoId = 1 AND Status = 'Ativo' LIMIT 1`,
        [novoDirecaoGUID, EscolaGUID]
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
         WHERE UsuarioGUID = ? AND EscolaGUID = ? AND FuncaoId = 1 LIMIT 1`,
        [direcaoAtualGUID, EscolaGUID]
      );
      if (coordenacaoExistenteRows.length > 0) {
        await connection.execute(
          `UPDATE escolaxusuarioxfuncao SET Status = 'Ativo', DataInicio = CURDATE(), DataFim = NULL WHERE EscolaxUsuarioxFuncaoId = ?`,
          [coordenacaoExistenteRows[0].EscolaxUsuarioxFuncaoId]
        );
      } else {
        await connection.execute(
          `INSERT INTO escolaxusuarioxfuncao (UsuarioGUID, EscolaGUID, FuncaoId, DataInicio, Status)
           VALUES (?, ?, 1, CURDATE(), 'Ativo')`,
          [direcaoAtualGUID, EscolaGUID]
        );
      }

      // Quem era Coordenação assume (ou reassume) Direção.
      const [direcaoExistenteRows] = await connection.execute<RowDataPacket[]>(
        `SELECT EscolaxUsuarioxFuncaoId FROM escolaxusuarioxfuncao
         WHERE UsuarioGUID = ? AND EscolaGUID = ? AND FuncaoId = 6 LIMIT 1`,
        [novoDirecaoGUID, EscolaGUID]
      );
      if (direcaoExistenteRows.length > 0) {
        await connection.execute(
          `UPDATE escolaxusuarioxfuncao SET Status = 'Ativo', DataInicio = CURDATE(), DataFim = NULL WHERE EscolaxUsuarioxFuncaoId = ?`,
          [direcaoExistenteRows[0].EscolaxUsuarioxFuncaoId]
        );
      } else {
        await connection.execute(
          `INSERT INTO escolaxusuarioxfuncao (UsuarioGUID, EscolaGUID, FuncaoId, DataInicio, Status)
           VALUES (?, ?, 6, CURDATE(), 'Ativo')`,
          [novoDirecaoGUID, EscolaGUID]
        );
      }

      const [nomesRows] = await connection.execute<RowDataPacket[]>(
        `SELECT UsuarioGUID, UsuarioNome FROM usuario WHERE UsuarioGUID IN (?, ?)`,
        [direcaoAtualGUID, novoDirecaoGUID]
      );
      const nomePorGUID = new Map(nomesRows.map((r) => [r.UsuarioGUID as string, r.UsuarioNome as string]));

      await connection.commit();

      void getAuditoriaService().registrar({
        EscolaGUID,
        UsuarioGUIDAtor: direcaoAtualGUID,
        AcaoTipo: "Update",
        EntidadeTipo: "escolaxusuarioxfuncao",
        EntidadeGUID: EscolaGUID,
        EntidadeDescricao: `Direção transferida de ${nomePorGUID.get(direcaoAtualGUID) ?? direcaoAtualGUID} para ${nomePorGUID.get(novoDirecaoGUID) ?? novoDirecaoGUID}`,
        CategoriaAuditoriaId: 5, // SegurancaConta — mudança de função/permissão
      });

      getNotificacaoService()
        .disparar({
          tipoSlug: "promovido_direcao",
          destinatarios: [novoDirecaoGUID],
          escolaGUID: EscolaGUID,
          titulo: "Você foi eleito(a) para a Direção da escola",
        })
        .catch((error) => console.error("🔴 EscolaService.transferirDirecao() falhou ao notificar novo Direção:", error));

      getNotificacaoService()
        .disparar({
          tipoSlug: "rebaixado_coordenacao",
          destinatarios: [direcaoAtualGUID],
          escolaGUID: EscolaGUID,
          titulo: `Você passou a Coordenação — ${nomePorGUID.get(novoDirecaoGUID) ?? "outro usuário"} assumiu a Direção`,
        })
        .catch((error) => console.error("🔴 EscolaService.transferirDirecao() falhou ao notificar antigo Direção:", error));

      return { NovoDirecaoGUID: novoDirecaoGUID, NovoCoordenacaoGUID: direcaoAtualGUID };
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
  private async validarPermissaoDirecao(usuarioGUID: string | undefined, escolaGUID: string): Promise<void> {
    if (!usuarioGUID) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para realizar esta operação.",
      });
    }

    const direcao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(usuarioGUID, escolaGUID, 6);

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
  private async validarPermissaoRepresentanteLegal(usuarioGUID: string, escolaGUID: string): Promise<void> {
    const representanteLegal = await this.#escolaxusuarioxfuncaoDAO.findRepresentanteLegal(escolaGUID);

    if (!representanteLegal || representanteLegal.UsuarioGUID !== usuarioGUID) {
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
}