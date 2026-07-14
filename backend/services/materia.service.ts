import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import Materia from "../entities/materia.model";
import { MateriaDAO, MateriaFilters } from "../repositories/materia.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { CursoDAO } from "../repositories/curso.repository";

export interface MateriaDTO {
  MateriaGUID: string;
  EscolaGUID: string;
  CursoGUID: string | null;
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaAulasPorSemanaPadrao: number | null;
  MateriaStatus: "Ativa" | "Inativa";
  MateriaCreatedAt: string;
  MateriaUpdatedAt: string;
}

export interface MateriaCreateDTO {
  EscolaGUID: string;
  CursoGUID?: string | null;
  CursoNome?: string; // Para resolução nome → GUID
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaAulasPorSemanaPadrao?: number | null;
  MateriaStatus?: "Ativa" | "Inativa";
}

export interface MateriaUpdateDTO {
  MateriaNome?: string;
  MateriaIsTecnica?: boolean;
  MateriaAulasPorSemanaPadrao?: number | null;
  MateriaStatus?: "Ativa" | "Inativa";
  CursoGUID?: string | null;
}

/**
 * Interfaces para cadastro em massa (batch)
 */
export interface BatchItemResult {
  item: MateriaCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: MateriaDTO;
  tipo?: 'criado' | 'duplicado' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  duplicados: number;
  erros: number;
  resultados: BatchItemResult[];
}

export default class MateriaService {
  #materiaDAO: MateriaDAO;
  #escolaDAO: EscolaDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #cursoDAO: CursoDAO;

  constructor(
    materiaDAO: MateriaDAO,
    escolaDAO: EscolaDAO,
    escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    cursoDAO: CursoDAO
  ) {
    console.log("⬆️  MateriaService.constructor()");
    this.#materiaDAO = materiaDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAO;
    this.#cursoDAO = cursoDAO;
  }

  criarMateria = async (
    data: MateriaCreateDTO,
    usuarioCPF: string
  ): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.criarMateria()");

