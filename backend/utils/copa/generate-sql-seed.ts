/**
 * Script para gerar o SQL de seed das 994 figurinhas
 * a partir do arquivo JSON original
 */

import fs from "fs";
import path from "path";

interface Sticker {
  id: number;
  prefix: string;
  number: number;
  code: string;
  prata: boolean;
  normal: boolean;
  ouro: boolean;
}

interface StickersData {
  meta: {
    total_stickers: number;
    version: string;
    albums: any;
  };
  stickers: Sticker[];
}

// Mapear prefixos para seleções e grupos
const SELECAO_INFO: { [key: string]: { nome: string; grupo: string } } = {
  MEX: { nome: "México", grupo: "Grupo A" },
  CAN: { nome: "Canadá", grupo: "Grupo A" },
  USA: { nome: "Estados Unidos", grupo: "Grupo A" },
  GHA: { nome: "Gana", grupo: "Grupo A" },
  BRA: { nome: "Brasil", grupo: "Grupo B" },
  ARG: { nome: "Argentina", grupo: "Grupo B" },
  URU: { nome: "Uruguai", grupo: "Grupo B" },
  PAR: { nome: "Paraguai", grupo: "Grupo B" },
  CHI: { nome: "Chile", grupo: "Grupo C" },
  COL: { nome: "Colômbia", grupo: "Grupo C" },
  ECU: { nome: "Equador", grupo: "Grupo C" },
  PER: { nome: "Peru", grupo: "Grupo C" },
  ESP: { nome: "Espanha", grupo: "Grupo D" },
  POR: { nome: "Portugal", grupo: "Grupo D" },
  FRA: { nome: "França", grupo: "Grupo D" },
  BEL: { nome: "Bélgica", grupo: "Grupo D" },
  ENG: { nome: "Inglaterra", grupo: "Grupo E" },
  GER: { nome: "Alemanha", grupo: "Grupo E" },
  NED: { nome: "Holanda", grupo: "Grupo E" },
  SUI: { nome: "Suíça", grupo: "Grupo E" },
  ITA: { nome: "Itália", grupo: "Grupo F" },
  CRO: { nome: "Croácia", grupo: "Grupo F" },
  POL: { nome: "Polônia", grupo: "Grupo F" },
  DEN: { nome: "Dinamarca", grupo: "Grupo F" },
  SEN: { nome: "Senegal", grupo: "Grupo G" },
  CMR: { nome: "Camarões", grupo: "Grupo G" },
  NGA: { nome: "Nigéria", grupo: "Grupo G" },
  CIV: { nome: "Costa do Marfim", grupo: "Grupo G" },
  MAR: { nome: "Marrocos", grupo: "Grupo H" },
  TUN: { nome: "Tunísia", grupo: "Grupo H" },
  EGY: { nome: "Egito", grupo: "Grupo H" },
  ALG: { nome: "Argélia", grupo: "Grupo H" },
  JPN: { nome: "Japão", grupo: "Grupo I" },
  KOR: { nome: "Coreia do Sul", grupo: "Grupo I" },
  AUS: { nome: "Austrália", grupo: "Grupo I" },
  IRN: { nome: "Irã", grupo: "Grupo I" },
  SAU: { nome: "Arábia Saudita", grupo: "Grupo J" },
  QAT: { nome: "Catar", grupo: "Grupo J" },
  IRQ: { nome: "Iraque", grupo: "Grupo J" },
  UAE: { nome: "Emirados Árabes", grupo: "Grupo J" },
  SRB: { nome: "Sérvia", grupo: "Grupo K" },
  UKR: { nome: "Ucrânia", grupo: "Grupo K" },
  CZE: { nome: "República Tcheca", grupo: "Grupo K" },
  AUT: { nome: "Áustria", grupo: "Grupo K" },
  SWE: { nome: "Suécia", grupo: "Grupo L" },
  NOR: { nome: "Noruega", grupo: "Grupo L" },
  FIN: { nome: "Finlândia", grupo: "Grupo L" },
  ISL: { nome: "Islândia", grupo: "Grupo L" },
};

