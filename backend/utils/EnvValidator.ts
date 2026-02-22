/**
 * Utilitário para validar variáveis de ambiente obrigatórias
 * 
 * Uso: Chamar no início da aplicação (app.ts) para garantir que
 * todas as configurações necessárias estão presentes
 */

interface EnvironmentConfig {
  required: string[];
  optional: string[];
}

export class EnvValidator {
  private static config: EnvironmentConfig = {
    // Variáveis obrigatórias para o servidor funcionar
    required: [
      'DB_HOST',
      'DB_USER',
      'DB_NAME',
      'DB_PORT',
    ],
    
    // Variáveis opcionais (recursos extras)
    optional: [
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'RESEND_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'STRIPE_SECRET_KEY',
    ],
  };

  /**
   * Valida se todas as variáveis obrigatórias estão configuradas
   * @throws Error se alguma variável obrigatória estiver faltando
   */
  static validate(): void {
    console.log("🔍 Validando variáveis de ambiente...");

    const missing: string[] = [];
    const missingOptional: string[] = [];

    // Verificar variáveis obrigatórias
    for (const varName of this.config.required) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    // Verificar variáveis opcionais
    for (const varName of this.config.optional) {
      if (!process.env[varName]) {
        missingOptional.push(varName);
      }
    }

    // Erros para variáveis obrigatórias
    if (missing.length > 0) {
      console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
      missing.forEach((varName) => {
        console.error(`   - ${varName}`);
      });
      console.error('\n💡 Dica: Copie .env.example para .env e configure os valores');
      console.error('   cp .env.example .env\n');
      
      throw new Error(`Variáveis obrigatórias não configuradas: ${missing.join(', ')}`);
    }

    // Avisos para variáveis opcionais
    if (missingOptional.length > 0) {
      console.warn('⚠️  Variáveis opcionais não configuradas (funcionalidades limitadas):');
      missingOptional.forEach((varName) => {
        console.warn(`   - ${varName}`);
      });
      console.warn('');
    }

    console.log('✅ Variáveis de ambiente validadas com sucesso\n');
  }

  /**
   * Obtém uma variável obrigatória ou lança erro
   */
  static getRequired(varName: string): string {
    const value = process.env[varName];
    
    if (!value) {
      throw new Error(`Variável obrigatória ${varName} não está configurada`);
    }
    
    return value;
  }

  /**
   * Obtém uma variável opcional com valor padrão
   */
  static getOptional(varName: string, defaultValue: string): string {
    return process.env[varName] || defaultValue;
  }

  /**
   * Verifica se uma API está configurada (para habilitar features)
   */
  static hasApiKey(keyName: string): boolean {
    return !!process.env[keyName];
  }
}
