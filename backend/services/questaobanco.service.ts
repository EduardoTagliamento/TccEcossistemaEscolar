import { gerarGUID } from "../utils/helpers/guid.helper";
import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade, QuestaoBancoStatus } from "../entities/questaobanco.model";
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
  Status: QuestaoBancoStatus;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  Alternativas: AlternativaDTO[];
  Anexos: Anexo[];
  CreatedAt: string | null;
}

export interface ContagemQuestoesDTO {
  PorMateria: { MateriaGlobalGUID: string; Quantidade: number }[];
  PorSubMateria: { SubMateriaGlobalGUID: string; Quantidade: number }[];
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
 * Edição via tela de validação (admin-plataforma) — tudo opcional, atualiza só o que vier.
 * `Alternativas`/`AnexoGUIDs`, quando presentes, SUBSTITUEM o conjunto inteiro (não faz merge
 * incremental) — mais simples e previsível pro formulário de edição (manda sempre o estado atual
 * completo da tela, igual update de formulário React comum).
 */
export interface QuestaoBancoUpdateDTO {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  VestibularGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  Enunciado?: string;
  VideoResolucaoUrl?: string | null;
  Alternativas?: { Texto: string; Correta: boolean; AnexoGUIDs?: string[] }[];
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

  /** Edita campos simples/alternativas/anexos de uma questão já existente — usado pela tela de
   * validação (admin-plataforma) pra corrigir enunciado/alternativas/imagem antes de validar.
   * NÃO mexe em Status (ver `validarQuestao`) — editar não valida sozinho, é uma ação separada. */
  atualizarQuestao = async (guid: string, data: QuestaoBancoUpdateDTO, usuarioGUID: string): Promise<QuestaoBancoDTO> => {
    console.log("🟣 QuestaoBancoService.atualizarQuestao()");

    const questaoAtual = await this.#questaoDAO.findById(guid);
    if (!questaoAtual) {
      throw new ErrorResponse(404, "Questão não encontrada");
    }

    if (data.Alternativas) {
      const corretas = data.Alternativas.filter((a) => a.Correta);
      if (data.Alternativas.length < 2 || corretas.length !== 1) {
        throw new ErrorResponse(400, "Alternativas inválidas", {
          message: "Pelo menos 2 alternativas, exatamente uma marcada como correta.",
        });
      }
    }

    // String vazia (não `undefined`) nos GUIDs passa pelo filtro de "campo não informado" do
    // `update()` genérico e ia direto pro UPDATE — só estourava na constraint de FK do MySQL,
    // bem mais tarde e mais confuso do que validar aqui. Caso real confirmado em produção.
    for (const [campo, valor] of Object.entries({
      MateriaGlobalGUID: data.MateriaGlobalGUID,
      SubMateriaGlobalGUID: data.SubMateriaGlobalGUID,
      VestibularGUID: data.VestibularGUID,
    })) {
      if (valor !== undefined && !valor.trim()) {
        throw new ErrorResponse(400, "Campo inválido", { message: `${campo} não pode ser vazio.` });
      }
    }

    await this.#questaoDAO.update(guid, {
      MateriaGlobalGUID: data.MateriaGlobalGUID,
      SubMateriaGlobalGUID: data.SubMateriaGlobalGUID,
      VestibularGUID: data.VestibularGUID,
      Dificuldade: data.Dificuldade,
      Enunciado: data.Enunciado,
      VideoResolucaoUrl: data.VideoResolucaoUrl,
    });

    if (data.Alternativas) {
      // Apaga e recria — mesmo padrão de `criarQuestao`. FK `ON DELETE CASCADE` já limpa
      // `relacaoanexosquestaobancoalternativa` das alternativas antigas de graça.
      await this.#alternativaDAO.deleteByQuestao(guid);
      const alternativas = data.Alternativas.map((a, indice) => {
        const alternativa = new QuestaoBancoAlternativa();
        alternativa.AlternativaGUID = gerarGUID();
        alternativa.QuestaoBancoGUID = guid;
        alternativa.AlternativaTexto = a.Texto;
        alternativa.AlternativaCorreta = a.Correta;
        alternativa.AlternativaOrdem = indice;
        return alternativa;
      });
      await this.#alternativaDAO.createBatch(alternativas);
      for (let i = 0; i < data.Alternativas.length; i++) {
        await this.vincularAnexos(data.Alternativas[i].AnexoGUIDs, usuarioGUID, (anexoGUID) =>
          this.#relacaoAnexosDAO.vincularAnexoQuestaoBancoAlternativa(anexoGUID, alternativas[i].AlternativaGUID)
        );
      }
    }

