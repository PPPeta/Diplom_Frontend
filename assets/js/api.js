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
  function getRefresh() { return localStorage.getItem(KEY.refresh); }
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

  /* ---------- token refresh (single-flight) ----------
     Доступ-токен живёт недолго (~30 мин). Чтобы пользователя не
     выкидывало при обычных действиях (например, при создании заказа),
     на 401 пробуем тихо обновить токен и повторить запрос один раз. */
  var _refreshing = null;
  function refreshTokens() {
    if (_refreshing) return _refreshing;
    var rt = getRefresh();
    if (!rt) return Promise.reject(new Error("no refresh token"));
    _refreshing = fetch(API_BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (res) {
      if (!res.ok) throw new Error("refresh failed");
      return res.json();
    }).then(function (t) {
      setTokens(t);
      _refreshing = null;
      return t;
    }).catch(function (e) {
      _refreshing = null;
      throw e;
    });
    return _refreshing;
  }

  /* ---------- core request wrapper ---------- */
  function request(path, opts) {
    return _send(path, opts || {}, false);
  }
  function _send(path, opts, isRetry) {
    var headers = {};
    var key;
    if (opts.headers) for (key in opts.headers) headers[key] = opts.headers[key];

    var body = opts.body;
    if (opts.formData !== undefined) {
      body = opts.formData;
    } else if (opts.json !== undefined) {
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
          // Пытаемся тихо обновить токен и повторить запрос один раз.
          if (res.status === 401 && !opts.noAuth && !isRetry &&
              path !== "/auth/refresh" && getRefresh()) {
            return refreshTokens().then(function () {
              return _send(path, opts, true);
            }, function () {
              clearSession();
              redirectToLogin();
              var e2 = new Error("Сессия истекла, войдите снова");
              e2.status = 401;
              throw e2;
            });
          }
          var detail = data && data.detail ? data.detail : "Ошибка " + res.status;
          if (Array.isArray(detail))
            detail = detail.map(function (d) { return d.msg || JSON.stringify(d); }).join("; ");
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

  function requestBlob(path) {
    var tok = getAccess();
    var headers = {};
    if (tok) headers["Authorization"] = "Bearer " + tok;
    return fetch(API_BASE + path, { headers: headers }).then(function (res) {
      if (!res.ok) {
        if (res.status === 401) { clearSession(); redirectToLogin(); }
        throw new Error("Ошибка " + res.status);
      }
      return res.blob().then(function (b) {
        var cd = res.headers.get("Content-Disposition") || "";
        var m = /filename=\"?([^\";]+)\"?/.exec(cd);
        return { blob: b, filename: m ? decodeURIComponent(m[1]) : null };
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
  function updateProfile(payload) {
    return request("/auth/me", { method: "PATCH", json: payload }).then(function (u) {
      if (u && u.full_name) localStorage.setItem(KEY.name, u.full_name);
      return u;
    });
  }
  function changePassword(payload) {
    return request("/auth/change-password", { method: "POST", json: payload });
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
  var documents = {
    list: function (orderId) {
      return request("/documents" + (orderId ? "?order_id=" + orderId : ""));
    },
    upload: function (formData) {
      return request("/documents", { method: "POST", formData: formData });
    },
    remove: function (id) {
      return request("/documents/" + id, { method: "DELETE" });
    },
    download: function (id) {
      return requestBlob("/documents/" + id + "/download").then(function (r) {
        var url = URL.createObjectURL(r.blob);
        var a = document.createElement("a");
        a.href = url; a.download = r.filename || ("document-" + id);
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      });
    }
  };
  var users = {
    list: function (q) {
      var qs = "";
      if (q && q.role) qs = "?role=" + encodeURIComponent(q.role);
      return request("/users" + qs);
    },
    get: function (id) { return request("/users/" + id); },
    create: function (payload) { return request("/users", { method: "POST", json: payload }); },
    update: function (id, payload) { return request("/users/" + id, { method: "PATCH", json: payload }); }
  };
  var roles = {
    list: function () { return request("/roles"); }
  };
  var partners = {
    list: function () { return request("/partners"); },
    get: function (id) { return request("/partners/" + id); }
  };

  /* ---------- helpers ---------- */
  function fmtPrice(v) {
    var n = Number(v);
    if (isNaN(n)) return v + "";
    return n.toLocaleString("ru-RU") + " ₽";
  }

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
    if (!isAuthed()) { redirectToLogin(); return false; }
    return true;
  }

  window.API = {
    base: API_BASE,
    request: request,
    requestBlob: requestBlob,
    login: login,
    registerPartner: registerPartner,
    me: me,
    updateProfile: updateProfile,
    changePassword: changePassword,
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
    documents: documents,
    users: users,
    roles: roles,
    partners: partners,
    fmtPrice: fmtPrice,
    escapeHtml: escapeHtml
  };

  /* ---------- guard: приватные зоны требуют входа ---------- */
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
