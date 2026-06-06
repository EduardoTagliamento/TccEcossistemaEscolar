"use client";

/**
 * Componente: Barra de Busca de Figurinhas
 */

import React, { useState } from "react";

export interface BuscaFigurinhaFiltros {
  termo: string;
  tipo: string;
  grupo: string;
  prefixo: string;
  selecao: string;
  conclusao: "todas" | "completas" | "incompletas";
}

interface BuscaFigurinhaProps {
  onBuscar: (filtros: BuscaFigurinhaFiltros) => void;
  onLimpar: () => void;
  grupos: string[];
  prefixos: string[];
}

export const BuscaFigurinha: React.FC<BuscaFigurinhaProps> = ({
  onBuscar,
  onLimpar,
  grupos,
  prefixos,
}) => {
  const [termo, setTermo] = useState("");
  const [tipo, setTipo] = useState("");
  const [grupo, setGrupo] = useState("");
  const [prefixo, setPrefixo] = useState("");
  const [selecao, setSelecao] = useState("");
  const [conclusao, setConclusao] = useState<"todas" | "completas" | "incompletas">("todas");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onBuscar({
      termo,
      tipo,
      grupo,
      prefixo,
      selecao,
      conclusao,
    });
  };

  const handleLimpar = () => {
    setTermo("");
    setTipo("");
    setGrupo("");
    setPrefixo("");
    setSelecao("");
    setConclusao("todas");
    onLimpar();
  };

  return (
    <form onSubmit={handleSubmit} className="copa-search-form">
      <label className="copa-search-label">
        Pesquisar Figurinha
      </label>
      <div className="copa-search-row">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Codigo ou prefixo (ex: GHA01 ou GHA)"
          className="copa-search-input"
        />
        <div className="copa-search-actions">
          <button
            type="submit"
            className="copa-search-btn copa-search-btn-primary"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleLimpar}
            className="copa-search-btn copa-search-btn-secondary"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="copa-search-filters-grid">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="copa-search-select">
          <option value="">Todos os tipos</option>
          <option value="FWC">FWC</option>
          <option value="SELECAO">Selecao</option>
          <option value="COCACOLA">Coca-Cola</option>
        </select>

        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="copa-search-select">
          <option value="">Todos os grupos</option>
          {grupos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={prefixo} onChange={(e) => setPrefixo(e.target.value)} className="copa-search-select">
          <option value="">Todos os prefixos</option>
          {prefixos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={selecao}
          onChange={(e) => setSelecao(e.target.value)}
          placeholder="Filtrar por selecao"
          className="copa-search-input"
        />

        <select
          value={conclusao}
          onChange={(e) => setConclusao(e.target.value as "todas" | "completas" | "incompletas")}
          className="copa-search-select"
        >
          <option value="todas">Todas (completas e incompletas)</option>
          <option value="completas">Somente completas</option>
          <option value="incompletas">Somente incompletas</option>
        </select>
      </div>

      <p className="copa-search-tip">
        Use qualquer combinacao de filtros para refinar sua busca.
      </p>
    </form>
  );
};
