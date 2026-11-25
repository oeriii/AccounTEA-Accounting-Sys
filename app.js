/* Accountea - app logic. */

const accountTypes = {
  A: "Asset",
  L: "Liability",
  E: "Equity",
  R: "Revenue",
  X: "Expense"
};

let accounts = [
  { code: "1010", name: "Cash", type: "A", side: "D" },
  { code: "1020", name: "Accounts Receivable", type: "A", side: "D" },
  { code: "1030", name: "Office Supplies", type: "A", side: "D" },
  { code: "1110", name: "Office Equipment", type: "A", side: "D" },
  { code: "1111", name: "Accumulated Depreciation - Office Equipment", type: "A", side: "C" },
  { code: "2010", name: "Advertising Payable", type: "L", side: "C" },
  { code: "2020", name: "Unearned Computer Services", type: "L", side: "C" },
  { code: "3010", name: "A, Capital", type: "E", side: "C" },
  { code: "3020", name: "A, Drawing", type: "E", side: "D" },
  { code: "4010", name: "Computer Services Revenue", type: "R", side: "C" },
  { code: "5010", name: "Salaries Expense", type: "X", side: "D" },
  { code: "5020", name: "Advertising Expense", type: "X", side: "D" },
  { code: "5030", name: "Office Supplies Expense", type: "X", side: "D" },
  { code: "5040", name: "Depreciation Expense - Office Equipment", type: "X", side: "D" }
];

let lastId = 0;

function newEntry(date, description, debit, credit, amount, isAdjusting) {
  lastId++;
  return {
    id: lastId,
    date: date,
    description: description,
    debit: debit,
    credit: credit,
    amount: amount,
    isAdjusting: isAdjusting === true
  };
}

let entries = [
  // Transactions that make up the unadjusted trial balance
  newEntry("2023-12-01", "Owner invested cash in the business", "1010", "3010", 100000),
  newEntry("2023-12-02", "Bought office equipment (cash)", "1110", "1010", 15000),
  newEntry("2023-12-03", "Bought office supplies (cash)", "1030", "1010", 1500),
  newEntry("2023-12-05", "Received cash in advance for computer services", "1010", "2020", 2000),
  newEntry("2023-12-08", "Computer services rendered (cash)", "1010", "4010", 8300),
  newEntry("2023-12-12", "Computer services rendered on account", "1020", "4010", 2500),
  newEntry("2023-12-15", "Advertising expense incurred on account", "5020", "2010", 5500),
  newEntry("2023-12-20", "Owner withdrew cash", "3020", "1010", 3000),

  // Adjusting entries from the worksheet
  newEntry("2023-12-31", "Computer services collected in cash", "1010", "4010", 25000, true),
  newEntry("2023-12-31", "Accrued computer services revenue", "1020", "4010", 7500, true),
  newEntry("2023-12-31", "Unearned computer services earned", "2020", "4010", 1000, true),
  newEntry("2023-12-31", "Office supplies used during the month", "5030", "1030", 500, true),
  newEntry("2023-12-31", "Depreciation of office equipment", "5040", "1111", 237.5, true),
  newEntry("2023-12-31", "Salaries paid", "5010", "1010", 10000, true)
];

const adjustmentTypes = {
  "Supplies used": ["5030", "1030", "Office supplies used during the month"],
  "Depreciation": ["5040", "1111", "Depreciation of office equipment"],
  "Unearned revenue earned": ["2020", "4010", "Unearned computer services earned"],
  "Accrued revenue": ["1020", "4010", "Accrued computer services revenue"],
  "Revenue collected": ["1010", "4010", "Computer services collected in cash"],
  "Salaries": ["5010", "1010", "Salaries paid"]
};

// Sidebar: single pages plus dropdown groups. Order follows the accounting cycle.
const navItems = [
  { tab: "Dashboard", icon: "home" },
  { group: "Records", icon: "book", tabs: ["Chart of Accounts", "Business Transactions"] },
  { group: "Worksheet", icon: "scale", tabs: ["Trial Balance", "Adjustments", "Adjusted Trial Balance", "Full Worksheet"] },
  { group: "Financial Statements", icon: "doc", tabs: ["Income Statement", "Owner's Equity", "Financial Position", "Cashflow"] }
];
let currentTab = "Dashboard";
let openGroups = {};   // group name -> true/false (you can open or close any group)
let cashView = "Statement";
let errors = {};

// ---------- icons ----------

const iconPaths = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  book: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  swap: '<path d="M4 8h14"/><path d="m14 4 4 4-4 4"/><path d="M20 16H6"/><path d="m10 12-4 4 4 4"/>',
  scale: '<path d="M12 4v16"/><path d="M7 20h10"/><path d="M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0z"/><path d="m19 7-3 7a3 3 0 0 0 6 0z"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  doc: '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4"/><path d="M9.5 12h5M9.5 15.5h5"/>'
};

