/**
 * 🗂️ Service - Auditoria
 *
 * Ponto único de entrada pra registrar auditoria no sistema. Chamado no
 * fim dos métodos de escrita já existentes de cada *.service.ts (ver
 * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 4, regra 1) —
 * mesmo padrão de NotificacaoService.disparar().
 *
 * registrar() nunca lança erro: uma falha aqui (banco fora do ar, etc.)
 * nunca pode derrubar a operação de negócio que originou o registro.
 */

import { v4 as uuidv4 } from "uuid";
import MysqlDatabase from "../database/MysqlDatabase";
import { RegistroAuditoriaDAO, RegistroAuditoriaFilters } from "../repositories/registroauditoria.repository";
import { CategoriaAuditoriaDAO } from "../repositories/categoriaauditoria.repository";
import RegistroAuditoria, { AcaoAuditoriaTipo } from "../entities/registroauditoria.model";
import CategoriaAuditoria from "../entities/categoriaauditoria.model";
import ErrorResponse from "../utils/ErrorResponse";

export interface RegistroAuditoriaCreateDTO {
  EscolaGUID: string;
  UsuarioCPFAtor: string;
  AcaoTipo: AcaoAuditoriaTipo;
  EntidadeTipo: string;
  EntidadeGUID: string;
  EntidadeDescricao?: string | null;
  CategoriaAuditoriaId: number;
}

export interface ListarAuditoriaFilters {
  UsuarioCPFAtor?: string;
  AcaoTipo?: AcaoAuditoriaTipo;
  EntidadeTipo?: string;
  CategoriaAuditoriaId?: number;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}

export default class AuditoriaService {
  #registroDAO: RegistroAuditoriaDAO;
  #categoriaDAO: CategoriaAuditoriaDAO;

  constructor(registroDAO: RegistroAuditoriaDAO, categoriaDAO: CategoriaAuditoriaDAO) {
    console.log("🗂️ AuditoriaService.constructor()");
    this.#registroDAO = registroDAO;
    this.#categoriaDAO = categoriaDAO;
  }

  /**
   * Registra um fato de auditoria. Nunca lança — falha aqui é logada e
   * engolida, igual NotificacaoService.disparar() (mesma garantia:
   * auditoria não pode derrubar a operação principal do caller).
   */
  async registrar(input: RegistroAuditoriaCreateDTO): Promise<void> {
    console.log(`🗂️ AuditoriaService.registrar() - entidade=${input.EntidadeTipo} acao=${input.AcaoTipo}`);

    try {
      const registro = new RegistroAuditoria();
      registro.RegistroAuditoriaGUID = uuidv4();
      registro.EscolaGUID = input.EscolaGUID;
      registro.UsuarioCPFAtor = input.UsuarioCPFAtor;
      registro.AcaoTipo = input.AcaoTipo;
      registro.EntidadeTipo = input.EntidadeTipo;
      registro.EntidadeGUID = input.EntidadeGUID;
      registro.EntidadeDescricao = input.EntidadeDescricao ?? null;
      registro.CategoriaAuditoriaId = input.CategoriaAuditoriaId;
      registro.CreatedAt = new Date();

      await this.#registroDAO.create(registro);
    } catch (error) {
      console.error("🔴 AuditoriaService.registrar() falhou (não propagado):", error);
    }
  }

  async listar(escolaGUID: string, filters: ListarAuditoriaFilters = {}): Promise<RegistroAuditoria[]> {
    console.log("🗂️ AuditoriaService.listar()");

    const filtrosCompletos: RegistroAuditoriaFilters = {
      EscolaGUID: escolaGUID,
      ...filters,
    };

    return this.#registroDAO.findAll(filtrosCompletos);
  }

  /** Lança 404 tanto se o registro não existir quanto se pertencer a outra escola (não vaza dado entre escolas). */
  async buscarPorId(guid: string, escolaGUID: string): Promise<RegistroAuditoria> {
    console.log("🗂️ AuditoriaService.buscarPorId()");

    const registro = await this.#registroDAO.findById(guid);
    if (!registro || registro.EscolaGUID !== escolaGUID) {
      throw new ErrorResponse(404, "Registro de auditoria não encontrado", {
        message: `Não existe registro de auditoria com guid ${guid} para esta escola`,
      });
    }

    return registro;
  }

  async listarCategorias(): Promise<CategoriaAuditoria[]> {
    console.log("🗂️ AuditoriaService.listarCategorias()");
    return this.#categoriaDAO.findAll();
  }
}

/**
 * Singleton leve pra uso a partir de outros services (hooks de registro).
 *
 * Auditoria é uma dependência transversal — praticamente todo service de
 * escrita (matrícula, turma, usuário/função, pendência, evento, conteúdo,
 * tarefa, prova, anotação, grupo, projeto, matéria, curso, horário...)
 * precisa dela só pra chamar `registrar()` no final de um método já
 * existente. Forçar a mesma injeção manual em cada um desses services e em
 * cada routes factory infla a plumbing sem trazer benefício (não há estado
 * por-request aqui, só DAOs sobre o mesmo pool MySQL compartilhado). Por
 * isso, hooks devem importar `getAuditoriaService()` em vez de receber o
 * service via construtor — mesmo padrão de `getNotificacaoService()`.
 */
let instanciaSingleton: AuditoriaService | null = null;

export function getAuditoriaService(): AuditoriaService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new AuditoriaService(
      new RegistroAuditoriaDAO(database),
      new CategoriaAuditoriaDAO(database)
    );
  }
  return instanciaSingleton;
}
