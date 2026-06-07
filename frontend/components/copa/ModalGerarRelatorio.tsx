"use client";

import React, { useMemo, useState } from "react";
import { copaApi } from "@/lib/copa/api";
import { FigurinhasFaltantes } from "@/lib/copa/types";

interface ModalGerarRelatorioProps {
  isOpen: boolean;
  onClose: () => void;
}

type AlbumNome = "prata" | "normal" | "ouro";

interface AlbumInfo {
  nome: AlbumNome;
  titulo: string;
}

const ALBUNS: AlbumInfo[] = [
  { nome: "prata", titulo: "Album 1 - Prata" },
  { nome: "normal", titulo: "Album 2 - Normal" },
  { nome: "ouro", titulo: "Album 3 - Ouro" },
];

function extrairPrefixo(codigo: string, prefixo?: string): string {
  if (prefixo && prefixo.trim()) {
    return prefixo.toUpperCase();
  }

  const match = codigo.toUpperCase().match(/^[A-Z]+/);
  return match ? match[0] : codigo.toUpperCase();
}

function montarBlocoAlbum(
  titulo: string,
  grupos: FigurinhasFaltantes[],
  incluirCoca: boolean
): string {
  const prefixos = new Map<string, number[]>();

  grupos.forEach((grupo) => {
    grupo.faltantes.forEach((fig) => {
      const isCoca = (fig.tipo || "").toUpperCase() === "COCACOLA";
      if (!incluirCoca && isCoca) {
        return;
      }

      const prefixo = extrairPrefixo(fig.codigo, fig.prefixo);
      const numero = Number(fig.numero);
      if (!Number.isFinite(numero)) {
        return;
      }

      if (!prefixos.has(prefixo)) {
        prefixos.set(prefixo, []);
      }
      prefixos.get(prefixo)!.push(numero);
    });
  });

  const linhas = Array.from(prefixos.entries())
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([prefixo, numeros]) => {
      const numerosUnicosOrdenados = Array.from(new Set(numeros)).sort((a, b) => a - b);
      return `${prefixo} ${numerosUnicosOrdenados.join(", ")}`;
    });

  return `${titulo}\n\n${linhas.length ? linhas.join("\n") : "Sem faltantes"}`;
}

function montarRelatorio(
  dadosPorAlbum: Record<AlbumNome, FigurinhasFaltantes[]>,
  incluirCoca: boolean
): string {
  return ALBUNS.map((album) =>
    montarBlocoAlbum(album.titulo, dadosPorAlbum[album.nome] || [], incluirCoca)
  ).join("\n\n");
}

export const ModalGerarRelatorio: React.FC<ModalGerarRelatorioProps> = ({
  isOpen,
  onClose,
}) => {
  const [incluirCoca, setIncluirCoca] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [dados, setDados] = useState<Record<AlbumNome, FigurinhasFaltantes[]> | null>(null);
  const [relatorio, setRelatorio] = useState("");

  const relatorioPreview = useMemo(() => {
    if (!dados) return relatorio;
    return montarRelatorio(dados, incluirCoca);
  }, [dados, incluirCoca, relatorio]);

  if (!isOpen) return null;

  const carregarDados = async (): Promise<Record<AlbumNome, FigurinhasFaltantes[]>> => {
    const [prata, normal, ouro] = await Promise.all([
      copaApi.obterFaltantesAgrupadas("prata"),
      copaApi.obterFaltantesAgrupadas("normal"),
      copaApi.obterFaltantesAgrupadas("ouro"),
    ]);

    return { prata, normal, ouro };
  };

  const handleGerarRelatorio = async () => {
    setLoading(true);
    setErro("");
    setCopiado(false);

    try {
      const dadosAtualizados = dados || (await carregarDados());
      if (!dados) {
        setDados(dadosAtualizados);
      }

      const texto = montarRelatorio(dadosAtualizados, incluirCoca);
      setRelatorio(texto);
    } catch (error) {
      console.error("Erro ao gerar relatorio:", error);
      setErro("Nao foi possivel gerar o relatorio.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = async () => {
    if (!relatorioPreview.trim()) {
      setErro("Gere o relatorio antes de copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(relatorioPreview);
      setCopiado(true);
      setErro("");
    } catch (error) {
      console.error("Erro ao copiar relatorio:", error);
      setErro("Nao foi possivel copiar para a area de transferencia.");
    }
  };

  return (
    <div className="copa-modal-overlay" onClick={onClose}>
      <div className="copa-modal-content copa-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="copa-modal-header">
          <h2 className="copa-modal-title">Gerar Relatorio de Faltantes</h2>
          <button onClick={onClose} className="copa-modal-close">
            ×
          </button>
        </div>

        <p className="copa-modal-subtitle">
          Relatorio no formato por album, mostrando apenas as figurinhas faltantes.
        </p>

        <div className="copa-report-options">
          <label className="copa-report-checkbox">
            <input
              type="checkbox"
              checked={incluirCoca}
              onChange={(e) => {
                setIncluirCoca(e.target.checked);
                setCopiado(false);
              }}
            />
            Incluir figurinhas da Coca-Cola
          </label>

          <div className="copa-report-actions">
            <button
              type="button"
              onClick={handleGerarRelatorio}
              disabled={loading}
              className="copa-modal-btn copa-modal-btn-confirm"
            >
              {loading ? "Gerando..." : "Gerar relatorio"}
            </button>
            <button
              type="button"
              onClick={handleCopiar}
              disabled={loading}
              className="copa-modal-btn copa-modal-btn-close"
            >
              Copiar para area de transferencia
            </button>
          </div>
        </div>

        {erro && <div className="copa-modal-error">{erro}</div>}

        <textarea
          className="copa-report-textarea"
          value={relatorioPreview}
          readOnly
          placeholder="Clique em Gerar relatorio para visualizar o conteudo aqui."
        />

        {copiado && <p className="copa-report-success">Relatorio copiado com sucesso.</p>}
      </div>
    </div>
  );
};
