import express from "express";
import { PrismaClient } from "@prisma/client";
import { errors } from "./constants/errors";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/artists", async (req, res) => {
  try {
    const artists = await prisma.artist.findMany();
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_RETRIEVE });
  }
});

app.post("/artists", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: errors.REQUIRED_ARTIST_NAME });
  }

  try {
    const artist = await prisma.artist.create({
      data: { name },
    });
    res.status(201).json(artist);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: errors.NAME_ALREADY_EXISTS });
    }
    res.status(500).json({ error: errors.FAILED_TO_CREATE });
  }
});

export default app;
