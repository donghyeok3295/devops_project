'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, Image as ImageIcon, MapPin, Tag, PackagePlus } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import exifr from 'exifr'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

interface UploadResult { url: string }

/** 토큰: lf_token / token 둘 다 허용 (local/session) */
function getToken() {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem('lf_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('lf_token') ||
    sessionStorage.getItem('token')
  )
}

async function postJSON<T>(path: string, body: any, init?: RequestInit) {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
    ...init,
  })
  let json: any = null
  try { json = await res.json() } catch {}
  const location = res.headers.get('Location') || res.headers.get('location') || undefined
  return { ok: res.ok, status: res.status, json, location }
}

/** 파일 1개 업로드 (실패 시 dataURL로 대체) + EXIF GPS 파싱 */
async function uploadOne(file: File): Promise<{ url: string; exif_lat?: number; exif_lng?: number }> {
  try {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    const r = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (r.ok) {
      const j: UploadResult = await r.json()
      if (j?.url) {
        const exif = await safeExif(file)
        return { url: j.url, ...exif }
      }
    }
  } catch {}
  const dataUrl = await fileToDataURL(file)
  const exif = await safeExif(file)
  return { url: dataUrl, ...exif }
}

async function fileToDataURL(file: File): Promise<string> {
  return await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

async function safeExif(file: File): Promise<{ exif_lat?: number; exif_lng?: number }> {
  try {
    const gps = await exifr.gps(file)
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      return { exif_lat: gps.latitude, exif_lng: gps.longitude }
    }
  } catch {}
  return {}
}

