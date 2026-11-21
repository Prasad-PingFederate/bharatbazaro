/**
 * BharatBazaro Conversion & Sales Engine (Client-Side)
 * 1. 1-Click Copy Coupon with Clipboard, Toast Notification & Instant Store Tab
 * 2. Urgency Flash Sale Countdown Timer (Ticking Per-Second)
 * 3. Live "People Viewing This Deal" Social Proof Badge
 */
(function () {
  'use strict';

  const BB_TAG = 'dammaiprasad-21';

  function toSafeAffiliateUrl(urlOrAsin, subtag = 'bb-coupon') {
    if (!urlOrAsin) return `https://www.amazon.in/?tag=${BB_TAG}&ascsubtag=${subtag}`;
    const raw = String(urlOrAsin).trim();
    const exactAsin = raw.match(/^[A-Z0-9]{10}$/i);
    const pathAsin = raw.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/)([A-Z0-9]{10})/i);
    const asin = exactAsin ? exactAsin[0].toUpperCase() : (pathAsin ? pathAsin[1].toUpperCase() : null);
    if (asin) {
      return `https://www.amazon.in/dp/${asin}?tag=${BB_TAG}&linkCode=ll1&ascsubtag=${encodeURIComponent(subtag)}`;
    }
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://www.amazon.in/${raw}`);
      ['tag', 'ascsubtag', 'linkCode', 'ref', 'ref_'].forEach(p => u.searchParams.delete(p));
      u.searchParams.set('tag', BB_TAG);
      u.searchParams.set('ascsubtag', subtag);
      return u.toString();
    } catch {
      return `https://www.amazon.in/?tag=${BB_TAG}&ascsubtag=${subtag}`;
    }
  }

  // 1. Toast Notification Manager
  function showToast(message, type = 'success') {
    let container = document.getElementById('bbToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bbToastContainer';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `bb-toast bb-toast-${type}`;
    toast.style.cssText = 'background:linear-gradient(135deg,#064e3b,#065f46);color:#f0fdf4;border:1px solid #10b981;border-radius:10px;padding:12px 18px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:flex;align-items:center;gap:8px;pointer-events:auto;animation:bbToastSlideIn 0.25s ease-out;';
    toast.innerHTML = `<span>✂️</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // 2. 1-Click Copy Coupon & Open Store
  window.copyCouponAndOpen = function (code, affUrl, asin) {
    const targetUrl = toSafeAffiliateUrl(affUrl || asin, 'bb-coupon');
    if (!code) {
      if (targetUrl) window.open(targetUrl, '_blank', 'noopener');
      return;
    }

    const cleanCode = String(code).trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanCode).then(() => {
        showToast(`Code <b>${cleanCode}</b> copied! Opening store...`);
      }).catch(() => {
        showToast(`Opening store with coupon...`);
      });
    } else {
      // Fallback execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = cleanCode;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast(`Code <b>${cleanCode}</b> copied! Opening store...`);
      } catch (e) {
        showToast(`Opening store...`);
      }
    }

    // Telemetry sendBeacon
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-click', JSON.stringify({
        asin: asin || '',
        action: 'copy_coupon',
        code: cleanCode,
        subtag: 'bb-coupon',
        channel: 'web',
        timestamp: new Date().toISOString()
      }));
    }
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'affiliate_click', {
          event_category: 'coupon_copy',
          asin: asin || '',
          coupon_code: cleanCode,
          subtag: 'bb-coupon'
        });
      } catch (_) {}
    }

    if (targetUrl) {
      setTimeout(() => {
        window.open(targetUrl, '_blank', 'noopener');
      }, 150);
    }
  };

  // 3. Real-Time Urgency Flash Sale Countdown Timer
  function initCountdownTimers() {
    function updateTimers() {
      const now = new Date();
      // IST Midnight target: today's 23:59:59 IST
      const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const nowIst = new Date(nowUtc + (3600000 * 5.5));
      const endIst = new Date(nowIst);
      endIst.setHours(23, 59, 59, 999);

      let diffMs = endIst.getTime() - nowIst.getTime();
      if (diffMs < 0) diffMs = 0;

      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);

      const strHrs = String(hrs).padStart(2, '0');
      const strMins = String(mins).padStart(2, '0');
      const strSecs = String(secs).padStart(2, '0');

      document.querySelectorAll('.bb-countdown-time').forEach(el => {
        el.textContent = `${strHrs}h : ${strMins}m : ${strSecs}s`;
      });
    }

    updateTimers();
    setInterval(updateTimers, 1000);
  }

  // 4. Live Social Proof "People Viewing This Deal"
  function initSocialProofViewers() {
    document.querySelectorAll('.bb-live-viewers').forEach(el => {
      const seedText = el.getAttribute('data-seed') || location.pathname || 'deal';
      let hash = 0;
      for (let i = 0; i < seedText.length; i++) {
        hash = (hash << 5) - hash + seedText.charCodeAt(i);
        hash |= 0;
      }
      const timeBlock = Math.floor(Date.now() / 900000); // 15-minute slot
      const count = Math.abs((hash + timeBlock) % 17) + 8; // 8 to 24 viewers

      const countSpan = el.querySelector('.bb-viewers-count');
      if (countSpan) {
        countSpan.textContent = count;
      }
    });
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCountdownTimers();
      initSocialProofViewers();
    });
  } else {
    initCountdownTimers();
    initSocialProofViewers();
  }
})();
