import Turma from "../entities/turma.model";
import { TurmaDAO, TurmaFilters } from "../repositories/turma.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { CursoDAO } from "../repositories/curso.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { v4 as uuidv4 } from "uuid";
import ConversaGrupoService from "./conversa-grupo.service";

/**
 * DTOs para transferência de dados
 */
export interface TurmaDTO {
  TurmaGUID: string;
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID: string | null;
  TurmaStatus: 'Ativa' | 'Inativa' | 'Encerrada';
  TurmaCreatedAt: Date;
  TurmaUpdatedAt: Date;
}

export interface TurmaCreateDTO {
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID?: string | null;
  CursoNome?: string; // Para resolução nome → GUID
  TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
}

export interface TurmaUpdateDTO {
  TurmaSerie?: string;
  TurmaNome?: string;
  TurmaIsTecnico?: boolean;
  CursoGUID?: string | null;
  TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
}

/**
 * Interfaces para cadastro em massa (batch)
 */
export interface BatchItemResult {
  item: TurmaCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: TurmaDTO;
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
 * Service para lógica de negócio de Turma
 * 
 * Regras complexas:
 * - UNIQUE composto: (EscolaGUID, TurmaSerie, TurmaNome)
 * - TurmaIsTecnico requer EscolaIsTecnica = TRUE
 * - Escola não-técnica: forçar TurmaIsTecnico=false e CursoGUID=null
 * - CursoGUID: validar existência e pertencimento à escola
 * - Autorização: Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
 * - Soft delete via status
 */
export default class TurmaService {
  #turmaDAO: TurmaDAO;
  #escolaDAO: EscolaDAO;
  #cursoDAO: CursoDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #conversaGrupoService?: ConversaGrupoService;

  constructor(
    turmaDAO: TurmaDAO,
    escolaDAO: EscolaDAO,
    cursoDAO: CursoDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    conversaGrupoService?: ConversaGrupoService
  ) {
    this.#turmaDAO = turmaDAO;
    this.#escolaDAO = escolaDAO;
    this.#cursoDAO = cursoDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
    this.#conversaGrupoService = conversaGrupoService;
  }

  /**
   * Criar nova turma
   * 
   * Validações complexas:
   * 1. Usuário tem permissão (Coordenação ou Direção)
   * 2. Escola existe
   * 3. Turma técnica requer escola técnica
   * 4. Escola não-técnica: forçar TurmaIsTecnico=false e CursoGUID=null
   * 5. Se CursoGUID informado, validar existência e pertencimento
   * 6. Resolução CursoNome → CursoGUID (se fornecido)
   * 7. Validar duplicidade: série + nome único por escola
   */
  async criarTurma(data: TurmaCreateDTO, usuarioCPF: string): Promise<TurmaDTO> {
    // 1. Validar permissão de escrita
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 2. Validar que escola existe
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, 'Escola não encontrada', {
        message: `Não existe escola com id ${data.EscolaGUID}`,
      });
    }

