'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins, Figtree, Baloo_2, JetBrains_Mono } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
import { validarEmail } from '@/lib/validators/email';
import ColorPicker from '@/components/ColorPicker';
import AuthGreenShell from '@/components/auth/AuthGreenShell';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import AuthIcon from '@/components/auth/AuthIcon';
import BauaLogo from '@/components/auth/BauaLogo';
import styles from './page.module.css';

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
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export default function CriarEscolaPage() {
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  // Paleta padrão alinhada aos tokens de marca do Bauá Design System
  // (--green-500, branco, --ink-900, --gold-500) em vez dos valores
  // aproximados anteriores.
  const [cor1, setCor1] = useState('#17C077'); // Primária escura (--green-500)
  const [cor2, setCor2] = useState('#FFFFFF'); // Primária clara
  const [cor3, setCor3] = useState('#0F1D17'); // Secundária escura (--ink-900)
  const [cor4, setCor4] = useState('#FFC02E'); // Secundária clara / destaque (--gold-500)
  const [isTecnica, setIsTecnica] = useState(false); // Escola técnica

  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
    }
  }, [usuario, authLoading]);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Validar tipo
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Apenas imagens PNG e JPG são permitidas');
      return;
    }

    // Validar tamanho (1MB)
    if (file.size > 1024 * 1024) {
      setError('A imagem deve ter no máximo 1MB');
      return;
    }

    setLogo(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setError('');
  };

  const removerLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!nome.trim() || nome.trim().length < 3) {
      setError('O nome da escola deve ter pelo menos 3 caracteres');
      return;
    }

    if (!validarEmail(email)) {
      setError('Email inválido');
      return;
    }

    setIsLoading(true);
    let escolaGUIDCriada: string | null = null;

    try {
      // 1. Criar escola
      const escolaResponse = await fetch('/api/escola', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          EscolaNome: nome.trim(),
          EscolaEmail: email.trim().toLowerCase(),
          EscolaCorPriEs: cor1,
          EscolaCorPriCl: cor2,
          EscolaCorSecEs: cor3,
          EscolaCorSecCl: cor4,
          EscolaIsTecnica: isTecnica,
        }),
      });

      const escolaData = await escolaResponse.json();

      if (!escolaResponse.ok) {
        throw new Error(escolaData.message || 'Erro ao criar escola');
      }

      const escolaGUID = escolaData.data.escola.EscolaGUID;
      escolaGUIDCriada = escolaGUID;

      // 2. Upload de logo (se houver)
      if (logo) {
        const formData = new FormData();
        formData.append('logo', logo);

        const uploadResponse = await fetch(`/api/upload/logo/${escolaGUID}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json().catch(() => ({}));
          throw new Error(uploadData.message || 'Escola criada, mas falhou ao salvar o logo');
        }
      }

      // 3. Redirecionar para seleção de escola
      router.push('/selecionar-escola');
    } catch (err: any) {
      // Se houve falha após criar a escola (ex: upload de logo), faz rollback.
      if (escolaGUIDCriada) {
        try {
          await fetch(`/api/escola/${escolaGUIDCriada}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (_rollbackError) {
          // Não sobrescreve erro original do fluxo.
        }
      }

      setError(err.message || 'Erro ao criar escola. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const fontVars = `${poppins.variable} ${figtree.variable} ${baloo2.variable} ${jetbrainsMono.variable}`;

  if (authLoading) {
    return (
      <AuthGreenShell className={fontVars} maxWidth={420}>
        <div className={styles.loadingState}>
          <BauaLogo size={28} />
          <div className={styles.spinner} />
          <p>Carregando...</p>
        </div>
      </AuthGreenShell>
    );
  }

  return (
    <AuthGreenShell className={fontVars} maxWidth={780}>
      <div className={styles.headerRow}>
        <button
          type="button"
          onClick={() => router.push('/selecionar-escola')}
          className={styles.backButton}
          aria-label="Voltar para suas escolas"
        >
          <AuthIcon name="chevron-left" size={18} />
        </button>
        <h1 className={styles.title}>Nova escola</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.layout}>
        <div className={styles.formCol}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <AuthIcon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <AuthInput
            label="Nome da escola"
            placeholder="Ex.: Colégio Bauá"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={isLoading}
            required
          />

          <AuthInput
            label="E-mail institucional"
            leadingIcon="mail"
            type="email"
            placeholder="contato@escola.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <div className={styles.paletteSection}>
            <span className={styles.sectionLabel}>Paleta da escola</span>
            <p className={styles.sectionHint}>Essas 4 cores definem o tema visual da instituição.</p>
            <div className={styles.paletteRow}>
              <ColorPicker label="Primária escura" color={cor1} onChange={setCor1} disabled={isLoading} />
              <ColorPicker label="Primária clara" color={cor2} onChange={setCor2} disabled={isLoading} />
              <ColorPicker label="Secundária escura" color={cor3} onChange={setCor3} disabled={isLoading} />
              <ColorPicker label="Secundária clara" color={cor4} onChange={setCor4} disabled={isLoading} />
            </div>
          </div>

          <div className={styles.logoSection}>
            <span className={styles.sectionLabel}>Logo da escola</span>

            {!logoPreview ? (
              <label className={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className={styles.fileInput}
                  disabled={isLoading}
                />
                <AuthIcon name="upload" size={22} />
                <span className={styles.uploadText}>Clique para selecionar uma imagem</span>
                <span className={styles.uploadHint}>PNG ou JPG · Máximo 1MB</span>
              </label>
            ) : (
              <div className={styles.logoPreviewRow}>
                <img src={logoPreview} alt="Preview do logo" className={styles.logoPreviewImg} />
                <button
                  type="button"
                  onClick={removerLogo}
                  className={styles.removeLogoButton}
                  disabled={isLoading}
                >
                  <AuthIcon name="x" size={14} /> Remover
                </button>
              </div>
            )}
          </div>

          <label className={styles.checkboxRow}>
            <span className={styles.checkbox} data-checked={isTecnica}>
              <input
                type="checkbox"
                checked={isTecnica}
                onChange={(e) => setIsTecnica(e.target.checked)}
                disabled={isLoading}
                className={styles.checkboxInput}
              />
              {isTecnica && <AuthIcon name="check" size={13} className={styles.checkboxIcon} />}
            </span>
            <span className={styles.checkboxText}>
              <strong>Escola Técnica</strong>
              <span>Marque se a instituição oferece cursos técnicos profissionalizantes.</span>
            </span>
          </label>

          <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading}>
            {isLoading ? 'Criando escola...' : 'Criar escola'}
          </AuthButton>
        </div>

        <div className={styles.previewCol}>
          <span className={styles.previewEyebrow}>Prévia</span>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader} style={{ background: cor1 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" className={styles.previewLogoImg} />
              ) : (
                <span className={styles.previewAvatar}>{nome.charAt(0).toUpperCase() || 'E'}</span>
              )}
              <strong className={styles.previewSchoolName}>{nome || 'Nome da Escola'}</strong>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewBar} style={{ background: cor2 }} />
              <div className={styles.previewBarTrack} />
              <span className={styles.previewBadge} style={{ background: cor4, color: cor3 }}>
                Destaque
              </span>
            </div>
          </div>
        </div>
      </form>
    </AuthGreenShell>
  );
}
