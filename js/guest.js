// ==========================================
// 1. INISIALISASI DOM
// ==========================================
const btnConfirmFrame = document.getElementById('btnConfirmFrame');

const sectionFrame = document.getElementById('step-frame');
const sectionCamera = document.getElementById('step-camera');
const sectionAdjust = document.getElementById('step-adjust');
const sectionDone = document.getElementById('step-done');

const framePreview = document.getElementById('framePreview');
const btnPrevFrame = document.getElementById('btnPrevFrame');
const btnNextFrame = document.getElementById('btnNextFrame');
const frameNameDisplay = document.getElementById('frameNameDisplay');

const cameraStream = document.getElementById('cameraStream');
const btnCapture = document.getElementById('btnCapture');
const btnFinishCapture = document.getElementById('btnFinishCapture');
const captureHelperText = document.getElementById('captureHelperText');
const thumbnailContainer = document.getElementById('thumbnailContainer');

const timerBtns = document.querySelectorAll('.timer-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const countdownOverlay = document.getElementById('countdownOverlay');

const adjustWorkspace = document.getElementById('adjustWorkspace');
const adjustPhotoLayers = document.getElementById('adjustPhotoLayers');
const adjustFrameOverlay = document.getElementById('adjustFrameOverlay');
const adjustThumbnails = document.getElementById('adjustThumbnails');
const btnConfirmAdjust = document.getElementById('btnConfirmAdjust');
const btnBackToCamera = document.getElementById('btnBackToCamera');

const photoCanvas = document.getElementById('photoCanvas');
const finalResult = document.getElementById('finalResult');
const btnDownload = document.getElementById('btnDownload');

const qrLoading = document.getElementById('qrLoading');
const qrContainer = document.getElementById('qrContainer');
const qrCodeImg = document.getElementById('qrCode');
const qrHelperText = document.getElementById('qrHelperText');

// ==========================================
// VARIABEL GLOBAL
// ==========================================
window.guestData = window.guestData || { selectedFrame: '', photoBase64: '' };
let videoStream = null;
let currentFrameIndex = 0;
let capturedPhotos = []; 
let currentSlots = 3;    
let framesList = []; 
let finalCanvasWidth = 1080;
let finalCanvasHeight = 1920;

let selectedTimer = 0;
let selectedFilter = 'none';
let isCountingDown = false;

// ==========================================
// 2. KONEKSI: MUAT FRAME JSON & CEK STATUS EVENT
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    btnConfirmFrame.innerText = "Memuat Frame...";
    btnConfirmFrame.disabled = true;
    
    try {
        const res = await fetch(FRAMES_JSON_URL + '?t=' + new Date().getTime()); 
        const result = await res.json();
        
        // Cek Saklar Event Aktif/Tidak
        if (result.is_event_active !== true) {
            alert("Maaf, Event Photobooth CHORUM saat ini sedang ditutup.");
            window.location.href = 'index.html'; 
            return;
        }

        if (result.status === 'success' && result.frames.length > 0) {
            framesList = result.frames;
            btnConfirmFrame.innerText = "Gunakan Frame Ini";
            btnConfirmFrame.disabled = false;
            updateFrameUI();
        } else {
            alert("Belum ada frame yang diatur di JSON.");
            frameNameDisplay.innerText = "Tidak Ada Frame";
        }
    } catch(error) { 
        alert("Gagal memuat frame. Cek koneksi internet."); 
        frameNameDisplay.innerText = "Offline Mode";
    }
});

function updateFrameUI() {
    if(framesList.length === 0) return;
    const currentFrame = framesList[currentFrameIndex];
    framePreview.src = currentFrame.url;
    currentSlots = currentFrame.slots;
    frameNameDisplay.innerText = `${currentFrame.name} (${currentSlots} Slot)`;
    guestData.selectedFrame = currentFrame.url;
}
btnNextFrame.addEventListener('click', () => { currentFrameIndex = (currentFrameIndex + 1) % framesList.length; updateFrameUI(); });
btnPrevFrame.addEventListener('click', () => { currentFrameIndex = (currentFrameIndex - 1 + framesList.length) % framesList.length; updateFrameUI(); });

