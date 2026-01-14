// Konfigurasi
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD9VA0Vyn1biMzzD3kOT_BkWxqzTKvG2_iQ2JoDcZU4B57NCVhwVHeC-KPiwZKPLYx4w/exec';

// State aplikasi
let appData = {
    transactions: [],
    savingsTargets: [],
    reminders: [],
    summary: {
        income: 0,
        expense: 0,
        saving: 0,
        balance: 0
    },
    lastSync: null
};

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    console.log('Aplikasi FinTrack dimulai');
    
    // Set tanggal default di form
    const today = new Date();
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = today;
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    const transType = document.getElementById('transaction-type');
    if (transType) {
        updateCategoryOptions(transType.value);
    }
    
    // Inisialisasi dropdown kategori
    setupCategoryDropdown();
    
    // Setup event listeners
    setupEventListeners();
    
    // Mulai dengan sinkronisasi cloud
    console.log('Menyambungkan ke database cloud...');
    syncFromCloud();
});

// Setup semua event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            filterTransactions(filter);
        });
    });
    
    // Radio filter
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            filterByType(this.value);
        });
    });
    
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', function() {
            calculateLocalSummary();
        });
    });
    
    // Form transaksi
    const transForm = document.getElementById('transaction-form-input');
    if (transForm) transForm.addEventListener('submit', saveTransaction);
    
    // Form target tabungan
    const addTargetBtn = document.getElementById('btn-add-target');
    if (addTargetBtn) addTargetBtn.addEventListener('click', addSavingsTarget);
    
    // Form reminder
    const reminderForm = document.getElementById('reminder-edit-form');
    if (reminderForm) {
        reminderForm.addEventListener('submit', saveReminder);
        document.getElementById('btn-cancel-reminder').addEventListener('click', cancelEditReminder);
        document.getElementById('btn-delete-reminder').addEventListener('click', deleteReminder);
    }
    
    // Type filter list
    document.querySelectorAll('input[name="type-list"]').forEach(radio => {
        radio.addEventListener('change', function() {
            filterByType(this.value);
        });
    });
    
    // Sync buttons
    const syncBtn = document.getElementById('btn-sync-from-cloud');
    if (syncBtn) syncBtn.addEventListener('click', syncFromCloud);

    // Type dropdown untuk kategori
    const transType = document.getElementById('transaction-type');
    if (transType) {
        transType.addEventListener('change', function() {
            console.log('Transaction type changed to:', this.value);
            updateCategoryOptions(this.value);
            toggleSavingTarget();
        });
    }
    
    // Modal
    const modalCancel = document.getElementById('modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', hideModal);
    
    const clearData = document.getElementById('clear-data');
    if (clearData) clearData.addEventListener('click', confirmClearData);
}

function formatCategoryName(category) {
    const names = {
        'gaji': 'Gaji',
        'investasi': 'Investasi',
        'hibah': 'Hibah/Hadiah',
        'lainnya': 'Lainnya (Pemasukan)',
        'makanan': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'belanja': 'Belanja',
        'hiburan': 'Hiburan',
        'kesehatan': 'Kesehatan',
        'pendidikan': 'Pendidikan',
        'tabungan': 'Tabungan Umum'
    };
    
    return names[category] || category;
}

// ===== SETUP CATEGORY DROPDOWN =====
function setupCategoryDropdown() {
    const transType = document.getElementById('transaction-type');
    if (transType) updateCategoryOptions(transType.value);
}

function updateCategoryOptions(selectedType) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    
    let categories = [];
    
    if (selectedType === 'income') {
        categories = [
            { value: 'gaji', text: 'Gaji' },
            { value: 'investasi', text: 'Investasi' },
            { value: 'hibah', text: 'Hibah/Hadiah' },
            { value: 'lainnya', text: 'Lainnya (Pemasukan)' }
        ];
    } else if (selectedType === 'expense') {
        categories = [
            { value: 'makanan', text: 'Makanan & Minuman' },
            { value: 'transportasi', text: 'Transportasi' },
            { value: 'belanja', text: 'Belanja' },
            { value: 'hiburan', text: 'Hiburan' },
            { value: 'kesehatan', text: 'Kesehatan' },
            { value: 'pendidikan', text: 'Pendidikan' },
            { value: 'lainnya', text: 'Lainnya (Pengeluaran)' }
        ];
    } else if (selectedType === 'saving') {
        categories = [
            { value: 'tabungan', text: 'Tabungan Umum' }
        ];
    } else {
        categories = [
            { value: 'gaji', text: 'Gaji' },
            { value: 'investasi', text: 'Investasi' },
            { value: 'hibah', text: 'Hibah/Hadiah' },
            { value: 'makanan', text: 'Makanan & Minuman' },
            { value: 'transportasi', text: 'Transportasi' },
            { value: 'belanja', text: 'Belanja' },
            { value: 'hiburan', text: 'Hiburan' },
            { value: 'kesehatan', text: 'Kesehatan' },
            { value: 'pendidikan', text: 'Pendidikan' },
            { value: 'tabungan', text: 'Tabungan Umum' },
            { value: 'lainnya', text: 'Lainnya' }
        ];
    }
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.text;
        option.className = `${selectedType}-option`;
        categorySelect.appendChild(option);
    });
    
    if (currentValue) {
        const stillValid = categories.some(cat => cat.value === currentValue);
        if (stillValid) {
            categorySelect.value = currentValue;
        }
    }
}

