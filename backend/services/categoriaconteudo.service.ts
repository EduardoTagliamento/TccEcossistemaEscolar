import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import CategoriaConteudo from "../entities/categoriaconteudo.model";
import { CategoriaConteudoDAO, CategoriaConteudoFilters } from "../repositories/categoriaconteudo.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { pool } from "../database/mysql";
import { RowDataPacket } from "mysql2";

export type ItemTipo =
  | "prova"
  | "tarefa_digital"
  | "tarefa_presencial"
  | "conteudo_video"
  | "conteudo_texto"
  | "conteudo_imagem";

export interface ItemCategoriaDTO {
  ItemGUID: string;
  Tipo: ItemTipo;
  Titulo: string;
  /** 0-100, ou null se ainda não há progresso/entrega/avaliação a mostrar */
  Percentual: number | null;
  /** estado da barra — resolvido aqui pra o frontend não precisar reimplementar a máquina de estado */
  Estado: "sem_progresso" | "parcial" | "concluido" | "atrasado" | "aguardando_avaliacao" | "avaliado";
  Nota: number | null;
  /** Só pra prova: ProvaAgendadaTurmaGUID (necessário pra registrar visualização/pendência) */
  RefTurmaGUID?: string;
}

export interface CategoriaCompletaDTO {
  CategoriaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  Itens: ItemCategoriaDTO[];
}

export interface CategoriaConteudoDTO {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  TurmaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CategoriaConteudoCreateDTO {
  MateriaGUID: string;
  TurmaGUID: string;
  CategoriaNome: string;
}

export default class CategoriaConteudoService {
  #categoriaDAO: CategoriaConteudoDAO;
  #materiaDAO: MateriaDAO;
  #turmaDAO: TurmaDAO;
  #matriculaDAO?: MatriculaDAO;

  constructor(categoriaDAO: CategoriaConteudoDAO, materiaDAO: MateriaDAO, turmaDAO: TurmaDAO, matriculaDAO?: MatriculaDAO) {
    console.log("⬆️  CategoriaConteudoService.constructor()");
    this.#categoriaDAO = categoriaDAO;
    this.#materiaDAO = materiaDAO;
    this.#turmaDAO = turmaDAO;
    this.#matriculaDAO = matriculaDAO;
  }

