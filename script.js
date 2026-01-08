// ============ GOOGLE APPS SCRIPT CONFIG ============
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyPfLpvP95bpojgmJkmtM3Jn4n_BhqgwtlqbaQ4tEymX2m6x8WaIUTavC8p4C-CY9bc9Q/exec';

// ============ CORS PROXY SOLUTION ============
// Gunakan CORS proxy untuk development
const USE_CORS_PROXY = true; // Set true untuk GitHub Pages, false untuk localhost

function getScriptUrl() {
    if (USE_CORS_PROXY) {
        // Gunakan CORS proxy untuk menghindari CORS error di GitHub Pages
        const encodedUrl = encodeURIComponent(GOOGLE_SCRIPT_URL);
        return `https://corsproxy.io/?${encodedUrl}`;
    }
    return GOOGLE_SCRIPT_URL;
}

// ============ GOOGLE SHEETS SYNC FUNCTIONS ============

// Test connection to Google Apps Script
async function testGoogleScriptConnection() {
    try {
        updateSyncStatus('syncing');
        
        const scriptUrl = getScriptUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Test dengan GET request
        const testUrl = `${scriptUrl}${scriptUrl.includes('corsproxy.io') ? '' : '?'}action=test&_=${Date.now()}`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            updateSyncStatus('synced');
            showNotification('✅ Koneksi Google Apps Script berhasil!', 'success');
            console.log('Test result:', result);
            return true;
        } else {
            throw new Error(result.error || 'Script mengembalikan error');
        }
    } catch (error) {
        updateSyncStatus('error');
        
        if (error.name === 'AbortError') {
            showNotification('⏱️ Timeout: Koneksi terlalu lama', 'error');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            showNotification('🔗 Gagal terhubung karena CORS. Menggunakan proxy...', 'warning');
            // Coba tanpa proxy sebagai fallback
            const USE_CORS_PROXY = false;
            setTimeout(() => testGoogleScriptConnection(), 1000);
        } else {
            showNotification(`❌ Error: ${error.message}`, 'error');
        }
        
        console.error('Connection error:', error);
        return false;
    }
}

// Load data from Google Sheets
async function loadFromGoogleSheets() {
    try {
        updateSyncStatus('syncing');
        
        const scriptUrl = getScriptUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // Load dengan GET request
        const loadUrl = `${scriptUrl}${scriptUrl.includes('corsproxy.io') ? '' : '?'}action=loadData&_=${Date.now()}`;
        
        const response = await fetch(loadUrl, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Simpan data ke localStorage
            localStorage.setItem('transactions', JSON.stringify(result.data.transactions || []));
            localStorage.setItem('savingTargets', JSON.stringify(result.data.savingTargets || []));
            localStorage.setItem('reminders', JSON.stringify(result.data.reminders || []));
            
            // Update timestamp
            localStorage.setItem('lastSync', new Date().toISOString());
            document.getElementById('last-sync').textContent = formatDate(new Date().toISOString());
            
            // Update UI
            loadAllData();
            
            updateSyncStatus('synced');
            showNotification('✅ Data berhasil dimuat dari Google Sheets!', 'success');
            console.log('Loaded data counts:', result.counts);
        } else {
            throw new Error(result.error || 'No data');
        }
    } catch (error) {
        updateSyncStatus('error');
        
        if (error.name === 'AbortError') {
            showNotification('⏱️ Timeout: Load data terlalu lama', 'error');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            showNotification('🔗 CORS Error: Tidak bisa load data', 'error');
            console.error('CORS Error details:', error);
        } else {
            showNotification(`❌ Gagal load: ${error.message}`, 'error');
        }
        
        console.error('Load error:', error);
    }
}

