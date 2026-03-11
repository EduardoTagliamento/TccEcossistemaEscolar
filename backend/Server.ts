import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import next from "next";
import MysqlDatabase from "./database/MysqlDatabase";
import ErrorResponse from "./utils/ErrorResponse.js";
import { escolaRouterFactory } from "../routes/escola.routes";
import { usuarioRouterFactory } from "../routes/usuario.routes";
import { escolaxusuarioxfuncaoRouterFactory } from "../routes/escolaxusuarioxfuncao.routes";
import verificacaoEmailRoutes from "../routes/verificacao-email.routes.js";
import authRoutes from "../routes/auth.routes.js";
import uploadRoutes from "../routes/upload.routes.js";
import { CleanupScheduler } from "./services/cleanup.scheduler.js";
import { pool } from "./database/mysql.js";

/**
 * Classe principal do servidor Express.
 * 
 * Responsabilidades:
 * - Inicializar aplicação Express
 * - Configurar middlewares globais (CORS, JSON parser)
 * - Conectar ao banco de dados MySQL
 * - Registrar rotas de recursos (Escola, Turma, etc.)
 * - Configurar tratamento global de erros
 * - Iniciar servidor na porta especificada
 * 
 * Arquitetura:
 * Server → Routes → Controllers → Services → DAOs → Database
 */
export default class Server {
  #porta: number;
  #app: Application;
  #database: MysqlDatabase;
  #scheduler: CleanupScheduler;
  #nextHandler: ((req: Request, res: Response) => Promise<void>) | null;
  #isFrontendUnified: boolean;

  constructor(porta?: number) {
    console.log("⬆️  Server.constructor()");
    this.#porta = porta ?? 3000;
    this.#app = express();
    this.#database = new MysqlDatabase();
    this.#scheduler = new CleanupScheduler();
    this.#nextHandler = null;
    this.#isFrontendUnified = false;
  }

  /**
   * Inicializa o servidor Express:
   * - Configura middlewares globais
   * - Valida conexão com o banco MySQL
   * - Registra todas as rotas
   * - Configura tratamento global de erros
   * - Configura rota 404 para recursos não encontrados
   */
  init = async (): Promise<void> => {
    console.log("⬆️  Server.init()");

    try {
      // 🔹 Middlewares globais
      this.setupGlobalMiddlewares();

      // 🔹 Validação de conexão com banco de dados
      await this.validateDatabaseConnection();

      // 🔹 Middlewares pré-roteamento (logging)
      this.setupPreRoutingMiddlewares();

      // 🔹 Inicialização do frontend Next.js (modo unificado)
      await this.setupUnifiedFrontend();

      // 🔹 Registro de rotas
      this.setupRoutes();

      // 🔹 Rota 404 (deve vir após todas as rotas)
      this.setup404Handler();

      // 🔹 Middleware global de erros (deve ser o último)
      // 🔹 Iniciar agendamentos de limpeza
      this.startScheduledTasks();

      this.setupErrorMiddleware();

      console.log("✅ Servidor inicializado com sucesso");
    } catch (error) {
      console.error("❌ Erro na inicialização do servidor:", error);
      throw error;
    }
  };

  /**
   * Configura middlewares globais do Express.
   * Executado antes de qualquer rota.
   */
  private setupGlobalMiddlewares = (): void => {
    console.log("⬆️  Server.setupGlobalMiddlewares()");
    const uploadsDir = path.resolve(process.cwd(), "uploads");

    // JSON parser - converte body de requisições JSON
    this.#app.use(express.json({ limit: "10mb" }));

    // URL-encoded parser - suporta form-data
    this.#app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // CORS - permite requisições de qualquer origem
    this.#app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Arquivos de upload (logos, imagens enviadas por usuários)
    this.#app.use("/uploads", express.static(uploadsDir));

    console.log("✅ Middlewares globais configurados");
  };

  /**
   * Inicializa o Next.js para servir o frontend no mesmo processo/porta da API.
   */
  private setupUnifiedFrontend = async (): Promise<void> => {
    const frontendDir = path.resolve(process.cwd(), "frontend");
    const hasAppDir = fs.existsSync(path.resolve(frontendDir, "app"));
    const hasPagesDir = fs.existsSync(path.resolve(frontendDir, "pages"));

    if (!hasAppDir && !hasPagesDir) {
      console.warn("⚠️ Frontend Next.js não encontrado. O servidor iniciará somente com API.");
      return;
    }

    const dev = process.env.NODE_ENV !== "production";
    const nextApp = next({ dev, dir: frontendDir });

    await nextApp.prepare();
    this.#nextHandler = nextApp.getRequestHandler() as (req: Request, res: Response) => Promise<void>;
    this.#isFrontendUnified = true;

    console.log(`✅ Frontend Next.js inicializado em modo unificado (${dev ? "dev" : "prod"})`);
  };

