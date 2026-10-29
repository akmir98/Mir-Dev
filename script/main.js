// Preloader — shows "MIR.DEV" briefly, then reveals the page
(function(){
  const loader = document.querySelector('.loader');
  const app = document.getElementById('app');
  const barFill = document.getElementById('loaderBarFill');
  let revealed = false;

  function reveal(){
    if(revealed) return;
    revealed = true;
    if(loader) loader.classList.add('hide');
    if(app) app.classList.add('show');
    document.body.classList.remove('loading');
  }

  if(!loader || !app){
    reveal();
    return;
  }

  // Start the progress line filling right away so it reads as real
  // loading progress rather than a fixed decorative animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if(barFill) barFill.style.width = '100%';
    });
  });

  window.addEventListener('load', () => setTimeout(reveal, 1400));

  // Safety net: the page must never stay stuck behind the preloader,
  // even if the 'load' event never fires or an unrelated script errors.
  setTimeout(reveal, 4000);
})();

// Hero mouse-reactive background: parallax layers + cursor-following glow
// + 3D tilt/shine on the photo. Exposes window.__heroMouse so the dust
// particle system (below) can react to the same cursor position.
window.__heroMouse = { x: -9999, y: -9999, active: false };

(function(){
  const hero = document.getElementById('home');
  if(!hero) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if(reduceMotion || !finePointer) return;

  const aurora = hero.querySelector('.hero-aurora');
  const dust = hero.querySelector('.hero-dust');
  const photoFrame = hero.querySelector('.hero-photo-frame');
  const photo = hero.querySelector('.hero-photo');
  const shine = hero.querySelector('.hero-shine');
  const glow = hero.querySelector('.hero-cursor-glow');

  let targetX = 0, targetY = 0;   // normalized -1..1, relative to hero center
  let curX = 0, curY = 0;
  let mouseX = 0, mouseY = 0;     // px, relative to hero — for the glow
  let glowX = 0, glowY = 0;
  let hovering = false;
  let raf = null;

  function onMove(e){
    const rect = hero.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    targetX = Math.max(-1, Math.min(1, (relX / rect.width - 0.5) * 2));
    targetY = Math.max(-1, Math.min(1, (relY / rect.height - 0.5) * 2));
    mouseX = relX; mouseY = relY;

    window.__heroMouse.x = relX;
    window.__heroMouse.y = relY;
    window.__heroMouse.active = true;

    // shine highlight position, relative to the photo itself
    if(photo){
      const prect = photo.getBoundingClientRect();
      const sx = ((e.clientX - prect.left) / prect.width) * 100;
      const sy = ((e.clientY - prect.top) / prect.height) * 100;
      if(sx >= -20 && sx <= 120 && sy >= -20 && sy <= 120){
        photo.style.setProperty('--sx', sx.toFixed(1) + '%');
        photo.style.setProperty('--sy', sy.toFixed(1) + '%');
      }
    }

    if(!hovering){
      hovering = true;
      if(glow) glow.style.opacity = '1';
      if(!raf) raf = requestAnimationFrame(tick);
    }
  }
  function onLeave(){
    hovering = false;
    targetX = 0; targetY = 0;
    window.__heroMouse.active = false;
    window.__heroMouse.x = -9999;
    window.__heroMouse.y = -9999;
    if(glow) glow.style.opacity = '0';
  }

  function tick(){
    curX += (targetX - curX) * 0.07;
    curY += (targetY - curY) * 0.07;
    glowX += (mouseX - glowX) * 0.18;
    glowY += (mouseY - glowY) * 0.18;

    if(aurora) aurora.style.transform = `translate3d(${(curX*18).toFixed(1)}px, ${(curY*18).toFixed(1)}px, 0)`;
    if(dust) dust.style.transform = `translate3d(${(curX*9).toFixed(1)}px, ${(curY*9).toFixed(1)}px, 0)`;
    if(photoFrame){
      photoFrame.style.transform =
        `translate3d(${(curX*-14).toFixed(1)}px, ${(curY*-14).toFixed(1)}px, 0) ` +
        `rotateY(${(curX*9).toFixed(2)}deg) rotateX(${(curY*-9).toFixed(2)}deg)`;
    }
    if(glow) glow.style.transform = `translate3d(${glowX.toFixed(1)}px, ${glowY.toFixed(1)}px, 0)`;

    const stillMoving = Math.abs(targetX-curX) > 0.001 || Math.abs(targetY-curY) > 0.001 ||
                         Math.abs(mouseX-glowX) > 0.5 || Math.abs(mouseY-glowY) > 0.5;
    if(hovering || stillMoving){
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }

  hero.addEventListener('mousemove', onMove, { passive:true });
  hero.addEventListener('mouseleave', onLeave, { passive:true });
})();

// Hero background: flowing light ribbons (replaces the old dots)
(function(){
  const canvas = document.getElementById('dustCanvas');
  const hero = document.getElementById('home');
  if(!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, t = 0, visible = true;

  const ribbons = Array.from({ length: 7 }, (_, i) => ({
    y: 0.28 + i * 0.075,          // vertical position (fraction of height)
    amp: 26 + i * 7,
    freq: 0.0032 - i * 0.00018,
    speed: 0.0004 + i * 0.00007,
    phase: i * 1.3,
    alpha: 0.18 + (i % 3) * 0.08,
    width: 1 + (i % 3) * 0.5
  }));

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.offsetWidth; h = hero.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(reduceMotion) draw();
  }

  function draw(){
    ctx.clearRect(0, 0, w, h);
    const m = window.__heroMouse;
    const mActive = m && m.active;
    ctx.lineCap = 'round';
    ribbons.forEach((r, idx) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0,   'rgba(200,255,61,0)');
      grad.addColorStop(0.3, `rgba(200,255,61,${r.alpha})`);
      grad.addColorStop(0.7, `rgba(143,179,44,${r.alpha})`);
      grad.addColorStop(1,   'rgba(200,255,61,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      for(let x = 0; x <= w; x += 8){
        let bump = 0;
        if(mActive){
          const d = x - m.x;
          bump = Math.exp(-(d * d) / 38000) * (m.y / h - r.y) * -70;
        }
        const y = h * r.y
          + Math.sin(x * r.freq + t * r.speed * 1000 + r.phase) * r.amp
          + Math.sin(x * r.freq * 2.3 - t * r.speed * 700) * r.amp * 0.35
          + bump;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }

  function tick(){
    if(visible){ t += 1; draw(); }
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  if('IntersectionObserver' in window){
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(hero);
  }
  if(!reduceMotion) requestAnimationFrame(tick);
})();

// Scroll progress bar
(function(){
  const progressBar = document.getElementById('scrollProgress');
  if(!progressBar) return;
  function updateProgress(){
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progressBar.style.width = scrolled + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive:true });
  updateProgress();
})();

// Navbar: shrinks + hides on scroll down, expands + reappears on scroll up
const siteNav = document.getElementById('siteNav');
if(siteNav){
  let stateY = window.scrollY; // last y at which we actually changed state
  let ticking = false;
  const THRESHOLD = 8; // ignore scroll jitter smaller than this many px

  function updateNavState(){
    const y = window.scrollY;
    const menuOpen = document.getElementById('navLinks')?.classList.contains('open');
    const delta = y - stateY;

    if(y <= 40){
      siteNav.classList.remove('scrolled');
      siteNav.classList.remove('nav-hidden');
      stateY = y;
    } else if(delta > THRESHOLD){
      siteNav.classList.add('scrolled');
      if(!menuOpen) siteNav.classList.add('nav-hidden');
      stateY = y;
    } else if(delta < -THRESHOLD){
      siteNav.classList.remove('scrolled');
      siteNav.classList.remove('nav-hidden');
      stateY = y;
    }
    ticking = false;
  }
  document.addEventListener('scroll', () => {
    if(!ticking){
      requestAnimationFrame(updateNavState);
      ticking = true;
    }
  }, { passive:true });
  updateNavState();
}

// Mobile menu toggle
const burgerBtn = document.getElementById('burgerBtn');
const navLinks = document.getElementById('navLinks');
if(burgerBtn && navLinks){
  burgerBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    burgerBtn.classList.toggle('open', isOpen);
    burgerBtn.setAttribute('aria-expanded', isOpen);
    if(isOpen && siteNav) siteNav.classList.remove('nav-hidden');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burgerBtn.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Scrollspy — highlight active nav link (only for links pointing at the current page)
if(navLinks){
  const navAnchors = navLinks.querySelectorAll('a');
  const currentPage = (location.pathname.split('/').pop() || 'index.html');
  const spyPairs = [];
  navAnchors.forEach(a => {
    const url = new URL(a.getAttribute('href'), location.href);
    const page = url.pathname.split('/').pop() || 'index.html';
    if(page === currentPage && url.hash){
      const target = document.querySelector(url.hash);
      if(target) spyPairs.push({ link: a, target: target });
    }
  });
  if(spyPairs.length){
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pair = spyPairs.find(p => p.target === entry.target);
        if(!pair || !entry.isIntersecting) return;
        navAnchors.forEach(a => a.classList.remove('active'));
        pair.link.classList.add('active');
      });
    }, { rootMargin:'-45% 0px -50% 0px', threshold:0 });
    spyPairs.forEach(p => spy.observe(p.target));
  }
}

