// 🔹 IMPORTANTE: Carregar dotenv ANTES de qualquer outro import
// Isso garante que variáveis de ambiente estejam disponíveis quando módulos são carregados
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// Agora podemos importar os outros módulos
import Server from "./backend/Server";
import { EnvValidator } from "./backend/utils/EnvValidator";

/**
 * Arquivo principal de inicialização do servidor.
 * 
 * Responsabilidades:
 * - Carregar variáveis de ambiente (.env)
 * - Criar instância do servidor
 * - Inicializar todas as dependências (banco, middlewares, rotas)
 * - Iniciar o servidor na porta especificada
 * - Tratar erros de inicialização
 * 
 * Fluxo de Inicialização:
 * 1. Carregar .env
 * 2. Validar variáveis obrigatórias
 * 3. Criar instância do Server
 * 4. Inicializar (await server.init())
 * 5. Executar servidor (server.run())
 * 
 * Observação sobre async/await:
 * - server.init() retorna Promise (conexões assíncronas com MySQL)
 * - É necessário usar await para garantir inicialização completa antes de aceitar requisições
 */

const isProduction = process.env.NODE_ENV === "production";

// Railway costuma expor credenciais como MYSQL*.
// Fazemos fallback para DB_* para manter compatibilidade com o restante da aplicação.
process.env.DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST;
process.env.DB_USER = process.env.DB_USER || process.env.MYSQLUSER;
process.env.DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
process.env.DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE;
process.env.DB_PORT = process.env.DB_PORT || process.env.MYSQLPORT;

console.log("✅ Variáveis de ambiente carregadas");
if (process.env.RESEND_API_KEY) {
  console.log("✅ RESEND_API_KEY configurada");
} else {
  console.warn("⚠️  RESEND_API_KEY não encontrada - emails não funcionarão");
}

// 🔹 Validar variáveis de ambiente obrigatórias
const validateEnvironment = (): void => {
  console.log("\n🔍 Validando configuração...\n");
  
  try {
    EnvValidator.validate();
  } catch (error: any) {
    console.error("❌ Erro na validação de ambiente:", error.message);
    process.exit(1);
  }
};

// 🔹 Exibir configuração atual
const displayConfiguration = (): void => {
  console.log("\n📋 Configuração do Servidor:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Porta: ${process.env.PORT || "3000"}`);
  console.log(`   Database Host: ${process.env.DB_HOST}`);
  console.log(`   Database Name: ${process.env.DB_NAME}`);
  console.log(`   Database User: ${process.env.DB_USER}`);
  console.log(`   Database Port: ${process.env.DB_PORT || "3306"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
};

// 🔹 Tratamento de sinais de encerramento (Ctrl+C, kill)
const setupGracefulShutdown = (): void => {
  const shutdown = (signal: string) => {
    console.log(`\n\n🛑 Sinal ${signal} recebido`);
    console.log("⏳ Encerrando servidor gracefully...");
    
    // Aqui você pode adicionar lógica para:
    // - Fechar conexões com banco de dados
    // - Finalizar processos em andamento
    // - Salvar estado da aplicação
    
    console.log("✅ Servidor encerrado");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C
  process.on("SIGTERM", () => shutdown("SIGTERM")); // kill
};

// 🔹 Tratamento de erros não capturados
const setupErrorHandlers = (): void => {
  // Captura erros síncronos não tratados
  process.on("uncaughtException", (error: Error) => {
    console.error("\n🔴 ERRO NÃO CAPTURADO (uncaughtException):");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`Tipo: ${error.constructor.name}`);
    console.error(`Mensagem: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("💡 Dica: Verifique o código que causou este erro e adicione try/catch");
    process.exit(1);
  });

  // Captura promises rejeitadas não tratadas
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    console.error("\n🔴 PROMISE REJEITADA NÃO TRATADA (unhandledRejection):");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`Razão: ${reason}`);
    console.error(`Promise: ${promise}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("💡 Dica: Adicione .catch() ou try/await/catch nas suas promises");
    process.exit(1);
  });
};

// 🔹 Função principal de inicialização
const main = async (): Promise<void> => {
  try {
    console.log("\n🚀 Iniciando Ecossistema Escolar...\n");

    // Validar ambiente
    validateEnvironment();
    displayConfiguration();

    // Configurar handlers de erro global
    setupErrorHandlers();
    setupGracefulShutdown();

    // Obter porta do ambiente ou usar padrão
    const porta = parseInt(process.env.PORT || "3000", 10);

    if (isNaN(porta) || porta < 1 || porta > 65535) {
      throw new Error(`Porta inválida: ${process.env.PORT}. Deve ser entre 1 e 65535`);
    }

    // Criar instância do servidor
    console.log(`⬆️  Criando servidor na porta ${porta}...\n`);
    const server = new Server(porta);

    // Inicializar servidor (async - conexão DB, rotas, middlewares)
    console.log("⚙️  Inicializando componentes do servidor...\n");
    await server.init();

    // Iniciar servidor Express
    console.log("\n⚡ Iniciando servidor HTTP...");
    server.run();

  } catch (error: any) {
    console.error("\n❌ ERRO FATAL NA INICIALIZAÇÃO DO SERVIDOR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`Tipo: ${error.constructor?.name || "Unknown"}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.stack) {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Dicas específicas por tipo de erro
    if (error.message.includes("MySQL")) {
      console.error("\n💡 DICAS PARA RESOLVER:");
      console.error("   1. Verifique se o MySQL está rodando:");
      console.error("      - Windows: Abra 'Serviços' e procure por MySQL");
      console.error("      - Linux/Mac: systemctl status mysql ou brew services list");
      console.error("\n   2. Teste a conexão manualmente:");
      console.error(`      mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p`);
      console.error("\n   3. Verifique as credenciais no arquivo .env");
      console.error("\n   4. Certifique-se que o banco de dados existe:");
      console.error(`      CREATE DATABASE ${process.env.DB_NAME};`);
    } else if (error.message.includes("EADDRINUSE")) {
      console.error("\n💡 DICAS PARA RESOLVER:");
      console.error(`   A porta ${process.env.PORT || 3000} já está em uso`);
      console.error("   1. Mude a porta no arquivo .env (PORT=3001)");
      console.error("   2. Ou encerre o processo que está usando a porta:");
      console.error(`      - Windows: netstat -ano | findstr :${process.env.PORT || 3000}`);
      console.error(`      - Linux/Mac: lsof -i :${process.env.PORT || 3000}`);
    }

    console.error("\n📚 Consulte a documentação em .github/copilot-instructions/");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(1);
  }
};

// 🔹 Executar função principal
main();
