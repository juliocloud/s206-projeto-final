# Trabalho Prático S206 - Jest

Este projeto demonstra o uso da ferramenta **Jest** para testes de Software.
Focamos em **Testes de Integração de API**, evitando testes unitários simples, conforme requisito da disciplina.

## Ferramentas Utilizadas
- **Jest**: Framework de testes (Runner, Assertions).
- **Supertest**: Biblioteca para efetuar requisições HTTP reais para APIs.

## Instalação

1. Certifique-se de ter o Node.js instalado.
2. Execute o comando para instalar as dependências:
   ```bash
   npm install
   ```
   
3. Inicie o container do postgres:
  ```bash
  docker compose up -d
  ```
  
4. Realize as migrations do primsa e gere o client:
  ```bash
  npm run prisma:migrate && npm run prisma:generate
  ```
  
5. Rode o projeto e execute os testes:
  ```bash
  npm run dev 
  npm run test 
  ```