// Scroll-triggered reveal animations
const revealEls = document.querySelectorAll('.reveal, .reveal-scale');
if(revealEls.length){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.15, rootMargin:'0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));
}

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-q');
  const answer = item.querySelector('.faq-a');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(open => {
      open.classList.remove('open');
      open.querySelector('.faq-a').style.maxHeight = null;
    });
    if(!isOpen){
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// Contact form — sends to the backend API; falls back to opening the
// visitor's email client if the API isn't reachable (e.g. not deployed yet).
const contactForm = document.getElementById('contactForm');
if(contactForm){
  // Set this to your deployed backend once it's live — see backend/README.md
  const API_URL = 'http://localhost:5000/api/contact';

  const submitBtn = document.getElementById('cfSubmit');
  const statusEl = document.getElementById('cfStatus');

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  function fallbackToMailto(name, email, message){
    const subject = encodeURIComponent(`Portfolio inquiry from ${name || 'your site'}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:nasrullahmir14@gmail.com?subject=${subject}&body=${body}`;
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = contactForm.querySelector('#cf-name').value.trim();
    const email = contactForm.querySelector('#cf-email').value.trim();
    const message = contactForm.querySelector('#cf-message').value.trim();

    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
    setStatus('Sending your message…', 'sending');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json().catch(() => ({}));

      if(!res.ok) throw new Error(data.error || 'Failed to send');

      setStatus('Message sent — thanks! I\'ll get back to you soon.', 'success');
      contactForm.reset();
    } catch (err) {
      // API not reachable / not deployed yet — fall back to mailto so the
      // form still works for the visitor.
      setStatus('Opening your email client instead…', 'sending');
      fallbackToMailto(name, email, message);
    } finally {
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Send message →'; }
    }
  });
}

