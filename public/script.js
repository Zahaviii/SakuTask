// ===== NOTIFIKASI =====
function showNotif(message, type = 'success') {
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.cssText = `position: fixed; top: 1.5rem; right: 1.5rem; background: ${type === 'success' ? '#10B981' : '#EF4444'}; color: white; padding: 0.75rem 1.5rem; border-radius: 20px; font-size: 1rem; font-weight: bold; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 9999; transition: opacity 0.5s; font-family: 'Plus Jakarta Sans', sans-serif;`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

const API_BASE = 'http://127.0.0.1:8000/api';
let token = localStorage.getItem('token');
let allTasks = [];
let allCategories = [];
let allTags = [];
let isOfflineMode = false; // Automatically detected

// Client-side filtering state
let activeFilters = {
    status: 'all',  // 'all', 'active', 'completed'
    priority: 'all', // 'all', 'high', 'medium', 'low'
    category: 'all', // 'all' or category_id
    tag: 'all',      // 'all' or tag_id
    search: ''
};

// Seed initial client-side fallback database
function initLocalDB() {
    if (!localStorage.getItem('todolist_seeded_v4')) {
        const defaultUsers = [
            { email: 'demo@demo.com', password: 'demo', name: 'User Demo' },
            { email: 'john@example.com', password: 'demo', name: 'John Doe' },
            { email: 'saktyanozahavi@gmail.com', password: 'demo', name: 'Sakty' },
            { email: 'asu@gmail.com', password: 'demo', name: 'Asu' },
            { email: 'sharliz@gmail.com', password: 'demo', name: 'Sharliz' }
        ];
        localStorage.setItem('todolist_users', JSON.stringify(defaultUsers));

        let categories = [];
        let tags = [];
        let tasks = [];

        defaultUsers.forEach((user, idx) => {
            const baseId = 1000 * (idx + 1);
            // Categories
            categories.push(
                { id: baseId + 1, name: 'Pekerjaan', color: '#3b82f6', user_email: user.email },
                { id: baseId + 2, name: 'Pribadi', color: '#10b981', user_email: user.email },
                { id: baseId + 3, name: 'Mendesak', color: '#ef4444', user_email: user.email }
            );
            // Tags
            tags.push(
                { id: baseId + 1, name: 'Penting', color: '#ef4444', user_email: user.email },
                { id: baseId + 2, name: 'Rutin', color: '#6b7280', user_email: user.email },
                { id: baseId + 3, name: 'Pengembangan Diri', color: '#8b5cf6', user_email: user.email }
            );
            // Tasks
            tasks.push(
                { 
                    id: baseId + 101, 
                    title: 'Evaluasi desain antarmuka aplikasi SakuTask', 
                    description: 'Meninjau kembali aspek navigasi, skema warna, dan konsistensi tata letak pada aplikasi utama.', 
                    priority: 'high', 
                    due_date: '2026-06-15', 
                    category_id: baseId + 1, 
                    tags: [baseId + 1, baseId + 3], 
                    is_completed: false, 
                    user_email: user.email 
                },
                { 
                    id: baseId + 102, 
                    title: 'Olahraga harian', 
                    description: 'Aktivitas fisik ringan untuk menjaga stamina dan kebugaran tubuh.', 
                    priority: 'medium', 
                    due_date: '2026-06-12', 
                    category_id: baseId + 2, 
                    tags: [baseId + 2], 
                    is_completed: true, 
                    user_email: user.email 
                }
            );
        });

        localStorage.setItem('todolist_categories', JSON.stringify(categories));
        localStorage.setItem('todolist_tags', JSON.stringify(tags));
        localStorage.setItem('todolist_tasks', JSON.stringify(tasks));
        localStorage.setItem('todolist_seeded_v4', 'true');
    }
}

initLocalDB();

// Fetch Wrapper with transparent Local Fallback if API Server is down
async function requestAPI(path, options = {}) {
    try {
        const url = `${API_BASE}${path}`;
        const res = await fetch(url, options);
        isOfflineMode = false;
        updateConnectionStatusUI();
        return res;
    } catch (error) {
        // Fallback to local simulation when backend is unreachable or CORS issues
        console.warn(`API Connection Failed (${path}). Falling back to Local Storage client mode.`);
        isOfflineMode = true;
        updateConnectionStatusUI();
        return simulateLocalRequest(path, options);
    }
}

// Minimal status indicator injected dynamically
function updateConnectionStatusUI() {
    const headers = document.querySelectorAll('.header-info h1, .auth-logo h1');
    headers.forEach(h1 => {
        let statusBadge = h1.querySelector('.status-pill');
        if (!statusBadge) {
            statusBadge = document.createElement('span');
            h1.appendChild(statusBadge);
        }
        if (isOfflineMode) {
            statusBadge.className = 'status-pill status-offline';
            statusBadge.innerHTML = '● Mode Lokal';
            statusBadge.title = 'Sistem berjalan secara offline dengan penyimpanan lokal';
        } else {
            statusBadge.className = 'status-pill status-online';
            statusBadge.innerHTML = '● Terhubung';
            statusBadge.title = 'Terhubung ke server sinkronisasi';
        }
    });

    // Update greeting with dynamic name on successful login
    updateDynamicGreeting();
}

// Generate warm time-of-day greetings
function updateDynamicGreeting() {
    const greetingEl = document.getElementById('dynamic-greeting');
    const motivEl = document.getElementById('time-motivation');
    if (!greetingEl) return;

    // Attempt to name user from mock token or context
    let currentUserEmail = localStorage.getItem('todolist_current_user') || 'demo@demo.com';
    let userDb = JSON.parse(localStorage.getItem('todolist_users') || '[]');
    let activeUser = userDb.find(u => u.email === currentUserEmail);
    
    let userName = "Pengguna SakuTask";
    if (activeUser) {
        userName = activeUser.name;
    } else if (currentUserEmail) {
        const localPart = currentUserEmail.split('@')[0];
        userName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    }

    // Clean status pill before overwriting
    let statusPillHtml = '';
    const pill = greetingEl.querySelector('.status-pill');
    if (pill) {
        statusPillHtml = pill.outerHTML;
    }

    greetingEl.innerHTML = `Halo, ${escapeHtml(userName)} ${statusPillHtml}`;
    if (motivEl) {
        motivEl.textContent = "Kelola tugas, pantau progres, dan tetap fokus pada prioritas yang perlu diselesaikan.";
    }

    const sidebarUserEl = document.getElementById('sidebar-user-name');
    if (sidebarUserEl) {
        sidebarUserEl.textContent = userName;
    }
}

// Local Storage Simulation Engine
function simulateLocalRequest(path, options = {}) {
    const getDB = (key) => JSON.parse(localStorage.getItem('todolist_' + key) || '[]');
    const setDB = (key, data) => localStorage.setItem('todolist_' + key, JSON.stringify(data));
    
    let current_email = localStorage.getItem('todolist_current_user') || 'demo@demo.com';
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;
    
    let responseData = null;
    let ok = true;
    let status = 200;

    // Simulate login
    if (path === '/login' && method === 'POST') {
        const users = getDB('users');
        const user = users.find(u => u.email === body.email && u.password === body.password);
        if (user) {
            responseData = { token: 'mock-token-' + user.email, name: user.name };
            localStorage.setItem('todolist_current_user', user.email);
        } else {
            ok = false;
            status = 401;
            responseData = { error: 'Alamat email atau kata sandi tidak valid.' };
        }
    } 
    // Simulate register
    else if (path === '/register' && method === 'POST') {
        const users = getDB('users');
        if (users.some(u => u.email === body.email)) {
            ok = false;
            status = 400;
            responseData = { error: 'Email ini sudah terdaftar.' };
        } else {
            const newUser = { email: body.email, password: body.password, name: body.name || 'Pengguna Baru' };
            users.push(newUser);
            setDB('users', users);
            responseData = { token: 'mock-token-' + newUser.email, name: newUser.name };
            localStorage.setItem('todolist_current_user', newUser.email);
            
            // Seed defaults for new user
            const categories = getDB('categories');
            const catId = Date.now();
            categories.push(
                { id: catId + 1, name: 'Harian', color: '#10b981', user_email: body.email },
                { id: catId + 2, name: 'Proyek', color: '#3b82f6', user_email: body.email }
            );
            setDB('categories', categories);
            
            const tags = getDB('tags');
            const tagId = Date.now();
            tags.push(
                { id: tagId + 1, name: 'Penting', color: '#ef4444', user_email: body.email },
                { id: tagId + 2, name: 'Rutin', color: '#6b7280', user_email: body.email }
            );
            setDB('tags', tags);
        }
    }
    // Simulate logout
    else if (path === '/logout' && method === 'POST') {
        responseData = { message: 'Logged out successfully' };
    }
    // Simulate tasks CRUD
    else if (path === '/tasks') {
        if (method === 'GET') {
            const tasks = getDB('tasks').filter(t => t.user_email === current_email);
            const categories = getDB('categories');
            const tags = getDB('tags');
            responseData = tasks.map(task => {
                return {
                    ...task,
                    category: categories.find(c => c.id == task.category_id) || null,
                    tags: (task.tags || []).map(tagId => tags.find(t => t.id == tagId)).filter(Boolean)
                };
            });
        } else if (method === 'POST') {
            const tasks = getDB('tasks');
            const newTask = {
                id: Date.now(),
                title: body.title,
                description: body.description || '',
                priority: body.priority || 'medium',
                due_date: body.due_date || '',
                category_id: body.category_id || null,
                tags: body.tags || [],
                is_completed: false,
                user_email: current_email
            };
            tasks.push(newTask);
            setDB('tasks', tasks);
            responseData = newTask;
        }
    }
    // Simulate single task interaction
    else if (path.startsWith('/tasks/')) {
        const taskId = parseInt(path.replace('/tasks/', ''));
        const tasks = getDB('tasks');
        const index = tasks.findIndex(t => t.id === taskId);
        
        if (index !== -1) {
            if (method === 'PUT') {
                tasks[index] = { ...tasks[index], ...body };
                setDB('tasks', tasks);
                responseData = tasks[index];
            } else if (method === 'DELETE') {
                const updated = tasks.filter(t => t.id !== taskId);
                setDB('tasks', updated);
                responseData = { message: 'Task deleted successfully' };
            }
        } else {
            ok = false;
            status = 404;
            responseData = { error: 'Task tidak ditemukan' };
        }
    }
    // Simulate categories CRUD
    else if (path === '/categories') {
        if (method === 'GET') {
            responseData = getDB('categories').filter(c => c.user_email === current_email);
        } else if (method === 'POST') {
            const categories = getDB('categories');
            const newCat = {
                id: Date.now(),
                name: body.name,
                color: body.color || '#3b82f6',
                user_email: current_email
            };
            categories.push(newCat);
            setDB('categories', categories);
            responseData = newCat;
        }
    }
    else if (path.startsWith('/categories/')) {
        const catId = parseInt(path.replace('/categories/', ''));
        const categories = getDB('categories');
        const remaining = categories.filter(c => c.id !== catId);
        setDB('categories', remaining);
        responseData = { message: 'Kategori deleted successfully' };
    }
    // Simulate tags CRUD
    else if (path === '/tags') {
        if (method === 'GET') {
            responseData = getDB('tags').filter(t => t.user_email === current_email);
        } else if (method === 'POST') {
            const tags = getDB('tags');
            const newTag = {
                id: Date.now(),
                name: body.name,
                color: body.color || '#a855f7',
                user_email: current_email
            };
            tags.push(newTag);
            setDB('tags', tags);
            responseData = newTag;
        }
    }
    else if (path.startsWith('/tags/')) {
        const tagId = parseInt(path.replace('/tags/', ''));
        const tags = getDB('tags');
        const remaining = tags.filter(t => t.id !== tagId);
        setDB('tags', remaining);
        responseData = { message: 'Tag deleted successfully' };
    }

    return {
        ok: ok,
        status: status,
        json: async () => responseData
    };
}

// Initial session logic
if (token) {
    showApp();
} else {
    showAuth();
}

function showAuth() {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
    updateConnectionStatusUI();
}

function showApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
    updateConnectionStatusUI();
    loadTasks();
    loadCategories();
    loadTags();
}

