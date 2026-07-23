import { v4 as uuidv4 } from "uuid";
import path from "path";
import sanitizeHtml from "sanitize-html";
import ErrorResponse from "../utils/ErrorResponse";
import Conteudo, { ConteudoTipo } from "../entities/conteudo.model";
import ConteudoTurma from "../entities/conteudoturma.model";
import ConteudoCronometrado, { ConteudoCronometradoOrigem } from "../entities/conteudocronometrado.model";
import ConteudoTexto from "../entities/conteudotexto.model";
import ConteudoPaginadoArquivo from "../entities/conteudopaginadoarquivo.model";
import { ConteudoDAO, ConteudoFilters } from "../repositories/conteudo.repository";
import ConteudoTurmaDAO from "../repositories/conteudoturma.repository";
import { ConteudoCronometradoDAO } from "../repositories/conteudocronometrado.repository";
import { ConteudoTextoDAO } from "../repositories/conteudotexto.repository";
import { ConteudoPaginadoArquivoDAO } from "../repositories/conteudopaginadoarquivo.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { CategoriaConteudoDAO } from "../repositories/categoriaconteudo.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import R2StorageService from "./r2storage.service";
import { RowDataPacket } from "mysql2";
import { pool } from "../database/mysql";
import { getNotificacaoService } from "./notificacao.service";
import { getAuditoriaService } from "./auditoria.service";

export interface ConteudoTurmaDTO {
  TurmaGUID: string;
  ConteudoDataPublicacao: string; // efetiva: override ?? compartilhada
}

