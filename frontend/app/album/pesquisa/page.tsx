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
    <div className="copa-page">
      <div className="copa-page-header">
        <div>
          <p className="copa-kicker">Busca inteligente</p>
          <h2 className="copa-page-title">Pesquisar Figurinhas</h2>
        </div>
        <button
          onClick={() => router.push("/album")}
          className="copa-back-button"
        >
          Voltar ao painel
        </button>
      </div>

      <BuscaFigurinha onBuscar={handleBuscar} onLimpar={handleLimpar} />

      {erro && (
        <div className="copa-state-box copa-state-box-error copa-gap-top">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="copa-state-box copa-gap-top">
          Carregando figurinhas...
        </div>
      ) : (
        <div className="copa-results-panel">
          <p className="copa-results-title">
            Resultados: {figurinhas.length} figurinha{figurinhas.length !== 1 ? "s" : ""}
          </p>
          <div className="copa-figurinhas-grid">
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