// ==========================================
// 3. KAMERA (LANDSCAPE CROP 4:3 & PIXEL FILTER)
// ==========================================
btnConfirmFrame.addEventListener('click', () => {
    sectionFrame.classList.remove('active');
    sectionCamera.classList.add('active');
    capturedPhotos = [];
    renderThumbnails();
    startCamera();
});

async function startCamera() {
    try {
        const constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false };
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStream.srcObject = videoStream;
        cameraStream.onloadedmetadata = () => cameraStream.play();
    } catch (error) { alert("Tolong izinkan akses kamera biar bisa berfoto ria."); }
}

timerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        timerBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedTimer = parseInt(e.target.getAttribute('data-time'));
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedFilter = e.target.getAttribute('data-filter');
        cameraStream.style.filter = selectedFilter; 
    });
});

function renderThumbnails() {
    thumbnailContainer.innerHTML = '';
    capturedPhotos.forEach((photoUrl, index) => {
        const div = document.createElement('div');
        div.className = 'thumbnail-item';
        const img = document.createElement('img');
        img.src = photoUrl;
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-thumb';
        btnDel.innerHTML = '×';
        btnDel.onclick = () => { capturedPhotos.splice(index, 1); renderThumbnails(); };
        
        div.appendChild(img);
        div.appendChild(btnDel);
        thumbnailContainer.appendChild(div);
    });

    captureHelperText.innerText = `Pose terbaik lu! (${capturedPhotos.length}/${currentSlots})`;
    
    if (capturedPhotos.length >= currentSlots) {
        btnCapture.style.display = 'none';
        btnFinishCapture.style.display = 'block';
    } else {
        btnCapture.style.display = 'block';
        btnFinishCapture.style.display = 'none';
    }
}

function executeCapture() {
    const tempCanvas = document.createElement('canvas');
    const targetW = 1280;
    const targetH = 960; 
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const ctx = tempCanvas.getContext('2d');

    const vW = cameraStream.videoWidth || 1280;
    const vH = cameraStream.videoHeight || 960;

    let srcW, srcH, srcX, srcY;
    const targetRatio = targetW / targetH; 
    const streamRatio = vW / vH;

    if (streamRatio > targetRatio) {
        srcH = vH;
        srcW = vH * targetRatio;
        srcX = (vW - srcW) / 2;
        srcY = 0;
    } else {
        srcW = vW;
        srcH = vW / targetRatio;
        srcX = 0;
        srcY = (vH - srcH) / 2;
    }

    ctx.save();
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1); 
    ctx.drawImage(cameraStream, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
    ctx.restore();

    applyPixelFilter(ctx, targetW, targetH, selectedFilter);
    capturedPhotos.push(tempCanvas.toDataURL('image/jpeg', 0.85));
    renderThumbnails();
}

function applyPixelFilter(ctx, width, height, filterType) {
    if (!filterType || filterType === 'none') return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        if (filterType.includes('grayscale(100%)') && filterType.includes('contrast(150%)')) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            gray = ((gray - 128) * 1.5) + 128;
            gray = Math.min(255, Math.max(0, gray * 0.85));
            d[i] = d[i + 1] = d[i + 2] = gray;
        } else if (filterType.includes('grayscale(100%)')) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            d[i] = d[i + 1] = d[i + 2] = gray;
        } else if (filterType.includes('sepia(100%)')) {
            d[i]     = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        } else if (filterType.includes('sepia(40%)')) {
            let sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
            let sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
            let sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
            r = r * 0.6 + sr * 0.4; g = g * 0.6 + sg * 0.4; b = b * 0.6 + sb * 0.4;
            d[i]     = Math.min(255, Math.max(0, ((r - 128) * 1.2) + 128));
            d[i + 1] = Math.min(255, Math.max(0, ((g - 128) * 1.2) + 128));
            d[i + 2] = Math.min(255, Math.max(0, ((b - 128) * 1.2) + 128));
        } else if (filterType.includes('brightness(110%)')) {
            d[i]     = Math.min(255, r * 1.1);
            d[i + 1] = Math.min(255, g * 1.1);
            d[i + 2] = Math.min(255, b * 1.1);
        } else if (filterType.includes('saturate(150%)')) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            d[i]     = Math.min(255, Math.max(0, gray + (r - gray) * 1.5));
            d[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.5));
            d[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.5));
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

