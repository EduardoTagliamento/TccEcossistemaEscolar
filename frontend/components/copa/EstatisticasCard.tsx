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
      className="copa-stat-card"
      style={{ boxShadow: `0 18px 40px -22px ${stats.albumCor}` }}
    >
      <div className="copa-stat-header">
        <h3 className="copa-stat-name">{stats.albumDisplay}</h3>
        <span className="copa-stat-icon">
          {stats.albumIcone}
        </span>
      </div>

      <div className="copa-stat-lines">
        <div className="copa-stat-line">
          <span>Completas</span>
          <span className="copa-stat-value-success">{stats.completas}</span>
        </div>
        <div className="copa-stat-line">
          <span>Faltantes</span>
          <span className="copa-stat-value-danger">{stats.faltantes}</span>
        </div>
        <div className="copa-stat-line">
          <span>Total</span>
          <span className="copa-stat-value-default">{stats.totalFigurinhas}</span>
        </div>
      </div>

      <div className="copa-stat-progress-wrap">
        <div className="copa-stat-progress-track">
          <div
            className="copa-stat-progress-fill"
            style={{
              width: `${stats.percentualCompleto}%`,
              backgroundColor: stats.albumCor,
            }}
          />
        </div>
        <p className="copa-stat-percent" style={{ color: stats.albumCor }}>
          {stats.percentualCompleto.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};
