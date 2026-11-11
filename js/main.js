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
    // 1. LOGICA MENU HAMBURGER E OVERLAY FULLSCREEN
    const openBtn = document.getElementById("open-menu-btn");
    const closeBtn = document.getElementById("close-menu-btn");
    const overlayMenu = document.getElementById("fullscreen-menu");

    if (openBtn && closeBtn && overlayMenu) {
        openBtn.addEventListener("click", () => {
            overlayMenu.classList.add("active");
            overlayMenu.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        });

        closeBtn.addEventListener("click", () => {
            overlayMenu.classList.remove("active");
            overlayMenu.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "auto";
        });

        // Chiude l'overlay cliccando su qualsiasi voce di menu
        overlayMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                overlayMenu.classList.remove("active");
                overlayMenu.setAttribute("aria-hidden", "true");
                document.body.style.overflow = "auto";
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

    // 8. TRANSIZIONE WOW PORTALE RADIALE DAL CLICK
    initPageTransitions();
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

    // Se arriviamo da un click interno, apriamo subito il portale senza attendere la batteria
    if (sessionStorage.getItem('enos_portal_nav') === '1') {
        sessionStorage.removeItem('enos_portal_nav');
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.style.display = 'none';
        document.body.classList.remove('is-loading');
        document.body.style.overflow = 'auto';

        portal.classList.add('is-revealing');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => portal.classList.add('is-done'));
        });
    }

    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.endsWith('.pdf') || link.target === '_blank') return;

            const targetUrl = new URL(href, window.location.href);
            if (targetUrl.pathname === window.location.pathname && targetUrl.hash) return;

            e.preventDefault();
            portal.style.setProperty('--click-x', `${e.clientX}px`);
            portal.style.setProperty('--click-y', `${e.clientY}px`);
            portal.classList.remove('is-revealing', 'is-done');
            portal.classList.add('is-active');

            sessionStorage.setItem('enos_portal_nav', '1');
            setTimeout(() => {
                window.location.href = href;
            }, 520);
        });
    });
}

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
                    document.body.style.overflow = "auto";
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
