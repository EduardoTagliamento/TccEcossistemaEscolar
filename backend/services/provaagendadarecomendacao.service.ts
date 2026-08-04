import { v4 as uuidv4 } from "uuid";
import MysqlDatabase from "../database/MysqlDatabase";
import ProvaAgendadaRecomendacao, {
  ProvaAgendadaRecomendacaoStatus,
  RecomendacaoFonte,
  RecomendacaoVideo,
  RecomendacaoPaginaLivro,
} from "../entities/provaagendadarecomendacao.model";
import { ProvaAgendadaRecomendacaoDAO } from "../repositories/provaagendadarecomendacao.repository";
import { ProvaAgendadaDAO } from "../repositories/provaagendada.repository";
import ProvaAgendadaTurmaDAO from "../repositories/provaagendada-turma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { ConteudoDAO } from "../repositories/conteudo.repository";
import ConteudoTurmaDAO from "../repositories/conteudoturma.repository";
import { ConteudoTextoDAO } from "../repositories/conteudotexto.repository";
import { AssuntoDAO } from "../repositories/assunto.repository";
import { ProvaAgendadaAssuntoDAO } from "../repositories/provaagendadaassunto.repository";
import { MaterialDidaticoCapituloDAO } from "../repositories/materialdidaticocapitulo.repository";
import { MaterialDidaticoDAO } from "../repositories/materialdidatico.repository";
import { MaterialDidaticoPaginaDAO } from "../repositories/materialdidaticopagina.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { getVideoRecomendacaoAgent } from "../ai/agents/videoRecomendacaoAgent";
import { getResumoEstudoAgent, FonteTexto } from "../ai/agents/resumoEstudoAgent";
import { getClassificacaoAssuntoAgent } from "../ai/agents/classificacaoAssuntoAgent";
import { getQuestaoBancoService } from "./questaobanco.service";

const MAX_CONTEUDOS_FALLBACK_TEMPORAL = 5;
const MODELO_USADO_DESCRICAO = "gemini-2.5-flash (leve) / gemini-2.5-pro (cheio)";

export interface RecomendacaoDTO {
  ProvaAgendadaGUID: string;
  Videos: RecomendacaoVideo[];
  Resumo: string | null;
  FontesUsadas: RecomendacaoFonte[];
  PaginaLivro: RecomendacaoPaginaLivro | null;
  SubMateriaGlobalGUID: string | null;
  StatusGeracao: ProvaAgendadaRecomendacaoStatus;
  GeradoEm: string | null;
}

interface ResolucaoAssunto {
  nomes: string[];
  subMateriaGlobalGUID: string | null;
}

/**
 * Orquestração da recomendação de estudo por IA (Fases 1+2+3 do plano —
 * docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md §2.5/§3.4/§4.2/§4.3):
 * resolve o assunto (travado manualmente tem prioridade; senão,
 * classificação restrita à lista da Matéria — spec item 3), coleta
 * contexto (`Conteudo` da categoria/proximidade temporal — spec item 4, +
 * capítulo de `MaterialDidatico` referenciado, se houver — spec item 9),
 * chama os agents de vídeo/resumo em paralelo, verifica banco de questões
 * disponível (spec item 12, sem LLM) e cacheia tudo. Cada peça é
 * independente (spec item 22) — uma falhar não derruba a outra.
 *
 * Simplificação assumida nesta fase (honesta, não escondida): o resumo só
 * usa `Conteudo` do tipo "texto" como fonte. `ConteudoTipo` "cronometrado"
 * (vídeo/áudio) e "paginado" (PDF/imagem) não têm texto extraível hoje —
 * isso é exatamente o pipeline de OCR/extração que só entra na Fase 3
 * (`MaterialDidatico`), junto com o próprio livro didático.
 */
