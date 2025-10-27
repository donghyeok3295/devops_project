export function getToken() {
  if (typeof window === 'undefined') return null;
  // 너가 쓰는 키 이름으로 맞춰줘
  return (
    localStorage.getItem('lf_token') ||
    sessionStorage.getItem('lf_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')
  );
}

export async function getJSON<T>(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE || '';
  const url = `${base}${path}`;
  const token = getToken();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include', // 필요 없으면 지워도 됨
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}
