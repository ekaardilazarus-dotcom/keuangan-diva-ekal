// Google Apps Script Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyCAve7_9EH5OPofRMKQ24gQwJmapQQCM3_ENawv2moD6biX_DDDS1DK5FNhMAf4k94kw/exec';

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
    
    // Load data awal
    loadAllData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Filter kategori berdasarkan jenis transaksi
    filterCategoryOptions();
    
    // Update status sinkronisasi
    updateSyncStatus();
    
    // Update durasi pengingat setiap bulan
    updateReminderDurations();
});

// Inisialisasi data di localStorage
function initializeData() {
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('savingTargets')) {
        localStorage.setItem('savingTargets', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('reminders')) {
        // Data pengingat default dengan durasi
        const defaultReminders = [
            { 
                id: 1, 
                name: "Listrik & Air", 
                amount: 750000, 
                date: 5, 
                category: "listrik",
                description: "Pembayaran bulanan listrik dan air",
                duration: 0,
                startMonth: currentMonth,
                currentMonth: 0,
                createdAt: new Date().toISOString(),
                syncStatus: 'local'
            },
            { 
                id: 2, 
                name: "Internet & TV Kabel", 
                amount: 450000, 
                date: 10, 
                category: "internet",
                description: "Paket internet dan TV kabel",
                duration: 0,
                startMonth: currentMonth,
                currentMonth: 0,
                createdAt: new Date().toISOString(),
                syncStatus: 'local'
            },
            { 
                id: 3, 
                name: "Cicilan Mobil", 
                amount: 3500000, 
                date: 15, 
                category: "cicilan",
                description: "Cicilan mobil 36 bulan",
                duration: 36,
                startMonth: "2023-01",
                currentMonth: 10,
                createdAt: new Date().toISOString(),
                syncStatus: 'local'
            },
            { 
                id: 4, 
                name: "Asuransi Kesehatan", 
                amount: 800000, 
                date: 25, 
                category: "asuransi",
                description: "Premi asuransi kesehatan tahunan",
                duration: 12,
                startMonth: "2023-03",
                currentMonth: 7,
                createdAt: new Date().toISOString(),
                syncStatus: 'local'
            }
        ];
        localStorage.setItem('reminders', JSON.stringify(defaultReminders));
    }
    
    if (!localStorage.getItem('lastSync')) {
        localStorage.setItem('lastSync', '');
    }
    
    if (!localStorage.getItem('googleScriptUrl')) {
        localStorage.setItem('googleScriptUrl', GOOGLE_SCRIPT_URL);
    }
}

// Setup semua event listeners
function setupEventListeners() {
    // Event listener untuk form transaksi
    document.getElementById('transaction-form-input').addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction();
    });
    
    // Event listener untuk tab utama
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', function() {
            // Hapus kelas active dari semua tab
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Tambah kelas active ke tab yang diklik
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Jika tab tabungan, muat data tabungan
            if (tabId === 'savings') {
                loadSavingData();
            }
            // Jika tab edit pengingat, muat data pengingat
            else if (tabId === 'reminders-edit') {
                loadRemindersForEdit();
            }
        });
    });
    
    // Event listener untuk filter transaksi
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadTransactions();
        });
    });
    
    // Event listener untuk filter jenis transaksi
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            loadTransactions();
        });
    });
    
    // Event listener untuk filter periode
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', function() {
            loadTransactions();
        });
    });
    
    // Event listener untuk tombol tambah target
    document.getElementById('btn-add-target').addEventListener('click', function() {
        addSavingTarget();
    });
    
    // Event listener untuk form edit pengingat
    document.getElementById('reminder-edit-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveReminder();
    });
    
    // Event listener untuk tombol batal edit pengingat
    document.getElementById('btn-cancel-reminder').addEventListener('click', function() {
        resetReminderForm();
    });
    
    // Event listener untuk tombol hapus pengingat
    document.getElementById('btn-delete-reminder').addEventListener('click', function() {
        deleteReminder();
    });
    
    // Event listener untuk jenis transaksi (untuk filter kategori)
    document.getElementById('transaction-type').addEventListener('change', function() {
        filterCategoryOptions();
    });
    
    // Event listener untuk sinkronisasi ke Google Sheets
    document.getElementById('btn-sync-to-cloud').addEventListener('click', function() {
        syncToGoogleSheets();
    });
    
    // Event listener untuk sinkronisasi dari Google Sheets
    document.getElementById('btn-sync-from-cloud').addEventListener('click', function() {
        syncFromGoogleSheets();
    });
    
    // Event listener untuk tombol hapus semua data
    document.getElementById('clear-data').addEventListener('click', function() {
        showConfirmModal(
            'Apakah Anda yakin ingin menghapus semua data?',
            function() {
                clearAllData();
                document.getElementById('confirm-modal').classList.remove('active');
            }
        );
    });
    
    // Event listener untuk test koneksi Google Apps Script
    document.getElementById('test-connection').addEventListener('click', function() {
        openConnectionModal();
    });
    
    // Event listener untuk modal konfirmasi
    document.getElementById('modal-cancel').addEventListener('click', function() {
        document.getElementById('confirm-modal').classList.remove('active');
    });
    
    // Event listener untuk modal koneksi
    document.getElementById('btn-cancel-script').addEventListener('click', function() {
        document.getElementById('connection-modal').classList.remove('active');
    });
    
    // Event listener untuk simpan URL script
    document.getElementById('btn-save-script').addEventListener('click', function() {
        saveScriptUrl();
    });
    
    // Event listener untuk import modal
    document.getElementById('import-cancel').addEventListener('click', function() {
        document.getElementById('import-modal').classList.remove('active');
    });
    
    // Event listener untuk konfirmasi import
    document.getElementById('import-confirm').addEventListener('click', function() {
        importData();
    });
}

