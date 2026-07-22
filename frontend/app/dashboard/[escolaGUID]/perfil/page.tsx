'use client';

/**
 * Configuração do usuário (perfil pessoal) — distinta da Configuração da
 * Escola (`/dashboard/[escolaGUID]/configuracoes`). Acessada pelo item
 * "Meu Perfil" do dropdown do avatar na navbar do dashboard.
 *
 * Cobre as decisões já registradas em docs/RELATORIO_BAUA_CODIGO.md,
 * seção 11 (Configuração do usuário): dado cadastral (nome/e-mail/
 * telefone), foto de perfil e troca de senha. Também cobre a seção
 * "Preferências de acessibilidade" (tema, modo daltônico, tamanho de
 * texto, redução de movimento e alto contraste) — persistida por conta
 * (UsuarioTema/UsuarioModoDaltonico/UsuarioEscalaFonte/
 * UsuarioReduzirMovimento/UsuarioAltoContraste), sem localStorage, pra
 * sincronizar entre dispositivos.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import * as UsuarioAPI from '@/lib/api/usuario.api';
import * as UploadAPI from '@/lib/api/upload.api';
import {
  aplicarTema,
  aplicarModoDaltonico,
  aplicarEscalaFonte,
  aplicarReduzirMovimento,
  aplicarAltoContraste,
} from '@/lib/theme/tema';
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
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
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

  const [salvandoPreferencia, setSalvandoPreferencia] = useState<string | null>(null);
  const [erroPreferencias, setErroPreferencias] = useState('');

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

  /**
   * Salva uma preferência de acessibilidade isolada. Aplica o atributo no
   * `<html>` otimisticamente (feedback visual imediato) antes mesmo da
   * resposta do servidor, e reverte via `refreshUser()` se a chamada falhar
   * (o `AuthContext` reaplica o valor persistido de fato assim que o
   * usuário atualizado voltar).
   */
  const salvarPreferencia = async (
    chave: string,
    aplicarOtimista: () => void,
    dados: Parameters<typeof UsuarioAPI.atualizarUsuario>[1]
  ) => {
    if (!usuario) return;
    setErroPreferencias('');
    setSalvandoPreferencia(chave);
    aplicarOtimista();
    try {
      await UsuarioAPI.atualizarUsuario(usuario.UsuarioCPF, dados);
      await refreshUser();
    } catch (erro: any) {
      setErroPreferencias(erro?.message || 'Erro ao salvar preferência');
      await refreshUser();
    } finally {
      setSalvandoPreferencia(null);
    }
  };

  const handleAlterarTema = (novoTema: 'light' | 'dark' | 'system') =>
    void salvarPreferencia('tema', () => aplicarTema(novoTema), { UsuarioTema: novoTema });

  const handleAlterarModoDaltonico = (ativo: boolean) =>
    void salvarPreferencia('daltonico', () => aplicarModoDaltonico(ativo), { UsuarioModoDaltonico: ativo });

  const handleAlterarEscalaFonte = (escala: 'small' | 'medium' | 'large') =>
    void salvarPreferencia('escalaFonte', () => aplicarEscalaFonte(escala), { UsuarioEscalaFonte: escala });

  const handleAlterarReduzirMovimento = (ativo: boolean) =>
    void salvarPreferencia('reduzirMovimento', () => aplicarReduzirMovimento(ativo), { UsuarioReduzirMovimento: ativo });

  const handleAlterarAltoContraste = (ativo: boolean) =>
    void salvarPreferencia('altoContraste', () => aplicarAltoContraste(ativo), { UsuarioAltoContraste: ativo });

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

        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Notificações</h2>
          <p className={styles.prefDescricao} style={{ marginBottom: '0.75rem' }}>
            Escolha quais avisos e lembretes você também quer receber por e-mail ou WhatsApp — além de sempre
            aparecerem no sino de notificações.
          </p>
          <Link href={`/dashboard/${escolaGUID}/notificacoes/configuracoes`} className={styles.botaoSecundario}>
            Gerenciar preferências de notificação
          </Link>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Preferências de acessibilidade</h2>

          <div className={styles.prefBloco}>
            <div className={styles.prefCabecalho}>
              <span className={styles.prefTitulo}>Tema</span>
              <div className={styles.segmentedControl} role="radiogroup" aria-label="Tema">
                {(
                  [
                    { valor: 'light', rotulo: 'Claro' },
                    { valor: 'dark', rotulo: 'Escuro' },
                    { valor: 'system', rotulo: 'Sistema' },
                  ] as const
                ).map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    role="radio"
                    aria-checked={(usuario?.UsuarioTema ?? 'system') === opcao.valor}
                    className={`${styles.segmentedOption} ${
                      (usuario?.UsuarioTema ?? 'system') === opcao.valor ? styles.segmentedOptionActivo : ''
                    }`}
                    disabled={salvandoPreferencia === 'tema'}
                    onClick={() => handleAlterarTema(opcao.valor)}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.prefDescricao}>Claro, escuro, ou acompanhando a preferência do seu sistema.</p>
          </div>

          <div className={styles.prefBloco}>
            <div className={styles.prefCabecalho}>
              <span className={styles.prefTitulo}>Tamanho de texto</span>
              <div className={styles.segmentedControl} role="radiogroup" aria-label="Tamanho de texto">
                {(
                  [
                    { valor: 'small', rotulo: 'Pequeno' },
                    { valor: 'medium', rotulo: 'Médio' },
                    { valor: 'large', rotulo: 'Grande' },
                  ] as const
                ).map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    role="radio"
                    aria-checked={(usuario?.UsuarioEscalaFonte ?? 'medium') === opcao.valor}
                    className={`${styles.segmentedOption} ${
                      (usuario?.UsuarioEscalaFonte ?? 'medium') === opcao.valor ? styles.segmentedOptionActivo : ''
                    }`}
                    disabled={salvandoPreferencia === 'escalaFonte'}
                    onClick={() => handleAlterarEscalaFonte(opcao.valor)}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.prefDescricao}>Ajusta o tamanho do texto em todo o painel.</p>
          </div>

          <div className={styles.prefBloco}>
            <div className={styles.prefCabecalho}>
              <span className={styles.prefTitulo}>Modo daltônico</span>
              <label className={styles.switchControl}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={usuario?.UsuarioModoDaltonico ?? false}
                  disabled={salvandoPreferencia === 'daltonico'}
                  onChange={(e) => handleAlterarModoDaltonico(e.target.checked)}
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </label>
            </div>
            <p className={styles.prefDescricao}>
              Troca verde/vermelho por azul/laranja nos indicadores de sucesso e erro.
            </p>
          </div>

          <div className={styles.prefBloco}>
            <div className={styles.prefCabecalho}>
              <span className={styles.prefTitulo}>Reduzir animações</span>
              <label className={styles.switchControl}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={usuario?.UsuarioReduzirMovimento ?? false}
                  disabled={salvandoPreferencia === 'reduzirMovimento'}
                  onChange={(e) => handleAlterarReduzirMovimento(e.target.checked)}
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </label>
            </div>
            <p className={styles.prefDescricao}>Minimiza transições e animações em todo o app.</p>
          </div>

          <div className={styles.prefBloco}>
            <div className={styles.prefCabecalho}>
              <span className={styles.prefTitulo}>Alto contraste</span>
              <label className={styles.switchControl}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={usuario?.UsuarioAltoContraste ?? false}
                  disabled={salvandoPreferencia === 'altoContraste'}
                  onChange={(e) => handleAlterarAltoContraste(e.target.checked)}
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </label>
            </div>
            <p className={styles.prefDescricao}>Reforça o contraste de texto, bordas e do indicador de foco.</p>
          </div>

          {erroPreferencias && <p className={styles.erro}>{erroPreferencias}</p>}
        </section>
      </div>
    </div>
  );
}