function showTab(tab) {
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.querySelectorAll('#auth-section .tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
    });
}

// Handle authentication API
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = 'Harap isi email dan kata sandi.';
        showNotif('Silakan lengkapi formulir masuk.', 'error');
        return;
    }

    const res = await requestAPI('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('todolist_current_user', email);
        token = data.token;

        // Save dynamic name if API returns it
        const userDisplayName = data.name || (data.user && data.user.name);
        if (userDisplayName) {
            let userDb = JSON.parse(localStorage.getItem('todolist_users') || '[]');
            let userIndex = userDb.findIndex(u => u.email === email);
            if (userIndex !== -1) {
                userDb[userIndex].name = userDisplayName;
            } else {
                userDb.push({ email: email, name: userDisplayName });
            }
            localStorage.setItem('todolist_users', JSON.stringify(userDb));
        }

        showApp();
        showNotif('Sesi masuk berhasil.', 'success');
    } else {
        errorEl.textContent = data.error || 'Alamat email atau kata sandi salah.';
        showNotif(data.error || 'Gagal masuk ke akun.', 'error');
    }
}

async function register() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('reg-error');
    errorEl.textContent = '';

    if (!name || !email || !password) {
        errorEl.textContent = 'Harap lengkapi seluruh kolom pendaftaran.';
        showNotif('Harap lengkapi semua kolom pendaftaran.', 'error');
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Kata sandi minimal terdiri dari 6 karakter.';
        showNotif('Kata sandi terlalu pendek.', 'error');
        return;
    }

    const res = await requestAPI('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('todolist_current_user', email);
        token = data.token;

        // Cache registration name
        let userDb = JSON.parse(localStorage.getItem('todolist_users') || '[]');
        let userIndex = userDb.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            userDb[userIndex].name = name;
        } else {
            userDb.push({ email: email, name: name });
        }
        localStorage.setItem('todolist_users', JSON.stringify(userDb));

        showApp();
        showNotif('Pendaftaran akun berhasil.', 'success');
    } else {
        errorEl.textContent = data.error || 'Pendaftaran gagal. Silakan coba kembali.';
        showNotif(data.error || 'Gagal melakukan pendaftaran.', 'error');
    }
}

