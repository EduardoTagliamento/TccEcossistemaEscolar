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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-white/25 bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Figurinha {figurinha.codigo}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1 text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {figurinha.selecao && (
          <p className="mb-4 text-slate-600">
            <strong>{figurinha.selecao}</strong> - {figurinha.grupo}
          </p>
        )}

        {erro && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-rose-700">
            {erro}
          </div>
        )}

        <div className="space-y-3">
          {albuns.map((album) => (
            <label
              key={album.id}
              className="flex cursor-pointer items-center rounded-2xl border p-4 transition hover:bg-slate-50"
              style={{ borderColor: album.cor }}
            >
              <input
                type="checkbox"
                checked={statusTemp[album.id] || false}
                onChange={() => handlePedirConfirmacao(album.id)}
                disabled={loading}
                className="mr-3 h-5 w-5"
              />
              <span className="text-2xl mr-2">{album.icone}</span>
              <span className="font-bold" style={{ color: album.cor }}>
                {album.nomeDisplay}
              </span>
            </label>
          ))}
        </div>

        {albumPendente !== null && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Digite a senha para confirmar a alteracao</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Senha"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                disabled={loading}
              />
              <button
                onClick={handleConfirmarAlteracao}
                disabled={loading}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
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
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Fechar
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center font-semibold text-slate-600">Atualizando...</div>
        )}
      </div>
    </div>
  );
};
