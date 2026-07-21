import Curso from "../entities/curso.model";
import { CursoDAO, CursoFilters } from "../repositories/curso.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { v4 as uuidv4 } from "uuid";
import { getAuditoriaService } from "./auditoria.service";

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
 * Interfaces para cadastro em massa (batch)
 */
export interface BatchItemResult {
  item: CursoCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: CursoDTO;
  tipo?: 'criado' | 'duplicado' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  duplicados: number;
  erros: number;
  resultados: BatchItemResult[];
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

    void getAuditoriaService().registrar({
      EscolaGUID: cursoCriado.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Create",
      EntidadeTipo: "curso",
      EntidadeGUID: cursoCriado.CursoGUID,
      EntidadeDescricao: cursoCriado.CursoNome,
      CategoriaAuditoriaId: 2,
    });

    return this.toDTO(cursoCriado);
  }

  /**
   * Criar múltiplos cursos em massa (batch)
   * 
   * Processa array de cursos e retorna resultado detalhado:
   * - Cursos criados com sucesso
   * - Duplicados (já existem)
   * - Erros de validação
   * 
   * Validações:
   * 1. Usuário tem permissão
   * 2. Escola existe e é técnica
   * 3. Detecta duplicatas (por nome na escola)
   * 4. Continua processamento mesmo com erros individuais
   */
  async criarCursosEmMassa(
    cursos: CursoCreateDTO[],
    usuarioCPF: string
  ): Promise<BatchCreateResponse> {
    const resultados: BatchItemResult[] = [];
    let criados = 0;
    let duplicados = 0;
    let erros = 0;

    // Validações iniciais (primeira escola como referência)
    if (cursos.length === 0) {
      throw new ErrorResponse(400, 'Nenhum curso fornecido', {
        message: 'A lista de cursos está vazia',
      });
    }

    const escolaGUID = cursos[0].EscolaGUID;

    // Validar permissão uma única vez
    try {
      await this.validarPermissaoEscrita(usuarioCPF, escolaGUID);
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(500, 'Erro ao validar permissão');
    }

    // Validar escola
    const escola = await this.#escolaDAO.findById(escolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, 'Escola não encontrada', {
        message: `Não existe escola com id ${escolaGUID}`,
      });
    }

    // Validar que é escola técnica
    if (!escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, 'Cursos só podem ser criados em escolas técnicas', {
        message: 'Esta escola não está marcada como técnica',
      });
    }

    // Buscar todos os cursos existentes da escola para verificação rápida
    const cursosExistentes = await this.#cursoDAO.findAll({ EscolaGUID: escolaGUID });
    const nomesExistentes = new Set(
      cursosExistentes.map(c => c.CursoNome.trim().toLowerCase())
    );

    // Processar cada curso
    for (const cursoDados of cursos) {
      try {
        const nomeNormalizado = cursoDados.CursoNome.trim();
        const nomeComparacao = nomeNormalizado.toLowerCase();

        // Verificar duplicata
        if (nomesExistentes.has(nomeComparacao)) {
          duplicados++;
          resultados.push({
            item: cursoDados,
            sucesso: true,
            mensagem: `Curso "${nomeNormalizado}" já existe nesta escola`,
            tipo: 'duplicado',
          });
          continue;
        }

        // Criar curso
        const curso = new Curso();
        curso.CursoGUID = uuidv4();
        curso.EscolaGUID = escolaGUID;
        curso.CursoNome = nomeNormalizado;
        curso.CursoStatus = cursoDados.CursoStatus || 'Ativo';
        curso.CursoCreatedAt = new Date();
        curso.CursoUpdatedAt = new Date();

        curso.validar();

        const cursoCriado = await this.#cursoDAO.create(curso);

        void getAuditoriaService().registrar({
          EscolaGUID: escolaGUID,
          UsuarioCPFAtor: usuarioCPF,
          AcaoTipo: "Create",
          EntidadeTipo: "curso",
          EntidadeGUID: cursoCriado.CursoGUID,
          EntidadeDescricao: cursoCriado.CursoNome,
          CategoriaAuditoriaId: 2,
        });

        // Adicionar ao conjunto de nomes existentes para evitar duplicatas no mesmo batch
        nomesExistentes.add(nomeComparacao);

        criados++;
        resultados.push({
          item: cursoDados,
          sucesso: true,
          mensagem: `Curso "${nomeNormalizado}" criado com sucesso`,
          dados: this.toDTO(cursoCriado),
          tipo: 'criado',
        });

      } catch (error) {
        erros++;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        resultados.push({
          item: cursoDados,
          sucesso: false,
          mensagem: `Erro: ${mensagem}`,
          tipo: 'erro',
        });
      }
    }

    return {
      totalProcessados: cursos.length,
      criados,
      duplicados,
      erros,
      resultados,
    };
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

    void getAuditoriaService().registrar({
      EscolaGUID: cursoAtualizado.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Update",
      EntidadeTipo: "curso",
      EntidadeGUID: cursoGUID,
      EntidadeDescricao: cursoAtualizado.CursoNome,
      CategoriaAuditoriaId: 2,
    });

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

    void getAuditoriaService().registrar({
      EscolaGUID: curso.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Delete",
      EntidadeTipo: "curso",
      EntidadeGUID: cursoGUID,
      EntidadeDescricao: curso.CursoNome,
      CategoriaAuditoriaId: 2,
    });
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
