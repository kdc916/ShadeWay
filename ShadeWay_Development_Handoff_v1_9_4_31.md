# ShadeWay Development Handoff & Full Development Notes

**프로젝트명:** ShadeWay  
**현재 안정 기준:** `ShadeWay_MVP_v1_9_4_31_Walk_Camera_Arrow_Stability.html`  
**문서 기준 버전:** `v1.9.4.31 Cloudflare Production Deploy · Shade Graph Beta · GitHub + Workers`  
**최종 업데이트:** 2026-08-09  
**개발 형태:** 단일 HTML 기반 웹 앱 / 모바일 보행 내비게이션 프로토타입  
**현재 단계:** 기능형 MVP를 넘어 실사용 테스트 및 데이터 정확도·UX·서비스 아키텍처 안정화 단계  

---

# 0. 이 문서의 목적

이 문서는 ShadeWay 프로젝트를 새로운 ChatGPT 대화에서 즉시 이어 개발하기 위한 전체 인수인계 문서다.

다음 내용을 한 문서에 누적한다.

- 프로젝트 목표와 차별점
- 초기 v0.1부터 최신 v1.9.4.31까지 개발 흐름
- 현재 구현된 전체 기능
- 현재 기술 구조
- 그림자 계산 방식
- 건물 높이 추정 방식
- 경로 탐색/대안 생성/추천 점수 구조
- 실시간 GPS 내비게이션 구조
- 모바일/PC UI 구조
- OSM/Overture 건물 최신화 구조
- 해결한 주요 버그
- 절대 제거하면 안 되는 기능
- 현재 알려진 한계
- 테스트 체크리스트
- 다음 개발 우선순위
- 새 채팅용 인수인계 프롬프트

향후 패치는 **v1.9.4.31을 기준으로 누적 개발**하며, 이전 버전으로 롤백하면서 최신 기능을 잃지 않는다.

---

# 1. 프로젝트 한 줄 정의

ShadeWay는 단순히 가장 짧은 길을 찾는 지도 앱이 아니라,

> **현재 시간의 태양, 건물, 식생, 날씨, UV, 보행 속도, 경사를 분석해 지금 가장 걷기 좋은 길을 찾는 보행 내비게이션**

을 목표로 한다.

대표 문장:

> **“가장 짧은 길이 아니라, 지금 이 시간에 가장 걷기 좋은 길을 찾는다.”**

영문 컨셉:

> **Walk in the shade.**

장기적으로는:

- Shade-aware walking navigation
- Heat-aware pedestrian navigation

을 결합하는 것이 목표다.

---

# 2. 프로젝트 시작 배경

더운 날 도보 이동에서는 수백 m 정도 우회하더라도 건물 그림자나 나무 그늘이 많은 길이 실제 체감상 훨씬 좋을 수 있다.

기존 지도 앱의 일반적인 도보 경로 기준:

- 거리
- 예상 시간
- 경사
- 보행 가능 여부

ShadeWay가 추가하려는 기준:

- 현재 태양 고도
- 태양 방위각
- 건물 높이
- 실제 건물 footprint
- 시간대별 건물 그림자
- 나무/숲/공원 그늘
- UV
- 체감온도
- 직사광선 노출 시간
- 실제 사용자의 보행 속도
- 경사도
- 사용자의 `빠르게 ↔ 시원하게` 선호

---

# 3. 현재 최신 실행 파일

```text
ShadeWay_MVP_v1_9_4_31_Walk_Camera_Arrow_Stability.html
```

최신 버전의 핵심:

- 기존 ShadeWay 다크 UI 유지
- OSM + Overture 건물 데이터 보완
- 건물 persistent cache TTL 24시간
- 실제 강제 네트워크 새로고침
- OSM 원본 timestamp 표시
- Overture 최신 release 확인
- Overture PMTiles 건물 보완
- OSM/Overture 건물 중복 제거
- 실시간 건물/그림자 재계산
- 모바일 Route Console
- 경로 타임라인
- OSM 횡단보도 표시
- Turn-by-Turn 보행 안내
- 최소 햇빛 노출 기준 경로 선택
- 복잡한 오목 건물 footprint 정확 sweep 그림자
- OSM 나무 높이·수관 직경 반영
- Heading Up 보행 지도 회전
- GPS 연속 확인 기반 목적지 도착 감지
- Walking Session Summary + local history + JSON export
- 한국어 음성 Turn-by-Turn
- 횡단보도 + 신호 + 계단 + 육교 + 지하도 + 접근성 표시
- PWA manifest / service worker / install UI
- 외부 API Health + GET 자동 1회 retry
- Cloudflare Workers Static Assets + `/api/*` Worker 통합 배포
- GitHub `main` push → Cloudflare Workers Builds 자동 production deploy 구조
- Cloudflare Backend same-origin 자동 탐지 + public API fallback
- Shade-aware Local Graph Beta 비동기 후보
- Worker API rate limit / health / optional D1·R2·VWorld Secret
- GitHub 배포용 README / CI / secret 제외 규칙

---

# 4. 기술 구성

## 지도

- Leaflet
- OpenStreetMap Tile

## 건물

### Primary
- OpenStreetMap
- Overpass API

### Supplemental
- Overture Maps Buildings
- PMTiles HTTP Range

## 장소 검색

- OpenStreetMap Nominatim

## 보행 경로

### Primary
- OSM Routing / OSRM Foot

### Fallback
- Valhalla

## 날씨

- Open-Meteo Forecast API

사용:

- temperature_2m
- apparent_temperature
- relative_humidity_2m
- wind_speed_10m
- uv_index
- cloud_cover

## 고도

- Open-Meteo Elevation

## 로컬 저장

- localStorage
- IndexedDB

---

# 5. 전체 버전 히스토리

---

## v0.1 — Initial Building Shadow MVP

파일:

```text
ShadeWay_MVP_v0_1.html
```

최초 구현:

- Leaflet + OSM
- 브라우저 GPS
- 현재 위치 주변 약 450m 건물 로딩
- OSM 건물 footprint
- 건물 높이
- 태양 고도 / 방위각
- 건물 그림자
- 날짜 / 시간 변경
- 05:00 ~ 21:00 타임라인
- 건물 클릭 시 높이/출처 표시
- 모바일 대응 UI

건물 높이 초기 우선순위:

1. OSM `height`
2. `building:levels × 3m`
3. 기본값 `12m`

이 버전에서 ShadeWay의 핵심 컨셉이 처음 구현됨.

---

## v0.2 — Pedestrian Route MVP

파일:

```text
ShadeWay_MVP_v0_2.html
```

추가:

- 페이지 시작 시 위치 권한 요청
- 지도 클릭 목적지
- Valhalla pedestrian route
- 경로 약 6m 단위 샘플링
- 샘플이 그림자 내부인지 검사
- 경로별:
  - 총 거리
  - 그늘 거리
  - 햇빛 거리
  - 그늘 비율
  - ETA
  - 추가 거리
- 그늘 비율이 높은 경로 추천

---

## v0.2.1 — GPS Hotfix

파일:

```text
ShadeWay_MVP_v0_2_1_GPS_Hotfix.html
```

Samsung Internet 등에서 GPS 권한 창이 제대로 나타나지 않는 문제 대응.

추가:

- Secure Context 검사
- HTTPS 여부 검사
- `navigator.geolocation` 지원 검사
- Permissions API 검사
- permission denied 안내
- 8초 GPS watchdog
- 위치 unavailable / timeout / denied 오류 분리
- ChatGPT Preview / iframe / file:// 환경 경고

**이 기능은 앞으로 절대 제거하지 않는다.**

---

## v0.3 — Shade Segment Route Visualization

파일:

```text
ShadeWay_MVP_v0_3_ShadeSegments_RouteCoverage.html
```

추가:

- 추천 경로 구간 시각화
- 초록 = 그늘
- 주황 = 햇빛
- 파란/회색 = 대안
- 경로 주변 건물 corridor 로딩

초기 corridor:

```text
ROUTE_SAMPLE_SPACING ≈ 320m
ROUTE_LOAD_RADIUS ≈ 260m
MAX_ROUTE_LOAD_POINTS ≈ 14
```

---

## v0.4 — Vegetation + Cache

파일:

```text
ShadeWay_MVP_v0_4_Vegetation_Cache_Corridor.html
```

추가:

- Overpass query memory cache
- 약 10분 TTL
- 자연 식생 데이터

대상:

- natural=wood
- landuse=forest
- leisure=park
- natural=tree

초기 나무 추정:

```text
Crown Radius ≈ 4.5m
Height ≈ 7m
```

---

## v0.5 — Best Departure Time + Vegetation Weight

파일:

```text
ShadeWay_MVP_v0_5_BestDeparture_VegetationWeight.html
```

추가:

### 가장 시원한 출발 시간 찾기

선택 시간부터 약 +3시간을 30분 간격 비교.

각 시간:

- 태양 위치
- 건물 그림자
- 나무 그림자
- 후보 경로

재계산.

### 식생 가중치

기본:

```text
35%
```

건물 그늘 = 1.0  
공원/숲/나무 = 약 0.35

공원 전체를 100% 완전 그늘로 과대평가하지 않기 위함.

---

## v0.6 — Weather + UV + Heat Score

파일:

```text
ShadeWay_MVP_v0_6_HeatScore_Weather_UV.html
```

Open-Meteo 연동.

추가:

- 현재 온도
- 체감온도
- 습도
- 바람
- UV
- 구름량
- 경로 직사광선 노출 시간
- ShadeWay Heat Score

Heat Score는 공식 의료 지표가 아니라 **경로 비교용 상대 지표**다.

공식:

- WBGT
- UTCI
- Heat Index

와 동일하지 않다.

---

## v0.7 — Live Walk / Reroute

파일:

```text
ShadeWay_MVP_v0_7_LiveWalk_Reroute.html
```

실시간 보행:

```javascript
navigator.geolocation.watchPosition()
```

핵심:

- GPS 실시간 갱신
- 경로 진행 위치
- 남은 거리
- 남은 시간
- 다음 그늘
- 경로 이탈
- 자동 재탐색

기본 경로 이탈 기준은 약 35m 계열에서 시작했으며 GPS accuracy에 따라 동적 보정.

---

## v0.8 — Speed / Cool Balance

파일:

```text
ShadeWay_MVP_v0_8_SpeedCool_Balance.html
```

중요한 사용자 UX 추가.

```text
🏃 빠르게 ←────────→ 🌳 시원하게
```

기본:

```text
시원함 75%
```

추가:

```text
최대 허용 우회 기본 40%
```

사용자가:

- 조금 덥더라도 빨리
- 무조건 시원하게

사이를 직접 선택.

---

## v0.9 — Three Route Compare

파일:

```text
ShadeWay_MVP_v0_9_ThreeRouteCompare.html
```

3가지 대표 모드:

### 빠른 길

ETA 우선.

### 균형

빠름/시원함 절충.

### 시원한 길

햇빛/열 노출 감소 우선.

카드:

- ETA
- 거리
- 그늘 %
- 햇빛 시간
- Heat Score

---

## v1.0 — Search / Recent / Favorites

파일:

```text
ShadeWay_MVP_v1_0_Search_Recent_Favorites.html
```

추가:

- 목적지 검색
- 역
- 장소
- 주소
- 최근 목적지 최대 약 8개
- 즐겨찾기 최대 약 12개
- localStorage

검색:

- Nominatim

---

## v1.1 — Mobile Navigation UX

파일:

```text
ShadeWay_MVP_v1_1_Mobile_Nav_UX.html
```

초기 모바일 정보 구조:

1. 검색
2. 경로
3. 보행

이후 사용자 테스트를 거쳐 다시 한 패널/Route Console 구조로 발전.

---

## v1.2 — Direction + Auto Reroute

파일:

```text
ShadeWay_MVP_v1_2_Direction_AutoReroute.html
```

추가:

- 자동 재탐색
- 재탐색 ON/OFF
- 목적지 방향
- 직선거리
- 다음 그늘 진행상태
- reroute cooldown

---

## v1.3 — Heading Up + Sun/Shade Alerts

파일:

```text
ShadeWay_MVP_v1_3_Heading_SunShadeAlerts.html
```

추가:

- 진행 방향 위쪽 Heading Up
- 현재 그늘/햇빛 구간
- 다음 구간 거리

예:

```text
현재 그늘 70m
70m 후 햇빛 95m
```

---

## v1.4 — Sun Warning / Cool Detour

파일:

```text
ShadeWay_MVP_v1_4_SunWarning_CoolDetour.html
```

햇빛 구간 접근 사전 경고.

예:

```text
20m 후 직사광선 약 120m
```

더 좋은 후보가 있을 때:

- 햇빛 감소
- 추가 거리
- ETA 증가

비교.

---

## v1.5 — Apply Cool Detour

파일:

```text
ShadeWay_MVP_v1_5_ApplyCoolDetour.html
```

사용자가 직접:

```text
🌳 시원한 길로 변경
```

가능.

경로, 지도, 보행 안내를 즉시 교체.

---

## v1.6 — Smart Auto Cool Switch

파일:

```text
ShadeWay_MVP_v1_6_Smart_AutoCoolSwitch.html
```

자동 시원 경로 전환.

초기 기본 조건:

```text
햇빛 구간 >= 100m
햇빛 절감 >= 1.5분
햇빛 구간까지 <= 60m
시원함 설정 >= 40%
```

UV가 높을수록 더 긴 우회 허용.

---

## v1.7 — Adaptive Walking Speed

파일:

```text
ShadeWay_MVP_v1_7_Adaptive_Walking_Speed.html
```

GPS 기반 실제 보행 속도 학습.

우선:

```javascript
position.coords.speed
```

없으면:

```text
이동거리 / 시간
```

필터:

