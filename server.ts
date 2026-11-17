import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { db, generateCode } from './server/db.ts';
import { generateQuestionsForLevel } from './server/questionGenerator.ts';
import { LEVELS } from './src/shared/levels.ts';
import type { StudentAnswerPayload } from './src/shared/levels.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Persistent HMAC secret for session cookies
const secretFile = path.resolve(process.cwd(), 'data', '.session_secret');
let SESSION_SECRET = process.env.SESSION_SECRET || '';
if (!SESSION_SECRET) {
  if (fs.existsSync(secretFile)) {
    SESSION_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
  } else {
    SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, SESSION_SECRET, 'utf8');
  }
}

interface SessionPayload {
  role: 'teacher' | 'student';
  id: string;
  classId?: string;
  exp: number;
}

function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  return req.secure || forwardedProto.includes('https') || origin.startsWith('https://') || isProduction;
}

function setAuthCookie(req: Request, res: Response, name: string, payload: SessionPayload): string {
  const token = signToken(payload);
  const https = isHttpsRequest(req);
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return token;
}

function clearAuthCookie(req: Request, res: Response, name: string) {
  const https = isHttpsRequest(req);
  res.clearCookie(name, {
    path: '/',
    sameSite: https ? 'none' : 'lax',
    secure: https,
  });
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

interface AuthedRequest extends Request {
  teacherId?: string;
  studentId?: string;
  studentClassId?: string;
  teacherToken?: string;
  studentToken?: string;
}

function requireTeacher(req: AuthedRequest, res: Response, next: NextFunction) {
  const headerRaw = typeof req.headers['x-teacher-token'] === 'string' ? req.headers['x-teacher-token'] : undefined;
  const bearerRaw = extractBearerToken(req);
  const cookieRaw = req.cookies?.ia_teacher;

  const candidates = [headerRaw, cookieRaw, bearerRaw].filter((v): v is string => Boolean(v));
  let matched: { payload: SessionPayload; raw: string } | null = null;
  for (const raw of candidates) {
    const parsed = verifyToken(raw);
    if (parsed && parsed.role === 'teacher') {
      matched = { payload: parsed, raw };
      break;
    }
  }

  if (!matched) {
    res.status(401).json({ error: 'Sesi guru tidak valid. Silakan masuk kembali.' });
    return;
  }
  const exists = db.prepare('SELECT id FROM teachers WHERE id = ?').get(matched.payload.id) as { id: string } | undefined;
  if (!exists) {
    res.status(401).json({ error: 'Akun guru tidak ditemukan.' });
    return;
  }
  req.teacherId = matched.payload.id;
  req.teacherToken = matched.raw;
  next();
}

function requireStudent(req: AuthedRequest, res: Response, next: NextFunction) {
  const headerRaw = typeof req.headers['x-student-token'] === 'string' ? req.headers['x-student-token'] : undefined;
  const bearerRaw = extractBearerToken(req);
  const cookieRaw = req.cookies?.ia_student;

  const candidates = [headerRaw, cookieRaw, bearerRaw].filter((v): v is string => Boolean(v));
  let matched: { payload: SessionPayload; raw: string } | null = null;
  for (const raw of candidates) {
    const parsed = verifyToken(raw);
    if (parsed && parsed.role === 'student') {
      matched = { payload: parsed, raw };
      break;
    }
  }

  if (!matched) {
    res.status(401).json({ error: 'Sesi siswa tidak valid. Silakan masuk dengan kode kelas dan kode siswa.' });
    return;
  }
  const exists = db.prepare('SELECT id, class_id FROM students WHERE id = ?').get(matched.payload.id) as
    | { id: string; class_id: string }
    | undefined;
  if (!exists) {
    res.status(401).json({ error: 'Data siswa tidak ditemukan.' });
    return;
  }
  req.studentId = exists.id;
  req.studentClassId = exists.class_id;
  req.studentToken = matched.raw;
  next();
}

// WebSocket room subscriber registry
const roomSubscribers = new Map<string, Set<WebSocket>>();

function getCompetitionRoomSnapshot(roomId: string) {
  const room = db
    .prepare(
      `SELECT cr.*, gs.title, gs.topic, c.name as class_name
       FROM competition_rooms cr
       JOIN game_sessions gs ON gs.id = cr.session_id
       JOIN classes c ON c.id = cr.class_id
       WHERE cr.id = ?`
    )
    .get(roomId) as Record<string, unknown> | undefined;

  if (!room) return null;

  const participants = db
    .prepare(
      `SELECT * FROM competition_participants
       WHERE room_id = ?
       ORDER BY
         CASE WHEN status = 'finished' THEN 0 ELSE 1 END ASC,
         score DESC,
         correct_count DESC,
         duration_seconds ASC,
         joined_at ASC`
    )
    .all(roomId) as Record<string, unknown>[];

  return {
    id: room.id,
    sessionId: room.session_id,
    teacherId: room.teacher_id,
    classId: room.class_id,
    className: room.class_name,
    roomCode: room.room_code,
    title: room.title,
    levelId: room.level_id,
    topic: room.topic,
    questionCount: room.question_count,
    durationMinutes: room.duration_minutes,
    allowRetry: Boolean(room.allow_retry),
    status: room.status,
    startedAt: room.started_at,
    endedAt: room.ended_at,
    createdAt: room.created_at,
    participants: participants.map((p) => ({
      id: p.id,
      roomId: p.room_id,
      studentId: p.student_id,
      studentName: p.student_name,
      avatarId: p.avatar_id,
      status: p.status,
      score: p.score,
      correctCount: p.correct_count,
      wrongCount: p.wrong_count,
      durationSeconds: p.duration_seconds,
      attemptCount: p.attempt_count,
      joinedAt: p.joined_at,
      finishedAt: p.finished_at,
    })),
  };
}

function broadcastRoomState(roomId: string) {
  const subs = roomSubscribers.get(roomId);
  if (!subs || subs.size === 0) return;
  const snapshot = getCompetitionRoomSnapshot(roomId);
  if (!snapshot) return;
  const msg = JSON.stringify({ type: 'room_state', room: snapshot });
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ========================
// TEACHER AUTHENTICATION
// ========================
app.post('/api/auth/teacher/register', (req, res) => {
  const { name, email, schoolName, password } = req.body as {
    name?: string;
    email?: string;
    schoolName?: string;
    password?: string;
  };
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Nama, email valid, dan kata sandi minimal 6 karakter wajib diisi.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM teachers WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk dengan akun Anda.' });
    return;
  }
  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO teachers (id, name, email, school_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), normalizedEmail, (schoolName || '').trim(), passwordHash, createdAt);

  const token = setAuthCookie(req, res, 'ia_teacher', {
    role: 'teacher',
    id,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    token,
    teacher: { id, name: name.trim(), email: normalizedEmail, schoolName: (schoolName || '').trim() },
  });
});

app.post('/api/auth/teacher/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const teacher = db
    .prepare('SELECT id, name, email, school_name, password_hash FROM teachers WHERE email = ?')
    .get(normalizedEmail) as
    | { id: string; name: string; email: string; school_name: string; password_hash: string }
    | undefined;

  if (!teacher || !bcrypt.compareSync(password, teacher.password_hash)) {
    res.status(401).json({ error: 'Email atau kata sandi salah.' });
    return;
  }

  const token = setAuthCookie(req, res, 'ia_teacher', {
    role: 'teacher',
    id: teacher.id,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      schoolName: teacher.school_name,
    },
  });
});

