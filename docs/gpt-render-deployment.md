# GPT 실행용 CareerLens Render 배포 설명서

작성일: 2026-10-13. 코드 검토 기준: `9ee86ebc1e6357901d916dd258cc862e02aba1b4`. 이 파일은 배포 실행 지침이며, 배포 완료 기록이 아니다. 실행할 때 통합 브랜치의 최신 SHA와 차이를 다시 확인한다.

## 1. GPT에게 그대로 전달할 요청문

아래 요청문과 이 파일을 함께 전달한다. GPT에는 GitHub 읽기, Render 설정·배포, 서버 명령 실행 중 필요한 도구와 계정 접근이 있어야 한다. 문서만 읽는 일반 채팅은 직접 배포할 수 없으며, 로그인·2FA·누락된 비밀값은 사용자가 연결해야 한다. 키를 채팅이나 Git에 붙여 넣지 않고 플랫폼의 비밀 입력 기능을 사용한다.

```text
이 저장소의 docs/gpt-render-deployment.md를 읽고 CareerLens 통합본을
기존 Render 서비스에 실제로 배포한 뒤 검증해 줘. 설명이나 계획에서 끝내지 말고,
접근 가능한 도구로 실행해 줘.

저장소: 931njhthe-star/CareerLens-fullstack
브랜치: codex/frontend-fullstack-integration
기존 서비스: agentservice-team3
기존 프로젝트: aio2-team3
기존 DB: agent-db-team3
기존 공개 주소: https://agentservice-team3.onrender.com

현재 통합 브랜치를 확인하고 배포할 SHA를 고정해.
기존 서비스의 빌드·시작 설정, 필요한 환경변수 보완,
체크포인트 준비, 해당 SHA 배포와 기능 확인까지 진행해.
기존 DATABASE_URL·JWT_SECRET_KEY와 회원·보고서 데이터를 보존해.
일반 설정 변경과 배포는 위 요청 범위에서 계속 진행하고,
기존 DB 초기화·삭제, main 병합·강제 푸시, 임의 코드 수정은 하지 마.
새 유료 리소스나 요금 증가는 기존 비용 승인이 없으면 금액과 필요 사유를 물어봐.
테스트 계정·자료와 유료 분석 허용 범위가 없으면 먼저 비용 없는 검증까지 끝내고,
실제 분석은 미검증으로 구분해. 임의 계정을 만들지 마.
접근권한·워크스페이스·비밀값 등 반드시 필요한 입력만 한 번에 요청해.
최종 결과에는 적용 SHA, 서비스 URL, 성공/실패/미검증 항목과 남은 조치를 적어 줘.
```

기본 경로는 **기존 팀 서비스 갱신**이다. 별도 신규 환경을 사용자가 요청한 경우에만 5-B를 사용한다. 설명서를 읽었다는 사실 자체를 배포 승인으로 취급하지 않고, 위와 같은 사용자의 실행 요청 범위에서 작업한다.

## 2. 실행 대상과 접근 확인

1. 저장소의 지침과 [README](../README.md), [통합 구조](frontend-integration.md)를 읽는다. 원본 작업 폴더에 미커밋 변경이 있으면 그 폴더를 바꾸지 않고 별도 사본에서 확인한다.
2. GitHub와 Render 인증 상태를 확인한다. Render 커넥터가 있다면 `list_workspaces`로 목록을 확인하고, 해당 도구가 요구하는 사용자 확인을 받은 `workspaceId`를 재사용한다. 이후 `list_services`, `get_service`, `list_postgres_instances`, `get_postgres`로 대상 ID를 확정한다. 이름만 보고 임의 워크스페이스나 비슷한 서비스를 선택하지 않는다.
3. 서비스 ID, 실제 URL, 연결 저장소·브랜치, 현재 Live SHA, 빌드·시작·Pre-deploy 명령, Auto-Deploy, 리전, 인스턴스, 디스크 마운트와 DB 리소스 ID를 기록한다. 환경변수는 키 이름과 설정 여부만 보고서에 남긴다. 기존 환경값은 플랫폼의 비공개 복원 수단으로 보존한다.
4. Git에서 대상 SHA를 조회한다. 아래는 **별도 새 작업 폴더에서** 실행하는 예다.

