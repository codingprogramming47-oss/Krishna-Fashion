// ============================================================
//   AAROHI FASHION — cart.js
//   Cart management: add, remove, update, persist, render
//   Coupons & Settings → Firestore siteConfig
//   Orders → localStorage only (WhatsApp-based flow)
// ============================================================

import { formatCurrency, showToast, LS, generateOrderId } from './utils.js';
import { getConfig } from './firebase.js';

const CART_KEY        = 'aarohi_cart';
const WHATSAPP_NUMBER = '919876543210'; // fallback if admin hasn't set it

/* ── CART CRUD ───────────────────────────────────────────── */
export function getCart() { return LS.get(CART_KEY) || []; }

export function saveCart(cart) {
  LS.set(CART_KEY, cart);
  updateCartBadge();
}

export function addToCart(item) {
  const cart = getCart();
  const key  = item.id + '-' + (item.selectedSize || '') + '-' + (item.selectedColor || '');
  const existing = cart.find(i => i._key === key);

  if (existing) {
    existing.quantity = Math.min((existing.quantity || 1) + 1, 10);
  } else {
    cart.push({ ...item, _key: key, quantity: item.quantity || 1 });
  }
  saveCart(cart);
  updateCartBadge();
}

export function removeFromCart(key) {
  saveCart(getCart().filter(i => i._key !== key));
}

export function updateQuantity(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i._key === key);
  if (!item) return;
  item.quantity = Math.max(1, Math.min((item.quantity || 1) + delta, 10));
  saveCart(cart);
}

export function clearCart() {
  LS.remove(CART_KEY);
  LS.remove(COUPON_CODE_KEY);
  LS.remove(COUPON_DISCOUNT_KEY);
  _appliedCouponCode = '';
  updateCartBadge();
}

/* ── SETTINGS CACHE (from Firestore) ────────────────────── */
let _settingsCache = null;
async function getSettings() {
  if (_settingsCache) return _settingsCache;
  try {
    const data = await getConfig('settings');
    _settingsCache = data || {};
  } catch { _settingsCache = {}; }
  return _settingsCache;
}

/* ── CART TOTALS ─────────────────────────────────────────── */
export async function getCartTotalsAsync(cart, couponDiscount = 0) {
  const settings   = await getSettings();
  const freeThresh = settings.freeShippingThreshold || 999;
  const shipCharge = settings.shippingCharge        || 79;

  const subtotal = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
  const savings  = cart.reduce((s, i) => s + (((i.originalPrice || i.price) - i.price) * (i.quantity || 1)), 0);
  const shipping = 0;
  const coupon   = Math.min(couponDiscount, subtotal);
  const total    = subtotal - coupon;

  return { subtotal, savings, shipping, coupon, total };
}

// Sync version (uses localStorage fallback for cart page real-time updates)
export function getCartTotals(cart, couponDiscount = 0) {
  const subtotal = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
  const savings  = cart.reduce((s, i) => s + (((i.originalPrice || i.price) - i.price) * (i.quantity || 1)), 0);
  const shipping = 0;
  const coupon   = Math.min(couponDiscount, subtotal);
  const total    = subtotal - coupon;

  return { subtotal, savings, shipping, coupon, total };
}

/* ── BADGE ───────────────────────────────────────────────── */
export function updateCartBadge() {
  const cart  = getCart();
  const count = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.style.display = count > 0 ? 'flex' : 'none';
    b.textContent   = count > 99 ? '99+' : count;
  });
}

/* ── RENDER CART PAGE ────────────────────────────────────── */
export function renderCartPage() {
  const cart      = getCart();
  const container = document.getElementById('cart-items');
  const emptyEl   = document.getElementById('cart-empty');
  const filledEl  = document.getElementById('cart-filled');

  if (!container) return;

  if (!cart.length) {
    if (emptyEl)  emptyEl.style.display  = 'block';
    if (filledEl) filledEl.style.display = 'none';
    return;
  }

  if (emptyEl)  emptyEl.style.display  = 'none';
  if (filledEl) filledEl.style.display = '';

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-key="${item._key}">
      <img class="cart-item-img"
           src="${item.images?.[0] || 'https://placehold.co/90x110/f5edd6/7b1d2e?text=Item'}"
           alt="${item.name}"
           onerror="this.src='https://placehold.co/90x110/f5edd6/7b1d2e?text=Aarohi'">
      <div class="cart-item-details">
        <div class="cart-item-category">${item.category || ''}</div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">
          ${item.selectedSize ? `Size: <strong>${item.selectedSize}</strong>` : ''}
          ${item.selectedColor ? ` · Color selected` : ''}
        </div>
        <div class="cart-item-row">
          <div class="qty-control">
            <button class="qty-btn" onclick="cartQtyChange('${item._key}', -1)">−</button>
            <span class="qty-display">${item.quantity || 1}</span>
            <button class="qty-btn" onclick="cartQtyChange('${item._key}', +1)">+</button>
          </div>
          <div class="cart-item-price">${formatCurrency(item.price * (item.quantity || 1))}</div>
          <button class="cart-item-remove" onclick="cartRemoveItem('${item._key}')">
            <i class="fa-regular fa-trash-can"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');

  renderOrderSummary(cart);
}

/* ── ORDER SUMMARY ───────────────────────────────────────── */
const COUPON_CODE_KEY     = 'aarohi_coupon_code';
const COUPON_DISCOUNT_KEY = 'aarohi_coupon_discount';
let _appliedCouponCode = LS.get(COUPON_CODE_KEY) || '';

