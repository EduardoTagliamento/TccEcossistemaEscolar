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
    UsuarioGUID: string;
    UsuarioNome: string;
    UsuarioEmail: string;
  };

  // join_conversa: entra na room da conversa (valida pertencimento — grupo ou individual)
  socket.on('join_conversa', async ({ ConversaGUID }: { ConversaGUID: string }) => {
    console.log(`🔵 [WS] join_conversa: ${usuario.UsuarioGUID} → ${ConversaGUID}`);
    try {
      const isParticipante = await conversaDAO.isParticipante(ConversaGUID, usuario.UsuarioGUID);
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
      console.log(`🔵 [WS] send_mensagem: ${usuario.UsuarioGUID} → ${ConversaGUID}`);
      try {
        const mensagem = await mensagemService.enviar(
          ConversaGUID,
          usuario.UsuarioGUID,
          MensagemConteudo,
          MensagemTipo || 'Texto'
        );
        io.to(ConversaGUID).emit('nova_mensagem', mensagem);

        // Além da room da conversa (só quem tem a tela de chat aberta nela,
        // via join_conversa), avisa cada participante na sua room pessoal —
        // é o que permite um badge de "mensagem nova" fora da tela de chat
        // (ex.: navbar), sem exigir estar com a conversa aberta.
        const participantes = await conversaDAO.listarParticipantesGUID(ConversaGUID);
        for (const participanteGUID of participantes) {
          if (participanteGUID !== usuario.UsuarioGUID) {
            io.to(`usuario:${participanteGUID}`).emit('mensagem_nao_lida', {
              ConversaGUID,
              MensagemRemetenteGUID: mensagem.MensagemRemetenteGUID,
            });
          }
        }
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao enviar mensagem' });
      }
    }
  );

  // mark_as_read: marca todas as mensagens da conversa como lidas
  socket.on('mark_as_read', async ({ ConversaGUID }: { ConversaGUID: string }) => {
    console.log(`🔵 [WS] mark_as_read: ${usuario.UsuarioGUID} → ${ConversaGUID}`);
    try {
      await mensagemService.marcarComoLida(ConversaGUID, usuario.UsuarioGUID);
      io.to(ConversaGUID).emit('mensagem_lida', {
        ConversaGUID,
        UsuarioGUID: usuario.UsuarioGUID,
        LidaAt: new Date().toISOString(),
      });
    } catch {
      // silently fail — não crítico
    }
  });

  // typing: propaga indicador de digitação para os outros na room
  socket.on(
    'typing',
    async ({ ConversaGUID, isTyping }: { ConversaGUID: string; isTyping: boolean }) => {
      try {
        const isParticipante = await conversaDAO.isParticipante(ConversaGUID, usuario.UsuarioGUID);
        if (!isParticipante) return;

        socket.to(ConversaGUID).emit('usuario_digitando', {
          ConversaGUID,
          UsuarioGUID: usuario.UsuarioGUID,
          UsuarioNome: usuario.UsuarioNome,
          isTyping,
        });
      } catch {
        // silently fail — não crítico
      }
    }
  );

  // pin_mensagem: fixa uma mensagem (grupo e individual)
  // mensagemService emite 'mensagem_fixada' para a room via SocketServer.emit
  socket.on(
    'pin_mensagem',
    async ({ ConversaGUID, MensagemGUID }: { ConversaGUID: string; MensagemGUID: string }) => {
      console.log(`🔵 [WS] pin_mensagem: ${usuario.UsuarioGUID} → ${MensagemGUID}`);
      try {
        await mensagemService.fixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioGUID);
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
      console.log(`🔵 [WS] unpin_mensagem: ${usuario.UsuarioGUID} → ${MensagemGUID}`);
      try {
        await mensagemService.desafixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioGUID);
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
      console.log(`🔵 [WS] deletar_mensagem: ${usuario.UsuarioGUID} → ${MensagemGUID}`);
      try {
        await mensagemService.deletarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioGUID);
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
      console.log(`🔵 [WS] editar_mensagem: ${usuario.UsuarioGUID} → ${MensagemGUID}`);
      try {
        await mensagemService.editarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioGUID, MensagemConteudo);
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
      console.log(`🔵 [WS] reagir_mensagem: ${usuario.UsuarioGUID} → ${MensagemGUID} (${ReacaoEmoji})`);
      try {
        await mensagemService.reagir(MensagemGUID, ConversaGUID, usuario.UsuarioGUID, ReacaoEmoji);
      } catch (err: any) {
        socket.emit('erro', { message: err.message || 'Erro ao reagir à mensagem' });
      }
    }
  );
}
