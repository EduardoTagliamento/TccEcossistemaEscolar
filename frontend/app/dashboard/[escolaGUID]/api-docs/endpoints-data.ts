/**
 * Conteúdo da documentação da API — portado 1:1 do canvas de design
 * "API Bauá - Documentação.dc.html" (claude.ai/design, projectId
 * f2def45e-d899-4afd-9ff4-0276e1245622, "Bauá — Redesign Frontend (TCC)").
 *
 * Cada entrada é uma rota real do backend (`routes/*.routes.ts`), verificada
 * contra o código na hora da portagem (ex.: escopos de `apikey.model.ts`,
 * `POST /api/auth/refresh` retornando 501 em `auth.controller.ts`). Ao
 * alterar o contrato de uma rota documentada aqui, atualize a entrada
 * correspondente.
 */

export interface EndpointParam {
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  desc: string;
}

export interface EndpointDef {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  titulo: string;
  tags: string[];
  desc: string;
  paramsTitulo: string;
  params: EndpointParam[];
  snippets: { curl: string; js: string; py: string };
  statusOk: string;
  resposta: string;
  escopoApiKey?: string;
}

export const ENDPOINTS: Record<string, EndpointDef> = {
  'auth-login': {
    method: 'POST',
    path: '/api/auth/login',
    titulo: 'Login',
    tags: ['auth'],
    desc: 'Autentica uma pessoa já cadastrada e devolve o JWT usado no cabeçalho Authorization de todas as demais chamadas. O identificador aceita CPF, e-mail ou telefone — o servidor tenta CPF primeiro.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'identifier', tipo: 'string', obrigatorio: true, desc: 'CPF, e-mail ou telefone cadastrado.' },
      { nome: 'senha', tipo: 'string', obrigatorio: true, desc: 'Senha da conta.' },
      { nome: 'lembrar', tipo: 'boolean', obrigatorio: false, desc: 'Se verdadeiro, emite um token de validade estendida.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "identifier": "123.456.789-09",
    "senha": "••••••••"
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    identifier: "123.456.789-09",
    senha: "••••••••",
  }),
});
const { data } = await r.json();
// data.token vai no header Authorization das próximas chamadas`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/auth/login",
    json={"identifier": "123.456.789-09", "senha": "••••••••"},
)
token = r.json()["data"]["token"]`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "UsuarioGUID": "4a1c8e77-95d2-40b3-ae61-7c0f2b98d515",
      "UsuarioNome": "Eduardo Tagliamento Barbosa",
      "UsuarioEmail": "ti.eduardotagliamento@gmail.com",
      "UsuarioCPF": "123.456.789-09",
      "UsuarioEmailVerificado": true,
      "UsuarioIsPlataformaAdmin": false
    }
  }
}`,
  },
  'usuario-criar': {
    method: 'POST',
    path: '/api/usuario',
    titulo: 'Criar cadastro de pessoa',
    tags: ['usuario'],
    desc: 'Cria o cadastro de uma pessoa na plataforma (aluno, professor, responsável) — o vínculo com uma escola e uma turma é um passo separado, feito por matrícula. Só UsuarioNome é obrigatório: o piloto já mostrou que nem todo cadastro chega com CPF.',
    paramsTitulo: 'Corpo da requisição — { usuario: {...} }',
    params: [
      { nome: 'UsuarioNome', tipo: 'string', obrigatorio: true, desc: 'Nome completo.' },
      { nome: 'UsuarioCPF', tipo: 'string', obrigatorio: false, desc: 'Formato 000.000.000-00, normalizado no servidor.' },
      { nome: 'UsuarioEmail', tipo: 'string', obrigatorio: false, desc: 'Até 60 caracteres.' },
      { nome: 'UsuarioTelefone', tipo: 'string', obrigatorio: false, desc: 'Formato (XX) XXXXX-XXXX.' },
      { nome: 'UsuarioDataNascimento', tipo: 'string', obrigatorio: false, desc: 'Formato YYYY-MM-DD.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/usuario \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "usuario": {
      "UsuarioNome": "Beatriz Carvalho Lima",
      "UsuarioEmail": "bia.lima@aluno.br",
      "UsuarioTelefone": "(12) 99845-2210"
    }
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/usuario", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    usuario: {
      UsuarioNome: "Beatriz Carvalho Lima",
      UsuarioEmail: "bia.lima@aluno.br",
      UsuarioTelefone: "(12) 99845-2210",
    },
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/usuario",
    headers={"Authorization": f"Bearer {token}"},
    json={"usuario": {
        "UsuarioNome": "Beatriz Carvalho Lima",
        "UsuarioEmail": "bia.lima@aluno.br",
        "UsuarioTelefone": "(12) 99845-2210",
    }},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Usuário cadastrado com sucesso",
  "data": {
    "usuario": {
      "UsuarioGUID": "9d0b52f3-71ac-4e88-8f14-c6b2a03e7d19",
      "UsuarioNome": "Beatriz Carvalho Lima",
      "UsuarioEmail": "bia.lima@aluno.br",
      "UsuarioStatus": "Ativo"
    },
    "senhaTemporaria": "x7k2-9pqw"
  }
}`,
  },
  'usuario-busca-cpf': {
    method: 'GET',
    path: '/api/usuario/busca-cpf',
    titulo: 'Buscar pessoa por CPF',
    tags: ['usuario'],
    desc: 'Localiza um cadastro existente pelo CPF — usado antes de matricular alguém, pra reaproveitar o cadastro em vez de duplicar.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [{ nome: 'cpf', tipo: 'string', obrigatorio: true, desc: 'CPF a buscar, com ou sem máscara.' }],
    snippets: {
      curl: `curl "https://www.baua.com.br/api/usuario/busca-cpf?cpf=123.456.789-09" \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/usuario/busca-cpf?cpf=123.456.789-09",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/usuario/busca-cpf",
    params={"cpf": "123.456.789-09"},
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "usuario": {
      "UsuarioGUID": "4a1c8e77-95d2-40b3-ae61-7c0f2b98d515",
      "UsuarioNome": "Eduardo Tagliamento Barbosa",
      "UsuarioCPF": "123.456.789-09"
    }
  }
}`,
  },
  'escola-criar': {
    method: 'POST',
    path: '/api/escola',
    titulo: 'Criar escola',
    tags: ['escola'],
    desc: 'Cadastra uma nova instituição no ecossistema. Só EscolaNome é obrigatório — CNPJ, telefone, e-mail e endereço podem ser completados depois.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'EscolaNome', tipo: 'string', obrigatorio: true, desc: 'Nome da instituição.' },
      { nome: 'EscolaCNPJ', tipo: 'string', obrigatorio: false, desc: 'Formato XX.XXX.XXX/XXXX-XX.' },
      { nome: 'EscolaTelefone', tipo: 'string', obrigatorio: false, desc: 'Formato (XX) XXXXX-XXXX.' },
      { nome: 'EscolaEmail', tipo: 'string', obrigatorio: false, desc: 'Até 60 caracteres.' },
      { nome: 'EscolaEndereco', tipo: 'string', obrigatorio: false, desc: 'Até 200 caracteres.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/escola \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "EscolaNome": "Colégio Técnico Antônio Teixeira Fernandes" }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/escola", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ EscolaNome: "Colégio Técnico Antônio Teixeira Fernandes" }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/escola",
    headers={"Authorization": f"Bearer {token}"},
    json={"EscolaNome": "Colégio Técnico Antônio Teixeira Fernandes"},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Escola cadastrada com sucesso",
  "data": {
    "escola": {
      "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
      "EscolaNome": "Colégio Técnico Antônio Teixeira Fernandes"
    }
  }
}`,
  },
  'escola-listar': {
    method: 'GET',
    path: '/api/escola',
    titulo: 'Listar escolas',
    tags: ['escola'],
    desc: 'Retorna as escolas visíveis ao usuário autenticado.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [],
    snippets: {
      curl: `curl https://www.baua.com.br/api/escola \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch("https://www.baua.com.br/api/escola", {
  headers: { Authorization: \`Bearer \${token}\` },
});`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/escola",
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "escolas": [
      { "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "EscolaNome": "Colégio Técnico Antônio Teixeira Fernandes" }
    ]
  }
}`,
  },
  'materia-criar': {
    method: 'POST',
    path: '/api/materia',
    titulo: 'Criar matéria',
    tags: ['materia'],
    desc: 'Cadastra uma matéria na escola. Aceita também { materias: [...] } para lote — nesse caso a resposta muda de formato e traz o resultado item a item.',
    paramsTitulo: 'Corpo da requisição — { materia: {...} }',
    params: [
      { nome: 'MateriaNome', tipo: 'string', obrigatorio: true, desc: 'Entre 3 e 100 caracteres.' },
      { nome: 'MateriaIsTecnica', tipo: 'boolean', obrigatorio: false, desc: 'Marca a matéria como parte do núcleo técnico.' },
      { nome: 'MateriaStatus', tipo: 'string', obrigatorio: false, desc: 'Ativa · Inativa. Padrão: Ativa.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/materia \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "materia": { "MateriaNome": "Programação Visual Básica" } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/materia", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ materia: { MateriaNome: "Programação Visual Básica" } }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/materia",
    headers={"Authorization": f"Bearer {token}"},
    json={"materia": {"MateriaNome": "Programação Visual Básica"}},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Matéria cadastrada com sucesso",
  "data": {
    "materia": {
      "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8",
      "MateriaNome": "Programação Visual Básica",
      "MateriaStatus": "Ativa"
    }
  }
}`,
  },
  'materia-listar': {
    method: 'GET',
    path: '/api/materia',
    titulo: 'Listar matérias',
    tags: ['materia', 'paginado'],
    desc: 'Retorna as matérias da escola. Use professorGUID para restringir a um professor.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola cujas matérias serão listadas.' },
      { nome: 'MateriaStatus', tipo: 'string', obrigatorio: false, desc: 'Ativa · Inativa.' },
      { nome: 'MateriaIsTecnico', tipo: 'boolean', obrigatorio: false, desc: 'Restringe às matérias do núcleo técnico.' },
    ],
    snippets: {
      curl: `curl "https://www.baua.com.br/api/materia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30" \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/materia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/materia",
    params={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30"},
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "materias": [
      { "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", "MateriaNome": "Programação Visual Básica", "MateriaStatus": "Ativa" }
    ]
  }
}`,
  },
  'tarefa-criar': {
    method: 'POST',
    path: '/api/tarefa',
    titulo: 'Criar tarefa',
    tags: ['tarefa'],
    desc: 'Publica uma tarefa para uma lista de matrículas. Existe também /api/tarefa/batch para criar várias de uma vez com o mesmo formato de item.',
    paramsTitulo: 'Corpo da requisição — { tarefa: {...} }',
    params: [
      { nome: 'MatriculasGUID', tipo: 'string[]', obrigatorio: true, desc: 'Matrículas destinatárias da tarefa.' },
      { nome: 'matXprofXturxescGUID', tipo: 'string', obrigatorio: true, desc: 'Vínculo matéria+professor+turma+escola que está publicando.' },
      { nome: 'TarefaTitulo', tipo: 'string', obrigatorio: true, desc: '1 a 128 caracteres.' },
      { nome: 'TarefaConteudo', tipo: 'string', obrigatorio: false, desc: 'Até 1024 caracteres.' },
      { nome: 'TarefaPrazoData', tipo: 'string', obrigatorio: true, desc: 'ISO 8601.' },
      { nome: 'TarefaTipoEntrega', tipo: 'string', obrigatorio: true, desc: 'digital · fisica · lista.' },
      { nome: 'TarefaCompartilhada', tipo: 'boolean', obrigatorio: false, desc: 'Se verdadeiro, os alunos entregam em grupo (ver TarefaMinPessoas/TarefaMaxPessoas).' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/tarefa \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tarefa": {
      "MatriculasGUID": ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"],
      "matXprofXturxescGUID": "a2f9c8e1-77b3-4a90-9e12-5d6f8a3b7c04",
      "TarefaTitulo": "Lista de exercícios 3",
      "TarefaPrazoData": "2026-08-11T23:59:00Z",
      "TarefaTipoEntrega": "digital"
    }
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/tarefa", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tarefa: {
      MatriculasGUID: ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"],
      matXprofXturxescGUID: "a2f9c8e1-77b3-4a90-9e12-5d6f8a3b7c04",
      TarefaTitulo: "Lista de exercícios 3",
      TarefaPrazoData: "2026-08-11T23:59:00Z",
      TarefaTipoEntrega: "digital",
    },
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/tarefa",
    headers={"Authorization": f"Bearer {token}"},
    json={"tarefa": {
        "MatriculasGUID": ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"],
        "matXprofXturxescGUID": "a2f9c8e1-77b3-4a90-9e12-5d6f8a3b7c04",
        "TarefaTitulo": "Lista de exercícios 3",
        "TarefaPrazoData": "2026-08-11T23:59:00Z",
        "TarefaTipoEntrega": "digital",
    }},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": {
    "tarefa": {
      "TarefaGUID": "b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24",
      "TarefaTitulo": "Lista de exercícios 3",
      "TarefaPrazoData": "2026-08-11T23:59:00Z",
      "TarefaTipoEntrega": "digital"
    }
  }
}`,
  },
  'tarefa-marcar-feito': {
    method: 'PATCH',
    path: '/api/tarefa/{TarefaGUID}/marcar-feito',
    titulo: 'Marcar tarefa como feita',
    tags: ['tarefa'],
    desc: 'Chamada pelo próprio aluno pra sinalizar que concluiu uma tarefa sem anexo (ex.: tarefa física). Para entrega digital com arquivo, use a rota de anexo-entrega.',
    paramsTitulo: 'Corpo da requisição',
    params: [{ nome: 'TarefaFeito', tipo: 'boolean', obrigatorio: true, desc: 'true marca como concluída; false desfaz.' }],
    snippets: {
      curl: `curl -X PATCH https://www.baua.com.br/api/tarefa/b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24/marcar-feito \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "TarefaFeito": true }'`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/tarefa/b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24/marcar-feito",
  {
    method: "PATCH",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ TarefaFeito: true }),
  }
);`,
      py: `r = requests.patch(
    "https://www.baua.com.br/api/tarefa/b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24/marcar-feito",
    headers={"Authorization": f"Bearer {token}"},
    json={"TarefaFeito": True},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Tarefa marcada como feita",
  "data": { "TarefaGUID": "b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24", "TarefaFeito": true }
}`,
  },
  'prova-criar': {
    method: 'POST',
    path: '/api/prova',
    titulo: 'Agendar prova',
    tags: ['prova'],
    desc: 'Agenda uma prova para uma matéria — uma prova é criada uma vez e compartilhada por N turmas via tabela intermediária.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'MateriaGUID', tipo: 'string', obrigatorio: true, desc: 'Matéria à qual a prova pertence.' },
      { nome: 'ProvaTitulo', tipo: 'string', obrigatorio: true, desc: 'Título exibido no calendário.' },
      { nome: 'ProvaData', tipo: 'string', obrigatorio: true, desc: 'ISO 8601.' },
      { nome: 'ProvaDescricao', tipo: 'string', obrigatorio: false, desc: 'Conteúdo cobrado, usado também pelo motor de recomendação de estudo.' },
      { nome: 'turmas', tipo: 'string[]', obrigatorio: true, desc: 'Turmas que terão a prova no calendário.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/prova \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8",
    "ProvaTitulo": "P2 - Funções logarítmicas",
    "ProvaData": "2026-08-20T13:00:00Z",
    "turmas": ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"]
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/prova", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    MateriaGUID: "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8",
    ProvaTitulo: "P2 - Funções logarítmicas",
    ProvaData: "2026-08-20T13:00:00Z",
    turmas: ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"],
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/prova",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8",
        "ProvaTitulo": "P2 - Funções logarítmicas",
        "ProvaData": "2026-08-20T13:00:00Z",
        "turmas": ["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"],
    },
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Prova agendada com sucesso",
  "data": {
    "prova": {
      "ProvaAgendadaGUID": "d4f8a921-6c3e-4b17-9a02-8e5c1f9b3d76",
      "ProvaTitulo": "P2 - Funções logarítmicas",
      "ProvaData": "2026-08-20T13:00:00Z",
      "ProvaStatus": "Agendada"
    }
  }
}`,
  },
  'prova-recomendacao': {
    method: 'GET',
    path: '/api/prova/{ProvaAgendadaGUID}/recomendacao',
    titulo: 'Recomendação de estudo (IA)',
    tags: ['prova', 'ia'],
    desc: 'Devolve o material de estudo gerado por IA para a prova: vídeos reais do YouTube, um resumo restrito ao conteúdo publicado pelo professor, e as fontes usadas. O resultado é cacheado por prova — todas as turmas compartilham a mesma recomendação.',
    paramsTitulo: 'Parâmetros',
    params: [],
    snippets: {
      curl: `curl https://www.baua.com.br/api/prova/d4f8a921-6c3e-4b17-9a02-8e5c1f9b3d76/recomendacao \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/prova/d4f8a921-6c3e-4b17-9a02-8e5c1f9b3d76/recomendacao",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/prova/d4f8a921-6c3e-4b17-9a02-8e5c1f9b3d76/recomendacao",
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "recomendacao": {
      "StatusGeracao": "Concluida",
      "ResumoTexto": "A prova cobre função logarítmica e suas propriedades...",
      "VideosJson": [
        { "titulo": "Função logarítmica! Bora pro mundo dos LOGARITMOS?", "url": "https://youtube.com/watch?v=...", "canal": "Matemática com Rafa Jesus" }
      ],
      "FontesUsadas": [
        { "tipo": "Conteudo", "guid": "e5c1f772-...", "rotulo": "Aula 10 - Logaritmos" }
      ]
    }
  }
}`,
  },
  'calendario-dia': {
    method: 'GET',
    path: '/api/calendario/dia/{data}',
    titulo: 'Agenda de um dia',
    tags: ['calendario'],
    desc: 'Agrega, num único retorno, tudo que cai numa data: eventos, provas agendadas, prazos de tarefa e anotações pessoais. É o que alimenta o modal de dia do calendário no app.',
    paramsTitulo: 'Parâmetros de rota',
    params: [{ nome: 'data', tipo: 'string', obrigatorio: true, desc: 'Formato YYYY-MM-DD.' }],
    snippets: {
      curl: `curl https://www.baua.com.br/api/calendario/dia/2026-08-20 \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/calendario/dia/2026-08-20",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/calendario/dia/2026-08-20",
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "eventos": [],
    "provas": [ { "ProvaAgendadaGUID": "d4f8a921-6c3e-4b17-9a02-8e5c1f9b3d76", "ProvaTitulo": "P2 - Funções logarítmicas" } ],
    "tarefas": [],
    "anotacoes": []
  }
}`,
  },
  'conversa-individual': {
    method: 'POST',
    path: '/api/conversa/individual',
    titulo: 'Iniciar (ou recuperar) conversa individual',
    tags: ['conversa'],
    desc: 'Idempotente: se já existe uma conversa individual entre os dois usuários, devolve ela em vez de criar outra. Enviar mensagem de texto é feito por WebSocket, não por esta rota — esta só garante que a conversa exista.',
    paramsTitulo: 'Corpo da requisição',
    params: [{ nome: 'UsuarioGUID', tipo: 'string', obrigatorio: true, desc: 'A outra pessoa da conversa.' }],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/conversa/individual \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "UsuarioGUID": "c9e2a740-1b5d-4f83-9c6a-7d0e4f2b8a91" }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/conversa/individual", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ UsuarioGUID: "c9e2a740-1b5d-4f83-9c6a-7d0e4f2b8a91" }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/conversa/individual",
    headers={"Authorization": f"Bearer {token}"},
    json={"UsuarioGUID": "c9e2a740-1b5d-4f83-9c6a-7d0e4f2b8a91"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": { "conversa": { "ConversaGUID": "7fa1c920-4e83-4b7a-9c1d-2e6f8a3b5d70", "criada": false } }
}`,
  },
  'notificacao-contador': {
    method: 'GET',
    path: '/api/notificacao/contador',
    titulo: 'Contador de notificações não lidas',
    tags: ['notificacao'],
    desc: 'Retorna só o total — usado pelo badge do sino no header, chamado com frequência.',
    paramsTitulo: 'Parâmetros',
    params: [],
    snippets: {
      curl: `curl https://www.baua.com.br/api/notificacao/contador \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch("https://www.baua.com.br/api/notificacao/contador", {
  headers: { Authorization: \`Bearer \${token}\` },
});`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/notificacao/contador",
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": { "total": 3 }
}`,
  },
  'aviso-criar': {
    method: 'POST',
    path: '/api/aviso',
    titulo: 'Publicar aviso',
    tags: ['aviso'],
    desc: 'Publica um comunicado pra escola inteira ou pra turmas específicas. Repare que a abrangência é capitalizada — "Escola"/"Turmas", não minúsculo.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola de origem do aviso.' },
      { nome: 'AvisoTitulo', tipo: 'string', obrigatorio: true, desc: 'Assunto do comunicado.' },
      { nome: 'AvisoConteudo', tipo: 'string', obrigatorio: true, desc: 'Corpo em texto simples.' },
      { nome: 'AvisoAbrangencia', tipo: 'string', obrigatorio: true, desc: '"Escola" ou "Turmas".' },
      { nome: 'TurmaGUIDs', tipo: 'string[]', obrigatorio: false, desc: 'Obrigatório quando AvisoAbrangencia = "Turmas".' },
      { nome: 'AnexoGUIDs', tipo: 'string[]', obrigatorio: false, desc: 'Anexos já enviados previamente.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/aviso \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
    "AvisoTitulo": "Reunião de pais no dia 20",
    "AvisoConteudo": "Teremos reunião geral no dia 20/08 às 19h no auditório.",
    "AvisoAbrangencia": "Escola"
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/aviso", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    EscolaGUID: "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
    AvisoTitulo: "Reunião de pais no dia 20",
    AvisoConteudo: "Teremos reunião geral no dia 20/08 às 19h no auditório.",
    AvisoAbrangencia: "Escola",
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/aviso",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
        "AvisoTitulo": "Reunião de pais no dia 20",
        "AvisoConteudo": "Teremos reunião geral no dia 20/08 às 19h no auditório.",
        "AvisoAbrangencia": "Escola",
    },
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Aviso publicado com sucesso",
  "data": {
    "aviso": {
      "AvisoGUID": "7c2e91d4-88b0-4f37-a6d5-3e14b9027fa1",
      "AvisoTitulo": "Reunião de pais no dia 20",
      "AvisoAbrangencia": "Escola"
    }
  }
}`,
  },
  'projeto-criar': {
    method: 'POST',
    path: '/api/projeto',
    titulo: 'Criar projeto',
    tags: ['projeto'],
    desc: 'Cria uma feira técnica, hackathon ou projeto similar. Alunos elegíveis formam grupos dentro das regras de tamanho definidas aqui.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'ProjetoTitulo', tipo: 'string', obrigatorio: true, desc: 'Até 128 caracteres.' },
      { nome: 'ProjetoDescricao', tipo: 'string', obrigatorio: true, desc: 'A ideia do projeto, até 2048 caracteres.' },
      { nome: 'ProjetoPublicoAlvo', tipo: 'string', obrigatorio: false, desc: '"Escola" ou "Turmas". Padrão: Turmas.' },
      { nome: 'ProjetoGrupoMinPessoas', tipo: 'integer', obrigatorio: false, desc: 'Padrão: 1.' },
      { nome: 'ProjetoGrupoMaxPessoas', tipo: 'integer', obrigatorio: true, desc: 'Deve ser ≥ ProjetoGrupoMinPessoas.' },
      { nome: 'ProjetoInscricaoPrazoData', tipo: 'string', obrigatorio: true, desc: 'Prazo pra criar/entrar em grupos. ISO 8601.' },
      { nome: 'ProjetoEntregaPrazoData', tipo: 'string', obrigatorio: false, desc: 'Prazo final do projeto, pode ser posterior ao de inscrição.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/projeto \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ProjetoTitulo": "Horta Inteligente",
    "ProjetoDescricao": "Sistema de irrigação automatizado com sensores.",
    "ProjetoGrupoMinPessoas": 2,
    "ProjetoGrupoMaxPessoas": 5,
    "ProjetoInscricaoPrazoData": "2026-09-04T23:59:00Z"
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/projeto", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    ProjetoTitulo: "Horta Inteligente",
    ProjetoDescricao: "Sistema de irrigação automatizado com sensores.",
    ProjetoGrupoMinPessoas: 2,
    ProjetoGrupoMaxPessoas: 5,
    ProjetoInscricaoPrazoData: "2026-09-04T23:59:00Z",
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/projeto",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "ProjetoTitulo": "Horta Inteligente",
        "ProjetoDescricao": "Sistema de irrigação automatizado com sensores.",
        "ProjetoGrupoMinPessoas": 2,
        "ProjetoGrupoMaxPessoas": 5,
        "ProjetoInscricaoPrazoData": "2026-09-04T23:59:00Z",
    },
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Projeto criado com sucesso",
  "data": {
    "projeto": {
      "ProjetoGUID": "2f60a8c5-19b7-4e0d-95a3-6c81d4e7b302",
      "ProjetoTitulo": "Horta Inteligente",
      "ProjetoStatus": "Aberto"
    }
  }
}`,
  },
  'pendencia-listar': {
    method: 'GET',
    path: '/api/pendencia',
    titulo: 'Listar pendências',
    tags: ['pendencia', 'paginado'],
    desc: 'Retorna pendências administrativas (documentos, formulários, cobranças) filtráveis por status e atraso.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola das pendências.' },
      { nome: 'PendenciaFeito', tipo: 'boolean', obrigatorio: false, desc: 'Filtra por concluída ou não.' },
      { nome: 'atrasadas', tipo: 'boolean', obrigatorio: false, desc: 'Só as que já passaram do prazo.' },
      { nome: 'limit', tipo: 'integer', obrigatorio: false, desc: 'Itens por página.' },
      { nome: 'offset', tipo: 'integer', obrigatorio: false, desc: 'Deslocamento da página.' },
    ],
    snippets: {
      curl: `curl "https://www.baua.com.br/api/pendencia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30&atrasadas=true" \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/pendencia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30&atrasadas=true",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/pendencia",
    params={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "atrasadas": "true"},
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Executado com sucesso",
  "data": { "pendencias": [], "total": 0 }
}`,
  },
  'turma-criar': {
    method: 'POST',
    path: '/api/turma',
    titulo: 'Criar turma',
    tags: ['turma'],
    desc: 'Cadastra uma turma da escola, opcionalmente vinculada a um curso técnico.',
    paramsTitulo: 'Corpo da requisição — { turma: {...} }',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola da turma.' },
      { nome: 'TurmaSerie', tipo: 'string', obrigatorio: true, desc: 'Ex.: "3º Ano".' },
      { nome: 'TurmaNome', tipo: 'string', obrigatorio: true, desc: 'Ex.: "3º Ano A".' },
      { nome: 'TurmaIsTecnico', tipo: 'boolean', obrigatorio: true, desc: 'Se é uma turma do núcleo técnico.' },
      { nome: 'TurmaStatus', tipo: 'string', obrigatorio: false, desc: 'Ativa · Inativa · Encerrada.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/turma \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "turma": { "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "TurmaSerie": "3º Ano", "TurmaNome": "3º Ano A", "TurmaIsTecnico": false } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/turma", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    turma: { EscolaGUID: "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", TurmaSerie: "3º Ano", TurmaNome: "3º Ano A", TurmaIsTecnico: false },
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/turma",
    headers={"Authorization": f"Bearer {token}"},
    json={"turma": {"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "TurmaSerie": "3º Ano", "TurmaNome": "3º Ano A", "TurmaIsTecnico": False}},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Turma criada com sucesso",
  "data": { "turma": { "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "TurmaSerie": "3º Ano", "TurmaNome": "3º Ano A", "TurmaIsTecnico": false, "TurmaStatus": "Ativa" } }
}`,
  },
  'matricula-criar': {
    method: 'POST',
    path: '/api/matricula',
    titulo: 'Matricular aluno em turma',
    tags: ['matricula'],
    desc: 'Cria a matrícula que vincula um aluno (por UsuarioGUID ou CPF) a uma turma. É a matrícula — não o UsuarioGUID isolado — que aparece como destinatária de tarefas, provas e avisos por turma.',
    paramsTitulo: 'Corpo da requisição — { matricula: {...} }',
    params: [
      { nome: 'UsuarioGUID', tipo: 'string', obrigatorio: false, desc: 'Informe este ou UsuarioCPF.' },
      { nome: 'UsuarioCPF', tipo: 'string', obrigatorio: false, desc: 'Informe este ou UsuarioGUID.' },
      { nome: 'TurmaGUID', tipo: 'string', obrigatorio: true, desc: 'Turma de destino.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/matricula \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "matricula": { "UsuarioCPF": "12345678900", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345" } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/matricula", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ matricula: { UsuarioCPF: "12345678900", TurmaGUID: "c4d5e6f7-1234-4abc-89ab-abcdef012345" } }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/matricula",
    headers={"Authorization": f"Bearer {token}"},
    json={"matricula": {"UsuarioCPF": "12345678900", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345"}},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Matrícula criada com sucesso",
  "data": { "MatriculaGUID": "2026001234", "UsuarioGUID": "9d0b52f371ac", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345", "MatriculaStatus": "Ativa" }
}`,
  },
  'professor-alocar': {
    method: 'POST',
    path: '/api/professor/alocacao',
    titulo: 'Alocar professor em turma',
    tags: ['professor'],
    desc: 'Vincula um professor já cadastrado (UsuarioGUID com papel de Professor na escola) a uma matéria e turma, definindo quantas aulas por semana ele leciona ali.',
    paramsTitulo: 'Corpo da requisição — { alocacao: {...} }',
    params: [
      { nome: 'MateriaGUID', tipo: 'string', obrigatorio: true, desc: 'Matéria lecionada.' },
      { nome: 'TurmaGUID', tipo: 'string', obrigatorio: true, desc: 'Turma alocada.' },
      { nome: 'UsuarioGUID', tipo: 'string', obrigatorio: true, desc: 'Professor a ser alocado.' },
      { nome: 'AulasPorSemana', tipo: 'integer', obrigatorio: false, desc: 'Entre 1 e 20.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/professor/alocacao \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "alocacao": { "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345", "UsuarioGUID": "4a1c8e7795d2", "AulasPorSemana": 5 } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/professor/alocacao", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ alocacao: { MateriaGUID: "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", TurmaGUID: "c4d5e6f7-1234-4abc-89ab-abcdef012345", UsuarioGUID: "4a1c8e7795d2", AulasPorSemana: 5 } }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/professor/alocacao",
    headers={"Authorization": f"Bearer {token}"},
    json={"alocacao": {"MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345", "UsuarioGUID": "4a1c8e7795d2", "AulasPorSemana": 5}},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Alocação criada com sucesso",
  "data": { "MatProfTurGUID": "f1a2b3c4-1234-4abc-89ab-0123456789ab", "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", "TurmaGUID": "c4d5e6f7-1234-4abc-89ab-abcdef012345", "UsuarioGUID": "4a1c8e7795d2", "AlocacaoStatus": "Ativa", "AulasPorSemana": 5 }
}`,
  },
  'escola-configuracao-atualizar': {
    method: 'PUT',
    path: '/api/escola-configuracao/{EscolaGUID}',
    titulo: 'Configurar horário letivo da escola',
    tags: ['escola-configuracao'],
    desc: 'Define o horário-base da escola: minutos por aula, dias letivos, turno da manhã (e da tarde, se houver) e intervalos. É a partir daqui que o cronograma de cada turma é montado.',
    paramsTitulo: 'Corpo da requisição — { configuracao: {...} }',
    params: [
      { nome: 'MinutosPorAula', tipo: 'integer', obrigatorio: true, desc: 'Entre 10 e 180.' },
      { nome: 'DiasSemana', tipo: 'string[]', obrigatorio: true, desc: 'Dias com aula.' },
      { nome: 'PeriodoManhaInicio', tipo: 'string', obrigatorio: true, desc: 'Formato HH:MM.' },
      { nome: 'PeriodoManhaFim', tipo: 'string', obrigatorio: true, desc: 'Formato HH:MM.' },
      { nome: 'TemAulaTarde', tipo: 'boolean', obrigatorio: true, desc: 'Se verdadeiro, exige PeriodoTardeInicio/Fim.' },
    ],
    snippets: {
      curl: `curl -X PUT https://www.baua.com.br/api/escola-configuracao/8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30 \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "configuracao": { "MinutosPorAula": 50, "DiasSemana": ["Segunda","Terca","Quarta","Quinta","Sexta"], "PeriodoManhaInicio": "07:00", "PeriodoManhaFim": "12:20", "TemAulaTarde": false } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/escola-configuracao/8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", {
  method: "PUT",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ configuracao: { MinutosPorAula: 50, DiasSemana: ["Segunda","Terca","Quarta","Quinta","Sexta"], PeriodoManhaInicio: "07:00", PeriodoManhaFim: "12:20", TemAulaTarde: false } }),
});`,
      py: `r = requests.put(
    "https://www.baua.com.br/api/escola-configuracao/8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
    headers={"Authorization": f"Bearer {token}"},
    json={"configuracao": {"MinutosPorAula": 50, "DiasSemana": ["Segunda","Terca","Quarta","Quinta","Sexta"], "PeriodoManhaInicio": "07:00", "PeriodoManhaFim": "12:20", "TemAulaTarde": False}},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Configuração da escola atualizada com sucesso",
  "data": { "configuracao": { "EscolaConfiguracaoGUID": "d290f1ee-6c54-4b01-90e6-d701748f0851", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "MinutosPorAula": 50, "TemAulaTarde": false, "Configurada": true } }
}`,
  },
  'escolaxusuarioxfuncao-vincular': {
    method: 'POST',
    path: '/api/escolaxusuarioxfuncao',
    titulo: 'Vincular pessoa a uma escola',
    tags: ['usuario', 'escola'],
    desc: 'Cria o vínculo entre um UsuarioGUID e uma escola, com um papel (FuncaoId). É este vínculo — não o cadastro em /api/usuario sozinho — que define o que a pessoa pode acessar naquela escola específica.',
    paramsTitulo: 'Corpo da requisição — { escolaxusuarioxfuncao: {...} }',
    params: [
      { nome: 'UsuarioGUID', tipo: 'string', obrigatorio: true, desc: 'Pessoa já cadastrada em /api/usuario.' },
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola do vínculo.' },
      { nome: 'FuncaoId', tipo: 'integer', obrigatorio: true, desc: 'Papel: 1 Coordenação, 3 Professor, 6 Direção, entre outros.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/escolaxusuarioxfuncao \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "escolaxusuarioxfuncao": { "UsuarioGUID": "9d0b52f371ac", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "FuncaoId": 3 } }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/escolaxusuarioxfuncao", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ escolaxusuarioxfuncao: { UsuarioGUID: "9d0b52f371ac", EscolaGUID: "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", FuncaoId: 3 } }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/escolaxusuarioxfuncao",
    headers={"Authorization": f"Bearer {token}"},
    json={"escolaxusuarioxfuncao": {"UsuarioGUID": "9d0b52f371ac", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "FuncaoId": 3}},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Vinculo cadastrado com sucesso",
  "data": { "escolaxusuarioxfuncao": { "EscolaxUsuarioxFuncaoId": 42, "UsuarioGUID": "9d0b52f371ac", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "FuncaoId": 3, "Status": "Ativo" } }
}`,
  },
  'conteudo-criar': {
    method: 'POST',
    path: '/api/conteudo',
    titulo: 'Publicar conteúdo',
    tags: ['conteudo', 'multipart'],
    desc: 'Publica conteúdo didático numa ou mais turmas: texto, arquivo cronometrado ou material paginado. É a única rota de escrita da API que recebe multipart/form-data em vez de JSON.',
    paramsTitulo: 'Campos do multipart/form-data',
    params: [
      { nome: 'MateriaGUID', tipo: 'string', obrigatorio: true, desc: 'Matéria do conteúdo.' },
      { nome: 'ConteudoTitulo', tipo: 'string', obrigatorio: true, desc: 'Mínimo 2 caracteres.' },
      { nome: 'ConteudoTipo', tipo: 'string', obrigatorio: true, desc: 'cronometrado · texto · paginado.' },
      { nome: 'TurmasGUID', tipo: 'string', obrigatorio: true, desc: 'Array de UUIDs serializado como JSON.' },
      { nome: 'ConteudoDataPublicacao', tipo: 'string', obrigatorio: true, desc: 'Data de publicação.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/conteudo \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "MateriaGUID=e5c1f772-4a9d-4b31-8e6c-2d70b9134af8" \\
  -F "ConteudoTitulo=Aula 10 - Logaritmos" \\
  -F "ConteudoTipo=texto" \\
  -F 'TurmasGUID=["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"]' \\
  -F "ConteudoDataPublicacao=2026-09-20" \\
  -F "ConteudoHtml=<p>Resumo da aula...</p>"`,
      js: `const form = new FormData();
form.append("MateriaGUID", "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8");
form.append("ConteudoTitulo", "Aula 10 - Logaritmos");
form.append("ConteudoTipo", "texto");
form.append("TurmasGUID", JSON.stringify(["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"]));
form.append("ConteudoDataPublicacao", "2026-09-20");

const r = await fetch("https://www.baua.com.br/api/conteudo", {
  method: "POST",
  headers: { Authorization: \`Bearer \${token}\` },
  body: form,
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/conteudo",
    headers={"Authorization": f"Bearer {token}"},
    data={
        "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8",
        "ConteudoTitulo": "Aula 10 - Logaritmos",
        "ConteudoTipo": "texto",
        "TurmasGUID": '["c17a4b93-6e02-4d5f-b83a-1f9e07c2d648"]',
        "ConteudoDataPublicacao": "2026-09-20",
    },
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Conteúdo criado com sucesso",
  "data": { "conteudo": { "ConteudoGUID": "9f1e2d3c-4b5a-6789-8cde-f01234567890", "MateriaGUID": "e5c1f772-4a9d-4b31-8e6c-2d70b9134af8", "ConteudoTitulo": "Aula 10 - Logaritmos", "ConteudoTipo": "texto" } }
}`,
  },
  'anexo-enviar': {
    method: 'POST',
    path: '/api/anexo',
    titulo: 'Enviar anexo',
    tags: ['anexo', 'multipart'],
    desc: 'Envia um arquivo (PDF, imagem, documento, planilha — até 50MB) associado a uma escola, usado como anexo de tarefas, avisos e mensagens de conversa.',
    paramsTitulo: 'Campos do multipart/form-data',
    params: [
      { nome: 'file', tipo: 'file', obrigatorio: true, desc: 'Arquivo enviado.' },
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola dona do anexo.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/anexo \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@./prova.pdf;type=application/pdf" \\
  -F "EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30"`,
      js: `const form = new FormData();
form.append("file", arquivoSelecionado);
form.append("EscolaGUID", "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30");

const r = await fetch("https://www.baua.com.br/api/anexo", {
  method: "POST",
  headers: { Authorization: \`Bearer \${token}\` },
  body: form,
});`,
      py: `with open("prova.pdf", "rb") as f:
    r = requests.post(
        "https://www.baua.com.br/api/anexo",
        headers={"Authorization": f"Bearer {token}"},
        data={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30"},
        files={"file": ("prova.pdf", f, "application/pdf")},
    )`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Anexo enviado com sucesso",
  "data": { "anexo": { "AnexoGUID": "a1b2c3d4-e5f6-7890-abcd-ef0123456789", "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "AnexoNomeOriginal": "prova.pdf", "AnexoTamanho": 204800 } }
}`,
  },
  'evento-criar': {
    method: 'POST',
    path: '/api/evento',
    titulo: 'Criar evento no calendário',
    tags: ['evento', 'calendario'],
    desc: 'Cria um evento institucional (reunião, feriado letivo, etc.) no calendário da escola. Restrito a Coordenação, Secretaria e Direção — leitura é livre para qualquer pessoa vinculada.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola do evento.' },
      { nome: 'EventoTitulo', tipo: 'string', obrigatorio: true, desc: 'Entre 3 e 128 caracteres.' },
      { nome: 'EventoData', tipo: 'string', obrigatorio: true, desc: 'ISO 8601.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/evento \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "EventoTitulo": "Reunião de pais", "EventoData": "2026-10-01T00:00:00Z" }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/evento", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ EscolaGUID: "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", EventoTitulo: "Reunião de pais", EventoData: "2026-10-01T00:00:00Z" }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/evento",
    headers={"Authorization": f"Bearer {token}"},
    json={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "EventoTitulo": "Reunião de pais", "EventoData": "2026-10-01T00:00:00Z"},
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Evento criado com sucesso",
  "data": { "evento": { "EventoGUID": "6d7e8f9a-0b1c-4d2e-8f3a-4b5c6d7e8f9a", "EventoTitulo": "Reunião de pais", "EventoData": "2026-10-01T00:00:00.000Z", "EventoStatus": "Agendado" } }
}`,
  },
  'auditoria-listar': {
    method: 'GET',
    path: '/api/auditoria',
    titulo: 'Consultar trilha de auditoria',
    tags: ['auditoria'],
    desc: 'Lista os registros de auditoria (quem alterou o quê, e quando) da escola. Somente leitura: não existe endpoint de escrita — os registros são criados internamente pelo próprio backend a cada operação sensível. Restrito a Coordenação, Secretaria e Direção.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola consultada.' },
      { nome: 'AcaoTipo', tipo: 'string', obrigatorio: false, desc: 'Create · Update · Delete.' },
    ],
    snippets: {
      curl: `curl "https://www.baua.com.br/api/auditoria?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30&AcaoTipo=Update" \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/auditoria?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30&AcaoTipo=Update",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/auditoria",
    params={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30", "AcaoTipo": "Update"},
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Registros de auditoria listados com sucesso",
  "data": { "registros": [ { "RegistroAuditoriaGUID": "4d5e6f7a-8b9c-4012-8d2e-f3a4b5c6d7e8", "UsuarioGUIDAtor": "4a1c8e7795d2", "AcaoTipo": "Update", "EntidadeTipo": "TarefaAcademica" } ], "total": 1 }
}`,
  },
  'chatbot-mensagem': {
    method: 'POST',
    path: '/api/chatbot/mensagem',
    titulo: 'Conversar com o assistente',
    tags: ['ia', 'chatbot'],
    desc: 'Envia uma mensagem de texto ao assistente — o mesmo motor usado no chatbot do WhatsApp — e recebe a resposta gerada. A identidade de quem está falando vem sempre do token; o cliente nunca informa um telefone ou GUID de usuário no corpo.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'mensagem', tipo: 'string', obrigatorio: true, desc: 'Texto enviado ao assistente.' },
      { nome: 'sessionId', tipo: 'string', obrigatorio: false, desc: 'Continua uma conversa existente.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/chatbot/mensagem \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "mensagem": "Quais tarefas eu tenho essa semana?" }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/chatbot/mensagem", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ mensagem: "Quais tarefas eu tenho essa semana?" }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/chatbot/mensagem",
    headers={"Authorization": f"Bearer {token}"},
    json={"mensagem": "Quais tarefas eu tenho essa semana?"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Mensagem processada",
  "data": { "sessionId": "9f8e7d6c-5b4a-4392-8c1d-0e9f8a7b6c5d", "resposta": "Você tem 2 tarefas pendentes esta semana: Lista de exercícios 3 (até sexta) e o resumo de Termoquímica (até domingo)." }
}`,
  },
  'apikey-criar': {
    method: 'POST',
    path: '/api/api-key',
    titulo: 'Emitir chave de API',
    tags: ['apikey', 'direcao'],
    desc: 'Cria uma nova chave de API pra escola — só a Direção pode chamar. O valor completo do token vem em data.chave e só existe nesta resposta; depois disso só o prefixo (ApiKeyPrefixo) fica recuperável.',
    paramsTitulo: 'Corpo da requisição',
    params: [
      { nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola dona da chave.' },
      { nome: 'ApiKeyNome', tipo: 'string', obrigatorio: true, desc: 'Rótulo livre, ex. "Integração Secretaria Digital".' },
      { nome: 'ApiKeyEscopos', tipo: 'string[]', obrigatorio: true, desc: 'Lista de escopos liberados — ver seção Chaves de API.' },
    ],
    snippets: {
      curl: `curl -X POST https://www.baua.com.br/api/api-key \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
    "ApiKeyNome": "Integração Secretaria Digital",
    "ApiKeyEscopos": ["usuario:leitura", "turma:leitura"]
  }'`,
      js: `const r = await fetch("https://www.baua.com.br/api/api-key", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    EscolaGUID: "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
    ApiKeyNome: "Integração Secretaria Digital",
    ApiKeyEscopos: ["usuario:leitura", "turma:leitura"],
  }),
});`,
      py: `r = requests.post(
    "https://www.baua.com.br/api/api-key",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
        "ApiKeyNome": "Integração Secretaria Digital",
        "ApiKeyEscopos": ["usuario:leitura", "turma:leitura"],
    },
)`,
    },
    statusOk: '201 Created',
    resposta: `{
  "success": true,
  "message": "Chave de API criada com sucesso. Copie o valor abaixo agora — ele não será mostrado novamente.",
  "data": {
    "chave": "baua_live_kQ7fV2mZ9Xh3pR8sT1wA6bN0cD4eJ5gK",
    "apiKey": {
      "ApiKeyGUID": "6f3a8b1c-2d4e-4f70-9a1b-3c5d7e9f0a2b",
      "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
      "ApiKeyNome": "Integração Secretaria Digital",
      "ApiKeyPrefixo": "baua_live_kQ7fV2mZ",
      "ApiKeyEscopos": ["usuario:leitura", "turma:leitura"],
      "ApiKeyStatus": "Ativa"
    }
  }
}`,
  },
  'apikey-listar': {
    method: 'GET',
    path: '/api/api-key',
    titulo: 'Listar chaves de API da escola',
    tags: ['apikey', 'direcao'],
    desc: 'Lista as chaves da escola, mascaradas — nunca o segredo/hash, só o prefixo. Só a Direção pode chamar.',
    paramsTitulo: 'Parâmetros de consulta',
    params: [{ nome: 'EscolaGUID', tipo: 'string', obrigatorio: true, desc: 'Escola cujas chaves serão listadas.' }],
    snippets: {
      curl: `curl "https://www.baua.com.br/api/api-key?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30" \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/api-key?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
  { headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.get(
    "https://www.baua.com.br/api/api-key",
    params={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30"},
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Chaves de API listadas com sucesso",
  "data": {
    "chaves": [
      { "ApiKeyGUID": "6f3a8b1c-2d4e-4f70-9a1b-3c5d7e9f0a2b", "ApiKeyNome": "Integração Secretaria Digital", "ApiKeyPrefixo": "baua_live_kQ7fV2mZ", "ApiKeyEscopos": ["usuario:leitura","turma:leitura"], "ApiKeyStatus": "Ativa", "ApiKeyUltimoUsoEm": null }
    ],
    "total": 1
  }
}`,
  },
  'apikey-revogar': {
    method: 'DELETE',
    path: '/api/api-key/{ApiKeyGUID}',
    titulo: 'Revogar chave de API',
    tags: ['apikey', 'direcao'],
    desc: 'Revoga uma chave (soft delete — o registro fica, marcado como Revogada, pra manter o histórico de auditoria). Qualquer integração usando essa chave para de funcionar imediatamente. Só a Direção pode chamar.',
    paramsTitulo: 'Parâmetros de rota',
    params: [{ nome: 'ApiKeyGUID', tipo: 'string', obrigatorio: true, desc: 'Chave a revogar.' }],
    snippets: {
      curl: `curl -X DELETE https://www.baua.com.br/api/api-key/6f3a8b1c-2d4e-4f70-9a1b-3c5d7e9f0a2b \\
  -H "Authorization: Bearer $TOKEN"`,
      js: `const r = await fetch(
  "https://www.baua.com.br/api/api-key/6f3a8b1c-2d4e-4f70-9a1b-3c5d7e9f0a2b",
  { method: "DELETE", headers: { Authorization: \`Bearer \${token}\` } }
);`,
      py: `r = requests.delete(
    "https://www.baua.com.br/api/api-key/6f3a8b1c-2d4e-4f70-9a1b-3c5d7e9f0a2b",
    headers={"Authorization": f"Bearer {token}"},
)`,
    },
    statusOk: '200 OK',
    resposta: `{
  "success": true,
  "message": "Chave de API revogada com sucesso",
  "data": null
}`,
  },
};
