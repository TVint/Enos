/* =========================================================================
   MAIN APPLICATION LOADER & UI CONTROLLER (js/main.js)
   Inietta asincronamente components/header.html e components/footer.html
   e inizializza gli event listener solo a DOM completato.
   ========================================================================= */

/**
 * Carica un componente HTML esterno via fetch e lo inietta nel selettore indicato
 */
async function loadComponent(selector, filePath) {
    const placeholder = document.querySelector(selector);
    if (!placeholder) return;

    try {
        // Aggiungiamo un timestamp per bypassare la cache del browser durante lo sviluppo
        const cacheBuster = `?v=${Date.now()}`;
        const response = await fetch(filePath + cacheBuster, { cache: 'no-cache' });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP ${response.status} nel caricamento di ${filePath}`);
        }
        const html = await response.text();
        placeholder.innerHTML = html;
    } catch (error) {
        console.error(`[Enos Modular Loader] Impossibile caricare ${filePath}:`, error);
    }
}

/**
 * Inizializza il sistema di filtri multilivello nella pagina CTE (cte.html):
 * 1. Macro-Fornitura: Tutte / Luce / Gas (.macro-tab)
 * 2. Segmento Cliente: Tutti / Casa / Impresa & Condominio (.sub-tab)
 * 3. Taglia di Consumo: Tutte / S / M / L (.size-filter-pill & .size-pill)
 */
function initCteFilters() {
    const macroTabs = document.querySelectorAll('.macro-tab');
    const subTabs = document.querySelectorAll('.sub-tab');
    const sizePills = document.querySelectorAll('.size-filter-pill');
    const guideSizeCards = document.querySelectorAll('.size-pill[data-size-filter]');
    const macroSections = document.querySelectorAll('.cte-macro-section');
    const subBlocks = document.querySelectorAll('.cte-sub-block');
    const cteCards = document.querySelectorAll('.cte-card');

    if (macroTabs.length === 0 && subTabs.length === 0 && sizePills.length === 0) return;

    let activeMacro = 'all';
    let activeSegment = 'all';
    let activeSize = 'all';

    function syncSizeButtons(selectedSize) {
        sizePills.forEach(p => {
            p.classList.toggle('active', (p.getAttribute('data-size-filter') || 'all') === selectedSize);
        });
        guideSizeCards.forEach(card => {
            card.classList.toggle('active', card.getAttribute('data-size-filter') === selectedSize);
        });
        cteCards.forEach(card => {
            card.classList.toggle('highlight-size', selectedSize !== 'all' && card.getAttribute('data-size') === selectedSize);
        });
    }

    function applyFilters() {
        // 1. Filtra Macro Sezioni (Luce / Gas)
        macroSections.forEach(sec => {
            const secMacro = sec.getAttribute('data-macro-section');
            if (activeMacro === 'all' || secMacro === activeMacro) {
                sec.classList.remove('is-hidden');
            } else {
                sec.classList.add('is-hidden');
            }
        });

        // 2. Filtra Sotto-Blocchi (Casa vs Impresa/Condominio)
        subBlocks.forEach(block => {
            const blockSegment = block.getAttribute('data-segment');
            if (activeSegment === 'all' || blockSegment === activeSegment) {
                block.classList.remove('is-hidden');
            } else {
                block.classList.add('is-hidden');
            }
        });

        // 3. Filtra Singole Card per Taglia (S, M, L)
        cteCards.forEach(card => {
            const cardSize = card.getAttribute('data-size');
            if (activeSize === 'all' || cardSize === activeSize) {
                card.classList.remove('is-hidden-size');
            } else {
                card.classList.add('is-hidden-size');
            }
        });

        // 4. Nasconde eventuali sotto-blocchi senza card visibili
        subBlocks.forEach(block => {
            if (block.classList.contains('is-hidden')) return;
            const visibleCards = block.querySelectorAll('.cte-card:not(.is-hidden-size)');
            if (visibleCards.length === 0) {
                block.classList.add('is-hidden');
            }
        });
    }

    macroTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            macroTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            activeMacro = tab.getAttribute('data-macro') || 'all';
            applyFilters();
        });
    });

    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            subTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeSegment = tab.getAttribute('data-segment-filter') || 'all';
            applyFilters();
        });
    });

    sizePills.forEach(pill => {
        pill.addEventListener('click', () => {
            activeSize = pill.getAttribute('data-size-filter') || 'all';
            syncSizeButtons(activeSize);
            applyFilters();
        });
    });

    guideSizeCards.forEach(card => {
        card.addEventListener('click', () => {
            const clickedSize = card.getAttribute('data-size-filter');
            activeSize = (activeSize === clickedSize) ? 'all' : clickedSize;
            syncSizeButtons(activeSize);
            applyFilters();
        });
    });

    // Supporto hash URL (es. cte.html#luce o cte.html#gas)
    const checkHash = () => {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (hash === 'luce' || hash === 'gas') {
            const targetTab = document.querySelector(`.macro-tab[data-macro="${hash}"]`);
            if (targetTab) targetTab.click();
        }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
}

/**
 * Inizializza tutti gli event listener della pagina SOLO DOPO che
 * i componenti asincroni (Header, Menu Fullscreen e Footer) sono nel DOM.
 */
function initAppInteractions() {
    // 1. LOGICA MENU HAMBURGER E OVERLAY FULLSCREEN (SENZA REFLOW SCROLLBAR E SENZA FLICKER)
    const openBtn = document.getElementById("open-menu-btn");
    const closeBtn = document.getElementById("close-menu-btn");
    const overlayMenu = document.getElementById("fullscreen-menu");

    if (openBtn && closeBtn && overlayMenu) {
        openBtn.addEventListener("click", () => {
            document.body.classList.add("menu-open");
            overlayMenu.setAttribute("aria-hidden", "false");
            requestAnimationFrame(() => {
                overlayMenu.classList.add("active");
            });
        });

        closeBtn.addEventListener("click", () => {
            overlayMenu.classList.remove("active");
            overlayMenu.setAttribute("aria-hidden", "true");
            document.body.classList.remove("menu-open");
        });

        // Gestione click sulle voci del menu:
        // Se è un link ancora/PDF chiude subito il menu; se è una navigazione interna,
        // lascia espandere il portale senza sovrapporre due clip-path simultanei.
        overlayMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                const href = link.getAttribute("href") || "";
                const isDirectOrHash = href.startsWith("#") || href.toLowerCase().includes(".pdf") || link.hasAttribute("download") || link.target === "_blank";
                if (isDirectOrHash) {
                    overlayMenu.classList.remove("active");
                    overlayMenu.setAttribute("aria-hidden", "true");
                    document.body.classList.remove("menu-open");
                }
            });
        });
    }

    // 2. LOGICA STICKY HEADER
    const header = document.querySelector('.main-header');
    const hero = document.querySelector('.hero-section');
    if (header && hero) {
        const handleScroll = () => {
            if (window.scrollY >= hero.offsetHeight) {
                header.classList.add('is-sticky');
            } else {
                header.classList.remove('is-sticky');
            }
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
    } else if (header) {
        header.classList.add('is-sticky');
    }

    // 3. LOGICA CUSTOM CURSOR
    const cursor = document.getElementById("custom-cursor");
    if (cursor) {
        document.addEventListener("mousemove", (e) => {
            if (document.body.classList.contains("is-loading")) {
                cursor.style.opacity = "0";
                return;
            }
            cursor.style.left = e.clientX + "px";
            cursor.style.top = e.clientY + "px";
            
            if (e.clientX >= window.innerWidth - 30) {
                cursor.style.opacity = "0";
                document.body.style.cursor = "auto";
            } else {
                cursor.style.opacity = "1";
                document.body.style.cursor = "none";
            }
        });
    }

    // 4. SCROLL-REVEAL INTERSECTION OBSERVER
    const revealRows = document.querySelectorAll('.reveal-item');
    if (revealRows.length > 0) {
        const rowObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: "0px 0px -80px 0px", threshold: 0.01 });
        
        revealRows.forEach(row => rowObserver.observe(row));
    }

    // 5. LOGICA INTERATTIVA FAQ BENTO SQUARES
    const faqCards = document.querySelectorAll('.faq-card');
    faqCards.forEach(card => {
        const trigger = card.querySelector('.faq-trigger');
        const content = card.querySelector('.faq-content');
        if (!trigger || !content) return;

        trigger.addEventListener('click', () => {
            const isActive = card.classList.contains('active');
            faqCards.forEach(otherCard => {
                if (otherCard !== card && otherCard.classList.contains('active')) {
                    otherCard.classList.remove('active');
                    otherCard.querySelector('.faq-content').style.maxHeight = null;
                }
            });
            if (isActive) {
                card.classList.remove('active');
                content.style.maxHeight = null;
            } else {
                card.classList.add('active');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    // 6. SMART LINK APP STORE
    const appLink = document.getElementById('app-store-link');
    if (appLink) {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            appLink.href = "https://apps.apple.com/it/app/enos-energia";
        } else if (/android/i.test(userAgent)) {
            appLink.href = "https://play.google.com/store/apps/details?id=com.enosenergia.app";
        } else {
            appLink.href = "cte.html"; 
        }
    }

    // 7. FILTRI MULTILIVELLO PAGINA CTE
    initCteFilters();

    // 8. FORM CONTATTI DINAMICO (Preventivo / Servizio Clienti / Lavora con noi)
    initContactPage();

    // 9. PAGINA PRIVACY INTERATTIVA (Ricerca, Filtri, Accordion, TOC)
    initPrivacyPage();

    // 10. PAGINA BLOG (Filtro categorie)
    initBlogPage();

    // 11. TRANSIZIONE WOW PORTALE RADIALE DAL CLICK
    initPageTransitions();
}

/**
 * Gestisce il selettore motivo e il form interattivo nella pagina Contatti (contatti.html)
 */
function initContactPage() {
    const reasonCards = document.querySelectorAll('.reason-selector-card');
    const panels = document.querySelectorAll('.dynamic-reason-panel');
    const contactForm = document.getElementById('enos-contact-form');
    if (reasonCards.length === 0 || !contactForm) return;

    const reasonInput = document.getElementById('contact-reason-input');
    const badgeLabel = document.getElementById('form-badge-label');
    const dynamicTitle = document.getElementById('form-dynamic-title');
    const dynamicSubtitle = document.getElementById('form-dynamic-subtitle');
    const msgLabel = document.getElementById('label-messaggio');
    const msgField = document.getElementById('field-messaggio');
    const submitBtnText = document.getElementById('submit-btn-text');
    const feedbackMsg = document.getElementById('form-feedback-msg');
    const successState = document.getElementById('form-success-state');
    const successSummary = document.getElementById('success-summary-text');
    const mailtoFallbackBtn = document.getElementById('mailto-fallback-btn');
    const resetFormBtn = document.getElementById('reset-contact-form-btn');

    const reasonConfig = {
        'preventivo': {
            inputValue: 'Preventivo su misura',
            badge: 'PREVENTIVO SU MISURA',
            title: 'Richiedi la tua analisi energetica personalizzata',
            subtitle: 'Inserisci i tuoi riferimenti e indica il tipo di utenza: un nostro consulente analizzerà il tuo profilo senza alcun impegno.',
            msgLabel: 'Le tue esigenze o note sui consumi *',
            msgPlaceholder: 'Raccontaci brevemente le tue necessità o indicaci la fascia oraria preferita per essere ricontattato...',
            btnText: 'Invia richiesta preventivo'
        },
        'servizio-clienti': {
            inputValue: 'Servizio clienti',
            badge: 'SERVIZIO CLIENTI & SUPPORTO',
            title: 'Come possiamo assisterti sulla tua fornitura?',
            subtitle: 'Indica il motivo della richiesta e, se lo hai a portata di mano, il tuo codice cliente o POD/PdR per velocizzare la gestione.',
            msgLabel: 'Descrivi la tua richiesta di assistenza *',
            msgPlaceholder: 'Specifica i dettagli della tua richiesta (es. chiarimenti bolletta, variazione anagrafica, subentro, voltura)...',
            btnText: 'Invia richiesta al Servizio Clienti'
        },
        'lavora-con-noi': {
            inputValue: 'Lavora con noi',
            badge: 'CARRIERE & TALENTI ENOS',
            title: 'Costruiamo insieme il futuro dell\'energia digitale',
            subtitle: 'Invia la tua candidatura e raccontaci le tue competenze: siamo sempre alla ricerca di persone dinamiche e orientate all\'innovazione.',
            msgLabel: 'Presentati brevemente *',
            msgPlaceholder: 'Raccontaci il tuo percorso professionale, le tue aspirazioni e perché vorresti entrare nel team Enos Energia...',
            btnText: 'Invia la tua candidatura'
        }
    };

    function activateReason(reasonKey) {
        const cfg = reasonConfig[reasonKey] || reasonConfig['preventivo'];

        reasonCards.forEach(card => {
            const isMatch = card.getAttribute('data-reason') === reasonKey;
            card.classList.toggle('active', isMatch);
            card.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            const indicator = card.querySelector('.reason-active-indicator');
            if (indicator) indicator.textContent = isMatch ? 'Selezionato' : 'Seleziona';
        });

        panels.forEach(panel => {
            panel.classList.toggle('is-active', panel.getAttribute('data-panel') === reasonKey);
        });

        if (reasonInput) reasonInput.value = cfg.inputValue;
        if (badgeLabel) badgeLabel.textContent = cfg.badge;
        if (dynamicTitle) dynamicTitle.textContent = cfg.title;
        if (dynamicSubtitle) dynamicSubtitle.textContent = cfg.subtitle;
        if (msgLabel) msgLabel.innerHTML = `${cfg.msgLabel.replace('*', '')} <span class="req">*</span>`;
        if (msgField) msgField.placeholder = cfg.msgPlaceholder;
        if (submitBtnText) submitBtnText.textContent = cfg.btnText;

        if (feedbackMsg) {
            feedbackMsg.textContent = '';
            feedbackMsg.className = 'form-feedback-msg';
        }
    }

    reasonCards.forEach(card => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-reason');
            activateReason(key);
        });
    });

    // Supporto parametri URL (?motivo=lavora-con-noi) o hash (#lavora-con-noi)
    const checkUrlReason = () => {
        const params = new URLSearchParams(window.location.search);
        const queryReason = (params.get('motivo') || '').toLowerCase();
        const hashReason = window.location.hash.replace('#', '').toLowerCase();
        const targetReason = queryReason || hashReason;
        if (reasonConfig[targetReason]) {
            activateReason(targetReason);
        }
    };
    checkUrlReason();
    window.addEventListener('hashchange', checkUrlReason);

    // Gestione Pill Radio (Casa vs Impresa)
    const pillRadios = contactForm.querySelectorAll('.pill-radio');
    pillRadios.forEach(pill => {
        const input = pill.querySelector('input[type="radio"]');
        if (!input) return;
        input.addEventListener('change', () => {
            pillRadios.forEach(p => p.classList.remove('active'));
            if (input.checked) pill.classList.add('active');
        });
    });

    // Gestione File Dropzones (Bolletta & CV)
    const dropzones = contactForm.querySelectorAll('.file-dropzone');
    dropzones.forEach(zone => {
        const fileInput = zone.querySelector('input[type="file"]');
        const nameDisplay = zone.querySelector('.file-name-display');
        if (!fileInput || !nameDisplay) return;

        const defaultText = nameDisplay.textContent;

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                nameDisplay.textContent = `File allegato: ${fileInput.files[0].name}`;
                zone.classList.add('has-file');
            } else {
                nameDisplay.textContent = defaultText;
                zone.classList.remove('has-file');
            }
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('is-dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('is-dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('is-dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                nameDisplay.textContent = `File allegato: ${e.dataTransfer.files[0].name}`;
                zone.classList.add('has-file');
            }
        });
    });

    // Gestione Invio Form
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('field-nome').value.trim();
        const email = document.getElementById('field-email').value.trim();
        const telefono = document.getElementById('field-telefono').value.trim();
        const citta = document.getElementById('field-citta').value.trim();
        const messaggio = document.getElementById('field-messaggio').value.trim();
        const privacy = document.getElementById('field-privacy').checked;
        const motivo = reasonInput ? reasonInput.value : 'Contatto';

        if (!nome || !email || !telefono || !messaggio) {
            feedbackMsg.textContent = 'Compila tutti i campi obbligatori contrassegnati con asterisco (*).';
            feedbackMsg.className = 'form-feedback-msg is-error';
            return;
        }

        if (!privacy) {
            feedbackMsg.textContent = 'È necessario accettare l\'informativa privacy per procedere con l\'invio.';
            feedbackMsg.className = 'form-feedback-msg is-error';
            return;
        }

        // Costruisce i dettagli specifici in base al motivo selezionato
        let extraDetails = '';
        if (motivo === 'Preventivo su misura') {
            const profilo = contactForm.querySelector('input[name="profilo_utenza"]:checked')?.value || '';
            const fornitura = document.getElementById('field-fornitura')?.value || '';
            extraDetails = `Profilo Utenza: ${profilo}\nFornitura d'interesse: ${fornitura}`;
        } else if (motivo === 'Servizio clienti') {
            const argomento = document.getElementById('field-argomento-assistenza')?.value || '';
            const pod = document.getElementById('field-codice-pod')?.value.trim() || 'Non indicato';
            extraDetails = `Ambito Assistenza: ${argomento}\nCodice Cliente / POD / PdR: ${pod}`;
        } else if (motivo === 'Lavora con noi') {
            const area = document.getElementById('field-area-carriera')?.value || '';
            const linkedin = document.getElementById('field-linkedin')?.value.trim() || 'Non indicato';
            extraDetails = `Area Candidatura: ${area}\nLinkedIn / Portfolio: ${linkedin}`;
        }

        const subject = encodeURIComponent(`[Enos Energia Web] ${motivo} - ${nome}`);
        const body = encodeURIComponent(
            `Motivo di contatto: ${motivo}\n` +
            `Nome / Ragione Sociale: ${nome}\n` +
            `Email: ${email}\n` +
            `Telefono: ${telefono}\n` +
            `Città / Provincia: ${citta || 'Non indicata'}\n` +
            `${extraDetails}\n\n` +
            `Messaggio:\n${messaggio}`
        );

        if (mailtoFallbackBtn) {
            mailtoFallbackBtn.href = `mailto:bolletta@enosenergia.it?subject=${subject}&body=${body}`;
        }

        if (successSummary) {
            successSummary.innerHTML = `Grazie <strong>${nome}</strong>! La tua richiesta per <strong>${motivo}</strong> è stata registrata. Un consulente Enos Energia ti risponderà all'indirizzo <strong>${email}</strong> o al numero <strong>${telefono}</strong>.`;
        }

        contactForm.hidden = true;
        if (successState) successState.hidden = false;
    });

    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', () => {
            contactForm.reset();
            contactForm.querySelectorAll('.file-dropzone').forEach(z => z.classList.remove('has-file'));
            contactForm.hidden = false;
            if (successState) successState.hidden = true;
            activateReason('preventivo');
        });
    }
}