- GPS accuracy 불량 제외
- 비현실적 고속 제외
- 정지/잡음 제외

최근 여러 샘플 평균.

초기 기본 속도:

```text
약 4.8 km/h
```

ETA / 햇빛 시간 / 스마트 우회 판단에 반영.

---

## v1.8 — Elevation / Slope ETA

파일:

```text
ShadeWay_MVP_v1_8_Elevation_Slope_ETA.html
```

Open-Meteo Elevation 연동.

추가:

- 상승고도
- 하강고도
- 최대 오르막
- 경사 기반 속도 보정
- 실제 ETA 기반 빠른 길

따라서 단순 최단 거리보다 실제 도착 시간이 빠른 경로를 우선할 수 있음.

---

## v1.9 — PC Shadow / Routing Fix

파일:

```text
ShadeWay_MVP_v1_9_PC_Shadow_Routing_Fix.html
```

사용자 테스트에서 드러난 핵심 문제:

- PC 일부 건물만 그림자
- 그림자가 건물 위에 표시
- 그림자가 3D 블록처럼 보임
- 경로 탐색 불안정
- 내비게이션 느낌 부족

수정:

### viewport 건물 로딩

PC 현재 화면 건물 추가 로드.

### Relation

OSM multipolygon outer geometry 지원 확대.

### 2D 그림자

기존 불규칙 polygon 방식에서:

```text
원본 건물 vertex
+
이동 그림자 vertex
→ convex hull
```

로 변경.

### Pane 분리

초기:

```text
shadePane
buildingOverlayPane
routeNavPane
walkMarkerPane
```

건물 지붕을 그림자보다 위에 그려 건물 위 그림자 착시 제거.

---

## v1.9.1 — Route Button Hotfix

파일:

```text
ShadeWay_MVP_v1_9_1_Route_Button_Hotfix.html
```

문제:

> 경로 분석을 눌러도 아무 반응이 없음.

원인:

```text
경로 요청
이전에
Overpass 건물 요청을 기다림
```

수정 순서:

```text
라우팅 요청
↓
경로 즉시 표시
↓
건물
↓
그림자
↓
고도
```

**매우 중요한 원칙: 경로 UI는 느린 건물 API를 기다리면 안 된다.**

---

## v1.9.2 — Shadow Visibility Hotfix

파일:

```text
ShadeWay_MVP_v1_9_2_Shadow_Visibility_Hotfix.html
```

추가:

- 그림자 진한 회청색
- 지붕 명확화
- route BBOX 건물 보강
- 건물 수 / 그림자 수 진단
- 그림자 다시 계산 버튼

진단:

```text
건물 0 / 그림자 0
→ 건물 로딩

건물 N / 그림자 0
→ 그림자 계산

건물 N / 그림자 N
그런데 화면에 안 보임
→ Leaflet pane/render 문제
```

---

# 6. v1.9.3 계열 — 그림자 성능 / UI 통합

---

## v1.9.3 — Mobile GPS Stability

파일:

```text
ShadeWay_MVP_v1_9_3_Mobile_GPS_Stability.html
```

v1.9.2 이후 실제 모바일 GPS/패널 안정화의 기준이 된 중간 버전.

이후 1.9.3.x 최적화가 연속 적용됨.

---

## v1.9.3.1 — Realtime Shadow + Unified UI

파일:

```text
ShadeWay_MVP_v1_9_3_1_Realtime_Shadow_Unified_UI.html
```

핵심:

### 타임라인 경로 즉시 재평가

드래그:

- requestAnimationFrame 최대 1회
- 약 10m 샘플 빠른 평가

드래그 종료:

- 약 6m 정밀 평가

### 그림자 중첩 농도 제거

문제:

반투명 건물 그림자 polygon이 겹칠수록 검게 됨.

수정:

- compound SVG path
- 단일 그림자 색
- 중첩 시 농도 증가 없음

### 성능

- building hull 최초 캐시
- 시간별 shadow model cache
- spatial grid
- 매 샘플마다 모든 건물 순회 제거
- 정적 건물 Leaflet 재생성 감소

### UI

검색/경로/보행 탭을 단일 패널로 단순화.

---

## v1.9.3.2 — Progressive Shadow Loading

파일:

```text
ShadeWay_MVP_v1_9_3_2_Progressive_Shadow_Loading.html
```

문제:

OSM Tile에는 건물이 보이는데 ShadeWay 그림자용 Overpass geometry는 느림.

수정:

### 현재 화면 최우선

1. 화면 건물
2. 도착 타일 즉시 그림자
3. 식생
4. 고도
5. 새 viewport

### 2×2 Progressive

- 화면 4타일
- 중심 가까운 순
- 동시 최대 2
- 타일 하나 도착 즉시 표시

---

## v1.9.3.3 — Instant Route Shadows

파일:

```text
ShadeWay_MVP_v1_9_3_3_Instant_Route_Shadows.html
```

목표:

경로 그림자를 화면 전체보다 먼저.

추가:

- 선택 경로 최대 6지점 샘플
- 지점 주변 약 115m 건물 우선
- Overpass 2서버 Race
- IndexedDB 건물 cache 7일
- 화면 tile 최대 3개 동시
- 건물 layer 증분 추가

현실적 목표:

```text
첫 경로 그림자 약 2~5초
재방문은 캐시로 즉시
```

---

# 7. v1.9.4 — 정확도 / 로딩 연구

파일:

```text
ShadeWay_MVP_v1_9_4_Shadow_Accuracy_FastBuildings.html
```

야당역 실제 그림자 방향 비교를 바탕으로 태양/높이 계산을 검토.

07:30 검증 예:

```text
Solar elevation ≈ 19.96°
Solar azimuth ≈ 84.26°
Shadow direction ≈ 264.26°
Shadow multiplier ≈ 2.75×
```

태양 방향 자체는 실제 관찰과 대체로 일치.

그림자가 너무 짧아 보이는 주요 원인은 **건물 높이 데이터 부족** 가능성이 큼.

태양 계산 개선:

- 윤년
- 초 단위
- 대기 굴절
- 위치 timezone offset

건물 높이 우선순위 확장:

1. OSM height
2. building:levels × 3m + roof:height
3. building:part 개별 높이
4. 지역 실제 높이 중앙값
5. 건물 유형 + footprint 추정
6. 사용자 미상 높이

---

# 8. v1.9.4.1 ~ v1.9.4.23 최신 개발

---

## v1.9.4.1 — Dynamic Shade Detour Routing

파일:

```text
ShadeWay_MVP_v1_9_4_1_Dynamic_Shade_Detour_Routing.html
```

문제:

라우터가 처음 준 후보 geometry에 없는 평행 그늘길은 아무리 그림자가 좋아도 선택 불가.

추가:

### Active Shade Detour

기본 경로 약 32%, 68%에서 좌/우 경유점 생성.

오프셋:

```text
좁은 우회 약 35~82m
넓은 우회 약 1.7×
최대 약 135m
```

최대 4 후보.

실제 pedestrian router로 다시 요청.

### 시간 변경

geometry는 유지하면서:

- 그늘 거리
- 햇빛 거리
- Heat
- 사용자 성향

즉시 재평가.

### 실시간 보행

약 30초마다 현재 시간 기준 재평가.

---

## v1.9.4.2 — Instant Alternative Feedback

파일:

```text
ShadeWay_MVP_v1_9_4_2_Instant_Alternative_Feedback.html
```

핵심 문제:

대안 생성/검증/피드백이 분리되지 않음.

### 중복 제거 정밀화

기존:

```text
22m / 90%
```

변경:

```text
10m / 94%
```

평행한 반대편 도로나 건물 양쪽 경로를 잘못 제거하지 않게 함.

### 후보 4 → 6

Wave:

1. 좌/우 단일
2. 좌/우 평행
3. 좌/우 넓은 우회

동시 라우팅 최대 2.

### Stage A

geometry 도착 즉시 임시 평가/표시.

### Stage B

후보 주변 건물 추가 확인 후 그림자 점수 확정.

### 피드백

- 탐색 중
- 경로 없음
- 요청 실패
- 중복
- 과도한 우회
- 임시 추천
- 검증 중
- 확정 추천
- 대안 유지

### 수동 선택

`이 경로 사용`

선택 시 해당 경로 고정 + 자동 전환 OFF.

---

## v1.9.4.3 — Navigator UX Route First

파일:

```text
ShadeWay_MVP_v1_9_4_3_Navigator_UX_Route_First.html
```

목표:

설정보다 경로가 먼저 보이게.

추가:

### 경로 라벨

추천 경로:

- ETA
- 적용 보행속도
- 그늘

실시간:

- 남은 ETA
- 속도
- 남은 거리

### 예상 걸음

브라우저에 안정적 만보기 API가 없기 때문에:

```text
GPS 누적 이동거리 / 약 0.72m
```

추정.

### 정보 순서

이전:

```text
설정 → 태양 → Heat → 경로
```

변경:

```text
목적지 → 추천 경로 → 대안 → 태양/그림자 → Heat → 고급
```

---

## v1.9.4.4 — Nearby First Search

파일:

```text
ShadeWay_MVP_v1_9_4_4_Nearby_First_Search.html
```

사용자 테스트:

야당역 근처 버거킹 검색인데 분당이 먼저 나오는 문제.

수정:

- Nominatim bounded search
- 대한민국 제한
- 검색 기준점 거리 계산
- 거리 ASC 강제 정렬
- 가까운 결과 우선

초기 반경 15km 전략.

후속 v1.9.4.7에서 보행용 직접 설정 반경으로 축소.

---

## v1.9.4.5 — Feedback Clarity

파일:

```text
ShadeWay_MVP_v1_9_4_5_Feedback_Clarity.html
```

추가:

- 사용자 `분` 표시는 정수
- ETA/직사광선 분 소수점 제거
- 대안 피드백 중요도 정렬
- 제외 후보 접기
- 비교값 chip
- history 8건
- 추천/유효/검증/제외 요약

---

## v1.9.4.6 — Turn-by-Turn Live Guidance

파일:

```text
ShadeWay_MVP_v1_9_4_6_TurnByTurn_Live_Guidance.html
```

실제 보행 안내 강화.

### Turn HUD

예:

```text
80m 후
좌회전하세요
송학1길
```

### OSRM

`steps=true`

저장:

- maneuver type
- modifier
- location
- street

### Valhalla

fallback maneuver 지원.

### 한국어 안내

- 좌/우
- 완만
- 급회전
- 갈림길
- 회전교차로
- 직진
- 도착

### 회전 마커

지도:

```text
← → ↖ ↗ ⟳
```

### 진행률

- %
- 남은 거리
- 예상 걸음

### 진동

지원 브라우저:

- 약 85m 전
- 약 22m 전

### 경로 연속성 보호

실시간 보행 중 다른 후보가 더 좋아져도 현재 GPS와 연결되지 않으면 바로 전환하지 않음.

현재 위치 기준으로 재탐색 후 교체.

---

## v1.9.4.7 — Walk Search UX

파일:

```text
ShadeWay_MVP_v1_9_4_7_Walk_Search_UX.html
```

모바일 검색 UX 단순화.

검색 반경:

- 500m
- 1km
- 2km 기본
- 3km
- 5km

가까운 결과 1개 우선 노출.

나머지:

```text
다른 결과 N개 보기
```

목적지 선택 즉시 경로 분석 자동 시작.

---

## v1.9.4.8 — Destination Lock + Time Compare

파일:

```text
ShadeWay_MVP_v1_9_4_8_Destination_Lock_Time_Compare.html
```

문제:

대안 경로가 목적지 근처를 지난 뒤 다른 곳까지 계속 가는 경우.

### Destination Lock

최초 정상 도착 보행 접근점을 canonical destination access로 고정.

대안:

- 같은 접근점으로 끝나야 함
- 접근점에 도달하고 이후 긴 꼬리가 있으면 trim
- 고정 endpoint에서 과도하게 벗어나면 후보 폐기

### 시간 전후 비교

```text
30분 전
선택 시각
30분 후
```

각 시간에서 확보한 전체 후보를 다시 평가.

표시:

- 추천 경로
- 그늘
- 햇빛
- ETA
- Heat

---

## v1.9.4.9 — Route UI Depth Fix

파일:

```text
ShadeWay_MVP_v1_9_4_9_Route_UI_Depth_Fix.html
```

문제:

경로 라인이 ETA/시간 라벨 위를 지나감.

Pane을 세분화:

```text
그림자
건물
대안
추천 경로
shade stripe
route label
현재 위치 / 회전
```

대표 z-index:

```text
routeAltPane 510
routeMainPane 540
routeShadePane 555
routeLabelPane 625
walkMarkerPane 650
```

---

## v1.9.4.10 — Route Label Readability

파일:

```text
ShadeWay_MVP_v1_9_4_10_Route_Label_Readability.html
```

작은 라벨을 카드형으로 변경.

- 경로 위에서 띄움
- pointer
- 큰 ETA
- 속도/그늘 chip
- 대안과 위치 분리
- 간단 collision avoidance

---

## v1.9.4.11 — Absolute Sun Exposure Routing

파일:

```text
ShadeWay_MVP_v1_9_4_11_Absolute_Sun_Exposure_Routing.html
```

매우 중요한 경로 로직 수정.

문제 예:

```text
A: 15분, 그늘 15%
B: 20분, 그늘 19%
```

그늘 비율만 보면 B가 좋지만:

```text
A 햇빛 ≈ 13분
B 햇빛 ≈ 16~17분
```

실제 B가 더 덥다.

수정:

> **시원한 길 = 그늘 % 최대가 아니라 실제 직사광선 시간이 최소인 길**

우선순위:

1. 실제 직사광선 시간
2. thermal exposure
3. ETA
4. 그늘 %

