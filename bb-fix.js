/* BB-LIGHT-CONTRAST-V2 */
(function(){
  if (window.__bbContrastV2) return;
  window.__bbContrastV2 = true;

  var st = document.createElement('style');
  st.textContent =
    '#bb-bar{display:flex;align-items:center;gap:10px;padding:10px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:9999;box-shadow:0 1px 3px rgba(0,0,0,0.05)}' +
    '#bb-bar a{padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-family:sans-serif}' +
    '#bb-bar a.bb-primary{background:#0f172a!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border-color:#0f172a!important}';
  document.head.appendChild(st);

  function effBgLum(el){
    var r = 250, g = 248, b = 245;
    var chain = [];
    for (var x = el; x && x !== document.documentElement; x = x.parentElement) {
      chain.push(x);
    }
    for (var i = chain.length - 1; i >= 0; i--) {
      var s = getComputedStyle(chain[i]).backgroundColor;
      var m = s ? s.match(/[\d.]+/g) : null;
      if (m && m.length >= 3) {
        var a = m.length > 3 ? +m[3] : 1;
        if (a > 0) {
          r = +m[0] * a + r * (1 - a);
          g = +m[1] * a + g * (1 - a);
          b = +m[2] * a + b * (1 - a);
        }
      }
    }
    return (r * 3 + g * 6 + b) / 10;
  }

  function fgInfo(el){
    var cs = getComputedStyle(el);
    var s = cs.webkitTextFillColor && cs.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' ? cs.webkitTextFillColor : cs.color;
    var m = s ? s.match(/[\d.]+/g) : null;
    if (!m || m.length < 3) return { lum: 0, a: 1 };
    var a = m.length > 3 ? +m[3] : 1;
    var lum = (+m[0] * 3 + +m[1] * 6 + +m[2]) / 10;
    return { lum: lum, a: a };
  }

  function fixAll(){
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

    if (effBgLum(document.body) < 150) return;

    document.querySelectorAll('div,section,aside').forEach(function(d){
      if (d.textContent && d.textContent.indexOf('Official Brand Loot Stores') !== -1 && d.children.length <= 6) {
        d.style.setProperty('background', '#ffffff', 'important');
        d.style.setProperty('border', '1px solid #e2e8f0', 'important');
      }
    });

    document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,label,div').forEach(function(e){
      if (e.id === 'bb-bar' || (e.closest && e.closest('#bb-bar'))) return;
      if (e.tagName === 'DIV' && e.children.length > 5) return;

      var bg = effBgLum(e);
      var fg = fgInfo(e);

      if (bg > 155 && (fg.lum > 135 || fg.a < 0.65)) {
        e.style.setProperty('color', '#0f172a', 'important');
        e.style.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        e.style.setProperty('opacity', '1', 'important');
        if (e.tagName === 'BUTTON' || e.tagName === 'A') {
          e.style.setProperty('border-color', '#cbd5e1', 'important');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAll);
  } else {
    fixAll();
  }
  window.addEventListener('load', fixAll);
  setInterval(fixAll, 1200);
  document.addEventListener('click', function(){ setTimeout(fixAll, 50); });
})();