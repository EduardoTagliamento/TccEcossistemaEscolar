# Documentação de Rotas

Esta pasta contém a documentação das rotas já implementadas no backend do projeto, funcionando como um Swagger manual.

## Modelo para documentação de cada rota

- **Rota:** `/exemplo/rota`
- **Método:** `GET | POST | PUT | DELETE`
- **Descrição:** Breve explicação da finalidade da rota.
- **Parâmetros de entrada:**
  - `param1`: descrição
  - `param2`: descrição
- **Exemplo de requisição:**
```json
{
  "param1": "valor",
  "param2": "valor"
}
```
- **Resposta esperada:**
```json
{
  "resultado": "valor"
}
```
- **Observações:**
  - Pontos importantes ou restrições.

Adicione um arquivo markdown para cada rota seguindo este modelo.