// Uses the discount % stored at apply-time — no hardcoded list needed
function calcCouponAmount(code, subtotal) {
  if (!code) return 0;
  const discount = Number(LS.get(COUPON_DISCOUNT_KEY) || 0);
  return discount > 0 ? Math.round(subtotal * (discount / 100)) : 0;
}

export function getAppliedCoupon() {
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
  return calcCouponAmount(_appliedCouponCode, subtotal);
}

export function resetCoupon() {
  _appliedCouponCode = '';
  LS.remove(COUPON_CODE_KEY);
  LS.remove(COUPON_DISCOUNT_KEY);
}

export function renderOrderSummary(cart) {
  const t = getCartTotals(cart, getAppliedCoupon());

  const s = id => document.getElementById(id);
  if (s('sum-subtotal'))  s('sum-subtotal').textContent  = formatCurrency(t.subtotal);
  if (s('sum-savings'))   s('sum-savings').textContent   = `−${formatCurrency(t.savings)}`;
  if (s('sum-shipping'))  s('sum-shipping').textContent  = t.shipping === 0 ? 'FREE' : formatCurrency(t.shipping);
  if (s('sum-coupon'))    s('sum-coupon').textContent    = `−${formatCurrency(t.coupon)}`;
  if (s('sum-coupon-row')) s('sum-coupon-row').style.display = t.coupon > 0 ? '' : 'none';
  if (s('sum-total'))     s('sum-total').textContent     = formatCurrency(t.total);
}

/* ── COUPON — reads from Firestore siteConfig ────────────── */
async function getActiveCoupons() {
  try {
    const data = await getConfig('coupons');
    if (data?.list && data.list.length) return data.list;
  } catch { /* fallthrough */ }
  return []; // no coupons in DB = no coupons accepted
}

export async function applyCoupon(code) {
  const cart    = getCart();
  const t       = getCartTotals(cart, 0);
  const coupons = await getActiveCoupons();
  const coupon  = coupons.find(c => c.code === code.toUpperCase() && c.active !== false);

  if (!coupon) {
    showToast('Invalid or inactive coupon code', 'error');
    return;
  }

  _appliedCouponCode = coupon.code;
  LS.set(COUPON_CODE_KEY, coupon.code);
  LS.set(COUPON_DISCOUNT_KEY, coupon.discount);
  const amount = calcCouponAmount(coupon.code, t.subtotal);
  showToast(`🎉 Coupon applied! You saved ${formatCurrency(amount)}`, 'success');
  renderOrderSummary(cart);
}

/* ── WHATSAPP MESSAGE BUILDER ────────────────────────────── */
export async function buildWhatsAppMessage(formData) {
  const cart = getCart();
  if (!cart.length) return null;

  const settings = await getSettings();
  const waNumber = settings.whatsappNumber || WHATSAPP_NUMBER;

  const t = getCartTotals(cart, getAppliedCoupon());

  const itemLines = cart.map((item, i) =>
    `  ${i+1}. ${item.name}` +
    `\n      Size: ${item.selectedSize || 'N/A'}` +
    `\n      Qty: ${item.quantity || 1}` +
    `\n      Price: ${formatCurrency(item.price * (item.quantity||1))}` +
    (item.images?.[0] ? `\n      🖼️ Image: ${item.images[0]}` : '')
  ).join('\n\n');

  const orderId   = generateOrderId();
  const storeName = settings.storeName || 'Aarohi Fashion';

  const message = `
🌸 *New Order from ${storeName}*
━━━━━━━━━━━━━━━━━
📦 *Order ID:* ${orderId}

👤 *Customer Details:*
  Name: ${formData.name}
  Phone: ${formData.phone}
  Email: ${formData.email || 'Not provided'}

📍 *Delivery Address:*
  ${formData.address}
  ${formData.city}, ${formData.state} - ${formData.pincode}
  ${formData.notes ? `\n  Note: ${formData.notes}` : ''}

🛍️ *Order Items:*
${itemLines}

━━━━━━━━━━━━━━━━━
💰 *Order Summary:*
  Subtotal: ${formatCurrency(t.subtotal)}
  Shipping: ${t.shipping === 0 ? 'FREE' : formatCurrency(t.shipping)}
  ${t.coupon > 0 ? `Discount: -${formatCurrency(t.coupon)}\n  ` : ''}*Total: ${formatCurrency(t.total)}*

💳 *Payment:* UPI / QR Code
━━━━━━━━━━━━━━━━━
Thank you for shopping with ${storeName}! 🌸
`.trim();

  return { message, orderId, waNumber };
}

/* ── PLACE ORDER ─────────────────────────────────────────── */
export async function placeOrderViaWhatsApp(formData) {
  const result = await buildWhatsAppMessage(formData);
  if (!result) { showToast('Your cart is empty', 'error'); return null; }

  const orderData = {
    id:      result.orderId,
    date:    new Date().toISOString(),
    items:   getCart(),
    totals:  getCartTotals(getCart(), getAppliedCoupon()),
    address: formData,
    status:  'confirmed',
  };

  const orders = LS.get('aarohi_orders') || [];
  orders.unshift(orderData);
  LS.set('aarohi_orders', orders);

  const encoded = encodeURIComponent(result.message);
  window.open(`https://wa.me/${result.waNumber}?text=${encoded}`, '_blank');

  clearCart();
  return result.orderId;
}

/* ── GLOBAL HANDLERS (for onclick in HTML) ───────────────── */
window.cartQtyChange = function(key, delta) {
  updateQuantity(key, delta);
  renderCartPage();
};

window.cartRemoveItem = function(key) {
  removeFromCart(key);
  renderCartPage();
  showToast('Item removed from cart', 'info');
};

window.applyCouponBtn = async function() {
  const input = document.getElementById('coupon-input');
  if (input) await applyCoupon(input.value.trim());
};