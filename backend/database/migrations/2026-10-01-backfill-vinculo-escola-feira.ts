/**
 * Mesma causa raiz de sempre: o seed da feira (`2026-10-01-feira-tecnica-univap.ts`)
 * escreveu Matricula direto via SQL puro, pulando `MatriculaService.criar` —
 * que, além do grupo de chat e do grupo de WhatsApp (já corrigidos nos
 * backfills anteriores), também garante um vínculo Ativo de Aluno
 * (FuncaoId=5) em `escolaxusuarioxfuncao` pra cada matrícula nova (ver
 * `MatriculaService.garantirVinculoAluno`, chamado logo após criar a
 * matrícula). Sem isso, mesmo com conta ativada e matrícula certa, o app não
 * reconhece a pessoa como vinculada à escola — é exatamente o sintoma
 * relatado: Luigi Nucci (3J) ativou a conta e viu "você ainda não está
 * vinculado a nenhuma escola" + botão de criar escola.
 *
 * Esse é o único dos 3 vínculos faltantes que NÃO depende de telefone — ao
 * contrário do grupo de WhatsApp (só sincroniza quem já tem telefone) e do
 * grupo de chat (que entra imediatamente, idependente de telefone, mas só
 * foi backfilled pros que já tinham matrícula até aquele momento), o vínculo
 * de escola deveria ter sido criado já no momento da matrícula, pra TODOS —
 * ativados ou não. Esse backfill cobre todo mundo de uma vez (idempotente,
 * reaproveitável se rodar de novo).
 */

import MysqlDatabase from "../MysqlDatabase";
import { EscolaxUsuarioxFuncaoDAO } from "../../repositories/escolaxusuarioxfuncao.repository";
import EscolaxUsuarioxFuncao from "../../entities/escolaxusuarioxfuncao.model";

const ESCOLA_GUID = "b67a6634-9afd-4fb3-8227-d2569a3db98c";
const FUNCAO_ALUNO = 5;

async function run() {
  const database = new MysqlDatabase();
  const pool = await database.getPool();
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const [matriculas] = await pool.execute<any[]>(
    `SELECT DISTINCT m.UsuarioGUID, u.UsuarioNome
     FROM matricula m
     JOIN usuario u ON u.UsuarioGUID = m.UsuarioGUID
     WHERE m.MatriculaStatus = 'Ativa'
       AND m.TurmaGUID IN (SELECT TurmaGUID FROM turma WHERE EscolaGUID = ?)`,
    [ESCOLA_GUID]
  );

  console.log(`Alunos com matrícula ativa nessa escola: ${matriculas.length}`);

  let criados = 0;
  let reativados = 0;
  let jaOk = 0;

  for (const { UsuarioGUID, UsuarioNome } of matriculas) {
    const existente = await escolaxUsuarioxFuncaoDAO.findByTripla(UsuarioGUID, ESCOLA_GUID, FUNCAO_ALUNO);

    if (!existente) {
      const vinculo = new EscolaxUsuarioxFuncao();
      vinculo.UsuarioGUID = UsuarioGUID;
      vinculo.EscolaGUID = ESCOLA_GUID;
      vinculo.FuncaoId = FUNCAO_ALUNO;
      vinculo.DataInicio = new Date();
      vinculo.DataFim = null;
      vinculo.Status = "Ativo";
      await escolaxUsuarioxFuncaoDAO.create(vinculo);
      criados++;
      continue;
    }

    if (existente.Status !== "Ativo") {
      existente.Status = "Ativo";
      existente.DataInicio = new Date();
      existente.DataFim = null;
      await escolaxUsuarioxFuncaoDAO.update(existente);
      reativados++;
      console.log(`↻ Reativado: ${UsuarioNome}`);
      continue;
    }

    jaOk++;
  }

  console.log(`\n🎉 Concluído. Criados: ${criados} | Reativados: ${reativados} | Já estava Ativo: ${jaOk}`);
  process.exit(0);
}

run().catch((erro) => {
  console.error("❌ Erro:", erro);
  process.exit(1);
});
