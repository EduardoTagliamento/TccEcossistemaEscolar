import { Server as SocketIOServer, Socket } from 'socket.io';
import { ConversaDAO } from '../repositories/conversa.repository';
import MensagemService from '../services/mensagem.service';

interface HandlerDeps {
  conversaDAO: ConversaDAO;
  mensagemService: MensagemService;
}

export function registerConversaHandlers(
  io: SocketIOServer,
  socket: Socket,
  deps: HandlerDeps
): void {
  const { conversaDAO, mensagemService } = deps;
  const usuario = socket.data.usuario as {
    UsuarioCPF: string;
    UsuarioNome: string;
    UsuarioEmail: string;
  };

  // join_conversa: entra na room da conversa (valida pertencimento — grupo ou individual)
  socket.on('join_conversa', async ({ ConversaGUID }: { ConversaGUID: string }) => {
    console.log(`🔵 [WS] join_conversa: ${usuario.UsuarioCPF} → ${ConversaGUID}`);
    try {
      const isParticipante = await conversaDAO.isParticipante(ConversaGUID, usuario.UsuarioCPF);
      if (!isParticipante) {
        socket.emit('erro', { message: 'Acesso negado a esta conversa' });
        return;
      }
      socket.join(ConversaGUID);
      socket.emit('join_conversa_ok', { ConversaGUID });
    } catch {
      socket.emit('erro', { message: 'Erro ao entrar na conversa' });
    }
  });

  // send_mensagem: persiste e faz broadcast para a room
  // MensagemTipo é opcional (default 'Texto') — para anexo ('Arquivo'/'Imagem'),
  // o cliente já fez upload via POST /api/upload/mensagem/:conversaGUID e manda
  // a URL retornada como MensagemConteudo.
  socket.on(
    'send_mensagem',
    async ({
      ConversaGUID,
      MensagemConteudo,
      MensagemTipo,
    }: {
      ConversaGUID: string;
      MensagemConteudo: string;
      MensagemTipo?: 'Texto' | 'Arquivo' | 'Imagem';
    }) => {
      console.log(`🔵 [WS] send_mensagem: ${usuario.UsuarioCPF} → ${ConversaGUID}`);
      try {
        const mensagem = await mensagemService.enviar(
          ConversaGUID,
          usuario.UsuarioCPF,
          MensagemConteudo,
          MensagemTipo || 'Texto'
        );
        io.to(ConversaGUID).emit('nova_mensagem', mensagem);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao enviar mensagem' });
      }
    }
  );

  // mark_as_read: marca todas as mensagens da conversa como lidas
  socket.on('mark_as_read', async ({ ConversaGUID }: { ConversaGUID: string }) => {
    console.log(`🔵 [WS] mark_as_read: ${usuario.UsuarioCPF} → ${ConversaGUID}`);
    try {
      await mensagemService.marcarComoLida(ConversaGUID, usuario.UsuarioCPF);
      io.to(ConversaGUID).emit('mensagem_lida', {
        ConversaGUID,
        UsuarioCPF: usuario.UsuarioCPF,
        LidaAt: new Date().toISOString(),
      });
    } catch {
      // silently fail — não crítico
    }
  });

  // typing: propaga indicador de digitação para os outros na room
  socket.on(
    'typing',
    ({ ConversaGUID, isTyping }: { ConversaGUID: string; isTyping: boolean }) => {
      socket.to(ConversaGUID).emit('usuario_digitando', {
        ConversaGUID,
        UsuarioCPF: usuario.UsuarioCPF,
        UsuarioNome: usuario.UsuarioNome,
        isTyping,
      });
    }
  );

  // pin_mensagem: fixa uma mensagem (grupo e individual)
  // mensagemService emite 'mensagem_fixada' para a room via SocketServer.emit
  socket.on(
    'pin_mensagem',
    async ({ ConversaGUID, MensagemGUID }: { ConversaGUID: string; MensagemGUID: string }) => {
      console.log(`🔵 [WS] pin_mensagem: ${usuario.UsuarioCPF} → ${MensagemGUID}`);
      try {
        await mensagemService.fixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao fixar mensagem' });
      }
    }
  );

  // unpin_mensagem: desafixa uma mensagem
  // mensagemService emite 'mensagem_desafixada' para a room via SocketServer.emit
  socket.on(
    'unpin_mensagem',
    async ({ ConversaGUID, MensagemGUID }: { ConversaGUID: string; MensagemGUID: string }) => {
      console.log(`🔵 [WS] unpin_mensagem: ${usuario.UsuarioCPF} → ${MensagemGUID}`);
      try {
        await mensagemService.desafixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao desafixar mensagem' });
      }
    }
  );

  // deletar_mensagem: soft-delete (própria ou de outros, se autorizado)
  // mensagemService emite 'mensagem_deletada' via SocketServer.emit
  socket.on(
    'deletar_mensagem',
    async ({ ConversaGUID, MensagemGUID }: { ConversaGUID: string; MensagemGUID: string }) => {
      console.log(`🔵 [WS] deletar_mensagem: ${usuario.UsuarioCPF} → ${MensagemGUID}`);
      try {
        await mensagemService.deletarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao deletar mensagem' });
      }
    }
  );

  // editar_mensagem: edita conteúdo (apenas própria mensagem)
  // mensagemService emite 'mensagem_editada' via SocketServer.emit
  socket.on(
    'editar_mensagem',
    async ({
      ConversaGUID,
      MensagemGUID,
      MensagemConteudo,
    }: {
      ConversaGUID: string;
      MensagemGUID: string;
      MensagemConteudo: string;
    }) => {
      console.log(`🔵 [WS] editar_mensagem: ${usuario.UsuarioCPF} → ${MensagemGUID}`);
      try {
        await mensagemService.editarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF, MensagemConteudo);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao editar mensagem' });
      }
    }
  );

  // reagir_mensagem: adiciona/remove (toggle) a reação do usuário a uma mensagem
  // mensagemService emite 'reacao_atualizada' via SocketServer.emit
  socket.on(
    'reagir_mensagem',
    async ({
      ConversaGUID,
      MensagemGUID,
      ReacaoEmoji,
    }: {
      ConversaGUID: string;
      MensagemGUID: string;
      ReacaoEmoji: string;
    }) => {
      console.log(`🔵 [WS] reagir_mensagem: ${usuario.UsuarioCPF} → ${MensagemGUID} (${ReacaoEmoji})`);
      try {
        await mensagemService.reagir(MensagemGUID, ConversaGUID, usuario.UsuarioCPF, ReacaoEmoji);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao reagir à mensagem' });
      }
    }
  );
}
