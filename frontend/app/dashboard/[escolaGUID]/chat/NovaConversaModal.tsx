'use client';

import { useEffect, useMemo, useState } from 'react';
import * as ConversaAPI from '@/lib/api/conversa.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as AlunoAPI from '@/lib/api/aluno.api';
import * as ProfessorAPI from '@/lib/api/professor.api';
import { Icon } from './icons';
import Loader from '@/components/Loader';
import styles from './NovaConversaModal.module.css';

interface PessoaSelecionavel {
  UsuarioGUID: string;
  UsuarioNome: string;
  Papel: 'Aluno' | 'Professor';
}

interface NovaConversaModalProps {
  aberto: boolean;
  escolaGUID: string;
  meuGUID: string;
  onClose: () => void;
  onConversaIniciada: (conversaGUID: string) => void;
}

function obterIniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * Seletor de destinatário para iniciar uma conversa individual nova
 * (`POST /api/conversa/individual`). Reaproveita os clients já existentes
 * de Turma/Aluno/Professor (mesmos usados em gestao-dados) em vez de criar
 * um endpoint de busca de usuário dedicado.
 *
 * Nota: `AlunoAPI.listarAlunos` filtra corretamente por `TurmaGUID`, mas
 * ignora `EscolaGUID` no lado do backend (só `matricula?TurmaGUID=`) — por
 * isso buscamos as turmas da escola primeiro e agregamos os alunos por
 * turma, em vez de chamar `listarAlunos({ EscolaGUID })` diretamente (o que
 * traria alunos de outras escolas). `ProfessorAPI.listarProfessores` já
 * filtra por `EscolaGUID` corretamente.
 */
export default function NovaConversaModal({
  aberto,
  escolaGUID,
  meuGUID,
  onClose,
  onConversaIniciada,
}: NovaConversaModalProps) {
  const [pessoas, setPessoas] = useState<PessoaSelecionavel[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [iniciandoGUID, setIniciandoGUID] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    void carregarPessoas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, escolaGUID]);

  const carregarPessoas = async () => {
    setCarregando(true);
    setErro('');
    try {
      const { turmas } = await TurmaAPI.listarTurmas({ EscolaGUID: escolaGUID });

      const listasAlunos = await Promise.all(
        turmas.map((turma) =>
          AlunoAPI
            .listarAlunos({ TurmaGUID: turma.TurmaGUID, MatriculaStatus: 'Ativa' })
            .catch(() => ({ alunos: [], total: 0 }))
        )
      );
      const { professores } = await ProfessorAPI.listarProfessores({ EscolaGUID: escolaGUID });

      const vistos = new Set<string>();
      const lista: PessoaSelecionavel[] = [];

      // conversa_individual agora é endereçada por UsuarioGUID (tabela migrada) —
      // todo usuário autenticado tem GUID, diferente do CPF (opcional).
      listasAlunos.forEach(({ alunos }) => {
        alunos.forEach(({ usuario }) => {
          if (!usuario?.UsuarioGUID || vistos.has(usuario.UsuarioGUID) || usuario.UsuarioGUID === meuGUID) return;
          vistos.add(usuario.UsuarioGUID);
          lista.push({ UsuarioGUID: usuario.UsuarioGUID, UsuarioNome: usuario.UsuarioNome, Papel: 'Aluno' });
        });
      });

      professores.forEach((professor) => {
        if (!professor.UsuarioGUID || vistos.has(professor.UsuarioGUID) || professor.UsuarioGUID === meuGUID) return;
        vistos.add(professor.UsuarioGUID);
        lista.push({ UsuarioGUID: professor.UsuarioGUID, UsuarioNome: professor.UsuarioNome, Papel: 'Professor' });
      });

      lista.sort((a, b) => a.UsuarioNome.localeCompare(b.UsuarioNome, 'pt-BR'));
      setPessoas(lista);
    } catch (erroCarregamento: any) {
      setErro(erroCarregamento?.message || 'Erro ao carregar pessoas da escola');
    } finally {
      setCarregando(false);
    }
  };

  const pessoasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pessoas;
    return pessoas.filter((pessoa) => pessoa.UsuarioNome.toLowerCase().includes(termo));
  }, [pessoas, busca]);

  const handleSelecionar = async (pessoa: PessoaSelecionavel) => {
    setIniciandoGUID(pessoa.UsuarioGUID);
    setErro('');
    try {
      const resultado = await ConversaAPI.iniciarConversaIndividual(pessoa.UsuarioGUID);
      onConversaIniciada(resultado.ConversaGUID);
      onClose();
    } catch (erroIniciar: any) {
      setErro(erroIniciar?.message || 'Erro ao iniciar conversa');
    } finally {
      setIniciandoGUID(null);
    }
  };

  if (!aberto) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(evento) => evento.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3>Nova conversa</h3>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <Icon name="search" size={17} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            autoFocus
          />
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.lista}>
          {carregando ? (
            <p className={styles.estadoVazio}>Carregando pessoas da escola...</p>
          ) : pessoasFiltradas.length === 0 ? (
            <p className={styles.estadoVazio}>Nenhuma pessoa encontrada.</p>
          ) : (
            pessoasFiltradas.map((pessoa) => (
              <button
                type="button"
                key={pessoa.UsuarioGUID}
                className={styles.pessoaItem}
                onClick={() => handleSelecionar(pessoa)}
                disabled={iniciandoGUID !== null}
              >
                <span className={styles.avatar}>{obterIniciais(pessoa.UsuarioNome)}</span>
                <span className={styles.pessoaInfo}>
                  <span className={styles.pessoaNome}>{pessoa.UsuarioNome}</span>
                  <span className={styles.pessoaPapel}>{pessoa.Papel}</span>
                </span>
                {iniciandoGUID === pessoa.UsuarioGUID && <Loader size={16} inline />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