btnCapture.addEventListener('click', () => {
    if (capturedPhotos.length >= currentSlots || isCountingDown) return;
    
    if (selectedTimer > 0) {
        isCountingDown = true;
        btnCapture.disabled = true;
        let timeLeft = selectedTimer;
        
        countdownOverlay.style.display = 'flex';
        countdownOverlay.innerText = timeLeft;
        countdownOverlay.classList.remove('pop-anim');
        void countdownOverlay.offsetWidth; 
        countdownOverlay.classList.add('pop-anim');

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                countdownOverlay.innerText = timeLeft;
                countdownOverlay.classList.remove('pop-anim');
                void countdownOverlay.offsetWidth;
                countdownOverlay.classList.add('pop-anim');
            } else {
                clearInterval(interval);
                countdownOverlay.style.display = 'none';
                executeCapture();
                isCountingDown = false;
                btnCapture.disabled = false;
            }
        }, 1000);
    } else {
        executeCapture();
    }
});

// ==========================================
// 4. SESUAIKAN FOTO (PRO PORTRAIT WORKSPACE)
// ==========================================
let photoTransforms = [];
let activeEditIndex = 0;
let isDragging = false;
let startX, startY;
let initialPinchDistance = null;
let initialAngle = null;
let initialScale = 1;
let initialRotation = 0;

btnFinishCapture.addEventListener('click', async () => {
    sectionCamera.classList.remove('active');
    sectionAdjust.classList.add('active');
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());

    const frameImg = new Image();
    frameImg.src = guestData.selectedFrame;
    await new Promise(r => frameImg.onload = r);
    
    finalCanvasWidth = frameImg.naturalWidth;
    finalCanvasHeight = frameImg.naturalHeight;
    
    const maxWorkspaceHeight = window.innerHeight * 0.45;
    const frameRatio = finalCanvasWidth / finalCanvasHeight;
    let workspaceW = maxWorkspaceHeight * frameRatio;
    let workspaceH = maxWorkspaceHeight;

    const containerW = document.querySelector('.adjust-workspace-container').clientWidth - 20;
    if (workspaceW > containerW) {
        workspaceW = containerW;
        workspaceH = containerW / frameRatio;
    }

    adjustWorkspace.style.width = `${workspaceW}px`;
    adjustWorkspace.style.height = `${workspaceH}px`;
    
    adjustFrameOverlay.src = guestData.selectedFrame;
    adjustPhotoLayers.innerHTML = '';
    adjustThumbnails.innerHTML = '';
    
    const slotHeight = workspaceH / currentSlots; 
    photoTransforms = []; 

    capturedPhotos.forEach((photoUrl, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.style.position = 'absolute';
        slotDiv.style.top = `${index * slotHeight}px`;
        slotDiv.style.left = '0';
        slotDiv.style.width = '100%';
        slotDiv.style.height = `${slotHeight}px`;
        slotDiv.style.overflow = 'hidden';

        photoTransforms.push({ x: 0, y: 0, scale: 1, rotation: 0, flipH: 1, flipV: 1 });

        const img = document.createElement('img');
        img.src = photoUrl; 
        img.className = 'adjust-photo-item';
        img.id = `edit-photo-${index}`;
        img.style.position = 'absolute';
        img.style.top = '50%';
        img.style.left = '50%';
        img.style.width = '100%'; 
        img.style.height = 'auto'; 
        img.style.transform = `translate(calc(-50% + 0px), calc(-50% + 0px)) rotate(0deg) scale(1, 1)`;
        
        slotDiv.appendChild(img);
        adjustPhotoLayers.appendChild(slotDiv);

        const thumb = document.createElement('div');
        thumb.className = `thumbnail-item ${index === 0 ? 'active-edit' : ''}`;
        thumb.innerHTML = `<img src="${photoUrl}">`;
        thumb.onclick = () => setActiveEdit(index);
        adjustThumbnails.appendChild(thumb);
    });
    setActiveEdit(0); 
});

function setActiveEdit(index) {
    activeEditIndex = index;
    document.querySelectorAll('#adjustThumbnails .thumbnail-item').forEach((el, i) => { el.classList.toggle('active-edit', i === index); });
    document.querySelectorAll('.adjust-photo-item').forEach((el, i) => { el.parentElement.style.zIndex = i === index ? '5' : '1'; });
}

