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
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {erro}
        </div>
      </div>
    );
  }

  if (!estatisticas) return null;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-white mb-8 text-center">
        Meu Álbum da Copa 2026
      </h2>

      {/* Estatísticas dos 3 álbuns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EstatisticasCard stats={estatisticas.prata} />
        <EstatisticasCard stats={estatisticas.normal} />
        <EstatisticasCard stats={estatisticas.ouro} />
      </div>

      {/* Completude geral */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">
          🏆 Completas nos 3 álbuns: {estatisticas.completasNos3} (
          {((estatisticas.completasNos3 / 994) * 100).toFixed(1)}%)
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-6">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full transition-all"
            style={{ width: `${(estatisticas.completasNos3 / 994) * 100}%` }}
          />
        </div>
      </div>

      {/* Botões de navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => router.push("/album/pesquisa")}
          className="bg-blue-600 hover:bg-blue-700 text-white py-8 rounded-lg text-xl font-bold transition-all hover:scale-105 shadow-lg"
        >
          🔍 Pesquisar Figurinhas
        </button>
        <button
          onClick={() => router.push("/album/meus-albuns")}
          className="bg-green-600 hover:bg-green-700 text-white py-8 rounded-lg text-xl font-bold transition-all hover:scale-105 shadow-lg"
        >
          📚 Ver Meus Álbuns
        </button>
      </div>
    </div>
  );
}
