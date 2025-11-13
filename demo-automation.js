(function () {
  if (window.DEMO && window.DEMO.__ready) {
    console.log(
      "🎬 Script de demo ya cargado. Usá DEMO.runFullDemo() o runFullDemo()."
    );
    return;
  }
  /**
   * SCRIPT DE AUTOMATIZACIÓN PARA VIDEO DEMO
   *
   * USO:
   * 1. Abre la página del crucigrama
   * 2. Abre la consola del navegador (F12)
   * 3. Copia y pega este archivo completo
   * 4. Ejecuta: await runFullDemo()
   * 5. Inicia la grabación de pantalla
   *
   * CONTROLES:
   * - runFullDemo() - Ejecuta la demo completa automática
   * - runDemoStep(n) - Ejecuta solo el paso n (1-10)
   * - pauseDemo() - Pausa la demo
   * - resumeDemo() - Continúa la demo
   */

  // Variables de control
  let demoPaused = false;
  let demoRunning = false;

  // Utilidades
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const qs = (selector) => document.querySelector(selector);
  const DEMO_CONFIG = { speed: 1.1, msgDuration: 3200, pointerDelay: 900 };
  const waitScaled = (ms) => wait(ms * DEMO_CONFIG.speed);
  const click = (selector) => {
    const el = typeof selector === "string" ? qs(selector) : selector;
    if (el) {
      el.click();
      return true;
    }
    return false;
  };

  const clickCell = (row, col) => {
    const cell = qs(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.click();
      return true;
    }
    return false;
  };

  const clickSyllable = (text) => {
    const syllables = Array.from(document.querySelectorAll(".syll-btn"));
    const syll = syllables.find((s) => s.textContent.trim() === text);
    if (syll && !syll.classList.contains("used")) {
      syll.click();
      return true;
    }
    return false;
  };

  const scrollTo = (selector, offset = -100) => {
    const el = typeof selector === "string" ? qs(selector) : selector;
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const highlightElement = (selector, duration = 2000) => {
    const el = typeof selector === "string" ? qs(selector) : selector;
    if (el) {
      const original = el.style.cssText;
      el.style.outline = "3px solid #ffd700";
      el.style.outlineOffset = "4px";
      el.style.transition = "all 0.3s ease";
      setTimeout(() => {
        el.style.cssText = original;
      }, duration);
    }
  };

  // ============================================
  // PUNTERO ANIMADO (cursor visual)
  // ============================================
  let pointerEl = null;
  function ensurePointerStyles() {
    if (document.getElementById("demoPointerStyles")) return;
    const style = document.createElement("style");
    style.id = "demoPointerStyles";
    style.textContent = `
      .demo-pointer{position:fixed;left:0;top:0;width:22px;height:22px;pointer-events:none;z-index:99999;
        transform:translate(-100px,-100px);transition:transform 460ms cubic-bezier(0.2,0.7,0.2,1)}
      .demo-pointer::before{content:"";position:absolute;left:0;top:0;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid #111;border-top:0;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
      html[data-theme="dark"] .demo-pointer::before{border-bottom-color:#eee}
    `;
    document.head.appendChild(style);
  }
  function ensurePointer() {
    ensurePointerStyles();
    if (!pointerEl) {
      pointerEl = document.createElement("div");
      pointerEl.className = "demo-pointer";
      document.body.appendChild(pointerEl);
    }
    return pointerEl;
  }
  async function movePointerTo(target, offsetX = 0, offsetY = -10) {
    const el = typeof target === "string" ? qs(target) : target;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + offsetX;
    const y = rect.top + rect.height / 2 + offsetY;
    ensurePointer();
    pointerEl.style.transform = `translate(${x}px, ${y}px)`;
    await waitScaled(DEMO_CONFIG.pointerDelay);
  }
  async function clickWithPointer(target) {
    const el = typeof target === "string" ? qs(target) : target;
    if (!el) return;
    await movePointerTo(el);
    el.click();
    await waitScaled(Math.max(300, Math.round(DEMO_CONFIG.pointerDelay * 0.6)));
  }

  // ============================================
  // UI DE MENSAJES (autoavance, sin confirmación)
  // ============================================
  let guideRefs = null;
  const DEMO_TEXT = {
    intro_theme: "Empecemos cambiando el tema: claro u oscuro, como te guste.",
    foto: "Acá va su foto favorita… o hasta cuatro, elegidas por ustedes.",
    instructivo: "Así se juega: completás palabras y al final el acrónimo se adapta a lo que elijan.",
    clue_sonrisa: "Leemos la pista y completamos la respuesta: sonrisa.",
    syllables: "Cada sílaba que usás se tacha sola. Simple y ordenado.",
    toast_card: "Cuando aciertas, aparece una tarjetita de recuerdo. Podés ampliarla y descargarla.",
    reveal: "¿Te trabaste? Revelá una letra para seguir sin perder el encanto.",
    verify: "Con todo completo, tocamos Verificar y vemos la tarjeta final.",
    qr: "Y si querés compartir, mostramos y descargamos el código QR.",
  };

  function ensureGuideStyles() {
    if (document.getElementById("demoGuideStyles")) return;
    const style = document.createElement("style");
    style.id = "demoGuideStyles";
    style.textContent = `
      .demo-guide-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9999}
      .demo-guide-overlay.active{display:flex}
      .demo-guide-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px)}
      .demo-guide-card{position:relative;max-width:640px;width:calc(100% - 32px);margin:16px;background:var(--bg,#fff);color:var(--fg,#222);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:20px;z-index:1}
      .demo-guide-card h3{margin:0 0 8px 0;font-size:18px}
      .demo-guide-msg{font-size:15px;line-height:1.5;margin:0 0 16px 0}
      .demo-guide-actions{display:none}
      .demo-guide-btn{display:none}
      .demo-guide-highlight{outline:3px solid #ffd700 !important;outline-offset:4px !important;transition:outline-color .25s ease}
      @media (prefers-color-scheme: dark){
        .demo-guide-card{--bg:#111;--fg:#eee;border:1px solid #222}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGuideUI() {
    if (guideRefs) return guideRefs;
    ensureGuideStyles();
    const overlay = document.createElement("div");
    overlay.className = "demo-guide-overlay";
    overlay.id = "demoGuideOverlay";

    const backdrop = document.createElement("div");
    backdrop.className = "demo-guide-backdrop";

    const card = document.createElement("div");
    card.className = "demo-guide-card";
    const msg = document.createElement("div");
    msg.className = "demo-guide-msg";
    const actions = document.createElement("div");
    actions.className = "demo-guide-actions";
    card.appendChild(msg);
    card.appendChild(actions);
    overlay.appendChild(backdrop);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    guideRefs = { overlay, msg };
    return guideRefs;
  }

  function showOverlay(message) {
    const { overlay, msg } = ensureGuideUI();
    msg.textContent = message;
    overlay.classList.add("active");
  }

  function hideOverlay() {
    if (!guideRefs) return;
    guideRefs.overlay.classList.remove("active");
  }

  async function showMessage(message, options = {}) {
    const { target, offset = -120, duration = DEMO_CONFIG.msgDuration } = options;
    ensureGuideUI();

    let el = null;
    if (target) {
      el = typeof target === "string" ? qs(target) : target;
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset + offset;
        window.scrollTo({ top: y, behavior: "smooth" });
        await waitScaled(500);
        el.classList.add("demo-guide-highlight");
      }
    }

    showOverlay(message);
    await waitScaled(duration);
    hideOverlay();
    if (el) el.classList.remove("demo-guide-highlight");
    await waitScaled(150);
  }

  // Overlay bloqueante que espera flechas (← →) o ESC
  function showOverlayBlocking(message, options = {}) {
    const { target, offset = -120 } = options;
    ensureGuideUI();

    let el = null;
    if (target) {
      el = typeof target === "string" ? qs(target) : target;
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset + offset;
        window.scrollTo({ top: y, behavior: "smooth" });
        el.classList.add("demo-guide-highlight");
      }
    }

    showOverlay(message);

    return new Promise((resolve) => {
      function onKey(e) {
        if (e.key === "ArrowRight") {
          cleanup();
          resolve("next");
        } else if (e.key === "ArrowLeft") {
          cleanup();
          resolve("prev");
        } else if (e.key === "Escape") {
          cleanup();
          resolve("esc");
        }
      }
      function cleanup() {
        window.removeEventListener("keydown", onKey);
        hideOverlay();
        if (el) el.classList.remove("demo-guide-highlight");
      }
      window.addEventListener("keydown", onKey);
    });
  }

  // ============================================
  // CONTROL HEADER STICKY DURANTE DEMO
  // ============================================
  let headerEl = null;
  let headerHadSticky = false;
  function disableStickyHeader() {
    headerEl = qs("header");
    if (!headerEl) return;
    headerHadSticky = headerEl.classList.contains("sticky-header");
    if (headerHadSticky) headerEl.classList.remove("sticky-header");
  }
  function restoreStickyHeader() {
    if (headerEl && headerHadSticky) headerEl.classList.add("sticky-header");
  }

  // Control de pausa
  function pauseDemo() {
    demoPaused = true;
    console.log("⏸️  Demo pausada. Ejecuta resumeDemo() para continuar.");
  }

  function resumeDemo() {
    demoPaused = false;
    console.log("▶️  Demo reanudada.");
  }

  async function checkPause() {
    while (demoPaused && demoRunning) {
      await wait(100);
    }
  }

  // ============================================
  // PASOS DE LA DEMO
  // ============================================

  async function step1_intro() {
    console.log("📍 PASO 1: Introducción y header sticky");

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: "smooth" });
    await wait(1500);

    // Resaltar el header
    highlightElement("header", 2000);
    await wait(2000);

    // Scroll down para mostrar que el header es sticky
    window.scrollTo({ top: 400, behavior: "smooth" });
    await wait(1500);

    // Scroll up
    window.scrollTo({ top: 0, behavior: "smooth" });
    await wait(1500);
  }

  async function step2_darkMode() {
    console.log("📍 PASO 2: Cambiar modo oscuro/claro");
    await checkPause();

    const themeBtn = qs("#themeToggle");
    if (themeBtn) {
      highlightElement(themeBtn, 1000);
      await wait(1200);

      // Cambiar a modo oscuro
      click(themeBtn);
      await wait(2000);

      // Volver a modo claro
      click(themeBtn);
      await wait(1500);
    }
  }

  async function step3_compactMode() {
    console.log("📍 PASO 3: Modo compacto");
    await checkPause();

    // Scroll a la sección de sílabas
    scrollTo("#syllTitle");
    await wait(1000);

    const toggle = qs("#sizeToggle");
    if (toggle) {
      highlightElement(toggle.parentElement, 1000);
      await wait(1200);

      // Activar modo compacto
      click(toggle);
      await wait(2000);

      // Desactivar
      click(toggle);
      await wait(1500);
    }
  }

  async function step4_gridStyle() {
    console.log("📍 PASO 4: Estilos de grilla");
    await checkPause();

    const gridStyle = qs("#gridStyle");
    if (gridStyle) {
      highlightElement(gridStyle.parentElement, 1000);
      await wait(1200);

      // Cambiar a Claringrilla
      gridStyle.value = "clarin";
      gridStyle.dispatchEvent(new Event("change"));
      await wait(2500);

      // Volver a contraste alto
      gridStyle.value = "contrast";
      gridStyle.dispatchEvent(new Event("change"));
      await wait(1500);
    }
  }

  async function step5_completeFirstWord() {
    console.log("📍 PASO 5: Completar primera palabra - SONRISA");
    await checkPause();

    // Scroll al crucigrama
    scrollTo("#crosswordGrid");
    await wait(1000);

    // Click en la primera pista
    const firstClue = qs("#clue-across-0");
    if (firstClue) {
      highlightElement(firstClue, 1500);
      click(firstClue);
      await wait(1500);
    }

    // Click en primera celda (fila 0, col 8)
    clickCell(0, 8);
    await wait(800);

    // Agregar sílabas: SON RI SA
    clickSyllable("SON");
    await wait(600);
    clickSyllable("RI");
    await wait(600);
    clickSyllable("SA");
    await wait(1000);

    // Verificar
    highlightElement("#checkBtn", 1000);
    await wait(1200);
    click("#checkBtn");
    await wait(2000);
  }

  async function step6_viewToast() {
    console.log("📍 PASO 6: Interactuar con tarjeta personalizada");
    await checkPause();

    // Esperar a que aparezca el toast
    await wait(1000);

    const toast = qs(".toast");
    if (toast) {
      // Resaltar el toast
      highlightElement(toast, 2000);
      await wait(2000);

      // Ampliar
      const expandBtn = toast.querySelector("button.secondary");
      if (expandBtn && expandBtn.textContent === "Ampliar") {
        click(expandBtn);
        await wait(3000);

        // Reducir
        click(expandBtn);
        await wait(1000);

        // Cerrar
        const closeBtn = Array.from(
          toast.querySelectorAll("button.secondary")
        ).find((b) => b.textContent === "×");
        if (closeBtn) {
          click(closeBtn);
          await wait(1000);
        }
      }
    }
  }

  async function step7_completeMoreWords() {
    console.log("📍 PASO 7: Completar más palabras (AMOR, SEÑOR, BESO)");
    await checkPause();

    // AMOR - fila 1
    clickCell(1, 8);
    await wait(600);
    clickSyllable("A");
    await wait(500);
    clickSyllable("MOR");
    await wait(800);

    // SEÑOR - fila 2
    clickCell(2, 8);
    await wait(600);
    clickSyllable("SE");
    await wait(500);
    clickSyllable("ÑOR");
    await wait(800);

    // BESO - fila 3
    clickCell(3, 8);
    await wait(600);
    clickSyllable("BE");
    await wait(500);
    clickSyllable("SO");
    await wait(1000);

    // Verificar
    click("#checkBtn");
    await wait(3000);

    // Cerrar toasts si aparecen
    const toasts = document.querySelectorAll(".toast");
    for (const toast of toasts) {
      const closeBtn = toast.querySelector(".close-x");
      if (closeBtn) click(closeBtn);
      await wait(300);
    }
  }

  async function step8_revealLetter() {
    console.log("📍 PASO 8: Demostrar revelar letra");
    await checkPause();

    // Click en una celda de TOMADA
    clickCell(4, 8);
    await wait(800);

    // Resaltar botón revelar
    highlightElement("#revealBtn", 1000);
    await wait(1200);

    // Click en revelar
    click("#revealBtn");
    await wait(1500);
  }

  async function step9_completeAll() {
    console.log("📍 PASO 9: Completar todas las palabras restantes");
    await checkPause();

    // TOMADA (continuar desde donde quedó)
    clickCell(4, 9);
    await wait(500);
    clickSyllable("TO");
    await wait(400);
    clickSyllable("MA");
    await wait(400);
    clickSyllable("DA");
    await wait(800);

    // FRANC - fila 5
    clickCell(5, 8);
    await wait(500);
    clickSyllable("FRANC");
    await wait(800);

    // ESPORÁCÁ - fila 6
    clickCell(6, 8);
    await wait(500);
    clickSyllable("ES");
    await wait(400);
    clickSyllable("POR");
    await wait(400);
    clickSyllable("A");
    await wait(400);
    clickSyllable("CÁ");
    await wait(800);

    // PASIÓN - fila 7
    clickCell(7, 8);
    await wait(500);
    clickSyllable("PA");
    await wait(400);
    clickSyllable("SIÓN");
    await wait(1000);

    // Verificar final
    highlightElement("#checkBtn", 1000);
    await wait(1200);
    click("#checkBtn");
    await wait(3000);
  }

  async function step10_finalModal() {
    console.log("📍 PASO 10: Modal final y funciones de compartir");
    await checkPause();

    // El modal debería estar abierto
    const modal = qs("#finalModal");
    if (modal) {
      await wait(2000);

      // Resaltar canvas
      highlightElement("#shareCanvas", 2000);
      await wait(2500);

      // Resaltar botón descargar
      highlightElement("#downloadCard", 1000);
      await wait(1500);

      // Resaltar botón compartir
      highlightElement("#shareCard", 1000);
      await wait(1500);

      // Cerrar modal
      click("#closeModal");
      await wait(1500);
    }
  }

  async function step11_qrCode() {
    console.log("📍 PASO 11: Código QR");
    await checkPause();

    // Scroll al botón QR
    scrollTo("#qrBtn");
    await wait(1000);

    // Click en botón QR
    highlightElement("#qrBtn", 1000);
    await wait(1200);
    click("#qrBtn");
    await wait(2000);

    // Resaltar el QR
    const qrContainer = qs("#qrContainer");
    if (qrContainer) {
      highlightElement(qrContainer, 2000);
      await wait(2500);
    }

    // Resaltar copiar URL
    highlightElement("#copyUrl", 1000);
    await wait(1500);

    // Cerrar modal
    click("#closeQr");
    await wait(1500);
  }

  async function step12_floatingButton() {
    console.log("📍 PASO 12: Botón flotante Amor en Páginas");
    await checkPause();

    const amorBadge = qs(".amor-badge");
    if (amorBadge) {
      // Scroll para que se vea
      window.scrollTo({
        top: document.body.scrollHeight / 2,
        behavior: "smooth",
      });
      await wait(1000);

      highlightElement(amorBadge, 3000);
      await wait(3000);
    }
  }

  async function step13_footer() {
    console.log("📍 PASO 13: Footer premium");
    await checkPause();

    // Scroll al footer
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    await wait(1500);

    const footer = qs("footer");
    if (footer) {
      highlightElement(footer, 3000);
      await wait(3000);
    }
  }

  async function step14_finalScroll() {
    console.log("📍 PASO 14: Scroll final de toda la página");
    await checkPause();

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: "smooth" });
    await wait(2000);

    // Scroll suave hasta el final
    const totalHeight = document.body.scrollHeight;
    const step = totalHeight / 50;

    for (let i = 0; i < 50; i++) {
      window.scrollTo({ top: step * i, behavior: "smooth" });
      await wait(60);
    }

    await wait(1000);
  }

  // ============================================
  // FUNCIONES PRINCIPALES
  // ============================================

  async function runNarratedDemo() {
    if (demoRunning) {
      console.log("⚠️  Ya hay una demo en ejecución");
      return;
    }
    demoRunning = true;
    demoPaused = false;

    try {
      // 1) Tema: mostrar toggle con cursor y ejecutar cambios
      disableStickyHeader();
      await showMessage(DEMO_TEXT.intro_theme, { target: "#themeToggle" });
      await movePointerTo("#themeToggle");
      await clickWithPointer("#themeToggle"); // oscuro
      await waitScaled(900);
      await clickWithPointer("#themeToggle"); // claro

      // 2) Foto
      await showMessage(DEMO_TEXT.foto, { target: ".photo-section" });

      // 3) Instructivo
      await showMessage(DEMO_TEXT.instructivo, { target: "#intro" });

      // 4) Crucigrama: pista + completar SONRISA
      scrollTo("#crosswordGrid");
      await waitScaled(600);
      await showMessage(DEMO_TEXT.clue_sonrisa, { target: "#clues" });
      const firstClue = qs("#clue-across-0");
      if (firstClue) {
        highlightElement(firstClue, 1400);
        await waitScaled(700);
      }
      clickCell(0, 8);
      await waitScaled(500);
      await showMessage(DEMO_TEXT.syllables, { target: "#syllGrid", duration: DEMO_CONFIG.msgDuration - 600 });
      clickSyllable("SON");
      await waitScaled(400);
      clickSyllable("RI");
      await waitScaled(400);
      clickSyllable("SA");
      await waitScaled(600);

      // Verificar primera palabra para mostrar tarjeta y marcar pista
      click("#checkBtn");
      await waitScaled(1200);
      // Mostrar tarjeta personalizada (toast): ampliar y descargar
      await waitScaled(400);
      await showMessage(DEMO_TEXT.toast_card, { target: ".toast-host" });
      const toast = qs(".toast");
      if (toast) {
        const expandBtn = toast.querySelector("button.secondary");
        if (expandBtn && expandBtn.textContent === "Ampliar") {
          click(expandBtn);
          await waitScaled(1400);
          // Descargar imagen de recuerdo si existe acción
          const downloadBtn = Array.from(toast.querySelectorAll("button")).find(b => /Descargar|Guardar/i.test(b.textContent));
          if (downloadBtn) {
            click(downloadBtn);
            await waitScaled(800);
          }
          // Cerrar toast
          const closeBtn = toast.querySelector(".close-x");
          if (closeBtn) {
            click(closeBtn);
            await waitScaled(400);
          }
        }
      }

      // 5) Funciones debajo de sílabas: Revelar letra
      await showMessage(DEMO_TEXT.reveal, { target: "#revealBtn" });
      click("#revealBtn");
      await waitScaled(1000);

      // Completar todo el crucigrama rápidamente
      clickCell(1, 8); clickSyllable("A"); await waitScaled(250); clickSyllable("MOR");
      clickCell(2, 8); await waitScaled(250); clickSyllable("SE"); await waitScaled(250); clickSyllable("ÑOR");
      clickCell(3, 8); await waitScaled(250); clickSyllable("BE"); await waitScaled(250); clickSyllable("SO");
      clickCell(4, 9); await waitScaled(250); clickSyllable("TO"); await waitScaled(250); clickSyllable("MA"); await waitScaled(250); clickSyllable("DA");
      clickCell(5, 8); await waitScaled(250); clickSyllable("FRANC");
      clickCell(6, 8); await waitScaled(250); clickSyllable("ES"); await waitScaled(200); clickSyllable("POR"); await waitScaled(200); clickSyllable("A"); await waitScaled(200); clickSyllable("CÁ");
      clickCell(7, 8); await waitScaled(250); clickSyllable("PA"); await waitScaled(200); clickSyllable("SIÓN");
      await waitScaled(600);

      // 6) Verificar y modal final
      await showMessage(DEMO_TEXT.verify, { target: "#checkBtn" });
      click("#checkBtn");
      await waitScaled(1800);
      const modal = qs("#finalModal");
      if (modal) {
        highlightElement("#shareCanvas", 1400);
        await waitScaled(1600);
        // Descargar tarjeta final
        click("#downloadCard");
        await waitScaled(800);
        click("#closeModal");
        await waitScaled(800);
      }

      // 7) QR: mostrar y descargar
      await showMessage(DEMO_TEXT.qr, { target: "#qrBtn" });
      click("#qrBtn");
      await waitScaled(1200);
      click("#downloadQr");
      await waitScaled(800);
      click("#closeQr");

      console.log("✅ Demo narrada completada.");
    } catch (err) {
      console.error("❌ Error en demo narrada:", err);
    } finally {
      restoreStickyHeader();
      demoRunning = false;
    }
  }

  // Variante de 60s: ajusta velocidad y duración temporalmente
  async function runNarratedDemo60() {
    const prev = { speed: DEMO_CONFIG.speed, msgDuration: DEMO_CONFIG.msgDuration };
    DEMO_CONFIG.speed = 0.65;
    DEMO_CONFIG.msgDuration = 1600;
    try {
      await runNarratedDemo();
    } finally {
      DEMO_CONFIG.speed = prev.speed;
      DEMO_CONFIG.msgDuration = prev.msgDuration;
    }
  }

  // Demo con control por teclado: ← volver | → avanzar | Esc salir
  async function runKeyboardDemo() {
    if (demoRunning) return;
    demoRunning = true;
    let idx = 0;
    let cancelled = false;

    const steps = [
      {
        msg: DEMO_TEXT.intro_theme,
        target: "#themeToggle",
        action: async () => {
          await movePointerTo("#themeToggle");
          await clickWithPointer("#themeToggle");
          await waitScaled(700);
          await clickWithPointer("#themeToggle");
        },
      },
      { msg: DEMO_TEXT.foto, target: ".photo-section", action: async () => {} },
      { msg: DEMO_TEXT.instructivo, target: "#intro", action: async () => {} },
      {
        msg: DEMO_TEXT.clue_sonrisa,
        target: "#clues",
        action: async () => {
          scrollTo("#crosswordGrid");
          await waitScaled(400);
          clickCell(0, 8);
          await waitScaled(300);
          await showMessage(DEMO_TEXT.syllables, { target: "#syllGrid" });
          clickSyllable("SON"); await waitScaled(300);
          clickSyllable("RI"); await waitScaled(300);
          clickSyllable("SA"); await waitScaled(500);
          click("#checkBtn");
          await waitScaled(900);
        },
      },
      {
        msg: DEMO_TEXT.toast_card,
        target: ".toast-host",
        action: async () => {
          const toast = qs(".toast");
          if (toast) {
            const expandBtn = toast.querySelector("button.secondary");
            if (expandBtn && expandBtn.textContent === "Ampliar") {
              click(expandBtn);
              await waitScaled(1000);
              const downloadBtn = Array.from(toast.querySelectorAll("button")).find(b => /Descargar|Guardar/i.test(b.textContent));
              if (downloadBtn) { click(downloadBtn); await waitScaled(600); }
              const closeBtn = toast.querySelector(".close-x");
              if (closeBtn) { click(closeBtn); await waitScaled(300); }
            }
          }
        },
      },
    ];

    try {
      disableStickyHeader();
      while (!cancelled && idx >= 0 && idx < steps.length) {
        const step = steps[idx];
        const key = await showOverlayBlocking(step.msg, { target: step.target });
        if (key === "esc") { cancelled = true; break; }
        if (key === "prev") { idx = Math.max(0, idx - 1); continue; }
        // next
        await step.action();
        idx += 1;
      }
    } catch (e) {
      console.error("❌ Error en demo por teclado:", e);
    } finally {
      restoreStickyHeader();
      demoRunning = false;
    }
  }
  
  // Compatibilidad mínima para la demo guiada
  let guideDisabled = false;
  async function guideStep(message, options) { return showMessage(message, options); }

  // Solo la primera palabra: para revisar este tramo puntual
  async function runNarratedFirstWord() {
    if (demoRunning) return;
    demoRunning = true;
    try {
      disableStickyHeader();
      await showMessage(DEMO_TEXT.intro_theme, { target: "#themeToggle" });
      await movePointerTo("#themeToggle");
      await clickWithPointer("#themeToggle");
      await waitScaled(900);
      await clickWithPointer("#themeToggle");

      await showMessage(DEMO_TEXT.foto, { target: ".photo-section" });
      await showMessage(DEMO_TEXT.instructivo, { target: "#intro" });

      scrollTo("#crosswordGrid");
      await waitScaled(600);
      await showMessage(DEMO_TEXT.clue_sonrisa, { target: "#clues" });
      const firstClue = qs("#clue-across-0");
      if (firstClue) { highlightElement(firstClue, 1400); await waitScaled(700); }
      clickCell(0, 8);
      await waitScaled(500);
      await showMessage(DEMO_TEXT.syllables, { target: "#syllGrid" });
      clickSyllable("SON"); await waitScaled(400);
      clickSyllable("RI"); await waitScaled(400);
      clickSyllable("SA"); await waitScaled(600);

      // Verificar para disparar tarjeta y marcar pista
      click("#checkBtn");
      await waitScaled(1200);
      await showMessage(DEMO_TEXT.toast_card, { target: ".toast-host" });
      const toast = qs(".toast");
      if (toast) {
        const expandBtn = toast.querySelector("button.secondary");
        if (expandBtn && expandBtn.textContent === "Ampliar") {
          click(expandBtn);
          await waitScaled(1400);
          const downloadBtn = Array.from(toast.querySelectorAll("button")).find(b => /Descargar|Guardar/i.test(b.textContent));
          if (downloadBtn) { click(downloadBtn); await waitScaled(800); }
          const closeBtn = toast.querySelector(".close-x");
          if (closeBtn) { click(closeBtn); await waitScaled(400); }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      restoreStickyHeader();
      demoRunning = false;
    }
  }
  async function runGuidedDemo() {
    if (demoRunning) {
      console.log("⚠️  Ya hay una demo en ejecución");
      return;
    }
    demoRunning = true;
    demoPaused = false;
    guideDisabled = false;

    console.log("🎬 Iniciando demo guiada (avanza con clic en Continuar)");
    try {
      await guideStep("Vamos a ver el header sticky y cómo acompaña el scroll.", { target: "header" });
      await step1_intro();

      await guideStep("Probemos el cambio de tema: oscuro y claro con un clic.", { target: "#themeToggle" });
      await step2_darkMode();

      await guideStep("Activamos y desactivamos el modo compacto de sílabas.", { target: "#sizeToggle" });
      await step3_compactMode();

      await guideStep("Distintos estilos de grilla: contraste alto vs. estilo diario.", { target: "#gridStyle" });
      await step4_gridStyle();

      await guideStep("Completemos la primera palabra desde las sílabas disponibles.", { target: "#crosswordGrid" });
      await step5_completeFirstWord();

      await guideStep("Al acertar, mostramos una tarjeta personalizada. Veámosla en acción.", { target: ".toast, #clues" });
      await step6_viewToast();

      await guideStep("Completamos más palabras rápidamente para mostrar fluidez.", { target: "#crosswordGrid" });
      await step7_completeMoreWords();

      await guideStep("Función de ayuda: revelar una letra cuando te trabás.", { target: "#revealBtn" });
      await step8_revealLetter();

      await guideStep("Terminemos el crucigrama y validemos todo.", { target: "#checkBtn" });
      await step9_completeAll();

      await guideStep("Al completar, se abre un modal con tu tarjeta final.", { target: "#finalModal, #shareCanvas" });
      await step10_finalModal();

      await guideStep("Podés compartir con QR o copiar el enlace.", { target: "#qrBtn" });
      await step11_qrCode();

      await guideStep("Este es el botón flotante para conocer el servicio.", { target: ".amor-badge" });
      await step12_floatingButton();

      await guideStep("Cerramos con el footer premium, marca y contacto.", { target: "footer" });
      await step13_footer();

      await guideStep("Hacemos un repaso final con un scroll suave.", {});
      await step14_finalScroll();

      console.log("✅ Demo guiada completada!");
    } catch (error) {
      console.error("❌ Error durante la demo guiada:", error);
    } finally {
      demoRunning = false;
      hideOverlay();
    }
  }

  async function runGuidedStep(stepNumber) {
    const messages = {
      1: { msg: "Header sticky: siempre visible al desplazarte.", target: "header" },
      2: { msg: "Cambia el tema: claro/oscuro al instante.", target: "#themeToggle" },
      3: { msg: "Modo compacto de sílabas para pantallas pequeñas.", target: "#sizeToggle" },
      4: { msg: "Elegí el estilo de grilla que prefieras.", target: "#gridStyle" },
      5: { msg: "Completemos la primera palabra.", target: "#crosswordGrid" },
      6: { msg: "Al acertar, mostramos una tarjeta personalizada.", target: ".toast, #clues" },
      7: { msg: "Completamos más palabras rápidamente.", target: "#crosswordGrid" },
      8: { msg: "Podés revelar una letra si te trabás.", target: "#revealBtn" },
      9: { msg: "Completemos todas las palabras y validemos.", target: "#checkBtn" },
      10: { msg: "Modal final con tarjeta para compartir.", target: "#finalModal, #shareCanvas" },
      11: { msg: "Compartí con QR o copiando el enlace.", target: "#qrBtn" },
      12: { msg: "Botón flotante al sitio del servicio.", target: ".amor-badge" },
      13: { msg: "Footer premium con marca y contacto.", target: "footer" },
      14: { msg: "Repaso final con scroll suave.", target: null },
    };
    const steps = {
      1: step1_intro,
      2: step2_darkMode,
      3: step3_compactMode,
      4: step4_gridStyle,
      5: step5_completeFirstWord,
      6: step6_viewToast,
      7: step7_completeMoreWords,
      8: step8_revealLetter,
      9: step9_completeAll,
      10: step10_finalModal,
      11: step11_qrCode,
      12: step12_floatingButton,
      13: step13_footer,
      14: step14_finalScroll,
    };
    const cfg = messages[stepNumber];
    const fn = steps[stepNumber];
    if (!cfg || !fn) {
      console.log("❌ Paso no válido. Usa 1-14.");
      return;
    }
    await guideStep(cfg.msg, { target: cfg.target });
    await fn();
  }
  async function runFullDemo() {
    if (demoRunning) {
      console.log("⚠️  Ya hay una demo en ejecución");
      return;
    }

    demoRunning = true;
    demoPaused = false;

    console.log("🎬 Iniciando demo completa del Crucigrama del Amor");
    console.log("⏸️  Puedes pausar en cualquier momento con: pauseDemo()");
    console.log("▶️  Y reanudar con: resumeDemo()");
    console.log("");

    try {
      await step1_intro();
      await step2_darkMode();
      await step3_compactMode();
      await step4_gridStyle();
      await step5_completeFirstWord();
      await step6_viewToast();
      await step7_completeMoreWords();
      await step8_revealLetter();
      await step9_completeAll();
      await step10_finalModal();
      await step11_qrCode();
      await step12_floatingButton();
      await step13_footer();
      await step14_finalScroll();

      console.log("");
      console.log("✅ Demo completada exitosamente!");
      console.log("🎥 Revisa tu grabación");
    } catch (error) {
      console.error("❌ Error durante la demo:", error);
    } finally {
      demoRunning = false;
    }
  }

  async function runDemoStep(stepNumber) {
    const steps = {
      1: step1_intro,
      2: step2_darkMode,
      3: step3_compactMode,
      4: step4_gridStyle,
      5: step5_completeFirstWord,
      6: step6_viewToast,
      7: step7_completeMoreWords,
      8: step8_revealLetter,
      9: step9_completeAll,
      10: step10_finalModal,
      11: step11_qrCode,
      12: step12_floatingButton,
      13: step13_footer,
      14: step14_finalScroll,
    };

    const step = steps[stepNumber];
    if (step) {
      console.log(`🎬 Ejecutando paso ${stepNumber}...`);
      await step();
      console.log(`✅ Paso ${stepNumber} completado`);
    } else {
      console.log(`❌ Paso ${stepNumber} no existe. Pasos disponibles: 1-14`);
    }
  }

  // Variante rápida para redes sociales (60 segundos)
  async function runQuickDemo() {
    if (demoRunning) {
      console.log("⚠️  Ya hay una demo en ejecución");
      return;
    }

    demoRunning = true;
    demoPaused = false;

    console.log("🎬 Iniciando demo rápida (60 segundos)");

    try {
      // Intro + tema oscuro (10s)
      await step1_intro();
      await step2_darkMode();

      // Completar 1 palabra y ver tarjeta (20s)
      await step5_completeFirstWord();
      await step6_viewToast();

      // Completar resto rápido (15s)
      clickCell(1, 8);
      clickSyllable("A");
      await wait(300);
      clickSyllable("MOR");
      await wait(300);
      clickCell(2, 8);
      clickSyllable("SE");
      await wait(300);
      clickSyllable("ÑOR");
      await wait(300);
      clickCell(3, 8);
      clickSyllable("BE");
      await wait(300);
      clickSyllable("SO");
      await wait(300);
      clickCell(4, 8);
      clickSyllable("TO");
      await wait(300);
      clickSyllable("MA");
      await wait(300);
      clickSyllable("DA");
      await wait(300);
      clickCell(5, 8);
      clickSyllable("FRANC");
      await wait(300);
      clickCell(6, 8);
      clickSyllable("ES");
      await wait(300);
      clickSyllable("POR");
      await wait(300);
      clickSyllable("A");
      await wait(300);
      clickSyllable("CÁ");
      await wait(300);
      clickCell(7, 8);
      clickSyllable("PA");
      await wait(300);
      clickSyllable("SIÓN");
      await wait(500);
      click("#checkBtn");
      await wait(2000);

      // Modal final (10s)
      await wait(2000);
      highlightElement("#shareCanvas", 1500);
      await wait(2000);
      click("#closeModal");
      await wait(1000);

      // Botón flotante (5s)
      await step12_floatingButton();

      console.log("✅ Demo rápida completada!");
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      demoRunning = false;
    }
  }

  // ============================================
  // INSTRUCCIONES
  // ============================================

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   🎬 SCRIPT DE AUTOMATIZACIÓN - CRUCIGRAMA DEL AMOR 💖    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 COMANDOS DISPONIBLES:");
  console.log("");
  console.log("  runNarratedDemo()      - Demo narrada (recomendada para grabar)");
  console.log("  runNarratedDemo60()    - Demo narrada versión 60s");
  console.log("  runKeyboardDemo()      - Demo con flechas (←/→) y Esc");
  console.log("  runNarratedFirstWord() - Solo primer palabra (revisión)");
  console.log("  runFullDemo()          - Demo completa (2-3 minutos)");
  console.log("  runQuickDemo()         - Demo rápida (60 segundos)");
  console.log("  runDemoStep(n)         - Ejecutar solo el paso n (1-14)");
  console.log("  runGuidedDemo()        - Demo guiada (avanza con clic)");
  console.log("  runGuidedStep(n)       - Paso n con guía (1-14)");
  console.log("  pauseDemo()            - Pausar la demo");
  console.log("  resumeDemo()           - Reanudar la demo");
  console.log("");
  console.log("🎯 PASOS INDIVIDUALES:");
  console.log("");
  console.log("  1.  Intro y header sticky");
  console.log("  2.  Modo oscuro/claro");
  console.log("  3.  Modo compacto");
  console.log("  4.  Estilos de grilla");
  console.log("  5.  Completar SONRISA");
  console.log("  6.  Ver tarjeta personalizada");
  console.log("  7.  Completar AMOR, SEÑOR, BESO");
  console.log("  8.  Revelar letra");
  console.log("  9.  Completar todas las palabras");
  console.log("  10. Modal final");
  console.log("  11. Código QR");
  console.log("  12. Botón flotante");
  console.log("  13. Footer premium");
  console.log("  14. Scroll final");
  console.log("");
  console.log("⚡ INICIO RÁPIDO:");
  console.log("");
  console.log("  1. Refresca la página (F5)");
  console.log("  2. Inicia tu grabador de pantalla");
  console.log("  3. Ejecuta: await runNarratedDemo()");
  console.log("");
  console.log("════════════════════════════════════════════════════════════");
  console.log("");
  // Exponer API en un namespace seguro y también como alias globales
  window.DEMO = {
    runFullDemo,
    runQuickDemo,
    runDemoStep,
    runNarratedDemo,
    runNarratedFirstWord,
    runNarratedDemo60,
    runKeyboardDemo,
    runGuidedDemo,
    runGuidedStep,
    pauseDemo,
    resumeDemo,
    __ready: true,
  };
  window.DEMO_CONFIG = DEMO_CONFIG;
  window.DEMO_TEXT = DEMO_TEXT;
  window.runFullDemo = runFullDemo;
  window.runQuickDemo = runQuickDemo;
  window.runDemoStep = runDemoStep;
  window.runNarratedDemo = runNarratedDemo;
  window.runGuidedDemo = runGuidedDemo;
  window.runGuidedStep = runGuidedStep;
  window.pauseDemo = pauseDemo;
  window.resumeDemo = resumeDemo;
})();
