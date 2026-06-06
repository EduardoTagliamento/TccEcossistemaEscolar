"use client";

/**
 * Layout para as páginas da Copa do Mundo
 */

import React from "react";
import Link from "next/link";

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-green-700 to-yellow-600">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/album" className="flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              <h1 className="text-2xl font-bold text-green-700">
                Copa do Mundo 2026 - Álbum de Figurinhas
              </h1>
            </Link>
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
            >
              ← Voltar ao Sistema Escolar
            </Link>
          </div>
        </div>
      </nav>
      <main className="py-8">{children}</main>
      <footer className="bg-white mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>Sistema de Gerenciamento de Álbum da Copa - 994 Figurinhas</p>
          <p className="text-sm mt-1">www.baua.com.br/album</p>
        </div>
      </footer>
    </div>
  );
}
