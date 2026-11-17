import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  Compass,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  LEVELS,
  getAvatarImage,
  type ClassRoom,
  type CompetitionRoomRecord,
  type EvaluationRecord,
  type GameSessionRecord,
  type StudentRecord,
  type TeacherUser,
} from '../shared/levels';
import { getBadgeDefinition, type StudentBadgeRecord } from '../shared/badges';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  deleteClassFromFirestore,
  deleteCompetitionRoomFromFirestore,
  deleteSessionFromFirestore,
  deleteStudentFromFirestore,
  restoreTeacherWorkspaceFromCloud,
  syncWorkspaceSnapshotToFirestore,
} from '../firebase';
import { apiFetch, setTeacherToken } from '../utils/authSession';
import {
  downloadEvaluationExcel,
  downloadEvaluationPDF,
  formatDateId,
  formatDuration,
} from '../utils/exportReports';
import { AppSignature } from './AppSignature';

type TabKey = 'overview' | 'classes' | 'students' | 'sessions' | 'evaluations';

interface TeacherDashboardProps {
  teacher: TeacherUser;
  onLogout: () => void;
  onBackHome: () => void;
  onBackCover?: () => void;
  onSessionExpired?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacher,
  onLogout,
  onBackHome,
  onBackCover,
  onSessionExpired,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [sessions, setSessions] = useState<GameSessionRecord[]>([]);
  const [rooms, setRooms] = useState<CompetitionRoomRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const hasRestoredCloudRef = useRef(false);

