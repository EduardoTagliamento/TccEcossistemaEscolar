'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { FiPlus, FiLogOut } from 'react-icons/fi';
import styles from './page.module.css';

interface Funcao {
  EscolaxUsuarioxFuncaoId: number;
  FuncaoId: number;
  FuncaoNome: string;
  DataInicio: string;
  DataFim: string | null;
  Status: 'Ativa' | 'Inativa';
}

interface Escola {
  EscolaGUID: string;
  EscolaNome: string;
  EscolaEmail: string;
  EscolaCor1: string | null;
  EscolaCor2: string | null;
  EscolaCor3: string | null;
  EscolaCor4: string | null;
  EscolaLogo: string | null;
}

interface EscolaComFuncoes {
  escola: Escola;
  funcoes: Funcao[];
}

export default function SelecionarEscolaPage() {
  const router = useRouter();
  const { usuario, token, isLoading: authLoading, logout } = useAuth();

  const [escolas, setEscolas] = useState<EscolaComFuncoes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }

    if (usuario) {
      buscarEscolas();
    }
  }, [usuario, authLoading]);

  const buscarEscolas = async () => {
    if (!usuario) return;

    try {
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar escolas');
      }

      setEscolas(data.data.escolas || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar suas escolas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      router.push('/login');
    }
  };

  const selecionarEscola = (escolaGUID: string) => {
    // Salvar escola selecionada no localStorage
    localStorage.setItem('@baua:escolaSelecionada', escolaGUID);
    
    // Redirecionar para dashboard
    router.push(`/dashboard/${escolaGUID}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando suas escolas...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {usuario?.UsuarioNome?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <h2>{usuario?.UsuarioNome} {usuario?.UsuarioSobrenome}</h2>
              <p>{usuario?.UsuarioEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <FiLogOut /> Sair
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h1>Minhas Escolas</h1>
          <p>Selecione uma escola para acessar o dashboard</p>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.escolasGrid}>
          {/* Card para criar nova escola */}
          <Link href="/criar-escola" className={styles.criarEscolaCard}>
            <div className={styles.iconWrapper}>
              <FiPlus />
            </div>
            <h3>Criar Nova Escola</h3>
            <p>Configure uma nova instituição de ensino</p>
          </Link>

          {/* Cards das escolas existentes */}
          {escolas.map((item) => (
            <button
              key={item.escola.EscolaGUID}
              className={styles.escolaCard}
              onClick={() => selecionarEscola(item.escola.EscolaGUID)}
              style={{
                borderColor: item.escola.EscolaCor1 || 'var(--color-primary)',
              }}
            >
              {item.escola.EscolaLogo ? (
                <div className={styles.logoWrapper}>
                  <img
                    src={`/uploads/logos/${item.escola.EscolaLogo}`}
                    alt={`Logo ${item.escola.EscolaNome}`}
                    className={styles.escolaLogo}
                  />
                </div>
              ) : (
                <div 
                  className={styles.escolaIcon}
                  style={{
                    backgroundColor: item.escola.EscolaCor1 || 'var(--color-primary)',
                    color: item.escola.EscolaCor2 || '#FFFFFF',
                  }}
                >
                  {item.escola.EscolaNome.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className={styles.escolaInfo}>
                <h3>{item.escola.EscolaNome}</h3>
                <p className={styles.escolaEmail}>{item.escola.EscolaEmail}</p>
                
                {item.funcoes.length > 0 && (
                  <div className={styles.funcoes}>
                    {item.funcoes.map((funcao) => (
                      <span key={funcao.EscolaxUsuarioxFuncaoId} className={styles.funcaoBadge}>
                        {funcao.FuncaoNome}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Paleta de cores */}
              {(item.escola.EscolaCor1 || item.escola.EscolaCor2 || 
                item.escola.EscolaCor3 || item.escola.EscolaCor4) && (
                <div className={styles.corePalette}>
                  {item.escola.EscolaCor1 && (
                    <div 
                      className={styles.colorDot}
                      style={{ backgroundColor: item.escola.EscolaCor1 }}
                      title={item.escola.EscolaCor1}
                    />
                  )}
                  {item.escola.EscolaCor2 && (
                    <div 
                      className={styles.colorDot}
                      style={{ backgroundColor: item.escola.EscolaCor2 }}
                      title={item.escola.EscolaCor2}
                    />
                  )}
                  {item.escola.EscolaCor3 && (
                    <div 
                      className={styles.colorDot}
                      style={{ backgroundColor: item.escola.EscolaCor3 }}
                      title={item.escola.EscolaCor3}
                    />
                  )}
                  {item.escola.EscolaCor4 && (
                    <div 
                      className={styles.colorDot}
                      style={{ backgroundColor: item.escola.EscolaCor4 }}
                      title={item.escola.EscolaCor4}
                    />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {escolas.length === 0 && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏫</div>
            <h2>Você ainda não está vinculado a nenhuma escola</h2>
            <p>Crie sua primeira escola para começar a usar o Bauá</p>
            <Link href="/criar-escola" className={styles.criarEscolaButton}>
              <FiPlus /> Criar Primeira Escola
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