/**
 * Gestisce l'esploratore interattivo della pagina Privacy (privacy.html):
 * - Accordion sui singoli articoli + pulsanti Espandi/Comprimi tutto
 * - Filtro per macro-argomento (pillole) e ricerca full-text istantanea
 * - Indice laterale sincronizzato con lo scroll
 */
function initPrivacyPage() {
    const articles = document.querySelectorAll('.privacy-article-card');
    if (articles.length === 0) return;

    const searchInput = document.getElementById('privacy-search-input');
    const filterPills = document.querySelectorAll('.priv-filter-pill');
    const tocItems = document.querySelectorAll('.toc-item');
    const expandAllBtn = document.getElementById('priv-expand-all');
    const collapseAllBtn = document.getElementById('priv-collapse-all');
    const emptyState = document.getElementById('privacy-empty-search');
    const resetSearchBtn = document.getElementById('privacy-reset-search-btn');

    let activeCategory = 'all';

    // 1. Toggle singolo articolo
    articles.forEach(card => {
        const headerBtn = card.querySelector('.priv-article-header');
        if (!headerBtn) return;
        headerBtn.addEventListener('click', () => {
            const isOpen = card.classList.toggle('is-open');
            headerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    });

    // 2. Espandi / Comprimi tutti
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            articles.forEach(card => {
                card.classList.add('is-open');
                const btn = card.querySelector('.priv-article-header');
                if (btn) btn.setAttribute('aria-expanded', 'true');
            });
        });
    }

    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => {
            articles.forEach(card => {
                card.classList.remove('is-open');
                const btn = card.querySelector('.priv-article-header');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // 3. Funzione di filtro combinata (Categoria + Ricerca)
    function filterArticles() {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        let visibleCount = 0;

        articles.forEach(card => {
            const cat = card.getAttribute('data-priv-category');
            const matchesCat = activeCategory === 'all' || cat === activeCategory;
            const text = card.textContent.toLowerCase();
            const matchesSearch = !query || text.includes(query);

            if (matchesCat && matchesSearch) {
                card.style.display = '';
                if (query) {
                    card.classList.add('is-open');
                    const btn = card.querySelector('.priv-article-header');
                    if (btn) btn.setAttribute('aria-expanded', 'true');
                }
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (emptyState) {
            emptyState.hidden = visibleCount > 0;
        }
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-priv-group') || 'all';
            filterArticles();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', filterArticles);
    }

    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            activeCategory = 'all';
            filterPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-priv-group') === 'all'));
            filterArticles();
        });
    }

    // 4. Click su voce indice TOC -> assicura che l'articolo sia visibile e aperto
    tocItems.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('data-toc-target');
            const targetCard = document.getElementById(targetId);
            if (!targetCard) return;

            e.preventDefault();
            if (targetCard.style.display === 'none') {
                if (searchInput) searchInput.value = '';
                activeCategory = 'all';
                filterPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-priv-group') === 'all'));
                filterArticles();
            }

            targetCard.classList.add('is-open');
            const btn = targetCard.querySelector('.priv-article-header');
            if (btn) btn.setAttribute('aria-expanded', 'true');

            tocItems.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // 5. Scroll-spy leggero per evidenziare l'articolo corrente nella sidebar
    window.addEventListener('scroll', () => {
        let currentId = '';
        articles.forEach(card => {
            if (card.style.display === 'none') return;
            const rect = card.getBoundingClientRect();
            if (rect.top <= 180) {
                currentId = card.id;
            }
        });
        if (currentId) {
            tocItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-toc-target') === currentId);
            });
        }
    }, { passive: true });
}