function icon(name, size) {
  const px = size || 18;
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

// ---------- helpers ----------

function $(selector) {
  return document.querySelector(selector);
}

function formatPeso(n) {
  if (!n) return "";
  return "₱" + n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortedAccounts() {
  return accounts.slice().sort(function (a, b) {
    return a.code.localeCompare(b.code);
  });
}

function accountName(code) {
  const found = accounts.find(function (a) {
    return a.code === code;
  });
  return found ? found.code + " · " + found.name : code;
}

function accountOptions(selectedCode) {
  let html = "";
  sortedAccounts().forEach(function (a) {
    const selected = a.code === selectedCode ? " selected" : "";
    html += `<option value="${a.code}"${selected}>${a.code} · ${escapeHtml(a.name)}</option>`;
  });
  return html;
}

function getBalances(isAdjusting) {
  const totals = {};
  accounts.forEach(function (a) {
    totals[a.code] = 0;
  });

  entries.forEach(function (e) {
    if (e.isAdjusting !== isAdjusting) return;
    totals[e.debit] += e.amount;
    totals[e.credit] -= e.amount;
  });

  return totals;
}

function toColumns(balance) {
  return balance > 0 ? [balance, 0] : [0, -balance];
}

function formHead(iconName, tone, title, subtitle) {
  return `
    <div class="form-head tone-${tone}">
      <span class="form-icon">${icon(iconName, 22)}</span>
      <div>
        <h2>${title}</h2>
        <p class="form-sub">${subtitle}</p>
      </div>
    </div>`;
}

// ---------- pop-up window (confirm + edit) ----------

let modalHandler = null;

function closeModal() {
  const box = $("#modal");
  if (box) box.remove();
  modalHandler = null;
  document.removeEventListener("keydown", modalKey);
}

function modalKey(event) {
  if (event.key === "Escape") closeModal();
}

// onOk may return a message to show an error and keep the window open
function openModal(title, bodyHtml, okLabel, onOk, danger) {
  closeModal();
  const wrap = document.createElement("div");
  wrap.id = "modal";
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal${danger ? " danger" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${title}</h2>
      <div class="modal-body">${bodyHtml}</div>
      <div class="error modal-error" id="modal-error"></div>
      <div class="modal-actions">
        ${onOk ? `<button type="button" class="ghost" onclick="closeModal()">Cancel</button>` : ""}
        <button type="button" class="primary${danger ? " danger-btn" : ""}" id="modal-ok">${okLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("mousedown", function (event) {
    if (event.target === wrap) closeModal();
  });
  document.addEventListener("keydown", modalKey);
  modalHandler = onOk || null;
  $("#modal-ok").addEventListener("click", function () {
    if (!modalHandler) return closeModal();
    const problem = modalHandler();
    if (problem) $("#modal-error").textContent = problem;
    else closeModal();
  });
  const first = wrap.querySelector("input, select");
  (first || $("#modal-ok")).focus();
}

function rowActions(editCall, deleteCall, key) {
  return `<div class="row-actions">
    <button class="edit" title="Edit" aria-label="Edit" data-key="${escapeHtml(String(key))}" onclick="${editCall}(this.dataset.key)">${icon("edit", 16)}</button>
    <button class="delete" title="Delete" aria-label="Delete" data-key="${escapeHtml(String(key))}" onclick="${deleteCall}(this.dataset.key)">✕</button>
  </div>`;
}

// ---------- chart of accounts ----------

function chartOfAccountsPage() {
  let rows = "";
  sortedAccounts().forEach(function (a) {
    rows += `
      <tr>
        <td>${a.code}</td>
        <td>${escapeHtml(a.name)}</td>
        <td><span class="pill pill-${a.type}">${accountTypes[a.type]}</span></td>
        <td><span class="pill">${a.side === "D" ? "Debit" : "Credit"}</span></td>
        <td>${rowActions("editAccount", "deleteAccount", a.code)}</td>
      </tr>`;
  });

  let typeOptions = "";
  for (const key in accountTypes) {
    typeOptions += `<option value="${key}">${accountTypes[key]}</option>`;
  }

  return `
    <div class="card form-card">
      ${formHead("plus", "green", "Add account", "Choose a code, name the account, then pick its type.")}
      <div class="account-form">
        <label class="field">Code
          <input id="new-code" placeholder="e.g. 5060" inputmode="numeric" oninput="suggestType()" />
        </label>
        <label class="field">Account name
          <input id="new-name" placeholder="e.g. Marketing Expense" />
        </label>
        <label class="field">Type
          <select id="new-type">${typeOptions}</select>
        </label>
        <label class="field">Normal balance
          <select id="new-side">
            <option value="auto">Automatic</option>
            <option value="D">Debit</option>
            <option value="C">Credit</option>
          </select>
        </label>
        <button class="primary" onclick="addAccount()">${icon("plus", 18)} Add</button>
      </div>
      <p class="code-guide">
        <span><b>1xxx</b> Assets</span>
        <span><b>2xxx</b> Liabilities</span>
        <span><b>3xxx</b> Equity</span>
        <span><b>4xxx</b> Revenue</span>
        <span><b>5xxx</b> Expenses</span>
      </p>
      <div class="error">${errors.accounts || ""}</div>
    </div>

    <div class="card">
      <h2>Chart of Accounts <span class="badge">${accounts.length} accounts</span></h2>
      <div class="table-wrap">
        <table>
          <tr>
            <th>Code</th>
            <th>Account</th>
            <th>Type</th>
            <th>Normal balance</th>
            <th></th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`;
}

// the first digit of the code picks the matching type (1 = Asset, 2 = Liability, ...)
function suggestType() {
  const guess = { "1": "A", "2": "L", "3": "E", "4": "R", "5": "X" }[$("#new-code").value.trim().charAt(0)];
  if (guess) $("#new-type").value = guess;
}

function addAccount() {
  const code = $("#new-code").value.trim();
  const name = $("#new-name").value.trim();
  const type = $("#new-type").value;
  let side = $("#new-side").value;

  if (code === "" || name === "") {
    errors.accounts = "Enter a code and a name.";
    return showPage();
  }

  const alreadyUsed = accounts.some(function (a) {
    return a.code === code;
  });
  if (alreadyUsed) {
    errors.accounts = "That code already exists.";
    return showPage();
  }

  if (side === "auto") {
    side = (type === "A" || type === "X") ? "D" : "C";
  }

  accounts.push({ code: code, name: name, type: type, side: side });
  errors.accounts = "";
  showPage();
}

function deleteAccount(code) {
  const account = accounts.find(function (x) { return x.code === code; });
  if (!account) return;
  const inUse = entries.some(function (e) {
    return e.debit === code || e.credit === code;
  });
  if (inUse) {
    return openModal("Can’t delete this account",
      `<p><b>${escapeHtml(account.code + " · " + account.name)}</b> is used in at least one entry. Delete or change those entries first.</p>`,
      "OK");
  }
  openModal("Delete this account?",
    `<p>You are about to delete <b>${escapeHtml(account.code + " · " + account.name)}</b>.</p><p class="sub">This can’t be undone.</p>`,
    "Delete account",
    function () {
      accounts = accounts.filter(function (x) { return x.code !== code; });
      showPage();
    }, true);
}

function editAccount(code) {
  const account = accounts.find(function (x) { return x.code === code; });
  if (!account) return;
  let typeOptions = "";
  for (const key in accountTypes) {
    typeOptions += `<option value="${key}"${key === account.type ? " selected" : ""}>${accountTypes[key]}</option>`;
  }
  openModal("Edit account",
    `<div class="modal-form">
      <label class="field">Code
        <input id="m-code" value="${escapeHtml(account.code)}" disabled />
        <small class="sub">The code can’t change because entries and reports refer to it.</small>
      </label>
      <label class="field">Account name
        <input id="m-name" value="${escapeHtml(account.name)}" />
      </label>
      <label class="field">Type
        <select id="m-type">${typeOptions}</select>
      </label>
      <label class="field">Normal balance
        <select id="m-side">
          <option value="D"${account.side === "D" ? " selected" : ""}>Debit</option>
          <option value="C"${account.side === "C" ? " selected" : ""}>Credit</option>
        </select>
      </label>
    </div>`,
    "Save changes",
    function () {
      const name = $("#m-name").value.trim();
      if (!name) return "Enter an account name.";
      account.name = name;
      account.type = $("#m-type").value;
      account.side = $("#m-side").value;
      showPage();
    });
}

// ---------- journal + adjusting entries ----------

function entryTable(isAdjusting) {
  const list = entries
    .filter(function (e) {
      return e.isAdjusting === isAdjusting;
    })
    .sort(function (a, b) {
      return a.date.localeCompare(b.date) || a.id - b.id;
    });

  if (list.length === 0) {
    return `<p class="hint">No entries yet.</p>`;
  }

  let rows = "";
  list.forEach(function (e) {
    rows += `
      <tr>
        <td rowspan="2">${e.date}</td>
        <td>${escapeHtml(accountName(e.debit))}</td>
        <td class="num">${formatPeso(e.amount)}</td>
        <td></td>
        <td rowspan="2">${rowActions("editEntry", "deleteEntry", e.id)}</td>
      </tr>
      <tr>
        <td >
          ${escapeHtml(accountName(e.credit))}<br />
          <small class="sub">${escapeHtml(e.description)}</small>
        </td>
        <td></td>
        <td class="num">${formatPeso(e.amount)}</td>
      </tr>`;
  });

  return `
    <div class="table-wrap">
      <table>
        <tr>
          <th>Date</th>
          <th>Account / description</th>
          <th class="num">Debit</th>
          <th class="num">Credit</th>
          <th></th>
        </tr>
        ${rows}
      </table>
    </div>`;
}

function entryForm(isAdjusting) {
  const prefix = isAdjusting ? "adj" : "tx";

  let typePicker = "";
  let description = "";
  if (isAdjusting) {
    let options = "";
    for (const name in adjustmentTypes) {
      options += `<option>${name}</option>`;
    }
    typePicker = `
      <label class="field f-type">Adjustment type
        <select id="adj-type" onchange="fillFromTemplate()">${options}</select>
      </label>`;
    description = adjustmentTypes["Supplies used"][2];
  }

  const defaultDebit = isAdjusting ? "5030" : "1010";
  const defaultCredit = isAdjusting ? "1030" : "4010";

  return `
    <div class="entry-form${isAdjusting ? " is-adj" : ""}" oninput="updatePreview('${prefix}')" onchange="updatePreview('${prefix}')">
      ${typePicker}
      <label class="field f-date">Date
        <input type="date" id="${prefix}-date" value="2023-12-31" />
      </label>
      <label class="field f-desc">Description
        <input id="${prefix}-desc" placeholder="Description" value="${escapeHtml(description)}" />
      </label>
      <label class="field f-amount">Amount (₱)
        <span class="money">
          <span class="money-sign">₱</span>
          <input type="number" min="0" step="0.01" id="${prefix}-amount" placeholder="0.00" inputmode="decimal" />
        </span>
      </label>
      <label class="field f-debit">
        <span>Debit account <b class="side dr">DR</b></span>
        <select id="${prefix}-debit">${accountOptions(defaultDebit)}</select>
      </label>
      <label class="field f-credit">
        <span>Credit account <b class="side cr">CR</b></span>
        <select id="${prefix}-credit">${accountOptions(defaultCredit)}</select>
      </label>
    </div>
    <div class="form-foot">
      <div class="preview" id="${prefix}-preview"></div>
      <button class="primary" onclick="postEntry(${isAdjusting})">${icon("plus", 18)} Post entry</button>
    </div>
    <div class="error">${errors[prefix] || ""}</div>`;
}

// shows the journal entry the way it will be written, as the form is filled in
function updatePreview(prefix) {
  const box = $("#" + prefix + "-preview");
  if (!box) return;

  const amount = Math.round(parseFloat($("#" + prefix + "-amount").value) * 100) / 100;
  const shown = amount > 0 ? formatPeso(amount) : "₱0.00";

  box.innerHTML = `
    <span class="preview-label">Journal entry preview</span>
    <div class="pv-line">
      <b class="side dr">DR</b>
      <span>${escapeHtml(accountName($("#" + prefix + "-debit").value))}</span>
      <span class="num">${shown}</span>
    </div>
    <div class="pv-line pv-credit">
      <b class="side cr">CR</b>
      <span>${escapeHtml(accountName($("#" + prefix + "-credit").value))}</span>
      <span class="num">${shown}</span>
    </div>`;
}

function fillFromTemplate() {
  const template = adjustmentTypes[$("#adj-type").value];
  $("#adj-debit").value = template[0];
  $("#adj-credit").value = template[1];
  $("#adj-desc").value = template[2];
  updatePreview("adj");
}

function postEntry(isAdjusting) {
  const prefix = isAdjusting ? "adj" : "tx";
  const date = $("#" + prefix + "-date").value;
  const description = $("#" + prefix + "-desc").value.trim();
  const debit = $("#" + prefix + "-debit").value;
  const credit = $("#" + prefix + "-credit").value;
  const amount = Math.round(parseFloat($("#" + prefix + "-amount").value) * 100) / 100;

  if (!date || !description || !(amount > 0)) {
    errors[prefix] = "Fill in the date, description and an amount above zero.";
    return showPage();
  }
  if (debit === credit) {
    errors[prefix] = "Debit and credit accounts must be different.";
    return showPage();
  }

  entries.push(newEntry(date, description, debit, credit, amount, isAdjusting));
  errors[prefix] = "";
  showPage();
}

function findEntry(id) {
  return entries.find(function (e) { return String(e.id) === String(id); });
}

function deleteEntry(id) {
  const e = findEntry(id);
  if (!e) return;
  openModal("Delete this entry?",
    `<p><b>${escapeHtml(e.description)}</b> · ${e.date} · ${formatPeso(e.amount)}</p>
     <p class="sub">Debit ${escapeHtml(accountName(e.debit))}<br />Credit ${escapeHtml(accountName(e.credit))}</p>
     <p class="sub">This can’t be undone.</p>`,
    "Delete entry",
    function () {
      entries = entries.filter(function (x) { return x.id !== e.id; });
      showPage();
    }, true);
}

function editEntry(id) {
  const e = findEntry(id);
  if (!e) return;
  openModal(e.isAdjusting ? "Edit adjusting entry" : "Edit transaction",
    `<div class="modal-form">
      <label class="field">Date
        <input type="date" id="m-date" value="${escapeHtml(e.date)}" />
      </label>
      <label class="field">Amount (₱)
        <span class="money"><span class="money-sign">₱</span>
        <input type="number" min="0" step="0.01" id="m-amount" value="${e.amount}" inputmode="decimal" /></span>
      </label>
      <label class="field wide-field">Description
        <input id="m-desc" value="${escapeHtml(e.description)}" />
      </label>
      <label class="field">
        <span>Debit account <b class="side dr">DR</b></span>
        <select id="m-debit">${accountOptions(e.debit)}</select>
      </label>
      <label class="field">
        <span>Credit account <b class="side cr">CR</b></span>
        <select id="m-credit">${accountOptions(e.credit)}</select>
      </label>
    </div>`,
    "Save changes",
    function () {
      const date = $("#m-date").value;
      const description = $("#m-desc").value.trim();
      const amount = Math.round(parseFloat($("#m-amount").value) * 100) / 100;
      const debit = $("#m-debit").value;
      const credit = $("#m-credit").value;
      if (!date || !description || !(amount > 0)) return "Fill in the date, description and an amount above zero.";
      if (debit === credit) return "Debit and credit accounts must be different.";
      e.date = date;
      e.description = description;
      e.amount = amount;
      e.debit = debit;
      e.credit = credit;
      showPage();
    });
}

function transactionsPage() {
  return `
    <div class="card form-card">
      ${formHead("swap", "purple", "Record a business transaction", "Each transaction has one debit and one equal credit, so the books stay balanced.")}
      ${entryForm(false)}
    </div>
    <div class="card">
      <h2>General Journal</h2>
      ${entryTable(false)}
    </div>`;
}

function adjustmentsPage() {
  return `
    <div class="card form-card">
      ${formHead("edit", "orange", "Record an adjusting entry", "Picking a type fills in the usual accounts, but you can still change them. Adjustments show up in the Adjusted Trial Balance, the Worksheet and the Financial Statements.")}
      ${entryForm(true)}
    </div>
    <div class="card">
      <h2>Adjusting Entries</h2>
      ${entryTable(true)}
    </div>`;
}

// ---------- worksheet ----------

const COMPANY = "AAA Computer Services";
const PERIOD_END = "December 31, 2023";

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Gross debit / credit totals of the adjusting entries (the worksheet shows them un-netted).
function getAdjustmentColumns() {
  const cols = {};
  accounts.forEach(function (a) {
    cols[a.code] = [0, 0];
  });
  entries.forEach(function (e) {
    if (!e.isAdjusting) return;
    cols[e.debit][0] += e.amount;
    cols[e.credit][1] += e.amount;
  });
  return cols;
}

function fullWorksheetPage() {
  const before = getBalances(false);
  const adjCols = getAdjustmentColumns();
  const sums = new Array(10).fill(0);
  let rows = "";

  sortedAccounts().forEach(function (a) {
    const tb = toColumns(before[a.code]);
    const adj = adjCols[a.code];
    const adjusted = toColumns(before[a.code] + adj[0] - adj[1]);
    const isIS = a.type === "R" || a.type === "X";
    const is = isIS ? adjusted : [0, 0];
    const bs = isIS ? [0, 0] : adjusted;
    const all = tb.concat(adj, adjusted, is, bs);

    if (!all.some(function (v) { return v; })) return;
    all.forEach(function (v, i) { sums[i] += v; });

    rows += `<tr><td>${a.code}</td><td>${escapeHtml(a.name)}</td>`;
    all.forEach(function (v) {
      rows += `<td class="num">${formatPeso(round2(v))}</td>`;
    });
    rows += `</tr>`;
  });

  const t = sums.map(round2);
  const netIncome = round2(t[7] - t[6]); // IS credits - IS debits
  const isDebit = round2(t[6] + Math.max(netIncome, 0));
  const isCredit = round2(t[7] + Math.max(-netIncome, 0));
  const bsDebit = round2(t[8] + Math.max(-netIncome, 0));
  const bsCredit = round2(t[9] + Math.max(netIncome, 0));

  function money(n) {
    return formatPeso(n) || "₱0.00";
  }
  function check(d, c) {
    return d === c ? `<span class="good">✓ Balanced</span>` : `<span class="bad">✗ Out of balance</span>`;
  }
  function cells(list) {
    return list.map(function (n) { return `<td class="num">${money(n)}</td>`; }).join("");
  }

  const niLabel = netIncome >= 0 ? "Net income" : "Net loss";
  const niIS = netIncome >= 0 ? [netIncome, 0] : [0, -netIncome];
  const niBS = netIncome >= 0 ? [0, netIncome] : [-netIncome, 0];
  const blank = '<td class="num"></td>';
  const colsFor = function (list) { return list.map(function (n) { return n ? `<td class="num">${money(n)}</td>` : blank; }).join(""); };

  return `
    <div class="card">
      <h2>${COMPANY} · Worksheet for the month ended ${PERIOD_END}</h2>
      <div class="table-wrap">
        <table class="worksheet">
          <tr>
            <th rowspan="2">Code</th>
            <th rowspan="2">Account</th>
            <th colspan="2" class="num grp">Trial balance</th>
            <th colspan="2" class="num grp">Adjustments</th>
            <th colspan="2" class="num grp">Adjusted TB</th>
            <th colspan="2" class="num grp">Income statement</th>
            <th colspan="2" class="num grp">Financial position</th>
          </tr>
          <tr>${'<th class="num">Debit</th><th class="num">Credit</th>'.repeat(5)}</tr>
          ${rows}
          <tr class="totals"><td></td><td>Totals</td>${cells(t)}</tr>
          <tr><td></td><td>${niLabel}</td>${blank.repeat(6)}${colsFor(niIS)}${colsFor(niBS)}</tr>
          <tr class="totals dbl"><td></td><td>Totals</td>${blank.repeat(6)}${cells([isDebit, isCredit, bsDebit, bsCredit])}</tr>
          <tr class="checks"><td></td><td>Check</td>
            <td colspan="2" class="num">${check(t[0], t[1])}</td>
            <td colspan="2" class="num">${check(t[2], t[3])}</td>
            <td colspan="2" class="num">${check(t[4], t[5])}</td>
            <td colspan="2" class="num">${check(isDebit, isCredit)}</td>
            <td colspan="2" class="num">${check(bsDebit, bsCredit)}</td></tr>
        </table>
      </div>
      <p class="hint">Adjustments are shown as gross debits and credits, as on paper. The ${niLabel.toLowerCase()} is the balancing figure of the Income Statement columns and moves to the Financial Position credit side.</p>
    </div>`;
}

// ---------- financial statements (built live from the books) ----------

// Statement row: label, an optional detail amount, an optional total amount.
// ul = single line under the amount, dul = double line (final totals).
function sRow(label, detail, total, o) {
  o = o || {};
  const cls = (o.indent ? " indent" : "") + (o.bold ? " bold" : "");
  const d = detail === undefined || detail === null ? "" : formatPeso(round2(Math.abs(detail))) || "₱0.00";
  const tt = total === undefined || total === null ? "" : formatPeso(round2(Math.abs(total))) || "₱0.00";
  const neg = function (v, txt) { return v < 0 && txt ? "(" + txt + ")" : txt; };
  return `<tr class="${cls.trim()}"><td class="lbl">${label}</td>` +
    `<td class="num ${o.ulDetail ? "ul" : ""}">${neg(detail, d)}</td>` +
    `<td class="num ${o.ul ? "ul" : ""} ${o.dul ? "dul" : ""}">${neg(total, tt)}</td></tr>`;
}

function stmtCard(title, period, body, foot) {
  return `
    <div class="card statement">
      <div class="stmt-head">
        <div class="stmt-co">${COMPANY}</div>
        <div class="stmt-title">${title}</div>
        <div class="stmt-period">${period}</div>
      </div>
      <div class="table-wrap"><table class="stmt">${body}</table></div>${foot || ""}
    </div>`;
}

function getStatementData() {
  const before = getBalances(false);
  const adj = getBalances(true);
  const final = {};
  accounts.forEach(function (a) {
    final[a.code] = before[a.code] + adj[a.code]; // debit-positive
  });
  const withType = function (type) {
    return sortedAccounts().filter(function (a) { return a.type === type && round2(final[a.code]) !== 0; });
  };
  const revenues = withType("R");
  const expenses = withType("X");
  const totalRevenue = round2(revenues.reduce(function (s, a) { return s - final[a.code]; }, 0));
  const totalExpenses = round2(expenses.reduce(function (s, a) { return s + final[a.code]; }, 0));
  return { final: final, revenues: revenues, expenses: expenses, totalRevenue: totalRevenue, totalExpenses: totalExpenses, netIncome: round2(totalRevenue - totalExpenses) };
}

function incomeStatementHtml(d) {
  let body = `<tr class="sec"><td colspan="3">Revenues</td></tr>`;
  d.revenues.forEach(function (a, i) {
    body += sRow(escapeHtml(a.name), null, -d.final[a.code], { indent: true, ul: i === d.revenues.length - 1 && d.revenues.length > 1 });
  });
  body += sRow("Total revenues", null, d.totalRevenue, { bold: true });
  body += `<tr class="sec"><td colspan="3">Expenses</td></tr>`;
  d.expenses.forEach(function (a) {
    body += sRow(escapeHtml(a.name), d.final[a.code], null, { indent: true });
  });
  body += sRow("Total expenses", null, d.totalExpenses, { bold: true, ul: true });
  body += sRow(d.netIncome >= 0 ? "Net income" : "Net loss", null, d.netIncome, { bold: true, dul: true });
  return stmtCard("Income Statement", `For the Month Ended ${PERIOD_END}`, body);
}

function equityStatementHtml(d) {
  const capital = -d.final["3010"];
  const drawing = d.final["3020"];
  const end = round2(capital + d.netIncome - drawing);
  let body = "";
  body += sRow("A, Capital, December 1, 2023", null, 0, { bold: true });
  body += sRow("Add: Investment during the month", capital, null, { indent: true });
  body += sRow(d.netIncome >= 0 ? "Net income" : "Net loss", d.netIncome, null, { indent: true, ulDetail: true });
  body += sRow("", null, round2(capital + d.netIncome), { ul: false });
  body += sRow("Less: Drawings", null, drawing, { indent: true, ul: true });
  body += sRow("A, Capital, " + PERIOD_END, null, end, { bold: true, dul: true });
  return stmtCard("Statement of Owner's Equity", `For the Month Ended ${PERIOD_END}`, body);
}

function financialPositionHtml(d) {
  const f = d.final;
  const byType = function (t) { return sortedAccounts().filter(function (a) { return a.type === t && round2(f[a.code]) !== 0; }); };
  const assets = byType("A");
  const liabilities = byType("L");
  const equity = round2(-f["3010"] + d.netIncome - f["3020"]);
  const totalAssets = round2(assets.reduce(function (s, a) { return s + f[a.code]; }, 0));
  const totalLiab = round2(liabilities.reduce(function (s, a) { return s - f[a.code]; }, 0));

  let body = `<tr class="sec"><td colspan="3">Assets</td></tr>`;
  assets.forEach(function (a, i) {
    if (a.side === "C") return; // contra accounts are printed under their asset
    const next = assets[i + 1];
    if (next && next.side === "C") {
      body += sRow(escapeHtml(a.name), f[a.code], null, { indent: true });
      body += sRow("Less: " + escapeHtml(next.name), f[next.code], null, { indent: true, ulDetail: true });
      body += sRow(escapeHtml(a.name) + ", net", null, f[a.code] + f[next.code], { indent: true });
    } else {
      body += sRow(escapeHtml(a.name), null, f[a.code], { indent: true });
    }
  });
  body += sRow("Total assets", null, totalAssets, { bold: true, dul: true });
  body += `<tr class="sec"><td colspan="3">Liabilities</td></tr>`;
  liabilities.forEach(function (a) {
    body += sRow(escapeHtml(a.name), -f[a.code], null, { indent: true });
  });
  body += sRow("Total liabilities", null, totalLiab, { bold: true, ul: true });
  body += `<tr class="sec"><td colspan="3">Owner's equity</td></tr>`;
  body += sRow("A, Capital, " + PERIOD_END, null, equity, { indent: true, ul: true });
  body += sRow("Total liabilities and owner's equity", null, round2(totalLiab + equity), { bold: true, dul: true });

  const ok = totalAssets === round2(totalLiab + equity);
  const eq = `<div class="eq-check ${ok ? "good" : "bad"}">${ok ? "✓" : "✗"} Accounting equation: Assets ${formatPeso(totalAssets)} = Liabilities ${formatPeso(totalLiab)} + Equity ${formatPeso(equity)}</div>`;
  return stmtCard("Statement of Financial Position", `As of ${PERIOD_END}`, body, eq);
}

// Direct-method cash flow: every entry that touches Cash, classified by the other account.
function cashFlowHtml(d) {
  const CASH = "1010";
  const sec = getCashSections();

  let body = "";
  let net = 0;
  const parts = [["operating", "Cash flows from operating activities"], ["investing", "Cash flows from investing activities"], ["financing", "Cash flows from financing activities"]];
  parts.forEach(function (p) {
    const s = sec[p[0]];
    const inKeys = Object.keys(s.in), outKeys = Object.keys(s.out);
    if (!inKeys.length && !outKeys.length) return;
    body += `<tr class="sec"><td colspan="3">${p[1]}</td></tr>`;
    let total = 0;
    inKeys.forEach(function (k) { total += s.in[k]; body += sRow(escapeHtml(k), s.in[k], null, { indent: true }); });
    outKeys.forEach(function (k, i) {
      total -= s.out[k];
      body += sRow(escapeHtml(k), -s.out[k], null, { indent: true, ulDetail: i === outKeys.length - 1 });
    });
    total = round2(total);
    net += total;
    const label = "Net cash " + (total >= 0 ? "provided by" : "used in") + " " + p[0] + " activities";
    body += sRow(label, null, total, { bold: true });
  });
  net = round2(net);
  const before = round2(0);
  body += sRow("Net increase (decrease) in cash", null, net, { bold: true, ul: true });
  body += sRow("Cash, December 1, 2023", null, before, { indent: true });
  body += sRow("Cash, " + PERIOD_END, null, round2(net + before), { bold: true, dul: true });

  const endingCash = round2(d.final[CASH]);
  const ok = endingCash === round2(net + before);
  const chk = `<div class="eq-check ${ok ? "good" : "bad"}">${ok ? "✓" : "✗"} Ending cash ${formatPeso(round2(net + before))} ${ok ? "matches" : "does not match"} Cash on the Statement of Financial Position (${formatPeso(endingCash)})</div>`;
  return stmtCard("Statement of Cash Flows", `For the Month Ended ${PERIOD_END}`, body, chk);
}

function statementsPage() {
  const d = getStatementData();
  return incomeStatementHtml(d) + equityStatementHtml(d) + financialPositionHtml(d) + cashFlowHtml(d);
}

// ---------- trial balance / adjusted trial balance ----------

function simpleTbPage(adjusted) {
  const before = getBalances(false);
  const adj = getBalances(true);
  let rows = "", debit = 0, credit = 0;

  sortedAccounts().forEach(function (a) {
    const balance = round2(before[a.code] + (adjusted ? adj[a.code] : 0));
    if (!balance) return;
    const cols = toColumns(balance);
    debit += cols[0];
    credit += cols[1];
    rows += `<tr><td>${a.code}</td><td>${escapeHtml(a.name)}</td><td class="num">${formatPeso(cols[0])}</td><td class="num">${formatPeso(cols[1])}</td></tr>`;
  });
  debit = round2(debit);
  credit = round2(credit);

  const ok = debit === credit;
  const title = adjusted ? "Adjusted Trial Balance" : "Trial Balance";
  const note = adjusted
    ? "Every account after the adjusting entries. This is the starting point for the Income Statement and the Financial Position."
    : "Every account before the adjusting entries. Total debits must equal total credits.";

  return `
    <div class="card statement">
      <div class="stmt-head">
        <div class="stmt-co">${COMPANY}</div>
        <div class="stmt-title">${title}</div>
        <div class="stmt-period">As of ${PERIOD_END}</div>
      </div>
      <div class="table-wrap">
        <table class="tb">
          <tr><th>Code</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr>
          ${rows}
          <tr class="totals"><td></td><td>Totals</td><td class="num dul">${formatPeso(debit) || "₱0.00"}</td><td class="num dul">${formatPeso(credit) || "₱0.00"}</td></tr>
        </table>
      </div>
      <div class="eq-check ${ok ? "good" : "bad"}">${ok ? "✓ Balanced: debits equal credits" : "✗ Out of balance by " + formatPeso(Math.abs(round2(debit - credit)))}</div>
      <p class="hint center">${note}</p>
    </div>`;
}

function trialBalancePage() {
  return simpleTbPage(false);
}

function adjustedTrialBalancePage() {
  return simpleTbPage(true);
}

// ---------- one page per statement ----------

function incomeStatementPage() {
  return incomeStatementHtml(getStatementData());
}

function equityPage() {
  return equityStatementHtml(getStatementData());
}

function financialPositionPage() {
  return financialPositionHtml(getStatementData());
}

// ---------- cash flow (statement + reports) ----------

function setCashView(view) {
  cashView = view;
  showPage();
}

function cashFlowPage() {
  const d = getStatementData();
  const views = ["Statement", "Indirect method", "Cash report"];
  let tabs = "";
  views.forEach(function (v) {
    tabs += `<button class="${v === cashView ? "active" : ""}" onclick="setCashView('${v}')">${v}</button>`;
  });

  let body;
  if (cashView === "Indirect method") body = cashFlowIndirectHtml(d);
  else if (cashView === "Cash report") body = cashReportHtml();
  else body = cashFlowHtml(d);

  return `
    <div class="view-bar">
      <span class="view-label">View report</span>
      <div class="seg">${tabs}</div>
    </div>
    ${body}`;
}

// Every entry that touches Cash, grouped by activity (shared by the direct statement and the indirect view).
function getCashSections() {
  const CASH = "1010";
  const sec = { operating: { in: {}, out: {} }, investing: { in: {}, out: {} }, financing: { in: {}, out: {} } };
  const section = function (other) {
    if (other === "3010" || other === "3020") return "financing";
    if (other === "1110" || other === "1111") return "investing";
    return "operating";
  };
  const labelIn = { "4010": "Cash received from customers", "1020": "Cash received from customers", "2020": "Cash received from customers", "3010": "Owner's investment", "1110": "Sale of equipment" };
  const labelOut = { "5010": "Cash paid for salaries", "5020": "Cash paid for advertising", "2010": "Cash paid for advertising", "1030": "Cash paid for office supplies", "5030": "Cash paid for office supplies", "3020": "Owner's drawings", "1110": "Purchase of office equipment" };

  entries.forEach(function (e) {
    let other = null, dir = null;
    if (e.debit === CASH) { other = e.credit; dir = "in"; }
    else if (e.credit === CASH) { other = e.debit; dir = "out"; }
    else return;
    const name = (dir === "in" ? labelIn : labelOut)[other] ||
      ((dir === "in" ? "Cash received: " : "Cash paid: ") + accountName(other));
    const bucket = sec[section(other)][dir];
    bucket[name] = (bucket[name] || 0) + e.amount;
  });
  return sec;
}

function sectionTotal(sec, key) {
  let total = 0;
  Object.keys(sec[key].in).forEach(function (k) { total += sec[key].in[k]; });
  Object.keys(sec[key].out).forEach(function (k) { total -= sec[key].out[k]; });
  return round2(total);
}

// Indirect method: start from net income and undo the non-cash items.
function cashFlowIndirectHtml(d) {
  const sec = getCashSections();
  const f = d.final;
  let body = "";
  body += sRow("Net income", d.netIncome, null, { bold: true });
  body += `<tr class="sec"><td colspan="3">Adjustments to reconcile net income to operating cash</td></tr>`;

  const lines = [];
  sortedAccounts().forEach(function (a) {
    if (a.code === "1010" || a.code === "1110") return;
    if (a.type !== "A" && a.type !== "L") return;
    const amount = round2(-f[a.code]); // asset up = cash down, liability up = cash up
    if (!amount) return;
    let label;
    if (a.type === "A" && a.side === "C") label = "Add: Depreciation (" + a.name + ")";
    else label = (amount < 0 ? (a.type === "A" ? "Increase in " : "Decrease in ") : (a.type === "A" ? "Decrease in " : "Increase in ")) + a.name;
    lines.push([label, amount]);
  });
  let operating = d.netIncome;
  lines.forEach(function (l, i) {
    operating += l[1];
    body += sRow(escapeHtml(l[0]), l[1], null, { indent: true, ulDetail: i === lines.length - 1 });
  });
  operating = round2(operating);
  body += sRow("Net cash " + (operating >= 0 ? "provided by" : "used in") + " operating activities", null, operating, { bold: true });

  let net = operating;
  [["investing", "Cash flows from investing activities"], ["financing", "Cash flows from financing activities"]].forEach(function (p) {
    const s = sec[p[0]];
    const inKeys = Object.keys(s.in), outKeys = Object.keys(s.out);
    if (!inKeys.length && !outKeys.length) return;
    body += `<tr class="sec"><td colspan="3">${p[1]}</td></tr>`;
    inKeys.forEach(function (k) { body += sRow(escapeHtml(k), s.in[k], null, { indent: true }); });
    outKeys.forEach(function (k, i) { body += sRow(escapeHtml(k), -s.out[k], null, { indent: true, ulDetail: i === outKeys.length - 1 }); });
    const total = sectionTotal(sec, p[0]);
    net += total;
    body += sRow("Net cash " + (total >= 0 ? "provided by" : "used in") + " " + p[0] + " activities", null, total, { bold: true });
  });
  net = round2(net);
  body += sRow("Net increase (decrease) in cash", null, net, { bold: true, ul: true });
  body += sRow("Cash, December 1, 2023", null, 0, { indent: true });
  body += sRow("Cash, " + PERIOD_END, null, net, { bold: true, dul: true });

  const direct = sectionTotal(sec, "operating");
  const ok = direct === operating && round2(f["1010"]) === net;
  const chk = `<div class="eq-check ${ok ? "good" : "bad"}">${ok ? "✓" : "✗"} Operating cash by the indirect method (${formatPeso(operating) || "₱0.00"}) ${direct === operating ? "equals" : "does not equal"} the direct method (${formatPeso(direct) || "₱0.00"}), and ending cash matches the Statement of Financial Position.</div>`;
  return stmtCard("Statement of Cash Flows · Indirect Method", `For the Month Ended ${PERIOD_END}`, body, chk);
}

// Cash report: every cash receipt and payment with a running balance.
function cashReportHtml() {
  const list = entries
    .filter(function (e) { return e.debit === "1010" || e.credit === "1010"; })
    .sort(function (a, b) { return a.date.localeCompare(b.date) || a.id - b.id; });

  let rows = "", balance = 0, receipts = 0, payments = 0;
  list.forEach(function (e) {
    const isIn = e.debit === "1010";
    const other = isIn ? e.credit : e.debit;
    balance += isIn ? e.amount : -e.amount;
    if (isIn) receipts += e.amount; else payments += e.amount;
    rows += `<tr>
      <td>${e.date}</td>
      <td>${escapeHtml(e.description)}<br /><small class="sub">${escapeHtml(accountName(other))}${e.isAdjusting ? " · adjusting entry" : ""}</small></td>
      <td class="num">${isIn ? formatPeso(e.amount) : ""}</td>
      <td class="num">${isIn ? "" : formatPeso(e.amount)}</td>
      <td class="num">${formatPeso(round2(balance)) || "₱0.00"}</td>
    </tr>`;
  });

  return `
    <div class="card statement">
      <div class="stmt-head">
        <div class="stmt-co">${COMPANY}</div>
        <div class="stmt-title">Cash Receipts and Payments Report</div>
        <div class="stmt-period">For the Month Ended ${PERIOD_END}</div>
      </div>
      <div class="table-wrap">
        <table class="tb">
          <tr><th>Date</th><th>Description</th><th class="num">Receipts</th><th class="num">Payments</th><th class="num">Balance</th></tr>
          ${rows}
          <tr class="totals"><td></td><td>Totals</td><td class="num">${formatPeso(round2(receipts)) || "₱0.00"}</td><td class="num">${formatPeso(round2(payments)) || "₱0.00"}</td><td class="num dul">${formatPeso(round2(balance)) || "₱0.00"}</td></tr>
        </table>
      </div>
      <p class="hint center">Each line is an entry that touches the Cash account. The last balance is your ending cash.</p>
    </div>`;
}

// ---------- navigation ----------

const pages = {
  "Dashboard": dashboardPage,
  "Chart of Accounts": chartOfAccountsPage,
  "Business Transactions": transactionsPage,
  "Trial Balance": trialBalancePage,
  "Adjustments": adjustmentsPage,
  "Adjusted Trial Balance": adjustedTrialBalancePage,
  "Full Worksheet": fullWorksheetPage,
  "Income Statement": incomeStatementPage,
  "Owner's Equity": equityPage,
  "Financial Position": financialPositionPage,
  "Cashflow": cashFlowPage
};

function goToTab(name) {
  currentTab = name;
  showPage();
  window.scrollTo(0, 0);
}

function toggleGroup(name) {
  const item = navItems.find(function (n) { return n.group === name; });
  const isOpen = openGroups[name] === undefined ? item.tabs.indexOf(currentTab) >= 0 : openGroups[name];
  openGroups[name] = !isOpen;
  showTabs();
}

function showTabs() {
  let html = "";
  navItems.forEach(function (item) {
    if (item.tab) {
      const active = item.tab === currentTab ? "active" : "";
      html += `<button class="${active}" onclick="goToTab('${item.tab}')">${icon(item.icon, 19)}<span>${item.tab}</span></button>`;
      return;
    }
    const holdsCurrent = item.tabs.indexOf(currentTab) >= 0;
    const open = openGroups[item.group] === undefined ? holdsCurrent : openGroups[item.group];
    html += `<div class="nav-group ${open ? "open" : ""} ${holdsCurrent ? "has-active" : ""}">
      <button class="group-head" aria-expanded="${open}" onclick="toggleGroup('${item.group}')">${icon(item.icon, 19)}<span>${item.group}</span><span class="chev">${icon("chev", 16)}</span></button>
      <div class="sub-list">`;
    item.tabs.forEach(function (name) {
      html += `<button class="${name === currentTab ? "active" : ""}" onclick="goToTab('${name.replace("'", "\\'")}')"><span>${name}</span></button>`;
    });
    html += `</div></div>`;
  });
  $("#tabs").innerHTML = html;
}

// ---------- Dashboard tab ----------

// running totals of revenue and expenses on each date that has an entry
function getPerformance() {
  const byDate = {};
  entries.forEach(function (e) {
    if (!byDate[e.date]) byDate[e.date] = { revenue: 0, expenses: 0 };
    [[e.debit, 1], [e.credit, -1]].forEach(function (side) {
      const account = accounts.find(function (a) {
        return a.code === side[0];
      });
      if (!account) return;
      if (account.type === "R") byDate[e.date].revenue -= side[1] * e.amount;
      if (account.type === "X") byDate[e.date].expenses += side[1] * e.amount;
    });
  });

  let revenue = 0;
  let expenses = 0;
  return Object.keys(byDate).sort().map(function (date) {
    revenue += byDate[date].revenue;
    expenses += byDate[date].expenses;
    return { date: date, revenue: revenue, expenses: expenses };
  });
}

// rounds the top of the chart up to something readable (34,000 -> 50,000)
function niceMax(value) {
  if (value <= 0) return 1000;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / power;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * power;
}

function shortPeso(value) {
  if (value >= 1000) return "₱" + Math.round(value / 100) / 10 + "K";
  return "₱" + value;
}

function shortDate(date) {
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
}

// to-do list built from the actual books, so it changes as you post things
function todoList() {
  const before = getBalances(false);
  const adjusted = getBalances(true);
  function balance(code) {
    return (before[code] || 0) + (adjusted[code] || 0);
  }
  function adjusted_(code) {
    return entries.some(function (e) {
      return e.isAdjusting && (e.debit === code || e.credit === code);
    });
  }

  const items = [];
  if (balance("1030") > 0 && !adjusted_("1030")) {
    items.push(["Record supplies used (" + formatPeso(balance("1030")) + " still on hand)", "Adjustments"]);
  }
  if (balance("1110") > 0 && !adjusted_("1111")) {
    items.push(["Record depreciation on your office equipment", "Adjustments"]);
  }
  if (balance("2020") < 0 && !adjusted_("2020")) {
    items.push(["Recognize earned computer services (" + formatPeso(-balance("2020")) + " unearned)", "Adjustments"]);
  }
  if (balance("1020") > 0) {
    items.push(["Collect " + formatPeso(balance("1020")) + " in unpaid services", "Business Transactions"]);
  }
  if (balance("2010") < 0) {
    items.push(["Pay " + formatPeso(-balance("2010")) + " advertising payable", "Business Transactions"]);
  }

  if (items.length === 0) {
    return `<p class="hint">You’re all caught up. Nothing needs adjusting right now.</p>`;
  }

  let html = "";
  items.slice(0, 5).forEach(function (item) {
    html += `<button class="todo" onclick="goToTab('${item[1]}')"><span>${item[0]}</span><span>›</span></button>`;
  });
  return html;
}

function recentEntries() {
  const latest = entries.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id - a.id;
  }).slice(0, 6);

  let rows = "";
  latest.forEach(function (e) {
    rows += `
      <tr>
        <td>${e.date}</td>
        <td>${escapeHtml(e.description)}</td>
        <td><span class="pill ${e.isAdjusting ? "pill-A" : ""}">${e.isAdjusting ? "Adjustment" : "Transaction"}</span></td>
        <td class="num">${formatPeso(e.amount)}</td>
      </tr>`;
  });

  return `
    <div class="table-wrap compact">
      <table>
        <tr><th>Date</th><th>Description</th><th>Type</th><th class="num">Amount</th></tr>
        ${rows}
      </table>
    </div>`;
}

// horizontal bars: each expense account as a share of all expenses
function expenseBars() {
  const before = getBalances(false);
  const adjusted = getBalances(true);
  const list = [];
  let total = 0;

  accounts.forEach(function (a) {
    if (a.type !== "X") return;
    const amount = before[a.code] + adjusted[a.code];
    if (amount > 0) {
      list.push({ name: a.name, amount: amount });
      total += amount;
    }
  });

  if (total === 0) return `<p class="hint">No expenses yet.</p>`;
  list.sort(function (a, b) {
    return b.amount - a.amount;
  });

  let html = "";
  list.forEach(function (item) {
    const percent = Math.round(item.amount / total * 100);
    html += `
      <div class="bar-row">
        <div class="bar-top"><span>${escapeHtml(item.name)}</span><span class="sub">${formatPeso(item.amount)} · ${percent}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width: ${percent}%"></div></div>
      </div>`;
  });
  return html;
}

// ---------- Dashboard: cards + charts ----------

function dashCard(title, sub, report, body, cls) {
  return `
    <div class="card dash-card ${cls || ""}">
      <div class="card-head">
        <h2>${title}</h2>
        ${report ? `<button class="view-report" onclick="goToTab('${report.replace("'", "\\'")}')">View report</button>` : ""}
      </div>
      <p class="card-sub">${sub}</p>
      ${body}
    </div>`;
}

// money still owed on an account: what was put on account vs. what has been settled
function dueMeter(code, side, unpaidLabel, totalLabel, emptyText) {
  let billed = 0, settled = 0;
  entries.forEach(function (e) {
    if (e[side.bill] === code) billed += e.amount;
    if (e[side.settle] === code) settled += e.amount;
  });
  billed = round2(billed);
  settled = round2(Math.min(settled, billed));
  const unpaid = round2(billed - settled);
  if (billed === 0) return `<p class="hint">${emptyText}</p>`;
  const unpaidPct = Math.round(unpaid / billed * 100);
  return `
    <div class="meter-total">${totalLabel} <b>${formatPeso(unpaid) || "₱0.00"}</b></div>
    <div class="meter" role="img" aria-label="${unpaidPct}% still unpaid">
      <span class="m-unpaid" style="width:${unpaidPct}%"></span><span class="m-paid" style="width:${100 - unpaidPct}%"></span>
    </div>
    <div class="meter-legend">
      <div><span class="m-label unpaid">${unpaidLabel}</span><span class="m-amt">${formatPeso(unpaid) || "₱0.00"}</span></div>
      <div><span class="m-label paid">Settled</span><span class="m-amt">${formatPeso(settled) || "₱0.00"}</span></div>
    </div>`;
}

function dailyCash() {
  const byDate = {};
  entries.forEach(function (e) {
    const isIn = e.debit === "1010", isOut = e.credit === "1010";
    if (!isIn && !isOut) return;
    if (!byDate[e.date]) byDate[e.date] = { inc: 0, out: 0 };
    if (isIn) byDate[e.date].inc += e.amount;
    if (isOut) byDate[e.date].out += e.amount;
  });
  return Object.keys(byDate).sort().map(function (d) {
    return { date: d, a: round2(byDate[d].inc), b: round2(byDate[d].out) };
  });
}

function dailyProfitLoss() {
  const byDate = {};
  entries.forEach(function (e) {
    [[e.debit, 1], [e.credit, -1]].forEach(function (s) {
      const acc = accounts.find(function (a) { return a.code === s[0]; });
      if (!acc || (acc.type !== "R" && acc.type !== "X")) return;
      if (!byDate[e.date]) byDate[e.date] = { inc: 0, exp: 0 };
      if (acc.type === "R") byDate[e.date].inc -= s[1] * e.amount;
      else byDate[e.date].exp += s[1] * e.amount;
    });
  });
  return Object.keys(byDate).sort().map(function (d) {
    return { date: d, a: round2(byDate[d].inc), b: round2(byDate[d].exp) };
  });
}

function pesoShort(v) {
  return (v < 0 ? "-" : "") + shortPeso(Math.abs(v));
}

// opts.mode "diverge": a goes up, b goes down (cash flow).  "group": a and b side by side (profit & loss).
// opts.line: draw the a - b line with dots.
function drawBarChart(id, data, opts) {
  const host = $("#" + id);
  if (!host) return;
  if (!data.length) {
    host.innerHTML = `<p class="hint">Post entries to see this chart.</p>`;
    return;
  }

  const diverge = opts.mode === "diverge";
  const W = Math.max(host.clientWidth, 280);
  const H = 300, left = 62, right = 12, top = 16, bottom = 34;
  const maxA = niceMax(Math.max.apply(null, data.map(function (d) { return diverge ? d.a : Math.max(d.a, d.b); })));
  const maxB = diverge ? niceMax(Math.max.apply(null, data.map(function (d) { return d.b; }))) : 0;
  const lo = -maxB, hi = maxA;
  const y = function (v) { return top + (hi - v) / (hi - lo) * (H - top - bottom); };
  const slot = (W - left - right) / data.length;
  const bw = Math.max(6, Math.min(34, slot * (diverge ? 0.5 : 0.34)));
  const cx = function (i) { return left + slot * (i + 0.5); };

  let svg = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label}">`;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = lo + (hi - lo) * i / steps;
    svg += `<line class="gridline" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" />`;
    svg += `<text class="axis" x="${left - 8}" y="${y(v) + 4}" text-anchor="end">${pesoShort(Math.round(v))}</text>`;
  }
  if (diverge) svg += `<line class="zero-line" x1="${left}" x2="${W - right}" y1="${y(0)}" y2="${y(0)}" />`;

  const every = Math.ceil(data.length / Math.max(1, Math.floor((W - left - right) / 64)));
  data.forEach(function (d, i) {
    const label = `${shortDate(d.date)} · ${opts.aName} ${formatPeso(d.a) || "₱0"} · ${opts.bName} ${formatPeso(d.b) || "₱0"}`;
    if (diverge) {
      svg += `<rect class="bar-a" x="${cx(i) - bw / 2}" y="${y(d.a)}" width="${bw}" height="${Math.max(0, y(0) - y(d.a))}"><title>${label}</title></rect>`;
      svg += `<rect class="bar-b" x="${cx(i) - bw / 2}" y="${y(0)}" width="${bw}" height="${Math.max(0, y(-d.b) - y(0))}"><title>${label}</title></rect>`;
    } else {
      svg += `<rect class="bar-a" x="${cx(i) - bw - 2}" y="${y(d.a)}" width="${bw}" height="${Math.max(0, y(0) - y(d.a))}"><title>${label}</title></rect>`;
      svg += `<rect class="bar-b" x="${cx(i) + 2}" y="${y(d.b)}" width="${bw}" height="${Math.max(0, y(0) - y(d.b))}"><title>${label}</title></rect>`;
    }
    if (i % every === 0) svg += `<text class="axis" x="${cx(i)}" y="${H - 10}" text-anchor="middle">${shortDate(d.date)}</text>`;
  });

  if (opts.line) {
    const pts = data.map(function (d, i) { return [cx(i), y(d.a - d.b)]; });
    svg += `<polyline class="line-profit" points="${pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ")}" />`;
    pts.forEach(function (p, i) {
      svg += `<circle class="dot-profit" cx="${p[0]}" cy="${p[1]}" r="4.5"><title>${shortDate(data[i].date)} · Net ${formatPeso(round2(data[i].a - data[i].b)) || "₱0"}</title></circle>`;
    });
  }
  host.innerHTML = svg + "</svg>";
}

