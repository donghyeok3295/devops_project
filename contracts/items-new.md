# 등록 (`/items/new`) — Page Spec (v1)

## 목적
- 습득자가 사진≥2, 위치(EXIF/지도), 속성(카테고리/브랜드/색상/모델/재질/사이즈/특징/부속/시리얼 일부) 입력해 등록(STORED)

## 사용자 시나리오
1) 사진 업로드(>=2) → EXIF에서 위경도 추출 실패 시 지도 수동 지정
2) 속성 폼 입력
3) 제출 → 201 + `Location:/items/{id}`

## 규약/에러
- 응답 래퍼: `{data,error}`
- 에러: `VALIDATION_RANGE`(사진<2), `UNAUTHORIZED`, `FORBIDDEN_ROLE`(FINDER 아님)

## 엔드포인트(요약)
- `POST /items` (인증: FINDER)
  - Req:
    - `photos:[{url, exif_lat?, exif_lng?}]` (minItems:2)
    - `attributes:{category,brand?,model?,color?,pattern?,material?,size?,features?,accessories?,serial_masked?}`
    - `stored_location:{lat,lng,source(EXIF|GPS|MANUAL),addr?}`
  - 201: `{data:Item,error:null}`, `Location:/items/{id}`

## 통합 체크리스트
- [ ] 사진 2장 검증(스키마 minItems=2)
- [ ] 201 + Location
