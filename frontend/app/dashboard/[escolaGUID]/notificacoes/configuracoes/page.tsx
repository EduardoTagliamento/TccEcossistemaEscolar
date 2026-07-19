'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { NotificacaoPreferencia } from '@/lib/api/notificacao.api';

export default function NotificacaoConfiguracoesPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [preferencias, setPreferencias] = useState<NotificacaoPreferencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const lista = await NotificacaoAPI.listarPreferencias();
      setPreferencias(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar preferências de notificação');
    } finally {
      setCarregando(false);
    }
  };

  const alternar = async (pref: NotificacaoPreferencia, canal: 'email' | 'whatsapp') => {
    const novoEmail = canal === 'email' ? !pref.PreferenciaEmailAtivo : pref.PreferenciaEmailAtivo;
    const novoWhatsapp = canal === 'whatsapp' ? !pref.PreferenciaWhatsappAtivo : pref.PreferenciaWhatsappAtivo;

    setSalvandoId(pref.NotificacaoTipoId);
    setErro('');
    try {
      const atualizada = await NotificacaoAPI.atualizarPreferencia(pref.NotificacaoTipoId, novoEmail, novoWhatsapp);
      setPreferencias((prev) =>
        prev.map((p) =>
          p.NotificacaoTipoId === pref.NotificacaoTipoId
            ? { ...p, PreferenciaEmailAtivo: atualizada.PreferenciaEmailAtivo, PreferenciaWhatsappAtivo: atualizada.PreferenciaWhatsappAtivo, Origem: 'usuario' }
            : p
        )
      );
    } catch (e: any) {
      setErro(e.message || 'Erro ao atualizar preferência');
    } finally {
      setSalvandoId(null);
    }
  };

  const avisos = preferencias.filter((p) => p.NotificacaoTipoCategoria === 'Aviso');
  const lembretes = preferencias.filter((p) => p.NotificacaoTipoCategoria === 'Lembrete');

  const renderLinha = (pref: NotificacaoPreferencia) => (
    <li key={pref.NotificacaoTipoId} className={styles.linha}>
      <span className={styles.linhaTitulo}>{pref.NotificacaoTipoDescricao}</span>
      <div className={styles.linhaControles}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={pref.PreferenciaEmailAtivo}
            disabled={salvandoId === pref.NotificacaoTipoId}
            onChange={() => alternar(pref, 'email')}
          />
          <span>E-mail</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={pref.PreferenciaWhatsappAtivo}
            disabled={salvandoId === pref.NotificacaoTipoId}
            onChange={() => alternar(pref, 'whatsapp')}
          />
          <span>WhatsApp</span>
        </label>
      </div>
    </li>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Preferências de notificação</h1>
          <p className={styles.subtitulo}>
            Escolha quais notificações você também quer receber por e-mail ou WhatsApp. Todas continuam aparecendo no sino de notificações.
          </p>
        </div>
        <Link href={`/dashboard/${escolaGUID}/notificacoes`} className={styles.botaoSecundario}>
          Voltar
        </Link>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {carregando ? (
        <div className={styles.estadoVazio}>Carregando...</div>
      ) : (
        <>
          {avisos.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Avisos</h2>
              <ul className={styles.lista}>{avisos.map(renderLinha)}</ul>
            </section>
          )}

          {lembretes.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Lembretes</h2>
              <ul className={styles.lista}>{lembretes.map(renderLinha)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
