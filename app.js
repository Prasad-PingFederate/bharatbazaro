/**
 * BharatBazaro.com — 24/7 AI Deal & Price Drop Radar
 * Interactive Frontend Engine (Phase 8 / Commit #159 Upgrade)
 */

(function () {
  'use strict';

  // ── 1. GLOBAL STATE ────────────────────────────────────────────────────────
  const state = {
    allDeals: [],
    stats: {},
    filters: {
      search: '',
      tab: 'all',
      priceBucket: 'all',
      category: 'all',
      sort: 'score',
      hideExpired: true,
    },
    cardDiscount: false, // Amazon Pay ICICI 5% Cashback Mode
    alertsEnabled: JSON.parse(localStorage.getItem('bb_alerts') ?? 'true'),
    activeModalRange: 90,
    activeInspectorRange: 90,
    lastSyncEpoch: Date.now(),
    knownAsins: new Set(),
    originalTitle: document.title,
    titleFlashTimer: null,
    watchlist: new Set(JSON.parse(localStorage.getItem('bb_watchlist') || '[]')),
    upvotedDeals: new Set(JSON.parse(localStorage.getItem('bb_upvoted_deals') || '[]')),
    keywordAlerts: JSON.parse(localStorage.getItem('bb_keyword_alerts') || '["earbuds", "smartwatch"]'),
    viewMode: localStorage.getItem('bb_view_mode') || 'grid',
    activeModalDeal: null,
    refreshIntervalSeconds: 60,
    countdownSeconds: 60,
    countdownTimer: null,
    syncTimerInterval: null,
  };

  const AMAZON_TAG = 'dammaiprasad-21';
  const DEFAULT_TELEGRAM_URL = 'https://t.me/Flash_Deals_Flipkart_Amazon';

  function getAffiliateUrlWithSubtag(deal, subtag = 'bb-grid') {
    const asin = typeof deal === 'string' ? deal : (deal.asin || '');
    if (asin && /^[A-Z0-9]{10}$/i.test(asin)) {
      return `https://www.amazon.in/dp/${asin.toUpperCase()}?tag=${AMAZON_TAG}&linkCode=ll1&ascsubtag=${subtag}`;
    }
    let base = (deal && deal.affiliate_url) ? deal.affiliate_url : `https://www.amazon.in/?tag=${AMAZON_TAG}&linkCode=ll1`;
    if (base.includes('ascsubtag=')) {
      return base.replace(/ascsubtag=[^&]+/, `ascsubtag=${subtag}`);
    }
    return base + (base.includes('?') ? '&' : '?') + `ascsubtag=${subtag}`;
  }

  // ── 2. DOM ELEMENT REFERENCES ──────────────────────────────────────────────
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    statusText: document.getElementById('statusText'),
    radarStatusBadge: document.getElementById('radarStatusBadge'),
    tickerContent: document.getElementById('tickerContent'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    btnViewCompact: document.getElementById('btnViewCompact'),
    btnKeywordAlerts: document.getElementById('btnKeywordAlerts'),
    keywordAlertsPopover: document.getElementById('keywordAlertsPopover'),
    keywordAlertsClose: document.getElementById('keywordAlertsClose'),
    keywordAlertInput: document.getElementById('keywordAlertInput'),
    keywordAlertAddBtn: document.getElementById('keywordAlertAddBtn'),
    keywordTagsContainer: document.getElementById('keywordTagsContainer'),
    keywordAlertsCount: document.getElementById('keywordAlertsCount'),
    top3SpotlightStrip: document.getElementById('top3SpotlightStrip'),
    statCardLiveDeals: document.getElementById('statCardLiveDeals'),
    statCardLoot: document.getElementById('statCardLoot'),
    statCardMaxDiscount: document.getElementById('statCardMaxDiscount'),
    statCardSavings: document.getElementById('statCardSavings'),
    statLiveDeals: document.getElementById('statLiveDeals'),
    statLootCount: document.getElementById('statLootCount'),
    statMaxDiscount: document.getElementById('statMaxDiscount'),
    statTotalSavings: document.getElementById('statTotalSavings'),
    alertsToggleBtn: document.getElementById('alertsToggleBtn'),
    alertsStatusText: document.getElementById('alertsStatusText'),
    btnPriceModeStd: document.getElementById('btnPriceModeStd'),
    btnPriceModeCard: document.getElementById('btnPriceModeCard'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    asinInspectorCard: document.getElementById('asinInspectorCard'),
    closeInspectorBtn: document.getElementById('closeInspectorBtn'),
    inspectorAsin: document.getElementById('inspectorAsin'),
    inspectorTitle: document.getElementById('inspectorTitle'),
    inspectorGraphImg: document.getElementById('inspectorGraphImg'),
    inspectorBuyBtn: document.getElementById('inspectorBuyBtn'),
    inspectorKeepaBtn: document.getElementById('inspectorKeepaBtn'),
    inspectorPhBtn: document.getElementById('inspectorPhBtn'),
    countDiwali: document.getElementById('countDiwali'),
    countDaily: document.getElementById('countDaily'),
    countUnder399: document.getElementById('countUnder399'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    pricePills: document.querySelectorAll('.price-pill'),
    catPills: document.querySelectorAll('.cat-pill'),
    hideExpiredCheck: document.getElementById('hideExpiredCheck'),
    sortSelect: document.getElementById('sortSelect'),
    refreshBtn: document.getElementById('refreshBtn'),
    dealsGrid: document.getElementById('dealsGrid'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    visibleCount: document.getElementById('visibleCount'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    syncTime: document.getElementById('syncTime'),
    feedLiveTimestamp: document.getElementById('feedLiveTimestamp'),
    // Modal
    chartModal: document.getElementById('chartModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalCurrentPrice: document.getElementById('modalCurrentPrice'),
    modalMinPrice: document.getElementById('modalMinPrice'),
    modalAvgPrice: document.getElementById('modalAvgPrice'),
    modalMrpPrice: document.getElementById('modalMrpPrice'),
    modalChartImg: document.getElementById('modalChartImg'),
    chartLoading: document.getElementById('chartLoading'),
    modalVerdictBox: document.getElementById('modalVerdictBox'),
    modalVerdictPill: document.getElementById('modalVerdictPill'),
    modalVerdictText: document.getElementById('modalVerdictText'),
    modalInsight: document.getElementById('modalInsight'),
    modalClaimBox: document.getElementById('modalClaimBox'),
    modalClaimTitle: document.getElementById('modalClaimTitle'),
    modalClaimStepsList: document.getElementById('modalClaimStepsList'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalBuyBtn: document.getElementById('modalBuyBtn'),
    modalShareBtn: document.getElementById('modalShareBtn'),
    // Counts
    countAll: document.getElementById('countAll'),
    countLoot: document.getElementById('countLoot'),
    countDrops: document.getElementById('countDrops'),
    countCoupons: document.getElementById('countCoupons'),
    countTier1: document.getElementById('countTier1'),
    countWatchlist: document.getElementById('countWatchlist'),
    toastContainer: document.getElementById('toastContainer'),
    // Mobile Navigation
    mobileBottomNav: document.getElementById('mobileBottomNav'),
    mNavAll: document.getElementById('mNavAll'),
    mNavLoot: document.getElementById('mNavLoot'),
    mNavCoupons: document.getElementById('mNavCoupons'),
    mNavAsin: document.getElementById('mNavAsin'),
    mNavTelegram: document.getElementById('mNavTelegram'),
  };

  // ── 3. INITIALIZATION ──────────────────────────────────────────────────────
  function init() {
    initTheme();
    initAlertsUI();
    initViewMode();
    initKeywordAlerts();
    handleUrlRouting();
    setupEventListeners();
    fetchData(true);
    startAutoRefreshTimer();
    startLiveSyncTimer();
    setupExitIntentListeners();
  }

  function initViewMode() {
    setViewMode(state.viewMode || 'grid');
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('bb_view_mode', mode);
    if (el.dealsGrid) {
      el.dealsGrid.classList.toggle('compact-view', mode === 'compact');
    }
    if (el.btnViewGrid) el.btnViewGrid.classList.toggle('active', mode === 'grid');
    if (el.btnViewCompact) el.btnViewCompact.classList.toggle('active', mode === 'compact');
  }

  function initKeywordAlerts() {
    renderKeywordAlertTags();
  }

  function renderKeywordAlertTags() {
    if (!el.keywordTagsContainer) return;
    if (!state.keywordAlerts.length) {
      el.keywordTagsContainer.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">No alert keywords yet. Add some above!</span>';
    } else {
      el.keywordTagsContainer.innerHTML = state.keywordAlerts.map(kw => `
        <span class="keyword-tag-pill">
          <span>${escapeHtml(kw)}</span>
          <span class="remove-tag" data-kw="${escapeHtml(kw)}" title="Remove keyword">&times;</span>
        </span>
      `).join('');
    }
    if (el.keywordAlertsCount) el.keywordAlertsCount.textContent = state.keywordAlerts.length;
  }

  function addKeywordAlert(kw) {
    const clean = (kw || '').trim().toLowerCase();
    if (!clean || clean.length < 2) return;
    if (!state.keywordAlerts.includes(clean)) {
      state.keywordAlerts.push(clean);
      localStorage.setItem('bb_keyword_alerts', JSON.stringify(state.keywordAlerts));
      renderKeywordAlertTags();
      renderDeals();
      const matches = state.allDeals.filter(d => `${d.title || ''} ${d.brand || ''} ${d.category || ''}`.toLowerCase().includes(clean));
      showToast(`🔔 Added alert for "${clean}"! Found ${matches.length} matching deals.`, 'success', 3500);
    }
    if (el.keywordAlertInput) el.keywordAlertInput.value = '';
  }

  function removeKeywordAlert(kw) {
    state.keywordAlerts = state.keywordAlerts.filter(k => k !== kw);
    localStorage.setItem('bb_keyword_alerts', JSON.stringify(state.keywordAlerts));
    renderKeywordAlertTags();
    renderDeals();
    showToast(`Removed alert for "${kw}"`, 'info', 2000);
  }

  // ── 4. THEME MANAGEMENT ────────────────────────────────────────────────────
  function initTheme() {
    const savedTheme = localStorage.getItem('bb_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('bb_theme', newTheme);
    showToast(`Switched to ${newTheme} mode`);
  }

  // ── 5. AUDIO CHIME & LIVE LOOT ALERTS (Requirement 6) ──────────────────────
  function initAlertsUI() {
    if (el.alertsToggleBtn && el.alertsStatusText) {
      el.alertsToggleBtn.classList.toggle('active', !!state.alertsEnabled);
      el.alertsStatusText.textContent = state.alertsEnabled ? 'Alerts: ON' : 'Alerts: OFF';
    }
  }

  function toggleAlerts() {
    state.alertsEnabled = !state.alertsEnabled;
    localStorage.setItem('bb_alerts', JSON.stringify(state.alertsEnabled));
    initAlertsUI();
    if (state.alertsEnabled) {
      playLootChime();
      showToast('🔔 Live Loot Audio & Tab alerts enabled!');
    } else {
      showToast('🔕 Live Loot alerts disabled.');
    }
  }

  function playLootChime() {
    if (!state.alertsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tone 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.10);
      gain2.gain.setValueAtTime(0.15, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.10);
      osc2.stop(now + 0.38);
    } catch (e) {
      // Audio context may be restricted before first user interaction
    }
  }

  function notifyNewLoot(newCount) {
    if (state.alertsEnabled) {
      playLootChime();
    }
    showToast(`🚨 ${newCount} brand new live deal(s) detected!`);

    if (document.hidden) {
      if (state.titleFlashTimer) clearInterval(state.titleFlashTimer);
      let flash = false;
      state.titleFlashTimer = setInterval(() => {
        document.title = flash ? `(🔥 ${newCount} New Loot!) BharatBazaro` : state.originalTitle;
        flash = !flash;
      }, 1200);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.titleFlashTimer) {
      clearInterval(state.titleFlashTimer);
      state.titleFlashTimer = null;
      document.title = state.originalTitle;
    }
  });

  // ── 6. DATA FETCHING (Requirement 2: Cache-Busting & Relative Sync) ─────────
  async function fetchData(isInitial = false) {
    if (el.refreshBtn) el.refreshBtn.classList.add('spinning');
    try {
      // 60-second cache busting query
      const cacheBust = `?v=${Math.floor(Date.now() / 60000)}&_t=${Date.now()}`;
      const [dealsRes, statsRes] = await Promise.all([
        fetch(`data/live_deals.json${cacheBust}`).catch(() => null),
        fetch(`data/stats.json${cacheBust}`).catch(() => null),
      ]);

      if (dealsRes && dealsRes.ok) {
        const fetchedDeals = await dealsRes.json();
        // Guard: strictly filter out non-positive prices
        const validDeals = Array.isArray(fetchedDeals)
          ? fetchedDeals.filter(d => (d.effective_price || d.list_price || 0) > 0)
          : [];

        // Check for new ASINs
        if (state.knownAsins.size > 0) {
          const freshDeals = validDeals.filter(d => !state.knownAsins.has(d.asin));
          if (freshDeals.length > 0) {
            notifyNewLoot(freshDeals.length);
          }
        }
        validDeals.forEach(d => state.knownAsins.add(d.asin));
        state.allDeals = validDeals;
      }

      if (statsRes && statsRes.ok) {
        state.stats = await statsRes.json();
      }

      state.lastSyncEpoch = Date.now();
      updateRadarStatusPill();
      updateStatsUI();
      updateTabCounts();
      updateTicker();
      renderDeals();

      state.countdownSeconds = state.refreshIntervalSeconds;

      if (!isInitial) {
        showToast(`Refreshed! ${state.allDeals.length} live verified deals loaded.`);
      }
    } catch (err) {
      console.warn('Error fetching live deals feed:', err);
    } finally {
      if (el.refreshBtn) el.refreshBtn.classList.remove('spinning');
    }
  }

  function updateRadarStatusPill() {
    if (!el.statusText) return;
    const diffSec = Math.max(0, Math.floor((Date.now() - state.lastSyncEpoch) / 1000));
    let timeStr = 'just now';
    if (diffSec >= 60) {
      const m = Math.floor(diffSec / 60);
      timeStr = `${m}m ago`;
    }
    el.statusText.textContent = `Live Radar • ${state.allDeals.length} Deals • Synced ${timeStr}`;
  }

  function startLiveSyncTimer() {
    clearInterval(state.syncTimerInterval);
    state.syncTimerInterval = setInterval(() => {
      updateRadarStatusPill();
    }, 30000);
  }

  // ── 7. UI UPDATES (STATS, COUNTERS, TICKER) ────────────────────────────────
  function formatLiveIstTimestamp(timestampStr) {
    if (timestampStr) return timestampStr;
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60 * 1000));
    const day = String(istDate.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[istDate.getMonth()];
    const year = istDate.getFullYear();
    let hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm} IST`;
  }

  function updateStatsUI() {
    const freshDeals = state.allDeals.filter(d => (d.is_fresh !== false && (d.age_hours === undefined || d.age_hours <= 24.0)));
    const freshCount = state.stats.fresh_deals_count !== undefined ? state.stats.fresh_deals_count : freshDeals.length;
    const lootCount = freshDeals.filter(d => d.is_loot).length;
    const maxDiscount = freshDeals.reduce((max, d) => Math.max(max, d.effective_discount_pct || d.discount_pct || 0), 0);
    const totalSavings = freshDeals.reduce((sum, d) => sum + (d.savings_inr || 0), 0);

    if (el.statLiveDeals) el.statLiveDeals.textContent = freshCount;
    if (el.statLootCount) el.statLootCount.textContent = state.stats.loot_count || lootCount;
    if (el.statMaxDiscount) el.statMaxDiscount.textContent = `${state.stats.max_discount_pct || maxDiscount}%`;
    if (el.statTotalSavings) {
      const savings = state.stats.total_savings_available || totalSavings;
      el.statTotalSavings.textContent = formatCurrencyShort(savings);
    }

    if (el.feedLiveTimestamp) {
      el.feedLiveTimestamp.textContent = formatLiveIstTimestamp(state.stats.last_updated_ist);
    }
    if (el.statusText) {
      el.statusText.textContent = "Latest Amazon Deals: Live";
    }

    // Dynamic binding of real Telegram URL
    const tgUrl = state.stats.telegram_url || DEFAULT_TELEGRAM_URL;
    document.querySelectorAll('a.btn-telegram, a.footer-link[href*="t.me"], #mNavTelegram').forEach(link => {
      link.href = tgUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }

  function updateTabCounts() {
    if (!state.allDeals) return;
    const freshDeals = state.allDeals.filter(d => (d.is_fresh !== false && (d.age_hours === undefined || d.age_hours <= 24.0)));
    const all = state.stats.fresh_deals_count !== undefined ? state.stats.fresh_deals_count : freshDeals.length;
    const diwali = freshDeals.filter(d => d.is_diwali_steal || (d.savings_inr && d.savings_inr >= 1000)).length;
    const daily = freshDeals.filter(d => d.is_daily_essential || d.is_cookie_magnet || (d.category && (d.category.includes('Personal Care') || d.category.includes('Grocery') || d.category.includes('Beauty'))) || /dove|nivea|pears|cetaphil|minimalist|derma co|plum|l'oreal|tresemme|vaseline|lakme|beardo|colgate|dettol|savlon|listerine|whisper|surf excel|ariel|vim|comfort|harpic|lizol|presto|cadbury|ferrero|happilo|sampann|nescafe|davidoff/i.test(d.title || '')).length;
    const under399 = freshDeals.filter(d => (d.effective_price || d.list_price || 999999) <= 399).length;
    const loot = freshDeals.filter(d => d.is_loot).length;
    const drops = freshDeals.filter(d => d.price_context === 'all_time_low' || d.price_context === 'real_drop' || d.is_further_drop).length;
    const coupons = freshDeals.filter(d => (d.coupon_discount && d.coupon_discount > 0) || d.coupon_text || d.promo_code || d.bank_offer).length;
    const tier1 = freshDeals.filter(d => d.brand_tier === 'tier1').length;
    const watchlist = state.watchlist.size;

    if (el.countAll) el.countAll.textContent = all;
    if (el.countDiwali) el.countDiwali.textContent = diwali;
    if (el.countDaily) el.countDaily.textContent = daily;
    if (el.countUnder399) el.countUnder399.textContent = under399;
    if (el.countLoot) el.countLoot.textContent = loot;
    if (el.countDrops) el.countDrops.textContent = drops;
    if (el.countCoupons) el.countCoupons.textContent = coupons;
    if (el.countTier1) el.countTier1.textContent = tier1;
    if (el.countWatchlist) el.countWatchlist.textContent = watchlist;
    const navCount = document.getElementById('navWatchlistCount');
    if (navCount) navCount.textContent = watchlist;
    const navBtn = document.getElementById('navWatchlistBtn');
    if (navBtn) {
      navBtn.classList.toggle('active', state.filters.tab === 'watchlist');
    }
  }

  function updateTicker() {
    if (!el.tickerContent || !state.allDeals.length) return;
    const topPicks = state.allDeals
      .filter(d => d.is_loot || (d.trending_score || d.score || 0) >= 80 || d.price_context === 'all_time_low')
      .slice(0, 8);

    if (!topPicks.length) return;

    const html = topPicks.map(d => `
      <span class="ticker-item" data-asin="${escapeHtml(d.asin)}">
        <span class="ticker-fire">${d.is_loot ? '🚨' : '🔥'}</span>
        <span class="ticker-brand">${escapeHtml(d.brand || 'Amazon')}:</span>
        <span class="ticker-title-text">${escapeHtml(d.title.substring(0, 48))}...</span>
        <span class="ticker-price">₹${formatNumber(d.effective_price || d.list_price)}</span>
        <span class="ticker-drop">${d.effective_discount_pct || d.discount_pct}% OFF</span>
      </span>
    `).join('');

    el.tickerContent.innerHTML = html;
  }

  // ── 8. SEARCH & ASIN INSPECTOR ─────────────────────────────────────────────
  function handleSearchInput(query) {
    const q = (query || '').trim();
    state.filters.search = q;

    const extractedAsin = extractAsinFromQuery(q);
    if (extractedAsin) {
      showAsinInspector(extractedAsin);
    } else {
      hideAsinInspector();
    }

    renderDeals();
  }

  function extractAsinFromQuery(text) {
    if (!text) return null;
    const asinMatch = text.match(/\b([B0-9][A-Z0-9]{9})\b/i);
    if (asinMatch) return asinMatch[1].toUpperCase();

    const urlMatch = text.match(/(?:\/dp\/|\/gp\/product\/|\/asin\/)([A-Z0-9]{10})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    return null;
  }

  function showAsinInspector(asin) {
    if (!el.asinInspectorCard) return;
    const deal = state.allDeals.find(d => d.asin === asin);

    if (el.inspectorAsin) el.inspectorAsin.textContent = asin;
    if (el.inspectorTitle) {
      el.inspectorTitle.textContent = deal ? deal.title : `Analyzing Amazon India ASIN: ${asin}`;
    }

    updateInspectorChart(asin, state.activeInspectorRange);

    const partnerUrl = getAffiliateUrlWithSubtag(deal || asin, 'bb-modal');
    if (el.inspectorBuyBtn) el.inspectorBuyBtn.href = partnerUrl;
    if (el.inspectorKeepaBtn) el.inspectorKeepaBtn.href = `https://keepa.com/#!product/10-${asin}`;
    if (el.inspectorPhBtn) el.inspectorPhBtn.href = `https://keepa.com/#!product/10-${asin}`;

    el.asinInspectorCard.classList.remove('hidden');
  }

  function updateInspectorChart(asin, range) {
    if (!el.inspectorGraphImg) return;
    state.activeInspectorRange = range;
    el.inspectorGraphImg.src = `https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=in&salesrank=1&range=${range}&v=${Date.now()}`;
    document.querySelectorAll('.inspector-timeframes .timeframe-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-range') === String(range));
    });
  }

  function hideAsinInspector() {
    if (el.asinInspectorCard) el.asinInspectorCard.classList.add('hidden');
  }

  // ── 9. FILTERING & SORTING ENGINE ──────────────────────────────────────────
  function getFilteredDeals() {
    let result = [...state.allDeals];

    // 0. Filter non-positive deals
    result = result.filter(d => (d.effective_price || d.list_price || 0) > 0);

    // 1. Hide expired
    if (state.filters.hideExpired) {
      result = result.filter(d => !d.expired && !d.price_spiked);
    }

    // 2. Tab Filter (Diwali Steals & Smart Buckets)
    switch (state.filters.tab) {
      case 'diwali':
        result = result.filter(d => d.is_diwali_steal || (d.savings_inr && d.savings_inr >= 1000));
        break;
      case 'daily_essentials':
        result = result.filter(d => d.is_daily_essential || d.is_cookie_magnet || (d.category && (d.category.includes('Personal Care') || d.category.includes('Grocery') || d.category.includes('Beauty'))) || /dove|nivea|pears|cetaphil|minimalist|derma co|plum|l'oreal|tresemme|vaseline|lakme|beardo|colgate|dettol|savlon|listerine|whisper|surf excel|ariel|vim|comfort|harpic|lizol|presto|cadbury|ferrero|happilo|sampann|nescafe|davidoff/i.test(d.title || ''));
        break;
      case 'under_399':
        result = result.filter(d => (d.effective_price || d.list_price || 999999) <= 399);
        break;
      case 'loot':
        result = result.filter(d => d.is_loot);
        break;
      case 'drops':
        result = result.filter(d => d.price_context === 'all_time_low' || d.price_context === 'real_drop' || d.is_further_drop);
        break;
      case 'coupons':
        result = result.filter(d => (d.coupon_discount && d.coupon_discount > 0) || d.coupon_text || d.promo_code || d.bank_offer);
        break;
      case 'tier1':
        result = result.filter(d => d.brand_tier === 'tier1');
        break;
      case 'watchlist':
        result = result.filter(d => state.watchlist.has(d.asin));
        break;
    }

    // 3. Price Bucket Filter
    const pb = state.filters.priceBucket;
    if (pb === '99') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 99);
    } else if (pb === '299') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 299);
    } else if (pb === 'under-399' || pb === '399') {
      result = result.filter(d => (d.effective_price || d.list_price || 999999) <= 399);
    } else if (pb === '499') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 499);
    } else if (pb === '999') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 999);
    } else if (pb === '2499') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 2499);
    } else if (pb === 'electronics') {
      result = result.filter(d => {
        const cat = (d.category || '').toLowerCase();
        return (cat.includes('electronic') || cat.includes('audio') || cat.includes('laptop') || cat.includes('mobile')) && (d.effective_price || 0) >= 1500;
      });
    } else if (pb === 'premium') {
      result = result.filter(d => (d.effective_price || d.list_price) > 2500);
    }

    // 4. Category Filter
    if (state.filters.category && state.filters.category !== 'all') {
      const filterCat = state.filters.category.toLowerCase();
      result = result.filter(d => {
        if (!d.category) return false;
        const dCat = d.category.toLowerCase();
        if (filterCat === 'electronics' || filterCat === 'electronics & audio') {
          return dCat.includes('electronic') || dCat.includes('audio') || dCat.includes('laptop');
        }
        if (filterCat === 'mobiles' || filterCat === 'mobiles & accessories') {
          return dCat.includes('mobile');
        }
        if (filterCat === 'home' || filterCat === 'home & kitchen') {
          return dCat.includes('home') || dCat.includes('kitchen');
        }
        if (filterCat === 'fashion' || filterCat === 'fashion & footwear') {
          return dCat.includes('fashion') || dCat.includes('footwear');
        }
        if (filterCat === 'grocery' || filterCat === 'personal care & grocery') {
          return dCat.includes('grocery') || dCat.includes('personal care') || dCat.includes('beauty');
        }
        return dCat === filterCat;
      });
    }

    // 5. Search Filter
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      result = result.filter(d => {
        return (
          (d.title && d.title.toLowerCase().includes(q)) ||
          (d.brand && d.brand.toLowerCase().includes(q)) ||
          (d.asin && d.asin.toLowerCase().includes(q)) ||
          (d.category && d.category.toLowerCase().includes(q)) ||
          (d.bank_offer && d.bank_offer.toLowerCase().includes(q)) ||
          (d.promo_code && d.promo_code.toLowerCase().includes(q))
        );
      });
    }

    function getDealRecency(d) {
      return d.last_verified_at_epoch || d.posted_at_epoch || d.updated_at || 0;
    }

    // 6. Sorting (Default: Strict Recency / Most Recently Verified First)
    switch (state.filters.sort) {
      case 'newest':
        result.sort((a, b) => getDealRecency(b) - getDealRecency(a));
        break;
      case 'score':
        result.sort((a, b) => {
          const aFresh = (a.is_fresh !== false && (a.age_hours === undefined || a.age_hours <= 24.0)) ? 1 : 0;
          const bFresh = (b.is_fresh !== false && (b.age_hours === undefined || b.age_hours <= 24.0)) ? 1 : 0;
          if (bFresh !== aFresh) return bFresh - aFresh;

          // Priority Boost for Cookie-Magnet FMCG & Daily Essentials (Dove, Surf Excel, Colgate, Nivea under ₹499 with >=40% off)
          const isTopMagnet = (d) => {
            const effP = d.effective_price || d.list_price || 999999;
            const disc = d.effective_discount_pct || d.discount_pct || 0;
            const isFmcg = d.is_daily_essential || d.is_cookie_magnet || (d.category && d.category.includes('Personal Care')) || /dove|colgate|nivea|pears|surf excel|ariel|vim|comfort|harpic|lizol|dettol|presto|minimalist|cetaphil|tresemme|cadbury|happilo/i.test(d.title || '');
            return isFmcg && effP <= 499 && disc >= 40;
          };
          const aMag = isTopMagnet(a) ? 1 : 0;
          const bMag = isTopMagnet(b) ? 1 : 0;
          if (aMag !== bMag) return bMag - aMag;

          return (getDealRecency(b) - getDealRecency(a)) || ((b.trending_score || b.score || 0) - (a.trending_score || a.score || 0));
        });
        break;
      case 'discount':
        result.sort((a, b) => (b.effective_discount_pct || b.discount_pct || 0) - (a.effective_discount_pct || a.discount_pct || 0));
        break;
      case 'price_asc':
        result.sort((a, b) => (a.effective_price || a.list_price || 0) - (b.effective_price || b.list_price || 0));
        break;
      case 'savings':
        result.sort((a, b) => (b.savings_inr || 0) - (a.savings_inr || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.review_count || 0) - (a.review_count || 0));
        break;
    }

    // High conversion rule: always keep genuine products with real names & images on top rows
    result.sort((a, b) => {
      const aGen = (!a.title || a.title.startsWith('Amazon Deal (') || a.title.length < 10) ? 1 : 0;
      const bGen = (!b.title || b.title.startsWith('Amazon Deal (') || b.title.length < 10) ? 1 : 0;
      return aGen - bGen;
    });

    return result;
  }

  // ── 10. DEAL CARD RENDERING & AMAZON CATALOG UNLOCKER ──────────────────────
  function createAmazonUnlockerCard(query) {
    const qEnc = encodeURIComponent(query);
    const tag = 'dammaiprasad-21';
    const allUrl = `https://www.amazon.in/s?k=${qEnc}&rh=p_72%3A1318476031%2Cp_n_pct-off-with-tax%3A2665399031&s=review-rank&tag=${tag}&linkCode=ll2&ascsubtag=bb-search`;
    const u499Url = `https://www.amazon.in/s?k=${qEnc}&rh=p_36%3A-49900%2Cp_72%3A1318476031&s=review-rank&tag=${tag}&linkCode=ll2&ascsubtag=bb-search`;
    const u999Url = `https://www.amazon.in/s?k=${qEnc}&rh=p_36%3A-99900%2Cp_72%3A1318476031&s=review-rank&tag=${tag}&linkCode=ll2&ascsubtag=bb-search`;
    const halfOffUrl = `https://www.amazon.in/s?k=${qEnc}&rh=p_n_pct-off-with-tax%3A2665401031%2Cp_72%3A1318476031&s=review-rank&tag=${tag}&linkCode=ll2&ascsubtag=bb-search`;

    return `
      <div class="amazon-catalog-unlocker">
        <div class="unlocker-header">
          <span class="unlocker-icon">🎯</span>
          <div>
            <h3 class="unlocker-title">Live Amazon.in 4★+ Deal Unlocker for "${escapeHtml(query)}"</h3>
            <p class="unlocker-subtitle">Search entire 20-Crore+ Amazon catalog with verified 4★+ ratings & instant discount filters</p>
          </div>
        </div>
        <div class="unlocker-actions">
          <a href="${allUrl}" target="_blank" rel="noopener noreferrer" class="amazon-unlocker-btn unlocker-btn-all">
            <span>🛒 All 4★+ "${escapeHtml(query)}" Deals ↗</span>
          </a>
          <a href="${u499Url}" target="_blank" rel="noopener noreferrer" class="amazon-unlocker-btn unlocker-btn-499">
            <span>🪙 "${escapeHtml(query)}" Under ₹499 ↗</span>
          </a>
          <a href="${u999Url}" target="_blank" rel="noopener noreferrer" class="amazon-unlocker-btn unlocker-btn-999">
            <span>💰 "${escapeHtml(query)}" Under ₹999 ↗</span>
          </a>
          <a href="${halfOffUrl}" target="_blank" rel="noopener noreferrer" class="amazon-unlocker-btn unlocker-btn-50">
            <span>🔥 50%+ OFF "${escapeHtml(query)}" Loots ↗</span>
          </a>
        </div>
      </div>
    `;
  }

  function renderTop3Spotlight(deals) {
    if (!el.top3SpotlightStrip) return;
    const isDefaultView = state.filters.tab === 'all' &&
      state.filters.category === 'all' &&
      state.filters.priceBucket === 'all' &&
      (!state.filters.search || state.filters.search.trim().length === 0);

    if (!isDefaultView || !deals || deals.length < 3) {
      el.top3SpotlightStrip.style.display = 'none';
      return;
    }
    el.top3SpotlightStrip.style.display = 'block';

    const pick1Candidates = [...deals].sort((a, b) => {
      const aTier = a.brand_tier === 'tier1' ? 1 : 0;
      const bTier = b.brand_tier === 'tier1' ? 1 : 0;
      if (aTier !== bTier) return bTier - aTier;
      return (b.trending_score || b.score || 0) - (a.trending_score || a.score || 0);
    });
    const pick1 = pick1Candidates[0] || deals[0];

    const under300 = deals.filter(d => (d.effective_price || 999999) <= 299 && d.asin !== pick1.asin);
    let pick2 = null;
    if (under300.length) {
      pick2 = under300.sort((a, b) => (b.effective_discount_pct || 0) - (a.effective_discount_pct || 0))[0];
    } else {
      const rem = deals.filter(d => d.asin !== pick1.asin);
      pick2 = rem.sort((a, b) => (a.effective_price || 999999) - (b.effective_price || 999999))[0] || deals[1] || deals[0];
    }

    const couponDeals = deals.filter(d => ((d.coupon_discount || 0) > 0 || d.coupon_text) && d.asin !== pick1.asin && d.asin !== pick2.asin);
    let pick3 = null;
    if (couponDeals.length) {
      pick3 = couponDeals[0];
    } else {
      const rem2 = deals.filter(d => d.asin !== pick1.asin && d.asin !== pick2.asin);
      pick3 = rem2.sort((a, b) => (b.effective_discount_pct || 0) - (a.effective_discount_pct || 0))[0] || deals[2] || deals[0];
    }

    const picks = [
      { ribbon: '🏆 #1 OVERALL SCREAMER', deal: pick1 },
      { ribbon: '🪙 #1 BUDGET COOKIE-DROPPER', deal: pick2 },
      { ribbon: '🎟️ #1 HIDDEN COUPON PICK', deal: pick3 },
    ];

    const svgPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='100%' height='100%' fill='%23f1f5f9'/><text x='50%' y='50%' font-size='32' text-anchor='middle' dominant-baseline='middle'>⚡</text></svg>";

    const cardsHtml = picks.map(({ ribbon, deal }) => {
      const effPrice = deal.effective_price || deal.list_price || 0;
      const mrp = deal.mrp || 0;
      const disc = deal.effective_discount_pct || deal.discount_pct || 0;
      const affUrl = getAffiliateUrlWithSubtag(deal, 'bb-top3');
      const dealUrl = `/deal/${deal.asin}.html`;

      return `
        <div class="spotlight-mini-card">
          <div class="spotlight-ribbon">${ribbon}</div>
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
            <a href="${escapeHtml(affUrl)}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0; width:70px; height:70px; display:flex; align-items:center; justify-content:center; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid var(--border-card);">
              <img src="${escapeHtml(deal.image_url)}" alt="${escapeHtml(deal.title)}" style="max-height:60px; max-width:60px; object-fit:contain;" loading="lazy" onerror="this.src='${svgPlaceholder}';">
            </a>
            <div style="flex:1; min-width:0;">
              <a href="${escapeHtml(affUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.86rem; font-weight:700; color:var(--text-main); text-decoration:none; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3; margin-bottom:4px;">
                ${escapeHtml(deal.title)}
              </a>
              <div style="display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;">
                <span style="font-size:1.1rem; font-weight:800; color:#10b981;">₹${formatNumber(effPrice)}</span>
                ${mrp && mrp > effPrice ? `<span style="font-size:0.78rem; text-decoration:line-through; color:var(--text-muted);">₹${formatNumber(mrp)}</span>` : ''}
                ${disc > 0 ? `<span style="font-size:0.75rem; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.12); padding:2px 6px; border-radius:4px;">${disc}% OFF</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="${escapeHtml(affUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="flex:1; text-align:center; padding:7px 10px; font-size:0.82rem; font-weight:700; border-radius:var(--radius-full); text-decoration:none;">🛒 Grab Now ↗</a>
            <button class="btn-chart-deal btn-open-modal" data-asin="${escapeHtml(deal.asin)}" style="padding:7px 10px; font-size:0.82rem; font-weight:600; border-radius:var(--radius-full); background:var(--bg-input); color:var(--text-main); border:1px solid var(--border-card); cursor:pointer;">📈</button>
          </div>
        </div>
      `;
    }).join('');

    el.top3SpotlightStrip.innerHTML = `
      <div class="spotlight-header">
        <h2 class="spotlight-title">
          <span>⚡ TODAY'S TOP 3 MUST-BUY PICKS</span>
        </h2>
        <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">Updated Live from 24/7 AI Radar</span>
      </div>
      <div class="spotlight-cards-grid">
        ${cardsHtml}
      </div>
    `;
  }

  // Dynamic Category Pill Hiding (Requirement 1: Never show empty category pill)
  function updateCategoryPillsVisibility() {
    if (!el.catPills) return;
    const allDeals = state.allDeals || [];
    el.catPills.forEach(pill => {
      const cat = pill.getAttribute('data-category');
      if (!cat || cat === 'all') {
        pill.style.display = '';
        return;
      }
      const filterCat = cat.toLowerCase();
      const matchCount = allDeals.filter(d => {
        if (!d.category) return false;
        const dCat = d.category.toLowerCase();
        if (filterCat === 'electronics' || filterCat === 'electronics & audio') {
          return dCat.includes('electronic') || dCat.includes('audio') || dCat.includes('laptop');
        }
        if (filterCat === 'mobiles' || filterCat === 'mobiles & accessories') {
          return dCat.includes('mobile');
        }
        if (filterCat === 'home' || filterCat === 'home & kitchen') {
          return dCat.includes('home') || dCat.includes('kitchen');
        }
        if (filterCat === 'fashion' || filterCat === 'fashion & footwear') {
          return dCat.includes('fashion') || dCat.includes('footwear');
        }
        if (filterCat === 'grocery' || filterCat === 'personal care & grocery') {
          return dCat.includes('grocery') || dCat.includes('personal care') || dCat.includes('beauty');
        }
        return dCat === filterCat;
      }).length;

      if (matchCount < 3) {
        pill.style.display = 'none';
      } else {
        pill.style.display = '';
      }
    });
  }

  function renderDeals() {
    updateCategoryPillsVisibility();
    if (!el.dealsGrid) return;
    const deals = getFilteredDeals();
    const searchQuery = (state.filters.search || '').trim();
    const hasSearch = searchQuery.length >= 2;

    renderTop3Spotlight(state.allDeals);

    if (!deals.length) {
      if (el.visibleCount) el.visibleCount.textContent = '0';
      if (hasSearch) {
        if (el.emptyState) el.emptyState.classList.add('hidden');
        el.dealsGrid.innerHTML = createAmazonUnlockerCard(searchQuery);
        updateWatchlistBanner();
        return;
      }
      el.dealsGrid.innerHTML = '';
      if (el.emptyState) el.emptyState.classList.remove('hidden');
      const olderContainer = document.getElementById('olderDealsContainer');
      if (olderContainer) {
        olderContainer.classList.add('hidden');
        olderContainer.innerHTML = '';
      }
      updateWatchlistBanner();
      return;
    }

    if (el.emptyState) el.emptyState.classList.add('hidden');

    // Separate fresh deals (<= 24h) from historical older deals (> 24h)
    const freshDeals = deals.filter(d => (d.is_fresh !== false && (d.age_hours === undefined || d.age_hours <= 24.0)));
    const olderDeals = deals.filter(d => !(d.is_fresh !== false && (d.age_hours === undefined || d.age_hours <= 24.0)));

    if (freshDeals.length > 0) {
      if (el.visibleCount) el.visibleCount.textContent = freshDeals.length;
      let html = freshDeals.map((deal, idx) => createDealCardHtml(deal, idx, false)).join('');
      if (hasSearch) {
        html += createAmazonUnlockerCard(searchQuery);
      }
      el.dealsGrid.innerHTML = html;
    } else {
      // If no fresh deals are loaded yet, display older deals in primary feed with warning
      if (el.visibleCount) el.visibleCount.textContent = olderDeals.length;
      let html = olderDeals.map((deal, idx) => createDealCardHtml(deal, idx, true)).join('');
      if (hasSearch) {
        html += createAmazonUnlockerCard(searchQuery);
      }
      el.dealsGrid.innerHTML = html;
    }

    // Render Collapsible Older Deals Section if both fresh and older exist
    const olderContainer = document.getElementById('olderDealsContainer');
    if (olderContainer) {
      if (freshDeals.length > 0 && olderDeals.length > 0) {
        olderContainer.classList.remove('hidden');
        olderContainer.innerHTML = `
          <div class="older-deals-header" id="olderDealsToggle" role="button" tabindex="0" title="Click to toggle older deals">
            <div class="older-deals-title-wrap">
              <span class="older-deals-icon">⚠️</span>
              <div class="older-deals-text">
                <h3 class="older-deals-heading">Older Deals (Prices May Have Changed)</h3>
                <span class="older-deals-subtext">Verified &gt; 24h ago. Amazon prices fluctuate frequently.</span>
              </div>
              <span class="older-deals-badge">${olderDeals.length} Deals</span>
            </div>
            <button class="older-deals-toggle-btn" type="button" aria-expanded="false">
              <span class="older-toggle-text">Show Older Deals</span>
              <span class="older-toggle-arrow">▼</span>
            </button>
          </div>
          <div class="older-deals-grid hidden" id="olderDealsGrid">
            ${olderDeals.map((deal, idx) => createDealCardHtml(deal, idx + freshDeals.length, true)).join('')}
          </div>
        `;
        const toggleBtn = olderContainer.querySelector('#olderDealsToggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            const grid = document.getElementById('olderDealsGrid');
            const btnText = olderContainer.querySelector('.older-toggle-text');
            const arrow = olderContainer.querySelector('.older-toggle-arrow');
            if (grid) {
              const isHidden = grid.classList.contains('hidden');
              grid.classList.toggle('hidden', !isHidden);
              if (btnText) btnText.textContent = isHidden ? 'Hide Older Deals' : 'Show Older Deals';
              if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
            }
          });
        }
      } else {
        olderContainer.classList.add('hidden');
        olderContainer.innerHTML = '';
      }
    }

    updateWatchlistBanner();
  }

  function createDealCardHtml(d, cardIndex = 0, isOlder = false) {
    const isSaved = state.watchlist.has(d.asin);
    const effPrice = d.effective_price || d.list_price || 0;
    if (effPrice <= 0) return '';
    const discPct = d.effective_discount_pct || d.discount_pct || 0;
    const buyConf = d.buy_confidence || 75;

    // Affiliate link tracking with ascsubtag placement
    const affBtnUrl = getAffiliateUrlWithSubtag(d, 'bb-grid');
    const affImgUrl = getAffiliateUrlWithSubtag(d, 'bb-card-img');
    const affTitleUrl = getAffiliateUrlWithSubtag(d, 'bb-card-title');
    const affPriceUrl = getAffiliateUrlWithSubtag(d, 'bb-card-price');
    const affCouponUrl = getAffiliateUrlWithSubtag(d, 'bb-coupon-pill');

    // Badges
    const badgesHtml = [];
    if (state.keywordAlerts && state.keywordAlerts.length > 0) {
      const textToMatch = `${d.title || ''} ${d.brand || ''} ${d.category || ''}`.toLowerCase();
      const matchedKw = state.keywordAlerts.some(kw => kw && textToMatch.includes(kw.toLowerCase().trim()));
      if (matchedKw) {
        badgesHtml.unshift('<span class="badge-tag badge-keyword-match">🔔 MATCHES YOUR ALERT</span>');
      }
    }
    if (d.is_new || (d.age_hours !== undefined && d.age_hours <= 2.0)) {
      badgesHtml.push('<span class="badge-tag badge-new">⚡ NEW</span>');
    }
    if (d.is_diwali_steal) {
      badgesHtml.push('<span class="badge-tag badge-diwali">🔥 DIWALI STEAL</span>');
    }
    if (d.is_cookie_magnet) {
      badgesHtml.push('<span class="badge-tag badge-magnet">⚡ VIRAL DAILY STEAL</span>');
    }
    if (d.is_loot) {
      badgesHtml.push('<span class="badge-tag badge-loot">🚨 LOOT ALERT</span>');
    }
    if (d.price_context === 'all_time_low') {
      badgesHtml.push('<span class="badge-tag badge-drop">📉 ALL-TIME LOW</span>');
    } else if (d.is_further_drop) {
      badgesHtml.push('<span class="badge-tag badge-further">🔥 FURTHER DROP</span>');
    }
    if (d.brand_tier === 'tier1') {
      badgesHtml.push('<span class="badge-tag badge-tier1">🏆 TIER-1 BRAND</span>');
    }
    if (d.posted_to_telegram) {
      badgesHtml.push('<span class="badge-tag badge-telegram">📲 Featured on Telegram</span>');
    }

    // Coupon Claim Checklist Banner
    let couponClaimBanner = '';
    const couponLabel = d.coupon_text || (d.coupon_discount ? `Apply ₹${formatNumber(d.coupon_discount)} coupon` : '');
    if (d.coupon_discount || d.coupon_text) {
      couponClaimBanner = `
        <div class="coupon-claim-banner clickable-coupon-pill" data-aff="${escapeHtml(affCouponUrl)}" data-promo="${escapeHtml(d.promo_code || '')}" title="Click to copy promo code and open Amazon deal">
          <span class="coupon-tick-icon">☑️</span>
          <span class="coupon-claim-text">Tick <b>"${escapeHtml(couponLabel)}"</b> on Amazon page ${d.coupon_discount ? `<span class="coupon-discount-tag">(-₹${formatNumber(d.coupon_discount)})</span>` : ''}</span>
        </div>
      `;
    }

    // Extra Offers Chips (UPI Cashback, S&S, Combo Offers)
    let extraOffersHtml = '';
    if (d.extra_offers && d.extra_offers.length > 0) {
      extraOffersHtml = `
        <div class="extra-offers-row">
          ${d.extra_offers.map(off => `<span class="extra-offer-chip">${escapeHtml(off)}</span>`).join('')}
        </div>
      `;
    }

    // Callouts (Coupon, Bank, Promo)
    const calloutsHtml = [];
    if (d.coupon_discount && d.coupon_discount > 0) {
      calloutsHtml.push(`
        <div class="callout-pill callout-coupon">
          <span>🎟️ Includes ₹${formatNumber(d.coupon_discount)} On-Page Coupon</span>
          <span style="font-weight:700;">Applied</span>
        </div>
      `);
    }
    if (d.bank_offer) {
      calloutsHtml.push(`
        <div class="callout-pill callout-bank" title="${escapeHtml(d.bank_offer)}">
          <span>💳 ${escapeHtml(d.bank_offer.substring(0, 48))}...</span>
        </div>
      `);
    }
    if (d.promo_code) {
      calloutsHtml.push(`
        <div class="callout-pill callout-promo btn-copy-promo" data-promo="${escapeHtml(d.promo_code)}" title="Click to copy promo code">
          <span>🎟️ Code: <code style="font-weight:700;">${escapeHtml(d.promo_code)}</code></span>
          <span class="promo-copy-action">📋 Tap to Copy</span>
        </div>
      `);
    }

    // Card Cashback Mode (Amazon Pay ICICI 5% Off)
    let cardPriceHtml = '';
    if (state.cardDiscount) {
      const cardPrice = Math.round(effPrice * 0.95);
      const extraSavings = effPrice - cardPrice;
      cardPriceHtml = `
        <div class="card-cashback-badge">
          <span class="cashback-icon">💳</span>
          <span class="cashback-text"><b>₹${formatNumber(cardPrice)}</b> with 5% Amazon Pay (Extra ₹${formatNumber(extraSavings)} saved)</span>
        </div>
      `;
    }

    // Buy Confidence Bar
    let confClass = 'normal';
    let confText = 'Good Value';
    if (buyConf >= 90) {
      confClass = 'high';
      confText = 'Screaming Deal, Buy Now!';
    } else if (buyConf >= 80) {
      confClass = 'medium';
      confText = 'Strong Price Drop';
    }

    // Historical comparison line
    let trajectoryHtml = '';
    if (d.historical_avg && d.historical_avg > effPrice) {
      const dropAmount = d.historical_avg - effPrice;
      trajectoryHtml = `<div class="historical-trajectory-text">📉 <b>₹${formatNumber(dropAmount)}</b> below tracked average (₹${formatNumber(d.historical_avg)})</div>`;
    }

    // BuyHatke Price Range Slider Bar
    const lowRef = Math.min(effPrice, d.historical_min || effPrice);
    const highRef = Math.max(d.mrp || 0, d.historical_max || (d.mrp || Math.round(effPrice * 1.35)));
    const spread = Math.max(1, highRef - lowRef);
    const posPct = Math.min(92, Math.max(4, Math.round(((effPrice - lowRef) / spread) * 100)));
    const buyhatkeBarHtml = `
      <div class="buyhatke-range-box" title="Current Price vs Historical Low & MRP">
        <div class="range-labels-row">
          <span class="range-lbl range-low">Low: ₹${formatNumber(lowRef)}</span>
          <span class="range-lbl range-now">Now: ₹${formatNumber(effPrice)} ✅</span>
          <span class="range-lbl range-high">MRP: ₹${formatNumber(highRef)}</span>
        </div>
        <div class="range-track">
          <div class="range-marker" style="left: ${posPct}%;" title="Now: ₹${formatNumber(effPrice)} (${posPct}% of range)">●</div>
        </div>
      </div>
    `;

    // HotUKDeals Degree Meter
    const baseDegrees = Math.round((d.score || 70) * 2.4 + (d.is_loot ? 45 : 0) + ((d.coupon_discount || 0) > 0 ? 25 : 0));
    const isUpvoted = state.upvotedDeals && state.upvotedDeals.has(d.asin);
    const currentDegrees = baseDegrees + (isUpvoted ? 1 : 0);

    // GrabOn Trust Line
    let whyBuySummary = "Lowest tracked price + verified seller";
    if (d.coupon_discount && d.coupon_discount > 0) {
      whyBuySummary = `Save ₹${formatNumber(d.savings_inr || 0)} + Extra ₹${formatNumber(d.coupon_discount)} Coupon`;
    } else if (d.savings_inr && d.savings_inr >= 1000) {
      whyBuySummary = `Save ₹${formatNumber(d.savings_inr)} below MRP (${discPct}% OFF)`;
    } else if (d.brand_tier === 'tier1') {
      whyBuySummary = `Genuine Tier-1 ${d.brand || 'brand'} at verified low`;
    } else if (discPct >= 50) {
      whyBuySummary = `Steep ${discPct}% verified drop`;
    }
    const isDealFresh = !isOlder && (d.is_fresh !== false && (d.age_hours === undefined || d.age_hours <= 24.0));
    const trustBadgeHtml = isDealFresh
      ? `<span class="trust-check">✓ Verified Live on Amazon</span>`
      : `<span class="trust-check trust-warning">⚠️ Price subject to change on Amazon</span>`;

    const grabonTrustHtml = `
      <div class="grabon-trust-line">
        ${trustBadgeHtml}
        <span class="trust-sep">•</span>
        <span class="trust-reason">💡 <b>Why Buy:</b> ${escapeHtml(whyBuySummary)}</span>
      </div>
    `;

    const timeAgoStr = d.updated_at ? getTimeAgo(d.updated_at) : 'Just now';

    // Core Web Vitals Image Tag
    const imgAttr = (cardIndex < 3)
      ? 'fetchpriority="high" decoding="async" width="220" height="220"'
      : 'loading="lazy" decoding="async" width="220" height="220"';
    const svgPlaceholder = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2UyZThmMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYmcpIiByeD0iMTYiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjUwIiBmaWxsPSIjZmVmM2M3Ii8+PHRleHQgeD0iMTUwIiB5PSIxMzIiIGZvbnQtc2l6ZT0iNTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPvKaITwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjIwMCIgZm9udC1zaXplPSIxNSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzBmMTcyYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkFtYXpvbiBWZXJpZmllZCBEZWFsPC90ZXh0Pjx0ZXh0IHg9IjE1MCIgeT0iMjIyIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjNjQ3NDhiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+Q2xpY2sgdG8gZmluZCBvbiBBbWF6b24g4oaXPC90ZXh0Pjwvc3ZnPg==";

    return `
      <article class="deal-card ${d.is_loot ? 'is-loot' : ''}" data-asin="${escapeHtml(d.asin)}">
        <div class="card-top">
          <div class="card-badges">
            ${badgesHtml.join('')}
          </div>
          <div class="card-top-actions">
            <button class="btn-hotness-degree ${isUpvoted ? 'voted' : ''}" data-asin="${escapeHtml(d.asin)}" data-base="${baseDegrees}" title="Upvote deal hotness">
              🔥 <span class="degree-count">${currentDegrees}°</span>
            </button>
            <span class="time-ago">${timeAgoStr}</span>
            <button class="btn-watchlist ${isSaved ? 'saved' : ''}" data-asin="${escapeHtml(d.asin)}" title="${isSaved ? 'Remove from Watchlist' : 'Save to Watchlist'}">
              ${isSaved ? '❤️' : '🤍'}
            </button>
          </div>
        </div>

        <div class="card-media">
          <div class="card-image-wrap">
            <a href="${escapeHtml(affImgUrl)}" target="_blank" rel="noopener noreferrer" class="card-img-anchor" title="View Deal on Amazon.in">
              <img src="${escapeHtml(d.image_url)}" alt="${escapeHtml(d.title)}" class="card-img" ${imgAttr} onload="if(this.naturalWidth<=1||this.naturalHeight<=1){this.onload=null;this.src='${svgPlaceholder}';}" onerror="this.onerror=null;this.src='${svgPlaceholder}';">
            </a>
          </div>
          <div class="card-meta-bar">
            <span class="brand-chip">${escapeHtml(d.brand || d.category || 'Amazon')}</span>
            ${d.rating ? `
              <div class="rating-chip">
                <span>⭐ ${d.rating}</span>
                ${d.review_count ? `<span class="reviews-count">(${formatReviewCount(d.review_count)})</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="card-content">
          <a href="${escapeHtml(affTitleUrl)}" target="_blank" rel="noopener noreferrer" class="card-title" title="${escapeHtml(d.title)}">
            ${escapeHtml(d.title)}
          </a>

          <!-- Price Waterfall -->
          <div class="price-waterfall-box">
            <a href="${escapeHtml(affPriceUrl)}" target="_blank" rel="noopener noreferrer" class="price-main-row-link" title="Grab at this price on Amazon" style="text-decoration:none; color:inherit; display:flex; align-items:baseline; gap:8px;">
              <span class="effective-price">₹${formatNumber(effPrice)}</span>
              ${d.mrp && d.mrp > effPrice ? `<span class="original-mrp">₹${formatNumber(d.mrp)}</span>` : ''}
              ${discPct ? `<span class="discount-badge">${discPct}% OFF</span>` : ''}
            </a>
            ${d.savings_inr > 0 ? `<div class="savings-line">You save ₹${formatNumber(d.savings_inr)}</div>` : ''}
            ${cardPriceHtml}
          </div>

          ${buyhatkeBarHtml}
          ${couponClaimBanner}
          ${extraOffersHtml}
          ${calloutsHtml.length ? `<div class="callouts-list">${calloutsHtml.join('')}</div>` : ''}

          <!-- Buy Confidence Meter -->
          <div class="confidence-meter-box">
            <div class="confidence-header">
              <span class="confidence-label">
                <span>${buyConf >= 80 ? '🟢' : '🟡'}</span>
                <span>${confText}</span>
              </span>
              <span class="confidence-pct">${buyConf}% Confidence</span>
            </div>
            <div class="confidence-bar-bg">
              <div class="confidence-bar-fill ${confClass}" style="width: ${buyConf}%"></div>
            </div>
            ${trajectoryHtml}
          </div>

          ${grabonTrustHtml}
        </div>

        <div class="card-footer">
          <a href="${escapeHtml(affBtnUrl)}" target="_blank" rel="noopener noreferrer" class="btn-buy-deal">
            <span>${(d.is_cookie_magnet) ? '🛒 Grab Daily Steal on Amazon ↗' : ((buyConf >= 80 || d.is_diwali_steal || effPrice >= 2000) ? '🛒 Grab Diwali Deal on Amazon ↗' : '🛒 Grab Deal on Amazon ↗')}</span>
          </a>
          <button class="btn-card-share" data-asin="${escapeHtml(d.asin)}" title="Share Deal via WhatsApp / Copy Link">
            <span>📤 Share</span>
          </button>
          <button class="btn-chart-deal btn-open-modal" data-asin="${escapeHtml(d.asin)}" title="View Price History & Keepa Chart">
            <span>📈 Chart</span>
          </button>
        </div>
      </article>
    `;
  }

  // ── 11. MODAL & CHART LOGIC (Requirement 4: Timeframes & AI Buy Verdict) ───
  function openDealModal(asin) {
    if (!asin) return;
    asin = asin.toUpperCase();
    let deal = state.allDeals.find(d => d.asin === asin);
    if (!deal) {
      deal = {
        asin: asin,
        title: `Amazon Verified Deal (${asin})`,
        effective_price: null,
        list_price: null,
        mrp: null,
        affiliate_url: `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}&linkCode=ll1`,
        image_url: `https://m.media-amazon.com/images/P/${asin}.jpg`,
        price_context: 'normal',
        buy_confidence: 85,
        claim_steps: [
          "🛒 Click 'Grab Deal' to open the official Amazon India product page.",
          "🎉 Complete checkout at the verified price on Amazon!"
        ]
      };
    }

    state.activeModalDeal = deal;
    const effPrice = deal.effective_price || deal.list_price || 0;

    if (el.modalTitle) el.modalTitle.textContent = deal.title;
    if (el.modalCurrentPrice) el.modalCurrentPrice.textContent = `₹${formatNumber(effPrice)}`;
    if (el.modalMinPrice) el.modalMinPrice.textContent = deal.historical_min ? `₹${formatNumber(deal.historical_min)}` : 'Tracking';
    if (el.modalAvgPrice) el.modalAvgPrice.textContent = deal.historical_avg ? `₹${formatNumber(deal.historical_avg)}` : 'Tracking';
    if (el.modalMrpPrice) el.modalMrpPrice.textContent = deal.mrp ? `₹${formatNumber(deal.mrp)}` : 'N/A';

    updateModalChart(asin, state.activeModalRange);
    renderModalAiVerdict(deal, effPrice);

    // Populate How to Claim Checklist
    if (el.modalClaimBox && el.modalClaimStepsList) {
      const steps = deal.claim_steps && deal.claim_steps.length > 0 ? deal.claim_steps : [
        "🛒 Click 'Grab Deal' to open the official Amazon India product page.",
        `🎉 Complete checkout at the verified price of ₹${formatNumber(effPrice)}!`
      ];
      el.modalClaimStepsList.innerHTML = steps.map((step, idx) => `
        <li class="claim-step-item">
          <span class="step-num">${idx + 1}</span>
          <span class="step-desc">${escapeHtml(step)}</span>
        </li>
      `).join('');
      el.modalClaimBox.style.display = 'block';
    }

    if (el.modalBuyBtn) el.modalBuyBtn.href = deal.affiliate_url;

    if (el.chartModal) el.chartModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function updateModalChart(asin, range) {
    state.activeModalRange = range;
    if (el.chartLoading) el.chartLoading.style.display = 'block';
    if (el.modalChartImg) {
      el.modalChartImg.style.opacity = '0.3';
      el.modalChartImg.onload = () => {
        if (el.chartLoading) el.chartLoading.style.display = 'none';
        el.modalChartImg.style.opacity = '1';
      };
      el.modalChartImg.onerror = () => {
        if (el.chartLoading) el.chartLoading.style.display = 'none';
        el.modalChartImg.style.opacity = '1';
      };
      el.modalChartImg.src = `https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=in&salesrank=1&range=${range}&v=${Date.now()}`;
    }

    document.querySelectorAll('.modal-timeframe-btns .timeframe-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-range') === String(range));
    });
  }

  function renderModalAiVerdict(deal, effPrice) {
    if (!el.modalVerdictBox || !el.modalVerdictText) return;
    const buyConf = deal.buy_confidence || 75;
    const isAllTimeLow = deal.price_context === 'all_time_low' || (deal.historical_min && effPrice <= deal.historical_min);
    const belowAvg = deal.historical_avg && effPrice < deal.historical_avg;

    if (el.modalVerdictPill) {
      if (isAllTimeLow || deal.is_loot) {
        el.modalVerdictPill.textContent = 'ALL-TIME LOW (PRIME BUY)';
        el.modalVerdictPill.style.color = '#10b981';
      } else if (buyConf >= 85) {
        el.modalVerdictPill.textContent = 'HIGH CONFIDENCE BUY';
        el.modalVerdictPill.style.color = '#38bdf8';
      } else {
        el.modalVerdictPill.textContent = 'STRONG VALUE';
        el.modalVerdictPill.style.color = '#f59e0b';
      }
    }

    let verdictStr = '';
    if (isAllTimeLow) {
      verdictStr = `🎯 <b>UNMATCHED DEAL: ALL-TIME LOW!</b> Current price (₹${formatNumber(effPrice)}) matches or beats the lowest recorded price in tracking history. Buy confidence is rated at <b>${buyConf}%</b>.`;
    } else if (belowAvg) {
      const diff = deal.historical_avg - effPrice;
      const pctDrop = Math.round((diff / deal.historical_avg) * 100);
      verdictStr = `📉 <b>PRICED BELOW HISTORICAL AVERAGE:</b> Trading <b>₹${formatNumber(diff)}</b> below its tracked average of ₹${formatNumber(deal.historical_avg)} (${pctDrop}% extra discount). Strong buying window.`;
    } else if (deal.coupon_discount) {
      verdictStr = `🎟️ <b>STACKABLE COUPON SAVINGS:</b> Includes a ₹${formatNumber(deal.coupon_discount)} on-page discount bringing effective price to ₹${formatNumber(effPrice)} (${deal.effective_discount_pct || deal.discount_pct}% off MRP ₹${formatNumber(deal.mrp)}).`;
    } else {
      verdictStr = `✅ <b>VERIFIED VALUE:</b> Priced at ₹${formatNumber(effPrice)} with ${deal.effective_discount_pct || deal.discount_pct}% discount from MRP (₹${formatNumber(deal.mrp)}). AI value score rated at ${deal.score || 70}/100.`;
    }

    el.modalVerdictText.innerHTML = verdictStr;
  }

  function closeModal() {
    if (el.chartModal) el.chartModal.classList.add('hidden');
    document.body.style.overflow = '';
    state.activeModalDeal = null;
  }

  // ── 12. VIRAL SHARE (Requirement 5: WhatsApp / Telegram / Clipboard) ───────
  function shareDeal(deal) {
    if (!deal) return;
    const effPrice = deal.effective_price || deal.list_price || 0;
    const discPct = deal.effective_discount_pct || deal.discount_pct || 0;
    const shareUrl = `https://bharatbazaro.com/?asin=${deal.asin}`;
    const shareText = `🔥 LOOT ALERT: ${deal.title} dropped to ₹${formatNumber(effPrice)} (${discPct}% OFF, ${deal.buy_confidence || 85}% Buy Confidence)! Verified on BharatBazaro 24/7 AI Radar:\n${shareUrl}`;

    if (navigator.share) {
      navigator.share({ title: deal.title, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('📋 Deal details copied! Opening WhatsApp...');
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      });
    }
  }

  // ── 13. WATCHLIST & PROMO COPY ─────────────────────────────────────────────
  function switchFilterTab(tabName) {
    state.filters.tab = tabName;
    if (el.filterTabs) {
      el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabName));
    }
    updateActiveMobileNav(tabName);
    updateTabCounts();
    renderDeals();
    updateWatchlistBanner();
  }

  function updateWatchlistBanner() {
    const banner = document.getElementById('watchlistBanner');
    if (!banner) return;
    if (state.filters.tab === 'watchlist') {
      banner.classList.remove('hidden');
      const countEl = document.getElementById('watchlistBannerCount');
      if (countEl) countEl.textContent = state.watchlist.size;
      const totalEl = document.getElementById('watchlistTotalCount');
      if (totalEl) totalEl.textContent = state.allDeals ? state.allDeals.length : 59;
    } else {
      banner.classList.add('hidden');
    }
  }

  function toggleWatchlist(asin) {
    if (state.watchlist.has(asin)) {
      state.watchlist.delete(asin);
      showToast('Removed deal from Watchlist');
    } else {
      state.watchlist.add(asin);
      showToast('❤️ Deal saved to Watchlist! <span class="toast-link" id="toast-view-watchlist" role="button" tabindex="0">View Watchlist →</span>', true);
    }
    localStorage.setItem('bb_watchlist', JSON.stringify([...state.watchlist]));
    updateTabCounts();
    renderDeals();
  }

  function copyPromoCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      showToast(`🎟️ Promo code "${code}" copied to clipboard!`);
    }).catch(() => {
      showToast(`Promo code: ${code}`);
    });
  }

  function scrollToDeals() {
    const target = el.dealsGrid || document.getElementById('dealsGrid');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── 14. EVENT LISTENERS ────────────────────────────────────────────────────
  function setupEventListeners() {
    // Theme toggle
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Alerts toggle
    if (el.alertsToggleBtn) {
      el.alertsToggleBtn.addEventListener('click', toggleAlerts);
    }

    // Navbar Watchlist Button
    const navWatchlistBtn = document.getElementById('navWatchlistBtn');
    if (navWatchlistBtn) {
      navWatchlistBtn.addEventListener('click', () => {
        if (state.filters.tab === 'watchlist') {
          switchFilterTab('all');
        } else {
          switchFilterTab('watchlist');
        }
        scrollToDeals();
      });
    }

    // Watchlist Banner Back and Clear buttons + Clickable Toast
    document.addEventListener('click', (e) => {
      if (e.target.closest('#watchlistBackBtn')) {
        switchFilterTab('all');
        scrollToDeals();
      } else if (e.target.closest('#watchlistClearBtn')) {
        if (confirm('Clear all deals from your saved Watchlist?')) {
          state.watchlist.clear();
          localStorage.setItem('bb_watchlist', JSON.stringify([]));
          updateTabCounts();
          renderDeals();
          showToast('🗑️ Watchlist cleared');
        }
      } else if (e.target.closest('#toast-view-watchlist, .toast-link')) {
        e.preventDefault();
        switchFilterTab('watchlist');
        scrollToDeals();
      }
    });

    // Card Discount Mode Selector (Amazon Pay 5% Off)
    if (el.btnPriceModeStd) {
      el.btnPriceModeStd.addEventListener('click', () => {
        state.cardDiscount = false;
        el.btnPriceModeStd.classList.add('active');
        if (el.btnPriceModeCard) el.btnPriceModeCard.classList.remove('active');
        renderDeals();
      });
    }
    if (el.btnPriceModeCard) {
      el.btnPriceModeCard.addEventListener('click', () => {
        state.cardDiscount = true;
        el.btnPriceModeCard.classList.add('active');
        if (el.btnPriceModeStd) el.btnPriceModeStd.classList.remove('active');
        renderDeals();
        showToast('💳 Amazon Pay 5% Cashback applied to all deal prices!');
      });
    }

    // Modal Timeframe Switcher
    document.querySelectorAll('.modal-timeframe-btns .timeframe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = parseInt(btn.getAttribute('data-range'), 10) || 90;
        if (state.activeModalDeal) {
          updateModalChart(state.activeModalDeal.asin, range);
        }
      });
    });

    // Inspector Timeframe Switcher
    document.querySelectorAll('.inspector-timeframes .timeframe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = parseInt(btn.getAttribute('data-range'), 10) || 90;
        const asin = el.inspectorAsin ? el.inspectorAsin.textContent.trim() : '';
        if (asin && asin !== 'B0XXXXXXXX') {
          updateInspectorChart(asin, range);
        }
      });
    });

    // Mobile Bottom Navigation (Requirement 6)
    if (el.mNavAll) {
      el.mNavAll.addEventListener('click', () => {
        updateActiveMobileNav('all');
        state.filters.tab = 'all';
        state.filters.priceBucket = 'all';
        state.filters.category = 'all';
        el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'all'));
        renderDeals();
        scrollToDeals();
      });
    }
    if (el.mNavLoot) {
      el.mNavLoot.addEventListener('click', () => {
        updateActiveMobileNav('loot');
        state.filters.tab = 'loot';
        el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'loot'));
        renderDeals();
        scrollToDeals();
      });
    }
    if (el.mNavCoupons) {
      el.mNavCoupons.addEventListener('click', () => {
        updateActiveMobileNav('coupons');
        state.filters.tab = 'coupons';
        el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'coupons'));
        renderDeals();
        scrollToDeals();
      });
    }
    if (el.mNavAsin) {
      el.mNavAsin.addEventListener('click', () => {
        if (el.searchInput) {
          el.searchInput.focus();
          el.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    function updateActiveMobileNav(tabName) {
      document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(b => {
        if (b.getAttribute('data-tab')) {
          b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
        }
      });
    }

    // Hero KPI Stat Cards & Live Radar Status Badge Click Handlers
    function handleViewAllDeals() {
      state.filters.tab = 'all';
      state.filters.priceBucket = 'all';
      state.filters.category = 'all';
      el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'all'));
      el.pricePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-price') === 'all'));
      el.catPills.forEach(c => c.classList.toggle('active', c.getAttribute('data-category') === 'all'));
      renderDeals();
      scrollToDeals();
    }

    if (el.statCardLiveDeals) {
      el.statCardLiveDeals.addEventListener('click', handleViewAllDeals);
      el.statCardLiveDeals.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleViewAllDeals(); });
    }
    if (el.radarStatusBadge) {
      el.radarStatusBadge.addEventListener('click', handleViewAllDeals);
      el.radarStatusBadge.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleViewAllDeals(); });
    }

    function handleViewLootDeals() {
      state.filters.tab = 'loot';
      el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'loot'));
      renderDeals();
      scrollToDeals();
    }
    if (el.statCardLoot) {
      el.statCardLoot.addEventListener('click', handleViewLootDeals);
      el.statCardLoot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleViewLootDeals(); });
    }

    function handleSortByDiscount() {
      state.filters.tab = 'all';
      state.filters.sort = 'discount';
      if (el.sortSelect) el.sortSelect.value = 'discount';
      el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'all'));
      renderDeals();
      scrollToDeals();
    }
    if (el.statCardMaxDiscount) {
      el.statCardMaxDiscount.addEventListener('click', handleSortByDiscount);
      el.statCardMaxDiscount.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleSortByDiscount(); });
    }

    function handleSortBySavings() {
      state.filters.tab = 'all';
      state.filters.sort = 'savings';
      if (el.sortSelect) el.sortSelect.value = 'savings';
      el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'all'));
      renderDeals();
      scrollToDeals();
    }
    if (el.statCardSavings) {
      el.statCardSavings.addEventListener('click', handleSortBySavings);
      el.statCardSavings.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleSortBySavings(); });
    }

    // Search input
    if (el.searchInput) {
      el.searchInput.addEventListener('input', e => handleSearchInput(e.target.value));
    }
    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        if (el.searchInput) el.searchInput.value = '';
        handleSearchInput('');
        if (el.searchInput) el.searchInput.focus();
      });
    }

    // Close Inspector
    if (el.closeInspectorBtn) {
      el.closeInspectorBtn.addEventListener('click', hideAsinInspector);
    }

    // Filter Tabs
    el.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.filters.tab = tab.getAttribute('data-tab');
        updateActiveMobileNav(state.filters.tab);
        renderDeals();
        scrollToDeals();
      });
    });

    // Price Store Pills
    el.pricePills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.pricePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filters.priceBucket = pill.getAttribute('data-price');
        renderDeals();
        scrollToDeals();
      });
    });

    // Category Pills
    el.catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filters.category = pill.getAttribute('data-category');
        renderDeals();
        scrollToDeals();
      });
    });

    // Hide Expired Checkbox
    if (el.hideExpiredCheck) {
      el.hideExpiredCheck.addEventListener('change', e => {
        state.filters.hideExpired = e.target.checked;
        renderDeals();
      });
    }

    // Sort Dropdown
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', e => {
        state.filters.sort = e.target.value;
        renderDeals();
      });
    }

    // Refresh Button
    if (el.refreshBtn) {
      el.refreshBtn.addEventListener('click', () => fetchData(false));
    }

    // Reset Filters Button
    if (el.resetFiltersBtn) {
      el.resetFiltersBtn.addEventListener('click', () => {
        state.filters.search = '';
        state.filters.tab = 'all';
        state.filters.priceBucket = 'all';
        state.filters.category = 'all';
        if (el.searchInput) el.searchInput.value = '';
        el.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'all'));
        el.pricePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-price') === 'all'));
        el.catPills.forEach(c => c.classList.toggle('active', c.getAttribute('data-category') === 'all'));
        updateActiveMobileNav('all');
        hideAsinInspector();
        renderDeals();
      });
    }

    // Modal Close
    if (el.closeModalBtn) el.closeModalBtn.addEventListener('click', closeModal);
    if (el.chartModal) {
      el.chartModal.addEventListener('click', e => {
        if (e.target === el.chartModal) closeModal();
      });
    }

    // Modal Share
    if (el.modalShareBtn) {
      el.modalShareBtn.addEventListener('click', () => shareDeal(state.activeModalDeal));
    }

    // Delegated clicks inside Deals Grid
    if (el.dealsGrid) {
      el.dealsGrid.addEventListener('click', e => {
        // Clickable coupon banner
        const couponPill = e.target.closest('.clickable-coupon-pill');
        if (couponPill) {
          e.preventDefault();
          const affUrl = couponPill.getAttribute('data-aff');
          const promo = couponPill.getAttribute('data-promo');
          if (promo) copyPromoCode(promo);
          showToast('☑️ Coupon instruction noted! Tick the checkbox on Amazon page — Opening deal...', 'success', 3500);
          if (affUrl) window.open(affUrl, '_blank', 'noopener');
          return;
        }

        // HotUKDeals Degree Meter
        const heatBtn = e.target.closest('.btn-hotness-degree');
        if (heatBtn) {
          e.preventDefault();
          const asin = heatBtn.getAttribute('data-asin');
          const base = parseInt(heatBtn.getAttribute('data-base') || '150', 10);
          if (!state.upvotedDeals.has(asin)) {
            state.upvotedDeals.add(asin);
            localStorage.setItem('bb_upvoted_deals', JSON.stringify([...state.upvotedDeals]));
            heatBtn.classList.add('voted');
            const countEl = heatBtn.querySelector('.degree-count');
            if (countEl) countEl.textContent = `${base + 1}°`;
            showToast('🔥 Voted Hot! Added +1° to deal heat score', 'success', 2500);
          } else {
            showToast('🔥 You already upvoted this hot deal!', 'info', 2000);
          }
          return;
        }

        // Watchlist heart
        const watchBtn = e.target.closest('.btn-watchlist');
        if (watchBtn) {
          e.preventDefault();
          const asin = watchBtn.getAttribute('data-asin');
          toggleWatchlist(asin);
          return;
        }

        // Promo code copy
        const promoBtn = e.target.closest('.btn-copy-promo');
        if (promoBtn) {
          e.preventDefault();
          const code = promoBtn.getAttribute('data-promo');
          copyPromoCode(code);
          return;
        }

        // Share button click
        const shareBtn = e.target.closest('.btn-card-share');
        if (shareBtn) {
          e.preventDefault();
          const asin = shareBtn.getAttribute('data-asin');
          const deal = state.allDeals.find(d => d.asin === asin);
          if (deal) shareDeal(deal);
          return;
        }

        // Open Modal
        const modalBtn = e.target.closest('.btn-open-modal');
        if (modalBtn) {
          e.preventDefault();
          const asin = modalBtn.getAttribute('data-asin');
          openDealModal(asin);
          return;
        }
      });
    }

    // View Mode Toggle
    if (el.btnViewGrid) el.btnViewGrid.addEventListener('click', () => setViewMode('grid'));
    if (el.btnViewCompact) el.btnViewCompact.addEventListener('click', () => setViewMode('compact'));

    // Keyword Alerts UI
    if (el.btnKeywordAlerts) {
      el.btnKeywordAlerts.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.keywordAlertsPopover) el.keywordAlertsPopover.classList.toggle('hidden');
      });
    }
    if (el.keywordAlertsClose) {
      el.keywordAlertsClose.addEventListener('click', () => {
        if (el.keywordAlertsPopover) el.keywordAlertsPopover.classList.add('hidden');
      });
    }
    if (el.keywordAlertAddBtn && el.keywordAlertInput) {
      el.keywordAlertAddBtn.addEventListener('click', () => addKeywordAlert(el.keywordAlertInput.value));
      el.keywordAlertInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addKeywordAlert(el.keywordAlertInput.value);
        }
      });
    }
    if (el.keywordTagsContainer) {
      el.keywordTagsContainer.addEventListener('click', e => {
        const remBtn = e.target.closest('.remove-tag');
        if (remBtn) {
          removeKeywordAlert(remBtn.getAttribute('data-kw'));
        }
      });
    }

    // Ticker Item Clicks
    if (el.tickerContent) {
      el.tickerContent.addEventListener('click', e => {
        const item = e.target.closest('.ticker-item');
        if (item) {
          const asin = item.getAttribute('data-asin');
          openDealModal(asin);
        }
      });
    }

    // Keyboard Shortcuts (/ or Ctrl+K to search, Esc to close modal)
    document.addEventListener('keydown', e => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== el.searchInput) {
        e.preventDefault();
        if (el.searchInput) {
          el.searchInput.focus();
          el.searchInput.select();
        }
      }
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  // ── 15. AUTO REFRESH COUNTDOWN ─────────────────────────────────────────────
  function startAutoRefreshTimer() {
    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(() => {
      state.countdownSeconds -= 1;
      if (el.syncTime) {
        el.syncTime.textContent = `Auto-refreshing in ${state.countdownSeconds}s`;
      }
      if (state.countdownSeconds <= 0) {
        state.countdownSeconds = state.refreshIntervalSeconds;
        fetchData(true);
      }
    }, 1000);
  }

  // ── 16. ROUTING & DEEP LINKING ─────────────────────────────────────────────
  const CATEGORY_SLUG_MAP = {
    'mobiles': 'Mobiles & Accessories',
    'mobile': 'Mobiles & Accessories',
    'electronics': 'Electronics & Audio',
    'laptops': 'Laptops & Computing',
    'audio': 'Audio & Headphones',
    'home': 'Home & Kitchen',
    'fashion': 'Fashion & Footwear',
    'grocery': 'Personal Care & Grocery',
  };

  function detectInitialRoute() {
    let cat = (typeof window !== 'undefined' && window.INITIAL_CATEGORY) || null;
    let filter = (typeof window !== 'undefined' && window.INITIAL_FILTER) || null;
    let maxPrice = (typeof window !== 'undefined' && window.INITIAL_MAX_PRICE) ? String(window.INITIAL_MAX_PRICE) : null;

    const path = (typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '').toLowerCase();
    if (!cat && !filter && !maxPrice) {
      if (path.includes('mobiles')) cat = 'mobiles';
      else if (path.includes('electronics')) cat = 'electronics';
      else if (path.includes('home')) cat = 'home';
      else if (path.includes('fashion')) cat = 'fashion';
      else if (path.includes('grocery')) cat = 'grocery';
      else if (path.includes('deals')) filter = 'loot';
      else if (path.includes('coupons')) filter = 'coupons';
      else if (path.includes('under-99')) maxPrice = '99';
      else if (path.includes('under-299')) maxPrice = '299';
      else if (path.includes('under-499')) maxPrice = '499';
      else if (path.includes('under-999')) maxPrice = '999';
    }

    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const qCat = params.get('category');
      if (qCat) cat = qCat;
      const qTab = params.get('tab') || params.get('filter');
      if (qTab) filter = qTab;
      const qPrice = params.get('price') || params.get('max_price');
      if (qPrice) maxPrice = qPrice;
      return { category: cat, filter: filter, maxPrice: maxPrice, asin: params.get('asin') };
    }

    return { category: cat, filter: filter, maxPrice: maxPrice, asin: null };
  }

  function handleUrlRouting() {
    const route = detectInitialRoute();

    if (route.category) {
      const mapped = CATEGORY_SLUG_MAP[route.category.toLowerCase()] || route.category;
      state.filters.category = mapped;
      if (el.catPills) {
        el.catPills.forEach(p => {
          const pCat = p.getAttribute('data-category');
          const isActive = pCat && (
            pCat.toLowerCase() === mapped.toLowerCase() ||
            pCat.toLowerCase() === route.category.toLowerCase()
          );
          p.classList.toggle('active', !!isActive);
        });
      }
    }

    if (route.filter) {
      state.filters.tab = route.filter;
      if (el.filterTabs) {
        el.filterTabs.forEach(t => {
          const tTab = t.getAttribute('data-tab');
          t.classList.toggle('active', tTab === route.filter);
        });
      }
      if (route.filter === 'loot' && el.mNavLoot && el.mNavAll) {
        el.mNavLoot.classList.add('active');
        el.mNavAll.classList.remove('active');
      } else if (route.filter === 'coupons' && el.mNavCoupons && el.mNavAll) {
        el.mNavCoupons.classList.add('active');
        el.mNavAll.classList.remove('active');
      }
    }

    if (route.maxPrice) {
      state.filters.priceBucket = String(route.maxPrice);
      if (el.pricePills) {
        el.pricePills.forEach(p => {
          const pPrice = p.getAttribute('data-price');
          p.classList.toggle('active', pPrice === String(route.maxPrice));
        });
      }
    }

    if (route.asin) {
      setTimeout(() => {
        openDealModal(route.asin.toUpperCase());
      }, 600);
    }
  }


  // ── 15. EXIT INTENT & SPOTLIGHT LOOT MODAL ────────────────────────────────
  const sessionStartTime = Date.now();

  function triggerExitModal() {
    if (sessionStorage.getItem('bb_exit_offer_shown')) return;
    if (sessionStorage.getItem('bb_clicked_deal')) return;
    if (Date.now() - sessionStartTime < 15000) return;
    if (!state.allDeals || !state.allDeals.length) return;

    const validDeals = state.allDeals.filter(d => {
      const t = d.title || '';
      return !t.startsWith('Amazon Deal (') && t.length >= 10;
    });

    const under999 = validDeals.filter(d => (d.effective_price || d.list_price || 999999) <= 999);
    const candidateList = under999.length ? under999 : (validDeals.length ? validDeals : state.allDeals);
    candidateList.sort((a, b) => {
      const aScore = (a.trending_score || a.score || 0) + (a.effective_discount_pct || 0);
      const bScore = (b.trending_score || b.score || 0) + (b.effective_discount_pct || 0);
      return bScore - aScore;
    });

    const topDeal = candidateList[0];
    if (!topDeal) return;

    const modal = document.getElementById('exitIntentModal');
    const container = document.getElementById('exitModalDealContent');
    if (!modal || !container) return;

    const p = topDeal.effective_price || topDeal.list_price || 0;
    const mrp = topDeal.mrp || topDeal.original_price;
    const disc = topDeal.effective_discount_pct || topDeal.discount_pct || 0;
    const tag = 'dammaiprasad-21';
    const affUrl = `https://www.amazon.in/dp/${topDeal.asin}?tag=${tag}&linkCode=ll1`;
    const svgPlaceholder = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2UyZThmMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYmcpIiByeD0iMTYiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjUwIiBmaWxsPSIjZmVmM2M3Ii8+PHRleHQgeD0iMTUwIiB5PSIxMzIiIGZvbnQtc2l6ZT0iNTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPvKaITwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjIwMCIgZm9udC1zaXplPSIxNSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzBmMTcyYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkFtYXpvbiBWZXJpZmllZCBEZWFsPC90ZXh0Pjx0ZXh0IHg9IjE1MCIgeT0iMjIyIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjNjQ3NDhiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+Q2xpY2sgdG8gZmluZCBvbiBBbWF6b24g4oaXPC90ZXh0Pjwvc3ZnPg==";

    container.innerHTML = `
      <div class="exit-deal-card">
        <div class="exit-deal-media">
          <img src="${escapeHtml(topDeal.image_url)}" alt="${escapeHtml(topDeal.title)}" class="exit-deal-img" loading="lazy" onload="if(this.naturalWidth<=1||this.naturalHeight<=1){this.src='${svgPlaceholder}';}" onerror="this.src='${svgPlaceholder}';">
        </div>
        <div class="exit-deal-info">
          <div class="exit-deal-brand">${escapeHtml(topDeal.brand || 'Amazon')}</div>
          <h4 class="exit-deal-title">${escapeHtml(topDeal.title)}</h4>
          <div class="exit-deal-prices">
            <span class="exit-deal-effective">₹${formatNumber(p)}</span>
            ${mrp && mrp > p ? `<span class="exit-deal-mrp">₹${formatNumber(mrp)}</span>` : ''}
            ${disc > 0 ? `<span class="exit-deal-disc">${disc}% OFF</span>` : ''}
          </div>
          ${topDeal.coupon_discount ? `<div class="exit-deal-coupon">🎟️ Includes ₹${formatNumber(topDeal.coupon_discount)} Amazon Checkbox Coupon</div>` : ''}
        </div>
      </div>
      <div class="exit-modal-ctas">
        <a href="${affUrl}" target="_blank" rel="noopener noreferrer" class="btn-exit-buy" id="exitModalBuyBtn">
          <span>🛒 Grab This Deal on Amazon @ ₹${formatNumber(p)} ↗</span>
        </a>
        <a href="https://t.me/Flash_Deals_Flipkart_Amazon" target="_blank" rel="noopener noreferrer" class="btn-exit-tg">
          <span>📲 Join Instant Telegram Loot Channel</span>
        </a>
      </div>
    `;

    modal.classList.remove('hidden');
    sessionStorage.setItem('bb_exit_offer_shown', '1');
  }

  function setupExitIntentListeners() {
    // Desktop mouseleave near top
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 25) {
        triggerExitModal();
      }
    });

    // Mobile / browsing timer (38 seconds)
    setTimeout(() => {
      triggerExitModal();
    }, 38000);

    // Modal controls and click tracker
    document.addEventListener('click', (e) => {
      if (e.target.closest('#exitModalCloseBtn')) {
        const modal = document.getElementById('exitIntentModal');
        if (modal) modal.classList.add('hidden');
      } else if (e.target.id === 'exitIntentModal') {
        e.target.classList.add('hidden');
      } else if (e.target.closest('.btn-buy-deal, .btn-chart-deal, .amazon-unlocker-btn, #exitModalBuyBtn')) {
        sessionStorage.setItem('bb_clicked_deal', '1');
      }
    });
  }

  // ── 17. UTILITIES ──────────────────────────────────────────────────────────
  function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN');
  }

  function formatCurrencyShort(num) {
    if (!num) return '₹0';
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    }
    if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)}k`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  }

  function formatReviewCount(num) {
    if (!num) return '';
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return String(num);
  }

  function getTimeAgo(epochSec) {
    const elapsed = Math.floor(Date.now() / 1000) - epochSec;
    if (elapsed < 60) return 'Just now';
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
    return `${Math.floor(elapsed / 86400)}d ago`;
  }

  function decodeHtmlEntities(str) {
    if (!str) return '';
    return String(str)
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  }

  function escapeHtml(str) {
    if (!str) return '';
    const decoded = decodeHtmlEntities(str);
    return decoded
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, isHtml = false) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isHtml) {
      toast.innerHTML = message;
    } else {
      toast.textContent = message;
    }
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 250ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* === TELEGRAM DEEP-LINK HANDLER === */
window.addEventListener("DOMContentLoaded", function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var dealAsin = params.get("deal");
    if (dealAsin) {
      setTimeout(function () {
        var cards = document.querySelectorAll(".deal-card, [data-asin], [data-id]");
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].innerHTML.indexOf(dealAsin) !== -1) {
            cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
            cards[i].style.outline = "3px solid #ff9900";
            cards[i].style.boxShadow = "0 0 25px rgba(255, 153, 0, 0.5)";
            break;
          }
        }
      }, 900);
    }
  } catch (e) {}
});


/* BB-LIGHT-CONTRAST-V2 */(function(){if(window.__bbV3)return;window.__bbV3=1;var st=document.createElement(`style`);st.textContent=`#bb-bar{display:flex;align-items:center;gap:10px;padding:10px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:9999}#bb-bar a{padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important}#bb-bar a.bb-p{background:#059669!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border-color:#059669!important}body:not(.dark):not(.dark-mode) :is(button,a,span)[class*=active]{background:#059669!important;border-color:#059669!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important}`;document.head.appendChild(st);function effBg(el){var r=250,g=248,b=245,ch=[];for(var x=el;x&&x!==document.documentElement;x=x.parentElement)ch.push(x);for(var i=ch.length-1;i>=0;i--){var cs=getComputedStyle(ch[i]);if(cs.webkitBackgroundClip===`text`||cs.backgroundClip===`text`)continue;var s=cs.backgroundColor;var m=s?s.match(/[0-9.]+/g):null;var a=m&&m.length>3?+m[3]:1;if((!m||a===0)&&cs.backgroundImage&&cs.backgroundImage.indexOf(`gradient`)!==-1){m=cs.backgroundImage.match(/[0-9.]+/g);if(m&&m.length>=4){m=[m[1],m[2],m[3],1];a=1;}}if(m&&m.length>=3&&a>0){r=+m[0]*a+r*(1-a);g=+m[1]*a+g*(1-a);b=+m[2]*a+b*(1-a);}}return (r*3+g*6+b)/10;}function fgI(el){var cs=getComputedStyle(el);var wf=cs.webkitTextFillColor;if(cs.webkitBackgroundClip===`text`||wf===`rgba(0, 0, 0, 0)`)return {lum:255,a:0};var s=wf||cs.color;var m=s?s.match(/[0-9.]+/g):null;if(!m||m.length<3)return {lum:0,a:1};var a=m.length>3?+m[3]:1;return {lum:(+m[0]*3+ +m[1]*6+ +m[2])/10,a:a};}function fix(){var p=location.pathname||``;if(p!==`/`&&!p.endsWith(`/index.html`)&&!document.getElementById(`bb-bar`)){var b=document.createElement(`div`);b.id=`bb-bar`;b.innerHTML=`<a href=javascript:history.back() class=bb-p>&#8592; Back</a><a href=/index.html>&#127968; Home</a><a href=/deals.html>&#9889; All Live Deals</a>`;document.body.prepend(b);}if(effBg(document.body)<150)return;document.querySelectorAll(`div,section,aside`).forEach(function(d){if(d.textContent&&d.textContent.indexOf(`Official Brand Loot Stores`)!==-1&&d.children.length<=6){d.style.setProperty(`background`,`#ffffff`,`important`);d.style.setProperty(`border`,`1px solid #e2e8f0`,`important`);}});document.querySelectorAll(`h1,h2,h3,h4,p,a,button,span,label,div`).forEach(function(e){if(e.id===`bb-bar`||(e.closest&&e.closest(`#bb-bar`)))return;if(e.tagName===`DIV`&&e.children.length>5)return;var bg=effBg(e),fg=fgI(e);if(bg<=145){e.style.setProperty(`color`,`#ffffff`,`important`);e.style.setProperty(`-webkit-text-fill-color`,`#ffffff`,`important`);e.style.setProperty(`opacity`,`1`,`important`);}else if(bg>155&&(fg.lum>135||fg.a<0.65)){e.style.setProperty(`color`,`#0f172a`,`important`);e.style.setProperty(`-webkit-text-fill-color`,`#0f172a`,`important`);e.style.setProperty(`opacity`,`1`,`important`);if(e.tagName===`BUTTON`||e.tagName===`A`){e.style.setProperty(`border-color`,`#cbd5e1`,`important`);}}});}if(document.readyState===`loading`)document.addEventListener(`DOMContentLoaded`,fix);else fix();window.addEventListener(`load`,fix);setInterval(fix,900);document.addEventListener(`click`,function(){setTimeout(fix,30);setTimeout(fix,180);});})();