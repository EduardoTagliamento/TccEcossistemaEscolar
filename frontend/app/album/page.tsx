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
      <div className="copa-page">
        <div className="copa-state-box">
          Carregando estatisticas...
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="copa-page">
        <div className="copa-state-box copa-state-box-error">
          {erro}
        </div>
      </div>
    );
  }

  if (!estatisticas) return null;

  const percentualNos3 = (estatisticas.completasNos3 / 994) * 100;
  const overallCompletas =
    estatisticas.prata.completas +
    estatisticas.normal.completas +
    estatisticas.ouro.completas;
  const overallFaltantes =
    estatisticas.prata.faltantes +
    estatisticas.normal.faltantes +
    estatisticas.ouro.faltantes;
  const overallTotal =
    estatisticas.prata.totalFigurinhas +
    estatisticas.normal.totalFigurinhas +
    estatisticas.ouro.totalFigurinhas;
  const overallPercentual = overallTotal > 0 ? (overallCompletas / overallTotal) * 100 : 0;

  const overallStats = {
    albumNome: "overall",
    albumDisplay: "Overall (3 Albuns)",
    albumCor: "#0f766e",
    albumIcone: "📊",
    totalFigurinhas: overallTotal,
    completas: overallCompletas,
    faltantes: overallFaltantes,
    percentualCompleto: overallPercentual,
  };

  return (
    <div className="copa-page">
      <section className="copa-panel copa-dashboard-hero">
        <p className="copa-kicker">Painel do colecionador</p>
        <h2 className="copa-dashboard-title">
          Meu Album da Copa 2026
        </h2>
        <p className="copa-dashboard-desc">
          Acompanhe sua colecao em tempo real, veja desempenho por album e avance para completar as 994 figurinhas.
        </p>
      </section>

      <div className="copa-stats-grid">
        <EstatisticasCard stats={estatisticas.prata} />
        <EstatisticasCard stats={estatisticas.normal} />
        <EstatisticasCard stats={estatisticas.ouro} />
        <EstatisticasCard stats={overallStats} />
      </div>

      <section className="copa-progress-panel">
        <h3 className="copa-progress-title">
          Completas nos 3 albuns: {estatisticas.completasNos3} ({percentualNos3.toFixed(1)}%)
        </h3>
        <div className="copa-progress-track">
          <div
            className="copa-progress-fill"
            style={{ width: `${percentualNos3}%` }}
          />
        </div>
      </section>

      <div className="copa-action-grid">
        <button
          onClick={() => router.push("/album/pesquisa")}
          className="copa-action-btn copa-action-btn-search"
        >
          <p className="copa-action-kicker">Navegacao rapida</p>
          <p className="copa-action-title">Pesquisar Figurinhas</p>
          <p className="copa-action-desc">Busque por codigo exato ou prefixo para atualizar a colecao.</p>
        </button>
        <button
          onClick={() => router.push("/album/meus-albuns")}
          className="copa-action-btn copa-action-btn-albums"
        >
          <p className="copa-action-kicker">Acompanhamento</p>
          <p className="copa-action-title">Ver Meus Albuns</p>
          <p className="copa-action-desc">Analise faltantes por grupo e descubra onde focar nas trocas.</p>
        </button>
      </div>
    </div>
  );
}