app.post('/api/auth/teacher/google', (req, res) => {
  const { uid, email, name, schoolName } = req.body as {
    uid?: string;
    email?: string;
    name?: string;
    schoolName?: string;
  };
  if (!uid?.trim() || !email?.trim()) {
    res.status(400).json({ error: 'Data akun Google tidak lengkap.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const byEmail = db
    .prepare('SELECT id, name, email, school_name FROM teachers WHERE email = ?')
    .get(normalizedEmail) as { id: string; name: string; email: string; school_name: string } | undefined;

  let teacherId = uid.trim();
  let teacherName = (name || normalizedEmail.split('@')[0]).trim();
  let teacherSchool = (schoolName || '').trim();

  if (byEmail) {
    teacherId = byEmail.id;
    teacherName = byEmail.name || teacherName;
    teacherSchool = byEmail.school_name || teacherSchool;
  } else {
    const byId = db
      .prepare('SELECT id, name, email, school_name FROM teachers WHERE id = ?')
      .get(teacherId) as { id: string; name: string; email: string; school_name: string } | undefined;

    if (!byId) {
      const placeholderHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 6);
      db.prepare(
        'INSERT INTO teachers (id, name, email, school_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(teacherId, teacherName, normalizedEmail, teacherSchool, placeholderHash, new Date().toISOString());
    }
  }

  const token = setAuthCookie(req, res, 'ia_teacher', {
    role: 'teacher',
    id: teacherId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    teacher: {
      id: teacherId,
      name: teacherName,
      email: normalizedEmail,
      schoolName: teacherSchool,
    },
  });
});

app.post('/api/auth/teacher/logout', (req, res) => {
  clearAuthCookie(req, res, 'ia_teacher');
  res.json({ ok: true });
});

app.get('/api/auth/teacher/me', requireTeacher, (req: AuthedRequest, res) => {
  const teacher = db
    .prepare('SELECT id, name, email, school_name FROM teachers WHERE id = ?')
    .get(req.teacherId!) as { id: string; name: string; email: string; school_name: string } | undefined;
  if (!teacher) {
    res.status(401).json({ error: 'Tidak terautentikasi.' });
    return;
  }
  res.json({
    token: req.teacherToken,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      schoolName: teacher.school_name,
    },
  });
});

// ========================
// STUDENT AUTHENTICATION (CLASS-CODE ONLY FLOW)
// ========================
function findClassByCodeOrExplain(rawClassCode: string) {
  const normClassCode = rawClassCode.trim().toUpperCase().replace(/\s+/g, '');
  const cls = db
    .prepare(
      "SELECT id, teacher_id, name, class_code, passing_grade FROM classes WHERE REPLACE(UPPER(class_code), ' ', '') = ?"
    )
    .get(normClassCode) as
    | { id: string; teacher_id: string; name: string; class_code: string; passing_grade: number }
    | undefined;

  if (cls) {
    return { cls, normClassCode };
  }

  const classTotal = (db.prepare('SELECT COUNT(*) as cnt FROM classes').get() as { cnt: number }).cnt;
  if (classTotal === 0) {
    return {
      error:
        'Belum ada data kelas aktif di server ini. Minta gurumu masuk ke Portal Guru terlebih dahulu agar data kelas tersinkronisasi.',
    };
  }

  const byClassName = db
    .prepare("SELECT id, name, class_code FROM classes WHERE REPLACE(UPPER(name), ' ', '') = ?")
    .get(normClassCode) as { id: string; name: string; class_code: string } | undefined;

  if (byClassName) {
    return {
      error: `Kamu memasukkan nama kelas (${byClassName.name}). Masukkan Kode Kelas dari gurumu (contoh: ${byClassName.class_code}), bukan nama kelas.`,
    };
  }

  return {
    error: `Kode kelas "${normClassCode}" tidak ditemukan. Periksa kembali penulisan Kode Kelas dari gurumu.`,
  };
}

app.post('/api/auth/student/class-lookup', (req, res) => {
  const { classCode } = req.body as { classCode?: string };
  if (!classCode?.trim()) {
    res.status(400).json({ error: 'Kode kelas wajib diisi.' });
    return;
  }

  const lookup = findClassByCodeOrExplain(classCode);
  if (!lookup.cls) {
    res.status(404).json({ error: lookup.error });
    return;
  }

  const cls = lookup.cls;
  const students = db
    .prepare(
      `SELECT id, full_name, avatar_id, total_stars, unlocked_level
       FROM students
       WHERE class_id = ?
       ORDER BY LOWER(full_name) ASC`
    )
    .all(cls.id) as Array<{
    id: string;
    full_name: string;
    avatar_id: string;
    total_stars: number;
    unlocked_level: number;
  }>;

  res.json({
    classRoom: {
      id: cls.id,
      name: cls.name,
      classCode: cls.class_code,
      passingGrade: cls.passing_grade,
    },
    students: students.map((s) => ({
      id: s.id,
      fullName: s.full_name,
      avatarId: s.avatar_id,
      totalStars: s.total_stars,
      unlockedLevel: s.unlocked_level,
    })),
  });
});

app.post('/api/auth/student/login', (req, res) => {
  const { classCode, studentId, fullName, avatarId, studentCode } = req.body as {
    classCode?: string;
    studentId?: string;
    fullName?: string;
    avatarId?: string;
    studentCode?: string;
  };

  if (!classCode?.trim()) {
    res.status(400).json({ error: 'Kode kelas wajib diisi.' });
    return;
  }

  const lookup = findClassByCodeOrExplain(classCode);
  if (!lookup.cls) {
    res.status(401).json({ error: lookup.error });
    return;
  }

  const cls = lookup.cls;
  let row: Record<string, unknown> | undefined;

  if (studentId?.trim()) {
    row = db
      .prepare(
        `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
         FROM students s
         JOIN classes c ON c.id = s.class_id
         WHERE s.id = ? AND s.class_id = ?`
      )
      .get(studentId.trim(), cls.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Profil siswa tidak ditemukan di kelas ini.' });
      return;
    }
  } else if (fullName?.trim()) {
    const cleanName = fullName.trim().slice(0, 120);
    row = db
      .prepare(
        `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
         FROM students s
         JOIN classes c ON c.id = s.class_id
         WHERE s.class_id = ? AND LOWER(TRIM(s.full_name)) = LOWER(?)`
      )
      .get(cls.id, cleanName) as Record<string, unknown> | undefined;

    if (!row) {
      const id = crypto.randomUUID();
      const code = createUniqueStudentCode(cls.id);
      const avatar = avatarId && ['boy', 'girl', 'owl'].includes(avatarId) ? avatarId : 'boy';
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO students (id, class_id, teacher_id, full_name, student_code, avatar_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, cls.id, cls.teacher_id, cleanName, code, avatar, createdAt);

      row = db
        .prepare(
          `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
           FROM students s
           JOIN classes c ON c.id = s.class_id
           WHERE s.id = ?`
        )
        .get(id) as Record<string, unknown> | undefined;
    }
  } else if (studentCode?.trim()) {
    const normStudentCode = studentCode.trim().toUpperCase().replace(/\s+/g, '');
    row = db
      .prepare(
        `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
         FROM students s
         JOIN classes c ON c.id = s.class_id
         WHERE s.class_id = ? AND REPLACE(UPPER(s.student_code), ' ', '') = ?`
      )
      .get(cls.id, normStudentCode) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(401).json({
        error: `Data siswa tidak ditemukan di kelas ${cls.name}. Pilih namamu langsung setelah memasukkan Kode Kelas.`,
      });
      return;
    }
  } else {
    // Direct login if the class has no roster yet or caller didn't pass name: ask to select/enter name via lookup
    res.status(400).json({ error: 'Pilih namamu di daftar kelas atau masukkan nama lengkapmu.' });
    return;
  }

  if (!row) {
    res.status(401).json({ error: 'Gagal memuat data siswa.' });
    return;
  }

  const token = setAuthCookie(req, res, 'ia_student', {
    role: 'student',
    id: String(row.id),
    classId: String(row.class_id),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    student: {
      id: row.id,
      classId: row.class_id,
      className: row.class_name,
      classCode: row.class_code,
      teacherId: row.teacher_id,
      fullName: row.full_name,
      studentCode: row.student_code,
      avatarId: row.avatar_id,
      totalStars: row.total_stars,
      unlockedLevel: row.unlocked_level,
      passingGrade: row.passing_grade,
      createdAt: row.created_at,
    },
  });
});

app.post('/api/auth/student/logout', (req, res) => {
  clearAuthCookie(req, res, 'ia_student');
  res.json({ ok: true });
});

app.get('/api/auth/student/me', requireStudent, (req: AuthedRequest, res) => {
  const row = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`
    )
    .get(req.studentId!) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(401).json({ error: 'Data siswa tidak ditemukan.' });
    return;
  }

  res.json({
    token: req.studentToken,
    student: {
      id: row.id,
      classId: row.class_id,
      className: row.class_name,
      classCode: row.class_code,
      teacherId: row.teacher_id,
      fullName: row.full_name,
      studentCode: row.student_code,
      avatarId: row.avatar_id,
      totalStars: row.total_stars,
      unlockedLevel: row.unlocked_level,
      passingGrade: row.passing_grade,
      createdAt: row.created_at,
    },
  });
});

app.patch('/api/student/avatar', requireStudent, (req: AuthedRequest, res) => {
  const { avatarId } = req.body as { avatarId?: string };
  if (!avatarId || !['boy', 'girl', 'owl'].includes(avatarId)) {
    res.status(400).json({ error: 'Pilihan avatar tidak valid.' });
    return;
  }
  db.prepare('UPDATE students SET avatar_id = ? WHERE id = ?').run(avatarId, req.studentId!);
  res.json({ ok: true, avatarId });
});

// ========================
// TEACHER: CLASS MANAGEMENT
// ========================
app.get('/api/teacher/classes', requireTeacher, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
       FROM classes c
       WHERE c.teacher_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(req.teacherId!) as Record<string, unknown>[];

  res.json({
    classes: rows.map((r) => ({
      id: r.id,
      teacherId: r.teacher_id,
      name: r.name,
      classCode: r.class_code,
      passingGrade: r.passing_grade,
      studentCount: r.student_count,
      createdAt: r.created_at,
    })),
  });
});

app.post('/api/teacher/classes', requireTeacher, (req: AuthedRequest, res) => {
  const { name, passingGrade, classCode } = req.body as {
    name?: string;
    passingGrade?: number;
    classCode?: string;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Nama kelas wajib diisi.' });
    return;
  }

  const grade = Math.min(100, Math.max(0, Number(passingGrade ?? 75)));
  let code = (classCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!code) {
    const slug = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3) || 'KLS';
    code = generateCode(slug, 3);
  }

  const dup = db.prepare('SELECT id FROM classes WHERE UPPER(class_code) = ?').get(code);
  if (dup) {
    code = generateCode('KLS', 4);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO classes (id, teacher_id, name, class_code, passing_grade, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.teacherId!, name.trim(), code, grade, createdAt);

  res.status(201).json({
    classroom: {
      id,
      teacherId: req.teacherId!,
      name: name.trim(),
      classCode: code,
      passingGrade: grade,
      studentCount: 0,
      createdAt,
    },
  });
});

app.put('/api/teacher/classes/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { name, passingGrade } = req.body as { name?: string; passingGrade?: number };
  const existing = db
    .prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?')
    .get(id, req.teacherId!) as Record<string, unknown> | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }

  const nextName = name?.trim() || String(existing.name);
  const nextGrade =
    passingGrade !== undefined ? Math.min(100, Math.max(0, Number(passingGrade))) : Number(existing.passing_grade);

  db.prepare('UPDATE classes SET name = ?, passing_grade = ? WHERE id = ?').run(nextName, nextGrade, id);

  // Recalculate is_passed for evaluations in this class when passingGrade changes
  db.prepare('UPDATE evaluations SET is_passed = CASE WHEN score >= ? THEN 1 ELSE 0 END WHERE class_id = ?').run(
    nextGrade,
    id
  );

  res.json({ ok: true });
});

app.delete('/api/teacher/classes/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM classes WHERE id = ? AND teacher_id = ?').run(id, req.teacherId!);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }
  res.json({ ok: true });
});

// ========================
// TEACHER: STUDENT MANAGEMENT
// ========================
app.get('/api/teacher/students', requireTeacher, (req: AuthedRequest, res) => {
  const classId = typeof req.query.classId === 'string' ? req.query.classId : '';
  const sql = classId
    ? `SELECT s.*, c.name as class_name, c.class_code
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = ? AND s.class_id = ?
       ORDER BY s.full_name ASC`
    : `SELECT s.*, c.name as class_name, c.class_code
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = ?
       ORDER BY c.name ASC, s.full_name ASC`;

  const rows = (classId
    ? db.prepare(sql).all(req.teacherId!, classId)
    : db.prepare(sql).all(req.teacherId!)) as Record<string, unknown>[];

  const badgeRows = db
    .prepare('SELECT * FROM student_badges WHERE teacher_id = ? ORDER BY unlocked_at DESC')
    .all(req.teacherId!) as Record<string, unknown>[];

  const badgeMap = new Map<string, { id: string; studentId: string; badgeId: string; levelId: number | null; unlockedAt: string }[]>();
  for (const b of badgeRows) {
    const sid = String(b.student_id);
    if (!badgeMap.has(sid)) badgeMap.set(sid, []);
    badgeMap.get(sid)!.push({
      id: String(b.id),
      studentId: sid,
      badgeId: String(b.badge_id),
      levelId: b.level_id !== null ? Number(b.level_id) : null,
      unlockedAt: String(b.unlocked_at),
    });
  }

  res.json({
    students: rows.map((r) => ({
      id: r.id,
      classId: r.class_id,
      className: r.class_name,
      classCode: r.class_code,
      teacherId: r.teacher_id,
      fullName: r.full_name,
      studentCode: r.student_code,
      avatarId: r.avatar_id,
      totalStars: r.total_stars,
      unlockedLevel: r.unlocked_level,
      createdAt: r.created_at,
      badges: badgeMap.get(String(r.id)) || [],
    })),
  });
});

app.get('/api/teacher/badges', requireTeacher, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM student_badges WHERE teacher_id = ? ORDER BY unlocked_at DESC')
    .all(req.teacherId!) as Record<string, unknown>[];

  res.json({
    badges: rows.map((b) => ({
      id: String(b.id),
      studentId: String(b.student_id),
      teacherId: String(b.teacher_id),
      badgeId: String(b.badge_id),
      levelId: b.level_id !== null ? Number(b.level_id) : null,
      unlockedAt: String(b.unlocked_at),
    })),
  });
});

function createUniqueStudentCode(classId: string): string {
  for (let i = 0; i < 20; i++) {
    const code = generateCode('SIS', 4);
    const exists = db
      .prepare('SELECT id FROM students WHERE class_id = ? AND UPPER(student_code) = ?')
      .get(classId, code);
    if (!exists) return code;
  }
  return `SIS${Date.now().toString().slice(-4)}`;
}

app.post('/api/teacher/students', requireTeacher, (req: AuthedRequest, res) => {
  const { classId, fullName, studentCode, avatarId } = req.body as {
    classId?: string;
    fullName?: string;
    studentCode?: string;
    avatarId?: string;
  };
  if (!classId || !fullName?.trim()) {
    res.status(400).json({ error: 'Kelas dan nama lengkap siswa wajib diisi.' });
    return;
  }

  const cls = db
    .prepare('SELECT id, name, class_code FROM classes WHERE id = ? AND teacher_id = ?')
    .get(classId, req.teacherId!) as { id: string; name: string; class_code: string } | undefined;

  if (!cls) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }

  const code =
    (studentCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '') || createUniqueStudentCode(classId);
  const dup = db
    .prepare("SELECT id FROM students WHERE class_id = ? AND REPLACE(UPPER(student_code), ' ', '') = ?")
    .get(classId, code);
  if (dup) {
    res.status(409).json({ error: `Kode siswa ${code} sudah digunakan di kelas ini.` });
    return;
  }

  const avatar = avatarId && ['boy', 'girl', 'owl'].includes(avatarId) ? avatarId : 'boy';
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO students (id, class_id, teacher_id, full_name, student_code, avatar_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, classId, req.teacherId!, fullName.trim(), code, avatar, createdAt);

  res.status(201).json({
    student: {
      id,
      classId,
      className: cls.name,
      classCode: cls.class_code,
      teacherId: req.teacherId!,
      fullName: fullName.trim(),
      studentCode: code,
      avatarId: avatar,
      totalStars: 0,
      unlockedLevel: 1,
      createdAt,
    },
  });
});

app.post('/api/teacher/students/import', requireTeacher, (req: AuthedRequest, res) => {
  const { classId, names } = req.body as { classId?: string; names?: string[] };
  if (!classId || !Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: 'Pilih kelas dan masukkan minimal satu nama siswa.' });
    return;
  }
  const cls = db
    .prepare('SELECT id, name, class_code FROM classes WHERE id = ? AND teacher_id = ?')
    .get(classId, req.teacherId!) as { id: string; name: string; class_code: string } | undefined;

  if (!cls) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }

  const created: Record<string, unknown>[] = [];
  const avatars = ['boy', 'girl', 'owl'];
  const insertStmt = db.prepare(
    `INSERT INTO students (id, class_id, teacher_id, full_name, student_code, avatar_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < names.length; i++) {
    const cleanName = String(names[i]).trim();
    if (!cleanName) continue;
    const id = crypto.randomUUID();
    const code = createUniqueStudentCode(classId);
    const avatar = avatars[i % avatars.length];
    const createdAt = new Date().toISOString();
    insertStmt.run(id, classId, req.teacherId!, cleanName, code, avatar, createdAt);
    created.push({
      id,
      classId,
      className: cls.name,
      classCode: cls.class_code,
      teacherId: req.teacherId!,
      fullName: cleanName,
      studentCode: code,
      avatarId: avatar,
      totalStars: 0,
      unlockedLevel: 1,
      createdAt,
    });
  }

  res.status(201).json({ importedCount: created.length, students: created });
});

app.put('/api/teacher/students/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { fullName, avatarId } = req.body as { fullName?: string; avatarId?: string };
  const existing = db
    .prepare('SELECT * FROM students WHERE id = ? AND teacher_id = ?')
    .get(id, req.teacherId!) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    return;
  }
  const nextName = fullName?.trim() || String(existing.full_name);
  const nextAvatar =
    avatarId && ['boy', 'girl', 'owl'].includes(avatarId) ? avatarId : String(existing.avatar_id);

  db.prepare('UPDATE students SET full_name = ?, avatar_id = ? WHERE id = ?').run(nextName, nextAvatar, id);
  db.prepare('UPDATE evaluations SET student_name = ? WHERE student_id = ?').run(nextName, id);
  res.json({ ok: true });
});