async function logout() {
    await requestAPI('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    localStorage.removeItem('token');
    token = null;
    showAuth();
    showNotif('Anda telah keluar dari sistem.', 'success');
}

// Task logic
async function loadTasks() {
    const res = await requestAPI('/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const tasks = await res.json();
        allTasks = tasks; // Cached
        applyFiltersAndRender();
        calculateProgress(tasks);
    }
}

// Calculate progress and update the shiny motivation bar
function calculateProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.is_completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-percent');
    const compliment = document.getElementById('progress-compliment');

    if (bar && label) {
        bar.style.width = percent + '%';
        label.innerText = `${percent}% Selesai (${completed}/${total})`;
    }

    if (compliment) {
        if (total === 0) {
            compliment.textContent = "Belum ada tugas untuk hari ini. Tambahkan tugas untuk mulai mencatat pekerjaan Anda.";
        } else if (percent === 0) {
            compliment.textContent = "Belum ada progres hari ini. Mulai dengan menyelesaikan tugas utama Anda.";
        } else if (percent > 0 && percent < 50) {
            compliment.textContent = "Langkah awal yang baik. Teruskan progres pengerjaan Anda.";
        } else if (percent >= 50 && percent < 100) {
            compliment.textContent = "Sebagian besar tugas telah selesai. Pertahankan fokus Anda.";
        } else if (percent === 100) {
            compliment.textContent = "Seluruh tugas hari ini telah berhasil diselesaikan.";
        }
    }
}

