// Dry-run do ResumoProvaGrupoScheduler REAL (a classe de producao, nao uma
// replica manual) contra uma prova temporaria de teste, com
// EvolutionApiService.sendText mockado (so captura a chamada, nunca manda
// WhatsApp de verdade — nunca testar em grupo real, ver memoria do projeto).
// Cria os dados temporarios, roda o scheduler, mostra o que teria sido
// enviado, e limpa tudo no final (mesmo se der erro no meio).
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import EvolutionApiService from "../backend/external/EvolutionApiService";
import { ResumoProvaGrupoScheduler } from "../backend/services/resumoprovagrupo.scheduler";

const TURMA_3H_GUID = "1470ad85-03b5-4b09-af7b-5f2ade0757d1";
const MATERIA_LINGUA_PORTUGUESA = "45487cbe-6c75-434e-b8ee-353f383648e4";
const CATEGORIA_GUID = "3959a713-18ff-477c-b45b-2f3209a9a9a8"; // reaproveitado do exemplo real de Geografia

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 8000,
  });

  // pega um capitulo real de Português (Interp. Texto) pra linkar
  const [[capitulo]]: any = await conn.query(
    `SELECT MaterialDidaticoCapituloGUID, Titulo FROM materialdidaticocapitulo WHERE MateriaGUID = ? LIMIT 1`,
    [MATERIA_LINGUA_PORTUGUESA]
  );
  if (!capitulo) throw new Error("nenhum capitulo de Língua Portuguesa encontrado — rode depois de catalogar os livros");

  const provaGUID = crypto.randomUUID();
  const provaTurmaGUID = crypto.randomUUID();
  const recomendacaoGUID = crypto.randomUUID();

  console.log(`Capítulo usado: "${capitulo.Titulo}"`);
  console.log("Criando prova temporária de teste...");

  await conn.execute(
    `INSERT INTO provaagendada (ProvaAgendadaGUID, MateriaGUID, ProvaTitulo, ProvaData, ProvaDescricao, ProvaStatus, MaterialDidaticoCapituloGUID)
     VALUES (?, ?, ?, DATE(NOW() + INTERVAL 1 DAY), ?, 'Agendada', ?)`,
    [provaGUID, MATERIA_LINGUA_PORTUGUESA, "[DRY-RUN TESTE] Prova de Português", "Apenas um teste de dry-run do cron — não é uma prova real.", capitulo.MaterialDidaticoCapituloGUID]
  );
  await conn.execute(
    `INSERT INTO provaagendada_turma (ProvaAgendadaTurmaGUID, ProvaAgendadaGUID, TurmaGUID, CategoriaGUID, ItemOrdem)
     VALUES (?, ?, ?, ?, 0)`,
    [provaTurmaGUID, provaGUID, TURMA_3H_GUID, CATEGORIA_GUID]
  );
  await conn.execute(
    `INSERT INTO provaagendadarecomendacao (ProvaAgendadaRecomendacaoGUID, ProvaAgendadaGUID, ResumoTexto, StatusGeracao, ModeloUsado)
     VALUES (?, ?, ?, 'Concluida', 'dry-run (sem Gemini real)')`,
    [recomendacaoGUID, provaGUID, "- [DRY-RUN] Este é um resumo de teste, não gerado por IA de verdade.\n- Só serve pra validar o pipeline do cron sem gastar cota do Gemini."]
  );
  console.log("Dados temporários criados. ProvaAgendadaGUID:", provaGUID);

  // mocka o envio real de WhatsApp — so captura, nunca manda de verdade
  const chamadasCapturadas: { numero: string; texto: string }[] = [];
  const evolutionInstance = EvolutionApiService.getInstance();
  const sendTextOriginal = evolutionInstance.sendText.bind(evolutionInstance);
  evolutionInstance.sendText = (async (numero: string, texto: string) => {
    chamadasCapturadas.push({ numero, texto });
    console.log(`\n[MOCK] sendText() chamado — numero/jid: ${numero}`);
    return { id: "mock-id-dry-run" };
  }) as typeof sendTextOriginal;

  try {
    console.log("\nRodando ResumoProvaGrupoScheduler.executar() de verdade...\n");
    const scheduler = new ResumoProvaGrupoScheduler();
    await scheduler.executar();

    console.log(`\n=== RESULTADO: ${chamadasCapturadas.length} chamada(s) de envio capturada(s) (nenhuma foi enviada de verdade) ===`);
    for (const c of chamadasCapturadas) {
      console.log(`\n--- destino: ${c.numero} ---`);
      console.log(c.texto);
    }

    // confirma que registrou o dedup
    const [[envio]]: any = await conn.query(
      `SELECT * FROM provaagendada_turma_resumo_envio WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?`,
      [provaGUID, TURMA_3H_GUID]
    );
    console.log("\nDedup registrado?", envio ? `SIM (Destino=${envio.Destino})` : "NÃO");
  } finally {
    console.log("\nLimpando dados temporários...");
    await conn.execute(`DELETE FROM provaagendada_turma_resumo_envio WHERE ProvaAgendadaGUID = ?`, [provaGUID]);
    await conn.execute(`DELETE FROM provaagendadarecomendacao WHERE ProvaAgendadaGUID = ?`, [provaGUID]);
    await conn.execute(`DELETE FROM provaagendada_turma WHERE ProvaAgendadaGUID = ?`, [provaGUID]);
    await conn.execute(`DELETE FROM provaagendada WHERE ProvaAgendadaGUID = ?`, [provaGUID]);
    console.log("Limpeza concluída — nenhum dado de teste ficou no banco.");
    await conn.end();
  }
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
