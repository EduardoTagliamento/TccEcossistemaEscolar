'use client';

import Link from 'next/link';
import styles from './MateriaTurmaCard.module.css';

interface MateriaTurmaCardProps {
  href: string;
  titulo: string;
  subtitulo?: string;
  imagemUrl?: string | null;
  corFundo?: string | null;
  temPendencia?: boolean;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export default function MateriaTurmaCard({ href, titulo, subtitulo, imagemUrl, corFundo, temPendencia }: MateriaTurmaCardProps) {
  const cor = corFundo || '#17C077';

  return (
    <Link href={href} className={styles.card}>
      {temPendencia && <span className={styles.pendenciaIndicador} title="Tem pendência" />}
      <div
        className={styles.capa}
        style={imagemUrl ? { backgroundImage: `url(${imagemUrl})` } : { backgroundColor: cor }}
      >
        {!imagemUrl && <span className={styles.capaLabel}>{titulo}</span>}
      </div>
      <div className={styles.faixa} style={{ backgroundColor: cor }}>
        <div className={styles.textos}>
          <span className={styles.titulo}>{titulo}</span>
          {subtitulo && <span className={styles.subtitulo}>{subtitulo}</span>}
        </div>
        {subtitulo && <span className={styles.avatar}>{iniciais(subtitulo)}</span>}
      </div>
    </Link>
  );
}
