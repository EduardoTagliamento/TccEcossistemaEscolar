'use client';

import { useParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Loader from '@/components/Loader';

import * as EscolaConfiguracaoAPI from '@/lib/api/escolaconfiguracao.api';
import { DiaSemana, DIA_SEMANA_LABEL, SlotAula, SlotsPorDia } from '@/lib/api/escolaconfiguracao.api';
import * as HorarioTurmaAPI from '@/lib/api/horarioturma.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import { useCronograma } from '@/lib/horarioturma/useHorarioTurmaQueries';
import { useAlocarSlot, useRemoverSlot } from '@/lib/horarioturma/useHorarioTurmaMutations';
import { Icon } from '@/components/Icon';

type Turno = 'Manha' | 'Tarde';

interface DragPayload {
  tipo: 'banco' | 'slot';
  MatProfTurGUID: string;
  HorarioTurmaGUID?: string;
}

export default function CronogramaTurmaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const turmaGUID = (params?.turmaGUID as string) || '';

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [turma, setTurma] = useState<TurmaAPI.Turma | null>(null);
  const [config, setConfig] = useState<EscolaConfiguracaoAPI.EscolaConfiguracao | null>(null);
  const [slotsPorDia, setSlotsPorDia] = useState<SlotsPorDia[]>([]);
  const [celulaSobre, setCelulaSobre] = useState<string | null>(null);
  const [bancoSobre, setBancoSobre] = useState(false);
  const [mostrarManha, setMostrarManha] = useState(true);
  const [mostrarTarde, setMostrarTarde] = useState(true);
  const [bancoFixado, setBancoFixado] = useState(true);

  const cronogramaQuery = useCronograma(turmaGUID, !!config?.Configurada);
  const cronograma = cronogramaQuery.data ?? null;
  const alocarSlotMutation = useAlocarSlot(turmaGUID);
  const removerSlotMutation = useRemoverSlot(turmaGUID);

  useEffect(() => {
    if (escolaGUID && turmaGUID) {
      carregarTudo();
    }
  }, [escolaGUID, turmaGUID]);

  const carregarTudo = async () => {
    try {
      setCarregando(true);
      setErro('');

      const [turmaResp, configResp] = await Promise.all([
        TurmaAPI.buscarTurma(turmaGUID),
        EscolaConfiguracaoAPI.obterConfiguracao(escolaGUID),
      ]);
      setTurma(turmaResp);
      setConfig(configResp);

      if (configResp.Configurada) {
        const slotsResp = await EscolaConfiguracaoAPI.obterSlots(escolaGUID);
        setSlotsPorDia(slotsResp);
      }
    } catch (err: any) {
      console.error('Erro ao carregar cronograma:', err);
      setErro(err.message || 'Erro ao carregar cronograma da turma');
    } finally {
      setCarregando(false);
    }
  };

  const linhasPorTurno = useMemo(() => {
    const construir = (turno: Turno): SlotAula[] => {
      const mapa = new Map<string, SlotAula>();
      slotsPorDia.forEach((dia) => {
        dia[turno].forEach((slot) => {
          mapa.set(`${slot.HoraInicio}-${slot.HoraFim}`, slot);
        });
      });
      return Array.from(mapa.values()).sort((a, b) => a.HoraInicio.localeCompare(b.HoraInicio));
    };

    return {
      Manha: construir('Manha'),
      Tarde: construir('Tarde'),
    };
  }, [slotsPorDia]);

  const diaTemSlot = (dia: DiaSemana, turno: Turno, slot: SlotAula): boolean => {
    const doDia = slotsPorDia.find((d) => d.DiaSemana === dia);
    return !!doDia?.[turno].some((s) => s.HoraInicio === slot.HoraInicio && s.HoraFim === slot.HoraFim);
  };

  const slotAlocado = (dia: DiaSemana, horaInicio: string): HorarioTurmaAPI.HorarioTurma | undefined => {
    return cronograma?.Slots.find((s) => s.DiaSemana === dia && s.HoraInicio === horaInicio);
  };

  const handleDragStartBanco = (e: React.DragEvent, matProfTurGUID: string) => {
    const payload: DragPayload = { tipo: 'banco', MatProfTurGUID: matProfTurGUID };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const handleDragStartSlot = (e: React.DragEvent, slot: HorarioTurmaAPI.HorarioTurma) => {
    const payload: DragPayload = {
      tipo: 'slot',
      MatProfTurGUID: slot.MatProfTurGUID,
      HorarioTurmaGUID: slot.HorarioTurmaGUID,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const handleDropCelula = async (e: React.DragEvent, dia: DiaSemana, slot: SlotAula) => {
    e.preventDefault();
    setCelulaSobre(null);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload: DragPayload = JSON.parse(raw);

    // Slot de origem (se a peça arrastada já estava alocada em algum
    // horário) — guardado ANTES de mexer em qualquer coisa, pra poder
    // devolver a matéria pro mesmo lugar se a nova alocação falhar (ex:
    // conflito de professor), em vez de deixá-la solta no banco.
    const slotOrigem =
      payload.tipo === 'slot' && payload.HorarioTurmaGUID
        ? cronograma?.Slots.find((s) => s.HorarioTurmaGUID === payload.HorarioTurmaGUID)
        : undefined;

    // Ao mover uma peça já alocada, o slot antigo é liberado ANTES de tentar
    // alocar o novo — senão a contagem de aulas/semana ainda inclui a alocação
    // antiga e bloqueia o próprio reposicionamento com "limite atingido".
    try {
      if (payload.tipo === 'slot' && payload.HorarioTurmaGUID) {
        await removerSlotMutation.mutateAsync(payload.HorarioTurmaGUID);
      }

      await alocarSlotMutation.mutateAsync({
        MatProfTurGUID: payload.MatProfTurGUID,
        DiaSemana: dia,
        HoraInicio: slot.HoraInicio,
        HoraFim: slot.HoraFim,
      });
    } catch (err: any) {
      alert(err.message || 'Não foi possível alocar neste horário');

      // A nova alocação falhou — se o slot antigo já tinha sido liberado
      // acima, devolve a matéria pro horário original em vez de deixá-la
      // parada no banco (só quem estava arrastando decidiu tirá-la dali).
      if (slotOrigem) {
        try {
          await alocarSlotMutation.mutateAsync({
            MatProfTurGUID: slotOrigem.MatProfTurGUID,
            DiaSemana: slotOrigem.DiaSemana,
            HoraInicio: slotOrigem.HoraInicio,
            HoraFim: slotOrigem.HoraFim,
          });
        } catch (erroRestauracao: any) {
          alert(erroRestauracao.message || 'Não foi possível devolver a matéria ao horário original');
        }
      }

      await cronogramaQuery.refetch();
    }
  };

  const handleDropBanco = async (e: React.DragEvent) => {
    e.preventDefault();
    setBancoSobre(false);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload: DragPayload = JSON.parse(raw);

    if (payload.tipo === 'slot' && payload.HorarioTurmaGUID) {
      try {
        await removerSlotMutation.mutateAsync(payload.HorarioTurmaGUID);
      } catch (err: any) {
        alert(err.message || 'Não foi possível remover este horário');
      }
    }
  };

  const handleRemoverSlot = async (horarioTurmaGUID: string) => {
    try {
      await removerSlotMutation.mutateAsync(horarioTurmaGUID);
    } catch (err: any) {
      alert(err.message || 'Não foi possível remover este horário');
    }
  };

  const renderTurno = (turno: Turno, titulo: string) => {
    const linhas = linhasPorTurno[turno];
    if (linhas.length === 0 || !config) return null;

    return (
      <div className={styles.turnoSecao}>
        <h2 className={styles.turnoTitulo}>{titulo}</h2>
        <div
          className={styles.grade}
          style={{ gridTemplateColumns: `120px repeat(${config.DiasSemana.length}, 1fr)` }}
        >
          <div className={styles.gradeHeaderCanto} />
          {config.DiasSemana.map((dia) => (
            <div key={dia} className={styles.gradeHeaderDia}>
              {DIA_SEMANA_LABEL[dia]}
            </div>
          ))}

          {linhas.map((slot) => (
            <Fragment key={slot.HoraInicio}>
              <div className={styles.gradeHorario}>
                {slot.HoraInicio}–{slot.HoraFim}
              </div>
              {config.DiasSemana.map((dia) => {
                const disponivel = diaTemSlot(dia, turno, slot);
                if (!disponivel) {
                  return (
                    <div
                      key={`${dia}-${slot.HoraInicio}`}
                      className={`${styles.celula} ${styles.celulaIndisponivel}`}
                    />
                  );
                }

                const alocado = slotAlocado(dia, slot.HoraInicio);
                const chaveCelula = `${dia}-${slot.HoraInicio}`;

                return (
                  <div
                    key={chaveCelula}
                    className={`${styles.celula} ${!alocado ? styles.celulaVazia : ''} ${
                      celulaSobre === chaveCelula ? styles.arrastandoSobre : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCelulaSobre(chaveCelula);
                    }}
                    onDragLeave={() => setCelulaSobre((atual) => (atual === chaveCelula ? null : atual))}
                    onDrop={(e) => handleDropCelula(e, dia, slot)}
                  >
                    {alocado && (
                      <div
                        className={styles.chip}
                        draggable
                        onDragStart={(e) => handleDragStartSlot(e, alocado)}
                      >
                        <button
                          className={styles.chipRemover}
                          onClick={() => handleRemoverSlot(alocado.HorarioTurmaGUID)}
                          title="Remover (volta para o banco)"
                        >
                          ×
                        </button>
                        <span className={styles.chipMateria}>{alocado.MateriaNome}</span>
                        <span className={styles.chipProfessor}>{alocado.UsuarioNome}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  if (carregando || (config?.Configurada && cronogramaQuery.isLoading)) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
        <p>Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Icon name="calendar" size={22} /> Cronograma {turma ? `— ${turma.TurmaSerie} ${turma.TurmaNome}` : ''}
          </h1>
          <p className={styles.subtitulo}>
            Arraste as matérias do banco para um horário da grade. Arraste de volta para remover.
          </p>
        </div>
        <Link href={`/dashboard/${escolaGUID}/gestao-dados/turmas`} className={styles.botaoVoltar}>
          ← Voltar
        </Link>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {config && !config.Configurada && (
        <div className={styles.aviso}>
          Esta escola ainda não tem configuração de horário letivo.{' '}
          <Link href={`/dashboard/${escolaGUID}/configuracoes`} className={styles.link}>
            Configure os horários da escola
          </Link>{' '}
          antes de montar o cronograma da turma.
        </div>
      )}

      {config?.Configurada && (
        <>
          {(linhasPorTurno.Manha.length > 0 || linhasPorTurno.Tarde.length > 0) && (
            <div className={styles.toggleTurnos}>
              {linhasPorTurno.Manha.length > 0 && (
                <label className={styles.toggleItem}>
                  <input
                    type="checkbox"
                    checked={mostrarManha}
                    onChange={(e) => setMostrarManha(e.target.checked)}
                  />
                  Mostrar manhã
                </label>
              )}
              {linhasPorTurno.Tarde.length > 0 && (
                <label className={styles.toggleItem}>
                  <input
                    type="checkbox"
                    checked={mostrarTarde}
                    onChange={(e) => setMostrarTarde(e.target.checked)}
                  />
                  Mostrar tarde
                </label>
              )}
            </div>
          )}

          {mostrarManha && renderTurno('Manha', 'Manhã')}
          {mostrarTarde && renderTurno('Tarde', 'Tarde')}

          <div
            className={`${styles.bancoSecao} ${bancoFixado ? styles.bancoFixado : ''} ${bancoSobre ? styles.arrastandoSobre : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setBancoSobre(true);
            }}
            onDragLeave={() => setBancoSobre(false)}
            onDrop={handleDropBanco}
          >
            <div className={styles.bancoCabecalho}>
              <h2 className={styles.bancoTitulo}><Icon name="book-open" size={20} /> Banco de matérias</h2>
              <button
                type="button"
                className={styles.botaoFixarBanco}
                onClick={() => setBancoFixado((atual) => !atual)}
                title={bancoFixado ? 'Desafixar (o banco volta a rolar com a página)' : 'Fixar (o banco acompanha a tela ao rolar)'}
              >
                📌 {bancoFixado ? 'Fixado' : 'Fixar'}
              </button>
            </div>
            {!cronograma || cronograma.Banco.length === 0 ? (
              <p className={styles.bancoVazio}>
                Nenhuma matéria alocada a esta turma ainda. Associe matérias e professores na tela de
                Professores.
              </p>
            ) : (
              <div className={styles.bancoLista}>
                {cronograma.Banco.map((item) => {
                  if (item.AulasPorSemana === null) {
                    return (
                      <div key={item.MatProfTurGUID} className={`${styles.bancoChip} ${styles.bancoChipDesabilitado}`}>
                        <span className={styles.bancoChipMateria}>{item.MateriaNome}</span>
                        <span className={styles.bancoChipInfo}>{item.UsuarioNome}</span>
                        <span className={styles.bancoChipInfo}>Defina aulas/semana para liberar</span>
                      </div>
                    );
                  }

                  const completo = item.AulasRestantes === 0;
                  return (
                    <div
                      key={item.MatProfTurGUID}
                      className={`${styles.bancoChip} ${completo ? styles.bancoChipCompleto : ''}`}
                      draggable={!completo}
                      onDragStart={(e) => !completo && handleDragStartBanco(e, item.MatProfTurGUID)}
                      title={completo ? 'Todas as aulas semanais já foram alocadas' : 'Arraste para um horário'}
                    >
                      <span className={styles.bancoChipMateria}>{item.MateriaNome}</span>
                      <span className={styles.bancoChipInfo}>{item.UsuarioNome}</span>
                      <span className={styles.bancoChipInfo}>
                        {item.AulasAlocadas}/{item.AulasPorSemana} aulas alocadas
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