function toggleSavingTarget() {
    const type = document.getElementById('transaction-type').value;
    const container = document.getElementById('saving-target-container');
    
    if (container) {
        container.style.display = type === 'saving' ? 'block' : 'none';
    }
    
    if (type === 'saving') {
        setTimeout(() => {
            const categorySelect = document.getElementById('category');
            if (categorySelect) {
                categorySelect.value = 'tabungan';
            }
        }, 100);
    }
}

// Fungsi untuk switch tab
function switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        }
    });
    
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });

    if (tabId === 'transaction-list') {
        const activeFilter = document.querySelector('.filter-btn.active');
        const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'month';
        loadTransactions(filter);
    } else if (tabId === 'savings') {
        loadSavingsTargets();
    } else if (tabId === 'reminders-edit') {
        loadReminders();
    }
}

// ===== FUNGSI TRANSAKSI =====

function saveTransaction(e) {
    e.preventDefault();
    
    const type = document.getElementById('transaction-type').value;
    const category = document.getElementById('category').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    const targetId = document.getElementById('saving-target').value;
    
    if (!type || !category || !amount || !date) {
        showMessage('Harap isi semua field yang wajib', 'error');
        return;
    }
    
    const transaction = {
        type: type,
        category: category,
        amount: parseFloat(amount),
        date: date,
        description: description,
        targetId: targetId || null
    };
    
    if (navigator.onLine) {
        // Jika tipenya saving, gunakan sheet khusus datatabungan
        if (type === 'saving') {
            syncSavingToCloud(transaction);
        } else {
            syncTransactionToCloud(transaction);
        }
        showMessage('Mengirim ke database...', 'info');
        resetForm();
    } else {
        showMessage('Gagal: Harus online untuk menyimpan transaksi', 'error');
    }
}

function syncSavingToCloud(transaction) {
    console.log('Preparing to sync saving to datatabungan:', transaction);
    
    const formData = new FormData();
    formData.append('action', 'saveSaving');
    formData.append('data', JSON.stringify(transaction));

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
    })
    .then(() => {
        console.log('Saving request sent to datatabungan');
        updateSyncStatus('success', 'Tersinkron');
        showMessage('Tabungan berhasil disimpan!', 'success');
        setTimeout(syncFromCloud, 2000);
    })
    .catch(error => {
        console.error('Saving sync failed:', error);
        updateSyncStatus('warning', 'Simpan gagal');
        showMessage('Gagal mengirim data tabungan', 'error');
    });
}

function deleteSavingsData() {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data tabungan dan target tabungan? Tindakan ini tidak dapat dibatalkan.')) {
        return;
    }

    if (!navigator.onLine) {
        showMessage('Harus online untuk menghapus data cloud', 'error');
        return;
    }

    updateSyncStatus('syncing', 'Menghapus...');
    
    const formData = new FormData();
    formData.append('action', 'deleteSavings');

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
    })
    .then(() => {
        showMessage('Data tabungan berhasil dihapus!', 'success');
        setTimeout(syncFromCloud, 2000);
    })
    .catch(error => {
        console.error('Delete savings failed:', error);
        showMessage('Gagal menghapus data tabungan', 'error');
    });
}


function syncTransactionToCloud(transaction) {
    console.log('Preparing to sync transaction:', transaction);
    
    const formData = new FormData();
    formData.append('action', 'saveTransaction');
    formData.append('data', JSON.stringify(transaction));

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
    })
    .then(() => {
        console.log('Transaction request sent (no-cors mode)');
        updateSyncStatus('success', 'Tersinkron');
        showMessage('Transaksi berhasil dikirim ke cloud!', 'success');
        setTimeout(syncFromCloud, 2000);
    })
    .catch(error => {
        console.error('Transaction sync failed:', error);
        updateSyncStatus('warning', 'Simpan gagal');
        showMessage('Gagal mengirim ke database cloud', 'error');
    });
}

function loadTransactions(filter = 'month') {
    console.log('Loading transactions, filter:', filter);
    
    if (navigator.onLine && (!appData.transactions || appData.transactions.length === 0)) {
        syncFromCloud();
        return;
    }
    
    renderTransactions();
}


