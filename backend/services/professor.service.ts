import MaterialProfessorTurma from "../entities/materiaxprofessorxturma.model";
import Usuario from "../entities/usuario.model";
import { MaterialProfessorTurmaDAO, AlocacaoFilters } from "../repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { v4 as uuidv4 } from "uuid";

/**
 * DTOs para transferência de dados
 */
export interface AlocacaoDTO {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  UsuarioCPF: string;
  AlocacaoStatus: 'Ativa' | 'Inativa';
  AlocacaoCreatedAt: Date;
  AlocacaoUpdatedAt: Date;
}

export interface AlocacaoCreateDTO {
  MateriaGUID: string;
  TurmaGUID: string;
  UsuarioCPF: string;
  AlocacaoStatus?: 'Ativa' | 'Inativa';
}

export interface AlocacaoUpdateDTO {
  AlocacaoStatus?: 'Ativa' | 'Inativa';
}

export interface ProfessorDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail: string;
  UsuarioDataNascimento: Date;
  UsuarioTelefone: string;
  UsuarioStatus: 'Ativo' | 'Inativo';
  UsuarioCreatedAt: Date;
  UsuarioUpdatedAt: Date;
}

/**
 * Service para lógica de negócio de Professor e Alocações
 * 
 * Conceitos:
 * - Professor = Usuário com FuncaoId=3 em escolaxusuarioxfuncao
 * - Alocação = Professor vinculado a uma matéria+turma
 * 
 * Regras principais:
 * - Professor deve estar ativo na escola (Status='Ativo')
 * - Matéria e Turma devem ser da mesma escola
 * - Não pode duplicar alocação (mesmo professor + matéria + turma)
 * - Autorização: Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
 */
export default class ProfessorService {
  #alocacaoDAO: MaterialProfessorTurmaDAO;
  #materiaDAO: MateriaDAO;
  #turmaDAO: TurmaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    alocacaoDAO: MaterialProfessorTurmaDAO,
    materiaDAO: MateriaDAO,
    turmaDAO: TurmaDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    this.#alocacaoDAO = alocacaoDAO;
    this.#materiaDAO = materiaDAO;
    this.#turmaDAO = turmaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * Listar professores de uma escola
   * 
   * Busca usuários com FuncaoId=3 (Professor) e Status='Ativo'
   */
  async listarProfessores(escolaGUID: string): Promise<{
    professores: ProfessorDTO[];
    total: number;
  }> {
    const professores = await this.#alocacaoDAO.findProfessoresByEscola(escolaGUID);

    return {
      professores: professores.map((p) => this.toProfessorDTO(p)),
      total: professores.length,
    };
  }

  /**
   * Buscar alocações de um professor em uma escola
   * 
   * Validações:
   * 1. Verificar se é professor na escola
   * 2. Buscar todas as alocações do professor
   * 3. Filtrar apenas as da escola especificada
   */
  async buscarAlocacoesProfessor(cpf: string, escolaGUID: string): Promise<{
    alocacoes: AlocacaoDTO[];
    total: number;
  }> {
    // 1. Verificar se é professor na escola
    const vinculo = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      cpf,
      escolaGUID,
      3 // FuncaoId Professor
    );

    if (!vinculo) {
      throw new ErrorResponse(404, 'Usuário não é professor nesta escola', {
        message: 'O CPF informado não está vinculado como professor nesta escola',
      });
    }

    if (vinculo.Status !== 'Ativo') {
      throw new ErrorResponse(403, 'Professor inativo', {
        message: 'O professor não está com status ativo nesta escola',
      });
    }

    // 2. Buscar todas as alocações do professor
    const todasAlocacoes = await this.#alocacaoDAO.findByProfessor(cpf);

    // 3. Filtrar apenas as da escola especificada
    const alocacoesFiltradas: MaterialProfessorTurma[] = [];

    for (const alocacao of todasAlocacoes) {
      const turma = await this.#turmaDAO.findById(alocacao.TurmaGUID);
      if (turma && turma.EscolaGUID === escolaGUID) {
        alocacoesFiltradas.push(alocacao);
      }
    }

