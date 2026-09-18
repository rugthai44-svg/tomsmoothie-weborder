<?php
// admin.php - Admin Dashboard
require_once __DIR__ . '/includes/auth.php';
$user = requireLogin('ADMIN');

$pdo = getDB();

include __DIR__ . '/includes/header.php';
?>

<div class="admin-dashboard-container">
    
    <!-- Admin Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <div>
            <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--brown);">👑 แผงควบคุมระบบหลังบ้าน (Admin Dashboard)</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">จัดการเมนู พนักงาน แต้มลูกค้า และรายงานสรุปยอดขาย</p>
        </div>
        <button class="btn btn-outline" style="font-size: 0.85rem;" onclick="loadAllAdminData(true)">
            🔄 รีเฟรชข้อมูล
        </button>
    </div>

    <!-- Admin Nav Tabs -->
    <div class="nav-tabs" id="admin-nav-tabs">
        <button class="nav-tab active" onclick="switchAdminTab('analytics')">
            <i data-lucide="trending-up"></i> สถิติยอดขาย
        </button>
        <button class="nav-tab" onclick="switchAdminTab('menu')">
            <i data-lucide="coffee"></i> จัดการเมนู
        </button>
        <button class="nav-tab" onclick="switchAdminTab('staff')">
            <i data-lucide="users"></i> จัดการพนักงาน
        </button>
        <button class="nav-tab" onclick="switchAdminTab('customers')">
            <i data-lucide="user-check"></i> จัดการแต้มลูกค้า
        </button>
        <button class="nav-tab" onclick="switchAdminTab('closings')">
            <i data-lucide="calendar"></i> รายงานปิดยอดประจำวัน
        </button>
        <button class="nav-tab" onclick="switchAdminTab('logs')">
            <i data-lucide="file-text"></i> ประวัติแต้ม
        </button>
        <button class="nav-tab" onclick="switchAdminTab('settings')">
            <i data-lucide="settings"></i> ตั้งค่า
        </button>
    </div>

    <!-- ==================== TAB 1: ANALYTICS ==================== -->
    <div id="admin-tab-analytics" class="tab-pane">
        
        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">💰 ยอดขายรวมทั้งหมด</div>
                <div class="kpi-val" style="color: var(--primary);">฿<span id="kpi-total-revenue">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">📅 ยอดขายวันนี้ (ประมาณการ)</div>
                <div class="kpi-val" style="color: var(--success);">฿<span id="kpi-today-revenue">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">👥 จำนวนลูกค้าในระบบ</div>
                <div class="kpi-val"><span id="kpi-total-customers">0</span> คน</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">🎁 จำนวนแก้วที่แลกฟรีแล้ว</div>
                <div class="kpi-val" style="color: #b78103;"><span id="kpi-free-drinks">0</span> แก้ว</div>
            </div>
        </div>

        <!-- Best Sellers Chart / List -->
        <div style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border); padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--brown); margin-bottom: 16px;">
                🔥 อันดับเมนูขายดีประจำร้าน
            </h3>
            <div id="admin-best-sellers-list" style="display: flex; flex-direction: column; gap: 10px;">
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">กำลังโหลดอันดับเมนู...</div>
            </div>
        </div>

    </div>

    <!-- ==================== TAB 2: MENU MANAGEMENT ==================== -->
    <div id="admin-tab-menu" class="tab-pane" style="display: none;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">🍹 รายการเมนูทั้งหมด</h3>
            <button class="btn btn-primary" onclick="openMenuModal()">
                ➕ เพิ่มเมนูใหม่
            </button>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ไอคอน</th>
                        <th>ชื่อเมนู</th>
                        <th>หมวดหมู่</th>
                        <th>ราคา</th>
                        <th>ยอดขาย</th>
                        <th>สถานะสต็อก</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody id="admin-menu-tbody">
                    <tr><td colspan="7" style="text-align:center;">กำลังโหลดรายการเมนู...</td></tr>
                </tbody>
            </table>
        </div>

    </div>

    <!-- ==================== TAB 3: STAFF MANAGEMENT ==================== -->
    <div id="admin-tab-staff" class="tab-pane" style="display: none;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">🧑‍🍳 รายชื่อพนักงานและสิทธิ์</h3>
            <button class="btn btn-primary" onclick="openStaffModal()">
                ➕ เพิ่มพนักงานใหม่
            </button>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ชื่อ-นามสกุล</th>
                        <th>อีเมล</th>
                        <th>เบอร์โทร</th>
                        <th>บทบาท</th>
                        <th>สถานะ</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody id="admin-staff-tbody">
                    <tr><td colspan="6" style="text-align:center;">กำลังโหลดรายชื่อพนักงาน...</td></tr>
                </tbody>
            </table>
        </div>

    </div>

    <!-- ==================== TAB 4: CUSTOMER & POINTS ==================== -->
    <div id="admin-tab-customers" class="tab-pane" style="display: none;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">👥 จัดการแต้มสมาชิกลูกค้า</h3>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="admin-cust-search" class="form-control" placeholder="ค้นหาชื่อ / เบอร์ / รหัส..." onkeyup="if(event.key==='Enter') searchAdminCustomers()">
                <button class="btn btn-primary" onclick="searchAdminCustomers()">ค้นหา</button>
            </div>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>รหัสสมาชิก</th>
                        <th>ชื่อลูกค้า</th>
                        <th>เบอร์โทร</th>
                        <th>อีเมล</th>
                        <th>แต้มสะสม</th>
                        <th>ปรับแต้ม</th>
                    </tr>
                </thead>
                <tbody id="admin-customers-tbody">
                    <tr><td colspan="6" style="text-align:center;">กำลังโหลดข้อมูลลูกค้า...</td></tr>
                </tbody>
            </table>
        </div>

    </div>

    <!-- ==================== TAB 5: DAILY CLOSINGS & CSV ==================== -->
    <div id="admin-tab-closings" class="tab-pane" style="display: none;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">💰 ประวัติรายงานปิดยอดประจำวัน</h3>
            <a href="api/admin.php?action=export_closings_csv" class="btn btn-success" target="_blank">
                📥 ส่งออกเป็น Excel (CSV)
            </a>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>พนักงานผู้บันทึก</th>
                        <th>แก้วขายได้</th>
                        <th>แก้วแลกฟรี</th>
                        <th>ยอดขายตามระบบ</th>
                        <th>ยอดเงินสดนับได้จริง</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody id="admin-closings-tbody">
                    <tr><td colspan="7" style="text-align:center;">กำลังโหลดรายงานปิดยอดประจำวัน...</td></tr>
                </tbody>
            </table>
        </div>

    </div>

    <!-- ==================== TAB 6: LOGS ==================== -->
    <div id="admin-tab-logs" class="tab-pane" style="display: none;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown); margin-bottom: 16px;">📜 ประวัติการแจก/แลกแต้มสะสมทั้งหมด</h3>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>วันเวลา</th>
                        <th>ลูกค้า</th>
                        <th>ประเภท</th>
                        <th>แต้ม</th>
                        <th>รายละเอียด</th>
                    </tr>
                </thead>
                <tbody id="admin-logs-tbody">
                    <tr><td colspan="5" style="text-align:center;">กำลังโหลดประวัติ...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ==================== TAB 7: SETTINGS & RESET ==================== -->
    <div id="admin-tab-settings" class="tab-pane" style="display: none;">
        <div style="max-width: 600px; margin: 0 auto; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 24px;">
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--brown); margin-bottom: 8px;">⚙️ การตั้งค่าระบบ</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">การดูแลจัดการฐานข้อมูลและการสำรองข้อมูล</p>

            <div style="border-top: 1px solid var(--border); padding-top: 20px;">
                <h4 style="color: var(--danger); font-weight: 800; font-size: 1rem; margin-bottom: 6px;">⚠️ รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้น</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 14px;">ล้างข้อมูลออเดอร์ ประวัติแต้มทั้งหมด และคืนค่าเมนูและบัญชีผู้ใช้เริ่มต้น</p>
                <button class="btn btn-danger" onclick="resetDatabaseConfirm()">
                    🗑️ รีเซ็ตฐานข้อมูล (Reset Database)
                </button>
            </div>
        </div>
    </div>

