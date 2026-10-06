'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import * as MateriaAPI from '@/lib/api/materia.api';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import styles from './MateriaGlobalBadge.module.css';

interface Props {
  materiaGUID: string;
}

/**
 * Mostra o resultado do mapeamento self-service `Materia → MateriaGlobal`
 * (spec item 15/16) — resolvido automaticamente no backend; este componente
 * só expõe o estado e, quando ambíguo, a listbox de candidatos pro gestor
 * confirmar (spec §6).
 *
 * Também mostra e gerencia vínculos ADICIONAIS (N:N, migration 2026-10-06) —
 * caso de uma matéria de escola cobrir mais de 1 matéria global ao mesmo
 * tempo (ex. "Filosofia/Sociologia" como 1 aula só). O vínculo primário
 * (acima) nunca é removido por aqui — só adicionado/removido o que for além dele.
 */
export default function MateriaGlobalBadge({ materiaGUID }: Props) {
  const [status, setStatus] = useState<MateriaAPI.MapeamentoGlobalStatus | null>(null);
  const [vinculos, setVinculos] = useState<MateriaAPI.MateriaGlobalVinculada[]>([]);
  const [opcoes, setOpcoes] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [resolvendo, setResolvendo] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    return Promise.all([MateriaAPI.buscarMapeamentoGlobal(materiaGUID), MateriaAPI.listarMateriasGlobaisVinculadas(materiaGUID)]);
  };

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    carregar()
      .then(([s, v]) => {
        if (ativo) {
          setStatus(s);
          setVinculos(v);
        }
      })
      .catch(() => {
        if (ativo) {
          setStatus(null);
          setVinculos([]);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaGUID]);

  const handleEscolher = async (materiaGlobalGUID: string | null) => {
    try {
      setSalvando(true);
      await MateriaAPI.confirmarMapeamentoGlobal(materiaGUID, materiaGlobalGUID);
      const [s, v] = await carregar();
      setStatus(s);
      setVinculos(v);
      setResolvendo(false);
    } catch (erro: any) {
      alert(erro.message || 'Erro ao confirmar mapeamento de matéria global');
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirAdicionar = async () => {
    if (!adicionando && opcoes.length === 0) {
      try {
        setOpcoes(await MateriaGlobalAPI.listarMateriasGlobais('Confirmado'));
      } catch (erro: any) {
        alert(erro.message || 'Erro ao carregar matérias globais');
        return;
      }
    }
    setAdicionando((v) => !v);
  };

  const handleAdicionar = async (materiaGlobalGUID: string) => {
    try {
      setSalvando(true);
      setVinculos(await MateriaAPI.adicionarMateriaGlobalVinculada(materiaGUID, materiaGlobalGUID));
      setAdicionando(false);
    } catch (erro: any) {
      alert(erro.message || 'Erro ao adicionar vínculo de matéria global');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (materiaGlobalGUID: string) => {
    try {
      setSalvando(true);
      setVinculos(await MateriaAPI.removerMateriaGlobalVinculada(materiaGUID, materiaGlobalGUID));
    } catch (erro: any) {
      alert(erro.message || 'Erro ao remover vínculo de matéria global');
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

  // Vínculos ALÉM do primário (a lista N:N é o superset; tira o primário pra não repetir o chip).
  const adicionais = vinculos.filter((v) => v.MateriaGlobalGUID !== status.MateriaGlobalGUID);

  if (status.StatusMapeamento === 'Confirmado' || status.StatusMapeamento === 'Pendente') {
    const Icone = status.StatusMapeamento === 'Confirmado' ? 'check' : 'clock';
    const classeBadge = status.StatusMapeamento === 'Confirmado' ? styles.badgeConfirmado : styles.badgePendente;
    const titulo =
      status.StatusMapeamento === 'Confirmado'
        ? 'Mapeada pra taxonomia global da plataforma'
        : 'Aguardando revisão da plataforma (não bloqueia o uso normal)';
    return (
      <div className={styles.wrapper}>
        <div className={styles.listaChips}>
          <span className={classeBadge} title={titulo}>
            <Icon name={Icone} size={12} /> {status.NomeMateriaGlobal}
          </span>
          {adicionais.map((v) => (
            <span key={v.MateriaGlobalGUID} className={styles.badgeAdicional} title="Vínculo adicional">
              {v.Nome}
              <button
                type="button"
                className={styles.botaoRemoverChip}
                disabled={salvando}
                onClick={() => handleRemover(v.MateriaGlobalGUID)}
                title="Remover este vínculo"
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" className={styles.botaoAdicionarChip} onClick={handleAbrirAdicionar} title="Adicionar outra matéria global">
            +
          </button>
        </div>
        {adicionando && (
          <div className={styles.dropdown}>
            {opcoes
              .filter((o) => !vinculos.some((v) => v.MateriaGlobalGUID === o.MateriaGlobalGUID))
              .map((opcao) => (
                <button
                  key={opcao.MateriaGlobalGUID}
                  type="button"
                  disabled={salvando}
                  className={styles.opcaoCandidato}
                  onClick={() => handleAdicionar(opcao.MateriaGlobalGUID)}
                >
                  {opcao.Nome}
                </button>
              ))}
          </div>
        )}
      </div>
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
