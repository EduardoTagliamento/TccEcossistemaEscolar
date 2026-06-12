/**
 * Entity: Copa Álbum
 * Representa um dos 3 álbuns: Prata, Normal ou Ouro
 */

export interface CopaAlbum {
  id: number;
  nome: "prata" | "normal" | "ouro";
  nomeDisplay: string; // Prata, Normal, Ouro
  cor: string; // #C0C0C0, #0066CC, #FFD700
  icone: string; // 🥈, 📘, 🥇
  criadoEm: Date;
}

export type NomeAlbum = "prata" | "normal" | "ouro";