export default class ProvaAgendadaRecomendacaoService {
  #recomendacaoDAO: ProvaAgendadaRecomendacaoDAO;
  #provaDAO: ProvaAgendadaDAO;
  #provaTurmaDAO: ProvaAgendadaTurmaDAO;
  #materiaDAO: MateriaDAO;
  #conteudoDAO: ConteudoDAO;
  #conteudoTurmaDAO: ConteudoTurmaDAO;
  #conteudoTextoDAO: ConteudoTextoDAO;
  #assuntoDAO: AssuntoDAO;
  #provaAssuntoDAO: ProvaAgendadaAssuntoDAO;
  #materialDidaticoCapituloDAO: MaterialDidaticoCapituloDAO;
  #materialDidaticoDAO: MaterialDidaticoDAO;
  #materialDidaticoPaginaDAO: MaterialDidaticoPaginaDAO;

  constructor(
    recomendacaoDAODependency: ProvaAgendadaRecomendacaoDAO,
    provaDAODependency: ProvaAgendadaDAO,
    provaTurmaDAODependency: ProvaAgendadaTurmaDAO,
    materiaDAODependency: MateriaDAO,
    conteudoDAODependency: ConteudoDAO,
    conteudoTurmaDAODependency: ConteudoTurmaDAO,
    conteudoTextoDAODependency: ConteudoTextoDAO,
    assuntoDAODependency: AssuntoDAO,
    provaAssuntoDAODependency: ProvaAgendadaAssuntoDAO,
    materialDidaticoCapituloDAODependency: MaterialDidaticoCapituloDAO,
    materialDidaticoDAODependency: MaterialDidaticoDAO,
    materialDidaticoPaginaDAODependency: MaterialDidaticoPaginaDAO
  ) {
    console.log("⬆️  ProvaAgendadaRecomendacaoService.constructor()");
    this.#recomendacaoDAO = recomendacaoDAODependency;
    this.#provaDAO = provaDAODependency;
    this.#provaTurmaDAO = provaTurmaDAODependency;
    this.#materiaDAO = materiaDAODependency;
    this.#conteudoDAO = conteudoDAODependency;
    this.#conteudoTurmaDAO = conteudoTurmaDAODependency;
    this.#conteudoTextoDAO = conteudoTextoDAODependency;
    this.#assuntoDAO = assuntoDAODependency;
    this.#provaAssuntoDAO = provaAssuntoDAODependency;
    this.#materialDidaticoCapituloDAO = materialDidaticoCapituloDAODependency;
    this.#materialDidaticoDAO = materialDidaticoDAODependency;
    this.#materialDidaticoPaginaDAO = materialDidaticoPaginaDAODependency;
  }

  buscarRecomendacao = async (provaAgendadaGUID: string): Promise<RecomendacaoDTO> => {
    console.log("🟣 ProvaAgendadaRecomendacaoService.buscarRecomendacao()");

    const recomendacao = await this.#recomendacaoDAO.findByProva(provaAgendadaGUID);
    if (!recomendacao) {
      throw new ErrorResponse(404, "Recomendação não encontrada", {
        message: "A recomendação desta prova ainda não foi gerada ou está sendo processada.",
      });
    }

    return {
      ProvaAgendadaGUID: recomendacao.ProvaAgendadaGUID,
      Videos: recomendacao.VideosJson ?? [],
      Resumo: recomendacao.ResumoTexto,
      FontesUsadas: recomendacao.FontesUsadas ?? [],
      PaginaLivro: recomendacao.PaginaLivroJson,
      SubMateriaGlobalGUID: recomendacao.SubMateriaGlobalGUID,
      StatusGeracao: recomendacao.StatusGeracao,
      GeradoEm: recomendacao.GeradoEm ? recomendacao.GeradoEm.toISOString() : null,
    };
  };

