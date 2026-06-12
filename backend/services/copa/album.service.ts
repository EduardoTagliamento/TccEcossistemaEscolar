/**
 * Service: Álbuns
 * Lógica de negócio para gerenciamento de álbuns
 */

import { AlbumRepository } from "../../repositories/copa/album.repository";
import { StatusRepository } from "../../repositories/copa/status.repository";
import { CopaAlbum, NomeAlbum } from "../../entities/copa/CopaAlbum";
import { CopaStatusCompleto } from "../../entities/copa/CopaStatus";

export class AlbumService {
  private albumRepository: AlbumRepository;
  private statusRepository: StatusRepository;

  constructor() {
    this.albumRepository = new AlbumRepository();
    this.statusRepository = new StatusRepository();
  }

  /**
   * Buscar todos os álbuns
   */
  async buscarTodos(): Promise<CopaAlbum[]> {
    return await this.albumRepository.buscarTodos();
  }

  /**
   * Buscar álbum por nome
   */
  async buscarPorNome(nome: NomeAlbum): Promise<CopaAlbum | null> {
    return await this.albumRepository.buscarPorNome(nome);
  }

  /**
   * Buscar álbum por ID
   */
  async buscarPorId(id: number): Promise<CopaAlbum | null> {
    return await this.albumRepository.buscarPorId(id);
  }

  /**
   * Buscar todas as figurinhas de um álbum com status
   */
  async buscarFigurinhasAlbum(albumId: number): Promise<CopaStatusCompleto[]> {
    const album = await this.albumRepository.buscarPorId(albumId);
    if (!album) {
      throw new Error("Álbum não encontrado");
    }
    return await this.statusRepository.buscarStatusAlbum(albumId);
  }

  /**
   * Buscar figurinhas faltantes de um álbum
   */
  async buscarFaltantes(albumId: number): Promise<CopaStatusCompleto[]> {
    const album = await this.albumRepository.buscarPorId(albumId);
    if (!album) {
      throw new Error("Álbum não encontrado");
    }
    return await this.statusRepository.buscarFaltantes(albumId);
  }

  /**
   * Buscar figurinhas completas de um álbum
   */
  async buscarCompletas(albumId: number): Promise<CopaStatusCompleto[]> {
    const album = await this.albumRepository.buscarPorId(albumId);
    if (!album) {
      throw new Error("Álbum não encontrado");
    }
    return await this.statusRepository.buscarCompletas(albumId);
  }

  /**
   * Atualizar status de uma figurinha em um álbum
   * Requer validação de senha
   */
  async atualizarStatus(
    albumId: number,
    figurinhaId: number,
    possui: boolean,
    senha: string
  ): Promise<boolean> {
    // Validar senha
    if (senha !== "12345") {
      throw new Error("Senha incorreta");
    }

    // Validar álbum
    const album = await this.albumRepository.buscarPorId(albumId);
    if (!album) {
      throw new Error("Álbum não encontrado");
    }

    // Atualizar status
    const sucesso = await this.statusRepository.atualizarStatus(
      albumId,
      figurinhaId,
      possui
    );

    if (!sucesso) {
      throw new Error("Erro ao atualizar status");
    }

    return true;
  }

  /**
   * Obter estatísticas de um álbum
   */
  async obterEstatisticas(albumId: number) {
    const album = await this.albumRepository.buscarPorId(albumId);
    if (!album) {
      throw new Error("Álbum não encontrado");
    }

    const completas = await this.statusRepository.contarCompletas(albumId);
    const faltantes = await this.statusRepository.contarFaltantes(albumId);
    const total = completas + faltantes;
    const percentual = total > 0 ? (completas / total) * 100 : 0;

    return {
      album: album,
      totalFigurinhas: total,
      completas,
      faltantes,
      percentualCompleto: Math.round(percentual * 10) / 10,
    };
  }
}
