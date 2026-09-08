/**
 * Mount Vercel-style API handlers on the local Express server.
 */

import express from 'express';
import examsListHandler from '../api/exams/index.js';
import examIdHandler from '../api/exams/[id].js';
import submissionsHandler from '../api/submissions.js';
import adminSubmissionsHandler from '../api/admin/submissions.js';
import adminAnalyticsHandler from '../api/admin/analytics.js';
import adminStudentsHandler from '../api/admin/students.js';
import adminStudentIdHandler from '../api/admin/students/[id].js';
import adminEnrollmentsHandler from '../api/admin/exams/[examId]/enrollments.js';
import studentLoginHandler from '../api/student/login.js';
import studentExamsHandler from '../api/student/exams/index.js';
import studentExamIdHandler from '../api/student/exams/[id].js';

function adapt(handler) {
  return (req, res) => handler(req, res);
}

export function mountApiRoutes(app) {
  const api = express.Router();
  api.use(express.json({ limit: '1mb' }));

  api.get('/exams', adapt(examsListHandler));
  api.get('/exams/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    return examIdHandler(req, res);
  });

  api.post('/student/login', adapt(studentLoginHandler));
  api.get('/student/exams', adapt(studentExamsHandler));
  api.get('/student/exams/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    return studentExamIdHandler(req, res);
  });

  api.post('/submissions', adapt(submissionsHandler));

  api.get('/admin/submissions', adapt(adminSubmissionsHandler));
  api.get('/admin/analytics', adapt(adminAnalyticsHandler));

  api.get('/admin/students', adapt(adminStudentsHandler));
  api.post('/admin/students', adapt(adminStudentsHandler));
  api.patch('/admin/students/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    return adminStudentIdHandler(req, res);
  });
  api.delete('/admin/students/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    return adminStudentIdHandler(req, res);
  });

  api.get('/admin/exams/:examId/enrollments', (req, res) => {
    req.query = { ...req.query, examId: req.params.examId };
    return adminEnrollmentsHandler(req, res);
  });
  api.put('/admin/exams/:examId/enrollments', (req, res) => {
    req.query = { ...req.query, examId: req.params.examId };
    return adminEnrollmentsHandler(req, res);
  });

  app.use('/api', api);
}
