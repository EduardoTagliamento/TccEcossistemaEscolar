/**
 * Só a etapa de aviso que falhou na primeira rodada de
 * `2026-10-01-fix-duplicatas-feira-univap.ts` (faltava EVOLUTION_API_URL/
 * EVOLUTION_INSTANCE_NAME/EVOLUTION_API_KEY no ambiente usado pra rodar o
 * fix — essas variáveis só existem no serviço do Railway, não dão pra
 * combinar com o proxy público de MySQL via `railway run` sem risco de
 * conflito de DB_HOST). A correção no banco (matrícula repontada + casca
 * soft-deletada) já foi feita e confirmada — este script só manda o aviso
 * por WhatsApp pras 5 contas reais.
 */

import MysqlDatabase from "../MysqlDatabase";
import EvolutionApiService from "../../external/EvolutionApiService";
import { paraFormatoEvolutionApi } from "../../utils/helpers/telefone.helper";

const REAL_GUIDS = [
  "unAygmyrfT3k", // Daniel Shimada
  "LwpIWIW3ESZz", // João Batista
  "7Mpvyz8488rq", // Enrico Nascimento
  "S6wb9wZ_5VCW", // Matheus Borges
  "wA098L1gmgAH", // Antonio Junior
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
  const db = new MysqlDatabase();
  const pool = await db.getPool();

  for (const guid of REAL_GUIDS) {
    const [rows] = await pool.execute<any[]>(
      `SELECT UsuarioNome, UsuarioTelefone FROM usuario WHERE UsuarioGUID = ?`,
      [guid]
    );
    const usuario = rows[0];
    if (!usuario?.UsuarioTelefone) {
      console.warn(`⚠️  ${guid}: sem telefone — pulando.`);
      continue;
    }

    try {
      const numero = paraFormatoEvolutionApi(usuario.UsuarioTelefone);
      const texto = montarTextoAviso(usuario.UsuarioNome);
      const resultado = await EvolutionApiService.getInstance().sendText(numero, texto);
      console.log(`✅ ${usuario.UsuarioNome}: aviso enviado (entregue=${resultado.entregue}).`);
    } catch (erro: any) {
      console.error(`❌ ${usuario.UsuarioNome}: falha ao enviar —`, erro?.message ?? erro);
    }
  }

  console.log("🎉 Avisos concluídos.");
  process.exit(0);
}

run().catch((erro) => {
  console.error("❌ Erro:", erro);
  process.exit(1);
});