// Handle search filters dynamically on keyup or select
function triggerFilters() {
    activeFilters.search = document.getElementById('search-input').value.toLowerCase().trim();
    applyFiltersAndRender();
}

function setFilter(type, value, btnElement) {
    if (activeFilters[type] !== undefined) {
        activeFilters[type] = value;
    }

    // Toggle active classes on pill buttons
    document.querySelectorAll(`.pill-btn[data-filter="${type}"]`).forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-val') === value);
    });

    applyFiltersAndRender();
}

// Combines local search query + status filters + priority level filters + category/tag filters
function applyFiltersAndRender() {
    let filtered = [...allTasks];

    // 1. Filter by Status
    if (activeFilters.status === 'active') {
        filtered = filtered.filter(t => !t.is_completed);
    } else if (activeFilters.status === 'completed') {
        filtered = filtered.filter(t => t.is_completed);
    }

    // 2. Filter by Priority
    if (activeFilters.priority !== 'all') {
        filtered = filtered.filter(t => t.priority === activeFilters.priority);
    }

    // 3. Filter by Category
    if (activeFilters.category !== 'all') {
        filtered = filtered.filter(t => t.category_id === parseInt(activeFilters.category));
    }

    // 4. Filter by Tag
    if (activeFilters.tag !== 'all') {
        filtered = filtered.filter(t => {
            if (!t.tags) return false;
            return t.tags.some(tag => {
                const tagId = typeof tag === 'object' ? tag.id : parseInt(tag);
                return tagId === parseInt(activeFilters.tag);
            });
        });
    }

    // 5. Filter by Real-time search keyword
    if (activeFilters.search) {
        filtered = filtered.filter(t => {
            const titleMatch = (t.title || '').toLowerCase().includes(activeFilters.search);
            const descMatch = (t.description || '').toLowerCase().includes(activeFilters.search);
            return titleMatch || descMatch;
        });
    }

    // Render output
    renderTasksList(filtered);

    // Update Counter badge
    const counterEl = document.getElementById('task-counter');
    if (counterEl) {
        counterEl.textContent = `${filtered.length} Tugas`;
    }
}

