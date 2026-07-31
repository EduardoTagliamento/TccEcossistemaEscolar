export const grupoTarefaKeys = {
  all: ['grupotarefa'] as const,
  porTarefa: (tarefaGUID: string) => ['grupotarefa', 'tarefa', tarefaGUID] as const,
  detalhe: (grupoGUID: string) => ['grupotarefa', 'grupo', grupoGUID] as const,
};
