"use client";

/**
 * Página: Dashboard da Copa do Mundo
 * Página principal com estatísticas e navegação
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { EstatisticasGerais } from "@/lib/copa/types";
import { EstatisticasCard } from "@/components/copa/EstatisticasCard";

export default function AlbumPage() {
  const router = useRouter();
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const data = await copaApi.obterEstatisticasGerais();
      setEstatisticas(data);
    } catch (error: any) {
      setErro("Erro ao carregar estatísticas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 text-center text-xl font-semibold text-white backdrop-blur-xl">
          Carregando estatisticas...
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-rose-300/70 bg-rose-50/95 px-4 py-3 text-rose-700 shadow-lg">
          {erro}
        </div>
      </div>
    );
  }

  if (!estatisticas) return null;

  const percentualNos3 = (estatisticas.completasNos3 / 994) * 100;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
      <section className="copa-panel overflow-hidden rounded-[2rem] p-7 sm:p-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Painel do colecionador</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          Meu Album da Copa 2026
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
          Acompanhe sua colecao em tempo real, veja desempenho por album e avance para completar as 994 figurinhas.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EstatisticasCard stats={estatisticas.prata} />
        <EstatisticasCard stats={estatisticas.normal} />
        <EstatisticasCard stats={estatisticas.ouro} />
      </div>

      <section className="rounded-3xl border border-white/20 bg-slate-950/60 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
        <h3 className="text-center text-xl font-black tracking-tight sm:text-3xl">
          Completas nos 3 albuns: {estatisticas.completasNos3} ({percentualNos3.toFixed(1)}%)
        </h3>
        <div className="mt-5 h-5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-5 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-500 transition-all duration-700"
            style={{ width: `${percentualNos3}%` }}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 pb-2 md:grid-cols-2">
        <button
          onClick={() => router.push("/album/pesquisa")}
          className="group rounded-3xl border border-cyan-300/50 bg-cyan-400/90 px-6 py-8 text-left text-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-800/80">Navegacao rapida</p>
          <p className="mt-2 text-2xl font-black">Pesquisar Figurinhas</p>
          <p className="mt-2 text-sm font-medium text-slate-800/80">Busque por codigo exato ou prefixo para atualizar a colecao.</p>
        </button>
        <button
          onClick={() => router.push("/album/meus-albuns")}
          className="group rounded-3xl border border-emerald-300/50 bg-emerald-400/90 px-6 py-8 text-left text-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-300"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-800/80">Acompanhamento</p>
          <p className="mt-2 text-2xl font-black">Ver Meus Albuns</p>
          <p className="mt-2 text-sm font-medium text-slate-800/80">Analise faltantes por grupo e descubra onde focar nas trocas.</p>
        </button>
      </div>
    </div>
  );
}