function renderTasksList(tasks) {
    const container = document.getElementById('tasks');

    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-list-placeholder">
                <p class="empty-title">Belum ada tugas tersedia</p>
                <p style="font-size:0.875rem;">Tambahkan tugas baru atau ubah filter untuk menampilkan hasil yang sesuai.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const isCompleted = task.is_completed;
        const priorityClass = `priority-${task.priority || 'medium'}`;
        
        // Translate priority labels
        const priorityLabels = {
            'low': 'Rendah',
            'medium': 'Sedang',
            'high': 'Tinggi'
        };

        // Dynamically build metadata line
        let metaHtml = '';
        if (task.priority) {
            metaHtml += `<span class="badge badge-${task.priority}">${priorityLabels[task.priority] || task.priority}</span>`;
        }
        if (task.due_date) {
            metaHtml += `<span class="task-date">Tenggat: ${task.due_date}</span>`;
        }
        if (task.category) {
            metaHtml += `<span class="badge" style="background:${task.category.color || '#3b82f6'}:15; color:${task.category.color}; border: 1px solid ${task.category.color}">${task.category.name}</span>`;
        }
        if (task.tags && task.tags.length > 0) {
            task.tags.forEach(tag => {
                if (tag) {
                    metaHtml += `<span class="badge" style="background:${tag.color || '#8b5cf6'}:15; color:${tag.color}; border: 1px solid ${tag.color}">${tag.name}</span>`;
                }
            });
        }

        const editBtnHtml = `<button class="btn-edit" onclick="editTask(${task.id})" title="Ubah Tugas">✏️</button>`;
        const completeBtnHtml = `
            <button class="btn-complete" onclick="toggleTask(${task.id}, ${isCompleted})" title="${isCompleted ? 'Tandai Belum Selesai' : 'Tandai Selesai'}">
                ${isCompleted ? '↩️' : '✅'}
            </button>
        `;
        const deleteBtnHtml = `<button class="btn-delete" onclick="deleteTask(${task.id})" title="Hapus Tugas">🗑️</button>`;

        return `
            <div id="task-card-${task.id}" class="task-card ${priorityClass} ${isCompleted ? 'completed' : ''}">
                <div class="task-info">
                    <h3>${escapeHtml(task.title)}</h3>
                    ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
                    <div class="task-meta">
                        ${metaHtml}
                    </div>
                </div>
                <div class="task-actions">
                    ${completeBtnHtml}
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Utility to escape HTML elements to prevent injection & syntax breakage
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function addTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const due_date = document.getElementById('task-due').value;
    const category_id = document.getElementById('task-category').value;
    const tags = selectedTagIdsForNewTask;

    if (!title) {
        showNotif('Judul tugas tidak boleh kosong.', 'error');
        return;
    }

    const res = await requestAPI('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, priority, due_date, category_id: category_id ? parseInt(category_id) : null, tags })
    });

    if (res.ok) {
        toggleAddForm(false); // Clean and close form container automatically!
        loadTasks();
        showNotif('Tugas berhasil ditambahkan.', 'success');
    }
}

async function toggleTask(id, isCompleted) {
    const res = await requestAPI(`/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_completed: !isCompleted })
    });

    if (res.ok) {
        loadTasks();
        if (!isCompleted) {
            showNotif('Tugas selesai.', 'success');
        } else {
            showNotif('Tugas dialihkan ke daftar aktif.', 'success');
        }
    }
}