function updateTransformUI() {
    const tr = photoTransforms[activeEditIndex];
    const imgEl = document.getElementById(`edit-photo-${activeEditIndex}`);
    imgEl.style.transform = `translate(calc(-50% + ${tr.x}px), calc(-50% + ${tr.y}px)) rotate(${tr.rotation}deg) scale(${tr.scale * tr.flipH}, ${tr.scale * tr.flipV})`;
}

document.getElementById('btnFlipH').addEventListener('click', () => { photoTransforms[activeEditIndex].flipH *= -1; updateTransformUI(); });
document.getElementById('btnFlipV').addEventListener('click', () => { photoTransforms[activeEditIndex].flipV *= -1; updateTransformUI(); });

function getPinchDistance(touches) { return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY); }
function getPinchAngle(touches) { return Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX) * (180 / Math.PI); }

function onPointerDown(e) {
    if (e.touches && e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e.touches);
        initialAngle = getPinchAngle(e.touches);
        initialScale = photoTransforms[activeEditIndex].scale;
        initialRotation = photoTransforms[activeEditIndex].rotation;
        isDragging = false;
    } else {
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
    }
    adjustFrameOverlay.style.opacity = '0.3'; 
}

function onPointerMove(e) {
    if (e.touches && e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        if (initialPinchDistance) {
            const deltaScale = currentDistance / initialPinchDistance;
            photoTransforms[activeEditIndex].scale = Math.max(0.3, Math.min(initialScale * deltaScale, 3)); 
        }
        const currentAngle = getPinchAngle(e.touches);
        if (initialAngle !== null) {
            let deltaAngle = currentAngle - initialAngle;
            if (deltaAngle > 180) deltaAngle -= 360; if (deltaAngle < -180) deltaAngle += 360;
            photoTransforms[activeEditIndex].rotation = initialRotation + deltaAngle;
        }
        updateTransformUI();
    } else if (isDragging) {
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        photoTransforms[activeEditIndex].x += (clientX - startX);
        photoTransforms[activeEditIndex].y += (clientY - startY);
        startX = clientX; startY = clientY;
        updateTransformUI();
    }
}

function onPointerUp(e) { 
    isDragging = false; initialPinchDistance = null; initialAngle = null;
    if (!e.touches || e.touches.length === 0) adjustFrameOverlay.style.opacity = '1'; 
}

adjustWorkspace.addEventListener('mousedown', onPointerDown); adjustWorkspace.addEventListener('mousemove', onPointerMove); window.addEventListener('mouseup', onPointerUp);
adjustWorkspace.addEventListener('touchstart', onPointerDown, {passive: false}); adjustWorkspace.addEventListener('touchmove', onPointerMove, {passive: false});
window.addEventListener('touchend', onPointerUp); window.addEventListener('touchcancel', onPointerUp);

btnBackToCamera.addEventListener('click', () => {
    sectionAdjust.classList.remove('active');
    sectionCamera.classList.add('active');
    capturedPhotos = []; 
    renderThumbnails();
    startCamera(); 
});

