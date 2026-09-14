'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
import { buscarEscolaPublicaPorSlug, EscolaPublico } from '@/lib/api/escola.api';
import AuthBrandShell from '@/components/auth/AuthBrandShell';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import AuthIcon from '@/components/auth/AuthIcon';
import Loader from '@/components/Loader';
import { validarCPF } from '@/lib/validators/cpf';
import styles from '../page.module.css';

// Mesmas fontes de /login (marca Bauá) — reaproveitadas mesmo com tema de
// escola, já que só o painel de marca (cor/ícone/nome) muda, a tipografia
// do app continua igual.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});
const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-wordmark',
  display: 'swap',
});

export default function LoginEscolaPage() {
  return (
    <Suspense fallback={null}>
      <LoginEscolaPageContent />
    </Suspense>
  );
}

function LoginEscolaPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();

  const escolaSlug = (params?.escolaSlug as string) || '';

  const [escola, setEscola] = useState<EscolaPublico | null>(null);
  const [carregandoEscola, setCarregandoEscola] = useState(true);
  const [erroEscola, setErroEscola] = useState('');

  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!escolaSlug) return;

    buscarEscolaPublicaPorSlug(escolaSlug)
      .then(setEscola)
      .catch((err: any) => setErroEscola(err.message || 'Escola não encontrada'))
      .finally(() => setCarregandoEscola(false));
  }, [escolaSlug]);

  // Sessão expirada (redirect do interceptor de fetch em @/lib/auth/AuthContext)
  useEffect(() => {
    if (searchParams?.get('sessao') === 'expirada') {
      setError('Sua sessão expirou. Faça login novamente.');
    }
  }, [searchParams]);

  // Detecção de tipo — igual a /login, mas sem tentar classificar "matrícula"
  // (identificador livre, sem formato fixo — ver §1 decisão #7 da spec):
  // qualquer coisa que não bater com CPF/telefone/e-mail cai como
  // "matrícula ou identificador".
  const detectIdentifierType = (value: string): string => {
    if (value.includes('@')) return 'email';

    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length === 10) return 'telefone';
    if (digitsOnly.length === 11) return validarCPF(digitsOnly) ? 'CPF' : 'telefone';
    if (value.trim().length > 0) return 'matrícula';

    return 'desconhecido';
  };

  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatTelefone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length === 11) {
        return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (digits.length === 10) {
        return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
    }
    return value;
  };

  const handleIdentifierChange = (value: string) => {
    // Só formata como CPF/telefone quando o valor é 100% numérico — um
    // identificador de matrícula alfanumérico (ex.: "2024-ALU-042") não deve
    // ser mascarado.
    const somenteDigitos = /^\d+$/.test(value.replace(/[.\-() ]/g, ''));
    if (!somenteDigitos) {
      setIdentifier(value);
      return;
    }

    const type = detectIdentifierType(value);
    if (type === 'CPF') {
      setIdentifier(formatCPF(value));
    } else if (type === 'telefone') {
      setIdentifier(formatTelefone(value));
    } else {
      setIdentifier(value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Por favor, insira sua matrícula, CPF, email ou telefone');
      return;
    }

    if (!senha.trim()) {
      setError('Por favor, insira sua senha');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!escola) {
      setError('Não foi possível identificar a escola deste link');
      return;
    }

    try {
      const usuario = await login(identifier, senha, lembrar, escola.EscolaGUID);

      // Login por link de escola sempre pula /selecionar-escola e vai direto
      // pro dashboard DESTA escola (decisão #2 da spec) — mas só se o
      // usuário de fato tiver função ativa nela; senão, erro específico de
      // acesso (não um erro genérico de credencial, que confundiria o
      // usuário e o suporte — o login funcionou, o problema é permissão).
      const respostaEscolas = await fetch(`/api/usuario/${usuario.UsuarioGUID}/escolas`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('@baua:token')}` },
      });
      const dadosEscolas = await respostaEscolas.json();
      const escolas: Array<{ escola: { EscolaGUID: string } }> = dadosEscolas?.data?.escolas || [];
      const temAcesso = escolas.some((item) => item.escola.EscolaGUID === escola.EscolaGUID);

      if (!temAcesso) {
        setError('Sua conta não tem acesso a esta escola. Fale com a secretaria se isso for um engano.');
        return;
      }

      localStorage.setItem('@baua:escolaSelecionada', escola.EscolaGUID);
      router.push(`/dashboard/${escola.EscolaGUID}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  const identifierType = detectIdentifierType(identifier);
  const fontVars = `${poppins.variable} ${figtree.variable} ${baloo2.variable}`;

  if (carregandoEscola) {
    return (
      <AuthBrandShell className={fontVars} formMaxWidth={400}>
        <div className={styles.form} style={{ alignItems: 'center', paddingTop: 40 }}>
          <Loader size={44} />
        </div>
      </AuthBrandShell>
    );
  }

  if (erroEscola || !escola) {
    return (
      <AuthBrandShell className={fontVars} formMaxWidth={400}>
        <h1 className={styles.title}>Link inválido</h1>
        <p className={styles.subtitle}>
          Não encontramos nenhuma escola com este link. Verifique o endereço ou use o login geral.
        </p>
        <AuthButton type="button" variant="primary" size="lg" block onClick={() => router.push('/login')}>
          Ir para o login geral
        </AuthButton>
      </AuthBrandShell>
    );
  }

  return (
    <AuthBrandShell
      className={fontVars}
      formMaxWidth={400}
      tema={{
        nomeEscola: escola.EscolaNome,
        corPrimaria: escola.EscolaCorPriEs,
        corSecundaria: escola.EscolaCorSecEs,
        iconeBase64: escola.EscolaIcone,
      }}
    >
      <h1 className={styles.title}>Acessar {escola.EscolaNome}</h1>
      <p className={styles.subtitle}>Entre com sua matrícula, CPF, e-mail ou telefone.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <AuthIcon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <AuthInput
          label="Matrícula, CPF, e-mail ou telefone"
          leadingIcon="user"
          placeholder="Ex.: 2024-0042"
          value={identifier}
          onChange={(e) => handleIdentifierChange(e.target.value)}
          autoComplete="username"
          disabled={isLoading}
          hint={identifier ? `Detectado como: ${identifierType}` : undefined}
        />

        <AuthInput
          label="Senha"
          passwordToggle
          placeholder="••••••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          disabled={isLoading}
        />

        <div className={styles.optionsRow}>
          <label className={styles.rememberLabel}>
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              disabled={isLoading}
              className={styles.rememberCheckbox}
            />
            Lembrar de mim
          </label>

          <Link href="/esqueci-senha" className={styles.forgotLink}>
            Esqueci minha senha
          </Link>
        </div>

        <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </AuthButton>
      </form>

      <p className={styles.footerText}>
        Não é desta escola?{' '}
        <Link href="/login" className={styles.footerLink}>
          Use o login geral
        </Link>
      </p>
    </AuthBrandShell>
  );
}