```bash
git clone --single-branch --branch codex/frontend-fullstack-integration https://github.com/931njhthe-star/CareerLens-fullstack.git careerlens-deploy
cd careerlens-deploy
git rev-parse HEAD
git log -5 --oneline
git diff --stat 9ee86ebc1e6357901d916dd258cc862e02aba1b4 HEAD
```

`git rev-parse HEAD` 결과를 `TARGET_SHA`로 기록한다. 검토 기준 이후 실행 코드가 바뀌었다면 관련 설정·테스트를 확인한 뒤 확정한다. 문서 추가만 있다면 동일 애플리케이션 코드다. PR #1 병합은 이 브랜치를 직접 배포하는 데 필요하지 않다.

Render 커넥터가 지원하지 않는 설정은 인증된 Render CLI/API 또는 Dashboard로 처리한다. 도구의 실제 스키마와 `--help`를 확인하고 존재하지 않는 업데이트 도구를 가정하지 않는다. 기존 리소스 갱신에 `create_web_service`를 사용하지 않는다. 루트 [render.yaml](../render.yaml)은 독립 환경용이고, [blueprints/team3.yaml](../blueprints/team3.yaml)은 팀 구성이다. 기존 운영 환경에 Blueprint를 무조건 새로 적용하면 안 된다. `frontend/render.yaml`은 이 통합본의 배포 진입점이 아니다.

## 3. 배포 전 기존 데이터를 보존한다

| 자료 | 실제 저장 위치 | 보존 기준 |
| --- | --- | --- |
| 회원·이력서·공고·평가 결과 | `DATABASE_URL`이 가리키는 PostgreSQL | 기존 DB 연결과 JWT 키 유지 |
| 비회원 분석 후 계정에 연결한 보고서까지 | SQLite, 기본 `frontend/.runtime/guest-reports.sqlite3` | 영속 디스크 및 기존 파일 이관 |
| 단계별 실행 기록 Markdown | 기본 `data/private/evaluation_execution_reports` | 서버 폴더 보존, 쓰기·읽기 경로 일치 |

계정에 연결된 비회원 보고서는 자동으로 PostgreSQL로 옮겨지지 않는다. 실행 기록의 DB 사본이 있어도 현재 파일 목록 API는 파일이 필요하다. PC의 `CareerLens-backend/data/private/evaluation_execution_reports`는 Git으로 전달되지 않는다. 파일을 옮기더라도 해당 평가 UUID와 계정 소유권이 연결된 DB가 있어야 목록에 나타난다.

**기존 파일 확인·백업은 서비스 설정 변경, 디스크 추가, 재배포보다 먼저 한다.** 임시 디스크의 원본이 사라진 뒤에는 경로 설정으로 복구할 수 없다. 보존할 SQLite가 있다면 실행 중인 분석이 끝난 것을 확인하고 SQLite backup API 등 일관된 백업 방식으로 외부 비공개 저장소에 확보한다. 실행 중인 DB의 본체 파일만 복사하면 WAL 데이터가 누락될 수 있다. 기존 Markdown도 비공개로 백업한다. 토큰·보고서 본문을 출력하거나 Git에 올리지 않는다. 백업·복원 경로 접근이 없으면 이관이 필요한 배포 단계만 중단하고 필요한 접근을 요청한다.

이미 영속 디스크가 있으면 그 마운트를 재사용한다. 없으면 필요한 디스크와 실제 비용을 확인하고 기존 승인 범위에서 추가한다. 아래 `/var/data`는 예시 마운트다. 실제 마운트와 경로를 일치시킨다. 최초 경로 전환 시 확보한 파일을 복원하고 무결성·접근권한을 확인한다. 빈 경로가 준비됐다는 이유로 이관 성공을 선언하지 않는다.