    // 1. Validar existência da escola
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${data.EscolaGUID}`,
      });
    }

    // 2. Validar permissão (Coordenação ou Direção)
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 3. Resolver CursoNome → CursoGUID se fornecido
    let cursoGUID = data.CursoGUID || null;
    if (data.CursoNome && !cursoGUID) {
      const curso = await this.#cursoDAO.findByEscolaAndNome(data.EscolaGUID, data.CursoNome.trim());
      if (curso) {
        cursoGUID = curso.CursoGUID;
      }
    }

    // 4. Validar se matéria técnica requer escola técnica
    if (data.MateriaIsTecnica && !escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, "Matéria técnica só pode ser criada em escola técnica", {
        message:
          "Esta escola não está marcada como técnica. Para criar matérias técnicas, atualize a configuração da escola.",
      });
    }

    // 5. Validar duplicidade de nome
    const existente = await this.#materiaDAO.findByEscolaAndNome(
      data.EscolaGUID,
      data.MateriaNome.trim()
    );
    if (existente) {
      throw new ErrorResponse(409, "Já existe matéria com este nome nesta escola", {
        message: `A matéria "${data.MateriaNome}" já está cadastrada nesta escola`,
      });
    }

    // 6. Gerar GUID e criar
    const materia = new Materia();
    materia.MateriaGUID = uuidv4();
    materia.EscolaGUID = data.EscolaGUID;
    materia.CursoGUID = cursoGUID;
    materia.MateriaNome = data.MateriaNome.trim();
    materia.MateriaIsTecnica = data.MateriaIsTecnica;
    materia.MateriaAulasPorSemanaPadrao = data.MateriaAulasPorSemanaPadrao ?? null;
    materia.MateriaStatus = data.MateriaStatus || "Ativa";
    materia.MateriaCreatedAt = new Date();
    materia.MateriaUpdatedAt = new Date();

    await this.#materiaDAO.create(materia);

    return this.toDTO(materia);
  };

  /**
   * Criar múltiplas matérias em massa (batch)
   * 
   * Processa array de matérias e retorna resultado detalhado
   * Inclui resolução de nome de curso → GUID
   */
  criarMateriasEmMassa = async (
    materias: MateriaCreateDTO[],
    usuarioCPF: string
  ): Promise<BatchCreateResponse> => {
    const resultados: BatchItemResult[] = [];
    let criados = 0;
    let duplicados = 0;
    let erros = 0;

    if (materias.length === 0) {
      throw new ErrorResponse(400, 'Nenhuma matéria fornecida', {
        message: 'A lista de matérias está vazia',
      });
    }

    const escolaGUID = materias[0].EscolaGUID;

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

    // Buscar todas as matérias existentes para detecção de duplicatas
    const materiasExistentes = await this.#materiaDAO.findAll({ EscolaGUID: escolaGUID });
    const nomesExistentes = new Set(
      materiasExistentes.map(m => m.MateriaNome?.trim().toLowerCase()).filter(Boolean)
    );

    // Buscar todos os cursos da escola para resolução de nomes
    const cursosDaEscola = await this.#cursoDAO.findAll({ EscolaGUID: escolaGUID });
    const mapaCursosPorNome = new Map<string, string>(); // nome → GUID
    cursosDaEscola.forEach(curso => {
      mapaCursosPorNome.set(curso.CursoNome.trim().toLowerCase(), curso.CursoGUID);
    });

    // Processar cada matéria
    for (const materiaDados of materias) {
      try {
        const nomeNormalizado = materiaDados.MateriaNome.trim();
        const nomeComparacao = nomeNormalizado.toLowerCase();

        // Verificar duplicata
        if (nomesExistentes.has(nomeComparacao)) {
          duplicados++;
          resultados.push({
            item: materiaDados,
            sucesso: true,
            mensagem: `Matéria "${nomeNormalizado}" já existe nesta escola`,
            tipo: 'duplicado',
          });
          continue;
        }

        // Resolver CursoNome → CursoGUID
        let cursoGUID = materiaDados.CursoGUID || null;
        if (materiaDados.CursoNome && !cursoGUID) {
          const cursoNomeNormalizado = materiaDados.CursoNome.trim().toLowerCase();
          cursoGUID = mapaCursosPorNome.get(cursoNomeNormalizado) || null;
          
          if (!cursoGUID && materiaDados.CursoNome) {
            // Curso especificado mas não encontrado - avisar no resultado
            erros++;
            resultados.push({
              item: materiaDados,
              sucesso: false,
              mensagem: `Curso "${materiaDados.CursoNome}" não encontrado`,
              tipo: 'erro',
            });
            continue;
          }
        }

        // Validar matéria técnica
        if (materiaDados.MateriaIsTecnica && !escola.EscolaIsTecnica) {
          erros++;
          resultados.push({
            item: materiaDados,
            sucesso: false,
            mensagem: 'Matéria técnica só pode ser criada em escola técnica',
            tipo: 'erro',
          });
          continue;
        }

        // Criar matéria
        const materia = new Materia();
        materia.MateriaGUID = uuidv4();
        materia.EscolaGUID = escolaGUID;
        materia.CursoGUID = cursoGUID;
        materia.MateriaNome = nomeNormalizado;
        materia.MateriaIsTecnica = materiaDados.MateriaIsTecnica;
        materia.MateriaAulasPorSemanaPadrao = materiaDados.MateriaAulasPorSemanaPadrao ?? null;
        materia.MateriaStatus = materiaDados.MateriaStatus || 'Ativa';
        materia.MateriaCreatedAt = new Date();
        materia.MateriaUpdatedAt = new Date();

        await this.#materiaDAO.create(materia);
        
        // Adicionar ao conjunto de nomes existentes
        nomesExistentes.add(nomeComparacao);

        criados++;
        resultados.push({
          item: materiaDados,
          sucesso: true,
          mensagem: `Matéria "${nomeNormalizado}" criada com sucesso`,
          dados: this.toDTO(materia),
          tipo: 'criado',
        });

      } catch (error) {
        erros++;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        resultados.push({
          item: materiaDados,
          sucesso: false,
          mensagem: `Erro: ${mensagem}`,
          tipo: 'erro',
        });
      }
    }

    return {
      totalProcessados: materias.length,
      criados,
      duplicados,
      erros,
      resultados,
    };
  };

  listarMaterias = async (filters: MateriaFilters): Promise<MateriaDTO[]> => {
    console.log("🟣 MateriaService.listarMaterias()");

    const materias = await this.#materiaDAO.findAll(filters);
    return materias.map((materia) => this.toDTO(materia));
  };

  buscarMateria = async (guid: string): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.buscarMateria()");

    const materia = await this.#materiaDAO.findById(guid);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    return this.toDTO(materia);
  };

  atualizarMateria = async (
    guid: string,
    data: MateriaUpdateDTO,
    usuarioCPF: string
  ): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.atualizarMateria()");

    // 1. Buscar matéria existente
    const materiaExistente = await this.#materiaDAO.findById(guid);
    if (!materiaExistente) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, materiaExistente.EscolaGUID);

    // 3. Se mudou nome, validar duplicidade
    if (data.MateriaNome && data.MateriaNome !== materiaExistente.MateriaNome) {
      const existente = await this.#materiaDAO.findByEscolaAndNome(
        materiaExistente.EscolaGUID,
        data.MateriaNome.trim()
      );
      if (existente && existente.MateriaGUID !== guid) {
        throw new ErrorResponse(409, "Já existe matéria com este nome", {
          message: `A matéria "${data.MateriaNome}" já está cadastrada nesta escola`,
        });
      }
    }

    // 4. Se mudou para técnica, validar escola técnica
    if (data.MateriaIsTecnica !== undefined && data.MateriaIsTecnica) {
      const escola = await this.#escolaDAO.findById(materiaExistente.EscolaGUID);
      if (!escola?.EscolaIsTecnica) {
        throw new ErrorResponse(400, "Escola não é técnica", {
          message: "Esta escola não está marcada como técnica",
        });
      }
    }

    // 5. Preparar dados para atualização
    const materiaAtualizada = new Materia();
    materiaAtualizada.MateriaGUID = guid;
    materiaAtualizada.EscolaGUID = materiaExistente.EscolaGUID;
    materiaAtualizada.MateriaNome =
      data.MateriaNome !== undefined ? data.MateriaNome.trim() : materiaExistente.MateriaNome;
    materiaAtualizada.MateriaIsTecnica =
      data.MateriaIsTecnica !== undefined
        ? data.MateriaIsTecnica
        : materiaExistente.MateriaIsTecnica;
    materiaAtualizada.MateriaAulasPorSemanaPadrao =
      data.MateriaAulasPorSemanaPadrao !== undefined
        ? data.MateriaAulasPorSemanaPadrao
        : materiaExistente.MateriaAulasPorSemanaPadrao;
    materiaAtualizada.MateriaStatus =
      data.MateriaStatus !== undefined ? data.MateriaStatus : materiaExistente.MateriaStatus;
    materiaAtualizada.CursoGUID =
      data.CursoGUID !== undefined ? data.CursoGUID : materiaExistente.CursoGUID;

    // 6. Atualizar
    const resultado = await this.#materiaDAO.update(guid, materiaAtualizada);
    if (!resultado) {
      throw new ErrorResponse(500, "Erro ao atualizar matéria", {
        message: "Não foi possível atualizar a matéria",
      });
    }

    return this.toDTO(resultado);
  };

  excluirMateria = async (guid: string, usuarioCPF: string): Promise<boolean> => {
    console.log("🟣 MateriaService.excluirMateria()");

    // 1. Buscar matéria
    const materia = await this.#materiaDAO.findById(guid);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, materia.EscolaGUID);

    // 3. Soft delete
    return await this.#materiaDAO.delete(guid);
  };

  // Helper: validar permissão de escrita (Coordenação ou Direção)
  private validarPermissaoEscrita = async (
    cpf: string,
    escolaGUID: string
  ): Promise<void> => {
    console.log("🔒 MateriaService.validarPermissaoEscrita()");

    // Validar Coordenação (FuncaoId = 1)
    const coordenacao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
      cpf,
      escolaGUID,
      1
    );

    if (coordenacao && coordenacao.Status === "Ativo") {
      return; // Tem permissão
    }

    // Validar Direção (FuncaoId = 6)
    const direcao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
      cpf,
      escolaGUID,
      6
    );

    if (direcao && direcao.Status === "Ativo") {
      return; // Tem permissão
    }

    // Sem permissão
    throw new ErrorResponse(403, "Sem permissão", {
      message: "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar matérias.",
    });
  };

  private toDTO(materia: Materia): MateriaDTO {
    return {
      MateriaGUID: materia.MateriaGUID,
      EscolaGUID: materia.EscolaGUID,
      CursoGUID: materia.CursoGUID,
      MateriaNome: materia.MateriaNome || "",
      MateriaIsTecnica: materia.MateriaIsTecnica,
      MateriaAulasPorSemanaPadrao: materia.MateriaAulasPorSemanaPadrao,
      MateriaStatus: materia.MateriaStatus,
      MateriaCreatedAt: materia.MateriaCreatedAt
        ? materia.MateriaCreatedAt.toISOString()
        : new Date().toISOString(),
      MateriaUpdatedAt: materia.MateriaUpdatedAt
        ? materia.MateriaUpdatedAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
