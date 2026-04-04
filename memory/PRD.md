# School LMS Portal - PRD

## Original Problem Statement
Build a web-based school LMS portal with 3 roles: Teacher (admin), Student, Parent. Single login page for all users. Teacher creates credentials for students and parents. No self-signup.

## User Personas
1. **Teacher (Admin)** - Creates and manages students/parents, curriculum (subjects, chapters, topics), reviews submissions, manages attendance, fees, and remarks
2. **Student** - Views subjects, chapters (with lock/unlock progression), submits answer sheets, tracks progress
3. **Parent** - Views child's progress, attendance, fees, and teacher remarks

## Core Requirements (Static)
- Single login page with role-based redirect
- JWT-based authentication with httpOnly cookies
- Sequential chapter unlocking (next chapter unlocks after teacher approval)
- Manual evaluation workflow (no MCQ/auto-quiz)
- File uploads for materials, question sheets, and submissions (max 5MB)
- Object Storage integration for files

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB, Motor (async driver)
- **Storage**: Emergent Object Storage
- **Auth**: JWT with bcrypt password hashing

## What's Been Implemented (2026-04-04)
### Phase 1 - MVP Complete
- [x] Single login page with role-based redirect
- [x] Teacher dashboard with 4 tabs (Students & Parents, Curriculum, Submissions, Management)
- [x] Student/Parent account creation by teacher
- [x] Subject > Chapter > Topic hierarchy
- [x] File upload for materials and question sheets
- [x] Student answer sheet submission
- [x] Submission review (approve/reject with remarks)
- [x] Chapter progression logic (first chapter unlocked, rest locked until approval)
- [x] Student dashboard with progress tracking
- [x] Parent dashboard with child's progress, attendance, fees, remarks
- [x] Attendance management
- [x] Fees tracking
- [x] Remarks system

## Collections/Models
- `users` - id, email, password_hash, name, role (teacher/student/parent), student_id (for parent)
- `subjects` - id, name, description
- `chapters` - id, subject_id, name, description, order
- `topics` - id, chapter_id, name, content, video_link, questions, material_path, question_sheet_path
- `submissions` - id, student_id, topic_id, chapter_id, file_path, status, remarks
- `attendance` - id, student_id, date, present
- `fees` - id, student_id, amount, description, due_date, paid
- `remarks` - id, student_id, content, teacher_name

## API Endpoints
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Users: `/api/users` (CRUD)
- Curriculum: `/api/subjects`, `/api/chapters`, `/api/topics`
- Files: `/api/upload/material/{topic_id}`, `/api/upload/question-sheet/{topic_id}`, `/api/files/{path}`
- Submissions: `/api/submissions/{topic_id}` (POST), `/api/submissions/{submission_id}` (PUT)
- Management: `/api/attendance`, `/api/fees`, `/api/remarks`
- Progress: `/api/progress`

## P0/P1/P2 Features Remaining

### P0 (Critical) - None remaining for MVP

### P1 (High Priority)
- [ ] Password reset functionality
- [ ] Edit user details (update student/parent info)
- [ ] Edit subject/chapter/topic details
- [ ] Bulk attendance marking

### P2 (Nice to Have)
- [ ] Email notifications for submission reviews
- [ ] Dashboard analytics and reports
- [ ] Export attendance/fees reports
- [ ] Student-to-student progress comparison (leaderboard)
- [ ] Mobile-responsive improvements

## Next Action Items
1. Test student login and submission flow end-to-end
2. Test parent login and view child's progress
3. Add password reset functionality
4. Consider adding bulk operations for attendance
