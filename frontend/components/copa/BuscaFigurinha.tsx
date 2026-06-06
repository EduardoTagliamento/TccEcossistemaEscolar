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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/25 bg-slate-950/45 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-slate-100">
        Pesquisar Figurinha
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Digite o código (ex: GHA01 ou GHA)"
          className="flex-1 rounded-2xl border border-white/25 bg-white/90 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <div className="flex gap-2 sm:gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-400"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleLimpar}
            className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Limpar
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Dica: Digite o código completo (GHA01) ou apenas o prefixo (GHA) para ver todas as 20
        figurinhas
      </p>
    </form>
  );
};