function drawDashboardCharts() {
  drawBarChart("cash-chart", dailyCash(), { mode: "diverge", line: true, label: "Cash coming in and going out", aName: "In", bName: "Out" });
  drawBarChart("pl-chart", dailyProfitLoss(), { mode: "group", label: "Income and expenses", aName: "Income", bName: "Expenses" });
}

function dashboardRange() {
  const dates = entries.map(function (e) { return e.date; }).sort();
  return dates.length ? dates[0] + "  –  " + dates[dates.length - 1] : "";
}

function cashSummary() {
  const rows = dailyCash();
  const inc = round2(rows.reduce(function (s, r) { return s + r.a; }, 0));
  const out = round2(rows.reduce(function (s, r) { return s + r.b; }, 0));
  const net = round2(inc - out);
  return `
    <div class="cash-side">
      <div><b class="in">${formatPeso(inc) || "₱0.00"}</b><span>Incoming</span></div>
      <div class="op">−</div>
      <div><b class="out">${formatPeso(out) || "₱0.00"}</b><span>Outgoing</span></div>
      <div class="op">=</div>
      <div><b class="net">${(net < 0 ? "-" : "") + (formatPeso(Math.abs(net)) || "₱0.00")}</b><span>Profit</span></div>
    </div>`;
}

function accountBalanceList() {
  const before = getBalances(false);
  const adj = getBalances(true);
  let rows = "", total = 0;
  sortedAccounts().forEach(function (a) {
    if (a.type !== "A") return;
    const bal = round2(before[a.code] + adj[a.code]);
    if (!bal) return;
    total += bal;
    rows += `<div class="bal-row"><span>${escapeHtml(a.name)}</span><span class="num">${bal < 0 ? "(" + formatPeso(-bal) + ")" : formatPeso(bal)}</span></div>`;
  });
  rows += `<div class="bal-row total"><span>Total assets</span><span class="num">${formatPeso(round2(total)) || "₱0.00"}</span></div>`;
  return rows;
}

