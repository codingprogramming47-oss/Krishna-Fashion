// ============================================================
//   AAROHI FASHION — products.js
//   Products    → Firestore collection "products"
//   Categories, Tags, Sizes → Firestore siteConfig docs
//   Wishlist / Cart badge   → localStorage (device-local)
// ============================================================

import { formatCurrency, calcDiscount, LS, showToast } from './utils.js';
import { addToCart } from './cart.js';
import { db, getConfig, setConfig } from './firebase.js';
import {
  collection, getDocs, getDoc, doc,
  addDoc, updateDoc, deleteDoc, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PRODUCTS_COL = 'products';

/* ── PRODUCT CACHE ───────────────────────────────────────── */
let _cachedProducts = null;
export function invalidateProductCache() { _cachedProducts = null; }

/* ── GET ALL PRODUCTS ────────────────────────────────────── */
export async function getProducts() {
  if (_cachedProducts) return _cachedProducts;
  try {
    const q    = query(collection(db, PRODUCTS_COL), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    _cachedProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return _cachedProducts;
  } catch (err) {
    console.warn('Firestore unavailable:', err.message);
    return [];
  }
}

/* ── GET SINGLE PRODUCT ──────────────────────────────────── */
export async function getProductById(id) {
  if (_cachedProducts) {
    const found = _cachedProducts.find(p => p.id === id);
    if (found) return found;
  }
  try {
    const snap = await getDoc(doc(db, PRODUCTS_COL, id));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.warn('Could not fetch product:', err.message);
  }
  return null;
}

/* ── ADD PRODUCT (admin) ─────────────────────────────────── */
export async function addProduct(data) {
  const docRef = await addDoc(collection(db, PRODUCTS_COL), {
    ...data,
    createdAt: new Date().toISOString(),
    rating: data.rating || 0,
    reviewCount: data.reviewCount || 0,
  });
  invalidateProductCache();
  return docRef.id;
}

/* ── UPDATE PRODUCT (admin) ──────────────────────────────── */
export async function updateProduct(id, data) {
  await updateDoc(doc(db, PRODUCTS_COL, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  invalidateProductCache();
}

/* ── DELETE PRODUCT (admin) ──────────────────────────────── */
export async function deleteProduct(id) {
  await deleteDoc(doc(db, PRODUCTS_COL, id));
  invalidateProductCache();
}

/* ── SEED FIRESTORE (run once from admin) ────────────────── */
export async function seedProducts() {
  showToast('No sample products to seed. Add products manually via the admin panel.', 'info');
}

/* ── RENDER PRODUCT CARD ─────────────────────────────────── */
export function renderProductCard(product) {
  const disc     = calcDiscount(product.originalPrice, product.price);
  const isBest   = product.tags?.includes('Best Seller');
  const isNew    = product.tags?.includes('New');
  const isLim    = product.tags?.includes('Limited');
  const lowStock = product.stock > 0 && product.stock <= 5;

  const badges = [
    disc > 0  ? `<span class="badge badge-sale">${disc}% OFF</span>` : '',
    isBest    ? `<span class="badge badge-bestseller">Best Seller</span>` : '',
    isNew     ? `<span class="badge badge-new">New</span>` : '',
    isLim     ? `<span class="badge badge-limited">Limited</span>` : ''
  ].filter(Boolean).join('');

  const wishlist = getWishlist();
  const inWish   = wishlist.includes(product.id);

  return `
  <div class="product-card" data-id="${product.id}">
    <div class="product-card-img">
      <a href="product.html?id=${product.id}">
        <img src="${product.images?.[0] || 'https://placehold.co/400x533/f5edd6/7b1d2e?text=Krishna'}"
             data-hover="${product.images?.[1] || product.images?.[0]}"
             alt="${product.name}" loading="lazy"
             onerror="this.src='https://placehold.co/400x533/f5edd6/7b1d2e?text=Krishna'">
      </a>
      <div class="product-card-badges">${badges}</div>
      <button class="product-card-wishlist ${inWish ? 'active' : ''}"
              data-id="${product.id}"
              onclick="toggleWishlistCard('${product.id}', this)"
              title="Save to Wishlist">
        <i class="fa-${inWish ? 'solid' : 'regular'} fa-heart"></i>
      </button>
      <button class="product-card-quick" onclick="quickAddToCart('${product.id}')">
        <i class="fa-solid fa-bag-shopping"></i> Quick Add
      </button>
    </div>
    <div class="product-card-body">
      <div class="product-card-cat">${product.category}</div>
      <a href="product.html?id=${product.id}" class="product-card-name">${product.name}</a>
      <div class="product-card-price">
        <span class="price-current">${formatCurrency(product.price)}</span>
        ${product.originalPrice ? `<span class="price-original">${formatCurrency(product.originalPrice)}</span>` : ''}
        ${disc > 0 ? `<span class="price-discount">Save ${disc}%</span>` : ''}
      </div>
      ${lowStock ? `<div class="product-card-stock"><i class="fa-solid fa-fire"></i> Only ${product.stock} left!</div>` : ''}
    </div>
    <div class="product-card-cta">
      <a href="product.html?id=${product.id}" class="btn btn-outline btn-sm">View</a>
      <button class="btn btn-primary btn-sm" onclick="quickAddToCart('${product.id}')">
        <i class="fa-solid fa-bag-shopping"></i> Add
      </button>
    </div>
  </div>`;
}

/* ── IMAGE HOVER ─────────────────────────────────────────── */
export function initProductImageHover() {
  document.querySelectorAll('.product-card-img img[data-hover]').forEach(img => {
    const original = img.src;
    const hover    = img.dataset.hover;
    if (!hover || hover === original) return;
    img.addEventListener('mouseenter', () => { img.src = hover; });
    img.addEventListener('mouseleave', () => { img.src = original; });
  });
}

/* ── WISHLIST (localStorage — device-local, no login needed) */
export function getWishlist()      { return JSON.parse(localStorage.getItem('aarohi_wishlist') || '[]'); }
export function saveWishlist(list) { localStorage.setItem('aarohi_wishlist', JSON.stringify(list)); }
export function toggleWishlist(id) {
  const list = getWishlist();
  const idx  = list.indexOf(id);
  if (idx > -1) { list.splice(idx, 1); saveWishlist(list); return false; }
  list.push(id); saveWishlist(list); return true;
}

export function initWishlistUI() {
  initProductImageHover();

  window.toggleWishlistCard = function(id, btn) {
    const list = getWishlist();
    const idx  = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
      showToast('Removed from wishlist', 'info');
    } else {
      list.push(id);
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
      showToast('💗 Saved to wishlist!', 'success');
    }
    saveWishlist(list);
  };

  window.quickAddToCart = async function(id) {
    const product = await getProductById(id);
    if (!product) return;
    addToCart({ ...product, selectedSize: product.sizes?.[1] || product.sizes?.[0], quantity: 1 });
    showToast(`"${product.name}" added to cart!`, 'success');
    updateCartBadge();
  };
}

/* ── CART BADGE ──────────────────────────────────────────── */
export function updateCartBadge() {
  const cart  = JSON.parse(localStorage.getItem('aarohi_cart') || '[]');
  const total = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.style.display = total > 0 ? 'flex' : 'none';
    b.textContent   = total > 99 ? '99+' : total;
  });
}

/* ── FILTER & SORT ───────────────────────────────────────── */
export function filterProducts(products, filters = {}) {
  let result = [...products];
  if (filters.category) result = result.filter(p => p.category === filters.category);
  if (filters.tag)      result = result.filter(p => p.tags?.includes(filters.tag));
  if (filters.minPrice) result = result.filter(p => p.price >= filters.minPrice);
  if (filters.maxPrice) result = result.filter(p => p.price <= filters.maxPrice);
  if (filters.sizes?.length) result = result.filter(p => filters.sizes.some(s => p.sizes?.includes(s)));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }
  return result;
}

