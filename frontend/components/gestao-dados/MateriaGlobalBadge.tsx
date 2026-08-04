'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import * as MateriaAPI from '@/lib/api/materia.api';
import styles from './MateriaGlobalBadge.module.css';

interface Props {
  materiaGUID: string;
}

/**
 * Mostra o resultado do mapeamento self-service `Materia → MateriaGlobal`
 * (spec item 15/16) — resolvido automaticamente no backend; este componente
 * só expõe o estado e, quando ambíguo, a listbox de candidatos pro gestor
 * confirmar (spec §6).
 */
export default function MateriaGlobalBadge({ materiaGUID }: Props) {
  const [status, setStatus] = useState<MateriaAPI.MapeamentoGlobalStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [resolvendo, setResolvendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    MateriaAPI.buscarMapeamentoGlobal(materiaGUID)
      .then((s) => {
        if (ativo) setStatus(s);
      })
      .catch(() => {
        if (ativo) setStatus(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [materiaGUID]);

  const handleEscolher = async (materiaGlobalGUID: string | null) => {
    try {
      setSalvando(true);
      await MateriaAPI.confirmarMapeamentoGlobal(materiaGUID, materiaGlobalGUID);
      const atualizado = await MateriaAPI.buscarMapeamentoGlobal(materiaGUID);
      setStatus(atualizado);
      setResolvendo(false);
    } catch (erro: any) {
      alert(erro.message || 'Erro ao confirmar mapeamento de matéria global');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <span className={styles.textoSecundario}>...</span>;
  }

  if (!status) {
    return <span className={styles.textoSecundario}>—</span>;
  }

  if (status.StatusMapeamento === 'Confirmado') {
    return (
      <span className={styles.badgeConfirmado} title="Mapeada pra taxonomia global da plataforma">
        <Icon name="check" size={12} /> {status.NomeMateriaGlobal}
      </span>
    );
  }

  if (status.StatusMapeamento === 'Pendente') {
    return (
      <span className={styles.badgePendente} title="Aguardando revisão da plataforma (não bloqueia o uso normal)">
        <Icon name="clock" size={12} /> {status.NomeMateriaGlobal}
      </span>
    );
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.botaoResolver} onClick={() => setResolvendo((v) => !v)}>
        <Icon name="help-circle" size={12} /> Escolher matéria global
      </button>
      {resolvendo && (
        <div className={styles.dropdown}>
          {(status.Candidatos ?? []).map((candidato) => (
            <button
              key={candidato.MateriaGlobalGUID}
              type="button"
              disabled={salvando}
              className={styles.opcaoCandidato}
              onClick={() => handleEscolher(candidato.MateriaGlobalGUID)}
            >
              {candidato.Nome} <span className={styles.score}>{Math.round(candidato.Score * 100)}%</span>
            </button>
          ))}
          <button type="button" disabled={salvando} className={styles.opcaoNova} onClick={() => handleEscolher(null)}>
            Nenhuma dessas — criar nova
          </button>
        </div>
      )}
    </div>
  );
}
