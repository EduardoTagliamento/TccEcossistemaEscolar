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

export interface CategoriasCompletasResultDTO {
  categorias: CategoriaCompletaDTO[];
  /** Itens com CategoriaGUID NULL — sobraram de uma categoria excluída, nunca some junto com ela. */
  itensSemCategoria: ItemCategoriaDTO[];
}

export interface TurmaBoardGeralDTO {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
}

export interface ItemBoardGeralDTO {
  ItemGUID: string;
  Tipo: ItemTipo;
  Titulo: string;
  /** Turmas onde esse item existe. Tarefa é sempre 1; conteúdo/prova podem ter N (fan-out). */
  Turmas: TurmaBoardGeralDTO[];
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

export interface EstatisticaAlunoDTO {
  MatriculaGUID: string;
  AlunoNome: string;
  /** 0-100, mesmo cálculo usado na barra de progresso (ver buscarCategoriasCompletas) */
  Percentual: number;
  Nota: number | null;
}

export interface EstatisticasItemDTO {
  MediaPercentual: number;
  /** Ordenado desc por Percentual — quem está na frente aparece primeiro */
  Ranking: EstatisticaAlunoDTO[];
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
  ): Promise<CategoriasCompletasResultDTO> => {
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
              tm.TarefaFeito, tm.TarefaNota, tm.TarefaAvaliadoPorCPF
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
      // Zerado automaticamente pelo scheduler (prazo vencido sem entrega) tem
      // TarefaAvaliadoPorCPF NULL — nota existe (0) mas não é uma correção de
      // verdade, então continua contando como "atrasado" (vermelho + cadeado),
      // não "avaliado" (que é só pra nota atribuída por um professor de fato).
      const avaliadoManualmente = nota !== null && row.TarefaAvaliadoPorCPF !== null;

      let estado: ItemCategoriaDTO["Estado"] = "sem_progresso";
      let percentual: number | null = null;
      if (avaliadoManualmente) {
        estado = "avaliado";
        percentual = Math.round((nota / 10) * 100);
      } else if (feito) {
        estado = "aguardando_avaliacao";
        percentual = 100;
      } else if (prazoPassou || nota !== null) {
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

    return {
      categorias: categorias.map((categoria) => ({
        CategoriaGUID: categoria.CategoriaGUID,
        CategoriaNome: categoria.CategoriaNome || "",
        Ordem: categoria.Ordem,
        Itens: (mapaItens.get(categoria.CategoriaGUID) ?? []).sort((a, b) => a.ItemOrdem - b.ItemOrdem),
      })),
      itensSemCategoria: (mapaItens.get("__sem_categoria__") ?? []).sort((a, b) => a.ItemOrdem - b.ItemOrdem),
    };
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
  ): Promise<CategoriasCompletasResultDTO> => {
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

    // Só professor alocado ativamente nesta matéria/turma pode criar categoria
    // aqui — representante/vice-representante de turma ainda não tem esse
    // botão ligado no frontend (função futura, ver PLANO_IMPLEMENTACAO_MATERIAS.md).
    const [alocacaoRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM materiaxprofessorxturma
       WHERE MateriaGUID = ? AND TurmaGUID = ? AND UsuarioCPF = ? AND AlocacaoStatus = 'Ativa' LIMIT 1`,
      [data.MateriaGUID, data.TurmaGUID, usuarioCPF]
    );
    if (alocacaoRows.length === 0) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está alocado nesta matéria/turma.",
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
   * Renomeia a categoria "geral" — todas as linhas do professor nessa
   * matéria com o nome atual, uma por turma ativa (não existe 1 CategoriaGUID
   * único pra essa "categoria", é o conjunto de linhas com o mesmo nome — ver
   * comentário do board geral acima). Turmas onde já existe outra categoria
   * com o nome novo são puladas (não sobrescreve), pra não colidir.
   */
  atualizarCategoriaGeral = async (
    usuarioCPF: string,
    materiaGUID: string,
    categoriaNomeAtual: string,
    novoNome: string
  ): Promise<{ turmasAtualizadas: number }> => {
    console.log("🟣 CategoriaConteudoService.atualizarCategoriaGeral()");

    const nomeAtual = categoriaNomeAtual.trim();
    const nome = novoNome.trim();
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

    let turmasAtualizadas = 0;
    for (const turma of turmas) {
      const existente = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(usuarioCPF, materiaGUID, turma.TurmaGUID, nomeAtual);
      if (!existente) continue;

      const conflito = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(usuarioCPF, materiaGUID, turma.TurmaGUID, nome);
      if (conflito && conflito.CategoriaGUID !== existente.CategoriaGUID) continue;

      await this.#categoriaDAO.update(existente.CategoriaGUID, nome);
      turmasAtualizadas++;
    }

    if (turmasAtualizadas === 0) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Nenhuma turma ativa tem uma categoria chamada "${nomeAtual}".`,
      });
    }

