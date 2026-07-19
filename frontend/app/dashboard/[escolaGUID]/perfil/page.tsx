'use client';

/**
 * Configuração do usuário (perfil pessoal) — distinta da Configuração da
 * Escola (`/dashboard/[escolaGUID]/configuracoes`). Acessada pelo item
 * "Meu Perfil" do dropdown do avatar na navbar do dashboard.
 *
 * Cobre as decisões já registradas em docs/RELATORIO_BAUA_CODIGO.md,
 * seção 11 (Configuração do usuário): dado cadastral (nome/e-mail/
 * telefone), foto de perfil e troca de senha. Modo daltônico fica de fora
 * desta rodada (fora de escopo, sinalizado no relatório).
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import * as UsuarioAPI from '@/lib/api/usuario.api';
import * as UploadAPI from '@/lib/api/upload.api';
import styles from './page.module.css';

function obterIniciais(nome?: string, sobrenome?: string): string {
  const nomeCompleto = `${nome || ''} ${sobrenome || ''}`.trim();
  if (!nomeCompleto) return '?';
  return nomeCompleto
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
}

export default function PerfilPage() {
  const { usuario, refreshUser } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroDados, setErroDados] = useState('');
  const [sucessoDados, setSucessoDados] = useState('');

  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [sucessoSenha, setSucessoSenha] = useState('');

  useEffect(() => {
    if (usuario) {
      setNome(usuario.UsuarioNome || '');
      setEmail(usuario.UsuarioEmail || '');
      setTelefone(usuario.UsuarioTelefone || '');
    }
  }, [usuario]);

  const handleSalvarDados = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!usuario) return;
    setSalvando(true);
    setErroDados('');
    setSucessoDados('');
    try {
      await UsuarioAPI.atualizarUsuario(usuario.UsuarioCPF, {
        UsuarioNome: nome.trim(),
        UsuarioEmail: email.trim(),
        UsuarioTelefone: telefone.trim() || undefined,
      });
      await refreshUser();
      setSucessoDados('Dados atualizados com sucesso.');
    } catch (erro: any) {
      setErroDados(erro?.message || 'Erro ao salvar dados');
    } finally {
      setSalvando(false);
    }
  };

  const handleSelecionarFoto = async (arquivo: File | undefined) => {
    if (!arquivo || !usuario) return;
    setErroFoto('');

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!tiposPermitidos.includes(arquivo.type)) {
      setErroFoto('Envie uma imagem PNG ou JPG.');
      return;
    }
    if (arquivo.size > 1 * 1024 * 1024) {
      setErroFoto('A foto não pode passar de 1MB.');
      return;
    }

    setEnviandoFoto(true);
    try {
      await UploadAPI.uploadFotoUsuario(usuario.UsuarioCPF, arquivo);
      await refreshUser();
    } catch (erro: any) {
      setErroFoto(erro?.message || 'Erro ao enviar foto');
    } finally {
      setEnviandoFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  const handleRemoverFoto = async () => {
    if (!usuario || !usuario.UsuarioFotoUrl) return;
    setErroFoto('');
    setEnviandoFoto(true);
    try {
      await UploadAPI.removerFotoUsuario(usuario.UsuarioCPF);
      await refreshUser();
    } catch (erro: any) {
      setErroFoto(erro?.message || 'Erro ao remover foto');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleTrocarSenha = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!usuario) return;
    setErroSenha('');
    setSucessoSenha('');

    if (!senhaAtual || !novaSenha) {
      setErroSenha('Preencha a senha atual e a nova senha.');
      return;
    }
    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroSenha('A confirmação não bate com a nova senha.');
      return;
    }

    setTrocandoSenha(true);
    try {
      await UsuarioAPI.trocarSenha(usuario.UsuarioCPF, senhaAtual, novaSenha);
      setSucessoSenha('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (erro: any) {
      setErroSenha(erro?.message || 'Erro ao trocar senha');
    } finally {
      setTrocandoSenha(false);
    }
  };

  const iniciais = obterIniciais(usuario?.UsuarioNome, usuario?.UsuarioSobrenome);

  return (
    <div className={styles.container}>
      <div className={styles.pageWrap}>
        <h1 className={styles.pageTitle}>Meu Perfil</h1>
        <p className={styles.pageSubtitulo}>Dados pessoais, foto e senha da sua conta — não afeta a configuração da escola.</p>

        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Foto de perfil</h2>
          <div className={styles.fotoRow}>
            <button
              type="button"
              className={styles.fotoButton}
              onClick={() => fotoInputRef.current?.click()}
              disabled={enviandoFoto}
              title="Alterar foto de perfil"
            >
              {usuario?.UsuarioFotoUrl ? (
                <img src={usuario.UsuarioFotoUrl} alt="" className={styles.fotoImg} />
              ) : (
                <span className={styles.fotoFallback}>{iniciais}</span>
              )}
            </button>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className={styles.inputOculto}
              onChange={(e) => void handleSelecionarFoto(e.target.files?.[0])}
            />
            <div className={styles.fotoAcoes}>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={() => fotoInputRef.current?.click()}
                disabled={enviandoFoto}
              >
                {enviandoFoto ? 'Enviando...' : 'Alterar foto'}
              </button>
              {usuario?.UsuarioFotoUrl && (
                <button
                  type="button"
                  className={styles.botaoRemover}
                  onClick={() => void handleRemoverFoto()}
                  disabled={enviandoFoto}
                >
                  Remover
                </button>
              )}
              <span className={styles.fotoDica}>PNG ou JPG, até 1MB.</span>
            </div>
          </div>
          {erroFoto && <p className={styles.erro}>{erroFoto}</p>}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Dados cadastrais</h2>
          <form className={styles.form} onSubmit={(e) => void handleSalvarDados(e)}>
            <label className={styles.label}>
              Nome completo
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label className={styles.label}>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className={styles.label}>
              Telefone
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </label>
            {erroDados && <p className={styles.erro}>{erroDados}</p>}
            {sucessoDados && <p className={styles.sucesso}>{sucessoDados}</p>}
            <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar dados'}
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Alterar senha</h2>
          <form className={styles.form} onSubmit={(e) => void handleTrocarSenha(e)}>
            <label className={styles.label}>
              Senha atual
              <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
            </label>
            <label className={styles.label}>
              Nova senha
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </label>
            <label className={styles.label}>
              Confirmar nova senha
              <input
                type="password"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              />
            </label>
            {erroSenha && <p className={styles.erro}>{erroSenha}</p>}
            {sucessoSenha && <p className={styles.sucesso}>{sucessoSenha}</p>}
            <button type="submit" className={styles.botaoPrimario} disabled={trocandoSenha}>
              {trocandoSenha ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
