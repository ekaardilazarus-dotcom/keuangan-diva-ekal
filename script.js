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
    document.getElementById('date').valueAsDate = today;
    
    // Load data dari localStorage
    loadLocalData();
    
    // Setup event listeners
    setupEventListeners();
    
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
            loadSummary();
        });
    });
    
    // Form transaksi
    document.getElementById('transaction-form-input').addEventListener('submit', saveTransaction);
    
    // Form target tabungan
    document.getElementById('btn-add-target').addEventListener('click', addSavingsTarget);
    
    // Form reminder
    document.getElementById('reminder-edit-form').addEventListener('submit', saveReminder);
    document.getElementById('btn-cancel-reminder').addEventListener('click', cancelEditReminder);
    document.getElementById('btn-delete-reminder').addEventListener('click', deleteReminder);
    
    // Sync buttons
    document.getElementById('btn-sync-from-cloud').addEventListener('click', syncFromCloud);
    document.getElementById('test-connection').addEventListener('click', testConnection);

    // Type dropdown untuk kategori
    document.getElementById('transaction-type').addEventListener('change', function() {
        updateCategoryOptions(this.value);
        toggleSavingTarget();
    });
    
    // Modal
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
    document.getElementById('clear-data').addEventListener('click', confirmClearData);
    document.getElementById('setup-sheets').addEventListener('click', setupGoogleSheets);
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
    updateCategoryOptions(document.getElementById('transaction-type').value);
}

function updateCategoryOptions(selectedType) {
    const categorySelect = document.getElementById('category');
    
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
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    categorySelect.appendChild(option);
}

// Fungsi untuk switch tab
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });
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

// ===== TABUNGAN =====
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
                    <h4 class="target-name">${target.nama}</h4>
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
    
    // Sync ke cloud jika online
    if (navigator.onLine) {
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'saveSavingsTarget',
                data: JSON.stringify(target)
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Target tabungan tersinkron ke cloud');
            }
        });
    }
    
    showMessage('Target tabungan berhasil ditambahkan!', 'success');
}

