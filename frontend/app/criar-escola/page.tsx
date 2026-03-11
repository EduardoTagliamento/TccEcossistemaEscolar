'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { validarEmail } from '@/lib/validators/email';
import ColorPicker from '@/components/ColorPicker';
import { FiUpload, FiX, FiArrowLeft } from 'react-icons/fi';
import styles from './page.module.css';

export default function CriarEscolaPage() {
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cor1, setCor1] = useState('#00CED1'); // Verde-água Bauá
  const [cor2, setCor2] = useState('#FFFFFF'); // Branco
  const [cor3, setCor3] = useState('#000000'); // Preto
  const [cor4, setCor4] = useState('#FFD700'); // Dourado

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

    try {
      // 1. Criar escola
      const escolaResponse = await fetch('/api/escola', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          EscolaNome: nome.trim(),
          EscolaEmail: email.trim().toLowerCase(),
          EscolaCor1: cor1,
          EscolaCor2: cor2,
          EscolaCor3: cor3,
          EscolaCor4: cor4,
        }),
      });

      const escolaData = await escolaResponse.json();

      if (!escolaResponse.ok) {
        throw new Error(escolaData.message || 'Erro ao criar escola');
      }

      const escolaGUID = escolaData.data.escola.EscolaGUID;

      // 2. Upload de logo (se houver)
      if (logo) {
        const formData = new FormData();
        formData.append('logo', logo);

        const uploadResponse = await fetch(`/api/upload/logo/${escolaGUID}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          console.error('Erro ao fazer upload do logo, mas a escola foi criada');
        }
      }

      // 3. Redirecionar para seleção de escola
      router.push('/selecionar-escola');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar escola. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <div className={styles.header}>
          <Link href="/selecionar-escola" className={styles.backButton}>
            <FiArrowLeft /> Voltar
          </Link>
          <h1 className={styles.title}>Criar Nova Escola</h1>
          <p className={styles.subtitle}>Configure sua instituição de ensino</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="nome" className={styles.label}>
              Nome da Escola *
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Colégio Bauá"
              className={styles.input}
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email da Escola *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@escola.com"
              className={styles.input}
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.divider}>
            <span>Personalização Visual</span>
          </div>

          <div className={styles.colorsSection}>
            <h3>Cores do Tema</h3>
            <p className={styles.hint}>
              Escolha 4 cores que representam sua instituição. Essas cores serão usadas em toda a interface.
            </p>
            
            <div className={styles.colorsGrid}>
              <ColorPicker
                label="Cor Principal"
                color={cor1}
                onChange={setCor1}
                disabled={isLoading}
              />
              <ColorPicker
                label="Cor Secundária"
                color={cor2}
                onChange={setCor2}
                disabled={isLoading}
              />
              <ColorPicker
                label="Cor Terciária"
                color={cor3}
                onChange={setCor3}
                disabled={isLoading}
              />
              <ColorPicker
                label="Cor de Destaque"
                color={cor4}
                onChange={setCor4}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.logoSection}>
            <h3>Logo da Escola</h3>
            <p className={styles.hint}>
              Envie o logo da sua escola (PNG ou JPG, máximo 1MB)
            </p>

            {!logoPreview ? (
              <label className={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className={styles.fileInput}
                  disabled={isLoading}
                />
                <FiUpload className={styles.uploadIcon} />
                <span>Clique para selecionar uma imagem</span>
                <span className={styles.uploadHint}>PNG ou JPG • Máximo 1MB</span>
              </label>
            ) : (
              <div className={styles.logoPreviewContainer}>
                <img src={logoPreview} alt="Preview do logo" className={styles.logoPreview} />
                <button
                  type="button"
                  onClick={removerLogo}
                  className={styles.removeLogoButton}
                  disabled={isLoading}
                >
                  <FiX /> Remover
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Criando escola...' : 'Criar Escola'}
          </button>
        </form>
      </div>

      <div className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <h2>Pré-visualização</h2>
          <p>Veja como ficará o tema da sua escola</p>
        </div>

        <div 
          className={styles.preview}
          style={{
            '--preview-cor-1': cor1,
            '--preview-cor-2': cor2,
            '--preview-cor-3': cor3,
            '--preview-cor-4': cor4,
          } as React.CSSProperties}
        >
          <div className={styles.previewHeader2}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className={styles.previewLogo} />
            ) : (
              <div className={styles.previewIcon}>
                {nome.charAt(0).toUpperCase() || 'E'}
              </div>
            )}
            <h3>{nome || 'Nome da Escola'}</h3>
          </div>

          <div className={styles.previewCard}>
            <h4>Card de Exemplo</h4>
            <p>Este é um exemplo de como os cards aparecerão com as cores escolhidas.</p>
            <button className={styles.previewButton}>Botão Principal</button>
          </div>

          <div className={styles.previewPalette}>
            <div className={styles.paletteColor} style={{ backgroundColor: cor1 }}>
              <span>Cor 1</span>
            </div>
            <div className={styles.paletteColor} style={{ backgroundColor: cor2 }}>
              <span>Cor 2</span>
            </div>
            <div className={styles.paletteColor} style={{ backgroundColor: cor3 }}>
              <span>Cor 3</span>
            </div>
            <div className={styles.paletteColor} style={{ backgroundColor: cor4 }}>
              <span>Cor 4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
