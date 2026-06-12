"use client";

/**
 * Componente: Modal de Edição de Status
 * Modal para alterar o status de uma figurinha nos 3 álbuns
 */

import React, { useState, useEffect } from "react";
import { Figurinha, StatusFigurinha, Album } from "@/lib/copa/types";
import { copaApi } from "@/lib/copa/api";

interface ModalEditarStatusProps {
  figurinha: Figurinha | null;
  statusList: StatusFigurinha[];
  albuns: Album[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ModalEditarStatus: React.FC<ModalEditarStatusProps> = ({
  figurinha,
  statusList,
  albuns,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [albumPendente, setAlbumPendente] = useState<number | null>(null);
  const [senhaInput, setSenhaInput] = useState("");
  const [statusTemp, setStatusTemp] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (figurinha && statusList) {
      const temp: { [key: number]: boolean } = {};
      albuns.forEach((album) => {
        const status = statusList.find((s) => s.albumId === album.id);
        temp[album.id] = status?.possui || false;
      });
      setStatusTemp(temp);
      setAlbumPendente(null);
      setSenhaInput("");
      setErro("");
    }
  }, [figurinha, statusList, albuns]);

  if (!isOpen || !figurinha) return null;

  const handlePedirConfirmacao = (albumId: number) => {
    setErro("");
    setAlbumPendente(albumId);
    setSenhaInput("");
  };

  const handleConfirmarAlteracao = async () => {
    if (!figurinha || albumPendente === null) {
      return;
    }

    if (!senhaInput.trim()) {
      setErro("Senha não informada");
      return;
    }

    setLoading(true);

    try {
      const novoStatus = !statusTemp[albumPendente];
      await copaApi.atualizarStatus(albumPendente, figurinha.id, novoStatus, senhaInput);

      setStatusTemp((prev) => ({
        ...prev,
        [albumPendente]: novoStatus,
      }));

      setAlbumPendente(null);
      setSenhaInput("");
      onUpdate();
    } catch (error: any) {
      if (error.response?.status === 401) {
        setErro("Senha incorreta");
      } else {
        setErro("Erro ao atualizar status.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="copa-modal-overlay"
      onClick={onClose}
    >
      <div
        className="copa-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="copa-modal-header">
          <h2 className="copa-modal-title">
            Figurinha {figurinha.codigo}
          </h2>
          <button
            onClick={onClose}
            className="copa-modal-close"
          >
            ×
          </button>
        </div>

        {figurinha.selecao && (
          <p className="copa-modal-subtitle">
            <strong>{figurinha.selecao}</strong> - {figurinha.grupo}
          </p>
        )}

        {erro && (
          <div className="copa-modal-error">
            {erro}
          </div>
        )}

        <div className="copa-modal-status-list">
          {albuns.map((album) => (
            <label
              key={album.id}
              className="copa-modal-status-item"
              style={{ borderColor: album.cor }}
            >
              <input
                type="checkbox"
                checked={statusTemp[album.id] || false}
                onChange={() => handlePedirConfirmacao(album.id)}
                disabled={loading}
                className="copa-modal-checkbox"
              />
              <span className="copa-modal-album-icon">{album.icone}</span>
              <span className="copa-modal-album-name" style={{ color: album.cor }}>
                {album.nomeDisplay}
              </span>
            </label>
          ))}
        </div>

        {albumPendente !== null && (
          <div className="copa-modal-password-box">
            <p className="copa-modal-password-label">Digite a senha para confirmar a alteracao</p>
            <div className="copa-modal-password-row">
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Senha"
                className="copa-modal-password-input"
                disabled={loading}
              />
              <button
                onClick={handleConfirmarAlteracao}
                disabled={loading}
                className="copa-modal-btn copa-modal-btn-confirm"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setAlbumPendente(null);
                  setSenhaInput("");
                  setErro("");
                }}
                disabled={loading}
                className="copa-modal-btn copa-modal-btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="copa-modal-footer">
          <button
            onClick={onClose}
            className="copa-modal-btn copa-modal-btn-close"
          >
            Fechar
          </button>
        </div>

        {loading && (
          <div className="copa-modal-loading">Atualizando...</div>
        )}
      </div>
    </div>
  );
};
