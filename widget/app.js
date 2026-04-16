/**
 * Virtual Try-On & Styling Assistant Widget v2.0
 * Full-featured: Questionnaire, Recommendations, Try-On, Beauty, History, Comparisons
 */
(function () {
  "use strict";

  const VTO = {
    apiBase: "",
    containerId: "vto-widget",
    mode: "quality",

    // State
    currentTab: "quiz",
    sessionId: null,
    preferences: {},

    // Quiz
    quizSteps: [],
    quizIndex: 0,
    quizAnswers: {},

    // Catalog
    outfits: [],
    categories: [],
    selectedCategory: null,
    selectedOutfits: [], // support multi-select for comparison
    page: 1,
    totalPages: 1,
    recommendedOutfits: [],

    // Photo
    userImageBlob: null,
    userImagePreview: null,
    cameraStream: null,

    // Beauty
    hairstyles: [],
    hairColors: [],
    makeupLooks: [],
    selectedHairstyle: null,
    selectedHairColor: null,
    selectedMakeup: null,

    // Try-on
    predictionId: null,
    resultImages: null,
    resultError: null,

    // History
    history: [],
    compareSelection: new Set(),

    // ─── Init ──────────────────────────────────────────────

    init(config = {}) {
      Object.assign(this, config);
      this.container = document.getElementById(this.containerId);
      if (!this.container) return;

      // Load or create session
      this.sessionId = localStorage.getItem("vto_session_id");
      if (!this.sessionId) {
        this.sessionId = crypto.randomUUID();
        localStorage.setItem("vto_session_id", this.sessionId);
      }

      // Load saved preferences
      const savedPrefs = localStorage.getItem("vto_preferences");
      if (savedPrefs) {
        this.preferences = JSON.parse(savedPrefs);
        this.currentTab = "outfits"; // skip quiz if already done
      }

      this.render();
      this.loadData();
    },

    async loadData() {
      await Promise.all([
        this.loadQuiz(),
        this.loadCategories(),
        this.loadHistory(),
      ]);
      if (this.preferences && Object.keys(this.preferences).length > 0) {
        await this.loadRecommendations();
        this._showRecommended = this.recommendedOutfits.length > 0;
      }
      this.renderBody();
    },

    // ─── API ───────────────────────────────────────────────

    async api(path, opts = {}) {
      const res = await fetch(`${this.apiBase}${path}`, opts);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "API error");
      }
      return res.json();
    },

    async loadQuiz() {
      try {
        const data = await this.api("/api/questionnaire");
        this.quizSteps = data.steps;
      } catch (e) { console.error("[VTO] Quiz load error:", e); }
    },

    async loadCategories() {
      try {
        const data = await this.api("/api/categories");
        this.categories = data.categories;
        await this.loadOutfits();
      } catch (e) { console.error("[VTO] Categories error:", e); }
    },

    async loadOutfits() {
      try {
        const catParam = this.selectedCategory ? `&category=${encodeURIComponent(this.selectedCategory)}` : "";
        const data = await this.api(`/api/outfits?page=${this.page}&per_page=24${catParam}`);
        this.outfits = data.outfits;
        this.totalPages = data.total_pages;
      } catch (e) { console.error("[VTO] Outfits error:", e); }
    },

    async loadRecommendations() {
      try {
        const data = await this.api(`/api/recommendations?session_id=${this.sessionId}&limit=30`);
        this.recommendedOutfits = data.outfits;
      } catch (e) { console.error("[VTO] Recommendations error:", e); }
    },

    async loadBeauty() {
      try {
        const [hair, makeup] = await Promise.all([
          this.api("/api/hairstyles"),
          this.api("/api/makeup"),
        ]);
        this.hairstyles = hair.hairstyles;
        this.hairColors = hair.colors;
        this.makeupLooks = makeup.looks;
      } catch (e) { console.error("[VTO] Beauty error:", e); }
    },

    async loadHistory() {
      try {
        const data = await this.api(`/api/history/${this.sessionId}`);
        this.history = data.history;
      } catch (e) { console.error("[VTO] History error:", e); }
    },

    // ─── Render ────────────────────────────────────────────

    render() {
      this.container.innerHTML = "";
      this.container.className = "vto-widget";

      const header = el("div", "vto-header");
      header.innerHTML = `<h2>Style Studio</h2><span class="vto-badge">Virtual Try-On</span>`;

      this.navEl = el("div", "vto-nav");
      this.bodyEl = el("div", "vto-body");
      this.actionsEl = el("div", "vto-actions");

      this.container.append(header, this.navEl, this.bodyEl, this.actionsEl);
      this.renderNav();
      this.renderBody();
    },

    renderNav() {
      const tabs = [
        { id: "quiz", label: "Style Quiz" },
        { id: "outfits", label: "Outfits" },
        { id: "photo", label: "Your Photo" },
        { id: "tryon", label: "Try On" },
        { id: "history", label: "History" },
      ];
      this.navEl.innerHTML = tabs.map(t =>
        `<button class="vto-nav-btn${this.currentTab === t.id ? ' active' : ''}" data-tab="${t.id}">
          ${t.label}
        </button>`
      ).join("");

      this.navEl.querySelectorAll(".vto-nav-btn").forEach(btn => {
        btn.onclick = () => {
          this.currentTab = btn.dataset.tab;
          this.renderNav();
          this.renderBody();
        };
      });
    },

    renderBody() {
      this.actionsEl.innerHTML = "";
      switch (this.currentTab) {
        case "quiz": this.renderQuiz(); break;
        case "outfits": this.renderOutfits(); break;
        case "photo": this.renderPhoto(); break;
        // beauty tab removed
        case "tryon": this.renderTryOn(); break;
        case "history": this.renderHistory(); break;
      }
    },

    // ─── Tab 1: Quiz ───────────────────────────────────────

    renderQuiz() {
      this.bodyEl.innerHTML = "";
      const quiz = el("div", "vto-quiz");

      if (!this.quizSteps.length) {
        quiz.innerHTML = `<div class="vto-loading"><div class="vto-spinner"></div><p>Loading questionnaire...</p></div>`;
        this.bodyEl.appendChild(quiz);
        return;
      }

      // If quiz already completed, show summary
      if (this.preferences && Object.keys(this.preferences).length > 0 && this.quizIndex >= this.quizSteps.length) {
        this.renderQuizComplete(quiz);
        this.bodyEl.appendChild(quiz);
        return;
      }

      const step = this.quizSteps[this.quizIndex];

      // Progress
      const progress = el("div", "vto-quiz-progress");
      this.quizSteps.forEach((_, i) => {
        const dot = el("div", `vto-quiz-dot${i < this.quizIndex ? ' done' : ''}${i === this.quizIndex ? ' current' : ''}`);
        progress.appendChild(dot);
      });

      // Section header (if this step starts a new section)
      if (step.section) {
        const sectionHeader = el("div", "");
        sectionHeader.style.cssText = "text-align:center;margin-bottom:8px;font-size:11px;color:var(--vto-accent);text-transform:uppercase;letter-spacing:0.15em;font-weight:600";
        sectionHeader.textContent = step.section;
        quiz.appendChild(sectionHeader);
        if (step.section_intro) {
          const intro = el("div", "");
          intro.style.cssText = "text-align:center;margin-bottom:16px;font-size:13px;color:var(--vto-text-muted);font-style:italic";
          intro.textContent = step.section_intro;
          quiz.appendChild(intro);
        }
      }

      // Question header
      const header = el("div", "vto-quiz-header");
      const optionalTag = step.optional ? ' <span style="font-size:11px;color:var(--vto-text-muted);font-weight:400;text-transform:uppercase;letter-spacing:0.08em">Optional</span>' : '';
      const maxTag = step.max ? ` <span style="font-size:12px;color:var(--vto-accent)">(pick up to ${step.max})</span>` : '';
      header.innerHTML = `<h3>${step.title}${optionalTag}</h3><p>${step.subtitle || ''}${maxTag}</p>`;

      const currentAnswer = this.quizAnswers[step.id];

      // Text input type
      if (step.type === "text") {
        const textarea = document.createElement("textarea");
        textarea.value = currentAnswer || "";
        textarea.placeholder = step.placeholder || "";
        textarea.rows = 3;
        textarea.style.cssText = "width:100%;padding:14px 16px;border:1.5px solid var(--vto-border);border-radius:10px;font-family:var(--vto-font);font-size:14px;color:var(--vto-text);resize:vertical;outline:none;background:white";
        textarea.oninput = (e) => {
          this.quizAnswers[step.id] = e.target.value;
        };
        quiz.append(progress, header, textarea);
      } else {
        // Options (single/multi)
        const opts = el("div", `vto-quiz-options ${step.type}`);

        step.options.forEach(opt => {
          const card = el("div", "vto-quiz-opt");
          const isSelected = step.type === "multi"
            ? (currentAnswer || []).includes(opt.value)
            : currentAnswer === opt.value;

          if (isSelected) card.classList.add("selected");

          if (opt.color) {
            card.innerHTML = `
              <div class="vto-color-swatch" style="background:${opt.color}"></div>
              <div class="opt-label">${opt.label}</div>
            `;
          } else {
            card.innerHTML = `
              <div class="opt-label">${opt.label}</div>
              ${opt.desc ? `<div class="opt-desc">${opt.desc}</div>` : ''}
            `;
          }

          card.onclick = () => {
            if (step.type === "multi") {
              const arr = this.quizAnswers[step.id] || [];
              const idx = arr.indexOf(opt.value);
              if (idx >= 0) {
                arr.splice(idx, 1);
              } else {
                if (step.max && arr.length >= step.max) return; // Enforce max
                arr.push(opt.value);
              }
              this.quizAnswers[step.id] = [...arr];
            } else {
              this.quizAnswers[step.id] = opt.value;
            }
            this.renderQuiz();
          };

          opts.appendChild(card);
        });

        quiz.append(progress, header, opts);
      }

      this.bodyEl.appendChild(quiz);

      // All questions can be skipped — always allow proceeding
      const hasAnswer = true;

      const backBtn = el("button", "vto-btn vto-btn-secondary");
      backBtn.textContent = "\u2190 Back";
      backBtn.disabled = this.quizIndex === 0;
      backBtn.onclick = () => { this.quizIndex--; this.renderQuiz(); };

      const skipBtn = el("button", "vto-btn vto-btn-secondary vto-btn-sm");
      skipBtn.style.cssText += ";color:var(--vto-text-muted)";
      skipBtn.textContent = "Skip \u2192";
      skipBtn.onclick = () => { this.quizIndex++; if (this.quizIndex >= this.quizSteps.length) { this._finishQuiz(); } else { this.renderQuiz(); } };

      const nextBtn = el("button", "vto-btn vto-btn-primary");
      const isLast = this.quizIndex === this.quizSteps.length - 1;
      nextBtn.textContent = isLast ? "See My Recommendations \u2192" : "Next \u2192";
      const curAns = this.quizAnswers[step.id];
      const answered = step.type === "multi" ? (curAns || []).length > 0 : step.type === "text" ? true : !!curAns;
      nextBtn.disabled = !answered;
      nextBtn.onclick = async () => {
        if (isLast) {
          await this._finishQuiz();
        } else {
          this.quizIndex++;
          this.renderQuiz();
        }
      };

      this.actionsEl.innerHTML = "";
      this.actionsEl.append(backBtn, skipBtn, nextBtn);
    },

    _showPrivacyModal(onAgree) {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:99999;
        background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);
        display:flex; align-items:center; justify-content:center; padding:20px;
        animation: vtoFadeIn 0.25s ease;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background:#ffffff; max-width:440px; width:100%;
        border:1px solid #e5e5e0; border-radius:0;
        padding:36px 32px; text-align:left; position:relative;
        animation: vtoSlideUp 0.3s ease;
        max-height:90vh; overflow-y:auto;
      `;

      modal.innerHTML = `
        <style>
          @keyframes vtoFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes vtoSlideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        </style>
        <button id="vto-priv-close" style="position:absolute;top:16px;right:20px;background:transparent;border:none;cursor:pointer;font-size:22px;color:#6b6b63;width:28px;height:28px">&times;</button>
        <h2 style="font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-size:26px; font-weight:400; color:#000; margin:0 0 4px; line-height:1.2; letter-spacing:-0.01em">Virtual Try-On</h2>
        <p style="font-size:12px; color:#6b6b63; margin:0 0 8px; letter-spacing:0.04em">Upload your photo and see how it looks on you</p>
        <p style="font-size:10px; color:#9b6a4a; margin:0 0 24px; letter-spacing:0.15em; text-transform:uppercase; font-weight:600">Powered by AI</p>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#000; margin-bottom:16px">Before We Begin</div>

        <ul style="list-style:none; padding:0; margin:0 0 20px; display:flex; flex-direction:column; gap:12px">
          ${[
            "Images uploaded are processed securely",
            "Uploaded and generated images are automatically deleted within 24 hours",
            "Images are not stored as part of customer records",
            "Results are available only during the active browser session"
          ].map(t => `
            <li style="display:flex; gap:10px; align-items:flex-start; font-size:13px; color:#000; font-weight:400; line-height:1.4">
              <span style="flex-shrink:0; margin-top:2px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
              <span>${t}</span>
            </li>
          `).join("")}
        </ul>

        <p style="font-size:10px; color:#8a8480; line-height:1.6; margin:0 0 24px; padding:12px; background:#f8f8f6; border-left:2px solid #000">
          By continuing, you agree that uploaded photos will be processed by our try-on service and deleted after the session.
        </p>

        <button id="vto-privacy-agree" style="
          width:100%; padding:14px; background:#000; color:#fff;
          border:1px solid #000; border-radius:0; cursor:pointer;
          font-family:'Inter',sans-serif; font-size:11px; font-weight:700;
          letter-spacing:0.25em; text-transform:uppercase;
          transition:all 0.2s ease;
        ">I Understand</button>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 250);
      };

      modal.querySelector("#vto-priv-close").onclick = close;
      modal.querySelector("#vto-privacy-agree").onclick = () => {
        localStorage.setItem("vto_seen_privacy", "true");
        close();
        setTimeout(() => onAgree && onAgree(), 280);
      };
    },

    _showGuidelinesModal(onContinue) {
      // First show privacy modal, then guidelines
      this._showPrivacyModal(() => this._showGuidelinesOnly(onContinue));
    },

    _showGuidelinesOnly(onContinue) {
      const outfit = this.selectedOutfits[0];
      const productName = outfit ? outfit.name : "This outfit";
      const productImg = outfit ? (this.apiBase + outfit.image_url) : "";

      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:99999;
        background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);
        display:flex; align-items:center; justify-content:center; padding:20px;
        animation: vtoFadeIn 0.25s ease;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background:#ffffff; max-width:440px; width:100%;
        border:1px solid #e5e5e0; border-radius:0;
        padding:28px 32px 32px; text-align:left; position:relative;
        animation: vtoSlideUp 0.3s ease;
        max-height:90vh; overflow-y:auto;
      `;

      modal.innerHTML = `
        <button id="vto-guide-close" style="
          position:absolute; top:16px; right:20px; background:transparent;
          border:none; cursor:pointer; font-size:22px; color:#6b6b63;
          width:28px; height:28px; display:flex; align-items:center; justify-content:center;
        ">&times;</button>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#000; margin-bottom:16px">Select Product</div>

        <div style="display:flex; gap:12px; align-items:center; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid #e5e5e0">
          ${productImg ? `<img src="${productImg}" style="width:48px;height:60px;object-fit:cover;border:1px solid #e5e5e0">` : ""}
          <div>
            <div style="font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-size:20px; color:#000; line-height:1.2">${productName}</div>
          </div>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#000; margin-bottom:14px">Photo Guidelines</div>

        <ul style="list-style:none; padding:0; margin:0 0 24px; display:flex; flex-direction:column; gap:10px">
          ${[
            "One person, full body portrait",
            "Standing straight, arms relaxed",
            "Wear fitted clothes, use good lighting",
            "Light grooming helps you look your best",
            "Choose a photo suited to this product",
            "Results are best when facing the camera",
            "Please upload images in JPG or PNG format only"
          ].map(t => `
            <li style="display:flex; gap:10px; align-items:flex-start; font-size:13px; color:#000; font-weight:400; line-height:1.4">
              <span style="flex-shrink:0; margin-top:2px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
              <span>${t}</span>
            </li>
          `).join("")}
        </ul>

        <button id="vto-guide-continue" style="
          width:100%; padding:32px 20px; background:#f8f8f6;
          border:1px dashed #d0c8ba; border-radius:0; cursor:pointer;
          font-family:'Inter',sans-serif; text-align:center;
          transition:all 0.2s ease;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5" style="margin-bottom:10px">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style="font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#000">Tap to Upload Photo</div>
          <div style="font-size:10px; color:#6b6b63; margin-top:4px; letter-spacing:0.05em">JPG, PNG, or WebP &middot; Max 10MB</div>
        </button>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 250);
      };

      modal.querySelector("#vto-guide-close").onclick = close;
      modal.querySelector("#vto-guide-continue").onclick = () => {
        close();
        setTimeout(() => onContinue && onContinue(), 280);
      };
      overlay.onclick = (e) => { if (e.target === overlay) close(); };
    },

    async _finishQuiz() {
      this.preferences = { ...this.quizAnswers };
      localStorage.setItem("vto_preferences", JSON.stringify(this.preferences));
      await this.api("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: this.sessionId, preferences: this.preferences }),
      });
      await this.loadRecommendations();
      this._showRecommended = true;
      this.currentTab = "outfits";
      this.renderNav();
      this.renderBody();
    },

    renderQuizComplete(container) {
      const prefs = this.preferences;
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:24px">
          <h3 style="margin:0 0 8px">Your Style Profile</h3>
          <p style="color:var(--vto-text-muted);font-size:14px;margin:0">Here's what we know about your style</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
          ${this._prefCard("Body Type", prefs.body_type)}
          ${this._prefCard("Size", prefs.size?.toUpperCase())}
          ${this._prefCard("Season", prefs.season)}
          ${this._prefCard("Occasion", (prefs.occasion || []).join(", "))}
          ${this._prefCard("Colors", (prefs.colors || []).join(", "))}
          ${this._prefCard("Style", (prefs.style || []).join(", "))}
        </div>
      `;

      const row = el("div", "");
      row.style.cssText = "display:flex;gap:10px;justify-content:center";

      const viewRec = el("button", "vto-btn vto-btn-primary");
      viewRec.textContent = "View Recommended Outfits \u2192";
      viewRec.onclick = () => { this.currentTab = "outfits"; this.renderNav(); this.renderBody(); };

      const retake = el("button", "vto-btn vto-btn-secondary");
      retake.textContent = "Retake Quiz";
      retake.onclick = () => {
        this.quizIndex = 0;
        this.quizAnswers = {};
        this.preferences = {};
        localStorage.removeItem("vto_preferences");
        this.renderQuiz();
      };

      row.append(retake, viewRec);
      container.appendChild(row);
    },

    _prefCard(label, value) {
      return `<div style="padding:12px;border:1px solid var(--vto-border);border-radius:8px;background:var(--vto-surface)">
        <div style="font-size:11px;color:var(--vto-text-muted);margin-bottom:2px">${label}</div>
        <div style="font-size:14px;font-weight:600;text-transform:capitalize">${value || 'Not set'}</div>
      </div>`;
    },

    // ─── Tab 2: Outfits ────────────────────────────────────

    renderOutfits() {
      this.bodyEl.innerHTML = "";

      // Show recommendations section if available
      if (this.recommendedOutfits.length > 0) {
        const recToggle = el("div", "");
        recToggle.style.cssText = "display:flex;gap:10px;margin-bottom:16px";

        const recBtn = el("button", `vto-btn vto-btn-sm ${this._showRecommended ? 'vto-btn-primary' : 'vto-btn-secondary'}`);
        recBtn.textContent = `\u2728 Recommended (${this.recommendedOutfits.length})`;
        recBtn.onclick = () => { this._showRecommended = true; this.renderOutfits(); };

        const allBtn = el("button", `vto-btn vto-btn-sm ${!this._showRecommended ? 'vto-btn-primary' : 'vto-btn-secondary'}`);
        allBtn.textContent = "All Outfits";
        allBtn.onclick = () => { this._showRecommended = false; this.renderOutfits(); };

        recToggle.append(recBtn, allBtn);
        this.bodyEl.appendChild(recToggle);
      }

      if (this._showRecommended) {
        this.renderRecommendedGrid();
      } else {
        this.renderAllOutfitsGrid();
      }

      // Actions
      this.actionsEl.innerHTML = "";
      const count = this.selectedOutfits.length;
      const info = el("span", "");
      info.style.cssText = "font-size:13px;color:var(--vto-text-muted)";
      info.textContent = count ? `${count} outfit${count > 1 ? 's' : ''} selected` : "Select outfit(s) to try on";

      const nextBtn = el("button", "vto-btn vto-btn-primary");
      nextBtn.textContent = "Next: Your Photo \u2192";
      nextBtn.disabled = count === 0;
      nextBtn.onclick = () => { this.currentTab = "photo"; this.renderNav(); this.renderBody(); };

      this.actionsEl.append(info, nextBtn);
    },

    renderRecommendedGrid() {
      // Show what criteria matched
      const prefs = this.preferences;
      const tags = [];
      if (prefs.occasion) tags.push(...prefs.occasion);
      if (prefs.season && prefs.season !== "all_season") tags.push(prefs.season);
      if (prefs.colors) tags.push(...prefs.colors.slice(0, 4));
      if (prefs.style) tags.push(...prefs.style.slice(0, 3));

      const header = el("div", "");
      header.style.cssText = "margin-bottom:16px";
      header.innerHTML = `
        <div style="font-size:14px;font-weight:600;margin-bottom:6px">
          Showing ${this.recommendedOutfits.length} outfits matching your style
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${tags.map(t => `<span style="padding:3px 10px;background:var(--vto-accent-soft);color:var(--vto-accent);border-radius:12px;font-size:11px;font-weight:600;text-transform:capitalize">${t}</span>`).join("")}
        </div>
      `;

      const grid = el("div", "vto-grid");
      this.recommendedOutfits.forEach(outfit => {
        const card = this._outfitCard(outfit, true);
        grid.appendChild(card);
      });
      this.bodyEl.append(header, grid);
    },

    renderAllOutfitsGrid() {
      // Category tabs
      const cats = el("div", "vto-categories");
      const allBtn = el("button", `vto-cat-btn${!this.selectedCategory ? ' active' : ''}`);
      allBtn.textContent = "All";
      allBtn.onclick = () => this._selectCategory(null);
      cats.appendChild(allBtn);

      this.categories.forEach(cat => {
        const btn = el("button", `vto-cat-btn${this.selectedCategory === cat ? ' active' : ''}`);
        btn.textContent = cat;
        btn.onclick = () => this._selectCategory(cat);
        cats.appendChild(btn);
      });

      const grid = el("div", "vto-grid");
      this.outfits.forEach(outfit => {
        grid.appendChild(this._outfitCard(outfit, false));
      });

      const pag = el("div", "vto-pagination");
      const prevBtn = el("button", "vto-page-btn");
      prevBtn.textContent = "\u2190 Prev";
      prevBtn.disabled = this.page <= 1;
      prevBtn.onclick = () => this._changePage(this.page - 1);
      const info = el("span", "vto-page-info");
      info.textContent = `Page ${this.page} of ${this.totalPages}`;
      const nextBtn = el("button", "vto-page-btn");
      nextBtn.textContent = "Next \u2192";
      nextBtn.disabled = this.page >= this.totalPages;
      nextBtn.onclick = () => this._changePage(this.page + 1);
      pag.append(prevBtn, info, nextBtn);

      this.bodyEl.append(cats, grid, pag);
    },

    _outfitCard(outfit, showScore) {
      const isSelected = this.selectedOutfits.some(o => o.id === outfit.id);
      const card = el("div", `vto-outfit-card${isSelected ? ' selected' : ''}`);
      const img = document.createElement("img");
      img.src = `${this.apiBase}${outfit.image_url}`;
      img.alt = outfit.name;
      img.loading = "lazy";
      const name = el("div", "vto-outfit-name");
      name.textContent = outfit.name;

      card.append(img, name);

      if (showScore && outfit.match_pct > 0) {
        const badge = el("div", "vto-match-badge");
        badge.textContent = `${outfit.match_pct}% match`;
        card.appendChild(badge);
      }

      card.onclick = () => {
        const idx = this.selectedOutfits.findIndex(o => o.id === outfit.id);
        if (idx >= 0) {
          this.selectedOutfits.splice(idx, 1);
        } else {
          this.selectedOutfits.push(outfit);
        }
        this.renderOutfits();
      };
      return card;
    },

    async _selectCategory(cat) {
      this.selectedCategory = cat;
      this.page = 1;
      await this.loadOutfits();
      this.renderOutfits();
    },

    async _changePage(p) {
      this.page = p;
      await this.loadOutfits();
      this.renderOutfits();
    },

    // ─── Tab 3: Photo ──────────────────────────────────────

    renderPhoto() {
      this.bodyEl.innerHTML = "";
      const section = el("div", "vto-photo-section");

      if (this.userImagePreview) {
        const preview = el("div", "vto-preview-container");
        const img = document.createElement("img");
        img.src = this.userImagePreview;
        const row = el("div", "");
        row.style.cssText = "margin-top:12px;display:flex;gap:8px;justify-content:center";
        const retakeBtn = el("button", "vto-btn vto-btn-secondary");
        retakeBtn.textContent = "Retake / Re-upload";
        retakeBtn.onclick = () => { this.userImageBlob = null; this.userImagePreview = null; this.renderPhoto(); };
        row.appendChild(retakeBtn);
        preview.append(img, row);
        section.appendChild(preview);
      } else {
        const options = el("div", "vto-photo-options");

        const camOpt = el("div", "vto-photo-option");
        camOpt.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <h4>Use Camera</h4>
          <p>Stand back, full body visible (head to toe)</p>
        `;
        camOpt.onclick = () => this._showGuidelinesModal(() => this.openCamera());

        const uploadOpt = el("div", "vto-photo-option");
        uploadOpt.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <h4>Upload Photo</h4>
          <p>Full body photo (head to toe), facing camera</p>
        `;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.className = "vto-file-input";
        fileInput.onchange = (e) => this.handleFileUpload(e);
        uploadOpt.appendChild(fileInput);
        uploadOpt.onclick = () => this._showGuidelinesModal(() => fileInput.click());

        options.append(camOpt, uploadOpt);
        section.appendChild(options);
      }

      this.bodyEl.appendChild(section);

      // Actions
      this.actionsEl.innerHTML = "";
      const backBtn = el("button", "vto-btn vto-btn-secondary");
      backBtn.textContent = "\u2190 Outfits";
      backBtn.onclick = () => { this.stopCamera(); this.currentTab = "outfits"; this.renderNav(); this.renderBody(); };

      const nextBtn = el("button", "vto-btn vto-btn-primary");
      nextBtn.textContent = "Try It On \u2192";
      nextBtn.disabled = !this.userImageBlob || this.selectedOutfits.length === 0;
      nextBtn.onclick = () => this.startTryOn();

      this.actionsEl.append(backBtn, nextBtn);
    },

    async openCamera() {
      this.bodyEl.innerHTML = "";
      const section = el("div", "vto-photo-section");
      const camContainer = el("div", "vto-camera-container");
      const video = document.createElement("video");
      video.autoplay = true; video.playsInline = true; video.muted = true;
      const canvas = document.createElement("canvas");
      const resLabel = el("div", "vto-camera-resolution");
      resLabel.textContent = "Initializing...";
      const controls = el("div", "vto-camera-controls");
      const captureBtn = el("button", "vto-btn-capture");
      captureBtn.title = "Capture";
      const closeBtn = el("button", "vto-btn vto-btn-secondary");
      closeBtn.textContent = "Cancel";
      closeBtn.style.cssText = "color:white;border-color:rgba(255,255,255,0.3)";
      controls.append(closeBtn, captureBtn);
      camContainer.append(video, canvas, resLabel, controls);
      section.appendChild(camContainer);
      this.bodyEl.appendChild(section);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, facingMode: "user", frameRate: { ideal: 30 } },
          audio: false,
        });
        this.cameraStream = stream;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          const w = video.videoWidth, h = video.videoHeight;
          resLabel.textContent = `${w}\u00d7${h} HD`;
          resLabel.style.color = w >= 1280 ? "var(--vto-success)" : "var(--vto-warning)";
        };
      } catch (e) {
        camContainer.innerHTML = `<p style="color:#ef4444;padding:40px;text-align:center">Camera access denied. Please upload a photo instead.</p>`;
        return;
      }

      captureBtn.onclick = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        canvas.toBlob((blob) => {
          this.userImageBlob = blob;
          this.userImagePreview = URL.createObjectURL(blob);
          this.stopCamera();
          this.renderPhoto();
        }, "image/png", 1.0);
      };
      closeBtn.onclick = () => { this.stopCamera(); this.renderPhoto(); };
    },

    stopCamera() {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraStream = null;
      }
    },

    handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.userImageBlob = file;
      this.userImagePreview = URL.createObjectURL(file);
      this.renderPhoto();
    },

    // ─── Tab 4: Beauty (Hair & Makeup) ─────────────────────

    renderBeauty() {
      this.bodyEl.innerHTML = "";
      const section = el("div", "vto-beauty-section");

      // Hairstyle panel
      const hairPanel = el("div", "vto-beauty-panel");
      hairPanel.innerHTML = `<h4>\ud83d\udc87 Hairstyle</h4>`;
      const hairGrid = el("div", "vto-beauty-grid");
      this.hairstyles.forEach(h => {
        const card = el("div", `vto-beauty-card${this.selectedHairstyle?.id === h.id ? ' selected' : ''}`);
        card.innerHTML = `
          <div class="card-name">${h.name}</div>
          <div class="card-desc">${h.desc}</div>
          <div class="card-cat">${h.category}</div>
        `;
        card.onclick = () => {
          this.selectedHairstyle = this.selectedHairstyle?.id === h.id ? null : h;
          this.renderBeauty();
        };
        hairGrid.appendChild(card);
      });
      hairPanel.appendChild(hairGrid);

      // Hair colors
      if (this.selectedHairstyle) {
        const colorLabel = el("h4", "");
        colorLabel.textContent = "Hair Color";
        colorLabel.style.marginTop = "16px";
        const colorRow = el("div", "vto-hair-color-row");
        this.hairColors.forEach(c => {
          const swatch = el("div", `vto-hair-color${this.selectedHairColor?.id === c.id ? ' selected' : ''}`);
          swatch.style.background = c.color;
          swatch.title = c.name;
          swatch.onclick = () => {
            this.selectedHairColor = this.selectedHairColor?.id === c.id ? null : c;
            this.renderBeauty();
          };
          colorRow.appendChild(swatch);
        });
        hairPanel.append(colorLabel, colorRow);
      }

      // Makeup panel
      const makeupPanel = el("div", "vto-beauty-panel");
      makeupPanel.innerHTML = `<h4>\ud83d\udc84 Makeup Look</h4>`;
      const makeupGrid = el("div", "vto-beauty-grid");
      this.makeupLooks.forEach(m => {
        const card = el("div", `vto-beauty-card${this.selectedMakeup?.id === m.id ? ' selected' : ''}`);
        card.innerHTML = `
          <div class="card-name">${m.name}</div>
          <div class="card-desc">${m.desc}</div>
          <div class="card-cat">${m.category}</div>
        `;
        card.onclick = () => {
          this.selectedMakeup = this.selectedMakeup?.id === m.id ? null : m;
          this.renderBeauty();
        };
        makeupGrid.appendChild(card);
      });
      makeupPanel.appendChild(makeupGrid);

      // Makeup details
      if (this.selectedMakeup) {
        const details = el("dl", "vto-makeup-details");
        const d = this.selectedMakeup.details;
        for (const [key, val] of Object.entries(d)) {
          details.innerHTML += `<dt>${key}</dt><dd>${val}</dd>`;
        }
        makeupPanel.appendChild(details);
      }

      section.append(hairPanel, makeupPanel);
      this.bodyEl.appendChild(section);

      // Actions
      this.actionsEl.innerHTML = "";
      const backBtn = el("button", "vto-btn vto-btn-secondary");
      backBtn.textContent = "\u2190 Photo";
      backBtn.onclick = () => { this.currentTab = "photo"; this.renderNav(); this.renderBody(); };

      const skipInfo = el("span", "");
      skipInfo.style.cssText = "font-size:12px;color:var(--vto-text-muted)";
      skipInfo.textContent = "Hair & makeup selections are optional";

      const tryOnBtn = el("button", "vto-btn vto-btn-primary");
      tryOnBtn.textContent = "Try It On \u2192";
      tryOnBtn.disabled = !this.userImageBlob || this.selectedOutfits.length === 0;
      tryOnBtn.onclick = () => this.startTryOn();

      this.actionsEl.append(backBtn, skipInfo, tryOnBtn);
    },

    // ─── Tab 5: Try-On ─────────────────────────────────────

    async startTryOn() {
      this.currentTab = "tryon";
      this.renderNav();
      this.resultImages = null;
      this.resultError = null;
      this._tryOnResults = [];
      this._tryOnTotal = this.selectedOutfits.length;
      this._tryOnDone = 0;
      this.renderTryOn();

      // Process each selected outfit
      for (const outfit of this.selectedOutfits) {
        try {
          const formData = new FormData();
          formData.append("user_image", this.userImageBlob, "photo.png");
          formData.append("outfit_id", outfit.id);
          formData.append("mode", this.mode);
          formData.append("session_id", this.sessionId);
          if (this.selectedHairstyle) formData.append("hairstyle", this.selectedHairstyle.id);
          if (this.selectedMakeup) formData.append("makeup", this.selectedMakeup.id);

          const startRes = await fetch(`${this.apiBase}/api/tryon`, { method: "POST", body: formData });
          if (!startRes.ok) {
            const err = await startRes.json().catch(() => ({}));
            this._tryOnResults.push({ outfit, error: err.detail || "Failed" });
            this._tryOnDone++;
            this.renderTryOn();
            continue;
          }

          const startData = await startRes.json();
          const result = await this._pollOne(startData.id);

          if (result.output) {
            this._tryOnResults.push({ outfit, images: result.output });
            // Save to history
            await this.api("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: this.sessionId,
                outfit_id: outfit.id,
                outfit_name: outfit.name,
                outfit_image: outfit.image_url,
                result_images: result.output,
                hairstyle: this.selectedHairstyle?.id,
                makeup: this.selectedMakeup?.id,
              }),
            });
          } else {
            const errMsg = typeof result.error === 'object' ? (result.error?.message || JSON.stringify(result.error)) : (result.error || "Try-on failed. Please try a different photo.");
            this._tryOnResults.push({ outfit, error: errMsg });
          }
        } catch (e) {
          this._tryOnResults.push({ outfit, error: e.message || "Network error" });
        }
        this._tryOnDone++;
        this.renderTryOn();
      }

      await this.loadHistory();
    },

    async _pollOne(predictionId) {
      for (let i = 0; i < 60; i++) {
        try {
          const data = await this.api(`/api/tryon/status/${predictionId}`);
          if (data.status === "completed") return data;
          if (data.status === "failed" || data.status === "canceled") return { error: data.error || "Failed" };
        } catch (e) { /* continue */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      return { error: "Timed out" };
    },

    renderTryOn() {
      this.bodyEl.innerHTML = "";
      const section = el("div", "vto-result");

      // Still loading
      if (this._tryOnDone < this._tryOnTotal) {
        section.innerHTML = `<div class="vto-loading">
          <div class="vto-spinner"></div>
          <p>Processing try-on ${this._tryOnDone + 1} of ${this._tryOnTotal}...</p>
          <span class="vto-quality-note">Using highest quality mode for perfect pixel results</span>
        </div>`;

        // Show completed results so far
        if (this._tryOnResults.length > 0) {
          section.appendChild(this._buildResultGrid());
        }

        this.bodyEl.appendChild(section);
        return;
      }

      // All done
      if (this._tryOnResults.length === 0) {
        section.innerHTML = `<div class="vto-empty"><h4>No results yet</h4><p>Select outfits and your photo first</p></div>`;
        this.bodyEl.appendChild(section);
        return;
      }

      const heading = el("h3", "");
      heading.style.cssText = "margin:0 0 4px;text-align:center";
      heading.textContent = "Your Virtual Try-On Results";
      const sub = el("p", "");
      sub.style.cssText = "text-align:center;color:var(--vto-text-muted);font-size:13px;margin:0 0 16px";
      sub.textContent = `${this._tryOnResults.filter(r => r.images).length} of ${this._tryOnTotal} completed successfully`;

      section.append(heading, sub, this._buildResultGrid());

      // Comparison CTA
      const successResults = this._tryOnResults.filter(r => r.images);
      if (successResults.length >= 2) {
        const cta = el("div", "");
        cta.style.cssText = "text-align:center;margin-top:16px";
        const compareBtn = el("button", "vto-btn vto-btn-secondary");
        compareBtn.textContent = "Compare Side by Side";
        compareBtn.onclick = () => { this.currentTab = "history"; this.renderNav(); this.renderBody(); };
        cta.appendChild(compareBtn);
        section.appendChild(cta);
      }

      this.bodyEl.appendChild(section);

      // Actions
      this.actionsEl.innerHTML = "";
      const tryMoreBtn = el("button", "vto-btn vto-btn-primary");
      tryMoreBtn.textContent = "Try More Outfits";
      tryMoreBtn.onclick = () => {
        this.selectedOutfits = [];
        this._tryOnResults = [];
        this.currentTab = "outfits";
        this.renderNav();
        this.renderBody();
      };
      this.actionsEl.appendChild(tryMoreBtn);
    },

    _buildResultGrid() {
      const grid = el("div", "vto-compare-grid");
      this._tryOnResults.forEach(r => {
        const card = el("div", "vto-compare-card");
        if (r.images) {
          const img = document.createElement("img");
          img.src = r.images[0];
          const label = el("div", "compare-label");
          label.textContent = r.outfit.name;
          card.append(img, label);
        } else {
          card.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">
            <p style="font-weight:600">Failed</p>
            <p style="font-size:12px">${r.error}</p>
            <p style="font-size:11px;color:var(--vto-text-muted)">${r.outfit.name}</p>
          </div>`;
        }
        grid.appendChild(card);
      });
      return grid;
    },

    // ─── Tab 6: History ────────────────────────────────────

    renderHistory() {
      this.bodyEl.innerHTML = "";

      if (this.history.length === 0) {
        this.bodyEl.innerHTML = `<div class="vto-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h4>No try-on history yet</h4>
          <p>Your virtual try-on results will appear here</p>
        </div>`;
        return;
      }

      // Compare mode toggle
      const toolbar = el("div", "");
      toolbar.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px";

      const title = el("h4", "");
      title.style.margin = "0";
      title.textContent = `Try-On History (${this.history.length})`;

      const compareBtn = el("button", `vto-btn vto-btn-sm ${this.compareSelection.size >= 2 ? 'vto-btn-primary' : 'vto-btn-secondary'}`);
      compareBtn.textContent = this.compareSelection.size >= 2
        ? `Compare ${this.compareSelection.size} Selected`
        : "Select items to compare";
      compareBtn.disabled = this.compareSelection.size < 2;
      compareBtn.onclick = () => this.showComparison();

      toolbar.append(title, compareBtn);
      this.bodyEl.appendChild(toolbar);

      const grid = el("div", "vto-history-grid");
      this.history.forEach(entry => {
        const card = el("div", "vto-history-card");
        const imgSrc = entry.result_images?.[0] || `${this.apiBase}${entry.outfit_image}`;
        const img = document.createElement("img");
        img.src = imgSrc;
        img.loading = "lazy";

        const info = el("div", "history-info");
        const name = el("div", "history-name");
        name.textContent = entry.outfit_name;
        const date = el("div", "history-date");
        date.textContent = new Date(entry.timestamp).toLocaleString();
        const extras = el("div", "");
        extras.style.cssText = "font-size:11px;color:var(--vto-text-muted);margin-top:4px";
        const parts = [];
        if (entry.hairstyle) parts.push(`Hair: ${entry.hairstyle}`);
        if (entry.makeup) parts.push(`Makeup: ${entry.makeup}`);
        extras.textContent = parts.join(" | ");
        info.append(name, date, extras);

        // Compare checkbox
        const check = el("div", `vto-compare-check${this.compareSelection.has(entry.id) ? ' checked' : ''}`);
        check.textContent = this.compareSelection.has(entry.id) ? "\u2713" : "";
        check.onclick = (e) => {
          e.stopPropagation();
          if (this.compareSelection.has(entry.id)) {
            this.compareSelection.delete(entry.id);
          } else {
            this.compareSelection.add(entry.id);
          }
          this.renderHistory();
        };

        // Delete
        const delBtn = el("button", "history-delete");
        delBtn.textContent = "\u00d7";
        delBtn.onclick = async (e) => {
          e.stopPropagation();
          await this.api(`/api/history/${this.sessionId}/${entry.id}`, { method: "DELETE" });
          await this.loadHistory();
          this.renderHistory();
        };

        // Download
        const dlBtn = el("button", "history-download");
        dlBtn.innerHTML = "\u2B07";
        dlBtn.title = "Download image";
        dlBtn.onclick = async (e) => {
          e.stopPropagation();
          const imgUrl = entry.result_images?.[0];
          if (!imgUrl) return;
          try {
            const resp = await fetch(imgUrl);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tryon-${entry.outfit_name.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error("[VTO] Download error:", err);
          }
        };

        card.append(img, info, check, dlBtn, delBtn);
        grid.appendChild(card);
      });

      this.bodyEl.appendChild(grid);
    },

    showComparison() {
      const selected = this.history.filter(e => this.compareSelection.has(e.id));
      this.bodyEl.innerHTML = "";

      const heading = el("h3", "");
      heading.style.cssText = "margin:0 0 16px;text-align:center";
      heading.textContent = "Side-by-Side Comparison";

      const grid = el("div", "vto-compare-grid");
      selected.forEach(entry => {
        const card = el("div", "vto-compare-card");
        const img = document.createElement("img");
        img.src = entry.result_images?.[0] || `${this.apiBase}${entry.outfit_image}`;
        const label = el("div", "compare-label");
        label.innerHTML = `<strong>${entry.outfit_name}</strong><br>
          <span style="font-size:11px;color:var(--vto-text-muted)">${new Date(entry.timestamp).toLocaleDateString()}</span>`;
        card.append(img, label);
        grid.appendChild(card);
      });

      const backBtn = el("button", "vto-btn vto-btn-secondary");
      backBtn.textContent = "\u2190 Back to History";
      backBtn.style.marginTop = "16px";
      backBtn.onclick = () => { this.compareSelection.clear(); this.renderHistory(); };

      this.bodyEl.append(heading, grid, backBtn);
    },
  };

  // ─── Utility ───────────────────────────────────────────

  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  // ─── Auto-init ─────────────────────────────────────────

  function autoInit() {
    const script = document.currentScript || document.querySelector("script[data-vto-widget]");
    const config = {};
    if (script) {
      if (script.dataset.apiBase) config.apiBase = script.dataset.apiBase;
      if (script.dataset.container) config.containerId = script.dataset.container;
      if (script.dataset.mode) config.mode = script.dataset.mode;
    }
    window.VirtualTryOn = VTO;
    if (document.getElementById(config.containerId || "vto-widget")) {
      VTO.init(config);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