function getTipoFigurinha(prefix: string): string {
  if (prefix === "FWC") return "FWC";
  if (prefix === "CC") return "COCACOLA";
  return "SELECAO";
}

function generateSqlInserts(data: StickersData): string {
  let sql = `-- ============================================
-- SISTEMA DE ÁLBUM DA COPA DO MUNDO 2026
-- Seed de 994 Figurinhas
-- Gerado automaticamente do stickers.json
-- ============================================

`;

  // Inserir figurinhas
  sql += "-- Inserir todas as 994 figurinhas\n";
  sql += "INSERT INTO copa_figurinhas (codigo, prefixo, numero, tipo, grupo, selecao, ordem_exibicao) VALUES\n";

  const values: string[] = [];

  data.stickers.forEach((sticker, index) => {
    const tipo = getTipoFigurinha(sticker.prefix);
    const selecaoInfo = SELECAO_INFO[sticker.prefix];
    const grupo = selecaoInfo ? `'${selecaoInfo.grupo}'` : "NULL";
    const selecao = selecaoInfo ? `'${selecaoInfo.nome}'` : "NULL";

    values.push(
      `  ('${sticker.code}', '${sticker.prefix}', ${sticker.number}, '${tipo}', ${grupo}, ${selecao}, ${index + 1})`
    );
  });

  sql += values.join(",\n");
  sql += ";\n\n";

  // Inserir status inicial (todos os álbuns com todas as figurinhas)
  sql += "-- Inserir status inicial para cada figurinha em cada álbum\n";
  sql += "-- Baseado nos valores do JSON original\n\n";

  ["prata", "normal", "ouro"].forEach((albumNome) => {
    sql += `-- Status do álbum ${albumNome}\n`;
    sql += `INSERT INTO copa_status (album_id, figurinha_id, possui)\n`;
    sql += `SELECT \n`;
    sql += `  (SELECT id FROM copa_albuns WHERE nome = '${albumNome}'),\n`;
    sql += `  f.id,\n`;
    sql += `  CASE f.codigo\n`;

    data.stickers.forEach((sticker) => {
      const possui = sticker[albumNome as keyof Sticker];
      sql += `    WHEN '${sticker.code}' THEN ${possui ? "TRUE" : "FALSE"}\n`;
    });

    sql += `    ELSE FALSE\n`;
    sql += `  END\n`;
    sql += `FROM copa_figurinhas f;\n\n`;
  });

  sql += `-- ============================================
-- Verificação
-- ============================================
-- Total de figurinhas inseridas:
SELECT COUNT(*) as total_figurinhas FROM copa_figurinhas;

-- Total de status inseridos (deve ser 2982 = 994 x 3):
SELECT COUNT(*) as total_status FROM copa_status;

-- Estatísticas por álbum:
SELECT * FROM copa_estatisticas_geral;

-- ============================================
-- FIM DO SEED
-- ============================================
`;

  return sql;
}

// Executar o gerador
const jsonPath = path.join(
  __dirname,
  "../../../docs/copa do mundo/data/stickers.json"
);
const outputPath = path.join(__dirname, "../../database/migrations/copa/002_seed_figurinhas.sql");

try {
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  const data: StickersData = JSON.parse(jsonData);

  console.log(`📊 Lendo ${data.meta.total_stickers} figurinhas do JSON...`);

  const sql = generateSqlInserts(data);

  // Criar diretório se não existir
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sql, "utf-8");

  console.log(`✅ SQL gerado com sucesso!`);
  console.log(`📁 Arquivo: ${outputPath}`);
  console.log(`📝 Total de figurinhas: ${data.stickers.length}`);
} catch (error) {
  console.error("❌ Erro ao gerar SQL:", error);
  process.exit(1);
}
