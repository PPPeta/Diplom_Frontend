/* Каркас интерфейса (тема: бюро ритуальных услуг) + авторский FX-слой (GSAP/ScrollTrigger, canvas-искры, tilt, magnetic, counters). */
(function () {
  var body = document.body;
  var zone = body.dataset.zone || 'public';
  var page = body.dataset.page || '';
  var root = body.dataset.root || '';

  /* ---------- Modern UI stylesheet (global, contemporary polish) ---------- */
  (function(){ var ml=document.createElement('link'); ml.rel='stylesheet'; ml.href=root+'assets/css/modern.css'; document.head.appendChild(ml); })();

  var BRAND = 'Вечная Память';

  var ZONES = {
    public:   { label: 'Публичный сайт',     home: 'index.html' },
    client:   { label: 'Кабинет клиента',    home: 'client/dashboard.html' },
    staff:    { label: 'Панель сотрудника',  home: 'staff/dashboard.html' },
    executor: { label: 'Исполнитель',        home: 'executor/tasks.html' },
    admin:    { label: 'Администрирование',  home: 'admin/users.html' }
  };

  /* Код роли (бэкенд) -> читаемая подпись. */
  var ROLE_LABEL = {
    partner: 'Клиент', manager: 'Менеджер', executor: 'Исполнитель', admin: 'Администратор',
    client: 'Клиент', staff: 'Менеджер'
  };

  var NAV = {
    client: [
      { id:'dashboard',     label:'Главная',       href:'client/dashboard.html',    ic:'🏠' },
      { id:'orders',        label:'Мои заказы',     href:'client/orders.html',       ic:'📑' },
      { id:'order-create',  label:'Оформить заказ', href:'client/order-create.html', ic:'➕' },
      { id:'documents',     label:'Документы',      href:'client/documents.html',    ic:'📄' },
      { id:'payments',      label:'Платежи',        href:'client/payments.html',     ic:'💳' },
      { id:'messages',      label:'Сообщения',     href:'client/messages.html',     ic:'💬' },
      { id:'profile',       label:'Профиль',        href:'client/profile.html',      ic:'👤' }
    ],
    staff: [
      { id:'dashboard', label:'Dashboard',       href:'staff/dashboard.html', ic:'📊' },
      { id:'orders',    label:'Реестр заказов',  href:'staff/orders.html',    ic:'📑' },
      { id:'requests',  label:'Заявки с сайта',  href:'staff/requests.html',  ic:'📨' },
      { id:'clients',   label:'Клиенты',         href:'staff/clients.html',   ic:'👥' },
      { id:'tasks',     label:'Задачи',          href:'staff/tasks.html',     ic:'✅' },
      { id:'documents', label:'Документы',       href:'staff/documents.html', ic:'📄' },
      { id:'payments',  label:'Платежи и счета', href:'staff/payments.html',  ic:'💰' },
      { id:'reports',   label:'Отчёты',          href:'staff/reports.html',   ic:'📈' }
    ],
    executor: [
      { id:'tasks',    label:'Мои задачи', href:'executor/tasks.html',    ic:'✅' },
      { id:'orders',   label:'Мои заказы', href:'executor/orders.html',   ic:'📑' },
      { id:'calendar', label:'Календарь',  href:'executor/calendar.html', ic:'📅' }
    ],
    admin: [
      { id:'users',        label:'Пользователи', href:'admin/users.html',        ic:'👥' },
      { id:'roles',        label:'Роли и права', href:'admin/roles.html',        ic:'🔐' },
      { id:'dictionaries', label:'Справочники',  href:'admin/dictionaries.html', ic:'📚' },
      { id:'pricing',      label:'Прайс-листы',  href:'admin/pricing.html',      ic:'🏷️' },
      { id:'audit',        label:'Аудит лог',    href:'admin/audit.html',        ic:'🧾' },
      { id:'settings',     label:'Настройки',    href:'admin/settings.html',     ic:'⚙️' }
    ]
  };

  var PUBLIC_NAV = [
    { id:'home',     label:'Главная',        href:'index.html' },
    { id:'services', label:'Услуги',         href:'catalog-services.html' },
    { id:'products', label:'Товары',         href:'catalog-products.html' },
    { id:'order',    label:'Оформить заказ', href:'order-new.html' }
  ];

  function L(href){ return root + href; }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia && window.matchMedia('(pointer:fine)').matches;

  /* ---------- локальные хелперы для топбара ---------- */
  function getStored(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function escapeHtmlLocal(v){
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function(c){
      return c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c==='"'?'&quot;':'&#39;';
    });
  }
  function initialsFrom(name){
    if(!name) return '—';
    var parts = String(name).trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : '';
    var b = parts[1] ? parts[1][0] : '';
    return ((a+b).toUpperCase()) || '—';
  }
  function updateChip(u){
    if(!u) return;
    var nameEl=document.getElementById('userName');
    var roleEl=document.getElementById('userRole');
    var iniEl=document.getElementById('userIni');
    if(u.full_name){ if(nameEl) nameEl.textContent=u.full_name; if(iniEl) iniEl.textContent=initialsFrom(u.full_name); }
    var rl=ROLE_LABEL[u.role];
    if(rl && roleEl) roleEl.textContent=rl;
  }
  function refreshUser(){
    try {
      if(!window.API || !API.isAuthed || !API.isAuthed()) return;
      API.me().then(updateChip).catch(function(){});
    } catch(e){}
  }
  function ensureApiAndRefresh(){
    if(window.API){ refreshUser(); return; }
    var s=document.createElement('script');
    s.src=root+'assets/js/api.js';
    s.onload=refreshUser; s.onerror=function(){};
    document.head.appendChild(s);
  }
  function doLogout(){
    if(window.API && API.logout){
      API.logout().then(function(){ location.href=L('login.html'); }, function(){ location.href=L('login.html'); });
    } else {
      try { ['vp_access','vp_refresh','vp_role','vp_partner_id','vp_name'].forEach(function(k){ localStorage.removeItem(k); }); } catch(_){}
      location.href=L('login.html');
    }
  }

  /* ---------- Toast ---------- */
  var host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host);
  window.toast = function (msg, type) {
    var t = document.createElement('div'); t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = (type==='success'?'✅ ':type==='error'?'⚠️ ':'🕯️ ') + msg;
    host.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(function(){ t.remove(); }, 200); }, 2800);
  };

  function soonHandler(label){ return function(e){ e.preventDefault(); window.toast('Раздел «'+label+'» скоро будет готов', 'error'); }; }

  /* ---------- Topbar ---------- */
  var header = document.createElement('header'); header.className='topbar';
  var menuBtn = '';
  if (zone !== 'public') menuBtn = '<button class="menu-btn" id="menuBtn" aria-label="Меню">☰</button>';
  var brand = '<a class="brand" href="'+L('index.html')+'"><span class="logo"><span class="flame"></span></span>'+BRAND+'</a>';
  var topnav = '';
  if (zone === 'public') {
    topnav = '<nav class="topnav">' + PUBLIC_NAV.map(function(n){
      return '<a href="'+L(n.href)+'" data-id="'+n.id+'"'+(n.soon?' data-soon="'+n.label+'"':'')+(n.id===page?' class="active"':'')+'>'+n.label+'</a>';
    }).join('') + '</nav>';
  }
  var right = '<div class="top-right">';
  if (zone === 'public') {
    right += '<a class="btn btn-sm" href="'+L('login.html')+'">Войти</a>' +
             '<a class="btn btn-primary btn-sm" href="'+L('order-new.html')+'">Оформить заказ</a>';
  } else {
    var dispName = getStored('vp_name') || 'Аккаунт';
    var dispRole = ROLE_LABEL[getStored('vp_role')] || (ZONES[zone] ? ZONES[zone].label : '');
    right += '<div class="user-chip" id="userChip"><span class="avatar" id="userIni">'+escapeHtmlLocal(initialsFrom(getStored('vp_name')))+'</span><span class="meta"><b id="userName">'+escapeHtmlLocal(dispName)+'</b><br><span id="userRole">'+escapeHtmlLocal(dispRole)+'</span></span></div>' +
             '<a class="btn btn-sm" href="'+L('login.html')+'" id="logoutBtn">Выйти</a>';
  }
  right += '</div>';
  header.innerHTML = menuBtn + brand + topnav + right;
  body.insertBefore(header, body.firstChild);

  if (zone !== 'public') {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function(e){ e.preventDefault(); doLogout(); });
    ensureApiAndRefresh();
  }

  document.querySelectorAll('.topnav a[data-soon]').forEach(function(a){ a.addEventListener('click', soonHandler(a.getAttribute('data-soon'))); });

  /* ---------- Sidebar ---------- */
  var view = document.getElementById('view');
  if (zone !== 'public' && view) {
    var shell = document.createElement('div'); shell.className='shell';
    var aside = document.createElement('aside'); aside.className='sidebar'; aside.id='sidebar';
    var items = (NAV[zone]||[]).map(function(n){
      var cls = 'nav-item' + (n.id===page?' active':'') + (n.soon?' soon':'');
      var tag = n.soon ? '<span class="tag-soon">скоро</span>' : '';
      return '<a class="'+cls+'" href="'+L(n.href)+'"'+(n.soon?' data-soon="'+n.label+'"':'')+'><span class="ic">'+n.ic+'</span><span>'+n.label+'</span>'+tag+'</a>';
    }).join('');
    aside.innerHTML = '<div class="zone-label">'+(ZONES[zone].label)+'</div>'+items;
    var main = document.createElement('main'); main.className='content';
    view.parentNode.removeChild(view); main.appendChild(view);
    shell.appendChild(aside); shell.appendChild(main);
    body.appendChild(shell);
    aside.querySelectorAll('a[data-soon]').forEach(function(a){ a.addEventListener('click', soonHandler(a.getAttribute('data-soon'))); });
    var backdrop = document.createElement('div'); backdrop.className='sidebar-backdrop'; body.appendChild(backdrop);
    function closeSidebar(){ aside.classList.remove('open'); backdrop.classList.remove('show'); }
    var mb = document.getElementById('menuBtn');
    if (mb) mb.addEventListener('click', function(){ var open = aside.classList.toggle('open'); backdrop.classList.toggle('show', open); });
    backdrop.addEventListener('click', closeSidebar);
    aside.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeSidebar); });
    window.addEventListener('keydown', function(e){ if(e.key==='Escape') closeSidebar(); });
  }

  /* ---------- Filter chips ---------- */
  document.querySelectorAll('.chips').forEach(function(group){
    group.querySelectorAll('.chip').forEach(function(chip){
      if (chip.hasAttribute('data-soon')) return;
      chip.addEventListener('click', function(){
        group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
      });
    });
  });

  /* ---------- data-toast buttons ---------- */
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-toast]');
    if (el){ e.preventDefault(); window.toast(el.getAttribute('data-toast'), el.getAttribute('data-toast-type')||''); }
  });

  /* =====================================================================
     FX LAYER
     ===================================================================== */
  var REVEAL_SEL = '.card, .stat, .feature, .svc, .step, .table-wrap, .timeline .tl-item, .section-title, .page-head, .notice';

  function loadScript(src){ return new Promise(function(res){ var s=document.createElement('script'); s.src=src; s.async=true; s.onload=function(){res(true);}; s.onerror=function(){res(false);}; document.head.appendChild(s); }); }

  /* Scroll progress (cheap, always on) */
  var prog = document.createElement('div'); prog.className='scroll-progress'; document.body.appendChild(prog);
  function onProg(){ var h=document.documentElement; var max=h.scrollHeight-h.clientHeight; var p=max>0?h.scrollTop/max:0; prog.style.transform='scaleX('+p.toFixed(4)+')'; if(h.scrollTop>8){ document.body.classList.add('scrolled'); } else { document.body.classList.remove('scrolled'); } }
  window.addEventListener('scroll', onProg, {passive:true}); window.addEventListener('resize', onProg); onProg();

  function revealAllNow(){ document.querySelectorAll(REVEAL_SEL).forEach(function(el){ el.classList.add('reveal','in-view'); }); }

  function setupRevealVanilla(){
    var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SEL));
    if(!els.length) return;
    els.forEach(function(el,i){ el.classList.add('reveal'); var v=i%4; if(v===1)el.classList.add('from-left'); else if(v===2)el.classList.add('from-right'); else if(v===3)el.classList.add('from-zoom'); });
    if(!('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.add('in-view'); }); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(!en.isIntersecting) return; var el=en.target;
        var sibs = el.parentNode ? Array.prototype.slice.call(el.parentNode.children).filter(function(c){return c.classList&&c.classList.contains('reveal');}):[el];
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx*70,420)+'ms';
        el.classList.add('in-view'); io.unobserve(el);
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
    els.forEach(function(el){ io.observe(el); });
    setTimeout(function(){ els.forEach(function(el){ el.classList.add('in-view'); }); }, 1800);
  }

  function setupRevealGsap(){
    try{
      window.gsap.registerPlugin(window.ScrollTrigger);
      var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SEL));
      if(els.length){
        window.gsap.set(els, { opacity:0, y:26 });
        window.ScrollTrigger.batch(els, {
          start: 'top 90%',
          onEnter: function(batch){ window.gsap.to(batch, { opacity:1, y:0, duration:.8, stagger:.08, ease:'power3.out', overwrite:true }); },
          onEnterBack: function(batch){ window.gsap.to(batch, { opacity:1, y:0, duration:.6, stagger:.05, ease:'power3.out', overwrite:true }); }
        });
        document.querySelectorAll('.section-title').forEach(function(s){ window.ScrollTrigger.create({ trigger:s, start:'top 90%', onEnter:function(){ s.classList.add('in-view'); }, onEnterBack:function(){ s.classList.add('in-view'); } }); });
      }
      var hi = document.querySelector('.hero-inner');
      if(hi){ window.gsap.from(hi.children, { y:34, opacity:0, duration:.9, stagger:.12, ease:'power3.out', delay:.15 }); }
      window.ScrollTrigger.refresh();
    }catch(err){ setupRevealVanilla(); }
  }

  /* Animated number counters */
  function countUp(el){
    var raw = el.textContent.trim();
    var m = raw.match(/[0-9][0-9\s.,]*/);
    if(!m) return;
    var numStr = m[0];
    var target = parseFloat(numStr.replace(/\s/g,'').replace(',','.'));
    if(isNaN(target)) return;
    var isInt = !/[.,]/.test(numStr);
    var prefix = raw.slice(0, m.index), suffix = raw.slice(m.index + numStr.length);
    var dur = 1100, t0 = null;
    function fmt(v){ return isInt ? Math.round(v).toLocaleString('ru-RU') : v.toFixed(1); }
    function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var e=1-Math.pow(1-p,3); el.textContent=prefix+fmt(target*e)+suffix; if(p<1) requestAnimationFrame(step); else el.textContent=raw; }
    requestAnimationFrame(step);
  }
  function setupCounters(){
    var nums = document.querySelectorAll('.stat .num');
    if(!nums.length || !('IntersectionObserver' in window)){ return; }
    var io = new IntersectionObserver(function(entries){ entries.forEach(function(en){ if(en.isIntersecting){ countUp(en.target); io.unobserve(en.target); } }); }, { threshold:0.4 });
    nums.forEach(function(n){ io.observe(n); });
  }

  /* Tilt + cursor spotlight */
  function bindTilt(el){
    var rect=null;
    function enter(){ rect = el.getBoundingClientRect(); }
    function move(e){ if(!rect) rect=el.getBoundingClientRect();
      var x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
      el.style.setProperty('--mx',(x*100).toFixed(1)+'%');
      el.style.setProperty('--my',(y*100).toFixed(1)+'%');
      var rx=(0.5-y)*7, ry=(x-0.5)*7;
      el.style.transform='perspective(820px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
    }
    function leave(){ el.style.transform=''; rect=null; }
    el.addEventListener('mouseenter',enter); el.addEventListener('mousemove',move); el.addEventListener('mouseleave',leave);
  }

  /* Magnetic buttons */
  function bindMagnetic(el){
    el.addEventListener('mousemove', function(e){ var r=el.getBoundingClientRect(); var x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2; el.style.transform='translate('+(x*0.22).toFixed(1)+'px,'+(y*0.3).toFixed(1)+'px)'; });
    el.addEventListener('mouseleave', function(){ el.style.transform=''; });
  }

  /* Cursor glow */
  function setupCursor(){
    var cur=document.createElement('div'); cur.className='cursor-glow'; cur.style.opacity='0'; document.body.appendChild(cur);
    var cx=window.innerWidth/2, cy=window.innerHeight/2, tx=cx, ty=cy, on=false;
    window.addEventListener('mousemove', function(e){ tx=e.clientX; ty=e.clientY; if(!on){on=true;cur.style.opacity='1';} });
    (function loop(){ cx+=(tx-cx)*0.18; cy+=(ty-cy)*0.18; cur.style.transform='translate('+(cx-20)+'px,'+(cy-20)+'px)'; requestAnimationFrame(loop); })();
  }

  /* Ember particles canvas */
  function setupEmbers(){
    var cv=document.createElement('canvas'); cv.id='fx-embers'; document.body.appendChild(cv);
    var ctx=cv.getContext('2d'), W=0, H=0, parts=[];
    function resize(){ W=cv.width=window.innerWidth; H=cv.height=window.innerHeight; }
    function mk(init){ return { x:Math.random()*W, y:init?Math.random()*H:H+12, r:Math.random()*2+0.6, s:Math.random()*0.45+0.18, a:Math.random()*0.4+0.12, d:(Math.random()-0.5)*0.3, ph:Math.random()*6.28 }; }
    resize(); window.addEventListener('resize',resize);
    for(var i=0;i<32;i++) parts.push(mk(true));
    function tick(){ ctx.clearRect(0,0,W,H); ctx.shadowColor='rgba(201,163,98,0.85)'; ctx.shadowBlur=8;
      for(var i=0;i<parts.length;i++){ var p=parts[i]; p.y-=p.s; p.ph+=0.02; p.x+=p.d+Math.sin(p.ph)*0.25; if(p.y<-12){ parts[i]=mk(false); }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832); ctx.fillStyle='rgba(201,163,98,'+p.a.toFixed(2)+')'; ctx.fill(); }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---- Boot FX ---- */
  if(reduceMotion){
    revealAllNow();
  } else {
    if(window.innerWidth>720) setupEmbers();
    if(FINE){ setupCursor(); document.querySelectorAll('.card, .stat, .feature, .svc, .step').forEach(bindTilt); document.querySelectorAll('.btn-primary, .btn-gold').forEach(bindMagnetic); }
    setupCounters();
    var done=false;
    function fallbackReveal(){ if(done) return; done=true; setupRevealVanilla(); }
    loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js').then(function(ok){
      if(ok && window.gsap){ return loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js'); }
      return false;
    }).then(function(stOk){
      if(done) return;
      if(stOk && window.gsap && window.ScrollTrigger){ done=true; setupRevealGsap(); }
      else { fallbackReveal(); }
    }).catch(fallbackReveal);
    setTimeout(fallbackReveal, 2600);
  }
})();
