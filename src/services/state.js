/**
 * Central state store for SQLProctor test lifecycle, student progress,
 * violation tracking, and persistence.
 */

import { LESSONS, TEST_PRESETS } from '../data/lessons.js';

const STORAGE_KEY_ACTIVE = 'sqlproctor_active_session_v1';
const STORAGE_KEY_HISTORY = 'sqlproctor_history_v1';
const RECIPIENT_EMAIL = 'govindmishra.six@gmail.com';

async function sendExamResultsEmail(sessionData) {
  try {
    const { studentName, studentId, analytics, submissionReason, violations, selectedLessonIds, lessonProgress } = sessionData;
    const timestamp = new Date(sessionData.submittedAt || Date.now()).toLocaleString();

    let messageBody = `🎓 SQLPROCTOR EXAM SUBMISSION REPORT 🎓\n\n`;
    messageBody += `Student Name: ${studentName}\n`;
    messageBody += `Student ID: ${studentId}\n`;
    messageBody += `Score: ${analytics.earnedPoints} / ${analytics.totalPossiblePoints} pts (${analytics.percentage}%)\n`;
    messageBody += `Grade: ${analytics.grade.label}\n`;
    messageBody += `Submission Method: ${submissionReason}\n`;
    messageBody += `Total Time Taken: ${Math.floor(analytics.totalTimeTakenSec / 60)}m ${analytics.totalTimeTakenSec % 60}s\n`;
    messageBody += `Proctor Violations / Tab Switches: ${analytics.totalViolations}\n`;
    messageBody += `Completed At: ${timestamp}\n\n`;

    if (violations && violations.length > 0) {
      messageBody += `═══════════════════════════════════════\n`;
      messageBody += `PROCTORING INFRACTIONS DETECTED:\n`;
      messageBody += `═══════════════════════════════════════\n`;
      violations.forEach((v, idx) => {
        messageBody += `${idx + 1}. [${v.timestamp}] ${v.label} (Elapsed: ${Math.floor(v.timeElapsedSec / 60)}m ${v.timeElapsedSec % 60}s)\n`;
      });
      messageBody += `\n`;
    }

    messageBody += `═══════════════════════════════════════\n`;
    messageBody += `LESSON PROGRESS & SUBMITTED SQL:\n`;
    messageBody += `═══════════════════════════════════════\n\n`;

    selectedLessonIds.forEach((id) => {
      const lesson = LESSONS.find(l => l.id === id);
      const title = lesson ? lesson.title : `Lesson ${id}`;
      const p = lessonProgress ? lessonProgress[id] : null;
      messageBody += `Lesson #${id} - ${title}: ${p && p.completed ? '✅ PASSED' : '❌ UNFINISHED'}\n`;
      if (p && p.sqlCode) {
        messageBody += `Submitted SQL Query:\n${p.sqlCode}\n`;
      }
      messageBody += `---------------------------------------\n`;
    });

    const subject = `🎓 SQLProctor Result: ${studentName} scored ${analytics.percentage}% (${analytics.grade.label})`;

    await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: subject,
        _captcha: "false",
        student_name: studentName,
        student_id: studentId,
        score: `${analytics.earnedPoints}/${analytics.totalPossiblePoints} (${analytics.percentage}%)`,
        grade: analytics.grade.label,
        submission_reason: submissionReason,
        time_taken: `${Math.floor(analytics.totalTimeTakenSec / 60)}m ${analytics.totalTimeTakenSec % 60}s`,
        violations_count: analytics.totalViolations,
        completed_at: timestamp,
        full_report: messageBody
      })
    });
  } catch (err) {
    console.warn('Background exam email delivery notice:', err);
  }
}

class StateService {
  constructor() {
    this.session = this.loadSession();
    this.listeners = new Set();
  }

