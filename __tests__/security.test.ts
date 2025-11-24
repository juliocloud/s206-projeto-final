import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

describe("Testes de segurança e controle de acesso", () => {
  let token: string;

  beforeAll(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    await prisma.user.deleteMany({});

    await request(app).post("/auth/register").send({
      email: "testador@seguranca.google",
      password: "senhasupersegura123",
    });

    const loginRes = await request(app).post("/auth/login").send({
      email: "testador@seguranca.google",
      password: "senhasupersegura123",
    });

    token = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe("Autenticação", () => {
    it("Deve registrar um novo usuário", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "usuario@bolado.com",
        password: "123",
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("email", "usuario@bolado.com");
      expect(res.body).not.toHaveProperty("password");
    });

    it("Não deve registrar email duplicado", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "testador@seguranca.google",
        password: "123",
      });
      expect(res.status).toBe(409);
    });

    it("Login com credenciais erradas deve falhar", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "testador@seguranca.google",
        password: "wrongpassword",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Proteção de rotas", () => {
    it("Não deve permitir criar Artista sem Token", async () => {
      const res = await request(app)
        .post("/artists")
        .send({ name: "Hacker Band" });
      expect(res.status).toBe(401);
    });

    it("Deve permitir criar Artista com Token válido", async () => {
      const res = await request(app)
        .post("/artists")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Secure Band" });

      expect(res.status).toBe(201);
    });

    it("Não deve permitir criar album sem Token", async () => {
      const res = await request(app)
        .post("/albums")
        .send({ name: "Hack Album", artistId: 1 });
      expect(res.status).toBe(401);
    });

    it("Acesso público (GET) deve continuar funcionando sem Token", async () => {
      const res = await request(app).get("/artists");
      expect(res.status).toBe(200);
    });
  });
});
