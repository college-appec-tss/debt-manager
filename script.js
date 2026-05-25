const API_URL = window.location.origin;

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    location.href = "/login";
    return;
  }

  document.getElementById("saveBtn").addEventListener("click", addRecord);

  loadRecords();
});

/* ADD RECORD */
function addRecord() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const amount = document.getElementById("amount").value;
  const dueDate = document.getElementById("dueDate").value;

  if (!name || !phone || !amount || !dueDate) {
    alert("Fill all fields");
    return;
  }

  fetch(`${API_URL}/add-record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({
      name,
      phone,
      amount,
      dueDate,
      status: "Not Paid",
      smsSent: false,
      date: new Date().toISOString().split("T")[0]
    })
  })
  .then(async r => {
    const text = await r.text();

    if (!r.ok) {
      alert(text);

      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem("token");
        location.href = "/login";
      }
      return;
    }

    alert(text);

    document.getElementById("name").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("dueDate").value = "";

    loadRecords();
  })
  .catch(err => {
    console.error(err);
    alert("Error saving record");
  });
}

/* LOAD RECORDS */
function loadRecords() {
  fetch(`${API_URL}/records`, {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  })
  .then(async r => {
    if (!r.ok) {
      localStorage.removeItem("token");
      location.href = "/login";
      return [];
    }
    return r.json();
  })
  .then(data => {
    const table = document.getElementById("table");
    table.innerHTML = "";

    data.forEach(rec => {
      table.innerHTML += `
        <tr>
          <td>${rec.name}</td>
          <td>${rec.amount}</td>
          <td>${rec.dueDate}</td>
          <td>${rec.status}</td>
        </tr>
      `;
    });
  });
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("token");
  location.href = "/login";
}
