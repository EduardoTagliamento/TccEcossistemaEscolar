import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Inicio: undefined;
  Materias: undefined;
  Tarefas: undefined;
  Conversas: undefined;
  Calendario: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SelecionarEscola: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  MateriaDetalhe: { materiaGUID: string; materiaNome: string };
  Chat: { conversaGUID: string; titulo: string };
  Notificacoes: undefined;
  Perfil: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
