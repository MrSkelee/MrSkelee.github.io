/* ==========================================================================
   MrSkele Portfolio — 3D Cyber Sphere (DomeGallery) & Motion System
   Faithful port of react-bits / xiaopu-ai DomeGallery (MIT)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Ensure Emerald theme is permanently set
    document.documentElement.setAttribute('data-theme', 'emerald');

    // =========================================================================
    // 3. 🌐 3D SPHERICAL PROJECT SHOWCASE (Real Projects in 3D Space)
    // =========================================================================
    function initProjectSphere() {
        const stage = document.getElementById('projectSphereStage');
        const world = document.getElementById('projectSphereWorld');

        if (!stage || !world) return;

        const cards = Array.from(world.querySelectorAll('.sphere-card'));
        const N = cards.length;
        if (N === 0) return;

        const stepYaw = 360 / N; // ~32.727 deg
        const pitches = [0, 8, -8, 10, -10, 7, -7, 9, -9, 8, -6];
        const MAX_VERT = 24;
        const DRAG_SENS = 4.2;

        const getRadius = () => (window.innerWidth < 768 ? 480 : 660);

        function layoutCards() {
            const r = getRadius();
            cards.forEach((card, i) => {
                const yaw = i * stepYaw;
                const pitch = pitches[i % pitches.length];
                card.dataset.yaw = yaw;
                card.dataset.pitch = pitch;
                card.dataset.index = i;
                card.style.transform = `rotateY(${yaw}deg) rotateX(${pitch}deg) translateZ(${r}px)`;
            });
        }
        layoutCards();

        // Direct click handler for all project repository links
        cards.forEach((card) => {
            const link = card.querySelector('.project-link');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = link.getAttribute('href');
                    if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                });
            }
        });

        window.addEventListener('resize', () => {
            layoutCards();
            applyTransform();
        });

        const rot = { x: 0, y: 0 };
        const portal = document.getElementById('sphereCinemaPortal');

        // Cinematic Scroll-Driven Zoom (Hero -> Progetti 3D)
        let targetProgress = 1;
        let smoothProgress = 1;

        function updateScrollZoom() {
            const rect = stage.getBoundingClientRect();
            const winH = window.innerHeight;
            const enterY = winH;
            const centerY = Math.max(0, (winH - stage.offsetHeight) / 2);
            
            let raw = 0;
            if (rect.top >= enterY) {
                raw = 0;
            } else if (rect.top <= centerY) {
                raw = 1;
            } else {
                raw = (enterY - rect.top) / (enterY - centerY);
            }
            raw = Math.max(0, Math.min(1, raw));
            // Filmic Smoothstep curve for seamless cinematic camera acceleration & deceleration
            targetProgress = raw * raw * (3 - 2 * raw);
        }

        window.addEventListener('scroll', updateScrollZoom, { passive: true });
        updateScrollZoom();
        smoothProgress = targetProgress;

        const applyTransform = () => {
            const r = getRadius();
            // Cinematic zoom calculations:
            // At progress 0 (in distance): scale 0.62, deep Z -340px, tilt 16deg, opacity 0.35
            // At progress 1 (centered): scale 1.0, Z 0px, tilt 0deg, opacity 1.0
            const cineScale = 0.62 + 0.38 * smoothProgress;
            const cineZ = -340 * (1 - smoothProgress);
            const cineTilt = 16 * (1 - smoothProgress);
            const cineOpacity = 0.35 + 0.65 * smoothProgress;

            world.style.transform = `scale3d(${cineScale.toFixed(3)}, ${cineScale.toFixed(3)}, ${cineScale.toFixed(3)}) translateZ(${(-r + cineZ).toFixed(1)}px) rotateX(${(rot.x + cineTilt).toFixed(2)}deg) rotateY(${rot.y.toFixed(2)}deg)`;
            stage.style.opacity = cineOpacity.toFixed(2);

            if (portal) {
                portal.style.transform = `translate(-50%, -50%) scale(${(0.5 + 0.5 * smoothProgress).toFixed(3)})`;
                portal.style.opacity = (0.2 + 0.8 * smoothProgress).toFixed(2);
            }
        };
        applyTransform();

        const wrapSigned = (d) => {
            const a = (((d + 180) % 360) + 360) % 360;
            return a - 180;
        };

        const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

        function updateActiveCard() {
            let closestIdx = 0;
            let minDiff = Infinity;
            cards.forEach((card, idx) => {
                const yaw = parseFloat(card.dataset.yaw);
                let diff = Math.abs((((yaw + rot.y) % 360) + 540) % 360 - 180);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = idx;
                }
            });
            cards.forEach((c, idx) => {
                c.classList.toggle('is-front', idx === closestIdx);
            });
            return closestIdx;
        }
        updateActiveCard();

        let isNavigating = false;
        let navRAF = null;

        function rotateToCard(targetIdx) {
            if (navRAF) { cancelAnimationFrame(navRAF); navRAF = null; }
            stopInertia();
            isNavigating = true;

            const targetYaw = parseFloat(cards[targetIdx].dataset.yaw);
            const targetPitch = parseFloat(cards[targetIdx].dataset.pitch);

            let currentYMod = ((rot.y % 360) + 360) % 360;
            let targetYMod = ((-targetYaw % 360) + 360) % 360;
            let deltaY = targetYMod - currentYMod;
            if (deltaY > 180) deltaY -= 360;
            if (deltaY < -180) deltaY += 360;

            const startY = rot.y;
            const endY = rot.y + deltaY;
            const startX = rot.x;
            const endX = clamp(-targetPitch * 0.4, -MAX_VERT, MAX_VERT);

            const duration = 550;
            const startTime = performance.now();

            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            function step(now) {
                const elapsed = now - startTime;
                const p = Math.min(1, elapsed / duration);
                const ep = easeOutCubic(p);

                rot.y = startY + (endY - startY) * ep;
                rot.x = startX + (endX - startX) * ep;
                applyTransform();
                updateActiveCard();

                if (p < 1) {
                    navRAF = requestAnimationFrame(step);
                } else {
                    isNavigating = false;
                    navRAF = null;
                    autoPausedUntil = performance.now() + 2500;
                }
            }
            navRAF = requestAnimationFrame(step);
        }

        // Pointer Drag Interactions
        let dragging = false;
        let hasMoved = false;
        let startX = 0, startY = 0;
        let startRot = { x: 0, y: 0 };
        let lastMoveT = 0;
        let vX = 0, vY = 0;
        let lastX = 0, lastY = 0;
        let inertiaRAF = null;
        let autoPausedUntil = 0;

        const stopInertia = () => {
            if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; }
        };

        const startInertia = () => {
            const friction = 0.93;
            const stopThresh = 0.03;
            const step = () => {
                vX *= friction;
                vY *= friction;
                if (Math.abs(vX) < stopThresh && Math.abs(vY) < stopThresh) {
                    inertiaRAF = null;
                    return;
                }
                rot.x = clamp(rot.x - vY, -MAX_VERT, MAX_VERT);
                rot.y = wrapSigned(rot.y + vX);
                applyTransform();
                updateActiveCard();
                inertiaRAF = requestAnimationFrame(step);
            };
            stopInertia();
            inertiaRAF = requestAnimationFrame(step);
        };

        stage.addEventListener('pointerdown', (e) => {
            if (isNavigating) return;
            // If user clicks a link directly, let default click fire and don't capture pointer
            if (e.target.closest('a')) return;
            
            stopInertia();
            dragging = true;
            hasMoved = false;
            stage.classList.add('is-dragging');
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            startRot = { ...rot };
            lastMoveT = performance.now();
            stage.setPointerCapture?.(e.pointerId);
        });

        stage.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.hypot(dx, dy) > 5) {
                hasMoved = true;
            }

            rot.x = clamp(startRot.x - dy / DRAG_SENS, -MAX_VERT, MAX_VERT);
            rot.y = wrapSigned(startRot.y + dx / DRAG_SENS);
            applyTransform();
            updateActiveCard();

            const now = performance.now();
            const dt = Math.max(1, now - lastMoveT);
            vX = ((e.clientX - lastX) / DRAG_SENS) * (16 / dt);
            vY = ((e.clientY - lastY) / DRAG_SENS) * (16 / dt);
            lastX = e.clientX;
            lastY = e.clientY;
            lastMoveT = now;
        });

        const onPointerEnd = (e) => {
            if (!dragging) return;
            dragging = false;
            stage.classList.remove('is-dragging');
            try { stage.releasePointerCapture?.(e.pointerId); } catch (err) {}

            if (!hasMoved) {
                // Click on a sphere-card
                const clickedCard = e.target.closest('.sphere-card');
                const clickedLink = e.target.closest('a');
                if (clickedLink) {
                    // Let link open
                    return;
                }
                if (clickedCard) {
                    const idx = parseInt(clickedCard.dataset.index, 10);
                    if (!isNaN(idx)) {
                        rotateToCard(idx);
                        return;
                    }
                }
            }

            autoPausedUntil = performance.now() + 2500;
            if (Math.abs(vX) > 0.1 || Math.abs(vY) > 0.1) {
                startInertia();
            }
        };

        stage.addEventListener('pointerup', onPointerEnd);
        stage.addEventListener('pointercancel', onPointerEnd);

        // Auto spin loop & cinematic scroll-zoom interpolation
        let isVisible = true;
        const autoTick = () => {
            const now = performance.now();

            // Smoothly ease cinematic scroll zoom (smooth camera dolly)
            const diff = targetProgress - smoothProgress;
            let zoomActive = false;
            if (Math.abs(diff) > 0.001) {
                smoothProgress += diff * 0.1;
                zoomActive = true;
            } else if (smoothProgress !== targetProgress) {
                smoothProgress = targetProgress;
                zoomActive = true;
            }

            const canSpin = !dragging && !inertiaRAF && !isNavigating && isVisible && now >= autoPausedUntil;
            if (canSpin) {
                rot.y = wrapSigned(rot.y + 0.04);
            }

            if (canSpin || zoomActive) {
                applyTransform();
                updateActiveCard();
            }

            requestAnimationFrame(autoTick);
        };
        requestAnimationFrame(autoTick);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                isVisible = entry.isIntersecting;
                if (!isVisible) stopInertia();
            }, { threshold: 0.1 }).observe(stage);
        }
    }

    initProjectSphere();

    // =========================================================================
    // 4. Subtle Card Hover Glow (Pure CSS variables, zero GPU thrash)
    // =========================================================================
    const hoverCards = document.querySelectorAll('.card');
    hoverCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // =========================================================================
    // 5. Cinematic Scroll Reveal Observer
    // =========================================================================
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.section-header, .glass-box, .skill-card, .contact-card, .project-card, .stat-counter-item');
    fadeElements.forEach((el, index) => {
        el.classList.add('fade-in-element');
        el.style.transitionDelay = `${(index % 3) * 0.1}s`;
        scrollObserver.observe(el);
    });

    // =========================================================================
    // 6. ✨ 5 SIGNATURE ANIMATIONS (Ported from xiaopu-ai / web-design)
    // =========================================================================

    // --- 1. Cyber Aurora WebGL / Canvas in Hero ---
    function initHeroAurora() {
        const canvas = document.getElementById('hero-aurora');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0, height = 0;
        let isHeroVisible = true;
        let t = 0;

        function resize() {
            width = canvas.width = canvas.parentElement.offsetWidth;
            height = canvas.height = canvas.parentElement.offsetHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        const hero = document.querySelector('.hero-section');
        if (hero && 'IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => {
                isHeroVisible = e.isIntersecting;
            }, { threshold: 0.05 }).observe(hero);
        }

        function drawWave(yOffset, amp, freq, speed, color1, color2) {
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 10) {
                const y = Math.sin(x * freq + t * speed) * amp +
                          Math.cos(x * freq * 0.5 + t * speed * 0.7) * (amp * 0.5) +
                          yOffset;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, yOffset - amp, width, height);
            grad.addColorStop(0, color1);
            grad.addColorStop(1, color2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        function loop() {
            if (isHeroVisible) {
                ctx.clearRect(0, 0, width, height);
                t += 0.012;

                // Layer 1: Deep Cyan fluid wave
                drawWave(height * 0.65, 80, 0.0022, 1.0, 'rgba(6, 182, 212, 0.18)', 'rgba(2, 6, 23, 0)');
                // Layer 2: Cyber Emerald primary wave
                drawWave(height * 0.50, 95, 0.0031, 0.8, 'rgba(16, 185, 129, 0.22)', 'rgba(5, 8, 12, 0)');
                // Layer 3: Accent Highlights
                drawWave(height * 0.40, 60, 0.0040, 1.3, 'rgba(52, 211, 153, 0.14)', 'rgba(6, 182, 212, 0)');
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }
    initHeroAurora();

    // --- 2. Hacker Terminal Scramble on Hero Badge ---
    function initScrambleText() {
        const el = document.getElementById('hero-badge-text');
        if (!el) return;
        const targetText = el.getAttribute('data-scramble') || el.textContent;
        const chars = '!<>-_\\/[]{}—=+*^?#01';
        let frame = 0;
        const totalFrames = 35;

        function update() {
            let output = '';
            const progress = frame / totalFrames;
            for (let i = 0; i < targetText.length; i++) {
                if (i < Math.floor(progress * targetText.length)) {
                    output += targetText[i];
                } else if (targetText[i] === ' ') {
                    output += ' ';
                } else {
                    output += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            el.textContent = output;
            frame++;
            if (frame <= totalFrames) {
                requestAnimationFrame(update);
            } else {
                el.textContent = targetText;
            }
        }
        setTimeout(update, 350);
    }
    initScrambleText();

    // --- 3. 3D Tilt Cards with Dynamic Specular Glare (Skills) ---
    function init3DTiltCards() {
        const tiltCards = document.querySelectorAll('.tilt-card');
        tiltCards.forEach(card => {
            const glare = card.querySelector('.card-glare');
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotX = -((y - centerY) / centerY) * 10;
                const rotY = ((x - centerX) / centerX) * 10;

                card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

                if (glare) {
                    card.style.setProperty('--glare-x', `${x}px`);
                    card.style.setProperty('--glare-y', `${y}px`);
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            });
        });
    }
    init3DTiltCards();

    // --- 4. Magnetic CTA Buttons ---
    function initMagneticButtons() {
        const btns = document.querySelectorAll('.magnetic-btn');
        btns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const btnCenterX = rect.left + rect.width / 2;
                const btnCenterY = rect.top + rect.height / 2;
                const deltaX = (e.clientX - btnCenterX) * 0.28;
                const deltaY = (e.clientY - btnCenterY) * 0.28;
                btn.style.transform = `translate(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0px, 0px)';
            });
        });
    }
    initMagneticButtons();
});
