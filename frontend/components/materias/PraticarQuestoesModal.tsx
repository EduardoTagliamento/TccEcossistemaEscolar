'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import styles from './PraticarQuestoesModal.module.css';

interface Props {
  subMateriaGlobalGUID: string;
  onFechar: () => void;
}

/**
 * Modal de prática (spec item 11-12) — busca filtrada direta no banco de
 * questões universal, sem chamada de LLM. Só pra treino: mostra a
 * alternativa correta ao clicar, sem submissão/nota (fora de escopo).
 */
export default function PraticarQuestoesModal({ subMateriaGlobalGUID, onFechar }: Props) {
  const [questoes, setQuestoes] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [vestibulares, setVestibulares] = useState<QuestaoBancoAPI.Vestibular[]>([]);
  const [dificuldade, setDificuldade] = useState<QuestaoBancoAPI.QuestaoBancoDificuldade | ''>('');
  const [vestibularGUID, setVestibularGUID] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [revelada, setRevelada] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    QuestaoBancoAPI.listarVestibulares()
      .then(setVestibulares)
      .catch((err: any) => setErro(err?.message || 'Falha ao carregar lista de vestibulares'));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    QuestaoBancoAPI.listarQuestoes({
      SubMateriaGlobalGUID: subMateriaGlobalGUID,
      Dificuldade: dificuldade || undefined,
      VestibularGUID: vestibularGUID || undefined,
    })
      .then(setQuestoes)
      .catch((err: any) => {
        setQuestoes([]);
        setErro(err?.message || 'Falha ao carregar questões');
      })
      .finally(() => setCarregando(false));
  }, [subMateriaGlobalGUID, dificuldade, vestibularGUID]);

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2><Icon name="edit" size={18} /> Praticar</h2>
          <button type="button" className={styles.fechar} onClick={onFechar}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.filtros}>
          <select value={dificuldade} onChange={(e) => setDificuldade(e.target.value as QuestaoBancoAPI.QuestaoBancoDificuldade | '')}>
            <option value="">Qualquer dificuldade</option>
            <option value="Facil">Fácil</option>
            <option value="Media">Média</option>
            <option value="Dificil">Difícil</option>
          </select>
          <select value={vestibularGUID} onChange={(e) => setVestibularGUID(e.target.value)}>
            <option value="">Qualquer vestibular</option>
            {vestibulares.map((v) => (
              <option key={v.VestibularGUID} value={v.VestibularGUID}>
                {v.Nome}
              </option>
            ))}
          </select>
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        {carregando ? (
          <p className={styles.hint}>Carregando questões...</p>
        ) : questoes.length === 0 ? (
          <p className={styles.hint}>Nenhuma questão encontrada com esses filtros.</p>
        ) : (
          <div className={styles.lista}>
            {questoes.map((q) => (
              <div key={q.QuestaoBancoGUID} className={styles.questao}>
                <span className={styles.badgeDificuldade}>{q.Dificuldade}</span>
                <p className={styles.enunciado}>{q.Enunciado}</p>
                <div className={styles.alternativas}>
                  {q.Alternativas.map((a) => (
                    <div
                      key={a.AlternativaGUID}
                      className={`${styles.alternativa} ${
                        revelada[q.QuestaoBancoGUID] && a.AlternativaCorreta ? styles.alternativaCorreta : ''
                      }`}
                    >
                      {a.AlternativaTexto}
                    </div>
                  ))}
                </div>
                {!revelada[q.QuestaoBancoGUID] ? (
                  <button
                    type="button"
                    className={styles.botaoRevelar}
                    onClick={() => setRevelada((prev) => ({ ...prev, [q.QuestaoBancoGUID]: true }))}
                  >
                    Ver resposta
                  </button>
                ) : (
                  q.VideoResolucaoUrl && (
                    <a href={q.VideoResolucaoUrl} target="_blank" rel="noopener noreferrer" className={styles.linkResolucao}>
                      Ver vídeo de resolução
                    </a>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