</div>

<!-- Modal: Add/Edit Menu Item -->
<div id="menu-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="menu-modal-title" style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">เพิ่มเมนูใหม่</h3>
            <button class="modal-close" onclick="document.getElementById('menu-modal').style.display='none'">&times;</button>
        </div>

        <form onsubmit="handleMenuFormSubmit(event)">
            <input type="hidden" id="menu-form-id">

            <div class="form-group">
                <label>ชื่อเมนู:</label>
                <input type="text" id="menu-form-name" class="form-control" placeholder="เช่น สตรอว์เบอร์รีโยเกิร์ตปั่น" required>
            </div>

            <div class="form-group">
                <label>หมวดหมู่:</label>
                <select id="menu-form-category" class="form-control">
                    <option value="Smoothie">Smoothie (ผลไม้ปั่น)</option>
                    <option value="Iced">Iced (เครื่องดื่มเย็น)</option>
                    <option value="Hot">Hot (เครื่องดื่มร้อน)</option>
                    <option value="Topping">Topping (ท็อปปิ้ง)</option>
                </select>
            </div>

            <div class="form-group">
                <label>ราคา (บาท):</label>
                <input type="number" id="menu-form-price" class="form-control" placeholder="60" min="0" required>
            </div>

            <div class="form-group">
                <label>ไอคอน Emoji:</label>
                <input type="text" id="menu-form-emoji" class="form-control" placeholder="🍓" value="🥤">
            </div>

            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="menu-form-popular">
                    <span>🔥 กำหนดเป็นเมนูยอดนิยม</span>
                </label>
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding: 12px;">บันทึกเมนู</button>
        </form>
    </div>
