// apps/frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

// 토큰 헬퍼
function getAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('lf_token') : null
}

// api.ts에 추가
export type Role = "SEEKER" | "FINDER";

export async function register(body: { email: string; phone: string; password: string; role?: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true }>;
}

/** 내 통계 조회 */
export async function getMyStats() {
  return api<any>('/me/stats');
}

/** 내 활동 목록 조회 */
export async function getMyActivities(limit = 100) {
  return api<any[]>(`/me/activities?limit=${limit}`);
}

/** 내 등록 목록 조회 */
export async function getMyItems() {
  return api<any>('/me/items');
}

/** 내 프로필 조회 */
export async function getMyProfile() {
  return api<any>('/me/profile');
}


/** 기본 fetch wrapper */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (!res.ok) {
    // 401이면 저장된 토큰을 지우고 재로그인을 유도
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lf_token')
        sessionStorage.removeItem('lf_token')
      } catch {}
    }
    throw new Error(await res.text())
  }
  return res.json() as Promise<T>
}

/** 로그인 요청 */
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }), // ← JSON body 필수
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ access_token: string }>
}

/** 사진 업로드 */
export async function uploadPhotos(files: File[], exifJsons: string[]) {
  const fd = new FormData()
  files.forEach((f) => fd.append('photos', f))
  exifJsons.forEach((j) => fd.append('exif_jsons', j))

  const token = getAuthToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/items/photos`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: fd,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ photos: { url: string; exif_json?: string }[] }>
}

/** 아이템 등록 */
export async function createItem(body: any) {
  const token = getAuthToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: number; status: string }>
}

/** 반환 요청 생성 (SEEKER) */
export async function createClaim(itemId: number, memo?: string) {
  return api<{ id: number; status: string; message: string }>('/claims/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, memo }),
  })
}

/** 아이템 삭제 (FINDER - 소유자만) */
export async function deleteItem(itemId: number) {
  return api<{ ok: boolean }>(`/items/${itemId}`, {
    method: 'DELETE',
  })
}

/** 아이템 상태 변경 (FINDER - 소유자만) */
export async function updateItemStatus(itemId: number, status: string) {
  return api<{ id: number; status: string }>(`/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}
