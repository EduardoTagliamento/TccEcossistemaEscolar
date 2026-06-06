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
      className={`p-4 border-2 ${borderColor} rounded-lg cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-white`}
      onClick={() => onClick(figurinha)}
    >
      <h3 className="text-lg font-bold text-center text-gray-800">{figurinha.codigo}</h3>
      <div className="flex justify-center gap-3 mt-2">
        <span
          className={`text-sm font-semibold ${
            prataStatus ? "text-gray-500" : "text-gray-300"
          }`}
          title={prataStatus ? "Tem no Prata" : "Falta no Prata"}
        >
          🥈
        </span>
        <span
          className={`text-sm font-semibold ${
            normalStatus ? "text-blue-600" : "text-gray-300"
          }`}
          title={normalStatus ? "Tem no Normal" : "Falta no Normal"}
        >
          📘
        </span>
        <span
          className={`text-sm font-semibold ${
            ouroStatus ? "text-yellow-500" : "text-gray-300"
          }`}
          title={ouroStatus ? "Tem no Ouro" : "Falta no Ouro"}
        >
          🥇
        </span>
      </div>
      {figurinha.selecao && (
        <p className="text-xs text-center text-gray-500 mt-1">{figurinha.selecao}</p>
      )}
    </div>
  );
};
