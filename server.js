const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const JWT_SECRET = "mysecret123";
const USERS = "users.json";
const RECORDS = "records.json";

/* helpers */
function read(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* auth middleware */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).send("No token");

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).send("Bad token");
  }
}

/* pages */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

/* register */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  let users = read(USERS);

  if (users.find(u => u.username === username)) {
    return res.send("User exists");
  }

  const hash = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hash
  });

  write(USERS, users);

  res.send("Registered");
});

/* login */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = read(USERS);
  const user = users.find(u => u.username === username);

  if (!user) return res.send("User not found");

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) return res.send("Wrong password");

  const token = jwt.sign(
    { username },
    JWT_SECRET
  );

  res.json({ token });
});

/* add record */
app.post("/add-record", auth, (req, res) => {
  let records = read(RECORDS);

  records.push({
    ...req.body,
    owner: req.user.username
  });

  write(RECORDS, records);

  res.send("Saved");
});

/* get records */
app.get("/records", auth, (req, res) => {
  const records = read(RECORDS);

  res.json(
    records.filter(
      r => r.owner === req.user.username
    )
  );
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () =>
  console.log("running")
);
