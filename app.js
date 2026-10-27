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
    activeModalDeal: null,
    refreshIntervalSeconds: 60,
    countdownSeconds: 60,
    countdownTimer: null,
    syncTimerInterval: null,
  };

  const AMAZON_TAG = 'dammaiprasad-21';
  const DEFAULT_TELEGRAM_URL = 'https://t.me/Flash_Deals_Flipkart_Amazon';

  // ── 2. DOM ELEMENT REFERENCES ──────────────────────────────────────────────
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    statusText: document.getElementById('statusText'),
    radarStatusBadge: document.getElementById('radarStatusBadge'),
    tickerContent: document.getElementById('tickerContent'),
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
    setupEventListeners();
    fetchData(true);
    startAutoRefreshTimer();
    startLiveSyncTimer();
    handleUrlRouting();
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
  function updateStatsUI() {
    const totalDeals = state.allDeals.length;
    const lootCount = state.allDeals.filter(d => d.is_loot).length;
    const maxDiscount = state.allDeals.reduce((max, d) => Math.max(max, d.effective_discount_pct || d.discount_pct || 0), 0);
    const totalSavings = state.allDeals.reduce((sum, d) => sum + (d.savings_inr || 0), 0);

    if (el.statLiveDeals) el.statLiveDeals.textContent = state.stats.total_live_deals || totalDeals;
    if (el.statLootCount) el.statLootCount.textContent = state.stats.loot_count || lootCount;
    if (el.statMaxDiscount) el.statMaxDiscount.textContent = `${state.stats.max_discount_pct || maxDiscount}%`;
    if (el.statTotalSavings) {
      const savings = state.stats.total_savings_available || totalSavings;
      el.statTotalSavings.textContent = formatCurrencyShort(savings);
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
    const all = state.allDeals.length;
    const loot = state.allDeals.filter(d => d.is_loot).length;
    const drops = state.allDeals.filter(d => d.price_context === 'all_time_low' || d.price_context === 'real_drop' || d.is_further_drop).length;
    const coupons = state.allDeals.filter(d => (d.coupon_discount && d.coupon_discount > 0) || d.coupon_text || d.promo_code || d.bank_offer).length;
    const tier1 = state.allDeals.filter(d => d.brand_tier === 'tier1').length;
    const watchlist = state.watchlist.size;

    if (el.countAll) el.countAll.textContent = all;
    if (el.countLoot) el.countLoot.textContent = loot;
    if (el.countDrops) el.countDrops.textContent = drops;
    if (el.countCoupons) el.countCoupons.textContent = coupons;
    if (el.countTier1) el.countTier1.textContent = tier1;
    if (el.countWatchlist) el.countWatchlist.textContent = watchlist;
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

    const partnerUrl = `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}&linkCode=ll1`;
    if (el.inspectorBuyBtn) el.inspectorBuyBtn.href = deal ? deal.affiliate_url : partnerUrl;
    if (el.inspectorKeepaBtn) el.inspectorKeepaBtn.href = `https://keepa.com/#!product/10-${asin}`;
    if (el.inspectorPhBtn) el.inspectorPhBtn.href = `https://pricehistoryapp.com/product/${asin}`;

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

    // 2. Tab Filter
    switch (state.filters.tab) {
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
    } else if (pb === '499') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 499);
    } else if (pb === '999') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 999);
    } else if (pb === '2499') {
      result = result.filter(d => (d.effective_price || d.list_price) <= 2499);
    } else if (pb === 'premium') {
      result = result.filter(d => (d.effective_price || d.list_price) > 2500);
    }

    // 4. Category Filter
    if (state.filters.category && state.filters.category !== 'all') {
      result = result.filter(d => d.category === state.filters.category);
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

    // 6. Sorting (Default: Freshness Time-Decay Trending Score)
    switch (state.filters.sort) {
      case 'score':
        result.sort((a, b) => (b.trending_score || b.score || 0) - (a.trending_score || a.score || 0) || (b.buy_confidence || 0) - (a.buy_confidence || 0));
        break;
      case 'newest':
        result.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
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

    return result;
  }

  // ── 10. DEAL CARD RENDERING ────────────────────────────────────────────────
  function renderDeals() {
    if (!el.dealsGrid) return;
    const deals = getFilteredDeals();

    if (el.visibleCount) el.visibleCount.textContent = deals.length;

    if (!deals.length) {
      el.dealsGrid.innerHTML = '';
      if (el.emptyState) el.emptyState.classList.remove('hidden');
      return;
    }

    if (el.emptyState) el.emptyState.classList.add('hidden');

    const html = deals.map(deal => createDealCardHtml(deal)).join('');
    el.dealsGrid.innerHTML = html;
  }

  function createDealCardHtml(d) {
    const isSaved = state.watchlist.has(d.asin);
    const effPrice = d.effective_price || d.list_price || 0;
    if (effPrice <= 0) return '';
    const discPct = d.effective_discount_pct || d.discount_pct || 0;
    const buyConf = d.buy_confidence || 75;

    // Badges
    const badgesHtml = [];
    if (d.is_new || (d.age_hours !== undefined && d.age_hours <= 2.0)) {
      badgesHtml.push('<span class="badge-tag badge-new">⚡ NEW</span>');
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

    // Card Cashback Mode (Requirement 3: Amazon Pay ICICI 5% Off)
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

    const timeAgoStr = d.updated_at ? getTimeAgo(d.updated_at) : 'Just now';

    return `
      <article class="deal-card ${d.is_loot ? 'is-loot' : ''}" data-asin="${escapeHtml(d.asin)}">
        <div class="card-top">
          <div class="card-badges">
            ${badgesHtml.join('')}
          </div>
          <div class="card-top-actions">
            <span class="time-ago">${timeAgoStr}</span>
            <button class="btn-watchlist ${isSaved ? 'saved' : ''}" data-asin="${escapeHtml(d.asin)}" title="${isSaved ? 'Remove from Watchlist' : 'Save to Watchlist'}">
              ${isSaved ? '❤️' : '🤍'}
            </button>
          </div>
        </div>

        <div class="card-media">
          <div class="card-image-wrap">
            <img src="${escapeHtml(d.image_url)}" alt="${escapeHtml(d.title)}" class="card-img" loading="lazy" onerror="this.src='https://m.media-amazon.com/images/P/${escapeHtml(d.asin)}.jpg'">
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
          <a href="${escapeHtml(d.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="card-title" title="${escapeHtml(d.title)}">
            ${escapeHtml(d.title)}
          </a>

          <!-- Price Waterfall -->
          <div class="price-waterfall-box">
            <div class="price-main-row">
              <span class="effective-price">₹${formatNumber(effPrice)}</span>
              ${d.mrp && d.mrp > effPrice ? `<span class="original-mrp">₹${formatNumber(d.mrp)}</span>` : ''}
              ${discPct ? `<span class="discount-badge">${discPct}% OFF</span>` : ''}
            </div>
            ${d.savings_inr > 0 ? `<div class="savings-line">You save ₹${formatNumber(d.savings_inr)}</div>` : ''}
            ${cardPriceHtml}
          </div>

          <!-- Callouts -->
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
        </div>

        <div class="card-footer">
          <a href="${escapeHtml(d.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="btn-buy-deal">
            <span>🛒 Grab Deal on Amazon ↗</span>
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
    const deal = state.allDeals.find(d => d.asin === asin);
    if (!deal) return;

    state.activeModalDeal = deal;
    const effPrice = deal.effective_price || deal.list_price || 0;

    if (el.modalTitle) el.modalTitle.textContent = deal.title;
    if (el.modalCurrentPrice) el.modalCurrentPrice.textContent = `₹${formatNumber(effPrice)}`;
    if (el.modalMinPrice) el.modalMinPrice.textContent = deal.historical_min ? `₹${formatNumber(deal.historical_min)}` : 'Tracking';
    if (el.modalAvgPrice) el.modalAvgPrice.textContent = deal.historical_avg ? `₹${formatNumber(deal.historical_avg)}` : 'Tracking';
    if (el.modalMrpPrice) el.modalMrpPrice.textContent = deal.mrp ? `₹${formatNumber(deal.mrp)}` : 'N/A';

    updateModalChart(asin, state.activeModalRange);
    renderModalAiVerdict(deal, effPrice);

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
  function toggleWatchlist(asin) {
    if (state.watchlist.has(asin)) {
      state.watchlist.delete(asin);
      showToast('Removed deal from Watchlist');
    } else {
      state.watchlist.add(asin);
      showToast('❤️ Deal saved to Watchlist!');
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
  function handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);

    const cat = params.get('category');
    if (cat) {
      state.filters.category = cat;
      el.catPills.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-category').toLowerCase() === cat.toLowerCase());
      });
    }

    const asin = params.get('asin');
    if (asin) {
      setTimeout(() => {
        openDealModal(asin.toUpperCase());
      }, 600);
    }
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 250ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
