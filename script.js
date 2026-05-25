const API = window.location.origin;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    location.href = "/login";
    return;
  }

  document
    .getElementById("saveBtn")
    .addEventListener("click", addRecord);

  loadRecords();
});

function addRecord() {
  const name = document.getElementById("name").value;
  const amount = document.getElementById("amount").value;

  fetch(API + "/add-record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ name, amount })
  })
  .then(r => r.text())
  .then(msg => {
    alert(msg);
    loadRecords();
  });
}

function loadRecords() {
  fetch(API + "/records", {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(r => r.json())
  .then(data => {
    const table = document.getElementById("table");
    table.innerHTML = "";

    data.forEach(x => {
      table.innerHTML += `
        <tr>
          <td>${x.name}</td>
          <td>${x.amount}</td>
        </tr>
      `;
    });
  });
}

function logout() {
  localStorage.removeItem("token");
  location.href = "/login";
}
