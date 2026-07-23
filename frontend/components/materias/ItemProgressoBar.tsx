'use client';

import { Icon } from '@/components/Icon';
import styles from './ItemProgressoBar.module.css';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';

interface ItemProgressoBarProps {
  estado: ItemCategoria['Estado'];
  percentual: number | null;
}

export default function ItemProgressoBar({ estado, percentual }: ItemProgressoBarProps) {
  if (estado === 'atrasado') {
    return (
      <div className={styles.container}>
        <div className={styles.barra}>
          <div className={styles.preenchimento} style={{ width: '100%', backgroundColor: '#E5484D' }} />
        </div>
        <Icon name="lock" size={14} color="#E5484D" />
      </div>
    );
  }

  if (estado === 'aguardando_avaliacao') {
    return (
      <div className={styles.container}>
        <div className={styles.barra}>
          <div className={styles.preenchimento} style={{ width: '100%', backgroundColor: '#F5A524' }} />
        </div>
      </div>
    );
  }

  if (estado === 'avaliado') {
    const verde = percentual ?? 0;
    return (
      <div className={styles.container}>
        <div className={styles.barra}>
          <div className={styles.preenchimento} style={{ width: `${verde}%`, backgroundColor: '#17C077' }} />
          <div className={styles.preenchimentoResto} style={{ width: `${100 - verde}%`, backgroundColor: '#E5484D' }} />
        </div>
      </div>
    );
  }

  if (estado === 'concluido') {
    return (
      <div className={styles.container}>
        <div className={styles.barra}>
          <div className={styles.preenchimento} style={{ width: '100%', backgroundColor: '#17C077' }} />
        </div>
      </div>
    );
  }

  if (estado === 'parcial') {
    const valor = percentual ?? 0;
    return (
      <div className={styles.container}>
        <div className={styles.barra}>
          <div className={styles.preenchimento} style={{ width: `${valor}%`, backgroundColor: '#17C077' }} />
        </div>
      </div>
    );
  }

  // sem_progresso
  return (
    <div className={styles.container}>
      <div className={styles.barra} />
    </div>
  );
}