  getDefaultSession() {
    return {
      status: 'not_started', // 'not_started' | 'in_progress' | 'submitted'
      studentName: '',
      studentId: '',
      presetId: 'full',
      selectedLessonIds: LESSONS.map(l => l.id),
      currentLessonId: 1,
      lessonProgress: {}, // [lessonId]: { completed: boolean, completedAt: null, timeSpent: 0, sqlCode: '' }
      durationSec: 45 * 60,
      remainingSec: 45 * 60,
      startTime: null,
      submittedAt: null,
      proctorMode: 'strict', // 'strict' (instant submit) | 'strike_1' (1 warning allowed)
      fullscreenEnforced: false,
      violations: [], // [{ type, label, timestamp, timeElapsedSec }]
      strikesUsed: 0,
      maxStrikesAllowed: 0, // 0 for strict, 1 for strike_1
      submissionReason: null, // 'manual' | 'tab_switch_autosubmit' | 'time_expired' | 'strike_limit'
      activeLessonStartTime: null,
    };
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load active session from localStorage:', e);
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
    studentName,
    studentId = '',
    presetId = 'full',
    selectedLessonIds = null,
    durationSec = 45 * 60,
    proctorMode = 'strict',
    fullscreenEnforced = false
  }) {
    const lessonIds = selectedLessonIds && selectedLessonIds.length > 0 
      ? selectedLessonIds 
      : LESSONS.map(l => l.id);

    const initialProgress = {};
    lessonIds.forEach(id => {
      initialProgress[id] = {
        completed: false,
        completedAt: null,
        timeSpent: 0,
        sqlCode: ''
      };
    });

    const now = Date.now();

    this.session = {
      status: 'in_progress',
      studentName: studentName.trim() || 'Anonymous Student',
      studentId: studentId.trim() || `STU-${Math.floor(100000 + Math.random() * 900000)}`,
      presetId,
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
    };

    this.saveSession();
  }

  setCurrentLesson(lessonId) {
    if (this.session.status !== 'in_progress') return;
    
    // Accumulate time on previous lesson
    if (this.session.activeLessonStartTime && this.session.currentLessonId) {
      const elapsed = Math.floor((Date.now() - this.session.activeLessonStartTime) / 1000);
      const prevProgress = this.session.lessonProgress[this.session.currentLessonId];
      if (prevProgress) {
        prevProgress.timeSpent = (prevProgress.timeSpent || 0) + elapsed;
      }
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
    // Don't trigger full localStorage write every second to reduce IO, write periodically or on critical steps
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
      timeElapsedSec
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
      violation
    };
  }

  submitTest(reason = 'manual') {
    if (this.session.status === 'submitted') return;

    // Accumulate final time spent on current lesson
    if (this.session.activeLessonStartTime && this.session.currentLessonId) {
      const elapsed = Math.floor((Date.now() - this.session.activeLessonStartTime) / 1000);
      const currProgress = this.session.lessonProgress[this.session.currentLessonId];
      if (currProgress) {
        currProgress.timeSpent = (currProgress.timeSpent || 0) + elapsed;
      }
    }

    this.session.status = 'submitted';
    this.session.submittedAt = Date.now();
    this.session.submissionReason = reason;

    // Calculate score
    const totalSelected = this.session.selectedLessonIds.length;
    let completedCount = 0;
    let earnedPoints = 0;
    let totalPossiblePoints = 0;

    this.session.selectedLessonIds.forEach(id => {
      const lesson = LESSONS.find(l => l.id === id);
      const p = this.session.lessonProgress[id];
      const pts = lesson ? lesson.points : 10;
      totalPossiblePoints += pts;

      if (p && p.completed) {
        completedCount++;
        earnedPoints += pts;
      }
    });

    const percentage = totalPossiblePoints > 0 
      ? Math.round((earnedPoints / totalPossiblePoints) * 100) 
      : 0;

    this.session.analytics = {
      completedCount,
      totalCount: totalSelected,
      earnedPoints,
      totalPossiblePoints,
      percentage,
      totalTimeTakenSec: this.session.startTime ? Math.floor((this.session.submittedAt - this.session.startTime) / 1000) : 0,
      totalViolations: this.session.violations.length,
      grade: this.calculateGrade(percentage, this.session.violations.length)
    };

    // Save to test history
    this.archiveToHistory(this.session);

    // Automatically send full exam submission report to email in background (matching fun_project)
    sendExamResultsEmail(this.session);

    this.saveSession();
  }

  calculateGrade(percentage, violationsCount) {
    let penalty = violationsCount * 5; // -5% per recorded infraction
    const adjusted = Math.max(0, percentage - penalty);

    if (adjusted >= 95) return { label: 'A+ Exceptional', color: 'emerald', badge: 'Exemplary' };
    if (adjusted >= 85) return { label: 'A Excellent', color: 'green', badge: 'Honors' };
    if (adjusted >= 75) return { label: 'B Proficient', color: 'indigo', badge: 'Passed' };
    if (adjusted >= 60) return { label: 'C Competent', color: 'amber', badge: 'Passed' };
    if (adjusted >= 40) return { label: 'D Needs Practice', color: 'orange', badge: 'Conditional' };
    return { label: 'F Incomplete', color: 'rose', badge: 'Did Not Pass' };
  }

  archiveToHistory(sessionData) {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
      history.unshift({
        id: `exam_${sessionData.startTime}`,
        studentName: sessionData.studentName,
        submittedAt: sessionData.submittedAt,
        percentage: sessionData.analytics.percentage,
        completedCount: sessionData.analytics.completedCount,
        totalCount: sessionData.analytics.totalCount,
        reason: sessionData.submissionReason,
        violations: sessionData.violations.length
      });
      // Keep last 25 tests
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 25)));
    } catch (e) {
      console.warn('Could not archive test session to history:', e);
    }
  }

  resetSession() {
    this.session = this.getDefaultSession();
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    this.notify();
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
    } catch (e) {
      return [];
    }
  }
}

export const state = new StateService();
