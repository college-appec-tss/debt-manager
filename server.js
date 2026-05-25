const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* =========================
   CONFIG
========================= */
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET missing in .env");
  process.exit(1);
}

const USERS = "users.json";
const RECORDS = "records.json";

/* =========================
   MIDDLEWARE
========================= */
app.use(helmet());

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.use(express.static(__dirname));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

/* =========================
   HELPERS
========================= */
function read(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* =========================
   AUTH
========================= */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      error: "No token"
    });
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({
      error: "Invalid token"
    });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin only"
    });
  }
  next();
}

/* =========================
   PAGES
========================= */
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (_, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

/* =========================
   REGISTER
========================= */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "All fields required"
    });
  }

  let users = read(USERS);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({
      error: "User exists"
    });
  }

  const hash = await bcrypt.hash(password, 12);

  const role =
    users.length === 0 ? "admin" : "user";

  users.push({
    username,
    password: hash,
    role
  });

  write(USERS, users);

  res.json({
    message: "Registered",
    role
  });
});

/* =========================
   LOGIN
========================= */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = read(USERS);

  const user = users.find(
    u => u.username === username
  );

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  const ok = await bcrypt.compare(
    password,
    user.password
  );

  if (!ok) {
    return res.status(401).json({
      error: "Wrong password"
    });
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "24h"
    }
  );

  res.json({
    token,
    role: user.role
  });
});

/* =========================
   ADD RECORD
========================= */
app.post("/add-record", auth, (req, res) => {
  const { name, amount } = req.body;

  if (!name || !amount) {
    return res.status(400).json({
      error: "Missing fields"
    });
  }

  let records = read(RECORDS);

  records.push({
    id: Date.now(),
    name,
    amount,
    owner: req.user.username
  });

  write(RECORDS, records);

  res.json({
    message: "Saved"
  });
});

/* =========================
   USER RECORDS
========================= */
app.get("/records", auth, (req, res) => {
  const records = read(RECORDS);

  if (req.user.role === "admin") {
    return res.json(records);
  }

  const mine = records.filter(
    r => r.owner === req.user.username
  );

  res.json(mine);
});

/* =========================
   DELETE RECORD
========================= */
app.delete(
  "/records/:id",
  auth,
  adminOnly,
  (req, res) => {
    let records = read(RECORDS);

    records = records.filter(
      r => r.id != req.params.id
    );

    write(RECORDS, records);

    res.json({
      message: "Deleted"
    });
  }
);

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
