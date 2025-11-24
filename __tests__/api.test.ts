import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";
import { errors } from "../src/constants/errors";
import * as lyricsService from "../src/services/lyricsService";

const prisma = new PrismaClient();

jest.mock("../src/services/lyricsService");

describe("Testes de integração - API Catálogo Musical (S206)", () => {
  let token: string;

  beforeAll(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    try {
      await prisma.$executeRaw`DELETE FROM "Label"`;
    } catch (e) {
      // ignore if table does not exist
    }
    await prisma.user.deleteMany({});

    await request(app).post("/auth/register").send({
      email: "chris@o_brabo.com",
      password: "password123",
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "chris@o_brabo.com",
      password: "password123",
    });

    token = loginResponse.body.token;
  });

  afterEach(async () => {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
    try {
      await prisma.$executeRaw`DELETE FROM "Label"`;
    } catch (e) {
      // ignore if table does not exist
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe("Gestão de Artistas", () => {
    it("Criar artista com dados validos", async () => {
      const response = await request(app)
        .post("/artists")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Lo Borges" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Lo Borges");

      const dbArtist = await prisma.artist.findUnique({
        where: { id: response.body.id },
      });
      expect(dbArtist).toBeTruthy();
    });

    it("Tentar criar artista com nome duplicado", async () => {
      await prisma.artist.create({ data: { name: "Lo Borges" } });

      const response = await request(app)
        .post("/artists")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Lo Borges" });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(errors.NAME_ALREADY_EXISTS);
    });

    it("Tentar criar artista com payload vazio", async () => {
      const response = await request(app)
        .post("/artists")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.REQUIRED_ARTIST_NAME);
    });

    it("Buscar lista de artistas", async () => {
      await prisma.artist.createMany({
        data: [{ name: "Mamonas Assassinas" }, { name: "Natiruts" }],
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

  describe("Gestão de albuns", () => {
    it("Criar álbum para artista existente", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Pink Floyd" },
      });

      const response = await request(app)
        .post("/albums")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "The Wall",
          artistId: artist.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.artistId).toBe(artist.id);
      expect(response.body.name).toBe("The Wall");
    });

    it("Tentar criar álbum para artista inexistente", async () => {
      const response = await request(app)
        .post("/albums")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Artista fantasma",
          artistId: 9999,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(errors.ARTIST_NOT_FOUND);
    });

    it("Listar álbuns de um artista específico", async () => {
      const artist1 = await prisma.artist.create({
        data: { name: "Led Zeppelin" },
      });
      const artist2 = await prisma.artist.create({
        data: { name: "Devo" },
      });

      await prisma.album.create({
        data: { name: "Led Zeppelin IV", artistId: artist1.id },
      });
      await prisma.album.create({
        data: { name: "Whip it", artistId: artist2.id },
      });

      const response = await request(app).get(`/artists/${artist1.id}/albums`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Led Zeppelin IV");
    });
  });

  describe("Gestão de Faixas", () => {
    let albumId: number;

    beforeEach(async () => {
      const artist = await prisma.artist.create({
        data: { name: "Greta Van Fleet" },
      });
      const album = await prisma.album.create({
        data: { name: "Starcatcher", artistId: artist.id },
      });
      albumId = album.id;
    });

    it("Criar faixa com duração válida", async () => {
      const response = await request(app)
        .post("/tracks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "track valida",
          duration: 180,
          albumId: albumId,
        });

      expect(response.status).toBe(201);
      expect(response.body.duration).toBe(180);
    });

    it("Tentar criar faixa com duração negativa", async () => {
      const response = await request(app)
        .post("/tracks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "track negativa",
          duration: -10,
          albumId: albumId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.POSITIVE_DURATION);
    });

    it("Tentar criar faixa com duração zero", async () => {
      const response = await request(app)
        .post("/tracks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "track zero minutos da silva",
          duration: 0,
          albumId: albumId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.INVALID_DURATION);
    });
  });

  describe("Integridade e exclusão", () => {
    it("Excluir artista sem álbuns", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Simone" },
      });

      const response = await request(app)
        .delete(`/artists/${artist.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);

      const check = await prisma.artist.findUnique({
        where: { id: artist.id },
      });
      expect(check).toBeNull();
    });

    it("Tentar excluir artista que possui álbuns", async () => {
      const artist = await prisma.artist.create({
        data: { name: "Sabrina Carpenter" },
      });
      await prisma.album.create({
        data: { name: "SNS", artistId: artist.id },
      });

      const response = await request(app)
        .delete(`/artists/${artist.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(errors.ARTIST_HAS_ALBUMS);

      const check = await prisma.artist.findUnique({
        where: { id: artist.id },
      });
      expect(check).not.toBeNull();
    });
  });

  describe("Integração com serviços externos", () => {
    let trackId: number;

    beforeEach(async () => {
      const artist = await prisma.artist.create({
        data: { name: "Carole King" },
      });
      const album = await prisma.album.create({
        data: { name: "Tapestry", artistId: artist.id },
      });
      const track = await prisma.track.create({
        data: { name: "It's too late", duration: 200, albumId: album.id },
      });
      trackId = track.id;
    });

    it("GET Faixa (API Externa)", async () => {
      (lyricsService.getLyrics as jest.Mock).mockResolvedValue("La la la...");

      const response = await request(app).get(`/tracks/${trackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("lyrics", "La la la...");
    });

    it("Faixa (API Externa Offline/Timeout)", async () => {
      (lyricsService.getLyrics as jest.Mock).mockRejectedValue(
        new Error("API Timeout"),
      );

      const response = await request(app).get(`/tracks/${trackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("lyrics", null);
    });
  });

  describe("Record Labels (Record Label)", () => {
    it("Create label with valid data", async () => {
      const response = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Som Livre", country: "BR" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Som Livre");

      const check = await request(app).get(`/labels/${response.body.id}`);
      expect(check.status).toBe(200);
    });

    it("Creating duplicate label returns 409", async () => {
      await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Som Livre" });

      const response = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Som Livre" });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(errors.NAME_ALREADY_EXISTS);
    });

    it("Creating label with empty payload returns 400", async () => {
      const response = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(errors.REQUIRED_FIELD);
    });

    it("List labels", async () => {
      await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "A" });
      await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "B" });

      const response = await request(app).get("/labels");

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it("Get label by id", async () => {
      const created = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Deck" });

      const response = await request(app).get(`/labels/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Deck");
    });

    it("Update label", async () => {
      const created = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "OldName", country: "US" });

      const response = await request(app)
        .put(`/labels/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "NewName", country: "BR" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("NewName");
      expect(response.body.country).toBe("BR");
    });

    it("Delete label", async () => {
      const created = await request(app)
        .post("/labels")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "ToDelete" });

      const response = await request(app)
        .delete(`/labels/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);

      const check = await request(app).get(`/labels/${created.body.id}`);
      expect(check.status).toBe(404);
    });
  });
});