// Muat semua data
function loadAllData() {
    loadTransactions();
    loadReminders();
    loadSavingTargets();
    updateSummary();
    updateComparison();
    updateUpcomingReminders();
}

// Filter kategori berdasarkan jenis transaksi
function filterCategoryOptions() {
    const type = document.getElementById('transaction-type').value;
    const categorySelect = document.getElementById('category');
    const options = categorySelect.querySelectorAll('option');
    
    // Reset semua opsi
    options.forEach(option => {
        option.style.display = 'block';
    });
    
    // Sembunyikan opsi yang tidak sesuai
    if (type === 'income') {
        options.forEach(option => {
            if (!option.classList.contains('income-option') && option.value !== '') {
                option.style.display = 'none';
            }
        });
    } else if (type === 'expense') {
        options.forEach(option => {
            if (!option.classList.contains('expense-option') && option.value !== '') {
                option.style.display = 'none';
            }
        });
    } else if (type === 'saving') {
        options.forEach(option => {
            if (!option.classList.contains('saving-option') && option.value !== '') {
                option.style.display = 'none';
            }
        });
    } else {
        // Jika belum memilih jenis, sembunyikan semua kecuali placeholder
        options.forEach(option => {
            if (option.value !== '') {
                option.style.display = 'none';
            }
        });
    }
    
    // Reset nilai kategori jika tidak sesuai
    const currentValue = categorySelect.value;
    if (currentValue && !categorySelect.querySelector(`option[value="${currentValue}"]`)?.style.display !== 'none') {
        categorySelect.value = '';
    }
}

// Toggle visibility target tabungan
function toggleSavingTarget() {
    const type = document.getElementById('transaction-type').value;
    const container = document.getElementById('saving-target-container');
    
    if (type === 'saving') {
        container.style.display = 'block';
        loadSavingTargetsForSelect();
    } else {
        container.style.display = 'none';
    }
}

// Reset form transaksi
function resetForm() {
    document.getElementById('transaction-form-input').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('saving-target-container').style.display = 'none';
    filterCategoryOptions();
}

// Reset form pengingat
function resetReminderForm() {
    document.getElementById('reminder-edit-form').reset();
    document.getElementById('reminder-edit-id').value = '';
    document.getElementById('reminder-edit-start-month').value = new Date().toISOString().slice(0, 7);
    document.getElementById('btn-delete-reminder').style.display = 'none';
    document.getElementById('btn-save-reminder').innerHTML = '<i class="fas fa-save"></i> Simpan Pengingat';
    
    // Hapus selected class dari semua item
    document.querySelectorAll('.reminder-edit-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Fungsi untuk menambahkan transaksi
function addTransaction() {
    const type = document.getElementById('transaction-type').value;
    const category = document.getElementById('category').value;
    const amount = parseInt(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    const savingTargetId = document.getElementById('saving-target').value;
    
    // Validasi input
    if (!type || !category || !amount || !date) {
        showNotification('Harap isi semua field yang wajib diisi!', 'error');
        return;
    }
    
    // Buat objek transaksi
    const transaction = {
        id: Date.now(),
        type: type,
        category: category,
        amount: amount,
        date: date,
        description: description,
        savingTargetId: savingTargetId ? parseInt(savingTargetId) : null,
        createdAt: new Date().toISOString(),
        syncStatus: 'local'
    };
    
    // Simpan ke localStorage
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Jika transaksi tabungan, update target tabungan
    if (type === 'saving' && savingTargetId) {
        updateSavingTargetProgress(savingTargetId, amount);
    }
    
    // Reset form
    resetForm();
    
    // Perbarui tampilan
    loadAllData();
    
    // Tampilkan notifikasi
    showNotification('Transaksi berhasil ditambahkan!', 'success');
}

// Fungsi untuk memuat transaksi
function loadTransactions() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    
    // Filter berdasarkan jenis transaksi
    const typeFilter = document.querySelector('input[name="type"]:checked').value;
    let filteredTransactions = transactions;
    
    if (typeFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === typeFilter);
    }
    
    // Filter berdasarkan periode waktu
    const periodFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    filteredTransactions = filterTransactionsByPeriod(filteredTransactions, periodFilter);
    
    // Urutkan berdasarkan tanggal (terbaru pertama)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Tampilkan transaksi
    displayTransactions(filteredTransactions);
}

// Filter transaksi berdasarkan periode
function filterTransactionsByPeriod(transactions, period) {
    const now = new Date();
    
    if (period === 'day') {
        const today = now.toISOString().split('T')[0];
        return transactions.filter(t => t.date === today);
    } else if (period === 'month') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        });
    } else if (period === 'year') {
        const currentYear = now.getFullYear();
        return transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getFullYear() === currentYear;
        });
    }
    
    return transactions;
}

