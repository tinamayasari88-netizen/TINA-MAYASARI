import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth, restoreTeacherWorkspaceFromCloud } from './firebase';
import { StudentAuthView, TeacherAuthView } from './components/AuthModals';
import { ArcadeHubView } from './components/ArcadeHubView';
import { CoverPage } from './components/CoverPage';
import { GameplayArena } from './components/GameplayArena';
import { LandingPage } from './components/LandingPage';
import { StudentAdventureHub } from './components/StudentAdventureHub';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  LEVELS,
  type CompetitionRoomRecord,
  type GameType,
  type LevelConfig,
  type StudentRecord,
  type TeacherUser,
} from './shared/levels';
import {
  apiFetch,
  clearStudentToken,
  clearTeacherToken,
  setStudentToken,
  setTeacherToken,
} from './utils/authSession';
import {
  cacheStudentProfile,
  flushOfflineEvaluations,
  getCachedStudentProfile,
} from './utils/offlineSync';

type AppView =
  | 'cover'
  | 'landing'
  | 'teacher-auth'
  | 'student-auth'
  | 'teacher-dashboard'
  | 'student-hub'
  | 'arcade-hub'
  | 'gameplay';

interface ActivePlayState {
  mode: 'adventure' | 'session' | 'competition';
  level: LevelConfig;
  gameType?: GameType;
  sessionId?: string;
  durationMinutes?: number;
  room?: CompetitionRoomRecord;
  alreadyFinished?: boolean;
}

