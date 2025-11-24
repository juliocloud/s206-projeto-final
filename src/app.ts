import express from "express";
import { PrismaClient } from "@prisma/client";
import { errors } from "./constants/errors";
import { getLyrics } from "./services/lyricsService";

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

app.delete("/artists/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const albumCount = await prisma.album.count({
      where: { artistId: id },
    });

    if (albumCount > 0) {
      return res.status(409).json({ error: errors.ARTIST_HAS_ALBUMS });
    }

    await prisma.artist.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: errors.ARTIST_NOT_FOUND });
    }
    res.status(500).json({ error: errors.FAILED_TO_CREATE });
  }
});

app.post("/albums", async (req, res) => {
  const { name, artistId } = req.body;

  if (!name || !artistId) {
    return res.status(400).json({ error: errors.REQUIRED_FIELD });
  }

  try {
    const artist = await prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) {
      return res.status(404).json({ error: errors.ARTIST_NOT_FOUND });
    }

    const album = await prisma.album.create({
      data: { name, artistId },
    });
    res.status(201).json(album);
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_CREATE });
  }
});

app.get("/artists/:id/albums", async (req, res) => {
  const artistId = Number(req.params.id);

  try {
    const albums = await prisma.album.findMany({
      where: { artistId },
    });
    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_RETRIEVE });
  }
});

app.post("/tracks", async (req, res) => {
  const { name, duration, albumId } = req.body;

  if (!name || duration === undefined || !albumId) {
    return res.status(400).json({ error: errors.REQUIRED_FIELD });
  }

  if (duration < 0) {
    return res.status(400).json({ error: errors.POSITIVE_DURATION });
  }
  if (duration === 0) {
    return res.status(400).json({ error: errors.INVALID_DURATION });
  }

  try {
    const album = await prisma.album.findUnique({ where: { id: albumId } });
    if (!album) {
      return res.status(404).json({ error: errors.ALBUM_NOT_FOUND });
    }

    const track = await prisma.track.create({
      data: { name, duration, albumId },
    });
    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_CREATE });
  }
});

app.get("/tracks/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      return res.status(404).json({ error: errors.NOT_FOUND });
    }

    // Fetch external lyrics
    let lyrics = null;
    try {
      lyrics = await getLyrics();
    } catch (externalError) {
      console.error("Failed to fetch lyrics, returning null");
      lyrics = null;
    }

    res.json({ ...track, lyrics });
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_RETRIEVE });
  }
});

export default app;