function dashboardPage() {
  const legend = function (items) {
    return `<div class="legend-row">${items.map(function (i) { return `<span><span class="key ${i[1]}"></span>${i[0]}</span>`; }).join("")}</div>`;
  };
  return `
    <div class="dash-grid">
      ${dashCard("Receivables", "Amount that you’re yet to receive from your customers", "Financial Position",
        dueMeter("1020", { bill: "debit", settle: "credit" }, "Unpaid", "Total unpaid invoices:", "No sales on account yet."))}
      ${dashCard("Payables", "Amount that you’re yet to pay to your vendors", "Financial Position",
        dueMeter("2010", { bill: "credit", settle: "debit" }, "Unpaid", "Total unpaid bills:", "No bills on account yet."))}

      ${dashCard("Cash Flow", "Cash coming in and going out of your business", "Cashflow", `
        ${legend([["Incoming", "green"], ["Outgoing", "red"], ["Profit", "accent"]])}
        <div class="cash-wrap"><div id="cash-chart" class="chart-host"></div>${cashSummary()}</div>`, "full")}

      ${dashCard("Profit &amp; Loss", "Income and expenses, including unpaid invoices and bills", "Income Statement", `
        ${legend([["Income", "green"], ["Expense", "red"]])}
        <div id="pl-chart" class="chart-host"></div>`)}
      ${dashCard("Account Balance", "Current balance of your asset accounts", "Financial Position", accountBalanceList())}

      ${dashCard("Recent entries", "The latest things you posted", "", recentEntries())}
      ${dashCard("Before you close the books", "Based on what is in your books right now", "", todoList())}
    </div>`;
}

