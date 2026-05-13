// ============================================================
//   AAROHI FASHION — firebase.js
//   Firebase used for:
//     • products (Firestore collection: "products")
//     • site config — coupons, hero, banner, categories,
//       tags, sizes, settings, homepage sections
//       (Firestore collection: "siteConfig", one doc per key)
//
//   Orders → localStorage (WhatsApp-based, no server needed)
//   Wishlist / Cart → localStorage (device-local)
//
//   SETUP:
//   1. https://console.firebase.google.com → New project
//   2. Firestore Database → Create (test mode is fine)
//   3. Project Settings → Web App → copy config below
// ============================================================

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── REPLACE WITH YOUR FIREBASE CONFIG ──────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBuW8A24NcY9neNmjo6HPKAKGvoylRYZAQ",
  authDomain:        "krishna-fashion-94f72.firebaseapp.com",
  projectId:         "krishna-fashion-94f72",
  storageBucket:     "krishna-fashion-94f72.firebasestorage.app",
  messagingSenderId: "870339896098",
  appId:             "1:870339896098:web:654ff8df4a9b34a9227b7b"
};

const app       = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

// ── SITE CONFIG HELPERS ─────────────────────────────────────
// All non-product admin data lives in Firestore under
// collection "siteConfig", one document per key.
// Keys used:
//   coupons                 → { list: [...] }
//   settings                → { storeName, whatsappNumber, adminPassword, ... }
//
//   — Hero —
//   heroImage               → { url: "..." }
//   heroCards               → { card1: { icon, title, sub }, card2: { icon, title, sub } }
//   heroContent             → { eyebrow, titleEm, desc, ctaPrimaryText, ctaPrimaryLink,
//                               ctaSecondaryText, ctaSecondaryLink, trustBadge1/2/3 }
//
//   — Homepage sections —
//   topbar                  → { visible, text, code, discount }
//   socialProof             → { items: [{ icon, text }, ...] }
//   categoriesSection       → { sectionTitle, sectionSubtitle }
//   categoryImages          → { map: { [catName]: url }, counts: { [catName]: "24" } }
//   homepageSections        → { featuredTag, newTag, visibleCategories: [...] }
//   featuredProductsSection → { sectionTitle, sectionSubtitle }
//   newArrivalsSection      → { sectionTitle, sectionSubtitle }
//   festiveBanner           → { visible, eyebrow, title, desc, code, codeDesc,
//                               ctaText, ctaLink, countdownDate }
//   reviews                 → { visible, sectionTitle, sectionSubtitle,
//                               items: [{ text, name, city, rating }, ...] }
//   instagram               → { visible, hashtag, subtitle, profileLink,
//                               images: [...urls] }
//   newsletter              → { title, subtitle, btnText, note }
//   footerContent           → { about, phone, email, address, copyright,
//                               whatsappLabel, socials: [{ icon, href, label }, ...] }
//
//   — Products (Firestore collection: "products", not siteConfig) —
//   categories              → { list: [...] }
//   tags                    → { list: [...] }
//   sizes                   → { list: [...] }

const CONFIG_COL = 'siteConfig';

/**
 * Read a siteConfig document. Returns the stored data object,
 * or `null` if the document doesn't exist yet.
 */
export async function getConfig(key) {
  try {
    const snap = await getDoc(doc(db, CONFIG_COL, key));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn(`[siteConfig] getConfig(${key}) failed:`, err.message);
    return null;
  }
}

/**
 * Write (merge) data into a siteConfig document.
 */
export async function setConfig(key, data) {
  await setDoc(doc(db, CONFIG_COL, key), data, { merge: true });
}