  /**
   * Gera (ou regenera) a recomendação de uma prova. Roda fire-and-forget a
   * partir de `criarProva`/`atualizarProva` (spec itens 20/21) — nunca
   * lança erro pro chamador, sempre resolve gravando StatusGeracao no cache
   * (guardrail §7: falha de API não pode bloquear a prova em si).
   */
  gerarRecomendacao = async (provaAgendadaGUID: string): Promise<void> => {
    console.log("🟣 ProvaAgendadaRecomendacaoService.gerarRecomendacao()");

    try {
      const prova = await this.#provaDAO.findById(provaAgendadaGUID);
      if (!prova) {
        console.warn(`🟡 ProvaAgendadaRecomendacaoService: prova ${provaAgendadaGUID} não encontrada, abortando`);
        return;
      }

      const materia = await this.#materiaDAO.findById(prova.MateriaGUID);
      const resolucaoAssunto = await this.#resolverAssuntos(
        prova.ProvaAgendadaGUID,
        prova.MateriaGUID,
        prova.ProvaDescricao,
        materia?.MateriaNome ?? null
      );
      const contexto = this.#montarContexto(resolucaoAssunto.nomes, prova.ProvaDescricao, materia?.MateriaNome ?? null);
      const { fontesTexto, fontesUsadas } = await this.#coletarConteudoRelacionado(
        prova.ProvaAgendadaGUID,
        prova.MateriaGUID,
        prova.ProvaData
      );

