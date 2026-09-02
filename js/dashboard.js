// ==========================================
// ELEMEN DOM DASHBOARD (GITHUB JSON MODE)
// ==========================================
const eventToggle = document.getElementById('eventToggle');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const frameCatalog = document.getElementById('frameCatalog');

// ==========================================
// MEMUAT DATA EVENT & KATALOG FRAME
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    fetchEventStatus();
    fetchLocalFrames();
});

// 1. Ambil Status Event dari Google Apps Script
async function fetchEventStatus() {
    try {
        const res = await fetch(`${API_URL}?action=getEventData&eventToken=${EVENT_TOKEN}`);
        const result = await res.json();
        if (result.status === 'success') {
            const isEventOn = result.event_status === 'ON';
            eventToggle.checked = isEventOn;
            updateStatusBadge(isEventOn);
        }
    } catch (error) { 
        console.error("Gagal memuat status event:", error); 
        statusText.innerText = 'Gagal terhubung ke server';
    }
}

// 2. Ambil Katalog Frame Super Cepat dari GitHub (frames.json)
async function fetchLocalFrames() {
    frameCatalog.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">Membaca katalog frames.json...</p>';
    
    try {
        const res = await fetch(FRAMES_JSON_URL + '?t=' + new Date().getTime());
        const result = await res.json();
        
        if (result.status === 'success') {
            renderFrames(result.frames);
        } else {
            frameCatalog.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">Format JSON tidak valid.</p>';
        }
    } catch (error) { 
        console.error(error); 
        frameCatalog.innerHTML = '<p class="text-muted" style="color: var(--danger-color); font-size: 0.8rem;">Gagal membaca frames.json. Periksa jalur file Anda.</p>';
    }
}

// ==========================================
// KONTROL STATUS EVENT (ON/OFF)
// ==========================================
function updateStatusBadge(isOn) {
    if (isOn) {
        statusText.innerText = 'Sistem Menerima Tamu (Aktif)';
        statusIndicator.querySelector('.dot').className = 'dot active';
    } else {
        statusText.innerText = 'Sistem Terkunci (Selesai)';
        statusIndicator.querySelector('.dot').className = 'dot';
    }
}

eventToggle.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    updateStatusBadge(isChecked); 
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateStatus', eventToken: EVENT_TOKEN, event_status: isChecked ? 'ON' : 'OFF' })
        });
    } catch (error) { 
        e.target.checked = !isChecked; 
        updateStatusBadge(!isChecked); 
        alert("Gagal mengubah status event ke server.");
    }
});

// ==========================================
// RENDER KATALOG FRAME (READ-ONLY)
// ==========================================
function renderFrames(frames) {
    if(!frames || frames.length === 0) {
        frameCatalog.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">Belum ada frame terdaftar di frames.json.</p>';
        return;
    }
    
    frameCatalog.innerHTML = '';
    frames.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'frame-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '15px';
        div.style.padding = '10px';
        div.style.background = 'rgba(255,255,255,0.03)';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid var(--border-color)';

        div.innerHTML = `
            <img src="${frame.url}" alt="Frame" style="width: 50px; height: 88px; object-fit: contain; background: #000; border-radius: 4px;">
            <div class="frame-info" style="flex: 1;">
                <b style="color: var(--text-primary); font-size: 0.95rem;">${frame.name}</b><br>
                <span style="color: var(--text-secondary); font-size: 0.8rem;">Jumlah Slot: ${frame.slots} Slot</span><br>
                <span style="color: var(--accent-color); font-size: 0.75rem; word-break: break-all;">Path: ${frame.url}</span>
            </div>
        `;
        frameCatalog.appendChild(div);
    });
}