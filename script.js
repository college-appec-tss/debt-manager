const API_URL = "http://localhost:5000";

/* -----------------------------
   INIT
------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveBtn").addEventListener("click", addRecord);

  loadRecords();

  // Load dark mode preference
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
  }
});

/* -----------------------------
   DARK MODE
------------------------------*/
function toggleDarkMode() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
}

/* -----------------------------
   SMS FUNCTION
------------------------------*/
function sendSMS(phone, name, amount) {
  const message = `Hello ${name}, you have new account notification ${amount}. check details for your account `;

  fetch(`${API_URL}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ phone, message })
  })
    .then(res => res.text())
    .then(res => console.log("SMS:", res))
    .catch(err => console.error("SMS error:", err));
}

/* -----------------------------
   ADD RECORD
------------------------------*/
function addRecord() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const dueDate = document.getElementById("dueDate").value;

  if (!name || !amount || !dueDate) {
    alert("Please fill all fields");
    return;
  }

  const record = {
    name,
    phone,
    amount,
    dueDate,
    status: "Not Paid",
    smsSent: false,
    date: new Date().toISOString().split("T")[0]
  };

  fetch(`${API_URL}/add-record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(record)
  })
    .then(res => res.text())
    .then(() => {
      alert("Record saved successfully");

      document.getElementById("name").value = "";
      document.getElementById("phone").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("dueDate").value = "";

      loadRecords();
    })
    .catch(err => console.error("Add error:", err));
}

/* -----------------------------
   LOAD + DISPLAY RECORDS
------------------------------*/
function loadRecords() {
  fetch(`${API_URL}/records`)
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById("table");
      table.innerHTML = "";

      let today = new Date().toISOString().split("T")[0];
      let daily = 0;
      let monthly = 0;
      let overdue = 0;

      data.forEach(rec => {
        // OVERDUE CHECK
        if (rec.dueDate < today && rec.status !== "Paid") {
          rec.status = "Overdue";

          // SEND SMS ONLY ONCE
          if (!rec.smsSent) {
            sendSMS(rec.phone, rec.name, rec.amount);
            rec.smsSent = true;
          }
        }

        if (rec.date === today) daily += Number(rec.amount);
        if (rec.date?.slice(0, 7) === today.slice(0, 7)) monthly += Number(rec.amount);
        if (rec.status === "Overdue") overdue++;

        table.innerHTML += `
          <tr>
            <td>${rec.name}</td>
            <td>${rec.amount}</td>
            <td>${rec.dueDate}</td>
            <td>${rec.status || "Not Paid"}</td>
          </tr>
        `;
      });

      document.getElementById("daily").innerText = daily;
      document.getElementById("monthly").innerText = monthly;
      document.getElementById("overdue").innerText = overdue;
    })
    .catch(err => console.error("Load error:", err));
}
