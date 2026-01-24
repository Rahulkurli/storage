let statsChart = null;

function formatDateTime(date = new Date()) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();

  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${d}/${m}/${y} ${h}:${min}`;
}

function parseDate(dateStr) {
  // "24/01/2026 12:45"
  const [datePart] = dateStr.split(" ");
  const [d, m, y] = datePart.split("/");
  return new Date(y, m - 1, d);
}

const navItems = document.querySelectorAll(".nav-item");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    const tab = item.dataset.tab;
    showSection(tab);
  });
});

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}
function deleteTransaction(id) {
  transactions = transactions.filter((tx) => tx.id !== id);
  saveTransactions();
  renderTransactions();
  updateSummary();
  renderStats();
}
function clearAllTransactions() {
  if (!transactions.length) return;

  const confirmClear = confirm(
    "Are you sure you want to delete all transactions?",
  );
  if (!confirmClear) return;

  transactions = [];
  saveTransactions();
  renderTransactions();
  updateSummary();
  renderStats();
}

// function renderTransactions() {
//   const list = document.getElementById("transaction-list");
//   list.innerHTML = "";

//   transactions.forEach((tx) => {
//     const isIncome = tx.amount > 0;

//     const div = document.createElement("div");
//     div.className = "flex justify-between items-center p-3";

//     div.innerHTML = `
//       <div>
//         <p class="font-medium">${tx.title}</p>
//         <p class="text-xs text-gray-500">${tx.date}</p>
//       </div>
//       <span class="${
//         isIncome ? "text-green-500" : "text-red-500"
//       } font-semibold">
//         ${isIncome ? "+" : "-"} ₹${Math.abs(tx.amount)}
//       </span>
//     `;

//     list.appendChild(div);
//   });
// }
function renderTransactions() {
  const list = document.getElementById("transaction-list");
  list.innerHTML = "";

  if (transactions.length === 0) {
    list.innerHTML = `<p class="text-center text-gray-400 text-sm py-2">No transactions yet</p>`;
    return;
  }

  transactions.forEach((tx) => {
    const isIncome = tx.type === "income";

    const div = document.createElement("div");
    div.className =
      "flex justify-between items-center p-3 border-b last:border-none";

    div.innerHTML = `
    <div>
      <p class="font-medium">${tx.title}</p>
      <p class="text-xs text-gray-500">${tx.date}</p>
    </div>

    <div class="flex items-center gap-3">
      <span class="${isIncome ? "text-green-500" : "text-red-500"} font-semibold">
        ${isIncome ? "+" : "-"} ₹${tx.amount}
      </span>

      <button
        onclick="deleteTransaction(${tx.id})"
        class="text-gray-400 hover:text-red-500 text-sm"
      >
        ✕
      </button>
    </div>
    `;

    list.appendChild(div);
  });
}

renderTransactions();

function updateSummary() {
  let balance = 0;
  let income = 0;
  let expense = 0;

  transactions.forEach((tx) => {
    if (tx.type === "income") {
      income += tx.amount;
      balance += tx.amount;
    } else {
      expense += tx.amount;
      balance -= tx.amount;
    }
  });

  document.getElementById("balance").innerText = `₹${balance}`;
  document.getElementById("income").innerText = `₹${income}`;
  document.getElementById("expense").innerText = `₹${expense}`;
}

updateSummary();

// Stats code
let statsFilter = "all";