    if (data.AnexoGUIDs !== undefined) {
      // Substitui o conjunto inteiro: desvincula o que não está mais na lista, vincula o que é
      // novo — diff simples por GUID (sem precisar do GUID interno do vínculo).
      const atuais = await this.#relacaoAnexosDAO.findAnexosByQuestaoBanco(guid);
      const atuaisGUIDs = atuais.map((a) => a.AnexoGUID);
      const desejados = data.AnexoGUIDs;
      for (const anexoGUID of atuaisGUIDs) {
        if (!desejados.includes(anexoGUID)) {
          await this.#relacaoAnexosDAO.desvincularAnexoQuestaoBanco(anexoGUID, guid);
        }
      }
      await this.vincularAnexos(
        desejados.filter((g) => !atuaisGUIDs.includes(g)),
        usuarioGUID,
        (anexoGUID) => this.#relacaoAnexosDAO.vincularAnexoQuestaoBanco(anexoGUID, guid)
      );
    }

    return this.buscarQuestaoCompleta(guid);
  };

  /** Marca a questão como revisada/aprovada — única forma de ela passar a aparecer pro aluno
   * (ver `GET /api/questaobanco`, que só devolve Status='Validado'). Ação separada de
   * `atualizarQuestao` de propósito: o admin pode salvar edições várias vezes sem validar, e só
   * clica em "Validar" quando o estado atual já está bom. */
  validarQuestao = async (guid: string): Promise<QuestaoBancoDTO> => {
    console.log("🟣 QuestaoBancoService.validarQuestao()");

    const questao = await this.#questaoDAO.findById(guid);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada");
    }
    await this.#questaoDAO.update(guid, { Status: "Validado" });
    return this.buscarQuestaoCompleta(guid);
  };

  private buscarQuestaoCompleta = async (guid: string): Promise<QuestaoBancoDTO> => {
    const questao = await this.#questaoDAO.findById(guid);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada");
    }
    const alternativas = await this.#alternativaDAO.findByQuestao(guid);
    const anexosQuestao = await this.#relacaoAnexosDAO.findAnexosByQuestaoBanco(guid);
    const anexosAlternativas = await Promise.all(
      alternativas.map((a) => this.#relacaoAnexosDAO.findAnexosByQuestaoBancoAlternativa(a.AlternativaGUID))
    );
    return this.toDTO(questao, alternativas, anexosQuestao, anexosAlternativas);
  };

  excluirQuestao = async (guid: string): Promise<boolean> => {
    console.log("🟣 QuestaoBancoService.excluirQuestao()");

    await this.#alternativaDAO.deleteByQuestao(guid);
    return this.#questaoDAO.delete(guid);
  };

  existeParaSubMateria = async (subMateriaGlobalGUID: string): Promise<boolean> => {
    return this.#questaoDAO.existeParaSubMateria(subMateriaGlobalGUID);
  };

  /** Alimenta os selects de matéria/submatéria da tela de prática do aluno com "quantas
   * questões Validadas existem" — contagem por matéria é a soma das submatérias dela. */
  contarQuestoesValidadas = async (): Promise<ContagemQuestoesDTO> => {
    console.log("🟣 QuestaoBancoService.contarQuestoesValidadas()");

    const porSubMateria = await this.#questaoDAO.contarValidadasPorSubMateria();

    const porMateriaMapa = new Map<string, number>();
    for (const linha of porSubMateria) {
      porMateriaMapa.set(linha.MateriaGlobalGUID, (porMateriaMapa.get(linha.MateriaGlobalGUID) ?? 0) + linha.Quantidade);
    }

    return {
      PorMateria: Array.from(porMateriaMapa.entries()).map(([MateriaGlobalGUID, Quantidade]) => ({ MateriaGlobalGUID, Quantidade })),
      PorSubMateria: porSubMateria.map(({ SubMateriaGlobalGUID, Quantidade }) => ({ SubMateriaGlobalGUID, Quantidade })),
    };
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
      Status: questao.Status,
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