async function deleteTask(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini secara permanen?')) return;

    const res = await requestAPI(`/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        loadTasks();
        showNotif('Tugas berhasil dihapus.', 'success');
    }
}

// EditTask safely consumes from cache state, avoiding text/quote issues
function editTask(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;

    // Open form drawer automatically
    toggleAddForm(true);

    document.getElementById('creator-panel-title').innerText = 'Ubah Tugas Hub # ' + id;

    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-due').value = task.due_date || '';
    document.getElementById('task-category').value = task.category_id || '';

    // Selected tags
    selectedTagIdsForNewTask = Array.isArray(task.tags) 
        ? task.tags.map(t => typeof t === 'object' ? t.id : parseInt(t))
        : [];

    populateInteractiveTagPills(allTags);

    // Change action button wording warmly
    const actionBtn = document.getElementById('submit-task-btn');
    if (actionBtn) {
        actionBtn.innerHTML = 'Simpan Perubahan';
        actionBtn.onclick = () => updateTask(id);
    }
    
    // Smooth scroll up to editing form
    document.getElementById('task-creator-panel').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('task-title').focus();
}

async function updateTask(id) {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const due_date = document.getElementById('task-due').value;
    const category_id = document.getElementById('task-category').value;
    const tags = selectedTagIdsForNewTask;

    if (!title) {
        showNotif('Judul tugas tidak boleh kosong.', 'error');
        return;
    }

    const res = await requestAPI(`/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            title, 
            description, 
            priority, 
            due_date, 
            category_id: category_id ? parseInt(category_id) : null,
            tags 
        })
    });

    if (res.ok) {
        toggleAddForm(false); // Close container is automatic and handles clean-up!

        // Restore add task button
        const actionBtn = document.getElementById('submit-task-btn');
        if (actionBtn) {
            actionBtn.innerHTML = 'Tambah Tugas';
            actionBtn.onclick = addTask;
        }

        loadTasks();
        showNotif('Tugas berhasil diperbarui.', 'success');
    }
}

// ===== CATEGORIES HANDLER =====
async function loadCategories() {
    const res = await requestAPI('/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const categories = await res.json();
        allCategories = categories;
        renderCategories(categories);
        populateCategoryDropdown(categories);
    }
}

function renderCategories(categories) {
    const listContainer = document.getElementById('categories');
    if (listContainer) {
        if (!categories || categories.length === 0) {
            listContainer.innerHTML = '<span class="sidebar-empty">Belum ada kategori</span>';
        } else {
            listContainer.innerHTML = categories.map(cat => {
                const isActive = activeFilters.category === cat.id;
                return `
                    <div class="sidebar-list-item ${isActive ? 'active' : ''}" style="${isActive ? 'background: ' + cat.color + '15; border-color: ' + cat.color + '55;' : ''}" onclick="filterBySidebar('category', ${cat.id})">
                        <div class="sidebar-item-content">
                            <span class="nav-dot-indicator" style="background: ${cat.color || '#3b82f6'};"></span>
                            <span class="nav-item-title">${escapeHtml(cat.name)}</span>
                        </div>
                        <button class="sidebar-item-delete-btn" onclick="deleteCategory(${cat.id}); event.stopPropagation();" title="Hapus kategori">✕</button>
                    </div>
                `;
            }).join('');
        }
    }
}

function populateCategoryDropdown(categories) {
    const select = document.getElementById('task-category');
    if (!select) return;
    select.innerHTML = '<option value="">Pilih kategori atau kelompokkan tugas</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

async function addCategory() {
    const name = document.getElementById('cat-name').value.trim();
    const color = document.getElementById('cat-color').value;

    if (!name) {
        showNotif('Nama kategori tidak boleh kosong.', 'error');
        return;
    }

    const res = await requestAPI('/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, color })
    });

    if (res.ok) {
        document.getElementById('cat-name').value = '';
        const miniForm = document.getElementById('mini-creator-category');
        if (miniForm) miniForm.style.display = 'none';
        loadCategories();
        showNotif('Kategori berhasil ditambahkan.', 'success');
    }
}

