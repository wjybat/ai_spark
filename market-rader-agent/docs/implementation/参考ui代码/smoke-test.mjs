// 冒烟测试：在 jsdom 中加载 bundle.js，验证渲染结构与关键交互
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('./bundle.js', import.meta.url), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.eval(js);

const d = dom.window.document;
const checks = [
  ['header', d.querySelectorAll('.header').length === 1],
  ['logo 名称', d.querySelector('.logo-name')?.textContent === 'Market Radar'],
  ['导航 6 项', d.querySelectorAll('.nav-item').length === 6],
  ['筛选 5 项', d.querySelectorAll('.filter-select').length === 5],
  ['KPI 4 张', d.querySelectorAll('.kpi').length === 4],
  ['气泡 5 个', d.querySelectorAll('.bubble').length === 5],
  ['表格 5 行', d.querySelectorAll('.rank-table tbody tr').length === 5],
  ['P1 徽章 2 个', d.querySelectorAll('.badge-p1').length === 2],
  ['详情条形 6 条', d.querySelectorAll('.bar-row').length === 6],
  ['洞察要点 4 条', d.querySelectorAll('.ai-card li').length === 4],
  ['快捷 chip 3 个', d.querySelectorAll('.chip').length === 3],
  ['绿色总结条', d.querySelector('.detail-banner')?.textContent.includes('86 / 100')],
  ['用户提问气泡', d.querySelector('.msg-user')?.textContent.includes('为什么越南排名第一')],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) fail++;
}

// 交互：切换导航
d.querySelector('[data-nav="countries"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const navOk = d.querySelector('[data-nav="countries"]').classList.contains('active');
console.log(`${navOk ? 'PASS' : 'FAIL'}  导航点击切换 active`);
if (!navOk) fail++;

// 交互：筛选循环切换
const btn = d.querySelector('[data-filter="region"]');
btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const fOk = btn.querySelector('.filter-value').textContent === '中东';
console.log(`${fOk ? 'PASS' : 'FAIL'}  筛选点击循环选项`);
if (!fOk) fail++;

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
