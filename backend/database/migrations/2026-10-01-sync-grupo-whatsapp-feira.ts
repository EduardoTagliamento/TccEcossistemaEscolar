/**
 * Backfill pontual: o seed da feira técnica (`2026-10-01-feira-tecnica-univap.ts`)
 * e o fix de duplicatas (`2026-10-01-fix-duplicatas-feira-univap.ts`) escreveram
 * matrícula direto via SQL puro, pulando a camada de serviço inteira — o que
 * inclui o gatilho de "adicionar ao grupo de WhatsApp da turma, se houver um
 * vinculado e o aluno já tiver telefone" (ver `MatriculaService.criar` e
 * `TurmaGrupoWhatsappService`).
 *
 * Só tem 1 grupo de WhatsApp vinculado nessa escola hoje: turma 3H (confirmado
 * por consulta read-only). Os únicos usuários afetados que IMPORTAM aqui são
 * contas REAIS (com telefone) que ganharam matrícula nova hoje — as 1157
 * contas "casca" criadas pelo seed não têm telefone, então nem a sincronização
 * normal as adicionaria (fica pendente até a pessoa ativar a conta pelo fluxo
 * da feira — ver próximo script/nota sobre `FeiraUnivapService.ativar`).
 *
 * Reaproveita `sincronizarMembroPorTelefonePreenchido`, que já: acha as
 * matrículas ativas do usuário, e sincroniza (adiciona) em cada turma com
 * grupo vinculado — é seguro chamar pra qualquer usuário, mesmo os cuja
 * turma não tem grupo nenhum (o service só dá no-op nesse caso).
 */

import MysqlDatabase from "../MysqlDatabase";
import { TurmaGrupoWhatsappDAO } from "../../repositories/turmagrupowhatsapp.repository";
import { TurmaDAO } from "../../repositories/turma.repository";
import { UsuarioDAO } from "../../repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../../repositories/escolaxusuarioxfuncao.repository";
import TurmaGrupoWhatsappService from "../../services/turmagrupowhatsapp.service";

const USUARIO_GUIDS = [
  "unAygmyrfT3k", // Daniel Shimada (2H, sem grupo — no-op esperado)
  "LwpIWIW3ESZz", // João Batista
  "7Mpvyz8488rq", // Enrico Nascimento (3F, sem grupo — no-op esperado)
  "S6wb9wZ_5VCW", // Matheus Borges (3H, TEM grupo)
  "wA098L1gmgAH", // Antonio Junior (3H, TEM grupo)
  "N_0HF1onsLuX", // Guilherme Soares Dos Santos (3H, TEM grupo — matrícula nova de hoje)
  "Q8-rYZNFbvwo", // Lucas Castro De Oliveira (3H, TEM grupo — matrícula nova de hoje)
];

async function run() {
  const database = new MysqlDatabase();
  const turmaGrupoWhatsappDAO = new TurmaGrupoWhatsappDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const service = new TurmaGrupoWhatsappService(
    turmaGrupoWhatsappDAO,
    turmaDAO,
    usuarioDAO,
    escolaxUsuarioxFuncaoDAO,
    database
  );

  for (const guid of USUARIO_GUIDS) {
    const usuario = await usuarioDAO.findByGUID(guid);
    console.log(`\n--- ${usuario?.UsuarioNome ?? guid} ---`);
    await service.sincronizarMembroPorTelefonePreenchido(guid);
    console.log(`✅ Sincronização tentada (no-op se a turma não tiver grupo vinculado).`);
  }

  console.log("\n🎉 Backfill de sincronização concluído.");
  process.exit(0);
}

run().catch((erro) => {
  console.error("❌ Erro:", erro);
  process.exit(1);
});