app.delete('/api/teacher/students/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM students WHERE id = ? AND teacher_id = ?').run(id, req.teacherId!);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    return;
  }
  res.json({ ok: true });
});

// ========================
// TEACHER: SESSIONS & COMPETITIONS
// ========================
app.get('/api/teacher/sessions', requireTeacher, (req: AuthedRequest, res) => {
  const sessions = db
    .prepare(
      `SELECT gs.*, c.name as class_name, cr.id as room_id, cr.room_code, cr.status as room_status
       FROM game_sessions gs
       JOIN classes c ON c.id = gs.class_id
       LEFT JOIN competition_rooms cr ON cr.session_id = gs.id
       WHERE gs.teacher_id = ?
       ORDER BY gs.created_at DESC`
    )
    .all(req.teacherId!) as Record<string, unknown>[];

  const rooms = db
    .prepare(
      `SELECT cr.id
       FROM competition_rooms cr
       WHERE cr.teacher_id = ?
       ORDER BY cr.created_at DESC`
    )
    .all(req.teacherId!) as { id: string }[];

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      teacherId: s.teacher_id,
      classId: s.class_id,
      className: s.class_name,
      title: s.title,
      levelId: s.level_id,
      topic: s.topic,
      questionCount: s.question_count,
      durationMinutes: s.duration_minutes,
      mode: s.mode,
      status: s.status,
      allowRetry: Boolean(s.allow_retry),
      roomCode: s.room_code || undefined,
      roomId: s.room_id || undefined,
      createdAt: s.created_at,
    })),
    rooms: rooms.map((r) => getCompetitionRoomSnapshot(r.id)).filter(Boolean),
  });
});