// Number count-up animation for stats
const statNums = document.querySelectorAll('.stat-num');
if(statNums.length){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.target || '0');
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if(reduceMotion){ el.textContent = prefix + target + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    function frame(now){
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(target * eased);
      el.textContent = prefix + value + suffix;
      if(p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateCount(entry.target);
        countIO.unobserve(entry.target);
      }
    });
  }, { threshold:0.5 });
  statNums.forEach(el => countIO.observe(el));
}

// Typewriter effect for the rotating role line in the hero
const typedRoleEl = document.getElementById('typedRole');
if(typedRoleEl){
  const roles = [
    'Frontend Developer',
    'Learning Backend Development',
    'Becoming Full-Stack'
  ];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion){
    typedRoleEl.textContent = roles[0];
  } else {
    let roleIndex = 0, charIndex = 0, deleting = false;
    function typeTick(){
      const current = roles[roleIndex];
      if(!deleting){
        charIndex++;
        typedRoleEl.textContent = current.slice(0, charIndex);
        if(charIndex === current.length){
          deleting = true;
          setTimeout(typeTick, 1400);
          return;
        }
      } else {
        charIndex--;
        typedRoleEl.textContent = current.slice(0, charIndex);
        if(charIndex === 0){
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
      }
      setTimeout(typeTick, deleting ? 35 : 65);
    }
    const heroEl = document.getElementById('home');
    if(heroEl){
      const startTyping = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            typeTick();
            startTyping.disconnect();
          }
        });
      }, { threshold:0.2 });
      startTyping.observe(heroEl);
    } else {
      typeTick();
    }
  }
}

