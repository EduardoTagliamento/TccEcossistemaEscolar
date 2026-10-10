import { gerarGUID } from "../utils/helpers/guid.helper";
import RepresentanteLancamentoPropagacao from "../entities/representantelancamentopropagacao.model";
import { RepresentanteLancamentoPropagacaoDAO } from "../repositories/representantelancamentopropagacao.repository";
import { ConversaGrupoDAO } from "../repositories/conversa-grupo.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { EscolaConfiguracaoDAO } from "../repositories/escolaconfiguracao.repository";
import HorarioTurmaService from "./horarioturma.service";
import { DiaSemana } from "../utils/gradeHoraria.util";
import EvolutionApiService from "../external/EvolutionApiService";
import { paraFormatoEvolutionApi } from "../utils/helpers/telefone.helper";
import { UsuarioDAO } from "../repositories/usuario.repository";
import ErrorResponse from "../utils/ErrorResponse";
import MysqlDatabase from "../database/MysqlDatabase";
import { HorarioTurmaDAO } from "../repositories/horarioturma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { ProvaAgendadaDAO } from "../repositories/provaagendada.repository";
import ProvaAgendadaTurmaDAO from "../repositories/provaagendada-turma.repository";
import ProvaAgendadaTurma from "../entities/provaagendada-turma.model";
import { ConteudoDAO } from "../repositories/conteudo.repository";
import ConteudoTurmaDAO from "../repositories/conteudoturma.repository";
import ConteudoTurma from "../entities/conteudoturma.model";
import { TarefaAcademicaDAO } from "../repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import TarefaAcademica from "../entities/tarefaacademica.model";
import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";
import { MatriculaDAO } from "../repositories/matricula.repository";
import ProvaAgendada from "../entities/provaagendada.model";
import Conteudo from "../entities/conteudo.model";

export type TipoLancamento = 'Prova' | 'Tarefa' | 'Conteudo';

/** Modo de agendamento gravado na origem — só relevante pra Prova/Tarefa (ver §2.3 da spec: Conteúdo não tem prazo). */
export interface ModoAgendamentoDTO {
  modoAutomatico: boolean;
  semanaBase?: string; // YYYY-MM-DD, só quando modoAutomatico=true
  diaSemana?: DiaSemana; // só quando a turma de origem tinha mais de 1 ocorrência/semana
}

export interface DispararPropagacaoInput {
  tipo: TipoLancamento;
  origemGUID: string;
  turmaOrigemGUID: string;
  materiaGUID: string;
  professorUsuarioGUID: string;
  professorNome: string;
  resumoConteudo: string;
  modoAgendamento?: ModoAgendamentoDTO; // ausente para Conteudo
}

export interface ResolucaoDataTurmaDestino {
  status: 'ok' | 'semCronograma' | 'escolherDia' | 'especifico';
  dataCalculada?: string;
}

/**
 * Serviço central do fluxo "Lançamento de Prova/Tarefa/Conteúdo por
 * Representante" — ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 * Resolve permissão, turmas irmãs, disparo do fan-out via WhatsApp, e a
 * resolução de cada confirmação/recusa — inclusive a criação da entidade
 * resultante na turma destino (via DAO direto, não reentra em
 * ProvaAgendadaService/TarefaAcademicaService/ConteudoService, pra nunca
 * disparar uma nova rodada de propagação a partir de uma turma "folha").
 */
export default class RepresentanteLancamentoService {
  #propagacaoDAO: RepresentanteLancamentoPropagacaoDAO;
  #conversaGrupoDAO: ConversaGrupoDAO;
  #matProfTurDAO: MaterialProfessorTurmaDAO;
  #turmaDAO: TurmaDAO;
  #escolaConfiguracaoDAO: EscolaConfiguracaoDAO;
  #horarioTurmaService: HorarioTurmaService;
  #usuarioDAO: UsuarioDAO;
  #provaDAO: ProvaAgendadaDAO;
  #provaTurmaDAO: ProvaAgendadaTurmaDAO;
  #conteudoDAO: ConteudoDAO;
  #conteudoTurmaDAO: ConteudoTurmaDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #matriculaDAO: MatriculaDAO;
  #materiaDAO: MateriaDAO;

