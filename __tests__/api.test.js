const request = require("supertest");

// PROVISORIO: o sut eh o site abaixo
const apiUrl = "https://jsonplaceholder.typicode.com";

describe("Teste de Integração de API com Jest (S206)", () => {
  it("Deve retornar status 200 e uma lista de usuários ao acessar /users", async () => {
    const response = await request(apiUrl).get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("O primeiro usuário deve ter propriedades obrigatórias (id, name, email)", async () => {
    const response = await request(apiUrl).get("/users");
    const firstUser = response.body[0];

    expect(firstUser).toHaveProperty("id");
    expect(firstUser).toHaveProperty("name");
    expect(firstUser).toHaveProperty("email");
  });

  it("Deve criar um novo post com sucesso (Status 201)", async () => {
    const newPost = {
      title: "Teste Jest S206",
      body: "Conteúdo do teste de integração",
      userId: 1,
    };

    const response = await request(apiUrl).post("/posts").send(newPost);

    expect(response.status).toBe(201);
    expect(response.body.title).toEqual(newPost.title);
  });

  it("Deve retornar status 404 ao tentar acessar uma rota inexistente", async () => {
    const response = await request(apiUrl).get("/rota-que-nao-existe");
    expect(response.status).toBe(404);
  });
});