function syncTransactionsFromCloud(filter) {
    // Fungsi ini dikosongkan karena data ditarik secara global lewat syncFromCloud
}

function filterTransactions(filter) {
    loadTransactions(filter);
}

function filterByType(type) {
    console.log('Filtering by type:', type);
    
    // Pastikan data transaksi dimuat dari localStorage jika appData kosong
    if (!appData.transactions || appData.transactions.length === 0) {
        const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
        appData.transactions = localTransactions.map(t => ({
            Tanggal: t.date,
            Tipe: t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
            Kategori: t.category,
            Jumlah: parseFloat(t.amount) || 0,
            Keterangan: t.description || ''
        }));
    }

    let filtered = appData.transactions;
    
    if (type === 'income') {
        filtered = appData.transactions.filter(t => t.Tipe === 'Pemasukan');
    } else if (type === 'expense') {
        filtered = appData.transactions.filter(t => t.Tipe === 'Pengeluaran');
    } else if (type === 'saving') {
        filtered = appData.transactions.filter(t => t.Tipe === 'Tabungan');
    }
    
    renderTransactions(filtered);
}

function renderTransactions(transactions = appData.transactions) {
    console.log('Rendering transactions:', transactions.length);
    
    const container = document.getElementById('filtered-transactions');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
                <p class="empty-hint">Mulai tambahkan transaksi di tab "Transaksi"</p>
            </div>
        `;
        return;
    }
    
    transactions.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
    
    let html = '';
    transactions.forEach(transaction => {
        const date = new Date(transaction.Tanggal);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const amount = formatCurrency(transaction.Jumlah);
        const typeClass = transaction.Tipe === 'Pemasukan' ? 'income' : 
                         transaction.Tipe === 'Pengeluaran' ? 'expense' : 'saving';
        const iconClass = getCategoryIcon(transaction.Kategori);
        
        html += `
            <div class="transaction-item ${typeClass}">
                <div class="transaction-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-header">
                        <span class="transaction-category">${transaction.Kategori}</span>
                        <span class="transaction-amount">${amount}</span>
                    </div>
                    <div class="transaction-footer">
                        <span class="transaction-date">${formattedDate}</span>
                        ${transaction.Keterangan ? `<span class="transaction-desc">${transaction.Keterangan}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadLocalTransactions(filter = 'month') {
    console.log('Loading local transactions');
    
    const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    let filteredTransactions = localTransactions;
    
    if (filter === 'day') {
        const today = new Date().toISOString().split('T')[0];
        filteredTransactions = localTransactions.filter(t => 
            new Date(t.date).toISOString().split('T')[0] === today
        );
    } else if (filter === 'month') {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        filteredTransactions = localTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });
    } else if (filter === 'year') {
        const currentYear = new Date().getFullYear();
        filteredTransactions = localTransactions.filter(t => 
            new Date(t.date).getFullYear() === currentYear
        );
    }
    
    appData.transactions = filteredTransactions.map(t => ({
        Tanggal: t.date,
        Tipe: t.type === 'income' ? 'Pemasukan' : 
              t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
        Kategori: t.category,
        Jumlah: parseFloat(t.amount) || 0,
        Keterangan: t.description || ''
    }));
    
    console.log('Local transactions loaded:', appData.transactions.length);
    renderTransactions(appData.transactions);
}

function loadSavingsTargets() {
    // Load dari localStorage dulu
    const localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
    
    // Hitung total tabungan aktual
    const allTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    let totalActualSavings = 0;
    
    allTransactions.forEach(transaction => {
        if (transaction.type === 'saving') {
            totalActualSavings += parseFloat(transaction.amount) || 0;
        }
    });
    
    // Update current amount di setiap target berdasarkan proporsi
    let totalTargetAmount = 0;
    localTargets.forEach(target => {
        totalTargetAmount += target.target || 0;
    });
    
    appData.savingsTargets = localTargets.map(t => {
        let current = 0;
        if (totalTargetAmount > 0) {
            current = Math.round((t.target / totalTargetAmount) * totalActualSavings) || 0;
        }
        
        return {
            ...t,
            current: current,
            progress: t.target > 0 ? Math.min(Math.round((current || 0) / t.target * 100), 100) : 0
        };
    });
    
    renderSavingsTargets();
    populateSavingTargetDropdown();
    updateSavingsProgress();
    
    // Sync dari cloud jika online
    if (navigator.onLine) {
        fetch(`${SCRIPT_URL}?action=getSavingsTargets`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    appData.savingsTargets = result.data;
                    renderSavingsTargets();
                    populateSavingTargetDropdown();
                    updateSavingsProgress();
                    
                    // Simpan ke localStorage
                    localStorage.setItem('fintrack_savings_targets', JSON.stringify(result.data));
                }
            })
            .catch(error => {
                console.log('Failed to load savings from cloud:', error);
            });
    }
}

function renderSavingsTargets() {
    const container = document.getElementById('targets-list');
    if (!container) return;
    const targets = appData.savingsTargets;
    
    if (!targets || targets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <p>Belum ada target tabungan</p>
                <p class="empty-hint">Tambahkan target tabungan Anda di bawah</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    targets.forEach(target => {
        const progress = target.progress || 0;
        const current = formatCurrency(target.current || 0);
        const targetAmount = formatCurrency(target.target || 0);
        const daysLeft = target.daysLeft > 0 ? `${target.daysLeft} hari lagi` : 'Telah lewat';
        
        html += `
            <div class="target-item" style="border-left-color: ${target.color || '#4361ee'}">
                <div class="target-header">
                    <h4 class="target-name">${target.nama || target.name}</h4>
                    <div class="target-amounts">
                        <span class="target-current">${current}</span>
                        <span class="target-total">/ ${targetAmount}</span>
                    </div>
                </div>
                <div class="target-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; background-color: ${target.color || '#4361ee'}"></div>
                    </div>
                    <span class="progress-text">${progress}%</span>
                </div>
                <div class="target-footer">
                    ${target.deadline ? `<span class="target-deadline"><i class="far fa-calendar"></i> ${formatDate(target.deadline)} (${daysLeft})</span>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addSavingsTarget() {
    const name = document.getElementById('target-name').value;
    const targetAmount = document.getElementById('target-amount').value;
    const deadline = document.getElementById('target-deadline').value;
    const color = document.getElementById('target-color').value;
    
    if (!name || !targetAmount) {
        showMessage('Harap isi nama dan target jumlah', 'error');
        return;
    }
    
    const target = {
        name: name,
        target: parseFloat(targetAmount),
        current: 0,
        deadline: deadline || null,
        color: color
    };
    
    let localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
    localTargets.push(target);
    localStorage.setItem('fintrack_savings_targets', JSON.stringify(localTargets));
    
    appData.savingsTargets.push({
        nama: name,
        target: parseFloat(targetAmount),
        current: 0,
        deadline: deadline,
        color: color,
        progress: 0
    });
    
    document.getElementById('target-name').value = '';
    document.getElementById('target-amount').value = '';
    document.getElementById('target-deadline').value = '';
    
    renderSavingsTargets();
    populateSavingTargetDropdown();
    updateSavingsProgress();
    
    if (navigator.onLine) {
        fetch(`${SCRIPT_URL}?action=saveSavingsTarget&data=${encodeURIComponent(JSON.stringify(target))}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log('Savings target synced to cloud');
                }
            })
            .catch(error => {
                console.log('Failed to sync target to cloud:', error);
            });
    }
    
    showMessage('Target tabungan berhasil ditambahkan!', 'success');
}

