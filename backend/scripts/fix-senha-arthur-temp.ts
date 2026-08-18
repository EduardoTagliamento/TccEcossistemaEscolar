// Script temporário — resolve o node_modules corretamente por estar dentro
// do repo (o scratchpad, fora do repo, não resolve mysql2/bcrypt).
// Pode apagar este arquivo depois de rodar.
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const NOVA_SENHA = "MBEV9057";
const HASH = "$2b$10$DBzFXXeqnqTpZ9zOVxJDKe1THRO3X5NlyWLC5QtCIF6xYhEH8h7wm";
const EMAIL = "arthurgfortes98@gmail.com";

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [result]: any = await conn.execute(
    "UPDATE usuario SET UsuarioSenha = ? WHERE UsuarioEmail = ?",
    [HASH, EMAIL]
  );
  console.log(`📝 Linhas atualizadas: ${result.affectedRows}`);

  const [rows]: any = await conn.execute(
    "SELECT UsuarioSenha FROM usuario WHERE UsuarioEmail = ?",
    [EMAIL]
  );
  const confirmado = rows[0] ? bcrypt.compareSync(NOVA_SENHA, rows[0].UsuarioSenha) : false;
  console.log(`✅ Verificação: senha "${NOVA_SENHA}" confere no banco? ${confirmado}`);

  await conn.end();
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