// Save data to Google Sheets - AUTOMATIC ON EVERY EDIT
async function saveToGoogleSheets() {
    try {
        updateSyncStatus('syncing');
        
        const data = {
            transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
            savingTargets: JSON.parse(localStorage.getItem('savingTargets') || '[]'),
            reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
            timestamp: new Date().toISOString()
        };
        
        const scriptUrl = getScriptUrl();
        const payload = {
            action: 'saveData',
            data: data
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        let response;
        
        if (scriptUrl.includes('corsproxy.io')) {
            // Gunakan FormData untuk CORS proxy
            const formData = new FormData();
            formData.append('action', 'saveData');
            formData.append('data', JSON.stringify(data));
            
            response = await fetch(scriptUrl, {
                method: 'POST',
                body: formData,
                mode: 'cors',
                signal: controller.signal
            });
        } else {
            // Gunakan JSON langsung untuk Google Apps Script
            response = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update sync status di data lokal
            updateLocalDataSyncStatus();
            
            const now = new Date();
            localStorage.setItem('lastSync', now.toISOString());
            document.getElementById('last-sync').textContent = formatDate(now.toISOString());
            
            updateSyncStatus('synced');
            showNotification('✅ Data berhasil disimpan ke Google Sheets!', 'success');
            console.log('Save result:', result);
        } else {
            throw new Error(result.error || 'Gagal menyimpan ke Google Sheets');
        }
    } catch (error) {
        updateSyncStatus('error');
        
        if (error.name === 'AbortError') {
            showNotification('⏱️ Timeout: Save data terlalu lama', 'error');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            showNotification('🔗 CORS Error: Tidak bisa save ke Google Sheets', 'error');
            console.error('CORS Error details:', error);
            
            // Simpan data lokal sebagai backup
            const backup = {
                transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
                savingTargets: JSON.parse(localStorage.getItem('savingTargets') || '[]'),
                reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
                syncError: true,
                errorMessage: error.message,
                timestamp: new Date().toISOString()
            };
            
            // Simpan backup ke localStorage
            localStorage.setItem('lastBackup', JSON.stringify(backup));
            showNotification('⚠️ Data disimpan lokal (backup)', 'warning');
            
        } else {
            showNotification(`❌ Gagal save: ${error.message}`, 'error');
        }
        
        console.error('Save error:', error);
    }
}

// ============ FIXES YANG DIBUAT: ============

// 1. Update fungsi testGoogleScriptConnection() - LINE 20-70
//    - Pakai getScriptUrl() bukan GOOGLE_SCRIPT_URL langsung
//    - Handle CORS error dengan lebih baik

// 2. Update fungsi loadFromGoogleSheets() - LINE 73-121
//    - Pakai getScriptUrl()
//    - Handle URL dengan proxy vs tanpa proxy

// 3. Update fungsi saveToGoogleSheets() - LINE 124-204
//    - Pakai getScriptUrl()
//    - Handle FormData untuk proxy, JSON untuk direct
//    - Backup system jika error

// ============ TAMBAHKAN FUNGSI BACKUP: ============

function checkBackupData() {
    const lastBackup = localStorage.getItem('lastBackup');
    if (lastBackup) {
        const backup = JSON.parse(lastBackup);
        if (backup.syncError) {
            console.log('Ada backup data yang belum tersinkron:', backup);
            // Tampilkan notifikasi
            showNotification('⚠️ Ada data lokal yang belum tersinkron ke Google Sheets', 'warning');
        }
    }
}

// ============ UPDATE INITIALIZATION: ============

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    document.getElementById('date').value = today;
    document.getElementById('target-deadline').value = today;
    document.getElementById('reminder-edit-start-month').value = currentMonth;
    
    // Inisialisasi data jika belum ada
    initializeData();
    
    // Load data awal dari localStorage
    loadAllData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Filter kategori berdasarkan jenis transaksi
    filterCategoryOptions();
    
    // Update status sinkronisasi
    updateSyncStatus();
    
    // Update durasi pengingat setiap bulan
    updateReminderDurations();
    
    // Cek backup data
    checkBackupData();
    
    // Auto test connection on load
    setTimeout(() => {
        testGoogleScriptConnection();
    }, 1000);
});

// ============ HAPUS FUNGSI MODAL YANG TIDAK DIPERLUKAN: ============

// Hapus atau comment out fungsi-fungsi ini karena tidak perlu:
/*
function openConnectionModal() {
    // Tidak diperlukan karena URL sudah hardcode
    showNotification('URL Google Script sudah dikonfigurasi otomatis', 'info');
}

function saveScriptUrl() {
    // Tidak diperlukan
    showNotification('URL tidak bisa diubah dari aplikasi', 'info');
}
*/

// ============ UPDATE SETUP EVENT LISTENERS: ============

// Update bagian ini di setupEventListeners():
// Event listener untuk test koneksi Google Apps Script
document.getElementById('test-connection').addEventListener('click', function() {
    testGoogleScriptConnection();
});

// Hapus event listener untuk modal koneksi karena tidak perlu
/*
document.getElementById('btn-cancel-script').addEventListener('click', function() {
    document.getElementById('connection-modal').classList.remove('active');
});

document.getElementById('btn-save-script').addEventListener('click', function() {
    saveScriptUrl();
});
*/
