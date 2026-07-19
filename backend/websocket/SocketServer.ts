import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { JwtService } from '../utils/JwtService';
import MysqlDatabase from '../database/MysqlDatabase';
import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { MensagemDAO } from '../repositories/mensagem.repository';
import MensagemService from '../services/mensagem.service';
import { registerConversaHandlers } from './conversa.handler';

export class SocketServer {
  static #io: SocketIOServer | null = null;

  static init(httpServer: HttpServer): SocketIOServer {
    console.log('⬆️  SocketServer.init()');

    const io = new SocketIOServer(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      path: '/socket.io',
    });

    // Middleware de autenticação JWT em todas as conexões
    io.use((socket, next) => {
      try {
        const raw = socket.handshake.auth?.token as string | undefined;
        if (!raw) throw new Error('Token não fornecido');
        const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
        const decoded = JwtService.verifyToken(token);
        socket.data.usuario = {
          UsuarioCPF: decoded.UsuarioCPF,
          UsuarioNome: decoded.UsuarioNome,
          UsuarioEmail: decoded.UsuarioEmail,
        };
        next();
      } catch (err: any) {
        next(new Error(err.message || 'Autenticação falhou'));
      }
    });

    const db = new MysqlDatabase();
    const conversaDAO = new ConversaDAO(db);
    const conversaGrupoDAO = new ConversaGrupoDAO(db);
    const mensagemDAO = new MensagemDAO(db);
    const mensagemService = new MensagemService(mensagemDAO, conversaGrupoDAO, conversaDAO);

    io.on('connection', (socket) => {
      const nome = socket.data.usuario?.UsuarioNome ?? 'desconhecido';
      console.log(`🔌 [WS] Conectado: ${nome} (${socket.id})`);

      // Room pessoal do usuário — permite ao NotificacaoService emitir
      // 'notificacao:nova' em tempo real sem o cliente precisar entrar
      // manualmente em nenhuma room (ver NotificacaoService.#emitirTempoReal).
      const usuarioCPF = socket.data.usuario?.UsuarioCPF;
      if (usuarioCPF) {
        socket.join(`usuario:${usuarioCPF}`);
      }

      registerConversaHandlers(io, socket, { conversaDAO, mensagemService });

      socket.on('disconnect', () => {
        console.log(`🔌 [WS] Desconectado: ${nome} (${socket.id})`);
      });
    });

    this.#io = io;
    console.log('✅ WebSocket (Socket.io) inicializado');
    return io;
  }

  // Emite evento para uma room (ConversaGUID) — usado pelos services
  static emit(room: string, event: string, data: any): void {
    if (!this.#io) return;
    this.#io.to(room).emit(event, data);
  }

  static getInstance(): SocketIOServer {
    if (!this.#io) throw new Error('SocketServer não inicializado. Chame init() primeiro.');
    return this.#io;
  }
}