async function deleteCategory(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;

    const res = await requestAPI(`/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        // If we deleted the currently active category, reset that filter
        if (activeFilters.category === id) {
            activeFilters.category = 'all';
        }
        loadCategories();
        loadTasks(); // Update targets reference list
        showNotif('Kategori berhasil dihapus.', 'success');
    }
}

// ===== TAGS HANDLER =====
async function loadTags() {
    const res = await requestAPI('/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const tags = await res.json();
        allTags = tags;
        renderTags(tags);
    }
}

function renderTags(tags) {
    const listContainer = document.getElementById('tags');
    if (listContainer) {
        if (!tags || tags.length === 0) {
            listContainer.innerHTML = '<span class="sidebar-empty">Belum ada tag</span>';
        } else {
            listContainer.innerHTML = tags.map(tag => {
                const isActive = activeFilters.tag === tag.id;
                return `
                    <div class="sidebar-list-item ${isActive ? 'active' : ''}" style="${isActive ? 'background: ' + tag.color + '15; border-color: ' + tag.color + '55;' : ''}" onclick="filterBySidebar('tag', ${tag.id})">
                        <div class="sidebar-item-content">
                            <span class="nav-dot-indicator" style="background: ${tag.color || '#8b5cf6'};"></span>
                            <span class="nav-item-title">${escapeHtml(tag.name)}</span>
                        </div>
                        <button class="sidebar-item-delete-btn" onclick="deleteTag(${tag.id}); event.stopPropagation();" title="Hapus tag">✕</button>
                    </div>
                `;
            }).join('');
        }
    }

    // Also populate interactive selector list
    populateInteractiveTagPills(tags);
}

async function addTag() {
    const name = document.getElementById('tag-name').value.trim();
    const color = document.getElementById('tag-color').value;

    if (!name) {
        showNotif('Nama tag tidak boleh kosong.', 'error');
        return;
    }

    const res = await requestAPI('/tags', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, color })
    });

    if (res.ok) {
        document.getElementById('tag-name').value = '';
        const miniForm = document.getElementById('mini-creator-tag');
        if (miniForm) miniForm.style.display = 'none';
        loadTags();
        showNotif('Tag berhasil ditambahkan.', 'success');
    }
}

async function deleteTag(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus tag ini?')) return;

    const res = await requestAPI(`/tags/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        // If we deleted the currently active tag filter, reset it
        if (activeFilters.tag === id) {
            activeFilters.tag = 'all';
        }
        loadTags();
        loadTasks(); // Update tags on cards rendering
        showNotif('Tag berhasil dihapus.', 'success');
    }
}

// ===== NO-MORE-CTRL INTERACTIVE SELECTION ENGINE =====
let selectedTagIdsForNewTask = [];

function populateInteractiveTagPills(tags) {
    const container = document.getElementById('interactive-tag-pills');
    if (!container) return;

    if (!tags || tags.length === 0) {
        container.innerHTML = '<span class="interactive-empty-hints">Belum ada tag yang dibuat. Tambahkan tag baru lewat sidebar!</span>';
        return;
    }

    container.innerHTML = tags.map(tag => {
        const isSelected = selectedTagIdsForNewTask.includes(tag.id);
        const activeStyles = isSelected 
            ? `background: ${tag.color || '#8b5cf6'}; color: #ffffff; border-color: ${tag.color || '#8b5cf6'}; box-shadow: 0 4px 10px ${tag.color}35;`
            : `background: #f8fafc; color: #475569; border-color: #e2e8f0;`;
        return `
            <button type="button" class="tag-pill-option-btn ${isSelected ? 'selected' : ''}" style="${activeStyles}" onclick="toggleTagSelection(${tag.id}, this)">
                ${escapeHtml(tag.name)}
            </button>
        `;
    }).join('');
}

function toggleTagSelection(tagId, element) {
    const idx = selectedTagIdsForNewTask.indexOf(tagId);
    if (idx > -1) {
        selectedTagIdsForNewTask.splice(idx, 1);
        element.classList.remove('selected');
        element.style.background = '#f8fafc';
        element.style.color = '#475569';
        element.style.borderColor = '#e2e8f0';
        element.style.boxShadow = 'none';
    } else {
        selectedTagIdsForNewTask.push(tagId);
        element.classList.add('selected');
        const tag = allTags.find(t => t.id === tagId);
        if (tag) {
            element.style.background = tag.color || '#8b5cf6';
            element.style.color = '#ffffff';
            element.style.borderColor = tag.color || '#8b5cf6';
            element.style.boxShadow = `0 4px 10px ${tag.color}35`;
        }
    }
}

