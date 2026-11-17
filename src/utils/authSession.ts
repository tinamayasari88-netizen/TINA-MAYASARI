const TEACHER_TOKEN_KEY = 'ia_teacher_token';
const STUDENT_TOKEN_KEY = 'ia_student_token';

export function getTeacherToken(): string | null {
  try {
    return localStorage.getItem(TEACHER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTeacherToken(token: string | null | undefined) {
  try {
    if (token) {
      localStorage.setItem(TEACHER_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TEACHER_TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearTeacherToken() {
  setTeacherToken(null);
}

export function getStudentToken(): string | null {
  try {
    return localStorage.getItem(STUDENT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStudentToken(token: string | null | undefined) {
  try {
    if (token) {
      localStorage.setItem(STUDENT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearStudentToken() {
  setStudentToken(null);
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const isSameOriginApi =
    urlStr.startsWith('/api/') ||
    (typeof window !== 'undefined' && urlStr.startsWith(`${window.location.origin}/api/`));

  if (!isSameOriginApi) {
    return globalThis.fetch(input, init);
  }

  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined)
  );

  const teacherToken = getTeacherToken();
  const studentToken = getStudentToken();

  if (teacherToken && !headers.has('X-Teacher-Token')) {
    headers.set('X-Teacher-Token', teacherToken);
  }
  if (studentToken && !headers.has('X-Student-Token')) {
    headers.set('X-Student-Token', studentToken);
  }

  return globalThis.fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
  });
}
