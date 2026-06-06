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
      className="bg-white rounded-lg shadow-lg p-6 border-t-4"
      style={{ borderTopColor: stats.albumCor }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">{stats.albumDisplay}</h3>
        <span className="text-3xl">{stats.albumIcone}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Completas:</span>
          <span className="font-bold text-green-600">{stats.completas}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Faltantes:</span>
          <span className="font-bold text-red-600">{stats.faltantes}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total:</span>
          <span className="font-bold text-gray-800">{stats.totalFigurinhas}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="h-4 rounded-full transition-all"
            style={{
              width: `${stats.percentualCompleto}%`,
              backgroundColor: stats.albumCor,
            }}
          />
        </div>
        <p className="text-center mt-2 text-lg font-bold" style={{ color: stats.albumCor }}>
          {stats.percentualCompleto.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};