    // 3. Validar turma técnica em escola não-técnica
    if (data.TurmaIsTecnico && !escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, 'Turma técnica só pode ser criada em escola técnica', {
        message: 'Esta escola não está marcada como técnica',
      });
    }

    // 4. Se escola não-técnica, forçar valores
    let turmaIsTecnico = data.TurmaIsTecnico;
    let cursoGUID = data.CursoGUID || null;

    if (!escola.EscolaIsTecnica) {
      turmaIsTecnico = false;
      cursoGUID = null;
    }

    // 5. Resolver CursoNome → CursoGUID se fornecido
    if (data.CursoNome && !cursoGUID) {
      const cursos = await this.#cursoDAO.findAll({ EscolaGUID: data.EscolaGUID });
      const curso = cursos.find(c => c.CursoNome.trim().toLowerCase() === data.CursoNome!.trim().toLowerCase());
      if (curso) {
        cursoGUID = curso.CursoGUID;
      }
    }

    // 6. Se informou curso, validar
    if (cursoGUID) {
      const curso = await this.#cursoDAO.findById(cursoGUID);
      if (!curso) {
        throw new ErrorResponse(404, 'Curso não encontrado', {
          message: `Não existe curso com id ${cursoGUID}`,
        });
      }

      if (curso.EscolaGUID !== data.EscolaGUID) {
        throw new ErrorResponse(400, 'Curso não pertence a esta escola', {
          message: 'O curso informado está cadastrado em outra escola',
        });
      }
    }

    // 6. Validar duplicidade (escola + série + nome)
    const existente = await this.#turmaDAO.findByEscolaSerieNome(
      data.EscolaGUID,
      data.TurmaSerie.trim(),
      data.TurmaNome.trim()
    );
    if (existente) {
      throw new ErrorResponse(409, 'Turma já existe com essa série e nome', {
        message: `A turma "${data.TurmaSerie} ${data.TurmaNome}" já está cadastrada nesta escola`,
      });
    }

    // 7. Criar entidade
    const turma = new Turma();
    turma.TurmaGUID = uuidv4();
    turma.EscolaGUID = data.EscolaGUID;
    turma.TurmaSerie = data.TurmaSerie.trim();
    turma.TurmaNome = data.TurmaNome.trim();
    turma.TurmaIsTecnico = turmaIsTecnico;
    turma.CursoGUID = cursoGUID;
    turma.TurmaStatus = data.TurmaStatus || 'Ativa';
    turma.TurmaCreatedAt = new Date();
    turma.TurmaUpdatedAt = new Date();

    turma.validar();

    // 8. Persistir
    const turmaCriada = await this.#turmaDAO.create(turma);

    // 9. Criar grupo de conversa para a turma (não bloqueia se falhar)
    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.criarGrupoTurma(
        turmaCriada.TurmaGUID,
        turmaCriada.TurmaNome
      );
    }

    return this.toDTO(turmaCriada);
  }

  /**
   * Criar múltiplas turmas em massa (batch)
   * 
   * Processa array de turmas e retorna resultado detalhado
   * Inclui resolução de nome de curso → GUID
   */
  async criarTurmasEmMassa(
    turmas: TurmaCreateDTO[],
    usuarioCPF: string
  ): Promise<BatchCreateResponse> {
    const resultados: BatchItemResult[] = [];
    let criados = 0;
    let duplicados = 0;
    let erros = 0;

    if (turmas.length === 0) {
      throw new ErrorResponse(400, 'Nenhuma turma fornecida', {
        message: 'A lista de turmas está vazia',
      });
    }

    const escolaGUID = turmas[0].EscolaGUID;

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

    // Buscar todas as turmas existentes para detecção de duplicatas
    const turmasExistentes = await this.#turmaDAO.findAll({ EscolaGUID: escolaGUID });
    const chavesExistentes = new Set(
      turmasExistentes.map(t => `${t.TurmaSerie.trim().toLowerCase()}|${t.TurmaNome.trim().toLowerCase()}`)
    );

    // Buscar todos os cursos da escola para resolução de nomes
    const cursosDaEscola = await this.#cursoDAO.findAll({ EscolaGUID: escolaGUID });
    const mapaCursosPorNome = new Map<string, string>(); // nome → GUID
    cursosDaEscola.forEach(curso => {
      mapaCursosPorNome.set(curso.CursoNome.trim().toLowerCase(), curso.CursoGUID);
    });

    // Processar cada turma
    for (const turmaDados of turmas) {
      try {
        const serieNormalizada = turmaDados.TurmaSerie.trim();
        const nomeNormalizado = turmaDados.TurmaNome.trim();
        const chave = `${serieNormalizada.toLowerCase()}|${nomeNormalizado.toLowerCase()}`;

        // Verificar duplicata
        if (chavesExistentes.has(chave)) {
          duplicados++;
          resultados.push({
            item: turmaDados,
            sucesso: true,
            mensagem: `Turma "${serieNormalizada} ${nomeNormalizado}" já existe nesta escola`,
            tipo: 'duplicado',
          });
          continue;
        }

        // Validar turma técnica em escola não-técnica
        if (turmaDados.TurmaIsTecnico && !escola.EscolaIsTecnica) {
          erros++;
          resultados.push({
            item: turmaDados,
            sucesso: false,
            mensagem: 'Turma técnica só pode ser criada em escola técnica',
            tipo: 'erro',
          });
          continue;
        }

        // Ajustar valores se escola não-técnica
        let turmaIsTecnico = turmaDados.TurmaIsTecnico;
        let cursoGUID = turmaDados.CursoGUID || null;

        if (!escola.EscolaIsTecnica) {
          turmaIsTecnico = false;
          cursoGUID = null;
        } else {
          // Resolver CursoNome → CursoGUID
          if (turmaDados.CursoNome && !cursoGUID) {
            const cursoNomeNormalizado = turmaDados.CursoNome.trim().toLowerCase();
            cursoGUID = mapaCursosPorNome.get(cursoNomeNormalizado) || null;
            
            if (!cursoGUID && turmaDados.CursoNome) {
              // Curso especificado mas não encontrado
              erros++;
              resultados.push({
                item: turmaDados,
                sucesso: false,
                mensagem: `Curso "${turmaDados.CursoNome}" não encontrado`,
                tipo: 'erro',
              });
              continue;
            }
          }
        }

        // Criar turma
        const turma = new Turma();
        turma.TurmaGUID = uuidv4();
        turma.EscolaGUID = escolaGUID;
        turma.TurmaSerie = serieNormalizada;
        turma.TurmaNome = nomeNormalizado;
        turma.TurmaIsTecnico = turmaIsTecnico;
        turma.CursoGUID = cursoGUID;
        turma.TurmaStatus = turmaDados.TurmaStatus || 'Ativa';
        turma.TurmaCreatedAt = new Date();
        turma.TurmaUpdatedAt = new Date();

        turma.validar();
        await this.#turmaDAO.create(turma);
        
        // Adicionar ao conjunto de chaves existentes
        chavesExistentes.add(chave);

        criados++;
        resultados.push({
          item: turmaDados,
          sucesso: true,
          mensagem: `Turma "${serieNormalizada} ${nomeNormalizado}" criada com sucesso`,
          dados: this.toDTO(turma),
          tipo: 'criado',
        });

      } catch (error) {
        erros++;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        resultados.push({
          item: turmaDados,
          sucesso: false,
          mensagem: `Erro: ${mensagem}`,
          tipo: 'erro',
        });
      }
    }

    return {
      totalProcessados: turmas.length,
      criados,
      duplicados,
      erros,
      resultados,
    };
  }

  /**
   * Listar turmas com filtros
   */
  async listarTurmas(filters?: TurmaFilters): Promise<{
    turmas: TurmaDTO[];
    total: number;
  }> {
    const turmas = await this.#turmaDAO.findAll(filters);
    
    return {
      turmas: turmas.map((turma) => this.toDTO(turma)),
      total: turmas.length,
    };
  }

  /**
   * Buscar turma por GUID
   */
  async buscarTurma(turmaGUID: string): Promise<TurmaDTO> {
    const turma = await this.#turmaDAO.findById(turmaGUID);

    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    return this.toDTO(turma);
  }

  /**
   * Atualizar turma
   * 
   * Validações:
   * 1. Turma existe
   * 2. Usuário tem permissão
   * 3. Se alterar série/nome, validar duplicidade
   * 4. Se alterar para técnica, validar escola técnica
   * 5. Se informar curso, validar existência e pertencimento
   */
  async atualizarTurma(
    turmaGUID: string,
    data: TurmaUpdateDTO,
    usuarioCPF: string
  ): Promise<TurmaDTO> {
    // 1. Buscar turma
    const turmaExistente = await this.#turmaDAO.findById(turmaGUID);
    if (!turmaExistente) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turmaExistente.EscolaGUID);

    // 3. Buscar escola para validações
    const escola = await this.#escolaDAO.findById(turmaExistente.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, 'Escola não encontrada', {
        message: 'Escola vinculada não existe',
      });
    }

    // 4. Se alterar para técnica, validar escola técnica
    if (data.TurmaIsTecnico !== undefined && data.TurmaIsTecnico && !escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, 'Turma técnica só em escola técnica', {
        message: 'Esta escola não está marcada como técnica',
      });
    }

    // 5. Se escola não-técnica, forçar valores
    if (!escola.EscolaIsTecnica && data.TurmaIsTecnico) {
      data.TurmaIsTecnico = false;
    }

    if (!escola.EscolaIsTecnica && data.CursoGUID) {
      data.CursoGUID = null;
    }

    // 6. Se informou curso, validar
    if (data.CursoGUID) {
      const curso = await this.#cursoDAO.findById(data.CursoGUID);
      if (!curso) {
        throw new ErrorResponse(404, 'Curso não encontrado', {
          message: `Não existe curso com id ${data.CursoGUID}`,
        });
      }

      if (curso.EscolaGUID !== turmaExistente.EscolaGUID) {
        throw new ErrorResponse(400, 'Curso não pertence a esta escola', {
          message: 'O curso informado está cadastrado em outra escola',
        });
      }
    }

    // 7. Se alterar série/nome, validar duplicidade
    const serieNova = data.TurmaSerie?.trim() || turmaExistente.TurmaSerie;
    const nomeNovo = data.TurmaNome?.trim() || turmaExistente.TurmaNome;

    if (serieNova !== turmaExistente.TurmaSerie || nomeNovo !== turmaExistente.TurmaNome) {
      const duplicado = await this.#turmaDAO.findByEscolaSerieNome(
        turmaExistente.EscolaGUID,
        serieNova,
        nomeNovo
      );

      if (duplicado && duplicado.TurmaGUID !== turmaGUID) {
        throw new ErrorResponse(409, 'Turma já existe com essa série e nome', {
          message: `A turma "${serieNova} ${nomeNovo}" já está cadastrada nesta escola`,
        });
      }
    }

    // 8. Atualizar
    const turmaAtualizada = await this.#turmaDAO.update(turmaGUID, data);

    if (!turmaAtualizada) {
      throw new ErrorResponse(500, 'Erro ao atualizar turma', {
        message: 'Não foi possível atualizar a turma',
      });
    }

    // 9. Hooks de chat
    if (this.#conversaGrupoService) {
      const nomeAnterior = turmaExistente.TurmaNome;
      const nomeAtual = turmaAtualizada.TurmaNome;
      if (nomeAtual !== nomeAnterior) {
        await this.#conversaGrupoService.sincronizarNomeGrupoTurma(turmaGUID, nomeAtual);
      }
      const statusAtual = turmaAtualizada.TurmaStatus;
      if (statusAtual === 'Inativa' || statusAtual === 'Encerrada') {
        await this.#conversaGrupoService.encerrarGrupoTurma(turmaGUID);
      }
    }

    return this.toDTO(turmaAtualizada);
  }

  /**
   * Excluir turma (soft delete)
   */
  async excluirTurma(turmaGUID: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar turma
    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 3. Soft delete
    const deletado = await this.#turmaDAO.delete(turmaGUID);

    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao excluir turma', {
        message: 'Não foi possível excluir a turma',
      });
    }

    // 4. Encerrar grupo de conversa da turma
    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.encerrarGrupoTurma(turmaGUID);
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
      message: 'Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar turmas.',
    });
  }

  /**
   * Converte entidade Turma para DTO
   */
  private toDTO(turma: Turma): TurmaDTO {
    return {
      TurmaGUID: turma.TurmaGUID,
      EscolaGUID: turma.EscolaGUID,
      TurmaSerie: turma.TurmaSerie,
      TurmaNome: turma.TurmaNome,
      TurmaIsTecnico: turma.TurmaIsTecnico,
      CursoGUID: turma.CursoGUID,
      TurmaStatus: turma.TurmaStatus,
      TurmaCreatedAt: turma.TurmaCreatedAt,
      TurmaUpdatedAt: turma.TurmaUpdatedAt,
    };
  }
}
