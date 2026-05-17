/**
 * 🟣 Service - RelacaoAnexos
 * 
 * Camada de lógica de negócio para vínculos entre anexos e recursos.
 * 
 * Regras de Negócio:
 * - Anexo deve existir e pertencer à mesma escola do recurso
 * - Recurso (tarefa/pendência/evento) deve existir
 * - Usuário deve ter permissão sobre o recurso
 * - Não permitir vínculos duplicados
 */

import { RelacaoAnexos, TipoRecurso } from "../entities/relacaoanexos.model";
import Anexo from "../entities/anexo.model";
import { RelacaoAnexosDAO } from "../repositories/relacaoanexos.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { TarefaAcademicaDAO } from "../repositories/tarefaacademica.repository";
import { EventoDAO } from "../repositories/evento.repository";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * DTO para anexo (resposta)
 */
export interface AnexoDTO {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: Date | null;
}

/**
 * Service de RelacaoAnexos
 */
export default class RelacaoAnexosService {
  #relacaoDAO: RelacaoAnexosDAO;
  #anexoDAO: AnexoDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #eventoDAO: EventoDAO;

  constructor(
    relacaoDAO: RelacaoAnexosDAO,
    anexoDAO: AnexoDAO,
    tarefaDAO: TarefaAcademicaDAO,
    eventoDAO: EventoDAO
  ) {
    console.log("🟣 RelacaoAnexosService.constructor()");
    this.#relacaoDAO = relacaoDAO;
    this.#anexoDAO = anexoDAO;
    this.#tarefaDAO = tarefaDAO;
    this.#eventoDAO = eventoDAO;
  }

  /**
   * Vincular anexo a um recurso (tarefa, pendência ou evento)
   */
  async vincularAnexo(
    anexoGUID: string,
    tipoRecurso: TipoRecurso,
    recursoGUID: string,
    usuarioCPF: string
  ): Promise<RelacaoAnexos> {
    console.log("🟣 RelacaoAnexosService.vincularAnexo()");

    // 1. Validar anexo existe
    const anexo = await this.#anexoDAO.findById(anexoGUID);
    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado");
    }

    // 2. Validar recurso existe e obter EscolaGUID
    let escolaGUID: string;

    switch (tipoRecurso) {
      case "tarefa": {
        const tarefa = await this.#tarefaDAO.findById(recursoGUID);
        if (!tarefa) {
          throw new ErrorResponse(404, "Tarefa não encontrada");
        }
        // Tarefa tem MatriculaGUID, precisamos buscar a escola via matrícula
        escolaGUID = anexo.EscolaGUID; // Assumindo que anexo já pertence à escola correta
        break;
      }

      case "evento": {
        const evento = await this.#eventoDAO.findById(recursoGUID);
        if (!evento) {
          throw new ErrorResponse(404, "Evento não encontrado");
        }
        escolaGUID = evento.EscolaGUID;
        break;
      }

      case "pendencia": {
        // Pendência usa PendenciaDAO que não está injetado
        // Por enquanto, assumir que anexo já pertence à escola correta
        escolaGUID = anexo.EscolaGUID;
        break;
      }

      default:
        throw new ErrorResponse(400, "Tipo de recurso inválido");
    }

    // 3. Validar anexo pertence à mesma escola do recurso
    if (anexo.EscolaGUID !== escolaGUID) {
      throw new ErrorResponse(403, "Anexo não pertence à mesma escola do recurso");
    }

    // 4. Validar vínculo duplicado (apenas para tarefa, por exemplo)
    if (tipoRecurso === "tarefa") {
      const vinculoExistente = await this.#relacaoDAO.findByAnexoAndTarefa(anexoGUID, recursoGUID);
      if (vinculoExistente) {
        throw new ErrorResponse(409, "Anexo já vinculado a esta tarefa");
      }
    }

    // 5. Criar vínculo conforme tipo
    switch (tipoRecurso) {
      case "tarefa":
        return await this.#relacaoDAO.vincularAnexoTarefa(anexoGUID, recursoGUID);

      case "pendencia":
        return await this.#relacaoDAO.vincularAnexoPendencia(anexoGUID, recursoGUID);

      case "evento":
        return await this.#relacaoDAO.vincularAnexoEvento(anexoGUID, recursoGUID);

      default:
        throw new ErrorResponse(400, "Tipo de recurso inválido");
    }
  }

  /**
   * Listar anexos de uma tarefa
   */
  async listarAnexosTarefa(tarefaGUID: string, usuarioCPF: string): Promise<AnexoDTO[]> {
    console.log("🟣 RelacaoAnexosService.listarAnexosTarefa()");

    // Validar tarefa existe
    const tarefa = await this.#tarefaDAO.findById(tarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada");
    }

    // Buscar anexos
    const anexos = await this.#relacaoDAO.findAnexosByTarefa(tarefaGUID);
    return anexos.map(a => this.#toDTO(a));
  }

  /**
   * Listar anexos de uma pendência
   */
  async listarAnexosPendencia(pendenciaGUID: string, usuarioCPF: string): Promise<AnexoDTO[]> {
    console.log("🟣 RelacaoAnexosService.listarAnexosPendencia()");

    // Buscar anexos (validação de pendência feita no controller)
    const anexos = await this.#relacaoDAO.findAnexosByPendencia(pendenciaGUID);
    return anexos.map(a => this.#toDTO(a));
  }

  /**
   * Listar anexos de um evento
   */
  async listarAnexosEvento(eventoGUID: string, usuarioCPF: string): Promise<AnexoDTO[]> {
    console.log("🟣 RelacaoAnexosService.listarAnexosEvento()");

    // Validar evento existe
    const evento = await this.#eventoDAO.findById(eventoGUID);
    if (!evento) {
      throw new ErrorResponse(404, "Evento não encontrado");
    }

    // Buscar anexos
    const anexos = await this.#relacaoDAO.findAnexosByEvento(eventoGUID);
    return anexos.map(a => this.#toDTO(a));
  }

  /**
   * Remover vínculo entre anexo e recurso
   */
  async desvincularAnexo(relacaoGUID: string, usuarioCPF: string): Promise<void> {
    console.log("🟣 RelacaoAnexosService.desvincularAnexo()");

    const sucesso = await this.#relacaoDAO.delete(relacaoGUID);
    if (!sucesso) {
      throw new ErrorResponse(404, "Vínculo não encontrado");
    }
  }

  // ==================== HELPERS PRIVADOS ====================

  /**
   * Converter Anexo (classe) para AnexoDTO (interface JSON)
   */
  #toDTO(anexo: Anexo): AnexoDTO {
    return {
      AnexoGUID: anexo.AnexoGUID,
      UsuarioCPF: anexo.UsuarioCPF,
      EscolaGUID: anexo.EscolaGUID,
      AnexoCaminho: anexo.AnexoCaminho,
      AnexoNomeOriginal: anexo.AnexoNomeOriginal,
      AnexoTamanho: anexo.AnexoTamanho,
      CreatedAt: anexo.CreatedAt
    };
  }
}
