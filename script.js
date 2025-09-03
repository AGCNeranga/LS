// A G C N Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDxE1d9nCYUTjmipUJ3zPSvtaFwypkk0bI",
  authDomain: "dispatchwebapp-66959.firebaseapp.com",
  databaseURL: "https://dispatchwebapp-66959-default-rtdb.firebaseio.com/",
  projectId: "dispatchwebapp-66959",
  storageBucket: "dispatchwebapp-66959.appspot.com",
  messagingSenderId: "984217204226",
  appId: "1:984217204226:web:ab6efa24a54345fc57d91b",
  measurementId: "G-4N950SN8V9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const users = {
  "admin": { password: "admin123", role: "admin" },
  "raja": { password: "raja123", role: "Assistant Manager" },
  "akila": { password: "akila123", role: "Akila" },
  "uchitha": { password: "uchitha123", role: "Manager" },
  "rohitha": { password: "rohitha123", role: "Rohitha" },
  "charith": { password: "charith123", role: "Editor" }
};

const deadlines = {
  "SPORTS": {
    "1st Section": { ctp: "07:00", dispatch: "02:30", departure: "03:15" },
    "2nd Section": { ctp: "00:00", dispatch: "02:30", departure: "03:15" }
  },
  "Racing UK": {
    "1st Section UK": { ctp: "22:30", dispatch: "01:15", departure: "03:15" },
    "2nd Section UK": { ctp: "23:30", dispatch: "02:00", departure: "03:15" },
    "1st Section RST UK": { ctp: "01:50", dispatch: "02:40", departure: "03:15" },
    "2nd Section RST UK": { ctp: "01:50", dispatch: "02:55", departure: "03:15" }
  },
  "Racing AUS": {
    "AUS Publication": { ctp: "22:30", dispatch: "11:00", departure: "03:15" },
    "AUS RST": { ctp: "21:30", dispatch: "11:00", departure: "03:15" }
  }
};

let currentUser = null;
let records = [];
let filteredRecords = [];

// Load records from Firebase
db.ref("dispatchRecords").on("value", snapshot => {
  const data = snapshot.val();
  records = data ? Object.keys(data).map(key => ({ ...data[key], key })) : [];
  renderTable();
});

// ---------- LOGIN ----------
document.getElementById("loginForm").addEventListener("submit", function(e){
  e.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  if(users[u] && users[u].password === p){
    currentUser = { username: u, role: users[u].role };
    document.getElementById("loginForm").style.display="none";
    document.getElementById("app").style.display="block";
    document.getElementById("currentUser").textContent = u;
    document.getElementById("role").textContent = currentUser.role;
    document.getElementById("adminControls").style.display = currentUser.role === "admin" ? "block" : "none";
    document.getElementById("filters").style.display = currentUser.role === "admin" ? "flex" : "none";
    renderTable();
  } else {
    alert("Invalid credentials");
  }
});

