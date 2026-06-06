"use client";

/**
 * Componente: Card de Estatísticas de Álbum
 */

import React from "react";
import { EstatisticasAlbum } from "@/lib/copa/types";

interface EstatisticasCardProps {
  stats: EstatisticasAlbum;
}

export const EstatisticasCard: React.FC<EstatisticasCardProps> = ({ stats }) => {
  return (
    <div
      className="rounded-3xl border border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
      style={{ boxShadow: `0 18px 40px -22px ${stats.albumCor}` }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">{stats.albumDisplay}</h3>
        <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 text-2xl">
          {stats.albumIcone}
        </span>
      </div>

      <div className="space-y-2 rounded-2xl bg-slate-100/90 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Completas</span>
          <span className="font-bold text-emerald-700">{stats.completas}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Faltantes</span>
          <span className="font-bold text-rose-700">{stats.faltantes}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total</span>
          <span className="font-bold text-slate-900">{stats.totalFigurinhas}</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${stats.percentualCompleto}%`,
              backgroundColor: stats.albumCor,
            }}
          />
        </div>
        <p className="mt-3 text-center text-xl font-black" style={{ color: stats.albumCor }}>
          {stats.percentualCompleto.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};
