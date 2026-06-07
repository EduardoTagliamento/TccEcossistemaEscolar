/**
 * Cliente API para o sistema da Copa
 */

import axios from "axios";
import {
  Figurinha,
  Album,
  StatusFigurinha,
  EstatisticasGerais,
  FigurinhasFaltantes,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const copaApi = {
  /**
   * Figurinhas
   */
  async buscarFigurinhas(filtros?: {
    tipo?: string;
    prefixo?: string;
    codigo?: string;
    numero?: string;
    grupo?: string;
  }): Promise<Figurinha[]> {
    const params = new URLSearchParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          params.append(key, String(value));
        }
      });
    }

    const response = await axios.get(`${API_BASE}/album/figurinhas?${params}`);
    return response.data.data;
  },

  async buscarFigurinhaPorCodigo(codigo: string): Promise<Figurinha> {
    const response = await axios.get(`${API_BASE}/album/figurinhas/codigo/${codigo}`);
    return response.data.data;
  },

  async buscarFigurinhasPorPrefixo(prefixo: string): Promise<Figurinha[]> {
    const response = await axios.get(`${API_BASE}/album/figurinhas/prefixo/${prefixo}`);
    return response.data.data;
  },

  async listarPrefixos(): Promise<string[]> {
    const response = await axios.get(`${API_BASE}/album/figurinhas/prefixos`);
    return response.data.data;
  },

  async listarGrupos(): Promise<string[]> {
    const response = await axios.get(`${API_BASE}/album/figurinhas/grupos`);
    return response.data.data;
  },

  /**
   * Álbuns
   */
  async listarAlbuns(): Promise<Album[]> {
    const response = await axios.get(`${API_BASE}/album/albuns`);
    return response.data.data;
  },

  async buscarAlbum(id: number): Promise<Album> {
    const response = await axios.get(`${API_BASE}/album/albuns/${id}`);
    return response.data.data;
  },

  async buscarFigurinhasAlbum(albumId: number): Promise<StatusFigurinha[]> {
    const response = await axios.get(`${API_BASE}/album/albuns/${albumId}/figurinhas`);
    return response.data.data;
  },

  async buscarFaltantes(albumId: number): Promise<StatusFigurinha[]> {
    const response = await axios.get(`${API_BASE}/album/albuns/${albumId}/faltantes`);
    return response.data.data;
  },

  async atualizarStatus(
    albumId: number,
    figurinhaId: number,
    possui: boolean,
    senha: string
  ): Promise<void> {
    await axios.put(`${API_BASE}/album/albuns/${albumId}/figurinhas/${figurinhaId}`, {
      possui,
      senha,
    });
  },

  /**
   * Estatísticas
   */
  async obterEstatisticasGerais(): Promise<EstatisticasGerais> {
    const response = await axios.get(`${API_BASE}/album/estatisticas/geral`);
    return response.data.data;
  },

  async obterFaltantesAgrupadas(albumNome: string): Promise<FigurinhasFaltantes[]> {
    const response = await axios.get(`${API_BASE}/album/estatisticas/faltantes/${albumNome}`);
    return response.data.data;
  },

  async obterResumo(): Promise<{
    totalFigurinhas: number;
    totalAlbuns: number;
    mediaConclusao: number;
  }> {
    const response = await axios.get(`${API_BASE}/album/estatisticas/resumo`);
    return response.data.data;
  },
};
