# 프론트엔드 배포 경로

전체 저장소는 Render 통합 실행과 기존 Vercel 프론트 분리 실행을 지원합니다. 두 방식은 비회원 분석 엔진과 결과 저장소의 제공 범위가 다릅니다.

| 구성 | 진입점·API 연결 | 안내 |
| --- | --- | --- |
| Render 통합 | 루트 `uvicorn app.main:app`, 같은 주소의 화면·API·워커 | [Render 안내](render.md) |
| Vercel 프론트 + Render API | Root Directory `frontend`, `wsgi.py`의 `app`, `BACKEND_URL`로 API 연결 | [Vercel 안내](vercel.md) |

Render 통합의 기본 실행·환경변수·저장소 설명은 [전체 저장소 통합 안내](../../../docs/frontend-integration.md)를 따릅니다. 루트 `requirements.txt`가 양쪽 의존성을 설치하며 별도 프론트 서비스나 워커가 필요하지 않습니다. `frontend/render.yaml`은 과거 프론트 전용 Blueprint 위치를 설명하는 안내 파일입니다.

Vercel은 프론트 의존성만 사용하며 회원 로그인·평가·보고서 API를 기존 Render 백엔드로 전달합니다. 현재 Vercel 프론트 전용 구성에는 비회원 분석 엔진이 포함되지 않습니다. 임시 SQLite를 영구 보고서 저장소로 사용하지 않습니다.

현재 인증은 PostgreSQL·JWT 기반입니다. 과거 Supabase·쿠키·OAuth 설정을 현재 배포 설정에 적용하지 않습니다. 브라우저는 상대 `/api` 경로를 사용하며 비밀키는 서버 환경에서 관리합니다.

화면 실행에는 npm 설치가 필요하지 않습니다. JavaScript 테스트 준비는 [프론트 README](../../README.md#코드와-검증)를 참고하세요. 실제 운영 배포·로그인·유료 분석은 로컬 합성 테스트와 구분하여 확인합니다.
