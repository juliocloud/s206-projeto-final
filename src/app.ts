import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { errors } from "./constants/errors";
import { getLyrics } from "./services/lyricsService";
import { authenticateToken, SECRET_KEY } from "./middleware/auth";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: errors.REQUIRED_FIELD });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: errors.EMAIL_ALREADY_EXISTS });
    }
    res.status(500).json({ error: errors.FAILED_TO_CREATE });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: errors.REQUIRED_FIELD });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ error: errors.INVALID_CREDENTIALS });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ error: errors.INVALID_CREDENTIALS });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1h",
  });

  res.json({ token });
});

app.get("/artists", async (req, res) => {
  try {
    const artists = await prisma.artist.findMany();
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: errors.FAILED_TO_RETRIEVE });
  }
});

app.post("/artists", authenticateToken, async (req, res) => {
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

app.delete("/artists/:id", authenticateToken, async (req, res) => {
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

app.post("/albums", authenticateToken, async (req, res) => {
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

app.post("/tracks", authenticateToken, async (req, res) => {
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