// Fungsi untuk menampilkan transaksi
function displayTransactions(transactions) {
    const container = document.getElementById('filtered-transactions');
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada transaksi
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
                <p class="empty-hint">Mulai tambahkan transaksi di tab "Transaksi"</p>
            </div>
        `;
        return;
    }
    
    // Tambahkan setiap transaksi
    transactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.className = `transaction-item ${transaction.type}`;
        
        // Tanda status sinkronisasi
        const syncIcon = transaction.syncStatus === 'synced' ? 
            '<i class="fas fa-cloud" style="color: #2ecc71; font-size: 12px; margin-left: 5px;"></i>' : 
            '<i class="fas fa-laptop" style="color: #f1c40f; font-size: 12px; margin-left: 5px;"></i>';
        
        transactionElement.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-title">
                    <span class="transaction-category">${formatCategory(transaction.category)}${syncIcon}</span>
                    <span class="transaction-date">${formatDate(transaction.date)}</span>
                </div>
                <p class="transaction-description">${transaction.description || '-'}</p>
                ${transaction.savingTargetId ? `<small style="color: #3498db;"><i class="fas fa-bullseye"></i> Untuk target tabungan</small>` : ''}
            </div>
            <div>
                <span class="transaction-amount transaction-${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}Rp ${formatNumber(transaction.amount)}
                </span>
                <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(transactionElement);
    });
}

// Fungsi untuk menghapus transaksi
function deleteTransaction(id) {
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus transaksi ini?',
        function() {
            const transactions = JSON.parse(localStorage.getItem('transactions'));
            const transaction = transactions.find(t => t.id === id);
            const updatedTransactions = transactions.filter(t => t.id !== id);
            localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
            
            // Jika transaksi tabungan, kurangi progress target
            if (transaction.type === 'saving' && transaction.savingTargetId) {
                updateSavingTargetProgress(transaction.savingTargetId, -transaction.amount);
            }
            
            // Perbarui tampilan
            loadAllData();
            
            // Tampilkan notifikasi
            showNotification('Transaksi berhasil dihapus!', 'info');
            document.getElementById('confirm-modal').classList.remove('active');
        }
    );
}

// Fungsi untuk memperbarui ringkasan
function updateSummary() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const now = new Date();
    
    // Filter transaksi bulan ini
    const monthTransactions = filterTransactionsByPeriod(transactions, 'month');
    
    // Hitung total pemasukan, pengeluaran, dan tabungan bulan ini
    const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthSaving = monthTransactions
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthBalance = monthIncome - monthExpense - monthSaving;
    
    // Perbarui elemen HTML
    document.getElementById('month-income').textContent = `Rp ${formatNumber(monthIncome)}`;
    document.getElementById('month-expense').textContent = `Rp ${formatNumber(monthExpense)}`;
    document.getElementById('month-saving').textContent = `Rp ${formatNumber(monthSaving)}`;
    document.getElementById('month-balance').textContent = `Rp ${formatNumber(monthBalance)}`;
}

// Fungsi untuk memperbarui perbandingan di header
function updateComparison() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const savingTargets = JSON.parse(localStorage.getItem('savingTargets'));
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSaving = transactions
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSavingTargets = savingTargets
        .reduce((sum, t) => sum + t.currentAmount, 0);
    
    const balance = totalIncome - totalExpense - totalSaving;
    
    document.querySelector('.income-total').textContent = `Rp ${formatNumber(totalIncome)}`;
    document.querySelector('.expense-total').textContent = `Rp ${formatNumber(totalExpense)}`;
    document.querySelector('.savings-total').textContent = `Rp ${formatNumber(totalSaving)}`;
    document.querySelector('.balance').textContent = `Rp ${formatNumber(balance)}`;
}

// Fungsi untuk menambahkan target tabungan
function addSavingTarget() {
    const name = document.getElementById('target-name').value;
    const amount = parseInt(document.getElementById('target-amount').value);
    const deadline = document.getElementById('target-deadline').value;
    const color = document.getElementById('target-color').value;
    
    // Validasi input
    if (!name || !amount) {
        showNotification('Harap isi nama dan jumlah target!', 'error');
        return;
    }
    
    // Buat objek target
    const target = {
        id: Date.now(),
        name: name,
        targetAmount: amount,
        currentAmount: 0,
        deadline: deadline || null,
        color: color,
        createdAt: new Date().toISOString(),
        syncStatus: 'local'
    };
    
    // Simpan ke localStorage
    const targets = JSON.parse(localStorage.getItem('savingTargets'));
    targets.push(target);
    localStorage.setItem('savingTargets', JSON.stringify(targets));
    
    // Reset form
    document.getElementById('target-name').value = '';
    document.getElementById('target-amount').value = '';
    document.getElementById('target-deadline').value = new Date().toISOString().split('T')[0];
    
    // Perbarui tampilan
    loadSavingData();
    
    // Tampilkan notifikasi
    showNotification('Target tabungan berhasil ditambahkan!', 'success');
}

// Fungsi untuk memuat data tabungan
function loadSavingData() {
    loadSavingTargets();
    updateSavingStats();
    updateTotalSavings();
}

// Fungsi untuk memuat target tabungan
function loadSavingTargets() {
    const targets = JSON.parse(localStorage.getItem('savingTargets'));
    const container = document.getElementById('targets-list');
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada target
    if (targets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <p>Belum ada target tabungan</p>
                <p class="empty-hint">Tambahkan target tabungan Anda di bawah</p>
            </div>
        `;
        return;
    }
    
    // Tambahkan setiap target
    targets.forEach(target => {
        const progress = (target.currentAmount / target.targetAmount) * 100;
        const progressWidth = Math.min(progress, 100);
        
        // Tanda status sinkronisasi
        const syncIcon = target.syncStatus === 'synced' ? 
            '<i class="fas fa-cloud" style="color: #2ecc71; font-size: 10px; margin-left: 5px;"></i>' : 
            '<i class="fas fa-laptop" style="color: #f1c40f; font-size: 10px; margin-left: 5px;"></i>';
        
        const targetElement = document.createElement('div');
        targetElement.className = 'target-item';
        targetElement.style.borderLeftColor = target.color;
        targetElement.innerHTML = `
            <button class="delete-target-btn" onclick="deleteSavingTarget(${target.id})">
                <i class="fas fa-times"></i>
            </button>
            <div class="target-header">
                <div class="target-name">
                    <span class="target-color" style="background-color: ${target.color};"></span>
                    ${target.name}${syncIcon}
                </div>
                <div class="target-amount">Rp ${formatNumber(target.currentAmount)} / Rp ${formatNumber(target.targetAmount)}</div>
            </div>
            <div class="target-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressWidth}%; background-color: ${target.color};"></div>
                </div>
                <div class="progress-info">
                    <span>${progressWidth.toFixed(1)}%</span>
                    <span>${target.deadline ? formatDate(target.deadline) : 'Tanpa deadline'}</span>
                </div>
            </div>
        `;
        container.appendChild(targetElement);
    });
    
    // Muat juga untuk select di form transaksi
    loadSavingTargetsForSelect();
}

