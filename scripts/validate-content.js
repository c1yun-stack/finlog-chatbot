#!/usr/bin/env node
/*
 * 핀로그 콘텐츠 검증기 (의존성 없음 · Node 내장만 사용)
 *
 * index.html 에 인라인된 KB / FAQS 배열을 추출·파싱해 개수·필드·타입·무결성을 결정적으로 검사한다.
 * 데이터(용어·FAQ) 편집 후 "브라우저 눈 검증" 전에 회귀를 먼저 걸러내는 용도.
 *
 * 사용법:
 *   node scripts/validate-content.js                 # 기본: 저장소 루트의 index.html
 *   node scripts/validate-content.js path/to/index.html   # 임의 파일(깨진 복사본 테스트용)
 *
 * 종료코드: 오류 0건이면 0, 1건 이상이면 1 (CI·훅에 물릴 수 있음).
 * 설계 원칙: 파싱에 실패하더라도 즉시 종료하지 않고 가능한 검사를 끝까지 수행한 뒤
 *            누적된 오류를 한 번에 보여준다. 리포트는 항상 정렬되어 동일 입력 → 동일 출력.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ── 실측 기준값(2026-07 index.html 파싱 결과) ──────────────────────────────
const EXPECT = { KB: 108, TOPICS: 21, TERMS: 87, FAQS: 63 };
const CATEGORIES = [
  '시장/지수', '거시경제', '주식/채권', '파생상품', '재무/회계',
  '규제/제도', '디지털금융', '사건사례', '취업/직무', '핀로그 학습주제',
];
// 순수 학습주제(의도적으로 detail·example 이 빈 항목) 판별식
const isPureTopic = (e) => e.topic === true && e.category === '핀로그 학습주제';
const isTopic = (e) => e.topic === true;

// ── 리포트 수집기 ──────────────────────────────────────────────────────────
const errors = [];
const warnings = [];
const infos = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const info = (m) => infos.push(m);

// ── 인라인 배열 추출: 첫 '[' 부터 문자열·이스케이프를 고려해 대응 ']' 까지 ──
function extractArray(src, name) {
  const decl = new RegExp('const\\s+' + name + '\\s*=\\s*');
  const m = decl.exec(src);
  if (!m) return { ok: false, error: `${name} 선언을 찾지 못함` };
  let i = src.indexOf('[', m.index + m[0].length);
  if (i < 0) return { ok: false, error: `${name} 의 '[' 를 찾지 못함` };
  const start = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  if (depth !== 0) return { ok: false, error: `${name} 의 괄호가 닫히지 않음` };
  const raw = src.slice(start, i);
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: `${name} JSON 파싱 실패: ${e.message}` };
  }
}

// ── 타입/빈값 헬퍼 ─────────────────────────────────────────────────────────
const isStr = (v) => typeof v === 'string';
const nonEmptyStr = (v) => isStr(v) && v.trim().length > 0;
const nonEmptyArr = (v) => Array.isArray(v) && v.length > 0;

// ── KB 항목 검사 ───────────────────────────────────────────────────────────
function checkKBEntry(e, idx) {
  const tag = `KB[${idx}] id=${e && e.id ? e.id : '<no-id>'}`;
  if (e === null || typeof e !== 'object' || Array.isArray(e)) {
    err(`${tag}: 객체가 아님`);
    return;
  }
  // 공통 문자열 필드(전부 비어있으면 안 됨)
  for (const f of ['id', 'term', 'category', 'short']) {
    if (!nonEmptyStr(e[f])) err(`${tag}: 필드 '${f}' 가 비었거나 문자열이 아님`);
  }
  // keywords: 비어있지 않은 배열
  if (!nonEmptyArr(e.keywords)) err(`${tag}: 'keywords' 가 비었거나 배열이 아님`);
  else if (!e.keywords.every(nonEmptyStr)) err(`${tag}: 'keywords' 에 빈/비문자열 원소 있음`);
  // detail·example: 순수 학습주제는 빈 값 허용, 그 외엔 필수
  for (const f of ['detail', 'example']) {
    if (isPureTopic(e)) continue;
    if (!nonEmptyStr(e[f])) err(`${tag}: 필드 '${f}' 가 비었거나 문자열이 아님`);
  }
  // 카테고리 화이트리스트
  if (isStr(e.category) && !CATEGORIES.includes(e.category)) {
    err(`${tag}: 미정의 카테고리 '${e.category}'`);
  }
  // topic 키가 있으면 정확히 boolean true 여야 함
  if ('topic' in e && e.topic !== true) {
    err(`${tag}: 'topic' 키는 boolean true 여야 함(현재 ${JSON.stringify(e.topic)})`);
  }
  // 주제 전용 필드
  if (isTopic(e)) {
    for (const f of ['weeks', 'title', 'conclusion', 'interview_tip']) {
      if (!nonEmptyStr(e[f])) err(`${tag}: 주제 필드 '${f}' 가 비었거나 문자열이 아님`);
    }
    for (const f of ['hashtags', 'faqs', 'issues']) {
      if (!nonEmptyArr(e[f])) err(`${tag}: 주제 필드 '${f}' 가 비었거나 배열이 아님`);
    }
    if (Array.isArray(e.faqs)) {
      e.faqs.forEach((fq, k) => {
        if (!fq || typeof fq !== 'object' || !nonEmptyStr(fq.question) || !nonEmptyStr(fq.answer)) {
          err(`${tag}: faqs[${k}] 은 비어있지 않은 question·answer 를 가진 객체여야 함`);
        }
      });
    }
  }
}

// ── FAQ 항목 검사 ──────────────────────────────────────────────────────────
function checkFAQEntry(f, idx) {
  const tag = `FAQS[${idx}]`;
  if (f === null || typeof f !== 'object' || Array.isArray(f)) {
    err(`${tag}: 객체가 아님`);
    return;
  }
  for (const k of ['q', 'a', 'term', 'weeks', 'cat']) {
    if (!nonEmptyStr(f[k])) err(`${tag}: 필드 '${k}' 가 비었거나 문자열이 아님`);
  }
}

// ── 문서 수치 정합성(경고 전용) ────────────────────────────────────────────
function checkDocSync(root) {
  const readNum = (re, text) => { const m = re.exec(text); return m ? Number(m[m.length - 1]) : null; };
  const files = {
    'README.md': [
      { label: '용어 수', re: /(?:금융\s*)?용어\s*\*{0,2}\s*(\d+)/, expect: EXPECT.TERMS },
      { label: '학습주제 수', re: /학습주제\s*\*{0,2}\s*(\d+)/, expect: EXPECT.TOPICS },
      { label: 'FAQ 수', re: /FAQ\s*\*{0,2}\s*(\d+)/, expect: EXPECT.FAQS },
    ],
    'package.json': [
      { label: 'description 용어 수', re: /용어\s*(\d+)/, expect: EXPECT.TERMS },
      { label: 'description 학습주제 수', re: /학습주제\s*(\d+)/, expect: EXPECT.TOPICS },
      { label: 'description FAQ 수', re: /FAQ\s*(\d+)/, expect: EXPECT.FAQS },
    ],
  };
  for (const [fname, checks] of Object.entries(files)) {
    const p = path.join(root, fname);
    let text;
    try { text = fs.readFileSync(p, 'utf8'); } catch { warn(`문서 정합성: ${fname} 를 읽지 못함(건너뜀)`); continue; }
    for (const c of checks) {
      const got = readNum(c.re, text);
      if (got === null) continue; // 해당 표기가 없으면 조용히 통과
      if (got !== c.expect) warn(`문서 정합성: ${fname} 의 ${c.label} = ${got} (실측 ${c.expect}) — 갱신 필요`);
    }
  }
}

// ── FAQ term → KB 참조 확인(경고 전용, 휴리스틱) ────────────────────────────
function checkFaqRefs(KB, FAQS) {
  const vocab = new Set();
  for (const e of KB) {
    if (isStr(e.term)) vocab.add(e.term);
    if (Array.isArray(e.keywords)) for (const k of e.keywords) if (isStr(k)) vocab.add(k);
  }
  const orphan = [];
  FAQS.forEach((f, i) => {
    if (isStr(f.term) && f.term.trim() && !vocab.has(f.term)) orphan.push(`FAQS[${i}].term='${f.term}'`);
  });
  if (orphan.length) warn(`FAQ term 참조: KB 용어/키워드와 안 맞는 항목 ${orphan.length}개 → ${orphan.sort().join(', ')}`);
}

// ── 메인 ───────────────────────────────────────────────────────────────────
function main() {
  const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const root = path.dirname(path.resolve(target));
  let src;
  try { src = fs.readFileSync(target, 'utf8'); }
  catch (e) { console.error(`✗ 파일을 읽지 못함: ${target}\n  ${e.message}`); process.exit(2); }

  console.log(`▶ 검사 대상: ${target}\n`);

  const kbR = extractArray(src, 'KB');
  const faqR = extractArray(src, 'FAQS');
  if (!kbR.ok) err(kbR.error);
  if (!faqR.ok) err(faqR.error);

  const KB = kbR.ok ? kbR.value : [];
  const FAQS = faqR.ok ? faqR.value : [];

  // 개수 검증
  if (kbR.ok) {
    const topics = KB.filter(isTopic).length;
    const terms = KB.length - topics;
    if (KB.length !== EXPECT.KB) err(`KB 개수 ${KB.length} ≠ 기준 ${EXPECT.KB}`);
    if (topics !== EXPECT.TOPICS) err(`주제(topic===true) 개수 ${topics} ≠ 기준 ${EXPECT.TOPICS}`);
    if (terms !== EXPECT.TERMS) err(`일반용어 개수 ${terms} ≠ 기준 ${EXPECT.TERMS}`);
  }
  if (faqR.ok && FAQS.length !== EXPECT.FAQS) err(`FAQ 개수 ${FAQS.length} ≠ 기준 ${EXPECT.FAQS}`);

  // id 무결성
  if (kbR.ok) {
    const seen = new Map();
    KB.forEach((e, i) => {
      const id = e && e.id;
      if (!nonEmptyStr(id)) return; // 빈 id 는 항목 검사에서 별도 보고
      seen.set(id, (seen.get(id) || 0) + 1);
    });
    for (const [id, n] of [...seen].sort()) if (n > 1) err(`중복 id '${id}' (${n}회)`);
  }

  // 항목별 검사
  if (kbR.ok) KB.forEach(checkKBEntry);
  if (faqR.ok) FAQS.forEach(checkFAQEntry);

  // 참조·문서 정합성(경고)
  if (kbR.ok && faqR.ok) checkFaqRefs(KB, FAQS);
  checkDocSync(root);

  // 허용된 빈 값 요약(정보) — 순수 학습주제의 detail·example
  if (kbR.ok) {
    const pure = KB.filter(isPureTopic).map((e) => e.id).sort();
    if (pure.length) info(`순수 학습주제 ${pure.length}개는 detail·example 이 의도적으로 비어 있음(허용): ${pure.join(', ')}`);
    // 카테고리 분포(항상 정렬)
    const dist = {};
    for (const e of KB) dist[e.category] = (dist[e.category] || 0) + 1;
    const line = CATEGORIES.filter((c) => dist[c]).map((c) => `${c}:${dist[c]}`).join('  ');
    info(`카테고리 분포 → ${line}`);
  }

  // ── 출력(정렬) ──
  const dump = (title, arr, mark) => {
    if (!arr.length) return;
    console.log(`${mark} ${title} (${arr.length})`);
    for (const m of [...arr].sort()) console.log(`   - ${m}`);
    console.log('');
  };
  dump('INFO', infos, 'ℹ');
  dump('경고', warnings, '⚠');
  dump('오류', errors, '✗');

  if (errors.length === 0) {
    console.log(`✓ 통과 — KB ${KB.length}(주제 ${KB.filter(isTopic).length}·용어 ${KB.length - KB.filter(isTopic).length}), FAQ ${FAQS.length}` +
      (warnings.length ? ` · 경고 ${warnings.length}건` : ''));
    process.exitCode = 0;
  } else {
    console.log(`✗ 실패 — 오류 ${errors.length}건, 경고 ${warnings.length}건`);
    process.exitCode = 1;
  }
}

main();
