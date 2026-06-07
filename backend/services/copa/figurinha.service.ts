/**
 * Service: Figurinhas
 * Lógica de negócio para gerenciamento de figurinhas
 */

import { FigurinhaRepository } from "../../repositories/copa/figurinha.repository";
import { CopaFigurinha, TipoFigurinha } from "../../entities/copa/CopaFigurinha";

export class FigurinhaService {
  private repository: FigurinhaRepository;

  constructor() {
    this.repository = new FigurinhaRepository();
  }

  /**
   * Buscar todas as figurinhas
   */
  async buscarTodas(): Promise<CopaFigurinha[]> {
    return await this.repository.buscarTodas();
  }

  /**
   * Buscar figurinha por código
   */
  async buscarPorCodigo(codigo: string): Promise<CopaFigurinha | null> {
    if (!codigo || codigo.trim() === "") {
      throw new Error("Código da figurinha é obrigatório");
    }
    return await this.repository.buscarPorCodigo(codigo);
  }

  /**
   * Buscar figurinhas por prefixo
   */
  async buscarPorPrefixo(prefixo: string): Promise<CopaFigurinha[]> {
    if (!prefixo || prefixo.trim() === "") {
      throw new Error("Prefixo é obrigatório");
    }
    return await this.repository.buscarPorPrefixo(prefixo);
  }

  /**
   * Buscar figurinhas por tipo
   */
  async buscarPorTipo(tipo: TipoFigurinha): Promise<CopaFigurinha[]> {
    return await this.repository.buscarPorTipo(tipo);
  }

  /**
   * Buscar figurinhas por grupo
   */
  async buscarPorGrupo(grupo: string): Promise<CopaFigurinha[]> {
    return await this.repository.buscarPorGrupo(grupo);
  }

  /**
   * Buscar com filtros
   */
  async buscar(filtros: {
    tipo?: string;
    prefixo?: string;
    codigo?: string;
    numero?: string;
    grupo?: string;
  }): Promise<CopaFigurinha[]> {
    const tipoValido =
      filtros.tipo && this.isValidTipo(filtros.tipo)
        ? (filtros.tipo.toUpperCase() as TipoFigurinha)
        : undefined;

    return await this.repository.buscarComFiltros({
      tipo: tipoValido,
      prefixo: filtros.prefixo,
      codigo: filtros.codigo,
      numero: filtros.numero,
      grupo: filtros.grupo,
    });
  }

  /**
   * Validar tipo de figurinha
   */
  private isValidTipo(tipo: string): boolean {
    return ["FWC", "SELECAO", "COCACOLA"].includes(tipo.toUpperCase());
  }

  /**
   * Obter todos os prefixos únicos
   */
  async obterPrefixosUnicos(): Promise<string[]> {
    const figurinhas = await this.buscarTodas();
    const prefixos = new Set(figurinhas.map((f) => f.prefixo));
    return Array.from(prefixos).sort();
  }

  /**
   * Obter todos os grupos únicos
   */
  async obterGruposUnicos(): Promise<string[]> {
    const figurinhas = await this.buscarTodas();
    const grupos = new Set(
      figurinhas.filter((f) => f.grupo !== null).map((f) => f.grupo as string)
    );
    return Array.from(grupos).sort();
  }
}
