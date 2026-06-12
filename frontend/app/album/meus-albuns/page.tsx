"use client";

/**
 * Página: Meus Álbuns
 * Visualização de figurinhas faltantes por álbum
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { Album, FigurinhasFaltantes, Figurinha, StatusFigurinha } from "@/lib/copa/types";
import { ModalEditarStatus } from "@/components/copa/ModalEditarStatus";

export default function MeusAlbunsPage() {
  const router = useRouter();
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [albumSelecionado, setAlbumSelecionado] = useState<Album | null>(null);
  const [faltantes, setFaltantes] = useState<FigurinhasFaltantes[]>([]);
  const [figurinhaSelecionada, setFigurinhaSelecionada] = useState<Figurinha | null>(null);
  const [statusFigurinhaSelecionada, setStatusFigurinhaSelecionada] = useState<StatusFigurinha[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAlbuns();
  }, []);

  const carregarAlbuns = async () => {
    try {
      const data = await copaApi.listarAlbuns();
      setAlbuns(data);
      if (data.length > 0) {
        selecionarAlbum(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar álbuns:", error);
    } finally {
      setLoading(false);
    }
  };

  const selecionarAlbum = async (album: Album) => {
    setAlbumSelecionado(album);
    setLoading(true);
    try {
      const data = await copaApi.obterFaltantesAgrupadas(album.nome);
      setFaltantes(data);
    } catch (error) {
      console.error("Erro ao carregar faltantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarStatusFigurinha = async (figurinhaId: number) => {
    const statusPorAlbum = await Promise.all(
      albuns.map((album) => copaApi.buscarFigurinhasAlbum(album.id))
    );

    return statusPorAlbum.flat().filter((status) => status.figurinhaId === figurinhaId);
  };

  const handleClickFaltante = async (codigo: string) => {
    try {
      const figurinha = await copaApi.buscarFigurinhaPorCodigo(codigo);
      const status = await carregarStatusFigurinha(figurinha.id);

      setFigurinhaSelecionada(figurinha);
      setStatusFigurinhaSelecionada(status);
      setModalAberto(true);
    } catch (error) {
      console.error("Erro ao abrir figurinha no modal:", error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!albumSelecionado) return;

    await selecionarAlbum(albumSelecionado);

    if (figurinhaSelecionada) {
      const statusAtualizado = await carregarStatusFigurinha(figurinhaSelecionada.id);
      setStatusFigurinhaSelecionada(statusAtualizado);
    }
  };

  if (loading) {
    return (
      <div className="copa-page">
        <div className="copa-state-box">
          Carregando albuns...
        </div>
      </div>
    );
  }

  const totalFaltantes = faltantes.reduce((acc, grupo) => acc + grupo.faltantes.length, 0);

  return (
    <div className="copa-page">
      <div className="copa-page-header">
        <div>
          <p className="copa-kicker">Mapa de faltantes</p>
          <h2 className="copa-page-title">Meus Albuns</h2>
        </div>
        <button
          onClick={() => router.push("/album")}
          className="copa-back-button"
        >
          Voltar ao painel
        </button>
      </div>

      <div className="copa-albums-tabs">
        {albuns.map((album) => (
          <button
            key={album.id}
            onClick={() => selecionarAlbum(album)}
            className={`copa-album-tab ${albumSelecionado?.id === album.id ? "is-selected" : ""}`}
          >
            <div className="copa-album-tab-inner">
              <span className="copa-album-tab-icon">{album.icone}</span>
              <div>
                <p
                  className="copa-album-tab-title"
                  style={{ color: albumSelecionado?.id === album.id ? album.cor : "#e2e8f0" }}
                >
                  {album.nomeDisplay}
                </p>
                <p className="copa-album-tab-subtitle">Colecao ativa</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {albumSelecionado && (
        <div className="copa-album-content">
          <h3 className="copa-album-content-title" style={{ color: albumSelecionado.cor }}>
            {albumSelecionado.icone} Álbum {albumSelecionado.nomeDisplay}
          </h3>

          <div className="copa-badge">
            Faltantes no album: {totalFaltantes}
          </div>

          {totalFaltantes === 0 ? (
            <div className="copa-empty-state">
              <p className="copa-empty-emoji">🎉</p>
              <p className="copa-empty-text">
                Parabens! Album completo!
              </p>
            </div>
          ) : (
            <>
              <p className="copa-album-summary">
                Faltam <strong>{totalFaltantes}</strong> figurinha
                {totalFaltantes !== 1 ? "s" : ""}:
              </p>

              <div className="copa-groups-list">
                {faltantes.map((grupo, index) => (
                  <div
                    key={index}
                    className="copa-group-card"
                    style={{ borderColor: albumSelecionado.cor }}
                  >
                    <h4 className="copa-group-title">
                      📦 {grupo.agrupamento} ({grupo.faltantes.length} faltante
                      {grupo.faltantes.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="copa-tag-list">
                      {grupo.faltantes.map((fig) => (
                        <button
                          type="button"
                          key={fig.codigo}
                          className="copa-tag copa-tag-button"
                          onClick={() => handleClickFaltante(fig.codigo)}
                        >
                          {fig.codigo}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ModalEditarStatus
        figurinha={figurinhaSelecionada}
        statusList={statusFigurinhaSelecionada}
        albuns={albuns}
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onUpdate={handleUpdateStatus}
      />
    </div>
  );
}
