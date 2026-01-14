// Konfigurasi
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6Ot3Jh8Kz8eIgtoWj2xVk7N8gwMHxi6TdndXBUbvylqtJmMEQraeBRUkgD9bEJECTvQ/exec'; // Ganti dengan URL deploy Anda

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
    if (dateInput) dateInput.valueAsDate = today;
    
    // Load data dari localStorage
    loadLocalData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Inisialisasi dropdown kategori
    setupCategoryDropdown();
    
    // Load data awal
    loadSummary();
    loadTransactions('month');
    loadSavingsTargets();
    loadReminders();
    
    // Update UI
    updateUI();
    if (navigator.onLine) {
        setTimeout(() => {
            syncFromCloud();
        }, 1000);
    }
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
    
    // Sync buttons
    const syncBtn = document.getElementById('btn-sync-from-cloud');
    if (syncBtn) syncBtn.addEventListener('click', syncFromCloud);

    // Type dropdown untuk kategori
    const transType = document.getElementById('transaction-type');
    if (transType) {
        transType.addEventListener('change', function() {
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
    
    // Simpan nilai yang dipilih
    const currentValue = categorySelect.value;
    
    // Reset dropdown
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    
    // Tambahkan kategori berdasarkan jenis
    if (selectedType === 'income') {
        addCategoryOption('gaji', 'Gaji');
        addCategoryOption('investasi', 'Investasi');
        addCategoryOption('hibah', 'Hibah/Hadiah');
        addCategoryOption('lainnya', 'Lainnya (Pemasukan)');
    } else if (selectedType === 'expense') {
        addCategoryOption('makanan', 'Makanan & Minuman');
        addCategoryOption('transportasi', 'Transportasi');
        addCategoryOption('belanja', 'Belanja');
        addCategoryOption('hiburan', 'Hiburan');
        addCategoryOption('kesehatan', 'Kesehatan');
        addCategoryOption('pendidikan', 'Pendidikan');
        addCategoryOption('lainnya', 'Lainnya (Pengeluaran)');
    } else if (selectedType === 'saving') {
        addCategoryOption('tabungan', 'Tabungan Umum');
    } else {
        // Default show all
        addCategoryOption('gaji', 'Gaji');
        addCategoryOption('investasi', 'Investasi');
        addCategoryOption('hibah', 'Hibah/Hadiah');
        addCategoryOption('makanan', 'Makanan & Minuman');
        addCategoryOption('transportasi', 'Transportasi');
        addCategoryOption('belanja', 'Belanja');
        addCategoryOption('hiburan', 'Hiburan');
        addCategoryOption('kesehatan', 'Kesehatan');
        addCategoryOption('pendidikan', 'Pendidikan');
        addCategoryOption('tabungan', 'Tabungan Umum');
    }
    
    // Setel kembali nilai yang dipilih jika masih ada
    if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
        categorySelect.value = currentValue;
    }
}

function addCategoryOption(value, text) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    categorySelect.appendChild(option);
}

// Fungsi untuk switch tab
function switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Update tab buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        }
    });
    
    // Update tab content
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });

    // Re-render specific tab content if needed
    if (tabId === 'transaction-list') {
        loadTransactions('month');
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
    
    // Validasi
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
    
    // Simpan ke localStorage (offline)
    let localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    const transactionId = Date.now();
    const transactionWithId = {
        id: transactionId,
        ...transaction,
        localId: transactionId
    };
    localTransactions.unshift(transactionWithId);
    localStorage.setItem('fintrack_transactions', JSON.stringify(localTransactions));
    
    // Update data lokal
    appData.transactions.unshift({
        Tanggal: date,
        Tipe: type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Tabungan',
        Kategori: category,
        Jumlah: parseFloat(amount),
        Keterangan: description
    });
    
    // Reset form
    resetForm();
    
    // Update UI
    updateUI();
    loadTransactions();
    loadSummary();
    
    // Sync ke cloud
    if (navigator.onLine) {
        syncTransactionToCloud(transaction);
    } else {
        updateSyncStatus('warning', 'Menunggu sync');
    }
    
    showMessage('Transaksi berhasil disimpan!', 'success');
}

