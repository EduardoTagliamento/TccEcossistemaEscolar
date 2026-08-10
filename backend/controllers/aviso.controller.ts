import { Request, Response, NextFunction } from 'express';
import { AvisoService } from '../services/aviso.service';
import { AvisoCreateDTO } from '../entities/aviso.model';

export class AvisoController {
  constructor(private avisoService: AvisoService) {}

  // POST /api/aviso - Criar novo aviso
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { EscolaGUID, AvisoTitulo, AvisoConteudo, AvisoAbrangencia, TurmaGUIDs, AnexoGUIDs } = req.body;

      const createDTO: AvisoCreateDTO = {
        EscolaGUID,
        UsuarioGUIDAutor: usuarioGUID,
        AvisoTitulo,
        AvisoConteudo,
        AvisoAbrangencia,
        TurmaGUIDs,
        AnexoGUIDs,
      };

      const aviso = await this.avisoService.criarAviso(createDTO);

      res.status(201).json({
        success: true,
        message: 'Aviso publicado com sucesso',
        data: aviso,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/aviso - Listar avisos enviados (só quem pode enviar)
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { EscolaGUID } = req.query;
      const avisos = await this.avisoService.listarAvisos(EscolaGUID as string, usuarioGUID);

      res.json({ success: true, data: avisos, total: avisos.length });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/aviso/nao-visualizado - Aviso mais recente ainda não visto (banner da home)
  naoVisualizado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { EscolaGUID } = req.query;
      const aviso = await this.avisoService.buscarNaoVisualizadoMaisRecente(EscolaGUID as string, usuarioGUID);

      res.json({ success: true, data: aviso });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/aviso/:guid - Buscar aviso específico (marca como visualizado)
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { guid } = req.params;
      const aviso = await this.avisoService.buscarAviso(guid, usuarioGUID);

      res.json({ success: true, data: aviso });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/aviso/:guid - Excluir aviso
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { guid } = req.params;
      await this.avisoService.excluirAviso(guid, usuarioGUID);

      res.json({ success: true, message: 'Aviso excluído com sucesso' });
    } catch (error) {
      next(error);
    }
  };
}
