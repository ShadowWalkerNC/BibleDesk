/**
 * sidepanel.js — BibleDesk Chrome Extension Client Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const queryInput = document.getElementById('query-input');
  const searchForm = document.getElementById('search-form');
  const translationSelect = document.getElementById('translation-select');
  const serverUrlInput = document.getElementById('server-url');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    scripture: document.getElementById('panel-scripture'),
    dimensions: document.getElementById('panel-dimensions'),
    crossrefs: document.getElementById('panel-crossrefs'),
    lexicon: document.getElementById('panel-lexicon'),
  };

  const scriptureContent = document.getElementById('scripture-content');
  const dimensionsContent = document.getElementById('dimensions-content');
  const crossrefsContent = document.getElementById('crossrefs-content');
  const lexiconContent = document.getElementById('lexicon-content');

  const loadingState = document.getElementById('loading-state');
  const loadingMessage = document.getElementById('loading-message');
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');

  // Load saved preferences
  const saved = await chrome.storage.local.get(['serverUrl', 'translation', 'lastQuery']);
  if (saved.serverUrl) serverUrlInput.value = saved.serverUrl;
  if (saved.translation) translationSelect.value = saved.translation;

  serverUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
  });

  translationSelect.addEventListener('change', () => {
    chrome.storage.local.set({ translation: translationSelect.value });
    if (queryInput.value.trim()) {
      handleSearch(queryInput.value.trim());
    }
  });

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      Object.values(tabPanels).forEach((p) => p.classList.remove('active'));
      if (tabPanels[tab]) tabPanels[tab].classList.add('active');
    });
  });

  function switchTab(tabName) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.click();
  }

  function showLoading(msg = 'Searching…') {
    loadingMessage.textContent = msg;
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
  }

  function hideLoading() {
    loadingState.classList.add('hidden');
  }

  function showError(msg) {
    hideLoading();
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
  }

  function getServerUrl() {
    return serverUrlInput.value.replace(/\/$/, '') || 'http://localhost:3000';
  }

  // Handle Query
  async function handleSearch(query) {
    if (!query) return;
    showLoading('Looking up Scripture and study data…');

    const translation = translationSelect.value;
    const server = getServerUrl();

    // Check if query is Strong's Tag (e.g. G2889 or H7225)
    if (/^[GHgh]\d{1,5}$/.test(query)) {
      try {
        const res = await fetch(`${server}/api/bible/lexicon?strongs=${encodeURIComponent(query)}`);
        const data = await res.json();
        hideLoading();
        if (data.success && data.definition) {
          renderLexicon(data.definition);
          switchTab('lexicon');
          return;
        }
      } catch (e) {
        console.warn('Lexicon lookup failed:', e);
      }
    }

    try {
      // 1. Fetch Scripture Passage or Search
      const searchRes = await fetch(`${server}/api/bible/search?query=${encodeURIComponent(query)}&translation=${translation}`);
      const searchData = await searchRes.json();

      // 2. Fetch Cross-References in parallel
      fetch(`${server}/api/bible/lexicon?reference=${encodeURIComponent(query)}&translation=${translation}`)
        .then((r) => r.json())
        .then((crData) => {
          if (crData.success && crData.crossReferences?.length > 0) {
            renderCrossReferences(crData.crossReferences);
          }
        })
        .catch(() => {});

      // 3. Fetch Direct Study or Non-AI Dimensions
      fetch(`${server}/api/search/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, translation }),
      })
        .then((r) => r.json())
        .then((dData) => {
          if (dData.success && dData.answer) {
            renderDimensions(dData.answer);
          }
        })
        .catch(() => {});

      hideLoading();

      if (searchData.success && searchData.results?.length > 0) {
        renderSearchResults(searchData.results, query);
        switchTab('scripture');
      } else {
        scriptureContent.innerHTML = `<p class="empty-text">No direct verse matches found for "${query}". Check the 5-D Study tab for concordance insights.</p>`;
        switchTab('dimensions');
      }
    } catch (err) {
      showError(`Connection to server failed (${server}). Ensure your BibleDesk instance is running.`);
    }
  }

  function renderSearchResults(results, query) {
    let html = `<div class="passage-card"><div class="passage-title">Results for "${query}" (${results.length})</div>`;
    results.forEach((v) => {
      html += `
        <div class="verse-item">
          <span class="verse-num">${v.reference || `${v.book} ${v.chapter}:${v.verse}`}</span>
          ${v.text}
        </div>
      `;
    });
    html += `</div>`;
    scriptureContent.innerHTML = html;
  }

  function renderDimensions(answer) {
    const dims = answer.dimensions || {};
    let html = `
      <div class="dim-card">
        <div class="dim-title" style="color: var(--accent-gold);">📖 Overview</div>
        <div class="dim-content">${answer.summary || ''}</div>
      </div>
    `;

    if (dims.scripture) {
      html += `
        <div class="dim-card">
          <div class="dim-title" style="color: var(--accent-blue);">📖 ${dims.scripture.title}</div>
          <div class="dim-content">${dims.scripture.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
    }

    if (dims.theological) {
      html += `
        <div class="dim-card theological">
          <div class="dim-title" style="color: var(--accent-green);">✝️ ${dims.theological.title}</div>
          <div class="dim-content">${dims.theological.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
    }

    if (dims.original_language) {
      html += `
        <div class="dim-card language">
          <div class="dim-title" style="color: var(--accent-purple);">🔤 ${dims.original_language.title}</div>
          <div class="dim-content">${dims.original_language.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
    }

    if (dims.practical) {
      html += `
        <div class="dim-card practical">
          <div class="dim-title" style="color: var(--accent-red);">🌱 ${dims.practical.title}</div>
          <div class="dim-content">${dims.practical.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
    }

    dimensionsContent.innerHTML = html;
  }

  function renderCrossReferences(refs) {
    let html = '';
    refs.forEach((r) => {
      html += `
        <div class="crossref-item" data-ref="${r.reference}">
          <div class="crossref-ref">🔗 ${r.reference}</div>
          <div class="crossref-text">"${r.text}"</div>
        </div>
      `;
    });
    crossrefsContent.innerHTML = html;

    crossrefsContent.querySelectorAll('.crossref-item').forEach((el) => {
      el.addEventListener('click', () => {
        const ref = el.dataset.ref;
        queryInput.value = ref;
        handleSearch(ref);
      });
    });
  }

  function renderLexicon(def) {
    lexiconContent.innerHTML = `
      <div class="lexicon-card">
        <div class="lexicon-header">
          <span class="lexicon-lemma">${def.lemma} (${def.translit})</span>
          <span class="lexicon-tag">${def.number}</span>
        </div>
        ${def.pronunciation ? `<p style="font-size: 11px; color: var(--text-secondary);">Pronunciation: <em>${def.pronunciation}</em></p>` : ''}
        ${def.derivation ? `<p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Derivation: ${def.derivation}</p>` : ''}
        <div class="lexicon-def">
          <strong>Definition:</strong> ${def.strongs_def}
        </div>
        ${def.kjv_def ? `<div class="lexicon-def" style="margin-top: 6px;"><strong>KJV Renderings:</strong> ${def.kjv_def}</div>` : ''}
      </div>
    `;
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(queryInput.value.trim());
  });

  // Listen for message triggers from context menu
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'study_query' && msg.query) {
      queryInput.value = msg.query;
      handleSearch(msg.query);
    }
  });

  // Check if there was a pending query from storage
  if (saved.lastQuery) {
    queryInput.value = saved.lastQuery;
    handleSearch(saved.lastQuery);
    chrome.storage.local.remove(['lastQuery']);
  }
});