/**
 * Gestisce il filtro per categoria nella pagina Blog (blog.html)
 */
function initBlogPage() {
    const pills = document.querySelectorAll('.blog-cat-pill');
    const posts = document.querySelectorAll('.blog-post-card');
    if (pills.length === 0 || posts.length === 0) return;

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const filter = pill.getAttribute('data-blog-filter') || 'all';
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            posts.forEach(post => {
                const cat = post.getAttribute('data-blog-category');
                post.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
            });
        });
    });
}

/**
 * Ripristina istantaneamente portale, menu e preloader (fondamentale quando
 * l'utente preme il tasto "Indietro" o "Avanti" del browser con bfcache).
 */
function resetOverlaysOnBackNavigation(forceInstantReset = false) {
    const portal = document.querySelector('.page-portal');
    if (portal) {
        if (forceInstantReset) {
            portal.classList.add('is-reset');
            portal.classList.remove('is-active', 'is-revealing');
            portal.classList.add('is-done');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => portal.classList.remove('is-reset'));
            });
        } else {
            portal.classList.remove('is-active', 'is-revealing');
            portal.classList.add('is-done');
        }
    }

    const overlayMenu = document.getElementById('fullscreen-menu');
    if (overlayMenu) {
        overlayMenu.classList.remove('active');
        overlayMenu.setAttribute('aria-hidden', 'true');
    }

    const preloader = document.getElementById('preloader');
    if (preloader && forceInstantReset) {
        preloader.classList.add('preloader-hidden');
        preloader.style.display = 'none';
    }

    document.body.classList.remove('is-loading', 'menu-open', 'page-leaving');
    document.body.style.removeProperty('overflow');
}

