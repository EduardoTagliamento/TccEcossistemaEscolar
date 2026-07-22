/**
 * 🟣 Service - Pendência
 * 
 * Camada de lógica de negócio para Pendências.
 * 
 * Regras de Negócio:
 * - Criar pendência: apenas Coordenação, Direção ou Secretaria
 * - Usuário destinatário deve estar vinculado à escola
 * - Prazo deve ser futuro
 * - Marcar como feito: apenas usuário destinatário
 * - Listar: usuário só vê suas próprias pendências (exceto admin)
 * - Atualizar/Deletar: apenas criador ou admin da escola
 */

import { v4 as uuidv4 } from "uuid";
import Pendencia from "../entities/pendencia.model";
import { PendenciaDAO, PendenciaFilters } from "../repositories/pendencia.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { getNotificacaoService } from "./notificacao.service";
import { getAuditoriaService } from "./auditoria.service";

/**
 * DTOs
 */
export interface PendenciaDTO {
  PendenciaGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo: string | null;
  PendenciaPostagemData: Date;
  PendenciaPrazoData: Date;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData: Date | null;
  PendenciaCreatedAt: Date;
  PendenciaUpdatedAt: Date;
}

export interface PendenciaCreateDTO {
  UsuarioCPFDestino: string;  // CPF do usuário que receberá a pendência
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo?: string;
  PendenciaPrazoData: string | Date;  // ISO string ou Date
}

export interface PendenciaUpdateDTO {
  PendenciaTitulo?: string;
  PendenciaConteudo?: string;
  PendenciaPrazoData?: string | Date;
}

/**
 * Service de Pendência
 */
export default class PendenciaService {
  #pendenciaDAO: PendenciaDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaDAO: EscolaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    pendenciaDAO: PendenciaDAO,
    usuarioDAO: UsuarioDAO,
    escolaDAO: EscolaDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("🟣 PendenciaService.constructor()");
    this.#pendenciaDAO = pendenciaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * CREATE - Criar nova pendência
   * Apenas Coordenação (1), Secretaria (2) ou Direção (6)
   */
  async store(data: PendenciaCreateDTO, usuarioCPFCriador: string): Promise<PendenciaDTO> {
    console.log("🟣 PendenciaService.store()");

    // 1. Validar permissão de criação (Coordenação, Secretaria ou Direção)
    await this.#validarPermissaoCriar(usuarioCPFCriador, data.EscolaGUID);

    // 2. Validar escola existe
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada");
    }

    // 3. Validar usuário destinatário existe
    const usuarioDestino = await this.#usuarioDAO.findByCPF(data.UsuarioCPFDestino);
    if (!usuarioDestino) {
      throw new ErrorResponse(404, "Usuário destinatário não encontrado");
    }