function populateSavingTargetDropdown() {
    const dropdown = document.getElementById('saving-target');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Pilih Target Tabungan</option>';
    
    // Tambahkan opsi "Tabungan Umum" untuk transaksi tabungan tanpa target spesifik
    const generalOption = document.createElement('option');
    generalOption.value = 'umum';
    generalOption.textContent = 'Tabungan Umum (Tanpa Target)';
    dropdown.appendChild(generalOption);
    
    appData.savingsTargets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.id || target.nama || target.name;
        option.textContent = `${target.nama || target.name} (${formatCurrency(target.target || 0)})`;
        dropdown.appendChild(option);
    });
}
function updateSavingsProgress() {
    const container = document.getElementById('progress-container');
    if (!container) return;
    
    if (appData.savingsTargets.length === 0) {
        container.innerHTML = '<p class="progress-info">Tambahkan target tabungan untuk melihat progress</p>';
        return;
    }
    
    // PERBAIKAN: Hitung total tabungan AKTUAL dari transaksi, bukan dari target
    const allTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    let totalActualSavings = 0;
    
    // Hitung total tabungan dari semua transaksi bertipe 'saving'
    allTransactions.forEach(transaction => {
        if (transaction.type === 'saving') {
            totalActualSavings += parseFloat(transaction.amount) || 0;
        }
    });
    
    // Update current amount di setiap target tabungan
    let totalTargetAmount = 0;
    let totalCurrentAmount = 0;
    
    appData.savingsTargets.forEach(target => {
        totalTargetAmount += target.target || 0;
        
        // PERBAIKAN: Hitung current berdasarkan proporsi total tabungan
        if (totalTargetAmount > 0) {
            target.current = Math.round((target.target / totalTargetAmount) * totalActualSavings) || 0;
        }
        
        target.progress = target.target > 0 ? Math.min(Math.round((target.current || 0) / target.target * 100), 100) : 0;
        totalCurrentAmount += target.current || 0;
    });
    
    const totalPercent = totalTargetAmount > 0 ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) : 0;
    
    container.innerHTML = `
        <div class="overall-progress">
            <div class="progress-label">
                <span>Progress Keseluruhan</span>
                <span>${totalPercent}%</span>
            </div>
            <div class="progress-bar-large">
                <div class="progress-fill" style="width: ${totalPercent}%"></div>
            </div>
            <div class="progress-stats">
                <span>${formatCurrency(totalActualSavings)}</span>
                <span>dari ${formatCurrency(totalTargetAmount)}</span>
            </div>
        </div>
    `;
    
    // PERBAIKAN: Update total tabungan di summary
    appData.summary.saving = totalActualSavings;
    
    // Update stats cards
    const totalAmountEl = document.getElementById('total-savings-amount');
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalActualSavings);
    
    const monthlySavingsEl = document.getElementById('monthly-savings');
    if (monthlySavingsEl) {
        // Hitung tabungan bulan ini
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthlyTransactions = allTransactions.filter(t => {
            if (t.type !== 'saving') return false;
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });
        
        let monthlySavings = 0;
        monthlyTransactions.forEach(t => {
            monthlySavings += parseFloat(t.amount) || 0;
        });
        
        monthlySavingsEl.textContent = formatCurrency(monthlySavings);
    }
    
    const achievedTargetsEl = document.getElementById('achieved-targets');
    if (achievedTargetsEl) {
        const achieved = appData.savingsTargets.filter(t => (t.current || 0) >= (t.target || 0)).length;
        achievedTargetsEl.textContent = achieved;
    }
    
    // Simpan perubahan ke localStorage
    localStorage.setItem('fintrack_savings_targets', JSON.stringify(appData.savingsTargets));
}