// Fungsi untuk memuat target tabungan ke select
function loadSavingTargetsForSelect() {
    const targets = JSON.parse(localStorage.getItem('savingTargets'));
    const select = document.getElementById('saving-target');
    
    // Kosongkan select (kecuali opsi pertama)
    select.innerHTML = '<option value="">Pilih Target Tabungan</option>';
    
    // Tambahkan setiap target
    targets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.id;
        option.textContent = `${target.name} (Rp ${formatNumber(target.targetAmount)})`;
        select.appendChild(option);
    });
}

// Update progress target tabungan
function updateSavingTargetProgress(targetId, amount) {
    const targets = JSON.parse(localStorage.getItem('savingTargets'));
    const targetIndex = targets.findIndex(t => t.id === parseInt(targetId));
    
    if (targetIndex !== -1) {
        targets[targetIndex].currentAmount += amount;
        localStorage.setItem('savingTargets', JSON.stringify(targets));
        loadSavingTargets();
    }
}

// Fungsi untuk menghapus target tabungan
function deleteSavingTarget(id) {
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus target tabungan ini?',
        function() {
            const targets = JSON.parse(localStorage.getItem('savingTargets'));
            const updatedTargets = targets.filter(t => t.id !== id);
            localStorage.setItem('savingTargets', JSON.stringify(updatedTargets));
            
            // Perbarui tampilan
            loadSavingData();
            
            // Tampilkan notifikasi
            showNotification('Target tabungan berhasil dihapus!', 'info');
            document.getElementById('confirm-modal').classList.remove('active');
        }
    );
}

// Update statistik tabungan
function updateSavingStats() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const targets = JSON.parse(localStorage.getItem('savingTargets'));
    const now = new Date();
    
    // Tabungan bulan ini
    const monthSaving = filterTransactionsByPeriod(transactions, 'month')
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Target yang tercapai
    const achievedTargets = targets.filter(t => t.currentAmount >= t.targetAmount).length;
    
    // Rata-rata tabungan per bulan
    const allSavings = transactions.filter(t => t.type === 'saving');
    if (allSavings.length > 0) {
        const firstSaving = new Date(Math.min(...allSavings.map(t => new Date(t.date))));
        const monthsDiff = (now.getFullYear() - firstSaving.getFullYear()) * 12 + 
                          (now.getMonth() - firstSaving.getMonth()) + 1;
        const avgSavings = allSavings.reduce((sum, t) => sum + t.amount, 0) / Math.max(monthsDiff, 1);
        document.getElementById('avg-savings').textContent = `Rp ${formatNumber(Math.round(avgSavings))}`;
    } else {
        document.getElementById('avg-savings').textContent = 'Rp 0';
    }
    
    document.getElementById('monthly-savings').textContent = `Rp ${formatNumber(monthSaving)}`;
    document.getElementById('achieved-targets').textContent = `${achievedTargets} dari ${targets.length}`;
    
    // Update progress container
    updateProgressContainer(targets);
}

