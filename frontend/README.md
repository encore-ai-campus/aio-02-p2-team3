# CareerLens Frontend

최신 `main`의 `fbc2450`에 기존 화면·모션·보고서·창별 이용 흐름과 실행 보고서 조회·공고 캐시 개선을 통합한 Render 배포 작업본입니다. HTML/CSS와 브라우저 ES module을 사용하며 화면 실행에 npm 빌드는 필요하지 않습니다.

## 실행

기본 실행 방법은 [전체 저장소 README](../README.md)입니다. 루트에서 의존성을 설치하고 `uvicorn app.main:app` 하나를 실행하면 화면·API·평가 워커가 같은 주소에서 작동합니다. 별도 `CareerLens-backend` 폴더나 `start.bat`은 필요하지 않습니다.

루트 `.env`에 현재 PostgreSQL·JWT·모델 설정을 둡니다. 프론트 전용 옵션과 배포 구조는 [통합 안내](../docs/frontend-integration.md)를 참고하세요. `frontend/.env.example`은 선택적으로 `server.py`를 따로 실행하는 개발용 설정 예시이며 통합 실행의 기본 설정 파일은 루트 `.env`입니다.

현재 배포 대상은 기존 Render 서비스입니다. [Render 안내](infra/deploy/render.md)의 통합 실행을 사용합니다.

## 화면과 결과

이력서 → 채용공고 → 모의지원 흐름과 공고를 먼저 선택하는 경로를 지원합니다. 회원 분석은 기존 평가 API·워커가 실행하고 실제 진행률을 전달합니다. 최종 보고서 수신이 확인되어야 완료 화면을 엽니다. 보고서 점수 표시는 정수로 반올림하지만 저장값과 계산값은 바꾸지 않습니다.

비회원도 실제 분석을 먼저 수행합니다. `guest_analysis_engine.py`가 루트 `app/`의 파서·그래프·채점·보고서 엔진을 사용하며 임시 결과는 프론트 서버에 보관합니다. 인증 전에는 본문·점수를 브라우저로 전달하지 않습니다. 로그인·가입 성공 후 같은 결과를 계정에 연결하고 두 번째 분석을 시작하지 않습니다.

모델 설정이나 의존성이 없으면 연결 오류를 표시합니다. `CAREERLENS_GUEST_ANALYSIS=0`은 새 비회원 분석을 끄며 회원 API의 인증이나 기존 보고서 소유권을 바꾸지 않습니다. 기본 비회원 결과 저장 위치는 `.runtime/guest-reports.sqlite3`이며 배포 시 보존 범위는 [통합 안내](../docs/frontend-integration.md#결과-저장과-배포)를 확인하세요.

## 마이페이지와 관찰 창

대시보드는 `/api/v1/member/evaluation-performance`로 로그인한 계정의 평가 기록을 보여줍니다. 구형 백엔드를 사용하는 독립 프론트에서는 같은 경로를 기존 회원 평가 API로 중계합니다. 백엔드의 관리자 권한은 유지합니다.

대시보드의 **보고서 목록 불러오기**에서 서버의 `data/private/evaluation_execution_reports`에 저장된 본인 실행 Markdown을 각각 열 수 있습니다. `CAREERLENS_EXECUTION_REPORTS_DIR`로 읽을 경로를 지정할 수 있습니다. 소유권 검증 후 파일을 읽으며 원본은 변경하지 않습니다. 사용자 PC의 파일은 Git이나 Render로 자동 업로드되지 않습니다.

이용 흐름은 작업 창 A와 관찰 창 A, B와 B를 고정 연결합니다. 다른 창으로 자동 전환하거나 전체 사용자를 수집하지 않습니다. 같은 출처에서 동작하며 비회원의 대시보드·관찰 화면 직접 접근은 인증 안내로 전환합니다. 입력 원문·보고서 본문·토큰을 관찰 이벤트에 담지 않습니다. 자세한 UI 동작은 [이용 흐름 설계](docs/product/activity-flow.md)를 참고하세요.

## 코드와 검증

| 위치 | 역할 |
| --- | --- |
| `src/app`, `src/pages` | 라우팅·상태·화면 |
| `src/features` | 인증·작업·보고서·모션 |
| `src/shared/api` | 회원 API·비회원 결과 어댑터 |
| `server.py` | 프론트 로컬 API·독립 실행 서버 |
| `backend_location.py` | 전체 저장소 및 기존 형제 저장소의 엔진 경로 확인 |
| `guest_analysis_engine.py`, `guest_analysis_service.py` | 실제 계산·임시 저장·인증 후 연결 |

`frontend` 폴더에서 실행합니다.

```powershell
../.venv/Scripts/python.exe -m pytest -q tests
npm ci --prefix tools/matching-eye --ignore-scripts
node --test tests/unit/*.test.mjs
```

`npm ci`는 JavaScript 테스트의 Three.js 의존성 설치용이며 서비스 실행에는 필요하지 않습니다. Python 테스트는 pytest 함수와 unittest 클래스를 모두 실행합니다. 테스트는 합성 자료·가짜 제공자 응답을 사용합니다. 실제 운영 DB나 모델 분석 성공 여부는 별도 확인 대상입니다. 이 폴더의 이전 배포 문서와 계약 snapshot은 과거 구조를 포함하므로 현재 실행·설정은 전체 저장소 안내를 우선합니다.