  /**
   * Tela de categorias: categorias em ordem + itens (tarefa/prova/conteúdo)
   * de cada uma, com progresso/nota já resolvidos pro usuário autenticado
   * (se for aluno com matrícula ativa; professor vê os itens sem progresso).
   */
  buscarCategoriasCompletas = async (
    materiaGUID: string,
    turmaGUID: string,
    usuarioCPF: string
  ): Promise<CategoriaCompletaDTO[]> => {
    console.log("🟣 CategoriaConteudoService.buscarCategoriasCompletas()");

    const categorias = await this.#categoriaDAO.findAll({ MateriaGUID: materiaGUID, TurmaGUID: turmaGUID });

    const matricula = this.#matriculaDAO ? await this.#matriculaDAO.findMatriculaAtivaByUsuario(usuarioCPF) : null;
    const matriculaGUID = matricula?.MatriculaGUID ?? null;

    const mapaItens = new Map<string, ItemCategoriaDTO[]>();
    const adicionar = (categoriaGUID: string | null, item: ItemCategoriaDTO) => {
      const chave = categoriaGUID ?? "__sem_categoria__";
      if (!mapaItens.has(chave)) mapaItens.set(chave, []);
      mapaItens.get(chave)!.push(item);
    };

    // ---- Tarefas (digital/presencial) ----
    const [tarefaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.TarefaGUID, t.TarefaTitulo, t.TarefaTipoEntrega, t.CategoriaGUID,
              COALESCE(tm.TarefaPrazoDataMatricula, t.TarefaPrazoData) AS Prazo,
              tm.TarefaFeito, tm.TarefaNota
       FROM tarefaacademica t
       INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
       LEFT JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID AND tm.MatriculaGUID = ?
       WHERE mpt.MateriaGUID = ? AND mpt.TurmaGUID = ?`,
      [matriculaGUID, materiaGUID, turmaGUID]
    );
    for (const row of tarefaRows as any[]) {
      const prazoPassou = new Date(row.Prazo).getTime() < Date.now();
      const feito = Boolean(row.TarefaFeito);
      const nota: number | null = row.TarefaNota !== null ? Number(row.TarefaNota) : null;

      let estado: ItemCategoriaDTO["Estado"] = "sem_progresso";
      let percentual: number | null = null;
      if (nota !== null) {
        estado = "avaliado";
        percentual = Math.round((nota / 10) * 100);
      } else if (feito) {
        estado = "aguardando_avaliacao";
        percentual = 100;
      } else if (prazoPassou) {
        estado = "atrasado";
        percentual = 100;
      }

      adicionar(row.CategoriaGUID, {
        ItemGUID: row.TarefaGUID,
        Tipo: row.TarefaTipoEntrega === "digital" ? "tarefa_digital" : "tarefa_presencial",
        Titulo: row.TarefaTitulo,
        Percentual: percentual,
        Estado: estado,
        Nota: nota,
      });
    }

    // ---- Conteúdo (vídeo/texto/imagem) ----
    const [conteudoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ConteudoGUID, c.ConteudoTitulo, c.ConteudoTipo, ct.CategoriaGUID,
              cp.PercentualConcluido
       FROM conteudo c
       INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
       LEFT JOIN conteudoprogresso cp ON cp.ConteudoGUID = c.ConteudoGUID AND cp.MatriculaGUID = ?
       WHERE c.MateriaGUID = ? AND ct.TurmaGUID = ?`,
      [matriculaGUID, materiaGUID, turmaGUID]
    );
    const tipoConteudoMap: Record<string, ItemTipo> = {
      cronometrado: "conteudo_video",
      texto: "conteudo_texto",
      paginado: "conteudo_imagem",
    };
    for (const row of conteudoRows as any[]) {
      const percentual: number | null = row.PercentualConcluido ?? (row.ConteudoTipo === "texto" ? null : 0);
      adicionar(row.CategoriaGUID, {
        ItemGUID: row.ConteudoGUID,
        Tipo: tipoConteudoMap[row.ConteudoTipo] ?? "conteudo_texto",
        Titulo: row.ConteudoTitulo,
        Percentual: percentual,
        Estado: percentual === 100 ? "concluido" : percentual && percentual > 0 ? "parcial" : "sem_progresso",
        Nota: null,
      });
    }

    // ---- Provas ----
    const [provaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.ProvaAgendadaGUID, p.ProvaDescricao, pt.CategoriaGUID, pt.ProvaAgendadaTurmaGUID, pv.ProvaAgendadaVisualizacaoGUID
       FROM provaagendada p
       INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
       LEFT JOIN provaagendadavisualizacao pv ON pv.ProvaAgendadaTurmaGUID = pt.ProvaAgendadaTurmaGUID AND pv.MatriculaGUID = ?
       WHERE p.MateriaGUID = ? AND pt.TurmaGUID = ?`,
      [matriculaGUID, materiaGUID, turmaGUID]
    );
    for (const row of provaRows as any[]) {
      const visto = Boolean(row.ProvaAgendadaVisualizacaoGUID);
      adicionar(row.CategoriaGUID, {
        ItemGUID: row.ProvaAgendadaGUID,
        Tipo: "prova",
        Titulo: row.ProvaDescricao || "Prova",
        Percentual: visto ? 100 : null,
        Estado: visto ? "concluido" : "sem_progresso",
        Nota: null,
        RefTurmaGUID: row.ProvaAgendadaTurmaGUID,
      });
    }

    return categorias.map((categoria) => ({
      CategoriaGUID: categoria.CategoriaGUID,
      CategoriaNome: categoria.CategoriaNome || "",
      Ordem: categoria.Ordem,
      Itens: mapaItens.get(categoria.CategoriaGUID) ?? [],
    }));
  };

  criarCategoria = async (
    data: CategoriaConteudoCreateDTO,
    usuarioCPF: string
  ): Promise<CategoriaConteudoDTO> => {
    console.log("🟣 CategoriaConteudoService.criarCategoria()");

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    const turma = await this.#turmaDAO.findById(data.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", {
        message: `Não existe turma com id ${data.TurmaGUID}`,
      });
    }

    const nome = data.CategoriaNome.trim();
    const existente = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(
      usuarioCPF,
      data.MateriaGUID,
      data.TurmaGUID,
      nome
    );
    if (existente) {
      throw new ErrorResponse(409, "Categoria já existe", {
        message: `Você já tem uma categoria chamada "${nome}" nesta matéria/turma.`,
      });
    }

    const maiorOrdem = await this.#categoriaDAO.findMaiorOrdem(usuarioCPF, data.MateriaGUID, data.TurmaGUID);

    const categoria = new CategoriaConteudo();
    categoria.CategoriaGUID = uuidv4();
    categoria.UsuarioCPF = usuarioCPF;
    categoria.MateriaGUID = data.MateriaGUID;
    categoria.TurmaGUID = data.TurmaGUID;
    categoria.CategoriaNome = nome;
    categoria.Ordem = maiorOrdem + 1;

    await this.#categoriaDAO.create(categoria);

    return this.toDTO(categoria);
  };

  listarCategorias = async (filters: CategoriaConteudoFilters): Promise<CategoriaConteudoDTO[]> => {
    console.log("🟣 CategoriaConteudoService.listarCategorias()");

    const categorias = await this.#categoriaDAO.findAll(filters);
    return categorias.map((c) => this.toDTO(c));
  };

  atualizarCategoria = async (
    guid: string,
    novoNome: string,
    usuarioCPF: string
  ): Promise<CategoriaConteudoDTO> => {
    console.log("🟣 CategoriaConteudoService.atualizarCategoria()");

    const categoria = await this.#categoriaDAO.findById(guid);
    if (!categoria) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Não existe categoria com id ${guid}`,
      });
    }

