/**
 * Oshin "Try On Yourself" — Product Page Widget
 * Drop-in script for Shopify product pages.
 * Adds a "Try On Yourself" button that opens a try-on modal.
 *
 * Usage:
 * <script src="https://your-server.com/widget/tryon-button.js" data-api="https://your-server.com"></script>
 */
(function () {
  "use strict";

  const FONTS = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap";

  const CSS = `
    @import url('${FONTS}');

    .otn-widget-wrap {
      margin-top: 12px;
    }
    .otn-btn {
      width: 100%;
      padding: 10px 20px;
      background: #1a1714;
      color: white;
      border: 1.5px solid #1a1714;
      border-radius: 100px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .otn-btn:hover {
      background: #2a2724;
    }
    .otn-btn-star {
      color: white;
      display: inline-flex;
    }
    .otn-btn-badge {
      font-size: 9px;
      background: #8b3a1f;
      color: white;
      padding: 3px 7px;
      border-radius: 100px;
      letter-spacing: 0.1em;
      font-weight: 600;
      transition: all 0.25s ease;
    }
    .otn-btn-hint {
      margin-top: 8px;
      font-size: 11px;
      color: #9a948c;
      letter-spacing: 0.02em;
      text-align: center;
      font-family: 'Inter', sans-serif;
    }

    /* ─── Modal Overlay ─── */
    .otn-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(15, 15, 15, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      opacity: 0; transition: opacity 0.3s ease;
    }
    .otn-overlay.visible { opacity: 1; }

    /* ─── Modal ─── */
    .otn-modal {
      background: #faf8f5;
      border-radius: 12px;
      max-width: 440px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0,0,0,0.25);
      transform: translateY(20px);
      transition: transform 0.3s ease;
      position: relative;
    }
    .otn-overlay.visible .otn-modal { transform: translateY(0); }

    .otn-close {
      position: absolute; top: 16px; right: 16px; z-index: 2;
      width: 32px; height: 32px; border: none; border-radius: 50%;
      background: rgba(0,0,0,0.06); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: #7a746b; transition: all 0.2s;
    }
    .otn-close:hover { background: rgba(0,0,0,0.12); color: #1a1714; }

    /* ─── Product Header ─── */
    .otn-product {
      display: flex; gap: 14px; padding: 24px 24px 0; align-items: center;
    }
    .otn-product img {
      width: 56px; height: 56px; object-fit: cover; border-radius: 6px;
      border: 1px solid #e0d8cc;
    }
    .otn-product-info { flex: 1; }
    .otn-product-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px; font-weight: 400; color: #1a1714;
      margin: 0 0 2px; line-height: 1.2;
    }
    .otn-product-price {
      font-family: 'Inter', sans-serif;
      font-size: 12px; color: #7a746b; font-weight: 400;
    }

    /* ─── Steps ─── */
    .otn-body { padding: 24px; }

    .otn-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px; font-weight: 400; color: #1a1714;
      text-align: center; margin: 0 0 6px; line-height: 1.3;
    }
    .otn-title em { font-style: italic; color: #9b6a4a; }
    .otn-subtitle {
      text-align: center; font-size: 12px; color: #7a746b;
      margin: 0 0 24px; font-weight: 300;
    }

    /* ─── Upload Area ─── */
    .otn-upload {
      border: 1.5px dashed #d0c8ba;
      border-radius: 10px;
      padding: 36px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s ease;
      background: white;
    }
    .otn-upload:hover { border-color: #9b6a4a; }
    .otn-upload.dragover { border-color: #1a1714; background: #f3efe9; }
    .otn-upload svg { width: 36px; height: 36px; color: #9b6a4a; margin-bottom: 12px; stroke-width: 1; }
    .otn-upload-text {
      font-size: 14px; font-weight: 500; color: #1a1714; margin-bottom: 4px;
    }
    .otn-upload-hint {
      font-size: 11px; color: #7a746b; font-weight: 300;
    }

    /* ─── Guidelines ─── */
    .otn-guidelines {
      margin-top: 20px; padding: 14px 16px;
      background: white; border-radius: 8px; border: 1px solid #e0d8cc;
    }
    .otn-guidelines ul {
      margin: 0; padding: 0; list-style: none;
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    }
    .otn-guidelines li {
      font-size: 11px; color: #7a746b; font-weight: 300;
      padding-left: 14px; position: relative;
    }
    .otn-guidelines li::before {
      content: ''; position: absolute; left: 0; top: 6px;
      width: 5px; height: 5px; border-radius: 50%;
    }
    .otn-guidelines li.do::before { background: #4a7c59; }
    .otn-guidelines li.dont::before { background: #c0392b; }

    /* ─── Preview ─── */
    .otn-preview { text-align: center; margin-bottom: 16px; }
    .otn-preview img {
      max-width: 100%; max-height: 280px; border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .otn-retake {
      margin-top: 10px; font-size: 12px; color: #9b6a4a;
      background: none; border: none; cursor: pointer;
      text-decoration: underline; font-weight: 400;
    }

    /* ─── Loading ─── */
    .otn-loading { text-align: center; padding: 40px 0; }
    .otn-spinner {
      width: 36px; height: 36px; border: 2px solid #e0d8cc;
      border-top-color: #1a1714; border-radius: 50%;
      animation: otn-spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes otn-spin { to { transform: rotate(360deg); } }
    .otn-loading-text {
      font-family: 'Playfair Display', serif;
      font-size: 16px; color: #1a1714; font-style: italic;
    }
    .otn-loading-sub {
      font-size: 11px; color: #9b6a4a; margin-top: 8px;
      background: rgba(155,106,74,0.08); display: inline-block;
      padding: 4px 14px; border-radius: 100px;
    }

    /* ─── Result ─── */
    .otn-result { text-align: center; }
    .otn-result img {
      width: 100%; border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .otn-result-actions { display: flex; gap: 10px; }
    .otn-atc {
      flex: 1; padding: 14px; background: #1a1714; color: white;
      border: none; border-radius: 0; font-family: 'Inter', sans-serif;
      font-size: 12px; font-weight: 600; letter-spacing: 0.1em;
      text-transform: uppercase; cursor: pointer; transition: background 0.2s;
    }
    .otn-atc:hover { background: #2a2a2a; }
    .otn-download {
      padding: 14px 18px; background: transparent; border: 1.5px solid #e0d8cc;
      border-radius: 0; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .otn-download:hover { border-color: #1a1714; }
    .otn-download svg { width: 16px; height: 16px; color: #1a1714; }

    .otn-tryagain {
      margin-top: 12px; font-size: 12px; color: #9b6a4a;
      background: none; border: none; cursor: pointer;
      text-decoration: underline; font-weight: 400;
    }

    /* ─── Error ─── */
    .otn-error {
      text-align: center; padding: 20px;
      color: #c0392b; font-size: 13px;
    }

    .otn-file-input { display: none; }
  `;

  // ─── Widget Logic ──────────────────────────────────────

  const TryOnButton = {
    apiBase: "",
    productName: "",
    productPrice: "",
    productImage: "",
    productHandle: "",
    productUrl: "",
    userBlob: null,
    userPreview: null,
    overlay: null,

    init() {
      const script = document.currentScript || document.querySelector("script[data-api]");
      if (script && script.dataset.api) this.apiBase = script.dataset.api;

      // Inject CSS
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);

      // Detect product info from Shopify page
      this.detectProduct();

      // Insert button
      this.insertButton();
    },

    detectProduct() {
      // Shopify meta tags
      const metaTitle = document.querySelector('meta[property="og:title"]');
      const metaPrice = document.querySelector('meta[property="og:price:amount"]');
      const metaImage = document.querySelector('meta[property="og:image"]');
      const metaUrl = document.querySelector('meta[property="og:url"]');

      this.productName = metaTitle?.content || document.title || "This outfit";
      this.productPrice = metaPrice?.content || "";
      this.productImage = metaImage?.content || "";
      this.productUrl = metaUrl?.content || window.location.href;
      // Try URL path first, then og:url meta tag
      const urlPath = window.location.pathname;
      const ogUrl = metaUrl?.content || "";
      this.productHandle = urlPath.split("/products/")[1]?.split("?")[0]
        || ogUrl.split("/products/")[1]?.split("?")[0]
        || "";
    },

    insertButton() {
      // Find the Add to Cart button and insert after it
      const addToCart = document.querySelector(
        'form[action="/cart/add"] button[type="submit"], ' +
        '.product-form__submit, ' +
        'button[name="add"], ' +
        '.shopify-payment-button, ' +
        '.product-form__buttons'
      );

      const container = addToCart?.parentElement || document.querySelector('.product-form');
      if (!container) {
        console.warn("[TryOn] Could not find product form to insert button");
        return;
      }

      const wrap = document.createElement("div");
      wrap.className = "otn-widget-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "otn-btn";
      btn.innerHTML = `
        <span class="otn-btn-star">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"/>
          </svg>
        </span>
        Try On Yourself
        <span class="otn-btn-badge">AI</span>
      `;
      btn.onclick = () => this.openModal();

      const hint = document.createElement("p");
      hint.className = "otn-btn-hint";
      hint.textContent = "See how this looks on you in seconds";

      wrap.append(btn, hint);
      container.appendChild(wrap);
    },

    // ─── Modal ────────────────────────────────────────────

    openModal() {
      this.userBlob = null;
      this.userPreview = null;

      this.overlay = document.createElement("div");
      this.overlay.className = "otn-overlay";
      this.overlay.onclick = (e) => { if (e.target === this.overlay) this.closeModal(); };

      const modal = document.createElement("div");
      modal.className = "otn-modal";

      const close = document.createElement("button");
      close.className = "otn-close";
      close.innerHTML = "&times;";
      close.onclick = () => this.closeModal();

      this.modalContent = document.createElement("div");
      modal.append(close, this.modalContent);
      this.overlay.appendChild(modal);
      document.body.appendChild(this.overlay);

      requestAnimationFrame(() => this.overlay.classList.add("visible"));

      this.showUploadStep();
    },

    closeModal() {
      this.overlay.classList.remove("visible");
      setTimeout(() => this.overlay.remove(), 300);
    },

    // ─── Upload Step ──────────────────────────────────────

    showUploadStep() {
      this.modalContent.innerHTML = "";

      // Product header
      const product = document.createElement("div");
      product.className = "otn-product";
      product.innerHTML = `
        ${this.productImage ? `<img src="${this.productImage}" alt="">` : ""}
        <div class="otn-product-info">
          <div class="otn-product-name">${this.productName}</div>
          ${this.productPrice ? `<div class="otn-product-price">Rs. ${this.productPrice}</div>` : ""}
        </div>
      `;

      const body = document.createElement("div");
      body.className = "otn-body";

      const title = document.createElement("div");
      title.className = "otn-title";
      title.innerHTML = `See it <em>on you</em>`;

      const subtitle = document.createElement("div");
      subtitle.className = "otn-subtitle";
      subtitle.textContent = "Upload a full body photo and we'll dress you in this piece";

      // Upload area
      const upload = document.createElement("div");
      upload.className = "otn-upload";
      upload.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
        </svg>
        <div class="otn-upload-text">Drop your photo here</div>
        <div class="otn-upload-hint">or click to browse &middot; JPG, PNG, WebP</div>
      `;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.className = "otn-file-input";
      fileInput.onchange = (e) => this.handleFile(e.target.files[0]);

      upload.onclick = () => fileInput.click();
      upload.ondragover = (e) => { e.preventDefault(); upload.classList.add("dragover"); };
      upload.ondragleave = () => upload.classList.remove("dragover");
      upload.ondrop = (e) => {
        e.preventDefault();
        upload.classList.remove("dragover");
        if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
      };

      // Guidelines
      const guidelines = document.createElement("div");
      guidelines.className = "otn-guidelines";
      guidelines.innerHTML = `
        <ul>
          <li class="do">Stand straight, full body visible</li>
          <li class="do">Face camera directly</li>
          <li class="do">Good lighting, clear photo</li>
          <li class="dont">Avoid cropped or blurry photos</li>
        </ul>
      `;

      body.append(title, subtitle, upload, fileInput, guidelines);
      this.modalContent.append(product, body);
    },

    handleFile(file) {
      if (!file) return;
      this.userBlob = file;
      this.userPreview = URL.createObjectURL(file);
      this.showPreviewStep();
    },

    // ─── Preview Step ─────────────────────────────────────

    showPreviewStep() {
      this.modalContent.innerHTML = "";

      const product = document.createElement("div");
      product.className = "otn-product";
      product.innerHTML = `
        ${this.productImage ? `<img src="${this.productImage}" alt="">` : ""}
        <div class="otn-product-info">
          <div class="otn-product-name">${this.productName}</div>
          ${this.productPrice ? `<div class="otn-product-price">Rs. ${this.productPrice}</div>` : ""}
        </div>
      `;

      const body = document.createElement("div");
      body.className = "otn-body";

      const preview = document.createElement("div");
      preview.className = "otn-preview";
      const img = document.createElement("img");
      img.src = this.userPreview;
      preview.appendChild(img);

      const retake = document.createElement("button");
      retake.className = "otn-retake";
      retake.textContent = "Choose a different photo";
      retake.onclick = () => this.showUploadStep();
      preview.appendChild(retake);

      const tryBtn = document.createElement("button");
      tryBtn.className = "otn-atc";
      tryBtn.style.cssText = "width:100%;margin-top:16px";
      tryBtn.textContent = "TRY IT ON";
      tryBtn.onclick = () => this.startTryOn();

      body.append(preview, tryBtn);
      this.modalContent.append(product, body);
    },

    // ─── Try-On Step ──────────────────────────────────────

    async startTryOn() {
      // Show loading
      this.modalContent.innerHTML = "";
      const body = document.createElement("div");
      body.className = "otn-body";
      body.innerHTML = `
        <div class="otn-loading">
          <div class="otn-spinner"></div>
          <div class="otn-loading-text">Creating your look...</div>
          <div class="otn-loading-sub">This takes 15-20 seconds</div>
        </div>
      `;
      this.modalContent.appendChild(body);

      try {
        const formData = new FormData();
        formData.append("user_image", this.userBlob, "photo.jpg");
        formData.append("outfit_id", this.productHandle);
        formData.append("mode", "quality");
        formData.append("session_id", this.getSessionId());

        const startRes = await fetch(`${this.apiBase}/api/tryon`, {
          method: "POST",
          body: formData,
        });

        if (!startRes.ok) {
          const err = await startRes.json().catch(() => ({}));
          throw new Error(err.detail || "Try-on failed");
        }

        const startData = await startRes.json();

        // Poll for result
        const result = await this.poll(startData.id);

        if (result.output && result.output.length > 0) {
          this.showResult(result.output[0]);
        } else {
          throw new Error(result.error || "Try-on failed. Please try a different photo.");
        }
      } catch (e) {
        this.showError(e.message);
      }
    },

    async poll(predictionId) {
      for (let i = 0; i < 60; i++) {
        const res = await fetch(`${this.apiBase}/api/tryon/status/${predictionId}`);
        if (!res.ok) { await sleep(2000); continue; }
        const data = await res.json();
        if (data.status === "completed") return data;
        if (data.status === "failed" || data.status === "canceled") {
          const err = typeof data.error === "object" ? JSON.stringify(data.error) : (data.error || "Failed");
          return { error: err };
        }
        await sleep(2000);
      }
      return { error: "Timed out" };
    },

    // ─── Result Step ──────────────────────────────────────

    showResult(imageUrl) {
      this.modalContent.innerHTML = "";

      const body = document.createElement("div");
      body.className = "otn-body";

      const title = document.createElement("div");
      title.className = "otn-title";
      title.innerHTML = `Here's <em>${this.productName}</em> on you`;

      const result = document.createElement("div");
      result.className = "otn-result";
      const img = document.createElement("img");
      img.src = imageUrl;
      result.appendChild(img);

      // Actions
      const actions = document.createElement("div");
      actions.className = "otn-result-actions";

      const atcBtn = document.createElement("button");
      atcBtn.className = "otn-atc";
      atcBtn.textContent = `ADD TO CART — Rs. ${this.productPrice || ""}`;
      atcBtn.onclick = () => {
        // Redirect to product page or trigger Shopify add-to-cart
        if (this.productUrl) window.location.href = this.productUrl;
      };

      const dlBtn = document.createElement("button");
      dlBtn.className = "otn-download";
      dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3"/></svg>`;
      dlBtn.onclick = async () => {
        const r = await fetch(imageUrl);
        const b = await r.blob();
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryon-${this.productHandle}.png`;
        a.click();
        URL.revokeObjectURL(url);
      };

      actions.append(atcBtn, dlBtn);

      const tryAgain = document.createElement("button");
      tryAgain.className = "otn-tryagain";
      tryAgain.textContent = "Try a different photo";
      tryAgain.onclick = () => this.showUploadStep();

      body.append(title, result, actions, tryAgain);
      this.modalContent.appendChild(body);
    },

    showError(message) {
      this.modalContent.innerHTML = "";
      const body = document.createElement("div");
      body.className = "otn-body";
      body.innerHTML = `
        <div class="otn-error">
          <p style="font-weight:600;margin:0 0 8px">Try-on failed</p>
          <p style="margin:0 0 16px;font-size:12px;color:#7a746b">${message}</p>
        </div>
      `;
      const retryBtn = document.createElement("button");
      retryBtn.className = "otn-atc";
      retryBtn.style.width = "100%";
      retryBtn.textContent = "TRY AGAIN";
      retryBtn.onclick = () => this.showUploadStep();
      body.appendChild(retryBtn);
      this.modalContent.appendChild(body);
    },

    getSessionId() {
      let sid = localStorage.getItem("otn_session");
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem("otn_session", sid);
      }
      return sid;
    },
  };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── Auto-init ─────────────────────────────────────────

  function init() {
    TryOnButton.init();
    window.OshinTryOn = TryOnButton;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
