-- ============================================
-- SISTEMA DE ÁLBUM DA COPA DO MUNDO 2026
-- Criação das Tabelas Base
-- ============================================

-- Tabela de figurinhas do catálogo
CREATE TABLE IF NOT EXISTS copa_figurinhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL COMMENT 'Código da figurinha (GHA01, FWC05, etc)',
  prefixo VARCHAR(5) NOT NULL COMMENT 'Prefixo da figurinha (GHA, FWC, CC, etc)',
  numero INT NOT NULL COMMENT 'Número da figurinha (1, 2, 3...)',
  tipo ENUM('FWC', 'SELECAO', 'COCACOLA') NOT NULL COMMENT 'Tipo da figurinha',
  grupo VARCHAR(20) DEFAULT NULL COMMENT 'Grupo da seleção (Grupo A, B, C...)',
  selecao VARCHAR(50) DEFAULT NULL COMMENT 'Nome da seleção',
  ordem_exibicao INT NOT NULL COMMENT 'Ordem de exibição no álbum',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_codigo (codigo),
  INDEX idx_prefixo (prefixo),
  INDEX idx_tipo (tipo),
  INDEX idx_grupo (grupo),
  UNIQUE KEY uk_prefixo_numero (prefixo, numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Catálogo de 994 figurinhas da Copa 2026';

-- Tabela de álbuns (prata, normal, ouro)
-- Como não há autenticação, teremos apenas 3 álbuns fixos
CREATE TABLE IF NOT EXISTS copa_albuns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome ENUM('prata', 'normal', 'ouro') NOT NULL UNIQUE,
  nome_display VARCHAR(20) NOT NULL COMMENT 'Nome para exibição (Prata, Normal, Ouro)',
  cor VARCHAR(7) NOT NULL COMMENT 'Cor do álbum em hexadecimal',
  icone VARCHAR(10) NOT NULL COMMENT 'Emoji do álbum',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='3 álbuns fixos: Prata, Normal e Ouro';

-- Tabela de status das figurinhas em cada álbum
CREATE TABLE IF NOT EXISTS copa_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_id INT NOT NULL,
  figurinha_id INT NOT NULL,
  possui BOOLEAN DEFAULT FALSE COMMENT 'TRUE = tem a figurinha, FALSE = falta',
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (album_id) REFERENCES copa_albuns(id) ON DELETE CASCADE,
  FOREIGN KEY (figurinha_id) REFERENCES copa_figurinhas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_album_figurinha (album_id, figurinha_id),
  INDEX idx_album_id (album_id),
  INDEX idx_figurinha_id (figurinha_id),
  INDEX idx_possui (possui)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Status de cada figurinha em cada álbum';

-- Inserir os 3 álbuns fixos
INSERT INTO copa_albuns (nome, nome_display, cor, icone) VALUES
('prata', 'Prata', '#C0C0C0', '🥈'),
('normal', 'Normal', '#0066CC', '📘'),
('ouro', 'Ouro', '#FFD700', '🥇');

-- ============================================
-- FIM DA CRIAÇÃO DAS TABELAS
-- ============================================
