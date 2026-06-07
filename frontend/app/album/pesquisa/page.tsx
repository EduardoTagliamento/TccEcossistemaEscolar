"use client";

/**
 * Página: Pesquisa de Figurinhas
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { Figurinha, StatusFigurinha, Album } from "@/lib/copa/types";
import { BuscaFigurinha, BuscaFigurinhaFiltros } from "@/components/copa/BuscaFigurinha";
import { FigurinhaCard } from "@/components/copa/FigurinhaCard";
import { ModalEditarStatus } from "@/components/copa/ModalEditarStatus";

const DEBUG_COPA_SEARCH = process.env.NEXT_PUBLIC_DEBUG_COPA_SEARCH === "true";

const debugBusca = (etapa: string, dados?: unknown) => {
  if (!DEBUG_COPA_SEARCH) return;
  if (dados !== undefined) {
    console.log(`[COPA_BUSCA_DEBUG] ${etapa}`, dados);
    return;
  }
  console.log(`[COPA_BUSCA_DEBUG] ${etapa}`);
};

export default function PesquisaPage() {
  const router = useRouter();
  const [figurinhas, setFigurinhas] = useState<Figurinha[]>([]);
  const [statusMap, setStatusMap] = useState<{ [key: number]: StatusFigurinha[] }>({});
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [prefixos, setPrefixos] = useState<string[]>([]);
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
      const [albunsData, figurinhasData, gruposData, prefixosData] = await Promise.all([
        copaApi.listarAlbuns(),
        copaApi.buscarFigurinhas(),
        copaApi.listarGrupos(),
        copaApi.listarPrefixos(),
      ]);

      setAlbuns(albunsData);
      setGrupos(gruposData);
      setPrefixos(prefixosData);
      setFigurinhas(figurinhasData);
      debugBusca("inicializar:albuns-carregados", albunsData.map((a) => ({ id: a.id, nome: a.nome })));
      debugBusca("inicializar:totais", {
        albuns: albunsData.length,
        figurinhas: figurinhasData.length,
        grupos: gruposData.length,
        prefixos: prefixosData.length,
      });
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
      return {} as { [key: number]: StatusFigurinha[] };
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
      return map;
    } catch (error) {
      console.error("Erro ao carregar status:", error);
      return {} as { [key: number]: StatusFigurinha[] };
    }
  };

  const handleBuscar = async (filtros: BuscaFigurinhaFiltros) => {
    setLoading(true);
    setErro("");

    try {
      const termoUpper = filtros.termo.trim().toUpperCase();
      const payload: {
        tipo?: string;
        prefixo?: string;
        codigo?: string;
        grupo?: string;
      } = {};

      if (filtros.tipo) payload.tipo = filtros.tipo;
      if (filtros.gruposSelecionados.length === 1) {
        payload.grupo = filtros.gruposSelecionados[0];
      }
      if (filtros.prefixo) payload.prefixo = filtros.prefixo.toUpperCase();

      if (termoUpper) {
        if (/\d/.test(termoUpper)) {
          payload.codigo = termoUpper;
        } else if (!payload.prefixo) {
          payload.prefixo = termoUpper;
        }
      }

      debugBusca("buscar:entrada", {
        filtros,
        payload,
      });

      let figs = await copaApi.buscarFigurinhas(payload);
      debugBusca("buscar:retorno-api", { quantidade: figs.length });

      if (filtros.gruposSelecionados.length > 0) {
        const antes = figs.length;
        const gruposAtivos = filtros.gruposSelecionados.map((g) => g.toUpperCase());
        figs = figs.filter((fig) => {
          const grupoFig = (fig.grupo || "").toUpperCase();
          return gruposAtivos.includes(grupoFig);
        });
        debugBusca("buscar:filtro-grupos", { antes, depois: figs.length, gruposAtivos });
      }

      if (filtros.selecao.trim()) {
        const antes = figs.length;
        const selecaoLower = filtros.selecao.trim().toLowerCase();
        figs = figs.filter((fig) =>
          (fig.selecao || "").toLowerCase().includes(selecaoLower)
        );
        debugBusca("buscar:filtro-selecao", { antes, depois: figs.length, selecao: filtros.selecao });
      }

      const mapStatus = await carregarStatusParaFigurinhas(figs);
      debugBusca("buscar:status-carregado", {
        figurinhasComStatus: Object.keys(mapStatus).length,
      });

      if (filtros.conclusao !== "todas") {
        const albumIdPorNome = new Map(albuns.map((album) => [album.nome, album.id]));
        const albunsSelecionados: number[] = [];

        if (filtros.albunsConclusao.prata) {
          const idPrata = albumIdPorNome.get("prata");
          if (idPrata !== undefined) albunsSelecionados.push(idPrata);
        }

        if (filtros.albunsConclusao.normal) {
          const idNormal = albumIdPorNome.get("normal");
          if (idNormal !== undefined) albunsSelecionados.push(idNormal);
        }

        if (filtros.albunsConclusao.ouro) {
          const idOuro = albumIdPorNome.get("ouro");
          if (idOuro !== undefined) albunsSelecionados.push(idOuro);
        }

        debugBusca("buscar:filtro-conclusao-mapeamento", {
          conclusao: filtros.conclusao,
          albunsPorNome: Object.fromEntries(albumIdPorNome.entries()),
          albunsSelecionados,
          albunsConclusao: filtros.albunsConclusao,
        });

        if (!albunsSelecionados.length) {
          setErro("Nao foi possivel identificar os albuns selecionados para o filtro de conclusao.");
          setFigurinhas([]);
          setStatusMap({});
          debugBusca("buscar:filtro-conclusao-sem-album-resolvido");
          return;
        }

        const antes = figs.length;
        figs = figs.filter((fig) => {
          const statusList = mapStatus[fig.id] || [];

          const mapaPossui = new Map<number, boolean>();
          statusList.forEach((item) => {
            mapaPossui.set(item.albumId, item.possui);
          });

          const completaEmAlgumSelecionado = albunsSelecionados.some(
            (albumId) => mapaPossui.get(albumId) === true
          );

          const incompletaEmAlgumSelecionado = albunsSelecionados.some(
            (albumId) => mapaPossui.get(albumId) !== true
          );

          return filtros.conclusao === "completas"
            ? completaEmAlgumSelecionado
            : incompletaEmAlgumSelecionado;
        });

        debugBusca("buscar:filtro-conclusao-resultado", {
          antes,
          depois: figs.length,
          amostraCodigos: figs.slice(0, 10).map((f) => f.codigo),
        });
      }

      if (!figs.length) {
        setErro("Nenhuma figurinha encontrada com os filtros informados.");
      }

      debugBusca("buscar:resultado-final", {
        quantidade: figs.length,
        amostraCodigos: figs.slice(0, 20).map((f) => f.codigo),
      });

      setFigurinhas(figs);
      const mapStatusFiltrado: { [key: number]: StatusFigurinha[] } = {};
      figs.forEach((fig) => {
        mapStatusFiltrado[fig.id] = mapStatus[fig.id] || [];
      });
      setStatusMap(mapStatusFiltrado);
    } catch (error: any) {
      debugBusca("buscar:erro", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
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

      <BuscaFigurinha
        onBuscar={handleBuscar}
        onLimpar={handleLimpar}
        grupos={grupos}
        prefixos={prefixos}
      />

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
