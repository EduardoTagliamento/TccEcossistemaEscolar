'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poppins, figtree, baloo2 } from '@/lib/fonts';
import * as FeiraUnivapAPI from '@/lib/api/feiraunivap.api';
import { validarTelefone, formatarTelefone } from '@/lib/validators/telefone';
import { validarEmail } from '@/lib/validators/email';
import styles from './page.module.css';

const TELEFONE_BAUA = '12 988493959';
const ANOS = [
  { valor: '1', label: '1º ano' },
  { valor: '2', label: '2º ano' },
  { valor: '3', label: '3º ano' },
];

export default function CadastroUnivapPage() {
  const [ano, setAno] = useState('');
  const [turmas, setTurmas] = useState<FeiraUnivapAPI.TurmaFeira[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  const [turmaGUID, setTurmaGUID] = useState('');
  const [pessoas, setPessoas] = useState<FeiraUnivapAPI.PessoaFeira[]>([]);
  const [carregandoPessoas, setCarregandoPessoas] = useState(false);

  const [usuarioGUID, setUsuarioGUID] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<FeiraUnivapAPI.AtivarResultado | null>(null);

  useEffect(() => {
    setTurmaGUID('');
    setPessoas([]);
    setUsuarioGUID('');
    if (!ano) {
      setTurmas([]);
      return;
    }
    setCarregandoTurmas(true);
    FeiraUnivapAPI.listarTurmas(ano as '1' | '2' | '3')
      .then(setTurmas)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoTurmas(false));
  }, [ano]);

  useEffect(() => {
    setUsuarioGUID('');
    if (!turmaGUID) {
      setPessoas([]);
      return;
    }
    setCarregandoPessoas(true);
    FeiraUnivapAPI.listarPessoas(turmaGUID)
      .then(setPessoas)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoPessoas(false));
  }, [turmaGUID]);

  const pessoaSelecionada = pessoas.find((p) => p.UsuarioGUID === usuarioGUID) || null;

  const handleTelefoneChange = (value: string) => {
    setTelefone(formatarTelefone(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioGUID || !telefone.trim()) return;

    setErro('');

    if (!validarTelefone(telefone)) {
      setErro('Telefone inválido. Confira o DDD e o número.');
      return;
    }

    if (email.trim() && !validarEmail(email.trim())) {
      setErro('Email inválido.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await FeiraUnivapAPI.ativar({
        UsuarioGUID: usuarioGUID,
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        matricula: matricula.trim() || undefined,
      });
      setResultado(resultado);
    } catch (e: any) {
      setErro(e.message || 'Erro ao ativar a conta. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <div className={`${styles.page} ${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
        <div className={styles.card}>
          <span className={styles.sucessoIcone} aria-hidden="true">✓</span>
          <h1 className={styles.titulo}>Prontinho, {resultado.UsuarioNome.split(' ')[0]}!</h1>
          <p className={styles.subtitulo}>
            {resultado.credenciaisEnviadasPorWhatsapp
              ? 'Sua senha foi enviada pro seu WhatsApp. Confira suas mensagens.'
              : 'Sua conta foi ativada, mas não conseguimos confirmar o envio da senha por WhatsApp agora — se não chegar em alguns minutos, fale com a administração do Bauá.'}
          </p>
          <Link href="/login" className={styles.botaoPrimario}>
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoBird} aria-hidden="true" />
          <span className={styles.logoWordmark}>bauá</span>
        </Link>

        <h1 className={styles.titulo}>Sou aluno da Univap</h1>
        <p className={styles.subtitulo}>Encontre seu nome e ative sua conta.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.campo}>
            <span className={styles.rotulo}>Ano</span>
            <select className={styles.select} value={ano} onChange={(e) => setAno(e.target.value)} required>
              <option value="">Selecione o ano</option>
              {ANOS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span className={styles.rotulo}>Turma</span>
            <select
              className={styles.select}
              value={turmaGUID}
              onChange={(e) => setTurmaGUID(e.target.value)}
              disabled={!ano || carregandoTurmas}
              required
            >
              <option value="">{carregandoTurmas ? 'Carregando...' : 'Selecione a turma'}</option>
              {turmas.map((t) => (
                <option key={t.TurmaGUID} value={t.TurmaGUID}>
                  {t.TurmaNome} {t.CursoNome ? `— ${t.CursoNome}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span className={styles.rotulo}>Seu nome</span>
            <select
              className={styles.select}
              value={usuarioGUID}
              onChange={(e) => setUsuarioGUID(e.target.value)}
              disabled={!turmaGUID || carregandoPessoas}
              required
            >
              <option value="">{carregandoPessoas ? 'Carregando...' : 'Selecione seu nome'}</option>
              {pessoas.map((p) => (
                <option key={p.UsuarioGUID} value={p.UsuarioGUID} disabled={p.jaAtivada}>
                  {p.UsuarioNome} {p.jaAtivada ? '(já ativado)' : ''}
                </option>
              ))}
            </select>
          </label>

          {pessoaSelecionada && !pessoaSelecionada.jaAtivada && (
            <>
              <label className={styles.campo}>
                <span className={styles.rotulo}>Telefone (WhatsApp) *</span>
                <input
                  className={styles.input}
                  type="tel"
                  placeholder="(99) 99999-9999"
                  value={telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  maxLength={15}
                  required
                />
              </label>

              <label className={styles.campo}>
                <span className={styles.rotulo}>Email (opcional)</span>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className={styles.campo}>
                <span className={styles.rotulo}>Matrícula (opcional)</span>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Sua matrícula/RA na Univap"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                />
              </label>

              {erro && <p className={styles.erro}>{erro}</p>}

              <button type="submit" className={styles.botaoPrimario} disabled={enviando}>
                {enviando ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </>
          )}
        </form>

        <p className={styles.rodape}>
          Não achou seu nome? Fale com a administração do Bauá:{' '}
          <a
            href={`https://wa.me/55${TELEFONE_BAUA.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rodapeLink}
          >
            {TELEFONE_BAUA}
          </a>
        </p>

        <Link href="/" className={styles.rodapeLink} style={{ marginTop: 10, display: 'inline-block' }}>
          ← Conhecer o Bauá
        </Link>
      </div>
    </div>
  );
}