function syncTransactionToCloud(transaction) {
    const url = `${SCRIPT_URL}?action=saveTransaction&data=${encodeURIComponent(JSON.stringify(transaction))}`;
    
    fetch(url)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Transaction synced to cloud');
                updateSyncStatus('success', 'Tersinkron');
            }
        })
        .catch(error => {
            console.log('Transaction sync failed:', error);
            updateSyncStatus('warning', 'Sync gagal');
        });
}

function loadTransactions(filter = 'month') {
    console.log('Loading transactions, filter:', filter);
    
    // Gunakan data lokal dulu untuk response cepat
    const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    
    // Filter berdasarkan periode
    let filteredTransactions = localTransactions;
    const today = new Date();
    
    if (filter === 'day') {
        const todayStr = today.toISOString().split('T')[0];
        filteredTransactions = localTransactions.filter(t => 
            new Date(t.date).toISOString().split('T')[0] === todayStr
        );
    } else if (filter === 'month') {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        filteredTransactions = localTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });
    } else if (filter === 'year') {
        const currentYear = today.getFullYear();
        filteredTransactions = localTransactions.filter(t => 
            new Date(t.date).getFullYear() === currentYear
        );
    }
    
    // Konversi ke format appData
    appData.transactions = filteredTransactions.map(t => ({
        Tanggal: t.date,
        Tipe: t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
        Kategori: t.category,
        Jumlah: parseFloat(t.amount) || 0,
        Keterangan: t.description || ''
    }));
    
    console.log('Transactions loaded:', appData.transactions.length);
    renderTransactions();
    
    // Sync dari cloud jika online (tapi tetap tampilkan data lokal dulu)
    if (navigator.onLine) {
        syncTransactionsFromCloud(filter);
    }
}

function syncTransactionsFromCloud(filter) {
    const today = new Date();
    let startDate, endDate;
    
    if (filter === 'day') {
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
    } else if (filter === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = firstDay.toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate = lastDay.toISOString().split('T')[0];
    } else if (filter === 'year') {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        startDate = firstDay.toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), 11, 31);
        endDate = lastDay.toISOString().split('T')[0];
    }
    
    const url = `${SCRIPT_URL}?action=getTransactions&startDate=${startDate}&endDate=${endDate}`;
    
    fetch(url)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.data) {
                console.log('Cloud data received:', result.data.length);
                
                // Update appData dengan data dari cloud
                appData.transactions = result.data;
                renderTransactions();
                
                // Simpan ke localStorage untuk semua data (tidak hanya filtered)
                const allUrl = `${SCRIPT_URL}?action=getTransactions`;
                return fetch(allUrl);
            }
        })
        .then(response => response && response.json())
        .then(result => {
            if (result && result.success && result.data) {
                // Simpan semua data ke localStorage
                const formatted = result.data.map(t => ({
                    id: Date.now() + Math.random(),
                    date: t.Tanggal,
                    type: t.Tipe === 'Pemasukan' ? 'income' : 
                          t.Tipe === 'Pengeluaran' ? 'expense' : 'saving',
                    category: t.Kategori,
                    amount: t.Jumlah,
                    description: t.Keterangan || ''
                }));
                
                localStorage.setItem('fintrack_transactions', JSON.stringify(formatted));
                console.log('All transactions saved to localStorage');
            }
        })
        .catch(error => {
            console.log('Cloud sync failed:', error);
        });
}

function filterTransactions(filter) {
    loadTransactions(filter);
}

function filterByType(type) {
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
    
    // Sort by date (newest first)
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
    
    // Filter berdasarkan periode
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
    
    // Konversi ke format yang sama dengan cloud
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

// ===== FUNGSI TABUNGAN =====

function loadSavingsTargets() {
    // Load dari localStorage dulu
    const localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
    appData.savingsTargets = localTargets.map(t => ({
        ...t,
        progress: t.target > 0 ? Math.min(Math.round((t.current || 0) / t.target * 100), 100) : 0
    }));
    
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

function loadLocalSavingsTargets() {
    const localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
    appData.savingsTargets = localTargets;
    renderSavingsTargets();
    populateSavingTargetDropdown();
    updateSavingsProgress();
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
    
    // Simpan ke localStorage
    let localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
    localTargets.push(target);
    localStorage.setItem('fintrack_savings_targets', JSON.stringify(localTargets));
    
    // Update data lokal
    appData.savingsTargets.push({
        nama: name,
        target: parseFloat(targetAmount),
        current: 0,
        deadline: deadline,
        color: color,
        progress: 0
    });
    
    // Reset form
    document.getElementById('target-name').value = '';
    document.getElementById('target-amount').value = '';
    document.getElementById('target-deadline').value = '';
    
    // Update UI
    renderSavingsTargets();
    populateSavingTargetDropdown();
    updateSavingsProgress();
    
    // Sync ke cloud
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
    appData.savingsTargets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.id || target.nama || target.name;
        option.textContent = target.nama || target.name;
        dropdown.appendChild(option);
    });
}