// ===== FUNGSI PENGINGAT =====

function loadReminders() {
    const localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
    appData.reminders = localReminders;
    renderReminders();
    renderRemindersEdit();
    
    if (navigator.onLine) {
        fetch(`${SCRIPT_URL}?action=getReminders`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    appData.reminders = result.data;
                    renderReminders();
                    renderRemindersEdit();
                    localStorage.setItem('fintrack_reminders', JSON.stringify(result.data));
                }
            })
            .catch(error => {
                console.log('Failed to load reminders from cloud:', error);
            });
    }
}

function renderReminders() {
    // Fungsi untuk dashboard jika diperlukan
}

function renderRemindersEdit() {
    const container = document.getElementById('reminders-edit-container');
    if (!container) return;
    
    if (appData.reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <p>Belum ada pengingat rutin</p>
                <p class="empty-hint">Tambahkan pengingat rutin baru di bawah</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    appData.reminders.forEach(reminder => {
        const icon = getReminderCategoryIcon(reminder.category);
        html += `
            <div class="reminder-edit-item" onclick="editReminder(${reminder.id})">
                <div class="reminder-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="reminder-info">
                    <div class="reminder-name">${reminder.name}</div>
                    <div class="reminder-meta">Setiap tgl ${reminder.date} • ${formatCurrency(reminder.amount)}</div>
                </div>
                <div class="reminder-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function saveReminder(e) {
    e.preventDefault();
    
    const id = document.getElementById('reminder-edit-id').value;
    const name = document.getElementById('reminder-edit-name').value;
    const category = document.getElementById('reminder-edit-category').value;
    const amount = document.getElementById('reminder-edit-amount').value;
    const date = document.getElementById('reminder-edit-date').value;
    const duration = document.getElementById('reminder-edit-duration').value;
    const startMonth = document.getElementById('reminder-edit-start-month').value;
    const description = document.getElementById('reminder-edit-description').value;
    
    const reminder = {
        id: id ? parseInt(id) : Date.now(),
        name,
        category,
        amount: parseFloat(amount),
        date: parseInt(date),
        duration: parseInt(duration) || 0,
        startMonth,
        description
    };
    
    let localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
    if (id) {
        const index = localReminders.findIndex(r => r.id === parseInt(id));
        if (index !== -1) localReminders[index] = reminder;
    } else {
        localReminders.push(reminder);
    }
    
    localStorage.setItem('fintrack_reminders', JSON.stringify(localReminders));
    loadReminders();
    cancelEditReminder();
    
    if (navigator.onLine) {
        const action = id ? 'updateReminder' : 'saveReminder';
        fetch(`${SCRIPT_URL}?action=${action}&data=${encodeURIComponent(JSON.stringify(reminder))}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) console.log('Reminder synced to cloud');
            })
            .catch(error => console.log('Failed to sync reminder:', error));
    }
    
    showMessage(id ? 'Pengingat diperbarui!' : 'Pengingat ditambahkan!', 'success');
}

