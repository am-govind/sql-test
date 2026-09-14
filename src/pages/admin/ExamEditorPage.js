/**
 * Admin exam editor — curriculum, timer, proctor settings.
 */

import { LESSONS, LESSON_CATEGORIES } from '../../data/lessons.js';
import { supabase, adminFetch, getCurrentOrganization } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

const DEFAULT_LESSON_IDS = LESSONS.map((l) => l.id);

export async function renderExamEditorPage(container, { examId = null, showEnrollment = false }) {
  let exam = {
    title: '',
    description: '',
    lesson_ids: DEFAULT_LESSON_IDS,
    duration_sec: 45 * 60,
    proctor_mode: 'strike_1',
    fullscreen_enforced: false,
    status: 'draft',
    proctorConfig: {
      webcam: true,
      mic: true,
      screenshare: false,
      blockCopyPaste: true,
      blockDevtools: true,
    },
  };

  if (examId) {
    const organization = await getCurrentOrganization();
    const { data, error } = await supabase.from('exams').select('*').eq('id', examId).eq('organization_id', organization?.id).maybeSingle();
    if (error || !data) {
      container.innerHTML = adminShell({
        title: 'Exam not found',
        body: `<div class="px-6 py-6 text-sm text-bolt-red">${escapeHtml(error?.message || 'Exam not found')}</div>`,
      });
      wireAdminShell(container);
      return;
    }
    exam = { ...data };

    // Try parsing proctorConfig if embedded into description as JSON
    try {
      if (exam.description && exam.description.startsWith('{') && exam.description.endsWith('}')) {
        const parsed = JSON.parse(exam.description);
        if (parsed.proctorConfig) {
          exam.proctorConfig = { ...exam.proctorConfig, ...parsed.proctorConfig };
          exam.description = parsed.text || '';
        }
      }
    } catch {
      // Plain string description, keep default proctorConfig
    }
  }

  const lessonsByCategory = Object.values(LESSON_CATEGORIES).map((cat) => ({
    category: cat,
    lessons: LESSONS.filter((l) => l.category.id === cat.id),
  }));

  container.innerHTML = adminShell({
    title: examId ? 'Edit exam' : 'New exam',
    width: showEnrollment ? 'max-w-6xl' : 'max-w-4xl',
    cardOverflow: 'overflow-visible',
    body: `
      <form id="exam-editor-form" class="space-y-6 px-6 py-6">
        <section class="space-y-3">
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Title *</span>
            <input id="input-title" required value="${escapeHtml(exam.title)}" class="mt-1 w-full px-3 py-2 text-sm" />
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Description</span>
            <textarea id="input-description" rows="2" class="mt-1 w-full px-3 py-2 text-sm">${escapeHtml(exam.description || '')}</textarea>
          </label>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-base text-bolt-slate">Lessons</h2>
            <div class="flex gap-2">
              <button type="button" id="btn-select-all" class="text-xs text-bolt-link hover:underline">Select all</button>
              <button type="button" id="btn-clear-all" class="text-xs text-bolt-link hover:underline">Clear</button>
            </div>
          </div>
          <div class="max-h-64 space-y-3 overflow-y-auto rounded-[0.25em] border border-bolt-border p-3">
            ${lessonsByCategory.map(({ category, lessons }) => `
              <div>
                <h3 class="text-xs font-bold uppercase text-bolt-muted">${escapeHtml(category.label)}</h3>
                <div class="mt-1 space-y-1">
                  ${lessons.map((lesson) => `
                    <label class="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" class="lesson-check accent-[#2074e7]" value="${lesson.id}" ${exam.lesson_ids.includes(lesson.id) ? 'checked' : ''} />
                      <span>${escapeHtml(lesson.shortTitle)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Time limit</span>
            <select id="select-duration" class="mt-1 w-full px-3 py-2 text-sm">
              ${durationOptions(exam.duration_sec)}
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Tab-switch policy</span>
            <select id="select-proctor-mode" class="mt-1 w-full px-3 py-2 text-sm">
              <option value="strike_1" ${exam.proctor_mode === 'strike_1' ? 'selected' : ''}>1 warning, auto-submit on 2nd</option>
              <option value="strict" ${exam.proctor_mode === 'strict' ? 'selected' : ''}>Strict: submit on 1st offense</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Status</span>
            <select id="select-status" class="mt-1 w-full px-3 py-2 text-sm">
              <option value="draft" ${exam.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${exam.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="closed" ${exam.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
          </label>
          <div class="flex items-center pt-6">
            <label class="flex items-center gap-2">
              <input id="check-fullscreen" type="checkbox" class="accent-[#2074e7]" ${exam.fullscreen_enforced ? 'checked' : ''} />
              <span class="text-sm font-medium text-bolt-slate">Enforce Fullscreen Mode</span>
            </label>
          </div>
        </section>

        <!-- Advanced Proctoring & Media Monitoring -->
        <section class="space-y-3 rounded-lg border border-bolt-border bg-slate-50/60 p-4">
          <div>
            <h3 class="font-display text-sm font-bold text-bolt-slate">Proctor Security & Media Verification</h3>
            <p class="text-xs text-bolt-muted">Students will be prompted to grant permissions before starting the test.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 pt-1">
            <label class="flex items-start gap-2.5 p-2 bg-white rounded border border-bolt-border cursor-pointer hover:border-bolt-blue transition-colors">
              <input id="check-webcam" type="checkbox" class="mt-0.5 accent-[#2074e7]" ${exam.proctorConfig?.webcam ? 'checked' : ''} />
              <div>
                <span class="text-xs font-bold text-bolt-ink block">Webcam & Motion Tracking</span>
                <span class="text-[11px] text-bolt-muted block">Detects absence from camera, covering, or rapid movement.</span>
              </div>
            </label>

            <label class="flex items-start gap-2.5 p-2 bg-white rounded border border-bolt-border cursor-pointer hover:border-bolt-blue transition-colors">
              <input id="check-mic" type="checkbox" class="mt-0.5 accent-[#2074e7]" ${exam.proctorConfig?.mic ? 'checked' : ''} />
              <div>
                <span class="text-xs font-bold text-bolt-ink block">Microphone Sound Monitor</span>
                <span class="text-[11px] text-bolt-muted block">Monitors ambient audio decibels and speech spikes.</span>
              </div>
            </label>

            <label class="flex items-start gap-2.5 p-2 bg-white rounded border border-bolt-border cursor-pointer hover:border-bolt-blue transition-colors">
              <input id="check-screenshare" type="checkbox" class="mt-0.5 accent-[#2074e7]" ${exam.proctorConfig?.screenshare ? 'checked' : ''} />
              <div>
                <span class="text-xs font-bold text-bolt-ink block">Live Screen Share Verification</span>
                <span class="text-[11px] text-bolt-muted block">Requires student to share their full screen during the exam.</span>
              </div>
            </label>

            <label class="flex items-start gap-2.5 p-2 bg-white rounded border border-bolt-border cursor-pointer hover:border-bolt-blue transition-colors">
              <input id="check-clipboard" type="checkbox" class="mt-0.5 accent-[#2074e7]" ${exam.proctorConfig?.blockCopyPaste !== false ? 'checked' : ''} />
              <div>
                <span class="text-xs font-bold text-bolt-ink block">Block Copy/Paste & DevTools</span>
                <span class="text-[11px] text-bolt-muted block">Prevents external code pasting and flags console inspection.</span>
              </div>
            </label>
          </div>
        </section>

        ${examId && showEnrollment ? `
          <section id="enrollment-section" class="space-y-3 rounded-lg border border-bolt-border bg-white p-4 shadow-sm">
            <div class="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider text-bolt-blue">Exam access control</p>
                  <h2 class="pt-1 font-display text-lg font-bold text-bolt-ink">Choose who can take this exam</h2>
                  <p class="pt-1 text-xs text-bolt-slate">Only enrolled students in the selected organization will see this exam after signing in.</p>
                </div>
                <div class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-bolt-slate shadow-sm">Enrollment setup</div>
              </div>
              <div class="mt-4 grid gap-2 sm:grid-cols-3">
                <div class="rounded-md bg-white/80 p-2.5"><div class="text-[10px] uppercase tracking-wide text-bolt-muted">Eligibility</div><div class="pt-1 text-xs font-semibold text-bolt-ink">Organization members</div></div>
                <div class="rounded-md bg-white/80 p-2.5"><div class="text-[10px] uppercase tracking-wide text-bolt-muted">Student access</div><div class="pt-1 text-xs font-semibold text-bolt-ink">After enrollment</div></div>
                <div class="rounded-md bg-white/80 p-2.5"><div class="text-[10px] uppercase tracking-wide text-bolt-muted">Changes</div><div class="pt-1 text-xs font-semibold text-bolt-ink">Saved explicitly</div></div>
              </div>
            </div>
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-bolt-border pb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-display text-base font-semibold text-bolt-slate">Enrollment roster</h2>
                  <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bolt-blue">Organization scoped</span>
                </div>
                <p class="mt-1 text-xs text-bolt-muted" id="enrollment-summary">Manage which students are eligible to take this exam.</p>
              </div>
              <button type="button" id="btn-save-enrollment" class="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-sm">
                <span>Save enrollment</span>
              </button>
            </div>

            <div class="grid gap-2 sm:grid-cols-3">
              <div class="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wide text-bolt-muted">Enrolled</div>
                <div id="enrollment-count" class="mt-0.5 text-lg font-bold text-bolt-ink">—</div>
              </div>
              <div class="rounded-md border border-bolt-border bg-slate-50 px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wide text-bolt-muted">Available to add</div>
                <div id="available-count" class="mt-0.5 text-lg font-bold text-bolt-ink">—</div>
              </div>
              <div class="rounded-md border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wide text-bolt-muted">Student access</div>
                <div class="mt-0.5 text-xs font-semibold text-emerald-700">Ready after save</div>
              </div>
            </div>

            <div class="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wide text-bolt-slate">Currently enrolled</h3>
                  <p class="text-[11px] text-bolt-muted">These students can access this exam. Remove or allow a retake from each card.</p>
                </div>
                <a href="/admin/students" data-nav class="whitespace-nowrap text-xs font-semibold text-bolt-link hover:underline">Add or import students →</a>
              </div>
              <div id="enrolled-chips-container" class="min-h-[82px] rounded-md border border-blue-100 bg-white p-2">
                <span class="flex items-center gap-2 text-xs text-bolt-muted" id="chips-empty-msg">
                  <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bolt-border border-t-bolt-blue"></span>
                  Loading enrollment…
                </span>
              </div>
            </div>

            <div class="rounded-lg border border-dashed border-bolt-blue/40 bg-slate-50/70 p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wide text-bolt-slate">Add students to this exam</h3>
                  <p class="text-[11px] text-bolt-muted">Select from students already added to your organization.</p>
                </div>
                <span class="hidden rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-bolt-muted sm:inline" id="selection-hint">No changes yet</span>
              </div>

            <div class="relative" id="enrollment-dropdown-wrapper">
              <button type="button" id="btn-toggle-dropdown" class="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-bolt-border rounded hover:border-bolt-blue transition-colors focus:outline-none focus:ring-1 focus:ring-bolt-blue">
                <span id="dropdown-btn-label" class="text-bolt-slate font-medium">Select students to enroll…</span>
                <span class="text-xs text-bolt-muted">▼</span>
              </button>

              <!-- Dropdown Panel (hidden by default) -->
              <div id="enrollment-dropdown-menu" class="hidden absolute z-50 left-0 right-0 mt-1 bg-white border border-bolt-border rounded-md shadow-xl">
                <div class="p-2 border-b border-bolt-border bg-slate-50 flex items-center gap-2">
                  <input id="enrollment-search" type="text" placeholder="Search by name, roll no, or email…" class="w-full px-2.5 py-1.5 text-xs border border-bolt-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-bolt-blue" />
                  <button type="button" id="btn-select-all-students" class="text-xs text-bolt-blue font-semibold hover:underline whitespace-nowrap px-1">All</button>
                  <span class="text-bolt-border">|</span>
                  <button type="button" id="btn-clear-all-students" class="text-xs text-bolt-muted hover:text-bolt-red hover:underline whitespace-nowrap px-1">Clear</button>
                </div>
                <div id="enrollment-list" class="space-y-0.5 p-1.5 text-xs divide-y divide-slate-100 overflow-y-auto" style="max-height: 185px;">
                  <div class="flex items-center gap-2 p-3 text-xs text-bolt-muted">
                    <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bolt-border border-t-bolt-blue"></span>
                    Loading organization roster…
                  </div>
                </div>
              </div>
            </div>
            </div>

            <p id="enrollment-error" class="hidden text-xs text-bolt-red font-medium"></p>
            <p id="enrollment-success" class="hidden text-xs text-emerald-600 font-medium"></p>
          </section>
          <div class="rounded-md bg-blue-50/70 border border-blue-100 p-3 text-xs text-bolt-slate">
            Students must sign in at <code>/student/login</code> with their roll number/email and date of birth to access enrolled exams.
          </div>
        ` : ''}

        <p id="editor-error" class="hidden text-sm text-bolt-red"></p>

        <div class="flex gap-2 border-t border-bolt-border pt-4">
          <button type="button" id="btn-cancel" class="btn-secondary text-sm">Cancel</button>
          <button type="submit" class="btn-primary text-sm">Save exam</button>
        </div>
      </form>
    `,
  });

  wireAdminShell(container);

  container.querySelector('#btn-select-all')?.addEventListener('click', () => {
    container.querySelectorAll('.lesson-check').forEach((cb) => { cb.checked = true; });
  });
  container.querySelector('#btn-clear-all')?.addEventListener('click', () => {
    container.querySelectorAll('.lesson-check').forEach((cb) => { cb.checked = false; });
  });
  container.querySelector('#btn-cancel')?.addEventListener('click', () => navigate('/admin/exams'));

  container.querySelector('#exam-editor-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    sound.playClick();

    const lessonIds = [...container.querySelectorAll('.lesson-check:checked')].map((cb) => Number(cb.value));
    const errorEl = container.querySelector('#editor-error');

    if (!lessonIds.length) {
      errorEl.textContent = 'Select at least one lesson.';
      errorEl.classList.remove('hidden');
      return;
    }

    const proctorConfig = {
      webcam: container.querySelector('#check-webcam')?.checked ?? true,
      mic: container.querySelector('#check-mic')?.checked ?? true,
      screenshare: container.querySelector('#check-screenshare')?.checked ?? false,
      blockCopyPaste: container.querySelector('#check-clipboard')?.checked ?? true,
      blockDevtools: container.querySelector('#check-clipboard')?.checked ?? true,
    };

    const descText = container.querySelector('#input-description').value.trim();
    const serializedDescription = JSON.stringify({
      text: descText,
      proctorConfig,
    });

    const payload = {
      title: container.querySelector('#input-title').value.trim(),
      description: serializedDescription,
      lesson_ids: lessonIds,
      duration_sec: Number(container.querySelector('#select-duration').value),
      proctor_mode: container.querySelector('#select-proctor-mode').value,
      fullscreen_enforced: container.querySelector('#check-fullscreen').checked,
      status: container.querySelector('#select-status').value,
    };

    if (!payload.title) {
      errorEl.textContent = 'Title is required.';
      errorEl.classList.remove('hidden');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const organization = await getCurrentOrganization();
    if (!organization) {
      errorEl.textContent = 'No organization is assigned to this admin.';
      errorEl.classList.remove('hidden');
      return;
    }
    const query = examId
      ? supabase.from('exams').update(payload).eq('id', examId).eq('organization_id', organization.id)
      : supabase.from('exams').insert({ ...payload, created_by: user.id, organization_id: organization.id }).select('id').single();

    const { data, error } = await query;
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      return;
    }

    navigate(examId ? '/admin/exams' : `/admin/exams/${data.id}/edit`);
  });

  if (examId && showEnrollment) {
    wireEnrollmentSection(container, examId);
  }
}

async function wireEnrollmentSection(container, examId) {
  const listEl = container.querySelector('#enrollment-list');
  const searchEl = container.querySelector('#enrollment-search');
  const errorEl = container.querySelector('#enrollment-error');
  const successEl = container.querySelector('#enrollment-success');
  const chipsContainer = container.querySelector('#enrolled-chips-container');
  const chipsEmptyMsg = container.querySelector('#chips-empty-msg');
  const toggleBtn = container.querySelector('#btn-toggle-dropdown');
  const dropdownMenu = container.querySelector('#enrollment-dropdown-menu');
  const dropdownBtnLabel = container.querySelector('#dropdown-btn-label');
  const summaryEl = container.querySelector('#enrollment-summary');
  const enrollmentCountEl = container.querySelector('#enrollment-count');
  const availableCountEl = container.querySelector('#available-count');
  const selectionHintEl = container.querySelector('#selection-hint');

  let allStudents = [];
  let enrolledIds = new Set();
  let submissionsByStudent = new Map();
  toggleBtn.disabled = true;
  toggleBtn.classList.add('opacity-60', 'cursor-wait');

  try {
    const [{ students }, { enrollments }, { submissions }] = await Promise.all([
      adminFetch('/api/admin/students'),
      adminFetch(`/api/admin/exams/${examId}/enrollments`),
      adminFetch(`/api/admin/submissions?examId=${examId}`),
    ]);
    allStudents = students || [];
    enrolledIds = new Set((enrollments || []).map((e) => e.studentId));
    submissionsByStudent = new Map((submissions || []).map((submission) => [submission.studentId, submission]));
    toggleBtn.disabled = false;
    toggleBtn.classList.remove('opacity-60', 'cursor-wait');
  } catch (err) {
    listEl.innerHTML = `<p class="text-bolt-red p-2">${escapeHtml(err.message)}</p>`;
    chipsEmptyMsg.innerHTML = `<span class="text-bolt-red">Unable to load enrollment data. Refresh and try again.</span>`;
    return;
  }

  function updateChipsAndStatus() {
    const enrolledStudents = allStudents.filter(s => enrolledIds.has(s.id));
    const availableCount = Math.max(0, allStudents.length - enrolledStudents.length);
    summaryEl.textContent = `${enrolledStudents.length} of ${allStudents.length} students enrolled`;
    enrollmentCountEl.textContent = enrolledStudents.length;
    availableCountEl.textContent = availableCount;
    selectionHintEl.textContent = enrolledStudents.length ? `${enrolledStudents.length} selected` : 'No students selected';
    dropdownBtnLabel.textContent = enrolledStudents.length === 0
      ? 'Select students to enroll…'
      : `${enrolledStudents.length} student${enrolledStudents.length === 1 ? '' : 's'} selected`;

    if (enrolledStudents.length === 0) {
      chipsContainer.innerHTML = '';
      chipsContainer.appendChild(chipsEmptyMsg);
      chipsEmptyMsg.classList.remove('hidden');
    } else {
      chipsContainer.innerHTML = `<div class="overflow-x-auto"><table class="bolt-table w-full">
        <thead>
          <tr><th>#</th><th>Student</th><th>Roll</th><th>Access</th><th class="text-right">Action</th></tr>
        </thead>
        <tbody>${enrolledStudents.map((s, index) => `
          <tr>
            <td class="font-mono text-bolt-muted">${index + 1}</td>
            <td class="font-bold text-bolt-ink">${escapeHtml(s.fullName)}</td>
            <td class="font-mono text-xs">${escapeHtml(s.rollNumber)}</td>
            <td>${submissionsByStudent.has(s.id)
              ? '<span class="font-semibold text-amber-700">Submitted · retake available</span>'
              : '<span class="font-semibold text-emerald-600">Eligible</span>'}</td>
            <td><div class="flex justify-end gap-1.5">
              ${submissionsByStudent.has(s.id) ? `<button type="button" class="btn-secondary px-2 py-1 text-xs text-bolt-amber hover:bg-bolt-amber/10" data-retake-id="${s.id}" data-retake-submission="${submissionsByStudent.get(s.id).id}">Allow retake</button>` : ''}
              <button type="button" class="btn-secondary px-2 py-1 text-xs text-bolt-red hover:bg-bolt-red hover:text-white" data-remove-id="${s.id}">Remove</button>
            </div></td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;

      chipsContainer.querySelectorAll('[data-remove-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          enrolledIds.delete(btn.dataset.removeId);
          updateChipsAndStatus();
          renderList();
        });
      });

      chipsContainer.querySelectorAll('[data-retake-id]').forEach(btn => {
        btn.addEventListener('click', async (event) => {
          event.stopPropagation();
          const student = allStudents.find((item) => item.id === btn.dataset.retakeId);
          if (!confirm(`Delete the submission for ${student?.fullName || 'this student'} and allow a retake?`)) return;
          btn.disabled = true;
          btn.textContent = '…';
          try {
            await adminFetch(`/api/admin/submissions?id=${btn.dataset.retakeSubmission}`, { method: 'DELETE' });
            submissionsByStudent.delete(btn.dataset.retakeId);
            updateChipsAndStatus();
          } catch (err) {
            alert(`Failed to allow retake: ${err.message}`);
            btn.disabled = false;
            btn.textContent = 'Allow retake';
          }
        });
      });
    }
  }

  function renderList() {
    const q = searchEl.value.trim().toLowerCase();
    const filtered = allStudents.filter((s) => {
      if (!q) return true;
      return s.fullName.toLowerCase().includes(q)
        || s.rollNumber.toLowerCase().includes(q)
        || (s.email && s.email.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      listEl.innerHTML = allStudents.length
        ? '<p class="text-bolt-caption p-2">No students match your search.</p>'
        : '<div class="space-y-1 p-3 text-xs text-bolt-muted"><p>No students have been added to this organization yet.</p><a href="/admin/students" data-nav class="text-bolt-link hover:underline">Add or import students →</a></div>';
      wireAdminShell(container);
      return;
    }

    listEl.innerHTML = filtered.map((s) => {
      const isChecked = enrolledIds.has(s.id);
      return `
        <label class="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-blue-50 transition-colors ${isChecked ? 'bg-blue-50/50' : ''}">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="enroll-check accent-[#2074e7]" value="${s.id}" ${isChecked ? 'checked' : ''} />
            <span class="font-medium text-bolt-ink">${escapeHtml(s.fullName)}</span>
          </div>
          <span class="font-mono text-[11px] text-bolt-muted">${escapeHtml(s.rollNumber)}</span>
        </label>
      `;
    }).join('');

    listEl.querySelectorAll('.enroll-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          enrolledIds.add(cb.value);
        } else {
          enrolledIds.delete(cb.value);
        }
        updateChipsAndStatus();
      });
    });
  }

  // Toggle Dropdown
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
    if (!dropdownMenu.classList.contains('hidden')) {
      searchEl.focus();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = container.querySelector('#enrollment-dropdown-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });

  // Select all & clear all
  container.querySelector('#btn-select-all-students')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const q = searchEl.value.trim().toLowerCase();
    allStudents.forEach(s => {
      if (!q || s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)) {
        enrolledIds.add(s.id);
      }
    });
    updateChipsAndStatus();
    renderList();
  });

  container.querySelector('#btn-clear-all-students')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const q = searchEl.value.trim().toLowerCase();
    if (!q) {
      enrolledIds.clear();
    } else {
      allStudents.forEach(s => {
        if (s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)) {
          enrolledIds.delete(s.id);
        }
      });
    }
    updateChipsAndStatus();
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  updateChipsAndStatus();
  renderList();

  // Save Enrollment
  const saveBtn = container.querySelector('#btn-save-enrollment');
  saveBtn?.addEventListener('click', async () => {
    sound.playClick();
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const studentIds = Array.from(enrolledIds);
    try {
      await adminFetch(`/api/admin/exams/${examId}/enrollments`, {
        method: 'PUT',
        body: JSON.stringify({ studentIds }),
      });
      sound.playSuccessChime();
      successEl.textContent = `✓ Saved! ${studentIds.length} student${studentIds.length === 1 ? '' : 's'} enrolled.`;
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 4000);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save enrollment';
    }
  });
}

function durationOptions(selected) {
  const options = [
    [900, '15 minutes'],
    [1800, '30 minutes'],
    [2700, '45 minutes'],
    [3600, '60 minutes'],
    [5400, '90 minutes'],
  ];
  return options.map(([sec, label]) =>
    `<option value="${sec}" ${sec === selected ? 'selected' : ''}>${label}</option>`
  ).join('');
}
