import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  initializeFirestore,
  memoryLocalCache,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  ClassRoom,
  CompetitionRoomRecord,
  EvaluationRecord,
  GameSessionRecord,
  StudentRecord,
  TeacherUser,
} from './shared/levels';
import type { StudentBadgeRecord } from './shared/badges';
import { apiFetch } from './utils/authSession';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  typeof window !== 'undefined'
    ? {
        experimentalForceLongPolling: true,
        localCache: memoryLocalCache(),
      }
    : {
        localCache: memoryLocalCache(),
      },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationTypeValue;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationTypeValue,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sync teacher workspace entities to Firestore whenever authenticated with Google
export async function syncTeacherProfileToFirestore(teacher: TeacherUser) {
  if (!auth.currentUser || auth.currentUser.uid !== teacher.id) return;
  const path = `teachers/${teacher.id}`;
  try {
    await setDoc(
      doc(db, 'teachers', teacher.id),
      {
        id: teacher.id.slice(0, 128),
        name: teacher.name.slice(0, 120),
        email: teacher.email.slice(0, 160),
        schoolName: (teacher.schoolName || '').slice(0, 160),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function listTeacherDocs<T extends { id: string }>(
  colName: string,
  teacherId: string
): Promise<T[]> {
  try {
    const q = query(collection(db, colName), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colName);
  }
}

export interface CloudWorkspaceSnapshot {
  classes: ClassRoom[];
  students: StudentRecord[];
  sessions: GameSessionRecord[];
  rooms: CompetitionRoomRecord[];
  evaluations: EvaluationRecord[];
  badges: (StudentBadgeRecord & { teacherId?: string })[];
}

export async function fetchWorkspaceFromFirestore(
  teacherId: string
): Promise<CloudWorkspaceSnapshot> {
  if (!auth.currentUser || auth.currentUser.uid !== teacherId) {
    return {
      classes: [],
      students: [],
      sessions: [],
      rooms: [],
      evaluations: [],
      badges: [],
    };
  }

  const [classes, students, sessions, rooms, evaluations, badges] = await Promise.all([
    listTeacherDocs<ClassRoom>('classes', teacherId),
    listTeacherDocs<StudentRecord>('students', teacherId),
    listTeacherDocs<GameSessionRecord>('gameSessions', teacherId),
    listTeacherDocs<CompetitionRoomRecord>('competitionRooms', teacherId),
    listTeacherDocs<EvaluationRecord>('evaluations', teacherId),
    listTeacherDocs<StudentBadgeRecord & { teacherId?: string }>('studentBadges', teacherId),
  ]);

  return { classes, students, sessions, rooms, evaluations, badges };
}

export async function restoreTeacherWorkspaceFromCloud(
  teacherId: string
): Promise<{ restoredCount: number }> {
  if (!auth.currentUser || auth.currentUser.uid !== teacherId) {
    return { restoredCount: 0 };
  }

  const snapshot = await fetchWorkspaceFromFirestore(teacherId);
  const totalInCloud =
    snapshot.classes.length +
    snapshot.students.length +
    snapshot.sessions.length +
    snapshot.rooms.length +
    snapshot.evaluations.length +
    snapshot.badges.length;

  if (totalInCloud === 0) {
    return { restoredCount: 0 };
  }

  const res = await apiFetch('/api/teacher/sync-from-cloud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!res.ok) {
    return { restoredCount: 0 };
  }

  const data = (await res.json()) as { restoredCount?: number };
  return { restoredCount: Number(data.restoredCount ?? 0) };
}

export async function deleteClassFromFirestore(classId: string) {
  if (!auth.currentUser) return;
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteStudentFromFirestore(studentId: string) {
  if (!auth.currentUser) return;
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteSessionFromFirestore(sessionId: string) {
  if (!auth.currentUser) return;
  const path = `gameSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'gameSessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteCompetitionRoomFromFirestore(roomId: string) {
  if (!auth.currentUser) return;
  const path = `competitionRooms/${roomId}`;
  try {
    await deleteDoc(doc(db, 'competitionRooms', roomId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncWorkspaceSnapshotToFirestore(params: {
  teacherId: string;
  classes: ClassRoom[];
  students: StudentRecord[];
  sessions: GameSessionRecord[];
  rooms: CompetitionRoomRecord[];
  evaluations: EvaluationRecord[];
  badges: (StudentBadgeRecord & { teacherId?: string })[];
}) {
  if (!auth.currentUser || auth.currentUser.uid !== params.teacherId) return;

  try {
    const [existingSessions, existingRooms, existingEvaluations, existingBadges] = await Promise.all([
      listTeacherDocs<GameSessionRecord>('gameSessions', params.teacherId),
      listTeacherDocs<CompetitionRoomRecord>('competitionRooms', params.teacherId),
      listTeacherDocs<EvaluationRecord>('evaluations', params.teacherId),
      listTeacherDocs<StudentBadgeRecord & { teacherId?: string }>('studentBadges', params.teacherId),
    ]);

    const sessionMap = new Map(existingSessions.map((s) => [s.id, s]));
    const roomMap = new Map(existingRooms.map((r) => [r.id, r]));
    const evalIdSet = new Set(existingEvaluations.map((e) => e.id));
    const badgeKeySet = new Set(existingBadges.map((b) => b.id));

    for (const c of params.classes) {
      await setDoc(
        doc(db, 'classes', c.id),
        {
          id: c.id,
          teacherId: params.teacherId,
          name: c.name.slice(0, 100),
          classCode: c.classCode.toUpperCase().replace(/\s+/g, '').slice(0, 24),
          passingGrade: Number(c.passingGrade ?? 75),
          studentCount: Number(c.studentCount ?? 0),
          createdAt: c.createdAt,
        },
        { merge: true }
      );
    }

    for (const s of params.students) {
      await setDoc(
        doc(db, 'students', s.id),
        {
          id: s.id,
          teacherId: params.teacherId,
          classId: s.classId,
          fullName: s.fullName.slice(0, 120),
          studentCode: s.studentCode.toUpperCase().replace(/\s+/g, '').slice(0, 24),
          avatarId: s.avatarId,
          totalStars: Math.min(100, Math.max(0, Number(s.totalStars ?? 0))),
          unlockedLevel: Math.min(6, Math.max(1, Number(s.unlockedLevel ?? 1))),
          createdAt: s.createdAt,
        },
        { merge: true }
      );
    }

    for (const gs of params.sessions) {
      const existing = sessionMap.get(gs.id);
      if (existing && existing.status === 'ended') {
        continue;
      }
      if (existing && existing.status === gs.status && existing.title === gs.title.slice(0, 160)) {
        continue;
      }
      await setDoc(
        doc(db, 'gameSessions', gs.id),
        {
          id: gs.id,
          teacherId: params.teacherId,
          classId: gs.classId,
          title: gs.title.slice(0, 160),
          levelId: Number(gs.levelId),
          topic: gs.topic.slice(0, 120),
          questionCount: Math.min(50, Math.max(1, Number(gs.questionCount ?? 10))),
          durationMinutes: Math.min(180, Math.max(1, Number(gs.durationMinutes ?? 10))),
          mode: gs.mode,
          status: gs.status,
          createdAt: gs.createdAt,
        },
        { merge: true }
      );
    }

    for (const rm of params.rooms) {
      const existing = roomMap.get(rm.id);
      if (existing && existing.status === 'ended') {
        continue;
      }
      if (existing && existing.status === rm.status) {
        continue;
      }
      await setDoc(
        doc(db, 'competitionRooms', rm.id),
        {
          id: rm.id,
          teacherId: params.teacherId,
          classId: rm.classId,
          roomCode: rm.roomCode.toUpperCase().replace(/\s+/g, '').slice(0, 24),
          status: rm.status,
          levelId: Number(rm.levelId),
          createdAt: rm.createdAt,
        },
        { merge: true }
      );
    }

    for (const ev of params.evaluations) {
      if (evalIdSet.has(ev.id)) {
        continue;
      }
      await setDoc(doc(db, 'evaluations', ev.id), {
        id: ev.id,
        teacherId: params.teacherId,
        classId: ev.classId,
        studentId: ev.studentId,
        studentName: ev.studentName.slice(0, 120),
        levelId: Number(ev.levelId),
        levelName: ev.levelName.slice(0, 120),
        totalQuestions: Number(ev.totalQuestions),
        correctCount: Number(ev.correctCount),
        wrongCount: Number(ev.wrongCount),
        score: Number(ev.score),
        starsEarned: Number(ev.starsEarned),
        durationSeconds: Number(ev.durationSeconds),
        isPassed: Boolean(ev.isPassed),
        executedAt: ev.executedAt,
      });
    }

    for (const b of params.badges) {
      const key = `${b.studentId}_${b.badgeId}`;
      if (badgeKeySet.has(key)) {
        continue;
      }
      await setDoc(doc(db, 'studentBadges', key), {
        id: b.id,
        teacherId: params.teacherId,
        studentId: b.studentId,
        badgeId: b.badgeId,
        unlockedAt: b.unlockedAt,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workspace-sync');
  }
}