// the four cards at the top of every page (balances include adjustments)
function statCards() {
  const before = getBalances(false);
  const adjustments = getBalances(true);
  let cash = 0;
  let revenue = 0;
  let expenses = 0;

  accounts.forEach(function (a) {
    const balance = before[a.code] + adjustments[a.code];
    if (a.code === "1010") cash = balance;
    if (a.type === "R") revenue -= balance;
    if (a.type === "X") expenses += balance;
  });

  const net = revenue - expenses;
  const cards = [
    ["Cash on hand", cash, ""],
    ["Revenue", revenue, ""],
    ["Expenses", expenses, "", revenue > 0 ? Math.round(expenses / revenue * 100) + "% of revenue" : ""],
    ["Net " + (net >= 0 ? "income" : "loss"), Math.abs(net), net >= 0 ? "good" : "bad", revenue > 0 ? Math.round(net / revenue * 100) + "% margin" : ""]
  ];

  let html = "";
  cards.forEach(function (c) {
    html += `
      <div class="stat">
        <div class="label">${c[0]}</div>
        <div class="value ${c[2]}">${formatPeso(c[1]) || "₱0.00"}</div>
        ${c[3] ? `<span class="stat-note">${c[3]}</span>` : ""}
      </div>`;
  });
  return html;
}

function showPage() {
  showTabs();
  const onDash = currentTab === "Dashboard";
  $("#page-title").innerHTML = onDash
    ? `Dashboard <span class="range-chip"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>${dashboardRange()}</span>`
    : escapeHtml(currentTab);
  $("#stats").style.display = onDash ? "none" : "";
  $("#stats").innerHTML = statCards();
  $("#content").innerHTML = pages[currentTab]();

  if (currentTab === "Dashboard") drawDashboardCharts();
  if (currentTab === "Business Transactions") updatePreview("tx");
  if (currentTab === "Adjustments") updatePreview("adj");
}

let resizeTimer = null;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    if (currentTab === "Dashboard") drawDashboardCharts();
  }, 120);
});

showPage();
