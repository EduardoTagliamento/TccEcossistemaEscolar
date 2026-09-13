-- Reverte os nomes reais originais (rode isso depois de tirar os screenshots)

START TRANSACTION;

UPDATE usuario SET UsuarioNome = 'Alice Costa Sette Chiocchetti'        WHERE UsuarioGUID = 'Ya0w5hOQaQny';
UPDATE usuario SET UsuarioNome = 'Arthur Gabriel Gerônimo Fortes'       WHERE UsuarioGUID = 'dG0dHcOXgqzU';
UPDATE usuario SET UsuarioNome = 'Henrique Gouveia Rodrigues'           WHERE UsuarioGUID = 'x_lLwj17QPPs';
UPDATE usuario SET UsuarioNome = 'João Pedro De Castilho Bernardo'      WHERE UsuarioGUID = 'tAwDgMYBRrAs';
UPDATE usuario SET UsuarioNome = 'Maria Bianca De Sousa Goulart'        WHERE UsuarioGUID = 'C5oo9dC6x8JA';
UPDATE usuario SET UsuarioNome = 'Noah Alves Sbarzi Rodrigues'          WHERE UsuarioGUID = 'WHb6xv47bJdH';
UPDATE usuario SET UsuarioNome = 'Marcos Camargo de Aguiar'             WHERE UsuarioGUID = 'r9_RHdg2I8B2';
UPDATE usuario SET UsuarioNome = 'Roberto Salatiel Mendes'              WHERE UsuarioGUID = 'EOKznZNxImL7';
UPDATE usuario SET UsuarioNome = 'Laura Diovana Ramos Passos'          WHERE UsuarioGUID = 'fBZwk0Vo0tuL';
UPDATE usuario SET UsuarioNome = 'Marcio Henrique da Silva'             WHERE UsuarioGUID = 'ym0_DFI5UYnJ';
UPDATE usuario SET UsuarioNome = 'Felipe de Souza Vasconcellos'         WHERE UsuarioGUID = 'Mq-SFuat078X';
UPDATE usuario SET UsuarioNome = 'Carlos Eduardo Diniz Soares'          WHERE UsuarioGUID = 'MzAv07tcmkKk';
UPDATE usuario SET UsuarioNome = 'Farley de Oliveira'                   WHERE UsuarioGUID = '7MpjkI__KODF';
UPDATE usuario SET UsuarioNome = 'Gesiel Rodrigues Vieira'              WHERE UsuarioGUID = 'kiom5LummFSJ';
UPDATE usuario SET UsuarioNome = 'Ana Paula Caetano'                    WHERE UsuarioGUID = 'yUsQGwltYpFA';
UPDATE usuario SET UsuarioNome = 'Eric Nakano'                          WHERE UsuarioGUID = 'Z22AIYLF9koU';
UPDATE usuario SET UsuarioNome = 'Wagner dos Santos Clementino de Jesus' WHERE UsuarioGUID = 'VHsYC1tgVeaI';

-- Confira antes de COMMIT:
SELECT UsuarioGUID, UsuarioNome FROM usuario WHERE UsuarioGUID IN (
  'Ya0w5hOQaQny','dG0dHcOXgqzU','x_lLwj17QPPs','tAwDgMYBRrAs','C5oo9dC6x8JA','WHb6xv47bJdH',
  'r9_RHdg2I8B2','EOKznZNxImL7','fBZwk0Vo0tuL','ym0_DFI5UYnJ','Mq-SFuat078X','MzAv07tcmkKk',
  '7MpjkI__KODF','kiom5LummFSJ','yUsQGwltYpFA','Z22AIYLF9koU','VHsYC1tgVeaI'
);

COMMIT;
-- Se algo parecer errado antes do COMMIT, rode ROLLBACK; em vez de COMMIT;
