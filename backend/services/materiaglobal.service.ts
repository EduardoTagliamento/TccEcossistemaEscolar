import { v4 as uuidv4 } from "uuid";
import { Schema, Type } from "@google/genai";
import MysqlDatabase from "../database/MysqlDatabase";
import MateriaGlobal from "../entities/materiaglobal.model";
import MateriaGlobalAlias from "../entities/materiaglobalalias.model";
import SubMateriaGlobal from "../entities/submateriaglobal.model";
import { MateriaGlobalDAO } from "../repositories/materiaglobal.repository";
import { SubMateriaGlobalDAO } from "../repositories/submateriaglobal.repository";
import { MateriaGlobalAliasDAO } from "../repositories/materiaglobalalias.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { ordenarPorSimilaridade } from "../utils/stringSimilarity";
import { getGeminiProvider } from "../ai/providers/geminiProvider";

const LIMIAR_ALTA_CONFIANCA = 0.85;
const LIMIAR_MINIMO_CANDIDATO = 0.5;
const MAX_CANDIDATOS_AMBIGUOS = 3;

export interface CandidatoMateriaGlobal {
  MateriaGlobalGUID: string;
  Nome: string;
  Score: number;
}

export type ResolverMapeamentoResultado =
  | { Status: "Confirmado"; MateriaGlobalGUID: string }
  | { Status: "NovoPendente"; MateriaGlobalGUID: string }
  | { Status: "Ambiguo"; Candidatos: CandidatoMateriaGlobal[] };

export interface MapeamentoGlobalStatusDTO {
  MateriaGlobalGUID: string | null;
  StatusMapeamento: "Confirmado" | "Pendente" | "Ambiguo";
  NomeMateriaGlobal?: string;
  Candidatos?: CandidatoMateriaGlobal[];
}

interface DesempateIAResposta {
  melhorIndice: number;
  confianca: number;
}

const DESEMPATE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    melhorIndice: { type: Type.INTEGER },
    confianca: { type: Type.NUMBER },
  },
  required: ["melhorIndice", "confianca"],
};

/**
 * Mapeamento self-service `Materia → MateriaGlobal` (bakeoff §3.7, spec item
 * 15/16/17): similaridade de string primeiro (grátis, instantânea); LLM
 * leve só entra pra desempatar candidatos ambíguos; sem candidato nenhum,
 * formaliza `MateriaGlobal` novo com `Status='Pendente'` sem bloquear o
 * cadastro da escola.
 */
export default class MateriaGlobalService {
  #materiaGlobalDAO: MateriaGlobalDAO;
  #submateriaGlobalDAO: SubMateriaGlobalDAO;
  #aliasDAO: MateriaGlobalAliasDAO;
  #materiaDAO: MateriaDAO;

  constructor(
    materiaGlobalDAODependency: MateriaGlobalDAO,
    submateriaGlobalDAODependency: SubMateriaGlobalDAO,
    aliasDAODependency: MateriaGlobalAliasDAO,
    materiaDAODependency: MateriaDAO
  ) {
    console.log("⬆️  MateriaGlobalService.constructor()");
    this.#materiaGlobalDAO = materiaGlobalDAODependency;
    this.#submateriaGlobalDAO = submateriaGlobalDAODependency;
    this.#aliasDAO = aliasDAODependency;
    this.#materiaDAO = materiaDAODependency;
  }

  listarSubMaterias = async (materiaGlobalGUID: string) => {
    console.log("🟣 MateriaGlobalService.listarSubMaterias()");
    return this.#submateriaGlobalDAO.findByMateriaGlobal(materiaGlobalGUID);
  };

  criarSubMateria = async (materiaGlobalGUID: string, nome: string) => {
    console.log("🟣 MateriaGlobalService.criarSubMateria()");

    const materiaGlobal = await this.#materiaGlobalDAO.findById(materiaGlobalGUID);
    if (!materiaGlobal) {
      throw new ErrorResponse(404, "MateriaGlobal não encontrada", {
        message: `Não existe MateriaGlobal com id ${materiaGlobalGUID}`,
      });
    }

    const submateria = new SubMateriaGlobal();
    submateria.SubMateriaGlobalGUID = uuidv4();
    submateria.MateriaGlobalGUID = materiaGlobalGUID;
    submateria.Nome = nome;
    await this.#submateriaGlobalDAO.create(submateria);
    return submateria;
  };