</div>

<!-- Modal: Add Staff Account -->
<div id="staff-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">เพิ่มบัญชีพนักงานใหม่</h3>
            <button class="modal-close" onclick="document.getElementById('staff-modal').style.display='none'">&times;</button>
        </div>

        <form onsubmit="handleStaffFormSubmit(event)">
            <div class="form-group">
                <label>ชื่อ-นามสกุล:</label>
                <input type="text" id="staff-form-name" class="form-control" placeholder="น้องป่าน (บาริสต้า)" required>
            </div>

            <div class="form-group">
                <label>อีเมลสำหรับเข้าสู่ระบบ:</label>
                <input type="email" id="staff-form-email" class="form-control" placeholder="staff2@tomsmoothie.com" required>
            </div>

            <div class="form-group">
                <label>รหัสผ่าน:</label>
                <input type="password" id="staff-form-password" class="form-control" placeholder="••••••••" required>
            </div>

            <div class="form-group">
                <label>เบอร์โทรศัพท์:</label>
                <input type="tel" id="staff-form-phone" class="form-control" placeholder="089-111-2222">
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding: 12px;">บันทึกบัญชีพนักงาน</button>
        </form>
    </div>
</div>

<!-- Modal: Adjust Customer Points -->
<div id="points-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">ปรับปรุงแต้มสะสมลูกค้า</h3>
            <button class="modal-close" onclick="document.getElementById('points-modal').style.display='none'">&times;</button>
        </div>

        <form onsubmit="handlePointsAdjustSubmit(event)">
            <input type="hidden" id="adjust-cust-id">

            <div style="background: var(--brown-pale); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
                <div style="font-weight: 700;" id="adjust-cust-name">-</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">แต้มปัจจุบัน: <strong id="adjust-cust-points" style="color: var(--primary);">0</strong> แต้ม</div>
            </div>

            <div class="form-group">
                <label>จำนวนแต้มที่ต้องการเพิ่ม/ลด (เช่น +5 หรือ -2):</label>
                <input type="number" id="adjust-points-delta" class="form-control" placeholder="1" required>
            </div>

            <div class="form-group">
                <label>เหตุผลในการปรับแต้ม:</label>
                <input type="text" id="adjust-points-reason" class="form-control" placeholder="เช่น ชดเชยความผิดพลาด, กิจกรรมพิเศษ" required>
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding: 12px;">ยืนยันปรับแต้ม</button>
        </form>
    </div>
</div>

<script>
let currentAdminTab = 'analytics';

