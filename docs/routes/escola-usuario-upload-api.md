# 🏫 API - Escolas do Usuário

## GET /api/usuario/:cpf/escolas

Retorna todas as escolas vinculadas a um usuário com suas respectivas funções.

### Acesso
Público (não requer autenticação por enquanto - pode ser protegido posteriormente)

### Parâmetros de Rota
- `cpf` (string): CPF do usuário no formato XXX.XXX.XXX-XX

### Resposta de Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Escolas do usuario obtidas com sucesso",
  "data": {
    "escolas": [
      {
        "escola": {
          "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
          "EscolaNome": "Colégio Exemplo",
          "EscolaEmail": "contato@colegio.com.br",
          "EscolaCor1": "00CED1",
          "EscolaCor2": "FFFFFF",
          "EscolaCor3": "000000",
          "EscolaCor4": "FF5733",
          "EscolaLogo": "1710098476-a8c3f2-colegio-exemplo.png"
        },
        "funcoes": [
          {
            "EscolaxUsuarioxFuncaoId": 1,
            "FuncaoId": 1,
            "FuncaoNome": "Coordenacao",
            "DataInicio": "2024-01-15",
            "DataFim": null,
            "Status": "Ativo"
          },
          {
            "EscolaxUsuarioxFuncaoId": 5,
            "FuncaoId": 3,
            "FuncaoNome": "Professor",
            "DataInicio": "2024-02-01",
            "DataFim": null,
            "Status": "Ativo"
          }
        ]
      },
      {
        "escola": {
          "EscolaGUID": "987f6543-e21b-45d3-c654-789012345678",
          "EscolaNome": "Escola Municipal",
          "EscolaEmail": "contato@municipal.gov.br",
          "EscolaCor1": "4CAF50",
          "EscolaCor2": "FFFFFF",
          "EscolaCor3": "212121",
          "EscolaCor4": "FFC107",
          "EscolaLogo": null
        },
        "funcoes": [
          {
            "EscolaxUsuarioxFuncaoId": 12,
            "FuncaoId": 3,
            "FuncaoNome": "Professor",
            "DataInicio": "2023-08-10",
            "DataFim": null,
            "Status": "Ativo"
          }
        ]
      }
    ]
  }
}
```

### Campos Retornados

**escola:**
- `EscolaGUID`: Identificador único da escola
- `EscolaNome`: Nome da escola
- `EscolaEmail`: Email de contato
- `EscolaCor1`, `EscolaCor2`, `EscolaCor3`, `EscolaCor4`: Cores personalizadas do tema (formato HEX sem #)
- `EscolaLogo`: Nome do arquivo do logo (ou null se não houver)

**funcoes (array):**
- `EscolaxUsuarioxFuncaoId`: ID da relação
- `FuncaoId`: ID da função (1=Coordenação, 2=Secretaria, 3=Professor, 4=Responsável, 5=Aluno)
- `FuncaoNome`: Nome da função
- `DataInicio`: Data de início no formato YYYY-MM-DD
- `DataFim`: Data de fim (null se ainda ativo)
- `Status`: "Ativo", "Inativo" ou "Finalizado"

### Exemplo de Requisição

```bash
curl -X GET http://localhost:3000/api/usuario/123.456.789-00/escolas
```

```javascript
const response = await fetch(`http://localhost:3000/api/usuario/${cpf}/escolas`);
const data = await response.json();

console.log(data.data.escolas); // Array de escolas
```

### Casos de Uso

1. **Seleção de Escola**: Após login, mostrar lista de escolas do usuário para escolher qual acessar
2. **Dashboard**: Exibir todas as escolas onde o usuário tem vínculo
3. **Seleção de Função**: Se usuário tem multiplas funções na mesma escola, permitir escolha

### Observações

- Retorna apenas escolas ativas (não deletadas)
- Ordenado por nome da escola
- Um usuário pode ter múltiplas funções na mesma escola
- Um usuário pode estar vinculado a múltiplas escolas

---

# 📤 API - Upload de Logo

## POST /api/upload/logo/:EscolaGUID

Upload de logo para escola (imagem PNG, JPG ou JPEG, máximo 1MB).

### Acesso
Privado - requer autenticação JWT

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Parâmetros
- **Rota**: `EscolaGUID` - GUID da escola
- **FormData**: `logo` - Arquivo de imagem (campo multipart)

### Validações
- ✅ Tipos permitidos: image/png, image/jpeg, image/jpg
- ✅ Tamanho máximo: 1MB
- ✅ Escola deve existir
- ✅ Usuário deve estar autenticado

### Resposta de Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Logo enviado com sucesso",
  "data": {
    "logo": {
      "fileName": "1710098476-a8c3f2-logo-escola.png",
      "filePath": "F:\\...\\uploads\\logos\\1710098476-a8c3f2-logo-escola.png",
      "fileUrl": "/uploads/logos/1710098476-a8c3f2-logo-escola.png",
      "fileSize": 245678,
      "mimeType": "image/png"
    }
  }
}
```