// ============================================================
// INTERACTION LAYER — card glow, tilts, magnetism, cursor, ripple, parallax
// ============================================================
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // --- 3. Cursor-following glow spotlight on cards ---
  const glowCards = document.querySelectorAll(
    '.skill-card, .service-card, .process-card, .price-card, .review-card, .blog-card, .project-card, .review-quote-card'
  );
  if(finePointer && glowCards.length){
    glowCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', mx.toFixed(1) + '%');
        card.style.setProperty('--my', my.toFixed(1) + '%');
      }, { passive:true });
    });
  }

  // --- 5. Project card 3D tilt on hover ---
  const projectCards = document.querySelectorAll('.project-card');
  if(finePointer && !reduceMotion && projectCards.length){
    projectCards.forEach(card => {
      let raf = null;
      card.addEventListener('mousemove', (e) => {
        if(raf) return;
        raf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `translateY(-6px) rotateY(${(px*6).toFixed(2)}deg) rotateX(${(py*-6).toFixed(2)}deg)`;
          raf = null;
        });
      }, { passive:true });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // --- 9. Button ripple on click ---
  const rippleEls = document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta, .price-cta');
  rippleEls.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.8;
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  // --- 10. Subtle scroll parallax ---
  if(!reduceMotion){
    const parallaxTargets = [
      ...document.querySelectorAll('.about-bg-glow'),
      ...document.querySelectorAll('.stat-icon')
    ];
    if(parallaxTargets.length){
      let ticking = false;
      function updateParallax(){
        const vh = window.innerHeight;
        parallaxTargets.forEach(el => {
          const rect = el.getBoundingClientRect();
          const distFromCenter = (rect.top + rect.height / 2) - vh / 2;
          const speed = el.classList.contains('about-bg-glow') ? 0.06 : 0.035;
          el.style.transform = `translateY(${(distFromCenter * speed).toFixed(1)}px)`;
        });
        ticking = false;
      }
      document.addEventListener('scroll', () => {
        if(!ticking){
          requestAnimationFrame(updateParallax);
          ticking = true;
        }
      }, { passive:true });
      updateParallax();
    }
  }
})();