/** 칩 선택 컴포넌트 */
function Pills({
  options, value, onChange, max = Infinity, disabled = false,
}: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; disabled?: boolean }) {
  return (
    <div className="pills flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return
              if (active) onChange(value.filter((v) => v !== opt))
              else if (value.length < max) onChange([...value, opt])
            }}
            className={`pill rounded-full border px-3 py-2 text-sm
              ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function ItemNewPage() {
  const router = useRouter()

  // 🔐 로그인 상태
  const [authed, setAuthed] = useState(false)
  useEffect(() => { setAuthed(!!getToken()) }, [])

  // 업로드
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const openPicker = (accept: string) => {
    inputRef.current?.setAttribute('accept', accept)
    inputRef.current?.click()
  }
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files || [])
    if (!fs.length) return
    setFiles((prev) => [...prev, ...fs].slice(0, 5))
    e.target.value = ''
    // 첫 장에서 EXIF GPS 자동 추출
    try {
      const first = fs[0]
      const gps = await safeExif(first)
      if (gps.exif_lat && gps.exif_lng && !location.lat && !location.lng) {
        setLocation({ lat: gps.exif_lat, lng: gps.exif_lng, source: 'EXIF' })
      }
    } catch {}
  }
  const removeAt = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))
  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previewUrls.forEach((u) => URL.revokeObjectURL(u)), [previewUrls])

  // 위치
  const [location, setLocation] = useState<{ lat?: number; lng?: number; source?: 'EXIF'|'GPS'|'MANUAL'; addr?: string }>({})
  const geolocate = async () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'GPS' })
    })
  }
  const manualMap = () => {
    const lat = prompt('위도(lat)를 입력하세요 (예: 37.5665)')
    const lng = prompt('경도(lng)를 입력하세요 (예: 126.9780)')
    if (lat && lng) setLocation({ lat: Number(lat), lng: Number(lng), source: 'MANUAL' })
  }

  // 폼 상태
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [colors, setColors] = useState<string[]>([])
  const [brand, setBrand] = useState(''); const [model, setModel] = useState('')
  const [pattern, setPattern] = useState(''); const [material, setMaterial] = useState('')
  const [size, setSize] = useState(''); const [features, setFeatures] = useState('')
  const [accessories, setAccessories] = useState(''); const [serialMasked, setSerialMasked] = useState('')
  const [storedPlace, setStoredPlace] = useState('')

  // 제출 가능 조건
  const canSubmit = authed && files.length >= 2 && !!category && !!name

  const onSubmit = useCallback(async () => {
    if (!authed) {
      router.push('/auth?return=/items/new')
      return
    }
    if (!canSubmit) {
      alert('제목과 카테고리, 사진(2장 이상)은 필수입니다.')
      return
    }
    // 1) 업로드 + EXIF 수집
    const uploaded = await Promise.all(files.map((f) => uploadOne(f)))
    // 2) 최종 좌표: 수동/GPS > EXIF
    const exifFirst = uploaded.find(u => u.exif_lat && u.exif_lng)
    const finalLat = location.lat ?? exifFirst?.exif_lat
    const finalLng = location.lng ?? exifFirst?.exif_lng
    // 3) 사진 payload
    const photos = uploaded.map(({ url, exif_lat, exif_lng }) => ({
      url,
      exif_json: (exif_lat && exif_lng) ? JSON.stringify({ lat: exif_lat, lng: exif_lng }) : undefined,
    }))
    // 4) 색상은 우선 단일 컬러 저장
    const primaryColor = colors[0] || undefined
    // 5) BE 스키마에 없는 pattern은 features에 합치기
    const mergedFeatures = [features, pattern].filter(Boolean).join(' / ') || undefined

    const payload = {
      name, category,
      brand: brand || undefined,
      model: model || undefined,
      color: primaryColor,
      material: material || undefined,
      size: size || undefined,
      features: mergedFeatures,
      accessories: accessories || undefined,
      serial_masked: serialMasked || undefined,
      lat: finalLat, lng: finalLng,
      stored_place: storedPlace || undefined,
      photos,
    }

    const { ok, status, json, location: locHeader } = await postJSON<{ id: number }>('/items', payload)
    const newId = json?.id
    if (ok && newId) {
      alert('등록되었습니다.')
      return router.replace(`/items/${newId}`)
    }
    if (status === 201 && locHeader) {
      const idMatch = /(\d+)$/.exec(locHeader)
      alert('등록되었습니다.')
      return router.replace(idMatch ? `/items/${idMatch[1]}` : '/me/items')
    }
    if (status === 401) {
      router.push('/auth?return=/items/new')
      return
    }
    if (status === 400) return alert(json?.detail || '요청 형식 오류')
    alert(json?.error?.message || '등록에 실패했습니다.')
  }, [
    authed, files, name, category, brand, model, colors, pattern, material, size,
    features, accessories, serialMasked, storedPlace, location, router, canSubmit
  ])

  return (
    // ⬇️ 하단 CTA에 가리지 않도록 여유를 크게(padding-bottom 11rem)
    <div className="lf-new lf-container py-8 pb-44 md:pb-48">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← 홈</Link>
      <h1 className="mt-2 text-2xl font-bold">분실물 등록</h1>
      <p className="mt-1 text-sm text-slate-500">사진과 상세 정보를 입력해주세요</p>

      {!authed && (
        <div
          role="alert"
          className="mt-3 mb-2 flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900"
        >
          <span>등록하려면 로그인이 필요합니다.</span>
          <Link href="/auth?return=/items/new" className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">
            로그인하기
          </Link>
        </div>
      )}

      {/* 사진 업로드 */}
      <section className="section lf-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">사진 ({files.length}/5)</h2>
          <span className="text-xs text-slate-500">최소 2장 필요</span>
        </div>

        {files.length === 0 && (
          <div className="upload-empty md:w-1/2">
            <button type="button" onClick={() => openPicker('image/*;capture=camera')} className="upload-btn">
              <Camera className="h-6 w-6" /> 촬영
            </button>
            <button type="button" onClick={() => openPicker('image/*')} className="upload-btn">
              <ImageIcon className="h-6 w-6" /> 갤러리
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="preview-grid">
            {previewUrls.map((src, i) => (
              <div key={i} className="preview-item">
                <img src={src} alt="preview" />
                <button type="button" onClick={() => removeAt(i)} className="remove">삭제</button>
              </div>
            ))}
            {files.length < 5 && (
              <button type="button" onClick={() => openPicker('image/*')} className="upload-btn">
                <ImageIcon className="h-5 w-5" /> 추가
              </button>
            )}
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" multiple className="file-hidden" onChange={onPick} />
      </section>

      {/* 보관 위치 */}
      <section className="section lf-card p-5">
        <h2 className="mb-3 font-semibold">보관 위치</h2>
        <div className="location-actions">
          <button type="button" onClick={geolocate} className="location-bar w-full">
            <MapPin className="h-4 w-4" />
            {location.lat
              ? <span>현재 위치 설정됨 — <b>{location.lat?.toFixed(5)}</b>, <b>{location.lng?.toFixed(5)}</b></span>
              : <span>현재 위치 설정하기</span>}
          </button>
          <button type="button" onClick={manualMap} className="manual">수동</button>
        </div>
      </section>

      {/* 분실물 정보 */}
      <section className="section lf-card p-5">
        <h2 className="mb-3 font-semibold">분실물 정보</h2>

        <Input
          label="제목/간단 설명 *"
          placeholder="예: 검은색 지갑, 아이폰 12"
          value={name}
          onChange={setName}
          icon={<Tag className="h-4 w-4" />}
          disabled={!authed}
        />

        <label className="field-label mt-4">카테고리 *</label>
        <div className="mb-4">
          <Pills
            options={['전자기기','지갑/가방','액세서리','의류','서적/문서','기타']}
            value={category ? [category] : []}
            onChange={(arr) => setCategory(arr[0] || '')}
            max={1}
            disabled={!authed}
          />
        </div>

        <label className="field-label">색상</label>
        <div className="mb-4">
          <Pills
            options={['빨간색','파란색','검은색','흰색','회색','갈색','노란색','초록색','보라색','분홍색']}
            value={colors}
            onChange={setColors}
            disabled={!authed}
          />
        </div>

        <div className="space-y-3">
          <Input label="브랜드/제조사" placeholder="예: Apple, Samsung, Nike..." value={brand} onChange={setBrand} icon={<Tag className="h-4 w-4" />} disabled={!authed} />
          <Input label="모델" placeholder="예: iPhone 12 Pro, Galaxy S21..." value={model} onChange={setModel} disabled={!authed} />
          <Input label="무늬/패턴" placeholder="예: 체크무늬, 꽃무늬, 단색..." value={pattern} onChange={setPattern} disabled={!authed} />
          <Input label="재질" placeholder="예: 가죽, 플라스틱, 금속..." value={material} onChange={setMaterial} disabled={!authed} />
          <Input label="크기/사이즈" placeholder="예: 대형, M사이즈, 15cm..." value={size} onChange={setSize} disabled={!authed} />
          <Textarea label="특징/설명" placeholder="특별한 특징이나 손상 부분 등을 자세히 적어주세요" value={features} onChange={setFeatures} disabled={!authed} />
          <Input label="부속품" placeholder="예: 충전기, 케이스, 스트랩..." value={accessories} onChange={setAccessories} disabled={!authed} />
          <Input label="시리얼 번호 (일부)" placeholder="일부만 입력해주세요" value={serialMasked} onChange={setSerialMasked} disabled={!authed} />
          <Input label="보관 장소 메모" placeholder="예: 학생회관 1층 안내데스크" value={storedPlace} onChange={setStoredPlace} disabled={!authed} />
        </div>
      </section>

      {/* ⬇️ CTA에 가리지 않게 안전 스페이서(인라인 높이로 CSS 추가 불필요) */}
      <div style={{ height: '92px' }} aria-hidden />

      {/* 제출 */}
      <div className="cta-wrap fixed bottom-0 left-0 right-0 z-10 px-4 pb-3 pt-2"
           style={{ background: 'linear-gradient(180deg, rgba(246,248,251,0) 0%, rgba(246,248,251,1) 40%)' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="cta flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-400/30 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <PackagePlus className="h-5 w-5" /> 분실물 등록하기
        </button>
      </div>
    </div>
  )
}

function Input({
  label, value, onChange, placeholder, icon, disabled,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-800">{label}</div>
      <div className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 ${disabled ? 'opacity-60' : ''}`}>
        {icon && <span className="text-slate-500">{icon}</span>}
        <input
          className="input w-full rounded-xl border border-slate-200 bg-white p-0 outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </label>
  )
}

function Textarea({
  label, value, onChange, placeholder, disabled,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-800">{label}</div>
      <textarea
        className="textarea w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
      />
    </label>
  )
}