    return { turmasAtualizadas };
  };

  /**
   * Exclui a categoria "geral" — todas as linhas do professor nessa matéria
   * com esse nome, uma por turma ativa. Reaproveita excluirCategoria (já
   * desvincula os itens antes de excluir cada linha) linha a linha.
   */
  excluirCategoriaGeral = async (
    usuarioCPF: string,
    materiaGUID: string,
    categoriaNome: string
  ): Promise<{ turmasExcluidas: number }> => {
    console.log("🟣 CategoriaConteudoService.excluirCategoriaGeral()");

    const nome = categoriaNome.trim();
    const turmas = await this.#turmasAtivasDoProfessor(usuarioCPF, materiaGUID);

    let turmasExcluidas = 0;
    for (const turma of turmas) {
      const existente = await this.#categoriaDAO.findByUsuarioMateriaTurmaNome(usuarioCPF, materiaGUID, turma.TurmaGUID, nome);
      if (!existente) continue;
      await this.excluirCategoria(existente.CategoriaGUID, usuarioCPF);
      turmasExcluidas++;
    }

    if (turmasExcluidas === 0) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Nenhuma turma ativa tem uma categoria chamada "${nome}".`,
      });
    }

    return { turmasExcluidas };
  };

  /** Nome mais frequente entre as ocorrências (desempate: primeira encontrada). Usado quando o mesmo item aparece em turmas com categoria divergente. */
  #nomeMaisFrequente(nomes: (string | null)[]): string | null {
    const contagem = new Map<string | null, number>();
    for (const nome of nomes) contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    let melhor: string | null = nomes[0] ?? null;
    let melhorContagem = 0;
    for (const [nome, qtd] of contagem) {
      if (qtd > melhorContagem) {
        melhor = nome;
        melhorContagem = qtd;
      }
    }
    return melhor;
  }

  /**
   * Board geral: categorias (por nome, consolidadas entre turmas) + itens de
   * tarefa/conteúdo/prova de TODAS as turmas dessa matéria, agrupados por
   * categoria (ou "sem categoria").
   *
   * Tarefa é sempre de 1 turma só — aparece como está, sem condensar.
   * Conteúdo/Prova são fan-out (1 item → N turmas): aqui são condensados numa
   * única linha por item, com a lista de turmas onde existem — e só entram
   * na tela se estiverem em 2+ turmas (o que só 1 turma tem fica de fora,
   * por ser organização específica daquela turma, não "geral").
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
        Turmas: [{ TurmaGUID: row.TurmaGUID, TurmaNome: row.TurmaNome, TurmaSerie: row.TurmaSerie }],
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
    const gruposConteudo = new Map<
      string,
      { Titulo: string; Tipo: ItemTipo; ItemOrdem: number; Turmas: TurmaBoardGeralDTO[]; Categorias: (string | null)[] }
    >();
    for (const row of conteudoRows as any[]) {
      let grupo = gruposConteudo.get(row.ConteudoGUID);
      if (!grupo) {
        grupo = {
          Titulo: row.ConteudoTitulo,
          Tipo: tipoConteudoMap[row.ConteudoTipo] ?? "conteudo_texto",
          ItemOrdem: row.ItemOrdem ?? 0,
          Turmas: [],
          Categorias: [],
        };
        gruposConteudo.set(row.ConteudoGUID, grupo);
      }
      grupo.Turmas.push({ TurmaGUID: row.TurmaGUID, TurmaNome: row.TurmaNome, TurmaSerie: row.TurmaSerie });
      grupo.Categorias.push(row.CategoriaNome ?? null);
    }
    for (const [conteudoGUID, grupo] of gruposConteudo) {
      if (grupo.Turmas.length < 2) continue; // só 1 turma tem — não entra na tela geral
      adicionar(this.#nomeMaisFrequente(grupo.Categorias), {
        ItemGUID: conteudoGUID,
        Tipo: grupo.Tipo,
        Titulo: grupo.Titulo,
        Turmas: grupo.Turmas,
        ItemOrdem: grupo.ItemOrdem,
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
    const gruposProva = new Map<
      string,
      { Titulo: string; ItemOrdem: number; Turmas: TurmaBoardGeralDTO[]; Categorias: (string | null)[] }
    >();
    for (const row of provaRows as any[]) {
      let grupo = gruposProva.get(row.ProvaAgendadaGUID);
      if (!grupo) {
        grupo = { Titulo: row.ProvaDescricao || "Prova", ItemOrdem: row.ItemOrdem ?? 0, Turmas: [], Categorias: [] };
        gruposProva.set(row.ProvaAgendadaGUID, grupo);
      }
      grupo.Turmas.push({ TurmaGUID: row.TurmaGUID, TurmaNome: row.TurmaNome, TurmaSerie: row.TurmaSerie });
      grupo.Categorias.push(row.CategoriaNome ?? null);
    }
    for (const [provaGUID, grupo] of gruposProva) {
      if (grupo.Turmas.length < 2) continue; // só 1 turma tem — não entra na tela geral
      adicionar(this.#nomeMaisFrequente(grupo.Categorias), {
        ItemGUID: provaGUID,
        Tipo: "prova",
        Titulo: grupo.Titulo,
        Turmas: grupo.Turmas,
        ItemOrdem: grupo.ItemOrdem,
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

  /** Resolve o GUID da categoria (por nome) numa turma, criando-a se essa turma ainda não a tinha. */
  #resolverOuCriarCategoriaGeral = async (
    usuarioCPF: string,
    materiaGUID: string,
    turmaGUID: string,
    nome: string
  ): Promise<string> => {
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
    return categoria.CategoriaGUID;
  };

  /**
   * Resolve (ou cria) a categoria de nome `categoriaNome` em cada uma das
   * turmas informadas, pro professor autenticado — usado pelos formulários de
   * Conteúdo/Prova (`/cadastro`) pra permitir escolher/criar categoria por
   * NOME mesmo distribuindo o item pra várias turmas de uma vez (antes disso,
   * o formulário só permitia categoria com exatamente 1 turma marcada, já que
   * a categoria em si é uma linha por turma). Diferente de
   * `criarCategoriaGeral` (que aplica em TODAS as turmas ativas do
   * professor), aqui a lista de turmas é a que o professor efetivamente
   * selecionou no formulário — pode ser um subconjunto.
   *
   * Retorna um mapa TurmaGUID → CategoriaGUID, pronto pra virar
   * `CategoriasPorTurma` no payload de criação de Conteúdo/Prova.
   */
  resolverCategoriaPorNomeParaTurmas = async (
    usuarioCPF: string,
    materiaGUID: string,
    turmasGUID: string[],
    categoriaNome: string
  ): Promise<Record<string, string>> => {
    console.log("🟣 CategoriaConteudoService.resolverCategoriaPorNomeParaTurmas()");

    const nome = categoriaNome.trim();
    if (nome.length < 2 || nome.length > 100) {
      throw new ErrorResponse(400, "CategoriaNome inválido", {
        message: "CategoriaNome deve ter entre 2 e 100 caracteres",
      });
    }
    if (turmasGUID.length === 0) {
      throw new ErrorResponse(400, "TurmasGUID inválido", {
        message: "Informe ao menos uma turma.",
      });
    }

    const mapa: Record<string, string> = {};
    for (const turmaGUID of turmasGUID) {
      const [alocacaoRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM materiaxprofessorxturma
         WHERE MateriaGUID = ? AND TurmaGUID = ? AND UsuarioCPF = ? AND AlocacaoStatus = 'Ativa' LIMIT 1`,
        [materiaGUID, turmaGUID, usuarioCPF]
      );
      if (alocacaoRows.length === 0) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: `Você não está alocado nesta matéria na turma ${turmaGUID}.`,
        });
      }
      mapa[turmaGUID] = await this.#resolverOuCriarCategoriaGeral(usuarioCPF, materiaGUID, turmaGUID, nome);
    }
    return mapa;
  };

  /**
   * Move um item pra uma categoria geral (por nome) ou de volta pra "sem
   * categoria" (nome null).
   *
   * Tarefa é sempre de 1 turma só — move só essa linha (`turmaGUID` recebido
   * do frontend). Conteúdo/Prova são condensados na tela geral (item único
   * representando N turmas) — aqui o movimento é aplicado a TODAS as turmas
   * (dentro da alocação ativa do professor) onde aquele item existe, não só
   * a que veio no parâmetro; se alguma dessas turmas ainda não tinha essa
   * categoria aplicada (ex.: turma nova depois da categoria criada), cria na
   * hora — mantém o "em massa".
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

    const nome = categoriaNomeDestino?.trim() || null;

    if (tipo === "tarefa_digital" || tipo === "tarefa_presencial") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM tarefaacademica t
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
         WHERE t.TarefaGUID = ? AND mpt.MateriaGUID = ? AND mpt.TurmaGUID = ? AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa' LIMIT 1`,
        [itemGUID, materiaGUID, turmaGUID, usuarioCPF]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `A tarefa ${itemGUID} não pertence a esta matéria/turma.` });
      }
      const categoriaGUIDDestino = nome ? await this.#resolverOuCriarCategoriaGeral(usuarioCPF, materiaGUID, turmaGUID, nome) : null;
      await pool.execute(`UPDATE tarefaacademica SET CategoriaGUID = ?, ItemOrdem = 0 WHERE TarefaGUID = ?`, [
        categoriaGUIDDestino,
        itemGUID,
      ]);
    } else if (tipo === "conteudo_video" || tipo === "conteudo_texto" || tipo === "conteudo_imagem") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT ct.TurmaGUID FROM conteudo c
         INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MateriaGUID = c.MateriaGUID AND mpt.TurmaGUID = ct.TurmaGUID
           AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'
         WHERE c.ConteudoGUID = ? AND c.MateriaGUID = ?`,
        [usuarioCPF, itemGUID, materiaGUID]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `O conteúdo ${itemGUID} não pertence a esta matéria/turma.` });
      }
      for (const row of rows as any[]) {
        const categoriaGUIDDestino = nome
          ? await this.#resolverOuCriarCategoriaGeral(usuarioCPF, materiaGUID, row.TurmaGUID, nome)
          : null;
        await pool.execute(`UPDATE conteudoturma SET CategoriaGUID = ?, ItemOrdem = 0 WHERE ConteudoGUID = ? AND TurmaGUID = ?`, [
          categoriaGUIDDestino,
          itemGUID,
          row.TurmaGUID,
        ]);
      }
    } else if (tipo === "prova") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT pt.TurmaGUID FROM provaagendada p
         INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MateriaGUID = p.MateriaGUID AND mpt.TurmaGUID = pt.TurmaGUID
           AND mpt.UsuarioCPF = ? AND mpt.AlocacaoStatus = 'Ativa'
         WHERE p.ProvaAgendadaGUID = ? AND p.MateriaGUID = ?`,
        [usuarioCPF, itemGUID, materiaGUID]
      );
      if (rows.length === 0) {
        throw new ErrorResponse(403, "Item inválido", { message: `A prova ${itemGUID} não pertence a esta matéria/turma.` });
      }
      for (const row of rows as any[]) {
        const categoriaGUIDDestino = nome
          ? await this.#resolverOuCriarCategoriaGeral(usuarioCPF, materiaGUID, row.TurmaGUID, nome)
          : null;
        await pool.execute(`UPDATE provaagendada_turma SET CategoriaGUID = ?, ItemOrdem = 0 WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?`, [
          categoriaGUIDDestino,
          itemGUID,
          row.TurmaGUID,
        ]);
      }
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

  /**
   * Estatísticas de um item (tarefa/conteúdo/prova) pra o professor: média de
   * % da turma + ranking de alunos, na tela de visualização do item. Reusa o
   * mesmo cálculo de Percentual já usado em buscarCategoriasCompletas (barra
   * de progresso), só que pra TODOS os alunos ativos da turma de uma vez, em
   * vez de só o usuário autenticado.
   */
  buscarEstatisticasItem = async (
    usuarioCPF: string,
    tipo: ItemTipo,
    itemGUID: string,
    turmaGUID: string
  ): Promise<EstatisticasItemDTO> => {
    console.log("🟣 CategoriaConteudoService.buscarEstatisticasItem()");

    let materiaGUID: string;

    if (tipo === "tarefa_digital" || tipo === "tarefa_presencial") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT mpt.MateriaGUID
         FROM tarefaacademica t
         INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
         WHERE t.TarefaGUID = ? LIMIT 1`,
        [itemGUID]
      );
      if (rows.length === 0) throw new ErrorResponse(404, "Tarefa não encontrada");
      materiaGUID = (rows[0] as any).MateriaGUID;
    } else if (tipo.startsWith("conteudo_")) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT MateriaGUID FROM conteudo WHERE ConteudoGUID = ? LIMIT 1`,
        [itemGUID]
      );
      if (rows.length === 0) throw new ErrorResponse(404, "Conteúdo não encontrado");
      materiaGUID = (rows[0] as any).MateriaGUID;
    } else {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT MateriaGUID FROM provaagendada WHERE ProvaAgendadaGUID = ? LIMIT 1`,
        [itemGUID]
      );
      if (rows.length === 0) throw new ErrorResponse(404, "Prova não encontrada");
      materiaGUID = (rows[0] as any).MateriaGUID;
    }

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

    let alunos: EstatisticaAlunoDTO[];

    if (tipo === "tarefa_digital" || tipo === "tarefa_presencial") {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT m.MatriculaGUID, u.UsuarioNome, tm.TarefaFeito, tm.TarefaNota,
                COALESCE(tm.TarefaPrazoDataMatricula, t.TarefaPrazoData) AS Prazo
         FROM matricula m
         INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
         CROSS JOIN tarefaacademica t
         LEFT JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID AND tm.MatriculaGUID = m.MatriculaGUID
         WHERE t.TarefaGUID = ? AND m.TurmaGUID = ? AND m.MatriculaStatus = 'Ativa'`,
        [itemGUID, turmaGUID]
      );
      alunos = (rows as any[]).map((row) => {
        const nota = row.TarefaNota !== null && row.TarefaNota !== undefined ? Number(row.TarefaNota) : null;
        const feito = Boolean(row.TarefaFeito);
        const prazoPassou = row.Prazo ? new Date(row.Prazo).getTime() < Date.now() : false;

        let percentual = 0;
        if (nota !== null) percentual = Math.round((nota / 10) * 100);
        else if (feito) percentual = 100;
        else if (prazoPassou) percentual = 0;

        return { MatriculaGUID: row.MatriculaGUID, AlunoNome: row.UsuarioNome, Percentual: percentual, Nota: nota };
      });
    } else if (tipo.startsWith("conteudo_")) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT m.MatriculaGUID, u.UsuarioNome, cp.PercentualConcluido
         FROM matricula m
         INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
         LEFT JOIN conteudoprogresso cp ON cp.ConteudoGUID = ? AND cp.MatriculaGUID = m.MatriculaGUID
         WHERE m.TurmaGUID = ? AND m.MatriculaStatus = 'Ativa'`,
        [itemGUID, turmaGUID]
      );
      alunos = (rows as any[]).map((row) => ({
        MatriculaGUID: row.MatriculaGUID,
        AlunoNome: row.UsuarioNome,
        Percentual: row.PercentualConcluido ?? 0,
        Nota: null,
      }));
    } else {
      // Prova: visualização é por ProvaAgendadaTurmaGUID, não pelo ProvaAgendadaGUID direto.
      const [ptRows] = await pool.execute<RowDataPacket[]>(
        `SELECT ProvaAgendadaTurmaGUID FROM provaagendada_turma WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ? LIMIT 1`,
        [itemGUID, turmaGUID]
      );
      if (ptRows.length === 0) {
        throw new ErrorResponse(404, "Prova não encontrada nesta turma");
      }
      const provaAgendadaTurmaGUID = (ptRows[0] as any).ProvaAgendadaTurmaGUID;

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT m.MatriculaGUID, u.UsuarioNome, pv.ProvaAgendadaVisualizacaoGUID
         FROM matricula m
         INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
         LEFT JOIN provaagendadavisualizacao pv ON pv.ProvaAgendadaTurmaGUID = ? AND pv.MatriculaGUID = m.MatriculaGUID
         WHERE m.TurmaGUID = ? AND m.MatriculaStatus = 'Ativa'`,
        [provaAgendadaTurmaGUID, turmaGUID]
      );
      alunos = (rows as any[]).map((row) => ({
        MatriculaGUID: row.MatriculaGUID,
        AlunoNome: row.UsuarioNome,
        Percentual: row.ProvaAgendadaVisualizacaoGUID ? 100 : 0,
        Nota: null,
      }));
    }

    const mediaPercentual = alunos.length > 0
      ? Math.round(alunos.reduce((soma, a) => soma + a.Percentual, 0) / alunos.length)
      : 0;
    const ranking = [...alunos].sort((a, b) => b.Percentual - a.Percentual);

    return { MediaPercentual: mediaPercentual, Ranking: ranking };
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

    // As 3 FKs de CategoriaGUID (tarefaacademica/conteudoturma/provaagendada_turma)
    // são RESTRICT — sem desvincular antes, o DELETE abaixo estouraria um erro
    // de constraint sempre que a categoria tivesse algum item. Itens caem pra
    // "sem categoria" (CategoriaGUID = NULL) em vez de serem apagados junto.
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`UPDATE tarefaacademica SET CategoriaGUID = NULL WHERE CategoriaGUID = ?`, [guid]);
      await connection.execute(`UPDATE conteudoturma SET CategoriaGUID = NULL WHERE CategoriaGUID = ?`, [guid]);
      await connection.execute(`UPDATE provaagendada_turma SET CategoriaGUID = NULL WHERE CategoriaGUID = ?`, [guid]);
      await connection.execute(`DELETE FROM categoriaconteudo WHERE CategoriaGUID = ?`, [guid]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
