import { escapeHtml as e } from '../../shared/components/ui.js';
import { renderMarkdown } from '../../shared/components/markdown.js';
import { formatTime } from './performance-data.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function executionReportsPanel() {
  return `<section class="admin-dashboard__execution-reports" data-execution-reports aria-label="저장된 실행 보고서">
    <h2>저장된 실행 보고서</h2><p>현재 서버에 보관된 본인 실행 보고서를 하나씩 열어 확인합니다.</p>
    <button type="button" class="button secondary" data-execution-load>보고서 목록 불러오기</button>
    <p role="status" aria-live="polite" data-execution-status></p>
    <div data-execution-list></div><div data-execution-content></div>
  </section>`;
}

export function renderExecutionReport(report) {
  if (!report || !UUID.test(report.run_id) || typeof report.markdown !== 'string')
    throw new Error('Invalid execution report');
  return `<article class="admin-dashboard__execution-body" aria-label="선택한 실행 보고서"><h3>${e(report.filename || `${report.run_id}.md`)}</h3>${renderMarkdown(report.markdown)}</article>`;
}

export function mountExecutionReports(root, api) {
  const host = root.querySelector('[data-execution-reports]');
  if (!host) return () => {};
  const list = host.querySelector('[data-execution-list]');
  const content = host.querySelector('[data-execution-content]');
  const status = host.querySelector('[data-execution-status]');
  const load = host.querySelector('[data-execution-load]');
  let rows = [], next = null, selected = null, listRequest, reportRequest;
  let listGeneration = 0, reportGeneration = 0, disposed = false;

  function renderList() {
    list.innerHTML = rows.length ? `<div class="admin-dashboard__execution-list">${rows.map((row) =>
      `<button type="button" class="button secondary compact" data-execution-open="${e(row.run_id)}" aria-pressed="${selected === row.run_id}">${e(row.filename)}${row.modified_at ? `<small>${e(formatTime(row.modified_at))}</small>` : ''}</button>`
    ).join('')}</div>` : '<p>현재 계정에 연결된 실행 보고서 파일이 없습니다. 다른 PC나 서버의 파일은 자동으로 옮겨지지 않습니다.</p>';
    if (next !== null) list.innerHTML += '<button type="button" class="button secondary compact" data-execution-more>다음 기록 확인</button>';
  }

  async function loadList(offset = 0) {
    listRequest?.abort();
    const current = ++listGeneration;
    listRequest = new AbortController();
    load.disabled = true;
    status.textContent = '저장된 실행 보고서 목록을 확인하고 있습니다.';
    try {
      const result = await api(`/local-data/execution-reports?limit=50&offset=${offset}`, { signal: listRequest.signal });
      if (disposed || current !== listGeneration) return;
      if (!Array.isArray(result?.reports)) throw new Error('Invalid report list');
      const incoming = result.reports.filter((row) => UUID.test(row?.run_id) && typeof row.filename === 'string');
      rows = [...new Map([...(offset ? rows : []), ...incoming].map((row) => [row.run_id, row])).values()];
      next = result.has_more && Number.isSafeInteger(result.next_offset) && result.next_offset > offset ? result.next_offset : null;
      load.textContent = '보고서 목록 새로고침';
      renderList();
      status.textContent = `${rows.length}개의 실행 보고서를 찾았습니다.${next !== null ? ' 다음 기록도 확인할 수 있습니다.' : ''}`;
    } catch (error) {
      if (disposed || current !== listGeneration || error?.name === 'AbortError') return;
      status.textContent = error?.status === 401 || error?.status === 403
        ? '로그인 상태를 확인한 뒤 다시 불러와 주세요.'
        : '실행 보고서 목록을 불러오지 못했습니다. 목록 불러오기를 다시 눌러 주세요.';
    } finally {
      if (!disposed && current === listGeneration) load.disabled = false;
    }
  }

  async function openReport(id) {
    if (!UUID.test(id) || !rows.some((row) => row.run_id === id)) return;
    reportRequest?.abort();
    const current = ++reportGeneration;
    reportRequest = new AbortController();
    selected = id;
    renderList();
    content.innerHTML = '<p role="status">선택한 실행 보고서를 불러오는 중입니다.</p>';
    try {
      const result = await api(`/local-data/execution-reports/${id}`, { signal: reportRequest.signal });
      if (disposed || current !== reportGeneration) return;
      if (result?.report?.run_id !== id) throw new Error('Mismatched execution report');
      content.innerHTML = renderExecutionReport(result.report);
      status.textContent = '선택한 실행 보고서를 불러왔습니다.';
    } catch (error) {
      if (disposed || current !== reportGeneration || error?.name === 'AbortError') return;
      content.innerHTML = `<p role="alert">${error?.status === 404 ? '선택한 실행 보고서가 현재 서버에 없습니다.' : '보고서를 불러오지 못했습니다. 해당 보고서 버튼을 다시 눌러 주세요.'}</p>`;
    }
  }

  function click(event) {
    if (event.target.closest('[data-execution-load]')) void loadList();
    else if (event.target.closest('[data-execution-more]') && next !== null) void loadList(next);
    else {
      const button = event.target.closest('[data-execution-open]');
      if (button) void openReport(button.dataset.executionOpen);
    }
  }
  host.addEventListener('click', click);
  return () => {
    disposed = true;
    listRequest?.abort();
    reportRequest?.abort();
    host.removeEventListener('click', click);
    rows = [];
    list.innerHTML = '';
    content.innerHTML = '';
  };
}
