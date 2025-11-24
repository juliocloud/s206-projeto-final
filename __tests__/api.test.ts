import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

describe("Testes de integração com a API de artistas (S206)", () => {
  beforeAll(async () => {
    await prisma.artist.deleteMany({});
  });

  afterEach(async () => {
    await prisma.artist.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deve criar um artista (POST /artists)", async () => {
    const newArtist = { name: "New Artist Name" };
    const response = await request(app).post("/artists").send(newArtist);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe(newArtist.name);

    const artistInDb = await prisma.artist.findUnique({
      where: { id: response.body.id },
    });
    expect(artistInDb?.name).toBe(newArtist.name);
  });

  it("deve buscar todos os artistas (GET /artists)", async () => {
    await prisma.artist.createMany({
      data: [{ name: "Artist A" }, { name: "Artist B" }],
    });

    const response = await request(app).get("/artists");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(2);
    expect(response.body[0].name).toBe("Artist A");
    expect(response.body[1].name).toBe("Artist B");
  });

  it("deve retornar 400 se o nome do artista ta faltando", async () => {
    const response = await request(app).post("/artists").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Artist name is required");
  });

  it("deve retornar 409 se nome do artista duplicado", async () => {
    const artistName = "Existing Artist";
    await prisma.artist.create({ data: { name: artistName } });

    const response = await request(app)
      .post("/artists")
      .send({ name: artistName });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Artist with this name already exists");
  });
});
