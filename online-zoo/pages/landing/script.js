(function () {
    'use strict';

    const POPUP_CARE_ID = 'popup-care';
    const POPUP_FORM_ID = 'popup-donation-form';
    const TOTAL_STEPS = 3;

    const getPopup = (id) => document.getElementById(id);
    const getCareTriggers = () => document.querySelectorAll('[data-popup="care"]');
    const getFormTriggers = () => document.querySelectorAll('[data-popup="donation-form"]');

    const openCarePopup = () => {
        const overlay = getPopup(POPUP_CARE_ID);
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'false');
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        const focusable = overlay.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    };

    const closeCarePopup = () => {
        const overlay = getPopup(POPUP_CARE_ID);
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    };

    const openDonationForm = (presetAmount) => {
        const overlay = getPopup(POPUP_FORM_ID);
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'false');
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        setDonationStep(1);
        if (presetAmount != null) {
            const btn = overlay.querySelector(`.donation-form__amount-btn[data-amount="${presetAmount}"]`);
            if (btn) {
                overlay.querySelectorAll('.donation-form__amount-btn').forEach((b) => b.classList.remove('is-selected'));
                btn.classList.add('is-selected');
            }
        }
        const firstFocus = overlay.querySelector('.donation-form__amount-btn, .donation-form__input');
        if (firstFocus) firstFocus.focus();
    };

    const closeDonationForm = () => {
        const overlay = getPopup(POPUP_FORM_ID);
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        closePetDropdown();
    };

    const setDonationStep = (step) => {
        const overlay = getPopup(POPUP_FORM_ID);
        if (!overlay) return;
        const steps = overlay.querySelectorAll('.donation-form__step');
        const dots = overlay.querySelectorAll('.donation-form__step-dot');
        const backBtn = overlay.querySelector('.donation-form__back');
        const nextBtn = overlay.querySelector('.donation-form__next');
        const completeBtn = overlay.querySelector('.donation-form__complete');

        steps.forEach((s, i) => {
            s.hidden = parseInt(s.dataset.step, 10) !== step;
        });
        dots.forEach((d, i) => {
            const n = parseInt(d.dataset.step, 10);
            d.classList.toggle('is-active', n <= step);
            d.setAttribute('aria-current', n === step ? 'step' : null);
        });

        if (backBtn) backBtn.hidden = step === 1;
        if (nextBtn) nextBtn.hidden = step === 3;
        if (completeBtn) completeBtn.hidden = step !== 3;
    };

    const closePetDropdown = () => {
        const trigger = document.getElementById('donation-pet-trigger');
        const dropdown = document.getElementById('donation-pet-dropdown');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (dropdown) dropdown.classList.remove('is-open');
    };

    const handleOverlayClick = (e, popupId) => {
        if (e.target !== e.currentTarget) return;
        if (popupId === POPUP_CARE_ID) closeCarePopup();
        else if (popupId === POPUP_FORM_ID) closeDonationForm();
    };

    const handleKeyDown = (e) => {
        if (e.key !== 'Escape') return;
        const care = getPopup(POPUP_CARE_ID);
        const form = getPopup(POPUP_FORM_ID);
        if (form && form.getAttribute('aria-hidden') === 'false') {
            const dropdown = document.getElementById('donation-pet-dropdown');
            if (dropdown && dropdown.classList.contains('is-open')) closePetDropdown();
            else closeDonationForm();
        } else if (care && care.getAttribute('aria-hidden') === 'false') closeCarePopup();
    };

    const initCarePopup = () => {
        const overlay = getPopup(POPUP_CARE_ID);
        if (!overlay) return;
        overlay.querySelector('.popup__close')?.addEventListener('click', closeCarePopup);
        overlay.addEventListener('click', (e) => handleOverlayClick(e, POPUP_CARE_ID));

        getCareTriggers().forEach((trigger) => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                openCarePopup();
            });
        });

        overlay.querySelectorAll('.popup__amount-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const amount = btn.classList.contains('popup__amount-btn--other') ? null : btn.dataset.amount;
                closeCarePopup();
                openDonationForm(amount ? parseInt(amount, 10) : null);
            });
        });
    };

    const initDonationForm = () => {
        const overlay = getPopup(POPUP_FORM_ID);
        if (!overlay) return;

        overlay.querySelector('.donation-form__close')?.addEventListener('click', closeDonationForm);
        overlay.addEventListener('click', (e) => handleOverlayClick(e, POPUP_FORM_ID));

        overlay.querySelector('.donation-form__next')?.addEventListener('click', () => {
            const current = overlay.querySelector('.donation-form__step:not([hidden])');
            if (!current) return;
            const step = parseInt(current.dataset.step, 10);
            if (step < TOTAL_STEPS) setDonationStep(step + 1);
        });

        overlay.querySelector('.donation-form__back')?.addEventListener('click', () => {
            const current = overlay.querySelector('.donation-form__step:not([hidden])');
            if (!current) return;
            const step = parseInt(current.dataset.step, 10);
            if (step > 1) setDonationStep(step - 1);
        });

        overlay.querySelector('.donation-form__complete')?.addEventListener('click', () => {
            closeDonationForm();
        });

        overlay.querySelectorAll('.donation-form__amount-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.donation-form__amount-btn').forEach((b) => b.classList.remove('is-selected'));
                btn.classList.add('is-selected');
            });
        });

        const petTrigger = document.getElementById('donation-pet-trigger');
        const petDropdown = document.getElementById('donation-pet-dropdown');
        if (petTrigger && petDropdown) {
            petTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = petDropdown.classList.toggle('is-open');
                petTrigger.setAttribute('aria-expanded', isOpen);
            });
            petDropdown.querySelectorAll('.donation-form__pet-list li').forEach((li) => {
                li.addEventListener('click', () => {
                    const name = li.textContent;
                    petTrigger.querySelector('.donation-form__pet-btn-text').textContent = name;
                    petTrigger.querySelector('.donation-form__pet-btn-text').style.color = '#000000';
                    petDropdown.querySelectorAll('li').forEach((l) => l.classList.remove('is-selected'));
                    li.classList.add('is-selected');
                    closePetDropdown();
                });
            });
        }

        document.addEventListener('click', (e) => {
            const wrap = petTrigger?.closest('.donation-form__pet-select-wrap');
            if (petDropdown?.classList.contains('is-open') && !wrap?.contains(e.target) && !petDropdown.contains(e.target)) {
                closePetDropdown();
            }
        });
        petDropdown?.addEventListener('click', (e) => e.stopPropagation());
    };

    getFormTriggers().forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openDonationForm(null);
        });
    });

    document.addEventListener('keydown', handleKeyDown);

    const initPetsSlider = () => {
        if (window.innerWidth <= 640) return;
        const prevBtn = document.querySelector('.pets__arrow--prev');
        const nextBtn = document.querySelector('.pets__arrow--next');
        const track = document.querySelector('.pets__track');
        const slide1 = document.querySelector('.pets__slide:not(.pets__slide--mirrored)');
        const mirroredSlide = document.querySelector('.pets__slide--mirrored');
        const row1 = document.querySelector('.pets__row[data-row="1"]');
        const row2 = document.querySelector('.pets__row[data-row="2"]');
        if (!prevBtn || !nextBtn || !track || !mirroredSlide || !row1 || !row2) return;

        mirroredSlide.appendChild(row2.cloneNode(true));
        mirroredSlide.appendChild(row1.cloneNode(true));

        let currentSlide = 0;
        const totalSlides = 2;

        const updateSlider = () => {
            track.style.transform = `translateX(-${currentSlide * 50}%)`;
            mirroredSlide.setAttribute('aria-hidden', currentSlide === 0 ? 'true' : 'false');
            if (slide1) slide1.setAttribute('aria-hidden', currentSlide === 1 ? 'true' : 'false');
        };

        const handlePrev = () => {
            if (currentSlide > 0) {
                currentSlide -= 1;
                updateSlider();
            }
        };

        const handleNext = () => {
            if (currentSlide < totalSlides - 1) {
                currentSlide += 1;
                updateSlider();
            }
        };

        prevBtn.addEventListener('click', handlePrev);
        nextBtn.addEventListener('click', handleNext);

        prevBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePrev();
            }
        });
        nextBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            }
        });

        updateSlider();
    };

    const initTestimonialsSlider = () => {
        if (window.innerWidth <= 640) return;
        const prevBtn = document.querySelector('.testimonials__arrow--prev');
        const nextBtn = document.querySelector('.testimonials__arrow--next');
        const track = document.querySelector('.testimonials__track');
        const slides = document.querySelectorAll('.testimonials__slide');
        if (!prevBtn || !nextBtn || !track || slides.length === 0) return;

        let currentSlide = 0;
        const totalSlides = slides.length;

        const updateSlider = () => {
            track.style.transform = `translateX(-${currentSlide * 50}%)`;
            slides.forEach((slide, i) => {
                slide.setAttribute('aria-hidden', i !== currentSlide ? 'true' : 'false');
            });
            prevBtn.setAttribute('aria-disabled', currentSlide === 0 ? 'true' : 'false');
            nextBtn.setAttribute('aria-disabled', currentSlide === totalSlides - 1 ? 'true' : 'false');
        };

        const handlePrev = () => {
            if (currentSlide > 0) {
                currentSlide -= 1;
                updateSlider();
            }
        };

        const handleNext = () => {
            if (currentSlide < totalSlides - 1) {
                currentSlide += 1;
                updateSlider();
            }
        };

        prevBtn.addEventListener('click', handlePrev);
        nextBtn.addEventListener('click', handleNext);

        prevBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePrev();
            }
        });
        nextBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            }
        });

        updateSlider();
    };

    const initHamburger = () => {
        const hamburger = document.querySelector('.nav__hamburger');
        const overlay = document.getElementById('nav-overlay');
        const closeBtn = overlay?.querySelector('.nav-overlay__close');
        const overlayLinks = overlay?.querySelectorAll('.nav-overlay__link');

        if (!hamburger || !overlay) return;

        const openMenu = () => {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.setAttribute('aria-label', 'Close menu');
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Open menu');
            document.body.style.overflow = '';
        };

        hamburger.addEventListener('click', () => {
            if (overlay.classList.contains('is-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }

        overlayLinks?.forEach((link) => {
            link.addEventListener('click', closeMenu);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('is-open')) {
                closeMenu();
            }
        });
    };

    const initDonationBanner = () => {
        const form = document.querySelector('.donation-banner__form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('.donation-banner__input');
            const raw = input && input.value.trim().replace(/[$,]/g, '');
            const amount = raw ? parseInt(raw, 10) : null;
            if (Number.isNaN(amount) || amount <= 0) {
                openCarePopup();
            } else {
                openDonationForm(amount);
            }
        });
    };

    const initPetCardLinks = () => {
        const cards = document.querySelectorAll('.pet-card[data-link]');
        cards.forEach((card) => {
            const url = card.getAttribute('data-link');
            if (!url) return;

            const handleNavigate = () => {
                window.location.href = url;
            };

            card.addEventListener('click', handleNavigate);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigate();
                }
            });

            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'link');
        });
    };

    const initZoosSidebar = () => {
        const sidebar = document.querySelector('.zoos-sidebar');
        const toggleBtn = sidebar?.querySelector('.zoos-sidebar__more');
        if (!sidebar || !toggleBtn) return;

        const setState = (isCollapsed) => {
            sidebar.classList.toggle('zoos-sidebar--collapsed', isCollapsed);
            const expanded = !isCollapsed;
            sidebar.setAttribute('aria-expanded', String(expanded));
            toggleBtn.setAttribute('aria-expanded', String(expanded));
            toggleBtn.setAttribute('aria-label', expanded ? 'Collapse side panel' : 'Expand side panel');
        };

        toggleBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.toggle('zoos-sidebar--collapsed');
            const expanded = !isCollapsed;
            sidebar.setAttribute('aria-expanded', String(expanded));
            toggleBtn.setAttribute('aria-expanded', String(expanded));
            toggleBtn.setAttribute('aria-label', expanded ? 'Collapse side panel' : 'Expand side panel');
        });

        toggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleBtn.click();
            }
        });

        setState(false);
    };

    const init = () => {
        initCarePopup();
        initDonationForm();
        initPetsSlider();
        initTestimonialsSlider();
        initDonationBanner();
        initHamburger();
        initZoosSidebar();
        initPetCardLinks();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