    // Nota: quando a função de representante-cria-categoria entrar em vigor
    // (fase futura), esta checagem precisa aceitar também o representante/vice
    // da turma da categoria, não só o professor autor.
    if (categoria.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode editar suas próprias categorias.",
      });
    }

    const nome = novoNome.trim();
    const duplicada = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(
      usuarioCPF,
      categoria.MateriaGUID,
      categoria.TurmaGUID,
      nome
    );
    if (duplicada && duplicada.CategoriaGUID !== guid) {
      throw new ErrorResponse(409, "Categoria já existe", {
        message: `Você já tem uma categoria chamada "${nome}" nesta matéria/turma.`,
      });
    }

    const atualizada = await this.#categoriaDAO.update(guid, nome);
    if (!atualizada) {
      throw new ErrorResponse(500, "Erro ao atualizar categoria");
    }

    return this.toDTO(atualizada);
  };

  reordenarCategorias = async (
    usuarioCPF: string,
    materiaGUID: string,
    turmaGUID: string,
    ordemGUIDs: string[]
  ): Promise<CategoriaConteudoDTO[]> => {
    console.log("🟣 CategoriaConteudoService.reordenarCategorias()");

    const categoriasAtuais = await this.#categoriaDAO.findAll({
      UsuarioCPF: usuarioCPF,
      MateriaGUID: materiaGUID,
      TurmaGUID: turmaGUID,
    });

    const guidsValidos = new Set(categoriasAtuais.map((c) => c.CategoriaGUID));
    if (ordemGUIDs.length !== categoriasAtuais.length || !ordemGUIDs.every((guid) => guidsValidos.has(guid))) {
      throw new ErrorResponse(400, "Lista de ordenação inválida", {
        message: "A lista enviada deve conter exatamente as categorias existentes nesta matéria/turma.",
      });
    }

    await this.#categoriaDAO.updateOrdemEmLote(
      ordemGUIDs.map((guid, indice) => ({ CategoriaGUID: guid, Ordem: indice }))
    );

    return this.listarCategorias({ UsuarioCPF: usuarioCPF, MateriaGUID: materiaGUID, TurmaGUID: turmaGUID });
  };

  /**
   * Indicador vermelho de pendência: aluno = tem tarefa a fazer nesta
   * matéria/turma; professor = tem entrega pra corrigir.
   */
  verificarPendencia = async (
    materiaGUID: string,
    turmaGUID: string,
    usuarioCPF: string,
    ehProfessor: boolean
  ): Promise<boolean> => {
    console.log("🟣 CategoriaConteudoService.verificarPendencia()");

    if (ehProfessor) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1
         FROM tarefaacademica t
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
         INNER JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID
         WHERE mpt.MateriaGUID = ? AND mpt.TurmaGUID = ? AND mpt.UsuarioCPF = ?
           AND tm.TarefaFeito = TRUE AND tm.TarefaNota IS NULL
         LIMIT 1`,
        [materiaGUID, turmaGUID, usuarioCPF]
      );
      return rows.length > 0;
    }

    const matricula = this.#matriculaDAO ? await this.#matriculaDAO.findMatriculaAtivaByUsuario(usuarioCPF) : null;
    if (!matricula) return false;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1
       FROM tarefaacademica t
       INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
       INNER JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID
       WHERE mpt.MateriaGUID = ? AND mpt.TurmaGUID = ? AND tm.MatriculaGUID = ?
         AND tm.TarefaFeito = FALSE AND tm.TarefaNota IS NULL
       LIMIT 1`,
      [materiaGUID, turmaGUID, matricula.MatriculaGUID]
    );
    return rows.length > 0;
  };

  excluirCategoria = async (guid: string, usuarioCPF: string): Promise<void> => {
    console.log("🟣 CategoriaConteudoService.excluirCategoria()");

    const categoria = await this.#categoriaDAO.findById(guid);
    if (!categoria) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Não existe categoria com id ${guid}`,
      });
    }

    if (categoria.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode excluir suas próprias categorias.",
      });
    }

    await this.#categoriaDAO.delete(guid);
  };

  private toDTO(categoria: CategoriaConteudo): CategoriaConteudoDTO {
    return {
      CategoriaGUID: categoria.CategoriaGUID,
      UsuarioCPF: categoria.UsuarioCPF,
      MateriaGUID: categoria.MateriaGUID,
      TurmaGUID: categoria.TurmaGUID,
      CategoriaNome: categoria.CategoriaNome || "",
      Ordem: categoria.Ordem,
      CreatedAt: categoria.CreatedAt ? categoria.CreatedAt.toISOString() : new Date().toISOString(),
      UpdatedAt: categoria.UpdatedAt ? categoria.UpdatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
