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
    carregarAlbuns();
    carregarTodasFigurinhas();
  }, []);

  const carregarAlbuns = async () => {
    try {
      const data = await copaApi.listarAlbuns();
      setAlbuns(data);
    } catch (error) {
      console.error("Erro ao carregar álbuns:", error);
    }
  };

  const carregarTodasFigurinhas = async () => {
    setLoading(true);
    try {
      const data = await copaApi.buscarFigurinhas();
      setFigurinhas(data);
      await carregarStatusParaFigurinhas(data);
    } catch (error: any) {
      setErro("Erro ao carregar figurinhas");
    } finally {
      setLoading(false);
    }
  };

  const carregarStatusParaFigurinhas = async (figs: Figurinha[]) => {
    try {
      const statusPromises = albuns.map((album) =>
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
    carregarTodasFigurinhas();
    setErro("");
  };

  const handleClickFigurinha = (figurinha: Figurinha) => {
    setFigurinhaSelecionada(figurinha);
    setModalAberto(true);
  };

  const handleUpdateStatus = async () => {
    // Recarregar status após atualização
    if (figurinhaSelecionada) {
      await carregarStatusParaFigurinhas([figurinhaSelecionada]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Pesquisar Figurinhas</h2>
        <button
          onClick={() => router.push("/album")}
          className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg transition"
        >
          ← Voltar
        </button>
      </div>

      <BuscaFigurinha onBuscar={handleBuscar} onLimpar={handleLimpar} />

      {erro && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="text-center text-white text-xl mt-8">Carregando...</div>
      ) : (
        <div className="mt-8">
          <p className="text-white text-lg mb-4">
            Resultados: {figurinhas.length} figurinha{figurinhas.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