### Erros

**400 - Arquivo não enviado:**
```json
{
  "success": false,
  "message": "Arquivo não fornecido",
  "details": {
    "message": "Nenhum arquivo foi enviado na requisição"
  }
}
```

**400 - Tipo inválido:**
```json
{
  "success": false,
  "message": "Tipo de arquivo inválido",
  "details": {
    "message": "Apenas imagens PNG, JPG e JPEG são permitidas",
    "allowedTypes": ["image/png", "image/jpeg", "image/jpg"],
    "receivedType": "image/gif"
  }
}
```

**400 - Arquivo muito grande:**
```json
{
  "success": false,
  "message": "Arquivo muito grande",
  "details": {
    "message": "O arquivo não pode ser maior que 1MB",
    "maxSize": "1MB"
  }
}
```

**404 - Escola não encontrada:**
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": {
    "message": "Escola com GUID abc123... não existe"
  }
}
```

**401 - Não autenticado:**
```json
{
  "success": false,
  "message": "Token não fornecido",
  "details": {
    "message": "Você precisa estar autenticado para acessar este recurso"
  }
}
```

### Exemplo de Requisição

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/logo/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "logo=@/path/to/logo.png"
```

**JavaScript (FormData):**
```javascript
const token = localStorage.getItem('token');
const escolaGUID = '123e4567-e89b-12d3-a456-426614174000';

const formData = new FormData();
formData.append('logo', fileInput.files[0]);

const response = await fetch(`http://localhost:3000/api/upload/logo/${escolaGUID}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const data = await response.json();
console.log(data.data.logo.fileUrl); // URL para exibir a imagem
```

**React (Input File):**
```jsx
const handleLogoUpload = async (e) => {
  const file = e.target.files[0];
  const token = localStorage.getItem('token');
  const escolaGUID = '123e4567-e89b-12d3-a456-426614174000';
  
  const formData = new FormData();
  formData.append('logo', file);
  
  try {
    const response = await fetch(`/api/upload/logo/${escolaGUID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success) {
      setLogoUrl(data.data.logo.fileUrl); // Atualizar preview
      toast.success('Logo enviado com sucesso!');
    }
  } catch (error) {
    toast.error('Erro ao enviar logo');
  }
};

// JSX
<input 
  type="file" 
  accept="image/png,image/jpeg,image/jpg"
  onChange={handleLogoUpload} 
/>
```

### Comportamento

1. **Arquivo Salvo em Disco**: Armazenado em `uploads/logos/` com nome único
2. **Nome Gerado**: `{timestamp}-{random}-{originalname}` (ex: 1710098476-a8c3f2-logo.png)
3. **Atualização Automática**: Banco atualizado com caminho do arquivo
4. **Substituição**: Se escola já tem logo, arquivo antigo é removido
5. **Rollback**: Se falhar ao atualizar banco, arquivo é removido

### Acessando o Logo

Após upload, o logo pode ser acessado via URL estática:

```
http://localhost:3000/uploads/logos/{fileName}
```

Exemplo:
```html
<img src="/uploads/logos/1710098476-a8c3f2-logo.png" alt="Logo da Escola" />
```

---

## DELETE /api/upload/logo/:EscolaGUID

Remove o logo de uma escola.

### Acesso
Privado - requer autenticação JWT

### Headers
```
Authorization: Bearer {token}
```

### Parâmetros
- **Rota**: `EscolaGUID` - GUID da escola

### Resposta de Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Logo removido com sucesso",
  "data": {
    "removed": true
  }
}
```

### Erros

**400 - Escola sem logo:**
```json
{
  "success": false,
  "message": "Escola não possui logo",
  "details": {
    "message": "Não há logo para remover"
  }
}
```

**404 - Escola não encontrada:**
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": {
    "message": "Escola com GUID abc123... não existe"
  }
}
```

### Exemplo de Requisição

```bash
curl -X DELETE http://localhost:3000/api/upload/logo/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer eyJhbGc..."
```

```javascript
const token = localStorage.getItem('token');
const escolaGUID = '123e4567-e89b-12d3-a456-426614174000';

const response = await fetch(`/api/upload/logo/${escolaGUID}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
```

---

## 📁 Estrutura de Arquivos

```
uploads/
  logos/
    .gitkeep
    1710098476-a8c3f2-colegio-exemplo.png
    1710098523-b5d7e1-escola-municipal.jpg
    ...
```

- Arquivos salvos com nomes únicos
- .gitkeep mantém diretório no git
- Logos não são commitados (devem estar no .gitignore)
- Acesso via `/uploads/logos/{fileName}`

---

## 🔒 Segurança

- Upload protegido por autenticação JWT
- Validação de tipo MIME no servidor
- Limite de tamanho (1MB)
- Nomes de arquivo sanitizados
- Substituição segura de arquivos antigos
- Rollback automático em caso de erro

---

**Última atualização**: Março 2026  
**Versão**: 1.0.0
