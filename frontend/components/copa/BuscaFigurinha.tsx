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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
      <label className="block text-gray-700 font-bold mb-2">
        Pesquisar Figurinha
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Digite o código (ex: GHA01 ou GHA)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
        >
          🔍 Buscar
        </button>
        <button
          type="button"
          onClick={handleLimpar}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
        >
          Limpar
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Dica: Digite o código completo (GHA01) ou apenas o prefixo (GHA) para ver todas as 20
        figurinhas
      </p>
    </form>
  );
};
