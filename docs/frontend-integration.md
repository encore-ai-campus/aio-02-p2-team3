# 프론트 통합 안내

## 기준과 실행 구조

2026-10-13 통합 작업은 `CareerLens-fullstack` 기준 `9ec80d9`에 `CareerLens-frontend`의 `185f9fc` (`v2026.10.13-0925`) 프론트 작업을 적용합니다. 최신 백엔드의 PostgreSQL·JWT·문서 파싱·UUID 및 날짜 직렬화 수정은 유지합니다. 이 문서는 준비된 소스의 실행 방법이며 운영 배포 완료 기록이 아닙니다.

```text
브라우저 /                 → 프론트 화면·모션
브라우저 /api/v1/...       → 기존 FastAPI 회원 API
  /local-guest/...         → 프론트 비회원 계산·인증 후 결과 연결
  /local-data/...          → 문서 변환·공고 자료·본인 평가 대시보드
FastAPI lifespan          → PostgreSQL 연결·회원 평가 워커
비회원 엔진               → 루트 app/ 파서·그래프·채점·보고서
```

`app.main:app`가 기존 API 라우트 뒤에 프론트를 연결합니다. `/api/v1/auth/session`처럼 구현되지 않은 API는 404를 유지하여 프론트의 API 모드 판별이 작동합니다. 프론트가 제공하는 로컬 API만 별도 경계를 통과합니다. 같은 프로세스의 프론트 내부 요청은 `127.0.0.1:$PORT`로 연결합니다.

## 설정

설정 파일은 저장소 루트 `.env`입니다. 프로세스 환경변수가 파일보다 우선하며 키는 서버에서만 사용합니다.

| 설정 | 용도 |
| --- | --- |
| `DATABASE_URL` | 현재 PostgreSQL 연결 |
| `JWT_SECRET_KEY` | 현재 계정 인증 서명 키, 최소 32자 |
| `OPENAI_API_KEY` | 실제 분석 모델 호출 |
| `EMBEDDING_DIMENSIONS=1536` | 지원되는 비회원 임베딩 차원 |
| `PORT` | 통합 서버의 내부 연결 포트, Uvicorn 포트와 일치 |
| `FRONTEND_PUBLIC_ORIGIN` | 브라우저 주소, 사용자 지정 HTTPS 도메인도 여기 지정 |
| `CAREERLENS_GUEST_ANALYSIS` | `1` 기본, `0`이면 새 비회원 계산 중지 |
| `CAREERLENS_GUEST_STORE_PATH` | 선택 사항, 비회원 결과 SQLite 파일의 서버 경로 |

현재 계정·DB 연결에 Supabase URL·키를 넣지 않습니다. 이전 Supabase 계정·저장 자료가 현재 PostgreSQL로 자동 이전되지는 않습니다. 통합 실행은 내부 주소를 사용하므로 `BACKEND_URL`을 설정할 필요가 없습니다. `frontend/.env`와 `FRONTEND_PORT`는 독립 프론트 실행에만 해당합니다.

루트 `requirements.txt`는 `frontend/requirements.txt`도 설치합니다. 전체 저장소만 받아 실행할 수 있으며 형제 `CareerLens-backend` 폴더가 필요하지 않습니다. 이전 분리 저장소 방식의 엔진 경로는 호환 목적으로 지원합니다. 새 통합 실행에서 별도 `workers.evaluation` 프로세스를 추가하지 않습니다.

Windows 로컬 예시:

```powershell
$env:PORT = "5400"
$env:FRONTEND_PUBLIC_ORIGIN = "http://127.0.0.1:5400"
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5400 --loop app.core.asyncio:uvicorn_loop_factory
```

다른 포트를 사용하면 두 포트 값과 브라우저 주소를 함께 바꿉니다. Uvicorn `--port`는 `.env`의 `PORT`만으로 자동 변경되지 않습니다.

## 결과 저장과 배포

회원 API의 이력서·평가·보고서는 PostgreSQL에 저장됩니다. 비회원이 먼저 계산한 결과는 기본 `frontend/.runtime/guest-reports.sqlite3`에 저장되며 인증 후 연결한 결과도 이 저장소를 사용합니다. 해당 결과를 기존 회원 DB로 자동 이관하지 않습니다. 인증 전 결과 본문·점수는 반환하지 않습니다.

임시 파일 시스템만 사용하는 Render 구성에서는 프론트 SQLite 결과가 재시작·재배포 때 유지된다고 보장할 수 없습니다. 이미 사용할 수 있는 영속 디스크가 있다면 `CAREERLENS_GUEST_STORE_PATH`를 그 디스크의 파일 경로로 지정합니다. 이 통합은 디스크를 신규 생성하거나 유료 리소스를 신청하지 않습니다. 여러 인스턴스가 각자 별도 SQLite를 사용하면 결과·쿠키 연결이 공유되지 않으므로 현재 저장소 구성을 확인한 후 운영 범위를 정해야 합니다.

기존 팀 Blueprint는 `blueprints/team3.yaml`입니다. `aio2-team3`, `agentservice-team3`, `agent-db-team3` 이름과 기존 DB 연결·JWT 키를 유지합니다. 루트 `render.yaml`은 독립 환경용입니다. 두 구성의 `pip install -r requirements.txt` 및 `uvicorn app.main:app --host 0.0.0.0 --port $PORT`가 프론트까지 포함합니다. 별도 프론트 서비스나 별도 워커는 필요하지 않습니다.

`frontend/render.yaml`의 이전 프론트 전용 배포 정의는 통합 실행에 사용하지 않습니다. 운영 서비스의 배포 완료와 비회원 가용성은 실제 적용 후 확인해야 합니다. 이번 로컬 작업으로 GitHub나 운영 서비스가 자동 변경되지는 않습니다.

## 다른 PC에서 다를 때

1. 같은 `CareerLens-fullstack` 브랜치·커밋을 사용하는지 확인합니다. 이전 분리 저장소의 `main` 또는 `sub-main/withandwithout` 이름만 맞추는 것으로는 같은 백엔드 버전이 보장되지 않습니다.
2. 루트 의존성을 서버가 실행되는 동일한 가상환경에 설치했는지 확인합니다. 프론트의 네 가지 패키지만 설치하면 실제 분석 엔진을 불러올 수 없습니다.
3. 루트 `.env` 또는 서버 환경에 현재 PostgreSQL·JWT·모델 설정이 있는지 확인합니다. 개인 `.env`는 Git으로 전달되지 않습니다.
4. `PORT`와 Uvicorn `--port`, 브라우저 주소가 일치하는지 확인합니다.
5. `/api/v1/local-guest/capabilities`의 `available`을 확인합니다. `true`는 엔진 import·설정 확인이며 실제 모델 응답·잔액·DB·완료 결과를 검사한 값은 아닙니다.

`/healthz`는 생존, `/health`는 DB 상태를 확인합니다. 비회원 계산 가능 여부와 보고서 열람 권한은 다릅니다. 현재 흐름은 로그인 전 계산, 로그인·가입 후 본문 표시입니다. 회원 보고서 API가 인증 없이 401을 반환하는 것은 의도된 동작입니다.

마이페이지 대시보드는 프론트의 `/api/v1/local-data/member-performance`로 본인 평가만 조회합니다. 기존 백엔드 관리자 API의 403을 없애거나 일반 회원에게 관리자 권한을 부여하지 않습니다.
