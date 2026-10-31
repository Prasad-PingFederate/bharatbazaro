(function(){
  var st = document.createElement('style');
  st.textContent =
    '#bb-bar{display:flex;align-items:center;gap:10px;padding:10px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:9999;box-shadow:0 1px 3px rgba(0,0,0,0.05)}' +
    '#bb-bar a{padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a!important;font-family:sans-serif}' +
    '#bb-bar a.bb-primary{background:#0f172a!important;color:#ffffff!important;border-color:#0f172a!important}' +
    'a[href*="amazon.in"],a[href*="amzn.to"]{background:#ff9900!important;color:#0f172a!important;font-weight:700!important;border-radius:8px!important;padding:9px 14px!important;text-decoration:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}';
  document.head.appendChild(st);

  function lum(s){
    var m = s ? s.match(/[\d.]+/g) : null;
    if (!m || (m.length > 3 && +m[3] < 0.15)) return -1;
    return (+m[0]*3 + +m[1]*6 + +m[2]) / 10;
  }

  function bgL(e){
    for (var x = e; x && x !== document.documentElement; x = x.parentElement) {
      var l = lum(getComputedStyle(x).backgroundColor);
      if (l >= 0) return l;
    }
    return 255;
  }

  function fix(){
    var p = location.pathname || '';
    if (p !== '/' && !p.endsWith('/index.html') && !document.getElementById('bb-bar')) {
      var b = document.createElement('div');
      b.id = 'bb-bar';
      b.innerHTML =
        '<a href="javascript:if(history.length>1){history.back()}else{location.href=\'/index.html\'}" class="bb-primary">&#8592; Back</a>' +
        '<a href="/index.html">&#127968; Home</a>' +
        '<a href="/deals.html">&#9889; All Live Deals</a>';
      document.body.prepend(b);
    }

    if (bgL(document.body) < 150) return;

    document.querySelectorAll('div,section,aside').forEach(function(d){
      if (d.textContent && d.textContent.indexOf('Official Brand Loot Stores') !== -1 && d.children.length <= 6) {
        d.style.setProperty('background', '#ffffff', 'important');
        d.style.setProperty('border', '1px solid #e2e8f0', 'important');
      }
    });

    document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,label,div').forEach(function(e){
      if (e.id === 'bb-bar' || (e.closest && e.closest('#bb-bar'))) return;
      if (e.tagName === 'DIV' && e.children.length > 4) return;
      var fg = lum(getComputedStyle(e).color);
      var bg = bgL(e);
      if (bg > 160 && fg > 145) {
        e.style.setProperty('color', '#0f172a', 'important');
        if (e.tagName === 'BUTTON' || e.tagName === 'A') {
          e.style.setProperty('border', '1px solid #cbd5e1', 'important');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fix);
  } else {
    fix();
  }
  window.addEventListener('load', fix);
  document.addEventListener('click', function(){ setTimeout(fix, 60); });
})();