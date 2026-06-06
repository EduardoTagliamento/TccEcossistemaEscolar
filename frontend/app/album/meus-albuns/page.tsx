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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-10 text-center text-xl font-semibold text-white backdrop-blur-xl">
          Carregando albuns...
        </div>
      </div>
    );
  }

  const totalFaltantes = faltantes.reduce((acc, grupo) => acc + grupo.faltantes.length, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Mapa de faltantes</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Meus Albuns</h2>
        </div>
        <button
          onClick={() => router.push("/album")}
          className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
        >
          Voltar ao painel
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {albuns.map((album) => (
          <button
            key={album.id}
            onClick={() => selecionarAlbum(album)}
            className={`rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
              albumSelecionado?.id === album.id
                ? "border-white/50 bg-white/95 shadow-2xl"
                : "border-white/20 bg-white/10 hover:-translate-y-0.5 hover:bg-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{album.icone}</span>
              <div>
                <p
                  className="text-lg font-black"
                  style={{ color: albumSelecionado?.id === album.id ? album.cor : "#e2e8f0" }}
                >
                  {album.nomeDisplay}
                </p>
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Colecao ativa</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {albumSelecionado && (
        <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl sm:p-8">
          <h3 className="mb-4 text-2xl font-black tracking-tight" style={{ color: albumSelecionado.cor }}>
            {albumSelecionado.icone} Álbum {albumSelecionado.nomeDisplay}
          </h3>

          <div className="mb-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            Faltantes no album: {totalFaltantes}
          </div>

          {totalFaltantes === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-2xl font-black text-emerald-600">
                Parabens! Album completo!
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-base text-slate-700 sm:text-lg">
                Faltam <strong>{totalFaltantes}</strong> figurinha
                {totalFaltantes !== 1 ? "s" : ""}:
              </p>

              <div className="space-y-6">
                {faltantes.map((grupo, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border-l-4 bg-slate-50 p-4"
                    style={{ borderColor: albumSelecionado.cor }}
                  >
                    <h4 className="mb-3 text-lg font-black text-slate-800">
                      📦 {grupo.agrupamento} ({grupo.faltantes.length} faltante
                      {grupo.faltantes.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {grupo.faltantes.map((fig) => (
                        <span
                          key={fig.codigo}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700"
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