영속 디스크는 단일 인스턴스로 운영하며 배포 중 잠깐 중단될 수 있다. 디스크는 Build/Pre-deploy에서 접근할 수 없으므로 실제 실행 인스턴스의 Shell/SSH에서 파일 복원을 수행한다. [Render 디스크 안내](https://render.com/docs/disks)

## 4. Render 설정을 맞춘다

준비 중 Auto-Deploy를 Off로 두고 현재값을 기록한다. 기존 서비스 환경변수는 가능하면 저장만 하고 마지막에 배포한다. 환경변수 업데이트 커넥터를 사용한다면 `replace=false`로 필요한 키만 병합한다. 전체 환경을 빈 목록이나 새 목록으로 덮어쓰지 않는다.

| 설정 | 값 |
| --- | --- |
| Repository | `931njhthe-star/CareerLens-fullstack` |
| Branch | `codex/frontend-fullstack-integration` |
| Root Directory | 빈 값, 저장소 루트 |
| Runtime / Python | Python / `.python-version`의 `3.13` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/healthz` |
| Instances / `WEB_CONCURRENCY` | `1` / `1` |

루트 앱이 프론트와 평가 워커까지 실행한다. 별도 프론트 서비스·워커·Redis·npm 빌드는 추가하지 않는다. `PORT`는 Render 제공값을 사용한다. 로컬 `.env`의 `5400`을 복사하지 않는다. `BACKEND_URL`도 필요하지 않다.

| 환경변수 | 적용 기준 |
| --- | --- |
| `DATABASE_URL` | 기존 팀 PostgreSQL 연결값 유지. 신규만 같은 리전 DB의 Internal Database URL |
| `JWT_SECRET_KEY` | 기존 키 유지. 신규 환경만 32자 이상 무작위 키를 비공개 생성 |
| `OPENAI_API_KEY` | 실제 모델에 접근할 수 있는 기존 운영 키 |
| `OPENAI_MODEL` | 기존 호환 모델 유지. 코드 기본값 `gpt-6-luna`; 접근·구조화 출력 호환 확인 |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | `text-embedding-3-small` / `1536` |
| `APP_ENV` / `AUTH_ENABLED` / `CHECKPOINT_ENABLED` | `production` / `true` / `true` |
| `FRONTEND_PUBLIC_ORIGIN` | 실제 HTTPS origin, 기존 서비스는 `https://agentservice-team3.onrender.com` |
| `CORS_ORIGINS` | 위 origin. 기존에 승인된 다른 origin은 필요 여부를 확인하고 보존 |
| `CAREERLENS_GUEST_ANALYSIS` | `1` |
| `CAREERLENS_GUEST_STORE_PATH` | 실제 영속 경로. 예: `/var/data/careerlens/guest-reports.sqlite3` |
| `EVALUATION_EXECUTION_REPORT_DIR` | 실제 영속 경로. 예: `/var/data/careerlens/evaluation_execution_reports` |
| `CAREERLENS_EXECUTION_REPORTS_DIR` | 바로 위와 **동일한 폴더** |

두 origin에 화면 경로·해시를 붙이지 않는다. Render Python의 기본 프록시 전달 설정을 임의로 바꾸지 않는다. 키의 존재만으로 모델 사용 가능성을 확정하지 않는다. 기존 JWT 키가 없거나 DB 대상이 불분명하면 추측해 재생성·교체하지 말고 누락 항목을 모아 요청한다.

## 5. PostgreSQL과 체크포인트 준비

### A. 기존 팀 DB를 계속 쓰는 경우: 기본 경로

현재 연결 DB를 읽기 전용으로 확인한다. Render Postgres 조회 도구가 있으면 아래 SQL을 실행할 수 있다. 테이블 존재는 전체 스키마 호환성이나 모델 성공을 보증하지 않는다.

```sql
SELECT current_database() AS database_name,
       to_regclass('public.app_users') AS users_table,
       to_regclass('public.evaluation_runs') AS runs_table,
       to_regclass('public.analysis_reports') AS reports_table,
       to_regclass('career_lens_checkpoints.checkpoints') AS checkpoints_table;
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

기존 앱 테이블과 자료가 있는 DB에는 전체 초기화 SQL이나 `scripts.apply_runtime_migration`을 실행하지 않는다. 구형 Supabase DB는 현재 앱의 `app_users`·JWT 구조와 같지 않다. DB가 다른 스키마라면 별도 이관이 필요하며 이를 빈 DB로 취급하지 않는다.

체크포인트가 준비되지 않았거나 버전 준비가 필요한 경우 이번 배포의 Pre-deploy Command는 다음이다. 체크포인트 스키마에 쓰는 명령이며 순차 재실행을 지원한다. 동시에 두 곳에서 실행하지 않는다.

```bash
python -m scripts.setup_checkpoints
```

로그의 `Private checkpoint schema initialized.`를 확인한다. 이미 준비됐다면 Pre-deploy는 비워도 된다. 기존 공고가 있으면 `seed_data`는 실행하지 않는다. 이 명령은 데이터 확인용이 아니라 공고를 갱신하는 명령이다.

### B. 사용자가 별도로 요청한 새 빈 DB에만 적용

새 DB 리소스 ID·연결 대상을 확인하고 빈 DB임을 확인한 뒤 수행한다. 기준 코드의 `scripts.apply_runtime_migration`은 기본 tuple 결과에 `existing['has_objects']`로 접근하는 오류가 있다. **이 문서는 원본 코드를 수정하지 않는다.** 오류가 남아 있다면 아래 대체 블록을 Render Linux의 일회성 Pre-deploy Command 또는 해당 코드를 가진 DB 접근 가능 환경에서 실행한다. 새 DB의 최초 기동 전에는 실행 중인 서비스 Shell이 없을 수 있으므로 Pre-deploy를 사용한다.

이 블록은 원래 스키마 파일과 비어 있음 검사를 유지하고 결과 형식만 `dict_row`로 지정한다. 파일 경로는 저장소 루트 기준이다.

```bash
set -e
python - <<'PY'
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from app.core.config import ROOT, settings
from app.core.asyncio import run

async def main():
    try:
        dsn = settings().database_url.get_secret_value()
        if not dsn:
            raise RuntimeError("DATABASE_URL is required")
        schema = (ROOT / "migrations/render/000_full_schema.sql").read_text(
            encoding="utf-8-sig"
        )
        async with await AsyncConnection.connect(
            dsn, row_factory=dict_row, connect_timeout=15
        ) as conn:
            row = await (await conn.execute(
                "select exists (select 1 from pg_class c "
                "join pg_namespace n on n.oid=c.relnamespace "
                "where n.nspname='public' "
                "and c.relkind in ('r','p','v','m','S')) as has_objects"
            )).fetchone()
            if row["has_objects"]:
                raise RuntimeError("Refusing to initialize non-empty public schema")
            await conn.execute(schema, prepare=False)
        print("Render schema initialized.")
    except Exception as error:
        print("Initialization failed: " + type(error).__name__)
        raise SystemExit(1) from None

run(main())
PY
python -m scripts.setup_checkpoints
```

신규 DB에 샘플 공고를 넣도록 요청받았다면 성공 후 `python -m scripts.seed_data --limit 100`을 별도로 실행한다. 기본 평가 기준 12개는 위 스키마가 넣으므로 공고 시딩과 구별한다.

스키마 초기화가 성공한 즉시 일회성 초기화 블록을 다음 배포의 Pre-deploy에서 제거한다. 이후 단계만 실패했다면 성공한 초기화부터 다시 실행하지 않고 실패한 단계부터 이어간다. 빈 DB가 아니라는 오류를 없애기 위해 DB를 지우지 않는다.

## 6. 고정한 SHA로 실제 배포한다

설정 저장·디스크 연결로 이미 배포가 시작됐다면 먼저 해당 배포의 SHA와 상태를 조회한다. 목표 SHA로 진행 중이거나 Live이면 중복 배포하지 않는다. 새 서비스 생성도 배포를 시작할 수 있다.

가장 간단한 경로는 Dashboard의 **Manual Deploy → Deploy a specific commit**에 `TARGET_SHA`를 넣는 것이다. 이 방식은 Auto-Deploy를 끈다. `Restart service`는 기존 코드를 다시 실행하므로 새 통합본 배포를 대신하지 않는다. Pre-deploy는 유료 서비스에서 제공하며 실제 인스턴스와 파일 시스템을 공유하지 않는다. [Render 배포 절차](https://render.com/docs/deploys)

자동화 도구를 사용할 때는 다음 중 가능한 하나를 사용한다.

- Render 커넥터의 `trigger_deploy`가 SHA 인자를 지원하지 않는다면 무조건 호출하지 않는다. 연결 브랜치 HEAD가 목표 SHA이고 경쟁 변경이 없는지 확인하거나, 특정 SHA를 지원하는 API/CLI로 진행한다.
- Render CLI는 설치된 버전의 `render deploys create --help`에서 인자를 확인한 뒤 `--commit`으로 목표 SHA를 지정한다. [CLI 안내](https://render.com/docs/cli)
- Render REST API는 다음 요청을 지원한다. 인증 키는 비밀 저장소에서 가져와 실행 환경에만 주입한다. `commitId`를 생략하지 않는다. 이 요청은 실제 배포를 시작한다. [Trigger deploy API](https://api-docs.render.com/reference/create-deploy)

```http
POST https://api.render.com/v1/services/{확인한_SERVICE_ID}/deploys
Authorization: Bearer {비밀_저장소의_RENDER_API_KEY}
Content-Type: application/json

{"commitId":"확정한_TARGET_SHA","clearCache":"do_not_clear"}
```

CLI/API로 SHA를 지정해도 Auto-Deploy가 자동으로 꺼지는 것은 아니므로 준비 단계에서 Off 여부를 확인한다. 위 API 응답의 deploy ID를 기록하고 커넥터의 `get_deploy`/`list_deploys` 또는 Dashboard로 종료 상태를 확인한다. 로그는 15~30초 간격으로 제한해서 조회하고, 실패하면 해당 배포의 원인을 확인한다. 요청 타임아웃 때에는 배포 목록을 확인한 뒤 재시도하여 중복 배포를 피한다.

`Live` 상태와 배포 메타데이터의 commit SHA가 `TARGET_SHA`와 같아야 한다. 시작 로그의 `Application startup complete`와 워커 시작/오류도 확인한다. Shell이 있다면 `printenv RENDER_GIT_COMMIT`으로 SHA만 추가 확인한다. 전체 환경변수를 출력하지 않는다.

## 7. 배포 후 검증과 완료 판정

우선 공개 주소에 소수의 GET 요청을 보낸다. 일시 연결 오류는 최대 두 번만 재시도하고 그 뒤 상태·로그를 확인한다.

| 확인 | 기대 결과·한계 |
| --- | --- |
| `/` | HTTP 200과 실제 첫 화면 |
| `/healthz` | HTTP 200, `status: ok`; 서버 생존 확인 |
| `/health` | HTTP 200, `status: ok`; DB 연결 확인 |
| `/api/v1/local-guest/capabilities` | HTTP 200, `available: true`; 설정·엔진 로딩 확인 |
| `/src/app/main.js` | HTTP 200; 대상 Git 파일과 비교할 때 CRLF/LF를 정규화 |

정적 파일 일치만으로 백엔드 전체 SHA를 확정하지 않는다. 배포 메타데이터를 같이 확인한다. `/health`, capabilities 성공만으로 가입·실제 분석·보고서 저장까지 성공했다고 보고하지 않는다.

Render Shell에서 다음을 실행할 수 있다. DB 내용을 출력하지 않는 점검 스크립트다. 첫 번째는 public 테이블만 검사하며 체크포인트 확인을 대신하지 않는다. 두 번째는 모델 메타데이터 조회이며 유료 분석을 실행하지 않는다. `failed`/`missing` 메시지가 있으면 종료 코드가 0이어도 실패다.

```bash
python -m scripts.check_db
python -m scripts.check_connections
```

사용자가 제공한 테스트 계정이 있으면 로그인 후 본인 대시보드, 기존 회원 보고서 목록·상세·다운로드, 기존 비회원 출발 저장 보고서, 실행 기록 파일 목록·상세를 확인한다. 기존 자료가 없는 계정의 빈 목록은 정상일 수 있다. 새로 추가된 실행 파일 목록은 DB 결과 목록과 별개다. 파일이 없다는 이유로 자동 재분석하지 않는다. 앱의 일반 사용 과정에는 세션 갱신과 만료 보고서 정리 등 쓰기가 발생하므로 이 단계는 완전한 읽기 전용 감사로 부르지 않는다.

테스트 자료와 유료 분석 범위까지 승인돼 있으면 비회원 분석 → 로그인 후 기존 결과 열기, 회원 분석 → 완료·보고서 다운로드를 각각 한 번 확인한다. 보고서 ID를 기록하고 운영에 허용된 재시작 후 동일 결과를 열어 영속성을 확인한다. 토큰과 보고서 본문은 결과 보고서에 남기지 않는다. 승인 범위가 없으면 이 단계만 미검증으로 남긴다. `scripts.smoke_backend`도 계정 생성·모델 호출이 포함되므로 비용 없는 검증 명령으로 실행하지 않는다.

## 8. 실패 시 조치와 최종 보고

| 증상 | 다음 조치 |
| --- | --- |
| 다른 코드가 올라옴 | Render repo/branch와 배포 SHA 확인, 검증한 통합 SHA 지정 |
| 초기화 TypeError | 신규 DB인지 확인 후 5-B 사용. 기존 DB에는 초기화 실행 금지 |
| DB 테이블·pgvector 오류 | 현재 DB 리소스/스키마 확인. 기존 DB이면 자동 전체 초기화 금지 |
| 체크포인트·워커 오류 | `setup_checkpoints` 결과와 워커 로그 확인 |
| guest `available: false` | 루트 실행, 엔진 경로, 의존성, 키, guest 설정 확인 |
| guest true지만 분석 실패 | 모델 권한·요금 한도·호환성과 실제 오류 확인 |
| 저장 보고서 누락 | PostgreSQL/SQLite 종류, 계정, 디스크·백업·복원 확인 |
| 실행 기록만 없음 | 두 보고서 폴더 설정, UUID 파일 존재, 평가 소유권 확인 |

원인을 확인하지 않은 반복 재배포는 하지 않는다. 새 버전이 기존 서비스 기능을 깨뜨렸고 이전 Live 커밋과 설정이 현재 DB에 호환된다면 기존 정상 SHA로 복구한다. DB를 되돌리거나 삭제하지 않는다. 경로 이관 후에는 이전 코드도 보존된 자료를 읽는 설정인지 확인한다. 복구가 불확실하면 현재 배포 상태와 필요한 조치만 정확히 보고한다.

최종 응답은 아래 항목을 채운다. 실제 검증 결과와 미검증을 분리한다.

```text
대상: workspace / service ID / DB resource ID
배포: TARGET_SHA / 적용 SHA / deploy ID / Live 여부 / 확인 시각
서비스: 실제 URL
보존: 기존 DB·JWT 유지 여부 / SQLite·실행 파일 저장 경로 / 이관 여부
기본 검증: 화면 / healthz / health / guest capabilities
기능 검증: 대시보드 / 회원 보고서 / 비회원 출발 보고서 / 실행 파일
실제 분석·재시작 영속성: 성공·실패·미검증과 이유
남은 조치: 필요한 사용자 입력 또는 해결할 오류만
Auto-Deploy: 최종 설정과 연결 브랜치
```

배포와 기본 검증만 완료됐다면 **“배포 및 기본 검증 완료, 실제 분석은 미검증”**으로 적는다. 해당 계정·모델·자료로 실제 흐름까지 통과했을 때만 검증한 범위의 기능 정상 작동을 보고한다.
