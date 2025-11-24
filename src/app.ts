import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/artists", async (req, res) => {
  try {
    const artists = await prisma.artist.findMany();
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve artists" });
  }
});

app.post("/artists", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Artist name is required" });
  }

  try {
    const artist = await prisma.artist.create({
      data: { name },
    });
    res.status(201).json(artist);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Artist with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create artist" });
  }
});

export default app;
