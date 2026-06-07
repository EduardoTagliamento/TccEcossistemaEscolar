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

const DEBUG_COPA_SEARCH_ENV = process.env.NEXT_PUBLIC_DEBUG_COPA_SEARCH === "true";
const DEBUG_SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

export default function PesquisaPage() {
  const router = useRouter();
  const [debugQueryParam, setDebugQueryParam] = useState<string | null>(null);
  const [figurinhas, setFigurinhas] = useState<Figurinha[]>([]);
  const [statusMap, setStatusMap] = useState<{ [key: number]: StatusFigurinha[] }>({});
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [prefixos, setPrefixos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [figurinhaSelecionada, setFigurinhaSelecionada] = useState<Figurinha | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [debugRequestSeq, setDebugRequestSeq] = useState(0);

  const debugBuscaAtivo = DEBUG_COPA_SEARCH_ENV || debugQueryParam === "1";

  const debugBusca = (etapa: string, dados?: unknown, reqId?: string) => {
    if (!debugBuscaAtivo) return;
    const prefixoReq = reqId ? `[${reqId}] ` : "";
    console.log(DEBUG_SEPARATOR);
    console.log(`🔍 ${prefixoReq}${etapa}`);
    if (dados !== undefined) {
      console.log("   Dados:", dados);
      return;
    }
  };

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (!debugBuscaAtivo) return;
    debugBusca("debug-ativo", {
      origem: DEBUG_COPA_SEARCH_ENV ? "env" : "query-param",
      dica: "Use /album/pesquisa?debugBusca=1 e abra o console do navegador.",
    });
  }, [debugBuscaAtivo]);

  // Ler query param debugBusca no cliente para evitar usar useSearchParams (prerender/suspense)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search || "");
    setDebugQueryParam(sp.get("debugBusca"));
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
    const nextSeq = debugRequestSeq + 1;
    setDebugRequestSeq(nextSeq);
    const reqId = `COPA-BUSCA-${String(nextSeq).padStart(4, "0")}`;

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

      debugBusca("Iniciando busca de figurinhas", {
        filtros,
        payload,
      }, reqId);

      let figs = await copaApi.buscarFigurinhas(payload);
      debugBusca("Retorno da API /album/figurinhas", {
        quantidade: figs.length,
      }, reqId);

      if (filtros.gruposSelecionados.length > 0) {
        const antes = figs.length;
        const gruposAtivos = filtros.gruposSelecionados.map((g) => g.toUpperCase());
        figs = figs.filter((fig) => {
          const grupoFig = (fig.grupo || "").toUpperCase();
          return gruposAtivos.includes(grupoFig);
        });
        debugBusca("Aplicado filtro por grupos", {
          antes,
          depois: figs.length,
          gruposAtivos,
        }, reqId);
      }

      if (filtros.selecao.trim()) {
        const antes = figs.length;
        const selecaoLower = filtros.selecao.trim().toLowerCase();
        figs = figs.filter((fig) =>
          (fig.selecao || "").toLowerCase().includes(selecaoLower)
        );
        debugBusca("Aplicado filtro por selecao", {
          antes,
          depois: figs.length,
          selecao: filtros.selecao,
        }, reqId);
      }

      const mapStatus = await carregarStatusParaFigurinhas(figs);
      debugBusca("Status carregado para figurinhas", {
        figurinhasComStatus: Object.keys(mapStatus).length,
      }, reqId);

      if (filtros.conclusao !== "todas") {
        // Avaliar completude em todos os albuns carregados (comportamento padrão)
        const albumIds = albuns.map((a) => a.id);

        debugBusca("Filtro de conclusao aplicando sobre todos os albuns", {
          conclusao: filtros.conclusao,
          albumIds,
        }, reqId);

        const antes = figs.length;
        figs = figs.filter((fig) => {
          const statusList = mapStatus[fig.id] || [];

          const mapaPossui = new Map<number, boolean>();
          statusList.forEach((item) => {
            mapaPossui.set(item.albumId, item.possui);
          });

          const completaEmTodos = albumIds.every((albumId) => mapaPossui.get(albumId) === true);
          const incompletaEmAlgum = albumIds.some((albumId) => mapaPossui.get(albumId) !== true);

          return filtros.conclusao === "completas" ? completaEmTodos : incompletaEmAlgum;
        });

        debugBusca("Resultado apos filtro de conclusao", {
          antes,
          depois: figs.length,
          amostraCodigos: figs.slice(0, 10).map((f) => f.codigo),
        }, reqId);
      }

      if (!figs.length) {
        setErro("Nenhuma figurinha encontrada com os filtros informados.");
      }

      debugBusca("Busca finalizada", {
        quantidade: figs.length,
        amostraCodigos: figs.slice(0, 20).map((f) => f.codigo),
      }, reqId);

      setFigurinhas(figs);
      const mapStatusFiltrado: { [key: number]: StatusFigurinha[] } = {};
      figs.forEach((fig) => {
        mapStatusFiltrado[fig.id] = mapStatus[fig.id] || [];
      });
      setStatusMap(mapStatusFiltrado);
    } catch (error: any) {
      debugBusca("Erro durante a busca", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      }, reqId);
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
