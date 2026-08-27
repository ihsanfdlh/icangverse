const departments = [];

const startIpInput = document.getElementById('startIp');
const deptNameInput = document.getElementById('deptName');
const hostCountInput = document.getElementById('hostCount');
const hostList = document.getElementById('hostList');
const results = document.getElementById('results');
const ipError = document.getElementById('ipError');
const addError = document.getElementById('addError');

function showError(element, message, timeout = 3000) {
  element.textContent = message;
  element.style.display = 'block';

  clearTimeout(element._timer);
  element._timer = setTimeout(() => {
    element.style.display = 'none';
  }, timeout);
}

function validateIP(ip) {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255 && String(value) === part;
  });
}

function ipToNum(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function numToIp(num) {
  return [24, 16, 8, 0].map((shift) => (num >>> shift) & 255).join('.');
}

function nextPow2(n) {
  let power = 1;
  while (power - 2 < n) {
    power *= 2;
  }
  return power;
}

function subnetInfo(hostCount) {
  const blockSize = nextPow2(hostCount + 2);
  const hostBits = Math.log2(blockSize);
  const usable = blockSize - 2;
  return { blockSize, hostBits, usable };
}

function renderBinaryMask(prefix) {
  const totalBits = 32;
  let bits = '';

  for (let index = 0; index < totalBits; index += 1) {
    if (index > 0 && index % 8 === 0) {
      bits += '<span class="dot">.</span>';
    }

    bits += index < prefix ? '<span class="bit-on">1</span>' : '<span class="bit-off">x</span>';
  }

  return `<div class="bits-display">${bits}</div>`;
}

function renderList() {
  hostList.innerHTML = departments.length === 0
    ? '<div class="empty">Belum ada departemen. Tambahkan jaringan untuk mulai menghitung.</div>'
    : departments.map((dept, index) => `
        <div class="host-item">
          <div class="host-left">
            <span class="host-bullet"></span>
            <span class="host-name">${dept.name}</span>
          </div>
          <div class="host-meta">
            <span class="host-count">${dept.count} host</span>
            <button class="remove-btn" type="button" data-index="${index}" aria-label="Hapus departemen ${dept.name}">✕</button>
          </div>
        </div>
      `).join('');

  document.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      departments.splice(index, 1);
      renderList();
    });
  });
}

function addDept() {
  const name = deptNameInput.value.trim();
  const count = Number(hostCountInput.value);

  if (!name) {
    showError(addError, '✗ Masukkan nama departemen.');
    return;
  }

  if (!Number.isInteger(count) || count < 1 || count > 65534) {
    showError(addError, '✗ Jumlah host harus antara 1–65534.');
    return;
  }

  departments.push({ name, count });
  renderList();
  deptNameInput.value = '';
  hostCountInput.value = '';
  deptNameInput.focus();
}

function ipClassPrefix(ip) {
  const firstOctet = Number(ip.split('.')[0]);
  if (firstOctet >= 1 && firstOctet <= 126) return 8;
  if (firstOctet >= 128 && firstOctet <= 191) return 16;
  return 24;
}

function calculate() {
  const ipRaw = startIpInput.value.trim();

  if (!validateIP(ipRaw)) {
    showError(ipError, '✗ Format IP tidak valid. Contoh: 192.168.1.0');
    return;
  }

  if (departments.length === 0) {
    showError(addError, '✗ Tambahkan minimal 1 departemen.');
    return;
  }

  const sorted = [...departments].sort((a, b) => b.count - a.count);
  let currentIp = ipToNum(ipRaw);

  const cardHTML = sorted.map((dept, index) => {
    const { blockSize, hostBits, usable } = subnetInfo(dept.count);
    const prefix = 32 - hostBits;
    const networkNum = currentIp;
    const firstHost = currentIp + 1;
    const broadcast = currentIp + blockSize - 1;
    const lastHost = broadcast - 1;
    const maskNum = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const maskStr = numToIp(maskNum);
    const percent = Math.round((dept.count / usable) * 100);

    currentIp += blockSize;

    const bitValues = [128, 64, 32, 16, 8, 4, 2, 1];
    const bitHeader = `<div class="bit-header">${bitValues.map((value) => `<span class="bit-cell">${value}</span>`).join('')}</div>`;

    return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-dept">${String(index + 1).padStart(2, '0')}. ${dept.name}</span>
          <span class="result-badge">${dept.count} host diminta</span>
        </div>

        <div class="result-body">
          <div class="binary-panel">
            <div class="binary-label">Subnet mask binary (/${prefix})</div>
            ${bitHeader}
            ${renderBinaryMask(prefix)}
            <div class="binary-summary">
              Bit jaringan = <span style="color: var(--primary); font-weight:700;">${prefix}</span> |
              Bit host = <span style="color: var(--green); font-weight:700;">${hostBits}</span> |
              Total blok = <span style="color: #d8b4fe; font-weight:700;">${blockSize}</span> |
              IP usable = <span style="color: var(--green); font-weight:700;">${usable}</span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Network</span>
              <span class="info-value net">${numToIp(networkNum)} /${prefix}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Subnet</span>
              <span class="info-value mask">${maskStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Awal Host</span>
              <span class="info-value start">${numToIp(firstHost)} /${prefix}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Akhir Host</span>
              <span class="info-value end">${numToIp(lastHost)} /${prefix}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Broadcast</span>
              <span class="info-value bcast">${numToIp(broadcast)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Host Usable</span>
              <span class="info-value usable">${usable} IP</span>
            </div>
          </div>

          <div class="usage">
            <span>Efisiensi</span>
            <div class="bar-bg"><div class="bar-fill" style="width:${percent}%"></div></div>
            <span>${dept.count}/${usable} = ${percent}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const classPrefix = ipClassPrefix(ipRaw);
  results.innerHTML = `
    <div class="result-summary" style="font-size: 0.72rem; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase;">
      Hasil Subnetting — Start IP: ${ipRaw} — Kelas ${classPrefix}
    </div>
    ${cardHTML}
  `;
}

document.getElementById('addDeptBtn').addEventListener('click', addDept);
document.getElementById('calculateBtn').addEventListener('click', calculate);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const active = document.activeElement;
    if (active && (active.id === 'deptName' || active.id === 'hostCount')) {
      addDept();
    }
  }
});

renderList();
