export type CalendarioTipoAviso = "tarefa" | "prova";

export interface CalendarioAviso {
  TipoAviso: CalendarioTipoAviso;
  AvisoId: string;
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