// Update container progress
function updateProgressContainer(targets) {
    const container = document.getElementById('progress-container');
    
    if (targets.length === 0) {
        container.innerHTML = '<p class="progress-info">Tambahkan target tabungan untuk melihat progress</p>';
        return;
    }
    
    let html = '';
    targets.forEach(target => {
        const progress = (target.currentAmount / target.targetAmount) * 100;
        html += `
            <div class="target-progress-item" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${target.name}</span>
                    <span style="font-weight: bold;">${progress.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(progress, 100)}%; background-color: ${target.color};"></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update total tabungan
function updateTotalSavings() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    
    const totalSaving = transactions
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('total-savings-amount').textContent = `Rp ${formatNumber(totalSaving)}`;
}

// Fungsi untuk memuat pengingat (sidebar kanan)
function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const container = document.getElementById('reminders-list');
    const countElement = document.getElementById('reminders-count');
    
    // Update count
    countElement.textContent = reminders.length;
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada pengingat
    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-bell"></i>
                <p>Belum ada pengingat</p>
            </div>
        `;
        return;
    }
    
    // Tambahkan setiap pengingat
    reminders.forEach(reminder => {
        const reminderElement = document.createElement('div');
        reminderElement.className = 'reminder-item';
        
        // Hitung sisa bulan untuk pengingat dengan durasi
        let durationInfo = '';
        if (reminder.duration > 0) {
            const remainingMonths = reminder.duration - reminder.currentMonth;
            durationInfo = `<div class="reminder-duration-info">
                <span>Bulan ke-${reminder.currentMonth + 1} dari ${reminder.duration}</span>
                <span>Sisa: ${remainingMonths} bulan</span>
            </div>`;
        }
        
        reminderElement.innerHTML = `
            <div class="reminder-header">
                <div class="reminder-name">${reminder.name}</div>
                <div class="reminder-date">Tgl ${reminder.date} setiap bulan</div>
            </div>
            <div class="reminder-amount">Rp ${formatNumber(reminder.amount)}</div>
            <div style="font-size: 12px; color: #b3b3b3; margin-top: 5px;">
                ${formatCategory(reminder.category)}
            </div>
            ${durationInfo}
        `;
        container.appendChild(reminderElement);
    });
}

// Fungsi untuk memuat pengingat untuk diedit (tab 4)
function loadRemindersForEdit() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const container = document.getElementById('reminders-edit-container');
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada pengingat
    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <p>Belum ada pengingat rutin</p>
                <p class="empty-hint">Tambahkan pengingat rutin baru di bawah</p>
            </div>
        `;
        return;
    }
    
    // Tambahkan setiap pengingat
    reminders.forEach(reminder => {
        const reminderElement = document.createElement('div');
        reminderElement.className = 'reminder-edit-item';
        reminderElement.dataset.id = reminder.id;
        
        // Hitung sisa bulan untuk pengingat dengan durasi
        let durationInfo = '';
        if (reminder.duration > 0) {
            const remainingMonths = reminder.duration - reminder.currentMonth;
            durationInfo = `<div class="reminder-duration-info">
                <span class="reminder-duration">${remainingMonths} bulan lagi</span>
                <span>Bulan ke-${reminder.currentMonth + 1}</span>
            </div>`;
        } else {
            durationInfo = '<div class="reminder-duration-info"><span>Tidak terbatas</span></div>';
        }
        
        reminderElement.innerHTML = `
            <div class="reminder-edit-header">
                <div class="reminder-edit-name">${reminder.name}</div>
                <div class="reminder-edit-amount">Rp ${formatNumber(reminder.amount)}</div>
            </div>
            <div class="reminder-edit-details">
                <span>Tgl ${reminder.date} • ${formatCategory(reminder.category)}</span>
                <span>${reminder.startMonth || 'Tidak ada'}</span>
            </div>
            ${durationInfo}
            ${reminder.description ? `<div class="reminder-edit-description">${reminder.description}</div>` : ''}
        `;
        
        // Event listener untuk memilih pengingat
        reminderElement.addEventListener('click', function() {
            selectReminderForEdit(reminder.id);
        });
        
        container.appendChild(reminderElement);
    });
}

// Fungsi untuk memilih pengingat untuk diedit
function selectReminderForEdit(id) {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const reminder = reminders.find(r => r.id === id);
    
    if (!reminder) return;
    
    // Set form dengan data pengingat
    document.getElementById('reminder-edit-id').value = reminder.id;
    document.getElementById('reminder-edit-name').value = reminder.name;
    document.getElementById('reminder-edit-category').value = reminder.category;
    document.getElementById('reminder-edit-amount').value = reminder.amount;
    document.getElementById('reminder-edit-date').value = reminder.date;
    document.getElementById('reminder-edit-duration').value = reminder.duration || '';
    document.getElementById('reminder-edit-start-month').value = reminder.startMonth || '';
    document.getElementById('reminder-edit-description').value = reminder.description || '';
    
    // Tampilkan tombol hapus
    document.getElementById('btn-delete-reminder').style.display = 'block';
    document.getElementById('btn-save-reminder').innerHTML = '<i class="fas fa-save"></i> Update Pengingat';
    
    // Hapus selected class dari semua item, tambahkan ke yang dipilih
    document.querySelectorAll('.reminder-edit-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.id) === id) {
            item.classList.add('selected');
        }
    });
}

// Fungsi untuk menyimpan pengingat (tambah/update)
function saveReminder() {
    const id = document.getElementById('reminder-edit-id').value;
    const name = document.getElementById('reminder-edit-name').value;
    const category = document.getElementById('reminder-edit-category').value;
    const amount = parseInt(document.getElementById('reminder-edit-amount').value);
    const date = parseInt(document.getElementById('reminder-edit-date').value);
    const duration = parseInt(document.getElementById('reminder-edit-duration').value) || 0;
    const startMonth = document.getElementById('reminder-edit-start-month').value;
    const description = document.getElementById('reminder-edit-description').value;
    
    // Validasi input
    if (!name || !category || !amount || !date) {
        showNotification('Harap isi semua field yang wajib diisi!', 'error');
        return;
    }
    
    if (date < 1 || date > 31) {
        showNotification('Tanggal harus antara 1 dan 31!', 'error');
        return;
    }
    
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    
    if (id) {
        // Update pengingat yang ada
        const reminderIndex = reminders.findIndex(r => r.id === parseInt(id));
        if (reminderIndex !== -1) {
            reminders[reminderIndex] = {
                ...reminders[reminderIndex],
                name,
                category,
                amount,
                date,
                duration,
                startMonth,
                description,
                syncStatus: 'local'
            };
        }
    } else {
        // Tambah pengingat baru
        const newReminder = {
            id: Date.now(),
            name,
            category,
            amount,
            date,
            duration,
            startMonth,
            description,
            currentMonth: 0,
            createdAt: new Date().toISOString(),
            syncStatus: 'local'
        };
        reminders.push(newReminder);
    }
    
    localStorage.setItem('reminders', JSON.stringify(reminders));
    
    // Reset form
    resetReminderForm();
    
    // Perbarui tampilan
    loadReminders();
    loadRemindersForEdit();
    updateUpcomingReminders();
    
    // Tampilkan notifikasi
    showNotification(`Pengingat ${id ? 'diperbarui' : 'ditambahkan'}!`, 'success');
}

// Fungsi untuk menghapus pengingat
function deleteReminder() {
    const id = document.getElementById('reminder-edit-id').value;
    
    if (!id) return;
    
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus pengingat ini?',
        function() {
            const reminders = JSON.parse(localStorage.getItem('reminders'));
            const updatedReminders = reminders.filter(r => r.id !== parseInt(id));
            localStorage.setItem('reminders', JSON.stringify(updatedReminders));
            
            // Reset form
            resetReminderForm();
            
            // Perbarui tampilan
            loadReminders();
            loadRemindersForEdit();
            updateUpcomingReminders();
            
            // Tampilkan notifikasi
            showNotification('Pengingat berhasil dihapus!', 'info');
            document.getElementById('confirm-modal').classList.remove('active');
        }
    );
}

// Update durasi pengingat (dipanggil setiap bulan)
function updateReminderDurations() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    let updated = false;
    reminders.forEach(reminder => {
        if (reminder.duration > 0 && reminder.startMonth && reminder.currentMonth < reminder.duration) {
            // Hitung bulan yang telah berlalu
            const startDate = new Date(reminder.startMonth + '-01');
            const currentDate = new Date(currentMonth + '-01');
            const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (currentDate.getMonth() - startDate.getMonth());
            
            if (monthsDiff > reminder.currentMonth) {
                reminder.currentMonth = Math.min(monthsDiff, reminder.duration);
                updated = true;
            }
        }
    });
    
    if (updated) {
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        loadRemindersForEdit();
    }
}

// Update pengingat yang akan datang
function updateUpcomingReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const container = document.getElementById('upcoming-reminders');
    const today = new Date();
    const currentDay = today.getDate();
    
    // Filter pengingat yang jatuh tempo dalam 7 hari ke depan
    const upcomingReminders = reminders.filter(reminder => {
        const daysUntilDue = reminder.date - currentDay;
        return daysUntilDue >= 0 && daysUntilDue <= 7;
    });
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada pengingat yang akan datang
    if (upcomingReminders.length === 0) {
        container.innerHTML = '<p class="no-upcoming">Tidak ada jatuh tempo dekat</p>';
        return;
    }
    
    // Tambahkan setiap pengingat yang akan datang
    upcomingReminders.sort((a, b) => a.date - b.date).forEach(reminder => {
        const daysUntilDue = reminder.date - currentDay;
        const dueText = daysUntilDue === 0 ? 'Hari ini' : 
                       daysUntilDue === 1 ? 'Besok' : 
                       `${daysUntilDue} hari lagi`;
        
        const reminderElement = document.createElement('div');
        reminderElement.className = 'upcoming-item';
        reminderElement.innerHTML = `
            <div class="reminder-header">
                <div class="reminder-name">${reminder.name}</div>
                <div class="reminder-date">${dueText}</div>
            </div>
            <div class="reminder-amount">Rp ${formatNumber(reminder.amount)}</div>
        `;
        container.appendChild(reminderElement);
    });
}

// ============ GOOGLE SHEETS SYNC FUNCTIONS ============

// Fungsi untuk sinkronisasi ke Google Sheets
async function syncToGoogleSheets() {
    const scriptUrl = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        showNotification('URL Google Apps Script belum diatur!', 'error');
        openConnectionModal();
        return;
    }
    
    try {
        updateSyncStatus('syncing');
        
        const data = {
            transactions: JSON.parse(localStorage.getItem('transactions')),
            savingTargets: JSON.parse(localStorage.getItem('savingTargets')),
            reminders: JSON.parse(localStorage.getItem('reminders')),
            timestamp: new Date().toISOString()
        };
        
        // Gunakan mode 'no-cors' untuk menghindari CORS error
        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // Mode no-cors untuk menghindari CORS
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=saveData&data=${encodeURIComponent(JSON.stringify(data))}`
        });
        
        // Karena no-cors, response tidak bisa dibaca
        // Tapi request akan tetap dikirim
        updateSyncStatus('synced');
        showNotification('Data berhasil dikirim ke Google Sheets!', 'success');
        
        // Simpan timestamp
        const now = new Date();
        localStorage.setItem('lastSync', now.toISOString());
        document.getElementById('last-sync').textContent = formatDate(now.toISOString());
        
        // Update status di data lokal
        updateLocalDataSyncStatus();
        
    } catch (error) {
        updateSyncStatus('error');
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Fungsi untuk sinkronisasi dari Google Sheets
async function syncFromGoogleSheets() {
    const scriptUrl = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        showNotification('URL Google Apps Script belum diatur!', 'error');
        openConnectionModal();
        return;
    }
    
    try {
        updateSyncStatus('syncing');
        
        // Gunakan GET request untuk load data
        const response = await fetch(`${scriptUrl}?action=loadData&_=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Simpan data dari Google Sheets
            localStorage.setItem('transactions', JSON.stringify(result.data.transactions || []));
            localStorage.setItem('savingTargets', JSON.stringify(result.data.savingTargets || []));
            localStorage.setItem('reminders', JSON.stringify(result.data.reminders || []));
            
            // Simpan timestamp
            localStorage.setItem('lastSync', new Date().toISOString());
            document.getElementById('last-sync').textContent = formatDate(new Date().toISOString());
            
            // Perbarui tampilan
            loadAllData();
            
            updateSyncStatus('synced');
            showNotification('Data berhasil diambil dari Google Sheets!', 'success');
        } else {
            throw new Error(result.error || 'Tidak ada data di Google Sheets');
        }
    } catch (error) {
        updateSyncStatus('error');
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Test koneksi ke Google Apps Script
async function testGoogleScriptConnection() {
    const scriptUrl = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        showNotification('URL Google Apps Script belum diatur!', 'error');
        return false;
    }
    
    try {
        updateSyncStatus('syncing');
        
        // Tambah timestamp untuk menghindari cache
        const response = await fetch(`${scriptUrl}?action=test&_=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            updateSyncStatus('synced');
            showNotification('Koneksi Google Apps Script berhasil!', 'success');
            return true;
        } else {
            throw new Error(result.error || 'Script mengembalikan error');
        }
    } catch (error) {
        updateSyncStatus('error');
        showNotification(`Error koneksi: ${error.message}`, 'error');
        return false;
    }
}

