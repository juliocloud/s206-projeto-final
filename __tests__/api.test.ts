import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";
import { errors } from "../src/constants/errors";
import * as lyricsService from "../src/services/lyricsService";

const prisma = new PrismaClient();

jest.mock("../src/services/lyricsService");

describe("Testes de Integração - API Catálogo Musical (S206)", () => {
  beforeAll(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
  });

  afterEach(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Gestão de Artistas (Artists)", () => {
    it("Criar um artista com dados válidos", async () => {
      const response = await request(app)
        .post("/artists")
        .send({ name: "Queen" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Queen");

      const dbArtist = await prisma.artist.findUnique({
        where: { id: response.body.id },
      });
      expect(dbArtist).toBeTruthy();
    });

    it("Tentar criar artista com nome duplicado", async () => {
      await prisma.artist.create({ data: { name: "Queen" } });

      const response = await request(app)
        .post("/artists")
        .send({ name: "Queen" });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(errors.NAME_ALREADY_EXISTS);
    });

    it("Tentar criar artista com payload vazio", async () => {
      const response = await request(app).post("/artists").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.REQUIRED_ARTIST_NAME);
    });

    it("Buscar lista de artistas (com dados)", async () => {
      await prisma.artist.createMany({
        data: [{ name: "Alee" }, { name: "Brandao" }],
      });

      const response = await request(app).get("/artists");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("Buscar lista de artistas (banco vazio)", async () => {
      const response = await request(app).get("/artists");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("Gestão de Álbuns (Albums)", () => {
    it("Criar álbum para um artista existente", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Milton Nascimento" },
      });

      const response = await request(app).post("/albums").send({
        name: "Clube da Esquina",
        artistId: artist.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.artistId).toBe(artist.id);
      expect(response.body.name).toBe("Clube da esquina");
    });

    it("Tentar criar álbum para artista inexistente", async () => {
      const response = await request(app).post("/albums").send({
        name: "Renaissance",
        artistId: 9999,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(errors.ARTIST_NOT_FOUND);
    });

    it("Listar álbuns de um artista específico", async () => {
      const artist1 = await prisma.artist.create({
        data: { name: "Polyphia" },
      });
      const artist2 = await prisma.artist.create({
        data: { name: "Matue" },
      });

      await prisma.album.create({
        data: { name: "RTYWD", artistId: artist1.id },
      });
      await prisma.album.create({
        data: { name: "Xtranho", artistId: artist2.id },
      });

      const response = await request(app).get(`/artists/${artist1.id}/albums`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Album A1");
    });
  });

  describe("Gestão de Faixas (Tracks)", () => {
    let albumId: number;

    beforeEach(async () => {
      const artist = await prisma.artist.create({
        data: { name: "Periphery" },
      });
      const album = await prisma.album.create({
        data: { name: "Periphery V", artistId: artist.id },
      });
      albumId = album.id;
    });

    it("Criar faixa com duração válida", async () => {
      const response = await request(app).post("/tracks").send({
        name: "Lugar ao sol",
        duration: 180,
        albumId: albumId,
      });

      expect(response.status).toBe(201);
      expect(response.body.duration).toBe(180);
    });

    it("Tentar criar faixa com duração negativa", async () => {
      const response = await request(app).post("/tracks").send({
        name: "Passado de um vilão",
        duration: -10,
        albumId: albumId,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.POSITIVE_DURATION);
    });

    it("Tentar criar faixa com duração zero", async () => {
      const response = await request(app).post("/tracks").send({
        name: "Fiat 1995",
        duration: 0,
        albumId: albumId,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.INVALID_DURATION);
    });
  });

  describe("Integridade e Exclusão", () => {
    it("Excluir artista sem álbuns", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Ana Castela" },
      });

      const response = await request(app).delete(`/artists/${artist.id}`);

      expect(response.status).toBe(204);

      const check = await prisma.artist.findUnique({
        where: { id: artist.id },
      });
      expect(check).toBeNull();
    });

    it("Tentar excluir artista que possui álbuns", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Jorge e Matheus" },
      });
      await prisma.album.create({
        data: { name: "Jorge e Matheus IV", artistId: artist.id },
      });

      const response = await request(app).delete(`/artists/${artist.id}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(errors.ARTIST_HAS_ALBUMS);

      const check = await prisma.artist.findUnique({
        where: { id: artist.id },
      });
      expect(check).not.toBeNull();
    });
  });

  describe("Integração com Serviços Externos", () => {
    let trackId: number;

    beforeEach(async () => {
      const artist = await prisma.artist.create({
        data: { name: "Alee" },
      });
      const album = await prisma.album.create({
        data: { name: "Dias antes do caos", artistId: artist.id },
      });
      const track = await prisma.track.create({
        data: { name: "Segredo", duration: 200, albumId: album.id },
      });
      trackId = track.id;
    });

    it("Faixa (API Externa Online)", async () => {
      (lyricsService.getLyrics as jest.Mock).mockResolvedValue("La la la");

      const response = await request(app).get(`/tracks/${trackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("lyrics", "La la la");
    });

    it("GET Faixa (API Externa Offline/Timeout)", async () => {
      (lyricsService.getLyrics as jest.Mock).mockRejectedValue(
        new Error("API Timeout"),
      );

      const response = await request(app).get(`/tracks/${trackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("lyrics", null);
    });
  });
});