  // Class forms & modals
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(75);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deleteClassConfirm, setDeleteClassConfirm] = useState<ClassRoom | null>(null);

  // Student forms & modals
  const [studentFilterClassId, setStudentFilterClassId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState<'boy' | 'girl' | 'owl'>('boy');
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deleteStudentConfirm, setDeleteStudentConfirm] = useState<StudentRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [importNamesText, setImportNamesText] = useState('');

  // Game Session & Competition form
  const [sessClassId, setSessClassId] = useState('');
  const [sessLevelId, setSessLevelId] = useState(1);
  const [sessTitle, setSessTitle] = useState('');
  const [sessQuestionCount, setSessQuestionCount] = useState(10);
  const [sessDuration, setSessDuration] = useState(10);
  const [sessMode, setSessMode] = useState<'competition' | 'evaluation' | 'practice'>('competition');
  const [sessAllowRetry, setSessAllowRetry] = useState(false);
  const [deleteRoomConfirm, setDeleteRoomConfirm] = useState<CompetitionRoomRecord | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Evaluation filters & detail modal
  const [evalClassFilter, setEvalClassFilter] = useState('');
  const [evalLevelFilter, setEvalLevelFilter] = useState('');
  const [evalDateFrom, setEvalDateFrom] = useState('');
  const [evalDateTo, setEvalDateTo] = useState('');
  const [detailEval, setDetailEval] = useState<EvaluationRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  };

  const tryRecoverSession = async (): Promise<boolean> => {
    const fbUser = auth.currentUser;
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
        const gd = (await gRes.json()) as { token?: string };
        if (gd.token) setTeacherToken(gd.token);
        return true;
      }
    }
    return false;
  };

  const fetchAllData = async (retryOn401 = true) => {
    setLoading(true);
    try {
      if (auth.currentUser && auth.currentUser.uid === teacher.id && !hasRestoredCloudRef.current) {
        hasRestoredCloudRef.current = true;
        const restored = await restoreTeacherWorkspaceFromCloud(teacher.id).catch(() => ({
          restoredCount: 0,
        }));
        if (restored.restoredCount > 0) {
          showToast('Data kelas & siswa dari cloud berhasil dipulihkan!');
        }
      }

      const [clsRes, stuRes, sessRes, evalRes, badgeRes] = await Promise.all([
        apiFetch('/api/teacher/classes'),
        apiFetch('/api/teacher/students'),
        apiFetch('/api/teacher/sessions'),
        apiFetch('/api/teacher/evaluations'),
        apiFetch('/api/teacher/badges'),
      ]);

      if (
        clsRes.status === 401 ||
        stuRes.status === 401 ||
        sessRes.status === 401 ||
        evalRes.status === 401
      ) {
        if (retryOn401 && (await tryRecoverSession())) {
          await fetchAllData(false);
          return;
        }
        onSessionExpired?.();
        return;
      }

      let nextClasses: ClassRoom[] = [];
      let nextStudents: StudentRecord[] = [];
      let nextSessions: GameSessionRecord[] = [];
      let nextRooms: CompetitionRoomRecord[] = [];
      let nextEvaluations: EvaluationRecord[] = [];
      let nextBadges: (StudentBadgeRecord & { teacherId?: string })[] = [];

      if (clsRes.ok) {
        const d = (await clsRes.json()) as { classes: ClassRoom[] };
        nextClasses = d.classes;
        setClasses(d.classes);
        if (d.classes.length > 0) {
          setNewStudentClassId((prev) => prev || d.classes[0].id);
          setImportClassId((prev) => prev || d.classes[0].id);
          setSessClassId((prev) => prev || d.classes[0].id);
        }
      }
      if (stuRes.ok) {
        const d = (await stuRes.json()) as { students: StudentRecord[] };
        nextStudents = d.students;
        setStudents(d.students);
      }
      if (sessRes.ok) {
        const d = (await sessRes.json()) as {
          sessions: GameSessionRecord[];
          rooms: CompetitionRoomRecord[];
        };
        nextSessions = d.sessions;
        nextRooms = d.rooms;
        setSessions(d.sessions);
        setRooms(d.rooms);
      }
      if (evalRes.ok) {
        const d = (await evalRes.json()) as { evaluations: EvaluationRecord[] };
        nextEvaluations = d.evaluations;
        setEvaluations(d.evaluations);
      }
      if (badgeRes.ok) {
        const d = (await badgeRes.json()) as { badges: (StudentBadgeRecord & { teacherId?: string })[] };
        nextBadges = d.badges;
      }

      if (auth.currentUser && auth.currentUser.uid === teacher.id) {
        syncWorkspaceSnapshotToFirestore({
          teacherId: teacher.id,
          classes: nextClasses,
          students: nextStudents,
          sessions: nextSessions,
          rooms: nextRooms,
          evaluations: nextEvaluations,
          badges: nextBadges,
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasRestoredCloudRef.current = false;
    fetchAllData();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.uid === teacher.id) {
        fetchAllData();
      }
    });
    return () => unsub();
  }, [teacher.id]);

  // Subscribe to WebSocket updates for active/waiting competition rooms
  useEffect(() => {
    const activeRooms = rooms.filter((r) => r.status !== 'ended');
    if (activeRooms.length === 0) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const sockets: WebSocket[] = [];

    for (const r of activeRooms) {
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', roomId: r.id }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type?: string; room?: CompetitionRoomRecord };
          if (msg.type === 'room_state' && msg.room) {
            setRooms((prev) => prev.map((item) => (item.id === msg.room!.id ? msg.room! : item)));
            // Refresh evaluations if someone finished
            if (msg.room.participants.some((p) => p.status === 'finished')) {
              apiFetch('/api/teacher/evaluations')
                .then((res) => res.json())
                .then((d: { evaluations?: EvaluationRecord[] }) => {
                  if (d.evaluations) setEvaluations(d.evaluations);
                })
                .catch(() => {});
            }
          }
        } catch {
          // ignore
        }
      };
      sockets.push(ws);
    }

    return () => {
      sockets.forEach((ws) => ws.close());
    };
  }, [rooms.map((r) => `${r.id}:${r.status}`).join(',')]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      if (evalClassFilter && ev.classId !== evalClassFilter) return false;
      if (evalLevelFilter && ev.levelId !== Number(evalLevelFilter)) return false;
      const evDate = ev.executedAt.slice(0, 10);
      if (evalDateFrom && evDate < evalDateFrom) return false;
      if (evalDateTo && evDate > evalDateTo) return false;
      return true;
    });
  }, [evaluations, evalClassFilter, evalLevelFilter, evalDateFrom, evalDateTo]);

  // Summary KPIs
  const overviewMetrics = useMemo(() => {
    const evaluatedStudentIds = new Set(evaluations.map((e) => e.studentId));
    const avgScore =
      evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;
    const competitionCount = rooms.length;
    return {
      totalClasses: classes.length,
      totalStudents: students.length,
      totalSessions: sessions.length,
      evaluatedStudents: evaluatedStudentIds.size,
      avgScore,
      competitionCount,
    };
  }, [classes, students, sessions, evaluations, rooms]);

  const evalSummary = useMemo(() => {
    const list = filteredEvaluations;
    if (list.length === 0) {
      return {
        highestStudent: null as EvaluationRecord | null,
        passedCount: 0,
        notPassedCount: 0,
        avgScore: 0,
        passRate: 0,
      };
    }
    const sorted = [...list].sort((a, b) => b.score - a.score);
    const passedCount = list.filter((e) => e.isPassed).length;
    const avgScore = list.reduce((sum, e) => sum + e.score, 0) / list.length;
    return {
      highestStudent: sorted[0],
      passedCount,
      notPassedCount: list.length - passedCount,
      avgScore,
      passRate: (passedCount / list.length) * 100,
    };
  }, [filteredEvaluations]);

  // Score Progression Chart Data (average per Level 1-6)
  const levelChartData = useMemo(() => {
    return LEVELS.map((lvl) => {
      const items = evaluations.filter((e) => e.levelId === lvl.id);
      const avg = items.length > 0 ? items.reduce((s, e) => s + e.score, 0) / items.length : 0;
      return {
        levelId: lvl.id,
        label: `L${lvl.id}`,
        title: lvl.title,
        avg: Math.round(avg),
        count: items.length,
      };
    });
  }, [evaluations]);

  // Handlers: Classes
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const res = await apiFetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName.trim(), passingGrade: newClassGrade }),
    });
    const data = (await res.json()) as { classroom?: ClassRoom; error?: string };
    if (!res.ok) {
      showToast(data.error || 'Gagal menambah kelas.');
      return;
    }
    setNewClassName('');
    showToast(`Kelas "${data.classroom?.name}" berhasil ditambahkan (Kode: ${data.classroom?.classCode}).`);
    fetchAllData();
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const res = await apiFetch(`/api/teacher/classes/${editingClass.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingClass.name, passingGrade: editingClass.passingGrade }),
    });
    if (res.ok) {
      setEditingClass(null);
      showToast('Data kelas diperbarui.');
      fetchAllData();
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteClassConfirm) return;
    const deletedId = deleteClassConfirm.id;
    const res = await apiFetch(`/api/teacher/classes/${deletedId}`, { method: 'DELETE' });
    if (res.ok) {
      deleteClassFromFirestore(deletedId).catch(() => {});
      setDeleteClassConfirm(null);
      showToast('Kelas berhasil dihapus.');
      fetchAllData();
    }
  };

  // Handlers: Students
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentClassId || !newStudentName.trim()) return;
    const res = await apiFetch('/api/teacher/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: newStudentClassId,
        fullName: newStudentName.trim(),
        avatarId: newStudentAvatar,
      }),
    });
    const data = (await res.json()) as { student?: StudentRecord; error?: string };
    if (!res.ok) {
      showToast(data.error || 'Gagal menambah siswa.');
      return;
    }
    setNewStudentName('');
    showToast(
      `Siswa "${data.student?.fullName}" ditambahkan · Kode Kelas: ${data.student?.classCode} · Kode Siswa: ${data.student?.studentCode}`
    );
    fetchAllData();
  };

  const handleBulkImportStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = importNamesText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!importClassId || names.length === 0) return;

    const res = await apiFetch('/api/teacher/students/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: importClassId, names }),
    });
    const data = (await res.json()) as { importedCount?: number; error?: string };
    if (!res.ok) {
      showToast(data.error || 'Gagal mengimpor siswa.');
      return;
    }
    setShowImportModal(false);
    setImportNamesText('');
    showToast(`${data.importedCount} siswa berhasil diimpor dengan kode otomatis.`);
    fetchAllData();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportNamesText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const res = await apiFetch(`/api/teacher/students/${editingStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: editingStudent.fullName, avatarId: editingStudent.avatarId }),
    });
    if (res.ok) {
      setEditingStudent(null);
      showToast('Data siswa diperbarui.');
      fetchAllData();
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudentConfirm) return;
    const deletedId = deleteStudentConfirm.id;
    const res = await apiFetch(`/api/teacher/students/${deletedId}`, { method: 'DELETE' });
    if (res.ok) {
      deleteStudentFromFirestore(deletedId).catch(() => {});
      setDeleteStudentConfirm(null);
      showToast('Data siswa dihapus.');
      fetchAllData();
    }
  };

  // Handlers: Sessions & Competitions
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessClassId) {
      showToast('Buat kelas terlebih dahulu sebelum membuat sesi permainan.');
      return;
    }
    const res = await apiFetch('/api/teacher/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: sessClassId,
        levelId: sessLevelId,
        title: sessTitle.trim(),
        questionCount: sessQuestionCount,
        durationMinutes: sessDuration,
        mode: sessMode,
        allowRetry: sessAllowRetry,
      }),
    });
    const data = (await res.json()) as {
      session?: GameSessionRecord;
      room?: CompetitionRoomRecord;
      error?: string;
    };
    if (!res.ok) {
      showToast(data.error || 'Gagal membuat sesi permainan.');
      return;
    }
    setSessTitle('');
    showToast(
      data.room
        ? `Ruang kompetisi dibuat! Kode Ruang: ${data.room.roomCode}`
        : `Sesi permainan "${data.session?.title}" berhasil dibuat.`
    );
    fetchAllData();
  };

  const handleStartCompetition = async (roomId: string) => {
    const res = await apiFetch(`/api/teacher/competitions/${roomId}/start`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { room: CompetitionRoomRecord };
      setRooms((prev) => prev.map((r) => (r.id === roomId ? data.room : r)));
      showToast('Kompetisi dimulai! Semua siswa di ruang tunggu mulai mengerjakan soal.');
    }
  };

  const handleEndCompetition = async (roomId: string) => {
    const res = await apiFetch(`/api/teacher/competitions/${roomId}/end`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { room: CompetitionRoomRecord };
      setRooms((prev) => prev.map((r) => (r.id === roomId ? data.room : r)));
      showToast('Sesi kompetisi telah diakhiri dan hasil akhir tersimpan.');
      fetchAllData();
    }
  };

  const handleDeleteCompetitionRoom = async () => {
    if (!deleteRoomConfirm || deletingRoom) return;
    const targetRoom = deleteRoomConfirm;
    setDeletingRoom(true);
    try {
      const res = await apiFetch(`/api/teacher/competitions/${targetRoom.id}`, { method: 'DELETE' });
      const data = (await res.json()) as {
        ok?: boolean;
        deletedRoomId?: string;
        deletedSessionId?: string;
        error?: string;
      };
      if (!res.ok) {
        showToast(data.error || 'Gagal menghapus ruang kompetisi.');
        return;
      }

      const sessionToDelete = data.deletedSessionId || targetRoom.sessionId;
      await Promise.allSettled([
        deleteCompetitionRoomFromFirestore(targetRoom.id),
        sessionToDelete ? deleteSessionFromFirestore(sessionToDelete) : Promise.resolve(),
      ]);

      setRooms((prev) => prev.filter((r) => r.id !== targetRoom.id));
      if (sessionToDelete) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete));
      }
      setDeleteRoomConfirm(null);
      showToast('Ruang kompetisi yang sudah selesai berhasil dihapus.');
      fetchAllData();
    } finally {
      setDeletingRoom(false);
    }
  };

  const handleOpenEvalDetail = async (evalId: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`/api/teacher/evaluations/${evalId}`);
      if (res.ok) {
        const data = (await res.json()) as { evaluation: EvaluationRecord };
        setDetailEval(data.evaluation);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} (${text}) disalin.`));
  };

  const visibleStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (studentFilterClassId && s.classId !== studentFilterClassId) return false;
      if (q) {
        const hay = `${s.fullName} ${s.studentCode} ${s.classCode || ''} ${s.className || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [students, studentFilterClassId, studentSearch]);

  const navItems: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Ringkasan & Grafik', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'classes', label: 'Manajemen Kelas', icon: <BookOpen className="h-4 w-4" />, count: classes.length },
    { key: 'students', label: 'Manajemen Siswa', icon: <Users className="h-4 w-4" />, count: students.length },
    { key: 'sessions', label: 'Permainan & Kompetisi', icon: <Gamepad2 className="h-4 w-4" />, count: rooms.length },
    {
      key: 'evaluations',
      label: 'Hasil Evaluasi & Laporan',
      icon: <BarChart3 className="h-4 w-4" />,
      count: evaluations.length,
    },
  ];

  const activeTabTitle = navItems.find((n) => n.key === activeTab)?.label || 'Dashboard';

  const selectedClassNameForReport = evalClassFilter
    ? classes.find((c) => c.id === evalClassFilter)?.name || 'Kelas Terpilih'
    : 'Semua Kelas';
  const selectedTopicForReport = evalLevelFilter
    ? LEVELS.find((l) => l.id === Number(evalLevelFilter))?.title || 'Materi Terpilih'
    : 'Semua Materi Level 1–6';
  const selectedDateForReport =
    evalDateFrom || evalDateTo
      ? `${evalDateFrom || 'Awal'} s.d. ${evalDateTo || 'Sekarang'}`
      : 'Semua Tanggal';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden w-68 shrink-0 flex-col border-r-2 border-slate-200/80 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onBackHome}
            className="font-display flex items-center gap-2.5 text-base font-extrabold text-blue-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_2px_0_#1d4ed8]">
              <Compass className="h-4 w-4" />
            </span>
            <span>INTEGER ADVENTURE</span>
          </button>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <img
              src="/src/assets/images/avatar_owl_mentor_1794558987496.jpg"
              alt="Mentor Guru"
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-xl border border-amber-300 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-slate-900">{teacher.name}</p>
              <p className="truncate text-[11px] text-slate-500">
                {teacher.schoolName || 'Portal Guru Matematika'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors ${
                activeTab === item.key
                  ? 'bg-blue-600 text-white shadow-[0_3px_0_#1d4ed8]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`font-mono-num text-xs font-extrabold ${
                    activeTab === item.key ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="space-y-1.5 border-t border-slate-200 p-3">
          {onBackCover && (
            <button
              type="button"
              onClick={onBackCover}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Sampul</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackHome}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Akun Guru</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex w-72 flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="font-display text-base font-extrabold text-blue-700">INTEGER ADVENTURE</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 flex-1 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold ${
                    activeTab === item.key ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            {onBackCover && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBackCover();
                }}
                className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Sampul</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackHome}
              className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Beranda</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">Dashboard Guru / {activeTabTitle}</p>
              <h1 className="font-display text-lg font-bold text-slate-900 sm:text-xl">{activeTabTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Sesi / Kompetisi</span>
            </button>
          </div>
        </header>

        {toast && (
          <div className="mx-4 mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-900 sm:mx-6">
            {toast}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">Aksi Cepat Guru</p>
                    <p className="text-xs text-slate-500">Kelola kelas, kode siswa, kompetisi, dan laporan nilai</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Kelola Kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Kode Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-extrabold text-purple-800 hover:bg-purple-100 whitespace-nowrap"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Buat Kompetisi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('evaluations')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Laporan PDF/Excel</span>
                  </button>
                </div>
              </div>

              {/* 6 Primary KPIs */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Total Kelas</p>
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
                    {overviewMetrics.totalClasses}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Total Siswa</p>
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
                    {overviewMetrics.totalStudents}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Total Sesi</p>
                    <Gamepad2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
                    {overviewMetrics.totalSessions}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Sudah Evaluasi</p>
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-blue-700">
                    {overviewMetrics.evaluatedStudents}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Rata-rata Nilai</p>
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-purple-700">
                    {overviewMetrics.avgScore.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Kompetisi</p>
                    <Trophy className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="font-mono-num mt-2 text-2xl font-extrabold text-orange-600">
                    {overviewMetrics.competitionCount}
                  </p>
                </div>
              </div>

              {/* Empty state onboarding guide */}
              {!loading && classes.length === 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Mulai Menyiapkan Kelas Pertamamu
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Langkah cepat: 1) Buat kelas untuk mendapatkan Kode Kelas, 2) Tambahkan daftar nama siswa di kelas
                    tersebut, 3) Bagikan Kode Kelas saja agar siswa dapat langsung memilih namanya dan mulai bermain.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Buat Kelas Pertama</span>
                  </button>
                </div>
              )}

              {/* Chart & Summary Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Grafik Perkembangan Nilai per Level
                      </h2>
                      <p className="text-xs text-slate-500">Rata-rata nilai seluruh evaluasi pada Level 1 hingga Level 6</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <svg viewBox="0 0 600 220" className="w-full" aria-label="Grafik rata-rata nilai per level">
                      {[0, 25, 50, 75, 100].map((tick) => {
                        const y = 180 - (tick / 100) * 150;
                        return (
                          <g key={tick}>
                            <line x1="40" y1={y} x2="580" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                            <text x="30" y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                              {tick}
                            </text>
                          </g>
                        );
                      })}
                      {levelChartData.map((d, idx) => {
                        const barWidth = 52;
                        const x = 68 + idx * 86;
                        const barHeight = (d.avg / 100) * 150;
                        const y = 180 - barHeight;
                        const fill = ['#2563EB', '#7C3AED', '#D97706', '#0284C7', '#EA580C', '#4F46E5'][idx];
                        return (
                          <g key={d.levelId}>
                            <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} rx="6" fill={fill} />
                            <text
                              x={x + barWidth / 2}
                              y={Math.max(y - 6, 16)}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="700"
                              fill="#0F172A"
                            >
                              {d.count > 0 ? d.avg : '—'}
                            </text>
                            <text x={x + barWidth / 2} y="202" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4">
                  <h2 className="font-display text-base font-bold text-slate-900">Ringkasan Ketuntasan</h2>
                  <p className="text-xs text-slate-500">Berdasarkan seluruh hasil evaluasi tersimpan</p>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-xs font-medium text-slate-500">Nilai Tertinggi</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {evalSummary.highestStudent
                          ? `${evalSummary.highestStudent.studentName} (${evalSummary.highestStudent.score})`
                          : 'Belum ada evaluasi'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-emerald-50 p-3.5">
                        <p className="text-xs font-medium text-emerald-800">Tuntas</p>
                        <p className="font-mono-num mt-1 text-xl font-extrabold text-emerald-700">
                          {evalSummary.passedCount}
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3.5">
                        <p className="text-xs font-medium text-rose-800">Belum Tuntas</p>
                        <p className="font-mono-num mt-1 text-xl font-extrabold text-rose-700">
                          {evalSummary.notPassedCount}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3.5">
                      <p className="text-xs font-medium text-blue-800">Persentase Ketuntasan</p>
                      <p className="font-mono-num mt-1 text-2xl font-extrabold text-blue-700">
                        {evalSummary.passRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAJEMEN KELAS */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateClass} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-base font-bold text-slate-900">Tambah Kelas Baru</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700">Nama Kelas</label>
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Contoh: Kelas 7A"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700">Batas Ketuntasan (KKM)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={newClassGrade}
                      onChange={(e) => setNewClassGrade(Number(e.target.value))}
                      className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="submit"
                      className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Kelas</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.length === 0 ? (
                  <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Belum ada kelas yang terdaftar. Tambahkan kelas pertama di atas.
                  </p>
                ) : (
                  classes.map((cls) => (
                    <div key={cls.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg font-bold text-slate-900">{cls.name}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {cls.studentCount} siswa · Batas Tuntas {cls.passingGrade}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingClass({ ...cls })}
                            title="Edit Kelas"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteClassConfirm(cls)}
                            title="Hapus Kelas"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Kode Kelas</p>
                          <p className="font-mono-num text-base font-extrabold text-blue-700">{cls.classCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(cls.classCode, 'Kode Kelas')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          <span>Salin</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN SISWA */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-base font-bold text-slate-900">Tambah Siswa Baru</h2>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Impor Daftar Siswa</span>
                  </button>
                </div>

                <form onSubmit={handleCreateStudent} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700">Pilih Kelas</label>
                    <select
                      required
                      value={newStudentClassId}
                      onChange={(e) => setNewStudentClassId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.classCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700">Nama Lengkap Siswa</label>
                    <input
                      type="text"
                      required
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="Contoh: Ahmad Pratama"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Karakter Awal</label>
                    <select
                      value={newStudentAvatar}
                      onChange={(e) => setNewStudentAvatar(e.target.value as 'boy' | 'girl' | 'owl')}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      <option value="boy">Penjelajah</option>
                      <option value="girl">Cendekia</option>
                      <option value="owl">Burung Hantu</option>
                    </select>
                  </div>
                  <div className="flex items-end sm:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Daftar Siswa ({visibleStudents.length})
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="search"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Cari nama atau kode..."
                        className="w-48 rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-xs font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none sm:w-56"
                      />
                    </div>
                    <select
                      value={studentFilterClassId}
                      onChange={(e) => setStudentFilterClassId(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="">Semua Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 pr-3">ID</th>
                        <th className="py-2.5 px-3">Nama Lengkap</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Kode Kelas</th>
                        <th className="py-2.5 px-3">Kode Siswa</th>
                        <th className="py-2.5 px-3 text-right">Bintang</th>
                        <th className="py-2.5 px-3">Lencana</th>
                        <th className="py-2.5 pl-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                            Belum ada siswa. Tambahkan siswa atau pilih kelas yang berbeda.
                          </td>
                        </tr>
                      ) : (
                        visibleStudents.map((stu) => (
                          <tr key={stu.id} className="hover:bg-slate-50">
                            <td className="font-mono-num py-3 pr-3 text-xs text-slate-400">
                              {stu.id.slice(0, 8)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={getAvatarImage(stu.avatarId)}
                                  alt={stu.fullName}
                                  referrerPolicy="no-referrer"
                                  className="h-8 w-8 rounded-lg object-cover"
                                />
                                <span className="font-semibold text-slate-900">{stu.fullName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-700">{stu.className}</td>
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => copyText(stu.classCode || '', 'Kode Kelas')}
                                className="font-mono-num inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                <span>{stu.classCode}</span>
                                <ClipboardCopy className="h-3 w-3" />
                              </button>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyText(stu.studentCode, 'Kode Siswa')}
                                  className="font-mono-num inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  <span>{stu.studentCode}</span>
                                  <ClipboardCopy className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(
                                      `Kode Kelas: ${stu.classCode} | Kode Siswa: ${stu.studentCode}`,
                                      'Info Login Siswa'
                                    )
                                  }
                                  title="Salin Kode Kelas & Kode Siswa"
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                  Salin Pasangan
                                </button>
                              </div>
                            </td>
                            <td className="font-mono-num py-3 px-3 text-right font-bold text-amber-600">
                              {stu.totalStars}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-600">
                              {stu.badges && stu.badges.length > 0 ? (
                                <span
                                  title={stu.badges
                                    .map((b) => getBadgeDefinition(b.badgeId)?.name || b.badgeId)
                                    .join(', ')}
                                  className="font-semibold text-purple-700"
                                >
                                  {stu.badges.length} Lencana
                                  <span className="block max-w-[160px] truncate text-[11px] font-normal text-slate-500">
                                    {stu.badges
                                      .map((b) => getBadgeDefinition(b.badgeId)?.name || b.badgeId)
                                      .join(', ')}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 pl-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingStudent({ ...stu })}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                  title="Edit Siswa"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteStudentConfirm(stu)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                  title="Hapus Siswa"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERMAINAN & KOMPETISI */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateSession} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Buat Sesi Permainan / Ruang Kompetisi
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700">Kelas Peserta</label>
                    <select
                      required
                      value={sessClassId}
                      onChange={(e) => setSessClassId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700">Materi Level</label>
                    <select
                      value={sessLevelId}
                      onChange={(e) => setSessLevelId(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                    >
                      {LEVELS.map((l) => (
                        <option key={l.id} value={l.id}>
                          Level {l.id}: {l.title} ({l.subtitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700">Mode Permainan</label>
                    <select
                      value={sessMode}
                      onChange={(e) => setSessMode(e.target.value as 'competition' | 'evaluation' | 'practice')}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                    >
                      <option value="competition">Kompetisi Kelas (Kode Ruang Live)</option>
                      <option value="evaluation">Sesi Evaluasi Kelas</option>
                      <option value="practice">Latihan Terbimbing</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700">Judul Sesi (Opsional)</label>
                    <input
                      type="text"
                      value={sessTitle}
                      onChange={(e) => setSessTitle(e.target.value)}
                      placeholder="Contoh: Kuis Cepat Bilangan Bulat 7A"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Jumlah Soal</label>
                    <input
                      type="number"
                      min={5}
                      max={20}
                      value={sessQuestionCount}
                      onChange={(e) => setSessQuestionCount(Number(e.target.value))}
                      className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Durasi (Menit)</label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={sessDuration}
                      onChange={(e) => setSessDuration(Number(e.target.value))}
                      className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="submit"
                      className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-bold text-white hover:bg-purple-700"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Buat Sesi</span>
                    </button>
                  </div>
                </div>

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={sessAllowRetry}
                    onChange={(e) => setSessAllowRetry(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-purple-600"
                  />
                  <span>Izinkan siswa mengirim ulang hasil (percobaan ulang) pada sesi ini</span>
                </label>
              </form>

              {/* Live Competition Rooms */}
              <div className="space-y-4">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Ruang Kompetisi Kelas ({rooms.length})
                </h2>

                {rooms.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Belum ada ruang kompetisi. Buat sesi dengan mode "Kompetisi Kelas" untuk mendapatkan kode ruang.
                  </p>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="text-purple-700">{room.className}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-600">{room.topic}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                room.status === 'active'
                                  ? 'text-emerald-700'
                                  : room.status === 'waiting'
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                              }
                            >
                              {room.status === 'waiting'
                                ? 'Menunggu Peserta'
                                : room.status === 'active'
                                  ? 'Kompetisi Berlangsung'
                                  : 'Selesai'}
                            </span>
                          </div>
                          <h3 className="font-display mt-1 text-lg font-bold text-slate-900">{room.title}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => copyText(room.roomCode, 'Kode Ruang')}
                            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-extrabold text-purple-800 hover:bg-purple-100"
                          >
                            <span className="font-mono-num">{room.roomCode}</span>
                            <ClipboardCopy className="h-4 w-4" />
                          </button>

                          {room.status === 'waiting' && (
                            <button
                              type="button"
                              onClick={() => handleStartCompetition(room.id)}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                              <Play className="h-4 w-4" />
                              <span>MULAI KOMPETISI</span>
                            </button>
                          )}

                          {room.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleEndCompetition(room.id)}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
                            >
                              <Square className="h-4 w-4" />
                              <span>AKHIRI SESI</span>
                            </button>
                          )}

                          {room.status === 'ended' && (
                            <button
                              type="button"
                              onClick={() => setDeleteRoomConfirm(room)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Hapus Kompetisi</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-bold text-slate-600">
                          Peserta Bergabung &amp; Leaderboard ({room.participants.length} siswa)
                        </p>
                        {room.participants.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Bagikan kode <strong>{room.roomCode}</strong> kepada siswa. Siswa yang bergabung akan tampil di
                            sini secara real-time.
                          </p>
                        ) : (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                                  <th className="py-2 pr-3">Peringkat</th>
                                  <th className="py-2 px-3">Nama Siswa</th>
                                  <th className="py-2 px-3">Status</th>
                                  <th className="py-2 px-3 text-right">Nilai</th>
                                  <th className="py-2 px-3 text-right">Benar</th>
                                  <th className="py-2 pl-3 text-right">Waktu</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {room.participants.map((p, idx) => (
                                  <tr key={p.id}>
                                    <td className="font-mono-num py-2.5 pr-3 font-bold text-slate-700">#{idx + 1}</td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{p.studentName}</td>
                                    <td className="py-2.5 px-3 text-xs text-slate-600">
                                      {p.status === 'finished'
                                        ? 'Selesai'
                                        : p.status === 'playing'
                                          ? 'Mengerjakan'
                                          : 'Di Ruang Tunggu'}
                                    </td>
                                    <td className="font-mono-num py-2.5 px-3 text-right font-bold text-blue-700">
                                      {p.status === 'finished' ? p.score : '—'}
                                    </td>
                                    <td className="font-mono-num py-2.5 px-3 text-right text-slate-700">
                                      {p.status === 'finished' ? p.correctCount : '—'}
                                    </td>
                                    <td className="font-mono-num py-2.5 pl-3 text-right text-slate-600">
                                      {p.status === 'finished' ? formatDuration(p.durationSeconds) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: HASIL EVALUASI & LAPORAN */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              {/* Filters & Downloads */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">Filter &amp; Unduh Laporan</h2>
                    <p className="text-xs text-slate-500">
                      Semua hasil permainan &amp; evaluasi siswa tersimpan otomatis di dashboard ini.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        downloadEvaluationPDF({
                          evaluations: filteredEvaluations,
                          teacher,
                          classLabel: selectedClassNameForReport,
                          topicLabel: selectedTopicForReport,
                          dateLabel: selectedDateForReport,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      <FileText className="h-4 w-4" />
                      <span>DOWNLOAD PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadEvaluationExcel(filteredEvaluations, selectedClassNameForReport)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>DOWNLOAD EXCEL</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <select
                    value={evalClassFilter}
                    onChange={(e) => setEvalClassFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={evalLevelFilter}
                    onChange={(e) => setEvalLevelFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Semua Materi Level</option>
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        Level {l.id}: {l.title}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={evalDateFrom}
                    onChange={(e) => setEvalDateFrom(e.target.value)}
                    aria-label="Dari tanggal"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  />

                  <input
                    type="date"
                    value={evalDateTo}
                    onChange={(e) => setEvalDateTo(e.target.value)}
                    aria-label="Sampai tanggal"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Filtered Summary Strip */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Nilai Tertinggi</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                    {evalSummary.highestStudent
                      ? `${evalSummary.highestStudent.studentName} (${evalSummary.highestStudent.score})`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Siswa Tuntas</p>
                  <p className="font-mono-num mt-1 text-xl font-extrabold text-emerald-700">
                    {evalSummary.passedCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Belum Tuntas</p>
                  <p className="font-mono-num mt-1 text-xl font-extrabold text-rose-600">
                    {evalSummary.notPassedCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Rata-rata Kelas</p>
                  <p className="font-mono-num mt-1 text-xl font-extrabold text-blue-700">
                    {evalSummary.avgScore.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">% Ketuntasan</p>
                  <p className="font-mono-num mt-1 text-xl font-extrabold text-purple-700">
                    {evalSummary.passRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Evaluations Data Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 pr-3">Nama Siswa</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Materi</th>
                        <th className="py-2.5 px-3 text-right">Soal</th>
                        <th className="py-2.5 px-3 text-right">Benar / Salah</th>
                        <th className="py-2.5 px-3 text-right">Nilai</th>
                        <th className="py-2.5 px-3">Ketuntasan</th>
                        <th className="py-2.5 px-3 text-right">Waktu</th>
                        <th className="py-2.5 px-3 text-right">Tanggal</th>
                        <th className="py-2.5 pl-3 text-right">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvaluations.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-sm text-slate-500">
                            Belum ada hasil evaluasi untuk filter yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        filteredEvaluations.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50">
                            <td className="py-3 pr-3 font-semibold text-slate-900">{ev.studentName}</td>
                            <td className="py-3 px-3 text-slate-600">{ev.className}</td>
                            <td className="py-3 px-3 text-slate-700">
                              {ev.levelName}{' '}
                              <span className="text-xs text-slate-400">· #{ev.attemptNumber}</span>
                            </td>
                            <td className="font-mono-num py-3 px-3 text-right text-slate-700">{ev.totalQuestions}</td>
                            <td className="font-mono-num py-3 px-3 text-right">
                              <span className="font-semibold text-emerald-700">{ev.correctCount}</span> /{' '}
                              <span className="text-rose-600">{ev.wrongCount}</span>
                            </td>
                            <td className="font-mono-num py-3 px-3 text-right font-extrabold text-blue-700">
                              {ev.score}
                            </td>
                            <td className="py-3 px-3 text-xs font-semibold">
                              <span className={ev.isPassed ? 'text-emerald-700' : 'text-rose-600'}>
                                {ev.isPassed ? 'Tuntas' : 'Belum Tuntas'} ({ev.passPercentage.toFixed(0)}%)
                              </span>
                            </td>
                            <td className="font-mono-num py-3 px-3 text-right text-slate-600">
                              {formatDuration(ev.durationSeconds)}
                            </td>
                            <td className="py-3 px-3 text-right text-xs text-slate-500">
                              {formatDateId(ev.executedAt)}
                            </td>
                            <td className="py-3 pl-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenEvalDetail(ev.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
        <AppSignature />
      </div>

      {/* MODAL: Edit Class */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleUpdateClass} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Edit Data Kelas</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Batas Ketuntasan (KKM)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={editingClass.passingGrade}
                  onChange={(e) => setEditingClass({ ...editingClass, passingGrade: Number(e.target.value) })}
                  className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Class Confirmation */}
      {deleteClassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Hapus Kelas?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Menghapus <strong>{deleteClassConfirm.name}</strong> juga akan menghapus data siswa dan evaluasi di dalam
              kelas ini. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteClassConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteClass}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
              >
                Ya, Hapus Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Student */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleUpdateStudent} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Edit Data Siswa</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Karakter</label>
                <select
                  value={editingStudent.avatarId}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, avatarId: e.target.value as 'boy' | 'girl' | 'owl' })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                >
                  <option value="boy">Penjelajah Biru</option>
                  <option value="girl">Cendekia Ungu</option>
                  <option value="owl">Mentor Burung Hantu</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Student Confirmation */}
      {deleteStudentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Hapus Siswa?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus data siswa <strong>{deleteStudentConfirm.fullName}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteStudentConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
              >
                Hapus Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Finished Competition Room Confirmation */}
      {deleteRoomConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Hapus Ruang Kompetisi?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Ruang kompetisi <strong>{deleteRoomConfirm.title}</strong> (kode{' '}
              <span className="font-mono-num font-bold text-slate-800">{deleteRoomConfirm.roomCode}</span>) yang sudah
              selesai akan dihapus dari daftar. Riwayat nilai siswa di tab Hasil Evaluasi tetap tersimpan aman.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingRoom}
                onClick={() => setDeleteRoomConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingRoom}
                onClick={handleDeleteCompetitionRoom}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingRoom ? 'Menghapus...' : 'Ya, Hapus Kompetisi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Import Students */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleBulkImportStudents} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Impor Daftar Siswa</h3>
            <p className="mt-1 text-xs text-slate-500">
              Masukkan satu nama per baris atau unggah file CSV/TXT. Kode siswa akan dibuat otomatis.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Pilih Kelas Tujuan</label>
                <select
                  required
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Unggah File (.txt / .csv)</label>
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleImportFile}
                  className="mt-1.5 block w-full text-xs text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Daftar Nama Siswa</label>
                <textarea
                  rows={6}
                  required
                  value={importNamesText}
                  onChange={(e) => setImportNamesText(e.target.value)}
                  placeholder={'Budi Santoso\nCitra Lestari\nDimas Wijaya'}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white">
                Impor Siswa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Evaluation Detail */}
      {(detailEval || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            {loadingDetail || !detailEval ? (
              <p className="py-10 text-center text-sm text-slate-500">Memuat rincian jawaban siswa...</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-blue-700">Detail Hasil Evaluasi</p>
                    <h3 className="font-display mt-1 text-xl font-bold text-slate-900">{detailEval.studentName}</h3>
                    <p className="text-xs text-slate-500">
                      {detailEval.className} · {detailEval.levelName} · {formatDateId(detailEval.executedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailEval(null)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">Nilai</p>
                    <p className="font-mono-num text-xl font-extrabold text-blue-700">{detailEval.score}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-emerald-800">Benar</p>
                    <p className="font-mono-num text-xl font-extrabold text-emerald-700">{detailEval.correctCount}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3 text-center">
                    <p className="text-xs text-rose-800">Salah</p>
                    <p className="font-mono-num text-xl font-extrabold text-rose-600">{detailEval.wrongCount}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">Durasi</p>
                    <p className="font-mono-num text-sm font-bold text-slate-800">
                      {formatDuration(detailEval.durationSeconds)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rincian Jawaban Per Soal
                  </h4>
                  {(detailEval.answers || []).map((ans, idx) => (
                    <div
                      key={ans.questionId + idx}
                      className={`rounded-xl border p-3.5 text-sm ${
                        ans.isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {idx + 1}. {ans.questionPrompt}
                        </p>
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            ans.isCorrect ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {ans.isCorrect ? 'Benar' : 'Salah'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Jawaban Siswa: <strong className="font-mono-num">{ans.selectedAnswer}</strong> · Kunci:{' '}
                        <strong className="font-mono-num">{ans.correctAnswer}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
