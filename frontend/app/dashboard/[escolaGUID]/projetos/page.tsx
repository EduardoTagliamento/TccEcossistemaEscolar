'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { listarProjetos } from '@/lib/api/projeto.api';
import { Projeto } from '@/types/projeto';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const FUNCOES_CRIACAO = [3, 6]; // Professor, Direção

export default function ProjetosPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [podeCriar, setPodeCriar] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarProjetos();
      void verificarPermissaoCriacao();
    }
  }, [usuario, authLoading]);

  const carregarProjetos = async () => {
    setLoading(true);
    setErro(null);
    try {
      const dados = await listarProjetos(escolaGUID);
      dados.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
      setProjetos(dados);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const verificarPermissaoCriacao = async () => {
    if (!usuario) return;
    try {
      const response = await fetch(`${API_URL}/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) return;

      const escolas: Array<{ escola: { EscolaGUID: string }; funcoes: Array<{ FuncaoId: number; Status: string }> }> =
        data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((f) => f.Status === 'Ativo')
        .map((f) => f.FuncaoId);

      setPodeCriar(funcoesAtivas.some((f) => FUNCOES_CRIACAO.includes(f)));
    } catch {
      setPodeCriar(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando projetos...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🚀 Projetos</h1>
        <div className={styles.headerActions}>
          {podeCriar && (
            <Link href={`/dashboard/${escolaGUID}/crud-projeto`} className={styles.criarBtn}>
              + Criar Projeto
            </Link>
          )}
          <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>
            ← Voltar ao Dashboard
          </Link>
        </div>
      </header>

      {erro && <p className={styles.error}>{erro}</p>}

      {projetos.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhum projeto disponível no momento.</p>
        </div>
      ) : (
        <div className={styles.projetosGrid}>
          {projetos.map((projeto) => {
            const prazo = new Date(projeto.ProjetoInscricaoPrazoData);
            const encerrado = projeto.ProjetoStatus === 'Encerrado';

            return (
              <Link
                key={projeto.ProjetoGUID}
                href={`/dashboard/${escolaGUID}/projetos/${projeto.ProjetoGUID}`}
                className={`${styles.projetoCard} ${encerrado ? styles.cardEncerrado : ''}`}
              >
                <div className={styles.cardHeader}>
                  <h3>{projeto.ProjetoTitulo}</h3>
                  <span className={`${styles.statusBadge} ${encerrado ? styles.statusEncerrado : styles.statusAberto}`}>
                    {projeto.ProjetoStatus}
                  </span>
                </div>
                <p className={styles.descricao}>
                  {projeto.ProjetoDescricao.substring(0, 150)}
                  {projeto.ProjetoDescricao.length > 150 ? '...' : ''}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.publico}>
                    {projeto.ProjetoPublicoAlvo === 'Escola' ? '🏫 Escola inteira' : '👥 Turmas específicas'}
                  </span>
                  <span className={styles.prazo}>
                    📅 Inscrições até {prazo.toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
