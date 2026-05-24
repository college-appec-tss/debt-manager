require("dotenv").config({ path: "index.env" });

const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = "records.json";
const USERS_FILE = "users.json";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/* pages */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login_form.html"));
});

/* twilio */
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

/* file helpers */
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

/* auth middleware */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).send("No token");

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).send("Invalid token");
  }
}

/* register */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  let users = loadUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).send("User exists");
  }

  const hashed = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hashed
  });

  saveUsers(users);
  res.send("Registered");
});

/* login */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).send("User not found");

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) return res.status(401).send("Wrong password");

  const token = jwt.sign(
    { username },
    JWT_SECRET
  );

  res.json({ token });
});

/* add record */
app.post("/add-record", auth, (req, res) => {
  let data = loadData();

  req.body.owner = req.user.username;
  data.push(req.body);

  saveData(data);
  res.send("Record added");
});

/* get records */
app.get("/records", auth, (req, res) => {
  let data = loadData();

  const mine = data.filter(
    r => r.owner === req.user.username
  );

  res.json(mine);
});

/* send sms */
async function sendSMS(phone, message) {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone
    });
  } catch (err) {
    console.log(err.message);
  }
}

app.post("/send-sms", async (req, res) => {
  const { phone, message } = req.body;
  await sendSMS(phone, message);
  res.send("SMS sent");
});

/* overdue checker */
cron.schedule("* * * * *", () => {
  let data = loadData();
  const today = new Date().toISOString().split("T")[0];
  let changed = false;

  data.forEach(record => {
    if (
      record.status !== "Paid" &&
      record.dueDate < today &&
      !record.smsSent
    ) {
      sendSMS(
        record.phone,
        `Hello ${record.name}, overdue payment ${record.amount}`
      );

      record.status = "Overdue";
      record.smsSent = true;
      changed = true;
    }
  });

  if (changed) saveData(data);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("running");
});
