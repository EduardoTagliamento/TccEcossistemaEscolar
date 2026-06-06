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
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusTemp, setStatusTemp] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (figurinha && statusList) {
      const temp: { [key: number]: boolean } = {};
      albuns.forEach((album) => {
        const status = statusList.find((s) => s.albumId === album.id);
        temp[album.id] = status?.possui || false;
      });
      setStatusTemp(temp);
    }
  }, [figurinha, statusList, albuns]);

  if (!isOpen || !figurinha) return null;

  const handleToggle = async (albumId: number) => {
    setErro("");

    // Solicitar senha
    const senhaInput = window.prompt("Digite a senha para alterar o status:");
    if (!senhaInput) {
      setErro("Senha não informada");
      return;
    }

    setLoading(true);

    try {
      const novoStatus = !statusTemp[albumId];
      await copaApi.atualizarStatus(albumId, figurinha.id, novoStatus, senhaInput);

      // Atualizar estado local
      setStatusTemp((prev) => ({
        ...prev,
        [albumId]: novoStatus,
      }));

      // Notificar atualização
      onUpdate();
    } catch (error: any) {
      if (error.response?.status === 401) {
        setErro("Senha incorreta!");
      } else {
        setErro("Erro ao atualizar status");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Figurinha {figurinha.codigo}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {figurinha.selecao && (
          <p className="text-gray-600 mb-4">
            <strong>{figurinha.selecao}</strong> - {figurinha.grupo}
          </p>
        )}

        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {erro}
          </div>
        )}

        <div className="space-y-3">
          {albuns.map((album) => (
            <label
              key={album.id}
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: album.cor }}
            >
              <input
                type="checkbox"
                checked={statusTemp[album.id] || false}
                onChange={() => handleToggle(album.id)}
                disabled={loading}
                className="w-5 h-5 mr-3"
              />
              <span className="text-2xl mr-2">{album.icone}</span>
              <span className="font-semibold" style={{ color: album.cor }}>
                {album.nomeDisplay}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Fechar
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center text-gray-600">Atualizando...</div>
        )}
      </div>
    </div>
  );
};