function toggleSavingTarget() {
    const type = document.getElementById('transaction-type').value;
    const container = document.getElementById('saving-target-container');
    if (container) {
        container.style.display = type === 'saving' ? 'block' : 'none';
    }
    // Update category when type changes
    updateCategoryOptions(type);
}

function updateSavingsProgress() {
    const container = document.getElementById('progress-container');
    if (!container) return;
    
    if (appData.savingsTargets.length === 0) {
        container.innerHTML = '<p class="progress-info">Tambahkan target tabungan untuk melihat progress</p>';
        return;
    }
    
    // Hitung total progress
    let totalTarget = 0;
    let totalCurrent = 0;
    
    appData.savingsTargets.forEach(t => {
        totalTarget += t.target || 0;
        totalCurrent += t.current || 0;
    });
    
    const totalPercent = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    
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
                <span>${formatCurrency(totalCurrent)}</span>
                <span>dari ${formatCurrency(totalTarget)}</span>
            </div>
        </div>
    `;
    
    // Update stats cards
    const totalAmountEl = document.getElementById('total-savings-amount');
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalCurrent);
    
    const monthlySavingsEl = document.getElementById('monthly-savings');
    if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(appData.summary.saving);
    
    const achievedTargetsEl = document.getElementById('achieved-targets');
    if (achievedTargetsEl) {
        const achieved = appData.savingsTargets.filter(t => (t.current || 0) >= (t.target || 0)).length;
        achievedTargetsEl.textContent = achieved;
    }
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
    // This function might be for a dashboard view if added later
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

// ===== SUMMARY =====
function loadSummary() {
    calculateLocalSummary();
    
    if (navigator.onLine) {
        const periodEl = document.querySelector('input[name="period"]:checked');
        const period = periodEl ? periodEl.value : 'month';
        fetch(`${SCRIPT_URL}?action=getSummary&period=${period}`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    appData.summary = result.data;
                    updateSummaryUI();
                }
            })
            .catch(error => {
                console.log('Failed to load summary from cloud:', error);
            });
    }
}

function calculateLocalSummary() {
    console.log('Calculating local summary...');
    const periodEl = document.querySelector('input[name="period"]:checked');
    const period = periodEl ? periodEl.value : 'month';
    
    // Pastikan kita mengambil data terbaru dari localStorage
    const transactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    
    const now = new Date();
    let filteredTransactions = transactions;
    
    if (period === 'day') {
        const todayStr = now.toISOString().split('T')[0];
        filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.date).toISOString().split('T')[0];
            return transDate === todayStr;
        });
    } else if (period === 'month') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && 
                   transDate.getFullYear() === currentYear;
        });
    } else if (period === 'year') {
        const currentYear = now.getFullYear();
        filteredTransactions = transactions.filter(t => 
            new Date(t.date).getFullYear() === currentYear
        );
    }
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    
    filteredTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        // Normalisasi tipe transaksi karena mapping cloud vs local bisa berbeda
        const type = (t.type || '').toLowerCase();
        if (type === 'income' || t.Tipe === 'Pemasukan') totalIncome += amount;
        else if (type === 'expense' || t.Tipe === 'Pengeluaran') totalExpense += amount;
        else if (type === 'saving' || t.Tipe === 'Tabungan') totalSaving += amount;
    });
    
    appData.summary = {
        income: totalIncome,
        expense: totalExpense,
        saving: totalSaving,
        balance: totalIncome - totalExpense - totalSaving
    };
    
    console.log('Summary calculated:', appData.summary);
    updateSummaryUI();
}

function updateSummaryUI() {
    console.log('Updating summary UI:', appData.summary);
    
    const incomeTotalEls = document.querySelectorAll('.income-total');
    incomeTotalEls.forEach(el => el.textContent = formatCurrency(appData.summary.income));
    
    const expenseTotalEls = document.querySelectorAll('.expense-total');
    expenseTotalEls.forEach(el => el.textContent = formatCurrency(appData.summary.expense));
    
    const savingsTotalEls = document.querySelectorAll('.savings-total');
    savingsTotalEls.forEach(el => el.textContent = formatCurrency(appData.summary.saving));
    
    const balanceEls = document.querySelectorAll('.balance');
    balanceEls.forEach(el => el.textContent = formatCurrency(appData.summary.balance));
    
    // Update juga di tab Tabungan
    const totalSavingsAmountEl = document.getElementById('total-savings-amount');
    if (totalSavingsAmountEl) {
        totalSavingsAmountEl.textContent = formatCurrency(appData.summary.saving);
    }
}

// ===== SYNC FUNCTIONS =====
function syncFromCloud() {
    if (!navigator.onLine) {
        showMessage('Tidak ada koneksi internet', 'error');
        return;
    }
    
    updateSyncStatus('syncing', 'Menyinkron...');
    
    fetch(`${SCRIPT_URL}?action=getAllData`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.data) {
                const data = result.data;
                
                if (data.transactions) {
                    const formattedTransactions = data.transactions.map(t => ({
                        id: t.id || (Date.now() + Math.random()),
                        date: t.Tanggal || t.date,
                        type: t.Tipe === 'Pemasukan' ? 'income' : (t.Tipe === 'Pengeluaran' ? 'expense' : 'saving'),
                        category: t.Kategori,
                        amount: t.Jumlah,
                        description: t.Keterangan || ''
                    }));
                    localStorage.setItem('fintrack_transactions', JSON.stringify(formattedTransactions));
                }
                
                if (data.savingsTargets) localStorage.setItem('fintrack_savings_targets', JSON.stringify(data.savingsTargets));
                if (data.reminders) localStorage.setItem('fintrack_reminders', JSON.stringify(data.reminders));
                
                const now = new Date();
                appData.lastSync = now;
                localStorage.setItem('fintrack_last_sync', now.toISOString());
                
                // Urutan pemanggilan yang benar
                loadLocalData();
                calculateLocalSummary(); 
                loadTransactions('month');
                loadSavingsTargets();
                loadReminders();
                setupCategoryDropdown(); // Pastikan kategori muncul setelah sync
                updateUI();
                
                updateSyncStatus('success', 'Tersinkron');
                showMessage('Data berhasil disinkronkan!', 'success');
            } else {
                updateSyncStatus('error', 'Gagal sync');
                showMessage('Gagal menyinkronkan data: ' + (result.message || 'Data kosong'), 'error');
            }
        })
        .catch(error => {
            updateSyncStatus('error', 'Gagal koneksi');
            showMessage('Gagal terhubung ke server: ' + error.message, 'error');
        });
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
    console.log('Loading local data...');
    try {
        const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
        appData.transactions = localTransactions.map(t => ({
            Tanggal: t.date || new Date().toISOString(),
            Tipe: t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
            Kategori: t.category || 'lainnya',
            Jumlah: parseFloat(t.amount) || 0,
            Keterangan: t.description || ''
        }));
        
        const localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
        appData.savingsTargets = localTargets.map(t => ({
            ...t,
            progress: t.target > 0 ? Math.min(Math.round((t.current || 0) / t.target * 100), 100) : 0
        }));
        
        appData.reminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
        
        const syncTime = localStorage.getItem('fintrack_last_sync');
        if (syncTime) {
            appData.lastSync = new Date(syncTime);
            const lastSyncEl = document.getElementById('last-sync');
            if (lastSyncEl) {
                lastSyncEl.textContent = appData.lastSync.toLocaleDateString('id-ID') + ' ' + appData.lastSync.toLocaleTimeString('id-ID');
            }
        }
    } catch (error) {
        console.error('Error loading local data:', error);
    }
}

function updateUI() {
    updateSummaryUI();
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

function confirmClearData() {
    showModal('Hapus Semua Data', 'Apakah Anda yakin ingin menghapus semua data lokal? Tindakan ini tidak dapat dibatalkan.', clearAllData);
}

function clearAllData() {
    localStorage.clear();
    appData = {
        transactions: [],
        savingsTargets: [],
        reminders: [],
        summary: { income: 0, expense: 0, saving: 0, balance: 0 }
    };
    updateUI();
    loadTransactions();
    loadSavingsTargets();
    loadReminders();
    showMessage('Semua data lokal berhasil dihapus', 'success');
}
