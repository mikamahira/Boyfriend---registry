const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Set ADMIN_PASSWORD and SESSION_SECRET in your environment before starting.");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(DATA_DIR, "applications.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "boyfriend_registry_session",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
  // For production, replace MemoryStore with a persistent session store.
}));

const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Please upload a JPG, PNG or WEBP image."), allowed.includes(file.mimetype));
  }
});

function readApplications() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function writeApplications(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) return res.status(401).json({ error: "Please sign in first." });
  next();
}

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", requireAdmin, express.static(UPLOAD_DIR));

app.post("/api/applications", submitLimiter, upload.single("photo"), (req, res) => {
  try {
    const body = req.body || {};
    const required = ["fullName", "age", "location", "contactName", "intentions", "relationshipWords", "loveLanguage", "conflict", "goodMorning", "jealousy", "bringToRelationship", "dateInitiator", "badDay", "firstDate", "clingy", "hoodie", "worm", "whyChoose", "promise"];
    for (const key of required) {
      if (!String(body[key] || "").trim()) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Please complete all required questions." });
      }
    }
    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 18 || age > 99) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Applicants must be 18 or older." });
    }
    const application = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: "Under review",
      answers: Object.fromEntries(required.map(k => [k, String(body[k]).trim().slice(0, 1500)])),
      photo: req.file ? req.file.filename : null
    };
    const items = readApplications();
    items.unshift(application);
    writeApplications(items);
    res.status(201).json({ message: "Application submitted. Good luck, applicant!", id: application.id });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const password = String((req.body || {}).password || "");
  if (password.length !== ADMIN_PASSWORD.length ||
      !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD))) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start your session." });
    req.session.isAdmin = true;
    res.json({ message: "Signed in." });
  });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ message: "Signed out." }));
});

app.get("/api/admin/me", (req, res) => res.json({ authenticated: !!(req.session && req.session.isAdmin) }));

app.get("/api/admin/applications", requireAdmin, (_req, res) => {
  res.json(readApplications().map(({ photo, ...item }) => ({
    ...item,
    photoUrl: photo ? `/uploads/${encodeURIComponent(photo)}` : null
  })));
});

app.patch("/api/admin/applications/:id/status", requireAdmin, (req, res) => {
  const allowed = ["Under review", "Shortlisted", "Interview", "Rejected"];
  const status = String((req.body || {}).status || "");
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });
  const items = readApplications();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Application not found." });
  item.status = status;
  writeApplications(items);
  res.json({ message: "Status updated." });
});

app.delete("/api/admin/applications/:id", requireAdmin, (req, res) => {
  const items = readApplications();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Application not found." });
  if (item.photo) {
    const p = path.join(UPLOAD_DIR, path.basename(item.photo));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  writeApplications(items.filter(x => x.id !== req.params.id));
  res.json({ message: "Application deleted." });
});

app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: "Photo must be 4MB or smaller." });
  if (err) return res.status(400).json({ error: err.message || "Request could not be processed." });
  res.status(500).json({ error: "Server error." });
});

app.listen(PORT, () => console.log(`Boyfriend Registry running at http://localhost:${PORT}`));
