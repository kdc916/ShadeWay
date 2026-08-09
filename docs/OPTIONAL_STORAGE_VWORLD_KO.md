# 선택 기능: VWorld / D1 / R2

ShadeWay v1.9.4.30은 **D1/R2 없이 먼저 배포**할 수 있습니다. 필요한 경우에만 아래 기능을 추가하세요.

## VWorld

Cloudflare Worker Runtime Secret으로 설정:

```text
VWORLD_KEY
VWORLD_DOMAIN
```

앱은 Worker `/api/vworld`를 통해 키를 사용하므로 브라우저에 실제 키가 노출되지 않습니다.

## D1

용도:

- API provider 성공/실패 상태
- HTTP status
- latency
- 사용자가 명시적으로 동의한 경우에만 route telemetry

예시:

```bash
npx wrangler d1 create shadeway-db
npx wrangler d1 execute shadeway-db --remote --file=./sql/schema.sql
```

생성된 `database_id`를 `wrangler.storage.example.jsonc`의 placeholder에 넣고, 검토 후 해당 구성을 `wrangler.jsonc`에 반영합니다.

## R2

용도:

- Overpass JSON durable fallback
- 한국 건물 PMTiles
- HTTP Range 기반 PMTiles 제공

예시:

```bash
npx wrangler r2 bucket create shadeway-building-data
```

그 후 `BUILDING_DATA` binding을 `wrangler.jsonc`에 반영합니다.

중요: Dashboard에서만 binding을 만들어 놓고 저장소의 `wrangler.jsonc`와 다르게 유지하지 않는 것을 권장합니다. GitHub 자동 배포에서는 저장소 설정을 최종 기준으로 관리하는 편이 안전합니다.