app.post('/api/teacher/sessions', requireTeacher, (req: AuthedRequest, res) => {
  const { classId, levelId, title, questionCount, durationMinutes, mode, allowRetry } = req.body as {
    classId?: string;
    levelId?: number;
    title?: string;
    questionCount?: number;
    durationMinutes?: number;
    mode?: 'practice' | 'evaluation' | 'competition';
    allowRetry?: boolean;
  };

  if (!classId || !levelId) {
    res.status(400).json({ error: 'Kelas dan materi level wajib dipilih.' });
    return;
  }

  const cls = db
    .prepare('SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?')
    .get(classId, req.teacherId!) as { id: string; name: string } | undefined;
  if (!cls) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }

  const lvl = LEVELS.find((l) => l.id === Number(levelId)) || LEVELS[0];
  const qCount = Math.min(20, Math.max(5, Number(questionCount || 10)));
  const dur = Math.min(60, Math.max(3, Number(durationMinutes || 10)));
  const sessionMode = mode && ['practice', 'evaluation', 'competition'].includes(mode) ? mode : 'competition';
  const sessionTitle = (title || '').trim() || `${lvl.title} — ${cls.name}`;
  const retryFlag = allowRetry ? 1 : 0;
  const sessionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO game_sessions (id, teacher_id, class_id, title, level_id, topic, question_count, duration_minutes, mode, status, allow_retry, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(sessionId, req.teacherId!, classId, sessionTitle, lvl.id, lvl.topic, qCount, dur, sessionMode, retryFlag, createdAt);

  // Pre-generate shared fair question set for this session
  const generatedQuestions = generateQuestionsForLevel(lvl.id, qCount);
  const insertQ = db.prepare(
    `INSERT INTO questions (id, session_id, level_id, order_index, prompt, options_json, correct_answer, explanation, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const q of generatedQuestions) {
    insertQ.run(
      q.id,
      sessionId,
      lvl.id,
      q.orderIndex,
      q.prompt,
      JSON.stringify(q.options),
      q.correctAnswer,
      q.explanation,
      q.difficulty
    );
  }

  let roomId: string | undefined;
  let roomCode: string | undefined;

  if (sessionMode === 'competition') {
    roomId = crypto.randomUUID();
    roomCode = generateCode('CMP-', 4);
    while (db.prepare('SELECT id FROM competition_rooms WHERE room_code = ?').get(roomCode)) {
      roomCode = generateCode('CMP-', 4);
    }
    db.prepare(
      `INSERT INTO competition_rooms (id, session_id, teacher_id, class_id, room_code, level_id, question_count, duration_minutes, allow_retry, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?)`
    ).run(roomId, sessionId, req.teacherId!, classId, roomCode, lvl.id, qCount, dur, retryFlag, createdAt);
  }

  res.status(201).json({
    session: {
      id: sessionId,
      teacherId: req.teacherId!,
      classId,
      className: cls.name,
      title: sessionTitle,
      levelId: lvl.id,
      topic: lvl.topic,
      questionCount: qCount,
      durationMinutes: dur,
      mode: sessionMode,
      status: 'active',
      allowRetry: Boolean(retryFlag),
      roomId,
      roomCode,
      createdAt,
    },
    room: roomId ? getCompetitionRoomSnapshot(roomId) : undefined,
  });
});

app.post('/api/teacher/competitions/:roomId/start', requireTeacher, (req: AuthedRequest, res) => {
  const { roomId } = req.params;
  const room = db
    .prepare('SELECT id, session_id FROM competition_rooms WHERE id = ? AND teacher_id = ?')
    .get(roomId, req.teacherId!) as { id: string; session_id: string } | undefined;

  if (!room) {
    res.status(404).json({ error: 'Ruang kompetisi tidak ditemukan.' });
    return;
  }

  const startedAt = new Date().toISOString();
  db.prepare("UPDATE competition_rooms SET status = 'active', started_at = ? WHERE id = ?").run(startedAt, roomId);
  db.prepare("UPDATE competition_participants SET status = 'playing' WHERE room_id = ? AND status = 'joined'").run(
    roomId
  );

  broadcastRoomState(roomId);
  res.json({ room: getCompetitionRoomSnapshot(roomId) });
});

app.post('/api/teacher/competitions/:roomId/end', requireTeacher, (req: AuthedRequest, res) => {
  const { roomId } = req.params;
  const room = db
    .prepare('SELECT id, session_id FROM competition_rooms WHERE id = ? AND teacher_id = ?')
    .get(roomId, req.teacherId!) as { id: string; session_id: string } | undefined;

  if (!room) {
    res.status(404).json({ error: 'Ruang kompetisi tidak ditemukan.' });
    return;
  }

  const endedAt = new Date().toISOString();
  db.prepare("UPDATE competition_rooms SET status = 'ended', ended_at = ? WHERE id = ?").run(endedAt, roomId);
  db.prepare("UPDATE game_sessions SET status = 'ended' WHERE id = ?").run(room.session_id);

  broadcastRoomState(roomId);
  res.json({ room: getCompetitionRoomSnapshot(roomId) });
});

app.delete('/api/teacher/competitions/:roomId', requireTeacher, (req: AuthedRequest, res) => {
  const { roomId } = req.params;
  const room = db
    .prepare('SELECT id, session_id, status FROM competition_rooms WHERE id = ? AND teacher_id = ?')
    .get(roomId, req.teacherId!) as { id: string; session_id: string; status: string } | undefined;

  if (!room) {
    res.status(404).json({ error: 'Ruang kompetisi tidak ditemukan.' });
    return;
  }

  if (room.status !== 'ended') {
    res.status(400).json({
      error: 'Hanya kompetisi yang sudah selesai yang dapat dihapus. Akhiri sesi terlebih dahulu.',
    });
    return;
  }

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM competition_participants WHERE room_id = ?').run(room.id);
    db.prepare('DELETE FROM competition_rooms WHERE id = ? AND teacher_id = ?').run(room.id, req.teacherId!);
    db.prepare('DELETE FROM questions WHERE session_id = ?').run(room.session_id);
    db.prepare('DELETE FROM game_sessions WHERE id = ? AND teacher_id = ?').run(room.session_id, req.teacherId!);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  roomSubscribers.delete(room.id);
  res.json({ ok: true, deletedRoomId: room.id, deletedSessionId: room.session_id });
});

app.delete('/api/teacher/sessions/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM game_sessions WHERE id = ? AND teacher_id = ?').run(id, req.teacherId!);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Sesi permainan tidak ditemukan.' });
    return;
  }
  res.json({ ok: true });
});

app.post('/api/teacher/sync-from-cloud', requireTeacher, (req: AuthedRequest, res) => {
  const body = (req.body || {}) as {
    classes?: Array<{
      id?: string;
      name?: string;
      classCode?: string;
      passingGrade?: number;
      createdAt?: string;
    }>;
    students?: Array<{
      id?: string;
      classId?: string;
      fullName?: string;
      studentCode?: string;
      avatarId?: string;
      totalStars?: number;
      unlockedLevel?: number;
      createdAt?: string;
    }>;
    sessions?: Array<{
      id?: string;
      classId?: string;
      title?: string;
      levelId?: number;
      topic?: string;
      questionCount?: number;
      durationMinutes?: number;
      mode?: string;
      status?: string;
      createdAt?: string;
    }>;
    rooms?: Array<{
      id?: string;
      classId?: string;
      roomCode?: string;
      status?: string;
      levelId?: number;
      createdAt?: string;
    }>;
    evaluations?: Array<{
      id?: string;
      classId?: string;
      studentId?: string;
      studentName?: string;
      levelId?: number;
      levelName?: string;
      totalQuestions?: number;
      correctCount?: number;
      wrongCount?: number;
      score?: number;
      starsEarned?: number;
      durationSeconds?: number;
      isPassed?: boolean;
      executedAt?: string;
    }>;
    badges?: Array<{
      id?: string;
      studentId?: string;
      badgeId?: string;
      levelId?: number | null;
      unlockedAt?: string;
    }>;
  };

  const teacherId = req.teacherId!;
  const now = new Date().toISOString();
  const counts = { classes: 0, students: 0, sessions: 0, rooms: 0, evaluations: 0, badges: 0 };

  db.exec('BEGIN');
  try {
    const insertClass = db.prepare(
      `INSERT OR IGNORE INTO classes (id, teacher_id, name, class_code, passing_grade, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const c of body.classes || []) {
      if (!c.id || !c.name || !c.classCode) continue;
      const cleanCode = c.classCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (!cleanCode) continue;
      const grade = Math.min(100, Math.max(0, Number(c.passingGrade ?? 75)));
      const info = insertClass.run(c.id, teacherId, c.name.trim(), cleanCode, grade, c.createdAt || now);
      if (info.changes > 0) counts.classes += 1;
    }

    const insertStudent = db.prepare(
      `INSERT OR IGNORE INTO students (id, class_id, teacher_id, full_name, student_code, avatar_id, total_stars, unlocked_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const hasClassStmt = db.prepare('SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?');
    for (const s of body.students || []) {
      if (!s.id || !s.classId || !s.fullName || !s.studentCode) continue;
      if (!hasClassStmt.get(s.classId, teacherId)) continue;
      const cleanCode = s.studentCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (!cleanCode) continue;
      const avatar = s.avatarId && ['boy', 'girl', 'owl'].includes(s.avatarId) ? s.avatarId : 'boy';
      const stars = Math.min(100, Math.max(0, Number(s.totalStars ?? 0)));
      const unlocked = Math.min(6, Math.max(1, Number(s.unlockedLevel ?? 1)));
      const info = insertStudent.run(
        s.id,
        s.classId,
        teacherId,
        s.fullName.trim(),
        cleanCode,
        avatar,
        stars,
        unlocked,
        s.createdAt || now
      );
      if (info.changes > 0) counts.students += 1;
    }

    const insertSession = db.prepare(
      `INSERT OR IGNORE INTO game_sessions (id, teacher_id, class_id, title, level_id, topic, question_count, duration_minutes, mode, status, allow_retry, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    );
    const countSessionQuestions = db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE session_id = ?');
    const insertQuestion = db.prepare(
      `INSERT INTO questions (id, session_id, level_id, order_index, prompt, options_json, correct_answer, explanation, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const gs of body.sessions || []) {
      if (!gs.id || !gs.classId || !gs.title) continue;
      if (!hasClassStmt.get(gs.classId, teacherId)) continue;
      const lvl = LEVELS.find((l) => l.id === Number(gs.levelId)) || LEVELS[0];
      const qCount = Math.min(50, Math.max(1, Number(gs.questionCount ?? 10)));
      const dur = Math.min(180, Math.max(1, Number(gs.durationMinutes ?? 10)));
      const mode = gs.mode && ['practice', 'evaluation', 'competition'].includes(gs.mode) ? gs.mode : 'competition';
      const status = gs.status === 'ended' ? 'ended' : 'active';
      const info = insertSession.run(
        gs.id,
        teacherId,
        gs.classId,
        gs.title.trim(),
        lvl.id,
        gs.topic || lvl.topic,
        qCount,
        dur,
        mode,
        status,
        gs.createdAt || now
      );
      if (info.changes > 0) counts.sessions += 1;
      const qCnt = (countSessionQuestions.get(gs.id) as { cnt: number }).cnt;
      if (qCnt === 0) {
        const generated = generateQuestionsForLevel(lvl.id, qCount);
        for (const q of generated) {
          insertQuestion.run(
            q.id,
            gs.id,
            lvl.id,
            q.orderIndex,
            q.prompt,
            JSON.stringify(q.options),
            q.correctAnswer,
            q.explanation,
            q.difficulty
          );
        }
      }
    }

    const findMatchingSession = db.prepare(
      `SELECT id, question_count, duration_minutes FROM game_sessions
       WHERE teacher_id = ? AND class_id = ? AND level_id = ?
       ORDER BY CASE WHEN created_at = ? THEN 0 ELSE 1 END ASC, created_at DESC
       LIMIT 1`
    );
    const insertRoom = db.prepare(
      `INSERT OR IGNORE INTO competition_rooms (id, session_id, teacher_id, class_id, room_code, level_id, question_count, duration_minutes, allow_retry, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    );
    for (const rm of body.rooms || []) {
      if (!rm.id || !rm.classId || !rm.roomCode) continue;
      if (!hasClassStmt.get(rm.classId, teacherId)) continue;
      const matchSess = findMatchingSession.get(
        teacherId,
        rm.classId,
        Number(rm.levelId || 1),
        rm.createdAt || ''
      ) as { id: string; question_count: number; duration_minutes: number } | undefined;
      if (!matchSess) continue;
      const cleanRoomCode = rm.roomCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (!cleanRoomCode) continue;
      const status = rm.status && ['waiting', 'active', 'ended'].includes(rm.status) ? rm.status : 'waiting';
      const info = insertRoom.run(
        rm.id,
        matchSess.id,
        teacherId,
        rm.classId,
        cleanRoomCode,
        Number(rm.levelId || 1),
        matchSess.question_count,
        matchSess.duration_minutes,
        status,
        rm.createdAt || now
      );
      if (info.changes > 0) counts.rooms += 1;
    }

    const hasStudentStmt = db.prepare('SELECT id FROM students WHERE id = ? AND teacher_id = ?');
    const insertEval = db.prepare(
      `INSERT OR IGNORE INTO evaluations (
        id, student_id, student_name, class_id, class_name, teacher_id,
        session_id, room_id, level_id, level_name, topic, mode,
        total_questions, correct_count, wrong_count, score, pass_percentage,
        stars_earned, duration_seconds, is_passed, status, attempt_number, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 'adventure', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 1, ?)`
    );
    for (const ev of body.evaluations || []) {
      if (!ev.id || !ev.studentId || !ev.classId) continue;
      const clsRow = hasClassStmt.get(ev.classId, teacherId) as { id: string; name: string } | undefined;
      if (!clsRow || !hasStudentStmt.get(ev.studentId, teacherId)) continue;
      const lvl = LEVELS.find((l) => l.id === Number(ev.levelId)) || LEVELS[0];
      const score = Number(ev.score ?? 0);
      const info = insertEval.run(
        ev.id,
        ev.studentId,
        ev.studentName || 'Siswa',
        ev.classId,
        clsRow.name,
        teacherId,
        lvl.id,
        ev.levelName || lvl.title,
        lvl.topic,
        Number(ev.totalQuestions ?? 10),
        Number(ev.correctCount ?? 0),
        Number(ev.wrongCount ?? 0),
        score,
        score,
        Number(ev.starsEarned ?? 0),
        Number(ev.durationSeconds ?? 0),
        ev.isPassed ? 1 : 0,
        ev.executedAt || now
      );
      if (info.changes > 0) counts.evaluations += 1;
    }

    const insertBadge = db.prepare(
      `INSERT OR IGNORE INTO student_badges (id, student_id, teacher_id, badge_id, level_id, unlocked_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const b of body.badges || []) {
      if (!b.studentId || !b.badgeId) continue;
      if (!hasStudentStmt.get(b.studentId, teacherId)) continue;
      const info = insertBadge.run(
        b.id || crypto.randomUUID(),
        b.studentId,
        teacherId,
        b.badgeId,
        b.levelId ?? null,
        b.unlockedAt || now
      );
      if (info.changes > 0) counts.badges += 1;
    }

    db.exec('COMMIT');
    const restoredCount =
      counts.classes + counts.students + counts.sessions + counts.rooms + counts.evaluations + counts.badges;
    res.json({ ok: true, restoredCount, counts });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed cloud restore:', err);
    res.status(500).json({ error: 'Gagal memulihkan data dari cloud.' });
  }
});

// ========================
// TEACHER: EVALUATIONS & REPORTS
// ========================
app.get('/api/teacher/evaluations', requireTeacher, (req: AuthedRequest, res) => {
  const classId = typeof req.query.classId === 'string' ? req.query.classId : '';
  const levelId = typeof req.query.levelId === 'string' ? req.query.levelId : '';
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';

  const conditions: string[] = ['e.teacher_id = ?'];
  const params: (string | number)[] = [req.teacherId!];

  if (classId) {
    conditions.push('e.class_id = ?');
    params.push(classId);
  }
  if (levelId) {
    conditions.push('e.level_id = ?');
    params.push(Number(levelId));
  }
  if (dateFrom) {
    conditions.push('date(e.executed_at) >= date(?)');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('date(e.executed_at) <= date(?)');
    params.push(dateTo);
  }

  const rows = db
    .prepare(
      `SELECT e.*
       FROM evaluations e
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.executed_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  res.json({
    evaluations: rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      classId: r.class_id,
      className: r.class_name,
      teacherId: r.teacher_id,
      sessionId: r.session_id,
      roomId: r.room_id,
      levelId: r.level_id,
      levelName: r.level_name,
      topic: r.topic,
      mode: r.mode,
      totalQuestions: r.total_questions,
      correctCount: r.correct_count,
      wrongCount: r.wrong_count,
      score: r.score,
      passPercentage: r.pass_percentage,
      starsEarned: r.stars_earned,
      durationSeconds: r.duration_seconds,
      isPassed: Boolean(r.is_passed),
      status: r.status,
      attemptNumber: r.attempt_number,
      executedAt: r.executed_at,
    })),
  });
});

app.get('/api/teacher/evaluations/:id', requireTeacher, (req: AuthedRequest, res) => {
  const { id } = req.params;
  const evalRow = db
    .prepare('SELECT * FROM evaluations WHERE id = ? AND teacher_id = ?')
    .get(id, req.teacherId!) as Record<string, unknown> | undefined;

  if (!evalRow) {
    res.status(404).json({ error: 'Data evaluasi tidak ditemukan.' });
    return;
  }

  const answers = db
    .prepare('SELECT * FROM student_answers WHERE evaluation_id = ? ORDER BY rowid ASC')
    .all(id) as Record<string, unknown>[];

  res.json({
    evaluation: {
      id: evalRow.id,
      studentId: evalRow.student_id,
      studentName: evalRow.student_name,
      classId: evalRow.class_id,
      className: evalRow.class_name,
      teacherId: evalRow.teacher_id,
      sessionId: evalRow.session_id,
      roomId: evalRow.room_id,
      levelId: evalRow.level_id,
      levelName: evalRow.level_name,
      topic: evalRow.topic,
      mode: evalRow.mode,
      totalQuestions: evalRow.total_questions,
      correctCount: evalRow.correct_count,
      wrongCount: evalRow.wrong_count,
      score: evalRow.score,
      passPercentage: evalRow.pass_percentage,
      starsEarned: evalRow.stars_earned,
      durationSeconds: evalRow.duration_seconds,
      isPassed: Boolean(evalRow.is_passed),
      status: evalRow.status,
      attemptNumber: evalRow.attempt_number,
      executedAt: evalRow.executed_at,
      answers: answers.map((a) => ({
        questionId: a.question_id,
        questionPrompt: a.question_prompt,
        selectedAnswer: a.selected_answer,
        correctAnswer: a.correct_answer,
        isCorrect: Boolean(a.is_correct),
        explanation: a.explanation,
      })),
    },
  });
});

// ========================
// STUDENT: ADVENTURE, QUESTIONS, EVALUATIONS, COMPETITIONS
// ========================
app.get('/api/student/adventure', requireStudent, (req: AuthedRequest, res) => {
  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.class_code, c.passing_grade
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`
    )
    .get(req.studentId!) as Record<string, unknown>;

  const myEvaluations = db
    .prepare(
      `SELECT level_id, MAX(stars_earned) as best_stars, MAX(score) as best_score, COUNT(*) as attempts
       FROM evaluations
       WHERE student_id = ?
       GROUP BY level_id`
    )
    .all(req.studentId!) as { level_id: number; best_stars: number; best_score: number; attempts: number }[];

  const activeSessions = db
    .prepare(
      `SELECT gs.*, cr.id as room_id, cr.room_code, cr.status as room_status
       FROM game_sessions gs
       LEFT JOIN competition_rooms cr ON cr.session_id = gs.id
       WHERE gs.class_id = ? AND gs.status = 'active'
       ORDER BY gs.created_at DESC`
    )
    .all(req.studentClassId!) as Record<string, unknown>[];

  const recentHistory = db
    .prepare(
      `SELECT * FROM evaluations WHERE student_id = ? ORDER BY executed_at DESC LIMIT 12`
    )
    .all(req.studentId!) as Record<string, unknown>[];

  const badgeRows = db
    .prepare('SELECT * FROM student_badges WHERE student_id = ? ORDER BY unlocked_at DESC')
    .all(req.studentId!) as Record<string, unknown>[];

  const mappedBadges = badgeRows.map((b) => ({
    id: String(b.id),
    studentId: String(b.student_id),
    badgeId: String(b.badge_id),
    levelId: b.level_id !== null ? Number(b.level_id) : null,
    unlockedAt: String(b.unlocked_at),
  }));

  res.json({
    student: {
      id: student.id,
      classId: student.class_id,
      className: student.class_name,
      classCode: student.class_code,
      teacherId: student.teacher_id,
      fullName: student.full_name,
      studentCode: student.student_code,
      avatarId: student.avatar_id,
      totalStars: student.total_stars,
      unlockedLevel: student.unlocked_level,
      passingGrade: student.passing_grade,
      createdAt: student.created_at,
      badges: mappedBadges,
    },
    badges: mappedBadges,
    levelProgress: myEvaluations,
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      title: s.title,
      levelId: s.level_id,
      topic: s.topic,
      questionCount: s.question_count,
      durationMinutes: s.duration_minutes,
      mode: s.mode,
      allowRetry: Boolean(s.allow_retry),
      roomId: s.room_id || undefined,
      roomCode: s.room_code || undefined,
      roomStatus: s.room_status || undefined,
    })),
    recentHistory: recentHistory.map((r) => ({
      id: r.id,
      levelId: r.level_id,
      levelName: r.level_name,
      score: r.score,
      starsEarned: r.stars_earned,
      correctCount: r.correct_count,
      totalQuestions: r.total_questions,
      durationSeconds: r.duration_seconds,
      mode: r.mode,
      executedAt: r.executed_at,
    })),
  });
});

app.get('/api/student/questions/:levelId', requireStudent, (req: AuthedRequest, res) => {
  const levelId = Math.min(6, Math.max(1, Number(req.params.levelId)));
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';

  if (sessionId) {
    const rows = db
      .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY order_index ASC')
      .all(sessionId) as Record<string, unknown>[];
    if (rows.length > 0) {
      res.json({
        questions: rows.map((r) => ({
          id: r.id,
          levelId: r.level_id,
          orderIndex: r.order_index,
          prompt: r.prompt,
          options: JSON.parse(String(r.options_json)) as number[],
          correctAnswer: r.correct_answer,
          explanation: r.explanation,
          difficulty: r.difficulty,
        })),
      });
      return;
    }
  }

  const questions = generateQuestionsForLevel(levelId, 10);
  res.json({ questions });
});

function saveEvaluationRecord(
  studentId: string,
  payload: {
    clientEvalId?: string;
    levelId: number;
    mode: 'adventure' | 'session' | 'competition';
    sessionId?: string | null;
    roomId?: string | null;
    durationSeconds: number;
    answers: StudentAnswerPayload[];
    executedAt?: string;
  }
) {
  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.passing_grade
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`
    )
    .get(studentId) as Record<string, unknown> | undefined;

  if (!student) {
    throw new Error('Siswa tidak ditemukan.');
  }

  // Deduplicate offline sync retries using clientEvalId if provided
  if (payload.clientEvalId) {
    const existingEval = db
      .prepare('SELECT * FROM evaluations WHERE id = ?')
      .get(payload.clientEvalId) as Record<string, unknown> | undefined;
    if (existingEval) {
      return { evaluationId: payload.clientEvalId, duplicate: true };
    }
  }

  // Enforce single submission per competition room unless allow_retry is enabled
  if (payload.roomId) {
    const room = db
      .prepare('SELECT * FROM competition_rooms WHERE id = ?')
      .get(payload.roomId) as Record<string, unknown> | undefined;
    if (room && !room.allow_retry) {
      const finishedBefore = db
        .prepare("SELECT id FROM competition_participants WHERE room_id = ? AND student_id = ? AND status = 'finished'")
        .get(payload.roomId, studentId);
      if (finishedBefore) {
        throw new Error('Anda sudah menyelesaikan sesi kompetisi ini.');
      }
    }
  }

  const totalQuestions = Math.max(1, payload.answers.length);
  const correctCount = payload.answers.filter((a) => a.isCorrect).length;
  const wrongCount = totalQuestions - correctCount;
  const score = Math.round((correctCount / totalQuestions) * 100);
  const passPercentage = Number(((correctCount / totalQuestions) * 100).toFixed(1));
  const starsEarned = score >= 85 ? 3 : score >= 65 ? 2 : score >= 40 ? 1 : 0;
  const passingGrade = Number(student.passing_grade ?? 75);
  const isPassed = score >= passingGrade ? 1 : 0;
  const lvl = LEVELS.find((l) => l.id === Number(payload.levelId)) || LEVELS[0];
  const executedAt = payload.executedAt || new Date().toISOString();
  const durationSeconds = Math.max(1, Math.round(Number(payload.durationSeconds || 1)));

  const prevAttempts = db
    .prepare('SELECT COUNT(*) as cnt FROM evaluations WHERE student_id = ? AND level_id = ?')
    .get(studentId, lvl.id) as { cnt: number };
  const attemptNumber = Number(prevAttempts?.cnt || 0) + 1;

  const evaluationId = payload.clientEvalId || crypto.randomUUID();

  db.prepare(
    `INSERT INTO evaluations (
      id, student_id, student_name, class_id, class_name, teacher_id,
      session_id, room_id, level_id, level_name, topic, mode,
      total_questions, correct_count, wrong_count, score, pass_percentage,
      stars_earned, duration_seconds, is_passed, status, attempt_number, executed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
  ).run(
    evaluationId,
    studentId,
    String(student.full_name),
    String(student.class_id),
    String(student.class_name),
    String(student.teacher_id),
    payload.sessionId || null,
    payload.roomId || null,
    lvl.id,
    lvl.title,
    lvl.topic,
    payload.mode || 'adventure',
    totalQuestions,
    correctCount,
    wrongCount,
    score,
    passPercentage,
    starsEarned,
    durationSeconds,
    isPassed,
    attemptNumber,
    executedAt
  );

  const insertAns = db.prepare(
    `INSERT INTO student_answers (
      id, evaluation_id, student_id, question_id, question_prompt,
      selected_answer, correct_answer, is_correct, explanation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const ans of payload.answers) {
    insertAns.run(
      crypto.randomUUID(),
      evaluationId,
      studentId,
      ans.questionId,
      ans.questionPrompt,
      ans.selectedAnswer,
      ans.correctAnswer,
      ans.isCorrect ? 1 : 0,
      ans.explanation,
      executedAt
    );
  }

  // Recompute total stars from best stars per level
  const starsRow = db
    .prepare(
      `SELECT COALESCE(SUM(best_stars), 0) as total_stars FROM (
         SELECT MAX(stars_earned) as best_stars FROM evaluations WHERE student_id = ? GROUP BY level_id
       )`
    )
    .get(studentId) as { total_stars: number };

  let unlockedLevel = Number(student.unlocked_level || 1);
  if (score >= 60 && lvl.id >= unlockedLevel && lvl.id < 6) {
    unlockedLevel = lvl.id + 1;
  }

  const totalStarsVal = Number(starsRow?.total_stars || 0);
  db.prepare('UPDATE students SET total_stars = ?, unlocked_level = ? WHERE id = ?').run(
    totalStarsVal,
    unlockedLevel,
    studentId
  );

  // Evaluate and award collectible achievement badges
  const teacherIdStr = String(student.teacher_id);
  const existingBadgesRows = db
    .prepare('SELECT badge_id FROM student_badges WHERE student_id = ?')
    .all(studentId) as { badge_id: string }[];
  const ownedSet = new Set(existingBadgesRows.map((b) => b.badge_id));

  const aggStats = db
    .prepare('SELECT COUNT(*) as total_runs, AVG(score) as avg_score FROM evaluations WHERE student_id = ?')
    .get(studentId) as { total_runs: number; avg_score: number };

  const bestPerLevelRows = db
    .prepare('SELECT level_id, MAX(score) as best_score FROM evaluations WHERE student_id = ? GROUP BY level_id')
    .all(studentId) as { level_id: number; best_score: number }[];
  const bestMap = new Map<number, number>(bestPerLevelRows.map((r) => [Number(r.level_id), Number(r.best_score)]));

  const earnedChecks: { badgeId: string; met: boolean }[] = [
    { badgeId: 'perfect_score', met: score === 100 },
    { badgeId: 'speed_demon', met: totalQuestions >= 10 && durationSeconds <= 45 && score >= 80 },
    {
      badgeId: 'consistent_learner',
      met: Number(aggStats?.total_runs || 0) >= 5 && Number(aggStats?.avg_score || 0) >= 75,
    },
    { badgeId: 'star_collector', met: totalStarsVal >= 12 },
    {
      badgeId: 'operation_master',
      met: [1, 2, 3, 4].every((lid) => (bestMap.get(lid) ?? 0) >= 75),
    },
    { badgeId: 'castle_conqueror', met: (bestMap.get(5) ?? 0) >= 80 },
    { badgeId: 'grand_integer_master', met: (bestMap.get(6) ?? 0) >= 85 },
    { badgeId: 'arena_champion', met: payload.mode === 'competition' && score >= 80 },
  ];

  const newlyUnlockedBadges: {
    id: string;
    studentId: string;
    badgeId: string;
    levelId: number | null;
    unlockedAt: string;
  }[] = [];

  const insertBadge = db.prepare(
    `INSERT OR IGNORE INTO student_badges (id, student_id, teacher_id, badge_id, level_id, unlocked_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const chk of earnedChecks) {
    if (chk.met && !ownedSet.has(chk.badgeId)) {
      const badgeRowId = crypto.randomUUID();
      insertBadge.run(badgeRowId, studentId, teacherIdStr, chk.badgeId, lvl.id, executedAt);
      newlyUnlockedBadges.push({
        id: badgeRowId,
        studentId,
        badgeId: chk.badgeId,
        levelId: lvl.id,
        unlockedAt: executedAt,
      });
      ownedSet.add(chk.badgeId);
    }
  }

  const allBadgesRows = db
    .prepare('SELECT * FROM student_badges WHERE student_id = ? ORDER BY unlocked_at DESC')
    .all(studentId) as Record<string, unknown>[];

  if (payload.roomId) {
    const finishedAt = new Date().toISOString();
    const existingP = db
      .prepare('SELECT id, attempt_count FROM competition_participants WHERE room_id = ? AND student_id = ?')
      .get(payload.roomId, studentId) as { id: string; attempt_count: number } | undefined;

    if (existingP) {
      db.prepare(
        `UPDATE competition_participants
         SET status = 'finished', score = ?, correct_count = ?, wrong_count = ?, duration_seconds = ?, finished_at = ?, attempt_count = ?
         WHERE id = ?`
      ).run(
        score,
        correctCount,
        wrongCount,
        durationSeconds,
        finishedAt,
        existingP.attempt_count + 1,
        existingP.id
      );
    }
    broadcastRoomState(payload.roomId);
  }

  return {
    evaluationId,
    score,
    correctCount,
    wrongCount,
    totalQuestions,
    starsEarned,
    isPassed: Boolean(isPassed),
    unlockedLevel,
    totalStars: totalStarsVal,
    newlyUnlockedBadges,
    allBadges: allBadgesRows.map((b) => ({
      id: String(b.id),
      studentId: String(b.student_id),
      badgeId: String(b.badge_id),
      levelId: b.level_id !== null ? Number(b.level_id) : null,
      unlockedAt: String(b.unlocked_at),
    })),
    duplicate: false,
  };
}

app.post('/api/student/evaluations', requireStudent, (req: AuthedRequest, res) => {
  try {
    const result = saveEvaluationRecord(req.studentId!, req.body);
    res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan hasil evaluasi.';
    res.status(400).json({ error: msg });
  }
});

app.post('/api/student/evaluations/sync', requireStudent, (req: AuthedRequest, res) => {
  const { items } = req.body as { items?: Parameters<typeof saveEvaluationRecord>[1][] };
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Format sinkronisasi tidak valid.' });
    return;
  }
  const syncedIds: string[] = [];
  for (const item of items) {
    try {
      const resItem = saveEvaluationRecord(req.studentId!, item);
      syncedIds.push(resItem.evaluationId);
    } catch {
      // Skip invalid or duplicate competition entries
    }
  }
  res.json({ syncedIds });
});

app.post('/api/student/competitions/join', requireStudent, (req: AuthedRequest, res) => {
  const { roomCode } = req.body as { roomCode?: string };
  if (!roomCode?.trim()) {
    res.status(400).json({ error: 'Kode ruang kompetisi wajib diisi.' });
    return;
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const room = db
    .prepare('SELECT * FROM competition_rooms WHERE UPPER(room_code) = ?')
    .get(normalizedCode) as Record<string, unknown> | undefined;

  if (!room) {
    res.status(404).json({ error: 'Kode ruang kompetisi tidak ditemukan.' });
    return;
  }

  if (String(room.class_id) !== req.studentClassId) {
    res.status(403).json({ error: 'Ruang kompetisi ini bukan untuk kelas Anda.' });
    return;
  }

  if (room.status === 'ended') {
    res.status(400).json({ error: 'Sesi kompetisi ini sudah berakhir.' });
    return;
  }

  const student = db
    .prepare('SELECT id, full_name, avatar_id FROM students WHERE id = ?')
    .get(req.studentId!) as { id: string; full_name: string; avatar_id: string };

  const existingP = db
    .prepare('SELECT * FROM competition_participants WHERE room_id = ? AND student_id = ?')
    .get(String(room.id), req.studentId!) as Record<string, unknown> | undefined;

  if (existingP) {
    if (existingP.status === 'finished' && !room.allow_retry) {
      res.json({
        room: getCompetitionRoomSnapshot(String(room.id)),
        alreadyFinished: true,
      });
      return;
    }
  } else {
    db.prepare(
      `INSERT INTO competition_participants (id, room_id, student_id, student_name, avatar_id, status, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      String(room.id),
      student.id,
      student.full_name,
      student.avatar_id,
      room.status === 'active' ? 'playing' : 'joined',
      new Date().toISOString()
    );
  }

  broadcastRoomState(String(room.id));
  res.json({
    room: getCompetitionRoomSnapshot(String(room.id)),
    alreadyFinished: false,
  });
});

app.get('/api/student/competitions/:roomId', requireStudent, (req: AuthedRequest, res) => {
  const { roomId } = req.params;
  const snapshot = getCompetitionRoomSnapshot(roomId);
  if (!snapshot) {
    res.status(404).json({ error: 'Ruang kompetisi tidak ditemukan.' });
    return;
  }
  if (snapshot.classId !== req.studentClassId) {
    res.status(403).json({ error: 'Akses ditolak.' });
    return;
  }

  let questions: Record<string, unknown>[] = [];
  if (snapshot.status === 'active') {
    const qRows = db
      .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY order_index ASC')
      .all(String(snapshot.sessionId)) as Record<string, unknown>[];
    questions = qRows.map((r) => ({
      id: r.id,
      levelId: r.level_id,
      orderIndex: r.order_index,
      prompt: r.prompt,
      options: JSON.parse(String(r.options_json)) as number[],
      correctAnswer: r.correct_answer,
      explanation: r.explanation,
      difficulty: r.difficulty,
    }));
  }

  res.json({ room: snapshot, questions });
});

async function startServer() {
  const server = http.createServer(app);

  // Attach WebSocket server on /ws for real-time competition rooms
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host}`);
    if (reqUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (isProduction) {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    let subscribedRoom: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; roomId?: string };
        if (msg.type === 'subscribe' && msg.roomId) {
          if (subscribedRoom && roomSubscribers.has(subscribedRoom)) {
            roomSubscribers.get(subscribedRoom)!.delete(ws);
          }
          subscribedRoom = msg.roomId;
          if (!roomSubscribers.has(msg.roomId)) {
            roomSubscribers.set(msg.roomId, new Set());
          }
          roomSubscribers.get(msg.roomId)!.add(ws);

          const snapshot = getCompetitionRoomSnapshot(msg.roomId);
          if (snapshot && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'room_state', room: snapshot }));
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (subscribedRoom && roomSubscribers.has(subscribedRoom)) {
        roomSubscribers.get(subscribedRoom)!.delete(ws);
      }
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`INTEGER ADVENTURE server running on http://localhost:${PORT}`);
  });
}

startServer();