    // 4. Validar usuário destinatário está vinculado à escola
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: data.EscolaGUID,
      UsuarioCPF: data.UsuarioCPFDestino
    });

    if (!vinculos.some((v) => v.Status === "Ativo")) {
      throw new ErrorResponse(
        400,
        "Usuário destinatário não está vinculado a esta escola"
      );
    }

    // 5. Validar prazo é futuro
    const prazoData = new Date(data.PendenciaPrazoData);
    if (prazoData <= new Date()) {
      throw new ErrorResponse(400, "Prazo deve ser uma data futura");
    }

    // 6. Criar entidade Pendencia
    const pendencia = Pendencia.fromPlainObject({
      PendenciaGUID: uuidv4(),
      UsuarioCPF: data.UsuarioCPFDestino,
      EscolaGUID: data.EscolaGUID,
      PendenciaTitulo: data.PendenciaTitulo.trim(),
      PendenciaConteudo: data.PendenciaConteudo?.trim() || null,
      PendenciaPostagemData: new Date(),
      PendenciaPrazoData: prazoData,
      PendenciaFeito: false,
      PendenciaRealizacaoData: null,
      PendenciaCreatedAt: new Date(),
      PendenciaUpdatedAt: new Date()
    });

    // 7. Validar entidade
    pendencia.validar();

    // 8. Salvar no banco
    const created = await this.#pendenciaDAO.create(pendencia);

    // 9. Notificar destinatário (tipo `pendencia_criada`) — não bloqueia a resposta
    getNotificacaoService().disparar({
      tipoSlug: "pendencia_criada",
      destinatarios: [created.UsuarioCPF],
      escolaGUID: created.EscolaGUID,
      titulo: `Nova pendência: ${created.PendenciaTitulo}`,
      conteudo: created.PendenciaConteudo,
      entidadeTipo: "pendencia",
      entidadeGUID: created.PendenciaGUID,
    }).catch((error) => {
      console.error("🔴 PendenciaService.store() - notificação falhou:", error);
    });

    void getAuditoriaService().registrar({
      EscolaGUID: created.EscolaGUID,
      UsuarioCPFAtor: usuarioCPFCriador,
      AcaoTipo: "Create",
      EntidadeTipo: "pendencia",
      EntidadeGUID: created.PendenciaGUID,
      EntidadeDescricao: created.PendenciaTitulo,
      CategoriaAuditoriaId: 1,
    });

    return this.#toDTO(created);
  }

  /**
   * INDEX - Listar pendências com filtros
   */
  async index(filters: PendenciaFilters, usuarioCPF: string): Promise<PendenciaDTO[]> {
    console.log("🟣 PendenciaService.index()");

    // Se filtro de escola foi fornecido, validar acesso
    if (filters.EscolaGUID) {
      const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
        EscolaGUID: filters.EscolaGUID,
        UsuarioCPF: usuarioCPF
      });

      if (!vinculos.some((v) => v.Status === "Ativo")) {
        throw new ErrorResponse(403, "Sem acesso a esta escola");
      }

      // Se não for admin (Coord/Sec/Dir), só pode ver suas próprias pendências
      if (!vinculos.some((v) => v.Status === "Ativo" && [1, 2, 6].includes(v.FuncaoId))) {
        filters.UsuarioCPF = usuarioCPF;
      }
    } else {
      // Se não especificou escola, só pode ver suas próprias pendências
      filters.UsuarioCPF = usuarioCPF;
    }

    const pendencias = await this.#pendenciaDAO.findAll(filters);
    return pendencias.map(p => this.#toDTO(p));
  }

  /**
   * SHOW - Buscar pendência por ID
   */
  async show(guid: string, usuarioCPF: string): Promise<PendenciaDTO> {
    console.log("🟣 PendenciaService.show()");

    const pendencia = await this.#pendenciaDAO.findById(guid);

    if (!pendencia) {
      throw new ErrorResponse(404, "Pendência não encontrada");
    }

    // Validar acesso (destinatário ou admin da escola)
    await this.#validarAcesso(pendencia, usuarioCPF);

    return this.#toDTO(pendencia);
  }

  /**
   * UPDATE - Atualizar pendência
   * Apenas admin da escola (Coord/Sec/Dir)
   */
  async update(guid: string, data: PendenciaUpdateDTO, usuarioCPF: string): Promise<PendenciaDTO> {
    console.log("🟣 PendenciaService.update()");

    // 1. Buscar pendência
    const pendencia = await this.#pendenciaDAO.findById(guid);
    if (!pendencia) {
      throw new ErrorResponse(404, "Pendência não encontrada");
    }

    // 2. Validar permissão (apenas admin)
    await this.#validarPermissaoAdmin(usuarioCPF, pendencia.EscolaGUID);

    // 3. Validar dados
    const updateData: Partial<Pendencia> = {};

    if (data.PendenciaTitulo) {
      if (data.PendenciaTitulo.trim().length < 3) {
        throw new ErrorResponse(400, "Título deve ter no mínimo 3 caracteres");
      }
      updateData.PendenciaTitulo = data.PendenciaTitulo.trim();
    }

    if (data.PendenciaConteudo !== undefined) {
      updateData.PendenciaConteudo = data.PendenciaConteudo?.trim() || null;
    }

    if (data.PendenciaPrazoData) {
      const novoPrazo = new Date(data.PendenciaPrazoData);
      if (novoPrazo <= new Date()) {
        throw new ErrorResponse(400, "Prazo deve ser uma data futura");
      }
      updateData.PendenciaPrazoData = novoPrazo;
    }

    // 4. Atualizar no banco
    const updated = await this.#pendenciaDAO.update(guid, updateData);

    void getAuditoriaService().registrar({
      EscolaGUID: updated.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Update",
      EntidadeTipo: "pendencia",
      EntidadeGUID: updated.PendenciaGUID,
      EntidadeDescricao: updated.PendenciaTitulo,
      CategoriaAuditoriaId: 1,
    });

    return this.#toDTO(updated);
  }

  /**
   * DESTROY - Excluir pendência
   * Apenas admin da escola (Coord/Sec/Dir)
   */
  async destroy(guid: string, usuarioCPF: string): Promise<void> {
    console.log("🟣 PendenciaService.destroy()");

    // 1. Buscar pendência
    const pendencia = await this.#pendenciaDAO.findById(guid);
    if (!pendencia) {
      throw new ErrorResponse(404, "Pendência não encontrada");
    }

    // 2. Validar permissão (apenas admin)
    await this.#validarPermissaoAdmin(usuarioCPF, pendencia.EscolaGUID);

    // 3. Deletar
    await this.#pendenciaDAO.delete(guid);

    void getAuditoriaService().registrar({
      EscolaGUID: pendencia.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Delete",
      EntidadeTipo: "pendencia",
      EntidadeGUID: pendencia.PendenciaGUID,
      EntidadeDescricao: pendencia.PendenciaTitulo,
      CategoriaAuditoriaId: 1,
    });
  }

  /**
   * MARCAR COMO FEITO - Usuário destinatário marca como concluída
   */
  async marcarComoFeito(guid: string, usuarioCPF: string): Promise<PendenciaDTO> {
    console.log("🟣 PendenciaService.marcarComoFeito()");

    // 1. Buscar pendência
    const pendencia = await this.#pendenciaDAO.findById(guid);
    if (!pendencia) {
      throw new ErrorResponse(404, "Pendência não encontrada");
    }

    // 2. Validar é o destinatário
    if (pendencia.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Apenas o destinatário pode marcar como feito");
    }

    // 3. Verificar se já está feita
    if (pendencia.PendenciaFeito) {
      throw new ErrorResponse(400, "Pendência já foi marcada como feita");
    }

    // 4. Marcar como feito
    const updated = await this.#pendenciaDAO.marcarComoFeito(guid);

    void getAuditoriaService().registrar({
      EscolaGUID: updated.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Update",
      EntidadeTipo: "pendencia",
      EntidadeGUID: updated.PendenciaGUID,
      EntidadeDescricao: updated.PendenciaTitulo,
      CategoriaAuditoriaId: 1,
    });

    return this.#toDTO(updated);
  }

  /**
   * CONTAR PENDENTES - Total de pendências não concluídas do usuário
   */
  async contarPendentes(usuarioCPF: string, escolaGUID?: string): Promise<number> {
    console.log("🟣 PendenciaService.contarPendentes()");

    // Se especificou escola, validar acesso
    if (escolaGUID) {
      const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
        EscolaGUID: escolaGUID,
        UsuarioCPF: usuarioCPF
      });
      if (!vinculos.some((v) => v.Status === "Ativo")) {
        throw new ErrorResponse(403, "Sem acesso a esta escola");
      }
    }

    return await this.#pendenciaDAO.contarPendentes(usuarioCPF, escolaGUID);
  }

  /**
   * CONTAR ATRASADAS - Total de pendências atrasadas do usuário
   */
  async contarAtrasadas(usuarioCPF: string, escolaGUID?: string): Promise<number> {
    console.log("🟣 PendenciaService.contarAtrasadas()");

    // Se especificou escola, validar acesso
    if (escolaGUID) {
      const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
        EscolaGUID: escolaGUID,
        UsuarioCPF: usuarioCPF
      });
      if (!vinculos.some((v) => v.Status === "Ativo")) {
        throw new ErrorResponse(403, "Sem acesso a esta escola");
      }
    }

    return await this.#pendenciaDAO.contarAtrasadas(usuarioCPF, escolaGUID);
  }

  // ==================== HELPERS PRIVADOS ====================

  /**
   * Validar permissão para criar pendência (Coordenação, Secretaria ou Direção)
   */
  async #validarPermissaoCriar(cpf: string, escolaGUID: string): Promise<void> {
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: cpf
    });

    if (!vinculos.some((v) => v.Status === "Ativo")) {
      throw new ErrorResponse(403, "Usuário não está vinculado a esta escola");
    }

    // FuncaoId: 1=Coordenação, 2=Secretaria, 6=Direção — considera QUALQUER
    // vínculo ativo do usuário na escola, não só o primeiro retornado
    // (um usuário pode ter mais de uma função na mesma escola).
    if (!vinculos.some((v) => v.Status === "Ativo" && [1, 2, 6].includes(v.FuncaoId))) {
      throw new ErrorResponse(
        403,
        "Sem permissão para criar pendências (apenas Coordenação, Secretaria ou Direção)"
      );
    }
  }

  /**
   * Validar permissão de admin (Coordenação, Secretaria ou Direção)
   */
  async #validarPermissaoAdmin(cpf: string, escolaGUID: string): Promise<void> {
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: cpf
    });

    if (!vinculos.some((v) => v.Status === "Ativo")) {
      throw new ErrorResponse(403, "Usuário não está vinculado a esta escola");
    }

    if (!vinculos.some((v) => v.Status === "Ativo" && [1, 2, 6].includes(v.FuncaoId))) {
      throw new ErrorResponse(403, "Sem permissão (apenas Coordenação, Secretaria ou Direção)");
    }
  }

  /**
   * Validar acesso à pendência (destinatário ou admin)
   */
  async #validarAcesso(pendencia: Pendencia, cpf: string): Promise<void> {
    // Se é o destinatário, tem acesso
    if (pendencia.UsuarioCPF === cpf) {
      return;
    }

    // Se não é o destinatário, precisa ser admin da escola
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: pendencia.EscolaGUID,
      UsuarioCPF: cpf
    });

    if (!vinculos.some((v) => v.Status === "Ativo" && [1, 2, 6].includes(v.FuncaoId))) {
      throw new ErrorResponse(403, "Sem permissão para acessar esta pendência");
    }
  }

  /**
   * Converter Pendencia (classe) para PendenciaDTO (interface JSON)
   */
  #toDTO(pendencia: Pendencia): PendenciaDTO {
    return {
      PendenciaGUID: pendencia.PendenciaGUID,
      UsuarioCPF: pendencia.UsuarioCPF,
      EscolaGUID: pendencia.EscolaGUID,
      PendenciaTitulo: pendencia.PendenciaTitulo,
      PendenciaConteudo: pendencia.PendenciaConteudo,
      PendenciaPostagemData: pendencia.PendenciaPostagemData,
      PendenciaPrazoData: pendencia.PendenciaPrazoData,
      PendenciaFeito: pendencia.PendenciaFeito,
      PendenciaRealizacaoData: pendencia.PendenciaRealizacaoData,
      PendenciaCreatedAt: pendencia.PendenciaCreatedAt,
      PendenciaUpdatedAt: pendencia.PendenciaUpdatedAt
    };
  }
}
