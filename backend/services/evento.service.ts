/**
 * 🟣 Service - Evento
 * 
 * Camada de lógica de negócio para Eventos escolares.
 * 
 * Regras de Negócio:
 * - Criar evento: apenas Coordenação, Direção ou Secretaria
 * - Data do evento deve ser futura
 * - Todos os usuários vinculados à escola podem visualizar eventos
 * - Atualizar/Deletar: apenas Coordenação, Direção ou Secretaria
 * - Delete é soft delete (marca como Cancelado)
 */

import { v4 as uuidv4 } from "uuid";
import Evento from "../entities/evento.model";
import { EventoDAO, EventoFilters } from "../repositories/evento.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * DTOs
 */
export interface EventoDTO {
  EventoGUID: string;
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao: string | null;
  EventoData: Date;
  EventoStatus: "Agendado" | "Realizado" | "Cancelado";
  EventoCreatedAt: Date;
  EventoUpdatedAt: Date;
}

export interface EventoCreateDTO {
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao?: string;
  EventoData: string | Date;
}

export interface EventoUpdateDTO {
  EventoTitulo?: string;
  EventoDescricao?: string;
  EventoData?: string | Date;
  EventoStatus?: "Agendado" | "Realizado" | "Cancelado";
}

/**
 * Service de Evento
 */
export default class EventoService {
  #eventoDAO: EventoDAO;
  #escolaDAO: EscolaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    eventoDAO: EventoDAO,
    escolaDAO: EscolaDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("🟣 EventoService.constructor()");
    this.#eventoDAO = eventoDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * CREATE - Criar novo evento
   * Apenas Coordenação (1), Secretaria (2) ou Direção (6)
   */
  async store(data: EventoCreateDTO, usuarioCPF: string): Promise<EventoDTO> {
    console.log("🟣 EventoService.store()");

    // 1. Validar permissão de criação (Coordenação, Secretaria ou Direção)
    await this.#validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 2. Validar escola existe
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada");
    }

    // 3. Validar data futura
    const eventoData = new Date(data.EventoData);
    if (eventoData <= new Date()) {
      throw new ErrorResponse(400, "Data do evento deve ser futura");
    }

    // 4. Criar entidade Evento
    const evento = Evento.fromPlainObject({
      EventoGUID: uuidv4(),
      EscolaGUID: data.EscolaGUID,
      EventoTitulo: data.EventoTitulo.trim(),
      EventoDescricao: data.EventoDescricao?.trim() || null,
      EventoData: eventoData,
      EventoStatus: "Agendado",
      EventoCreatedAt: new Date(),
      EventoUpdatedAt: new Date()
    });

    // 5. Validar entidade
    evento.validar();

    // 6. Salvar no banco
    const created = await this.#eventoDAO.create(evento);

