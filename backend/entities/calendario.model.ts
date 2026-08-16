export type CalendarioTipoAviso = "tarefa" | "prova";

export interface CalendarioAviso {
  TipoAviso: CalendarioTipoAviso;
  AvisoId: string;
  MatriculaGUID: string | null;
  /** Matéria/turma do item — usado pra montar o link "ir para a página da matéria". */
  MateriaGUID: string | null;
  TurmaGUID: string | null;
  DataPrazo: Date;
  Titulo: string;
  Descricao: string | null;
  StatusBoolean: boolean | null;
  StatusTexto: string;
  TipoEntrega: "digital" | "fisica" | null;
  QtdAnexosDescricao: number;
  QtdAnexosEntrega: number;
  PermiteMarcarFeito: boolean;
  PermiteEnviarAnexo: boolean;
  IconeTipo: "tarefa" | "prova";
  CreatedAt: Date | null;
}

export interface CalendarioFilters {
  DataInicio?: Date;
  DataFim?: Date;
  TipoAviso?: CalendarioTipoAviso;
}