function editReminder(id) {
    const reminder = appData.reminders.find(r => r.id === id);
    if (!reminder) return;
    
    document.getElementById('reminder-edit-id').value = reminder.id;
    document.getElementById('reminder-edit-name').value = reminder.name;
    document.getElementById('reminder-edit-category').value = reminder.category;
    document.getElementById('reminder-edit-amount').value = reminder.amount;
    document.getElementById('reminder-edit-date').value = reminder.date;
    document.getElementById('reminder-edit-duration').value = reminder.duration || 0;
    document.getElementById('reminder-edit-start-month').value = reminder.startMonth || '';
    document.getElementById('reminder-edit-description').value = reminder.description || '';
    
    document.getElementById('btn-delete-reminder').style.display = 'block';
    document.querySelector('.add-reminder-edit h3').textContent = 'Ubah Pengingat';
}

function cancelEditReminder() {
    document.getElementById('reminder-edit-form').reset();
    document.getElementById('reminder-edit-id').value = '';
    document.getElementById('btn-delete-reminder').style.display = 'none';
    document.querySelector('.add-reminder-edit h3').textContent = 'Tambah/Ubah Pengingat';
}

function deleteReminder() {
    const id = document.getElementById('reminder-edit-id').value;
    if (!id) return;
    
    showModal('Hapus Pengingat', 'Apakah Anda yakin ingin menghapus pengingat ini?', () => {
        let localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
        localReminders = localReminders.filter(r => r.id !== parseInt(id));
        localStorage.setItem('fintrack_reminders', JSON.stringify(localReminders));
        
        loadReminders();
        cancelEditReminder();
        
        if (navigator.onLine) {
            fetch(`${SCRIPT_URL}?action=deleteReminder&id=${id}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) console.log('Reminder deleted from cloud');
                })
                .catch(error => console.log('Failed to delete reminder:', error));
        }
        
        showMessage('Pengingat berhasil dihapus!', 'success');
    });
}

// ===== FUNGSI SUMMARY =====

function calculateLocalSummary() {
    console.log('Calculating local summary...');
    const periodEl = document.querySelector('input[name="period"]:checked');
    const period = periodEl ? periodEl.value : 'month';
    
    const allTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    const now = new Date();
    let filteredTransactions = allTransactions;
    
    if (period === 'day') {
        const todayStr = now.toISOString().split('T')[0];
        filteredTransactions = allTransactions.filter(t => {
            const transDate = new Date(t.date).toISOString().split('T')[0];
            return transDate === todayStr;
        });
    } else if (period === 'month') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredTransactions = allTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });
    } else if (period === 'year') {
        const currentYear = now.getFullYear();
        filteredTransactions = allTransactions.filter(t => 
            new Date(t.date).getFullYear() === currentYear
        );
    }
    
    // Hitung untuk periode yang dipilih
    let periodIncome = 0;
    let periodExpense = 0;
    let periodSaving = 0;
    
    filteredTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const type = (t.type || '').toLowerCase();
        if (type === 'income') periodIncome += amount;
        else if (type === 'expense') periodExpense += amount;
        else if (type === 'saving') periodSaving += amount;
    });
    
    // PERBAIKAN: Hitung total tabungan dari SEMUA transaksi (bukan hanya periode tertentu)
    let totalSavings = 0;
    allTransactions.forEach(t => {
        if (t.type === 'saving') {
            totalSavings += parseFloat(t.amount) || 0;
        }
    });
    
    const totalBalance = calculateLocalTotalBalance();
    
    appData.summary = {
        income: periodIncome,
        expense: periodExpense,
        saving: periodSaving, // Ubah kembali untuk mengikuti filter periode di dashboard utama
        balance: totalBalance
    };
    
    console.log('Summary calculated:', appData.summary);
    updateSummaryUI();
}
async function loadSummary() {
    calculateLocalSummary();
    
    if (navigator.onLine) {
        try {
            const periodEl = document.querySelector('input[name="period"]:checked');
            const period = periodEl ? periodEl.value : 'month';
            
            const response = await fetch(`${SCRIPT_URL}?action=getSummary&period=${period}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                appData.summary = result.data;
                updateSummaryUI();
            }
        } catch (error) {
            console.log('Failed to load summary from cloud:', error);
        }
    }
}


function updateSummaryUI() {
    console.log('Updating summary UI:', appData.summary);
    
    const income = parseFloat(appData.summary.income) || 0;
    const expense = parseFloat(appData.summary.expense) || 0;
    const saving = parseFloat(appData.summary.saving) || 0;
    const balance = parseFloat(appData.summary.balance) || 0;
    const totalSavings = parseFloat(appData.summary.totalSavings) || 0;

    const incomeTotalEls = document.querySelectorAll('.income-total');
    incomeTotalEls.forEach(el => el.textContent = formatCurrency(income));
    
    const expenseTotalEls = document.querySelectorAll('.expense-total');
    expenseTotalEls.forEach(el => el.textContent = formatCurrency(expense));
    
    const savingsTotalEls = document.querySelectorAll('.savings-total');
    savingsTotalEls.forEach(el => el.textContent = formatCurrency(saving));
    
    const balanceEls = document.querySelectorAll('.balance');
    balanceEls.forEach(el => el.textContent = formatCurrency(balance));
    
    const totalSavingsAmountEl = document.getElementById('total-savings-amount');
    if (totalSavingsAmountEl) {
        totalSavingsAmountEl.textContent = formatCurrency(totalSavings);
    }
    
    console.log('Summary UI updated.');
}



// ===== SYNC FUNCTIONS =====

function syncFromCloud() {
    if (!navigator.onLine) {
        showMessage('Tidak ada koneksi internet', 'error');
        return;
    }
    
    console.log('Syncing all data from cloud...');
    updateSyncStatus('syncing', 'Menyinkron...');
    
    fetch(`${SCRIPT_URL}?action=getAllData`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(result => {
            console.log('Cloud data received:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                
                if (data.transactions) {
                    appData.transactions = data.transactions;
                }

                if (data.savingsTransactions) {
                    appData.savingsTransactions = data.savingsTransactions;
                }
                
                if (data.savingsTargets) {
                    appData.savingsTargets = data.savingsTargets;
                }

                if (data.reminders) {
                    appData.reminders = data.reminders;
                }
                
                appData.lastSync = new Date();
                updateSyncTimeUI();
                
                refreshAppData();
                updateSyncStatus('success', 'Tersinkron');
            } else {
                updateSyncStatus('success', 'Cloud Kosong');
            }
        })
        .catch(error => {
            console.error('Cloud sync failed:', error);
            updateSyncStatus('error', 'Gagal sinkron');
            showMessage('Gagal sinkron: ' + error.message, 'error');
        });
}



/**
 * Fungsi pembantu untuk memuat ulang semua data dari LocalStorage ke variabel appData dan UI
 */
function refreshAppData() {
    // Fungsi ini dipanggil setelah data cloud berhasil ditarik
    
    calculateLocalSummary();
    
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'month';
    renderTransactions(); 
    
    renderSavingsTargets();
    populateSavingTargetDropdown();
    updateSavingsProgress();
    
    loadReminders();
    updateUI();
}

function calculateLocalSummary() {
    console.log('Calculating summary from cloud data...');
    
    const transactions = appData.transactions || [];
    const savings = appData.savingsTransactions || []; // Ambil dari data tabungan terpisah
    const periodEl = document.querySelector('input[name="period"]:checked');
    const filter = periodEl ? periodEl.value : 'month';
    const today = new Date();
    
    let periodIncome = 0;
    let periodExpense = 0;
    let periodSaving = 0;
    
    // Hitung income & expense dari sheet utama
    transactions.forEach(t => {
        const transDate = new Date(t.Tanggal);
        const amount = parseFloat(t.Jumlah) || 0;
        const type = t.Tipe;
        
        let inPeriod = false;
        if (filter === 'day') {
            inPeriod = transDate.toDateString() === today.toDateString();
        } else if (filter === 'month') {
            inPeriod = transDate.getMonth() === today.getMonth() && transDate.getFullYear() === today.getFullYear();
        } else if (filter === 'year') {
            inPeriod = transDate.getFullYear() === today.getFullYear();
        }
        
        if (inPeriod) {
            if (type === 'Pemasukan') periodIncome += amount;
            else if (type === 'Pengeluaran') periodExpense += amount;
        }
    });

    // Hitung saving dari sheet datatabungan
    savings.forEach(s => {
        const transDate = new Date(s.Tanggal);
        const amount = parseFloat(s.Jumlah) || 0;
        
        let inPeriod = false;
        if (filter === 'day') {
            inPeriod = transDate.toDateString() === today.toDateString();
        } else if (filter === 'month') {
            inPeriod = transDate.getMonth() === today.getMonth() && transDate.getFullYear() === today.getFullYear();
        } else if (filter === 'year') {
            inPeriod = transDate.getFullYear() === today.getFullYear();
        }
        
        if (inPeriod) {
            periodSaving += amount;
        }
    });
    
    // Hitung saldo utama (hanya Pemasukan - Pengeluaran)
    let totalBalance = 0;
    transactions.forEach(t => {
        const amount = parseFloat(t.Jumlah) || 0;
        if (t.Tipe === 'Pemasukan') totalBalance += amount;
        else if (t.Tipe === 'Pengeluaran') totalBalance -= amount;
    });

    // Hitung total tabungan terpisah
    let totalSavingsBalance = 0;
    savings.forEach(s => {
        totalSavingsBalance += parseFloat(s.Jumlah) || 0;
    });
    
    appData.summary = {
        income: periodIncome,
        expense: periodExpense,
        saving: periodSaving,
        balance: totalBalance,
        totalSavings: totalSavingsBalance
    };
    
    updateSummaryUI();
}



function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
        syncStatus.className = 'sync-status ' + status;
        const span = syncStatus.querySelector('span');
        if (span) span.textContent = message;
    }
}

