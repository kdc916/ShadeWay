# ShadeWay v1.9.4.33 — Walk Route Arrow Fix

이번 안정화 버전은 실제 모바일 보행 테스트에서 발견된 진행 방향 화살표 180° 역방향 문제와 걸음 수 UI 의미/겹침 문제를 수정합니다. v1.9.4.31의 안정화된 보행 카메라와 기존 Cloudflare Production 구조는 그대로 유지합니다.

ShadeWay는 현재 시간의 태양, 건물/수목 그림자, 날씨/UV, 보행 속도와 경사를 이용해 **직사광선 노출을 줄이는 보행 경로**를 찾는 PWA입니다.

이 저장소는 **GitHub = 소스/버전 관리**, **Cloudflare Workers = 실제 서비스** 구조로 정리되어 있습니다.

## 가장 빠른 배포

1. 이 폴더의 **내용물 전체**를 GitHub 저장소 루트에 올립니다.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Import a repository**로 이동합니다.
3. GitHub 계정을 연결하고 ShadeWay 저장소를 선택합니다.
4. Production branch는 `main`을 사용합니다.
5. Build command는 비워도 됩니다.
6. Deploy command는 기본값 `npx wrangler deploy`를 사용합니다.
7. Root directory는 저장소 루트(`/`)입니다.
8. **Save and Deploy**를 누릅니다.

이후 `main`에 push하면 Cloudflare Workers Builds가 자동 배포합니다.

자세한 화면별 절차는 [`docs/GITHUB_CLOUDFLARE_DEPLOY_KO.md`](docs/GITHUB_CLOUDFLARE_DEPLOY_KO.md)를 확인하세요.

## 첫 배포에 필요한 것

기본 `wrangler.jsonc`는 별도 D1/R2 리소스 없이도 배포됩니다.

동작하는 핵심 API:

- `/api/health`
- `/api/search`
- `/api/route/osrm`
- `/api/route/valhalla`
- `/api/weather`
- `/api/elevation`
- `/api/overpass`
- `/api/buildings`
- `/api/shade-route`

D1/R2/VWorld Secret은 **선택 기능**입니다. 첫 배포를 복잡하게 만들지 않기 위해 기본 설정에서는 요구하지 않습니다.

## 선택 기능

- VWorld 건물 보완: Cloudflare Runtime Secret `VWORLD_KEY`
- D1 API health/telemetry 저장
- R2 Overpass fallback/building PMTiles

설정 방법은 [`docs/OPTIONAL_STORAGE_VWORLD_KO.md`](docs/OPTIONAL_STORAGE_VWORLD_KO.md)를 확인하세요.

## 개발

```bash
npm install
npm test
npm run dev
```

수동 배포가 필요할 때만:

```bash
npx wrangler login
npm run deploy
```

## 안전 기본값

- 서버 telemetry: **OFF**
- 일반 API rate limit: `180 / 60초`
- Shade Graph rate limit: `12 / 60초`
- Shade Graph 최대 직선거리: 기본 `6 km`
- Backend 장애 시 브라우저의 기존 public API fallback 유지
- 정적 파일은 Worker를 통과시키지 않고 Cloudflare Static Assets에서 직접 제공
- Worker-first는 `/api/*`에만 적용

## 주요 폴더

```text
public/                  실제 PWA 정적 파일
src/index.js             Cloudflare Worker API
src/shade-graph.js       Local Shade-aware A* graph engine
sql/schema.sql           선택적 D1 schema
scripts/preflight.mjs    배포 전 구조 검사
tests/                   Shade Graph 테스트
docs/                    배포/운영 문서
wrangler.jsonc           기본 운영 설정 (D1/R2 불필요)
```

## License

이 저장소에는 라이선스를 자동 지정하지 않았습니다. 공개 저장소로 배포하기 전, 소스 재사용 조건을 직접 결정한 뒤 `LICENSE` 파일을 추가하세요.


## v1.9.4.33 Follow navigation fix

- Follow 시작 후 경로 중간의 파란 회전/방향 마커를 지도에서 제거했습니다. 회전 안내는 상단 Turn HUD에만 표시됩니다.
- 현재 위치 파란 화살표는 경로 위에 있을 때 GPS 센서 heading 대신 **현재 경로의 14m 전방 방향**을 우선 사용합니다.
- Android 기기에서 heading 값이 180° 반전되어 보이던 실제 기기 문제를 회피합니다.
- 경로 이탈 시에는 실제 GPS 이동 벡터/heading fallback을 사용합니다.
