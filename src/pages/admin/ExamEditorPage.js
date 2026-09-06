/**
 * Admin exam editor — curriculum, timer, proctor settings.
 */

import { LESSONS, LESSON_CATEGORIES } from '../../data/lessons.js';
import { supabase } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

const DEFAULT_LESSON_IDS = LESSONS.map((l) => l.id);

export async function renderExamEditorPage(container, { examId = null }) {
  let exam = {
    title: '',
    description: '',
    lesson_ids: DEFAULT_LESSON_IDS,
    duration_sec: 45 * 60,
    proctor_mode: 'strike_1',
    fullscreen_enforced: false,
    status: 'draft',
  };

  if (examId) {
    const { data, error } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle();
    if (error || !data) {
      container.innerHTML = adminShell({
        title: 'Exam not found',
        body: `<div class="px-6 py-6 text-sm text-bolt-red">${escapeHtml(error?.message || 'Exam not found')}</div>`,
      });
      wireAdminShell(container);
      return;
    }
    exam = data;
  }

  const lessonsByCategory = Object.values(LESSON_CATEGORIES).map((cat) => ({
    category: cat,
    lessons: LESSONS.filter((l) => l.category.id === cat.id),
  }));

  container.innerHTML = adminShell({
    title: examId ? 'Edit exam' : 'New exam',
    width: 'max-w-4xl',
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
          <label class="flex items-center gap-2 sm:col-span-2">
            <input id="check-fullscreen" type="checkbox" class="accent-[#2074e7]" ${exam.fullscreen_enforced ? 'checked' : ''} />
            <span class="text-sm text-bolt-slate">Launch in fullscreen</span>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase text-bolt-muted">Status</span>
            <select id="select-status" class="mt-1 w-full px-3 py-2 text-sm">
              <option value="draft" ${exam.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${exam.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="closed" ${exam.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
          </label>
        </section>

        ${examId ? `
          <div class="rounded-[0.25em] bg-bolt-callout p-3 text-xs text-bolt-slate">
            Student link:
            <code class="block pt-1 break-all font-mono text-bolt-link">${escapeHtml(studentLink(examId))}</code>
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

    const payload = {
      title: container.querySelector('#input-title').value.trim(),
      description: container.querySelector('#input-description').value.trim(),
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

    const query = examId
      ? supabase.from('exams').update(payload).eq('id', examId)
      : supabase.from('exams').insert(payload).select('id').single();

    const { data, error } = await query;
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      return;
    }

    navigate(examId ? '/admin/exams' : `/admin/exams/${data.id}/edit`);
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

function studentLink(examId) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
  return `${window.location.origin}${base}/exam/${examId}`;
}
