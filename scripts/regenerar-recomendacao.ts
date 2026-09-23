// Script one-off: regenera a recomendacao de estudo de uma prova especifica,
// sem precisar mudar ProvaDescricao/assunto/capitulo (o que dispararia
// regeneracao automatica via ProvaAgendadaService.atualizarProva).
// Uso: npx tsx scripts/regenerar-recomendacao.ts <provaAgendadaGUID>
import { getProvaAgendadaRecomendacaoService } from "../backend/services/provaagendadarecomendacao.service";

const provaGUID = process.argv[2];
if (!provaGUID) {
  console.error("uso: npx tsx scripts/regenerar-recomendacao.ts <provaAgendadaGUID>");
  process.exit(1);
}

getProvaAgendadaRecomendacaoService()
  .gerarRecomendacao(provaGUID)
  .then(() => {
    console.log("OK, regeneracao concluida.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
