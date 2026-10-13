# CareerLens Fullstack

프론트 화면, FastAPI, 평가 워커를 Render 한 서비스에서 실행합니다. 현재 작업본은 전체 저장소 `main`의 `fbc2450`을 기준으로, 기존 프론트 통합 작업과 회원 대시보드 API를 유지하면서 실행 보고서 파일 조회를 연결합니다. 코드 준비와 실제 운영 배포 완료는 구분하며 버전별 이력은 [변경 기록](frontend/VERSION_HISTORY.md)을 참고하세요.

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
- 대시보드의 실행 보고서 목록은 본인 평가와 연결되는 서버의 UUID Markdown 파일만 표시합니다. 목록에서 파일을 골라 단계별 시간·LLM 호출 기록을 확인하며 인증정보는 표시용으로 가립니다. 원본 파일은 변경하지 않습니다.

## 배포와 확인

Render 통합 배포는 팀 환경의 [blueprints/team3.yaml](blueprints/team3.yaml), 독립 환경의 [render.yaml](render.yaml)을 사용합니다. 기존 `uvicorn app.main:app` 시작 명령이 화면과 API를 함께 제공합니다. 팀 서비스·프로젝트·DB 이름을 유지하며 이 구성에서는 별도 프론트 서비스를 만들 필요가 없습니다. `frontend/render.yaml`은 이전 독립 프론트 구성의 안내 파일입니다.

`/healthz`는 프로세스 생존, `/health`는 DB 연결, `/api/v1/local-guest/capabilities`는 비회원 엔진의 의존성·설정 가용성을 확인합니다. 가용성 응답은 실제 모델 요청이나 분석 성공을 보증하지 않습니다.

비회원 결과의 기본 저장 위치는 `frontend/.runtime/guest-reports.sqlite3`입니다. 임시 파일 시스템의 배포에서는 재시작·재배포로 결과가 사라질 수 있습니다. 기존 영속 디스크를 사용할 때 `CAREERLENS_GUEST_STORE_PATH`를 그 디스크의 파일 경로로 지정합니다. 회원 API가 저장한 PostgreSQL 보고서와는 별도 저장소입니다.

실행 보고서 파일은 기본 `data/private/evaluation_execution_reports/*.md`에서 읽습니다. 경로를 바꿀 때는 백엔드가 쓰는 `EVALUATION_EXECUTION_REPORT_DIR`와 프론트가 읽는 `CAREERLENS_EXECUTION_REPORTS_DIR`를 같은 서버 폴더로 맞춥니다. 배포 서버는 개인 PC의 폴더를 직접 읽지 못합니다. 이미 사용할 수 있는 영속 저장소의 경로 설정과 세 종류 보고서의 차이는 [실행 보고서 연결 안내](docs/frontend-integration.md#실행-보고서-파일-연결)를 참고하세요.

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

