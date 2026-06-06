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

  return (
    <div
      className={`copa-figurinha-card ${isCompleta ? "is-completa" : ""}`}
      onClick={() => onClick(figurinha)}
    >
      <div className="copa-figurinha-header">
        <h3 className="copa-figurinha-code">{figurinha.codigo}</h3>
        {isCompleta && (
          <span className="copa-figurinha-badge">
            completa
          </span>
        )}
      </div>

      <div className="copa-figurinha-status-row">
        <span
          className={`copa-status-chip ${prataStatus ? "is-active prata" : "is-inactive"}`}
          title={prataStatus ? "Tem no Prata" : "Falta no Prata"}
        >
          Prata
        </span>
        <span
          className={`copa-status-chip ${normalStatus ? "is-active normal" : "is-inactive"}`}
          title={normalStatus ? "Tem no Normal" : "Falta no Normal"}
        >
          Normal
        </span>
        <span
          className={`copa-status-chip ${ouroStatus ? "is-active ouro" : "is-inactive"}`}
          title={ouroStatus ? "Tem no Ouro" : "Falta no Ouro"}
        >
          Ouro
        </span>
      </div>
      {figurinha.selecao && (
        <p className="copa-figurinha-selecao">
          {figurinha.selecao}
        </p>
      )}
    </div>
  );
};
