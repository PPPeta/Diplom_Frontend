/* =====================================================================
   Корзина — Вечная Память (для незарегистрированного пользователя)
   Хранится в localStorage, работает без авторизации.
   Подключать ПОСЛЕ app.js (app.js строит шапку, сюда вставляем бейдж).
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "vp_cart";
  var subs = [];

  /* ---------- storage ---------- */
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    notify();
  }
  function notify() {
    var items = read();
    subs.forEach(function (cb) { try { cb(items); } catch (e) {} });
    updateBadges();
  }

  /* ---------- public API ---------- */
  function keyOf(it) { return it.code || it.name; }

  function count() {
    return read().reduce(function (n, it) { return n + (parseInt(it.qty, 10) || 1); }, 0);
  }
  function total() {
    return read().reduce(function (s, it) {
      return s + (Number(it.price) || 0) * (parseInt(it.qty, 10) || 1);
    }, 0);
  }
  function add(item, qty) {
    var items = read();
    var q = parseInt(qty, 10) || 1;
    var k = item.code || item.name;
    var found = null;
    for (var i = 0; i < items.length; i++) {
      if ((items[i].code || items[i].name) === k) { found = items[i]; break; }
    }
    if (found) {
      found.qty = (parseInt(found.qty, 10) || 1) + q;
    } else {
      items.push({
        id: (item.id !== undefined && item.id !== null && item.id !== "") ? item.id : null,
        code: item.code || "",
        name: item.name || "Услуга",
        price: Number(item.price) || 0,
        qty: q
      });
    }
    write(items);
  }
  function setQty(k, qty) {
    var items = read();
    var q = parseInt(qty, 10) || 1;
    if (q < 1) q = 1;
    items.forEach(function (it) { if ((it.code || it.name) === k) it.qty = q; });
    write(items);
  }
  function remove(k) {
    write(read().filter(function (it) { return (it.code || it.name) !== k; }));
  }
  function clear() { write([]); }
  function items() { return read(); }
  function subscribe(cb) {
    subs.push(cb);
    try { cb(read()); } catch (e) {}
  }

  function fmt(v) {
    if (window.API && window.API.fmtPrice) return window.API.fmtPrice(v);
    var n = Number(v);
    return (isNaN(n) ? 0 : n).toLocaleString("ru-RU") + " \u20bd";
  }

  /* ---------- badge in public topbar ---------- */
  function root() {
    var b = document.body;
    return (b && b.dataset && b.dataset.root) ? b.dataset.root : "";
  }
  function injectStyle() {
    if (document.getElementById("cart-style")) return;
    var s = document.createElement("style");
    s.id = "cart-style";
    s.textContent =
      ".cart-link{white-space:nowrap}" +
      ".cart-badge{display:inline-block;min-width:18px;padding:0 5px;margin-left:4px;border-radius:9px;background:#c9a362;color:#1a1a1a;font-size:12px;font-weight:700;line-height:18px;text-align:center}";
    document.head.appendChild(s);
  }
  function injectBadge() {
    var b = document.body;
    if (!b) return;
    if (b.dataset && b.dataset.zone && b.dataset.zone !== "public") return;
    var right = document.querySelector(".topbar .top-right");
    if (!right || document.getElementById("cartLink")) { updateBadges(); return; }
    var a = document.createElement("a");
    a.id = "cartLink";
    a.className = "btn btn-sm cart-link";
    a.href = root() + "cart.html";
    a.innerHTML = "\ud83d\uded2 \u041a\u043e\u0440\u0437\u0438\u043d\u0430 <span class=\"cart-badge\" id=\"cartBadge\">0</span>";
    right.insertBefore(a, right.firstChild);
    updateBadges();
  }
  function updateBadges() {
    var n = count();
    var els = document.querySelectorAll(".cart-badge");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = n;
      els[i].style.display = n > 0 ? "inline-block" : "none";
    }
  }

  /* ---------- delegate add-to-cart buttons ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".cart-add") : null;
    if (!btn) return;
    e.preventDefault();
    add({
      id: btn.getAttribute("data-id"),
      code: btn.getAttribute("data-code") || "",
      name: btn.getAttribute("data-name") || "\u0423\u0441\u043b\u0443\u0433\u0430",
      price: btn.getAttribute("data-price") || 0
    }, 1);
    if (window.toast) window.toast("\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443: " + (btn.getAttribute("data-name") || ""), "success");
  });

  window.Cart = {
    add: add, remove: remove, setQty: setQty, clear: clear,
    items: items, count: count, total: total, subscribe: subscribe, fmt: fmt
  };

  injectStyle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBadge);
  } else {
    injectBadge();
  }
  setTimeout(injectBadge, 0);
  setTimeout(injectBadge, 300);
})();