시원함 70% 이상에서는 실제 햇빛이 더 긴 후보가 쉽게 추천되지 않게 hard guard 추가.

---

## v1.9.4.12 — Mobile UX / Visible Map Focus

파일:

```text
ShadeWay_MVP_v1_9_4_12_Mobile_UX_Map_Focus.html
```

문제:

현재 위치가 하단 메뉴 뒤에 숨음.

수정:

### Visible Map Center

화면 전체 중앙이 아니라:

```text
지도 상단 ~ Bottom Sheet 시작점
```

사이의 실제 보이는 영역 중앙으로 현재 위치 이동.

### 모바일 Bottom Sheet

기본 약 42dvh 계열에서 시작.

### 위치 FAB

지도 위 현재 위치 버튼 추가.

### 검색 UI

```text
[검색 입력][검색][2km]
```

동일 높이.

---

## v1.9.4.13 — Mobile Locate Control

파일:

```text
ShadeWay_MVP_v1_9_4_13_Mobile_Locate_Control_UX.html
```

문제:

현재 위치 FAB가 보이지만 모바일에서 클릭이 지도 gesture에 먹힘.

수정:

- z-index
- pointer-events
- touch-action
- Leaflet click propagation 차단
- scroll propagation 차단
- touch / pointer 이벤트 차단

모바일 패널도 더 compact.

---

## v1.9.4.14 — Desktop Locate + Popup Route

파일:

```text
ShadeWay_MVP_v1_9_4_14_Desktop_Locate_Popup_Route.html
```

추가:

### PC 위치 버튼

PC에도 지도 우측 하단 현재 위치 FAB.

### 건물 popup

건물 클릭:

- 이름
- 높이
- 출처
- 현재 그림자 길이

아래:

```text
🚶 이곳으로 경로 탐색
```

바로 자동 경로 분석.

지도 빈 위치 popup에도 경로 버튼.

---

## v1.9.4.15 — Route Info Bubble + Timeline Panel Fix

파일:

```text
ShadeWay_MVP_v1_9_4_15_Route_Info_Bubble_Timeline_Fix.html
```

경로 말풍선을 세로 정보 카드로 변경:

```text
시간
남은거리
햇빛 시간
그늘 시간
```

항상:

```text
햇빛 시간 + 그늘 시간 = ETA
```

실시간 보행에서는 현재 위치 이후 남은 경로를 다시 분석.

### 모바일 타임라인 패널 버그

시간 slider를 움직일 때 details 패널이 계속 접히던 문제 수정.

`mobileRouteAutoCollapsed`

로 최초 route render 한 번만 자동 접기.

이후 타임라인 state 보존.

---

## v1.9.4.16 — Smooth Zoom Shadow Cache

파일:

```text
ShadeWay_MVP_v1_9_4_16_Smooth_Zoom_Shadow_Cache.html
```

문제:

줌인/아웃 때:

- 건물
- 높이
- 그림자

갱신이 여러 번 일어나 튀어 보임.

수정:

### 줌 중 계산 정지

```text
zoomstart
→ 기존 건물/그림자 유지
→ 이전 viewport request 취소

zoomend
→ settle
→ 필요한 건물만 추가
→ 그림자 1회 갱신
```

### Stable Geographic Tile

viewport마다 임의 2×2가 아니라 약 0.010° 고정 grid.

캐시 재사용 향상.

### Batch Commit

타일별 UI redraw 제거.

전체 batch 후:

- 높이
- building layer
- spatial index
- shadow

한 번 처리.

### Shadow Swap

새 shadow model 계산 후 기존 shadow를 교체.

---

## v1.9.4.17 — Mobile Route Dock + Crosswalks

파일:

```text
ShadeWay_MVP_v1_9_4_17_Mobile_Route_Dock_Crosswalks.html
```

다른 보행 내비 앱의 **정보 배치 원칙만 참고**해 모바일 경로 화면을 한 화면 중심으로 재구성.

핵심 화면:

```text
출발 / 목적지
지도
시간
경로 카드
설정 + 따라가기
```

### 모바일 Route Dock

- 시간 timeline
- 추천/최단/균형/최소햇빛
- settings
- 따라가기

### 횡단보도

OSM:

- highway=crossing
- footway=crossing

경로 30m 주변만 필터.

지도에 횡단보도 아이콘.

주의:

OSM에 없는 횡단보도는 표시 불가.

---

## v1.9.4.18 — ShadeWay Identity UI

파일:

```text
ShadeWay_MVP_v1_9_4_18_ShadeWay_Identity_UI.html
```

v1.9.4.17의 정보 구조는 유지하면서 타 앱 느낌이 강했던 흰/연두 UI를 제거.

ShadeWay 디자인 원칙:

> **Dark Map Utility + Mint Shade Accent**

기준 컬러:

```text
Background  #0b1118
Panel       #101925
Card        #162232
Secondary   #24364a
Border      #2a3a4e
Text        #edf6ff
Muted       #9bb0c6
Shade       #62d58e
Sun         orange family
GPS         blue
```

### 모바일

- Dark Destination HUD
- Dark Route Console
- SHADE TIME control
- 네이비 route cards
- 민트 추천 rail
- 햇빛 orange
- 그늘 mint
- 설정 secondary color 통일
- 따라가기 mint CTA

앞으로 타 앱은 **정보 구조만 참고**, 컬러/카드/버튼은 복제하지 않는다.

---

## v1.9.4.19 — Fresh Buildings / OSM + Overture

현재 최신 안정 기준.

파일:

```text
ShadeWay_MVP_v1_9_4_19_Fresh_Buildings_Overture.html
```

사용자 테스트:

다른 앱에는 신축 건물이 있는데 ShadeWay에는 없음.

원인:

### A. 캐시

기존 IndexedDB 7일.

심지어 `다시 불러오기`도 캐시가 있으면 네트워크를 확인하지 않을 수 있었음.

### B. OSM 원본

OSM에 footprint가 없으면 Overpass만으로 불가능.

### 수정

건물 원본:

```text
1. OSM / Overpass
2. Overture Maps Buildings supplement
```

### 캐시

```text
7일 → 24시간
bldtile:v4 → bldtile:v5
```

### Force Network

```javascript
fetchBuildingsBBox(..., { forceNetwork:true })
```

실제 최신 OSM 확인.

### stale cache

오래된 geometry는 즉시 표시하고 background refresh.

새 건물 발견 시 live merge + 그림자 갱신.

### OSM timestamp

```text
osm3s.timestamp_osm_base
```

표시.

### Overture

latest release:

```text
https://stac.overturemaps.org/catalog.json
```

fallback:

```text
2026-07-22.0
```

Buildings PMTiles:

```text
.../tiles/<RELEASE>/buildings.pmtiles
```

브라우저 HTTP Range.

dynamic import:

- pmtiles
- @mapbox/vector-tile
- pbf

Polygon / MultiPolygon 지원.

가능하면:

- height
- num_floors
- name

사용.

### 중복 제거

OSM 우선.

Overture 후보는:

- 중심점 거리
- point in polygon

으로 중복 검사.

### UI

설정:

```text
🏙 건물 데이터 최신성
```

표시:

- OSM 원본 시각
- Overture release
- OSM 건물 수
- Overture 보완 수

버튼:

```text
🛰 최신 원본 확인
```

실행:

1. IndexedDB building cache clear
2. memory cache clear
3. tile state clear
4. OSM force network
5. Overture latest 확인
6. PMTiles reload
7. 높이 재추정
8. shadow 재계산

---

## v1.9.4.20 — Overture Recovery Debug

`v1.9.4.19` 기능을 유지한 디버그 안정화 패치. 경로 추천·그림자 알고리즘·UI 구조는 변경하지 않고 외부 건물 데이터 실패 복구와 요청 수명주기만 보강했다.

파일:

```text
ShadeWay_MVP_v1_9_4_20_Overture_Recovery_Debug.html
```

### 수정 1 — Overture dynamic import 실패 캐시 해제

기존에는 `pmtiles`, `@mapbox/vector-tile`, `pbf` dynamic import가 한 번 실패하면 rejected Promise가 `overtureLibPromise`에 남아 같은 세션의 모든 재시도가 즉시 실패할 수 있었다.

수정:

- import 실패 시 `overtureLibPromise = null`
- 다음 요청에서 라이브러리를 실제로 다시 로드

### 수정 2 — 불완전 PMTiles archive 캐시 방지

기존에는 `new PMTiles()` 직후 전역 `overtureArchive`를 먼저 저장하고 `getHeader()`를 기다렸다. 헤더 요청이 실패하면 다음 요청이 header 없는 archive를 정상 캐시처럼 재사용할 수 있었다.

수정:

- local archive에서 `getHeader()` 성공까지 완료한 뒤에만 전역 캐시에 commit
- 실패 시 archive/header/tile cache 정리
- STAC latest가 실패하면 last-known-good release로 한 번 fallback

### 수정 3 — Overture fallback release 안정화

STAC catalog가 정상일 때는 계속 `latest`가 최우선이다. STAC 자체가 실패한 경우에만 사용하는 fallback을 공식 문서에서 확인된 `2026-06-17.0`으로 변경했다.

### 수정 4 — viewport Overture 요청 수명주기 분리

기존 supplemental Overture 요청은 `viewport-buildings` controller를 빌려 썼지만 OSM 로드 종료 직후 controller reference가 제거되어, 이후 zoom/pan에서 이미 오래된 Overture 네트워크 요청을 직접 abort하기 어려웠다.

수정:

- `overture-buildings` 전용 AbortController 사용
- zoom transition 시 OSM viewport + Overture 요청 모두 abort
- generation guard는 그대로 유지

### 수정 5 — `최신 원본 확인` 상태 메시지 정확화

기존 버튼은 OSM 로드만 await한 뒤 Overture는 background로 시작하면서도 `OSM + Overture 최신 릴리스 확인 완료`라고 표시할 수 있었다.

수정:

- 명시적 최신 원본 확인에서는 Overture까지 await
- Overture 실패 시 `OSM은 완료 / Overture는 실패`로 분리 안내
- refresh 때 archive/header/release/lib promise/tile cache를 함께 초기화

### 수정 6 — Overpass Race abort listener 정리

3개 endpoint에 연결한 parent abort handler를 각각 보관하고 모두 제거하도록 수정했다. 반복 요청 시 불필요한 listener 잔류 가능성을 줄였다.

### 수정 7 — 중복 모바일 시간 UI 호출 제거

`mobileTimeSlider change`에서 `updateMobileNowButton()`이 연속 2회 호출되던 중복 1회를 제거했다.

### 디버그 검증

- inline JavaScript `node --check`: PASS
- DOM id: 135개 / 중복 0
- `$()` 참조 누락 id: 0
- Headless Chromium 초기화: runtime exception 0
- 모의 보행 routing: 후보 2개 수신 / Destination Lock 성공 / best route 생성 / busy 정상 해제

### 유지 사항

- OSM 먼저 표시 → Overture background supplement 원칙 유지
- 일반 pan/zoom에서는 Overture를 기다리지 않음
- 경로 UI가 느린 건물 API를 기다리지 않는 원칙 유지
- 기존 v1.9.4.19의 검색, 경로, 동적 우회, 시간 비교, Turn-by-Turn, 횡단보도, GPS, 날씨, 고도, 그림자 기능 유지

---


## v1.9.4.21 — Mobile Current-Location FAB Restore

`v1.9.4.20`의 Overture 복구 패치와 기존 경로/그림자 기능을 그대로 유지하면서, 모바일 첫 화면에서 현재 위치 플로팅 버튼이 사라진 CSS 회귀를 수정했다.

파일:

```text
ShadeWay_MVP_v1_9_4_21_Mobile_Locate_FAB_Restore.html
```

### 증상

- 모바일 첫 화면에서 지도 우측의 현재 위치 FAB가 보이지 않음.
- 검색/설정 bottom sheet는 정상 표시됨.
- GPS 로직과 `mapLocateFab` DOM/클릭 이벤트 자체는 남아 있었음.

### 원인

v1.9.4.12~13의 모바일 CSS에서 현재 위치 FAB의 `bottom`을 bottom sheet 위로 올렸지만, 이후 추가된 공통/PC `.mapLocateFab` 규칙이 더 뒤에서 다음 값을 다시 적용했다.

```css
bottom:22px;
```

모바일에서는 이 값 때문에 FAB가 bottom sheet 아래쪽으로 내려갔고, `main`과 `aside`의 stacking context 관계상 패널 뒤에 완전히 가려졌다.

### 수정

- 최종 CSS cascade 위치에 모바일 전용 복구 규칙 추가.
- 실제 panel 높이를 `ResizeObserver`가 기록하는 기존 `--mobile-sheet-px` 값에 연결.
- 기본/확장/축소 bottom sheet 높이에 따라 FAB가 자동으로 패널 바로 위를 따라감.
- safe-area 오른쪽 inset 고려.
- route-result 모드의 기존 Route Console 여백 규칙은 유지.
- GPS 요청/재중앙 정렬/실시간 보행 로직은 변경하지 않음.

핵심 위치 계산:

```css
bottom: calc(var(--mobile-sheet-px, 36dvh) + var(--mobile-sheet-gap, 18px));
```

### 회귀 검증

- inline JavaScript `node --check`: PASS
- `#mapLocateFab` DOM 유지: PASS
- `recenterToCurrentLocation()` 클릭 핸들러 유지: PASS
- 모바일 최종 CSS가 공통 `bottom:22px` 규칙보다 뒤에서 적용됨: PASS
- v1.9.4.20 Overture 복구 코드 변경 없음

### 유지 사항

- PC 현재 위치 FAB 유지
- 모바일 위치 FAB touch/pointer propagation 보호 유지
- 현재 위치 GPS 성공 시 초록/파랑 위치 마커 유지
- bottom sheet / Route Console / Turn-by-Turn / 그림자 / 경로 추천 유지

