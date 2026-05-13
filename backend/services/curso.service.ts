import Curso from "../entities/curso.model";
import { CursoDAO, CursoFilters } from "../repositories/curso.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { v4 as uuidv4 } from "uuid";

/**
 * DTOs para transferência de dados
 */
export interface CursoDTO {
  CursoGUID: string;
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus: 'Ativo' | 'Inativo';
  CursoCreatedAt: Date;
  CursoUpdatedAt: Date;
}

export interface CursoCreateDTO {
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus?: 'Ativo' | 'Inativo';
}

export interface CursoUpdateDTO {
  CursoNome?: string;
  CursoStatus?: 'Ativo' | 'Inativo';
}

/**
 * Service para lógica de negócio de Curso
 * 
 * Regras principais:
 * - Cursos SÓ podem ser criados em escolas técnicas (EscolaIsTecnica = TRUE)
 * - CursoNome único por escola
 * - Autorização: Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
 * - Soft delete via status
 */
export default class CursoService {
  #cursoDAO: CursoDAO;
  #escolaDAO: EscolaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    cursoDAO: CursoDAO,
    escolaDAO: EscolaDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    this.#cursoDAO = cursoDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * Criar novo curso
   * 
   * Validações:
   * 1. Usuário tem permissão (Coordenação ou Direção)
   * 2. Escola existe
   * 3. Escola É TÉCNICA (regra principal)
   * 4. Nome único na escola
   */
  async criarCurso(data: CursoCreateDTO, usuarioCPF: string): Promise<CursoDTO> {
    // 1. Validar permissão de escrita
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 2. Validar que escola existe
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, 'Escola não encontrada', {
        message: `Não existe escola com id ${data.EscolaGUID}`,
      });
    }

    // 3. REGRA PRINCIPAL: Curso só em escola técnica
    if (!escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, 'Cursos só podem ser criados em escolas técnicas', {
        message: 'Esta escola não está marcada como técnica',
      });
    }

    // 4. Validar nome único na escola
    const cursoExistente = await this.#cursoDAO.findByEscolaAndNome(
      data.EscolaGUID,
      data.CursoNome.trim()
    );

    if (cursoExistente) {
      throw new ErrorResponse(409, 'Já existe um curso com esse nome nesta escola', {
        message: `O curso "${data.CursoNome}" já está cadastrado nesta escola`,
      });
    }

    // 5. Criar entidade
    const curso = new Curso();
    curso.CursoGUID = uuidv4();
    curso.EscolaGUID = data.EscolaGUID;
    curso.CursoNome = data.CursoNome.trim();
    curso.CursoStatus = data.CursoStatus || 'Ativo';
    curso.CursoCreatedAt = new Date();
    curso.CursoUpdatedAt = new Date();

    curso.validar();

    // 6. Persistir
    const cursoCriado = await this.#cursoDAO.create(curso);

    return this.toDTO(cursoCriado);
  }

  /**
   * Listar cursos com filtros
   */
  async listarCursos(filters?: CursoFilters): Promise<{
    cursos: CursoDTO[];
    total: number;
  }> {
    const cursos = await this.#cursoDAO.findAll(filters);
    
    return {
      cursos: cursos.map((curso) => this.toDTO(curso)),
      total: cursos.length,
    };
  }

  /**
   * Buscar curso por GUID
   */
  async buscarCurso(cursoGUID: string): Promise<CursoDTO> {
    const curso = await this.#cursoDAO.findById(cursoGUID);

    if (!curso) {
      throw new ErrorResponse(404, 'Curso não encontrado', {
        message: `Não existe curso com id ${cursoGUID}`,
      });
    }

    return this.toDTO(curso);
  }

  /**
   * Atualizar curso
   * 
   * Validações:
   * 1. Curso existe
   * 2. Usuário tem permissão
   * 3. Se alterar nome, validar unicidade
   */
  async atualizarCurso(
    cursoGUID: string,
    data: CursoUpdateDTO,
    usuarioCPF: string
  ): Promise<CursoDTO> {
    // 1. Buscar curso
    const cursoExistente = await this.#cursoDAO.findById(cursoGUID);
    if (!cursoExistente) {
      throw new ErrorResponse(404, 'Curso não encontrado', {
        message: `Não existe curso com id ${cursoGUID}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, cursoExistente.EscolaGUID);

    // 3. Se alterar nome, validar unicidade
    if (data.CursoNome && data.CursoNome.trim() !== cursoExistente.CursoNome) {
      const duplicado = await this.#cursoDAO.findByEscolaAndNome(
        cursoExistente.EscolaGUID,
        data.CursoNome.trim()
      );

      if (duplicado && duplicado.CursoGUID !== cursoGUID) {
        throw new ErrorResponse(409, 'Já existe um curso com esse nome nesta escola', {
          message: `O curso "${data.CursoNome}" já está cadastrado nesta escola`,
        });
      }
    }

    // 4. Atualizar
    const cursoAtualizado = await this.#cursoDAO.update(cursoGUID, data);

    if (!cursoAtualizado) {
      throw new ErrorResponse(500, 'Erro ao atualizar curso', {
        message: 'Não foi possível atualizar o curso',
      });
    }

    return this.toDTO(cursoAtualizado);
  }

  /**
   * Excluir curso (soft delete)
   */
  async excluirCurso(cursoGUID: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar curso
    const curso = await this.#cursoDAO.findById(cursoGUID);
    if (!curso) {
      throw new ErrorResponse(404, 'Curso não encontrado', {
        message: `Não existe curso com id ${cursoGUID}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, curso.EscolaGUID);

    // 3. Soft delete
    const deletado = await this.#cursoDAO.delete(cursoGUID);

    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao excluir curso', {
        message: 'Não foi possível excluir o curso',
      });
    }
  }

  /**
   * Valida se usuário tem permissão de escrita na escola
   * (FuncaoId 1 = Coordenação ou FuncaoId 6 = Direção)
   */
  private async validarPermissaoEscrita(
    usuarioCPF: string,
    escolaGUID: string
  ): Promise<void> {
    // Validar Coordenação (FuncaoId = 1)
    const coordenacao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioCPF,
      escolaGUID,
      1
    );

    if (coordenacao && coordenacao.Status === 'Ativo') {
      return; // Tem permissão
    }

    // Validar Direção (FuncaoId = 6)
    const direcao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioCPF,
      escolaGUID,
      6
    );

    if (direcao && direcao.Status === 'Ativo') {
      return; // Tem permissão
    }

    // Sem permissão
    throw new ErrorResponse(403, 'Sem permissão', {
      message: 'Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar cursos.',
    });
  }

  /**
   * Converte entidade Curso para DTO
   */
  private toDTO(curso: Curso): CursoDTO {
    return {
      CursoGUID: curso.CursoGUID,
      EscolaGUID: curso.EscolaGUID,
      CursoNome: curso.CursoNome,
      CursoStatus: curso.CursoStatus,
      CursoCreatedAt: curso.CursoCreatedAt,
      CursoUpdatedAt: curso.CursoUpdatedAt,
    };
  }
}