  listarPendentes = async (): Promise<MateriaGlobal[]> => {
    console.log("🟣 MateriaGlobalService.listarPendentes()");
    return this.#materiaGlobalDAO.findAll({ Status: "Pendente" });
  };

  listarConfirmados = async (): Promise<MateriaGlobal[]> => {
    console.log("🟣 MateriaGlobalService.listarConfirmados()");
    return this.#materiaGlobalDAO.findAll({ Status: "Confirmado" });
  };

  /**
   * Status atual do mapeamento de uma Materia — usado pela tela de cadastro/
   * edição pra decidir se mostra "mapeado com X" ou a listbox de candidatos
   * ambíguos (spec §6). Se ainda não há `MateriaGlobalGUID` persistido,
   * tenta resolver de novo (idempotente pros casos Confirmado/NovoPendente).
   */
  obterStatusMapeamento = async (materiaGUID: string): Promise<MapeamentoGlobalStatusDTO> => {
    console.log("🟣 MateriaGlobalService.obterStatusMapeamento()");

    const materia = await this.#materiaDAO.findById(materiaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${materiaGUID}`,
      });
    }

    if (materia.MateriaGlobalGUID) {
      const materiaGlobal = await this.#materiaGlobalDAO.findById(materia.MateriaGlobalGUID);
      return {
        MateriaGlobalGUID: materia.MateriaGlobalGUID,
        StatusMapeamento: materiaGlobal?.Status ?? "Confirmado",
        NomeMateriaGlobal: materiaGlobal?.Nome,
      };
    }

    if (!materia.MateriaNome) {
      return { MateriaGlobalGUID: null, StatusMapeamento: "Ambiguo", Candidatos: [] };
    }

    const resultado = await this.resolverMapeamento(materia.MateriaNome);
    if (resultado.Status === "Ambiguo") {
      return { MateriaGlobalGUID: null, StatusMapeamento: "Ambiguo", Candidatos: resultado.Candidatos };
    }

    await this.#materiaDAO.atualizarMateriaGlobal(materiaGUID, resultado.MateriaGlobalGUID);
    const materiaGlobal = await this.#materiaGlobalDAO.findById(resultado.MateriaGlobalGUID);
    return {
      MateriaGlobalGUID: resultado.MateriaGlobalGUID,
      StatusMapeamento: materiaGlobal?.Status ?? "Confirmado",
      NomeMateriaGlobal: materiaGlobal?.Nome,
    };
  };

  /**
   * Ação da fila de revisão da plataforma (spec item 17) sobre um
   * `MateriaGlobal` com `Status='Pendente'`: mescla num já `Confirmado`
   * (cria alias + migra toda `Materia` que apontava pro pendente) ou
   * confirma o pendente como uma entrada nova e legítima.
   */
  resolverPendente = async (materiaGlobalPendenteGUID: string, mesclarEmGUID: string | null): Promise<void> => {
    console.log("🟣 MateriaGlobalService.resolverPendente()");

    const pendente = await this.#materiaGlobalDAO.findById(materiaGlobalPendenteGUID);
    if (!pendente) {
      throw new ErrorResponse(404, "MateriaGlobal não encontrada", {
        message: `Não existe MateriaGlobal com id ${materiaGlobalPendenteGUID}`,
      });
    }
    if (pendente.Status !== "Pendente") {
      throw new ErrorResponse(400, "MateriaGlobal já resolvida", {
        message: "Esta MateriaGlobal já não está mais pendente de revisão.",
      });
    }

    if (!mesclarEmGUID) {
      await this.#materiaGlobalDAO.atualizarStatus(materiaGlobalPendenteGUID, "Confirmado");
      return;
    }

    const alvo = await this.#materiaGlobalDAO.findById(mesclarEmGUID);
    if (!alvo) {
      throw new ErrorResponse(404, "MateriaGlobal de destino não encontrada", {
        message: `Não existe MateriaGlobal com id ${mesclarEmGUID}`,
      });
    }

    const alias = new MateriaGlobalAlias();
    alias.MateriaGlobalAliasGUID = uuidv4();
    alias.MateriaGlobalGUID = mesclarEmGUID;
    alias.NomeAlias = pendente.Nome;
    await this.#aliasDAO.create(alias);

    await this.#materiaDAO.reatribuirMateriaGlobal(materiaGlobalPendenteGUID, mesclarEmGUID);
    // O registro `Pendente` original fica órfão (sem Materia apontando pra
    // ele) — não é excluído pra não arriscar violar FK de futuras
    // referências (submateriaglobal/questaobanco), mas deixa de aparecer
    // pra qualquer escola daqui pra frente.
  };

  resolverMapeamento = async (nomeMateria: string): Promise<ResolverMapeamentoResultado> => {
    console.log("🟣 MateriaGlobalService.resolverMapeamento()");

    const [materiasGlobais, aliases] = await Promise.all([
      this.#materiaGlobalDAO.findAll(),
      this.#aliasDAO.findAll(),
    ]);

    const candidatosNomes = [
      ...materiasGlobais.map((mg) => ({ materiaGlobalGUID: mg.MateriaGlobalGUID, nome: mg.Nome })),
      ...aliases.map((a) => ({ materiaGlobalGUID: a.MateriaGlobalGUID, nome: a.NomeAlias })),
    ];

    if (candidatosNomes.length === 0) {
      return this.#formalizarPendente(nomeMateria);
    }

    const ranking = ordenarPorSimilaridade(nomeMateria, candidatosNomes, (c) => c.nome);

    const melhorScorePorMateriaGlobal = new Map<string, number>();
    for (const { item, score } of ranking) {
      const atual = melhorScorePorMateriaGlobal.get(item.materiaGlobalGUID) ?? 0;
      if (score > atual) melhorScorePorMateriaGlobal.set(item.materiaGlobalGUID, score);
    }

    const rankingDeduplicado: CandidatoMateriaGlobal[] = [...melhorScorePorMateriaGlobal.entries()]
      .map(([materiaGlobalGUID, score]) => ({
        MateriaGlobalGUID: materiaGlobalGUID,
        Nome: materiasGlobais.find((mg) => mg.MateriaGlobalGUID === materiaGlobalGUID)?.Nome ?? "",
        Score: score,
      }))
      .sort((a, b) => b.Score - a.Score);

    const melhor = rankingDeduplicado[0];

    if (!melhor || melhor.Score < LIMIAR_MINIMO_CANDIDATO) {
      return this.#formalizarPendente(nomeMateria);
    }

    if (melhor.Score >= LIMIAR_ALTA_CONFIANCA) {
      return { Status: "Confirmado", MateriaGlobalGUID: melhor.MateriaGlobalGUID };
    }

    const topCandidatos = rankingDeduplicado.slice(0, MAX_CANDIDATOS_AMBIGUOS);
    const candidatosDesempatados = await this.#desempatarComIA(nomeMateria, topCandidatos);
    return { Status: "Ambiguo", Candidatos: candidatosDesempatados };
  };

  /**
   * Chamado quando o gestor resolve manualmente uma listbox ambígua (ou
   * confirma um `MateriaGlobal` recém-formalizado como `Pendente`).
   * `materiaGlobalGUIDEscolhida=null` significa "nenhum candidato serve,
   * criar um novo `MateriaGlobal` já confirmado com este nome".
   */
  confirmarMapeamentoManual = async (
    materiaGUID: string,
    materiaGlobalGUIDEscolhida: string | null
  ): Promise<string> => {
    console.log("🟣 MateriaGlobalService.confirmarMapeamentoManual()");

    const materia = await this.#materiaDAO.findById(materiaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${materiaGUID}`,
      });
    }
    if (!materia.MateriaNome) {
      throw new ErrorResponse(400, "Matéria sem nome", {
        message: "Não é possível resolver o mapeamento de uma matéria sem nome.",
      });
    }
    const nomeOriginalTentado = materia.MateriaNome;

    let materiaGlobalGUIDFinal = materiaGlobalGUIDEscolhida;

    if (!materiaGlobalGUIDFinal) {
      const novo = new MateriaGlobal();
      novo.MateriaGlobalGUID = uuidv4();
      novo.Nome = nomeOriginalTentado;
      novo.Status = "Confirmado";
      await this.#materiaGlobalDAO.create(novo);
      materiaGlobalGUIDFinal = novo.MateriaGlobalGUID;
    } else {
      const materiaGlobalEscolhida = await this.#materiaGlobalDAO.findById(materiaGlobalGUIDFinal);
      if (!materiaGlobalEscolhida) {
        throw new ErrorResponse(404, "MateriaGlobal não encontrada", {
          message: `Não existe MateriaGlobal com id ${materiaGlobalGUIDFinal}`,
        });
      }

      // Nome tentado divergiu do nome oficial escolhido — vira alias (spec
      // item 17), pra similaridade futura já achar de primeira.
      if (materiaGlobalEscolhida.Nome.trim().toLowerCase() !== nomeOriginalTentado.trim().toLowerCase()) {
        const alias = new MateriaGlobalAlias();
        alias.MateriaGlobalAliasGUID = uuidv4();
        alias.MateriaGlobalGUID = materiaGlobalGUIDFinal;
        alias.NomeAlias = nomeOriginalTentado.trim();
        await this.#aliasDAO.create(alias);
      }
    }

    await this.#materiaDAO.atualizarMateriaGlobal(materiaGUID, materiaGlobalGUIDFinal);
    return materiaGlobalGUIDFinal;
  };

  #formalizarPendente = async (nomeMateria: string): Promise<ResolverMapeamentoResultado> => {
    const novo = new MateriaGlobal();
    novo.MateriaGlobalGUID = uuidv4();
    novo.Nome = nomeMateria;
    novo.Status = "Pendente";

    try {
      await this.#materiaGlobalDAO.create(novo);
      return { Status: "NovoPendente", MateriaGlobalGUID: novo.MateriaGlobalGUID };
    } catch (error) {
      // Corrida rara: outra escola formalizou o mesmo nome exato entre a
      // busca de similaridade e este INSERT (UNIQUE em materiaglobal.Nome).
      const existente = await this.#materiaGlobalDAO.findByNomeExato(nomeMateria);
      if (existente) {
        return { Status: "Confirmado", MateriaGlobalGUID: existente.MateriaGlobalGUID };
      }
      throw error;
    }
  };

  /**
   * Desempate leve via LLM (tier leve) — só reordena e anota confiança;
   * nunca decide sozinho, a listbox final ainda depende de confirmação
   * humana. Falha de IA aqui não bloqueia nada: devolve o ranking original.
   */
  #desempatarComIA = async (
    nomeMateria: string,
    candidatos: CandidatoMateriaGlobal[]
  ): Promise<CandidatoMateriaGlobal[]> => {
    if (candidatos.length <= 1) return candidatos;

    const prompt = [
      `Compare o nome de matéria "${nomeMateria}" com a lista abaixo (mesmo índice base 0) e diga qual`,
      "delas é, com mais probabilidade, a MESMA matéria (só com nome diferente/abreviado/com erro de digitação).",
      "Se nenhuma bater de verdade, devolva melhorIndice = -1.",
      "",
      ...candidatos.map((c, i) => `${i}. ${c.Nome}`),
    ].join("\n");

    try {
      const resposta = await getGeminiProvider().gerarEstruturado<DesempateIAResposta>(
        prompt,
        DESEMPATE_SCHEMA,
        "leve"
      );

      if (
        !Number.isInteger(resposta.melhorIndice) ||
        resposta.melhorIndice < 0 ||
        resposta.melhorIndice >= candidatos.length
      ) {
        return candidatos;
      }

      const escolhido = { ...candidatos[resposta.melhorIndice], Score: resposta.confianca };
      const resto = candidatos.filter((_, i) => i !== resposta.melhorIndice);
      return [escolhido, ...resto];
    } catch (error) {
      console.warn("🟡 MateriaGlobalService.#desempatarComIA() falhou, mantendo ranking por similaridade:", error);
      return candidatos;
    }
  };
}

/**
 * Singleton leve, mesmo padrão de `getNotificacaoService()`/`getProvaAgendadaRecomendacaoService()`
 * — usado a partir de `MateriaService` (hook no create/update) sem exigir
 * mudar a injeção manual de `routes/materia.routes.ts`.
 */
let instanciaSingleton: MateriaGlobalService | null = null;

export function getMateriaGlobalService(): MateriaGlobalService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new MateriaGlobalService(
      new MateriaGlobalDAO(database),
      new SubMateriaGlobalDAO(database),
      new MateriaGlobalAliasDAO(database),
      new MateriaDAO(database)
    );
  }
  return instanciaSingleton;
}
