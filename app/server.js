const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("redis");
const { v4: uuidv4, validate: uuidValidate, version: uuidVersion } = require("uuid");
const crypto = require("crypto");
const path = require("path");
const packageJson = require("./package.json");

const app = express();

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const BRAND_PRIMARY_COLOR = process.env.BRAND_PRIMARY_COLOR || "";
const BRAND_LOGO_URL = process.env.BRAND_LOGO_URL || "";
const BRAND_FAVICON_URL = process.env.BRAND_FAVICON_URL || "";
const BRAND_TITLE = process.env.BRAND_TITLE || "";
const BRAND_TAGLINE = process.env.BRAND_TAGLINE || "";
const BRAND_SITE_TITLE = process.env.BRAND_SITE_TITLE || "";
const RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10);
const RATE_LIMIT_MAX = Number.parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const MAX_EXPIRY_SECONDS = Number.parseInt(process.env.MAX_EXPIRY_SECONDS || "2592000", 10);

const PASSWORD_MAX_LENGTH = 4096;
const SECRET_PREFIX = "secret:";

if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  console.error("ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).")
  process.exit(1);
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");

// Trust reverse proxy headers so rate limiting uses real client IPs.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

// Helmet provides baseline security headers at the app level.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://www.netcue.be", "data:", "https:"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64")
  };
}

function decryptSecret(payload) {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const data = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

function isValidUuidV4(id) {
  return uuidValidate(id) && uuidVersion(id) === 4;
}

app.post("/api/secret", async (req, res, next) => {
  try {
    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const { password, expirySeconds, oneTime, viewsLimit } = req.body || {};

    if (typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({ error: "Password exceeds maximum length" });
    }

    let expiry = Number.parseInt(expirySeconds, 10);
    if (!Number.isInteger(expiry) || expiry <= 0 || expiry > MAX_EXPIRY_SECONDS) {
      return res.status(400).json({ error: "Invalid expirySeconds" });
    }

    let remainingViews;
    if (viewsLimit !== undefined) {
      const parsedViews = Number.parseInt(viewsLimit, 10);
      if (!Number.isInteger(parsedViews) || parsedViews < 1 || parsedViews > 50) {
        return res.status(400).json({ error: "Invalid viewsLimit" });
      }
      remainingViews = parsedViews;
      expiry = MAX_EXPIRY_SECONDS;
    }

    const oneTimeFlag = Boolean(oneTime);

    const encrypted = encryptSecret(password);
    const id = uuidv4();
    const redisKey = `${SECRET_PREFIX}${id}`;

    const expiresAt = Date.now() + expiry * 1000;
    const payload = JSON.stringify({
      ...encrypted,
      oneTime: oneTimeFlag,
      expiresAt,
      remainingViews
    });

    await redisClient.set(redisKey, payload, { EX: expiry });

    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/secret/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUuidV4(id)) {
      return res.status(404).json({ error: "Not found" });
    }

    const redisKey = `${SECRET_PREFIX}${id}`;
    const stored = await redisClient.get(redisKey);

    if (!stored) {
      return res.status(404).json({ error: "Not found" });
    }

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (err) {
      return res.status(500).json({ error: "Corrupted secret" });
    }

    let password;
    try {
      password = decryptSecret(parsed);
    } catch (err) {
      return res.status(500).json({ error: "Unable to decrypt" });
    }

    if (parsed.oneTime) {
      // Enforce one-time access by deleting after successful retrieval.
      await redisClient.del(redisKey);
    } else if (typeof parsed.remainingViews === "number") {
      const remaining = parsed.remainingViews - 1;
      if (remaining <= 0) {
        await redisClient.del(redisKey);
        parsed.remainingViews = 0;
      } else {
        parsed.remainingViews = remaining;
        const ttl = await redisClient.ttl(redisKey);
        if (ttl > 0) {
          await redisClient.set(redisKey, JSON.stringify(parsed), { EX: ttl });
        } else {
          await redisClient.set(redisKey, JSON.stringify(parsed));
        }
      }
    }

    res.set("Cache-Control", "no-store");
    const oneTimeFlag = Boolean(parsed.oneTime);
    const responsePayload = { password, oneTime: oneTimeFlag };
    if (!oneTimeFlag && typeof parsed.expiresAt === "number") {
      responsePayload.expiresAt = parsed.expiresAt;
    }
    if (typeof parsed.remainingViews === "number") {
      responsePayload.remainingViews = parsed.remainingViews;
    }
    return res.json(responsePayload);
  } catch (err) {
    next(err);
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    publicBaseUrl: PUBLIC_BASE_URL,
    version: packageJson.version,
    branding: {
      primaryColor: BRAND_PRIMARY_COLOR,
      logoUrl: BRAND_LOGO_URL,
      faviconUrl: BRAND_FAVICON_URL,
      title: BRAND_TITLE,
      tagline: BRAND_TAGLINE,
      siteTitle: BRAND_SITE_TITLE
    }
  });
});

app.get("/secret/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/:id", (req, res, next) => {
  const { id } = req.params;
  if (!isValidUuidV4(id)) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await redisClient.connect();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
