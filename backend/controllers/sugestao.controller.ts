import { Request, Response, NextFunction } from 'express';
import { SugestaoService } from '../services/sugestao.service';

export class SugestaoController {
  constructor(private sugestaoService: SugestaoService) {}

  // POST /api/sugestao - Qualquer usuário autenticado pode enviar
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { SugestaoTexto, EscolaGUID, SugestaoPaginaUrl, AnexoGUIDs } = req.body;

      const sugestao = await this.sugestaoService.criarSugestao({
        UsuarioGUID: usuarioGUID,
        EscolaGUID,
        SugestaoTexto,
        SugestaoPaginaUrl,
        AnexoGUIDs,
      });

      res.status(201).json({ success: true, message: 'Sugestão enviada — obrigado!', data: sugestao });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/sugestao - Só admin de plataforma (plataformaAdminGuard)
  index = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sugestoes = await this.sugestaoService.listarSugestoes();
      res.json({ success: true, data: sugestoes, total: sugestoes.length });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/sugestao/:guid - Só admin de plataforma
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { guid } = req.params;
      await this.sugestaoService.excluirSugestao(guid);
      res.json({ success: true, message: 'Sugestão excluída' });
    } catch (error) {
      next(error);
    }
  };
}