  /**
   * Valida se a conexão com o banco de dados está funcional.
   * Lança erro se não conseguir conectar.
   */
  private validateDatabaseConnection = async (): Promise<void> => {
    console.log("⬆️  Server.validateDatabaseConnection()");

    try {
      const pool = await this.#database.getPool();
      const connection = await pool.getConnection();
      
      console.log("✅ Conexão com MySQL estabelecida");
      console.log(`   Host: ${process.env.DB_HOST || "localhost"}`);
      console.log(`   Database: ${process.env.DB_NAME || "tccecossistemaescolar"}`);
      console.log(`   Port: ${process.env.DB_PORT || "3306"}`);
      
      connection.release();
    } catch (error: any) {
      console.error("❌ Erro ao conectar ao banco de dados MySQL");
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Código: ${error.code}`);
      
      if (error.code === "ECONNREFUSED") {
        console.error("   💡 Dica: Verifique se o MySQL está rodando");
        console.error(`   💡 Tente: mysql -u root -p (senha: ${process.env.DB_PASSWORD || "vazia"})`);
      } else if (error.code === "ER_BAD_DB_ERROR") {
        console.error("   💡 Dica: O banco de dados não existe");
        console.error(`   💡 Execute: CREATE DATABASE ${process.env.DB_NAME || "tccecossistemaescolar"};`);
      } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
        console.error("   💡 Dica: Usuário ou senha incorretos");
        console.error(`   💡 Verifique as variáveis de ambiente DB_USER e DB_PASSWORD`);
      }

      throw new Error(`Falha na conexão com MySQL: ${error.message}`);
    }
  };

  /**
   * Configura middlewares executados antes das rotas.
   * Útil para logging e auditoria.
   */
  private setupPreRoutingMiddlewares = (): void => {
    this.#app.use((req: Request, _res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
      
      if (Object.keys(req.query).length > 0) {
        console.log(`   Query Params:`, req.query);
      }
      
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body:`, JSON.stringify(req.body, null, 2));
      }
      
