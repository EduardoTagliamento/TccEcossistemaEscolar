/**
 * Validação de extensão de arquivo enviado por upload (multer).
 *
 * O `file.mimetype` do multer vem do header `Content-Type` que o próprio
 * navegador do cliente declara na requisição multipart — é trivial de
 * falsificar (renomear um executável, forçar outro Content-Type). Os
 * middlewares de upload já filtravam por MIME type (allowlist), mas isso
 * sozinho não impede alguém de subir um arquivo com extensão perigosa
 * (.exe, .php, .js etc.) fingindo ser outro tipo. Este módulo adiciona uma
 * segunda camada: a extensão real do nome do arquivo também precisa bater
 * com uma allowlist — as duas checagens (MIME + extensão) precisam passar.
 */

// Caracteres de controle e separadores de caminho não têm por que aparecer
// num nome de arquivo legítimo — removidos antes de ecoar o nome de volta
// numa mensagem de erro (o nome original vem 100% do cliente).
// eslint-disable-next-line no-control-regex
const CARACTERES_PERIGOSOS_REGEX = /[\\/<>:"|?*\x00-\x1F]/g;
const TAMANHO_MAXIMO_NOME_NA_MENSAGEM = 120;

/** Remove caminho, caracteres de controle/especiais e trunca — seguro para ecoar em mensagem de erro. */
export function sanitizarNomeArquivo(nomeOriginal: string): string {
  const semCaminho = nomeOriginal.split(/[\\/]/).pop() || nomeOriginal;
  const limpo = semCaminho.replace(CARACTERES_PERIGOSOS_REGEX, "_").trim();
  if (!limpo) return "arquivo";
  return limpo.length > TAMANHO_MAXIMO_NOME_NA_MENSAGEM
    ? `${limpo.slice(0, TAMANHO_MAXIMO_NOME_NA_MENSAGEM - 3)}...`
    : limpo;
}

/** Extensão (minúscula, sem ponto) do nome do arquivo, ou "" se não houver. */
export function obterExtensao(nomeArquivo: string): string {
  const semCaminho = nomeArquivo.split(/[\\/]/).pop() || nomeArquivo;
  const idx = semCaminho.lastIndexOf(".");
  if (idx <= 0 || idx === semCaminho.length - 1) return "";
  return semCaminho.slice(idx + 1).toLowerCase();
}

export function extensaoPermitida(nomeArquivo: string, extensoesPermitidas: readonly string[]): boolean {
  const extensao = obterExtensao(nomeArquivo);
  return extensao !== "" && extensoesPermitidas.includes(extensao);
}

/** Mensagem já sanitizada (nome de arquivo limpo), pronta pra devolver ao cliente. */
export function mensagemExtensaoInvalida(nomeArquivo: string, extensoesPermitidas: readonly string[]): string {
  const nomeSanitizado = sanitizarNomeArquivo(nomeArquivo);
  const extensao = obterExtensao(nomeArquivo);
  const rotuloExtensao = extensao ? `".${extensao}"` : "sem extensão";
  const listaFormatada = extensoesPermitidas.map((ext) => `.${ext}`).join(", ");
  return `Arquivo "${nomeSanitizado}" tem extensão ${rotuloExtensao}, que não é permitida. Extensões aceitas: ${listaFormatada}.`;
}
