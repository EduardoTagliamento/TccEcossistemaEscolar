"use client";

/**
 * Layout para as páginas da Copa do Mundo
 */

import React from "react";
import Link from "next/link";

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="copa-layout copa-bg">
      <div className="copa-overlay">
        <div className="copa-glow copa-glow-1" />
        <div className="copa-glow copa-glow-2" />
        <div className="copa-grid" />
      </div>

      <nav className="copa-nav">
        <div className="copa-nav-inner">
          <Link href="/album" className="copa-brand">
            <div className="copa-brand-icon">
              🏆
            </div>
            <div>
              <p className="copa-brand-kicker">Copa 2026</p>
              <h1 className="copa-brand-title">Album de Figurinhas</h1>
            </div>
          </Link>

          <Link
            href="/"
            className="copa-back-link"
          >
            Voltar ao Sistema Escolar
          </Link>
        </div>
      </nav>

      <main className="copa-main">{children}</main>

      <footer className="copa-footer">
        <div className="copa-footer-inner">
          <p className="copa-footer-title">Sistema de Album da Copa com 994 figurinhas</p>
          <p className="copa-footer-site">baua.com.br/album</p>
        </div>
      </footer>
    </div>
  );
}
