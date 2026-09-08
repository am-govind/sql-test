/**
 * Central state store for exam lifecycle, student progress, and persistence.
 */

import { LESSONS } from '../data/lessons.js';
import { postStudentSubmission } from '../lib/studentSession.js';

const STORAGE_KEY_ACTIVE = 'sqlproctor_active_session_v2';

class StateService {
  constructor() {
    this.session = this.loadSession();
    this.listeners = new Set();
  }

  getDefaultSession() {
    return {
      status: 'not_started',
      examId: null,
      examTitle: '',
      studentId: null,
      studentName: '',
      rollNumber: '',
      selectedLessonIds: LESSONS.map((l) => l.id),
      currentLessonId: 1,
      lessonProgress: {},
      durationSec: 45 * 60,
      remainingSec: 45 * 60,
      startTime: null,
      submittedAt: null,
      proctorMode: 'strike_1',
      fullscreenEnforced: false,
      violations: [],
      strikesUsed: 0,
      maxStrikesAllowed: 1,
      submissionReason: null,
      activeLessonStartTime: null,
      submissionSaved: false,
      submissionError: null,
    };
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load active session:', e);
    }
    return this.getDefaultSession();
  }

  saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(this.session));
      this.notify();
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.session);
      } catch (err) {
        console.error('Error in state subscriber:', err);
      }
    }
  }

  startTest({
    examId,
    examTitle = '',
    studentId,
    studentName,
    rollNumber,
    selectedLessonIds,
    durationSec = 45 * 60,
    proctorMode = 'strike_1',
    fullscreenEnforced = false,
  }) {
    const lessonIds = selectedLessonIds?.length ? selectedLessonIds : LESSONS.map((l) => l.id);
    const initialProgress = {};
    lessonIds.forEach((id) => {
      initialProgress[id] = {
        completed: false,
        completedAt: null,
        timeSpent: 0,
        sqlCode: '',
      };
    });

    const now = Date.now();
    this.session = {
      status: 'in_progress',
      examId,
      examTitle,
      studentId,
      studentName: studentName.trim(),
      rollNumber: rollNumber.trim(),
      selectedLessonIds: lessonIds,
      currentLessonId: lessonIds[0] || 1,
      lessonProgress: initialProgress,
      durationSec,
      remainingSec: durationSec,
      startTime: now,
      submittedAt: null,
      proctorMode,
      fullscreenEnforced,
      violations: [],
      strikesUsed: 0,
      maxStrikesAllowed: proctorMode === 'strict' ? 0 : 1,
      submissionReason: null,
      activeLessonStartTime: now,
      submissionSaved: false,
      submissionError: null,
    };

    this.saveSession();
  }

  setCurrentLesson(lessonId) {
    if (this.session.status !== 'in_progress') return;

    if (this.session.activeLessonStartTime && this.session.currentLessonId) {
      const elapsed = Math.floor((Date.now() - this.session.activeLessonStartTime) / 1000);
      const prevProgress = this.session.lessonProgress[this.session.currentLessonId];
      if (prevProgress) prevProgress.timeSpent = (prevProgress.timeSpent || 0) + elapsed;
    }

    this.session.currentLessonId = lessonId;
    this.session.activeLessonStartTime = Date.now();
    this.saveSession();
  }

  toggleLessonCompleted(lessonId, isCompleted = null) {
    if (this.session.status !== 'in_progress') return;
    const progress = this.session.lessonProgress[lessonId];
    if (!progress) return;

    const nextState = isCompleted !== null ? isCompleted : !progress.completed;
    progress.completed = nextState;
    progress.completedAt = nextState ? Date.now() : null;
    this.saveSession();
  }

  saveLessonSqlCode(lessonId, sqlCode) {
    if (this.session.status !== 'in_progress') return;
    const progress = this.session.lessonProgress[lessonId];
    if (progress) {
      progress.sqlCode = sqlCode;
      this.saveSession();
    }
  }

  updateRemainingTime(remainingSec) {
    this.session.remainingSec = remainingSec;
  }

  recordViolation(type, label) {
    if (this.session.status !== 'in_progress') return { willSubmit: false, strikes: 0 };

    const timeElapsedSec = this.session.startTime
      ? Math.floor((Date.now() - this.session.startTime) / 1000)
      : 0;

    const violation = {
      id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      label,
      timestamp: new Date().toLocaleTimeString(),
      timeElapsedSec,
    };

    this.session.violations.push(violation);
    this.session.strikesUsed = (this.session.strikesUsed || 0) + 1;

    let willSubmit = false;

    if (this.session.proctorMode === 'strict') {
      willSubmit = true;
      this.submitTest('tab_switch_autosubmit');
    } else if (this.session.strikesUsed > this.session.maxStrikesAllowed) {
      willSubmit = true;
      this.submitTest('strike_limit');
    } else {
      this.saveSession();
    }

    return {
      willSubmit,
      strikesUsed: this.session.strikesUsed,
      maxStrikes: this.session.maxStrikesAllowed,
      violation,
    };
  }

  buildLessonResults() {
    return this.session.selectedLessonIds.map((id) => {
      const lesson = LESSONS.find((l) => l.id === id);
      const progress = this.session.lessonProgress[id] || {};
      return {
        lessonId: id,
        title: lesson?.title ?? `Lesson ${id}`,
        category: lesson?.category?.label ?? '',
        completed: Boolean(progress.completed),
        timeSpentSec: progress.timeSpent || 0,
        sqlQuery: progress.sqlCode || null,
      };
    });
  }

  async submitTest(reason = 'manual') {
    if (this.session.status === 'submitted') return;

    if (this.session.activeLessonStartTime && this.session.currentLessonId) {
      const elapsed = Math.floor((Date.now() - this.session.activeLessonStartTime) / 1000);
      const currProgress = this.session.lessonProgress[this.session.currentLessonId];
      if (currProgress) currProgress.timeSpent = (currProgress.timeSpent || 0) + elapsed;
    }

    this.session.status = 'submitted';
    this.session.submittedAt = Date.now();
    this.session.submissionReason = reason;

    let completedCount = 0;
    let earnedPoints = 0;
    let totalPossiblePoints = 0;

    this.session.selectedLessonIds.forEach((id) => {
      const lesson = LESSONS.find((l) => l.id === id);
      const p = this.session.lessonProgress[id];
      const pts = lesson ? lesson.points : 10;
      totalPossiblePoints += pts;
      if (p?.completed) {
        completedCount++;
        earnedPoints += pts;
      }
    });

    const percentage = totalPossiblePoints > 0
      ? Math.round((earnedPoints / totalPossiblePoints) * 100)
      : 0;

    this.session.analytics = {
      completedCount,
      totalCount: this.session.selectedLessonIds.length,
      earnedPoints,
      totalPossiblePoints,
      percentage,
      totalTimeTakenSec: this.session.startTime
        ? Math.floor((this.session.submittedAt - this.session.startTime) / 1000)
        : 0,
      totalViolations: this.session.violations.length,
      grade: this.calculateGrade(percentage, this.session.violations.length),
    };

    this.saveSession();

    try {
      await postStudentSubmission({
        examId: this.session.examId,
        submissionReason: reason,
        analytics: this.session.analytics,
        violations: this.session.violations,
        lessonResults: this.buildLessonResults(),
      });
      this.session.submissionSaved = true;
      this.session.submissionError = null;
    } catch (err) {
      console.error('Failed to persist submission:', err);
      this.session.submissionSaved = false;
      this.session.submissionError = err.message || 'Failed to save submission';
    }

    this.saveSession();
  }

  calculateGrade(percentage, violationsCount) {
    const penalty = violationsCount * 5;
    const adjusted = Math.max(0, percentage - penalty);

    if (adjusted >= 95) return { label: 'A+ Exceptional', badge: 'Exemplary' };
    if (adjusted >= 85) return { label: 'A Excellent', badge: 'Honors' };
    if (adjusted >= 75) return { label: 'B Proficient', badge: 'Passed' };
    if (adjusted >= 60) return { label: 'C Competent', badge: 'Passed' };
    if (adjusted >= 40) return { label: 'D Needs Practice', badge: 'Conditional' };
    return { label: 'F Incomplete', badge: 'Did Not Pass' };
  }

  resetSession() {
    this.session = this.getDefaultSession();
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    this.notify();
  }

  belongsToExam(examId) {
    return this.session.examId === examId;
  }
}

export const state = new StateService();
