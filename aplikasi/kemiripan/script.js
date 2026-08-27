const uploadInput = document.getElementById('uploadInput');
const previewImage = document.getElementById('previewImage');
const cameraBtn = document.getElementById('cameraBtn');
const captureBtn = document.getElementById('captureBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const resultGrid = document.getElementById('resultGrid');
const loading = document.getElementById('loading');
const searchMeta = document.getElementById('searchMeta');
const imageMeta = document.getElementById('imageMeta');
const cameraEmpty = document.getElementById('cameraEmpty');

const state = {
  imageDataUrl: '',
  keywords: [],
  stream: null
};

function setImagePreview(dataUrl, name = 'Uploaded image') {
  previewImage.src = dataUrl;
  imageMeta.textContent = name;
  searchMeta.textContent = 'Siap mencari foto yang mirip.';
}

function analyzeImageFromDataUrl(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const sampleSize = 80;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;
    tempCtx.drawImage(img, 0, 0, sampleSize, sampleSize);

    const pixels = tempCtx.getImageData(0, 0, sampleSize, sampleSize).data;
    let totalBrightness = 0;
    let totalSaturation = 0;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const alpha = pixels[i + 3];
      if (alpha === 0) continue;

      totalBrightness += (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      totalSaturation += sat;
      red += r;
      green += g;
      blue += b;
      count += 1;
    }

    const avgBrightness = count ? totalBrightness / count : 0;
    const avgSaturation = count ? totalSaturation / count : 0;
    const dominantRed = red / count;
    const dominantGreen = green / count;
    const dominantBlue = blue / count;

    const aspect = img.width / img.height;
    const sceneType = aspect > 1.4 ? 'landscape' : aspect < 0.8 ? 'portrait' : 'photo';
    let hueGroup = 'color';

    if (avgSaturation < 0.15) {
      hueGroup = 'monochrome';
    } else {
      const maxChannel = Math.max(dominantRed, dominantGreen, dominantBlue);
      if (maxChannel === dominantRed && dominantRed > dominantGreen + 20) hueGroup = 'red';
      else if (maxChannel === dominantGreen && dominantGreen > dominantBlue + 20) hueGroup = 'green';
      else if (maxChannel === dominantBlue && dominantBlue > dominantGreen + 20) hueGroup = 'blue';
      else if (dominantRed > 180 && dominantGreen > 100) hueGroup = 'sunset';
      else if (avgBrightness > 180) hueGroup = 'bright';
    }

    const keywords = [sceneType, hueGroup, 'photo'];
    if (avgBrightness < 90) keywords.push('dark');
    if (avgBrightness > 180) keywords.push('bright');
    if (avgSaturation > 0.35) keywords.push('vivid');

    state.keywords = Array.from(new Set(keywords)).filter(Boolean).slice(0, 4);
    searchSimilarImages(state.keywords);
  };

  img.src = dataUrl;
}

async function searchSimilarImages(keywords) {
  const query = keywords.join(' ');
  loading.hidden = false;
  searchMeta.textContent = `Mencari kata kunci: ${query}`;

  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600&format=json&origin=*`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await response.json();
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

    if (!pages.length) {
      resultGrid.innerHTML = '<div class="empty-state">Tidak ada hasil yang cocok. Coba pilih foto lain atau ganti pencahayaan.</div>';
      loading.hidden = true;
      return;
    }

    resultGrid.innerHTML = pages
      .filter((page) => page.imageinfo && page.imageinfo[0]?.thumburl)
      .slice(0, 8)
      .map((page) => {
        const imageInfo = page.imageinfo?.[0];
        const title = page.title?.replace(/^File:/, '') || 'Image result';
        const description = imageInfo?.extmetadata?.ImageDescription?.value || 'Hasil pencarian gambar dari internet';
        return `
          <article class="result-card">
            <img src="${imageInfo.thumburl}" alt="${title}" loading="lazy" />
            <div class="info">
              <p class="title">${title}</p>
              <p class="desc">${description.slice(0, 90)}${description.length > 90 ? '...' : ''}</p>
            </div>
          </article>
        `;
      }).join('');
  } catch (error) {
    console.error(error);
    resultGrid.innerHTML = '<div class="empty-state">Gagal memuat hasil pencarian. Coba lagi nanti atau gunakan gambar lain.</div>';
  } finally {
    loading.hidden = true;
  }
}

function handleSelectedFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    state.imageDataUrl = dataUrl;
    setImagePreview(dataUrl, file.name || 'Uploaded image');
    analyzeImageFromDataUrl(dataUrl);
  };
  reader.readAsDataURL(file);
}

uploadInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  handleSelectedFile(file);
});

cameraBtn.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraEmpty.textContent = 'Browser Anda tidak mendukung kamera.';
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });

    video.srcObject = state.stream;
    video.style.display = 'block';
    cameraEmpty.style.display = 'none';
  } catch (error) {
    cameraEmpty.textContent = 'Tidak bisa membuka kamera. Izinkan akses kamera lalu coba lagi.';
    console.error(error);
  }
});

captureBtn.addEventListener('click', () => {
  if (!state.stream) {
    cameraEmpty.textContent = 'Silakan aktifkan kamera terlebih dahulu.';
    cameraEmpty.style.display = 'block';
    return;
  }

  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/png');

  state.imageDataUrl = dataUrl;
  setImagePreview(dataUrl, 'Camera capture');
  analyzeImageFromDataUrl(dataUrl);
  video.style.display = 'none';
});

searchMeta.textContent = 'Belum ada pencarian.';
resultGrid.innerHTML = '<div class="empty-state">Upload foto atau ambil dari kamera untuk memulai pencarian gambar yang mirip.</div>';
