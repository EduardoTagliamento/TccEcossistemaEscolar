import {
  HorarioTurmaTurmaGUIDParamSchema,
  HorarioTurmaHorarioGUIDParamSchema,
  CriarSlotBodySchema,
  mensagemTopoHorarioTurma,
} from "../schemas/horarioturma.schema";
import { zodValidate } from "../utils/zodValidate";

export class HorarioTurmaMiddleware {
  static validarTurmaGUID = zodValidate(HorarioTurmaTurmaGUIDParamSchema, "params", mensagemTopoHorarioTurma);

  static validarHorarioTurmaGUID = zodValidate(HorarioTurmaHorarioGUIDParamSchema, "params", mensagemTopoHorarioTurma);

  static validarCriacaoSlot = zodValidate(CriarSlotBodySchema, "body", mensagemTopoHorarioTurma);
}
