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
  /** Posição do item dentro da categoria — drag-and-drop de item (não confundir com Ordem, que é da categoria) */
  ItemOrdem: number;
}

export interface CategoriaCompletaDTO {
  CategoriaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  Itens: ItemCategoriaDTO[];
}

export interface ItemBoardGeralDTO {
  ItemGUID: string;
  Tipo: ItemTipo;
  Titulo: string;
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
  ItemOrdem: number;
}

export interface CategoriaGeralDTO {
  CategoriaNome: string;
  Ordem: number;
  Itens: ItemBoardGeralDTO[];
}

export interface BoardGeralDTO {
  Categorias: CategoriaGeralDTO[];
  ItensSemCategoria: ItemBoardGeralDTO[];
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
      `SELECT t.TarefaGUID, t.TarefaTitulo, t.TarefaTipoEntrega, t.CategoriaGUID, t.ItemOrdem,
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
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    // ---- Conteúdo (vídeo/texto/imagem) ----
    const [conteudoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ConteudoGUID, c.ConteudoTitulo, c.ConteudoTipo, ct.CategoriaGUID, ct.ItemOrdem,
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
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    // ---- Provas ----
    const [provaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.ProvaAgendadaGUID, p.ProvaDescricao, pt.CategoriaGUID, pt.ItemOrdem, pt.ProvaAgendadaTurmaGUID, pv.ProvaAgendadaVisualizacaoGUID
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
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    return categorias.map((categoria) => ({
      CategoriaGUID: categoria.CategoriaGUID,
      CategoriaNome: categoria.CategoriaNome || "",
      Ordem: categoria.Ordem,
      Itens: (mapaItens.get(categoria.CategoriaGUID) ?? []).sort((a, b) => a.ItemOrdem - b.ItemOrdem),
    }));
  };

  /**
   * Move um item (tarefa/conteúdo/prova) pra uma categoria (pode ser a mesma
   * de origem, no caso de só reordenar dentro dela) e grava a nova posição
   * de cada item da lista — drag-and-drop de item na tela de categorias.
   * A lista deve vir na ordem final desejada (índice = ItemOrdem).
   */
  reordenarItens = async (
    usuarioCPF: string,
    materiaGUID: string,
    turmaGUID: string,
    categoriaDestinoGUID: string,
    itens: { ItemGUID: string; Tipo: ItemTipo }[]
  ): Promise<CategoriaCompletaDTO[]> => {
    console.log("🟣 CategoriaConteudoService.reordenarItens()");

    const [alocacaoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM materiaxprofessorxturma
       WHERE MateriaGUID = ? AND TurmaGUID = ? AND UsuarioCPF = ? AND AlocacaoStatus = 'Ativa' LIMIT 1`,
      [materiaGUID, turmaGUID, usuarioCPF]
    );
    if (alocacaoRows.length === 0) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está alocado nesta matéria/turma.",
      });
    }

    const categoriasDoProfessor = await this.#categoriaDAO.findAll({
      UsuarioCPF: usuarioCPF,
      MateriaGUID: materiaGUID,
      TurmaGUID: turmaGUID,
    });
    if (!categoriasDoProfessor.some((c) => c.CategoriaGUID === categoriaDestinoGUID)) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: "A categoria de destino não existe ou não pertence a você nesta matéria/turma.",
      });
    }

    for (let indice = 0; indice < itens.length; indice++) {
      const { ItemGUID, Tipo } = itens[indice];

      if (Tipo === "tarefa_digital" || Tipo === "tarefa_presencial") {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT 1 FROM tarefaacademica t
           INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
           WHERE t.TarefaGUID = ? AND mpt.MateriaGUID = ? AND mpt.TurmaGUID = ? LIMIT 1`,
          [ItemGUID, materiaGUID, turmaGUID]
        );
        if (rows.length === 0) {
          throw new ErrorResponse(403, "Item inválido", {
            message: `A tarefa ${ItemGUID} não pertence a esta matéria/turma.`,
          });
        }
        await pool.execute(`UPDATE tarefaacademica SET CategoriaGUID = ?, ItemOrdem = ? WHERE TarefaGUID = ?`, [
          categoriaDestinoGUID,
          indice,
          ItemGUID,
        ]);
      } else if (Tipo === "conteudo_video" || Tipo === "conteudo_texto" || Tipo === "conteudo_imagem") {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT 1 FROM conteudo c
           INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
           WHERE c.ConteudoGUID = ? AND c.MateriaGUID = ? AND ct.TurmaGUID = ? LIMIT 1`,
          [ItemGUID, materiaGUID, turmaGUID]
        );
        if (rows.length === 0) {
          throw new ErrorResponse(403, "Item inválido", {
            message: `O conteúdo ${ItemGUID} não pertence a esta matéria/turma.`,
          });
        }
        await pool.execute(
          `UPDATE conteudoturma SET CategoriaGUID = ?, ItemOrdem = ? WHERE ConteudoGUID = ? AND TurmaGUID = ?`,
          [categoriaDestinoGUID, indice, ItemGUID, turmaGUID]
        );
      } else if (Tipo === "prova") {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT 1 FROM provaagendada p
           INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
           WHERE p.ProvaAgendadaGUID = ? AND p.MateriaGUID = ? AND pt.TurmaGUID = ? LIMIT 1`,
          [ItemGUID, materiaGUID, turmaGUID]
        );
        if (rows.length === 0) {
          throw new ErrorResponse(403, "Item inválido", {
            message: `A prova ${ItemGUID} não pertence a esta matéria/turma.`,
          });
        }
        await pool.execute(
          `UPDATE provaagendada_turma SET CategoriaGUID = ?, ItemOrdem = ? WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?`,
          [categoriaDestinoGUID, indice, ItemGUID, turmaGUID]
        );
      } else {
        throw new ErrorResponse(400, "Tipo de item inválido", { message: `Tipo desconhecido: ${Tipo}` });
      }
    }

    return this.buscarCategoriasCompletas(materiaGUID, turmaGUID, usuarioCPF);
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

  // ==================== Board geral (categoria aplicada em massa) ====================
  //
  // Sem tabela nova: uma "categoria geral" é só o conjunto de linhas de
  // `categoriaconteudo` que compartilham o mesmo (UsuarioCPF, MateriaGUID,
  // CategoriaNome) — uma por turma onde o professor leciona a matéria.
  // Criar/reordenar "em massa" é só criar/atualizar essas N linhas de uma vez.

  /** Turmas ativas onde esse professor leciona essa matéria — base de todo o board geral. */
  #turmasAtivasDoProfessor = async (usuarioCPF: string, materiaGUID: string): Promise<{ TurmaGUID: string; TurmaNome: string; TurmaSerie: string }[]> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT mpt.TurmaGUID, tu.TurmaNome, tu.TurmaSerie
       FROM materiaxprofessorxturma mpt
       INNER JOIN turma tu ON tu.TurmaGUID = mpt.TurmaGUID
       WHERE mpt.MateriaGUID = ? AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'`,
      [materiaGUID, usuarioCPF]
    );
    return rows as any[];
  };

  /**
   * Cria (ou aplica em turmas que ainda não tinham) uma categoria com esse
   * nome em TODAS as turmas ativas do professor nessa matéria de uma vez.
   */
  criarCategoriaGeral = async (usuarioCPF: string, materiaGUID: string, categoriaNome: string): Promise<void> => {
    console.log("🟣 CategoriaConteudoService.criarCategoriaGeral()");

    const nome = categoriaNome.trim();
    if (nome.length < 2 || nome.length > 100) {
      throw new ErrorResponse(400, "CategoriaNome inválido", {
        message: "CategoriaNome deve ter entre 2 e 100 caracteres",
      });
    }

    const turmas = await this.#turmasAtivasDoProfessor(usuarioCPF, materiaGUID);
    if (turmas.length === 0) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está alocado em nenhuma turma ativa nesta matéria.",
      });
    }

    for (const turma of turmas) {
      const existente = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(usuarioCPF, materiaGUID, turma.TurmaGUID, nome);
      if (existente) continue;

      const maiorOrdem = await this.#categoriaDAO.findMaiorOrdem(usuarioCPF, materiaGUID, turma.TurmaGUID);
      const categoria = new CategoriaConteudo();
      categoria.CategoriaGUID = uuidv4();
      categoria.UsuarioCPF = usuarioCPF;
      categoria.MateriaGUID = materiaGUID;
      categoria.TurmaGUID = turma.TurmaGUID;
      categoria.CategoriaNome = nome;
      categoria.Ordem = maiorOrdem + 1;
      await this.#categoriaDAO.create(categoria);
    }
  };

  /**
   * Board geral: categorias (por nome, consolidadas entre turmas) + itens de
   * tarefa/conteúdo/prova de TODAS as turmas dessa matéria, agrupados por
   * categoria (ou "sem categoria"), cada item já dizendo de qual turma é.
   */
  buscarBoardGeral = async (usuarioCPF: string, materiaGUID: string): Promise<BoardGeralDTO> => {
    console.log("🟣 CategoriaConteudoService.buscarBoardGeral()");

    const categoriasRows = await this.#categoriaDAO.findAll({ UsuarioCPF: usuarioCPF, MateriaGUID: materiaGUID });
    const nomeParaOrdem = new Map<string, number>();
    categoriasRows.forEach((c) => {
      if (c.CategoriaNome && !nomeParaOrdem.has(c.CategoriaNome)) nomeParaOrdem.set(c.CategoriaNome, c.Ordem);
    });

    const mapaItens = new Map<string, ItemBoardGeralDTO[]>();
    const adicionar = (categoriaNome: string | null, item: ItemBoardGeralDTO) => {
      const chave = categoriaNome ?? "__sem_categoria__";
      if (!mapaItens.has(chave)) mapaItens.set(chave, []);
      mapaItens.get(chave)!.push(item);
    };

    const [tarefaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.TarefaGUID, t.TarefaTitulo, t.TarefaTipoEntrega, t.ItemOrdem,
              mpt.TurmaGUID, tu.TurmaNome, tu.TurmaSerie, cc.CategoriaNome
       FROM tarefaacademica t
       INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
       INNER JOIN turma tu ON tu.TurmaGUID = mpt.TurmaGUID
       LEFT JOIN categoriaconteudo cc ON cc.CategoriaGUID = t.CategoriaGUID
       WHERE mpt.MateriaGUID = ? AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'`,
      [materiaGUID, usuarioCPF]
    );
    for (const row of tarefaRows as any[]) {
      adicionar(row.CategoriaNome ?? null, {
        ItemGUID: row.TarefaGUID,
        Tipo: row.TarefaTipoEntrega === "digital" ? "tarefa_digital" : "tarefa_presencial",
        Titulo: row.TarefaTitulo,
        TurmaGUID: row.TurmaGUID,
        TurmaNome: row.TurmaNome,
        TurmaSerie: row.TurmaSerie,
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    const [conteudoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ConteudoGUID, c.ConteudoTitulo, c.ConteudoTipo, ct.ItemOrdem,
              ct.TurmaGUID, tu.TurmaNome, tu.TurmaSerie, cc.CategoriaNome
       FROM conteudo c
       INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
       INNER JOIN turma tu ON tu.TurmaGUID = ct.TurmaGUID
       INNER JOIN materiaxprofessorxturma mpt
         ON mpt.MateriaGUID = c.MateriaGUID AND mpt.TurmaGUID = ct.TurmaGUID AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'
       LEFT JOIN categoriaconteudo cc ON cc.CategoriaGUID = ct.CategoriaGUID
       WHERE c.MateriaGUID = ?`,
      [usuarioCPF, materiaGUID]
    );
    const tipoConteudoMap: Record<string, ItemTipo> = {
      cronometrado: "conteudo_video",
      texto: "conteudo_texto",
      paginado: "conteudo_imagem",
    };
    for (const row of conteudoRows as any[]) {
      adicionar(row.CategoriaNome ?? null, {
        ItemGUID: row.ConteudoGUID,
        Tipo: tipoConteudoMap[row.ConteudoTipo] ?? "conteudo_texto",
        Titulo: row.ConteudoTitulo,
        TurmaGUID: row.TurmaGUID,
        TurmaNome: row.TurmaNome,
        TurmaSerie: row.TurmaSerie,
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    const [provaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.ProvaAgendadaGUID, p.ProvaDescricao, pt.ItemOrdem,
              pt.TurmaGUID, tu.TurmaNome, tu.TurmaSerie, cc.CategoriaNome
       FROM provaagendada p
       INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
       INNER JOIN turma tu ON tu.TurmaGUID = pt.TurmaGUID
       INNER JOIN materiaxprofessorxturma mpt
         ON mpt.MateriaGUID = p.MateriaGUID AND mpt.TurmaGUID = pt.TurmaGUID AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'
       LEFT JOIN categoriaconteudo cc ON cc.CategoriaGUID = pt.CategoriaGUID
       WHERE p.MateriaGUID = ?`,
      [usuarioCPF, materiaGUID]
    );
    for (const row of provaRows as any[]) {
      adicionar(row.CategoriaNome ?? null, {
        ItemGUID: row.ProvaAgendadaGUID,
        Tipo: "prova",
        Titulo: row.ProvaDescricao || "Prova",
        TurmaGUID: row.TurmaGUID,
        TurmaNome: row.TurmaNome,
        TurmaSerie: row.TurmaSerie,
        ItemOrdem: row.ItemOrdem ?? 0,
      });
    }

    const nomesOrdenados = Array.from(nomeParaOrdem.entries()).sort((a, b) => a[1] - b[1]);

    return {
      Categorias: nomesOrdenados.map(([nome, ordem]) => ({
        CategoriaNome: nome,
        Ordem: ordem,
        Itens: (mapaItens.get(nome) ?? []).sort((a, b) => a.ItemOrdem - b.ItemOrdem),
      })),
      ItensSemCategoria: mapaItens.get("__sem_categoria__") ?? [],
    };
  };

  /** Reordena as categorias gerais (por nome) — aplica a mesma Ordem em todas as turmas de uma vez. */
  reordenarCategoriasGerais = async (usuarioCPF: string, materiaGUID: string, ordemNomes: string[]): Promise<BoardGeralDTO> => {
    console.log("🟣 CategoriaConteudoService.reordenarCategoriasGerais()");

    const categoriasAtuais = await this.#categoriaDAO.findAll({ UsuarioCPF: usuarioCPF, MateriaGUID: materiaGUID });
    const nomesValidos = new Set(categoriasAtuais.map((c) => c.CategoriaNome));
    if (ordemNomes.length !== nomesValidos.size || !ordemNomes.every((nome) => nomesValidos.has(nome))) {
      throw new ErrorResponse(400, "Lista de ordenação inválida", {
        message: "A lista enviada deve conter exatamente os nomes de categoria geral existentes nesta matéria.",
      });
    }

    const ordemPorNome = new Map(ordemNomes.map((nome, indice) => [nome, indice]));
    await this.#categoriaDAO.updateOrdemEmLote(
      categoriasAtuais.map((c) => ({ CategoriaGUID: c.CategoriaGUID, Ordem: ordemPorNome.get(c.CategoriaNome || "")! }))
    );

    return this.buscarBoardGeral(usuarioCPF, materiaGUID);
  };

  /**
   * Move um item (tarefa/conteúdo/prova) — de qualquer turma — pra uma
   * categoria geral (por nome) ou de volta pra "sem categoria" (nome null).
   * Se a turma daquele item ainda não tinha essa categoria aplicada (ex.:
   * turma nova depois da categoria criada), cria na hora — mantém o "em massa".
   */
  moverItemBoardGeral = async (
    usuarioCPF: string,
    materiaGUID: string,
    itemGUID: string,
    tipo: ItemTipo,
    turmaGUID: string,
    categoriaNomeDestino: string | null
  ): Promise<BoardGeralDTO> => {
    console.log("🟣 CategoriaConteudoService.moverItemBoardGeral()");

    const [alocacaoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM materiaxprofessorxturma
       WHERE MateriaGUID = ? AND TurmaGUID = ? AND UsuarioCPF = ? AND AlocacaoStatus = 'Ativa' LIMIT 1`,
      [materiaGUID, turmaGUID, usuarioCPF]
    );
    if (alocacaoRows.length === 0) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está alocado nesta matéria/turma.",
      });
    }

    let categoriaGUIDDestino: string | null = null;
    if (categoriaNomeDestino) {
      const nome = categoriaNomeDestino.trim();
      let categoria = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(usuarioCPF, materiaGUID, turmaGUID, nome);
      if (!categoria) {
        const maiorOrdem = await this.#categoriaDAO.findMaiorOrdem(usuarioCPF, materiaGUID, turmaGUID);
        const nova = new CategoriaConteudo();
        nova.CategoriaGUID = uuidv4();
        nova.UsuarioCPF = usuarioCPF;
        nova.MateriaGUID = materiaGUID;
        nova.TurmaGUID = turmaGUID;
        nova.CategoriaNome = nome;
        nova.Ordem = maiorOrdem + 1;
        await this.#categoriaDAO.create(nova);
        categoria = nova;
      }
      categoriaGUIDDestino = categoria.CategoriaGUID;
    }

    if (tipo === "tarefa_digital" || tipo === "tarefa_presencial") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM tarefaacademica t
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
         WHERE t.TarefaGUID = ? AND mpt.MateriaGUID = ? AND mpt.TurmaGUID = ? LIMIT 1`,
        [itemGUID, materiaGUID, turmaGUID]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `A tarefa ${itemGUID} não pertence a esta matéria/turma.` });
      }
      await pool.execute(`UPDATE tarefaacademica SET CategoriaGUID = ?, ItemOrdem = 0 WHERE TarefaGUID = ?`, [
        categoriaGUIDDestino,
        itemGUID,
      ]);
    } else if (tipo === "conteudo_video" || tipo === "conteudo_texto" || tipo === "conteudo_imagem") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM conteudo c
         INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
         WHERE c.ConteudoGUID = ? AND c.MateriaGUID = ? AND ct.TurmaGUID = ? LIMIT 1`,
        [itemGUID, materiaGUID, turmaGUID]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `O conteúdo ${itemGUID} não pertence a esta matéria/turma.` });
      }
      await pool.execute(`UPDATE conteudoturma SET CategoriaGUID = ?, ItemOrdem = 0 WHERE ConteudoGUID = ? AND TurmaGUID = ?`, [
        categoriaGUIDDestino,
        itemGUID,
        turmaGUID,
      ]);
    } else if (tipo === "prova") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM provaagendada p
         INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
         WHERE p.ProvaAgendadaGUID = ? AND p.MateriaGUID = ? AND pt.TurmaGUID = ? LIMIT 1`,
        [itemGUID, materiaGUID, turmaGUID]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `A prova ${itemGUID} não pertence a esta matéria/turma.` });
      }
      await pool.execute(`UPDATE provaagendada_turma SET CategoriaGUID = ?, ItemOrdem = 0 WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?`, [
        categoriaGUIDDestino,
        itemGUID,
        turmaGUID,
      ]);
    } else {
      throw new ErrorResponse(400, "Tipo de item inválido", { message: `Tipo desconhecido: ${tipo}` });
    }

    return this.buscarBoardGeral(usuarioCPF, materiaGUID);
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

  /**
   * Indicador agregado pra navbar: existe QUALQUER pendência em qualquer
   * matéria/turma do usuário? Mesma regra de verificarPendencia, sem
   * escopar por matéria/turma específica.
   */
  verificarPendenciaAgregada = async (usuarioCPF: string, ehProfessor: boolean): Promise<boolean> => {
    console.log("🟣 CategoriaConteudoService.verificarPendenciaAgregada()");

    if (ehProfessor) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1
         FROM tarefaacademica t
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
         INNER JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID
         WHERE mpt.UsuarioCPF = ?
           AND tm.TarefaFeito = TRUE AND tm.TarefaNota IS NULL
         LIMIT 1`,
        [usuarioCPF]
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
       WHERE tm.MatriculaGUID = ?
         AND tm.TarefaFeito = FALSE AND tm.TarefaNota IS NULL
       LIMIT 1`,
      [matricula.MatriculaGUID]
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
