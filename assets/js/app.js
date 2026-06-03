/* Общий каркас интерфейса: топбар, сайдбар по зонам, тосты, демо-переключатель ролей. */
(function () {
  var body = document.body;
  var zone = body.dataset.zone || 'public';
  var page = body.dataset.page || '';
  var root = body.dataset.root || '';
  var BRAND = 'Сервис-Заказы';

  var ZONES = {
    public:   { label: 'Публичный сайт',     home: 'index.html' },
    client:   { label: 'Кабинет клиента',    home: 'client/dashboard.html' },
    staff:    { label: 'Панель сотрудника',  home: 'staff/dashboard.html' },
    executor: { label: 'Исполнитель',        home: 'executor/tasks.html' },
    admin:    { label: 'Администрирование',  home: 'admin/users.html' }
  };

  var NAV = {
    client: [
      { id:'dashboard', label:'Главная',   href:'client/dashboard.html', ic:'🏠' },
      { id:'orders',    label:'Мои заказы', href:'client/orders.html',    ic:'📑' },
      { id:'documents', label:'Документы',  href:'client/documents.html', ic:'📄', soon:true },
      { id:'payments',  label:'Платежи',    href:'client/payments.html',  ic:'💳', soon:true },
      { id:'messages',  label:'Сообщения',  href:'client/messages.html',  ic:'💬', soon:true },
      { id:'profile',   label:'Профиль',    href:'client/profile.html',   ic:'👤', soon:true }
    ],
    staff: [
      { id:'dashboard', label:'Dashboard',       href:'staff/dashboard.html', ic:'📊' },
      { id:'orders',    label:'Реестр заказов',  href:'staff/orders.html',    ic:'📑' },
      { id:'clients',   label:'Клиенты',         href:'staff/clients.html',   ic:'👥', soon:true },
      { id:'tasks',     label:'Задачи',          href:'staff/tasks.html',     ic:'✅', soon:true },
      { id:'calendar',  label:'Календарь',       href:'staff/calendar.html',  ic:'📅', soon:true },
      { id:'documents', label:'Документы',       href:'staff/documents.html', ic:'📄', soon:true },
      { id:'payments',  label:'Платежи и счета', href:'staff/payments.html',  ic:'💰', soon:true },
      { id:'reports',   label:'Отчёты',          href:'staff/reports.html',   ic:'📈', soon:true }
    ],
    executor: [
      { id:'tasks',    label:'Мои задачи', href:'executor/tasks.html',    ic:'✅' },
      { id:'orders',   label:'Мои заказы', href:'executor/orders.html',   ic:'📑', soon:true },
      { id:'calendar', label:'Календарь',  href:'executor/calendar.html', ic:'📅', soon:true }
    ],
    admin: [
      { id:'users',        label:'Пользователи', href:'admin/users.html',        ic:'👥' },
      { id:'roles',        label:'Роли и права', href:'admin/roles.html',        ic:'🔐', soon:true },
      { id:'dictionaries', label:'Справочники',  href:'admin/dictionaries.html', ic:'📚', soon:true },
      { id:'audit',        label:'Аудит лог',    href:'admin/audit.html',        ic:'🧾', soon:true },
      { id:'settings',     label:'Настройки',    href:'admin/settings.html',     ic:'⚙️', soon:true }
    ]
  };

  var PUBLIC_NAV = [
    { id:'home',     label:'Главная',        href:'index.html' },
    { id:'services', label:'Услуги',         href:'catalog-services.html' },
    { id:'products', label:'Товары',         href:'catalog-products.html', soon:true },
    { id:'order',    label:'Оформить заказ', href:'order-new.html' }
  ];

  var USERS = {
    client:   { name:'Анна Морозова',  role:'Клиент',        ini:'АМ' },
    staff:    { name:'Игорь Сафронов', role:'Менеджер',      ini:'ИС' },
    executor: { name:'Павел Ким',      role:'Исполнитель',   ini:'ПК' },
    admin:    { name:'Админ',          role:'Администратор', ini:'АД' }
  };

  function L(href){ return root + href; }

  /* ---------- Toast ---------- */
  var host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host);
  window.toast = function (msg, type) {
    var t = document.createElement('div'); t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = (type==='success'?'✅ ':type==='error'?'⚠️ ':'🔔 ') + msg;
    host.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(function(){ t.remove(); }, 200); }, 2800);
  };

  function soonHandler(label){ return function(e){ e.preventDefault(); window.toast('Раздел «'+label+'» скоро будет готов', 'error'); }; }

  /* ---------- Role switcher ---------- */
  function roleSwitcher(){
    var sel = document.createElement('select'); sel.className='role-switch'; sel.title='Демо: переключить роль';
    Object.keys(ZONES).forEach(function(z){
      var o = document.createElement('option'); o.value=z; o.textContent=ZONES[z].label; if(z===zone)o.selected=true; sel.appendChild(o);
    });
    sel.addEventListener('change', function(){ window.location.href = L(ZONES[sel.value].home); });
    return sel;
  }

  /* ---------- Topbar ---------- */
  var header = document.createElement('header'); header.className='topbar';
  var menuBtn = '';
  if (zone !== 'public') menuBtn = '<button class="menu-btn" id="menuBtn" aria-label="Меню">☰</button>';
  var brand = '<a class="brand" href="'+L('index.html')+'"><span class="logo">◆</span>'+BRAND+'</a>';
  var topnav = '';
  if (zone === 'public') {
    topnav = '<nav class="topnav">' + PUBLIC_NAV.map(function(n){
      return '<a href="'+L(n.href)+'" data-id="'+n.id+'"'+(n.soon?' data-soon="'+n.label+'"':'')+(n.id===page?' class="active"':'')+'>'+n.label+'</a>';
    }).join('') + '</nav>';
  }
  var right = '<div class="top-right">' + roleSwitcherPlaceholder() ;
  function roleSwitcherPlaceholder(){ return '<span id="roleSlot"></span>'; }
  if (zone === 'public') {
    right += '<a class="btn btn-sm" href="'+L('login.html')+'">Войти</a>' +
             '<a class="btn btn-primary btn-sm" href="'+L('order-new.html')+'">Оформить заказ</a>';
  } else {
    var u = USERS[zone] || USERS.client;
    right += '<div class="user-chip"><span class="avatar">'+u.ini+'</span><span class="meta"><b>'+u.name+'</b><br><span>'+u.role+'</span></span></div>' +
             '<a class="btn btn-sm" href="'+L('login.html')+'">Выйти</a>';
  }
  right += '</div>';
  header.innerHTML = menuBtn + brand + topnav + right;
  body.insertBefore(header, body.firstChild);
  document.getElementById('roleSlot').appendChild(roleSwitcher());

  document.querySelectorAll('.topnav a[data-soon]').forEach(function(a){ a.addEventListener('click', soonHandler(a.getAttribute('data-soon'))); });

  /* ---------- Sidebar (internal zones) ---------- */
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

    /* Mobile sidebar + backdrop */
    var backdrop = document.createElement('div'); backdrop.className='sidebar-backdrop'; body.appendChild(backdrop);
    function closeSidebar(){ aside.classList.remove('open'); backdrop.classList.remove('show'); }
    var mb = document.getElementById('menuBtn');
    if (mb) mb.addEventListener('click', function(){
      var open = aside.classList.toggle('open');
      backdrop.classList.toggle('show', open);
    });
    backdrop.addEventListener('click', closeSidebar);
    aside.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeSidebar); });
    window.addEventListener('keydown', function(e){ if(e.key==='Escape') closeSidebar(); });
  }

  /* ---------- Interactive filter chips (single-select within a .chips group) ---------- */
  document.querySelectorAll('.chips').forEach(function(group){
    group.querySelectorAll('.chip').forEach(function(chip){
      if (chip.hasAttribute('data-soon')) return;
      chip.addEventListener('click', function(){
        group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
      });
    });
  });

  /* ---------- Generic helpers for buttons marked data-toast ---------- */
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-toast]');
    if (el){ e.preventDefault(); window.toast(el.getAttribute('data-toast'), el.getAttribute('data-toast-type')||''); }
  });
})();