// ===== FUNGSI UTILITAS =====

function loadLocalData() {
    console.log('Loading local data (Reset to zero)...');
    try {
        // Hapus data lokal agar benar-benar mulai dari 0
        localStorage.removeItem('fintrack_transactions');
        localStorage.removeItem('fintrack_savings_targets');
        localStorage.removeItem('fintrack_reminders');
        localStorage.removeItem('fintrack_last_sync');

        appData.transactions = [];
        appData.savingsTargets = [];
        appData.reminders = [];
        appData.summary = {
            income: 0,
            expense: 0,
            saving: 0,
            balance: 0
        };
        
        const lastSyncEl = document.getElementById('last-sync');
        if (lastSyncEl) {
            lastSyncEl.textContent = 'Belum pernah';
        }
    } catch (error) {
        console.error('Error resetting local data:', error);
    }
}

function updateUI() {
    updateSummaryUI();
    updateSyncTimeUI();
}

function updateSyncTimeUI() {
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) {
        if (appData.lastSync) {
            const now = appData.lastSync;
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            lastSyncEl.textContent = `${dateString}, ${timeString}`;
        } else {
            lastSyncEl.textContent = 'Belum pernah';
        }
    }
}

function resetForm() {
    const form = document.getElementById('transaction-form-input');
    if (form) form.reset();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();
    const targetContainer = document.getElementById('saving-target-container');
    if (targetContainer) targetContainer.style.display = 'none';
}

