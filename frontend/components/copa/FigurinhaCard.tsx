"use client";

/**
 * Componente: Card de Figurinha
 * Exibe uma figurinha com seu status nos 3 álbuns
 */

import React from "react";
import { Figurinha, StatusFigurinha } from "@/lib/copa/types";

interface FigurinhaCardProps {
  figurinha: Figurinha;
  statusList: StatusFigurinha[];
  onClick: (figurinha: Figurinha) => void;
}

export const FigurinhaCard: React.FC<FigurinhaCardProps> = ({
  figurinha,
  statusList,
  onClick,
}) => {
  // Buscar status para cada álbum
  const prataStatus = statusList.find((s) => s.albumId === 1)?.possui || false;
  const normalStatus = statusList.find((s) => s.albumId === 2)?.possui || false;
  const ouroStatus = statusList.find((s) => s.albumId === 3)?.possui || false;

  const isCompleta = prataStatus && normalStatus && ouroStatus;
  const borderColor = isCompleta ? "border-green-500" : "border-gray-300";

  return (
    <div
      className={`group cursor-pointer rounded-2xl border ${borderColor} bg-white/95 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
      onClick={() => onClick(figurinha)}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-black tracking-wide text-slate-900">{figurinha.codigo}</h3>
        {isCompleta && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
            completa
          </span>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            prataStatus ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-400"
          }`}
          title={prataStatus ? "Tem no Prata" : "Falta no Prata"}
        >
          Prata
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            normalStatus ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-400"
          }`}
          title={normalStatus ? "Tem no Normal" : "Falta no Normal"}
        >
          Normal
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            ouroStatus ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
          }`}
          title={ouroStatus ? "Tem no Ouro" : "Falta no Ouro"}
        >
          Ouro
        </span>
      </div>
      {figurinha.selecao && (
        <p className="mt-2 line-clamp-1 text-center text-xs font-semibold text-slate-500">
          {figurinha.selecao}
        </p>
      )}
    </div>
  );
};