function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    document.querySelectorAll('#admin-nav-tabs .nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    const target = document.getElementById(`admin-tab-${tabName}`);
    if (target) target.style.display = 'block';

    const tabs = document.querySelectorAll('#admin-nav-tabs .nav-tab');
    const tabMap = { 'analytics': 0, 'menu': 1, 'staff': 2, 'customers': 3, 'closings': 4, 'logs': 5, 'settings': 6 };
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');

    if (tabName === 'analytics') loadAdminAnalytics();
    if (tabName === 'menu') loadAdminMenu();
    if (tabName === 'staff') loadAdminStaff();
    if (tabName === 'customers') searchAdminCustomers();
    if (tabName === 'closings') loadAdminClosings();
    if (tabName === 'logs') loadAdminLogs();
}

function loadAllAdminData(manual = false) {
    switchAdminTab(currentAdminTab);
    if (manual) {
        showToast('🔄 รีเฟรชข้อมูลระบบล่าสุดเรียบร้อยแล้ว', 'info');
    }
}

// 1. Analytics
async function loadAdminAnalytics() {
    const res = await apiRequest('api/admin.php?action=analytics');
    if (res.success && res.data) {
        document.getElementById('kpi-total-revenue').textContent = parseFloat(res.data.total_revenue).toLocaleString();
        document.getElementById('kpi-today-revenue').textContent = parseFloat(res.data.today_revenue).toLocaleString();
        document.getElementById('kpi-total-customers').textContent = res.data.total_customers;
        document.getElementById('kpi-free-drinks').textContent = res.data.free_drinks_redeemed;

        // Render Best Sellers
        const list = document.getElementById('admin-best-sellers-list');
        if (res.data.best_sellers && res.data.best_sellers.length > 0) {
            const maxSold = Math.max(...res.data.best_sellers.map(s => s.total_sold_count), 1);
            let html = '';
            res.data.best_sellers.forEach((item, index) => {
                const percent = Math.round((item.total_sold_count / maxSold) * 100);
                html += `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:700; margin-bottom:4px;">
                            <span>#${index+1} ${item.image_url || '🥤'} ${item.name}</span>
                            <span style="color:var(--primary);">${item.total_sold_count} แก้ว</span>
                        </div>
                        <div style="background:var(--brown-pale); border-radius:10px; height:12px; overflow:hidden;">
                            <div style="background:var(--primary-gradient); width:${percent}%; height:100%; border-radius:10px;"></div>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    }
}

// 2. Menu Management
async function loadAdminMenu() {
    const tbody = document.getElementById('admin-menu-tbody');
    const res = await apiRequest('api/menu.php');

    if (!res.success || !res.data) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">โหลดเมนูไม่สำเร็จ</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(item => {
        const isAvail = item.is_available == 1;
        html += `
            <tr>
                <td style="font-size:1.5rem; text-align:center;">${item.image_url || '🥤'}</td>
                <td style="font-weight:700;">
                    ${item.name}
                    ${item.is_popular == 1 ? '<span class="status-pill pending" style="font-size:0.65rem; margin-left:4px;">🔥 ยอดนิยม</span>' : ''}
                </td>
                <td><span class="status-pill ${item.category === 'Smoothie' ? 'preparing' : 'ready'}">${item.category}</span></td>
                <td style="font-weight:800; color:var(--primary);">฿${parseFloat(item.base_price).toLocaleString()}</td>
                <td>${item.total_sold_count} แก้ว</td>
                <td>
                    <button class="btn ${isAvail ? 'btn-success' : 'btn-danger'}" style="font-size:0.75rem; padding:4px 8px;" onclick="toggleMenuStock('${item.id}', ${isAvail ? 0 : 1})">
                        ${isAvail ? 'พร้อมขาย' : 'สินค้าหมด'}
                    </button>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-outline" style="font-size:0.75rem; padding:4px 8px;" onclick='openMenuModal(${JSON.stringify(item)})'>✏️ แก้ไข</button>
                        <button class="btn btn-danger" style="font-size:0.75rem; padding:4px 8px;" onclick="deleteMenuItem('${item.id}', '${item.name}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openMenuModal(item = null) {
    if (item) {
        document.getElementById('menu-modal-title').textContent = 'แก้ไขเมนู';
        document.getElementById('menu-form-id').value = item.id;
        document.getElementById('menu-form-name').value = item.name;
        document.getElementById('menu-form-category').value = item.category;
        document.getElementById('menu-form-price').value = item.base_price;
        document.getElementById('menu-form-emoji').value = item.image_url || '🥤';
        document.getElementById('menu-form-popular').checked = item.is_popular == 1;
    } else {
        document.getElementById('menu-modal-title').textContent = 'เพิ่มเมนูใหม่';
        document.getElementById('menu-form-id').value = '';
        document.getElementById('menu-form-name').value = '';
        document.getElementById('menu-form-category').value = 'Smoothie';
        document.getElementById('menu-form-price').value = '50';
        document.getElementById('menu-form-emoji').value = '🥤';
        document.getElementById('menu-form-popular').checked = false;
    }
    document.getElementById('menu-modal').style.display = 'flex';
}

async function handleMenuFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('menu-form-id').value;
    const action = id ? 'update' : 'add';

    const formData = new FormData();
    formData.append('action', action);
    if (id) formData.append('id', id);
    formData.append('name', document.getElementById('menu-form-name').value.trim());
    formData.append('category', document.getElementById('menu-form-category').value);
    formData.append('base_price', document.getElementById('menu-form-price').value);
    formData.append('image_url', document.getElementById('menu-form-emoji').value.trim());
    formData.append('is_popular', document.getElementById('menu-form-popular').checked ? '1' : '0');

    const res = await apiRequest('api/menu.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('menu-modal').style.display = 'none';
        loadAdminMenu();
    } else {
        showToast(res.message, 'danger');
    }
}

async function toggleMenuStock(id, newStatus) {
    const formData = new FormData();
    formData.append('action', 'toggle_stock');
    formData.append('id', id);
    formData.append('is_available', newStatus);

    const res = await apiRequest('api/menu.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        loadAdminMenu();
    } else {
        showToast(res.message, 'danger');
    }
}

async function deleteMenuItem(id, name) {
    if (!confirm(`ยืนยันการลบเมนู "${name}" หรือไม่?`)) return;

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);

    const res = await apiRequest('api/menu.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        loadAdminMenu();
    } else {
        showToast(res.message, 'danger');
    }
}

// 3. Staff Management
async function loadAdminStaff() {
    const tbody = document.getElementById('admin-staff-tbody');
    const res = await apiRequest('api/admin.php?action=staff_list');

    if (!res.success || !res.data) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">โหลดรายชื่อไม่สำเร็จ</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(s => {
        const isSelf = s.id === '<?= $user['id'] ?>';
        const isActive = s.is_active == 1;
        html += `
            <tr>
                <td style="font-weight:700;">${s.full_name}</td>
                <td>${s.email}</td>
                <td>${s.phone || '-'}</td>
                <td><span class="user-badge role-badge-${s.role.toLowerCase()}">${s.role}</span></td>
                <td><span class="status-pill ${isActive ? 'ready' : 'cancelled'}">${isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}</span></td>
                <td>
                    ${!isSelf && s.role !== 'ADMIN' ? `
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-success'}" style="font-size:0.75rem; padding:4px 8px;" onclick="toggleStaffActive('${s.id}', ${isActive ? 0 : 1})">
                            ${isActive ? 'ระงับ' : 'เปิดใช้งาน'}
                        </button>
                    ` : '<span style="font-size:0.75rem; color:var(--text-muted);">-</span>'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openStaffModal() {
    document.getElementById('staff-form-name').value = '';
    document.getElementById('staff-form-email').value = '';
    document.getElementById('staff-form-password').value = '';
    document.getElementById('staff-form-phone').value = '';
    document.getElementById('staff-modal').style.display = 'flex';
}

async function handleStaffFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('action', 'add_staff');
    formData.append('full_name', document.getElementById('staff-form-name').value.trim());
    formData.append('email', document.getElementById('staff-form-email').value.trim());
    formData.append('password', document.getElementById('staff-form-password').value.trim());
    formData.append('phone', document.getElementById('staff-form-phone').value.trim());

    const res = await apiRequest('api/admin.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('staff-modal').style.display = 'none';
        loadAdminStaff();
    } else {
        showToast(res.message, 'danger');
    }
}

async function toggleStaffActive(staffId, newStatus) {
    const formData = new FormData();
    formData.append('action', 'toggle_staff');
    formData.append('staff_id', staffId);
    formData.append('is_active', newStatus);

    const res = await apiRequest('api/admin.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        loadAdminStaff();
    } else {
        showToast(res.message, 'danger');
    }
}

// 4. Customer Points Management
async function searchAdminCustomers() {
    const query = document.getElementById('admin-cust-search').value.trim();
    const tbody = document.getElementById('admin-customers-tbody');
    const res = await apiRequest(`api/admin.php?action=customer_list&search=${encodeURIComponent(query)}`);

    if (!res.success || !res.data) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">โหลดข้อมูลลูกค้าไม่สำเร็จ</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(c => {
        html += `
            <tr>
                <td style="font-family:monospace; font-weight:700;">${c.member_code || '-'}</td>
                <td style="font-weight:700;">${c.full_name}</td>
                <td>${c.phone || '-'}</td>
                <td>${c.email}</td>
                <td style="font-weight:800; font-size:1.1rem; color:var(--primary);">${c.current_points} แต้ม</td>
                <td>
                    <button class="btn btn-outline" style="font-size:0.75rem; padding:4px 8px;" onclick='openPointsModal(${JSON.stringify(c)})'>
                        ⚡ ปรับแต้ม
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openPointsModal(cust) {
    document.getElementById('adjust-cust-id').value = cust.id;
    document.getElementById('adjust-cust-name').textContent = cust.full_name;
    document.getElementById('adjust-cust-points').textContent = cust.current_points;
    document.getElementById('adjust-points-delta').value = '1';
    document.getElementById('adjust-points-reason').value = '';
    document.getElementById('points-modal').style.display = 'flex';
}

async function handlePointsAdjustSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('action', 'admin_adjust');
    formData.append('customer_id', document.getElementById('adjust-cust-id').value);
    formData.append('points_change', document.getElementById('adjust-points-delta').value);
    formData.append('reason', document.getElementById('adjust-points-reason').value.trim());

    const res = await apiRequest('api/loyalty.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('points-modal').style.display = 'none';
        searchAdminCustomers();
    } else {
        showToast(res.message, 'danger');
    }
}

// 5. Shift Closings
async function loadAdminClosings() {
    const tbody = document.getElementById('admin-closings-tbody');
    const res = await apiRequest('api/staff.php?action=get_closings');

    if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">ยังไม่มีรายงานปิดยอดประจำวัน</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(c => {
        html += `
            <tr>
                <td style="font-weight:700;">${c.date}</td>
                <td>${c.staff_name || '-'}</td>
                <td>${c.cups_sold} แก้ว</td>
                <td style="color:#b78103; font-weight:700;">${c.free_cups_redeemed} แก้ว</td>
                <td style="font-weight:700;">฿${parseFloat(c.total_revenue).toLocaleString()}</td>
                <td style="font-weight:800; color:var(--primary);">฿${parseFloat(c.cash_actual).toLocaleString()}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${c.notes || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// 6. Logs
async function loadAdminLogs() {
    const tbody = document.getElementById('admin-logs-tbody');
    const res = await apiRequest('api/admin.php?action=logs');

    if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">ไม่มีประวัติการทำรายการ</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(l => {
        const isEarn = l.transaction_type === 'EARN';
        const isRedeem = l.transaction_type === 'REDEEM';
        html += `
            <tr>
                <td style="font-size:0.8rem; color:var(--text-muted);">${l.created_at}</td>
                <td style="font-weight:700;">${l.customer_name || 'ลูกค้า'} (${l.customer_phone || '-'})</td>
                <td><span class="status-pill ${isEarn ? 'ready' : (isRedeem ? 'cancelled' : 'pending')}">${l.transaction_type}</span></td>
                <td style="font-weight:800; color:${isEarn ? 'var(--success)' : (isRedeem ? 'var(--danger)' : 'var(--warning)')};">${l.points_change > 0 ? '+' : ''}${l.points_change}</td>
                <td style="font-size:0.85rem;">${l.description || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// 7. Database Reset
async function resetDatabaseConfirm() {
    if (!confirm('⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตฐานข้อมูลเป็นค่าเริ่มต้น? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    const formData = new FormData();
    formData.append('action', 'reset_database');

    const res = await apiRequest('api/admin.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'warning');
        setTimeout(() => window.location.reload(), 1000);
    } else {
        showToast(res.message, 'danger');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminAnalytics();
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
