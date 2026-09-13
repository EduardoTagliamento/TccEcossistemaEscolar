-- Troca temporária de nomes reais por nomes ficticios (para recapturar screenshots do artigo)
-- Escopo: 17 usuarios do piloto "Colegios UNIVAP - Centro" / turma 3H, identificados por UsuarioGUID
-- Rode isso manualmente (Railway MySQL console ou client). Guarde o script de reversao (2_reverter_nomes_reais.sql).

START TRANSACTION;

UPDATE usuario SET UsuarioNome = 'Alice Ferreira Monteiro'        WHERE UsuarioGUID = 'Ya0w5hOQaQny';
UPDATE usuario SET UsuarioNome = 'Arthur Gabriel Nogueira Lima'   WHERE UsuarioGUID = 'dG0dHcOXgqzU';
UPDATE usuario SET UsuarioNome = 'Rafael Gouveia Martins'         WHERE UsuarioGUID = 'x_lLwj17QPPs';
UPDATE usuario SET UsuarioNome = 'João Pedro Almeida Souza'       WHERE UsuarioGUID = 'tAwDgMYBRrAs';
UPDATE usuario SET UsuarioNome = 'Maria Bianca Ribeiro Duarte'    WHERE UsuarioGUID = 'C5oo9dC6x8JA';
UPDATE usuario SET UsuarioNome = 'Noah Alves Cardoso Pinto'       WHERE UsuarioGUID = 'WHb6xv47bJdH';
UPDATE usuario SET UsuarioNome = 'Marcos Andrade de Oliveira'     WHERE UsuarioGUID = 'r9_RHdg2I8B2';
UPDATE usuario SET UsuarioNome = 'Roberto Salgado Teixeira'       WHERE UsuarioGUID = 'EOKznZNxImL7';
UPDATE usuario SET UsuarioNome = 'Laura Beatriz Ramos Correia'    WHERE UsuarioGUID = 'fBZwk0Vo0tuL';
UPDATE usuario SET UsuarioNome = 'Márcio Vinícius da Rocha'       WHERE UsuarioGUID = 'ym0_DFI5UYnJ';
UPDATE usuario SET UsuarioNome = 'Felipe de Souza Barreto'        WHERE UsuarioGUID = 'Mq-SFuat078X';
UPDATE usuario SET UsuarioNome = 'Carlos Eduardo Diniz Farias'    WHERE UsuarioGUID = 'MzAv07tcmkKk';
UPDATE usuario SET UsuarioNome = 'Farley de Assis Moura'          WHERE UsuarioGUID = '7MpjkI__KODF';
UPDATE usuario SET UsuarioNome = 'Gesiel Rodrigues Nunes'         WHERE UsuarioGUID = 'kiom5LummFSJ';
UPDATE usuario SET UsuarioNome = 'Ana Paula Ribeiro'              WHERE UsuarioGUID = 'yUsQGwltYpFA';
UPDATE usuario SET UsuarioNome = 'Eric Yamada'                    WHERE UsuarioGUID = 'Z22AIYLF9koU';
UPDATE usuario SET UsuarioNome = 'Wagner dos Santos Almeida Prado' WHERE UsuarioGUID = 'VHsYC1tgVeaI';

-- Confira antes de COMMIT:
SELECT UsuarioGUID, UsuarioNome FROM usuario WHERE UsuarioGUID IN (
  'Ya0w5hOQaQny','dG0dHcOXgqzU','x_lLwj17QPPs','tAwDgMYBRrAs','C5oo9dC6x8JA','WHb6xv47bJdH',
  'r9_RHdg2I8B2','EOKznZNxImL7','fBZwk0Vo0tuL','ym0_DFI5UYnJ','Mq-SFuat078X','MzAv07tcmkKk',
  '7MpjkI__KODF','kiom5LummFSJ','yUsQGwltYpFA','Z22AIYLF9koU','VHsYC1tgVeaI'
);

COMMIT;
-- Se algo parecer errado antes do COMMIT, rode ROLLBACK; em vez de COMMIT;