// ===== ACCORDION ADD TASK FORM TOGGLE =====
function toggleAddForm(forceState) {
    const panel = document.getElementById('task-creator-panel');
    const triggerBtn = document.getElementById('toggle-add-form-btn');
    if (!panel || !triggerBtn) return;

    const isHidden = panel.style.display === 'none';
    const show = (forceState !== undefined) ? forceState : isHidden;

    const fabBtn = document.getElementById('mobile-fab-btn');
    if (fabBtn) {
        fabBtn.style.display = show ? 'none' : '';
    }

    if (show) {
        panel.style.display = 'block';
        triggerBtn.innerHTML = '<span class="btn-icon">✕</span> <span class="btn-text">Batal</span>';
        triggerBtn.classList.add('active-danger');
        
        // Ensure action matches creation if not currently in editing mode
        const actionBtn = document.getElementById('submit-task-btn');
        if (actionBtn && !actionBtn.onclick.toString().includes('updateTask')) {
            document.getElementById('creator-panel-title').innerText = 'Buat Tugas Baru';
            actionBtn.innerHTML = 'Tambah Tugas';
            actionBtn.onclick = addTask;
        }
    } else {
        panel.style.display = 'none';
        triggerBtn.innerHTML = '<span class="btn-icon">➕</span> <span class="btn-text">Tambah Tugas</span>';
        triggerBtn.classList.remove('active-danger');

        // Form fields cleaner
        document.getElementById('task-title').value = '';
        document.getElementById('task-desc').value = '';
        document.getElementById('task-due').value = '';
        document.getElementById('task-category').value = '';
        selectedTagIdsForNewTask = [];
        populateInteractiveTagPills(allTags);
    }
}

// ===== MOBILE DRAWER SLIDER TOGGLE =====
function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar-panel');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    if (show) {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== MINI INLINE EDITOR DRAWER TOGGLER FOR SIDEBAR =====
function toggleMiniCreator(type) {
    const catForm = document.getElementById('mini-creator-category');
    const tagForm = document.getElementById('mini-creator-tag');
    if (!catForm || !tagForm) return;

    if (type === 'category') {
        const isHidden = catForm.style.display === 'none';
        catForm.style.display = isHidden ? 'block' : 'none';
        tagForm.style.display = 'none';
        if (isHidden) document.getElementById('cat-name').focus();
    } else if (type === 'tag') {
        const isHidden = tagForm.style.display === 'none';
        tagForm.style.display = isHidden ? 'block' : 'none';
        catForm.style.display = 'none';
        if (isHidden) document.getElementById('tag-name').focus();
    }
}

// ===== SIDEBAR NAVIGATION & INTUITIVE CASCADE FILTERS CODE =====
function filterBySidebar(type, val) {
    // Close sidebar on mobile once a filter is active to focus on results!
    toggleSidebar(false);

    if (type === 'category') {
        activeFilters.category = val;
        const allCatBtn = document.getElementById('filter-cat-all');
        if (allCatBtn) {
            allCatBtn.classList.toggle('active', val === 'all');
        }
    } else if (type === 'tag') {
        activeFilters.tag = val;
        const allTagBtn = document.getElementById('filter-tag-all');
        if (allTagBtn) {
            allTagBtn.classList.toggle('active', val === 'all');
        }
    }

    renderCategories(allCategories);
    renderTags(allTags);
    updateActiveFiltersBar();
    applyFiltersAndRender();
}

function clearSidebarFilters() {
    activeFilters.category = 'all';
    activeFilters.tag = 'all';
    
    const allCatBtn = document.getElementById('filter-cat-all');
    if (allCatBtn) allCatBtn.classList.add('active');
    
    const allTagBtn = document.getElementById('filter-tag-all');
    if (allTagBtn) allTagBtn.classList.add('active');

    renderCategories(allCategories);
    renderTags(allTags);
    updateActiveFiltersBar();
    applyFiltersAndRender();
}

function updateActiveFiltersBar() {
    const bar = document.getElementById('active-filters-bar');
    const container = document.getElementById('active-filters-chips');
    if (!bar || !container) return;

    let chipsHtml = '';

    if (activeFilters.category !== 'all') {
        const cat = allCategories.find(c => c.id === parseInt(activeFilters.category));
        if (cat) {
            chipsHtml += `
                <div class="active-toast-chip" style="background: ${cat.color}15; border: 1px solid ${cat.color}; color: ${cat.color};">
                    Kategori: <b>${escapeHtml(cat.name)}</b>
                    <button onclick="filterBySidebar('category', 'all')" class="chip-delete-x">✕</button>
                </div>
            `;
        }
    }

    if (activeFilters.tag !== 'all') {
        const tag = allTags.find(t => t.id === parseInt(activeFilters.tag));
        if (tag) {
            chipsHtml += `
                <div class="active-toast-chip" style="background: ${tag.color}15; border: 1px solid ${tag.color}; color: ${tag.color};">
                    Tag: <b>${escapeHtml(tag.name)}</b>
                    <button onclick="filterBySidebar('tag', 'all')" class="chip-delete-x">✕</button>
                </div>
            `;
        }
    }

    if (chipsHtml) {
        container.innerHTML = chipsHtml;
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}
