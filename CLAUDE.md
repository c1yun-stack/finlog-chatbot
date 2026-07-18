# CLAUDE.md

이 문서는 AI 어시스턴트(Claude 등)가 **핀로그(FinLog) 금융 챗봇** 저장소에서 작업할 때
구조·워크플로·규칙을 빠르게 파악하도록 돕기 위한 가이드입니다.

## 프로젝트 개요

핀로그는 마스코트 **오르소(상승장 황소)** 와 **고마(하락장 곰)** 가 금융 용어와 시사 쟁점을
쉽게 설명해 주는 **브라우저 완결형 금융 학습 챗봇**입니다.

- 서버·빌드·번들러·프레임워크 없음. **바닐라 HTML/CSS/JS 한 파일**로 동작합니다.
- 모든 지식 데이터, 마스코트 이미지(base64), 스타일, 로직이 `index.html` 안에 인라인되어 있습니다.
- 파일 하나만 브라우저에서 열면(더블클릭) 인터넷 없이 완전하게 작동합니다.

현재 수록 규모(변경 시 이 수치도 갱신):
- 금융 지식 항목(KB) **108개 = 일반용어 87 + 학습주제 21** (학습주제는 `topic === true` 플래그로 판별)
- FAQ **63문답**

> 주의: 주제 판별은 **반드시 `topic === true`** 로 한다. `category === '핀로그 학습주제'` 인 항목은
> 11개뿐이며(carbon-tax·short-selling 등 10개 주제는 실제 카테고리를 가짐) 판별 기준이 될 수 없다.
> 데이터 편집 시 README·`package.json`·`og:description` 의 수치를 함께 맞추고,
> `node scripts/validate-content.js` 의 "문서 정합성" 경고가 사라지는지 확인한다.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | **챗봇 본체.** 데이터·스타일·로직·이미지가 모두 인라인된 독립 실행 파일 (약 590KB, 대부분이 base64 이미지) |
| `server.js` | Express 정적 서버 (선택적 "서버형" 배포용). `index.html`을 서빙만 함 |
| `package.json` | Node 메타/의존성(`express`). `npm start` → `node server.js` |
| `netlify.toml` | Netlify 빌드 설정 (`publish = "."`) |
| `_redirects` | Netlify SPA 리다이렉트 (`/* /index.html 200`) |
| `README.md` | 배포 가이드(한국어). Netlify Drop / GitHub Pages / Vercel / Render 방법 안내 |
| `.gitignore` | `node_modules/`, `.env*`, 로그, OS 잡파일 |

## index.html 내부 구조

`<script>` 블록(약 119행부터)이 전체 애플리케이션 로직입니다. 핵심 구성:

### 데이터 (편집이 가장 잦은 부분)
- `const KB = [...]` — 지식 항목 배열. 각 항목의 대표 필드:
  - `id`, `term`, `category`, `keywords[]`, `short`(요약), `detail`(상세)
  - 학습주제 항목은 추가로 `topic`(플래그)과 결론·면접Tip 성격의 서술을 가짐
- `const FAQS = [...]` — FAQ 배열. 필드: `q`, `a`, `term`, `weeks`, `cat`
- `const IMG = {...}` — 마스코트 이미지(`goma`, `oreusoFull` 등) base64 데이터 URI
- 파생값: `const CATS = [...new Set(KB.map(e=>e.category))]`, `const TOPICS = KB.filter(e=>e.topic)`

현재 카테고리: `시장/지수`, `거시경제`, `주식/채권`, `파생상품`, `재무/회계`, `규제/제도`,
`디지털금융`, `사건사례`, `취업/직무`, `핀로그 학습주제`.

### 로직 함수 (역할별)
- 텍스트 정규화/매칭: `norm`, `toks`, `lev`(레벤슈타인 거리 → 오타 제안), `scoreEntry`, `search`, `searchFAQ`
- 추천/제안: `suggest`(오타 교정 제안), `relatedByCat`(관련 용어), `faqChips`, `relatedChips`, `sameTopicChips`, `catChips`
- 렌더링/DOM: `el`(엘리먼트 생성 헬퍼), `escapeHtml`, `highlight`, `renderEntry`, `addUser`, `botWrap`, `typingOn/Off`, `scroll`
- 대화 흐름: `answer`(질문→응답 결정), `ask`(사용자 입력 진입점), `allTermsBrowse`(전체 용어 카테고리별 탐색)
- 초기화 IIFE: 하단의 즉시실행 함수들이 퀵바 칩(학습주제·전체 용어·카테고리), 환영 메시지,
  "오늘의 용어"(`KB[new Date().getDate()%KB.length]` — 날짜 기반 결정론적 선택)를 구성

