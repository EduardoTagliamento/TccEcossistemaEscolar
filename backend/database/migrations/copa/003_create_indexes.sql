-- ============================================
-- SISTEMA DE ÁLBUM DA COPA DO MUNDO 2026
-- Índices Adicionais para Performance
-- ============================================

-- Índices compostos para otimizar buscas frequentes

-- Buscar figurinhas por tipo e grupo
CREATE INDEX IF NOT EXISTS idx_tipo_grupo ON copa_figurinhas(tipo, grupo);

-- Buscar figurinhas faltantes por álbum
CREATE INDEX IF NOT EXISTS idx_album_possui ON copa_status(album_id, possui);

-- Buscar figurinhas por prefixo e número (para ordenação)
CREATE INDEX IF NOT EXISTS idx_prefixo_numero_ordem ON copa_figurinhas(prefixo, numero, ordem_exibicao);

-- Índice full-text para busca de seleções (se necessário no futuro)
-- CREATE FULLTEXT INDEX idx_selecao_ft ON copa_figurinhas(selecao);

-- ============================================
-- ESTATÍSTICAS E ANÁLISE
-- ============================================

-- View para estatísticas gerais
CREATE OR REPLACE VIEW copa_estatisticas_geral AS
SELECT 
  a.nome as album_nome,
  a.nome_display as album_display,
  a.cor as album_cor,
  a.icone as album_icone,
  COUNT(s.id) as total_figurinhas,
  SUM(CASE WHEN s.possui = TRUE THEN 1 ELSE 0 END) as completas,
  SUM(CASE WHEN s.possui = FALSE THEN 1 ELSE 0 END) as faltantes,
  ROUND(SUM(CASE WHEN s.possui = TRUE THEN 1 ELSE 0 END) / COUNT(s.id) * 100, 2) as percentual_completo
FROM copa_albuns a
LEFT JOIN copa_status s ON a.id = s.album_id
GROUP BY a.id, a.nome, a.nome_display, a.cor, a.icone;

-- View para figurinhas faltantes por álbum e grupo
CREATE OR REPLACE VIEW copa_faltantes_por_grupo AS
SELECT 
  a.nome as album_nome,
  a.nome_display as album_display,
  COALESCE(f.grupo, f.tipo) as agrupamento,
  f.codigo,
  f.prefixo,
  f.numero,
  f.tipo,
  f.selecao,
  f.ordem_exibicao
FROM copa_albuns a
JOIN copa_status s ON a.id = s.album_id
JOIN copa_figurinhas f ON s.figurinha_id = f.id
WHERE s.possui = FALSE
ORDER BY a.nome, f.ordem_exibicao;

-- ============================================
-- FIM DOS ÍNDICES E VIEWS
-- ============================================
