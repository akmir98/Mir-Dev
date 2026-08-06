// Preloader — shows "Mir Nasrullah" briefly, then reveals the page
window.addEventListener('load', () => {
  const loader = document.querySelector('.loader');
  const app = document.getElementById('app');
  const reveal = () => {
    if(loader) loader.classList.add('hide');
    if(app) app.classList.add('show');
    document.body.classList.remove('loading');
  };
  if(!loader || !app){ reveal(); }
  else setTimeout(reveal, 1400);
});

// Hero mouse-reactive background: parallax layers + cursor-following glow
(function(){
  const hero = document.getElementById('home');
  if(!hero) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if(reduceMotion || !finePointer) return;

  const aurora = hero.querySelector('.hero-aurora');
  const dust = hero.querySelector('.hero-dust');
  const photoFrame = hero.querySelector('.hero-photo-frame');
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
    if(!hovering){
      hovering = true;
      if(glow) glow.style.opacity = '1';
      if(!raf) raf = requestAnimationFrame(tick);
    }
  }
  function onLeave(){
    hovering = false;
    targetX = 0; targetY = 0;
    if(glow) glow.style.opacity = '0';
  }

  function tick(){
    curX += (targetX - curX) * 0.07;
    curY += (targetY - curY) * 0.07;
    glowX += (mouseX - glowX) * 0.18;
    glowY += (mouseY - glowY) * 0.18;

    if(aurora) aurora.style.transform = `translate3d(${(curX*18).toFixed(1)}px, ${(curY*18).toFixed(1)}px, 0)`;
    if(dust) dust.style.transform = `translate3d(${(curX*9).toFixed(1)}px, ${(curY*9).toFixed(1)}px, 0)`;
    if(photoFrame) photoFrame.style.transform = `translate3d(${(curX*-14).toFixed(1)}px, ${(curY*-14).toFixed(1)}px, 0) rotate(${(curX*1.1).toFixed(2)}deg)`;
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

// Animated dust/dot particles in hero background (home page only)
(function(){
  const canvas = document.getElementById('dustCanvas');
  const hero = document.getElementById('home');
  if(!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let particles = [];
  let w, h, dpr;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.offsetWidth;
    h = hero.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.floor((w * h) / 14000));
    particles = Array.from({ length: count }, () => makeParticle());
  }

  function makeParticle(){
    const isAccent = Math.random() < 0.22;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: isAccent ? 1.4 + Math.random() * 1.6 : 0.8 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.06 - Math.random() * 0.18,
      alpha: 0.15 + Math.random() * 0.45,
      accent: isAccent
    };
  }

  function tick(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if(p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if(p.x < -10) p.x = w + 10;
      if(p.x > w + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.accent
        ? `rgba(200,255,61,${p.alpha})`
        : `rgba(242,241,234,${p.alpha * 0.6})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);

  if(!reduceMotion){
    requestAnimationFrame(tick);
  } else {
    // Draw a single static frame for reduced-motion users
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.accent ? `rgba(200,255,61,${p.alpha})` : `rgba(242,241,234,${p.alpha * 0.6})`;
      ctx.fill();
    });
  }
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

// Navbar: shrinks on scroll down, expands again on scroll up
const siteNav = document.getElementById('siteNav');
if(siteNav){
  let lastY = window.scrollY;
  function updateNavState(){
    const y = window.scrollY;
    if(y > 40 && y > lastY){
      siteNav.classList.add('scrolled');   // scrolling down — shrink
    } else if(y < lastY || y <= 40){
      siteNav.classList.remove('scrolled'); // scrolling up (or near top) — expand
    }
    lastY = y;
  }
  document.addEventListener('scroll', updateNavState, { passive:true });
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
 const API_URL = '/api/contact';

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
    window.location.href = `mailto:mir.nasrullah@email.com?subject=${subject}&body=${body}`;
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