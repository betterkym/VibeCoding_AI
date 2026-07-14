# Supabase + Vercel 연결

## 1. Supabase 테이블 생성

1. Supabase 프로젝트를 생성합니다.
2. `SQL Editor`를 엽니다.
3. [`supabase/schema.sql`](supabase/schema.sql)의 전체 내용을 붙여넣고 실행합니다.

이 SQL은 `draws` 테이블을 만들고 브라우저의 직접 접근을 차단합니다. 읽기와 쓰기는 Vercel 서버 함수만 수행합니다.

## 2. Supabase 연결 정보 확인

Supabase 대시보드의 `Project Settings > API Keys`에서 다음 값을 확인합니다.

- Project URL
- Secret key (`sb_secret_...`)

Secret key는 브라우저 코드, GitHub, 채팅에 입력하지 마세요.

## 3. Vercel 환경변수 등록

Vercel 프로젝트의 `Settings > Environment Variables`에서 다음 두 값을 등록합니다.

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase Secret key |

Production, Preview, Development 중 사용할 환경을 선택합니다. 환경변수를 변경한 뒤에는 새로 배포해야 적용됩니다.

## 4. 배포

GitHub 저장소를 Vercel 프로젝트로 가져와 배포합니다. 배포가 끝나면 `/api/draws`가 Supabase와 통신하고, 번호 추첨 시 결과가 자동 저장됩니다.

## 로컬 개발

Vercel CLI를 설치한 환경에서는 다음과 같이 실행합니다.

```bash
vercel env pull .env.local
vercel dev
```

`.env`과 `.env.local`은 Git에서 제외됩니다.
