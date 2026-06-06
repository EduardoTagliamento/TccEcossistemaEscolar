"use client";

/**
 * Página: Meus Álbuns
 * Visualização de figurinhas faltantes por álbum
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { Album, FigurinhasFaltantes } from "@/lib/copa/types";

export default function MeusAlbunsPage() {
  const router = useRouter();
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [albumSelecionado, setAlbumSelecionado] = useState<Album | null>(null);
  const [faltantes, setFaltantes] = useState<FigurinhasFaltantes[]>([]);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  const totalFaltantes = faltantes.reduce((acc, grupo) => acc + grupo.faltantes.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Meus Álbuns</h2>
        <button
          onClick={() => router.push("/album")}
          className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg transition"
        >
          ← Voltar
        </button>
      </div>

      {/* Tabs dos álbuns */}
      <div className="flex gap-4 mb-6">
        {albuns.map((album) => (
          <button
            key={album.id}
            onClick={() => selecionarAlbum(album)}
            className={`flex-1 py-4 rounded-lg font-bold text-lg transition ${
              albumSelecionado?.id === album.id
                ? "bg-white shadow-lg"
                : "bg-white bg-opacity-50 hover:bg-opacity-75"
            }`}
            style={{
              color: albumSelecionado?.id === album.id ? album.cor : "#666",
            }}
          >
            <span className="text-2xl mr-2">{album.icone}</span>
            {album.nomeDisplay}
          </button>
        ))}
      </div>

      {/* Conteúdo do álbum selecionado */}
      {albumSelecionado && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4" style={{ color: albumSelecionado.cor }}>
            {albumSelecionado.icone} Álbum {albumSelecionado.nomeDisplay}
          </h3>

          {totalFaltantes === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-2xl font-bold text-green-600">
                Parabéns! Álbum completo!
              </p>
            </div>
          ) : (
            <>
              <p className="text-lg mb-6">
                Faltam <strong>{totalFaltantes}</strong> figurinha
                {totalFaltantes !== 1 ? "s" : ""}:
              </p>

              <div className="space-y-6">
                {faltantes.map((grupo, index) => (
                  <div key={index} className="border-l-4 pl-4" style={{ borderColor: albumSelecionado.cor }}>
                    <h4 className="font-bold text-lg mb-2">
                      📦 {grupo.agrupamento} ({grupo.faltantes.length} faltante
                      {grupo.faltantes.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {grupo.faltantes.map((fig) => (
                        <span
                          key={fig.codigo}
                          className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-semibold"
                        >
                          {fig.codigo}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
