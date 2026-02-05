# Integrações Externas

Esta pasta é destinada a lógicas de integração com serviços externos, como chamadas de APIs de terceiros, webhooks, ou qualquer comunicação fora do sistema.


## Modelo para documentação de cada integração

- **Serviço externo:** Nome do serviço ou API
- **Descrição:** Breve explicação da integração
- **Endpoint utilizado:** URL ou rota do serviço
- **Método HTTP:** GET | POST | PUT | DELETE
- **Exemplo de requisição:**
```json
{
  "param": "valor"
}
```
- **Exemplo de resposta:**
```json
{
  "resultado": "valor"
}
```
- **Observações:**
  - Pontos importantes, restrições ou requisitos de autenticação
