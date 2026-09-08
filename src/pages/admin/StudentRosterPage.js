/**
 * Admin global student roster.
 */

import * as XLSX from 'xlsx';
import { adminFetch } from '../../lib/supabase.js';
import { renderDobSelector, initDobPicker } from '../../components/DobPicker.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

export async function renderStudentRosterPage(container) {
  container.innerHTML = adminShell({
    title: 'Student roster',
    width: 'max-w-5xl',
    body: `
      <div class="space-y-6 px-6 py-6">
        <div class="grid gap-6 md:grid-cols-2">
          <!-- Single Student Form -->
          <section class="rounded-[0.25em] border border-bolt-border p-4 bg-white">
            <h2 class="font-display text-base text-bolt-slate font-bold">Add student</h2>
            <form id="add-student-form" class="mt-3 grid gap-3">
              <label class="block">
                <span class="text-xs font-bold uppercase text-bolt-muted">Full name *</span>
                <input id="input-name" required class="mt-1 w-full px-3 py-2 text-sm" placeholder="e.g. Rahul Sharma" />
              </label>
              <label class="block">
                <span class="text-xs font-bold uppercase text-bolt-muted">Roll number *</span>
                <input id="input-roll" required class="mt-1 w-full px-3 py-2 font-mono text-sm" placeholder="e.g. 22U03032" />
              </label>
              <label class="block">
                <span class="text-xs font-bold uppercase text-bolt-muted">Email (optional)</span>
                <input id="input-email" type="email" class="mt-1 w-full px-3 py-2 text-sm" placeholder="name@example.com" />
              </label>
              <label class="block">
                <span class="text-xs font-bold uppercase text-bolt-muted">Date of birth (DD / MM / YYYY) *</span>
                ${renderDobSelector({ id: 'input-dob', defaultYear: 2004, defaultMonth: 1, defaultDay: 1 })}
                <span class="pt-1 text-xs text-bolt-caption block">Used as login password.</span>
              </label>
              <div>
                <p id="form-error" class="hidden text-sm text-bolt-red mb-2"></p>
                <button type="submit" class="btn-primary text-sm w-full py-2">Add student</button>
              </div>
            </form>
          </section>

          <!-- Bulk Upload Section -->
          <section class="rounded-[0.25em] border border-bolt-border p-4 bg-white flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <h2 class="font-display text-base text-bolt-slate font-bold">Bulk upload (.xlsx / .csv)</h2>
                <button id="btn-download-template" type="button" class="text-xs text-bolt-link hover:underline font-bold">
                  ↓ Download template
                </button>
              </div>
              <p class="mt-1 text-xs text-bolt-caption">
                Upload an Excel or CSV file containing <strong>Name</strong>, <strong>Roll Number</strong>, <strong>DOB (YYYY-MM-DD)</strong>, and optional <strong>Email</strong>.
              </p>

              <div class="mt-4 border-2 border-dashed border-bolt-border rounded p-6 text-center hover:border-bolt-blue transition-colors">
                <input id="bulk-file-input" type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" class="hidden" />
                <label for="bulk-file-input" class="cursor-pointer block">
                  <div class="text-2xl mb-1">📄</div>
                  <span class="text-sm font-bold text-bolt-link">Click to select file</span>
                  <span class="text-xs text-bolt-muted block mt-1">.xlsx or .csv supported</span>
                </label>
              </div>

              <div id="bulk-preview" class="hidden mt-3 text-xs bg-bolt-card p-3 rounded border border-bolt-border">
                <p id="bulk-file-name" class="font-bold text-bolt-ink"></p>
                <p id="bulk-row-count" class="text-bolt-muted mt-0.5"></p>
              </div>

              <div id="bulk-status" class="hidden mt-3 text-xs p-3 rounded"></div>
            </div>

            <button id="btn-upload-bulk" type="button" disabled class="btn-primary text-sm w-full py-2 mt-4">
              Upload & Populate
            </button>
          </section>
        </div>

        <section>
          <div class="flex items-center justify-between pb-2">
            <h2 class="font-display text-base text-bolt-slate font-bold">All students</h2>
            <span id="roster-count" class="text-xs text-bolt-muted"></span>
          </div>
          <div id="roster-body"><p class="text-sm text-bolt-muted">Loading…</p></div>
        </section>
      </div>
    `,
  });

  wireAdminShell(container);
  initDobPicker(container, 'input-dob');
  const rosterBody = container.querySelector('#roster-body');
  const rosterCount = container.querySelector('#roster-count');
  const formError = container.querySelector('#form-error');

  let parsedStudents = [];

  async function loadRoster() {
    try {
      const { students } = await adminFetch('/api/admin/students');
      rosterCount.textContent = `${students.length} student${students.length === 1 ? '' : 's'}`;
      rosterBody.innerHTML = `
        <div class="overflow-x-auto">
          <table class="bolt-table">
            <thead><tr><th>Name</th><th>Roll</th><th>Email</th><th>Added</th><th></th></tr></thead>
            <tbody>
              ${students.map((s) => `
                <tr>
                  <td class="font-bold text-bolt-ink">${escapeHtml(s.fullName)}</td>
                  <td class="font-mono text-xs">${escapeHtml(s.rollNumber)}</td>
                  <td class="text-xs">${escapeHtml(s.email || '—')}</td>
                  <td class="font-mono text-xs">${new Date(s.createdAt).toLocaleDateString()}</td>
                  <td><button type="button" class="text-xs text-bolt-red hover:underline" data-delete="${s.id}">Remove</button></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-bolt-caption py-4 text-center">No students yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      rosterBody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remove this student from the roster?')) return;
          sound.playClick();
          await adminFetch(`/api/admin/students/${btn.dataset.delete}`, { method: 'DELETE' });
          await loadRoster();
        });
      });
    } catch (err) {
      rosterBody.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
    }
  }

  // --- Single Student Form ---
  container.querySelector('#add-student-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    sound.playClick();
    formError.classList.add('hidden');

    try {
      await adminFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: container.querySelector('#input-name').value.trim(),
          rollNumber: container.querySelector('#input-roll').value.trim(),
          email: container.querySelector('#input-email').value.trim(),
          dob: container.querySelector('#input-dob').value,
        }),
      });
      container.querySelector('#add-student-form').reset();
      await loadRoster();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('hidden');
      sound.playWarningAlert();
    }
  });

  // --- Bulk File Upload & Parsing ---
  const fileInput = container.querySelector('#bulk-file-input');
  const bulkPreview = container.querySelector('#bulk-preview');
  const bulkFileName = container.querySelector('#bulk-file-name');
  const bulkRowCount = container.querySelector('#bulk-row-count');
  const bulkStatus = container.querySelector('#bulk-status');
  const uploadBulkBtn = container.querySelector('#btn-upload-bulk');

  function normalizeDateVal(val) {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val)) {
      // Use local date methods to avoid UTC shift
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const str = String(val).trim();
    // Support YYYY-MM-DD or YYYY/MM/DD
    const iso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    }

    // Support DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
    const slashed = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (slashed) {
      const part1 = parseInt(slashed[1], 10);
      const part2 = parseInt(slashed[2], 10);
      const year = slashed[3];

      // If part1 > 12, part1 must be day (DD/MM/YYYY)
      // If part2 > 12, part2 must be day (MM/DD/YYYY)
      // Standard in Indian institutions is DD/MM/YYYY
      let day = part1;
      let month = part2;
      if (part2 > 12 && part1 <= 12) {
        month = part1;
        day = part2;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return str;
  }

  // Parse raw text CSV preserving original cell strings (no date auto-detection).
  // This prevents XLSX from converting "09/02/2004" (DD/MM) into an Excel
  // serial number by mis-reading it as MM/DD (US format).
  function parseCsvRows(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const splitCsv = (line) => {
      const out = [];
      let cur = '';
      let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      out.push(cur.trim());
      return out;
    };
    const headers = splitCsv(lines[0]);
    return lines.slice(1).map((line) => {
      const vals = splitCsv(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
  }

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    bulkStatus.classList.add('hidden');
    bulkFileName.textContent = file.name;

    try {
      const buffer = await file.arrayBuffer();
      let rows;

      if (file.name.toLowerCase().endsWith('.csv')) {
        // CSV: parse as plain text so date strings like "09/02/2004" are
        // preserved exactly. XLSX auto-detection would convert them to
        // Excel serial numbers (MM/DD US interpretation) and we'd lose
        // the original string needed for our DD/MM/YYYY parser.
        const text = new TextDecoder('utf-8').decode(buffer);
        rows = parseCsvRows(text);
      } else {
        // XLSX: use cellDates:true so Excel date cells become JS Date objects,
        // then normalizeDateVal() reads them with local getters (no UTC shift).
        const workbook = XLSX.read(buffer, { raw: false, cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      }

      parsedStudents = [];
      for (const r of rows) {
        // Find keys case-insensitively
        const getVal = (...keys) => {
          for (const k of Object.keys(r)) {
            const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const target of keys) {
              if (clean.includes(target)) return r[k];
            }
          }
          return '';
        };

        const fullName = String(getVal('name', 'fullname', 'student') || '').trim();
        const rollNumber = String(getVal('roll', 'rollno', 'id', 'studentno') || '').trim();
        const email = String(getVal('email', 'mail') || '').trim();
        const dobRaw = getVal('dob', 'birth', 'dateofbirth');
        const dob = normalizeDateVal(dobRaw);

        if (fullName && rollNumber && dob) {
          parsedStudents.push({ fullName, rollNumber, email, dob });
        }
      }

      bulkRowCount.textContent = `Parsed ${parsedStudents.length} valid student rows from file.`;
      bulkPreview.classList.remove('hidden');
      uploadBulkBtn.disabled = parsedStudents.length === 0;
    } catch (err) {
      bulkStatus.className = 'mt-3 text-xs p-3 rounded bg-red-50 text-bolt-red border border-red-200';
      bulkStatus.textContent = `Error reading file: ${err.message}`;
      bulkStatus.classList.remove('hidden');
      uploadBulkBtn.disabled = true;
    }
  });


  uploadBulkBtn.addEventListener('click', async () => {
    if (!parsedStudents.length) return;
    uploadBulkBtn.disabled = true;
    uploadBulkBtn.textContent = 'Uploading…';
    sound.playClick();

    try {
      const res = await adminFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({ students: parsedStudents }),
      });

      const hasErrors = res.errors?.length > 0;
      bulkStatus.className = `mt-3 text-xs p-3 rounded border ${hasErrors ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`;
      bulkStatus.innerHTML = `
        <strong>Upload complete!</strong><br/>
        • ${res.inserted || 0} added<br/>
        • ${res.updated || 0} updated with new details
        ${hasErrors ? `<br/>• ${res.errors.length} failed:<br/>${res.errors.map(e => `&nbsp;&nbsp;Row ${e.row}: ${escapeHtml(e.error)}`).join('<br/>')}` : ''}
      `;
      bulkStatus.classList.remove('hidden');
      sound.playSuccessChime();
      fileInput.value = '';
      parsedStudents = [];
      uploadBulkBtn.textContent = 'Upload & Populate';
      await loadRoster();
    } catch (err) {
      bulkStatus.className = 'mt-3 text-xs p-3 rounded bg-red-50 text-bolt-red border border-red-200';
      bulkStatus.textContent = err.message;
      bulkStatus.classList.remove('hidden');
      uploadBulkBtn.disabled = false;
      uploadBulkBtn.textContent = 'Upload & Populate';
      sound.playWarningAlert();
    }
  });

  // Download Sample Template
  container.querySelector('#btn-download-template').addEventListener('click', () => {
    const wsData = [
      ['Full Name', 'Roll Number', 'DOB', 'Email'],
      ['Aarav Sharma', '22U03001', '2004-05-14', 'aarav@example.com'],
      ['Priya Patel', '22U03002', '2003-11-23', 'priya@example.com'],
      ['Rohan Gupta', '22U03003', '2004-01-08', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_roster_template.xlsx');
  });

  await loadRoster();
}
