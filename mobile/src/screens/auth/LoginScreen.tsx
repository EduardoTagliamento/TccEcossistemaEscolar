/**
 * Tela de Login — replica o visual de `frontend/app/login/page.tsx` +
 * `AuthBrandShell`/`AuthInput`/`AuthButton` (fundo branco, já que o painel
 * de marca verde do web só aparece a partir de 900px — no mobile o web
 * já cai pro layout "só formulário" que replicamos aqui).
 */
import React, { useState } from 'react';
import { View, Text, Image, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/icons';
import { fontFamily } from '../../theme/tokens';

const COLORS = {
  ink900: '#0F1D17',
  slate500: '#647268',
  slate400: '#8A968E',
  line200: '#E2EAE5',
  green500: '#17C077',
  green600: '#12A063',
  green700: '#0E7D4E',
  danger500: '#E5484D',
  danger50: '#FCEBEC',
};

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
    setErro('');
    if (!identifier.trim()) {
      setErro('Por favor, insira seu CPF, e-mail ou telefone');
      return;
    }
    if (!senha.trim()) {
      setErro('Por favor, insira sua senha');
      return;
    }
    setEnviando(true);
    try {
      await login(identifier.trim(), senha, lembrar);
    } catch (error: any) {
      setErro(error?.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/baua-passaro.png')} style={styles.brandImage} resizeMode="contain" />
            <Text style={styles.wordmark}>bauá</Text>
          </View>

          <Text style={styles.title}>Acessar a plataforma</Text>
          <Text style={styles.subtitle}>Entre com sua conta Bauá para continuar.</Text>

          {!!erro && (
            <View style={styles.errorBanner}>
              <Icon name="alert" size={16} color={COLORS.danger500} />
              <Text style={styles.errorText}>{erro}</Text>
            </View>
          )}

          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>CPF, e-mail ou telefone</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.leadingIcon}>
                  <Icon name="user" size={18} color={COLORS.slate400} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithLeading]}
                  placeholder="voce@escola.com"
                  placeholderTextColor={COLORS.slate400}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.inputWithTrailing]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.slate400}
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                />
                <Pressable style={styles.trailingButton} onPress={() => setMostrarSenha((v) => !v)}>
                  <Icon name={mostrarSenha ? 'eye-off' : 'eye'} size={18} color={COLORS.slate400} />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.rememberRow} onPress={() => setLembrar((v) => !v)}>
              <View style={[styles.checkbox, lembrar && styles.checkboxChecked]}>
                {lembrar && <Icon name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberText}>Lembrar de mim</Text>
            </Pressable>

            <Pressable onPress={handleLogin} disabled={enviando} style={[styles.button, enviando && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>{enviando ? 'Entrando...' : 'Entrar'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandImage: { width: 34, height: 34 },
  wordmark: { fontFamily: fontFamily.logo, fontSize: 22, color: '#0F1D17' },
  title: { fontFamily: fontFamily.headingExtraBold, fontSize: 26, color: COLORS.ink900, marginTop: 22, marginBottom: 4 },
  subtitle: { fontFamily: fontFamily.body, fontSize: 14, color: COLORS.slate500, marginBottom: 22 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: COLORS.danger50, borderWidth: 1, borderColor: COLORS.danger500, borderRadius: 12, marginBottom: 16 },
  errorText: { flex: 1, color: COLORS.danger500, fontFamily: fontFamily.body, fontSize: 13 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: COLORS.ink900 },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: COLORS.ink900,
    borderWidth: 1.5,
    borderColor: COLORS.line200,
    borderRadius: 12,
  },
  inputWithLeading: { paddingLeft: 40 },
  inputWithTrailing: { paddingRight: 44 },
  leadingIcon: { position: 'absolute', left: 13, zIndex: 1 },
  trailingButton: { position: 'absolute', right: 12, padding: 4 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.line200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.green500, borderColor: COLORS.green500 },
  rememberText: { fontFamily: fontFamily.body, fontSize: 13, color: COLORS.slate500 },
  button: {
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.green500,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: COLORS.green500,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontFamily: fontFamily.bodySemiBold, fontSize: 16 },
});
