# 핀로그(FinLog) 금융 챗봇 — 배포 가이드

오르소(상승장 황소) · 고마(하락장 곰)와 함께하는 금융 학습 챗봇입니다.
금융용어 **88개** + 핀로그 학습주제 **21개**(결론·면접Tip) + **FAQ 63문답**을 담고 있어요.

> `index.html` 한 파일에 모든 것(데이터·이미지·코드)이 들어 있는 **완전 독립형**입니다.
> 인터넷 서버 없이 더블클릭만 해도 작동하고, 아래 방법으로 **온라인 공개 URL**로도 배포할 수 있어요.

---

## 0. 바로 써보기 (배포 없이)
`index.html`을 **더블클릭** → 브라우저에서 바로 실행됩니다. (설치 불필요)
누군가에게 보낼 때도 이 파일 하나만 보내면 됩니다.

---

## 방법 A. 가장 쉬움 — Netlify Drop (추천 · 무료 · 1분)
1. 브라우저에서 **https://app.netlify.com/drop** 접속
2. 이 폴더(`배포_finlog-chatbot`)를 **통째로 드래그&드롭**
3. 끝! `https://랜덤이름.netlify.app` 공개 주소가 즉시 생성됩니다.
   - 로그인하면 주소를 원하는 이름으로 바꾸고 영구 보관할 수 있어요.

## 방법 B. GitHub Pages (무료 · 깃허브 계정 필요)
1. GitHub에서 새 저장소(repository) 생성 → 이 폴더 파일들을 업로드
2. 저장소 **Settings → Pages → Branch: main / (root)** 선택 후 Save
3. 잠시 뒤 `https://아이디.github.io/저장소이름/` 으로 공개됩니다.

## 방법 C. Vercel (무료)
1. **https://vercel.com** 가입 → **Add New → Project**
2. 이 폴더를 올리면(또는 GitHub 연동) 자동 배포 → `*.vercel.app` 주소 생성

---

## 방법 D. 진짜 "서버"로 돌리기 — Node.js (Render / Railway / 직접 서버)
정적 호스팅 대신 서버 프로세스로 구동하고 싶을 때 사용합니다.

### 내 컴퓨터에서 실행
```bash
npm install      # 최초 1회 (express 설치)
npm start        # 서버 시작
# 브라우저에서 http://localhost:3000 접속
```

### Render.com에 배포 (무료 · 서버형)
1. **https://render.com** 가입 → **New → Web Service**
2. 이 폴더를 GitHub에 올린 뒤 연결
3. 설정값
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. 배포되면 `https://서비스이름.onrender.com` 주소 생성
   - ⚠️ 무료 플랜은 일정 시간 미접속 시 잠들어, 첫 접속이 느릴 수 있어요.

> 이 챗봇은 브라우저 안에서만 동작(서버 로직 불필요)하므로,
> **공개 URL이 목적이라면 방법 A(Netlify Drop)가 가장 간편**합니다.
> 방문기록·LLM 연동 등 서버 기능을 추가할 계획이면 방법 D를 쓰세요.

---

## 폴더 구성
| 파일 | 설명 |
|---|---|
| `index.html` | 챗봇 본체 (독립 실행 · 모든 데이터 내장) |
| `server.js` | Node 정적 서버 (방법 D용) |
| `package.json` | Node 의존성·실행 스크립트 |
| `netlify.toml`, `_redirects` | Netlify 설정 |
| `README.md` | 이 안내문 |

## 업데이트 방법
지식(용어·FAQ·주제)을 바꾸려면 `index.html`을 새로 생성해 교체하면 됩니다.
(원본 생성 스크립트는 제작자에게 요청)

---
© 2026 핀로그(FinLog) · 부산대학교 금융 학습 동아리
