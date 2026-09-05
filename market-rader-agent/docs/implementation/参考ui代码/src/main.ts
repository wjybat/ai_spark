import { renderApp } from './components';
import { FILTERS } from './data';

/**
 * Market Radar — 应用入口
 * 负责挂载 DOM、绑定交互事件。
 */

const app = document.getElementById('app');
if (!app) {
  throw new Error('#app root not found');
}

let activeNav = 'overview';
let collapsed = false;
let toastTimer: number | undefined;

function mount(): void {
  app!.innerHTML = renderApp(activeNav);
  app!.classList.toggle('sidebar-collapsed', collapsed);
  bindEvents();
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents(): void {
  // 侧边导航切换
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => {
      activeNav = el.dataset.nav ?? 'overview';
      mount();
    });
  });

  // 收起 / 展开菜单
  document.getElementById('collapse-btn')?.addEventListener('click', () => {
    collapsed = !collapsed;
    mount();
  });

  // 筛选下拉：点击在候选值间循环（原型交互）
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = FILTERS.find((f) => f.id === btn.dataset.filter);
      if (!field) return;
      const idx = field.options.indexOf(field.value);
      field.value = field.options[(idx + 1) % field.options.length];
      const valueEl = btn.querySelector('.filter-value');
      if (valueEl) valueEl.textContent = field.value;
      toast(`已切换「${field.label}」为：${field.value}`);
    });
  });

  // 开始扫描
  const scanBtn = document.getElementById('btn-scan') as HTMLButtonElement | null;
  scanBtn?.addEventListener('click', () => {
    if (scanBtn.disabled) return;
    const originHtml = scanBtn.innerHTML;
    scanBtn.disabled = true;
    scanBtn.classList.add('scanning');
    scanBtn.innerHTML = '<span class="spinner"></span><span>扫描中…</span>';
    window.setTimeout(() => {
      scanBtn.disabled = false;
      scanBtn.classList.remove('scanning');
      scanBtn.innerHTML = originHtml;
      toast('扫描完成：已更新 5 个国家的最新机会数据');
    }, 1400);
  });

  // 刷新洞察
  const refreshBtn = document.getElementById('refresh-insight');
  refreshBtn?.addEventListener('click', () => {
    refreshBtn.classList.add('spin');
    window.setTimeout(() => {
      refreshBtn.classList.remove('spin');
      toast('AI 洞察已基于最新数据重新生成');
    }, 800);
  });

  // 洞察快捷问题
  document.querySelectorAll<HTMLButtonElement>('[data-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      toast(`已发起分析：${chip.dataset.chip}`);
    });
  });

  // 查看报告
  document.getElementById('view-report')?.addEventListener('click', () => {
    toast('正在生成《越南市场机会报告》…');
  });
}

/* ---------------- Toast ---------------- */

function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}

mount();
