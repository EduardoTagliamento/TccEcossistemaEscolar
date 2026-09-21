import { gerarGUID } from "../utils/helpers/guid.helper";
import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade } from "../entities/questaobanco.model";
import QuestaoBancoAlternativa from "../entities/questaobancoalternativa.model";
import Vestibular from "../entities/vestibular.model";
import Anexo from "../entities/anexo.model";
import { QuestaoBancoDAO, QuestaoBancoFiltros } from "../repositories/questaobanco.repository";
import { QuestaoBancoAlternativaDAO } from "../repositories/questaobancoalternativa.repository";
import { VestibularDAO } from "../repositories/vestibular.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { RelacaoAnexosDAO } from "../repositories/relacaoanexos.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import ErrorResponse from "../utils/ErrorResponse";

export interface AlternativaDTO {
  AlternativaGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaOrdem: number;
  Anexos: Anexo[];
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
  Anexos: Anexo[];
  CreatedAt: string | null;
}

export interface QuestaoBancoCreateDTO {
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl?: string | null;
  Alternativas: { Texto: string; Correta: boolean; AnexoGUIDs?: string[] }[];
  /** Imagem(ns) do enunciado — ex.: gráfico/mapa/tirinha de uma questão de vestibular. */
  AnexoGUIDs?: string[];
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
  #usuarioDAO: UsuarioDAO;
  #relacaoAnexosDAO: RelacaoAnexosDAO;
  #anexoDAO: AnexoDAO;

  constructor(
    questaoDAODependency: QuestaoBancoDAO,
    alternativaDAODependency: QuestaoBancoAlternativaDAO,
    vestibularDAODependency: VestibularDAO,
    usuarioDAODependency: UsuarioDAO,
    relacaoAnexosDAODependency: RelacaoAnexosDAO,
    anexoDAODependency: AnexoDAO
  ) {
    console.log("⬆️  QuestaoBancoService.constructor()");
    this.#questaoDAO = questaoDAODependency;
    this.#alternativaDAO = alternativaDAODependency;
    this.#vestibularDAO = vestibularDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
    this.#relacaoAnexosDAO = relacaoAnexosDAODependency;
    this.#anexoDAO = anexoDAODependency;
  }

  criarQuestao = async (data: QuestaoBancoCreateDTO, usuarioGUID: string): Promise<QuestaoBancoDTO> => {
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
    questao.QuestaoBancoGUID = gerarGUID();
    questao.MateriaGlobalGUID = data.MateriaGlobalGUID;
    questao.SubMateriaGlobalGUID = data.SubMateriaGlobalGUID;
    questao.VestibularGUID = data.VestibularGUID;
    questao.Dificuldade = data.Dificuldade;
    questao.Enunciado = data.Enunciado;
    questao.VideoResolucaoUrl = data.VideoResolucaoUrl ?? null;
    questao.CriadoPorGUID = usuarioGUID;

    await this.#questaoDAO.create(questao);

    const alternativas = data.Alternativas.map((a, indice) => {
      const alternativa = new QuestaoBancoAlternativa();
      alternativa.AlternativaGUID = gerarGUID();
      alternativa.QuestaoBancoGUID = questao.QuestaoBancoGUID;
      alternativa.AlternativaTexto = a.Texto;
      alternativa.AlternativaCorreta = a.Correta;
      alternativa.AlternativaOrdem = indice;
      return alternativa;
    });
    await this.#alternativaDAO.createBatch(alternativas);

    // Anexo já foi enviado antes via POST /api/anexo (mesmo limite de
    // mimetype/tamanho de qualquer outro anexo do sistema) — aqui só vincula
    // o(s) AnexoGUID(s) já existente(s), mesma regra de posse usada em
    // SugestaoService.criarSugestao: só dá pra anexar arquivo que você mesmo
    // enviou. Imagem pode ir no enunciado, em cada alternativa, ou nos dois.
    await this.vincularAnexos(data.AnexoGUIDs, usuarioGUID, (anexoGUID) =>
      this.#relacaoAnexosDAO.vincularAnexoQuestaoBanco(anexoGUID, questao.QuestaoBancoGUID)
    );
    for (let i = 0; i < data.Alternativas.length; i++) {
      await this.vincularAnexos(data.Alternativas[i].AnexoGUIDs, usuarioGUID, (anexoGUID) =>
        this.#relacaoAnexosDAO.vincularAnexoQuestaoBancoAlternativa(anexoGUID, alternativas[i].AlternativaGUID)
      );
    }

    return this.toDTO(questao, alternativas, [], alternativas.map(() => []));
  };

  private vincularAnexos = async (
    anexoGUIDs: string[] | undefined,
    usuarioGUID: string,
    vincular: (anexoGUID: string) => Promise<void>
  ): Promise<void> => {
    if (!anexoGUIDs || anexoGUIDs.length === 0) return;
    for (const anexoGUID of anexoGUIDs) {
      const anexo = await this.#anexoDAO.findById(anexoGUID);
      if (!anexo) {
        throw new ErrorResponse(404, `Anexo ${anexoGUID} não encontrado`);
      }
      if (anexo.UsuarioGUID !== usuarioGUID) {
        throw new ErrorResponse(403, "Você só pode anexar arquivos que você mesmo enviou");
      }
      await vincular(anexoGUID);
    }
  };

  listarQuestoes = async (filtros: QuestaoBancoFiltros): Promise<QuestaoBancoDTO[]> => {
    console.log("🟣 QuestaoBancoService.listarQuestoes()");

    const questoes = await this.#questaoDAO.findAll(filtros);
    return Promise.all(
      questoes.map(async (questao) => {
        const alternativas = await this.#alternativaDAO.findByQuestao(questao.QuestaoBancoGUID);
        const anexosQuestao = await this.#relacaoAnexosDAO.findAnexosByQuestaoBanco(questao.QuestaoBancoGUID);
        const anexosAlternativas = await Promise.all(
          alternativas.map((a) => this.#relacaoAnexosDAO.findAnexosByQuestaoBancoAlternativa(a.AlternativaGUID))
        );
        return this.toDTO(questao, alternativas, anexosQuestao, anexosAlternativas);
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
    vestibular.VestibularGUID = gerarGUID();
    vestibular.Nome = nome;
    await this.#vestibularDAO.create(vestibular);
    return vestibular;
  };

  private toDTO(
    questao: QuestaoBanco,
    alternativas: QuestaoBancoAlternativa[],
    anexosQuestao: Anexo[] = [],
    anexosAlternativas: Anexo[][] = []
  ): QuestaoBancoDTO {
    return {
      QuestaoBancoGUID: questao.QuestaoBancoGUID,
      MateriaGlobalGUID: questao.MateriaGlobalGUID,
      SubMateriaGlobalGUID: questao.SubMateriaGlobalGUID,
      VestibularGUID: questao.VestibularGUID,
      Dificuldade: questao.Dificuldade,
      Enunciado: questao.Enunciado,
      VideoResolucaoUrl: questao.VideoResolucaoUrl,
      Alternativas: alternativas.map((a, indice) => ({
        AlternativaGUID: a.AlternativaGUID,
        AlternativaTexto: a.AlternativaTexto,
        AlternativaCorreta: a.AlternativaCorreta,
        AlternativaOrdem: a.AlternativaOrdem,
        Anexos: anexosAlternativas[indice] ?? [],
      })),
      Anexos: anexosQuestao,
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
      new VestibularDAO(database),
      new UsuarioDAO(database),
      new RelacaoAnexosDAO(database),
      new AnexoDAO(database)
    );
  }
  return instanciaSingleton;
}