      const { fonteTexto: fontePaginaLivro, paginaLivro } = await this.#coletarPaginaLivro(
        prova.MaterialDidaticoCapituloGUID
      );
      if (fontePaginaLivro) {
        fontesTexto.push(fontePaginaLivro);
        fontesUsadas.push({ tipo: "MaterialDidatico", guid: fontePaginaLivro.guid, rotulo: fontePaginaLivro.rotulo });
      }

      const subMateriaGlobalGUID = await this.#resolverSubMateriaComQuestoes(resolucaoAssunto.subMateriaGlobalGUID);

      const [resultadoVideo, resultadoResumo] = await Promise.allSettled([
        getVideoRecomendacaoAgent().recomendar(contexto),
        getResumoEstudoAgent().gerarResumo(contexto, fontesTexto),
      ]);

      if (resultadoVideo.status === "rejected") {
        console.warn("🟡 ProvaAgendadaRecomendacaoService: busca de vídeo falhou:", resultadoVideo.reason);
      }
      if (resultadoResumo.status === "rejected") {
        console.warn("🟡 ProvaAgendadaRecomendacaoService: geração de resumo falhou:", resultadoResumo.reason);
      }

      const videos = resultadoVideo.status === "fulfilled" ? resultadoVideo.value : [];
      const resumo = resultadoResumo.status === "fulfilled" ? resultadoResumo.value : null;
      const houveFalhaTotal = resultadoVideo.status === "rejected" && resultadoResumo.status === "rejected";

      const recomendacao = new ProvaAgendadaRecomendacao();
      recomendacao.ProvaAgendadaRecomendacaoGUID = uuidv4();
      recomendacao.ProvaAgendadaGUID = provaAgendadaGUID;
      recomendacao.VideosJson = videos;
      recomendacao.ResumoTexto = resumo;
      recomendacao.FontesUsadas = fontesUsadas;
      recomendacao.PaginaLivroJson = paginaLivro;
      recomendacao.SubMateriaGlobalGUID = subMateriaGlobalGUID;
      recomendacao.ModeloUsado = MODELO_USADO_DESCRICAO;
      recomendacao.StatusGeracao = houveFalhaTotal ? "Falhou" : "Concluida";
      recomendacao.ErroGeracao = houveFalhaTotal
        ? this.#resumirFalhas(resultadoVideo, resultadoResumo)
        : null;

      await this.#recomendacaoDAO.upsert(recomendacao);
      console.log(
        `✅ ProvaAgendadaRecomendacaoService: recomendação gerada para prova ${provaAgendadaGUID} (status=${recomendacao.StatusGeracao})`
      );
    } catch (error) {
      console.error(
        `🔴 ProvaAgendadaRecomendacaoService.gerarRecomendacao() falhou por completo para prova ${provaAgendadaGUID}:`,
        error
      );
      await this.#gravarFalhaTotal(provaAgendadaGUID, error).catch((erroAoGravar) => {
        console.error("🔴 ProvaAgendadaRecomendacaoService: falha ao gravar StatusGeracao='Falhou':", erroAoGravar);
      });
    }
  };

  #gravarFalhaTotal = async (provaAgendadaGUID: string, error: unknown): Promise<void> => {
    const recomendacao = new ProvaAgendadaRecomendacao();
    recomendacao.ProvaAgendadaRecomendacaoGUID = uuidv4();
    recomendacao.ProvaAgendadaGUID = provaAgendadaGUID;
    recomendacao.StatusGeracao = "Falhou";
    recomendacao.ErroGeracao = error instanceof Error ? error.message : String(error);
    await this.#recomendacaoDAO.upsert(recomendacao);
  };

  #resumirFalhas = (
    resultadoVideo: PromiseSettledResult<RecomendacaoVideo[]>,
    resultadoResumo: PromiseSettledResult<string | null>
  ): string => {
    const motivos: string[] = [];
    if (resultadoVideo.status === "rejected") {
      motivos.push(`vídeo: ${this.#erroParaTexto(resultadoVideo.reason)}`);
    }
    if (resultadoResumo.status === "rejected") {
      motivos.push(`resumo: ${this.#erroParaTexto(resultadoResumo.reason)}`);
    }
    return motivos.join(" | ").slice(0, 500);
  };

  #erroParaTexto = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro));

  #montarContexto = (assuntoNomes: string[], provaDescricao: string | null, materiaNome: string | null): string => {
    if (assuntoNomes.length > 0) {
      const materiaPrefixo = materiaNome ? `${materiaNome} — ` : "";
      return `${materiaPrefixo}${assuntoNomes.join(", ")}`;
    }
    const partes = [materiaNome, provaDescricao?.trim()].filter((parte): parte is string => !!parte);
    return partes.length > 0 ? partes.join(" — ") : "conteúdo geral da matéria";
  };

  /**
   * Assunto travado manualmente pelo professor (spec item 3) tem
   * prioridade absoluta — a IA nem roda classificação nesse caso. Só
   * quando a prova não tem nenhum `Assunto` travado é que a classificação
   * (restrita à lista da Matéria) entra em ação, e mesmo assim só pra
   * enriquecer o contexto desta geração — não grava um travamento novo.
   */
  #resolverAssuntos = async (
    provaAgendadaGUID: string,
    materiaGUID: string,
    provaDescricao: string | null,
    materiaNome: string | null
  ): Promise<ResolucaoAssunto> => {
    const assuntosDaMateria = await this.#assuntoDAO.findByMateria(materiaGUID);
    if (assuntosDaMateria.length === 0) return { nomes: [], subMateriaGlobalGUID: null };

    const assuntoGUIDsManuais = await this.#provaAssuntoDAO.findByProva(provaAgendadaGUID);
    if (assuntoGUIDsManuais.length > 0) {
      const assuntosTravados = assuntosDaMateria.filter((assunto) => assuntoGUIDsManuais.includes(assunto.AssuntoGUID));
      return {
        nomes: assuntosTravados.map((a) => a.Nome),
        subMateriaGlobalGUID: assuntosTravados.find((a) => a.SubMateriaGlobalGUID)?.SubMateriaGlobalGUID ?? null,
      };
    }

    const contextoBase = this.#montarContexto([], provaDescricao, materiaNome);
    const candidatos = assuntosDaMateria.map((assunto) => ({
      AssuntoGUID: assunto.AssuntoGUID,
      Nome: assunto.Nome,
    }));

    try {
      const assuntoClassificadoGUID = await getClassificacaoAssuntoAgent().classificar(contextoBase, candidatos);
      if (!assuntoClassificadoGUID) return { nomes: [], subMateriaGlobalGUID: null };

      const assunto = assuntosDaMateria.find((a) => a.AssuntoGUID === assuntoClassificadoGUID);
      return {
        nomes: assunto ? [assunto.Nome] : [],
        subMateriaGlobalGUID: assunto?.SubMateriaGlobalGUID ?? null,
      };
    } catch (error) {
      console.warn("🟡 ProvaAgendadaRecomendacaoService: classificação de assunto falhou, seguindo sem assunto:", error);
      return { nomes: [], subMateriaGlobalGUID: null };
    }
  };

  /**
   * Página de livro (spec item 7-9): busca determinística em `TextoExtraido`
   * já revisado (guardrail §7 — nunca geração livre sobre conteúdo de
   * página). Sem capítulo referenciado, ou sem nenhuma página revisada
   * ainda na faixa, a peça simplesmente não aparece.
   */
  #coletarPaginaLivro = async (
    materialDidaticoCapituloGUID: string | null
  ): Promise<{ fonteTexto: FonteTexto | null; paginaLivro: RecomendacaoPaginaLivro | null }> => {
    if (!materialDidaticoCapituloGUID) {
      return { fonteTexto: null, paginaLivro: null };
    }

    const capitulo = await this.#materialDidaticoCapituloDAO.findById(materialDidaticoCapituloGUID);
    if (!capitulo) return { fonteTexto: null, paginaLivro: null };

    const material = await this.#materialDidaticoDAO.findById(capitulo.MaterialDidaticoGUID);
    if (!material) return { fonteTexto: null, paginaLivro: null };

    const paginaLivro: RecomendacaoPaginaLivro = {
      materialDidaticoGUID: material.MaterialDidaticoGUID,
      materialDidaticoTitulo: material.Titulo,
      capituloGUID: capitulo.MaterialDidaticoCapituloGUID,
      capituloTitulo: capitulo.Titulo,
      paginaInicio: capitulo.PaginaInicio,
      paginaFim: capitulo.PaginaFim,
    };

    const paginasRevisadas = await this.#materialDidaticoPaginaDAO.findRevisadasNaFaixa(
      capitulo.MaterialDidaticoGUID,
      capitulo.PaginaInicio,
      capitulo.PaginaFim
    );

    if (paginasRevisadas.length === 0) {
      // Card de página de livro ainda aparece (referência é determinística,
      // não depende de IA) mesmo sem texto pra alimentar o resumo.
      return { fonteTexto: null, paginaLivro };
    }

    const texto = paginasRevisadas.map((p) => p.TextoExtraido).filter(Boolean).join("\n\n");
    const rotulo = `${material.Titulo} — ${capitulo.Titulo}`;

    return {
      fonteTexto: { guid: capitulo.MaterialDidaticoCapituloGUID, rotulo, texto },
      paginaLivro,
    };
  };

  /**
   * Banco de questões (spec item 12): só verifica existência — sem chamada
   * de LLM. Sem `SubMateriaGlobal` mapeada, ou sem nenhuma `QuestaoBanco`
   * pra ela, o botão "Praticar" simplesmente não aparece (mesmo guardrail
   * de fallback silencioso).
   */
  #resolverSubMateriaComQuestoes = async (subMateriaGlobalGUID: string | null): Promise<string | null> => {
    if (!subMateriaGlobalGUID) return null;

    try {
      const existe = await getQuestaoBancoService().existeParaSubMateria(subMateriaGlobalGUID);
      return existe ? subMateriaGlobalGUID : null;
    } catch (error) {
      console.warn("🟡 ProvaAgendadaRecomendacaoService: verificação de banco de questões falhou:", error);
      return null;
    }
  };

  /**
   * Coleta `Conteudo` do tipo "texto" pra usar como fonte do resumo —
   * categoria (união entre turmas da prova) como sinal primário, com
   * fallback pra proximidade temporal quando nenhuma turma usa categoria
   * (spec item 4).
   */
  #coletarConteudoRelacionado = async (
    provaAgendadaGUID: string,
    materiaGUID: string,
    provaData: Date
  ): Promise<{ fontesTexto: FonteTexto[]; fontesUsadas: RecomendacaoFonte[] }> => {
    const atribuicoes = await this.#provaTurmaDAO.findByProva(provaAgendadaGUID);
    const categoriasGUID = [
      ...new Set(atribuicoes.map((a) => a.CategoriaGUID).filter((c): c is string => !!c)),
    ];

    let conteudoGUIDs: string[] = [];

    if (categoriasGUID.length > 0) {
      const conteudoTurmas = await this.#conteudoTurmaDAO.findByCategorias(categoriasGUID);
      conteudoGUIDs = [...new Set(conteudoTurmas.map((ct) => ct.ConteudoGUID))];
    }

    if (conteudoGUIDs.length === 0) {
      // Fallback de proximidade temporal (spec item 4) — precisa ficar restrito
      // às turmas desta prova, senão vaza Conteudo de outras turmas da mesma
      // Matéria (quebra a garantia de "grounded no que foi postado pra essa turma").
      const turmasGUID = [...new Set(atribuicoes.map((a) => a.TurmaGUID).filter((t): t is string => !!t))];
      const conteudoTurmasPorTurma = await Promise.all(
        turmasGUID.map((turmaGUID) => this.#conteudoTurmaDAO.findByTurma(turmaGUID))
      );
      const conteudoGUIDsDaTurma = new Set(
        conteudoTurmasPorTurma.flat().map((ct) => ct.ConteudoGUID)
      );

      const todosConteudos = await this.#conteudoDAO.findAll({ MateriaGUID: materiaGUID });
      conteudoGUIDs = todosConteudos
        .filter((c) => conteudoGUIDsDaTurma.has(c.ConteudoGUID))
        .slice()
        .sort(
          (a, b) =>
            Math.abs(a.ConteudoDataPublicacao.getTime() - provaData.getTime()) -
            Math.abs(b.ConteudoDataPublicacao.getTime() - provaData.getTime())
        )
        .slice(0, MAX_CONTEUDOS_FALLBACK_TEMPORAL)
        .map((c) => c.ConteudoGUID);
    }

    const fontesTexto: FonteTexto[] = [];
    const fontesUsadas: RecomendacaoFonte[] = [];

    for (const conteudoGUID of conteudoGUIDs) {
      const conteudo = await this.#conteudoDAO.findById(conteudoGUID);
      if (!conteudo || conteudo.ConteudoTipo !== "texto") continue;

      const conteudoTexto = await this.#conteudoTextoDAO.findByConteudo(conteudoGUID);
      const textoLimpo = conteudoTexto?.ConteudoHtml ? this.#htmlParaTextoPlano(conteudoTexto.ConteudoHtml) : "";
      if (!textoLimpo) continue;

      const rotulo = conteudo.ConteudoTitulo || `Conteúdo de ${conteudo.ConteudoDataPublicacao.toLocaleDateString("pt-BR")}`;
      fontesTexto.push({ guid: conteudoGUID, rotulo, texto: textoLimpo });
      fontesUsadas.push({ tipo: "Conteudo", guid: conteudoGUID, rotulo });
    }

    return { fontesTexto, fontesUsadas };
  };

  #htmlParaTextoPlano = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };
}

/**
 * Singleton leve, mesmo padrão de `getNotificacaoService()`/`getAuditoriaService()`
 * — hook transversal chamado a partir de `ProvaAgendadaService.criarProva`/
 * `.atualizarProva` sem precisar alterar a injeção manual de dependências
 * daquele router (`routes/provaagendada.routes.ts`).
 */
let instanciaSingleton: ProvaAgendadaRecomendacaoService | null = null;

export function getProvaAgendadaRecomendacaoService(): ProvaAgendadaRecomendacaoService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new ProvaAgendadaRecomendacaoService(
      new ProvaAgendadaRecomendacaoDAO(database),
      new ProvaAgendadaDAO(database),
      new ProvaAgendadaTurmaDAO(database),
      new MateriaDAO(database),
      new ConteudoDAO(database),
      new ConteudoTurmaDAO(database),
      new ConteudoTextoDAO(database),
      new AssuntoDAO(database),
      new ProvaAgendadaAssuntoDAO(database),
      new MaterialDidaticoCapituloDAO(database),
      new MaterialDidaticoDAO(database),
      new MaterialDidaticoPaginaDAO(database)
    );
  }
  return instanciaSingleton;
}
