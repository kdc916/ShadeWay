# GitHub → Cloudflare Workers 자동 배포 가이드

기준: ShadeWay v1.9.4.32

## 1. GitHub 저장소 만들기

1. GitHub에서 새 Repository를 생성합니다.
2. Public/Private는 운영 방식에 맞게 선택합니다.
3. 이 패키지 폴더의 파일들을 **폴더째 한 단계 더 넣지 말고 저장소 루트에** 올립니다.
4. 최소한 다음이 저장소 루트에서 보여야 합니다.

```text
package.json
wrangler.jsonc
public/
src/
```

`node_modules`, `.dev.vars`, `.env`는 올리지 않습니다.

## 2. Cloudflare에 GitHub 연결

Cloudflare Dashboard에서:

1. **Workers & Pages**
2. **Create application**
3. **Import a repository**
4. GitHub 연결
5. ShadeWay repository 선택
6. Production branch: `main`
7. Build command: **비워도 됨**
8. Deploy command: `npx wrangler deploy`
9. Root directory: `/` 또는 저장소 루트
10. Save and Deploy

저장소에 이미 `wrangler.jsonc`가 있으므로 Cloudflare 자동 구성 PR을 기다릴 필요 없이 이 설정을 source of truth로 사용합니다.

## 3. 배포 후 확인

먼저 Worker URL로 앱을 엽니다.

다음 URL을 확인합니다.

```text
https://<worker-host>/api/health
```

정상 예시:

```json
{
  "ok": true,
  "service": "ShadeWay Cloud Backend",
  "version": "1.9.4.32-production",
  "mode": "production"
}
```

앱에서는 **설정 → Cloud Backend · Shade Graph → Backend 확인**을 누릅니다.

Deep Test는 Nominatim/Open-Meteo/OSRM/Overpass 실제 upstream까지 검사하므로 평소 반복 실행할 필요는 없습니다.

## 4. GitHub push 이후

이제 코드를 수정하고 `main`에 push하면 Cloudflare에서 자동으로 production deploy가 시작됩니다.

PR/다른 브랜치는 Cloudflare 설정에서 non-production branch builds를 켜면 preview version으로 확인할 수 있습니다.

## 5. VWorld Secret (선택)

Cloudflare Worker → Settings → Variables & Secrets에서 Runtime secret을 추가합니다.

```text
VWORLD_KEY=<발급키>
VWORLD_DOMAIN=<허용 도메인>
```

절대로 GitHub의 HTML, JavaScript, `.dev.vars`에 실제 key를 커밋하지 않습니다.

## 6. Custom Domain (선택)

기본 workers.dev 주소에서 정상 동작을 확인한 뒤 Worker 설정에서 Custom Domain을 연결합니다.

도메인 연결 후에도 앱은 같은 origin의 `/api/*`를 자동 사용하므로 별도 API 주소 입력이 필요 없습니다.

## 7. 업데이트 원칙

- `public/index.html`이 실제 서비스 앱입니다.
- root의 `ShadeWay_MVP_*.html`은 버전 보관/직접 실행용입니다.
- Service Worker cache version은 앱 버전과 함께 변경합니다.
- `wrangler.jsonc`는 Cloudflare 배포 설정의 source of truth입니다.
- API key/secret은 GitHub에 저장하지 않습니다.