/**
 * Crea un portale circolare Navy che si espande dal punto esatto del click
 * e salta il preloader arancione della batteria nella pagina di arrivo.
 */
function initPageTransitions() {
    let portal = document.querySelector('.page-portal');
    if (!portal) {
        portal = document.createElement('div');
        portal.className = 'page-portal';
        document.body.appendChild(portal);
    }

    const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const isBackForward = navEntry && navEntry.type === 'back_forward';

    // Se l'utente è tornato indietro/avanti col browser, puliamo subito ogni overlay
    if (isBackForward) {
        sessionStorage.removeItem('enos_portal_nav');
        resetOverlaysOnBackNavigation(true);
    } else if (sessionStorage.getItem('enos_portal_nav') === '1') {
        // Se arriviamo da un click interno, apriamo subito il portale senza attendere la batteria
        sessionStorage.removeItem('enos_portal_nav');
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.style.display = 'none';
        document.body.classList.remove('is-loading', 'menu-open');
        document.body.style.removeProperty('overflow');

        portal.classList.remove('is-reset', 'is-active', 'is-done');
        portal.classList.add('is-revealing');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => portal.classList.add('is-done'));
        });
    }

    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.toLowerCase().includes('.pdf') || link.hasAttribute('download') || link.target === '_blank') return;

            const targetUrl = new URL(href, window.location.href);
            if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) return;

            e.preventDefault();
            portal.classList.remove('is-reset', 'is-revealing', 'is-done');
            portal.style.setProperty('--click-x', `${e.clientX}px`);
            portal.style.setProperty('--click-y', `${e.clientY}px`);
            portal.classList.add('is-active');

            sessionStorage.setItem('enos_portal_nav', '1');
            setTimeout(() => {
                // Chiude silenziosamente il menu dietro il portale prima del cambio pagina
                const overlayMenu = document.getElementById('fullscreen-menu');
                if (overlayMenu) {
                    overlayMenu.classList.remove('active');
                    overlayMenu.setAttribute('aria-hidden', 'true');
                }
                document.body.classList.remove('menu-open');
                window.location.href = href;
            }, 500);
        });
    });
}