function setStatsFilter(type) {
  statsFilter = type;

  document.querySelectorAll(".stats-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-blue-600", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-700");
  });

  document
    .getElementById(`stats-${type}`)
    .classList.add("bg-blue-600", "text-white");

  renderStats();
}
function renderStats() {
  let income = 0;
  let expense = 0;

  const now = new Date();

  const filteredTransactions = transactions.filter((tx) => {
    if (statsFilter === "all") return true;

    const txDate = parseDate(tx.date);

    if (statsFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return txDate >= weekAgo;
    }

    if (statsFilter === "month") {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }

    if (statsFilter === "year") {
      return txDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  filteredTransactions.forEach((tx) => {
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  });

  const balance = income - expense;

  document.getElementById("stats-income").innerText = `₹${income}`;
  document.getElementById("stats-expense").innerText = `₹${expense}`;
  document.getElementById("stats-balance").innerText = `₹${balance}`;

  renderIncomeExpenseChart(income, expense);
}
function renderIncomeExpenseChart(income, expense) {
  const ctx = document.getElementById("incomeExpenseChart").getContext("2d");

  if (statsChart) {
    statsChart.destroy();
  }

  statsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#22c55e", "#ef4444"],
          borderRadius: 8,
          barThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function getExpenseBreakdown() {
  const breakdown = {};

  transactions.forEach((tx) => {
    if (tx.type !== "expense") return;

    const cat = tx.category || "Other";
    breakdown[cat] = (breakdown[cat] || 0) + tx.amount;
  });

  return breakdown;
}

// expense chart
let expenseChart = null;

function renderExpenseChart() {
  const data = getExpenseBreakdown();

  const labels = Object.keys(data);
  const values = Object.values(data);

  if (!labels.length) return;

  const ctx = document.getElementById("expenseChart").getContext("2d");

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#ef4444",
            "#f97316",
            "#eab308",
            "#22c55e",
            "#6366f1",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}
renderExpenseChart();

// Insights
function renderInsights() {
  if (!transactions.length) return;

  const expenses = transactions.filter((t) => t.type === "expense");

  if (!expenses.length) return;

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const avgExpense = Math.round(totalExpense / expenses.length);

  const highest = expenses.reduce((a, b) => (b.amount > a.amount ? b : a));

  document.getElementById("insight-1").innerText =
    `💸 You spend an average of ₹${avgExpense} per expense.`;

  document.getElementById("insight-2").innerText =
    `🔥 Highest expense: ₹${highest.amount} on ${highest.title}.`;
}
renderInsights();

// Show section code
function showSection(tab) {
  document.querySelectorAll(".page-section").forEach((sec) => {
    sec.classList.add("hidden");
  });

  document.getElementById(`${tab}-section`).classList.remove("hidden");

  if (tab === "history") {
    renderHistory();
  }

  if (tab === "stats") {
    renderStats();
  }
}

// transaction;

let transactionType = "income";

function setType(type) {
  transactionType = type;

  document.getElementById("income-btn").className =
    "flex-1 py-2 rounded-lg font-medium " +
    (type === "income" ? "bg-green-500 text-white" : "text-gray-600");

  document.getElementById("expense-btn").className =
    "flex-1 py-2 rounded-lg font-medium " +
    (type === "expense" ? "bg-red-500 text-white" : "text-gray-600");
}

// function addTransaction() {
//   const title = document.getElementById("title").value;
//   const amount = +document.getElementById("amount").value;

//   if (!title || !amount) return alert("Fill all fields");

//   transactions.push({
//     id: Date.now(),
//     title,
//     amount,
//     date: new Date().toISOString().split("T")[0],
//   });

//   saveTransactions();
//   renderTransactions();
//   updateSummary();
// }

// 2nd

// function addTransaction() {
//   const title = document.getElementById("title").value;
//   let amount = +document.getElementById("amount").value;

//   if (!title || !amount) return alert("Fill all fields");

//   if (transactionType === "expense") {
//     amount = -amount;
//   }

//   transactions.push({
//     id: Date.now(),
//     title,
//     amount,
//     date: new Date().toISOString().split("T")[0],
//   });

//   saveTransactions();
//   renderTransactions();
//   updateSummary();

//   showSection("home");
// }

const categoryInput = document.getElementById("category");

function addTransaction() {
  const titleInput = document.getElementById("title");
  const amountInput = document.getElementById("amount");

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);

  if (!title || !amount) {
    alert("Fill all fields");
    return;
  }

  transactions.push({
    id: Date.now(),
    title,
    amount: amount,
    type: transactionType,
    category: categoryInput.value,
    date: formatDateTime(),
  });

  saveTransactions();
  renderTransactions();
  updateSummary();

  titleInput.value = "";
  amountInput.value = "";
  setType("income");
  showSection("home");

  document
    .querySelectorAll(".nav-item")
    .forEach((i) => i.classList.remove("active"));
  document.querySelector('.nav-item[data-tab="home"]').classList.add("active");
}

// HISTORY CODE
let historyFilter = "all";
let currentPage = 1;
const rowsPerPage = 10;

function setHistoryFilter(type) {
  historyFilter = type;
  currentPage = 1;

  document.querySelectorAll(".history-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-blue-600", "text-white");
  });

  document
    .getElementById(`filter-${type}`)
    .classList.add("bg-blue-600", "text-white");

  renderHistory();
}

function renderHistory() {
  const table = document.getElementById("history-table");
  const searchInput = document.getElementById("history-search");

  if (!table || !searchInput) return;

  const search = searchInput.value.toLowerCase();
  table.innerHTML = "";

  // ✅ Single source of truth + latest first
  const storedTransactions = (
    JSON.parse(localStorage.getItem("transactions")) || []
  ).sort((a, b) => b.id - a.id);

  /* 1️⃣ FILTER */
  const filteredTransactions = storedTransactions.filter((tx) => {
    if (historyFilter !== "all" && tx.type !== historyFilter) return false;
    if (!tx.title.toLowerCase().includes(search)) return false;
    return true;
  });

  /* 2️⃣ PAGINATION */
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  /* 3️⃣ RENDER ROWS (IMPORTANT FIX) */
  paginatedTransactions.forEach((tx) => {
    const row = document.createElement("div");
    row.className = "grid grid-cols-3 items-center p-3 text-sm";

    row.innerHTML = `
      <div class="truncate">${tx.title}</div>

      <div class="text-center text-xs text-gray-500">
        ${tx.date}
      </div>

      <div class="text-right font-semibold ${
        tx.type === "expense" ? "text-red-600" : "text-green-600"
      }">
        ${tx.type === "expense" ? "-" : "+"}₹${tx.amount}
      </div>
    `;

    table.appendChild(row);
  });

  /* 4️⃣ EMPTY STATE */
  if (filteredTransactions.length === 0) {
    table.innerHTML = `
      <div class="p-4 text-center text-sm text-gray-500">
        No transactions found
      </div>
    `;
  }

  /* 5️⃣ PAGINATION UI */
  renderPagination(filteredTransactions.length);
}

function renderPagination(totalRows) {
  const pagination = document.getElementById("history-pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;

    btn.className = `
      px-3 py-1 rounded-lg text-sm
      ${
        i === currentPage
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700"
      }
    `;

    btn.onclick = () => {
      currentPage = i;
      renderHistory();
    };

    pagination.appendChild(btn);
  }
}