---

## v1.9.4.22 — Mobile Nearest Search Map Focus

모바일에서 장소 검색 결과가 도착했을 때, 거리 정렬 1순위인 **가장 가까운 검색 결과**가 지도에서 바로 보이도록 자동 포커스를 추가했다.

파일:

```text
ShadeWay_MVP_v1_9_4_22_Mobile_Search_Nearest_Map_Focus.html
```

### 사용자 요구

- 모바일에서 목적지를 검색하면 가장 가까운 검색 결과 위치로 지도가 자동 이동해야 함.
- 검색만 했다고 목적지를 자동 확정하거나 경로 탐색을 강제로 시작하면 안 됨.

### 구현

`searchPlaces()`의 Nominatim 결과를 기존처럼 거리 ASC로 정렬한 뒤 `items[0]`을 가장 가까운 결과로 사용한다.

모바일 레이아웃에서만:

1. 검색 결과 렌더링 완료
2. 가장 가까운 결과의 좌표 확인
3. 현재 zoom이 17 미만이면 17까지 확대
4. `focusMapPointVisible()`로 bottom sheet에 가리지 않는 실제 지도 가시 영역 중앙으로 이동
5. 상단 hint에 가장 가까운 결과명을 표시

중요: 이 동작은 **지도 preview 이동만 수행**한다. `setDestination()` 및 `route()`는 호출하지 않는다. 사용자가 검색 카드의 `바로 경로 안내`를 눌렀을 때만 목적지 확정/경로 탐색이 시작된다.

### 회귀 방지

- PC 검색 결과에서는 자동 지도 이동 없음
- 즐겨찾기 토글로 `renderSearchResults()`만 다시 그릴 때 재이동하지 않음
- 검색 반경을 변경해 실제 `searchPlaces()`가 다시 실행되면 새 1순위 결과로 다시 포커스
- v1.9.4.21 현재 위치 FAB 복구 유지
- 기존 검색 거리 정렬, Destination Lock, 자동 경로 탐색, Overture/그림자 기능 변경 없음

### 검증

- inline JavaScript `node --check`: PASS
- 가장 가까운 결과는 기존 거리 정렬의 `items[0]` 사용
- 모바일 전용 조건 `isMobileLayout()` 확인
- 목적지 자동 선택/route 자동 호출 없음

---


## v1.9.4.23 — Mobile Nearest Search Popup

모바일에서 가장 가까운 검색 결과로 지도는 이동하지만 장소 말풍선이 자동으로 열리지 않던 UX 누락을 수정했다.

파일:

```text
ShadeWay_MVP_v1_9_4_23_Mobile_Search_Nearest_Popup.html
```

### 사용자 요구

- 검색 후 가장 가까운 목적지로 지도 이동은 유지.
- 이동 직후 해당 장소의 말풍선도 자동으로 보여야 함.

### 구현

- 검색 전용 `searchPreviewMarker` 추가.
- 모바일 `searchPlaces()` 성공 후 거리순 1순위 `items[0]`을 대상으로:
  1. 기존 `focusMapPointVisible()`로 가시 지도 영역에 포커스
  2. 짧은 pan 안정화 후 검색 preview marker 생성
  3. `openPopup()`으로 장소 말풍선 자동 표시
- 말풍선 내용:
  - 장소명
  - 현재 위치 기준 거리
  - Nominatim 표시 주소/장소 설명
  - `🚶 이곳으로 경로 탐색` 버튼
- 검색 preview는 목적지를 자동 확정하지 않는다. 경로 버튼을 눌렀을 때만 기존 `startDirectRouteToPoint()` 흐름으로 목적지 고정 및 경로 분석을 시작한다.

### 상태/중복 정리

- 새 검색 시작 시 기존 검색 preview marker 제거.
- 실제 목적지를 설정하면 검색 preview marker 제거.
- 경로 초기화 시 검색 preview marker 제거.
- 결과가 0개이면 preview marker 제거.
- `window.__lastSearchResults===items` 확인으로 이전 검색의 지연 popup이 새 검색 결과 위에 나타나는 race를 방지.

### 회귀 방지

- v1.9.4.22의 모바일 가장 가까운 결과 자동 지도 포커스 유지.
- 목적지 자동 선택 금지 유지.
- PC 검색 동작 변경 없음.
- v1.9.4.21 현재 위치 FAB 유지.
- Destination Lock / routing / shadow / OSM + Overture 로딩 구조 변경 없음.

### 검증

- inline JavaScript `node --check`: PASS
- DOM id 135개 / 중복 0
- `showNearestSearchPreview()` 연결 확인
- popup route 버튼은 기존 전역 `.popupRouteBtn` 처리 흐름 재사용

---

# 9. 태양 계산 현재 구조

기본 그림자 길이:

```text
Shadow Length = Building Height / tan(Solar Altitude)
```

방향:

```text
Shadow Direction = Solar Azimuth + 180°
```

북쪽 = 0° 기준.

개선된 요소:

- 윤년
- 초 단위 시간
- NOAA 계열 계산
- 대기 굴절 correction
- 위치 timezone 고려

최대 그림자 길이 제한:

```text
약 320m
```

저고도 태양에서 지나치게 긴 polygon이 발생하는 것을 제한.

---

# 10. 그림자 Geometry 현재 구조

현재 2D projection.

건물 footprint:

```text
원본 polygon
+
태양 반대방향 offset polygon
```

을 바탕으로 convex hull / shadow geometry 생성.

중요:

- 지붕 위 그림자처럼 보이지 않게 building overlay가 위
- compound SVG shadow로 중첩 농도 증가 방지
- static footprint hull cache
- 시간별 shadow model cache
- spatial grid

현재 한계:

ㄷ / U / L자 복잡 footprint는 convex hull 때문에 실제보다 넓은 그림자가 될 수 있음.

향후:

- edge projection
- polygon union
- polygon clipping

검토.

---

# 11. 건물 높이 현재 우선순위

현재 개념:

1. OSM `height`
2. `building:levels × 약 3m + roof:height`
3. `building:part`
4. 주변 실제 높이/층수 중앙값
5. building type + footprint 추정
6. 사용자 미상 기본 높이

UI에서 자동 추정 ON/OFF 가능.

Overture의:

- height
- num_floors

가 있으면 동일 구조에 반영.

건물 높이는 ShadeWay 정확도에서 **매우 중요**하다.

그림자 방향이 맞더라도 높이가 12m로 fallback되면 실제 고층 건물 그림자가 크게 짧아짐.

---

# 12. 경로 추천 현재 철학

초기:

> 그늘 비율이 높은 길

현재:

> **실제 햇빛을 덜 맞는 길**

중요한 차이:

```text
15분 × 햇빛 85% = 12.75분
20분 × 햇빛 81% = 16.2분
```

20분 경로가 그늘 %는 높지만 실제 햇빛 시간은 더 길다.

따라서 `시원한 길`은 15분 경로를 선택해야 한다.

---

# 13. Route Exposure

핵심 값:

- ETA
- sun minutes
- shade minutes
- sun fraction
- thermal exposure

시원한 경로 우선:

1. 실제 햇빛 시간
2. 열노출
3. ETA
4. 그늘 비율

`시원함 70% 이상`에서는 실제 햇빛 시간이 훨씬 긴 경로가 그늘 %만으로 추천되지 않도록 guard 적용.

---

# 14. 대안 경로 생성

현재 외부 router가 제공하는 대안뿐 아니라 ShadeWay 자체 waypoint 후보를 만든다.

대표 후보:

- 좌측 빠른
- 우측 빠른
- 좌측 평행
- 우측 평행
- 좌측 넓은
- 우측 넓은

최대 약 6개.

동시 라우팅:

```text
약 2개
```

순차 Wave.

Stage A:

geometry 도착 즉시 임시 평가.

Stage B:

후보 corridor의 건물/그림자 보강 후 확정.

---

# 15. 목적지 잠금

대안이 목적지를 지나 계속 가는 버그를 방지.

구조:

```text
선택 POI
↓
기본 보행 경로의 정상 접근점
↓
Canonical Destination Access
```

모든 대안이 같은 접근점으로 끝나야 함.

목적지 접근 후 계속되는 꼬리는 trim.

잘못된 endpoint 후보는 reject.

건물 내부 POI와 실제 보행로가 다르면 접근점 → 실제 POI를 연결해 표현.

---

# 16. 검색 현재 구조

보행 앱이므로 가까운 검색 우선.

기본 반경:

```text
2km
```

선택:

- 500m
- 1km
- 2km
- 3km
- 5km

결과:

- 가장 가까운 1개 우선
- 나머지 `다른 결과 보기`

검색 결과 선택:

```text
목적지 지정
→ 자동 보행 경로
→ 그림자 분석
```

별도 경로 버튼을 다시 찾지 않음.

---

# 17. 실시간 보행 내비게이션

핵심:

```javascript
watchPosition()
```

표시:

- 현재 위치
- route snap
- 남은 거리
- 남은 ETA
- 예상 걸음
- 진행률
- 다음 회전
- 도로명
- 다음 그늘
- 다음 햇빛
- 햇빛 경고

---

# 18. GPS Route Snap

실제 GPS는 흔들린다.

표시용 마커는 경로에 가까우면 route polyline에 snap.

기존 기준:

```text
route distance <= max(약 45m, GPS accuracy × 1.5)
```

단:

**경로 이탈 판정은 실제 GPS 좌표**를 사용.

---

# 19. Turn-by-Turn

OSRM Steps / Valhalla Maneuver 사용.

예:

```text
80m 후
좌회전하세요
송학1길
```

거리 가독성:

- 곧
- 10m
- 25m
- 50m
- km

Android vibration 지원 시:

- 약 85m
- 약 22m

단 브라우저 미지원이면 무시.

---

# 20. 예상 걸음

웹에서 표준 만보기 API를 신뢰하기 어렵기 때문에 GPS 거리 기반 추정.

기준:

```text
약 0.72m / step
```

GPS accuracy/속도 필터 적용.

---

# 21. 경사도 ETA

Open-Meteo Elevation.

경로 약 90m 단위 샘플 기반.

분석:

- ascent
- descent
- steepest grade

경사에 따라 보행 속도 수정.

따라서 `빠른 길`은 최단거리가 아니라 **실제 ETA가 가장 빠른 경로**.

---

# 22. Weather / Heat

현재:

- temperature
- apparent temperature
- humidity
- wind
- UV
- cloud

Heat Score:

ShadeWay 내부 비교용.

의료 안전지표로 표현하지 않는다.

장기적으로:

- UTCI
- WBGT-like

검토.

---

# 23. 식생

OSM:

- tree
- wood
- forest
- park

현재 가중치 기본:

```text
35%
```

식생은 실제 canopy density를 알 수 없기 때문에 건물과 동일한 확실한 그늘로 처리하지 않는다.

---

# 24. 시간 기능

현재:

### 타임라인

05:00 ~ 21:00 계열.

### 현재 시간 복귀

모바일 SHADE TIME:

```text
LIVE / 지금
```

### 전후 비교

```text
30분 전
현재 선택
30분 후
```

각 시간:

- 추천 경로
- 그늘
- 햇빛 시간
- ETA
- Heat

재평가.

### 가장 시원한 출발 시간

선택 시각 이후 여러 시간 비교.

---

# 25. 모바일 현재 UI

v1.9.4.18 이후 디자인 기준:

> **Dark Map Utility + Mint Shade Accent**

경로 탐색 전:

- 지도
- 검색
- 반경
- 위치
- compact menu

경로 탐색 후:

### Destination HUD

```text
START 현재 위치 → GOAL 목적지
```

### Map

- 현재 그림자
- 선택 경로
- 대안
- 횡단보도
- GPS

### Route Console

- SHADE TIME
- 경로 카드
- 횡단보도 상태
- 설정
- 따라가기

### 설정

기존 ShadeWay 상세 패널 활용.

---

# 26. PC 현재 UI

PC는 왼쪽 분석 패널 + 큰 지도 구조 유지.

PC에서:

- 현재 위치 FAB
- 건물 popup
- popup 즉시 경로
- 경로 라벨
- 상세 진단

사용 가능.

---

# 27. 경로 지도 라벨

현재 세로 카드:

```text
추천 경로

시간        15분
남은거리    1.18km
햇빛 시간   11분
그늘 시간    4분
```

실시간:

현재 위치 이후 구간만 다시 분석.

---

# 28. Leaflet Pane 중요 구조

현재 발전된 개념:

```text
shadePane
buildingOverlayPane
routeAltPane
routeMainPane
routeShadePane
crossingPane
routeLabelPane
walkMarkerPane
```

우선순위:

```text
그림자
↓
건물
↓
대안 경로
↓
추천 경로
↓
그늘/햇빛 stripe
↓
횡단보도
↓
경로 정보 label
↓
GPS / maneuver
```

레이어 순서를 무심코 다시 통합하면 과거 버그가 재발할 수 있음.

---

# 29. 그림자 성능 구조

현재 적용:

- 건물 footprint hull cache
- 시간별 shadow model cache
- spatial grid
- IndexedDB
- stable geographic building tile
- viewport padding prefetch
- zoomstart 계산 정지
- zoomend settle
- batch building commit
- old shadow 유지 후 새 shadow swap

줌 중:

```text
기존 그림자 유지
```

줌 끝:

```text
새 데이터 준비
→ 그림자 한 번 교체
```

---

# 30. 건물 데이터 최신성

현재 가장 최근에 해결 중인 핵심 영역.

## OSM

장점:

- 공개
- footprint 상세
- 전 세계

문제:

- 신규 단지 갱신 지연
- height 부족
- 지역별 completeness 편차

## Overture

OSM 보완.

월간 release.

