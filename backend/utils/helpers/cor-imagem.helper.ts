/**
 * Helper para extrair a cor dominante de uma imagem (capa de Matéria/Turma).
 * Usa `sharp` pra reduzir a imagem a 1 pixel (resize 1x1) — a média
 * resultante já é uma aproximação razoável da cor predominante, sem
 * precisar de um algoritmo de clustering mais pesado.
 */
import sharp from "sharp";

export async function extrairCorDominante(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(1, 1, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [r, g, b] = data;
  const paraHex = (valor: number) => valor.toString(16).padStart(2, "0");

  return `#${paraHex(r)}${paraHex(g)}${paraHex(b)}`;
}
