// Script one-off: reprocessa páginas de materialdidaticopagina com
// StatusExtracao='Falhou' — reaproveita a imagem já no R2 (ArquivoUrl),
// não reenvia nada. Mesma lógica de backend/ai/agents/extracaoPaginaAgent.ts
// + backend/ai/providers/geminiProvider.ts (retry transiente incluso).
// Uso: node scripts/reprocessar-extracao-paginas.js [--limit=N] [--delay=MS]
const mysql = require("mysql2/promise");
const { GoogleGenAI, createUserContent, createPartFromBase64 } = require("@google/genai");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const LIMIT = args.limit ? Number(args.limit) : null;
const DELAY_MS = args.delay ? Number(args.delay) : 3000;

const SEM_TEXTO_LEGIVEL = "SEM_TEXTO_LEGIVEL";
const MODELO = process.env.GEMINI_MODEL_CHEIO || "gemini-flash-latest";
const MAX_TENTATIVAS = 3;
const BACKOFF_BASE_MS = 1000;

function eErroTransiente(error) {
  const msg = error instanceof Error ? error.message : String(error);
  return /"code"\s*:\s*503/.test(msg) || /UNAVAILABLE/.test(msg) || /"code"\s*:\s*429/.test(msg) || /RESOURCE_EXHAUSTED/.test(msg);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function extrairTexto(client, imagemBase64, mimeType) {
  const prompt = [
    "Transcreva integralmente o texto visível nesta imagem de página de livro didático, em português.",
    "Preserve parágrafos. Não resuma, não comente, não traduza — só transcreva o texto como está.",
    `Se a imagem não tiver texto legível (página em branco, ilustração pura, foto ilegível), responda exatamente: ${SEM_TEXTO_LEGIVEL}`,
  ].join("\n");

  let ultimoErro;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const response = await client.models.generateContent({
        model: MODELO,
        contents: createUserContent([prompt, createPartFromBase64(imagemBase64, mimeType)]),
      });
      const texto = response.text;
      if (!texto || !texto.trim()) throw new Error("resposta vazia");
      if (texto.trim() === SEM_TEXTO_LEGIVEL) return null;
      return texto.trim();
    } catch (error) {
      ultimoErro = error;
      if (!eErroTransiente(error) || tentativa === MAX_TENTATIVAS) throw error;
      const esperaMs = BACKOFF_BASE_MS * 2 ** (tentativa - 1);
      console.log(`  erro transiente (tentativa ${tentativa}/${MAX_TENTATIVAS}), retry em ${esperaMs}ms: ${error.message}`);
      await sleep(esperaMs);
    }
  }
  throw ultimoErro;
}

function mimeTypeFromUrl(url) {
  if (/\.png$/i.test(url)) return "image/png";
  if (/\.webp$/i.test(url)) return "image/webp";
  return "image/jpeg";
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY não configurada no ambiente");
  const client = new GoogleGenAI({ apiKey });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 8000,
  });

  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : "";
  const [rows] = await conn.query(
    `SELECT MaterialDidaticoPaginaGUID, MaterialDidaticoGUID, NumeroPagina, ArquivoUrl
     FROM materialdidaticopagina
     WHERE StatusExtracao = 'Falhou'
     ORDER BY MaterialDidaticoGUID, NumeroPagina
     ${limitClause}`
  );

  console.log(`Total a processar: ${rows.length} (modelo=${MODELO}, delay=${DELAY_MS}ms)`);

  let sucesso = 0;
  let semTexto = 0;
  let falha = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prefixo = `[${i + 1}/${rows.length}] ${row.MaterialDidaticoGUID} pag ${row.NumeroPagina}`;
    try {
      const imgResp = await fetch(row.ArquivoUrl);
      if (!imgResp.ok) throw new Error(`falha ao baixar imagem: HTTP ${imgResp.status}`);
      const buffer = Buffer.from(await imgResp.arrayBuffer());
      const mimeType = mimeTypeFromUrl(row.ArquivoUrl);

      const texto = await extrairTexto(client, buffer.toString("base64"), mimeType);

      await conn.execute(
        `UPDATE materialdidaticopagina SET TextoExtraido = ?, StatusExtracao = 'Concluida' WHERE MaterialDidaticoPaginaGUID = ?`,
        [texto, row.MaterialDidaticoPaginaGUID]
      );

      if (texto === null) {
        semTexto++;
        console.log(`${prefixo}: OK (sem texto legível, página em branco/ilustração)`);
      } else {
        sucesso++;
        console.log(`${prefixo}: OK (${texto.length} chars)`);
      }
    } catch (error) {
      falha++;
      console.error(`${prefixo}: FALHOU — ${error.message}`);
      // já está 'Falhou' no banco, não precisa re-escrever
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nConcluído. sucesso=${sucesso} semTextoLegivel=${semTexto} falha=${falha} total=${rows.length}`);
  await conn.end();
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