여러 building source 결합.

PMTiles로 일부만 Range fetch.

## 현재 동작

OSM을 먼저 보여주고 Overture에서 누락 후보 보완.

---

# 31. OSM / Overture 중복 제거

Overture는 OSM 자체도 일부 포함할 수 있으므로 중복 가능.

현재:

- candidate 중심 거리
- candidate center in OSM polygon
- OSM center in candidate polygon

검사.

OSM 우선.

Overture는 부족한 footprint만 추가.

---

# 32. 건물 캐시 정책

최신:

```text
Persistent TTL = 24h
Cache Key = bldtile:v5
```

강제:

```text
forceNetwork:true
```

`최신 원본 확인`은 캐시를 비우고 실제 원본 재조회.

---

# 33. 횡단보도

v1.9.4.17.

OSM:

```text
highway=crossing
footway=crossing
```

경로 약 30m 안의 crossing만 표시.

신호 여부 태그가 있으면 별도 표현.

한계:

OSM 미등록 횡단보도는 표시 불가.

장기적으로 한국 도로/교통 source 검토 가능.

---

# 34. 로컬 저장 값

기존부터 포함된 대표 값:

```text
shadeway_recent
shadeway_favorites
shadeway_auto_reroute
shadeway_heading_up
shadeway_sun_warning
shadeway_smart_auto_cool
shadeway_smart_sun_len
shadeway_smart_save_min
shadeway_search_radius_km
shadeway_overture_buildings
```

향후 설정 schema version / migration 고려.

---

# 35. 외부 API 의존성

## OSM Tiles

지도.

## Overpass

건물/식생/횡단보도.

## Overture

누락 건물.

## Nominatim

장소 검색.

## OSRM / OSM Routing

보행.

## Valhalla

fallback.

## Open-Meteo

날씨 / UV / Elevation.

---

# 36. 공개 API 사용 시 주의

현재 단일 HTML MVP는 공개 endpoint에 의존한다.

실서비스 트래픽에는 적절하지 않을 수 있다.

특히:

- Overpass
- Nominatim
- public OSRM
- public Valhalla

장기적으로 backend 필요.

---

# 37. 권장 서비스 아키텍처

현재:

```text
Browser
├─ OSM Tile
├─ Overpass
├─ Overture
├─ Nominatim
├─ OSRM / Valhalla
└─ Open-Meteo
```

서비스화:

```text
Browser / PWA
      │
      ▼
Cloudflare Worker / API
      │
      ├─ Building Tile Cache
      ├─ Search Proxy
      ├─ Routing Proxy
      ├─ Weather Cache
      ├─ Elevation Cache
      ├─ Rate Limit
      └─ Source Health / Failover
```

---

# 38. 장기적인 진짜 Shade Routing

현재 방식:

```text
일반 보행 router
+
ShadeWay waypoint detour generation
+
후보 재평가
```

장점:

- HTML MVP에서 구현 가능
- 기존 보행 graph 활용

한계:

라우터가 생성하지 않은 모든 가능한 골목 조합을 탐색하지 못함.

궁극적 방식:

```text
Pedestrian Graph
↓
각 edge의 시간대별 shade cost
↓
distance + ETA + heat + sun cost
↓
A* / Dijkstra
↓
k-shortest paths
```

ShadeWay backend에서 직접 해야 한다.

---

# 39. 지금까지 해결한 대표 버그

## GPS permission 안 나옴

→ Secure Context / Permissions / watchdog.

## 경로 버튼 무반응

→ 경로 서버 먼저 요청.

## 그림자가 건물 위에 보임

→ Pane 분리 + building overlay.

## 그림자가 3D 블록처럼 보임

→ 2D hull projection.

## 일부 건물 그림자만 보임

→ viewport / route building loading.

## 그림자 겹칠수록 검어짐

→ compound shadow rendering.

## 타임라인 바꿔도 경로 안 바뀜

→ 후보 geometry 유지 + 즉시 재평가 + Shade detour 후보.

## 대안이 늦음

→ Wave / Stage A / Stage B.

## 대안이 목적지 지나감

→ Destination Lock.

## 시원한 길인데 실제 햇빛 시간이 더 김

→ Absolute Sun Exposure.

## 검색이 먼 도시를 먼저 찾음

→ bounded nearby search / distance sort / search radius.

## 경로 정보 라벨이 선 아래

→ routeLabelPane.

## 모바일 GPS FAB 무반응

→ Leaflet pointer/touch propagation 차단.

## 현재 위치가 메뉴 뒤에 숨음

→ visible map center.

## 타임라인 움직이면 메뉴 접힘

→ one-time mobile auto collapse + open state restore.

## 줌 시 그림자 튐

→ zoom transition freeze + stable tile + batch update.

## 신축 건물 누락

→ cache force refresh + Overture supplement.

---

# 40. 반드시 유지해야 할 기능

다음 기능은 패치 중 실수로 제거하면 안 된다.

1. GPS Permission Hotfix
2. HTTPS Secure Context 진단
3. PC/모바일 현재 위치 FAB
4. visible map center
5. OSM 건물
6. Overture 건물 보완
7. 건물 데이터 최신성 UI
8. 강제 원본 갱신
9. building height
10. building:levels
11. building:part
12. 자동 높이 추정
13. 태양 고도/방위각
14. 대기 굴절/timezone 보정
15. 시간 타임라인
16. 현재 시간 LIVE
17. 건물 그림자
18. 그림자 중첩 농도 방지
19. 건물 지붕 overlay
20. 식생 그림자
21. Weather
22. UV
23. Heat Score
24. 빠름 ↔ 시원함
25. 기본 시원함 75%
26. 최대 우회
27. 빠른 / 균형 / 최소 햇빛 비교
28. 실제 햇빛 시간 기준 추천
29. Active Shade Detour
30. 6개 대안 Wave
31. 즉시 후보 피드백
32. 후보 그림자 검증
33. 수동 경로 선택
34. Destination Lock
35. 시간 30분 전/후 비교
36. 가장 시원한 출발 시간
37. 주변 우선 장소 검색
38. 검색 반경 기본 2km
39. 최근 목적지
40. 즐겨찾기
41. 건물 popup 경로 탐색
42. 지도 popup 경로 탐색
43. OSRM routing
44. Valhalla fallback
45. timeout
46. 내비게이션 스타일 파란 경로
47. 경로 shade/sun stripe
48. route label
49. OSM 횡단보도
50. GPS watchPosition
51. GPS route snap
52. 실제 GPS 속도 학습
53. 예상 걸음
54. 경사도 ETA
55. 경로 이탈
56. 자동 재탐색
57. 현재 위치 기준 reroute
58. 다음 그늘
59. 다음 햇빛
60. 햇빛 사전 경고
61. 스마트 시원 경로 전환
62. Turn-by-Turn
63. OSRM steps
64. Valhalla maneuver
65. 회전 marker
66. 진동 안내
67. 경로 진행률
68. Smooth Zoom
69. Stable Building Tile Cache
70. IndexedDB
71. Shadow Spatial Grid
72. PC 상세 UI
73. ShadeWay Dark Mobile UI
74. Route Console
75. 설정 버튼 안 고급 기능 유지

---

# 41. 현재 기본 설정

대표 기본값:

```text
빠름 ↔ 시원함:
시원함 75%

최대 허용 우회:
40%

식생 가중치:
35%

검색 반경:
2km

자동 재탐색:
ON

시간/그림자 변화 자동 추천:
ON

햇빛 사전 경고:
ON

스마트 시원 경로:
ON

Overture 보완:
ON
```

버전별로 내부 slider max 등이 달라질 수 있으므로 변경 시 최신 HTML 값을 기준으로 확인.

---

# 41.1 v1.9.4.28 — P1 Complete Navigation

파일:

```text
ShadeWay_MVP_v1_9_4_28_P1_Complete_Navigation.html
ShadeWay_v1_9_4_28_P1_Complete_PWA.zip
```

목표:

> P0 검증 도구 위에 실제 보행 서비스에 필요한 P1 기능을 모두 연결하고, 남아 있던 P1 정확도/안정성 한계도 함께 개선한다.

## P1-A — 복잡 건물 그림자

기존 Convex Hull 방식은 ㄱ/ㄷ/U자 등 오목한 footprint를 볼록하게 메워 실제보다 넓은 그림자를 만들 수 있었다.

v1.9.4.28:

- convex building은 기존 빠른 hull projection 유지
- concave building은 원본 polygon + 이동 polygon + 각 edge quad의 sweep union으로 계산
- vertex가 과도하게 많은 geometry는 성능 보호를 위해 hull fallback
- 모든 shadow piece는 하나의 SVG compound path로 렌더링해 중첩 농도 증가 방지 유지
- building roof overlay가 위에 있어 건물 지붕 위 shadow 착시 방지 유지

## P1-B — 나무 정확도

OSM `natural=tree` node에서 가능한 경우:

- `height`
- `est_height`
- `crown:diameter`
- `diameter_crown`

을 읽어 실제 tree height / crown radius를 반영한다.

태그가 없으면 기존 기본값:

```text
height ≈ 7m
crown radius ≈ 4.5m
```

을 fallback으로 유지한다.

## P1-C — Heading Up

기존 disabled 상태를 해제.

보행 중 GPS heading이 유효하면:

- Leaflet mapPane을 진행방향 기준으로 회전
- OSM base / ShadeWay building / shadow / route가 함께 회전
- 보행 종료 또는 옵션 OFF 시 North Up으로 즉시 복귀
- 타일 keepBuffer 확대

정지/GPS heading 미지원 시 마지막 유효 heading을 사용한다.

## P1-D — 공개 API 안정성 1차

정식 Backend 이전 단계의 client resilience.

`fetchTimed()`에:

- provider별 성공/실패 횟수
- 최근 HTTP status
- 최근 latency
- GET 요청 네트워크/429/5xx 1회 자동 retry
- 설정의 API Health panel

추가.

기존 상위 레벨의:

- Overpass 2 provider fallback
- OSRM / Valhalla fallback
- timeout
- request abort/generation guard

는 유지한다.

Cloudflare backend / proxy / rate limit는 여전히 P2다.

## P1-E — 목적지 도착 감지

실시간 보행에서 다음을 동시에 사용한다.

- destination 직선거리
- route remaining distance
- route offset
- GPS accuracy
- 연속 3회 확인

도착 반경은 GPS accuracy에 따라 약 15~25m 범위에서 동적으로 사용한다.

오탐 방지를 위해 accuracy > 60m에서는 도착 판정을 하지 않는다.

도착 시:

- 진동
- 한국어 음성 안내 가능 시 도착 음성
- 실시간 watch 종료
- Walking Session Summary 자동 표시

## P1-F — Walking Session Summary

모든 일반 보행 세션에서 자동 기록:

- 총 거리
- 총 시간
- 평균 속도
- 예상 걸음
- 계산상 그늘 시간
- 계산상 햇빛 시간
- 최단길 대비 햇빛 절감
- 선택 경로 상승고도
- 평균 Heat Score

최근 20개 세션을 localStorage에 저장.

최근 결과 다시 보기 / JSON export 지원.

## P1-G — PWA

단일 HTML 외에 배포 패키지를 추가한다.

```text
index.html
manifest.webmanifest
sw.js
icons/icon-192.png
icons/icon-512.png
README_DEPLOY.txt
```

- standalone display
- 홈 화면 설치
- app shell cache
- navigation offline fallback
- Leaflet 등 runtime static asset cache

지도 tile / routing / search / weather / building API는 online 연결을 전제로 한다.

## P1-H — 한국어 음성 안내

Web Speech `speechSynthesis` 지원 브라우저에서:

- 보행 시작
- 약 90m 전 회전 준비
- 약 25m 전 회전 직전
- 목적지 접근/도착

안내.

가능하면 `ko-KR` voice를 선택하며 없으면 브라우저 기본 TTS를 사용한다.

설정에서 ON/OFF 가능.

## P1-I — Crosswalk / Walk Facility Improvement

기존 OSM crossing 외 추가:

- 보행 신호
- 계단
- 육교 / 보행교
- 지하 보행로
- 엘리베이터
- lowered kerb / wheelchair 접근성 태그

경로 약 35m 주변만 추출해 지도에 표시하고, 모바일 Route Dock에 시설 개수 요약을 표시한다.

## v1.9.4.28 회귀 보호

반드시 유지:

- v1.9.4.27 P0 Field Validation Suite 전체
- mobile SHADE TIME first
- Settings no-jump
- 검색 nearest focus + popup
- map labels always on top
- current location FAB
- OSM + Overture + optional VWorld
- route-first async architecture
- Destination Lock
- Active Shade Detour
- Turn-by-Turn / vibration
- P0 shadow / walk JSON field recorder

---


## v1.9.4.29 — P2 Backend + Shade Graph Beta

파일:

```text
ShadeWay_MVP_v1_9_4_29_P2_Backend_ShadeGraph.html
ShadeWay_v1_9_4_29_P2_Backend_ShadeGraph.zip
```

목표:

> 기존 브라우저 단독 MVP를 유지하면서 Cloudflare Worker를 선택적 서비스 계층으로 추가하고, 일반 라우터가 만들어 준 후보만 평가하는 한계를 넘기 위해 OSM 보행 그래프에서 시간대별 그림자 비용을 직접 계산하는 Shade Graph Beta를 추가한다.

### P2-A — Cloudflare Full-stack Worker

배포 구조:

```text
Browser / PWA
     │
     ▼
Cloudflare Worker + Static Assets
     │
     ├─ /api/health
     ├─ /api/search
     ├─ /api/route/osrm
     ├─ /api/route/valhalla
     ├─ /api/weather
     ├─ /api/elevation
     ├─ /api/overpass
     ├─ /api/buildings
     ├─ /api/vworld
     ├─ /api/building-pmtiles/*
     ├─ /api/shade-route
     └─ /api/telemetry
```

