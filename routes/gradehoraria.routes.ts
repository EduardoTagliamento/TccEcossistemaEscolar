import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { GradeHorariaController } from "../backend/controllers/gradehoraria.controller";
import { GradeHorariaMiddleware } from "../backend/middlewares/gradehoraria.middleware";
import HorarioTurmaService from "../backend/services/horarioturma.service";
import { HorarioTurmaDAO } from "../backend/repositories/horarioturma.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaConfiguracaoDAO } from "../backend/repositories/escolaconfiguracao.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Rota compartilhada de agendamento automático (Prova/Tarefa), independente
 * de uma turma específica na URL — recebe uma matéria e várias escolhas de
 * turma+semana de uma vez.
 */
export const gradeHorariaRouterFactory = () => {
  const router = Router();

  const database = new MysqlDatabase();
  const horarioTurmaDAO = new HorarioTurmaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const matProfTurDAO = new MaterialProfessorTurmaDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaConfiguracaoDAO = new EscolaConfiguracaoDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const horarioTurmaService = new HorarioTurmaService(
    horarioTurmaDAO,
    turmaDAO,
    matProfTurDAO,
    materiaDAO,
    usuarioDAO,
    escolaConfiguracaoDAO,
    escolaxUsuarioxFuncaoDAO
  );
  const gradeHorariaController = new GradeHorariaController(horarioTurmaService);

  router.use(AuthMiddleware.authenticate);

  // POST /api/grade-horaria/calcular-datas
  router.post(
    "/calcular-datas",
    GradeHorariaMiddleware.validarCalcularDatas,
    gradeHorariaController.calcularDatas
  );

  return router;
};