export interface ConteudoDTO {
  ConteudoGUID: string;
  MateriaGUID: string;
  UsuarioCPF: string;
  CategoriaGUID: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao: string | null;
  ConteudoDataPublicacao: string;
  Turmas: ConteudoTurmaDTO[];
  Cronometrado?: {
    OrigemTipo: ConteudoCronometradoOrigem;
    ArquivoUrl: string | null;
    LinkUrl: string | null;
    DuracaoSegundos: number | null;
    ArquivoMimeType: string | null;
  };
  Texto?: {
    ConteudoHtml: string;
  };
  Paginado?: {
    Arquivos: { ConteudoPaginadoArquivoGUID: string; Ordem: number; ArquivoUrl: string; ArquivoMimeType: string }[];
  };
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface ConteudoCreateDTO {
  MateriaGUID: string;
  /** @deprecated Categoria agora é por turma — ver CategoriasPorTurma. Mantido só por compatibilidade, ignorado na criação. */
  CategoriaGUID?: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao?: string;
  TurmasGUID: string[];
  ConteudoDataPublicacao: Date;
  DatasPorTurma?: Record<string, Date>;
  /** Categoria (por turma) escolhida pra cada linha de distribuição — chave é TurmaGUID. */
  CategoriasPorTurma?: Record<string, string>;

  // tipo "cronometrado"
  OrigemTipo?: ConteudoCronometradoOrigem;
  LinkUrl?: string;

  // tipo "texto"
  ConteudoHtml?: string;
}

export interface ConteudoArquivos {
  arquivoCronometrado?: Express.Multer.File;
  arquivosPaginado?: Express.Multer.File[];
}

const SANITIZE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "i", "em", "u", "a", "p", "br", "span", "ul", "ol", "li", "h1", "h2", "h3"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["style"],
  },
  allowedStyles: {
    span: {
      "font-size": [/^\d+(?:px|em|rem|%)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export default class ConteudoService {
  #conteudoDAO: ConteudoDAO;
  #conteudoTurmaDAO: ConteudoTurmaDAO;
  #cronometradoDAO: ConteudoCronometradoDAO;
  #textoDAO: ConteudoTextoDAO;
  #paginadoDAO: ConteudoPaginadoArquivoDAO;
  #materiaDAO: MateriaDAO;
  #turmaDAO: TurmaDAO;
  #categoriaDAO: CategoriaConteudoDAO;
  #matProfTurDAO: MaterialProfessorTurmaDAO;

  constructor(
    conteudoDAO: ConteudoDAO,
    conteudoTurmaDAO: ConteudoTurmaDAO,
    cronometradoDAO: ConteudoCronometradoDAO,
    textoDAO: ConteudoTextoDAO,
    paginadoDAO: ConteudoPaginadoArquivoDAO,
    materiaDAO: MateriaDAO,
    turmaDAO: TurmaDAO,
    categoriaDAO: CategoriaConteudoDAO,
    matProfTurDAO: MaterialProfessorTurmaDAO
  ) {
    console.log("⬆️  ConteudoService.constructor()");
    this.#conteudoDAO = conteudoDAO;
    this.#conteudoTurmaDAO = conteudoTurmaDAO;
    this.#cronometradoDAO = cronometradoDAO;
    this.#textoDAO = textoDAO;
    this.#paginadoDAO = paginadoDAO;
    this.#materiaDAO = materiaDAO;
    this.#turmaDAO = turmaDAO;
    this.#categoriaDAO = categoriaDAO;
    this.#matProfTurDAO = matProfTurDAO;
  }

  criarConteudo = async (
    data: ConteudoCreateDTO,
    arquivos: ConteudoArquivos,
    usuarioCPF: string
  ): Promise<ConteudoDTO> => {
    console.log("🟣 ConteudoService.criarConteudo()");

    if (!data.TurmasGUID || data.TurmasGUID.length === 0) {
      throw new ErrorResponse(400, "Nenhuma turma selecionada", {
        message: "É necessário selecionar pelo menos uma turma.",
      });
    }

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    // Validar que o professor leciona essa matéria em TODAS as turmas escolhidas
    let escolaGUID: string | null = null;
    for (const turmaGUID of data.TurmasGUID) {
      const turma = await this.#turmaDAO.findById(turmaGUID);
      if (!turma) {
        throw new ErrorResponse(404, "Turma não encontrada", {
          message: `Não existe turma com id ${turmaGUID}`,
        });
      }
      if (!escolaGUID) {
        escolaGUID = turma.EscolaGUID;
      }

      const alocacao = await this.#matProfTurDAO.findByMateriaTurmaProfessor(
        data.MateriaGUID,
        turmaGUID,
        usuarioCPF
      );
      if (!alocacao || alocacao.AlocacaoStatus !== "Ativa") {
        throw new ErrorResponse(403, "Sem permissão", {
          message: `Você não leciona esta matéria na turma ${turma.TurmaSerie} ${turma.TurmaNome}.`,
        });
      }
    }

    // Validar categorias por turma (se fornecidas) — cada uma deve pertencer
    // a este professor + matéria + à MESMA turma daquela linha de distribuição
    if (data.CategoriasPorTurma) {
      for (const [turmaGUID, categoriaGUID] of Object.entries(data.CategoriasPorTurma)) {
        const categoria = await this.#categoriaDAO.findById(categoriaGUID);
        if (
          !categoria ||
          categoria.UsuarioCPF !== usuarioCPF ||
          categoria.MateriaGUID !== data.MateriaGUID ||
          categoria.TurmaGUID !== turmaGUID
        ) {
          throw new ErrorResponse(400, "Categoria inválida", {
            message: `A categoria informada para a turma ${turmaGUID} não existe ou não pertence a você/esta matéria/turma.`,
          });
        }
      }
    }

    // Data "base" compartilhada: menor data entre os overrides por turma (se houver)
    const dataBase = data.DatasPorTurma && Object.keys(data.DatasPorTurma).length > 0
      ? new Date(Math.min(...Object.values(data.DatasPorTurma).map((d) => new Date(d).getTime())))
      : new Date(data.ConteudoDataPublicacao);

    if (isNaN(dataBase.getTime())) {
      throw new ErrorResponse(400, "Data de publicação inválida");
    }

    const conteudo = new Conteudo();
    conteudo.ConteudoGUID = uuidv4();
    conteudo.MateriaGUID = data.MateriaGUID;
    conteudo.UsuarioCPF = usuarioCPF;
    // Categoria agora é por turma (ConteudoTurma.CategoriaGUID) — este campo
    // no Conteudo em si fica sempre null pra conteúdo novo (ver DTO acima).
    conteudo.CategoriaGUID = null;
    conteudo.ConteudoTitulo = data.ConteudoTitulo;
    conteudo.ConteudoTipo = data.ConteudoTipo;
    conteudo.ConteudoDescricao = data.ConteudoDescricao || null;
    conteudo.ConteudoDataPublicacao = dataBase;

    await this.#conteudoDAO.create(conteudo);

    // Atribuições de turma
    const atribuicoes = data.TurmasGUID.map((turmaGUID) => {
      const atribuicao = new ConteudoTurma();
      atribuicao.ConteudoTurmaGUID = uuidv4();
      atribuicao.ConteudoGUID = conteudo.ConteudoGUID;
      atribuicao.TurmaGUID = turmaGUID;
      atribuicao.ConteudoDataPublicacaoTurma = data.DatasPorTurma?.[turmaGUID]
        ? new Date(data.DatasPorTurma[turmaGUID])
        : null;
      atribuicao.CategoriaGUID = data.CategoriasPorTurma?.[turmaGUID] || null;
      atribuicao.validar();
      return atribuicao;
    });
    await this.#conteudoTurmaDAO.createBatch(atribuicoes);

    // Dados específicos por tipo
    if (data.ConteudoTipo === "cronometrado") {
      await this.criarCronometrado(conteudo.ConteudoGUID, data, arquivos.arquivoCronometrado);
    } else if (data.ConteudoTipo === "texto") {
      await this.criarTexto(conteudo.ConteudoGUID, data);
    } else {
      await this.criarPaginado(conteudo.ConteudoGUID, arquivos.arquivosPaginado || []);
    }

    if (escolaGUID) {
      this.#notificarMateriaPostada(conteudo, data.TurmasGUID, escolaGUID).catch((error) => {
        console.error("🔴 ConteudoService.#notificarMateriaPostada() falhou:", error);
      });

      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUID,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Create",
        EntidadeTipo: "conteudo",
        EntidadeGUID: conteudo.ConteudoGUID,
        EntidadeDescricao: conteudo.ConteudoTitulo,
        CategoriaAuditoriaId: 2,
      });
    }

    return this.buscarConteudo(conteudo.ConteudoGUID);
  };

  /** Notifica os alunos matriculados nas turmas atribuídas (tipo `materia_postada`) */
  #notificarMateriaPostada = async (conteudo: Conteudo, turmasGUID: string[], escolaGUID: string): Promise<void> => {
    const placeholders = turmasGUID.map(() => "?").join(", ");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT UsuarioCPF FROM matricula WHERE TurmaGUID IN (${placeholders}) AND MatriculaStatus = 'Ativa'`,
      turmasGUID
    );
    const destinatarios = (rows as any[]).map((r) => r.UsuarioCPF);
    if (destinatarios.length === 0) return;

    await getNotificacaoService().disparar({
      tipoSlug: "materia_postada",
      destinatarios,
      escolaGUID,
      titulo: `Novo material: ${conteudo.ConteudoTitulo}`,
      conteudo: conteudo.ConteudoDescricao,
      entidadeTipo: "conteudo",
      entidadeGUID: conteudo.ConteudoGUID,
    });
  };

  private criarCronometrado = async (
    conteudoGUID: string,
    data: ConteudoCreateDTO,
    arquivo?: Express.Multer.File
  ): Promise<void> => {
    if (!data.OrigemTipo) {
      throw new ErrorResponse(400, "OrigemTipo é obrigatório para conteúdo cronometrado");
    }

    const cronometrado = new ConteudoCronometrado();
    cronometrado.ConteudoGUID = conteudoGUID;
    cronometrado.OrigemTipo = data.OrigemTipo;

    if (data.OrigemTipo === "upload") {
      if (!arquivo) {
        throw new ErrorResponse(400, "Arquivo obrigatório", {
          message: "Envie um arquivo de vídeo/áudio ou escolha a opção de link.",
        });
      }
      const ext = path.extname(arquivo.originalname);
      const chave = `conteudo/${conteudoGUID}/arquivo${ext}`;
      const url = await R2StorageService.upload(chave, arquivo.buffer, arquivo.mimetype);
      cronometrado.ArquivoUrl = url;
      cronometrado.ArquivoMimeType = arquivo.mimetype;
    } else {
      if (!data.LinkUrl) {
        throw new ErrorResponse(400, "LinkUrl é obrigatório", {
          message: "Informe o link do vídeo/áudio.",
        });
      }
      try {
        new URL(data.LinkUrl);
      } catch {
        throw new ErrorResponse(400, "LinkUrl inválido", { message: "Informe uma URL válida." });
      }
      cronometrado.LinkUrl = data.LinkUrl.trim();
    }

    cronometrado.validar();
    await this.#cronometradoDAO.create(cronometrado);
  };

  private criarTexto = async (conteudoGUID: string, data: ConteudoCreateDTO): Promise<void> => {
    if (!data.ConteudoHtml) {
      throw new ErrorResponse(400, "ConteudoHtml é obrigatório para conteúdo de texto");
    }

    const htmlSanitizado = sanitizeHtml(data.ConteudoHtml, SANITIZE_HTML_OPTIONS);
    if (!htmlSanitizado.trim()) {
      throw new ErrorResponse(400, "Conteúdo de texto vazio", {
        message: "O texto não pode ficar vazio após a formatação.",
      });
    }

    const texto = new ConteudoTexto();
    texto.ConteudoGUID = conteudoGUID;
    texto.ConteudoHtml = htmlSanitizado;
    texto.validar();

    await this.#textoDAO.create(texto);
  };

  private criarPaginado = async (conteudoGUID: string, arquivosRecebidos: Express.Multer.File[]): Promise<void> => {
    if (arquivosRecebidos.length === 0) {
      throw new ErrorResponse(400, "Nenhum arquivo enviado", {
        message: "Envie ao menos um arquivo (PDF/PPTX/DOCX ou imagens).",
      });
    }

    const arquivos: ConteudoPaginadoArquivo[] = [];
    for (let i = 0; i < arquivosRecebidos.length; i++) {
      const arquivoRecebido = arquivosRecebidos[i];
      const ext = path.extname(arquivoRecebido.originalname);
      const chave = `conteudo/${conteudoGUID}/pagina-${i + 1}${ext}`;
      const url = await R2StorageService.upload(chave, arquivoRecebido.buffer, arquivoRecebido.mimetype);

      const arquivo = new ConteudoPaginadoArquivo();
      arquivo.ConteudoPaginadoArquivoGUID = uuidv4();
      arquivo.ConteudoGUID = conteudoGUID;
      arquivo.Ordem = i + 1;
      arquivo.ArquivoUrl = url;
      arquivo.ArquivoMimeType = arquivoRecebido.mimetype;
      arquivo.validar();
      arquivos.push(arquivo);
    }

    await this.#paginadoDAO.createBatch(arquivos);
  };

  listarConteudos = async (filters: ConteudoFilters): Promise<ConteudoDTO[]> => {
    console.log("🟣 ConteudoService.listarConteudos()");

    const conteudos = await this.#conteudoDAO.findAll(filters);
    return Promise.all(conteudos.map((c) => this.montarDTO(c)));
  };

  buscarConteudo = async (guid: string): Promise<ConteudoDTO> => {
    console.log("🟣 ConteudoService.buscarConteudo()");

    const conteudo = await this.#conteudoDAO.findById(guid);
    if (!conteudo) {
      throw new ErrorResponse(404, "Conteúdo não encontrado", {
        message: `Não existe conteúdo com id ${guid}`,
      });
    }

    return this.montarDTO(conteudo);
  };

  excluirConteudo = async (guid: string, usuarioCPF: string): Promise<void> => {
    console.log("🟣 ConteudoService.excluirConteudo()");

    const conteudo = await this.#conteudoDAO.findById(guid);
    if (!conteudo) {
      throw new ErrorResponse(404, "Conteúdo não encontrado", {
        message: `Não existe conteúdo com id ${guid}`,
      });
    }

    if (conteudo.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode excluir conteúdos que você mesmo criou.",
      });
    }

    // Resolver EscolaGUID (via turma associada) antes de excluir — necessário pro registro de auditoria,
    // já que Conteudo não carrega EscolaGUID diretamente e o CASCADE apaga conteudoturma junto.
    let escolaGUIDParaAuditoria: string | null = null;
    const atribuicoesParaAuditoria = await this.#conteudoTurmaDAO.findByConteudo(guid);
    if (atribuicoesParaAuditoria.length > 0) {
      const turma = await this.#turmaDAO.findById(atribuicoesParaAuditoria[0].TurmaGUID);
      escolaGUIDParaAuditoria = turma?.EscolaGUID ?? null;
    }

    // Coletar URLs de arquivo antes de excluir os registros (para limpar o R2 depois)
    const urlsParaRemover: string[] = [];

    if (conteudo.ConteudoTipo === "cronometrado") {
      const cronometrado = await this.#cronometradoDAO.findByConteudo(guid);
      if (cronometrado?.ArquivoUrl) {
        urlsParaRemover.push(cronometrado.ArquivoUrl);
      }
    } else if (conteudo.ConteudoTipo === "paginado") {
      const arquivos = await this.#paginadoDAO.findByConteudo(guid);
      arquivos.forEach((a) => urlsParaRemover.push(a.ArquivoUrl));
    }

    // CASCADE no banco cuida das subtabelas e de conteudoturma
    await this.#conteudoDAO.delete(guid);

    if (escolaGUIDParaAuditoria) {
      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUIDParaAuditoria,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Delete",
        EntidadeTipo: "conteudo",
        EntidadeGUID: conteudo.ConteudoGUID,
        EntidadeDescricao: conteudo.ConteudoTitulo,
        CategoriaAuditoriaId: 2,
      });
    }

    // Remoção no R2 não bloqueia a resposta se falhar
    urlsParaRemover.forEach((url) => {
      R2StorageService.removeByUrl(url).catch((error) => {
        console.warn(`⚠️  Não foi possível remover arquivo de conteúdo do R2: ${url}`, error.message);
      });
    });
  };

  private montarDTO = async (conteudo: Conteudo): Promise<ConteudoDTO> => {
    const atribuicoes = await this.#conteudoTurmaDAO.findByConteudo(conteudo.ConteudoGUID);

    const dto: ConteudoDTO = {
      ConteudoGUID: conteudo.ConteudoGUID,
      MateriaGUID: conteudo.MateriaGUID,
      UsuarioCPF: conteudo.UsuarioCPF,
      CategoriaGUID: conteudo.CategoriaGUID,
      ConteudoTitulo: conteudo.ConteudoTitulo || "",
      ConteudoTipo: conteudo.ConteudoTipo,
      ConteudoDescricao: conteudo.ConteudoDescricao,
      ConteudoDataPublicacao: conteudo.ConteudoDataPublicacao.toISOString(),
      Turmas: atribuicoes.map((a) => ({
        TurmaGUID: a.TurmaGUID,
        ConteudoDataPublicacao: (a.ConteudoDataPublicacaoTurma ?? conteudo.ConteudoDataPublicacao).toISOString(),
      })),
      CreatedAt: conteudo.CreatedAt ? conteudo.CreatedAt.toISOString() : null,
      UpdatedAt: conteudo.UpdatedAt ? conteudo.UpdatedAt.toISOString() : null,
    };

    if (conteudo.ConteudoTipo === "cronometrado") {
      const cronometrado = await this.#cronometradoDAO.findByConteudo(conteudo.ConteudoGUID);
      if (cronometrado) {
        dto.Cronometrado = {
          OrigemTipo: cronometrado.OrigemTipo,
          ArquivoUrl: cronometrado.ArquivoUrl,
          LinkUrl: cronometrado.LinkUrl,
          DuracaoSegundos: cronometrado.DuracaoSegundos,
          ArquivoMimeType: cronometrado.ArquivoMimeType,
        };
      }
    } else if (conteudo.ConteudoTipo === "texto") {
      const texto = await this.#textoDAO.findByConteudo(conteudo.ConteudoGUID);
      if (texto) {
        dto.Texto = { ConteudoHtml: texto.ConteudoHtml };
      }
    } else {
      const arquivos = await this.#paginadoDAO.findByConteudo(conteudo.ConteudoGUID);
      dto.Paginado = {
        Arquivos: arquivos.map((a) => ({
          ConteudoPaginadoArquivoGUID: a.ConteudoPaginadoArquivoGUID,
          Ordem: a.Ordem,
          ArquivoUrl: a.ArquivoUrl,
          ArquivoMimeType: a.ArquivoMimeType,
        })),
      };
    }

    return dto;
  };
}
