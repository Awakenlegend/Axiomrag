import express from "express";
import path from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { closeDatabase, runMigrations } from "./db";
import { registerRagRoutes } from "./rag";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "70mb" }));
app.use(express.urlencoded({ extended: false, limit: "70mb" }));
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/api/platform/config.js", (_req, res) => {
  res.type("application/javascript").send("window.__MANUS_CONFIG__ = window.__MANUS_CONFIG__ || {};\n");
});
registerRagRoutes(app);
app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("AxiomRAG request failed:", error instanceof Error ? error.message : error);
  if (res.headersSent) return;
  res.status(500).json({ error: "The request could not be completed. Please retry; if it continues, check the server logs." });
});

async function mountFrontend() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve("vite.config.ts"),
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        const indexHtml = await readFile(path.resolve("client/index.html"), "utf8");
        const html = await vite.transformIndexHtml(req.originalUrl, indexHtml);
        res.status(200).type("html").send(html);
      } catch (error) {
        next(error);
      }
    });
    return;
  }

  const publicDir = path.resolve("dist/public");
  app.use(express.static(publicDir, { index: false, fallthrough: true }));
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

async function prepareDatabase() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await runMigrations();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      console.warn(`Database connection attempt ${attempt + 1} failed; retrying shortly.`);
      await new Promise(resolve => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Database migration could not complete.");
}

async function main() {
  await prepareDatabase();
  await mountFrontend();
  httpServer.listen(port, "0.0.0.0", () => console.log(`AxiomRAG listening on 0.0.0.0:${port}`));
}

void main().catch(async error => {
  console.error("AxiomRAG startup failed:", error instanceof Error ? error.message : error);
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
