/**
 * Serviço genérico de armazenamento de arquivos via Cloudflare R2
 * (compatível com a API do S3, usando o SDK oficial da AWS).
 *
 * Usado por qualquer fluxo de upload do sistema (logo da escola, conteúdos
 * de aula, etc) — evita depender do disco local do processo, que é efêmero
 * em plataformas como Railway (arquivo salvo localmente some no próximo
 * redeploy/restart do container).
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) {
    return client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Configuração do Cloudflare R2 ausente. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no .env."
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME não está configurado no .env.");
  }
  return bucket;
}

function getPublicBaseUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) {
    throw new Error("R2_PUBLIC_URL não está configurado no .env.");
  }
  return url.replace(/\/+$/, "");
}

export default class R2StorageService {
  /**
   * Envia um arquivo (buffer em memória) para o bucket e retorna a URL
   * pública completa. `chave` é o caminho dentro do bucket, ex:
   * "logos/2026/abc-logo.png" ou "conteudo/<ConteudoGUID>/video.mp4".
   */
  static async upload(
    chave: string,
    buffer: Buffer,
    contentType: string,
    contentDisposition?: string
  ): Promise<string> {
    const s3 = getClient();

    await s3.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: chave,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: contentDisposition,
      })
    );

    return `${getPublicBaseUrl()}/${chave}`;
  }

  /**
   * Remove um objeto do bucket a partir da chave (não da URL completa).
   */
  static async remove(chave: string): Promise<void> {
    const s3 = getClient();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: chave,
      })
    );
  }

  /**
   * Remove um objeto do bucket a partir da URL pública completa
   * (faz o caminho inverso de `upload`, extraindo a chave).
   */
  static async removeByUrl(urlPublica: string): Promise<void> {
    const base = getPublicBaseUrl();
    if (!urlPublica.startsWith(base)) {
      console.warn(`⚠️  URL "${urlPublica}" não pertence ao bucket configurado (${base}); remoção ignorada.`);
      return;
    }

    const chave = urlPublica.slice(base.length + 1);
    await this.remove(chave);
  }
}
