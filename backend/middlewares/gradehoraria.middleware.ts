import { GradeHorariaCalcularDatasBodySchema, mensagemTopoGradeHoraria } from "../schemas/gradehoraria.schema";
import { zodValidate } from "../utils/zodValidate";

export class GradeHorariaMiddleware {
  static validarCalcularDatas = zodValidate(GradeHorariaCalcularDatasBodySchema, "body", mensagemTopoGradeHoraria);
}
