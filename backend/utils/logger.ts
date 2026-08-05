/**
 * Logger estruturado (winston) — substitui `console.log`/`console.error`
 * nos pontos de observabilidade real do servidor: erro global, boot,
 * shutdown, exceções não tratadas e log de requisição HTTP.
 *
 * Não substitui os `console.log("🟣 Service.metodo()")` espalhados pelo
 * resto do código — aqueles são rastro de execução linha-a-linha usado
 * durante desenvolvimento, não observabilidade de produção; trocar
 * milhares de call sites por um logger estruturado é um projeto à parte,
 * de valor marginal por chamada e alto risco de diff, fora do escopo
 * deste ajuste (ver docs/RELATORIO_BAUA_CODIGO_2.md).
 *
 * Formato: JSON em produção (pra qualquer agregador de log — Railway
 * captura stdout/stderr diretamente, não precisa de arquivo) e
 * colorizado/legível em desenvolvimento. Nível controlado por
 * `LOG_LEVEL` (.env.example já antecipava essa variável).
 */
import path from "path";
import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";
const nivel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

const formatoProducao = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const formatoDesenvolvimento = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: nivel,
  format: isProduction ? formatoProducao : formatoDesenvolvimento,
  defaultMeta: { service: "ecossistema-escolar" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.resolve(process.cwd(), "logs", "error.log"),
      level: "error",
      format: formatoProducao,
    }),
    new winston.transports.File({
      filename: path.resolve(process.cwd(), "logs", "combined.log"),
      format: formatoProducao,
    }),
  ],
  exitOnError: false,
});

// Falha ao escrever arquivo (ex.: filesystem read-only em algum ambiente
// de deploy) não pode derrubar o processo — só reporta uma vez no console
// e segue só com o transport de console.
logger.transports.forEach((transport) => {
  transport.on("error", (erro) => {
    console.error("⚠️  [logger] Falha num transport de log:", erro.message);
  });
});

export default logger;
