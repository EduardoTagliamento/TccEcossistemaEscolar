-- Migration: Qualificação de Professor por Matéria
-- Data: 27/09/2026
-- Ver backend/entities/professormateria.model.ts pro porquê desta tabela existir
-- separada de materiaxprofessorxturma (que exige TurmaGUID/GrupoEletivoGUID
-- obrigatório e não serve pra representar "qualificado, ainda sem turma").

CREATE TABLE professormateria (
  ProfessorMateriaGUID CHAR(36) NOT NULL PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  UsuarioGUID CHAR(12) NOT NULL,
  MateriaGUID CHAR(36) NOT NULL,
  ProfessorMateriaStatus ENUM('Ativa','Inativa') NOT NULL DEFAULT 'Ativa',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_ProfessorMateria_Usuario_Materia (UsuarioGUID, MateriaGUID),
  INDEX idx_professormateria_escola (EscolaGUID),
  INDEX idx_professormateria_usuario (UsuarioGUID),
  INDEX idx_professormateria_materia (MateriaGUID),
  CONSTRAINT FK_ProfessorMateria_Escola FOREIGN KEY (EscolaGUID)
    REFERENCES escola(EscolaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_ProfessorMateria_Usuario FOREIGN KEY (UsuarioGUID)
    REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_ProfessorMateria_Materia FOREIGN KEY (MateriaGUID)
    REFERENCES materia(MateriaGUID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================================
-- EXEMPLO (opcional, não roda sozinho) — como ficaria associar 1 professor a
-- 1 matéria manualmente, já com a EscolaGUID da Colégio Univap - Centro
-- preenchida. Troque UsuarioGUID e MateriaGUID pelos reais antes de rodar
-- (pegue via `SELECT UsuarioGUID FROM usuario WHERE UsuarioNome LIKE '%nome%'`
-- e `SELECT MateriaGUID, MateriaNome FROM materia WHERE EscolaGUID = '...'`).
-- Prefira fazer isso pela UI (gestão-dados > Professores > "Matérias que pode
-- lecionar") — é o mesmo resultado, sem risco de digitar GUID errado.
-- ============================================================================
-- INSERT INTO professormateria
--   (ProfessorMateriaGUID, EscolaGUID, UsuarioGUID, MateriaGUID, ProfessorMateriaStatus, CreatedAt, UpdatedAt)
-- VALUES
--   (UUID(), 'b67a6634-9afd-4fb3-8227-d2569a3db98c', '<UsuarioGUID do professor>', '<MateriaGUID>', 'Ativa', NOW(), NOW());
