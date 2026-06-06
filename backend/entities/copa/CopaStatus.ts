/**
 * Entity: Copa Status
 * Representa o status de uma figurinha em um álbum específico
 */

export interface CopaStatus {
  id: number;
  albumId: number;
  figurinhaId: number;
  possui: boolean; // true = tem, false = falta
  atualizadoEm: Date;
}

/**
 * Status com informações completas da figurinha
 */
export interface CopaStatusCompleto extends CopaStatus {
  figurinha: {
    codigo: string;
    prefixo: string;
    numero: number;
    tipo: string;
    grupo: string | null;
    selecao: string | null;
  };
}
