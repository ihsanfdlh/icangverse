const STORAGE_KEY = 'custom-khodam-list-v1';

const defaultKhodam = [
  {
    id: 1,
    name: 'Khodam Naga Emas',
    symbol: '🐉',
    element: 'Api',
    power: 'Melindungi',
    description: 'Pemilik aura yang tajam, kuat, dan memiliki naluri pelindung terhadap lingkungan sekitar.'
  },
  {
    id: 2,
    name: 'Khodam Laut Dalam',
    symbol: '🌊',
    element: 'Air',
    power: 'Intuisi',
    description: 'Memiliki ketenangan dan penetrasi batin yang membuat keputusan terasa lebih jelas.'
  },
  {
    id: 3,
    name: 'Khodam Angin Sakti',
    symbol: '🦅',
    element: 'Angin',
    power: 'Kecerdasan',
    description: 'Khodam yang cepat berpikir, dinamis, dan mampu membaca arah perjalanan secara luas.'
  },
  {
    id: 4,
    name: 'Khodam Cahaya Bulan',
    symbol: '🌙',
    element: 'Cahaya',
    power: 'Penyembuhan',
    description: 'Memberi rasa tenang, menenangkan emosi, dan membantu memulihkan energi hati.'
  }
];

const state = {
  khodamList: loadKhodam(),
  currentId: 4
};

const khodamForm = document.getElementById('khodamForm');
const khodamList = document.getElementById('khodamList');
const formName = document.getElementById('khodamName');
const formSymbol = document.getElementById('khodamSymbol');
const formElement = document.getElementById('khodamElement');
const formPower = document.getElementById('khodamPower');
const formDesc = document.getElementById('khodamDesc');
const resetBtn = document.getElementById('resetKhodam');
const namaUser = document.getElementById('namaUser');
const focusSelect = document.getElementById('focusSelect');
const cekBtn = document.getElementById('cekBtn');
const hasilKhodam = document.getElementById('hasilKhodam');
const khodamCount = document.getElementById('khodamCount');

function loadKhodam() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultKhodam));
    return [...defaultKhodam];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : [...defaultKhodam];
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultKhodam));
    return [...defaultKhodam];
  }
}

function saveKhodam() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.khodamList));
}

function renderKhodamList() {
  khodamList.innerHTML = '';

  state.khodamList.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'khodam-item';
    li.innerHTML = `
      <div class="khodam-meta">
        <div class="khodam-avatar">${item.symbol || '✦'}</div>
        <div>
          <span class="khodam-name">${item.name}</span>
          <span class="khodam-element">${item.element} • ${item.power}</span>
        </div>
      </div>
      <button class="remove-btn" type="button" data-id="${item.id}">Hapus</button>
    `;
    khodamList.appendChild(li);
  });

  khodamCount.textContent = `${state.khodamList.length}`;

  document.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      state.khodamList = state.khodamList.filter((item) => item.id !== id);
      saveKhodam();
      renderKhodamList();
    });
  });
}

function addKhodam(event) {
  event.preventDefault();

  const name = formName.value.trim();
  const symbol = formSymbol.value.trim();
  const element = formElement.value.trim();
  const power = formPower.value.trim();
  const description = formDesc.value.trim();

  if (!name || !symbol || !element || !power || !description) {
    alert('Semua field wajib diisi agar khodam bisa ditambahkan.');
    return;
  }

  const newItem = {
    id: Date.now(),
    name,
    symbol,
    element,
    power,
    description
  };

  state.khodamList.push(newItem);
  state.currentId = newItem.id;
  saveKhodam();
  renderKhodamList();
  khodamForm.reset();
  formName.focus();
}

function resetToDefault() {
  state.khodamList = [...defaultKhodam];
  saveKhodam();
  renderKhodamList();
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim();
}

function getMatchScore(name, item, focus) {
  const baseName = normalizeText(name);
  const itemName = normalizeText(item.name + ' ' + item.element + ' ' + item.power + ' ' + item.description);
  const focusBoost = {
    perlindungan: item.power.toLowerCase().includes('lindung') ? 18 : 0,
    kekuatan: item.power.toLowerCase().includes('kuat') || item.element.toLowerCase().includes('api') ? 18 : 0,
    intuisi: item.power.toLowerCase().includes('intu') || item.description.toLowerCase().includes('batin') ? 18 : 0,
    penyembuhan: item.power.toLowerCase().includes('sembuh') || item.description.toLowerCase().includes('tenang') ? 18 : 0,
    kecerdasan: item.power.toLowerCase().includes('cerdas') || item.element.toLowerCase().includes('angin') ? 18 : 0
  };

  let score = 35;

  if (baseName.length > 0) {
    for (let i = 0; i < baseName.length; i += 1) {
      const char = baseName[i];
      if (itemName.includes(char)) {
        score += 8;
      }
    }
  }

  if (item.element.toLowerCase().includes(focus) || item.power.toLowerCase().includes(focus)) {
    score += 24;
  }

  const numericSeed = baseName.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const itemSeed = item.name.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const harmony = Math.abs((numericSeed % 14) - (itemSeed % 14));
  score += Math.max(0, 20 - harmony * 2);
  score += focusBoost[focus] || 0;

  return Math.min(99, Math.max(60, score));
}

function calculateBestMatch(name, focus) {
  if (!state.khodamList.length) {
    return null;
  }

  let bestMatch = state.khodamList[0];
  let highestScore = -1;

  state.khodamList.forEach((item) => {
    const score = getMatchScore(name, item, focus);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  });

  return {
    item: bestMatch,
    score: highestScore
  };
}

function renderResult(result) {
  const { item, score } = result;

  const tagMap = {
    perlindungan: 'Pelindung',
    kekuatan: 'Pemberi Kekuatan',
    intuisi: 'Pembuka Intuisi',
    penyembuhan: 'Penyembuh',
    kecerdasan: 'Pembawa Kecerdasan'
  };

  hasilKhodam.classList.remove('empty');
  hasilKhodam.innerHTML = `
    <div class="result-head">
      <div class="result-name">
        <span>${item.symbol}</span>
        <span>${item.name}</span>
      </div>
      <div class="result-score">${score}%</div>
    </div>
    <div class="result-tag">${tagMap[focusSelect.value] || 'Khodam Terbaik'}</div>
    <p class="result-desc">${item.description}</p>
    <div class="result-power">
      <span>Elemen: ${item.element}</span>
      <span>Utama: ${item.power}</span>
    </div>
  `;
}

function cekKhodam() {
  const name = namaUser.value.trim();
  if (!name) {
    alert('Masukkan nama kamu terlebih dahulu.');
    return;
  }

  const focus = focusSelect.value;
  const result = calculateBestMatch(name, focus);

  if (!result) {
    hasilKhodam.classList.add('empty');
    hasilKhodam.innerHTML = `
      <div class="result-placeholder">
        <span>⚠️</span>
        <p>Belum ada khodam yang bisa dipilih. Tambahkan minimal satu khodam terlebih dahulu.</p>
      </div>
    `;
    return;
  }

  renderResult(result);
}

khodamForm.addEventListener('submit', addKhodam);
resetBtn.addEventListener('click', resetToDefault);
cekBtn.addEventListener('click', cekKhodam);

renderKhodamList();
