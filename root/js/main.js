/* ==========================================================================
   Lost & Ground: site scripts
   Code written with help from Claude (Anthropic).

   What this file does:
     - opens and closes the menu on phones
     - fades sections in while you scroll
     - runs the basket (saved in the browser, no real checkout yet)
     - filters products in the shop (all / for him / for her)
     - shows a thank you message after a form is sent
     - puts the current year in the footer
   ========================================================================== */
(function () {
  "use strict";


  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Toast ---------- */
  var toast = document.querySelector(".toast");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2600);
  }

  /* ---------- Cart (prototype, stored in the browser) ---------- */
  var CART_KEY = "lg-cart";
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage blocked */ }
  }
  var cart = readCart();

  var countEls = document.querySelectorAll(".cart-count");
  var itemsEl = document.querySelector(".cart-items");
  var totalEl = document.querySelector(".cart-total span:last-child");
  var checkoutBtn = document.querySelector(".checkout-btn");

  function money(n) { return "£" + n.toFixed(2); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderCart() {
    var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var total = cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
    countEls.forEach(function (el) {
      el.textContent = count;
      el.setAttribute("data-count", count);
    });
    if (!itemsEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<li class="cart-empty"><p>Your basket is empty.</p><a class="btn btn--mustard" href="shop.html">Browse the shop</a></li>';
    } else {
      itemsEl.innerHTML = cart.map(function (item) {
        return '<li class="cart-item">' +
          '<img src="' + esc(item.img) + '" alt="">' +
          '<div><h4>' + esc(item.name) + '</h4><small>' + money(+item.price) + '</small></div>' +
          '<div class="qty">' +
            '<button type="button" data-dec="' + esc(item.id) + '" aria-label="Remove one">−</button>' +
            '<span>' + (+item.qty) + '</span>' +
            '<button type="button" data-inc="' + esc(item.id) + '" aria-label="Add one">+</button>' +
          '</div></li>';
      }).join("");
    }
    if (totalEl) totalEl.textContent = money(total);
    if (checkoutBtn) checkoutBtn.disabled = !cart.length;
  }

  function addToCart(data) {
    var found = cart.find(function (i) { return i.id === data.id; });
    if (found) found.qty += 1;
    else cart.push({ id: data.id, name: data.name, price: data.price, img: data.img, qty: 1 });
    saveCart(cart);
    renderCart();
    showToast(data.name + " added to your basket");
  }

  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      addToCart({
        id: add.dataset.add,
        name: add.dataset.name,
        price: parseFloat(add.dataset.price),
        img: add.dataset.img
      });
      return;
    }
    var inc = e.target.closest("[data-inc]");
    var dec = e.target.closest("[data-dec]");
    if (inc || dec) {
      var id = (inc || dec).dataset[inc ? "inc" : "dec"];
      cart = cart.map(function (i) {
        if (i.id === id) i.qty += inc ? 1 : -1;
        return i;
      }).filter(function (i) { return i.qty > 0; });
      saveCart(cart);
      renderCart();
    }
  });

  function setCart(open) {
    document.body.classList.toggle("cart-open", open);
    var drawer = document.querySelector(".cart-drawer");
    if (drawer) drawer.setAttribute("aria-hidden", String(!open));
  }
  document.querySelectorAll(".cart-btn").forEach(function (b) {
    b.addEventListener("click", function () { setCart(true); });
  });
  document.querySelectorAll(".cart-close, .cart-overlay").forEach(function (b) {
    b.addEventListener("click", function () { setCart(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setCart(false);
      document.body.classList.remove("menu-open");
    }
  });
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function () {
      showToast("Checkout is coming soon — thank you for your patience!");
    });
  }

  renderCart();

  /* ---------- Shop filters: all / for him / for her ---------- */
  var chips = document.querySelectorAll(".chip");
  function applyFilter(filter) {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === filter)); });
    document.querySelectorAll(".product").forEach(function (p) {
      p.classList.toggle("is-hidden", filter !== "all" && p.dataset.gender !== filter);
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () { applyFilter(chip.dataset.filter); });
  });
  if (chips.length && /^#(him|her)$/.test(location.hash)) applyFilter(location.hash.slice(1));

  /* ---------- Forms (front-end only until a backend is connected) ---------- */
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var note = form.querySelector(".form-note");
      var msg = form.dataset.form === "contact"
        ? "Thank you! We’ll get back to you soon."
        : "Welcome to the rebels’ corner!";
      if (note) note.textContent = msg;
      else showToast(msg);
      form.reset();
    });
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

})();