기본 `wrangler.jsonc`는 D1/R2가 없어도 동작하도록 구성한다.

정적 파일:

- `public/index.html`
- `manifest.webmanifest`
- `sw.js`
- PWA icons

API 경로만 Worker-first로 실행하고 나머지는 Static Assets로 전달한다.

### P2-B — API Proxy / Cache / Failover

클라이언트는 Cloudflare Backend가 응답하면 우선 사용한다.

대상:

- Nominatim search
- OSRM route
- Valhalla fallback
- Open-Meteo weather
- Open-Meteo elevation
- Overpass building / vegetation / crossing
- VWorld building supplement

Backend가 없거나 실패하면 기존 direct public API 요청으로 되돌아간다.

따라서 P2 장애가 기존 v1.9.4.28 기능 전체 장애로 이어지지 않는다.

Worker는 GET 계열 upstream 요청에 Cloudflare Cache API와 제한적 retry를 사용한다.

### P2-C — Rate Limit

Worker Rate Limiting binding을 분리한다.

기본 정책:

```text
일반 API       180 req / 60 sec
Shade Graph     12 req / 60 sec
```

Shade Graph는 Overpass graph fetch + 계산량이 크므로 별도 제한한다.

### P2-D — D1 선택 연결

Production 예시 설정에서 `DB` binding을 지원한다.

저장 목적:

- provider success/failure
- HTTP status
- latency
- endpoint category
- 시간

사용자 IP 주소 자체는 앱 코드에서 저장하지 않는다.

스키마:

```text
sql/schema.sql
```

D1이 연결되지 않아도 앱은 정상 동작한다.

### P2-E — R2 Building Data

Production 예시 설정에서 `BUILDING_DATA` R2 binding을 지원한다.

용도:

1. Overpass building JSON의 durable fallback cache
2. 선택적 한국 building PMTiles 저장
3. HTTP Range 기반 `/api/building-pmtiles/<key>` 제공

향후 한국 공식 building footprint를 PMTiles로 구축할 때 연결할 수 있다.

### P2-F — VWorld Secret 보호

기존 브라우저 입력 방식은 fallback으로 남긴다.

Worker 운영 시:

```text
VWORLD_KEY
VWORLD_DOMAIN
```

을 Worker secret으로 저장할 수 있다.

Backend에 secret이 연결되어 있으면 브라우저에 VWorld key를 직접 노출하지 않고 `/api/vworld`를 사용한다.

### P2-G — Server Quality Telemetry

기본:

```text
ALLOW_TELEMETRY=false
```

서버 저장을 사용하려면:

1. 운영자가 backend에서 명시적으로 허용
2. 사용자가 ShadeWay 설정에서 `서버 품질 기록`을 직접 ON

두 조건을 모두 만족해야 Walking Session Summary를 `/api/telemetry`에 전송한다.

### P2-H — Shade-aware Routing Graph Beta

새 endpoint:

```text
POST /api/shade-route
```

현재 일반 경로 방식:

```text
OSRM / Valhalla
→ 후보 geometry
→ ShadeWay가 그림자 평가
```

P2 Beta:

```text
OSM walkable ways
→ pedestrian graph
→ building footprint + height
→ 선택 시각 solar model
→ building shadow spatial index
→ edge shade(t)
→ edge distance / heat / walk-type penalty
→ A* variants
→ route-local elevation / grade / ETA
→ client Shadow Model 재검증
→ 기존 후보에 추가
```

생성 모드:

- shortest-oriented
- balanced
- cool/shade-oriented

기존 OSRM/Valhalla 경로를 먼저 표시하고 Shade Graph는 뒤에서 비동기로 실행한다.

Shade Graph가 실패하거나 늦어도 기존 경로 탐색은 유지한다.

### P2-I — Route-first 회귀 보호

아래 순서를 유지한다.

```text
1. OSRM / Valhalla 기본 경로 즉시 표시
2. 기존 건물/그림자 progressive loading
3. Shade detour 후보
4. Cloudflare Shade Graph 비동기 후보
5. 클라이언트 그림자 모델로 서버 후보 재검증
```

P2 서버 후보는 Destination Lock과 기존 경로 중복 제거를 통과해야 최종 후보로 추가된다.

### P2-J — Backend UI

설정에 `P2 Cloudflare Backend · Shade Graph BETA` 패널 추가.

표시:

- Backend online/offline
- Shade Graph 상태
- D1 binding 상태
- R2 binding 상태
- Rate Limit 상태
- backend base URL

옵션:

- Cloudflare Backend 자동 사용
- 직접 Shade Graph 후보 생성
- 서버 품질 기록
- Backend 확인
- Deep Test

### P2-K — 현재 Beta 한계

이번 버전의 Shade Graph는 실제 서비스 가능한 전체 한국 그래프를 사전 구축한 형태가 아니라 **요청 주변 OSM 데이터를 즉석에서 graph로 만드는 Local Graph Beta**다.

따라서:

- 장거리 경로보다 동네 보행 범위에 적합
- Overpass 응답량/속도 영향을 받음
- elevation은 모든 graph edge에 사전 주입하지 않고 후보 route에 대해 2차 계산/재정렬함
- 대규모 서비스에서는 한국 pedestrian graph + building/shade tile 사전 구축이 필요
- Worker CPU / subrequest / upstream API quota를 실제 Cloudflare 환경에서 측정해야 함

즉, P2의 아키텍처와 1차 엔진은 구현됐지만 **전국 규모 production Shade Graph 구축은 다음 서비스 데이터 파이프라인 단계**다.

### v1.9.4.29 검증

정적/단위 검사:

- Worker JS syntax PASS
- Shade Graph module syntax PASS
- Service Worker syntax PASS
- HTML inline JS syntax PASS
- DOM ID 중복 0
- JS `$()` DOM 참조 누락 0
- Shade Graph synthetic unit test PASS
- manifest JSON parse PASS

실제 Cloudflare 계정 배포와 D1/R2/VWorld secret 연결은 계정 리소스가 필요하므로 별도 실배포 검증이 남아 있다.

---


## v1.9.4.30 — Cloudflare Production Deploy

목표:

> GitHub를 단일 소스 저장소로 사용하고 Cloudflare Workers Builds가 `main` push마다 ShadeWay를 자동 배포하도록 운영 구조를 정리한다.

핵심 변경:

- `public/` + Worker를 하나의 Cloudflare Workers Static Assets 프로젝트로 고정
- `assets.run_worker_first`를 `/api/*`에만 적용하여 일반 정적 화면 요청은 Worker 사용량에서 분리
- 기본 `wrangler.jsonc`는 D1/R2 없이도 첫 배포 가능
- D1/R2는 `wrangler.storage.example.jsonc`로 선택 연결
- GitHub 안전용 `.gitignore`, `.dev.vars.example` 추가
- GitHub CI는 테스트만 수행하며 실제 production 배포는 Cloudflare native Git integration이 담당
- `README.md`, GitHub→Cloudflare 한국어 배포 가이드 추가
- 정적 asset `_headers`에 기본 보안 헤더 추가
- Service Worker/manifest를 v1.9.4.30으로 갱신
- Worker health에 production mode/버전/최대 Shade Graph 거리 표시
- Shade Graph 최대 범위를 degree 근사가 아니라 Haversine 실제 거리로 판정
- Rate Limit 응답에 HTTP `Retry-After` 추가
- telemetry 기본 OFF 유지
- Cloud Backend 장애 시 기존 public API fallback 유지
- Local Shade Graph는 여전히 BETA이며 전국 사전 구축 graph로 오인하지 않음

GitHub/Cloudflare 운영 원칙:

```text
GitHub main
    ↓ push
Cloudflare Workers Builds
    ↓ npx wrangler deploy
Static Assets + /api Worker
```

첫 배포는 D1/R2/VWorld key 없이 진행 가능하다.

# 42. 현재 알려진 한계

## v1.9.4.28 P1 구현 후 실기기 검증 필요

코드 구현은 완료했지만 다음은 실제 Android Chrome / Samsung Internet / 현장 보행에서 확인해야 한다.

- Heading Up 회전 중 blank tile / touch 좌표 / label readability
- Samsung Internet TTS voice 제공 여부와 반복 억제
- PWA 설치 prompt / standalone 실행 / Service Worker update
- concave building shadow 성능과 실제 그림자 정확도
- OSM tree height / crown tag가 적은 지역의 fallback 품질
- 계단·육교·지하도 OSM tagging 누락 지역
- 도착 감지 15~25m threshold 오탐/미탐
- Session Summary의 GPS 거리/그늘 시간 오차


## P0 — Overture 실제 테스트

v1.9.4.19에서 새로 추가됨.

실제:

- Chrome PC
- Edge PC
- Chrome Android
- Samsung Internet

에서 dynamic import / PMTiles / Range Request가 정상인지 확인 필요.

## P0 — 신축 건물

OSM + Overture 모두 없는 최신 건물은 표시 불가.

후속:

- VWorld
- 국가공간정보
- 한국 건물 footprint
- 로컬 건물 보정/그리기

검토.

## P0 — 그림자와 실제 현장 비교

시간:

- 아침
- 정오
- 오후
- 저녁

에서 실제 건물 그림자 길이/방향 검증.

## P0 — 추천 경로 현장 검증

지도 shade stripe와 실제 보행에서 체감하는 그늘이 일치하는지 확인.

## P1 — 복잡 건물 그림자

Convex hull 한계.

## P1 — 나무 정확도

높이/canopy 추정.

## P1 — Heading Up

Leaflet mapPane transform 충돌 가능성.

## P1 — 공개 API 안정성

정식 서비스 backend 필요.

---

# 43. 현재 최우선 테스트

## 건물 최신성

1. 신축 단지 위치 이동
2. 줌 16~18
3. 설정 → 지도·위치 도구
4. 건물 데이터 최신성
5. OSM timestamp
6. Overture release
7. 보완 건물 수
8. `최신 원본 확인`
9. 누락 건물 추가 여부
10. 그림자 발생 여부

## 그림자

1. 07:30
2. 12:00
3. 15:30
4. 17:30

비교.

## 경로

같은 목적지에서:

- 빠른
- 균형
- 최소 햇빛

햇빛 시간 비교.

## 모바일

- search
- route console
- timeline
- 설정
- 따라가기
- 횡단보도
- GPS FAB

스크롤 없이 핵심 사용 가능 여부.

---

# 44. 다음 개발 로드맵

## P0 — 모바일 통합 안정성 · 앱 내 Self-Test 구현, 실기기 실행 필요

가장 먼저 Android Chrome / Samsung Internet에서 확인:

- 첫 화면에서 현재 위치 FAB가 bottom sheet 바로 위에 보이는지
- 기본 / 펼침 / 축소 패널에서 FAB가 가려지지 않는지
- FAB 터치 시 지도 gesture에 먹히지 않고 현재 위치로 이동하는지
- 위치 권한 허용 후 FAB가 located 상태로 바뀌는지
- 목적지/Route Console/보행 모드에서도 FAB 위치가 정상인지

---

## P0 — Overture 실데이터 Probe 구현, 실기기 실행 필요

가장 먼저.

확인:

- dynamic import
- CORS
- PMTiles Range
- layer 이름
- release fallback
- geometry decode
- 중복 제거
- height
- attribution
- 모바일 성능

문제가 있으면 Overture loader를 안정화한다.

---

## P0 — 한국 건물 3차 Source Adapter 구현 · VWorld 인증키 실연결 필요

OSM + Overture에도 신축 단지가 없을 경우.

후보:

- VWorld
- 국가공간정보
- 국토부
- 자체 PMTiles

목표:

```text
OSM
↓
Overture
↓
Korea Official Building Source
```

---

## P0 — 실제 도보 Field Recorder 구현 · 현장 주행 기록 필요

같은 경로를 실제 걸어서 기록:

- GPS track
- 실제 햇빛/그늘
- 계산 shade
- 예상 ETA
- 실제 ETA

오차를 정리.

---

## P1 — 목적지 도착 감지

약:

```text
15~25m
```

도착:

```text
🎉 도착했습니다.
햇빛 노출을 최단길 대비 약 N분 줄였습니다.
```

---

## P1 — Walking Session Summary

보행 종료:

- 총 거리
- 총 시간
- 평균 속도
- 걸음
- 그늘 시간
- 햇빛 시간
- 최단길 대비 절감
- 상승고도
- Heat 평균

---

## P1 — PWA

- manifest
- service worker
- 홈 화면 설치
- full screen
- offline shell

지도/경로는 online.

---

## P1 — 음성 안내

현재 Turn HUD / vibration 다음.

예:

```text
80m 후 좌회전입니다.
그 후 약 120m 그늘 구간입니다.
```

Web Speech API 또는 native wrapper 단계 검토.

---

## P1 — Crosswalk Improvement

OSM crossing 외:

- 보행 신호
- 계단
- 육교
- 지하도
- 접근성

표시.

---

## P1 — v1.9.4.28 구현 완료 / 실기기 검증 단계

구현 완료:

- [x] 복잡 건물 concave shadow sweep
- [x] OSM tree height / crown 반영
- [x] Heading Up
- [x] client API health + GET retry
- [x] 목적지 도착 감지
- [x] Walking Session Summary
- [x] PWA package
- [x] 한국어 음성 안내
- [x] Crosswalk / 계단 / 육교 / 지하도 / 접근성 표시

다음은 기능 추가가 아니라 실기기/현장 검증으로 진행한다.

---

## P2 — v1.9.4.29 구현 완료 / Cloudflare 실배포 검증 단계

구현 완료:

