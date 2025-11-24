import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

describe("Testes de performance e carga", () => {
  beforeAll(async () => {
    await prisma.artist.create({ data: { name: "Gustavo Lima" } });
  });

  afterAll(async () => {
  try {
    await prisma.track.deleteMany({});
    await prisma.album.deleteMany({});
    await prisma.artist.deleteMany({});
  } catch (e) {
    await prisma.$executeRaw`DELETE FROM "Track"`;
    await prisma.$executeRaw`DELETE FROM "Album"`;
    await prisma.$executeRaw`DELETE FROM "Artist"`;
  }
  await prisma.$disconnect();
  });

  it("Tempo de resposta deve ser bom (< 500ms para teste local)", async () => {
    const start = Date.now();
    const res = await request(app).get("/artists");
    const end = Date.now();
    const duration = end - start;

    expect(res.status).toBe(200);
    console.log(`Tempo de resposta: ${duration}ms`);

    expect(duration).toBeLessThan(500);
  });

  const simularCarga = async (usersCount: number) => {
    const requests = [];
    for (let i = 0; i < usersCount; i++) {
      requests.push(request(app).get("/artists"));
    }

    const start = Date.now();
    const responses = await Promise.all(requests);
    const end = Date.now();

    return {
      duration: end - start,
      failures: responses.filter((r) => r.status !== 200).length,
    };
  };

  // Simula carga para um caminho arbitrário
  const simularCargaPath = async (path: string, usersCount: number) => {
    const requests: Array<Promise<request.Response>> = [];
    for (let i = 0; i < usersCount; i++) {
      requests.push(request(app).get(path));
    }

    const start = Date.now();
    const responses = await Promise.all(requests);
    const end = Date.now();

    return {
      duration: end - start,
      failures: responses.filter((r) => r.status !== 200).length,
    };
  };

  it("Simular carga de 10 usuários ao mesmo temp", async () => {
    const result = await simularCarga(10);
    console.log(`Load Test (10 users): ${result.duration}ms`);

    expect(result.failures).toBe(0);
    expect(result.duration).toBeLessThan(2000);
  });

  it("Simular carga de 50 usuários simultâneos", async () => {
    const result = await simularCarga(50);
    console.log(`Load Test (50 users): ${result.duration}ms`);

    expect(result.failures).toBe(0);
    expect(result.duration).toBeLessThan(5000);
  });

  it("Simular carga de 100 usuários simultâneos", async () => {
    const result = await simularCarga(100);
    console.log(`Load Test (100 users): ${result.duration}ms`);

    expect(result.failures).toBe(0);
    expect(result.duration).toBeLessThan(10000);
  });

  it("Tempo de resposta de /labels deve ser bom (< 500ms)", async () => {
    const start = Date.now();
    const res = await request(app).get("/labels");
    const end = Date.now();
    const duration = end - start;

    expect(res.status).toBe(200);
    console.log(`Tempo de resposta labels: ${duration}ms`);

    expect(duration).toBeLessThan(500);
  });

  it("Simular carga em /labels (50 users)", async () => {
    const result = await simularCargaPath("/labels", 50);
    console.log(`Load Test Labels (50 users): ${result.duration}ms`);

    expect(result.failures).toBe(0);
    expect(result.duration).toBeLessThan(5000);
  });
});
