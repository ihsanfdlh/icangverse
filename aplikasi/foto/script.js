const presetButtons = document.querySelectorAll('.preset');
const filterButtons = document.querySelectorAll('.filter');
const gridButtons = document.querySelectorAll('.grid');
const slots = document.querySelectorAll('.photo-slot');
const photoGrid = document.getElementById('photoGrid');
const captureBtn = document.getElementById('captureBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewStage = document.getElementById('previewStage');
const previewImage = document.getElementById('previewImage');
const emptyPreview = document.getElementById('emptyPreview');
const cameraPreview = document.getElementById('cameraPreview');
const selectedMeta = document.getElementById('selectedMeta');
const canvas = document.getElementById('captureCanvas');
const ctx = canvas.getContext('2d');

const state = {
  preset: 'classic',
  filter: 'none',
  grid: '1',
  selectedSlot: 0,
  streamReady: false,
  latestShot: null
};

const presetMap = {
  classic: 'Classic',
  vivid: 'Vivid',
  warm: 'Warm',
  mono: 'Mono',
  cinematic: 'Cinematic'
};

const filterMap = {
  none: 'None',
  contrast: 'Contrast',
  sepia: 'Sepia',
  grayscale: 'Grayscale',
  saturate: 'Saturate'
};

function getFilterCSS(filterName) {
  const filterStyles = {
    none: 'none',
    contrast: 'contrast(1.5)',
    sepia: 'sepia(0.8)',
    grayscale: 'grayscale(1)',
    saturate: 'saturate(1.8)'
  };

  return filterStyles[filterName] || filterStyles.none;
}

function getPresetCSS(presetName) {
  const presetStyles = {
    classic: 'none',
    vivid: 'saturate(1.35) contrast(1.2)',
    warm: 'sepia(0.15) saturate(1.25) contrast(1.08)',
    mono: 'grayscale(0.85) contrast(1.1)',
    cinematic: 'contrast(1.3) saturate(0.9) brightness(0.95)'
  };

  return presetStyles[presetName] || presetStyles.classic;
}

function updateMeta() {
  selectedMeta.textContent = `Preset: ${presetMap[state.preset]} • Filter: ${filterMap[state.filter]}`;
}

function setPreset(nextPreset) {
  state.preset = nextPreset;
  presetButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.preset === nextPreset);
  });

  Object.assign(state, { preset: nextPreset });
  updateMeta();
  applyCameraFilter();
  renderSelectedShot();
}

function setFilter(nextFilter) {
  state.filter = nextFilter;
  filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === nextFilter);
  });

  updateMeta();
  applyCameraFilter();
  renderSelectedShot();
}

function applyCameraFilter() {
  const filterValue = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
  cameraPreview.style.filter = filterValue;
  previewImage.style.filter = filterValue;
}

function setGrid(nextGrid) {
  state.grid = nextGrid;
  photoGrid.dataset.grid = nextGrid;
  gridButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.grid === nextGrid);
  });

  const visibleCount = Number(nextGrid);
  slots.forEach((slot, index) => {
    slot.style.display = index < visibleCount ? 'flex' : 'none';
  });
}

function selectSlot(slotIndex) {
  state.selectedSlot = slotIndex;
  slots.forEach((slot, index) => {
    slot.classList.toggle('selected', index === slotIndex);
  });
  renderSelectedShot();
}

function renderSelectedShot() {
  const selectedSlot = slots[state.selectedSlot];
  const capturedImage = selectedSlot?.querySelector('img');

  if (!capturedImage) {
    previewImage.classList.remove('visible');
    previewImage.removeAttribute('src');
    emptyPreview.style.display = 'block';
    cameraPreview.style.display = 'block';
    return;
  }

  emptyPreview.style.display = 'none';
  cameraPreview.style.display = 'none';
  previewImage.src = capturedImage.src;
  previewImage.classList.add('visible');
  previewImage.style.filter = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    emptyPreview.textContent = 'Kamera tidak didukung di browser ini.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });

    cameraPreview.srcObject = stream;
    cameraPreview.style.display = 'block';
    cameraPreview.style.filter = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
    emptyPreview.style.display = 'none';
    state.streamReady = true;
  } catch (error) {
    console.error('Camera access error:', error);
    emptyPreview.textContent = 'Tidak bisa mengakses kamera. Izinkan akses kamera lalu muat ulang halaman.';
    emptyPreview.style.display = 'block';
  }
}

function capturePhoto() {
  if (!state.streamReady || !cameraPreview.srcObject) {
    emptyPreview.textContent = 'Kamera belum siap. Tunggu sebentar lalu coba lagi.';
    emptyPreview.style.display = 'block';
    return;
  }

  const selectedSlot = slots[state.selectedSlot];
  const width = cameraPreview.videoWidth || 1280;
  const height = cameraPreview.videoHeight || 720;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(cameraPreview, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/png');

  const image = selectedSlot.querySelector('img');
  if (image) {
    image.src = dataUrl;
    image.style.filter = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
  } else {
    const newImage = document.createElement('img');
    newImage.src = dataUrl;
    newImage.alt = 'Hasil foto';
    newImage.style.filter = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
    selectedSlot.appendChild(newImage);
  }

  const badge = document.createElement('div');
  badge.className = 'capture-badge';
  badge.textContent = 'Foto diambil';

  const existingBadge = selectedSlot.querySelector('.capture-badge');
  if (existingBadge) existingBadge.remove();

  selectedSlot.appendChild(badge);
  state.latestShot = dataUrl;

  cameraPreview.style.display = 'none';
  previewImage.src = dataUrl;
  previewImage.classList.add('visible');
  previewImage.style.filter = `${getPresetCSS(state.preset)} ${getFilterCSS(state.filter)}`;
  emptyPreview.style.display = 'none';
}

function downloadPhoto() {
  if (!state.latestShot) {
    alert('Belum ada foto yang diambil. Ambil foto terlebih dahulu.');
    return;
  }

  const link = document.createElement('a');
  link.href = state.latestShot;
  link.download = 'photo-booth-shot.png';
  link.click();
}

function resetStudio() {
  slots.forEach((slot) => {
    const image = slot.querySelector('img');
    if (image) image.remove();
    const badge = slot.querySelector('.capture-badge');
    if (badge) badge.remove();
  });

  state.latestShot = null;
  previewImage.classList.remove('visible');
  previewImage.removeAttribute('src');
  cameraPreview.style.display = 'block';
  emptyPreview.textContent = 'Kamera siap digunakan. Tekan tombol Take Photo untuk menangkap gambar.';
  emptyPreview.style.display = 'block';

  const previewBadge = previewStage.querySelector('.capture-badge');
  if (previewBadge) previewBadge.remove();

  state.selectedSlot = 0;
  selectSlot(0);
}

presetButtons.forEach((button) => {
  button.addEventListener('click', () => setPreset(button.dataset.preset));
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});

gridButtons.forEach((button) => {
  button.addEventListener('click', () => setGrid(button.dataset.grid));
});

slots.forEach((slot, index) => {
  slot.dataset.preset = state.preset;
  slot.dataset.filter = state.filter;
  slot.setAttribute('data-slot', String(index));
  slot.addEventListener('click', () => selectSlot(index));
});

captureBtn.addEventListener('click', capturePhoto);
resetBtn.addEventListener('click', resetStudio);
downloadBtn.addEventListener('click', downloadPhoto);

updateMeta();
setGrid('1');
selectSlot(0);
startCamera();
