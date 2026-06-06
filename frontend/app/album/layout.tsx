"use client";

/**
 * Layout para as páginas da Copa do Mundo
 */

import React from "react";
import Link from "next/link";

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen copa-bg text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="copa-glow copa-glow-1" />
        <div className="copa-glow copa-glow-2" />
        <div className="copa-grid" />
      </div>

      <nav className="sticky top-0 z-40 border-b border-white/20 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/album" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
              🏆
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/85">Copa 2026</p>
              <h1 className="text-lg font-bold text-white sm:text-2xl">Album de Figurinhas</h1>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            Voltar ao Sistema Escolar
          </Link>
        </div>
      </nav>

      <main className="relative z-10 py-8 sm:py-10">{children}</main>

      <footer className="relative z-10 mt-10 border-t border-white/15 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-center text-sm text-slate-300 sm:px-6 lg:px-8">
          <p className="font-semibold text-slate-200">Sistema de Album da Copa com 994 figurinhas</p>
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/80">baua.com.br/album</p>
        </div>
      </footer>
    </div>
  );
}
