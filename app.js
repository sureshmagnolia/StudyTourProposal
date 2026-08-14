/**
 * Tour Proposal Document Generator - Application Engine
 */

// Global State
let tourData = {};
let activeClassId = 'bsc';

// --- Indian Number-to-Words Converter ---
function numberToIndianWords(num) {
  if (!num || isNaN(num) || num <= 0) return 'RUPEES ZERO ONLY';
  num = Math.round(num);

  const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function convertTwoDigits(n) {
    if (n < 20) return units[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += units[hundred] + ' HUNDRED';
    if (rest > 0) res += (res ? ' AND ' : '') + convertTwoDigits(rest);
    return res;
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) words += convertTwoDigits(crore) + ' CRORE ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' LAKH ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' THOUSAND ';
  if (remainder > 0) words += convertThreeDigits(remainder) + ' ';

  return 'RUPEES ' + words.trim() + ' ONLY';
}

// --- Format Date to DD-MM-YYYY ---
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

// Helper to add days to YYYY-MM-DD string
function addDaysToDate(dateStr, daysToAdd) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

// Normalize legacy time string to 24h HH:MM format
function normalizeTo24h(val) {
  if (!val) return '06:00';
  val = String(val).trim().toLowerCase();
  if (/^\d{2}:\d{2}$/.test(val)) return val;

  const m = val.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const mins = m[2];
    const ampm = m[3];
    if (ampm === 'pm' && h < 12) h += 12;
    else if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${mins}`;
  }

  const m2 = val.match(/^(\d{1,2})\s*(am|pm)$/);
  if (m2) {
    let h = parseInt(m2[1], 10);
    const ampm = m2[2];
    if (ampm === 'pm' && h < 12) h += 12;
    else if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }

  return val;
}

// Format 24h HH:MM time into clean 12h AM/PM string for print
function formatTimeTo12h(timeStr) {
  if (!timeStr) return '';
  timeStr = normalizeTo24h(timeStr);
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let h = parseInt(parts[0], 10);
  const mins = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;

  return `${String(h).padStart(2, '0')}:${mins} ${ampm}`;
}

// --- Initialize App State ---
function initApp() {
  const saved = localStorage.getItem('TOUR_PROPOSAL_DATA');
  if (saved) {
    try {
      tourData = JSON.parse(saved);
    } catch (e) {
      tourData = JSON.parse(JSON.stringify(INITIAL_TOUR_DATA));
    }
  } else {
    tourData = JSON.parse(JSON.stringify(INITIAL_TOUR_DATA));
  }

  // Standardize times in dataset
  if (tourData.classes) {
    tourData.classes.forEach(c => {
      (c.itinerary || []).forEach(it => {
        it.timeFrom = normalizeTo24h(it.timeFrom);
        it.timeTo = normalizeTo24h(it.timeTo);
      });
    });
  }

  if (tourData.classes && tourData.classes.length > 0) {
    activeClassId = tourData.classes[0].id;
  }

  setupEventListeners();
  renderAll();
}

function saveData() {
  localStorage.setItem('TOUR_PROPOSAL_DATA', JSON.stringify(tourData));
  updateStats();
  renderPreview();
}

function resetToDefault() {
  if (confirm('Are you sure you want to reset all data back to the default 2025 proposal template? Any custom modifications will be replaced.')) {
    tourData = JSON.parse(JSON.stringify(INITIAL_TOUR_DATA));
    if (tourData.classes && tourData.classes.length > 0) {
      activeClassId = tourData.classes[0].id;
    }
    saveData();
    renderAll();
  }
}

// --- Main Render Dispatcher ---
function renderAll() {
  renderGeneralForm();
  renderClassSubTabs();
  renderActiveProfileForm();
  renderStudentsTable();
  renderItineraryTable();
  renderBudgetTable();
  updateStats();
  renderPreview();
}

// --- Navigation Tabs ---
function switchMainTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  
  const targetPane = document.getElementById(tabId);
  const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);
  
  if (targetPane) targetPane.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  if (tabId === 'previewTab') {
    renderPreview();
  }
}

// --- General Form Rendering ---
function renderGeneralForm() {
  const g = tourData.general || {};
  document.getElementById('genCollegeName').value = g.collegeName || '';
  document.getElementById('genDepartment').value = g.department || '';
  document.getElementById('genAcademicYear').value = g.academicYear || '';
  document.getElementById('genPlanFundYear').value = g.planFundYear || '';
  document.getElementById('genConveyance').value = g.conveyance || '';
  document.getElementById('genRatePerDay').value = g.ratePerDay || 500;
  document.getElementById('genPlace').value = g.place || 'Palakkad';
  document.getElementById('genSignDate').value = g.signDate || '';
  document.getElementById('genHodTitle').value = g.hodTitle || 'Head of the Department';
}

function saveGeneralForm() {
  tourData.general = {
    collegeName: document.getElementById('genCollegeName').value,
    department: document.getElementById('genDepartment').value,
    academicYear: document.getElementById('genAcademicYear').value,
    planFundYear: document.getElementById('genPlanFundYear').value,
    conveyance: document.getElementById('genConveyance').value,
    ratePerDay: parseFloat(document.getElementById('genRatePerDay').value) || 500,
    place: document.getElementById('genPlace').value,
    signDate: document.getElementById('genSignDate').value,
    hodTitle: document.getElementById('genHodTitle').value,
  };
  saveData();
}

// --- Class Management & Subtabs ---
function getActiveClass() {
  return tourData.classes.find(c => c.id === activeClassId) || tourData.classes[0];
}

function renderClassSubTabs() {
  const container = document.getElementById('classSubTabs');
  if (!container) return;

  let html = '';
  tourData.classes.forEach(c => {
    const isActive = c.id === activeClassId ? 'active' : '';
    html += `
      <button class="sub-tab-btn ${isActive}" onclick="setActiveClass('${c.id}')">
        <span>${c.shortName || c.name}</span>
        <span class="badge" style="background: ${isActive ? '#2563eb' : '#cbd5e1'}; color: ${isActive ? '#fff' : '#1e293b'}">${c.students ? c.students.length : 0}</span>
      </button>
    `;
  });

  html += `
    <button class="btn btn-secondary btn-sm" onclick="promptAddNewClass()" style="margin-left: auto;">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      Add Class
    </button>
  `;

  container.innerHTML = html;
}

function setActiveClass(classId) {
  activeClassId = classId;
  renderClassSubTabs();
  renderActiveProfileForm();
  renderStudentsTable();
  renderItineraryTable();
  renderPreview();
}

function promptAddNewClass() {
  const name = prompt('Enter New Class Full Name (e.g. M.Sc. Botany 2nd Semester):');
  if (!name) return;
  const shortName = prompt('Enter Short Code (e.g. MSc2):', name.substring(0, 8));
  const id = 'class_' + Date.now();

  const newClass = {
    id: id,
    name: name,
    shortName: shortName || name,
    proformaTitle: `PROPOSAL FOR THE STUDY TOUR PROGRAMME - ${shortName || name}`,
    placesOfVisit: 'Ooty, Wayanad',
    commenceDate: '2025-09-09',
    completeDate: '2025-09-12',
    totalDays: 4,
    haltDays: 3,
    accompanyingStaff: 'Faculty Member, Assistant Professor in Botany, Govt Victoria College, Palakkad',
    escortingStaff: 'Lady Escort, Assistant Professor in Botany, Govt Victoria College, Palakkad',
    students: [],
    itinerary: []
  };

  tourData.classes.push(newClass);
  activeClassId = id;
  saveData();
  renderAll();
}

function deleteCurrentClass() {
  if (tourData.classes.length <= 1) {
    alert('You must have at least one class in the proposal.');
    return;
  }
  const curr = getActiveClass();
  if (confirm(`Are you sure you want to delete the class "${curr.name}" and all its student/itinerary records?`)) {
    tourData.classes = tourData.classes.filter(c => c.id !== activeClassId);
    activeClassId = tourData.classes[0].id;
    saveData();
    renderAll();
  }
}

// --- Active Class Profile Form ---
function renderActiveProfileForm() {
  const c = getActiveClass();
  if (!c) return;

  document.getElementById('clsName').value = c.name || '';
  document.getElementById('clsShortName').value = c.shortName || '';
  document.getElementById('clsProformaTitle').value = c.proformaTitle || '';
  document.getElementById('clsPlacesOfVisit').value = c.placesOfVisit || '';
  document.getElementById('clsCommenceDate').value = c.commenceDate || '';
  document.getElementById('clsCompleteDate').value = c.completeDate || '';
  document.getElementById('clsTotalDays').value = c.totalDays || 4;
  document.getElementById('clsHaltDays').value = c.haltDays || 3;
  document.getElementById('clsAccompanyingStaff').value = c.accompanyingStaff || '';
  document.getElementById('clsEscortingStaff').value = c.escortingStaff || '';

  // Render Class stats
  const students = c.students || [];
  const boys = students.filter(s => (s.gender || '').toLowerCase().startsWith('m')).length;
  const girls = students.filter(s => (s.gender || '').toLowerCase().startsWith('f')).length;
  document.getElementById('classStudentCountBadge').innerText = `Boys: ${boys} | Girls: ${girls} | Total: ${students.length}`;
}

function saveActiveClassProfile() {
  const c = getActiveClass();
  if (!c) return;

  c.name = document.getElementById('clsName').value;
  c.shortName = document.getElementById('clsShortName').value;
  c.proformaTitle = document.getElementById('clsProformaTitle').value;
  c.placesOfVisit = document.getElementById('clsPlacesOfVisit').value;
  c.commenceDate = document.getElementById('clsCommenceDate').value;
  c.completeDate = document.getElementById('clsCompleteDate').value;
  c.totalDays = parseInt(document.getElementById('clsTotalDays').value) || 4;
  c.haltDays = parseInt(document.getElementById('clsHaltDays').value) || 3;
  c.accompanyingStaff = document.getElementById('clsAccompanyingStaff').value;
  c.escortingStaff = document.getElementById('clsEscortingStaff').value;

  saveData();
  renderClassSubTabs();
}

// --- Student List Management ---
function renderStudentsTable() {
  const c = getActiveClass();
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody || !c) return;

  const students = c.students || [];
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 28px; color: #64748b; font-size: 0.9rem;">No students added yet. Click "Add Student" or "Bulk Import / Paste from Excel" to add records.</td></tr>`;
    return;
  }

  let html = '';
  students.forEach((st, idx) => {
    html += `
      <tr>
        <td style="width: 75px; text-align: center;">
          <span class="sl-badge">${st.sl || idx + 1}</span>
        </td>
        <td>
          <input type="text" class="form-control" value="${st.name || ''}" placeholder="Student Full Name" onchange="updateStudentField(${idx}, 'name', this.value)" style="font-weight: 500;">
        </td>
        <td style="width: 130px;">
          <select class="form-control" onchange="updateStudentField(${idx}, 'gender', this.value)">
            <option value="Female" ${st.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Male" ${st.gender === 'Male' ? 'selected' : ''}>Male</option>
          </select>
        </td>
        <td style="width: 90px; text-align: center;">
          <input type="number" class="form-control text-center" value="${st.age || 20}" onchange="updateStudentField(${idx}, 'age', this.value)">
        </td>
        <td style="width: 60px; text-align: center;">
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteStudent(${idx})" title="Delete Student">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateStudentField(idx, field, val) {
  const c = getActiveClass();
  if (!c || !c.students[idx]) return;
  if (field === 'sl' || field === 'age') {
    c.students[idx][field] = parseInt(val) || 0;
  } else {
    c.students[idx][field] = val;
  }
  saveData();
  renderActiveProfileForm();
}

function addStudent() {
  const c = getActiveClass();
  if (!c) return;
  if (!c.students) c.students = [];
  const nextSl = c.students.length + 1;
  c.students.push({
    sl: nextSl,
    name: '',
    gender: 'Female',
    age: 20
  });
  saveData();
  renderStudentsTable();
  renderActiveProfileForm();
}

function deleteStudent(idx) {
  const c = getActiveClass();
  if (!c || !c.students[idx]) return;
  c.students.splice(idx, 1);
  // re-index Sl Nos
  c.students.forEach((s, i) => { s.sl = i + 1; });
  saveData();
  renderStudentsTable();
  renderActiveProfileForm();
}

// --- Bulk Student Paste Modal ---
function openBulkImportModal() {
  document.getElementById('bulkImportModal').classList.add('show');
  document.getElementById('bulkTextarea').value = '';
}

function closeBulkImportModal() {
  document.getElementById('bulkImportModal').classList.remove('show');
}

function processBulkImport() {
  const text = document.getElementById('bulkTextarea').value.trim();
  if (!text) {
    alert('Please paste tabular student data.');
    return;
  }

  const lines = text.split('\n');
  const parsed = [];

  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return;
    let parts = line.includes('\t') ? line.split('\t') : (line.includes(',') ? line.split(',') : line.split(/\s{2,}/));
    parts = parts.map(p => p.trim());

    if (index === 0 && (parts.some(p => /name|gender|age|sl/i.test(p)))) {
      return;
    }

    let sl = parsed.length + 1;
    let name = '';
    let gender = 'Female';
    let age = 20;

    if (parts.length >= 3) {
      if (!isNaN(parts[0])) {
        sl = parseInt(parts[0]);
        name = parts[1];
        gender = /m/i.test(parts[2]) && !/f/i.test(parts[2]) ? 'Male' : 'Female';
        if (parts[3] && !isNaN(parts[3])) age = parseInt(parts[3]);
      } else {
        name = parts[0];
        gender = /m/i.test(parts[1]) && !/f/i.test(parts[1]) ? 'Male' : 'Female';
        if (parts[2] && !isNaN(parts[2])) age = parseInt(parts[2]);
      }
    } else if (parts.length === 2) {
      name = parts[0];
      gender = /m/i.test(parts[1]) && !/f/i.test(parts[1]) ? 'Male' : 'Female';
    } else if (parts.length === 1) {
      name = parts[0];
    }

    if (name) {
      parsed.push({ sl, name, gender, age });
    }
  });

  if (parsed.length === 0) {
    alert('Could not parse any student entries. Please check formatting.');
    return;
  }

  const c = getActiveClass();
  const mode = document.querySelector('input[name="bulkMode"]:checked').value;
  if (mode === 'replace') {
    c.students = parsed;
  } else {
    const startSl = c.students.length;
    parsed.forEach((p, i) => { p.sl = startSl + i + 1; });
    c.students = c.students.concat(parsed);
  }

  saveData();
  closeBulkImportModal();
  renderStudentsTable();
  renderActiveProfileForm();
}

// --- Itinerary Table Management with Clock Picker, Continuous Dates, and Auto-Wrapping Textareas ---
function renderItineraryTable() {
  const c = getActiveClass();
  const tbody = document.getElementById('itineraryTableBody');
  if (!tbody || !c) return;

  const itinerary = c.itinerary || [];
  if (itinerary.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 28px; color: #64748b; font-size: 0.9rem;">No schedule items added. Click "Add Schedule Item" or "Auto-Sequence Dates" to build the daily itinerary.</td></tr>`;
    return;
  }

  let html = '';
  let prevDate = null;
  itinerary.forEach((item, idx) => {
    let isOutOfOrder = false;
    if (prevDate && item.dateFrom && item.dateFrom < prevDate) {
      isOutOfOrder = true;
    }
    if (item.dateFrom) prevDate = item.dateFrom;

    const tFrom24 = normalizeTo24h(item.timeFrom);
    const tTo24 = normalizeTo24h(item.timeTo);

    html += `
      <tr style="${isOutOfOrder ? 'background-color: #fff1f2;' : ''}">
        <td style="width: 85px;">
          <input type="text" class="form-control" value="${item.day || 'Day 1'}" onchange="updateItineraryField(${idx}, 'day', this.value)" style="font-weight: 600; text-align: center;">
        </td>
        <td style="width: 145px;">
          <input type="date" class="form-control" value="${item.dateFrom || ''}" onchange="updateItineraryField(${idx}, 'dateFrom', this.value)" style="${isOutOfOrder ? 'border-color: #f43f5e;' : ''}">
          ${isOutOfOrder ? '<span style="color: #e11d48; font-size: 0.7rem; font-weight: 600;">⚠️ Out of order</span>' : ''}
        </td>
        <td style="width: 210px;">
          <div style="display: flex; gap: 5px; align-items: center;">
            <input type="time" class="form-control" value="${tFrom24}" onchange="updateItineraryField(${idx}, 'timeFrom', this.value)" title="Departure / Start Time">
            <span style="font-weight: 600; color: #64748b;">–</span>
            <input type="time" class="form-control" value="${tTo24}" onchange="updateItineraryField(${idx}, 'timeTo', this.value)" title="Arrival / End Time">
          </div>
        </td>
        <td style="width: 180px;">
          <textarea class="form-control" placeholder="Starting Point" onchange="updateItineraryField(${idx}, 'start', this.value)" style="min-height: 48px; padding: 6px 10px; font-size: 0.825rem;">${item.start || ''}</textarea>
        </td>
        <td style="width: 180px;">
          <textarea class="form-control" placeholder="Destination" onchange="updateItineraryField(${idx}, 'destination', this.value)" style="min-height: 48px; padding: 6px 10px; font-size: 0.825rem;">${item.destination || ''}</textarea>
        </td>
        <td>
          <textarea class="form-control" placeholder="Academic / Field Activity" onchange="updateItineraryField(${idx}, 'activity', this.value)" style="min-height: 48px; padding: 6px 10px; font-size: 0.825rem;">${item.activity || ''}</textarea>
        </td>
        <td style="width: 50px; text-align: center;">
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteItineraryItem(${idx})" title="Delete Schedule Row">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateItineraryField(idx, field, val) {
  const c = getActiveClass();
  if (!c || !c.itinerary[idx]) return;
  c.itinerary[idx][field] = val;
  if (field === 'dateFrom') {
    c.itinerary[idx]['dateTo'] = val;
  }
  saveData();
  renderItineraryTable();
}

function addItineraryItem() {
  const c = getActiveClass();
  if (!c) return;
  if (!c.itinerary) c.itinerary = [];
  
  let nextDayNum = 1;
  let nextDate = c.commenceDate || '2025-09-09';

  if (c.itinerary.length > 0) {
    const lastItem = c.itinerary[c.itinerary.length - 1];
    const match = (lastItem.day || '').match(/\d+/);
    nextDayNum = match ? parseInt(match[0]) : c.itinerary.length + 1;
    nextDate = lastItem.dateFrom || nextDate;
  }

  c.itinerary.push({
    day: `Day ${nextDayNum}`,
    dateFrom: nextDate,
    dateTo: nextDate,
    timeFrom: '06:00',
    timeTo: '10:00',
    start: 'Govt. Victoria College, Palakkad',
    destination: 'Botanical Field Site',
    activity: 'Study and documentation of flora'
  });
  saveData();
  renderItineraryTable();
}

function deleteItineraryItem(idx) {
  const c = getActiveClass();
  if (!c || !c.itinerary[idx]) return;
  c.itinerary.splice(idx, 1);
  saveData();
  renderItineraryTable();
}

// Auto-Sequence Itinerary Dates continuously (Day 1 -> Day 2 -> Day 3 -> Day 4)
function autoSequenceItineraryDates() {
  const c = getActiveClass();
  if (!c || !c.itinerary || c.itinerary.length === 0) return;

  const startDate = c.commenceDate || '2025-09-09';
  let currentDayNum = 1;
  let currentDate = startDate;

  c.itinerary.forEach((item, index) => {
    const match = (item.day || '').match(/\d+/);
    if (match) {
      const dayVal = parseInt(match[0]);
      if (dayVal >= 1) {
        currentDayNum = dayVal;
      }
    } else {
      item.day = `Day ${currentDayNum}`;
    }

    currentDate = addDaysToDate(startDate, currentDayNum - 1);
    item.dateFrom = currentDate;
    item.dateTo = currentDate;
  });

  saveData();
  renderItineraryTable();
  alert('Itinerary dates have been auto-sequenced continuously based on the tour commencement date (' + startDate + ').');
}

// Sort Itinerary Chronologically
function sortItineraryChronologically() {
  const c = getActiveClass();
  if (!c || !c.itinerary || c.itinerary.length === 0) return;

  c.itinerary.sort((a, b) => {
    const dA = a.dateFrom || '';
    const dB = b.dateFrom || '';
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.timeFrom || '').localeCompare(b.timeFrom || '');
  });

  saveData();
  renderItineraryTable();
}

// --- Budget Management ---
function renderBudgetTable() {
  const tbody = document.getElementById('budgetTableBody');
  if (!tbody) return;

  const items = tourData.budgetItems || [];
  let html = '';
  let grandTotalDays = 0;
  let grandTotalCost = 0;

  items.forEach((item, idx) => {
    const days = parseFloat(item.days) || 0;
    const students = parseInt(item.students) || 0;
    const rate = parseFloat(item.rate) || 500;
    const totalDays = Math.round(days * students);
    const totalCost = totalDays * rate;

    grandTotalDays += totalDays;
    grandTotalCost += totalCost;

    html += `
      <tr>
        <td style="width: 50px; text-align: center; font-weight: 600;">${item.sl || idx + 1}</td>
        <td style="width: 170px;">
          <input type="text" class="form-control" value="${item.class || ''}" onchange="updateBudgetField(${idx}, 'class', this.value)">
        </td>
        <td style="width: 140px;">
          <input type="text" class="form-control" value="${item.paper || ''}" onchange="updateBudgetField(${idx}, 'paper', this.value)">
        </td>
        <td>
          <textarea class="form-control" onchange="updateBudgetField(${idx}, 'objective', this.value)" style="min-height: 48px; padding: 6px 10px; font-size: 0.825rem;">${item.objective || ''}</textarea>
        </td>
        <td style="width: 70px;">
          <input type="number" step="0.5" class="form-control text-center" value="${item.days || 1}" onchange="updateBudgetField(${idx}, 'days', this.value)">
        </td>
        <td style="width: 80px;">
          <input type="number" class="form-control text-center" value="${item.students || 0}" onchange="updateBudgetField(${idx}, 'students', this.value)">
        </td>
        <td style="width: 80px;">
          <input type="number" class="form-control text-center" value="${item.rate || 500}" onchange="updateBudgetField(${idx}, 'rate', this.value)">
        </td>
        <td style="width: 90px; text-align: center; font-weight: 600;">${totalDays}</td>
        <td style="width: 110px; text-align: right; font-weight: 700;">₹${totalCost.toLocaleString('en-IN')}</td>
        <td style="width: 50px; text-align: center;">
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteBudgetItem(${idx})">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  document.getElementById('budgetGrandTotalDays').innerText = grandTotalDays;
  document.getElementById('budgetGrandTotalCost').innerText = '₹' + grandTotalCost.toLocaleString('en-IN');
  document.getElementById('budgetWordsPreview').innerText = numberToIndianWords(grandTotalCost);
}

function updateBudgetField(idx, field, val) {
  if (!tourData.budgetItems[idx]) return;
  if (field === 'days' || field === 'rate') {
    tourData.budgetItems[idx][field] = parseFloat(val) || 0;
  } else if (field === 'students') {
    tourData.budgetItems[idx][field] = parseInt(val) || 0;
  } else {
    tourData.budgetItems[idx][field] = val;
  }
  saveData();
  renderBudgetTable();
}

function addBudgetItem() {
  if (!tourData.budgetItems) tourData.budgetItems = [];
  const defaultRate = (tourData.general && tourData.general.ratePerDay) || 500;
  tourData.budgetItems.push({
    sl: tourData.budgetItems.length + 1,
    class: 'MSc Botany Semester 1',
    paper: 'Field Botany',
    objective: 'Collection and field submission of botanical specimens',
    days: 1,
    students: 15,
    rate: defaultRate
  });
  saveData();
  renderBudgetTable();
}

function deleteBudgetItem(idx) {
  if (!tourData.budgetItems[idx]) return;
  tourData.budgetItems.splice(idx, 1);
  tourData.budgetItems.forEach((item, i) => { item.sl = i + 1; });
  saveData();
  renderBudgetTable();
}

// Auto-sync live student counts into Budget items
function autoSyncBudgetCounts() {
  if (!confirm('This will update the student counts in the budget table to match the current live roster counts in each corresponding class. Proceed?')) {
    return;
  }

  const classCountMap = {};
  tourData.classes.forEach(c => {
    const cnt = c.students ? c.students.length : 0;
    classCountMap[c.name.toLowerCase()] = cnt;
    classCountMap[c.shortName.toLowerCase()] = cnt;
    if (c.id === 'bsc') classCountMap['bsc'] = cnt;
    if (c.id === 'msc3') classCountMap['msc3'] = cnt;
    if (c.id === 'msc1') classCountMap['msc1'] = cnt;
  });

  tourData.budgetItems.forEach(b => {
    const cls = (b.class || '').toLowerCase();
    if (cls.includes('bsc') && classCountMap['bsc'] !== undefined) {
      b.students = classCountMap['bsc'];
    } else if (cls.includes('msc') && (cls.includes('3') || cls.includes('4')) && classCountMap['msc3'] !== undefined) {
      b.students = classCountMap['msc3'];
    } else if (cls.includes('msc') && (cls.includes('1') || cls.includes('2')) && classCountMap['msc1'] !== undefined) {
      b.students = classCountMap['msc1'];
    }
  });

  saveData();
  renderBudgetTable();
  alert('Student counts synced successfully!');
}

// --- Top Stats Update ---
function updateStats() {
  let totalStudents = 0;
  let totalBoys = 0;
  let totalGirls = 0;

  tourData.classes.forEach(c => {
    (c.students || []).forEach(s => {
      totalStudents++;
      if ((s.gender || '').toLowerCase().startsWith('m')) totalBoys++;
      else totalGirls++;
    });
  });

  let totalCost = 0;
  (tourData.budgetItems || []).forEach(item => {
    const days = parseFloat(item.days) || 0;
    const students = parseInt(item.students) || 0;
    const rate = parseFloat(item.rate) || 500;
    totalCost += (days * students * rate);
  });

  const statStudents = document.getElementById('statTotalStudents');
  const statClasses = document.getElementById('statTotalClasses');
  const statBudget = document.getElementById('statTotalBudget');
  const statGender = document.getElementById('statGenderBreakdown');

  if (statStudents) statStudents.innerText = totalStudents;
  if (statClasses) statClasses.innerText = tourData.classes.length;
  if (statBudget) statBudget.innerText = '₹' + totalCost.toLocaleString('en-IN');
  if (statGender) statGender.innerText = `${totalBoys} Boys / ${totalGirls} Girls`;
}

// --- PRINT & PREVIEW ENGINE ---
function renderPreview() {
  const container = document.getElementById('previewContainer');
  if (!container) return;

  const docFilter = document.getElementById('previewDocFilter') ? document.getElementById('previewDocFilter').value : 'all';
  const g = tourData.general || {};
  let html = '';

  tourData.classes.forEach((c) => {
    // 1. Render Proforma Document
    if (docFilter === 'all' || docFilter === 'proforma' || docFilter === `proforma_${c.id}`) {
      html += renderProformaDocHTML(g, c);
    }

    // 2. Render Student List Document
    if (docFilter === 'all' || docFilter === 'list' || docFilter === `list_${c.id}`) {
      html += renderStudentListDocHTML(g, c);
    }

    // 3. Render Itinerary Document
    if (docFilter === 'all' || docFilter === 'itinerary' || docFilter === `itinerary_${c.id}`) {
      html += renderItineraryDocHTML(g, c);
    }
  });

  // 4. Render Budget Document
  if (docFilter === 'all' || docFilter === 'budget') {
    html += renderBudgetDocHTML(g, tourData.budgetItems);
  }

  // 5. Render Consolidated List
  if (docFilter === 'all' || docFilter === 'combined') {
    html += renderCombinedListDocHTML(g, tourData.classes);
  }

  container.innerHTML = html;
}

// Document HTML Generator: Proforma
function renderProformaDocHTML(g, c) {
  const students = c.students || [];
  const boys = students.filter(s => (s.gender || '').toLowerCase().startsWith('m')).length;
  const girls = students.filter(s => (s.gender || '').toLowerCase().startsWith('f')).length;
  const total = students.length;

  return `
    <div class="a4-page">
      <div class="doc-header">
        <h2>${g.collegeName || 'GOVT. VICTORIA COLLEGE, PALAKKAD'}</h2>
        <h3>${g.department || 'PG AND RESEARCH DEPARTMENT OF BOTANY'}</h3>
        <p>ACADEMIC YEAR: ${g.academicYear || '2025-2026'}</p>
      </div>

      <div class="doc-title-box">
        ${c.proformaTitle || 'PROPOSAL FOR THE STUDY TOUR PROGRAMME'}
      </div>

      <table class="proforma-table">
        <tr>
          <td class="col-num">1.</td>
          <td class="col-label">Name of the College</td>
          <td class="col-colon">:</td>
          <td class="col-value">${g.collegeName || 'Govt. Victoria College Palakkad'}</td>
        </tr>
        <tr>
          <td class="col-num">2.</td>
          <td class="col-label">Department of Study</td>
          <td class="col-colon">:</td>
          <td class="col-value">Botany</td>
        </tr>
        <tr>
          <td class="col-num">3.</td>
          <td class="col-label">Subject of Study</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.shortName || c.name}</td>
        </tr>
        <tr>
          <td class="col-num">4.</td>
          <td class="col-label">Academic year</td>
          <td class="col-colon">:</td>
          <td class="col-value">${g.academicYear || '2025-2026'}</td>
        </tr>
        <tr>
          <td class="col-num">5.</td>
          <td class="col-label">No. of students participating (List enclosed with Name and Age of students)</td>
          <td class="col-colon">:</td>
          <td class="col-value">Boys ${boys}, Girls ${girls}, Total ${total}</td>
        </tr>
        <tr>
          <td class="col-num">6.</td>
          <td class="col-label">Proposed date of Commencement of tour</td>
          <td class="col-colon">:</td>
          <td class="col-value">${formatDateDisplay(c.commenceDate)}</td>
        </tr>
        <tr>
          <td class="col-num">7.</td>
          <td class="col-label">Date of completion of tour</td>
          <td class="col-colon">:</td>
          <td class="col-value">${formatDateDisplay(c.completeDate)}</td>
        </tr>
        <tr>
          <td class="col-num">8.</td>
          <td class="col-label">Total number of days</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.totalDays || 4} days</td>
        </tr>
        <tr>
          <td class="col-num">9.</td>
          <td class="col-label">Whether as per syllabus</td>
          <td class="col-colon">:</td>
          <td class="col-value">Yes</td>
        </tr>
        <tr>
          <td class="col-num">10.</td>
          <td class="col-label">Proposed places of visit outside Kerala</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.placesOfVisit || 'Ooty, Wayanad'}</td>
        </tr>
        <tr>
          <td class="col-num">11.</td>
          <td class="col-label">No. of days of halt</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.haltDays || 3} days</td>
        </tr>
        <tr>
          <td class="col-num">12.</td>
          <td class="col-label">Program Chart</td>
          <td class="col-colon">:</td>
          <td class="col-value">Detailed Itinerary attached</td>
        </tr>
        <tr>
          <td class="col-num">13.</td>
          <td class="col-label">Mode of conveyance</td>
          <td class="col-colon">:</td>
          <td class="col-value">${g.conveyance || 'Tourist Bus'}</td>
        </tr>
        <tr>
          <td class="col-num">14.</td>
          <td class="col-label">Name and Designation of staff accompanying party</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.accompanyingStaff || 'Not Specified'}</td>
        </tr>
        <tr>
          <td class="col-num">15.</td>
          <td class="col-label">Lady escort with designation</td>
          <td class="col-colon">:</td>
          <td class="col-value">${c.escortingStaff || 'Not Specified'}</td>
        </tr>
      </table>

      <div class="doc-certificate">
        Certified that the study tour arranged by the department is purely academic in nature, prescribed by syllabus and the tour report is subject to evaluation.
      </div>

      <div class="doc-signatures-grid">
        <div>
          <p>Signature, Name & Designation of HOD:</p>
          <br><br>
          <p><strong>Head of the Department</strong></p>
        </div>
        <div style="text-align: right;">
          <p>Recommendation of the Principal:</p>
          <br><br>
          <p><strong>Principal</strong></p>
        </div>
      </div>

      <div class="doc-footer-meta">
        <p>Place: ${g.place || 'Palakkad'}</p>
        <p>Date: ${formatDateDisplay(g.signDate || c.commenceDate)}</p>
      </div>
    </div>
  `;
}

// Document HTML Generator: Student List
function renderStudentListDocHTML(g, c) {
  const students = c.students || [];
  let rowsHtml = '';

  students.forEach((s, idx) => {
    rowsHtml += `
      <tr>
        <td class="text-center" style="width: 50px; font-weight: 600;">${s.sl || idx + 1}</td>
        <td style="font-weight: 500;">${s.name || ''}</td>
        <td class="text-center" style="width: 90px;">${s.gender || ''}</td>
        <td class="text-center" style="width: 70px;">${s.age || ''}</td>
      </tr>
    `;
  });

  return `
    <div class="a4-page">
      <div class="doc-header">
        <h2>${g.collegeName || 'GOVT. VICTORIA COLLEGE, PALAKKAD'}</h2>
        <h3>${g.department || 'PG AND RESEARCH DEPARTMENT OF BOTANY'}</h3>
        <p>STUDY TOUR PROGRAMME ${g.academicYear || '2025-2026'}</p>
      </div>

      <div class="doc-title-box">
        List of Students - ${c.name} (${g.academicYear || '2025-2026'})
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 50px;">Sl No</th>
            <th>Name of Student</th>
            <th style="width: 90px;">Gender</th>
            <th style="width: 70px;">Age</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="staff-footer-box">
        <p><strong>Accompanying Faculty:</strong> ${c.accompanyingStaff || 'None'}</p>
        <p><strong>Lady Escorting Faculty:</strong> ${c.escortingStaff || 'None'}</p>
      </div>

      <div class="doc-signatures" style="margin-top: 35px;">
        <div>
          <p>Verified by:</p>
          <br><br>
          <p><strong>Tour Coordinator</strong></p>
        </div>
        <div style="text-align: right;">
          <p>Forwarded by:</p>
          <br><br>
          <p><strong>Head of the Department</strong></p>
        </div>
      </div>
    </div>
  `;
}

// Document HTML Generator: Itinerary with text-wrapping
function renderItineraryDocHTML(g, c) {
  const itinerary = c.itinerary || [];
  let rowsHtml = '';

  itinerary.forEach((item) => {
    const timeFormatted = `${formatTimeTo12h(item.timeFrom)} - ${formatTimeTo12h(item.timeTo)}`;

    rowsHtml += `
      <tr>
        <td class="text-center" style="width: 50px; font-weight: 600;">${item.day || ''}</td>
        <td class="text-center" style="width: 85px;">${formatDateDisplay(item.dateFrom)}</td>
        <td class="text-center" style="width: 135px; font-size: 8.5pt; font-weight: 500;">${timeFormatted}</td>
        <td style="width: 140px; font-size: 9pt; word-wrap: break-word; overflow-wrap: break-word;">${item.start}</td>
        <td style="width: 145px; font-size: 9pt; word-wrap: break-word; overflow-wrap: break-word;">${item.destination}</td>
        <td style="font-size: 9pt; word-wrap: break-word; overflow-wrap: break-word;">${item.activity}</td>
      </tr>
    `;
  });

  return `
    <div class="a4-page">
      <div class="doc-header">
        <h2>${g.collegeName || 'GOVT. VICTORIA COLLEGE, PALAKKAD'}</h2>
        <h3>${g.department || 'PG AND RESEARCH DEPARTMENT OF BOTANY'}</h3>
        <p>ACADEMIC YEAR: ${g.academicYear || '2025-2026'}</p>
      </div>

      <div class="doc-title-box">
        DETAILED ITINERARY OF ${c.name.toUpperCase()} STUDY TOUR
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 50px;">Day</th>
            <th style="width: 85px;">Date</th>
            <th style="width: 135px;">Time</th>
            <th style="width: 140px;">Start</th>
            <th style="width: 145px;">Destination</th>
            <th>Academic / Field Activity</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="doc-signatures" style="margin-top: 35px;">
        <div>
          <p>Staff in Charge:</p>
          <br><br>
          <p><strong>Faculty Escort</strong></p>
        </div>
        <div style="text-align: right;">
          <p>Approved:</p>
          <br><br>
          <p><strong>Head of the Department</strong></p>
        </div>
      </div>
    </div>
  `;
}

// Document HTML Generator: Budget Proposal
function renderBudgetDocHTML(g, budgetItems) {
  let rowsHtml = '';
  let grandTotalDays = 0;
  let grandTotalCost = 0;

  budgetItems.forEach((item, idx) => {
    const days = parseFloat(item.days) || 0;
    const students = parseInt(item.students) || 0;
    const rate = parseFloat(item.rate) || 500;
    const totalDays = Math.round(days * students);
    const totalCost = totalDays * rate;

    grandTotalDays += totalDays;
    grandTotalCost += totalCost;

    rowsHtml += `
      <tr>
        <td class="text-center" style="width: 35px; font-weight: 600;">${item.sl || idx + 1}</td>
        <td style="font-weight: 500; width: 140px;">${item.class}</td>
        <td style="width: 100px;">${item.paper}</td>
        <td style="font-size: 8.5pt; word-wrap: break-word; overflow-wrap: break-word;">${item.objective}</td>
        <td class="text-center" style="width: 45px;">${days}</td>
        <td class="text-center" style="width: 45px;">${students}</td>
        <td class="text-center" style="width: 60px;">₹${rate}</td>
        <td class="text-center" style="font-weight: 600; width: 60px;">${totalDays}</td>
        <td class="text-right" style="font-weight: 600; width: 80px;">₹${totalCost.toLocaleString('en-IN')}</td>
      </tr>
    `;
  });

  return `
    <div class="a4-page">
      <div class="doc-header">
        <h2>${g.department || 'PG AND RESEARCH DEPARTMENT OF BOTANY'}</h2>
        <h3>${g.collegeName || 'GOVERNMENT VICTORIA COLLEGE, PALAKKAD'}</h3>
        <p>PLAN FUND (${g.planFundYear || '2025-26'}) - STUDY TOUR PROPOSAL</p>
      </div>

      <div class="doc-title-box">
        SYLLABUS-LINKED FINANCIAL BUDGET PROPOSAL
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 35px;">Sl.</th>
            <th style="width: 140px;">Class / Semester</th>
            <th style="width: 100px;">Paper</th>
            <th>Tour as per Syllabus Requirement</th>
            <th style="width: 45px;">Days</th>
            <th style="width: 45px;">Students</th>
            <th style="width: 60px;">Rate/Day</th>
            <th style="width: 60px;">Total Days</th>
            <th style="width: 80px;" class="text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="font-weight: 700; background-color: #f8fafc;">
            <td colspan="7" class="text-right" style="text-transform: uppercase;">Total Plan Fund Proposed</td>
            <td class="text-center">${grandTotalDays}</td>
            <td class="text-right">₹${grandTotalCost.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>

      <div class="words-box">
        (${numberToIndianWords(grandTotalCost)})
      </div>

      <div class="doc-certificate">
        Certified that the study tour proposal is strictly as per the curriculum and field study practical prescribed for Undergraduate and Postgraduate degree programmes in Botany.
      </div>

      <div class="doc-signatures" style="margin-top: 35px;">
        <div>
          <p>Place: ${g.place || 'Palakkad'}</p>
          <p>Date: ${formatDateDisplay(g.signDate)}</p>
        </div>
        <div style="text-align: right;">
          <br><br>
          <p><strong>Head of the Department</strong></p>
          <p>${g.department || 'Department of Botany'}</p>
        </div>
      </div>
    </div>
  `;
}

// Document HTML Generator: Combined Master Student List
function renderCombinedListDocHTML(g, classes) {
  let rowsHtml = '';
  let globalSl = 1;

  classes.forEach(c => {
    (c.students || []).forEach(s => {
      rowsHtml += `
        <tr>
          <td class="text-center" style="width: 50px; font-weight: 600;">${globalSl++}</td>
          <td style="font-weight: 500;">${s.name}</td>
          <td class="text-center" style="width: 90px;">${s.gender}</td>
          <td class="text-center" style="width: 70px;">${s.age}</td>
          <td class="text-center" style="width: 110px; font-weight: 600;">${c.shortName || c.name}</td>
        </tr>
      `;
    });
  });

  return `
    <div class="a4-page">
      <div class="doc-header">
        <h2>${g.collegeName || 'GOVT. VICTORIA COLLEGE, PALAKKAD'}</h2>
        <h3>${g.department || 'PG AND RESEARCH DEPARTMENT OF BOTANY'}</h3>
        <p>ACADEMIC YEAR: ${g.academicYear || '2025-2026'}</p>
      </div>

      <div class="doc-title-box">
        CONSOLIDATED MASTER LIST OF STUDY TOUR STUDENTS
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 50px;">Sl No</th>
            <th>Name of Student</th>
            <th style="width: 90px;">Gender</th>
            <th style="width: 70px;">Age</th>
            <th style="width: 110px;">Class</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="doc-signatures" style="margin-top: 30px;">
        <div>
          <p>Date: ${formatDateDisplay(g.signDate)}</p>
        </div>
        <div style="text-align: right;">
          <p><strong>Head of the Department</strong></p>
        </div>
      </div>
    </div>
  `;
}

// --- PRINT TRIGGER ---
function printDocument() {
  renderPreview();
  window.print();
}

// --- JSON EXPORT / IMPORT ---
function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tourData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Tour_Proposal_${(tourData.general && tourData.general.academicYear) || '2025-2026'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.classes && imported.general) {
        tourData = imported;
        if (tourData.classes.length > 0) activeClassId = tourData.classes[0].id;
        saveData();
        renderAll();
        alert('Proposal configuration imported successfully!');
      } else {
        alert('Invalid proposal JSON structure.');
      }
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  reader.readAsText(file);
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchMainTab(tabId);
    });
  });

  // Filter dropdown in preview toolbar
  const filterSelect = document.getElementById('previewDocFilter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderPreview();
    });
  }

  // File import input
  const fileInput = document.getElementById('importFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', importDataJSON);
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