  constructor(
    propagacaoDAO: RepresentanteLancamentoPropagacaoDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    matProfTurDAO: MaterialProfessorTurmaDAO,
    turmaDAO: TurmaDAO,
    escolaConfiguracaoDAO: EscolaConfiguracaoDAO,
    horarioTurmaService: HorarioTurmaService,
    usuarioDAO: UsuarioDAO,
    provaDAO: ProvaAgendadaDAO,
    provaTurmaDAO: ProvaAgendadaTurmaDAO,
    conteudoDAO: ConteudoDAO,
    conteudoTurmaDAO: ConteudoTurmaDAO,
    tarefaDAO: TarefaAcademicaDAO,
    tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO,
    matriculaDAO: MatriculaDAO,
    materiaDAO: MateriaDAO
  ) {
    console.log("⬆️  RepresentanteLancamentoService.constructor()");
    this.#propagacaoDAO = propagacaoDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#matProfTurDAO = matProfTurDAO;
    this.#turmaDAO = turmaDAO;
    this.#escolaConfiguracaoDAO = escolaConfiguracaoDAO;
    this.#horarioTurmaService = horarioTurmaService;
    this.#usuarioDAO = usuarioDAO;
    this.#materiaDAO = materiaDAO;
    this.#provaDAO = provaDAO;
    this.#provaTurmaDAO = provaTurmaDAO;
    this.#conteudoDAO = conteudoDAO;
    this.#conteudoTurmaDAO = conteudoTurmaDAO;
    this.#tarefaDAO = tarefaDAO;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAO;
    this.#matriculaDAO = matriculaDAO;
  }

  /**
   * Autorização central do fluxo: a flag da escola precisa estar ligada E o
   * usuário precisa ser Representante/Vice-Representante ATIVO do grupo de
   * chat da turma (mesmo dado usado hoje só pra permissão de chat — ver
   * permissao-granular.helper.ts#resolverPermissaoChat).
   */
  podeLancarEmNomeDoProfessor = async (usuarioGUID: string, turmaGUID: string): Promise<boolean> => {
    console.log("🟣 RepresentanteLancamentoService.podeLancarEmNomeDoProfessor()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) return false;

    const flagLigada = await this.#escolaConfiguracaoDAO.getPermiteLancamentoPorRepresentante(turma.EscolaGUID);
    if (!flagLigada) return false;

    const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
    if (!grupo) return false;

    const funcao = await this.#conversaGrupoDAO.getFuncao(grupo.ConversaGUID, usuarioGUID);
    return funcao === 'Representante' || funcao === 'Vice-Representante';
  };

  /**
   * Alocações (matéria+professor) das turmas onde o usuário é representante,
   * já com nomes resolvidos — usado pelo frontend (seletor de "em qual turma/
   * matéria lançar") e espelha o que o chatbot monta em
   * listar_minhas_turmas_representante. Só inclui turmas cuja escola tem a
   * flag `PermiteLancamentoPorRepresentante` ligada.
   */
  listarAlocacoesOndeERepresentante = async (
    usuarioGUID: string,
    escolaGUID: string
  ): Promise<{ MatProfTurGUID: string; MateriaGUID: string; MateriaNome: string; TurmaGUID: string; TurmaNome: string; ProfessorNome: string }[]> => {
    console.log("🟣 RepresentanteLancamentoService.listarAlocacoesOndeERepresentante()");

    const flagLigada = await this.#escolaConfiguracaoDAO.getPermiteLancamentoPorRepresentante(escolaGUID);
    if (!flagLigada) return [];

    const turmas = await this.listarTurmasOndeERepresentante(usuarioGUID);
    const resultado: { MatProfTurGUID: string; MateriaGUID: string; MateriaNome: string; TurmaGUID: string; TurmaNome: string; ProfessorNome: string }[] = [];

    for (const t of turmas) {
      const turma = await this.#turmaDAO.findById(t.TurmaGUID);
      if (!turma || turma.EscolaGUID !== escolaGUID) continue;

      const alocacoes = (await this.#matProfTurDAO.findByTurma(t.TurmaGUID)).filter((a) => a.AlocacaoStatus === 'Ativa');
      for (const a of alocacoes) {
        const [professor, materia] = await Promise.all([
          this.#usuarioDAO.findByGUID(a.UsuarioGUID),
          this.#materiaDAO.findById(a.MateriaGUID),
        ]);
        resultado.push({
          MatProfTurGUID: a.MatProfTurGUID,
          MateriaGUID: a.MateriaGUID,
          MateriaNome: materia?.MateriaNome ?? '(matéria)',
          TurmaGUID: t.TurmaGUID,
          TurmaNome: `${turma.TurmaSerie ?? ''} ${turma.TurmaNome ?? ''}`.trim() || '(turma)',
          ProfessorNome: professor?.UsuarioNome ?? '(professor)',
        });
      }
    }
    return resultado;
  };

  /** Turmas onde o usuário é Representante/Vice-Representante ativo — usado pela sessão do chatbot. */
  listarTurmasOndeERepresentante = async (usuarioGUID: string): Promise<{ TurmaGUID: string; TurmaNome: string }[]> => {
    return this.#conversaGrupoDAO.findTurmasOndeERepresentante(usuarioGUID);
  };

  prepararOrigemTarefa = async (
    turmaGUID: string,
    materiaGUID: string
  ): Promise<{ professorUsuarioGUID: string; professorNome: string; matXprofXturxescGUID: string; matriculasGUID: string[] } | null> => {
    const professor = await this.resolverProfessorDaTurmaEMateria(turmaGUID, materiaGUID);
    if (!professor) return null;

    const alocacao = await this.#matProfTurDAO.findByMateriaTurmaProfessor(materiaGUID, turmaGUID, professor.UsuarioGUID);
    if (!alocacao) return null;

    const matriculasGUID = (await this.#matriculaDAO.findByTurma(turmaGUID))
      .filter((m) => m.MatriculaStatus === 'Ativa')
      .map((m) => m.MatriculaGUID);

    return {
      professorUsuarioGUID: professor.UsuarioGUID,
      professorNome: professor.UsuarioNome,
      matXprofXturxescGUID: alocacao.MatProfTurGUID,
      matriculasGUID,
    };
  };

  /** Resolve o professor responsável por uma matéria numa turma (via alocação ativa). */
  resolverProfessorDaTurmaEMateria = async (turmaGUID: string, materiaGUID: string): Promise<{ UsuarioGUID: string; UsuarioNome: string } | null> => {
    console.log("🟣 RepresentanteLancamentoService.resolverProfessorDaTurmaEMateria()");

    const alocacoes = await this.#matProfTurDAO.findAll({ TurmaGUID: turmaGUID, MateriaGUID: materiaGUID, AlocacaoStatus: 'Ativa' });
    if (alocacoes.length === 0) return null;

    const professor = await this.#usuarioDAO.findByGUID(alocacoes[0].UsuarioGUID);
    if (!professor) return null;
    return { UsuarioGUID: professor.UsuarioGUID, UsuarioNome: professor.UsuarioNome };
  };

  /**
   * Acha as turmas "irmãs": mesmo professor + mesma matéria + mesma série,
   * excluindo a turma de origem. Ver §2 da spec.
   */
  #resolverTurmasIrmas = async (turmaOrigemGUID: string, materiaGUID: string, professorUsuarioGUID: string) => {
    const turmaOrigem = await this.#turmaDAO.findById(turmaOrigemGUID);
    if (!turmaOrigem) return [];

    const alocacoes = await this.#matProfTurDAO.findAll({
      MateriaGUID: materiaGUID,
      UsuarioGUID: professorUsuarioGUID,
      AlocacaoStatus: 'Ativa',
    });

    const turmasIrmas: { TurmaGUID: string }[] = [];
    for (const aloc of alocacoes) {
      if (!aloc.TurmaGUID || aloc.TurmaGUID === turmaOrigemGUID) continue;
      const turma = await this.#turmaDAO.findById(aloc.TurmaGUID);
      if (turma && turma.TurmaSerie === turmaOrigem.TurmaSerie) {
        turmasIrmas.push({ TurmaGUID: aloc.TurmaGUID });
      }
    }
    return turmasIrmas;
  };

