(function() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const geometry = new THREE.BufferGeometry();
  const count = 200;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    sizes[i] = Math.random() * 0.15 + 0.05;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: isDark ? 0x3b82f6 : 0x6366f1,
    size: 0.12,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const geometry2 = new THREE.BufferGeometry();
  const count2 = 50;
  const positions2 = new Float32Array(count2 * 3);
  for (let i = 0; i < count2; i++) {
    positions2[i * 3] = (Math.random() - 0.5) * 50;
    positions2[i * 3 + 1] = (Math.random() - 0.5) * 50;
    positions2[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10;
  }
  geometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));

  const lineMaterial = new THREE.PointsMaterial({
    color: isDark ? 0x06b6d4 : 0x8b5cf6,
    size: 0.08,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const particles2 = new THREE.Points(geometry2, lineMaterial);
  scene.add(particles2);

  camera.position.z = 25;

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    particles.rotation.x += 0.0003;
    particles.rotation.y += 0.0005;
    particles2.rotation.x += 0.0002;
    particles2.rotation.y += 0.0003;

    particles.rotation.x += mouseY * 0.0005;
    particles.rotation.y += mouseX * 0.0005;
    particles2.rotation.x += mouseY * 0.0003;
    particles2.rotation.y += mouseX * 0.0003;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => observer.observe(el));

  function animateCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-target'));
          const isDecimal = target % 1 !== 0;
          const duration = 2000;
          const start = performance.now();

          function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            if (isDecimal) {
              el.textContent = current.toFixed(1);
            } else {
              el.textContent = Math.floor(current).toLocaleString();
            }

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              if (isDecimal) {
                el.textContent = target.toFixed(1);
              } else {
                el.textContent = target.toLocaleString();
              }
            }
          }
          requestAnimationFrame(update);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => counterObserver.observe(el));
  }

  animateCounters();

  const heroCard = document.querySelector('.frostglass-hero-card');
  if (heroCard) {
    heroCard.addEventListener('mousemove', (e) => {
      const rect = heroCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      heroCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    heroCard.addEventListener('mouseleave', () => {
      heroCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }
})();
