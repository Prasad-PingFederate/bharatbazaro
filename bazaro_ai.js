/**
 * BazarAI — Interactive AI Deal, Discount & Shopping Assistant for BharatBazaro.com
 * Brand: ⚡ BazarAI • AI Discounts & Coupon Finder
 *
 * Implements 4 Core Conversational Intents:
 * 1. Product, Category, Brand & Budget Deal Search (with interactive mini deal cards)
 * 2. 20-Crore Amazon Catalog Custom Affiliate Filter Generator (4★+ & 25%+ off)
 * 3. Link/ASIN Analysis (Instant Keepa Price History Chart & Buy Verdict)
 * 4. Amazon India Sales Calendar, Bank Discount Stacking & Timing Advice
 */

(function () {
  'use strict';

  const AFFILIATE_TAG = 'dammaiprasad-21';

  // ── State ──────────────────────────────────────────────────────────────────
  let chatHistory = [];
  let liveDealsCache = [];
  let aiBriefingCache = null;
  let isExpanded = false;
  let isTyping = false;

  // ── DOM References ─────────────────────────────────────────────────────────
  let el = {};

  function initElements() {
    el = {
      widget: document.getElementById('bazaroAiWidget'),
      launcher: document.getElementById('bazaroAiLauncher'),
      tooltip: document.getElementById('bazaroAiTooltip'),
      tooltipClose: document.getElementById('bazaroAiTooltipClose'),
      unreadBadge: document.getElementById('bazaroAiUnreadBadge'),
      drawer: document.getElementById('bazaroAiDrawer'),
      closeBtn: document.getElementById('bazaroAiCloseBtn'),
      clearBtn: document.getElementById('bazaroAiClearBtn'),
      expandBtn: document.getElementById('bazaroAiExpandBtn'),
      chipsTray: document.getElementById('bazaroAiChips'),
      messagesContainer: document.getElementById('bazaroAiMessages'),
      typingIndicator: document.getElementById('bazaroAiTyping'),
      form: document.getElementById('bazaroAiForm'),
      input: document.getElementById('bazaroAiInput'),
    };
  }

  // ── 1. INITIALIZATION ──────────────────────────────────────────────────────
  async function init() {
    initElements();
    if (!el.widget) return;

    loadChatHistory();
    setupEventListeners();
    setupWelcomeTooltip();

    // Load live deals cache
    loadLiveDeals();
    loadAiBriefing();

    // Check context (e.g. product page or price store)
    checkPageContextGreeting();
  }

  function setupEventListeners() {
    if (el.launcher) {
      el.launcher.addEventListener('click', toggleDrawer);
    }
    if (el.closeBtn) {
      el.closeBtn.addEventListener('click', closeDrawer);
    }
    if (el.clearBtn) {
      el.clearBtn.addEventListener('click', clearChatHistory);
    }
    if (el.expandBtn) {
      el.expandBtn.addEventListener('click', toggleExpand);
    }
    if (el.form) {
      el.form.addEventListener('submit', handleFormSubmit);
    }
    if (el.chipsTray) {
      el.chipsTray.addEventListener('click', handleChipClick);
    }
    if (el.tooltipClose) {
      el.tooltipClose.addEventListener('click', dismissTooltip);
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.drawer && !el.drawer.classList.contains('hidden')) {
        closeDrawer();
      }
    });
  }

  // ── 2. TOOLTIP & DRAWER CONTROLS ───────────────────────────────────────────
  function setupWelcomeTooltip() {
    try {
      const seen = localStorage.getItem('bb_bazar_ai_tooltip_seen');
      if (!seen && el.tooltip) {
        setTimeout(() => {
          if (el.drawer && el.drawer.classList.contains('hidden')) {
            el.tooltip.classList.remove('hidden');
          }
        }, 4000);
      }
    } catch (_) {}
  }

  function dismissTooltip(e) {
    if (e) e.stopPropagation();
    if (el.tooltip) el.tooltip.classList.add('hidden');
    try {
      localStorage.setItem('bb_bazar_ai_tooltip_seen', '1');
    } catch (_) {}
  }

  function toggleDrawer() {
    if (!el.drawer) return;
    const isHidden = el.drawer.classList.contains('hidden');
    if (isHidden) {
      openDrawer();
    } else {
      closeDrawer();
    }
  }

  function openDrawer() {
    if (!el.drawer) return;
    dismissTooltip();
    el.drawer.classList.remove('hidden');
    if (el.unreadBadge) el.unreadBadge.classList.add('hidden');
    if (el.launcher) el.launcher.classList.add('active');
    scrollToBottom();
    setTimeout(() => {
      if (el.input) el.input.focus();
    }, 200);
  }

  function closeDrawer() {
    if (!el.drawer) return;
    el.drawer.classList.add('hidden');
    if (el.launcher) el.launcher.classList.remove('active');
  }

  function toggleExpand() {
    if (!el.drawer) return;
    isExpanded = !isExpanded;
    el.drawer.classList.toggle('expanded', isExpanded);
    if (el.expandBtn) {
      el.expandBtn.textContent = isExpanded ? '🗗' : '⛶';
      el.expandBtn.title = isExpanded ? 'Shrink Window' : 'Expand Window';
    }
  }

  // ── 3. DATA FETCHING ───────────────────────────────────────────────────────
  async function loadLiveDeals() {
    if (typeof window !== 'undefined' && Array.isArray(window.__LIVE_DEALS__) && window.__LIVE_DEALS__.length > 0) {
      liveDealsCache = window.__LIVE_DEALS__;
      return;
    }
    try {
      const res = await fetch('/data/live_deals.json');
      if (res.ok) {
        liveDealsCache = await res.json();
      }
    } catch (err) {
      console.warn('BazarAI: could not fetch live_deals.json', err);
    }
  }

  async function loadAiBriefing() {
    try {
      const res = await fetch('/data/ai_briefing.json');
      if (res.ok) {
        aiBriefingCache = await res.json();
      }
    } catch (_) {}
  }

  // ── 4. CHAT HISTORY & MESSAGING ────────────────────────────────────────────
  function loadChatHistory() {
    try {
      const saved = sessionStorage.getItem('bb_bazar_ai_chat');
      if (saved) {
        chatHistory = JSON.parse(saved);
        renderAllMessages();
        return;
      }
    } catch (_) {}

    // Initial default greeting if no history
    const welcomeText = "👋 Hi! I'm **BazarAI**, your 24/7 Discounts & Hidden Coupon Finder! Tell me any product or budget (e.g., *'earbuds under ₹999'*, *'today's top loot deals'*, or paste any Amazon link) and I'll find the lowest price for you!";
    addBotMessage(welcomeText, { isGreeting: true });
  }

  function saveChatHistory() {
    try {
      sessionStorage.setItem('bb_bazar_ai_chat', JSON.stringify(chatHistory.slice(-40)));
    } catch (_) {}
  }

  function clearChatHistory() {
    chatHistory = [];
    sessionStorage.removeItem('bb_bazar_ai_chat');
    if (el.messagesContainer) el.messagesContainer.innerHTML = '';
    const resetText = "👋 Conversation reset! What product, discount, or Amazon link can I analyze for you?";
    addBotMessage(resetText);
  }

  function renderAllMessages() {
    if (!el.messagesContainer) return;
    el.messagesContainer.innerHTML = '';
    chatHistory.forEach((msg) => {
      renderSingleMessageDom(msg);
    });
    scrollToBottom();
  }

  function formatTime(epoch) {
    const d = epoch ? new Date(epoch) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderSingleMessageDom(msg) {
    if (!el.messagesContainer) return;
    const isBot = msg.sender === 'bot';

    const row = document.createElement('div');
    row.className = `bazar-msg-row ${isBot ? 'bot-row' : 'user-row'}`;

    const bubble = document.createElement('div');
    bubble.className = `bazar-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}`;

    if (isBot) {
      const header = document.createElement('div');
      header.className = 'bazar-bubble-header';
      header.innerHTML = '<span class="bazar-avatar-mini">⚡</span> <span class="bazar-author">BazarAI</span>';
      bubble.appendChild(header);
    }

    const textContent = document.createElement('div');
    textContent.className = 'bazar-bubble-text';
    textContent.innerHTML = formatMarkdown(msg.text);
    bubble.appendChild(textContent);

    // Cards / Rich payload
    if (msg.cards && msg.cards.length > 0) {
      const cardsWrap = document.createElement('div');
      cardsWrap.className = 'bazar-cards-tray';
      msg.cards.forEach((card) => {
        cardsWrap.appendChild(renderMiniCard(card));
      });
      bubble.appendChild(cardsWrap);
    }

    // Amazon Custom Filter Card
    if (msg.customFilter) {
      bubble.appendChild(renderCustomFilterCard(msg.customFilter));
    }

    // Keepa Chart Card
    if (msg.keepaChart) {
      bubble.appendChild(renderKeepaChartCard(msg.keepaChart));
    }

    const time = document.createElement('div');
    time.className = 'bazar-msg-time';
    time.textContent = formatTime(msg.timestamp);
    bubble.appendChild(time);

    row.appendChild(bubble);
    el.messagesContainer.appendChild(row);
  }

  function addUserMessage(text) {
    const msg = {
      sender: 'user',
      text: text,
      timestamp: Date.now(),
    };
    chatHistory.push(msg);
    renderSingleMessageDom(msg);
    saveChatHistory();
    scrollToBottom();
  }

  function addBotMessage(text, options = {}) {
    const msg = {
      sender: 'bot',
      text: text,
      cards: options.cards || null,
      customFilter: options.customFilter || null,
      keepaChart: options.keepaChart || null,
      timestamp: Date.now(),
    };
    chatHistory.push(msg);
    renderSingleMessageDom(msg);
    saveChatHistory();
    scrollToBottom();
  }

  function showTyping() {
    isTyping = true;
    if (el.typingIndicator) {
      el.typingIndicator.classList.remove('hidden');
      scrollToBottom();
    }
  }

  function hideTyping() {
    isTyping = false;
    if (el.typingIndicator) {
      el.typingIndicator.classList.add('hidden');
    }
  }

  function scrollToBottom() {
    if (el.messagesContainer) {
      setTimeout(() => {
        el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
      }, 50);
    }
  }

  // ── 5. RICH HTML COMPONENTS INSIDE CHAT ────────────────────────────────────
  function formatMarkdown(text) {
    if (!text) return '';
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Code `text`
    out = out.replace(/`([^`]+)`/g, '<code class="bazar-code">$1</code>');
    // Markdown link [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="bazar-link">$1</a>');
    // Newline to <br>
    out = out.replace(/\n/g, '<br>');

    return out;
  }

  function renderMiniCard(deal) {
    const asin = deal.asin || '';
    const title = deal.title || 'Amazon Deal';
    const effPrice = deal.effective_price || deal.list_price || 0;
    const mrp = deal.mrp || 0;
    const discPct = deal.effective_discount_pct || deal.discount_pct || 0;
    const imgUrl = deal.image_url || `https://m.media-amazon.com/images/P/${asin}.jpg`;
    let affUrl = deal.affiliate_url || `https://www.amazon.in/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ll1`;
    if (affUrl.includes('ascsubtag=')) {
      affUrl = affUrl.replace(/ascsubtag=[^&]+/, 'ascsubtag=bb-bazarai');
    } else {
      affUrl += (affUrl.includes('?') ? '&' : '?') + 'ascsubtag=bb-bazarai';
    }
    const dealPageUrl = `/deal/${asin}.html`;
    const buyConf = deal.buy_confidence || 85;

    const card = document.createElement('div');
    card.className = 'bazar-mini-card';
    card.innerHTML = `
      <div class="mini-card-top">
        <a href="${affUrl}" target="_blank" rel="noopener noreferrer" class="mini-card-img-link" title="Open Deal on Amazon.in">
          <img src="${imgUrl}" alt="${escapeHtml(title)}" class="mini-card-img" loading="lazy" onload="if(this.naturalWidth<=1||this.naturalHeight<=1){this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 200 200\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23f1f5f9\\'/><text x=\\'50%\\' y=\\'45%\\' font-size=\\'48\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>⚡</text><text x=\\'50%\\' y=\\'72%\\' font-size=\\'13\\' font-weight=\\'bold\\' fill=\\'%2364748b\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\'>Amazon Verified Deal</text></svg>';}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 200 200\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23f1f5f9\\'/><text x=\\'50%\\' y=\\'45%\\' font-size=\\'48\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>⚡</text><text x=\\'50%\\' y=\\'72%\\' font-size=\\'13\\' font-weight=\\'bold\\' fill=\\'%2364748b\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\'>Amazon Verified Deal</text></svg>';">
        </a>
        <div class="mini-card-details">
          <a href="${affUrl}" target="_blank" rel="noopener noreferrer" class="mini-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</a>
          <div class="mini-card-price-row">
            <span class="mini-card-price">₹${effPrice.toLocaleString('en-IN')}</span>
            ${mrp > effPrice ? `<span class="mini-card-mrp">₹${mrp.toLocaleString('en-IN')}</span>` : ''}
            ${discPct > 0 ? `<span class="mini-card-disc">${discPct}% OFF</span>` : ''}
          </div>
          ${deal.coupon_text ? `<div class="mini-card-coupon">🎟️ ${escapeHtml(deal.coupon_text)}</div>` : ''}
          <div class="mini-card-conf">
            <span class="conf-dot">🟢</span>
            <span>${buyConf}% Buy Confidence</span>
          </div>
        </div>
      </div>
      <div class="mini-card-actions">
        <a href="${affUrl}" target="_blank" rel="noopener noreferrer" class="bazar-btn-buy">
          <span>🛒 Buy on Amazon ↗</span>
        </a>
        <a href="${dealPageUrl}" class="bazar-btn-chart" title="View Keepa Chart & 90-Day Price History">
          <span>📈 Price Graph</span>
        </a>
      </div>
    `;
    return card;
  }

  function renderCustomFilterCard(filterData) {
    const card = document.createElement('div');
    card.className = 'bazar-custom-filter-card';
    card.innerHTML = `
      <div class="filter-card-header">
        <span class="filter-badge">🎯 20-CRORE AMAZON CATALOG RADAR</span>
      </div>
      <div class="filter-card-body">
        <div class="filter-query">Search: <b>"${escapeHtml(filterData.query)}"</b></div>
        <div class="filter-specs">
          ${filterData.maxPrice ? `<span class="spec-pill">Budget: Under ₹${filterData.maxPrice.toLocaleString('en-IN')}</span>` : '<span class="spec-pill">Budget: All</span>'}
          <span class="spec-pill">⭐ 4★+ Rated Only</span>
          <span class="spec-pill">📉 25%+ Verified Discount</span>
        </div>
        <p class="filter-desc">We constructed an instant filtered Amazon discount portal with real-time stock & seller ratings:</p>
      </div>
      <div class="filter-card-actions">
        <a href="${filterData.amazonUrl}" target="_blank" rel="noopener noreferrer" class="bazar-filter-btn primary">
          <span>🛒 View "${escapeHtml(filterData.query)}" Deals on Amazon.in ↗</span>
        </a>
        <a href="${filterData.steepDiscountUrl}" target="_blank" rel="noopener noreferrer" class="bazar-filter-btn secondary">
          <span>🔥 View 50%+ Off Deals Only ↗</span>
        </a>
      </div>
    `;
    return card;
  }

  function renderKeepaChartCard(keepaData) {
    const card = document.createElement('div');
    card.className = 'bazar-keepa-card';
    const asin = keepaData.asin;
    const affUrl = `https://www.amazon.in/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ll1&ascsubtag=bb-bazarai`;
    const chartUrl = `https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=in&salesrank=1&range=90`;
    const dealPageUrl = `/deal/${asin}.html`;

    card.innerHTML = `
      <div class="keepa-card-header">
        <span class="keepa-badge">📈 LIVE KEEPA PRICE HISTORY (90 DAYS)</span>
        <span class="keepa-asin">ASIN: ${asin}</span>
      </div>
      <div class="keepa-img-wrap" onclick="window.open('${dealPageUrl}', '_blank')" title="Click to view full analysis">
        <img src="${chartUrl}" alt="Keepa Price History Chart for ${asin}" class="keepa-chart-img" loading="lazy">
      </div>
      <div class="keepa-verdict">
        <div class="verdict-title">${keepaData.verdictTitle || '🟢 Buy Verdict: Verified Deal'}</div>
        <div class="verdict-desc">${escapeHtml(keepaData.verdictText || 'Compare current price against the 90-day chart above before purchasing.')}</div>
      </div>
      <div class="keepa-actions">
        <a href="${affUrl}" target="_blank" rel="noopener noreferrer" class="bazar-btn-buy">
          <span>🛒 Check Live Price on Amazon.in ↗</span>
        </a>
        <a href="${dealPageUrl}" class="bazar-btn-chart">
          <span>📄 View Deal Page</span>
        </a>
      </div>
    `;
    return card;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── 6. CONTEXT-AWARE GREETING ─────────────────────────────────────────────
  function checkPageContextGreeting() {
    const pathname = (typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '').toLowerCase();

    // 1. If on an individual product page (/deal/{asin}.html)
    const matchAsin = pathname.match(/\/deal\/([A-Z0-9]{10})/i);
    if (matchAsin) {
      const asin = matchAsin[1].toUpperCase();
      setTimeout(() => {
        greetProductContext(asin);
      }, 500);
      return;
    }

    // 2. If on a Price Store page
    if (pathname.includes('under-99')) {
      updateGreetingForPriceStore(99);
    } else if (pathname.includes('under-299')) {
      updateGreetingForPriceStore(299);
    } else if (pathname.includes('under-499')) {
      updateGreetingForPriceStore(499);
    } else if (pathname.includes('under-999')) {
      updateGreetingForPriceStore(999);
    } else if (pathname.includes('coupons')) {
      updateGreetingForCoupons();
    }
  }

  function greetProductContext(asin) {
    // Look up deal in cache or DOM
    let deal = liveDealsCache.find((d) => d.asin === asin);
    if (!deal && document.title) {
      deal = {
        asin: asin,
        title: document.title.split('—')[0].trim(),
      };
    }
    if (!deal) return;

    const title = deal.title || `Product (${asin})`;
    const effPrice = deal.effective_price || deal.list_price || 0;
    const discPct = deal.effective_discount_pct || deal.discount_pct || 0;
    const buyConf = deal.buy_confidence || 85;

    const text = `👋 I see you're checking out **${title}**!\n\n` +
      `• **Current Price:** ₹${effPrice.toLocaleString('en-IN')}${discPct ? ` (${discPct}% OFF)` : ''}\n` +
      `• **Buy Confidence:** ${buyConf}% Rating\n` +
      (deal.coupon_text ? `• **Coupon Trick:** 🎟️ ${deal.coupon_text}\n` : '') +
      `\nAsk me if you want to check its **price history**, compare it with **alternatives**, or know when the next **Amazon sale** drops!`;

    // Only add if not already greeted for this asin
    if (!chatHistory.some((m) => m.text && m.text.includes(asin))) {
      addBotMessage(text, {
        keepaChart: {
          asin: asin,
          verdictTitle: `🟢 Verified Analysis for ${asin}`,
          verdictText: 'Real-time 90-day price trend tracking. Tap to inspect full history chart.',
        },
      });
    }
  }

  function updateGreetingForPriceStore(price) {
    if (chatHistory.length <= 1) {
      const storeText = `⚡ **Amazon Under ₹${price} Store Active!**\n\nI'm tracking live budget loot drops under ₹${price}. Ask me for specific items like *"cables under ${price}"*, *"earbuds"*, *"skincare"*, or *"kitchen loots"*!`;
      addBotMessage(storeText);
    }
  }

  function updateGreetingForCoupons() {
    if (chatHistory.length <= 1) {
      const couponText = `🎟️ **Amazon Hidden Coupons & Bank Offers Radar Active!**\n\nI scan and index stackable clip-on coupons, Subscribe & Save offers, and 10% instant bank discounts across Amazon India. Looking for coupons in a specific category? Ask me!`;
      addBotMessage(couponText);
    }
  }

  // ── 7. NATURAL LANGUAGE & INTENT ENGINE ────────────────────────────────────
  async function handleFormSubmit(e) {
    e.preventDefault();
    if (isTyping) return;
    const rawInput = el.input ? el.input.value.trim() : '';
    if (!rawInput) return;

    if (el.input) el.input.value = '';
    addUserMessage(rawInput);
    showTyping();

    // Process with intelligent intent engine
    setTimeout(async () => {
      try {
        await processUserIntent(rawInput);
      } catch (err) {
        console.error('BazarAI error:', err);
        addBotMessage("⚠️ I encountered a temporary hiccup analyzing deals. Here's a direct Amazon search link tagged for deals:\n\n[🛒 Browse Amazon 4★+ Deals](https://www.amazon.in/s?k=" + encodeURIComponent(rawInput) + `&tag=${AFFILIATE_TAG}&linkCode=ll2&ascsubtag=bb-bazarai)`);
      } finally {
        hideTyping();
      }
    }, 280);
  }

  function handleChipClick(e) {
    const chip = e.target.closest('.ai-chip');
    if (!chip) return;
    const prompt = chip.getAttribute('data-prompt');
    if (!prompt) return;

    if (el.input) el.input.value = prompt;
    handleFormSubmit(new Event('submit'));
  }

  async function processUserIntent(userInput) {
    const text = userInput.trim();
    const lower = text.toLowerCase();

    // ── Intent 3: Amazon Link / ASIN Extraction (Priority 1) ─────────────────
    const asinMatch = extractAsin(text);
    if (asinMatch) {
      handleAsinIntent(asinMatch, text);
      return;
    }

    // ── Intent 4: Amazon Sales Calendar, Discount Stacking & Timing ──────────
    if (
      lower.includes('sale') ||
      lower.includes('calendar') ||
      lower.includes('great indian') ||
      lower.includes('prime day') ||
      lower.includes('republic day') ||
      lower.includes('freedom') ||
      lower.includes('when to buy') ||
      lower.includes('wait for sale') ||
      lower.includes('card discount') ||
      lower.includes('stack') ||
      lower.includes('bank offer')
    ) {
      handleFaqAndCalendarIntent(lower);
      return;
    }

    // ── Intent 1 & 2: Deal Search & Custom Catalog Filter ────────────────────
    handleDealSearchIntent(text, lower);
  }

  // ── Intent 3 Helper: ASIN & Link Analysis ──────────────────────────────────
  function extractAsin(input) {
    // 1. Direct standard Amazon URLs: /dp/B0... /gp/product/B0...
    const urlMatch = input.match(/(?:dp|gp\/product|exec\/obidos\/ASIN|aw\/d)\/([A-Z0-9]{10})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    // 2. Standalone ASIN
    const standalone = input.match(/\b(B0[A-Z0-9]{8})\b/i);
    if (standalone) return standalone[1].toUpperCase();

    // 3. Any 10-char alphanumeric if amazon.in link
    if (input.includes('amazon.in') || input.includes('amzn.')) {
      const loose = input.match(/\/([A-Z0-9]{10})(?:[/?#]|$)/i);
      if (loose) return loose[1].toUpperCase();
    }

    return null;
  }

  function handleAsinIntent(asin, originalInput) {
    const matchingDeal = liveDealsCache.find((d) => d.asin === asin);

    if (matchingDeal) {
      const effPrice = matchingDeal.effective_price || matchingDeal.list_price || 0;
      const mrp = matchingDeal.mrp || 0;
      const disc = matchingDeal.effective_discount_pct || matchingDeal.discount_pct || 0;
      const buyConf = matchingDeal.buy_confidence || 85;

      const reply = `🔍 **Found in Live Radar!**\n\n` +
        `**${matchingDeal.title}**\n` +
        `• **Live Effective Price:** ₹${effPrice.toLocaleString('en-IN')}${mrp > effPrice ? ` (MRP: ₹${mrp.toLocaleString('en-IN')}, ${disc}% OFF)` : ''}\n` +
        `• **Buy Confidence:** ${buyConf}% Score\n` +
        (matchingDeal.coupon_text ? `• **Coupon Trick:** 🎟️ ${matchingDeal.coupon_text}\n` : '') +
        `\nHere is the live **90-Day Keepa Price History Chart** confirming whether this is an all-time low:`;

      addBotMessage(reply, {
        keepaChart: {
          asin: asin,
          verdictTitle: buyConf >= 85 ? '🟢 Strong Buy: Price is at or near All-Time Low' : '🟡 Fair Deal: Check Price Chart below',
          verdictText: `Verified live by BharatBazaro Deal Radar. Direct Amazon link tagged for partner savings.`,
        },
      });
    } else {
      const reply = `🔍 **Analyzed Amazon ASIN: ${asin}**\n\n` +
        `I generated the real-time **90-Day Keepa Price History Chart** below so you can inspect whether the current price is a true drop or an inflated MRP:`;

      addBotMessage(reply, {
        keepaChart: {
          asin: asin,
          verdictTitle: '📊 90-Day Price Trend & History Inspection',
          verdictText: 'Inspect the Keepa price chart below. Click the Amazon button to check live stock & on-page checkbox coupons.',
        },
      });
    }
  }

  // ── Intent 4 Helper: Sales Calendar & Buying Advice ────────────────────────
  function handleFaqAndCalendarIntent(lower) {
    if (lower.includes('calendar') || lower.includes('sale') || lower.includes('when')) {
      const calendarReply =
        `📅 **Amazon India Official Sale Calendar (2026):**\n\n` +
        `1. **Great Indian Festival** — *October/November (Diwali Season)*: Biggest discounts of the year (up to 80% off electronics & fashion).\n` +
        `2. **Prime Day India** — *July*: Exclusive lightning price errors & prime-only cashback.\n` +
        `3. **Great Republic Day Sale** — *January 15–20*: Massive smartphone & laptop deals.\n` +
        `4. **Great Summer Sale** — *May*: Air conditioners, refrigerators, and coolers.\n` +
        `5. **Great Freedom Festival** — *August 6–10*: Independence Day price drops.\n` +
        `6. **Mega Electronics & Salary Days** — *1st–7th of every month*: Extra bank card discounts.\n\n` +
        `💡 **Should you buy now or wait?**\n` +
        `If a product on BharatBazaro shows a **Buy Confidence score of 85%+** or an **All-Time Low** badge, buy immediately — the price is already matching or beating typical sale pricing!`;

      addBotMessage(calendarReply);
      return;
    }

    if (lower.includes('stack') || lower.includes('card') || lower.includes('coupon') || lower.includes('trick')) {
      const stackReply =
        `💡 **How to Stack Triple Discounts on Amazon India:**\n\n` +
        `1. **Step 1: On-Page Checkbox Coupon** — Tick the green/orange checkbox on the product page (e.g. *Apply ₹200 coupon*) before adding to cart.\n` +
        `2. **Step 2: Amazon Subscribe & Save** — For groceries, supplements, or household goods, select *Subscribe & Save* for an instant 5%–10% off (you can cancel anytime in 1 tap).\n` +
        `3. **Step 3: Instant Bank Discount** — At payment, select eligible cards (HDFC, SBI, ICICI, or Axis) for an instant 10% discount, or use **Amazon Pay ICICI Credit Card** for an unconditional 5% unlimited cashback!`;

      addBotMessage(stackReply);
      return;
    }
  }

  // ── Intent 1 & 2 Helper: Deal Search & Custom Catalog Filter ──────────────
  function handleDealSearchIntent(rawText, lower) {
    // 1. Parse budget constraints
    const budget = parseBudgetConstraints(lower);

    // 2. Extract product search keywords
    const keywords = extractSearchKeywords(lower);

    // 3. Search local liveDealsCache
    const matchedDeals = filterLocalDeals(keywords, budget);

    if (matchedDeals.length >= 2) {
      // Intent 1: We have 2+ exact matching deals!
      const count = matchedDeals.length;
      const budgetNote = budget.maxPrice ? ` under ₹${budget.maxPrice.toLocaleString('en-IN')}` : '';
      const reply = `🔥 Found **${count} verified deals** matching **"${keywords.query || rawText}"**${budgetNote} with active price drops and coupons:`;

      addBotMessage(reply, {
        cards: matchedDeals.slice(0, 4),
      });

      // Also append the 20-Crore catalog filter button if user wants to see the broader catalog
      const customFilter = buildCustomAmazonFilter(keywords.query || rawText, budget.maxPrice);
      addBotMessage(`💡 Want to explore more options across Amazon India? Here is a custom 4★+ deal filter:`, {
        customFilter: customFilter,
      });
      return;
    }

    if (matchedDeals.length === 1) {
      // 1 match + broad catalog filter
      const reply = `🎯 Found **1 top verified deal** in our radar, plus I built a custom **4★+ Amazon Deal Filter** for you:`;
      const customFilter = buildCustomAmazonFilter(keywords.query || rawText, budget.maxPrice);
      addBotMessage(reply, {
        cards: matchedDeals,
        customFilter: customFilter,
      });
      return;
    }

    // 0 exact matches -> Intent 2: Custom Affiliate Filter Generator
    const cleanQuery = keywords.query || rawText.replace(/(?:under|below|rs|deal|deals|loot)\s*\d*/gi, '').trim() || 'trending deals';
    const customFilter = buildCustomAmazonFilter(cleanQuery, budget.maxPrice);

    let reply = `🔍 Searching 20-crore Amazon India catalog for **"${cleanQuery}"**`;
    if (budget.maxPrice) {
      reply += ` under **₹${budget.maxPrice.toLocaleString('en-IN')}**`;
    }
    reply += `.\n\nI constructed a **Custom 4★+ & 25%+ Off Deal Link** tagged with our partner discount engine below:`;

    // Suggest 2 related live deals from overall loot if available
    const fallbackLoots = liveDealsCache.filter((d) => d.is_loot || (d.buy_confidence && d.buy_confidence >= 85)).slice(0, 2);

    addBotMessage(reply, {
      customFilter: customFilter,
      cards: fallbackLoots.length > 0 ? fallbackLoots : null,
    });
  }

  function parseBudgetConstraints(lower) {
    let maxPrice = null;
    let minPrice = null;

    // "under 999", "below 500", "less than 1500", "within 2000", "< 1000"
    const underMatch = lower.match(/(?:under|below|less\s+than|within|<=?)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    if (underMatch) {
      maxPrice = parseInt(underMatch[1], 10);
    }

    // "above 1000", "over 2000", "> 1500"
    const aboveMatch = lower.match(/(?:above|over|more\s+than|>=?)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    if (aboveMatch) {
      minPrice = parseInt(aboveMatch[1], 10);
    }

    // "between 500 and 1500"
    const betweenMatch = lower.match(/(?:between)\s*(?:rs\.?|inr|₹)?\s*(\d+)\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    if (betweenMatch) {
      minPrice = parseInt(betweenMatch[1], 10);
      maxPrice = parseInt(betweenMatch[2], 10);
    }

    // "999 rs", "500 rupees"
    if (!maxPrice && !minPrice) {
      const rsMatch = lower.match(/(\d{2,6})\s*(?:rs|rupees|inr|bucks)/i);
      if (rsMatch) {
        maxPrice = parseInt(rsMatch[1], 10);
      }
    }

    return { minPrice, maxPrice };
  }

  function extractSearchKeywords(lower) {
    // Remove budget phrases and noise words
    let cleaned = lower
      .replace(/(?:under|below|less\s+than|within|above|over|between)\s*(?:rs\.?|inr|₹)?\s*\d+/gi, '')
      .replace(/\d+\s*(?:rs|rupees|inr|bucks)/gi, '')
      .replace(/\b(?:deals?|loots?|offers?|price|drops?|discount|coupons?|show|me|best|top|find|give|get|buy)\b/gi, '')
      .trim();

    return {
      query: cleaned,
      raw: lower,
    };
  }

  function filterLocalDeals(keywords, budget) {
    if (!liveDealsCache || liveDealsCache.length === 0) return [];
    const q = keywords.query.toLowerCase();

    return liveDealsCache.filter((d) => {
      const price = d.effective_price || d.list_price || 0;
      if (budget.maxPrice && price > budget.maxPrice) return false;
      if (budget.minPrice && price < budget.minPrice) return false;

      if (!q) return true; // Budget only

      const title = (d.title || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      const cat = (d.category || '').toLowerCase();
      const asin = (d.asin || '').toLowerCase();

      // Check query words
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      if (words.length === 0) return true;

      return words.some(
        (w) =>
          title.includes(w) ||
          brand.includes(w) ||
          cat.includes(w) ||
          asin.includes(w)
      );
    });
  }

  function buildCustomAmazonFilter(query, maxPrice) {
    const cleanQuery = query.replace(/[^\w\s-]/g, ' ').trim() || 'deals';
    const baseUrl = 'https://www.amazon.in/s';

    // Amazon search params:
    // p_72:1318476031 = 4★ & Above
    // p_n_pct-off-with-tax:2665399031 = 25% Off or more
    // p_36:-{maxPrice * 100} = Up to maxPrice in paise
    let rhParts = ['p_72:1318476031', 'p_n_pct-off-with-tax:2665399031'];
    if (maxPrice && maxPrice > 0) {
      rhParts.push(`p_36:-${maxPrice * 100}`);
    }
    const rh = rhParts.join(',');

    const amazonUrl = `${baseUrl}?k=${encodeURIComponent(cleanQuery)}&rh=${encodeURIComponent(rh)}&s=review-rank&tag=${AFFILIATE_TAG}&linkCode=ll2&ascsubtag=bb-bazarai`;

    // 50%+ off URL
    const steepRhParts = ['p_72:1318476031', 'p_n_pct-off-with-tax:2665401031'];
    if (maxPrice && maxPrice > 0) {
      steepRhParts.push(`p_36:-${maxPrice * 100}`);
    }
    const steepDiscountUrl = `${baseUrl}?k=${encodeURIComponent(cleanQuery)}&rh=${encodeURIComponent(steepRhParts.join(','))}&s=review-rank&tag=${AFFILIATE_TAG}&linkCode=ll2&ascsubtag=bb-bazarai`;

    return {
      query: cleanQuery,
      maxPrice: maxPrice,
      amazonUrl: amazonUrl,
      steepDiscountUrl: steepDiscountUrl,
    };
  }

  // ── Auto-initialize on DOM ready ───────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();



/* BB-LIGHT-CONTRAST-V2 */(function(){if(window.__bbV3)return;window.__bbV3=1;var st=document.createElement(`style`);st.textContent=`#bb-bar{display:flex;align-items:center;gap:10px;padding:10px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:9999}#bb-bar a{padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important}#bb-bar a.bb-p{background:#059669!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border-color:#059669!important}body:not(.dark):not(.dark-mode) :is(button,a,span)[class*=active]{background:#059669!important;border-color:#059669!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important}`;document.head.appendChild(st);function effBg(el){var r=250,g=248,b=245,ch=[];for(var x=el;x&&x!==document.documentElement;x=x.parentElement)ch.push(x);for(var i=ch.length-1;i>=0;i--){var cs=getComputedStyle(ch[i]);if(cs.webkitBackgroundClip===`text`||cs.backgroundClip===`text`)continue;var s=cs.backgroundColor;var m=s?s.match(/[0-9.]+/g):null;var a=m&&m.length>3?+m[3]:1;if((!m||a===0)&&cs.backgroundImage&&cs.backgroundImage.indexOf(`gradient`)!==-1){m=cs.backgroundImage.match(/[0-9.]+/g);if(m&&m.length>=4){m=[m[1],m[2],m[3],1];a=1;}}if(m&&m.length>=3&&a>0){r=+m[0]*a+r*(1-a);g=+m[1]*a+g*(1-a);b=+m[2]*a+b*(1-a);}}return (r*3+g*6+b)/10;}function fgI(el){var cs=getComputedStyle(el);var wf=cs.webkitTextFillColor;if(cs.webkitBackgroundClip===`text`||wf===`rgba(0, 0, 0, 0)`)return {lum:255,a:0};var s=wf||cs.color;var m=s?s.match(/[0-9.]+/g):null;if(!m||m.length<3)return {lum:0,a:1};var a=m.length>3?+m[3]:1;return {lum:(+m[0]*3+ +m[1]*6+ +m[2])/10,a:a};}function fix(){var p=location.pathname||``;if(p!==`/`&&!p.endsWith(`/index.html`)&&!document.getElementById(`bb-bar`)){var b=document.createElement(`div`);b.id=`bb-bar`;b.innerHTML=`<a href=javascript:history.back() class=bb-p>&#8592; Back</a><a href=/index.html>&#127968; Home</a><a href=/deals.html>&#9889; All Live Deals</a>`;document.body.prepend(b);}if(effBg(document.body)<150)return;document.querySelectorAll(`div,section,aside`).forEach(function(d){if(d.textContent&&d.textContent.indexOf(`Official Brand Loot Stores`)!==-1&&d.children.length<=6){d.style.setProperty(`background`,`#ffffff`,`important`);d.style.setProperty(`border`,`1px solid #e2e8f0`,`important`);}});document.querySelectorAll(`h1,h2,h3,h4,p,a,button,span,label,div`).forEach(function(e){if(e.id===`bb-bar`||(e.closest&&e.closest(`#bb-bar`)))return;if(e.tagName===`DIV`&&e.children.length>5)return;var bg=effBg(e),fg=fgI(e);if(bg<=145){e.style.setProperty(`color`,`#ffffff`,`important`);e.style.setProperty(`-webkit-text-fill-color`,`#ffffff`,`important`);e.style.setProperty(`opacity`,`1`,`important`);}else if(bg>155&&(fg.lum>135||fg.a<0.65)){e.style.setProperty(`color`,`#0f172a`,`important`);e.style.setProperty(`-webkit-text-fill-color`,`#0f172a`,`important`);e.style.setProperty(`opacity`,`1`,`important`);if(e.tagName===`BUTTON`||e.tagName===`A`){e.style.setProperty(`border-color`,`#cbd5e1`,`important`);}}});}if(document.readyState===`loading`)document.addEventListener(`DOMContentLoaded`,fix);else fix();window.addEventListener(`load`,fix);setInterval(fix,900);document.addEventListener(`click`,function(){setTimeout(fix,30);setTimeout(fix,180);});})();