// Fungsi sync menggunakan XMLHttpRequest (lebih kompatibel)
function syncToGoogleSheetsXHR() {
    const scriptUrl = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        showNotification('URL Google Apps Script belum diatur!', 'error');
        openConnectionModal();
        return;
    }
    
    updateSyncStatus('syncing');
    
    const data = {
        transactions: JSON.parse(localStorage.getItem('transactions')),
        savingTargets: JSON.parse(localStorage.getItem('savingTargets')),
        reminders: JSON.parse(localStorage.getItem('reminders')),
        timestamp: new Date().toISOString()
    };
    
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('action', 'saveData');
    formData.append('data', JSON.stringify(data));
    
    xhr.open('POST', scriptUrl, true);
    
    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) {
            try {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                    updateSyncStatus('synced');
                    showNotification('Data berhasil disimpan ke Google Sheets!', 'success');
                    
                    // Simpan timestamp
                    const now = new Date();
                    localStorage.setItem('lastSync', now.toISOString());
                    document.getElementById('last-sync').textContent = formatDate(now.toISOString());
                    
                    // Update status di data lokal
                    updateLocalDataSyncStatus();
                } else {
                    throw new Error(result.error || 'Gagal menyimpan');
                }
            } catch (error) {
                updateSyncStatus('error');
                showNotification(`Error: ${error.message}`, 'error');
            }
        } else {
            updateSyncStatus('error');
            showNotification(`HTTP Error: ${xhr.status}`, 'error');
        }
    };
    
    xhr.onerror = function() {
        updateSyncStatus('error');
        showNotification('Gagal terhubung ke server', 'error');
    };
    
    xhr.send(formData);
}

