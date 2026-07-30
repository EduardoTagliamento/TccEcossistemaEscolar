import { listarTarefas } from '@/lib/api/tarefaacademica.api';

export type TarefaFiltros = Parameters<typeof listarTarefas>[0];

export const tarefaKeys = {
  all: ['tarefas'] as const,
  lista: (filtros?: TarefaFiltros) => ['tarefas', filtros ?? {}] as const,
  detalhe: (tarefaGUID: string) => ['tarefa', tarefaGUID] as const,
  itemDetalhe: (tarefaGUID: string, ehProfessor: boolean) => ['tarefa', tarefaGUID, 'item-detalhe', ehProfessor] as const,
  questoes: (tarefaGUID: string) => ['tarefa', tarefaGUID, 'questoes'] as const,
  questoesComRespostas: (tarefaGUID: string) => ['tarefa', tarefaGUID, 'questoes', 'minhas-respostas'] as const,
  respostasAluno: (tarefaGUID: string, matriculaGUID: string) =>
    ['tarefa', tarefaGUID, 'questoes', 'matricula', matriculaGUID] as const,
  estatisticas: (itemGUID: string) => ['tarefa', itemGUID, 'estatisticas'] as const,
  estatisticasPorQuestao: (tarefaGUID: string, turmaGUID: string) =>
    ['tarefa', tarefaGUID, 'estatisticas-por-questao', turmaGUID] as const,
};
