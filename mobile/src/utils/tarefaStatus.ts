import type { AppTheme } from '../theme/theme';
import type { TarefaStatus } from '../api/tarefaacademica.api';

export function corStatusTarefa(status: TarefaStatus | undefined, theme: AppTheme) {
  switch (status) {
    case 'Concluida':
      return { bg: theme.successSoft, fg: theme.success, rail: theme.success, label: 'Concluída' };
    case 'Atrasada':
      return { bg: theme.dangerSoft, fg: theme.danger, rail: theme.danger, label: 'Atrasada' };
    case 'Rascunho':
      return { bg: theme.card2, fg: theme.faint, rail: theme.borderStrong, label: 'Rascunho' };
    case 'Pendente':
    default:
      return { bg: theme.spLight, fg: theme.spDark, rail: theme.spDark, label: 'Pendente' };
  }
}
