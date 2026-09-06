/**
 * Mount Vercel-style API handlers on the local Express server.
 */

import express from 'express';
import examsListHandler from '../api/exams/index.js';
import examIdHandler from '../api/exams/[id].js';
import submissionsHandler from '../api/submissions.js';
import adminSubmissionsHandler from '../api/admin/submissions.js';
import adminAnalyticsHandler from '../api/admin/analytics.js';

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
  api.post('/submissions', adapt(submissionsHandler));
  api.get('/admin/submissions', adapt(adminSubmissionsHandler));
  api.get('/admin/analytics', adapt(adminAnalyticsHandler));

  app.use('/api', api);
}