export function sortProducts(products, sortBy = 'popular') {
  const sorted = [...products];
  switch (sortBy) {
    case 'price-asc':  return sorted.sort((a,b) => a.price - b.price);
    case 'price-desc': return sorted.sort((a,b) => b.price - a.price);
    case 'rating':     return sorted.sort((a,b) => (b.rating||0) - (a.rating||0));
    case 'new':        return sorted.sort((a,b) => (b.tags?.includes('New')?1:0) - (a.tags?.includes('New')?1:0));
    case 'discount':   return sorted.sort((a,b) => calcDiscount(b.originalPrice,b.price) - calcDiscount(a.originalPrice,a.price));
    default:           return sorted.sort((a,b) => (b.tags?.includes('Best Seller')?1:0) - (a.tags?.includes('Best Seller')?1:0));
  }
}

// ── FIRESTORE-BACKED getters (async) ──────────────────────────
// Default values used when the Firestore doc doesn't exist yet
// (i.e. admin has never saved custom values). These mirror what
// the admin UI shows and what the shop expects.
const DEFAULT_CATEGORIES = [
  'Co-ord Sets', 'Dresses', 'Festive Collection',
  'Tops & Tunics', 'Wedding Wear',
];
const DEFAULT_TAGS  = ['Best Seller', 'New', 'Sale', 'Limited'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export async function getCategories() {
  const data = await getConfig('categories');
  // Only fall back to defaults when the doc has never been saved
  return data?.list?.length ? data.list : DEFAULT_CATEGORIES;
}
export async function saveCategories(list) {
  await setConfig('categories', { list });
}

export async function getAvailableSizes() {
  const data = await getConfig('sizes');
  return data?.list?.length ? data.list : DEFAULT_SIZES;
}
export async function saveSizes(list) {
  await setConfig('sizes', { list });
}

export async function getAvailableTags() {
  const data = await getConfig('tags');
  return data?.list?.length ? data.list : DEFAULT_TAGS;
}
export async function saveTags(list) {
  await setConfig('tags', { list });
}