// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('target-deadline').value = today;
    
    // Inisialisasi data jika belum ada
    initializeData();
    
    // Load data awal
    loadAllData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Filter kategori berdasarkan jenis transaksi
    filterCategoryOptions();
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
        // Data pengingat default
        const defaultReminders = [
            { id: 1, name: "Listrik & Air", amount: 750000, date: 5, category: "listrik" },
            { id: 2, name: "Internet & TV Kabel", amount: 450000, date: 10, category: "internet" },
            { id: 3, name: "Kredit Mobil", amount: 3500000, date: 15, category: "kredit" },
            { id: 4, name: "Asuransi Kesehatan", amount: 800000, date: 25, category: "asuransi" }
        ];
        localStorage.setItem('reminders', JSON.stringify(defaultReminders));
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
    document.querySelector('.btn-add-target').addEventListener('click', function() {
        addSavingTarget();
    });
    
    // Event listener untuk form pengingat
    document.querySelector('.btn-add-reminder').addEventListener('click', function() {
        addReminder();
    });
    
    // Event listener untuk tombol tambah pengingat kecil
    document.getElementById('show-reminder-form').addEventListener('click', function() {
        document.getElementById('reminder-form').style.display = 'block';
    });
    
    // Event listener untuk tombol batal pengingat
    document.getElementById('cancel-reminder').addEventListener('click', function() {
        document.getElementById('reminder-form').style.display = 'none';
    });
    
    // Event listener untuk jenis transaksi (untuk filter kategori)
    document.getElementById('transaction-type').addEventListener('change', function() {
        filterCategoryOptions();
    });
    
    // Event listener untuk tombol ekspor data
    document.getElementById('export-data').addEventListener('click', function() {
        exportData();
    });
    
    // Event listener untuk tombol impor data
    document.getElementById('import-data').addEventListener('click', function() {
        document.getElementById('import-modal').classList.add('active');
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
    
    // Event listener untuk modal konfirmasi
    document.getElementById('modal-cancel').addEventListener('click', function() {
        document.getElementById('confirm-modal').classList.remove('active');
    });
    
    // Event listener untuk modal impor
    document.getElementById('import-cancel').addEventListener('click', function() {
        document.getElementById('import-modal').classList.remove('active');
    });
    
    // Event listener untuk konfirmasi impor
    document.getElementById('import-confirm').addEventListener('click', function() {
        importData();
    });
    
    // Event listener untuk file input impor
    document.getElementById('import-file').addEventListener('change', function() {
        if (this.files.length > 0) {
            document.getElementById('import-confirm').disabled = false;
        }
    });
}

// Muat semua data
function loadAllData() {
    loadTransactions();
    loadReminders();
    loadSavingTargets();
    updateSummary();
    updateComparison();
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

// Reset form
function resetForm() {
    document.getElementById('transaction-form-input').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('saving-target-container').style.display = 'none';
    filterCategoryOptions();
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
        createdAt: new Date().toISOString()
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
                <p class="empty-hint">Mulai tambahkan transaksi di tab "Tambah Transaksi"</p>
            </div>
        `;
        return;
    }
    
    // Tambahkan setiap transaksi
    transactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.className = `transaction-item ${transaction.type}`;
        transactionElement.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-title">
                    <span class="transaction-category">${formatCategory(transaction.category)}</span>
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
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSaving = transactions
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);
    
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
        createdAt: new Date().toISOString()
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
                    ${target.name}
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

// Fungsi untuk memuat pengingat
function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const container = document.getElementById('reminders-list');
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Tambahkan setiap pengingat
    reminders.forEach(reminder => {
        const reminderElement = document.createElement('div');
        reminderElement.className = 'reminder-item';
        reminderElement.innerHTML = `
            <button class="delete-reminder-btn" onclick="deleteReminder(${reminder.id})">
                <i class="fas fa-times"></i>
            </button>
            <div class="reminder-header">
                <div class="reminder-name">${reminder.name}</div>
                <div class="reminder-date">Tgl ${reminder.date} setiap bulan</div>
            </div>
            <div class="reminder-amount">Rp ${formatNumber(reminder.amount)}</div>
            <div style="font-size: 12px; color: #b3b3b3; margin-top: 5px;">
                ${formatCategory(reminder.category)}
            </div>
        `;
        container.appendChild(reminderElement);
    });
}

// Fungsi untuk menambahkan pengingat
function addReminder() {
    const name = document.getElementById('reminder-name').value;
    const amount = parseInt(document.getElementById('reminder-amount').value);
    const date = parseInt(document.getElementById('reminder-date').value);
    const category = document.getElementById('reminder-category').value;
    
    // Validasi input
    if (!name || !amount || !date || !category) {
        showNotification('Harap isi semua field pengingat!', 'error');
        return;
    }
    
    if (date < 1 || date > 31) {
        showNotification('Tanggal harus antara 1 dan 31!', 'error');
        return;
    }
    
    // Buat objek pengingat
    const reminder = {
        id: Date.now(),
        name: name,
        amount: amount,
        date: date,
        category: category
    };
    
    // Simpan ke localStorage
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    
    // Reset form
    document.getElementById('reminder-name').value = '';
    document.getElementById('reminder-amount').value = '';
    document.getElementById('reminder-date').value = '';
    document.getElementById('reminder-category').value = '';
    
    // Sembunyikan form
    document.getElementById('reminder-form').style.display = 'none';
    
    // Perbarui tampilan
    loadReminders();
    
    // Tampilkan notifikasi
    showNotification('Pengingat berhasil ditambahkan!', 'success');
}

// Fungsi untuk menghapus pengingat
function deleteReminder(id) {
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus pengingat ini?',
        function() {
            const reminders = JSON.parse(localStorage.getItem('reminders'));
            const updatedReminders = reminders.filter(r => r.id !== id);
            localStorage.setItem('reminders', JSON.stringify(updatedReminders));
            
            // Perbarui tampilan
            loadReminders();
            
            // Tampilkan notifikasi
            showNotification('Pengingat berhasil dihapus!', 'info');
            document.getElementById('confirm-modal').classList.remove('active');
        }
    );
}

// Fungsi untuk ekspor data
function exportData() {
    const data = {
        transactions: JSON.parse(localStorage.getItem('transactions')),
        savingTargets: JSON.parse(localStorage.getItem('savingTargets')),
        reminders: JSON.parse(localStorage.getItem('reminders')),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack-backup-${Date.now()}.json`;
    a.click();
    
    showNotification('Data berhasil diekspor!', 'success');
}

// Fungsi untuk impor data
function importData() {
    const fileInput = document.getElementById('import-file');
    
    if (!fileInput.files.length) {
        showNotification('Pilih file backup terlebih dahulu!', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validasi data
            if (!data.transactions || !data.savingTargets || !data.reminders) {
                throw new Error('Format file tidak valid');
            }
            
            // Simpan data
            localStorage.setItem('transactions', JSON.stringify(data.transactions));
            localStorage.setItem('savingTargets', JSON.stringify(data.savingTargets));
            localStorage.setItem('reminders', JSON.stringify(data.reminders));
            
            // Perbarui tampilan
            loadAllData();
            
            // Reset form
            fileInput.value = '';
            document.getElementById('import-modal').classList.remove('active');
            
            // Tampilkan notifikasi
            showNotification('Data berhasil diimpor!', 'success');
        } catch (error) {
            showNotification('Gagal membaca file. Pastikan file format JSON yang valid.', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Fungsi untuk menghapus semua data
function clearAllData() {
    localStorage.clear();
    initializeData();
    loadAllData();
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
        background-color: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e50914' : '#3498db'};
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
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk memformat tanggal
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
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
        'langganan': 'Langganan'
    };
    
    return categoryNames[category] || category;
}
