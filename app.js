/**
 * BharatBazaro.com — 24/7 AI Deal & Price Drop Radar
 * Interactive Frontend Engine
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
    watchlist: new Set(JSON.parse(localStorage.getItem('bb_watchlist') || '[]')),
    activeModalDeal: null,
    refreshIntervalSeconds: 60,
    countdownSeconds: 60,
    countdownTimer: null,
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
  };

  // ── 3. INITIALIZATION ──────────────────────────────────────────────────────
  function init() {
    initTheme();
    setupEventListeners();
    fetchData(true);
    startAutoRefreshTimer();
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

  // ── 5. DATA FETCHING ───────────────────────────────────────────────────────
  async function fetchData(isInitial = false) {
    if (el.refreshBtn) el.refreshBtn.classList.add('spinning');
    try {
      const cacheBust = `?_t=${Date.now()}`;
      const [dealsRes, statsRes] = await Promise.all([
        fetch(`data/live_deals.json${cacheBust}`).catch(() => null),
        fetch(`data/stats.json${cacheBust}`).catch(() => null),
      ]);

      if (dealsRes && dealsRes.ok) {
        state.allDeals = await dealsRes.json();
      }

      if (statsRes && statsRes.ok) {
        state.stats = await statsRes.json();
      }

      updateStatsUI();
      updateTabCounts();
      updateTicker();
      renderDeals();

      state.countdownSeconds = state.refreshIntervalSeconds;
      if (el.statusText) {
        el.statusText.textContent = `Live Radar: Active (${state.allDeals.length} deals)`;
      }

      if (!isInitial) {
        showToast(`Refreshed! ${state.allDeals.length} live verified deals loaded.`);
      }
    } catch (err) {
      console.warn('Error fetching live deals feed:', err);
    } finally {
      if (el.refreshBtn) el.refreshBtn.classList.remove('spinning');
    }
  }

  // ── 6. UI UPDATES (STATS, COUNTERS, TICKER) ────────────────────────────────
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

    // Dynamic binding of real Telegram URL to all Telegram buttons and footer links
    const tgUrl = state.stats.telegram_url || DEFAULT_TELEGRAM_URL;
    document.querySelectorAll('a.btn-telegram, a.footer-link[href*="t.me"]').forEach(link => {
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
      .filter(d => d.is_loot || d.score >= 85 || d.price_context === 'all_time_low')
      .slice(0, 7);

    if (!topPicks.length) return;

    const html = topPicks.map(d => `
      <span class="ticker-item" data-asin="${escapeHtml(d.asin)}">
        <span class="ticker-badge-loot">${d.is_loot ? '🚨 LOOT' : '📉 ALL-TIME LOW'}</span>
        <b>${escapeHtml(d.title.substring(0, 55))}...</b> — 
        <span style="color:#10b981;font-weight:700;">₹${formatNumber(d.effective_price)}</span>
        <span style="color:#94a3b8;">(${d.effective_discount_pct || d.discount_pct}% OFF)</span>
      </span>
    `).join(' ');

    el.tickerContent.innerHTML = html;
  }

  // ── 7. ASIN & AMAZON URL ANALYZER ──────────────────────────────────────────
  function detectAsinFromQuery(query) {
    if (!query) return null;
    const trimmed = query.trim();
    // 1. Direct ASIN (e.g. B0BS1QCFHX)
    if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    // 2. Full Amazon URL
    const match = trimmed.match(/(?:dp|gp\/product|exec\/obidos\/ASIN|aw\/d|product)\/([A-Z0-9]{10})/i);
    if (match) {
      return match[1].toUpperCase();
    }
    // 3. Fallback search query parameter
    const matchParam = trimmed.match(/[?&]asin=([A-Z0-9]{10})/i);
    if (matchParam) {
      return matchParam[1].toUpperCase();
    }
    return null;
  }

  function handleSearchInput(value) {
    state.filters.search = value.trim();
    if (el.clearSearchBtn) {
      el.clearSearchBtn.classList.toggle('visible', Boolean(state.filters.search));
    }

    const detectedAsin = detectAsinFromQuery(value);
    if (detectedAsin) {
      showAsinInspector(detectedAsin);
    } else {
      hideAsinInspector();
    }

    renderDeals();
  }

  function showAsinInspector(asin) {
    if (!el.asinInspectorCard) return;
    el.inspectorAsin.textContent = asin;

    // Check if we have this deal in our live feed
    const existing = state.allDeals.find(d => d.asin === asin);
    if (existing) {
      el.inspectorTitle.textContent = existing.title;
    } else {
      el.inspectorTitle.textContent = `Analyzing Amazon Product (ASIN: ${asin})`;
    }

    el.inspectorGraphImg.src = `https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=in&salesrank=1`;
    el.inspectorBuyBtn.href = `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}&linkCode=ll1`;
    el.inspectorKeepaBtn.href = `https://keepa.com/#!product/10-${asin}`;
    el.inspectorPhBtn.href = `https://pricehistoryapp.com/product/${asin}`;

    el.asinInspectorCard.classList.remove('hidden');
  }

  function hideAsinInspector() {
    if (el.asinInspectorCard) {
      el.asinInspectorCard.classList.add('hidden');
    }
  }

  // ── 8. FILTER & SORT PIPELINE ──────────────────────────────────────────────
  function getFilteredDeals() {
    let result = [...state.allDeals];

    // 0. Filter out any corrupt or zero-price deals
    result = result.filter(d => (d.effective_price || d.list_price || 0) > 0);

    // 1. Hide expired / price spiked
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
    if (state.filters.category !== 'all') {
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

    // 6. Sorting
    switch (state.filters.sort) {
      case 'score':
        result.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.buy_confidence || 0) - (a.buy_confidence || 0));
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

  // ── 9. DEAL CARD RENDERING ─────────────────────────────────────────────────
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
          <button class="btn-chart-deal btn-open-modal" data-asin="${escapeHtml(d.asin)}" title="View Price History & Keepa Chart">
            <span>📈 Chart</span>
          </button>
        </div>
      </article>
    `;
  }

  // ── 10. MODAL & CHART LOGIC ────────────────────────────────────────────────
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

    if (el.modalChartImg) {
      el.modalChartImg.src = `https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=in&salesrank=1`;
    }

    if (el.modalInsight) {
      const insightParts = [];
      if (deal.buy_confidence) {
        insightParts.push(`<b>Buy Confidence: ${deal.buy_confidence}%</b> (${deal.buy_confidence >= 90 ? 'Screaming Deal' : 'Solid Discount'}).`);
      }
      if (deal.historical_avg && deal.historical_avg > effPrice) {
        insightParts.push(`Currently <b>₹${formatNumber(deal.historical_avg - effPrice)}</b> cheaper than its tracked running average.`);
      }
      if (deal.coupon_discount) {
        insightParts.push(`Includes a stackable on-page coupon of <b>₹${formatNumber(deal.coupon_discount)}</b>.`);
      }
      el.modalInsight.innerHTML = insightParts.join(' ') || 'Price radar tracking actively.';
    }

    if (el.modalBuyBtn) el.modalBuyBtn.href = deal.affiliate_url;

    if (el.chartModal) el.chartModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (el.chartModal) el.chartModal.classList.add('hidden');
    document.body.style.overflow = '';
    state.activeModalDeal = null;
  }

  // ── 11. WATCHLIST & PROMO COPY ─────────────────────────────────────────────
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

  function shareDeal(deal) {
    if (!deal) return;
    const shareUrl = `https://bharatbazaro.com/?asin=${deal.asin}`;
    const shareText = `🔥 Check out this deal on BharatBazaro: ${deal.title} at ₹${formatNumber(deal.effective_price || deal.list_price)} (${deal.effective_discount_pct || deal.discount_pct}% OFF)!`;

    if (navigator.share) {
      navigator.share({ title: deal.title, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('🔗 Deal link copied to clipboard!');
      });
    }
  }

  function scrollToDeals() {
    const target = el.dealsGrid || document.getElementById('dealsGrid') || document.getElementById('deals-grid');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── 12. EVENT LISTENERS ────────────────────────────────────────────────────
  function setupEventListeners() {
    // Theme toggle
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // 1. Hero KPI Stat Cards & Live Radar Status Badge Click Handlers (Requirement 2)
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

  // ── 13. AUTO REFRESH COUNTDOWN ─────────────────────────────────────────────
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

  // ── 14. ROUTING & DEEP LINKING ─────────────────────────────────────────────
  function handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);

    // ?category=...
    const cat = params.get('category');
    if (cat) {
      state.filters.category = cat;
      el.catPills.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-category').toLowerCase() === cat.toLowerCase());
      });
    }

    // ?asin=...
    const asin = params.get('asin');
    if (asin) {
      // Delay slightly to ensure deals are loaded
      setTimeout(() => {
        openDealModal(asin.toUpperCase());
      }, 600);
    }
  }

  // ── 15. UTILITIES ──────────────────────────────────────────────────────────
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