    return this.#toDTO(created);
  }

  /**
   * INDEX - Listar eventos com filtros
   * Todos os usuários da escola podem visualizar
   */
  async index(filters: EventoFilters, usuarioCPF: string): Promise<EventoDTO[]> {
    console.log("🟣 EventoService.index()");

    // Se filtro de escola foi fornecido, validar acesso
    if (filters.EscolaGUID) {
      const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
        EscolaGUID: filters.EscolaGUID,
        UsuarioCPF: usuarioCPF
      });

      if (vinculos.length === 0 || vinculos[0].Status !== "Ativo") {
        throw new ErrorResponse(403, "Usuário não vinculado a esta escola");
      }
    }

    const eventos = await this.#eventoDAO.findAll(filters);
    return eventos.map(e => this.#toDTO(e));
  }

  /**
   * SHOW - Buscar evento por ID
   */
  async show(guid: string, usuarioCPF: string): Promise<EventoDTO> {
    console.log("🟣 EventoService.show()");

    const evento = await this.#eventoDAO.findById(guid);

    if (!evento) {
      throw new ErrorResponse(404, "Evento não encontrado");
    }

    // Validar usuário está na escola do evento
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: evento.EscolaGUID,
      UsuarioCPF: usuarioCPF
    });

    if (vinculos.length === 0 || vinculos[0].Status !== "Ativo") {
      throw new ErrorResponse(403, "Sem permissão para visualizar este evento");
    }

    return this.#toDTO(evento);
  }

  /**
   * UPDATE - Atualizar evento
   * Apenas Coordenação, Secretaria ou Direção
   */
  async update(guid: string, data: EventoUpdateDTO, usuarioCPF: string): Promise<EventoDTO> {
    console.log("🟣 EventoService.update()");

    // 1. Buscar evento
    const evento = await this.#eventoDAO.findById(guid);
    if (!evento) {
      throw new ErrorResponse(404, "Evento não encontrado");
    }

    // 2. Validar permissão (apenas admin)
    await this.#validarPermissaoEscrita(usuarioCPF, evento.EscolaGUID);

    // 3. Validar dados
    const updateData: Partial<Evento> = {};

    if (data.EventoTitulo) {
      if (data.EventoTitulo.trim().length < 3) {
        throw new ErrorResponse(400, "Título deve ter no mínimo 3 caracteres");
      }
      updateData.EventoTitulo = data.EventoTitulo.trim();
    }

    if (data.EventoDescricao !== undefined) {
      updateData.EventoDescricao = data.EventoDescricao?.trim() || null;
    }

    if (data.EventoData) {
      const novaData = new Date(data.EventoData);
      if (novaData <= new Date()) {
        throw new ErrorResponse(400, "Data do evento deve ser futura");
      }
      updateData.EventoData = novaData;
    }

    if (data.EventoStatus) {
      updateData.EventoStatus = data.EventoStatus;
    }

    // 4. Atualizar no banco
    const updated = await this.#eventoDAO.update(guid, updateData);

    return this.#toDTO(updated);
  }

  /**
   * DESTROY - Excluir evento (soft delete)
   * Apenas Coordenação, Secretaria ou Direção
   */
  async destroy(guid: string, usuarioCPF: string): Promise<void> {
    console.log("🟣 EventoService.destroy()");

    // 1. Buscar evento
    const evento = await this.#eventoDAO.findById(guid);
    if (!evento) {
      throw new ErrorResponse(404, "Evento não encontrado");
    }

    // 2. Validar permissão (apenas admin)
    await this.#validarPermissaoEscrita(usuarioCPF, evento.EscolaGUID);

    // 3. Deletar (soft delete)
    await this.#eventoDAO.delete(guid);
  }

  // ==================== HELPERS PRIVADOS ====================

  /**
   * Validar permissão de escrita (Coordenação, Secretaria ou Direção)
   */
  async #validarPermissaoEscrita(cpf: string, escolaGUID: string): Promise<void> {
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: cpf
    });

    if (vinculos.length === 0 || vinculos[0].Status !== "Ativo") {
      throw new ErrorResponse(403, "Usuário não está vinculado a esta escola");
    }

    // FuncaoId: 1=Coordenação, 2=Secretaria, 6=Direção
    if (![1, 2, 6].includes(vinculos[0].FuncaoId)) {
      throw new ErrorResponse(
        403,
        "Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos"
      );
    }
  }

  /**
   * Converter Evento (classe) para EventoDTO (interface JSON)
   */
  #toDTO(evento: Evento): EventoDTO {
    return {
      EventoGUID: evento.EventoGUID,
      EscolaGUID: evento.EscolaGUID,
      EventoTitulo: evento.EventoTitulo,
      EventoDescricao: evento.EventoDescricao,
      EventoData: evento.EventoData,
      EventoStatus: evento.EventoStatus,
      EventoCreatedAt: evento.EventoCreatedAt,
      EventoUpdatedAt: evento.EventoUpdatedAt
    };
  }
}