// ==========================================
// 5. RENDER FOTO (HD & DIET KOMPRESI)
// ==========================================
btnConfirmAdjust.addEventListener('click', async () => {
    const originalText = btnConfirmAdjust.innerText;
    btnConfirmAdjust.innerText = "Membungkus Foto...";
    btnConfirmAdjust.disabled = true;
    
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = finalCanvasWidth;
    photoCanvas.height = finalCanvasHeight; 
    
    const workspaceW = parseFloat(adjustWorkspace.style.width);
    const scaleRatio = photoCanvas.width / workspaceW;

    for (let i = 0; i < capturedPhotos.length; i++) {
        const img = new Image();
        img.src = capturedPhotos[i];
        await new Promise(r => img.onload = r);
        
        const tr = photoTransforms[i];
        const origW = photoCanvas.width; 
        const origH = origW / (img.naturalWidth / img.naturalHeight); 
        const slotY = i * (photoCanvas.height / currentSlots);
        const slotH = photoCanvas.height / currentSlots;
        
        const globalCenterX = (workspaceW / 2 + tr.x) * scaleRatio;
        const globalCenterY = slotY + (slotH / scaleRatio / 2 + tr.y) * scaleRatio;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, slotY, photoCanvas.width, slotH);
        ctx.clip(); 

        ctx.translate(globalCenterX, globalCenterY);
        ctx.rotate(tr.rotation * Math.PI / 180);
        ctx.scale(tr.scale * tr.flipH, tr.scale * tr.flipV);
        ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
        ctx.restore();
    }

    if (guestData.selectedFrame) {
        const frameImg = new Image();
        frameImg.crossOrigin = "Anonymous";
        frameImg.src = guestData.selectedFrame;
        await new Promise(r => frameImg.onload = r);
        ctx.drawImage(frameImg, 0, 0, photoCanvas.width, photoCanvas.height);
    }

    // Resolusi HD (Untuk di-download langsung oleh tamu, kualitas 90%)
    guestData.photoBase64 = photoCanvas.toDataURL('image/jpeg', 0.9);
    
    // Resolusi Diet Khusus Upload (Hemat bandwidth, kualitas 40% agar loading QR sangat cepat)
    const uploadBase64 = photoCanvas.toDataURL('image/jpeg', 0.4); 
    
    // BYPASS: LEMPAR LANGSUNG KE LAYAR DOWNLOAD TANPA UPLOAD!
    finalResult.src = guestData.photoBase64; 
    btnDownload.href = guestData.photoBase64;
    
    btnConfirmAdjust.innerText = originalText;
    btnConfirmAdjust.disabled = false;
    
    sectionAdjust.classList.remove('active');
    sectionDone.classList.add('active'); 
    
    // Panggil GIF Generator & Eksekusi Upload ke ImgBB di latar belakang
    generateGIF();
    generateQRCode(uploadBase64);
});

// ==========================================
// 6. GENERATOR QR CODE (Menggunakan ImgBB Viewer Resmi)
// ==========================================
async function generateQRCode(compressedBase64) {
    qrLoading.style.display = 'block';
    qrContainer.style.display = 'none';
    qrHelperText.style.display = 'none';

    try {
        const pureBase64 = compressedBase64.split(',')[1];
        const formData = new FormData();
        formData.append('image', pureBase64);

        // Upload cepat ke ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Ambil URL halaman viewer resmi dari ImgBB (Contoh: https://ibb.co/rGy4dCRh)
            const viewerUrl = result.data.url_viewer; 
            
            // Konversi URL Viewer tersebut menjadi QR Code
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(viewerUrl)}`;
            qrCodeImg.src = qrApiUrl;
            
            qrCodeImg.onload = () => {
                qrLoading.style.display = 'none';
                qrContainer.style.display = 'block';
                qrHelperText.style.display = 'block';
            };
        } else {
            throw new Error("Gagal upload ke ImgBB");
        }
    } catch (error) {
        console.error("QR Code Error:", error);
        qrLoading.innerHTML = "Koneksi tidak stabil. Silakan gunakan tombol Download langsung saja.";
    }
}

// ==========================================
// 7. GENERATOR GIF (LOKAL)
// ==========================================
async function generateGIF() {
    let gifFrames = [];
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const logoImg = new Image();
    logoImg.src = 'assets/images/logo-chorum.png';
    await new Promise(r => { logoImg.onload = r; logoImg.onerror = r; });

    for (let i = 0; i < capturedPhotos.length; i++) {
        const img = new Image();
        img.src = capturedPhotos[i];
        await new Promise(r => img.onload = r);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (logoImg.naturalWidth > 0) {
            const logoW = 100;
            const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
            ctx.drawImage(logoImg, canvas.width - logoW - 15, canvas.height - logoH - 15, logoW, logoH);
        }

        gifFrames.push(canvas.toDataURL('image/jpeg', 0.7));
    }

    gifshot.createGIF({
        images: gifFrames,
        gifWidth: canvas.width,
        gifHeight: canvas.height,
        interval: 0.5, 
        numFrames: gifFrames.length
    }, function (obj) {
        if (!obj.error) {
            const gifUrl = obj.image;
            document.getElementById('finalGif').src = gifUrl;
            document.getElementById('btnDownloadGif').href = gifUrl;
            document.getElementById('finalGif').style.display = 'block';
            document.getElementById('btnDownloadGif').style.display = 'block';
            document.getElementById('gifLoading').style.display = 'none';
        }
    });
}

// TABS LOGIC
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});
