// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Inisialisasi data jika belum ada
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('reminders')) {
        // Data pengingat default
        const defaultReminders = [
            { id: 1, name: "Listrik & Air", amount: 750000, date: 5 },
            { id: 2, name: "Internet & TV Kabel", amount: 450000, date: 10 },
            { id: 3, name: "Kredit Mobil", amount: 3500000, date: 15 },
            { id: 4, name: "Asuransi Kesehatan", amount: 800000, date: 25 }
        ];
        localStorage.setItem('reminders', JSON.stringify(defaultReminders));
    }
    
    // Load data awal
    loadTransactions();
    loadReminders();
    updateSummary();
    updateComparison();
    
    // Event listener untuk form transaksi
    document.getElementById('transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction();
    });
    
    // Event listener untuk tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Hapus kelas active dari semua tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            
            // Tambah kelas active ke tab yang diklik
            this.classList.add('active');
            
            // Tampilkan konten yang sesuai
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.transactions-list').forEach(list => {
                list.classList.add('hidden');
            });
            document.getElementById(`${tabId}-transactions`).classList.remove('hidden');
        });
    });
    
    // Event listener untuk filter
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            loadTransactions();
        });
    });
    
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', function() {
            loadTransactions();
        });
    });
    
    // Event listener untuk tombol hapus data
    document.getElementById('clear-data').addEventListener('click', function() {
        if (confirm('Apakah Anda yakin ingin menghapus semua data transaksi?')) {
            localStorage.setItem('transactions', JSON.stringify([]));
            loadTransactions();
            updateSummary();
            updateComparison();
        }
    });
    
    // Event listener untuk tombol tambah pengingat
    document.querySelector('.btn-add-reminder').addEventListener('click', function() {
        addReminder();
    });
});

// Fungsi untuk menambahkan transaksi
function addTransaction() {
    const type = document.getElementById('transaction-type').value;
    const category = document.getElementById('category').value;
    const amount = parseInt(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    
    // Validasi input
    if (!type || !category || !amount || !date) {
        alert('Harap isi semua field yang wajib diisi!');
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
        createdAt: new Date().toISOString()
    };
    
    // Simpan ke localStorage
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Reset form
    document.getElementById('transaction-form').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Perbarui tampilan
    loadTransactions();
    updateSummary();
    updateComparison();
    
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
    const periodFilter = document.querySelector('input[name="period"]:checked').value;
    const now = new Date();
    
    if (periodFilter === 'day') {
        const today = now.toISOString().split('T')[0];
        filteredTransactions = filteredTransactions.filter(t => t.date === today);
    } else if (periodFilter === 'month') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        });
    } else if (periodFilter === 'year') {
        const currentYear = now.getFullYear();
        filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate.getFullYear() === currentYear;
        });
    }
    
    // Urutkan berdasarkan tanggal (terbaru pertama)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Tampilkan transaksi hari ini
    displayTransactions(filteredTransactions, 'day-transactions', periodFilter === 'day');
    
    // Tampilkan transaksi bulan ini
    const monthTransactions = getMonthTransactions(transactions, now);
    displayTransactions(monthTransactions, 'month-transactions', periodFilter === 'month');
    
    // Perbarui ringkasan bulan
    updateMonthSummary(monthTransactions);
}

// Fungsi untuk menampilkan transaksi
function displayTransactions(transactions, containerId, isEmptyAllowed = false) {
    const container = document.getElementById(containerId);
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Jika tidak ada transaksi
    if (transactions.length === 0) {
        if (isEmptyAllowed) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>Belum ada transaksi</p>
                </div>
            `;
        }
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
            </div>
            <div>
                <span class="transaction-amount ${transaction.type === 'income' ? 'transaction-income' : 'transaction-expense'}">
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
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        return;
    }
    
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const updatedTransactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    
    // Perbarui tampilan
    loadTransactions();
    updateSummary();
    updateComparison();
    
    // Tampilkan notifikasi
    showNotification('Transaksi berhasil dihapus!', 'info');
}

// Fungsi untuk memperbarui ringkasan
function updateSummary() {
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const now = new Date();
    
    // Transaksi hari ini
    const today = now.toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === today);
    
    // Transaksi bulan ini
    const monthTransactions = getMonthTransactions(transactions, now);
    
    // Hitung total pemasukan dan pengeluaran
    const todayIncome = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const todayExpense = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Perbarui elemen HTML
    document.getElementById('month-income').textContent = `Rp ${formatNumber(monthIncome)}`;
    document.getElementById('month-expense').textContent = `Rp ${formatNumber(monthExpense)}`;
    document.getElementById('month-balance').textContent = `Rp ${formatNumber(monthIncome - monthExpense)}`;
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
    
    const balance = totalIncome - totalExpense;
    
    document.querySelector('.income-total').textContent = `Rp ${formatNumber(totalIncome)}`;
    document.querySelector('.expense-total').textContent = `Rp ${formatNumber(totalExpense)}`;
    document.querySelector('.balance').textContent = `Rp ${formatNumber(balance)}`;
}

// Fungsi untuk memperbarui ringkasan bulan
function updateMonthSummary(monthTransactions) {
    const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthBalance = monthIncome - monthExpense;
    
    document.getElementById('month-income').textContent = `Rp ${formatNumber(monthIncome)}`;
    document.getElementById('month-expense').textContent = `Rp ${formatNumber(monthExpense)}`;
    document.getElementById('month-balance').textContent = `Rp ${formatNumber(monthBalance)}`;
}

// Fungsi untuk mendapatkan transaksi bulan ini
function getMonthTransactions(transactions, date) {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();
    
    return transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
    });
}

// Fungsi untuk memuat pengingat
function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    const container = document.querySelector('.reminders-list');
    
    // Kosongkan container
    container.innerHTML = '';
    
    // Tambahkan setiap pengingat
    reminders.forEach(reminder => {
        const reminderElement = document.createElement('div');
        reminderElement.className = 'reminder-item';
        reminderElement.innerHTML = `
            <div class="reminder-header">
                <h4>${reminder.name}</h4>
                <span class="reminder-date">Tgl ${reminder.date} setiap bulan</span>
            </div>
            <p class="reminder-amount">Rp ${formatNumber(reminder.amount)}</p>
        `;
        container.appendChild(reminderElement);
    });
}

// Fungsi untuk menambahkan pengingat
function addReminder() {
    const name = document.getElementById('reminder-name').value;
    const amount = parseInt(document.getElementById('reminder-amount').value);
    const date = parseInt(document.getElementById('reminder-date').value);
    
    // Validasi input
    if (!name || !amount || !date) {
        alert('Harap isi semua field pengingat!');
        return;
    }
    
    if (date < 1 || date > 31) {
        alert('Tanggal harus antara 1 dan 31!');
        return;
    }
    
    // Buat objek pengingat
    const reminder = {
        id: Date.now(),
        name: name,
        amount: amount,
        date: date
    };
    
    // Simpan ke localStorage
    const reminders = JSON.parse(localStorage.getItem('reminders'));
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    
    // Reset form
    document.getElementById('reminder-name').value = '';
    document.getElementById('reminder-amount').value = '';
    document.getElementById('reminder-date').value = '';
    
    // Perbarui tampilan
    loadReminders();
    
    // Tampilkan notifikasi
    showNotification('Pengingat berhasil ditambahkan!', 'success');
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
        background-color: ${type === 'success' ? '#2ecc71' : '#e50914'};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 500;
    `;
    
    // Tambahkan ke body
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.remove();
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
        'lainnya': 'Lainnya'
    };
    
    return categoryNames[category] || category;
}