  /**
   * Dispara o fan-out: cria 1 linha `Pendente` por turma irmã com
   * representante ativo, e envia a mensagem de confirmação via WhatsApp.
   * Nunca lança erro pro chamador (mesma política de NotificacaoService —
   * uma falha aqui não pode derrubar a criação da entidade original).
   */
  dispararPropagacao = async (input: DispararPropagacaoInput): Promise<void> => {
    console.log("🟣 RepresentanteLancamentoService.dispararPropagacao()");

    try {
      const turmasIrmas = await this.#resolverTurmasIrmas(input.turmaOrigemGUID, input.materiaGUID, input.professorUsuarioGUID);

      for (const { TurmaGUID: turmaDestinoGUID } of turmasIrmas) {
        const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaDestinoGUID);
        if (!grupo) continue; // turma sem grupo de chat — não tem quem notificar

        const representantes = [
          ...(await this.#conversaGrupoDAO.findAllByFuncao(grupo.ConversaGUID, 'Representante')),
          ...(await this.#conversaGrupoDAO.findAllByFuncao(grupo.ConversaGUID, 'Vice-Representante')),
        ];
        if (representantes.length === 0) continue; // sem representante ativo — pula, sem notificar ninguém

        const propagacao = new RepresentanteLancamentoPropagacao();
        propagacao.PropagacaoGUID = gerarGUID();
        propagacao.TipoOrigem = input.tipo;
        propagacao.OrigemGUID = input.origemGUID;
        propagacao.TurmaOrigemGUID = input.turmaOrigemGUID;
        propagacao.TurmaDestinoGUID = turmaDestinoGUID;
        propagacao.RepresentanteDestinoUsuarioGUID = null;
        propagacao.Status = 'Pendente';
        propagacao.ConteudoEditado = null;
        propagacao.EntidadeResultanteGUID = null;
        propagacao.CreatedAt = new Date();
        propagacao.RespondidoEm = null;
        propagacao.validar();
        await this.#propagacaoDAO.create(propagacao);

        const turmaDestino = await this.#turmaDAO.findById(turmaDestinoGUID);
        const texto =
          `📋 ${input.professorNome} cadastrou ${this.#nomeAmigavel(input.tipo)} de ` +
          `conteúdo: "${input.resumoConteudo}".\n\n` +
          `Confirma a criação para a turma ${turmaDestino ? `${turmaDestino.TurmaSerie} ${turmaDestino.TurmaNome}` : ""}? ` +
          `Responda SIM para criar igual, ou me diga o conteúdo diferente que você quer usar para essa turma.`;

        for (const rep of representantes) {
          const usuario = await this.#usuarioDAO.findByGUID(rep.MembroUsuarioGUID);
          if (usuario?.UsuarioTelefone) {
            await EvolutionApiService.getInstance().sendText(paraFormatoEvolutionApi(usuario.UsuarioTelefone), texto);
          }
        }
      }
    } catch (error) {
      console.error("🔴 RepresentanteLancamentoService.dispararPropagacao() falhou (não propagado):", error);
    }
  };

  /**
   * Resolve a data/prazo pra uma turma destino, reaproveitando o modo
   * gravado na origem (ver §2.2 da spec). Só chamado para Prova/Tarefa —
   * Conteúdo nunca passa por aqui (§2.3).
   */
  resolverDataParaTurmaDestino = async (
    materiaGUID: string,
    turmaDestinoGUID: string,
    modo: ModoAgendamentoDTO
  ): Promise<ResolucaoDataTurmaDestino> => {
    console.log("🟣 RepresentanteLancamentoService.resolverDataParaTurmaDestino()");

    if (!modo.modoAutomatico || !modo.semanaBase) {
      return { status: 'especifico' };
    }

    const [resultado] = await this.#horarioTurmaService.calcularDatas(materiaGUID, [
      { TurmaGUID: turmaDestinoGUID, SemanaBase: modo.semanaBase, DiaSemana: modo.diaSemana },
    ]);