export default function App() {
  const [view, setView] = useState<AppView>('cover');
  const [authBackView, setAuthBackView] = useState<'cover' | 'landing'>('landing');
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [activePlay, setActivePlay] = useState<ActivePlayState | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [hydrated, setHydrated] = useState(false);

  // Track online/offline & automatically sync offline evaluations when back online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineEvaluations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hydrate persistent sessions on reload
  useEffect(() => {
    async function waitForFirebaseUser(): Promise<FirebaseUser | null> {
      if (auth.currentUser) return auth.currentUser;
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          unsub();
          resolve(auth.currentUser);
        }, 1200);
        const unsub = onAuthStateChanged(auth, (u) => {
          window.clearTimeout(timer);
          unsub();
          resolve(u);
        });
      });
    }

    async function hydrate() {
      try {
        const [tRes, sRes] = await Promise.all([
          apiFetch('/api/auth/teacher/me'),
          apiFetch('/api/auth/student/me'),
        ]);
        if (tRes.ok) {
          const td = (await tRes.json()) as { teacher?: TeacherUser; token?: string };
          if (td.token) setTeacherToken(td.token);
          if (td.teacher) {
            setTeacher(td.teacher);
            waitForFirebaseUser()
              .then((fbUser) => {
                if (fbUser && fbUser.uid === td.teacher!.id) {
                  restoreTeacherWorkspaceFromCloud(td.teacher!.id).catch(() => {});
                }
              })
              .catch(() => {});
          }
        } else if (tRes.status === 401) {
          clearTeacherToken();
          // If Firebase Google Sign-In is still active, re-establish backend teacher session seamlessly
          const fbUser = await waitForFirebaseUser();
          if (fbUser?.email) {
            const gRes = await apiFetch('/api/auth/teacher/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: fbUser.uid,
                email: fbUser.email,
                name: fbUser.displayName || fbUser.email.split('@')[0],
              }),
            });
            if (gRes.ok) {
              const gd = (await gRes.json()) as { teacher?: TeacherUser; token?: string };
              if (gd.token) setTeacherToken(gd.token);
              if (gd.teacher) {
                setTeacher(gd.teacher);
                if (gd.teacher.id === fbUser.uid) {
                  await restoreTeacherWorkspaceFromCloud(gd.teacher.id).catch(() => {});
                }
              }
            }
          }
        }
        if (sRes.ok) {
          const sd = (await sRes.json()) as { student?: StudentRecord; token?: string };
          if (sd.token) setStudentToken(sd.token);
          if (sd.student) {
            setStudent(sd.student);
            cacheStudentProfile(sd.student);
            flushOfflineEvaluations();
          }
        } else if (sRes.status === 401) {
          clearStudentToken();
        }
      } catch {
        // Offline fallback: restore student profile from local cache
        const cachedStudent = getCachedStudentProfile();
        if (cachedStudent) {
          setStudent(cachedStudent);
        }
      } finally {
        setHydrated(true);
      }
    }
    hydrate();
  }, []);

  const handleTeacherLogout = async () => {
    await apiFetch('/api/auth/teacher/logout', { method: 'POST' }).catch(() => {});
    clearTeacherToken();
    await signOut(auth).catch(() => {});
    setTeacher(null);
    setView('landing');
  };

  const handleStudentLogout = async () => {
    await apiFetch('/api/auth/student/logout', { method: 'POST' }).catch(() => {});
    clearStudentToken();
    localStorage.removeItem('ia_cached_student_profile');
    setStudent(null);
    setActivePlay(null);
    setView('landing');
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        Memuat INTEGER ADVENTURE...
      </div>
    );
  }

  if (view === 'cover') {
    return (
      <CoverPage
        teacherLoggedIn={Boolean(teacher)}
        studentLoggedIn={Boolean(student)}
        onEnterDashboard={() => setView('landing')}
        onOpenStudentLogin={() => {
          if (student) {
            setView('student-hub');
          } else {
            setAuthBackView('cover');
            setView('student-auth');
          }
        }}
        onOpenTeacherLogin={() => {
          if (teacher) {
            setView('teacher-dashboard');
          } else {
            setAuthBackView('cover');
            setView('teacher-auth');
          }
        }}
      />
    );
  }

  if (view === 'teacher-auth') {
    return (
      <TeacherAuthView
        onClose={() => setView(authBackView)}
        onSuccess={(t) => {
          setTeacher(t);
          setView('teacher-dashboard');
        }}
      />
    );
  }

  if (view === 'student-auth') {
    return (
      <StudentAuthView
        onClose={() => setView(authBackView)}
        onSuccess={(s) => {
          setStudent(s);
          cacheStudentProfile(s);
          setView('student-hub');
        }}
      />
    );
  }

  if (view === 'teacher-dashboard' && teacher) {
    return (
      <TeacherDashboard
        teacher={teacher}
        onLogout={handleTeacherLogout}
        onBackHome={() => setView('landing')}
        onBackCover={() => setView('cover')}
        onSessionExpired={() => {
          clearTeacherToken();
          setTeacher(null);
          setAuthBackView('landing');
          setView('teacher-auth');
        }}
      />
    );
  }

  if (view === 'gameplay' && student && activePlay) {
    return (
      <GameplayArena
        student={student}
        mode={activePlay.mode}
        level={activePlay.level}
        gameType={activePlay.gameType}
        sessionId={activePlay.sessionId}
        durationMinutes={activePlay.durationMinutes}
        initialRoom={activePlay.room}
        alreadyFinishedCompetition={activePlay.alreadyFinished}
        isOnline={isOnline}
        onExit={() => {
          setActivePlay(null);
          setView('student-hub');
        }}
        onStudentProgressUpdated={(unlockedLevel, totalStars) => {
          const updated = { ...student, unlockedLevel, totalStars };
          setStudent(updated);
          cacheStudentProfile(updated);
        }}
      />
    );
  }

  if (view === 'arcade-hub' && student) {
    return (
      <ArcadeHubView
        student={student}
        onBackToAdventure={() => setView('student-hub')}
        onLogout={handleStudentLogout}
      />
    );
  }

  if (view === 'student-hub' && student) {
    return (
      <StudentAdventureHub
        student={student}
        isOnline={isOnline}
        onUpdateStudent={(s) => {
          setStudent(s);
          cacheStudentProfile(s);
        }}
        onOpenArcade={() => setView('arcade-hub')}
        onStartAdventureLevel={(level, gameType) => {
          setActivePlay({ mode: 'adventure', level, gameType });
          setView('gameplay');
        }}
        onStartTeacherSession={(sess) => {
          const lvl = LEVELS.find((l) => l.id === sess.levelId) || LEVELS[0];
          setActivePlay({
            mode: 'session',
            level: lvl,
            sessionId: sess.id,
            durationMinutes: sess.durationMinutes,
          });
          setView('gameplay');
        }}
        onJoinCompetitionRoom={(room, alreadyFinished) => {
          const lvl = LEVELS.find((l) => l.id === room.levelId) || LEVELS[0];
          setActivePlay({
            mode: 'competition',
            level: lvl,
            sessionId: room.sessionId,
            durationMinutes: room.durationMinutes,
            room,
            alreadyFinished,
          });
          setView('gameplay');
        }}
        onLogout={handleStudentLogout}
        onBackHome={() => setView('landing')}
        onBackCover={() => setView('cover')}
      />
    );
  }

  return (
    <LandingPage
      onOpenCover={() => setView('cover')}
      onOpenTeacherAuth={() => {
        setAuthBackView('landing');
        setView('teacher-auth');
      }}
      onOpenStudentAuth={() => {
        setAuthBackView('landing');
        setView('student-auth');
      }}
      teacherLoggedIn={Boolean(teacher)}
      studentLoggedIn={Boolean(student)}
      onGoTeacherDashboard={() => setView('teacher-dashboard')}
      onGoStudentHub={() => setView('student-hub')}
    />
  );
}