## 개발 규칙 / 컨벤션

- **언어:** UI 텍스트·주석·커밋 메시지는 **한국어**를 씁니다(기존 코드 스타일 유지).
- **의존성 없음:** 프런트엔드는 외부 라이브러리·CDN·프레임워크를 추가하지 않습니다. 순수 바닐라 JS 유지.
- **자기완결성:** 이미지·폰트·데이터를 외부 URL이 아닌 인라인(data URI/내장)으로 둡니다.
  파일 하나만으로 오프라인 작동해야 합니다.
- **XSS 방지:** 사용자 입력·데이터를 DOM에 넣을 때 반드시 `escapeHtml`을 거칩니다.
- **코드 스타일:** 기존 파일은 압축형(한 줄 다중 선언, 짧은 함수명)입니다. 새 코드도 주변 스타일에 맞추세요.
- **데이터 수정:** 지식/FAQ를 바꿀 때는 `KB`/`FAQS` 배열의 필드 구조(위 참조)를 그대로 지키고,
  `keywords`에 검색 매칭용 별칭을 충분히 넣어 주세요. 수치(용어 수 등) 변경 시 README·og 메타·문서를 함께 갱신.

## 실행 / 검증

로컬에서 확인하는 방법:

```bash
# 방법 1: 파일 직접 열기 (가장 간단)
#   index.html 을 브라우저에서 더블클릭

# 방법 2: 정적 서버로 구동
npm install      # express 설치 (최초 1회)
npm start        # → http://localhost:3000
```

빌드·린트 도구는 없습니다. 변경 후에는 **브라우저에서 실제로 열어**
검색·칩 클릭·오늘의 용어·마스코트 렌더가 정상인지 눈으로 확인하는 것이 최종 검증 방식입니다.

### 콘텐츠 검증 (데이터 편집 시 필수)

KB/FAQ 데이터를 편집·추가·수정할 때는 **눈 검증 전에** 결정적 검사기로 먼저 회귀를 걸러냅니다.

```bash
node scripts/validate-content.js                 # 루트 index.html 검사
node scripts/validate-content.js <파일경로>       # 임시 복사본 검사(고의 실패 테스트용)
```

- 검사 항목: 개수(108=87+21, FAQ 63)·중복/빈 `id`·필드 존재·**타입**(keywords/hashtags/faqs/issues=배열,
  `topic`=boolean true)·빈 필수값·카테고리 화이트리스트·FAQ 필드·문서 수치 정합성(경고)·깨진 FAQ 참조(경고).
- 오류 0건이어야 통과(종료코드 0). 의존성 없이 Node 내장만 사용.
- 편집 절차·팩트체크 원칙은 프로젝트 스킬 **`finlog-fact-check`**(`.claude/skills/`)에 정리되어 있으며,
  데이터 작업 시 자동 로딩됩니다. **최신 검사 통과 출력 없이는 "완료"로 보고하지 않습니다.**
- 무거운 도구(새 MCP·Playwright·상시 플러그인)는 도입하지 않습니다. 내장 `/verify`·`/code-review` 는
  큰 변경·PR 직전에만 사용합니다.

## 배포

정적 호스팅이 기본입니다(README에 상세). 요약:
- **Netlify Drop**(추천, 무료·즉시) / **GitHub Pages** / **Vercel** — 폴더를 올리면 자동 서빙
- **Render/Railway 등 서버형** — `npm install` 빌드, `npm start` 실행 (`server.js` 사용)

챗봇 로직은 전부 브라우저에서 동작하므로, 단순 공개 URL이 목적이면 정적 배포로 충분합니다.
방문기록·LLM 연동 등 서버 기능을 추가할 때만 `server.js` 경로를 씁니다.

## Git 워크플로

- 작업 브랜치: `claude/claude-md-docs-c9q6ur` (지정된 기능 브랜치)
- 명확하고 서술적인 커밋 메시지(한국어) 사용 — 기존 로그는 `기능:`, `수정:`, `정정:`, `보완:` 접두어 관례.
- 요청이 있을 때만 push/PR을 생성합니다.

---
© 2026 핀로그(FinLog) · 부산대학교 금융 학습 동아리
