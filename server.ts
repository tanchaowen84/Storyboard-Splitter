import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Endpoint: Split 3x3 Storyboard
  app.post("/api/split", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ error: "Invalid image metadata" });
      }

      const frameWidth = Math.floor(metadata.width / 3);
      const frameHeight = Math.floor(metadata.height / 3);

      const frames: string[] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const frameBuffer = await image
            .clone()
            .extract({
              left: col * frameWidth,
              top: row * frameHeight,
              width: frameWidth,
              height: frameHeight,
            })
            .png()
            .toBuffer();
          
          frames.push(`data:image/png;base64,${frameBuffer.toString("base64")}`);
        }
      }

      res.json({ frames });
    } catch (error) {
      console.error("Split error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
