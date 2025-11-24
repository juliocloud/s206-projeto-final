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
});
