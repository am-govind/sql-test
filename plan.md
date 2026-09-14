## Plan: Proctoring snapshots and admin review

### 1. Define the violation model

Standardize supported event types:

```text
multiple_faces
no_face_detected
phone_detected
tablet_detected
camera_blocked
rapid_movement
audio_anomaly
```

Each event should include:

```text
organization_id
exam_id
student_id
submission_id
violation_type
confidence
detected_at
snapshot_path
review_status
reviewed_by
reviewed_at
review_notes
```

Initial review statuses:

```text
pending
cheating
not_cheating
needs_review
```

### 2. Add the database table

Create a migration such as:

```text
009_proctoring_events.sql
```

Add:

- `proctoring_events`
- foreign keys to organizations, exams, students, and optionally submissions
- review status constraint
- confidence range constraint from `0` to `1`
- indexes by organization, exam, student, and submission
- organization consistency constraints so related records cannot cross tenants

Recommended indexes:

```sql
create index on proctoring_events (organization_id, exam_id);
create index on proctoring_events (organization_id, student_id);
create index on proctoring_events (submission_id);
create index on proctoring_events (review_status);
```

### 3. Configure private storage

Create a private Supabase Storage bucket:

```text
proctoring-snapshots
```

Do not make it public.

Store only a path such as:

```text
organization-id/exam-id/student-id/event-id.jpg
```

Use signed URLs for admin viewing.

Add a retention policy, for example:

- Delete snapshots after 90 days
- Keep review metadata longer if required
- Never expose snapshot paths directly to students

### 4. Build the browser monitoring module

Create a dedicated module rather than placing all logic in the student login page:

```text
src/services/proctoring/
  ProctoringMonitor.js
  faceDetection.js
  objectDetection.js
  motionDetection.js
  audioDetection.js
```

Responsibilities:

- Capture webcam frames
- Detect faces
- Detect objects
- Detect camera obstruction
- Detect movement
- Capture a still image when a violation persists
- Apply cooldowns to prevent duplicate events
- Send event metadata and snapshot to the backend

Example thresholds:

```text
multiple faces: more than 1 face for 3 consecutive checks
no face: no face for 5 consecutive checks
phone/tablet: detected in 3 consecutive checks
camera blocked: dark/blurred frame for several seconds
rapid movement: threshold exceeded for several consecutive frames
```

Do not flag on one frame alone. This reduces false positives.

### 5. Add proctoring configuration per exam

Extend the exam configuration:

```js
proctorConfig: {
  webcam: true,
  mic: true,
  screenshare: false,
  blockCopyPaste: true,
  blockDevtools: true,
  multipleFaceDetection: true,
  objectDetection: true,
  motionTracking: true,
  audioMonitoring: true,
  captureViolationSnapshots: true
}
```

Add controls to the exam editor:

- Enable multiple-face detection
- Enable object detection
- Enable movement detection
- Enable audio monitoring
- Capture evidence snapshots
- Optional sensitivity setting

### 6. Add student consent and notice

Before starting an exam, show a clear consent screen explaining:

- Camera and microphone usage
- What events may be detected
- That snapshots may be captured
- Why snapshots are stored
- How long they are retained
- That detections are reviewed by admins
- That detection alone does not automatically prove cheating

Require explicit consent before starting proctoring.

### 7. Add backend event endpoint

Create:

```text
POST /api/student/proctoring-events
```

The backend must derive or verify:

- authenticated student
- exam
- enrollment
- organization
- active exam access

The client must not be trusted to submit arbitrary:

```text
organization_id
student_id
exam_id
```

The backend should derive these from the student session and enrollment.

Use multipart upload or a two-step flow:

1. Create event and receive an upload target.
2. Upload snapshot to private storage.
3. Update event with the storage path.

A signed upload URL is preferable so large image data does not pass through the serverless function.

### 8. Add tenant consistency checks

At the database level, ensure:

- Event organization matches the exam organization
- Event organization matches the student organization
- Submission organization matches the event organization
- The student is enrolled in the exam
- Reviewed admin belongs to the event organization

Use composite foreign keys or a trigger-based consistency function, matching the existing tenant-consistency migration pattern.

### 9. Store violation summaries with submissions

At submission time, preserve a summary:

```js
violations: [
  {
    type: 'multiple_faces',
    count: 2,
    firstDetectedAt: '...',
    lastDetectedAt: '...'
  }
]
```

Keep detailed evidence in `proctoring_events`.

This avoids placing large images or excessive event history inside the submission JSON.

### 10. Build the admin review API

Add organization-scoped endpoints:

```text
GET /api/admin/proctoring-events
GET /api/admin/proctoring-events/:id
PATCH /api/admin/proctoring-events/:id/review
```

Requirements:

- Every query filters by the active organization
- Cross-organization IDs return `404` or `403`
- Snapshot URLs are short-lived signed URLs
- Only authorized admins can review
- Review actions record reviewer and timestamp

### 11. Build the admin review UI

Add a review area from the submissions page.

For each student submission, show:

- Violation count
- Pending review count
- Violation type
- Timestamp
- Confidence
- Evidence thumbnail
- Open image button
- Review status

Actions:

```text
Mark cheating
Mark not cheating
Needs review
Add notes
```

Use a modal or side panel to show the full snapshot and event details.

### 12. Add audit history

Create an audit record whenever an admin changes a review decision:

```text
event_id
organization_id
reviewer_id
old_status
new_status
notes
created_at
```

This prevents silent changes and supports later investigation.

### 13. Add cleanup jobs

Create a scheduled cleanup process to:

- Find expired snapshots
- Delete storage objects
- Clear `snapshot_path`
- Preserve review metadata if required

Do not rely only on frontend cleanup.

### 14. Add tests

Test browser detection logic:

- One face does not trigger multiple-face violation
- Two faces trigger after the persistence threshold
- A single false frame does not trigger
- Duplicate events respect cooldown
- Snapshot capture failure does not crash the exam

Test API isolation:

- Student cannot create an event for another student
- Student cannot submit an event for another organization
- Admin A cannot view Admin B’s events
- Admin A cannot update Admin B’s review
- Foreign event IDs return `404` or `403`

Test database constraints:

- Cross-organization event insert fails
- Invalid review status fails
- Invalid confidence fails
- Event without valid exam/student fails

### 15. Rollout order

Implement in this order:

1. Database migration
2. Private storage bucket
3. Backend event creation and signed uploads
4. Tenant authorization checks
5. Browser monitor with face detection
6. Snapshot capture
7. Admin review API
8. Admin review UI
9. Object detection
10. Motion and audio refinements
11. Retention cleanup
12. Cross-organization and end-to-end testing

Start with multiple-face detection and snapshot review first. Add phone/tablet and other object detection only after the evidence workflow is working, because those detectors need more careful threshold and false-positive testing.