- [x] Worker + Static Assets full-stack package
- [x] search / routing / weather / elevation / Overpass proxy
- [x] Cache API + upstream retry/fallback
- [x] Worker Rate Limiting bindings
- [x] optional D1 health/telemetry schema
- [x] optional R2 building cache / PMTiles Range
- [x] VWorld secret proxy
- [x] backend health/deep test UI
- [x] Local Shade-aware Routing Graph Beta
- [x] edge shade(t) / distance / heat cost
- [x] A* route variants
- [x] route-local elevation / grade / ETA reranking
- [x] existing OSRM/Valhalla route-first fallback

남은 실배포 검증:

- [ ] 실제 Cloudflare Worker 배포
- [ ] Rate Limiting binding 실계정 확인
- [ ] D1 database_id 연결 및 schema 적용
- [ ] R2 bucket 연결 및 PMTiles Range 실측
- [ ] VWorld secret 실키 연결
- [ ] Android Chrome / Samsung Internet에서 Backend fallback 확인
- [ ] 실제 동네 경로에서 Shade Graph와 기존 후보 비교
- [ ] Worker CPU / latency / upstream subrequest 비용 측정

다음 장기 단계:

> Local Graph Beta를 한국 전체 사전 구축 Pedestrian/Building/Shadow 데이터 파이프라인으로 확장한다.

---

# 45. 디자인 기준

앞으로 모바일 디자인:

> **Dark Map Utility + Mint Shade Accent**

타 앱은:

- 정보 계층
- 접근성
- 사용자 흐름

만 참고.

다음은 복제하지 않는다.

- 타 앱 고유 색상
- 카드 비율
- 아이콘 스타일
- 레이아웃 외형을 그대로 복제

ShadeWay는 자체 dark UI 유지.

---

# 46. 패치 작업 원칙

새 패치 때 반드시:

1. 최신 `v1.9.4.29`를 기준으로 시작
2. 이전 기능 삭제 금지
3. GPS Hotfix 유지
4. 경로를 건물 로딩보다 먼저 보여주는 원칙 유지
5. 목적지 잠금 유지
6. 실제 햇빛 시간 기반 경로 점수 유지
7. 모바일/PC 둘 다 확인
8. 타임라인 state 유지
9. 캐시 변경 시 migration 고려
10. Leaflet pane z-index 회귀 방지
11. 건물 중복 그림자 방지
12. OSM/Overture attribution 유지
13. 외부 API 실패 시 기존 기능까지 멈추지 않게 fallback
14. 결과물은 완전한 실행 HTML
15. 패치노트 MD도 함께 갱신하는 것을 권장

---

# 47. 다음 패치 시 Regression Checklist

## GPS

- [ ] 자동 권한
- [ ] denied 안내
- [ ] 현재 위치 FAB PC
- [ ] 현재 위치 FAB 모바일
- [ ] 메뉴에 위치 가리지 않음

## Search

- [ ] 가까운 장소
- [ ] 2km 기본
- [ ] 반경 변경
- [ ] 가장 가까운 1개
- [ ] 자동 경로

## Building

- [ ] OSM
- [ ] Overture
- [ ] 중복 없음
- [ ] height popup
- [ ] 새 건물
- [ ] force refresh
- [ ] timestamp

## Shadow

- [ ] 방향
- [ ] 길이
- [ ] 지붕 위 shadow 없음
- [ ] 겹침 농도 동일
- [ ] 타임라인 즉시
- [ ] zoom smooth

## Route

- [ ] OSRM
- [ ] Valhalla
- [ ] Destination Lock
- [ ] 6 detours
- [ ] 피드백 즉시
- [ ] 실제 햇빛 시간
- [ ] 빠른
- [ ] 균형
- [ ] 최소 햇빛
- [ ] 시간 전후

## Mobile

- [ ] Route Console
- [ ] SHADE TIME
- [ ] 설정
- [ ] 따라가기
- [ ] 횡단보도
- [ ] 스크롤 최소

## Walk

- [ ] watchPosition
- [ ] snap
- [ ] ETA
- [ ] steps
- [ ] Turn HUD
- [ ] 다음 그늘
- [ ] 햇빛 경고
- [ ] reroute

---

# 48. 최신 파일 목록

현재 개발의 핵심 최신 파일:

```text
ShadeWay_MVP_v1_9_4_31_Walk_Camera_Arrow_Stability.html
ShadeWay_Development_Handoff_v1_9_4_31.md
ShadeWay_v1_9_4_31_Walk_Camera_Arrow_Stability.zip
```

최신 패치 전후 참고:

```text
ShadeWay_MVP_v1_9_4_18_ShadeWay_Identity_UI.html
ShadeWay_MVP_v1_9_4_17_Mobile_Route_Dock_Crosswalks.html
ShadeWay_MVP_v1_9_4_16_Smooth_Zoom_Shadow_Cache.html
ShadeWay_MVP_v1_9_4_15_Route_Info_Bubble_Timeline_Fix.html
ShadeWay_MVP_v1_9_4_14_Desktop_Locate_Popup_Route.html
```

---

# 49. 새 채팅에서 가장 먼저 해야 할 것

새 채팅에서:

1. 이 MD 첨부
2. 최신 HTML 첨부
3. 아래 인수인계 프롬프트 입력
4. 최신 HTML 기준으로만 개발

---

# 50. 새 채팅용 인수인계 프롬프트

아래 내용을 그대로 새로운 채팅에 붙여넣는다.

```text
ShadeWay 프로젝트 개발을 이어서 진행해줘.

첨부한 개발 인수인계 MD와 최신 HTML을 먼저 확인하고,
반드시 최신 버전을 기준으로만 수정해줘.

현재 안정 기준:
ShadeWay_MVP_v1_9_4_31_Walk_Camera_Arrow_Stability.html

프로젝트 목적:
현재 GPS 위치, 건물 높이와 footprint, 태양 위치, 실시간 그림자,
식생, 날씨, UV, 실제 보행속도, 경사도를 분석해서 사용자가 목적지까지
걸어갈 때 실제 직사광선 노출 시간을 줄일 수 있는 보행 내비게이션 HTML/PWA를
만들고 있다.

현재 핵심 원칙:
- 단순 그늘 % 최대가 아니라 실제 직사광선 노출 시간 최소화를 중요하게 본다.
- 빠름 ↔ 시원함 사용자가 직접 조절한다.
- 기본 시원함 75%.
- 최대 허용 우회 기본 40%.
- 경로 서버 결과를 건물 API보다 먼저 보여준다.
- 목적지는 Destination Lock으로 절대 바뀌지 않는다.
- 타임라인 변경 시 확보된 모든 후보를 즉시 재평가한다.
- 실시간 보행 중 현재 위치와 연결되지 않는 후보로 갑자기 전환하지 않는다.
- PC와 모바일 모두 지원한다.
- 모바일 디자인은 ShadeWay 고유의 Dark Map Utility + Mint Shade Accent를 유지한다.
- 다른 앱은 정보 구조만 참고하고 시각 디자인을 그대로 복제하지 않는다.

건물 데이터:
- OSM/Overpass 우선.
- Overture Maps Buildings 자동 보완 기본 ON.
- IndexedDB building cache 24h.
- bldtile:v5.
- forceNetwork:true 강제 새로고침 지원.
- OSM timestamp와 Overture release를 UI에서 확인.
- OSM/Overture 중복 건물 제거.
- 최신 원본 확인 버튼 유지.

그림자:
- NOAA 계열 태양 계산.
- 대기 굴절/timezone 보정.
- 건물 높이 / tan(solarAltitude).
- 태양 반대 방향.
- convex-hull 기반 2D shadow.
- compound shadow로 중첩 농도 증가 방지.
- building overlay가 shadow보다 위.
- shadow model cache + spatial grid.
- smooth zoom: zoom 중 기존 그림자 유지, 종료 뒤 batch update.

경로:
- OSRM/OSM Foot 우선.
- Valhalla fallback.
- Active Shade Detour 최대 6개.
- Stage A 즉시 후보 평가.
- Stage B 건물/그림자 검증.
- 실제 햇빛 시간 + thermal exposure + ETA 기반.
- 빠른 / 균형 / 최소 햇빛.
- 수동 경로 선택.
- 시간 30분 전/현재/후 비교.
- Destination Lock.

검색:
- 현재 위치 가까운 순.
- 검색 반경 500m/1/2/3/5km.
- 기본 2km.
- 가장 가까운 결과 먼저.
- 목적지 선택 즉시 경로 분석.

실시간 보행:
- watchPosition.
- route snap.
- 실제 GPS 보행속도 학습.
- 경사도 ETA.
- 예상 걸음.
- Turn-by-Turn.
- OSRM steps / Valhalla maneuver.
- 다음 회전/도로명.
- vibration.
- 다음 그늘.
- 햇빛 구간 사전 경고.
- 경로 이탈/자동 재탐색.
- 스마트 시원 경로 전환.

UI:
- PC: 왼쪽 상세 분석 패널 + 지도.
- 모바일: Destination HUD + 지도 + SHADE TIME + Route Console + 설정 + 따라가기.
- OSM 횡단보도 표시.
- 설정 안에 기존 모든 고급 기능 유지.
- 현재 위치 FAB PC/모바일.
- visible-map center.
- 경로 라벨은 시간/남은거리/햇빛시간/그늘시간.

절대 제거하면 안 되는 기능은 MD의
'반드시 유지해야 할 기능' 섹션을 확인해줘.

현재 최우선:
1. v1.9.4.24에서 건물/그림자 로딩 후에도 건물명·도로명·장소명이 최상단 라벨 레이어에서 읽히는지 PC/Android 실기기 확인.
2. v1.9.4.23의 모바일 검색 후 가장 가까운 결과 이동 + 장소 말풍선 자동 표시 회귀 확인.
3. v1.9.4.21의 모바일 현재 위치 FAB가 패널 위에서 정상 노출되고 터치되는지 재확인.
4. v1.9.4.20에서 이어진 Overture 복구 패치를 실제 PC/Android에서 검증.
5. 사용자가 보고한 신축 건물이 OSM/Overture에서 보완되는지 확인.
6. Overture dynamic import 재시도 / PMTiles fallback / HTTP Range / CORS 안정성 확인.
7. 최신 건물이 들어오면 height 추정과 shadow가 즉시 생성되는지 확인.

패치 시 기존 기능이 빠지는 회귀를 가장 조심해줘.
완료 후 실행 가능한 전체 HTML 파일을 제공해줘.
```

---

# 51. v1.9.4.24 — Map Labels Always On Top

사용자 실기기 테스트에서 건물/그림자 오버레이가 OSM raster tile 내부의 건물명·장소명·도로명 위에 올라가 텍스트가 가려지는 문제가 확인되었다.

원인:

- OSM Standard base map은 raster tile이므로 타일 내부의 도로/건물/텍스트를 Leaflet pane별로 다시 분리할 수 없다.
- ShadeWay shadow/building overlay는 별도 pane(z 360/410)에 렌더링되지만 OSM 텍스트는 base tile 자체(z 약 200)에 포함되어 있어 오버레이 아래에 남는다.

수정:

- `mapTextPane` 신규 추가, z-index `615`.
- transparent labels-only raster overlay를 `mapTextPane`에 렌더링.
- label overlay는 `pointer-events:none`으로 지도 클릭/터치를 방해하지 않는다.
- 레이어 순서:
  - shadow `360`
  - building `410`
  - route alternatives/main/shade `510~555`
  - crossing `595`
  - **map text `615`**
  - ShadeWay route bubble labels `625`
  - walk markers `650`
  - Leaflet popup은 기본 popup pane으로 더 위에 유지
- 기존 OSM base tile, 건물/그림자 계산, routing, 검색 popup, GPS FAB 로직은 변경하지 않는다.

검증:

- JavaScript syntax PASS.
- DOM ID 135 / unique 135 / duplicate 0.
- `mapTextPane` 생성 및 labels-only tile 연결 확인.
- map text가 shadow/building/route line보다 높은 z-index인지 정적 검증.
- `pointer-events:none` 적용 확인.

실기기 확인 포인트:

- 건물 footprint 위 건물명/시설명이 그림자와 건물 fill보다 위에서 읽히는지.
- 도로명/역명/POI 이름이 경로선 위에서도 충분히 읽히는지.
- 지도 탭, 목적지 선택, 검색 popup 버튼 터치가 label tile 때문에 막히지 않는지.
- CARTO label tile이 불러와지지 않는 네트워크 환경에서도 기존 OSM base map과 ShadeWay 기능은 계속 동작하는지.

---

# 52. v1.9.4.25 — Mobile Home Shade Time + Separate Settings

사용자 요청에 따라 모바일 첫 화면의 정보 계층을 다시 `현재 위치/목적지 → SHADE TIME → 경로` 중심으로 정리했다. 이전 참고 UI 방향에서 중요했던 “스크롤 없이 현재 위치 그림자 시간을 바로 확인”하는 흐름을 복원했다.

핵심 변경:

- 목적지를 정하지 않은 모바일 기본 화면 최상단에 `SHADE TIME · 현재 위치 그림자` 타임라인을 추가.
- 타임라인 구성:
  - `지금 / ● LIVE` 버튼
  - 05:00~21:00 시간 slider
  - 선택 시각 표시
  - slider 조작 즉시 지도 건물/수목 그림자 재계산
- 기존 PC/상세 설정의 `timeSlider`, `timeInput`, 모바일 경로용 `mobileTimeSlider`와 동일 시간값으로 동기화.
- 경로 생성 후 기존 Route Console의 SHADE TIME은 그대로 유지.
- 모바일 기본 화면에서는 설정 관련 details를 숨겨 검색/시간 확인 흐름에서 제거:
  - 지도·위치 도구
  - 경로 성향
  - 태양·그림자 상세 설정
  - Heat/날씨 상세
  - 보행 자동화 설정
  - 진단 정보
