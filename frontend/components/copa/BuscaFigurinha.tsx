"use client";

/**
 * Componente: Barra de Busca de Figurinhas
 */

import React, { useState } from "react";

interface BuscaFigurinhaProps {
  onBuscar: (codigo: string) => void;
  onLimpar: () => void;
}

export const BuscaFigurinha: React.FC<BuscaFigurinhaProps> = ({ onBuscar, onLimpar }) => {
  const [codigo, setCodigo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.trim()) {
      onBuscar(codigo.toUpperCase());
    }
  };

  const handleLimpar = () => {
    setCodigo("");
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
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Digite o código (ex: GHA01 ou GHA)"
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
      <p className="copa-search-tip">
        Dica: Digite o código completo (GHA01) ou apenas o prefixo (GHA) para ver todas as 20
        figurinhas
      </p>
    </form>
  );
};