function updateSavingsProgress() {
    const totalSavings = appData.savingsTargets.reduce((sum, target) => sum + (parseFloat(target.current) || 0), 0);
    document.getElementById('total-savings-amount').textContent = formatCurrency(totalSavings);
    
    // Update progress container
    const container = document.getElementById('progress-container');
    if (appData.savingsTargets.length === 0) {
        container.innerHTML = '<p class="progress-info">Tambahkan target tabungan untuk melihat progress</p>';
        return;
    }
    
    let html = '';
    appData.savingsTargets.forEach(target => {
        const progress = target.progress || 0;
        html += `
            <div class="progress-item">
                <div class="progress-header">
                    <span class="progress-name">${target.nama}</span>
                    <span class="progress-percentage">${progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%; background-color: ${target.color || '#4361ee'}"></div>
                </div>
                <div class="progress-amounts">
                    <span>${formatCurrency(target.current || 0)} / ${formatCurrency(target.target || 0)}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function populateSavingTargetDropdown() {
    const dropdown = document.getElementById('saving-target');
    dropdown.innerHTML = '<option value="">Pilih Target Tabungan</option>';
    
    appData.savingsTargets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.id || '';
        option.textContent = `${target.nama} (${formatCurrency(target.target || 0)})`;
        dropdown.appendChild(option);
    });
}

// ===== FUNGSI BANTU =====
function toggleSavingTarget() {
    const type = document.getElementById('transaction-type').value;
    const container = document.getElementById('saving-target-container');
    
    if (type === 'saving') {
        container.style.display = 'block';
        populateSavingTargetDropdown();
    } else {
        container.style.display = 'none';
    }
}
// ===== FUNGSI REMINDER =====

function loadReminders() {
    if (navigator.onLine) {
        fetch(`${SCRIPT_URL}?action=getReminders`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    appData.reminders = result.data;
                    renderReminders();
                    renderRemindersEdit();
                    updateRemindersCount();
                } else {
                    loadLocalReminders();
                }
            })
            .catch(() => {
                loadLocalReminders();
            });
    } else {
        loadLocalReminders();
    }
}

function loadLocalReminders() {
    const localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
    appData.reminders = localReminders;
    renderReminders();
    renderRemindersEdit();
    updateRemindersCount();
}

function renderReminders() {
    const container = document.getElementById('reminders-list');
    const upcomingContainer = document.getElementById('upcoming-reminders');
    const reminders = appData.reminders;
    
    if (!reminders || reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-bell"></i>
                <p>Belum ada pengingat</p>
            </div>
        `;
        upcomingContainer.innerHTML = '<p class="no-upcoming">Tidak ada jatuh tempo dekat</p>';
        return;
    }
    
    // Render semua reminder
    let html = '';
    reminders.forEach(reminder => {
        html += `
            <div class="reminder-item ${reminder.isDueSoon ? 'due-soon' : ''}">
                <div class="reminder-icon">
                    <i class="fas ${getReminderCategoryIcon(reminder.kategori)}"></i>
                </div>
                <div class="reminder-details">
                    <div class="reminder-header">
                        <span class="reminder-name">${reminder.nama}</span>
                        <span class="reminder-amount">${formatCurrency(reminder.jumlah)}</span>
                    </div>
                    <div class="reminder-footer">
                        <span class="reminder-date">${reminder.displayDate}</span>
                        ${reminder.remainingMonths < 999 ? `<span class="reminder-duration">(${reminder.currentMonth}/${reminder.duration})</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Render upcoming reminders
    const upcomingReminders = reminders.filter(r => r.isDueSoon);
    if (upcomingReminders.length === 0) {
        upcomingContainer.innerHTML = '<p class="no-upcoming">Tidak ada jatuh tempo dekat</p>';
    } else {
        let upcomingHtml = '';
        upcomingReminders.forEach(reminder => {
            upcomingHtml += `
                <div class="upcoming-item">
                    <div class="upcoming-header">
                        <span class="upcoming-name">${reminder.nama}</span>
                        <span class="upcoming-days">${reminder.daysUntilDue} hari lagi</span>
                    </div>
                    <div class="upcoming-amount">${formatCurrency(reminder.jumlah)}</div>
                </div>
            `;
        });
        upcomingContainer.innerHTML = upcomingHtml;
    }
}

function renderRemindersEdit() {
    const container = document.getElementById('reminders-edit-container');
    const reminders = appData.reminders;
    
    if (!reminders || reminders.length === 0) {
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
    reminders.forEach(reminder => {
        html += `
            <div class="reminder-edit-item" data-id="${reminder.id}">
                <div class="reminder-edit-header">
                    <h4>${reminder.nama}</h4>
                    <button class="btn-edit-reminder" onclick="editReminder(${reminder.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div class="reminder-edit-details">
                    <div class="detail-row">
                        <span class="detail-label">Kategori:</span>
                        <span class="detail-value">${reminder.kategori}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Jumlah:</span>
                        <span class="detail-value">${formatCurrency(reminder.jumlah)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Tanggal:</span>
                        <span class="detail-value">Setiap tanggal ${reminder.tanggal}</span>
                    </div>
                    ${reminder.duration ? `<div class="detail-row">
                        <span class="detail-label">Durasi:</span>
                        <span class="detail-value">${reminder.duration} bulan (${reminder.remainingMonths} bulan tersisa)</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function editReminder(id) {
    const reminder = appData.reminders.find(r => r.id === id);
    if (!reminder) return;
    
    document.getElementById('reminder-edit-id').value = id;
    document.getElementById('reminder-edit-name').value = reminder.nama;
    document.getElementById('reminder-edit-category').value = reminder.kategori;
    document.getElementById('reminder-edit-amount').value = reminder.jumlah;
    document.getElementById('reminder-edit-date').value = reminder.tanggal;
    document.getElementById('reminder-edit-duration').value = reminder.duration || '';
    document.getElementById('reminder-edit-start-month').value = reminder.startMonth || '';
    document.getElementById('reminder-edit-description').value = reminder.keterangan || '';
    
    document.getElementById('btn-delete-reminder').style.display = 'inline-block';
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
    
    if (!name || !category || !amount || !date) {
        showMessage('Harap isi semua field yang wajib', 'error');
        return;
    }
    
    const reminder = {
        id: id || null,
        name: name,
        category: category,
        amount: parseFloat(amount),
        date: parseInt(date),
        duration: duration || 0,
        startMonth: startMonth,
        description: description
    };
    
    // Simpan ke localStorage
    let localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
    
    if (id) {
        // Update existing
        const index = localReminders.findIndex(r => r.id === parseInt(id));
        if (index !== -1) {
            localReminders[index] = {
                ...localReminders[index],
                ...reminder
            };
        }
    } else {
        // Add new
        reminder.id = Date.now();
        localReminders.push(reminder);
    }
    
    localStorage.setItem('fintrack_reminders', JSON.stringify(localReminders));
    
    // Update data lokal
    loadLocalReminders();
    
    // Reset form
    cancelEditReminder();
    
    // Sync ke cloud jika online
    if (navigator.onLine) {
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'saveReminder',
                data: JSON.stringify(reminder)
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Reminder tersinkron ke cloud');
            }
        });
    }
    
    showMessage('Pengingat berhasil disimpan!', 'success');
}

function cancelEditReminder() {
    document.getElementById('reminder-edit-form').reset();
    document.getElementById('reminder-edit-id').value = '';
    document.getElementById('btn-delete-reminder').style.display = 'none';
}

function deleteReminder() {
    const id = document.getElementById('reminder-edit-id').value;
    if (!id) return;
    
    showModal('Hapus Pengingat', 'Apakah Anda yakin ingin menghapus pengingat ini?', () => {
        // Hapus dari localStorage
        let localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
        localReminders = localReminders.filter(r => r.id !== parseInt(id));
        localStorage.setItem('fintrack_reminders', JSON.stringify(localReminders));
        
        // Update data lokal
        loadLocalReminders();
        
        // Reset form
        cancelEditReminder();
        
        // Sync ke cloud jika online
        if (navigator.onLine) {
            fetch(`${SCRIPT_URL}?action=deleteReminder&id=${id}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        console.log('Reminder dihapus dari cloud');
                    }
                });
        }
        
        showMessage('Pengingat berhasil dihapus!', 'success');
    });
}

function updateRemindersCount() {
    document.getElementById('reminders-count').textContent = appData.reminders.length;
}

// ===== SUMMARY =====
function loadSummary() {
    // Hitung dari data lokal
    calculateLocalSummary();
    
    // Sync dari cloud jika online
    if (navigator.onLine) {
        const period = document.querySelector('input[name="period"]:checked').value || 'month';
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

function calculateLocalSummary(period) {
    // Ambil data dari localStorage
    const transactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
    
    // Filter berdasarkan periode
    const now = new Date();
    let filteredTransactions = transactions;
    
    if (period === 'day') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= today;
        });
    } else if (period === 'month') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= firstDayOfMonth;
        });
    } else if (period === 'year') {
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= firstDayOfYear;
        });
    }
    
    // Hitung total
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    
    filteredTransactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'expense') totalExpense += t.amount;
        else if (t.type === 'saving') totalSaving += t.amount;
    });
    
    appData.summary = {
        income: totalIncome,
        expense: totalExpense,
        saving: totalSaving,
        balance: totalIncome - totalExpense - totalSaving
    };
    
    updateSummaryUI();
}

function updateSummaryUI() {
    // Update header summary
    document.querySelector('.income-total').textContent = formatCurrency(appData.summary.income);
    document.querySelector('.expense-total').textContent = formatCurrency(appData.summary.expense);
    document.querySelector('.savings-total').textContent = formatCurrency(appData.summary.saving);
    document.querySelector('.balance').textContent = formatCurrency(appData.summary.balance);
    
    // Update month summary
    document.getElementById('month-income').textContent = formatCurrency(appData.summary.income);
    document.getElementById('month-expense').textContent = formatCurrency(appData.summary.expense);
    document.getElementById('month-saving').textContent = formatCurrency(appData.summary.saving);
    document.getElementById('month-balance').textContent = formatCurrency(appData.summary.balance);
}

// ===== FUNGSI SYNC =====

// ===== SYNC FUNCTIONS =====
function syncFromCloud() {
    if (!navigator.onLine) {
        showMessage('Tidak ada koneksi internet', 'error');
        return;
    }
    
    showMessage('Menyinkronkan data dari cloud...', 'info');
    updateSyncStatus('syncing', 'Menyinkron...');
    
    // Load semua data sekaligus
    fetch(`${SCRIPT_URL}?action=getAllData`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.data) {
                const data = result.data;
                
                // Update appData
                appData.transactions = data.transactions || [];
                appData.savingsTargets = data.savingsTargets || [];
                appData.reminders = data.reminders || [];
                appData.summary = data.summary || appData.summary;
                
                // Simpan ke localStorage
                const formattedTransactions = appData.transactions.map(t => ({
                    id: Date.now() + Math.random(),
                    date: t.Tanggal,
                    type: t.Tipe === 'Pemasukan' ? 'income' : 
                          t.Tipe === 'Pengeluaran' ? 'expense' : 'saving',
                    category: t.Kategori,
                    amount: t.Jumlah,
                    description: t.Keterangan || ''
                }));
                
                localStorage.setItem('fintrack_transactions', JSON.stringify(formattedTransactions));
                localStorage.setItem('fintrack_savings_targets', JSON.stringify(appData.savingsTargets));
                localStorage.setItem('fintrack_reminders', JSON.stringify(appData.reminders));
                localStorage.setItem('fintrack_last_sync', new Date().toISOString());
                
                // Update UI
                updateUI();
                renderTransactions();
                renderSavingsTargets();
                renderReminders();
                updateSummaryUI();
                
                // Update last sync time
                appData.lastSync = new Date();
                document.getElementById('last-sync').textContent = 
                    appData.lastSync.toLocaleDateString('id-ID') + ' ' + 
                    appData.lastSync.toLocaleTimeString('id-ID');
                
                updateSyncStatus('success', 'Tersinkron');
                showMessage('Data berhasil disinkronkan dari cloud!', 'success');
            } else {
                updateSyncStatus('error', 'Gagal sync');
                showMessage('Gagal menyinkronkan data: ' + (result.message || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            updateSyncStatus('error', 'Gagal koneksi');
            showMessage('Gagal terhubung ke server: ' + error.message, 'error');
        });
}


function testConnection() {
    if (!navigator.onLine) {
        showMessage('Tidak ada koneksi internet', 'error');
        return;
    }
    
    showMessage('Menguji koneksi...', 'info');
    
    fetch(`${SCRIPT_URL}?action=testConnection`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showMessage('Koneksi berhasil! Server Apps Script aktif.', 'success');
            } else {
                showMessage('Server merespon tapi dengan error: ' + result.message, 'error');
            }
        })
        .catch(error => {
            showMessage('Gagal terhubung ke server: ' + error.message, 'error');
        });
}

function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('sync-status');
    syncStatus.className = 'sync-status ' + status;
    syncStatus.querySelector('span').textContent = message;
}

// ===== FUNGSI UTILITAS =====

function loadLocalData() {
    console.log('Loading local data...');
    
    try {
        // Transactions
        const localTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
        appData.transactions = localTransactions.map(t => ({
            Tanggal: t.date || new Date().toISOString(),
            Tipe: t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
            Kategori: t.category || 'lainnya',
            Jumlah: parseFloat(t.amount) || 0,
            Keterangan: t.description || ''
        }));
        
        // Savings targets
        const localTargets = JSON.parse(localStorage.getItem('fintrack_savings_targets') || '[]');
        appData.savingsTargets = localTargets.map(t => ({
            ...t,
            progress: t.target > 0 ? Math.min(Math.round((t.current || 0) / t.target * 100), 100) : 0
        }));
        
        // Reminders
        const localReminders = JSON.parse(localStorage.getItem('fintrack_reminders') || '[]');
        appData.reminders = localReminders;
        
        // Last sync
        if (localStorage.getItem('fintrack_last_sync')) {
            appData.lastSync = new Date(localStorage.getItem('fintrack_last_sync'));
            document.getElementById('last-sync').textContent = 
                appData.lastSync.toLocaleDateString('id-ID') + ' ' + 
                appData.lastSync.toLocaleTimeString('id-ID');
        }
        
        console.log('Local data loaded:', {
            transactions: appData.transactions.length,
            targets: appData.savingsTargets.length,
            reminders: appData.reminders.length
        });
    } catch (error) {
        console.error('Error loading local data:', error);
    }
}


function updateUI() {
    updateSummaryUI();
}

function resetForm() {
    document.getElementById('transaction-form-input').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('saving-target-container').style.display = 'none';
}

function formatCurrency(amount) {
    return 'Rp ' + parseFloat(amount).toLocaleString('id-ID');
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
    // Buat toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Tampilkan toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hapus toast setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function showModal(title, message, confirmCallback) {
    document.getElementById('modal-message').innerHTML = `<strong>${title}</strong><br>${message}`;
    document.getElementById('modal-confirm').onclick = function() {
        if (confirmCallback) confirmCallback();
        hideModal();
    };
    document.getElementById('confirm-modal').classList.add('show');
}

function hideModal() {
    document.getElementById('confirm-modal').classList.remove('show');
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

function setupGoogleSheets() {
    showMessage('Menyiapkan Google Sheets...', 'info');
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: new URLSearchParams({
            action: 'setupSpreadsheet'
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showMessage('Google Sheets berhasil disiapkan!', 'success');
        } else {
            showMessage('Gagal menyiapkan Google Sheets: ' + result.message, 'error');
        }
    })
    .catch(error => {
        showMessage('Gagal terhubung ke server: ' + error.message, 'error');
    });
}