function logout(){
  currentUser = null;
  document.getElementById("app").style.display="none";
  document.getElementById("loginForm").style.display="flex";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function parseTimeToDate(timeStr, baseDate){
  if(!timeStr) return null;
  let [h,m] = timeStr.split(":");
  let d = new Date(baseDate);
  d.setHours(+h, +m, 0, 0);
  if(+h < 6) d.setDate(d.getDate() + 1);
  return d;
}

function isDelayed(timeStr, deadlineStr, baseDate){
  if(!timeStr || !deadlineStr) return "No";
  const t = parseTimeToDate(timeStr, baseDate);
  const dl = parseTimeToDate(deadlineStr, baseDate);
  return (t > dl) ? "Yes" : "No";
}

// ---------- ADD / UPDATE RECORD ----------
document.getElementById("dispatchForm").addEventListener("submit", function(e){
  e.preventDefault();
  const date = document.getElementById("date").value;
  const dept = document.getElementById("department").value;
  const sec = document.getElementById("section").value;
  const ctp = document.getElementById("pageCTP").value;
  const dispatch = document.getElementById("dispatchReceived").value;
  const departure = document.getElementById("departure").value;
  const dl = deadlines[dept] && deadlines[dept][sec] ? deadlines[dept][sec] : {};

  // Find existing record
  let existing = records.find(r => r.date === date && r.department === dept && r.section === sec);

  if(!existing){
    // Create new record if not exists
    existing = {
      date: date,
      department: dept,
      section: sec,
      pageCTP: {},
      dispatchReceived: {},
      departure: {},
      notes: "",
      addedBy: "",
      key: db.ref("dispatchRecords").push().key
    };
    records.push(existing);
  }

  // Add current user input to the record
  if(ctp) existing.pageCTP[currentUser.username] = ctp;
  if(dispatch) existing.dispatchReceived[currentUser.username] = dispatch;
  if(departure) existing.departure[currentUser.username] = departure;
  if(document.getElementById("notes").value) existing.notes = document.getElementById("notes").value;
  existing.addedBy = currentUser.username;

  db.ref("dispatchRecords/" + existing.key).set(existing);
  this.reset();
});

// ---------- RENDER TABLE ----------
function renderTable(){
  const tbody = document.querySelector("#dispatchTable tbody");
  tbody.innerHTML = "";
  const data = filteredRecords.length ? filteredRecords : records;

  data.forEach((rec, idx) => {
    const tr = document.createElement("tr");

    // Flatten user inputs into columns
    const pageCTPArr = Object.values(rec.pageCTP).join(" / ");
    const dispatchArr = Object.values(rec.dispatchReceived).join(" / ");
    const departureArr = Object.values(rec.departure).join(" / ");

    // Calculate delay based on first user's input (or skip)
    const firstUser = Object.keys(rec.pageCTP)[0];
    const delayCTP = firstUser ? isDelayed(rec.pageCTP[firstUser], deadlines[rec.department][rec.section].ctp, rec.date) : "";
    const delayDispatch = firstUser ? isDelayed(rec.dispatchReceived[firstUser], deadlines[rec.department][rec.section].dispatch, rec.date) : "";
    const delayDeparture = firstUser ? isDelayed(rec.departure[firstUser], deadlines[rec.department][rec.section].departure, rec.date) : "";

    tr.innerHTML = `
      <td>${rec.date}</td>
      <td>${rec.department}</td>
      <td>${rec.section}</td>
      <td>${pageCTPArr}</td>
      <td>${dispatchArr}</td>
      <td>${departureArr}</td>
      <td>${rec.notes || ""}</td>
      <td>${deadlines[rec.department][rec.section].ctp}</td>
      <td>${deadlines[rec.department][rec.section].dispatch}</td>
      <td>${deadlines[rec.department][rec.section].departure}</td>
      <td class="${delayCTP==='Yes'?'delayed':''}">${delayCTP}</td>
      <td class="${delayDispatch==='Yes'?'delayed':''}">${delayDispatch}</td>
      <td class="${delayDeparture==='Yes'?'delayed':''}">${delayDeparture}</td>
      <td>${rec.addedBy}</td>
      <td></td>
    `;
    const actionsCell = tr.querySelector("td:last-child");
    if(currentUser.role === "admin"){
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "actionBtn";
      editBtn.onclick = () => editRecord(idx);
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "actionBtn delete";
      delBtn.onclick = () => deleteRecord(idx);
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(delBtn);
    }
    tbody.appendChild(tr);
  });
}

// ---------- EDIT / DELETE ----------
function editRecord(index){
  const rec = records[index];
  document.getElementById("date").value = rec.date;
  document.getElementById("department").value = rec.department;
  document.getElementById("section").value = rec.section;

  // Pre-fill current user values if exists
  document.getElementById("pageCTP").value = rec.pageCTP[currentUser.username] || "";
  document.getElementById("dispatchReceived").value = rec.dispatchReceived[currentUser.username] || "";
  document.getElementById("departure").value = rec.departure[currentUser.username] || "";
  document.getElementById("notes").value = rec.notes || "";
}

function deleteRecord(index){
  if(confirm("Delete this record?")){
    const rec = records[index];
    db.ref("dispatchRecords/" + rec.key).remove();
  }
}

function clearAllData(){
  if(confirm("Are you sure you want to clear ALL records?")){
    db.ref("dispatchRecords").remove();
  }
}

// ---------- EXPORT EXCEL ----------
document.getElementById("exportExcel").addEventListener("click", function(){
  const ws = XLSX.utils.json_to_sheet(records.map(r => ({
    date: r.date,
    department: r.department,
    section: r.section,
    pageCTP: Object.values(r.pageCTP).join(" / "),
    dispatchReceived: Object.values(r.dispatchReceived).join(" / "),
    departure: Object.values(r.departure).join(" / "),
    notes: r.notes,
    addedBy: r.addedBy
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dispatch");
  XLSX.writeFile(wb, "dispatch.xlsx");
});

function togglePassword() {
  const pwd = document.getElementById("password");
  if(pwd.type === "password") pwd.type = "text";
  else pwd.type = "password";
}

function applyFilter(){
  const dept = document.getElementById("filterDept").value;
  const sec = document.getElementById("filterSection").value;
  filteredRecords = records.filter(r => {
    return (dept === "" || r.department === dept) &&
           (sec === "" || r.section === sec);
  });
  renderTable();
}

function clearFilter(){
  document.getElementById("filterDept").value = "";
  document.getElementById("filterSection").value = "";
  filteredRecords = [];
  renderTable();
}
