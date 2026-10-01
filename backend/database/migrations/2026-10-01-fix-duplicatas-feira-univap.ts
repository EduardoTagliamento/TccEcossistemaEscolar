/**
 * Correção pontual (não é seed novo, é FIX de dados criados pelo seed
 * anterior): `2026-10-01-feira-tecnica-univap.ts` resolvia aluno por nome
 * EXATO — quando a conta real já existia com um nome mais curto/apelido
 * (ex.: "Daniel Shimada" cadastrado assim, mas o JSON da feira tinha "Daniel
 * Dexter Koda Shimada"), a comparação não bateu e o seed criou uma conta
 * "casca" duplicada em vez de reaproveitar a real.
 *
 * 5 pares confirmados manualmente (ver conversa — cada um conferido por
 * UsuarioCreatedAt, telefone/email preenchido na conta real, e a casca
 * criada hoje sem telefone/email):
 *   Daniel Shimada ↔ Daniel Dexter Koda Shimada
 *   João Batista ↔ João Pedro Botejo Batista
 *   Enrico Nascimento ↔ Enrico Cabana Nascimento
 *   Matheus Borges ↔ Matheus Borgee Rodrigues
 *   Antonio Junior ↔ Antonio Junior Domingues Da Silva
 *
 * Pra cada par: repontua a Matricula ATIVA da casca pro UsuarioGUID da
 * conta real (preserva o MatriculaGUID — qualquer coisa que referencie a
 * matrícula por MatriculaGUID, não por UsuarioGUID direto, continua
 * funcionando sem mudança) + soft-delete da conta casca (mesmo padrão de
 * UsuarioDAO.delete — UsuarioDeletedAt, nunca DELETE físico) + avisa a
 * pessoa por WhatsApp no telefone da conta REAL (só ela tem telefone — a
 * casca nunca teve).
 *
 * Idempotente: se a casca já não tiver matrícula ativa (rodou 2x, ou foi
 * corrigida por outro meio), pula com aviso em vez de falhar.
 */

import MysqlDatabase from "../MysqlDatabase";
import EvolutionApiService from "../../external/EvolutionApiService";
import { paraFormatoEvolutionApi } from "../../utils/helpers/telefone.helper";

interface ParDuplicado {
  realGUID: string;
  shellGUID: string;
  shellNome: string;
}

const PARES_DUPLICADOS: ParDuplicado[] = [
  { realGUID: "unAygmyrfT3k", shellGUID: "Em401F-0BYlP", shellNome: "Daniel Dexter Koda Shimada" },
  { realGUID: "LwpIWIW3ESZz", shellGUID: "DUiftkxw6AaC", shellNome: "João Pedro Botejo Batista" },
  { realGUID: "7Mpvyz8488rq", shellGUID: "KY1iRfr4RvXn", shellNome: "Enrico Cabana Nascimento" },
  { realGUID: "S6wb9wZ_5VCW", shellGUID: "6cRqf15BF_9a", shellNome: "Matheus Borgee Rodrigues" },
  { realGUID: "wA098L1gmgAH", shellGUID: "xWjPoovoXAGQ", shellNome: "Antonio Junior Domingues Da Silva" },
];

function montarTextoAviso(nomeReal: string): string {
  return [
    `*Bauá — correção de cadastro*`,
    ``,
    `Olá, ${nomeReal}! O pré-cadastro da feira técnica do Colégio Univap gerou sem querer um cadastro duplicado pro seu nome.`,
    ``,
    `Já corrigimos: a sua conta (a mesma que você já usa, com seu login de sempre) ficou matriculada corretamente na turma da feira. Não precisa fazer nada — é só acessar normalmente.`,
  ].join("\n");
}

async function run() {
  console.log("🔧 Iniciando fix: duplicatas-feira-univap");

  const db = new MysqlDatabase();
  const pool = await db.getPool();

  for (const par of PARES_DUPLICADOS) {
    console.log(`\n--- ${par.shellNome} ---`);

    const [matriculaRows] = await pool.execute<any[]>(
      `SELECT MatriculaGUID, TurmaGUID FROM matricula WHERE UsuarioGUID = ? AND MatriculaStatus = 'Ativa'`,
      [par.shellGUID]
    );
    const matriculaCasca = matriculaRows[0];
    if (!matriculaCasca) {
      console.warn(`⚠️  Nenhuma matrícula ativa na casca (${par.shellGUID}) — já corrigido antes ou estado inesperado. Pulando.`);
      continue;
    }

    const [matriculaRealRows] = await pool.execute<any[]>(
      `SELECT MatriculaGUID FROM matricula WHERE UsuarioGUID = ? AND MatriculaStatus = 'Ativa'`,
      [par.realGUID]
    );
    if (matriculaRealRows.length > 0) {
      console.warn(`⚠️  A conta real (${par.realGUID}) já tem matrícula ativa própria — não reponteei pra não duplicar. Resolver manualmente.`);
      continue;
    }

    await pool.execute(
      `UPDATE matricula SET UsuarioGUID = ?, MatriculaUpdatedAt = NOW() WHERE MatriculaGUID = ?`,
      [par.realGUID, matriculaCasca.MatriculaGUID]
    );
    console.log(`✅ Matrícula ${matriculaCasca.MatriculaGUID} repontada pra conta real ${par.realGUID}.`);

    await pool.execute(
      `UPDATE usuario SET UsuarioDeletedAt = NOW() WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL`,
      [par.shellGUID]
    );
    console.log(`✅ Casca ${par.shellGUID} soft-deletada.`);

    const [usuarioRealRows] = await pool.execute<any[]>(
      `SELECT UsuarioNome, UsuarioTelefone FROM usuario WHERE UsuarioGUID = ?`,
      [par.realGUID]
    );
    const usuarioReal = usuarioRealRows[0];

    if (usuarioReal?.UsuarioTelefone) {
      try {
        const numero = paraFormatoEvolutionApi(usuarioReal.UsuarioTelefone);
        const texto = montarTextoAviso(usuarioReal.UsuarioNome);
        const resultado = await EvolutionApiService.getInstance().sendText(numero, texto);
        console.log(`✅ Aviso enviado por WhatsApp pra ${usuarioReal.UsuarioNome} (entregue=${resultado.entregue}).`);
      } catch (erro: any) {
        console.error(`❌ Falha ao enviar aviso por WhatsApp pra ${usuarioReal.UsuarioNome}:`, erro?.message ?? erro);
      }
    } else {
      console.warn(`⚠️  Conta real sem telefone cadastrado — não deu pra avisar por WhatsApp.`);
    }
  }

  console.log("\n🎉 Fix concluído.");
  process.exit(0);
}

run().catch((erro) => {
  console.error("❌ Erro ao executar fix:", erro);
  process.exit(1);
});
