require("dotenv").config({ path: "index.env" });

const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const cron = require("node-cron");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

const DATA_FILE = "records.json";

/* -------------------------
   Load & Save Data
--------------------------*/
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* -------------------------
   SMS FUNCTION
--------------------------*/
async function sendSMS(phone, message) {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone
    });

    console.log("SMS sent to:", phone);
  } catch (err) {
    console.error("SMS error:", err.message);
  }
}

/* -------------------------
   AUTO OVERDUE CHECKER
   Runs every 1 minute
--------------------------*/
cron.schedule("* * * * *", () => {
  console.log("Checking overdue records...");

  let data = loadData();
  const today = new Date().toISOString().split("T")[0];

  let updated = false;

  data.forEach(record => {
    if (
      record.status !== "Paid" &&
      record.dueDate < today &&
      !record.smsSent
    ) {
      const msg = `Hello ${record.name}, you have an overdue payment of ${record.amount}. Please pay as soon as possible.`;

      sendSMS(record.phone, msg);

      record.status = "Overdue";
      record.smsSent = true;
      updated = true;
    }
  });

  if (updated) {
    saveData(data);
    console.log("Records updated with overdue SMS ready to be sent");
  }
});

/* -------------------------
   ADD RECORD API
--------------------------*/
app.post("/add-record", (req, res) => {
  let data = loadData();
  data.push(req.body);
  saveData(data);
  res.send("Record added");
});

/* -------------------------
   GET RECORDS API
--------------------------*/
app.get("/records", (req, res) => {
  res.json(loadData());
});

/* -------------------------
   START SERVER
--------------------------*/
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running...");
});