    return {
      alocacoes: alocacoesFiltradas.map((a) => this.toAlocacaoDTO(a)),
      total: alocacoesFiltradas.length,
    };
  }

  /**
   * Criar alocação (vincular professor a matéria+turma)
   * 
   * Validações:
   * 1. Turma existe
   * 2. Permissão de quem está alocando (Coordenação ou Direção)
   * 3. Matéria existe
   * 4. Matéria e Turma são da mesma escola
   * 5. Usuário é professor ativo na escola
   * 6. Não existe duplicidade (mesmo professor + matéria + turma)
   */
  async criarAlocacao(data: AlocacaoCreateDTO, usuarioCPF: string): Promise<AlocacaoDTO> {
    // 1. Buscar turma
    const turma = await this.#turmaDAO.findById(data.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${data.TurmaGUID}`,
      });
    }

    // 2. Validar permissão de quem está alocando
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 3. Buscar matéria
    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, 'Matéria não encontrada', {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    // 4. Validar que matéria e turma são da mesma escola
    if (materia.EscolaGUID !== turma.EscolaGUID) {
      throw new ErrorResponse(400, 'Matéria e turma de escolas diferentes', {
        message: 'A matéria e a turma devem pertencer à mesma escola',
        materiaEscola: materia.EscolaGUID,
        turmaEscola: turma.EscolaGUID,
      });
    }

    // 5. Validar que usuário é professor ativo na escola
    const vinculo = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      data.UsuarioCPF,
      turma.EscolaGUID,
      3 // FuncaoId Professor
    );

    if (!vinculo) {
      throw new ErrorResponse(403, 'Usuário não é professor nesta escola', {
        message: 'O CPF informado não está vinculado como professor nesta escola',
      });
    }

    if (vinculo.Status !== 'Ativo') {
      throw new ErrorResponse(403, 'Professor inativo', {
        message: 'O professor não está com status ativo nesta escola',
      });
    }

    // 6. Validar duplicidade
    const existente = await this.#alocacaoDAO.findByMateriaTurmaProfessor(
      data.MateriaGUID,
      data.TurmaGUID,
      data.UsuarioCPF
    );

    if (existente) {
      throw new ErrorResponse(409, 'Alocação já existe', {
        message: 'Este professor já está alocado nesta matéria e turma',
        alocacaoExistente: {
          MatProfTurGUID: existente.MatProfTurGUID,
          AlocacaoStatus: existente.AlocacaoStatus,
        },
      });
    }

    // 7. Criar alocação
    const alocacao = new MaterialProfessorTurma();
    alocacao.MatProfTurGUID = uuidv4();
    alocacao.MateriaGUID = data.MateriaGUID;
    alocacao.TurmaGUID = data.TurmaGUID;
    alocacao.UsuarioCPF = data.UsuarioCPF;
    alocacao.AlocacaoStatus = data.AlocacaoStatus || 'Ativa';
    alocacao.AlocacaoCreatedAt = new Date();
    alocacao.AlocacaoUpdatedAt = new Date();

    alocacao.validar();

    const alocacaoCriada = await this.#alocacaoDAO.create(alocacao);

    return this.toAlocacaoDTO(alocacaoCriada);
  }

  /**
   * Listar alocações com filtros
   */
  async listarAlocacoes(filters?: AlocacaoFilters): Promise<{
    alocacoes: AlocacaoDTO[];
    total: number;
  }> {
    const alocacoes = await this.#alocacaoDAO.findAll(filters);

    return {
      alocacoes: alocacoes.map((a) => this.toAlocacaoDTO(a)),
      total: alocacoes.length,
    };
  }

  /**
   * Buscar alocação por GUID
   */
  async buscarAlocacao(guid: string): Promise<AlocacaoDTO> {
    const alocacao = await this.#alocacaoDAO.findById(guid);

    if (!alocacao) {
      throw new ErrorResponse(404, 'Alocação não encontrada', {
        message: `Não existe alocação com id ${guid}`,
      });
    }

    return this.toAlocacaoDTO(alocacao);
  }

  /**
   * Atualizar alocação (apenas status)
   */
  async atualizarAlocacao(
    guid: string,
    data: AlocacaoUpdateDTO,
    usuarioCPF: string
  ): Promise<AlocacaoDTO> {
    // 1. Buscar alocação
    const alocacaoExistente = await this.#alocacaoDAO.findById(guid);
    if (!alocacaoExistente) {
      throw new ErrorResponse(404, 'Alocação não encontrada', {
        message: `Não existe alocação com id ${guid}`,
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(alocacaoExistente.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 4. Atualizar
    const alocacaoAtualizada = await this.#alocacaoDAO.update(guid, data);

    if (!alocacaoAtualizada) {
      throw new ErrorResponse(500, 'Erro ao atualizar alocação', {
        message: 'Não foi possível atualizar a alocação',
      });
    }

    return this.toAlocacaoDTO(alocacaoAtualizada);
  }

  /**
   * Excluir alocação (soft delete -> status Inativa)
   */
  async excluirAlocacao(guid: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar alocação
    const alocacao = await this.#alocacaoDAO.findById(guid);
    if (!alocacao) {
      throw new ErrorResponse(404, 'Alocação não encontrada', {
        message: `Não existe alocação com id ${guid}`,
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(alocacao.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 4. Excluir (soft delete)
    const deletado = await this.#alocacaoDAO.delete(guid);

    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao excluir alocação', {
        message: 'Não foi possível excluir a alocação',
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
      message: 'Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar alocações de professores.',
    });
  }

  /**
   * Converte entidade MaterialProfessorTurma para DTO
   */
  private toAlocacaoDTO(alocacao: MaterialProfessorTurma): AlocacaoDTO {
    return {
      MatProfTurGUID: alocacao.MatProfTurGUID,
      MateriaGUID: alocacao.MateriaGUID,
      TurmaGUID: alocacao.TurmaGUID,
      UsuarioCPF: alocacao.UsuarioCPF,
      AlocacaoStatus: alocacao.AlocacaoStatus,
      AlocacaoCreatedAt: alocacao.AlocacaoCreatedAt,
      AlocacaoUpdatedAt: alocacao.AlocacaoUpdatedAt,
    };
  }

  /**
   * Converte entidade Usuario para ProfessorDTO
   */
  private toProfessorDTO(usuario: Usuario): ProfessorDTO {
    return {
      UsuarioCPF: usuario.UsuarioCPF,
      UsuarioNome: usuario.UsuarioNome,
      UsuarioEmail: usuario.UsuarioEmail,
      UsuarioDataNascimento: usuario.UsuarioDataNascimento,
      UsuarioTelefone: usuario.UsuarioTelefone,
      UsuarioStatus: usuario.UsuarioStatus,
      UsuarioCreatedAt: usuario.UsuarioCreatedAt,
      UsuarioUpdatedAt: usuario.UsuarioUpdatedAt,
    };
  }
}
