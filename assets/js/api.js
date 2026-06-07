/* =====================================================================
   API client — Вечная Память (FastAPI backend)
   Базовый клиент: конфиг base URL, хранение JWT, обёртка fetch,
   методы auth и ресурсные хелперы. Подключать ДО app.js.
   Переопределить base URL можно через window.API_BASE до загрузки.
   ===================================================================== */
(function () {
  "use strict";

  var API_BASE = window.API_BASE || "http://localhost:8000/api/v1";

  var KEY = {
    access: "vp_access",
    refresh: "vp_refresh",
    role: "vp_role",
    partner: "vp_partner_id",
    name: "vp_name"
  };

  /* ---------- storage ---------- */
  function setTokens(t) {
    if (t && t.access_token) localStorage.setItem(KEY.access, t.access_token);
    if (t && t.refresh_token) localStorage.setItem(KEY.refresh, t.refresh_token);
    var d = t && t.access_token ? decodeJwt(t.access_token) : null;
    if (d) {
      if (d.role) localStorage.setItem(KEY.role, d.role);
      if (d.partner_id !== undefined && d.partner_id !== null)
        localStorage.setItem(KEY.partner, String(d.partner_id));
    }
  }
  function clearSession() {
    Object.keys(KEY).forEach(function (k) { localStorage.removeItem(KEY[k]); });
  }
  function getAccess() { return localStorage.getItem(KEY.access); }
  function isAuthed() { return !!getAccess(); }
  function role() {
    var r = localStorage.getItem(KEY.role);
    if (r) return r;
    var t = getAccess(); var d = t && decodeJwt(t);
    return d && d.role ? d.role : null;
  }
  function partnerId() {
    var v = localStorage.getItem(KEY.partner);
    if (v !== null && v !== "") return Number(v);
    var t = getAccess(); var d = t && decodeJwt(t);
    return d && d.partner_id != null ? d.partner_id : null;
  }

  function decodeJwt(token) {
    try {
      var p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      var json = decodeURIComponent(atob(p).split("").map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  /* ---------- root / redirect helpers ---------- */
  function currentRoot() {
    var b = document.body;
    return (b && b.dataset && b.dataset.root) ? b.dataset.root : "";
  }
  function onLoginPage() {
    return /login\.html$/.test(location.pathname);
  }
  function redirectToLogin() {
    // Не зацикливаемся, если уже на странице входа.
    if (onLoginPage()) return;
    location.replace(currentRoot() + "login.html");
  }

  /* ---------- role -> home page ---------- */
  var ZONE_HOME = {
    admin: "admin/users.html",
    manager: "staff/dashboard.html",
    executor: "executor/tasks.html",
    partner: "client/dashboard.html"
  };
  function homeForRole(r) { return ZONE_HOME[r] || "index.html"; }

  /* ---------- core request wrapper ---------- */
  function request(path, opts) {
    opts = opts || {};
    var headers = {};
    var key;
    if (opts.headers) for (key in opts.headers) headers[key] = opts.headers[key];

    var body = opts.body;
    if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.json);
    }
    var tok = getAccess();
    if (tok && !opts.noAuth) headers["Authorization"] = "Bearer " + tok;

    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: body
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
        if (!res.ok) {
          var detail = data && data.detail ? data.detail : "Ошибка " + res.status;
          if (Array.isArray(detail))
            detail = detail.map(function (d) { return d.msg || JSON.stringify(d); }).join("; ");
          // Сессия истекла / токен невалиден — выходим на страницу входа.
          if (res.status === 401 && !opts.noAuth) {
            clearSession();
            redirectToLogin();
          }
          var err = new Error(typeof detail === "string" ? detail : "Ошибка " + res.status);
          err.status = res.status; err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- auth ---------- */
  function login(email, password) {
    var form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    return request("/auth/login", {
      method: "POST",
      noAuth: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    }).then(function (t) { setTokens(t); return t; });
  }
  function registerPartner(payload) {
    return request("/auth/register", { method: "POST", noAuth: true, json: payload });
  }
  function me() {
    return request("/auth/me").then(function (u) {
      if (u) {
        if (u.role) localStorage.setItem(KEY.role, u.role);
        if (u.full_name) localStorage.setItem(KEY.name, u.full_name);
        if (u.partner_id != null) localStorage.setItem(KEY.partner, String(u.partner_id));
      }
      return u;
    });
  }
  function logout() {
    var done = function () { clearSession(); };
    return request("/auth/logout", { method: "POST" }).then(done, done);
  }

  /* ---------- resources ---------- */
  var services = {
    list: function (onlyActive) {
      return request("/services" + (onlyActive ? "?only_active=true" : ""));
    },
    get: function (id) { return request("/services/" + id); }
  };
  var requests = {
    create: function (payload) {
      return request("/requests", { method: "POST", noAuth: true, json: payload });
    },
    list: function (statusFilter) {
      return request("/requests" + (statusFilter ? "?status_filter=" + encodeURIComponent(statusFilter) : ""));
    }
  };
  var orders = {
    list: function () { return request("/orders"); },
    get: function (id) { return request("/orders/" + id); },
    create: function (payload) { return request("/orders", { method: "POST", json: payload }); },
    setStatus: function (id, status) {
      return request("/orders/" + id + "/status", { method: "PATCH", json: { status: status } });
    }
  };
  var payments = {
    list: function (orderId) {
      return request("/payments" + (orderId ? "?order_id=" + orderId : ""));
    }
  };

  /* ---------- helpers ---------- */
  function fmtPrice(v) {
    var n = Number(v);
    if (isNaN(n)) return v + "";
    return n.toLocaleString("ru-RU") + " ₽";
  }

  /* Анти-XSS: экранируем любые серверные/пользовательские строки
     перед вставкой в innerHTML или в значения HTML-атрибутов. */
  function escapeHtml(v) {
    if (v === null || v === undefined) return "";
    return String(v).replace(/[&<>"']/g, function (c) {
      switch (c) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "\"": return "&quot;";
        default: return "&#39;";
      }
    });
  }

  function requireAuth() {
    // Явная проверка для страниц, которые хотят гарантировать вход.
    if (!isAuthed()) { redirectToLogin(); return false; }
    return true;
  }

  window.API = {
    base: API_BASE,
    request: request,
    login: login,
    registerPartner: registerPartner,
    me: me,
    logout: logout,
    isAuthed: isAuthed,
    requireAuth: requireAuth,
    role: role,
    partnerId: partnerId,
    homeForRole: homeForRole,
    clearSession: clearSession,
    decodeJwt: decodeJwt,
    services: services,
    requests: requests,
    orders: orders,
    payments: payments,
    fmtPrice: fmtPrice,
    escapeHtml: escapeHtml
  };

  /* ---------- guard: приватные зоны требуют входа ----------
     Если страница принадлежит кабинету (client/staff/executor/admin),
     а токена нет — сразу отправляем на вход, чтобы не показывать
     пустые дашборды с ошибками 401. */
  (function guardPrivateZones() {
    try {
      var b = document.body;
      if (!b || !b.dataset) return;
      var zone = b.dataset.zone || "public";
      var PRIVATE = ["client", "staff", "executor", "admin"];
      if (PRIVATE.indexOf(zone) >= 0 && !isAuthed()) {
        redirectToLogin();
      }
    } catch (e) {}
  })();
})();
