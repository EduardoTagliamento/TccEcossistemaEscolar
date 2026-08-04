import { v4 as uuidv4 } from "uuid";
import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade } from "../entities/questaobanco.model";
import QuestaoBancoAlternativa from "../entities/questaobancoalternativa.model";
import Vestibular from "../entities/vestibular.model";
import { QuestaoBancoDAO, QuestaoBancoFiltros } from "../repositories/questaobanco.repository";
import { QuestaoBancoAlternativaDAO } from "../repositories/questaobancoalternativa.repository";
import { VestibularDAO } from "../repositories/vestibular.repository";
import ErrorResponse from "../utils/ErrorResponse";

export interface AlternativaDTO {
  AlternativaGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaOrdem: number;
}

export interface QuestaoBancoDTO {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  Alternativas: AlternativaDTO[];
  CreatedAt: string | null;
}

export interface QuestaoBancoCreateDTO {
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl?: string | null;
  Alternativas: { Texto: string; Correta: boolean }[];
}

/**
 * Banco de questões universal (spec item 11-13) — curadoria só do admin de
 * plataforma (rotas de escrita atrás de `plataformaAdminGuard`). Consulta
 * pro aluno é busca filtrada direta, sem LLM (item 12).
 */
export default class QuestaoBancoService {
  #questaoDAO: QuestaoBancoDAO;
  #alternativaDAO: QuestaoBancoAlternativaDAO;
  #vestibularDAO: VestibularDAO;

  constructor(
    questaoDAODependency: QuestaoBancoDAO,
    alternativaDAODependency: QuestaoBancoAlternativaDAO,
    vestibularDAODependency: VestibularDAO
  ) {
    console.log("⬆️  QuestaoBancoService.constructor()");
    this.#questaoDAO = questaoDAODependency;
    this.#alternativaDAO = alternativaDAODependency;
    this.#vestibularDAO = vestibularDAODependency;
  }

  criarQuestao = async (data: QuestaoBancoCreateDTO, usuarioCPF: string): Promise<QuestaoBancoDTO> => {
    console.log("🟣 QuestaoBancoService.criarQuestao()");

    if (!data.Alternativas || data.Alternativas.length < 2) {
      throw new ErrorResponse(400, "Alternativas insuficientes", {
        message: "Uma questão precisa de pelo menos 2 alternativas.",
      });
    }
    const corretas = data.Alternativas.filter((a) => a.Correta);
    if (corretas.length !== 1) {
      throw new ErrorResponse(400, "Alternativa correta inválida", {
        message: "Exatamente uma alternativa deve ser marcada como correta.",
      });
    }

    const questao = new QuestaoBanco();
    questao.QuestaoBancoGUID = uuidv4();
    questao.MateriaGlobalGUID = data.MateriaGlobalGUID;
    questao.SubMateriaGlobalGUID = data.SubMateriaGlobalGUID;
    questao.VestibularGUID = data.VestibularGUID;
    questao.Dificuldade = data.Dificuldade;
    questao.Enunciado = data.Enunciado;
    questao.VideoResolucaoUrl = data.VideoResolucaoUrl ?? null;
    questao.CriadoPorCPF = usuarioCPF;

    await this.#questaoDAO.create(questao);

    const alternativas = data.Alternativas.map((a, indice) => {
      const alternativa = new QuestaoBancoAlternativa();
      alternativa.AlternativaGUID = uuidv4();
      alternativa.QuestaoBancoGUID = questao.QuestaoBancoGUID;
      alternativa.AlternativaTexto = a.Texto;
      alternativa.AlternativaCorreta = a.Correta;
      alternativa.AlternativaOrdem = indice;
      return alternativa;
    });
    await this.#alternativaDAO.createBatch(alternativas);

    return this.toDTO(questao, alternativas);
  };

  listarQuestoes = async (filtros: QuestaoBancoFiltros): Promise<QuestaoBancoDTO[]> => {
    console.log("🟣 QuestaoBancoService.listarQuestoes()");

    const questoes = await this.#questaoDAO.findAll(filtros);
    return Promise.all(
      questoes.map(async (questao) => {
        const alternativas = await this.#alternativaDAO.findByQuestao(questao.QuestaoBancoGUID);
        return this.toDTO(questao, alternativas);
      })
    );
  };

  excluirQuestao = async (guid: string): Promise<boolean> => {
    console.log("🟣 QuestaoBancoService.excluirQuestao()");

    await this.#alternativaDAO.deleteByQuestao(guid);
    return this.#questaoDAO.delete(guid);
  };

  existeParaSubMateria = async (subMateriaGlobalGUID: string): Promise<boolean> => {
    return this.#questaoDAO.existeParaSubMateria(subMateriaGlobalGUID);
  };

  listarVestibulares = async (): Promise<Vestibular[]> => {
    console.log("🟣 QuestaoBancoService.listarVestibulares()");
    return this.#vestibularDAO.findAll();
  };

  criarVestibular = async (nome: string): Promise<Vestibular> => {
    console.log("🟣 QuestaoBancoService.criarVestibular()");

    const existente = await this.#vestibularDAO.findByNomeExato(nome.trim());
    if (existente) return existente;

    const vestibular = new Vestibular();
    vestibular.VestibularGUID = uuidv4();
    vestibular.Nome = nome;
    await this.#vestibularDAO.create(vestibular);
    return vestibular;
  };

  private toDTO(questao: QuestaoBanco, alternativas: QuestaoBancoAlternativa[]): QuestaoBancoDTO {
    return {
      QuestaoBancoGUID: questao.QuestaoBancoGUID,
      MateriaGlobalGUID: questao.MateriaGlobalGUID,
      SubMateriaGlobalGUID: questao.SubMateriaGlobalGUID,
      VestibularGUID: questao.VestibularGUID,
      Dificuldade: questao.Dificuldade,
      Enunciado: questao.Enunciado,
      VideoResolucaoUrl: questao.VideoResolucaoUrl,
      Alternativas: alternativas.map((a) => ({
        AlternativaGUID: a.AlternativaGUID,
        AlternativaTexto: a.AlternativaTexto,
        AlternativaCorreta: a.AlternativaCorreta,
        AlternativaOrdem: a.AlternativaOrdem,
      })),
      CreatedAt: questao.CreatedAt ? questao.CreatedAt.toISOString() : null,
    };
  }
}

/**
 * Singleton leve, mesmo padrão das outras services transversais — usado
 * pelo pipeline de recomendação (`ProvaAgendadaRecomendacaoService`) pra só
 * verificar existência, sem precisar da injeção manual completa.
 */
let instanciaSingleton: QuestaoBancoService | null = null;

export function getQuestaoBancoService(): QuestaoBancoService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new QuestaoBancoService(
      new QuestaoBancoDAO(database),
      new QuestaoBancoAlternativaDAO(database),
      new VestibularDAO(database)
    );
  }
  return instanciaSingleton;
}
