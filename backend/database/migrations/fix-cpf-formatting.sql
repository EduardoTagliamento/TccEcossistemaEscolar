-- ===============================================================
-- Script de Normalização de CPFs no Banco de Dados
-- ===============================================================
-- Objetivo: Padronizar todos os CPFs para o formato XXX.XXX.XXX-XX
-- Data: 2026-05-18
-- ===============================================================

-- IMPORTANTE: Faça backup do banco antes de executar!

-- Verificar CPFs sem formatação antes da atualização
SELECT 'usuario' AS tabela, COUNT(*) AS quantidade
FROM usuario 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'matricula', COUNT(*)
FROM matricula 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'escolaxusuarioxfuncao', COUNT(*)
FROM escolaxusuarioxfuncao 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'materiaxprofessorxturma', COUNT(*)
FROM materiaxprofessorxturma 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'anexo', COUNT(*)
FROM anexo 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'verificacao_email', COUNT(*)
FROM verificacao_email 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%';

-- ===============================================================
-- INÍCIO DAS ATUALIZAÇÕES
-- ===============================================================

-- 1. Atualizar tabela USUARIO
UPDATE usuario 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- 2. Atualizar tabela MATRICULA
UPDATE matricula 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- 3. Atualizar tabela ESCOLAXUSUARIOXFUNCAO
UPDATE escolaxusuarioxfuncao 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- 4. Atualizar tabela MATERIAXPROFESSORXTURMA (Alocações)
UPDATE materiaxprofessorxturma 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- 5. Atualizar tabela ANEXO
UPDATE anexo 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- 6. Atualizar tabela VERIFICACAO_EMAIL
UPDATE verificacao_email 
SET UsuarioCPF = CONCAT(
  SUBSTRING(UsuarioCPF, 1, 3), '.',
  SUBSTRING(UsuarioCPF, 4, 3), '.',
  SUBSTRING(UsuarioCPF, 7, 3), '-',
  SUBSTRING(UsuarioCPF, 10, 2)
)
WHERE UsuarioCPF REGEXP '^[0-9]{11}$'
  AND UsuarioCPF NOT LIKE '%.%';

-- ===============================================================
-- VERIFICAÇÃO FINAL
-- ===============================================================

-- Verificar se ainda existem CPFs sem formatação
SELECT 'usuario' AS tabela, COUNT(*) AS cpfs_sem_formatacao
FROM usuario 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'matricula', COUNT(*)
FROM matricula 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'escolaxusuarioxfuncao', COUNT(*)
FROM escolaxusuarioxfuncao 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'materiaxprofessorxturma', COUNT(*)
FROM materiaxprofessorxturma 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'anexo', COUNT(*)
FROM anexo 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%'
UNION ALL
SELECT 'verificacao_email', COUNT(*)
FROM verificacao_email 
WHERE UsuarioCPF REGEXP '^[0-9]{11}$' 
  AND UsuarioCPF NOT LIKE '%.%';

-- Amostra de CPFs formatados corretamente
SELECT 'usuario' AS tabela, UsuarioCPF, UsuarioNome
FROM usuario 
WHERE UsuarioCPF LIKE '%.%.%.-%'
LIMIT 5;

SELECT 'matricula' AS tabela, MatriculaGUID, UsuarioCPF
FROM matricula 
WHERE UsuarioCPF LIKE '%.%.%.-%'
LIMIT 5;

-- ===============================================================
-- FIM DO SCRIPT
-- ===============================================================