// Update event listener untuk menggunakan XHR
document.getElementById('btn-sync-to-cloud').addEventListener('click', syncToGoogleSheetsXHR);

// Test koneksi ke Google Apps Script
async function testGoogleScriptConnection() {
    const scriptUrl = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        showNotification('URL Google Apps Script belum diatur!', 'error');
        return;
    }
    
    try {
        updateSyncStatus('syncing');
        const response = await fetch(`${scriptUrl}?action=test`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            updateSyncStatus('synced');
            showNotification('Koneksi Google Apps Script berhasil!', 'success');
            return true;
        } else {
            throw new Error(result.error || 'Script mengembalikan error');
        }
    } catch (error) {
        updateSyncStatus('error');
        showNotification(`Error: ${error.message}`, 'error');
        return false;
    }
}

// Update status sinkronisasi di data lokal
function updateLocalDataSyncStatus() {
    // Update transactions
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    transactions.forEach(t => t.syncStatus = 'synced');
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Update saving targets
    const savingTargets = JSON.parse(localStorage.getItem('savingTargets'));
    savingTargets.forEach(t => t.syncStatus = 'synced');
    localStorage.setItem('savingTargets', JSON.stringify(savingTargets));
    
    // Update reminders
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    reminders.forEach(r => r.syncStatus = 'synced');
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

// Update status sinkronisasi di UI
function updateSyncStatus(status = '') {
    const syncElement = document.getElementById('sync-status');
    const lastSync = localStorage.getItem('lastSync');
    
    if (lastSync) {
        document.getElementById('last-sync').textContent = formatDate(lastSync);
    } else {
        document.getElementById('last-sync').textContent = 'Belum pernah';
    }
    
    syncElement.className = 'sync-status';
    if (status === 'syncing') {
        syncElement.classList.add('syncing');
        syncElement.innerHTML = '<i class="fas fa-sync-alt"></i><span>Menyinkronkan...</span>';
    } else if (status === 'synced') {
        syncElement.classList.add('synced');
        syncElement.innerHTML = '<i class="fas fa-cloud"></i><span>Tersinkron</span>';
    } else if (status === 'error') {
        syncElement.classList.add('error');
        syncElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Error</span>';
    } else {
        syncElement.innerHTML = '<i class="fas fa-laptop"></i><span>Lokal</span>';
    }
}

// Buka modal koneksi Google Apps Script
function openConnectionModal() {
    document.getElementById('script-url').value = localStorage.getItem('googleScriptUrl') || GOOGLE_SCRIPT_URL;
    document.getElementById('api-key').value = localStorage.getItem('googleScriptApiKey') || '';
    document.getElementById('connection-test-result').innerHTML = '';
    document.getElementById('connection-modal').classList.add('active');
}

// Simpan URL Google Apps Script
function saveScriptUrl() {
    const url = document.getElementById('script-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!url) {
        showNotification('URL Google Apps Script harus diisi!', 'error');
        return;
    }
    
    // Validasi URL
    if (!url.startsWith('https://script.google.com/')) {
        showNotification('URL harus dari Google Apps Script!', 'error');
        return;
    }
    
    localStorage.setItem('googleScriptUrl', url);
    localStorage.setItem('googleScriptApiKey', apiKey);
    
    // Test koneksi
    testConnectionAndCloseModal();
}

// Test koneksi dan tutup modal
async function testConnectionAndCloseModal() {
    const testResult = document.getElementById('connection-test-result');
    testResult.innerHTML = '<div>Menguji koneksi...</div>';
    
    const success = await testGoogleScriptConnection();
    
    if (success) {
        testResult.innerHTML = '<div class="success">Koneksi berhasil! Script siap digunakan.</div>';
        
        // Tutup modal setelah 2 detik
        setTimeout(() => {
            document.getElementById('connection-modal').classList.remove('active');
        }, 2000);
    } else {
        testResult.innerHTML = '<div class="error">Gagal terhubung ke script.</div>';
    }
}

// Fungsi untuk menghapus semua data
function clearAllData() {
    localStorage.clear();
    initializeData();
    loadAllData();
    updateSyncStatus();
    showNotification('Semua data berhasil dihapus!', 'info');
}

// Fungsi untuk menampilkan modal konfirmasi
function showConfirmModal(message, confirmCallback) {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('confirm-modal').classList.add('active');
    
    // Hapus event listener sebelumnya
    const confirmBtn = document.getElementById('modal-confirm');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Tambah event listener baru
    newConfirmBtn.addEventListener('click', confirmCallback);
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type) {
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e50914' : type === 'info' ? '#3498db' : '#f1c40f'};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    // Tambahkan style untuk animasi
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Tambahkan ke body
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Fungsi untuk memformat angka
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk memformat tanggal
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('id-ID', options);
    } catch {
        return dateString;
    }
}

// Fungsi untuk memformat kategori
function formatCategory(category) {
    const categoryNames = {
        'gaji': 'Gaji',
        'investasi': 'Investasi',
        'hibah': 'Hibah/Hadiah',
        'makanan': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'belanja': 'Belanja',
        'hiburan': 'Hiburan',
        'kesehatan': 'Kesehatan',
        'pendidikan': 'Pendidikan',
        'lainnya': 'Lainnya',
        'tabungan': 'Tabungan Umum',
        'listrik': 'Listrik & Air',
        'internet': 'Internet & TV',
        'kredit': 'Kredit/Kontrakan',
        'asuransi': 'Asuransi',
        'langganan': 'Langganan',
        'cicilan': 'Cicilan'
    };
    
    return categoryNames[category] || category;
}