function formatCurrency(amount) {
    return 'Rp ' + parseFloat(amount || 0).toLocaleString('id-ID');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getCategoryIcon(category) {
    const icons = {
        'gaji': 'fa-money-check',
        'investasi': 'fa-chart-line',
        'hibah': 'fa-gift',
        'makanan': 'fa-utensils',
        'transportasi': 'fa-car',
        'belanja': 'fa-shopping-cart',
        'hiburan': 'fa-film',
        'kesehatan': 'fa-heartbeat',
        'pendidikan': 'fa-graduation-cap',
        'tabungan': 'fa-piggy-bank'
    };
    return icons[category] || 'fa-receipt';
}

function getReminderCategoryIcon(category) {
    const icons = {
        'listrik': 'fa-bolt',
        'internet': 'fa-wifi',
        'kredit': 'fa-credit-card',
        'asuransi': 'fa-shield-alt',
        'langganan': 'fa-newspaper',
        'cicilan': 'fa-calendar-check'
    };
    return icons[category] || 'fa-bell';
}

function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function showModal(title, message, confirmCallback) {
    const msgEl = document.getElementById('modal-message');
    if (msgEl) msgEl.innerHTML = `<strong>${title}</strong><br>${message}`;
    const confirmBtn = document.getElementById('modal-confirm');
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            if (confirmCallback) confirmCallback();
            hideModal();
        };
    }
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('show');
}

function hideModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('show');
}

function clearAllData() {
    // Fitur ini dinonaktifkan atas permintaan user
    showMessage('Fitur hapus data dinonaktifkan', 'info');
}

function confirmClearData() {
    // Fitur ini dinonaktifkan atas permintaan user
    showMessage('Fitur hapus data dinonaktifkan', 'info');
}

// ===== FUNGSI TAMBAHAN YANG DIPERLUKAN =====

function getCurrentBalanceFromCloud() {
    if (!navigator.onLine) {
        console.log('Offline, using local balance');
        return calculateLocalTotalBalance();
    }
    
    return fetch(`${SCRIPT_URL}?action=getCurrentBalance`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                return result.balance || 0;
            }
            return 0;
        })
        .catch(error => {
            console.log('Failed to get balance from cloud:', error);
            return calculateLocalTotalBalance();
        });
}

function calculateLocalTotalBalance() {
    const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    
    if (localTransactions.length === 0) return 0;
    
    const latestTransaction = localTransactions.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
    });
    
    if (latestTransaction.balance !== undefined) {
        return parseFloat(latestTransaction.balance) || 0;
    }
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    
    localTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const type = (t.type || '').toLowerCase();
        
        if (type === 'income') totalIncome += amount;
        else if (type === 'expense') totalExpense += amount;
        else if (type === 'saving') totalSaving += amount;
    });
    
    return totalIncome - totalExpense - totalSaving;
}