      next();
    });
  };

  /**
   * Registra todas as rotas da aplicação.
   * Organização: /api/{recurso}
   */
  private setupRoutes = (): void => {
    console.log("⬆️  Server.setupRoutes()");

    // Rota de health check
    this.#app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: "Servidor funcionando corretamente",
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || "development",
        },
      });
    });

    // Endpoint informativo da API em modo unificado.
    this.#app.get("/api", (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: "Ecossistema Escolar API",
        data: {
          version: "1.0.0",
          description: "Plataforma educacional inspirada no Google Classroom",
          mode: this.#isFrontendUnified ? "unified (api + frontend)" : "api-only",
          endpoints: {
            health: "/health",
            auth: "/api/auth",
            upload: "/api/upload",
            escola: "/api/escola",
            usuario: "/api/usuario",
            escolaxusuarioxfuncao: "/api/escolaxusuarioxfuncao",
            verificacaoEmail: "/api/verificacao-email",
          },
          frontendMainPagePath: "/ (Next.js app/page.tsx)",
        },
      });
    });

    // Rota raiz agora e a home do frontend (quando Next.js estiver ativo).
    this.#app.get("/", (req: Request, res: Response, nextMiddleware: NextFunction) => {
      if (this.#nextHandler) {
        return this.#nextHandler(req, res);
      }

      return res.status(200).json({
        success: true,
        message: "Ecossistema Escolar API",
        data: {
          version: "1.0.0",
          description: "Plataforma educacional inspirada no Google Classroom",
          mode: "api-only",
          note: "Frontend Next.js não foi inicializado neste ambiente.",
        },
      });
    });

    // 🏫 Rotas de Escola
    const escolaRouter = escolaRouterFactory();
    this.#app.use("/api/escola", escolaRouter);
    console.log("✅ Rotas de Escola registradas em /api/escola");

    // � Rotas de Usuário
    const usuarioRouter = usuarioRouterFactory();
    this.#app.use("/api/usuario", usuarioRouter);
    console.log("✅ Rotas de Usuário registradas em /api/usuario");

    // Rotas de Relacao Escola x Usuario x Funcao
    const escolaxusuarioxfuncaoRouter = escolaxusuarioxfuncaoRouterFactory();
    this.#app.use("/api/escolaxusuarioxfuncao", escolaxusuarioxfuncaoRouter);
    console.log("✅ Rotas de Relacao registradas em /api/escolaxusuarioxfuncao");
    // 📧 Rotas de Verificação de Email
    this.#app.use("/api/verificacao-email", verificacaoEmailRoutes);
    console.log("✅ Rotas de Verificação de Email registradas em /api/verificacao-email");
    
    // 🔐 Rotas de Autenticação
    this.#app.use("/api/auth", authRoutes);
    console.log("✅ Rotas de Autenticação registradas em /api/auth");
    
    // 📤 Rotas de Upload
    this.#app.use("/api/upload", uploadRoutes);
    console.log("✅ Rotas de Upload registradas em /api/upload");

    // Fallback de frontend: qualquer rota não-API/health/uploads vai para o Next.js.
    this.#app.use((req: Request, res: Response, nextMiddleware: NextFunction) => {
      if (!this.#nextHandler) {
        return nextMiddleware();
      }

      if (
        req.path.startsWith("/api") ||
        req.path === "/health" ||
        req.path.startsWith("/uploads")
      ) {
        return nextMiddleware();
      }

      return this.#nextHandler(req, res);
    });
    
    // �🔜 Futuras rotas serão adicionadas aqui
    // this.#app.use("/api/turma", turmaRouter);
    // this.#app.use("/api/professor", professorRouter);
    // this.#app.use("/api/aluno", alunoRouter);

    console.log("✅ Todas as rotas registradas");
  };

  /**
   * Configura handler para rotas não encontradas (404).
   * Deve ser registrado APÓS todas as rotas válidas.
   */
  private setup404Handler = (): void => {
    this.#app.use((req: Request, res: Response, _next: NextFunction) => {
      console.log(`🟡 Rota não encontrada: ${req.method} ${req.path}`);
      
      res.status(404).json({
        success: false,
        message: "Rota não encontrada",
        details: {
          method: req.method,
          path: req.path,
          message: `O endpoint ${req.method} ${req.path} não existe`,
          availableEndpoints: [
            "GET /",
            "GET /health",
            "POST /api/auth/login",
            "GET /api/auth/me",
            "POST /api/auth/logout",
            "POST /api/auth/refresh",
            "POST /api/upload/logo/:EscolaGUID",
            "DELETE /api/upload/logo/:EscolaGUID",
            "GET /api/escola",
            "POST /api/escola",
            "GET /api/escola/:EscolaGUID",
            "PUT /api/escola/:EscolaGUID",
            "DELETE /api/escola/:EscolaGUID",
            "GET /api/usuario",
            "POST /api/usuario",
            "GET /api/usuario/:cpf/escolas",
            "GET /api/usuario/:UsuarioCPF",
            "PUT /api/usuario/:UsuarioCPF",
            "DELETE /api/usuario/:UsuarioCPF",
            "GET /api/escolaxusuarioxfuncao",
            "POST /api/escolaxusuarioxfuncao",
            "GET /api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId",
            "PUT /api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId",
            "DELETE /api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId",
            "POST /api/verificacao-email/solicitar/:UsuarioCPF",
            "POST /api/verificacao-email/validar",
            "POST /api/verificacao-email/reenviar/:UsuarioCPF",
          ],
        },
      });
    });
  };

  /**
   * Middleware global de tratamento de erros.
   * Captura todos os erros lançados nas rotas e middlewares.
   * 
   * Tipos de erro tratados:
   * - ErrorResponse: Erros customizados da aplicação (400, 404, 409, etc.)
   * - SyntaxError: Erros de parsing JSON
   * - Error genérico: Erros não tratados (500)
   */
  private setupErrorMiddleware = (): void => {
    console.log("⬆️  Server.setupErrorMiddleware()");

    this.#app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
      const timestamp = new Date().toISOString();

      // 🔹 ErrorResponse customizado (erros de negócio)
      if (error instanceof ErrorResponse) {
        console.log(`🟡 [${timestamp}] ErrorResponse capturado`);
        console.log(`   Status: ${error.statusCode}`);
        console.log(`   Mensagem: ${error.message}`);
        
        if (error.details) {
          console.log(`   Detalhes:`, error.details);
        }

        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
          timestamp,
        });
      }

      // 🔹 Erro de parsing JSON
      if (error instanceof SyntaxError && "body" in error) {
        console.log(`🟡 [${timestamp}] Erro de parsing JSON`);
        console.log(`   Mensagem: ${error.message}`);

        return res.status(400).json({
          success: false,
          message: "JSON inválido no corpo da requisição",
          details: {
            error: error.message,
            hint: "Verifique se o JSON está bem formatado",
          },
          timestamp,
        });
      }

      // 🔹 Erro genérico (não tratado)
      console.error(`🔴 [${timestamp}] Erro interno não tratado`);
      console.error(`   Tipo: ${error.constructor.name}`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Stack:`, error.stack);

      // Não expor stack trace em produção
      const isDevelopment = process.env.NODE_ENV !== "production";

      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        details: {
          error: isDevelopment ? error.message : "Internal Server Error",
          type: error.constructor.name,
          ...(isDevelopment && { stack: error.stack }),
        },
        timestamp,
      });
    });

    console.log("✅ Middleware de erros configurado");
  };

  /**
   * Inicia tarefas agendadas (cron jobs).
   * Atualmente executa:
   * - Limpeza de códigos de verificação expirados (diariamente às 3h)
   */
  private startScheduledTasks = (): void => {
    console.log("⬆️  Server.startScheduledTasks()");
    
    try {
      this.#scheduler.start();
      console.log(`✅ Agendamentos iniciados: ${this.#scheduler.getActiveTasksCount()} tarefas ativas`);
      
      // Configurar graceful shutdown para parar agendamentos
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error("❌ Erro ao iniciar agendamentos:", error);
      throw error;
    }
  };

  /**
   * Configura handlers para encerramento gracioso do servidor.
   * Para agendamentos e fecha conexões antes de encerrar o processo.
   */
  private setupGracefulShutdown = (): void => {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 [${signal}] Sinal de encerramento recebido`);
      console.log("⏳ Encerrando servidor graciosamente...");
      
      try {
        // Parar agendamentos
        console.log("   🔹 Parando agendamentos...");
        this.#scheduler.stop();
        
        // Fechar conexões com banco
        console.log("   🔹 Fechando conexões com banco...");
        await pool.end();
        
        console.log("✅ Servidor encerrado com sucesso");
        process.exit(0);
        
      } catch (error) {
        console.error("❌ Erro durante encerramento:", error);
        process.exit(1);
      }
    };
    
    // Capturar sinais de encerramento
    process.on("SIGINT", () => shutdown("SIGINT"));  // Ctrl+C
    process.on("SIGTERM", () => shutdown("SIGTERM")); // Docker/Kubernetes
    process.on("SIGHUP", () => shutdown("SIGHUP"));   // Terminal fechado
  };

  /**
   * Inicia o servidor na porta configurada.
   * Exibe informações úteis para desenvolvimento.
   * Abre automaticamente o frontend no navegador padrão.
   */
  run = (): void => {
    this.#app.listen(this.#porta, () => {
      const frontendUrl = `http://localhost:${this.#porta}`;
      
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚀 Ecossistema Escolar - Servidor iniciado");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   🌐 URL: ${frontendUrl}`);
      console.log(`   🏥 Health: http://localhost:${this.#porta}/health`);
      console.log(`   📚 Docs: http://localhost:${this.#porta}/docs/routes/escola-api.md`);
      console.log(`   🏫 API Escola: http://localhost:${this.#porta}/api/escola`);
      console.log(`   ⚙️  Ambiente: ${process.env.NODE_ENV || "development"}`);
      console.log(`   📊 Database: ${process.env.DB_NAME || "tccecossistemaescolar"}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("💡 Pressione Ctrl+C para parar o servidor\n");
      
      // Em produção (ex.: Railway) não há navegador para abrir.
      if (process.env.NODE_ENV !== "production") {
        this.openBrowser(frontendUrl);
      }
    });
  };

  /**
   * Abre o navegador padrão do sistema com a URL especificada.
   * Detecta automaticamente o sistema operacional (Windows, macOS, Linux).
   */
  private openBrowser = (url: string): void => {
    const platform = process.platform;
    let command: string;

    // Detectar sistema operacional e usar comando apropriado
    if (platform === "win32") {
      command = `start ${url}`;
    } else if (platform === "darwin") {
      command = `open ${url}`;
    } else {
      command = `xdg-open ${url}`;
    }

    console.log(`🌍 Abrindo frontend no navegador...\n`);
    
    exec(command, (error) => {
      if (error) {
        console.warn(`⚠️  Não foi possível abrir o navegador automaticamente`);
        console.warn(`   Acesse manualmente: ${url}\n`);
      }
    });
  };

  /**
   * Retorna a instância do Express app.
   * Útil para testes e extensões.
   */
  getApp = (): Application => {
    return this.#app;
  };

  /**
   * Retorna a instância do banco de dados.
   * Útil para operações diretas ou testes.
   */
  getDatabase = (): MysqlDatabase => {
    return this.#database;
  };
}