    if (resultado.status === 'ok') {
      return { status: 'ok', dataCalculada: resultado.DataCalculada };
    }
    // "erro" (ex.: DiaSemana da origem não bate com nenhuma ocorrência desta
    // turma) cai no mesmo fallback de "semCronograma" — em ambos os casos o
    // chamador não consegue resolver a data sozinho e precisa perguntar.
    return { status: resultado.status === 'escolherDia' ? 'escolherDia' : 'semCronograma' };
  };

  #nomeAmigavel = (tipo: TipoLancamento): string => {
    if (tipo === 'Prova') return 'uma prova';
    if (tipo === 'Tarefa') return 'uma tarefa';
    return 'um conteúdo';
  };

  /**
   * Resolve o prazo/data pra uma turma destino específica de Prova/Tarefa,
   * a partir dos campos de modo gravados na entidade de origem. `null` de
   * volta em "especifico" significa "usa a data compartilhada da própria
   * entidade, sem override" — mesmo comportamento de DatasPorTurma ausente.
   */
  #resolverDataOuPendencia = async (
    materiaGUID: string,
    turmaDestinoGUID: string,
    modoAutomatico: boolean,
    semanaBase: string | null,
    diaSemana: string | null
  ): Promise<{ ok: true; data: Date | null } | { ok: false; motivo: 'semCronograma' | 'escolherDia' }> => {
    if (!modoAutomatico) return { ok: true, data: null };

    const resolucao = await this.resolverDataParaTurmaDestino(materiaGUID, turmaDestinoGUID, {
      modoAutomatico: true,
      semanaBase: semanaBase ?? undefined,
      diaSemana: (diaSemana as DiaSemana) ?? undefined,
    });
    if (resolucao.status === 'ok' && resolucao.dataCalculada) {
      return { ok: true, data: new Date(resolucao.dataCalculada) };
    }
    return { ok: false, motivo: resolucao.status === 'escolherDia' ? 'escolherDia' : 'semCronograma' };
  };

  #validarRepresentanteDaTurma = async (usuarioGUID: string, turmaGUID: string): Promise<void> => {
    const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
    const funcao = grupo ? await this.#conversaGrupoDAO.getFuncao(grupo.ConversaGUID, usuarioGUID) : null;
    if (funcao !== 'Representante' && funcao !== 'Vice-Representante') {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não é representante ativo desta turma.",
      });
    }
  };

  /**
   * Confirma uma propagação Pendente ("sim, cria igual pra minha turma").
   * Prova/Conteúdo: adiciona a turma na entidade de origem (nunca cria nova).
   * Tarefa: cria uma nova TarefaAcademica pra essa turma (1-registro-por-turma).
   */
  confirmarPropagacao = async (propagacaoGUID: string, representanteGUID: string): Promise<{ ok: true } | { ok: false; motivo: 'semCronograma' | 'escolherDia' }> => {
    console.log("🟣 RepresentanteLancamentoService.confirmarPropagacao()");

    const propagacao = await this.buscarPropagacao(propagacaoGUID);
    if (propagacao.Status !== 'Pendente') {
      throw new ErrorResponse(409, "Propagação já respondida", { message: "Esta propagação já foi confirmada ou recusada." });
    }
    await this.#validarRepresentanteDaTurma(representanteGUID, propagacao.TurmaDestinoGUID);

    if (propagacao.TipoOrigem === 'Prova') {
      const prova = await this.#provaDAO.findById(propagacao.OrigemGUID);
      if (!prova) throw new ErrorResponse(404, "Prova de origem não encontrada");

      const resolucao = await this.#resolverDataOuPendencia(
        prova.MateriaGUID, propagacao.TurmaDestinoGUID, prova.ProvaModoAutomatico, prova.ProvaSemanaBase, prova.ProvaDiaSemana
      );
      if (!resolucao.ok) return { ok: false, motivo: resolucao.motivo };

      const atribuicao = new ProvaAgendadaTurma();
      atribuicao.ProvaAgendadaTurmaGUID = gerarGUID();
      atribuicao.ProvaAgendadaGUID = prova.ProvaAgendadaGUID;
      atribuicao.TurmaGUID = propagacao.TurmaDestinoGUID;
      atribuicao.ProvaDataTurma = resolucao.data;
      atribuicao.CategoriaGUID = null;
      await this.#provaTurmaDAO.create(atribuicao);

      await this.#propagacaoDAO.marcarConfirmado(propagacaoGUID, representanteGUID, prova.ProvaAgendadaGUID);
      return { ok: true };
    }

    if (propagacao.TipoOrigem === 'Conteudo') {
      const conteudo = await this.#conteudoDAO.findById(propagacao.OrigemGUID);
      if (!conteudo) throw new ErrorResponse(404, "Conteúdo de origem não encontrado");

      const atribuicao = new ConteudoTurma();
      atribuicao.ConteudoTurmaGUID = gerarGUID();
      atribuicao.ConteudoGUID = conteudo.ConteudoGUID;
      atribuicao.TurmaGUID = propagacao.TurmaDestinoGUID;
      // Conteúdo não tem prazo — publica no momento da confirmação (ver §2.3 da spec).
      atribuicao.ConteudoDataPublicacaoTurma = new Date();
      atribuicao.CategoriaGUID = null;
      await this.#conteudoTurmaDAO.createBatch([atribuicao]);

      await this.#propagacaoDAO.marcarConfirmado(propagacaoGUID, representanteGUID, conteudo.ConteudoGUID);
      return { ok: true };
    }

    // Tarefa: 1-registro-por-turma — cria uma NOVA TarefaAcademica.
    const tarefaOrigem = await this.#tarefaDAO.findById(propagacao.OrigemGUID);
    if (!tarefaOrigem) throw new ErrorResponse(404, "Tarefa de origem não encontrada");
    const alocacaoOrigem = await this.#matProfTurDAO.findById(tarefaOrigem.matXprofXturxescGUID);
    if (!alocacaoOrigem) throw new ErrorResponse(404, "Alocação de origem não encontrada");

    const alocacaoDestino = await this.#matProfTurDAO.findByMateriaTurmaProfessor(
      alocacaoOrigem.MateriaGUID, propagacao.TurmaDestinoGUID, alocacaoOrigem.UsuarioGUID
    );
    if (!alocacaoDestino) throw new ErrorResponse(404, "Professor não leciona esta matéria na turma destino");

    const resolucao = await this.#resolverDataOuPendencia(
      alocacaoOrigem.MateriaGUID, propagacao.TurmaDestinoGUID,
      tarefaOrigem.TarefaPrazoModoAutomatico, tarefaOrigem.TarefaPrazoSemanaBase, tarefaOrigem.TarefaPrazoDiaSemana
    );
    if (!resolucao.ok) return { ok: false, motivo: resolucao.motivo };

    const novaTarefa = await this.#criarTarefaParaTurmaDestino(
      alocacaoDestino.MatProfTurGUID, propagacao.TurmaDestinoGUID, tarefaOrigem,
      resolucao.data ?? tarefaOrigem.TarefaPrazoData, tarefaOrigem.TarefaConteudo, representanteGUID
    );

    await this.#propagacaoDAO.marcarConfirmado(propagacaoGUID, representanteGUID, novaTarefa.TarefaGUID);
    return { ok: true };
  };

  /**
   * Recusa uma propagação Pendente com um conteúdo diferente do original —
   * cria uma entidade SEPARADA (nunca entra na de origem), escopada só à
   * turma do representante que recusou.
   */
  recusarComEdicaoPropagacao = async (
    propagacaoGUID: string,
    representanteGUID: string,
    novoConteudo: string
  ): Promise<{ ok: true } | { ok: false; motivo: 'semCronograma' | 'escolherDia' }> => {
    console.log("🟣 RepresentanteLancamentoService.recusarComEdicaoPropagacao()");

    const propagacao = await this.buscarPropagacao(propagacaoGUID);
    if (propagacao.Status !== 'Pendente') {
      throw new ErrorResponse(409, "Propagação já respondida", { message: "Esta propagação já foi confirmada ou recusada." });
    }
    await this.#validarRepresentanteDaTurma(representanteGUID, propagacao.TurmaDestinoGUID);

    if (propagacao.TipoOrigem === 'Prova') {
      const provaOrigem = await this.#provaDAO.findById(propagacao.OrigemGUID);
      if (!provaOrigem) throw new ErrorResponse(404, "Prova de origem não encontrada");

      const resolucao = await this.#resolverDataOuPendencia(
        provaOrigem.MateriaGUID, propagacao.TurmaDestinoGUID, provaOrigem.ProvaModoAutomatico, provaOrigem.ProvaSemanaBase, provaOrigem.ProvaDiaSemana
      );
      if (!resolucao.ok) return { ok: false, motivo: resolucao.motivo };

      const novaProva = new ProvaAgendada();
      novaProva.ProvaAgendadaGUID = gerarGUID();
      novaProva.MateriaGUID = provaOrigem.MateriaGUID;
      novaProva.ProvaTitulo = provaOrigem.ProvaTitulo;
      novaProva.ProvaData = resolucao.data ?? provaOrigem.ProvaData;
      novaProva.ProvaDescricao = novoConteudo;
      novaProva.ProvaStatus = "Agendada";
      novaProva.CriadoPorRepresentanteUsuarioGUID = representanteGUID;
      await this.#provaDAO.create(novaProva);

      const atribuicao = new ProvaAgendadaTurma();
      atribuicao.ProvaAgendadaTurmaGUID = gerarGUID();
      atribuicao.ProvaAgendadaGUID = novaProva.ProvaAgendadaGUID;
      atribuicao.TurmaGUID = propagacao.TurmaDestinoGUID;
      atribuicao.ProvaDataTurma = null;
      atribuicao.CategoriaGUID = null;
      await this.#provaTurmaDAO.create(atribuicao);

      await this.#propagacaoDAO.marcarRecusadoComEdicao(propagacaoGUID, representanteGUID, novoConteudo, novaProva.ProvaAgendadaGUID);
      return { ok: true };
    }

    if (propagacao.TipoOrigem === 'Conteudo') {
      const conteudoOrigem = await this.#conteudoDAO.findById(propagacao.OrigemGUID);
      if (!conteudoOrigem) throw new ErrorResponse(404, "Conteúdo de origem não encontrado");

      const novoConteudoEntity = new Conteudo();
      novoConteudoEntity.ConteudoGUID = gerarGUID();
      novoConteudoEntity.MateriaGUID = conteudoOrigem.MateriaGUID;
      novoConteudoEntity.UsuarioGUID = conteudoOrigem.UsuarioGUID;
      novoConteudoEntity.CategoriaGUID = null;
      novoConteudoEntity.ConteudoTitulo = conteudoOrigem.ConteudoTitulo;
      novoConteudoEntity.ConteudoTipo = conteudoOrigem.ConteudoTipo;
      novoConteudoEntity.ConteudoDescricao = novoConteudo;
      novoConteudoEntity.ConteudoDataPublicacao = new Date();
      novoConteudoEntity.CriadoPorRepresentanteUsuarioGUID = representanteGUID;
      await this.#conteudoDAO.create(novoConteudoEntity);
      // Nota: não duplica anexo/link/texto do tipo original (cronometrado/texto/
      // paginado) — o conteúdo editado via WhatsApp vira só título+descrição.
      // Simplificação conhecida, documentada em §9 da spec.

      const atribuicao = new ConteudoTurma();
      atribuicao.ConteudoTurmaGUID = gerarGUID();
      atribuicao.ConteudoGUID = novoConteudoEntity.ConteudoGUID;
      atribuicao.TurmaGUID = propagacao.TurmaDestinoGUID;
      atribuicao.ConteudoDataPublicacaoTurma = new Date();
      atribuicao.CategoriaGUID = null;
      await this.#conteudoTurmaDAO.createBatch([atribuicao]);

      await this.#propagacaoDAO.marcarRecusadoComEdicao(propagacaoGUID, representanteGUID, novoConteudo, novoConteudoEntity.ConteudoGUID);
      return { ok: true };
    }

    // Tarefa
    const tarefaOrigem = await this.#tarefaDAO.findById(propagacao.OrigemGUID);
    if (!tarefaOrigem) throw new ErrorResponse(404, "Tarefa de origem não encontrada");
    const alocacaoOrigem = await this.#matProfTurDAO.findById(tarefaOrigem.matXprofXturxescGUID);
    if (!alocacaoOrigem) throw new ErrorResponse(404, "Alocação de origem não encontrada");

    const alocacaoDestino = await this.#matProfTurDAO.findByMateriaTurmaProfessor(
      alocacaoOrigem.MateriaGUID, propagacao.TurmaDestinoGUID, alocacaoOrigem.UsuarioGUID
    );
    if (!alocacaoDestino) throw new ErrorResponse(404, "Professor não leciona esta matéria na turma destino");

    const resolucao = await this.#resolverDataOuPendencia(
      alocacaoOrigem.MateriaGUID, propagacao.TurmaDestinoGUID,
      tarefaOrigem.TarefaPrazoModoAutomatico, tarefaOrigem.TarefaPrazoSemanaBase, tarefaOrigem.TarefaPrazoDiaSemana
    );
    if (!resolucao.ok) return { ok: false, motivo: resolucao.motivo };

    const novaTarefa = await this.#criarTarefaParaTurmaDestino(
      alocacaoDestino.MatProfTurGUID, propagacao.TurmaDestinoGUID, tarefaOrigem,
      resolucao.data ?? tarefaOrigem.TarefaPrazoData, novoConteudo, representanteGUID
    );

    await this.#propagacaoDAO.marcarRecusadoComEdicao(propagacaoGUID, representanteGUID, novoConteudo, novaTarefa.TarefaGUID);
    return { ok: true };
  };

  /** Cria a TarefaAcademica "leaf" de uma turma destino (confirmação ou recusa-com-edição) — nunca dispara nova propagação. */
  #criarTarefaParaTurmaDestino = async (
    matProfTurGUIDDestino: string,
    turmaDestinoGUID: string,
    tarefaOrigem: TarefaAcademica,
    prazo: Date,
    conteudo: string | null,
    representanteGUID: string
  ): Promise<TarefaAcademica> => {
    const novaTarefa = new TarefaAcademica();
    novaTarefa.TarefaGUID = gerarGUID();
    novaTarefa.matXprofXturxescGUID = matProfTurGUIDDestino;
    novaTarefa.TarefaTitulo = tarefaOrigem.TarefaTitulo;
    novaTarefa.TarefaConteudo = conteudo;
    novaTarefa.TarefaPostagemData = new Date();
    novaTarefa.TarefaPrazoData = prazo;
    novaTarefa.TarefaTipoEntrega = tarefaOrigem.TarefaTipoEntrega;
    novaTarefa.CategoriaGUID = null;
    novaTarefa.TarefaCompartilhada = false;
    novaTarefa.CriadoPorRepresentanteUsuarioGUID = representanteGUID;
    novaTarefa.validarCompartilhada();

    const tarefaCriada = await this.#tarefaDAO.create(novaTarefa);

    const matriculasAtivas = (await this.#matriculaDAO.findByTurma(turmaDestinoGUID)).filter((m) => m.MatriculaStatus === 'Ativa');
    const atribuicoes = matriculasAtivas.map((m) => {
      const atrib = new TarefaAcademicaMatricula();
      atrib.TarefaMatriculaGUID = gerarGUID();
      atrib.TarefaGUID = tarefaCriada.TarefaGUID;
      atrib.MatriculaGUID = m.MatriculaGUID;
      atrib.TarefaPrazoDataMatricula = null;
      atrib.TarefaFeito = false;
      atrib.TarefaRealizacaoData = null;
      return atrib;
    });
    if (atribuicoes.length > 0) {
      await this.#tarefaMatriculaDAO.createBatch(atribuicoes);
    }

    return tarefaCriada;
  };

  buscarPropagacao = async (propagacaoGUID: string): Promise<RepresentanteLancamentoPropagacao> => {
    const propagacao = await this.#propagacaoDAO.findById(propagacaoGUID);
    if (!propagacao) {
      throw new ErrorResponse(404, "Propagação não encontrada", { message: `Não existe propagação com id ${propagacaoGUID}` });
    }
    return propagacao;
  };

  /** Propagações pendentes endereçadas às turmas onde o usuário é representante — usado pelo chatbot. */
  listarPendentesParaUsuario = async (usuarioGUID: string): Promise<RepresentanteLancamentoPropagacao[]> => {
    const turmas = await this.#conversaGrupoDAO.findTurmasOndeERepresentante(usuarioGUID);
    const pendentes: RepresentanteLancamentoPropagacao[] = [];
    for (const t of turmas) {
      pendentes.push(...(await this.#propagacaoDAO.findPendentesPorTurmaERepresentante(t.TurmaGUID)));
    }
    return pendentes;
  };

  /** Mesma listagem acima, mas já com resumo legível (tipo, título, turma) — usado pela ferramenta do chatbot. */
  listarPendentesComResumoParaUsuario = async (
    usuarioGUID: string
  ): Promise<{ PropagacaoGUID: string; tipo: TipoLancamento; resumo: string; turma: string }[]> => {
    const pendentes = await this.listarPendentesParaUsuario(usuarioGUID);
    const resultado: { PropagacaoGUID: string; tipo: TipoLancamento; resumo: string; turma: string }[] = [];

    for (const p of pendentes) {
      let titulo = "";
      if (p.TipoOrigem === 'Prova') {
        titulo = (await this.#provaDAO.findById(p.OrigemGUID))?.ProvaTitulo ?? "";
      } else if (p.TipoOrigem === 'Tarefa') {
        titulo = (await this.#tarefaDAO.findById(p.OrigemGUID))?.TarefaTitulo ?? "";
      } else {
        titulo = (await this.#conteudoDAO.findById(p.OrigemGUID))?.ConteudoTitulo ?? "";
      }
      const turma = await this.#turmaDAO.findById(p.TurmaDestinoGUID);
      resultado.push({
        PropagacaoGUID: p.PropagacaoGUID,
        tipo: p.TipoOrigem,
        resumo: titulo,
        turma: turma ? `${turma.TurmaSerie} ${turma.TurmaNome}` : p.TurmaDestinoGUID,
      });
    }
    return resultado;
  };
}

let instanciaSingleton: RepresentanteLancamentoService | null = null;

export function getRepresentanteLancamentoService(): RepresentanteLancamentoService {
  if (!instanciaSingleton) {
    const database = MysqlDatabase.getInstance();
    const turmaDAO = new TurmaDAO(database);
    const matProfTurDAO = new MaterialProfessorTurmaDAO(database);
    const escolaConfiguracaoDAO = new EscolaConfiguracaoDAO(database);
    const usuarioDAO = new UsuarioDAO(database);
    const horarioTurmaService = new HorarioTurmaService(
      new HorarioTurmaDAO(database),
      turmaDAO,
      matProfTurDAO,
      new MateriaDAO(database),
      usuarioDAO,
      escolaConfiguracaoDAO,
      new EscolaxUsuarioxFuncaoDAO(database),
      new MatriculaDAO(database)
    );
    instanciaSingleton = new RepresentanteLancamentoService(
      new RepresentanteLancamentoPropagacaoDAO(database),
      new ConversaGrupoDAO(database),
      matProfTurDAO,
      turmaDAO,
      escolaConfiguracaoDAO,
      horarioTurmaService,
      usuarioDAO,
      new ProvaAgendadaDAO(database),
      new ProvaAgendadaTurmaDAO(database),
      new ConteudoDAO(database),
      new ConteudoTurmaDAO(database),
      new TarefaAcademicaDAO(database),
      new TarefaAcademicaMatriculaDAO(database),
      new MatriculaDAO(database),
      new MateriaDAO(database)
    );
  }
  return instanciaSingleton;
}
