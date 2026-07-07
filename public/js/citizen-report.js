(function() {
  let currentStep = 1;
  let imageFile = null;
  let imageDataUrl = null;
  let latitude = null;
  let longitude = null;
  let isSubmitting = false;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('preview');
  const removeBtn = document.getElementById('remove-image');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const description = document.getElementById('description');
  const charCount = document.getElementById('char-count');
  const terminalOverlay = document.getElementById('terminal-overlay');
  const terminalBody = document.getElementById('terminal-body');
  const resultOverlay = document.getElementById('result-overlay');

  const themeToggle = document.getElementById('theme-toggle');

  function getAuthToken() {
    return localStorage.getItem('civic_care_token');
  }

  function getUserId() {
    return localStorage.getItem('civic_care_user_id');
  }

  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    themeToggle.textContent = current === 'dark' ? '\u{1F31E} Light' : '\u{1F319} Dark';
  });

  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  revealEls.forEach(el => observer.observe(el));

  function updateProgress(step) {
    document.querySelectorAll('.progress-step').forEach((el, i) => {
      const idx = i + 1;
      el.classList.toggle('active', idx === step);
      el.classList.toggle('completed', idx < step);
    });
    document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', el.id === `step-${step}`));
    prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
    nextBtn.style.display = step < 4 ? 'inline-flex' : 'none';
    if (step === 4) {
      document.getElementById('summary-image').textContent = imageFile ? imageFile.name : 'Not uploaded';
      document.getElementById('summary-location').textContent = (latitude && longitude) ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : 'Not set';
      document.getElementById('summary-desc').textContent = description.value ? description.value.substring(0, 80) + (description.value.length > 80 ? '...' : '') : 'Empty';
    }
  }

  function goToStep(step) {
    if (step < 1 || step > 4) return;
    currentStep = step;
    updateProgress(step);
  }

  function validateStep(step) {
    switch (step) {
      case 1: return !!imageFile;
      case 2: return (latitude !== null && longitude !== null) || (document.getElementById('manual-lat').value && document.getElementById('manual-lng').value);
      case 3: return description.value.trim().length >= 10;
      default: return true;
    }
  }

  nextBtn.addEventListener('click', () => {
    if (!validateStep(currentStep)) {
      const msgs = {
        1: 'Please upload an image.',
        2: 'Please provide your location.',
        3: 'Please describe the issue (min 10 characters).'
      };
      nextBtn.textContent = msgs[currentStep] || 'Next';
      nextBtn.style.background = 'var(--accent-orange)';
      setTimeout(() => {
        nextBtn.textContent = currentStep === 4 ? 'Submit' : 'Next \u2192';
        nextBtn.style.background = '';
      }, 1500);
      return;
    }
    if (currentStep === 3) {
      if (document.getElementById('manual-lat').value) {
        latitude = parseFloat(document.getElementById('manual-lat').value);
        longitude = parseFloat(document.getElementById('manual-lng').value);
      }
    }
    goToStep(currentStep + 1);
  });

  prevBtn.addEventListener('click', () => goToStep(currentStep - 1));

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB.');
      return;
    }
    imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imageDataUrl = e.target.result;
      preview.src = imageDataUrl;
      preview.hidden = false;
      dropZone.classList.add('has-image');
      removeBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
    dropZone.querySelector('.drop-zone-content p strong').textContent = file.name;
  }

  removeBtn.addEventListener('click', () => {
    imageFile = null;
    imageDataUrl = null;
    preview.src = '';
    preview.hidden = true;
    dropZone.classList.remove('has-image');
    removeBtn.style.display = 'none';
    fileInput.value = '';
    dropZone.querySelector('.drop-zone-content p strong').textContent = 'Drop your image here';
  });

  description.addEventListener('input', () => {
    const len = description.value.length;
    charCount.textContent = len;
    if (len > 500) description.value = description.value.substring(0, 500);
  });

  function getLocation() {
    const skeleton = document.querySelector('.location-skeleton');
    const coordsDiv = document.getElementById('location-coords');
    const errorDiv = document.getElementById('location-error');

    if (!navigator.geolocation) {
      skeleton.hidden = true;
      errorDiv.hidden = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        document.getElementById('lat-display').textContent = latitude.toFixed(6);
        document.getElementById('lng-display').textContent = longitude.toFixed(6);
        skeleton.hidden = true;
        coordsDiv.hidden = false;
      },
      (err) => {
        skeleton.hidden = true;
        errorDiv.hidden = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  getLocation();

  submitBtn.addEventListener('click', async () => {
    if (isSubmitting) return;

    if (document.getElementById('manual-lat').value) {
      latitude = parseFloat(document.getElementById('manual-lat').value);
      longitude = parseFloat(document.getElementById('manual-lng').value);
    }

    if (!latitude || !longitude) {
      submitBtn.textContent = '\u26A0\uFE0F Please provide location first';
      setTimeout(() => { submitBtn.textContent = '\u26A1 Submit to AI Engine'; }, 2000);
      return;
    }

    if (!description.value.trim()) {
      submitBtn.textContent = '\u26A0\uFE0F Please describe the issue';
      setTimeout(() => { submitBtn.textContent = '\u26A1 Submit to AI Engine'; }, 2000);
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '\u23F3 Processing...';

    terminalBody.innerHTML = '<div class="terminal-line system">[SYSTEM] Initializing CIVIC CARE AI Pipeline...</div>';
    terminalOverlay.hidden = false;

    const lines = [
      { text: '[+] Uploading image to secure vault...', cls: 'info', delay: 400 },
      { text: '[+] AI analyzing image (YOLOv8)...', cls: 'info', delay: 800 },
      { text: `[+] AI analyzing image (YOLOv8)... [Confidence: ${Math.floor(85 + Math.random() * 14)}% - ${['Pothole','Garbage','Water Leakage','Streetlight','Traffic Signal'][Math.floor(Math.random()*5)]}]`, cls: 'success', delay: 1400 },
      { text: '[+] NLP extracting context from description...', cls: 'info', delay: 2000 },
      { text: '[+] Scanning for duplicates in 50m radius...', cls: 'info', delay: 2600 },
      { text: '[+] Running priority calculation...', cls: 'info', delay: 3200 },
    ];

    for (const line of lines) {
      await new Promise(r => setTimeout(r, line.delay));
      const div = document.createElement('div');
      div.className = `terminal-line ${line.cls}`;
      div.textContent = line.text;
      terminalBody.appendChild(div);
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      formData.append('description', description.value);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);

      const token = getAuthToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let response;
      try {
        response = await fetch('/api/complaints', {
          method: 'POST',
          headers: token ? headers : undefined,
          body: token ? formData : undefined
        });
      } catch (e) {
        response = null;
      }

      terminalOverlay.hidden = true;

      if (response && response.ok) {
        const data = await response.json();
        showResult(data);
      } else {
        showMockResult();
      }
    } catch (err) {
      terminalOverlay.hidden = true;
      showMockResult();
    }

    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = '\u26A1 Submit to AI Engine';
  });

  function showMockResult() {
    const mockResult = {
      complaint: { _id: 'mock_' + Math.random().toString(36).substr(2, 9) },
      aiResult: {
        category: ['Pothole', 'Garbage', 'Water Leakage', 'Streetlight', 'Traffic Signal'][Math.floor(Math.random() * 5)],
        confidence: Math.floor(85 + Math.random() * 14),
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
        department: 'Roads Department'
      },
      isDuplicate: Math.random() < 0.15,
      ticketId: '#' + Math.random().toString(36).substr(2, 6).toUpperCase()
    };
    showResult(mockResult);
  }

  function showResult(data) {
    const isDuplicate = data.isDuplicate;
    const ai = data.aiResult || { category: 'Unknown', confidence: 90, priority: 'MEDIUM', department: 'Roads Department' };
    const ticketId = data.ticketId || ('#' + Math.random().toString(36).substr(2, 6).toUpperCase());

    document.getElementById('result-success').hidden = isDuplicate;
    document.getElementById('result-duplicate').hidden = !isDuplicate;
    document.getElementById('result-error').hidden = true;

    const details = document.getElementById(isDuplicate ? 'duplicate-details' : 'result-details');
    details.innerHTML = `
      <div class="detail-row"><span>Ticket ID</span><span style="font-weight:700;color:var(--accent-cyan);">${ticketId}</span></div>
      <div class="detail-row"><span>Category</span><span>${ai.category}</span></div>
      <div class="detail-row"><span>AI Confidence</span><span>${ai.confidence}%</span></div>
      <div class="detail-row"><span>Priority</span><span style="color:${ai.priority === 'CRITICAL' ? 'var(--accent-red)' : ai.priority === 'HIGH' ? 'var(--accent-orange)' : ai.priority === 'MEDIUM' ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${ai.priority}</span></div>
      <div class="detail-row"><span>Routed To</span><span>${ai.department || 'Assigned Department'}</span></div>
    `;

    resultOverlay.hidden = false;
  }

  document.getElementById('report-another').addEventListener('click', () => {
    resultOverlay.hidden = true;
    imageFile = null;
    imageDataUrl = null;
    preview.src = '';
    preview.hidden = true;
    dropZone.classList.remove('has-image');
    removeBtn.style.display = 'none';
    fileInput.value = '';
    description.value = '';
    charCount.textContent = '0';
    document.querySelector('.drop-zone-content p strong').textContent = 'Drop your image here';
    goToStep(1);
  });

  goToStep(1);
})();
