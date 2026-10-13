# CareerLens Fullstack

프론트 화면, FastAPI, 평가 워커를 한 저장소에서 실행합니다. 전체 저장소 기준 `8e5869c`의 PostgreSQL·JWT 인증과 Render·Vercel 배포 지원에 프론트 `185f9fc` (`v2026.10.13-0925`)의 화면·보고서·창별 이용 흐름을 연결했습니다. 통합 버전은 `v2026.10.13-1005`이며 아래 내용은 준비된 소스 기준입니다. 운영 배포 완료를 의미하지 않습니다.

## 로컬 실행

Python 3.13 (`.python-version`)과 설정된 PostgreSQL DB가 필요합니다. 저장소 루트에서 실행합니다.

```powershell
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

이미 `.env`가 있다면 복사하지 않고 기존 설정을 보존합니다. 루트 `.env`에 `DATABASE_URL`, 32자 이상의 `JWT_SECRET_KEY`, `OPENAI_API_KEY`를 설정합니다. 새 DB 초기화와 기존 DB를 구분하는 기준은 [백엔드 실행 안내](docs/backend-implementation.md)를 참고하세요. 프론트 연결을 위해 기존 DB를 초기화할 필요는 없습니다.

```powershell
$env:PORT = "5400"
$env:FRONTEND_PUBLIC_ORIGIN = "http://127.0.0.1:5400"
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5400 --loop app.core.asyncio:uvicorn_loop_factory
```

브라우저에서 [http://127.0.0.1:5400](http://127.0.0.1:5400)을 엽니다. `PORT`와 Uvicorn `--port`를 같은 값으로 지정해야 프론트 내부 API 연결이 맞습니다. 루트 의존성 설치에 프론트 의존성도 포함되며 별도 npm 빌드는 필요하지 않습니다. 평가 워커는 FastAPI가 시작하므로 별도 워커를 실행하지 않습니다.

## 분석과 인증

- 회원 분석과 저장 보고서는 기존 PostgreSQL API·워커를 사용합니다. 인증은 현재 백엔드의 이메일·비밀번호와 JWT를 사용합니다.
- 비회원 분석은 프론트 서버가 루트 `app/`의 실제 엔진으로 계산하고 비공개 임시 저장소에 결과를 보관합니다. 보고서 본문·점수는 로그인 또는 가입 후 인증을 확인하여 보여주며 재분석하지 않습니다.
- 비회원 엔진을 사용할 수 없으면 연결 오류를 표시합니다. 저장소를 받는 것만으로 모델 키나 DB 설정이 복사되지는 않습니다.
- 마이페이지 대시보드는 본인 평가 기록을 조회합니다. 이용 흐름은 같은 출처의 원래 작업 창과 관찰 창을 고정 연결합니다. 백엔드 관리 API의 관리자 권한은 유지합니다.

## 배포와 확인

Render 통합 배포는 팀 환경의 [blueprints/team3.yaml](blueprints/team3.yaml), 독립 환경의 [render.yaml](render.yaml)을 사용합니다. 기존 `uvicorn app.main:app` 시작 명령이 화면과 API를 함께 제공합니다. 팀 서비스·프로젝트·DB 이름을 유지하며 이 구성에서는 별도 프론트 서비스를 만들 필요가 없습니다. `frontend/render.yaml`은 이전 독립 프론트 구성의 안내 파일입니다.

기존 Vercel 프론트 + Render API 분리 배포도 유지합니다. Vercel은 저장소의 `frontend` 폴더를 기준으로 Flask를 실행하고 `BACKEND_URL`에 Render HTTPS 주소를 사용합니다. 이 프론트 전용 배포에는 비회원 실제 분석 엔진이 포함되지 않으므로 Render 통합 실행과 가용 기능이 다릅니다. [Vercel 설정과 확인 방법](frontend/infra/deploy/vercel.md)을 참고하세요.

Render 통합 실행에서 `/healthz`는 프로세스 생존, `/health`는 DB 연결, `/api/v1/local-guest/capabilities`는 비회원 엔진의 의존성·설정 가용성을 확인합니다. Vercel 프론트의 `/health`는 프론트 생존과 API 주소 설정 여부만 확인합니다. 가용성 응답은 실제 모델 요청이나 분석 성공을 보증하지 않습니다.

비회원 결과의 기본 저장 위치는 `frontend/.runtime/guest-reports.sqlite3`입니다. 임시 파일 시스템의 배포에서는 재시작·재배포로 결과가 사라질 수 있습니다. 기존 영속 디스크를 사용할 때 `CAREERLENS_GUEST_STORE_PATH`를 그 디스크의 파일 경로로 지정합니다. 회원 API가 저장한 PostgreSQL 보고서와는 별도 저장소입니다.

연결 구조, 환경변수, 다른 PC에서의 점검 순서는 [프론트 통합 안내](docs/frontend-integration.md), 화면 동작은 [프론트 README](frontend/README.md)를 참고하세요.

## 코드 위치와 검증

| 위치 | 역할 |
| --- | --- |
| `frontend/` | 화면·모션·API 어댑터·비회원 분석과 결과 연결 |
| `app/frontend.py` | 같은 프로세스에 프론트 연결·API 경계 |
| `app/api/`, `app/application/` | 회원 API·업무 흐름 |
| `app/agent/`, `app/modules/` | 분석 그래프·채점·보고서 |
| `app/infrastructure/database/` | PostgreSQL 연결 |
| `workers/` | FastAPI가 실행하는 평가 워커 |

```powershell
./.venv/Scripts/python.exe -m pytest -q
npm ci --prefix frontend/tools/matching-eye --ignore-scripts
Push-Location frontend
../.venv/Scripts/python.exe -m pytest -q tests
node --test tests/unit/*.test.mjs
Pop-Location
```

`npm ci`는 JavaScript 테스트에 필요한 Three.js 의존성을 설치합니다. 서비스 실행에는 npm 설치가 필요하지 않습니다. 합성 응답 기반 테스트와 실제 모델·DB 분석은 구분합니다. 이 실행 안내는 원격 DB 초기화, 실제 유료 분석, GitHub 게시 또는 운영 배포를 자동 수행하지 않습니다.

