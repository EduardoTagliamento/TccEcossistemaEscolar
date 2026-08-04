import { v4 as uuidv4 } from "uuid";
import MaterialDidatico from "../entities/materialdidatico.model";
import MaterialDidaticoPagina from "../entities/materialdidaticopagina.model";
import MaterialDidaticoCapitulo from "../entities/materialdidaticocapitulo.model";
import { MaterialDidaticoDAO } from "../repositories/materialdidatico.repository";
import { MaterialDidaticoPaginaDAO } from "../repositories/materialdidaticopagina.repository";
import { MaterialDidaticoCapituloDAO } from "../repositories/materialdidaticocapitulo.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import R2StorageService from "./r2storage.service";
import { getExtracaoPaginaAgent } from "../ai/agents/extracaoPaginaAgent";
import { getSumarioLivroAgent, CapituloSugerido } from "../ai/agents/sumarioLivroAgent";

export interface ArquivoUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Cadastro de livro didático, nível de Escola (spec item 7-9/§4.2 do plano).
 * Extração de texto roda assíncrona por página (fire-and-forget, mesmo
 * padrão de `ProvaAgendadaRecomendacaoService`); nenhuma página "vale" pra
 * grounding até revisão humana (spec item 10).
 */
export default class MaterialDidaticoService {
  #materialDAO: MaterialDidaticoDAO;
  #paginaDAO: MaterialDidaticoPaginaDAO;
  #capituloDAO: MaterialDidaticoCapituloDAO;
  #materiaDAO: MateriaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    materialDAODependency: MaterialDidaticoDAO,
    paginaDAODependency: MaterialDidaticoPaginaDAO,
    capituloDAODependency: MaterialDidaticoCapituloDAO,
    materiaDAODependency: MateriaDAO,
    escolaxUsuarioxFuncaoDAODependency: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  MaterialDidaticoService.constructor()");
    this.#materialDAO = materialDAODependency;
    this.#paginaDAO = paginaDAODependency;
    this.#capituloDAO = capituloDAODependency;
    this.#materiaDAO = materiaDAODependency;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAODependency;
  }

  /** Cadastro do livro é fluxo de Direção/Coordenação (não passa pela tela de Matérias, que eles não acessam). */
  #validarPermissaoEscrita = async (escolaGUID: string, usuarioCPF: string): Promise<void> => {
    const coordenacao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(usuarioCPF, escolaGUID, 1);
    if (coordenacao && coordenacao.Status === "Ativo") return;

    const direcao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(usuarioCPF, escolaGUID, 6);
    if (direcao && direcao.Status === "Ativo") return;

    throw new ErrorResponse(403, "Sem permissão", {
      message: "Só Coordenação ou Direção podem cadastrar/gerenciar material didático.",
    });
  };

  cadastrarLivro = async (escolaGUID: string, titulo: string, usuarioCPF: string): Promise<MaterialDidatico> => {
    console.log("🟣 MaterialDidaticoService.cadastrarLivro()");

    await this.#validarPermissaoEscrita(escolaGUID, usuarioCPF);

    const material = new MaterialDidatico();
    material.MaterialDidaticoGUID = uuidv4();
    material.EscolaGUID = escolaGUID;
    material.Titulo = titulo;
    material.CriadoPorCPF = usuarioCPF;

    await this.#materialDAO.create(material);
    return material;
  };

  listarLivros = async (escolaGUID: string): Promise<MaterialDidatico[]> => {
    console.log("🟣 MaterialDidaticoService.listarLivros()");
    return this.#materialDAO.findByEscola(escolaGUID);
  };

  /** Livros que têm pelo menos um capítulo da matéria — pro professor escolher "qual" livro ao referenciar página (spec item 9). */
  listarLivrosPorMateria = async (materiaGUID: string): Promise<MaterialDidatico[]> => {
    console.log("🟣 MaterialDidaticoService.listarLivrosPorMateria()");

    const materialGUIDs = await this.#capituloDAO.findMaterialGUIDsPorMateria(materiaGUID);
    const livros = await Promise.all(materialGUIDs.map((guid) => this.#materialDAO.findById(guid)));
    return livros.filter((l): l is MaterialDidatico => l !== null);
  };

  /**
   * Upload de N páginas (imagens) — sobem pro R2, viram linhas
   * `materialdidaticopagina` com `NumeroPagina` sequencial (continuando a
   * partir da última já cadastrada), e disparam extração assíncrona cada
   * uma (nunca bloqueia a resposta do upload).
   */
  uploadPaginas = async (
    materialDidaticoGUID: string,
    arquivos: ArquivoUpload[],
    usuarioCPF: string
  ): Promise<MaterialDidaticoPagina[]> => {
    console.log("🟣 MaterialDidaticoService.uploadPaginas()");

    const material = await this.#materialDAO.findById(materialDidaticoGUID);
    if (!material) {
      throw new ErrorResponse(404, "Material didático não encontrado", {
        message: `Não existe material didático com id ${materialDidaticoGUID}`,
      });
    }
    await this.#validarPermissaoEscrita(material.EscolaGUID, usuarioCPF);

    if (arquivos.length === 0) {
      throw new ErrorResponse(400, "Nenhum arquivo enviado", {
        message: "Envie ao menos uma página (imagem).",
      });
    }

    const existentes = await this.#paginaDAO.findByMaterial(materialDidaticoGUID);
    let proximoNumero = existentes.reduce((max, p) => Math.max(max, p.NumeroPagina), 0) + 1;

    const paginasCriadas: MaterialDidaticoPagina[] = [];

    for (const arquivo of arquivos) {
      const chave = `materialdidatico/${materialDidaticoGUID}/pagina-${proximoNumero}-${Date.now()}.${this.#extensaoPorMime(arquivo.mimetype)}`;
      const url = await R2StorageService.upload(chave, arquivo.buffer, arquivo.mimetype);

      const pagina = new MaterialDidaticoPagina();
      pagina.MaterialDidaticoPaginaGUID = uuidv4();
      pagina.MaterialDidaticoGUID = materialDidaticoGUID;
      pagina.NumeroPagina = proximoNumero;
      pagina.ArquivoUrl = url;
      pagina.StatusExtracao = "Pendente";

      await this.#paginaDAO.create(pagina);
      paginasCriadas.push(pagina);

      void this.#extrairTextoPagina(pagina.MaterialDidaticoPaginaGUID, arquivo.buffer, arquivo.mimetype).catch(
        (error) => {
          console.error(`🔴 MaterialDidaticoService: extração da página ${pagina.MaterialDidaticoPaginaGUID} falhou:`, error);
        }
      );

      proximoNumero++;
    }

    return paginasCriadas;
  };

  #extrairTextoPagina = async (paginaGUID: string, buffer: Buffer, mimeType: string): Promise<void> => {
    try {
      const texto = await getExtracaoPaginaAgent().extrairTexto(buffer.toString("base64"), mimeType);
      await this.#paginaDAO.atualizarExtracao(paginaGUID, {
        TextoExtraido: texto,
        StatusExtracao: "Concluida",
      });
    } catch (error) {
      await this.#paginaDAO.atualizarExtracao(paginaGUID, { TextoExtraido: null, StatusExtracao: "Falhou" });
      throw error;
    }
  };

  #extensaoPorMime = (mimeType: string): string => {
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    return "jpg";
  };

  listarPaginas = async (materialDidaticoGUID: string): Promise<MaterialDidaticoPagina[]> => {
    console.log("🟣 MaterialDidaticoService.listarPaginas()");
    return this.#paginaDAO.findByMaterial(materialDidaticoGUID);
  };

  /**
   * Revisão humana obrigatória (spec item 10) — só depois disso a página
   * "vale" oficialmente como fonte de grounding. `textoRevisado` é o texto
   * final (o revisor pode corrigir o que a extração automática errou).
   */
  revisarPagina = async (paginaGUID: string, usuarioCPF: string, textoRevisado: string): Promise<void> => {
    console.log("🟣 MaterialDidaticoService.revisarPagina()");

    const pagina = await this.#paginaDAO.findById(paginaGUID);
    if (!pagina) {
      throw new ErrorResponse(404, "Página não encontrada", {
        message: `Não existe página com id ${paginaGUID}`,
      });
    }

    const material = await this.#materialDAO.findById(pagina.MaterialDidaticoGUID);
    if (material) {
      await this.#validarPermissaoEscrita(material.EscolaGUID, usuarioCPF);
    }

    if (!textoRevisado || !textoRevisado.trim()) {
      throw new ErrorResponse(400, "Texto revisado vazio", {
        message: "Informe o texto final da página (pode ser igual ao extraído, se estiver correto).",
      });
    }

    await this.#paginaDAO.revisar(paginaGUID, usuarioCPF, textoRevisado.trim());
  };

  /**
   * Sugestão de capítulos via IA (spec §4/item 19) — SÓ sugestão, nunca
   * grava nada sozinha; quem cadastrou o livro confirma/edita via
   * `criarCapitulo` antes de qualquer capítulo "valer".
   */
  sugerirCapitulos = async (materialDidaticoGUID: string): Promise<CapituloSugerido[]> => {
    console.log("🟣 MaterialDidaticoService.sugerirCapitulos()");

    const material = await this.#materialDAO.findById(materialDidaticoGUID);
    if (!material) {
      throw new ErrorResponse(404, "Material didático não encontrado", {
        message: `Não existe material didático com id ${materialDidaticoGUID}`,
      });
    }

    const paginas = await this.#paginaDAO.findByMaterial(materialDidaticoGUID);
    const paginasComTexto = paginas.filter((p) => p.TextoExtraido);
    if (paginasComTexto.length === 0) {
      return [];
    }

    const textoConcatenado = paginasComTexto
      .map((p) => `[[PAGINA ${p.NumeroPagina}]]\n${p.TextoExtraido}`)
      .join("\n\n");

    const materiasDaEscola = await this.#materiaDAO.findAll({ EscolaGUID: material.EscolaGUID });
    const candidatas = materiasDaEscola
      .filter((m) => m.MateriaNome)
      .map((m) => ({ MateriaGUID: m.MateriaGUID, Nome: m.MateriaNome as string }));

    return getSumarioLivroAgent().sugerirCapitulos(textoConcatenado, candidatas);
  };

  criarCapitulo = async (
    data: { MaterialDidaticoGUID: string; MateriaGUID: string; Titulo: string; PaginaInicio: number; PaginaFim: number; AssuntoGUID?: string | null },
    usuarioCPF: string
  ): Promise<MaterialDidaticoCapitulo> => {
    console.log("🟣 MaterialDidaticoService.criarCapitulo()");

    const material = await this.#materialDAO.findById(data.MaterialDidaticoGUID);
    if (!material) {
      throw new ErrorResponse(404, "Material didático não encontrado", {
        message: `Não existe material didático com id ${data.MaterialDidaticoGUID}`,
      });
    }
    await this.#validarPermissaoEscrita(material.EscolaGUID, usuarioCPF);

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia || materia.EscolaGUID !== material.EscolaGUID) {
      throw new ErrorResponse(400, "Matéria inválida", {
        message: "A matéria informada não existe ou não pertence a esta escola.",
      });
    }

    const capitulo = new MaterialDidaticoCapitulo();
    capitulo.MaterialDidaticoCapituloGUID = uuidv4();
    capitulo.MaterialDidaticoGUID = data.MaterialDidaticoGUID;
    capitulo.MateriaGUID = data.MateriaGUID;
    capitulo.Titulo = data.Titulo;
    capitulo.PaginaInicio = data.PaginaInicio;
    capitulo.PaginaFim = data.PaginaFim;
    capitulo.AssuntoGUID = data.AssuntoGUID ?? null;
    capitulo.validar();

    await this.#capituloDAO.create(capitulo);
    return capitulo;
  };

  listarCapitulos = async (materialDidaticoGUID: string): Promise<MaterialDidaticoCapitulo[]> => {
    console.log("🟣 MaterialDidaticoService.listarCapitulos()");
    return this.#capituloDAO.findByMaterial(materialDidaticoGUID);
  };

  /** Capítulos de UM livro específico que pertencem à matéria — 2º passo do fluxo "escolher livro → escolher capítulo" (spec §6). */
  listarCapitulosPorLivroEMateria = async (
    materialDidaticoGUID: string,
    materiaGUID: string
  ): Promise<MaterialDidaticoCapitulo[]> => {
    console.log("🟣 MaterialDidaticoService.listarCapitulosPorLivroEMateria()");
    return this.#capituloDAO.findByMaterialEMateria(materialDidaticoGUID, materiaGUID);
  };

  /** Texto já revisado das páginas de um capítulo — busca determinística, nunca geração (guardrail §7). */
  buscarTextoRevisadoDoCapitulo = async (capituloGUID: string): Promise<{ capitulo: MaterialDidaticoCapitulo; material: MaterialDidatico; textoConcatenado: string | null } | null> => {
    console.log("🟣 MaterialDidaticoService.buscarTextoRevisadoDoCapitulo()");

    const capitulo = await this.#capituloDAO.findById(capituloGUID);
    if (!capitulo) return null;

    const material = await this.#materialDAO.findById(capitulo.MaterialDidaticoGUID);
    if (!material) return null;

    const paginasRevisadas = await this.#paginaDAO.findRevisadasNaFaixa(
      capitulo.MaterialDidaticoGUID,
      capitulo.PaginaInicio,
      capitulo.PaginaFim
    );

    const textoConcatenado =
      paginasRevisadas.length > 0
        ? paginasRevisadas.map((p) => p.TextoExtraido).filter(Boolean).join("\n\n")
        : null;

    return { capitulo, material, textoConcatenado };
  };
}