// ============================================================
// COMMAND PALETTE (Ctrl/Cmd + K)
// ============================================================
(function(){
  const commands = [
    { title: 'Home', hint: 'Go to', icon: '⌂', url: 'index.html#home' },
    { title: 'About', hint: 'Go to', icon: '☺', url: 'index.html#about' },
    { title: 'Skills', hint: 'Go to', icon: '{ }', url: 'index.html#skills' },
    { title: 'Services', hint: 'Go to', icon: '★', url: 'service.html#service' },
    { title: 'Projects', hint: 'Go to', icon: '▣', url: 'index.html#project' },
    { title: 'MIR Lab', hint: 'Go to', icon: '🧪', url: 'index.html#mirlab' },
    { title: 'Journey', hint: 'Go to', icon: '↗', url: 'index.html#experience' },
    { title: 'Blog', hint: 'Go to', icon: '✎', url: 'index.html#blog' },
    { title: 'FAQ', hint: 'Go to', icon: '?', url: 'index.html#faq' },
    { title: 'Contact page', hint: 'Go to', icon: '✉', url: 'contact.html#contact' },
    { title: 'All blog posts', hint: 'Go to', icon: '✎', url: 'blog.html#blog' },
    { title: 'Email me', hint: 'Action', icon: '@', url: 'mailto:nasrullahmir14@gmail.com' },
    { title: 'Download CV', hint: 'Action', icon: '⬇', url: 'Mir-Nasrullah-CV.pdf' },
    { title: 'View GitHub', hint: 'Action', icon: '⌥', url: 'https://github.com/akmir98' }
  ];

  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.innerHTML = `
    <div class="cmdk-modal">
      <div class="cmdk-input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <input type="text" class="cmdk-input" placeholder="Jump to a section, or take an action…" autocomplete="off">
        <span class="cmdk-esc">Esc</span>
      </div>
      <div class="cmdk-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.cmdk-input');
  const resultsEl = overlay.querySelector('.cmdk-results');
  let activeIndex = 0;
  let filtered = commands.slice();

  function render(){
    if(!filtered.length){
      resultsEl.innerHTML = '<div class="cmdk-empty">No matches. Try "contact" or "blog".</div>';
      return;
    }
    resultsEl.innerHTML = filtered.map((cmd, i) => `
      <div class="cmdk-item ${i === activeIndex ? 'active' : ''}" data-index="${i}">
        <div class="cmdk-item-left">
          <span class="cmdk-item-icon">${cmd.icon}</span>
          <span class="cmdk-item-title">${cmd.title}</span>
        </div>
        <span class="cmdk-item-hint">${cmd.hint}</span>
      </div>
    `).join('');
  }

  function filterCommands(query){
    const q = query.trim().toLowerCase();
    filtered = !q ? commands.slice() : commands.filter(c => c.title.toLowerCase().includes(q));
    activeIndex = 0;
    render();
  }

  function openPalette(){
    overlay.classList.add('open');
    input.value = '';
    filterCommands('');
    setTimeout(() => input.focus(), 50);
    document.body.style.overflow = 'hidden';
  }
  function closePalette(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  function go(cmd){
    if(!cmd) return;
    closePalette();
    if(cmd.url.startsWith('mailto:') || cmd.url.startsWith('http')){
      window.open(cmd.url, cmd.url.startsWith('http') ? '_blank' : '_self');
    } else {
      window.location.href = cmd.url;
    }
  }

  input.addEventListener('input', (e) => filterCommands(e.target.value));
  resultsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.cmdk-item');
    if(item) go(filtered[Number(item.dataset.index)]);
  });
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closePalette(); });

  document.addEventListener('keydown', (e) => {
    const isOpen = overlay.classList.contains('open');
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      isOpen ? closePalette() : openPalette();
      return;
    }
    if(!isOpen) return;
    if(e.key === 'Escape'){ closePalette(); }
    else if(e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = Math.min(activeIndex+1, filtered.length-1); render(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = Math.max(activeIndex-1, 0); render(); }
    else if(e.key === 'Enter'){ e.preventDefault(); go(filtered[activeIndex]); }
  });

  const trigger = document.getElementById('cmdkTrigger');
  if(trigger) trigger.addEventListener('click', openPalette);
})();

// ============================================================
// HIDDEN EASTER EGG — console greeting + Konami code
// ============================================================
(function(){
  // Console greeting for fellow developers who open devtools
  const accent = 'color:#c8ff3d; font-weight:bold;';
  const dim = 'color:#9a9c93;';
  console.log('%c👋 Hey, fellow developer.', 'font-size:16px;' + accent);
  console.log('%cLooking at the code instead of the site — respect.', dim);
  console.log('%cTry the Konami code anywhere on this page: ↑ ↑ ↓ ↓ ← → ← → B A', dim);
  console.log('%cOr press Ctrl/Cmd + K to open the command palette.', dim);

  // Konami code listener
  const sequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let progress = 0;

  const eggOverlay = document.createElement('div');
  eggOverlay.className = 'egg-overlay';
  eggOverlay.innerHTML = `
    <div class="egg-card">
      <span class="egg-emoji">🥚</span>
      <h3>You found the easter egg.</h3>
      <p>Konami code, on a portfolio site. Someone actually reads the console. Thanks for looking closely — that's exactly the kind of attention to detail I try to bring to my own work.</p>
      <a href="contact.html#contact" class="btn-primary">Say hi →</a>
    </div>
  `;
  document.body.appendChild(eggOverlay);
  eggOverlay.addEventListener('click', (e) => {
    if(e.target === eggOverlay) eggOverlay.classList.remove('open');
  });

  function confettiBurst(){
    const emojis = ['✨','🎉','⚡','🟢','💚'];
    for(let i = 0; i < 24; i++){
      const p = document.createElement('span');
      p.className = 'egg-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
      p.style.fontSize = (14 + Math.random() * 14) + 'px';
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(key === sequence[progress]){
      progress++;
      if(progress === sequence.length){
        progress = 0;
        confettiBurst();
        eggOverlay.classList.add('open');
      }
    } else {
      progress = (key === sequence[0]) ? 1 : 0;
    }
  });
})();

// ============================================================
// DEVELOPER TERMINAL (home page only)
// ============================================================
(function(){
  const body = document.getElementById('terminalBody');
  const input = document.getElementById('terminalInput');
  if(!body || !input) return;

  function print(text, cls){
    const line = document.createElement('div');
    line.className = 'terminal-line ' + (cls || 'out');
    line.textContent = text;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }
  function printCmd(text){
    const line = document.createElement('div');
    line.className = 'terminal-line cmd';
    line.textContent = text;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  const commands = {
    help(){
      print('Available commands:');
      print('  whoami        — who I am');
      print('  skills        — what I work with');
      print('  projects      — things I\'ve built');
      print('  journey       — how I got here');
      print('  contact       — how to reach me');
      print('  sudo hire-me  — for anyone considering it');
      print('  clear         — clear the terminal');
    },
    whoami(){
      print('Mir Nasrullah — frontend developer, self-taught, growing into backend.', 'accent');
      print('Based in Quetta, Pakistan. Open to work.');
    },
    skills(){
      print('Frontend : HTML, CSS, JavaScript, React', 'accent');
      print('Backend  : Node.js, Express, REST APIs', 'accent');
      print('Database : MongoDB', 'accent');
      print('Tools    : Git, GitHub, VS Code', 'accent');
      print('AI Tools : Claude, ChatGPT, DeepSeek, Gemini', 'accent');
    },
    projects(){
      print('1. Dr Physio Rehab       — real client site (drphysiorehabonline.com)');
      print('2. JavaScript Learning Hub — interactive JS platform (javascript-hub.vercel.app)');
      print('3. Personal Portfolio v1 — an earlier build (my-portfoli-website.vercel.app)');
      print('Scroll to the Projects section for links →', 'accent');
    },
    journey(){
      print('2023–2025: Learned HTML, CSS, JavaScript, and React from scratch — self-taught.');
      print('2025–Present: Building real projects, picking up Node.js and backend fundamentals.');
    },
    contact(){
      print('Email : nasrullahmir14@gmail.com', 'accent');
      print('Or use the contact form → contact.html', 'accent');
    },
    clear(){
      body.innerHTML = '';
    }
  };
  commands['sudo hire-me'] = function(){
    print('Permission granted. Redirecting to contact page...', 'accent');
    setTimeout(() => { window.location.href = 'contact.html#contact'; }, 900);
  };

  input.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter') return;
    const raw = input.value;
    const cmd = raw.trim().toLowerCase();
    if(!cmd) return;
    printCmd(raw);
    input.value = '';
    if(commands[cmd]){
      commands[cmd]();
    } else {
      print(`command not found: ${cmd} — try 'help'`);
    }
  });

  // Keep focus on the terminal input when the terminal itself is clicked
  const windowEl = input.closest('.terminal-window');
  if(windowEl){
    windowEl.addEventListener('click', () => input.focus());
  }
})();
// ============================================================
// SCROLL ANIMATION UPGRADE
// ============================================================
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Auto-stagger children of grids so cards cascade in
  document.querySelectorAll('.skills-grid, .project-grid, .lab-grid, .blog-grid, .stats-grid').forEach(grid => {
    [...grid.children].forEach((el, i) => {
      if(el.classList.contains('reveal') && !el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i * 0.1) + 's');
    });
  });

  // 2. Split headings into words for a masked slide-up reveal
  const splits = document.querySelectorAll('[data-split]');
  splits.forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });
  if(splits.length){
    const sio = new IntersectionObserver(es => es.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('split-in'); sio.unobserve(e.target); }
    }), { threshold:0.4 });
    splits.forEach(h => reduce ? h.classList.add('split-in') : sio.observe(h));
  }

  // 3. Timeline: line fills in proportion to scroll, each dot lights up as it's reached
  const tl = document.querySelector('.timeline');
  if(tl){
    const upd = () => {
      const r = tl.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.65 - r.top) / r.height));
      tl.style.setProperty('--tl', p.toFixed(3));
    };
    window.addEventListener('scroll', upd, { passive:true });
    window.addEventListener('resize', upd);
    upd();
  }

  // 4. Client reviews marquee: clone for seamless loop, speed reacts to scroll velocity
  document.querySelectorAll('.rv-track').forEach(track => {
    [...track.children].forEach(card => {
      const c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
  });
  if(!reduce){
    const tracks = [...document.querySelectorAll('.rv-track')];
    if(tracks.length){
      let lastY = window.scrollY, rate = 1, target = 1;
      window.addEventListener('scroll', () => {
        const v = Math.abs(window.scrollY - lastY);
        lastY = window.scrollY;
        target = 1 + Math.min(v * 0.35, 6);
      }, { passive:true });
      (function loop(){
        target += (1 - target) * 0.06;
        rate += (target - rate) * 0.12;
        tracks.forEach(t => t.getAnimations().forEach(a => { a.playbackRate = rate; }));
        requestAnimationFrame(loop);
      })();
    }
  }
})();

// ============================================================
// REVIEWS: staggered entrance, tilt + glow on hover
// ============================================================
(function(){
  const marquee = document.querySelector('.rv-marquee');
  if(!marquee) return;
  marquee.querySelectorAll('.rv-card').forEach((c, i) => {
    c.style.setProperty('--k', (i % 8));
    c.querySelectorAll('.rv-stars svg').forEach((st, j) => st.style.setProperty('--s', j));
    if(window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      c.addEventListener('mousemove', e => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--gx', (px * 100) + '%');
        c.style.setProperty('--gy', (py * 100) + '%');
        c.style.transform = `translateY(-8px) perspective(700px) rotateY(${((px - .5) * 10).toFixed(2)}deg) rotateX(${((.5 - py) * 10).toFixed(2)}deg)`;
      }, { passive:true });
      c.addEventListener('mouseleave', () => { c.style.transform = ''; });
    }
  });
})();

// ============================================================
// TOOLBOX: filter pills, staggered entrance, cursor spotlight
// ============================================================
(function(){
  const grid = document.querySelector('.tb-grid');
  if(!grid) return;
  const tiles = [...grid.querySelectorAll('.tb-tile')];
  const pills = [...document.querySelectorAll('.tb-pill')];

  function show(list){
    list.forEach((t, i) => { t.style.setProperty('--i', i); t.classList.remove('in'); });
    void grid.offsetWidth; // restart the entrance transition
    requestAnimationFrame(() => list.forEach(t => t.classList.add('in')));
  }

  const io = new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ show(tiles.filter(t => !t.classList.contains('hide'))); io.disconnect(); }
  }), { threshold:0.12 });
  io.observe(grid);

  pills.forEach(p => p.addEventListener('click', () => {
    pills.forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    const f = p.dataset.filter;
    tiles.forEach(t => t.classList.toggle('hide', f !== 'All' && t.dataset.cat !== f));
    show(tiles.filter(t => !t.classList.contains('hide')));
  }));

  tiles.forEach(t => t.addEventListener('mousemove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  }, { passive:true }));
})();
