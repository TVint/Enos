document.addEventListener("DOMContentLoaded", function() {
    const heroSec = document.querySelector('.hero-section');
    const nightSky = document.querySelector('.sky-night');

    if (heroSec && nightSky) {
        setInterval(() => {
            const nightOpacity = parseFloat(window.getComputedStyle(nightSky).opacity);
            // Quando il layer notte supera il 50% di visibilità
            if (nightOpacity > 0.5) {
                heroSec.classList.add('is-night');
            } else {
                heroSec.classList.remove('is-night');
            }
        }, 400);
    }
});