- 기본 화면 타임라인 우측에 `⚙ 설정` 버튼 추가.
- 경로 생성 후 기존 Route Console의 `경로 설정` 버튼도 `설정`으로 단순화.
- 설정 버튼을 누르면 기존 기능을 삭제하지 않고 `mobile-settings-open` 전용 설정 시트에서 그대로 사용.
- 설정 시트 닫기는 기존 상단 `✕` 버튼을 재사용.
- PC UI/기능은 변경하지 않는다.

회귀 방지 원칙:

- 기존 `dateInput`, `timeInput`, `timeSlider`가 source of truth인 구조를 유지.
- 새로운 모바일 홈 slider는 별도 그림자 계산 시스템을 만들지 않고 기존 `setMinutes()`, `updateSun()`, `scheduleTimelineRefresh()`를 재사용.
- 기존 Route Console, 검색, GPS FAB, OSM/Overture 건물, labels overlay, routing 기능 유지.

정적 검증:

- JavaScript syntax PASS (`node --check`).
- DOM ID 140 / unique 140 / duplicate 0.
- 신규 모바일 홈 컨트롤 ID 존재 확인.
- 설정 그룹은 모바일 기본 화면에서 숨고 `mobile-settings-open`에서 다시 표시되도록 CSS 분리.

실기기 확인 포인트:

1. 앱 첫 진입 직후 스크롤 없이 SHADE TIME이 보이는지.
2. 현재 위치 확보 후 slider를 움직일 때 지도 그림자가 즉시 시간대에 맞춰 변하는지.
3. `지금` 버튼이 현재 시각으로 복귀하고 `● LIVE` 상태가 맞는지.
4. `⚙ 설정`을 누르면 기존 지도/건물/그림자/Heat/보행 설정을 볼 수 있는지.
5. 설정을 닫으면 첫 화면 타임라인 위치와 검색 UI로 정상 복귀하는지.
6. 목적지/경로 생성 후 기존 Route Console의 SHADE TIME과 선택 시간이 동일하게 유지되는지.

---

# 53. 현재 프로젝트 상태 요약


ShadeWay는 현재 단순 실험용 그림자 지도를 넘어 다음 시스템이 통합된 프로토타입이다.

- GPS
- 검색
- 보행 routing
- 복수 route
- dynamic detour
- 태양
- 건물
- 신축 building supplement
- 그림자
- 식생
- 날씨
- UV
- Heat
- 개인 속도
- 경사
- 예상 걸음
- 시간대별 route 변화
- Turn-by-Turn
- 횡단보도
- 모바일 Route Console

앞으로 중요한 것은 기능 수 추가보다:

1. 건물 최신성
2. 그림자 현장 정확도
3. 경로 추천 현장 검증
4. 모바일 실사용성
5. 외부 API 안정성
6. 정식 backend
7. PWA/배포

이다.

---

# 53. v1.9.4.26 — Settings Close No-Jump

## 문제

모바일 기본 화면에서 `⚙ 설정`을 열었다가 우측 상단 `✕` 닫기를 누르면, 일반 메뉴가 정상 위치로 돌아오기 직전에 내용이 위쪽으로 한 번 튀는 현상이 있었다.

원인은 설정 시트와 기본 시트가 같은 `aside` 스크롤 컨테이너를 공유하는 상태에서 대량의 설정 그룹이 `display:none/block`으로 교체될 때 Chromium 계열 브라우저의 Scroll Anchoring 및 기존 `scrollTop` 보정이 개입하는 것이었다.

## 수정

- 설정을 열기 직전 기본 패널의 `scrollTop` 저장
- 설정을 열기 직전의 시트 상태(`normal / expanded / compact`) 저장
- 설정 화면은 별도의 스크롤 컨텍스트처럼 항상 상단에서 시작
- 닫기 직전 `overflow-anchor:none` 적용
- 설정 그룹을 제거하기 전 설정용 `scrollTop`을 0으로 정리
- 같은 JavaScript task 안에서 기본 시트 상태와 기존 `scrollTop` 복원
- 다음 animation frame에서 모바일 Chromium이 scrollTop을 clamp하는 경우 한 번 더 복원
- 닫기 후 지도 `invalidateSize()` 및 모바일 시트 높이 변수 재계산

## 회귀 방지

다음 기능은 변경하지 않았다.

- 모바일 홈 SHADE TIME
- 현재 위치 FAB
- 검색 / 가장 가까운 목적지 포커스 / 검색 말풍선
- 경로 탐색 및 대안 경로
- 건물 / 그림자 / Overture
- 지도 라벨 최상단 표시
- Turn-by-Turn / 보행 모드

## 정적 검증

- JavaScript syntax: PASS
- DOM ID: 140개 / 중복 0
- `$()` 참조 누락 ID: 0

---


# 54. v1.9.4.27 — P0 Field Validation Suite

P0-1~P0-5를 한 번에 진행하되, 브라우저 코드만으로 실제 야외 현장 결과를 허위로 PASS 처리하지 않도록 **실기기 Probe + 현장 기록/오차 분석 도구**를 앱 내부에 추가했다.

## P0-1 — 모바일 실기기 통합 안정화

설정 → `🧪 P0-1~5 실기기 · 현장 검증`에서 모바일 Self-Test를 실행할 수 있다.

자동 점검:

- HTTPS / Secure Context
- Geolocation API
- 위치 Permission 상태
- Touch / Pointer Event
- VisualViewport
- localStorage
- IndexedDB
- 지도 라벨 pane의 레이어 순서
- 모바일 첫 화면 SHADE TIME 노출
- 현재 위치 FAB와 Bottom Sheet 간 겹침
- 설정 화면 닫기 후 scroll jump 오차
- 검색 결과 popup 상태

추가 안정화:

- `visualViewport.resize/scroll` 시 Bottom Sheet/FAB 위치 재계산
- 설정 닫기 후 실제 복원 scroll 오차를 기록하여 P0-1 결과에 표시

주의: 실제 Chrome Android / Samsung Internet PASS 판정은 사용자가 해당 기기에서 Self-Test를 실행해야 확정한다.

## P0-2 — Overture Real Data Probe

앱 내부에서 다음을 한 번에 검사한다.

1. Overture STAC `latest`
2. PMTiles/vector-tile/Pbf dynamic import
3. PMTiles header
4. 현재 지도 viewport의 실제 z/x/y Range tile
5. building/buildings layer 존재
6. sample geometry decode
7. 전체 Probe 시간

실패한 항목은 PASS/FAIL 행으로 분리해 표시한다. 기존 fallback release는 `2026-06-17.0`을 사용하며 STAC 최신값을 우선한다.

## P0-3 — 대한민국 건물 3차 보완 Source

OSM → Overture 다음 단계로 `국토교통부·VWorld GIS 건물통합정보 WFS` adapter를 추가했다.

설정 항목:

- 3차 보완 ON/OFF
- VWorld 사용자 인증키
- 인증 도메인
- WFS 건물 레이어명(기본 `lt_c_spbd`, 변경 가능)
- 연결 테스트
- 현재 화면 보완

동작:

- Polygon / MultiPolygon geometry parsing
- 가능한 경우 건물명, 높이, 지상층수 사용
- OSM / Overture / VWorld 공간 중복 제거
- VWorld 데이터 추가 즉시 건물/그림자 재계산
- visible viewport뿐 아니라 **선택 경로 주변도 비동기로 3차 보완**
- 경로선 자체는 보완 API를 기다리지 않으므로 기존 Route First 원칙 유지

주의:

- VWorld WFS는 사용자가 발급한 인증키 및 등록 도메인이 필요하다.
- 서비스의 실제 레이어 식별자가 환경/정책에 따라 달라질 수 있어 WFS 레이어명을 설정에서 수정할 수 있게 했다.

## P0-4 — 그림자 현장 정확도 기록

건물 popup에 `🔬 그림자 검증 대상` 버튼을 추가했다.

선택 건물에 대해 앱이 표시:

- 모델 건물 높이
- 태양 고도
- 예상 그림자 방향
- 예상 그림자 길이
- 그림자 배율

현장에서 사용자가 입력:

- 관측 건물 높이(알 수 있으면)
- 실제 그림자 방향
- 실제 그림자 길이
- 메모

저장 후 자동 계산:

- 방향 오차(°)
- 그림자 길이 오차율(%)
- 관측/모델 길이 scale ratio
- 누적 평균 방향 오차
- 누적 평균 절대 길이 오차
- 중앙값 scale ratio

최대 100건을 브라우저 localStorage에 저장한다.

주의: 이 패치는 **측정 체계를 구현한 것**이며, 실제 그림자 정확도가 검증 완료되었다는 뜻은 아니다. 아침/정오/오후/저녁 현장 관측이 필요하다.

## P0-5 — 실제 도보 Field Recorder

경로 분석 후 P0 도보 세션을 시작할 수 있다.

기록:

- GPS track sample
- GPS 누적 거리
- 경로 이탈 거리
- 모델이 판정한 현재 shade/sun
- 사용자가 누르는 `지금 그늘 / 지금 햇빛` 실제 상태 이벤트
- 예상 ETA
- 실제 소요시간
- 예상 직사광선 시간
- 실제 그늘/햇빛 시간
- 시간 가중 모델 일치율
- ETA 오차

세션 종료 후 localStorage에 최대 20건 저장하며, `JSON 내보내기`로 그림자 현장 관측 + 도보 세션 전체를 함께 출력할 수 있다.

주의: P0-5 역시 실제 야외에서 걷고 기록해야 최종 오차값이 생성된다.

## v1.9.4.27 추가 회귀 방지

- 한국/Overture 경로 보완은 background 작업으로 처리하여 기본 routing UI를 지연시키지 않는다.
- VWorld layer 식별자는 하드코딩 고정값만 강제하지 않고 설정 가능하게 했다.
- 기존 GPS Permission Hotfix, 검색, 가장 가까운 장소 popup, map text labels, 모바일 홈 SHADE TIME, 설정 No-Jump, Route Console, Turn-by-Turn을 유지한다.

## 정적 검증

- JavaScript syntax: PASS (`node --check`)
- DOM ID: 180개 / unique 180 / duplicate 0
- `$()` 참조 누락 ID: 0

## 다음 실제 테스트 순서

1. Android Chrome에서 P0-1 Self-Test
2. Samsung Internet에서 P0-1 Self-Test
3. P0-2 Overture Probe
4. VWorld 인증키/등록 도메인 입력 → P0-3 연결 테스트
5. 신축 건물 지역에서 OSM → Overture → Korea 보완 건물 수 비교
6. 07:30 / 12:00 / 15:30 / 17:30 P0-4 관측 저장
7. 같은 목적지를 빠른/균형/최소 햇빛 경로로 실제 보행하여 P0-5 세션 저장
8. JSON export 후 그림자 방향/길이 오차, ETA 오차, shade model 일치율 분석

---

**End of ShadeWay Development Handoff — v1.9.4.28**



---

# v1.9.4.30 GitHub/Cloudflare 배포 메모

실제 저장소 업로드용 패키지: `ShadeWay_v1_9_4_30_Cloudflare_Production_Deploy.zip`

Cloudflare Worker Git integration을 기준으로 하며 GitHub Pages 단독 배포는 P2 backend 기능을 실행하지 못하므로 production 경로로 사용하지 않는다.


---

# v1.9.4.31 — Walk Camera + Direction Arrow Stability

## 문제
실제 보행 안내 시작 후 `watchPosition()`이 갱신될 때마다 기존 `focusMapPointVisible()`이 먼저 `panTo()`하고 다음 프레임에 다시 `panBy()`하여 모바일 지도가 위/아래로 반복 이동하는 현상이 있었다. 또한 현재 위치가 원형 점이라 사용자가 실제 진행 방향을 지도에서 즉시 판단하기 어려웠다.

## 수정
- 보행 전용 `updateWalkCamera()` 추가.
- GPS 매 fix마다 강제 재센터하지 않고, 사용자가 안전 화면 영역을 벗어날 때만 1회의 부드러운 `panBy()` 수행.
- 첫 안내 시작은 하단 Walk 패널 레이아웃이 안정된 뒤 1회만 카메라를 맞춤.
- 카메라 애니메이션 중 중복 pan 억제 및 약 1.1초 throttle.
- 사용자가 지도를 직접 drag/zoom하면 7초간 자동 카메라 추적 일시 정지.
- 현재 위치 marker를 보행 중 파란 방향 화살표로 교체.
- `coords.heading` 우선, 미지원/불안정 시 실제 GPS 이동 벡터, 그마저 없으면 현재 route segment 방향을 사용.
- 방향을 angular smoothing하여 GPS heading jitter 완화.
- Heading Up 회전도 안정화된 heading을 공유하고 작은 각도 변화는 무시.
- 보행 종료 시 방향 화살표를 일반 현재 위치 원형 marker로 복원.
- 기존 route-first, Destination Lock, Shade Graph, Cloudflare Worker/PWA 구조는 유지.

## 실기기 확인 포인트
1. 안내 시작 후 제자리에서 지도가 위/아래로 반복 점프하지 않는지.
2. 걷는 동안 위치 화살표가 실제 진행 방향을 따라 회전하는지.
3. GPS heading 미지원 기기에서도 몇 m 이동 후 이동 방향으로 화살표가 맞춰지는지.
4. 화면 가장자리로 이동했을 때만 카메라가 부드럽게 따라오는지.
5. 지도 수동 드래그 후 즉시 강제로 원위치되지 않는지.
6. Heading Up ON/OFF 모두 화살표 방향이 이해 가능한지.

## 다음 안정 기준
`ShadeWay_MVP_v1_9_4_31_Walk_Camera_Arrow_Stability.html`


**End of ShadeWay Development Handoff — v1.9.4.31**
