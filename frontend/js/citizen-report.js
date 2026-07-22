(function() {
  let currentStep = 1;
  let imageFile = null;
  let imageDataUrl = null;
  let latitude = null;
  let longitude = null;
  let isSubmitting = false;

  // Camera stream variables
  let stream = null;
  let videoDevices = [];
  let facingMode = 'environment'; // default to rear camera

  // DOM Elements
  const video = document.getElementById('webcam');
  const preview = document.getElementById('preview');
  const captureBtn = document.getElementById('capture-btn');
  const switchBtn = document.getElementById('switch-btn');
  const retakeBtn = document.getElementById('retake-btn');
  const cameraStatus = document.getElementById('camera-status');
  const cameraFallback = document.getElementById('camera-fallback');
  const fallbackInput = document.getElementById('fallback-input');
  const fallbackFilename = document.getElementById('fallback-filename');
  const photoCanvas = document.getElementById('photo-canvas');

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const description = document.getElementById('description');
  const charCount = document.getElementById('char-count');
  const themeToggle = document.getElementById('theme-toggle');

  function getAuthToken() {
    return localStorage.getItem('token');
  }

  function getUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
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

  async function startCamera() {
    if (stream) {
      stopCamera();
    }
    
    cameraStatus.textContent = 'Accessing camera...';
    cameraStatus.style.display = 'block';
    video.style.display = 'block';
    preview.style.display = 'none';
    preview.hidden = true;
    captureBtn.style.display = 'inline-flex';
    retakeBtn.style.display = 'none';
    cameraFallback.style.display = 'none';
    
    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };
    
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      cameraStatus.style.display = 'none';
      
      // Check if multiple cameras exist to show switch button
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 1) {
          switchBtn.style.display = 'inline-flex';
        } else {
          switchBtn.style.display = 'none';
        }
      } catch (err) {
        console.warn('Error enumerating devices:', err);
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      showFallback(err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  function showFallback(err) {
    cameraStatus.style.display = 'none';
    video.style.display = 'none';
    captureBtn.style.display = 'none';
    switchBtn.style.display = 'none';
    retakeBtn.style.display = 'none';
    cameraFallback.style.display = 'block';
  }

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
      document.getElementById('summary-image').textContent = imageFile ? imageFile.name : 'Not captured';
      document.getElementById('summary-location').textContent = (latitude && longitude) ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : 'Not set';
      document.getElementById('summary-desc').textContent = description.value ? description.value.substring(0, 80) + (description.value.length > 80 ? '...' : '') : 'Empty';
    }
  }

  function goToStep(step) {
    if (step < 1 || step > 4) return;
    currentStep = step;
    updateProgress(step);
    
    if (currentStep === 1) {
      if (!imageFile) {
        startCamera();
      } else {
        stopCamera();
        video.style.display = 'none';
        preview.src = imageDataUrl;
        preview.style.display = 'block';
        preview.hidden = false;
        captureBtn.style.display = 'none';
        switchBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        cameraFallback.style.display = 'none';
      }
    } else {
      stopCamera();
    }

    if (currentStep === 2) {
      setTimeout(initReportMap, 100);
    }
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
        1: 'Please capture a photo.',
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

  captureBtn.addEventListener('click', () => {
    if (!stream) return;
    
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    photoCanvas.width = width;
    photoCanvas.height = height;
    
    const ctx = photoCanvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    imageDataUrl = photoCanvas.toDataURL('image/jpeg', 0.85);
    
    photoCanvas.toBlob((blob) => {
      if (blob) {
        imageFile = new File([blob], 'captured_issue.jpg', { type: 'image/jpeg' });
        
        stopCamera();
        video.style.display = 'none';
        preview.src = imageDataUrl;
        preview.style.display = 'block';
        preview.hidden = false;
        
        captureBtn.style.display = 'none';
        switchBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        cameraStatus.style.display = 'none';
      }
    }, 'image/jpeg', 0.85);
  });

  retakeBtn.addEventListener('click', () => {
    imageFile = null;
    imageDataUrl = null;
    preview.src = '';
    preview.style.display = 'none';
    preview.hidden = true;
    retakeBtn.style.display = 'none';
    
    startCamera();
  });

  switchBtn.addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });

  fallbackInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum 10MB.');
        return;
      }
      imageFile = file;
      fallbackFilename.textContent = `Selected: ${file.name}`;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        imageDataUrl = e.target.result;
        preview.src = imageDataUrl;
        preview.style.display = 'block';
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    }
  });

  description.addEventListener('input', () => {
    const len = description.value.length;
    charCount.textContent = len;
    if (len > 500) description.value = description.value.substring(0, 500);
  });

  async function getLocation() {
    const skeleton = document.querySelector('.location-skeleton');
    const coordsDiv = document.getElementById('location-coords');
    const errorDiv = document.getElementById('location-error');

    // 1. Check Permission Status (Safe wrapper for iOS Safari compatibility)
    let permissionState = 'prompt';
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = result.state;
      } catch (e) {
        console.warn('navigator.permissions.query is not supported or failed:', e);
      }
    }

    function showDeniedInstructions() {
      errorDiv.innerHTML = `
        &#9888; Location access is blocked. Please reset permissions:
        <ol style="margin-top:0.25rem; padding-left:1.2rem; line-height:1.4; text-align:left; font-size:0.8rem; color:var(--text-secondary);">
          <li>Tap the lock 🔒 or settings icon in the URL bar.</li>
          <li>Change Location to <strong>Allow</strong>.</li>
          <li>Reload the page.</li>
        </ol>
      `;
      errorDiv.hidden = false;
    }

    function showGeneralError() {
      errorDiv.innerHTML = `&#9888; Could not get GPS location. Please enter coordinates manually or enable device GPS.`;
      errorDiv.hidden = false;
    }

    if (permissionState === 'denied') {
      skeleton.hidden = true;
      showDeniedInstructions();
      // Show the button to retry/enable GPS
      document.getElementById('btn-use-gps').style.display = 'inline-flex';
      return;
    }

    if (!navigator.geolocation) {
      skeleton.hidden = true;
      showGeneralError();
      return;
    }

    function onSuccess(pos) {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      document.getElementById('lat-display').textContent = latitude.toFixed(6);
      document.getElementById('lng-display').textContent = longitude.toFixed(6);
      
      // Populate manual input fields to match acquired GPS coordinates
      document.getElementById('manual-lat').value = latitude.toFixed(6);
      document.getElementById('manual-lng').value = longitude.toFixed(6);
      
      if (reportMap && reportMarker) {
        reportMap.setView([latitude, longitude], 14);
        reportMarker.setLatLng([latitude, longitude]);
        reportMap.invalidateSize();
      }
      
      // Hide the GPS button since we have real GPS location
      document.getElementById('btn-use-gps').style.display = 'none';

      // Show the GPS status row
      const gpsStatusRow = document.getElementById('gps-status-row');
      if (gpsStatusRow) gpsStatusRow.style.display = 'block';

      skeleton.hidden = true;
      coordsDiv.hidden = false;
    }

    function onError(error) {
      console.warn(`Geolocation Error Code: ${error.code} | Message: ${error.message}`);
      skeleton.hidden = true;
      
      if (error.code === 1) { // PERMISSION_DENIED
        showDeniedInstructions();
      } else {
        showGeneralError();
      }
      
      document.getElementById('btn-use-gps').style.display = 'inline-flex';
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  let reportMap = null;
  let reportMarker = null;

  function initReportMap() {
    if (typeof L === 'undefined') return;
    
    const lat = latitude || 28.6139;
    const lng = longitude || 77.2090;

    if (!reportMap) {
      const mapContainer = document.getElementById('report-map');
      if (!mapContainer) return;

      // Disable all interaction controls for static verification map
      reportMap = L.map('report-map', {
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false
      }).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(reportMap);

      // Marker is static for visual verification only
      reportMarker = L.marker([lat, lng], { draggable: false }).addTo(reportMap);
    } else {
      reportMap.setView([lat, lng], 14);
      reportMarker.setLatLng([lat, lng]);
      setTimeout(() => reportMap.invalidateSize(), 50);
    }
  }

  const updateMapFromManualInputs = () => {
    const latVal = parseFloat(document.getElementById('manual-lat').value);
    const lngVal = parseFloat(document.getElementById('manual-lng').value);
    if (!isNaN(latVal) && !isNaN(lngVal)) {
      latitude = latVal;
      longitude = lngVal;
      document.getElementById('lat-display').textContent = latitude.toFixed(6);
      document.getElementById('lng-display').textContent = longitude.toFixed(6);
      if (reportMap && reportMarker) {
        reportMap.setView([latitude, longitude]);
        reportMarker.setLatLng([latitude, longitude]);
      }
    }
  };

  document.getElementById('manual-lat').addEventListener('input', updateMapFromManualInputs);
  document.getElementById('manual-lng').addEventListener('input', updateMapFromManualInputs);

  document.getElementById('btn-use-gps').addEventListener('click', () => {
    // Hide GPS button while fetching
    document.getElementById('btn-use-gps').style.display = 'none';
    document.getElementById('location-error').hidden = true;
    document.getElementById('location-coords').hidden = true;
    
    const skeleton = document.querySelector('.location-skeleton');
    skeleton.hidden = false;
    skeleton.querySelector('.skeleton-line:first-child').textContent = 'Acquiring GPS signal...';
    
    // Remove previous IP fallback badge
    const ipBadge = document.querySelector('.ip-fallback-badge');
    if (ipBadge) ipBadge.remove();

    getLocation();
  });

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      response = await fetch('/api/complaints', {
        method: 'POST',
        headers: token ? headers : undefined,
        body: token ? formData : undefined,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (e) {
      response = null;
    }

    if (response && response.ok) {
      window.location.href = '/citizen-dashboard.html';
      return;
    }

    isSubmitting = false;
    submitBtn.disabled = false;

    let errMsg = '\u26A0\uFE0F Server error';
    if (response) {
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch (_) {}
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => { window.location.href = '/login.html'; }, 2000);
        return;
      }
    } else {
      errMsg = '\u26A0\uFE0F Could not reach server';
    }

    submitBtn.textContent = errMsg;
    setTimeout(() => { submitBtn.textContent = '\u26A1 Submit to AI Engine'; }, 4000);
  });

  goToStep(1);
})();
