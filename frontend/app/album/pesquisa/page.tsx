"use client";

/**
 * Página: Pesquisa de Figurinhas
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { Figurinha, StatusFigurinha, Album } from "@/lib/copa/types";
import { BuscaFigurinha } from "@/components/copa/BuscaFigurinha";
import { FigurinhaCard } from "@/components/copa/FigurinhaCard";
import { ModalEditarStatus } from "@/components/copa/ModalEditarStatus";

export default function PesquisaPage() {
  const router = useRouter();
  const [figurinhas, setFigurinhas] = useState<Figurinha[]>([]);
  const [statusMap, setStatusMap] = useState<{ [key: number]: StatusFigurinha[] }>({});
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [figurinhaSelecionada, setFigurinhaSelecionada] = useState<Figurinha | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    setLoading(true);
    setErro("");

    try {
      const [albunsData, figurinhasData] = await Promise.all([
        copaApi.listarAlbuns(),
        copaApi.buscarFigurinhas(),
      ]);

      setAlbuns(albunsData);
      setFigurinhas(figurinhasData);
      await carregarStatusParaFigurinhas(figurinhasData, albunsData);
    } catch (error: any) {
      setErro("Erro ao carregar os dados iniciais.");
    } finally {
      setLoading(false);
    }
  };

  const carregarStatusParaFigurinhas = async (figs: Figurinha[], albunsRef?: Album[]) => {
    const albunsAtivos = albunsRef || albuns;
    if (!albunsAtivos.length || !figs.length) {
      setStatusMap({});
      return;
    }

    try {
      const statusPromises = albunsAtivos.map((album) =>
        copaApi.buscarFigurinhasAlbum(album.id)
      );
      const allStatus = await Promise.all(statusPromises);

      const map: { [key: number]: StatusFigurinha[] } = {};
      figs.forEach((fig) => {
        map[fig.id] = allStatus.flat().filter((s) => s.figurinhaId === fig.id);
      });

      setStatusMap(map);
    } catch (error) {
      console.error("Erro ao carregar status:", error);
    }
  };

  const handleBuscar = async (codigo: string) => {
    setLoading(true);
    setErro("");

    try {
      // Tentar buscar como código exato
      const codigoUpper = codigo.toUpperCase();

      // Se tem número, é código completo (ex: GHA01)
      if (/\d/.test(codigoUpper)) {
        const figurinha = await copaApi.buscarFigurinhaPorCodigo(codigoUpper);
        setFigurinhas([figurinha]);
        await carregarStatusParaFigurinhas([figurinha]);
      } else {
        // Senão, buscar por prefixo (ex: GHA retorna GHA01...GHA20)
        const figs = await copaApi.buscarFigurinhasPorPrefixo(codigoUpper);
        setFigurinhas(figs);
        await carregarStatusParaFigurinhas(figs);
      }
    } catch (error: any) {
      setErro("Figurinha não encontrada");
      setFigurinhas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    inicializar();
    setErro("");
  };

  const handleClickFigurinha = (figurinha: Figurinha) => {
    setFigurinhaSelecionada(figurinha);
    setModalAberto(true);
  };

  const handleUpdateStatus = async () => {
    // Recarregar status após atualização
    if (figurinhaSelecionada) {
      await carregarStatusParaFigurinhas([figurinhaSelecionada], albuns);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Busca inteligente</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Pesquisar Figurinhas</h2>
        </div>
        <button
          onClick={() => router.push("/album")}
          className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
        >
          Voltar ao painel
        </button>
      </div>

      <BuscaFigurinha onBuscar={handleBuscar} onLimpar={handleLimpar} />

      {erro && (
        <div className="mt-4 rounded-2xl border border-rose-300/60 bg-rose-50/95 px-4 py-3 text-rose-700 shadow-lg">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 py-10 text-center text-lg font-semibold text-white backdrop-blur-xl">
          Carregando figurinhas...
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-white/15 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
            Resultados: {figurinhas.length} figurinha{figurinhas.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {figurinhas.map((fig) => (
              <FigurinhaCard
                key={fig.id}
                figurinha={fig}
                statusList={statusMap[fig.id] || []}
                onClick={handleClickFigurinha}
              />
            ))}
          </div>
        </div>
      )}

      <ModalEditarStatus
        figurinha={figurinhaSelecionada}
        statusList={statusMap[figurinhaSelecionada?.id || 0] || []}
        albuns={albuns}
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onUpdate={handleUpdateStatus}
      />
    </div>
  );
}