// Gestione nativa bfcache (Back/Forward Cache del browser) e tasto Indietro
window.addEventListener('pageshow', function(event) {
    const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const isBackForward = navEntry && navEntry.type === 'back_forward';
    if (event.persisted || isBackForward) {
        sessionStorage.removeItem('enos_portal_nav');
        resetOverlaysOnBackNavigation(true);
    }
});

window.addEventListener('popstate', function() {
    resetOverlaysOnBackNavigation(true);
});

window.addEventListener('pagehide', function() {
    // Quando la pagina viene salvata nella bfcache del browser, rimuove lo stato attivo del portale
    const portal = document.querySelector('.page-portal');
    if (portal && portal.classList.contains('is-active')) {
        portal.classList.add('is-reset');
        portal.classList.remove('is-active');
    }
});

// Blocco dello scroll durante Preloader o Menu aperto SENZA nascondere la scrollbar (zero layout shift)
window.addEventListener('wheel', function(e) {
    if (document.body.classList.contains('menu-open') || document.body.classList.contains('is-loading')) {
        const insideScrollableToc = e.target.closest && e.target.closest('.privacy-toc-list');
        if (!insideScrollableToc) {
            e.preventDefault();
        }
    }
}, { passive: false });

window.addEventListener('touchmove', function(e) {
    if (document.body.classList.contains('menu-open') || document.body.classList.contains('is-loading')) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('keydown', function(e) {
    if (document.body.classList.contains('menu-open') || document.body.classList.contains('is-loading')) {
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (scrollKeys.includes(e.key) && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            e.preventDefault();
        }
        if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
            const overlayMenu = document.getElementById('fullscreen-menu');
            if (overlayMenu) {
                overlayMenu.classList.remove('active');
                overlayMenu.setAttribute('aria-hidden', 'true');
            }
            document.body.classList.remove('menu-open');
        }
    }
});

// 8. LOGICA PRELOADER (Su Window Load)
window.addEventListener("load", function() {
    setTimeout(() => {
        const preloader = document.getElementById("preloader");
        if (preloader) {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                preloader.style.display = "none";
                const overlayMenu = document.getElementById("fullscreen-menu");
                if (!overlayMenu || !overlayMenu.classList.contains("active")) {
                    document.body.classList.remove("is-loading");
                    document.body.style.removeProperty("overflow");
                }
            }, 800); 
        }
    }, 1000); 
});

// Bootstrap asincrono al caricamento del DOM
document.addEventListener("DOMContentLoaded", async function() {
    await Promise.all([
        loadComponent("#header-placeholder", "components/header.html"),
        loadComponent("#footer-placeholder", "components/footer.html")
    ]);

    initAppInteractions();
});
