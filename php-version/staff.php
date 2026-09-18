<?php
// staff.php - Staff Portal
require_once __DIR__ . '/includes/auth.php';
$user = requireLogin(['STAFF', 'ADMIN']);

include __DIR__ . '/includes/header.php';
?>

<div class="staff-portal-container">
    
    <!-- Staff Nav Tabs -->
    <div class="nav-tabs" id="staff-nav-tabs">
        <button class="nav-tab active" onclick="switchStaffTab('queue')">
            <i data-lucide="clipboard-list"></i> คิวออเดอร์หน้าร้าน (<span id="active-orders-count">0</span>)
        </button>
        <button class="nav-tab" onclick="switchStaffTab('scanner')">
            <i data-lucide="scan-line"></i> สแกน QR / ให้แต้ม
        </button>
        <button class="nav-tab" onclick="switchStaffTab('close')">
            <i data-lucide="check-square"></i> รายงานปิดยอดประจำวัน
        </button>
    </div>

    <!-- ==================== TAB 1: KITCHEN ORDER QUEUE ==================== -->
    <div id="staff-tab-queue" class="tab-pane">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 8px;">
                <button class="category-pill active" onclick="filterStaffQueue('ALL', this)">ทั้งหมด</button>
                <button class="category-pill" onclick="filterStaffQueue('Pending', this)">⏳ รอดำเนินการ</button>
                <button class="category-pill" onclick="filterStaffQueue('Preparing', this)">🍹 กำลังปั่น</button>
                <button class="category-pill" onclick="filterStaffQueue('Ready', this)">🎉 พร้อมรับ</button>
            </div>
            <button id="btn-refresh-staff-queue" class="btn btn-outline" style="font-size: 0.85rem; padding: 6px 14px;" onclick="loadStaffQueue(true)">
                🔄 รีเฟรชคิว
            </button>
        </div>

        <div id="staff-orders-queue-list">
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                ⏳ กำลังโหลดคิวออเดอร์...
            </div>
        </div>

    </div>

    <!-- ==================== TAB 2: QR SCANNER & LOYALTY POS ==================== -->
    <div id="staff-tab-scanner" class="tab-pane" style="display: none;">
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            
            <!-- Camera & Scanner Column -->
            <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 20px;">
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--brown); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    📷 สแกน QR Code จากมือถือลูกค้า
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">ส่องกล้องไปที่ QR Code สมาชิกของลูกค้า หรือ QR รับสินค้า</p>

                <!-- Camera Container -->
                <div id="qr-reader" style="width: 100%; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border);"></div>

                <!-- Manual Search Alternative -->
                <div style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                    <label style="font-size: 0.85rem; font-weight: 700; color: var(--brown); margin-bottom: 6px; display: block;">หรือค้นหาด้วยเบอร์โทร / รหัสสมาชิก:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="manual-search-input" class="form-control" placeholder="เช่น 081-234-5678 หรือ CUST001">
                        <button class="btn btn-primary" onclick="lookupMemberManual()">ค้นหา</button>
                    </div>
                </div>
            </div>

            <!-- Customer Result & Actions Column -->
            <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 20px;">
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--brown); margin-bottom: 16px;">
                    👤 ข้อมูลสมาชิกลูกค้า
                </h3>

                <div id="scanned-customer-result" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    ยังไม่ได้สแกนหรือค้นหาลูกค้า<br>
                    <small>โปรดสแกน QR Code หรือกรอกเบอร์โทรศัพท์</small>
                </div>
            </div>

        </div>

    </div>

    <!-- ==================== TAB 3: DAILY SHIFT CLOSING ==================== -->
    <div id="staff-tab-close" class="tab-pane" style="display: none;">
        <div style="max-width: 600px; margin: 0 auto; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 24px; box-shadow: var(--shadow-sm);">
            
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--brown); margin-bottom: 4px;">
                💰 รายงานปิดยอดประจำวัน (Daily Shift Closing)
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">สรุปยอดขาย ประมวลผลจำนวนแก้ว และบันทึกรายงานปิดร้าน</p>

            <form onsubmit="submitShiftClosing(event)">
                <div class="form-group">
                    <label>วันที่ปิดยอด:</label>
                    <input type="date" id="close-date" class="form-control" value="<?= date('Y-m-d') ?>" onchange="calculateShiftStats()">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div style="background: var(--brown-pale); padding: 14px; border-radius: var(--radius-sm);">
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">จำนวนแก้วที่ขายได้</div>
                        <div id="calc-cups-sold" style="font-size: 1.4rem; font-weight: 800; color: var(--brown);">0 แก้ว</div>
                    </div>

                    <div style="background: #fff8e1; padding: 14px; border-radius: var(--radius-sm); border: 1px solid #ffe082;">
                        <div style="font-size: 0.8rem; color: #b78103; font-weight: 700;">จำนวนแก้วแลกฟรี</div>
                        <div id="calc-free-cups" style="font-size: 1.4rem; font-weight: 800; color: #b78103;">0 แก้ว</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>ยอดขายตามระบบ (System Revenue):</label>
                    <input type="number" id="close-system-revenue" class="form-control" readonly style="background: #f5f5f5; font-weight: 800; font-size: 1.1rem; color: var(--primary);">
                </div>

                <div class="form-group">
                    <label>ยอดเงินสด/โอนนับได้จริง (Actual Counted Cash):</label>
                    <input type="number" id="close-cash-actual" class="form-control" required style="font-weight: 800; font-size: 1.1rem;">
                </div>

                <div class="form-group">
                    <label>หมายเหตุเพิ่มเติม (ถ้ามี):</label>
                    <textarea id="close-notes" class="form-control" rows="3" placeholder="เช่น เงินทอนครบ, มีแก้วทดลองชิม 1 แก้ว"></textarea>
                </div>

                <button type="submit" id="btn-submit-closing" class="btn btn-primary btn-block" style="padding: 14px; font-size: 1rem;">
                    ยืนยันและบันทึกรายงานปิดยอด
                </button>
            </form>

        </div>
    </div>

</div>

<script>
let currentStaffQueueFilter = 'ALL';
let html5QrScanner = null;
let currentScannedCustomer = null;

function switchStaffTab(tabName) {
    document.querySelectorAll('#staff-nav-tabs .nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    const target = document.getElementById(`staff-tab-${tabName}`);
    if (target) target.style.display = 'block';

    const tabs = document.querySelectorAll('#staff-nav-tabs .nav-tab');
    if (tabName === 'queue') {
        tabs[0]?.classList.add('active');
        loadStaffQueue();
        stopQrScanner();
    } else if (tabName === 'scanner') {
        tabs[1]?.classList.add('active');
        initQrScanner();
    } else if (tabName === 'close') {
        tabs[2]?.classList.add('active');
        stopQrScanner();
        calculateShiftStats();
    }
}

// 1. Kitchen Queue Management
async function loadStaffQueue(manual = false) {
    const container = document.getElementById('staff-orders-queue-list');
    const refreshBtn = document.getElementById('btn-refresh-staff-queue');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '⏳ กำลังโหลด...';
    }

    const res = await apiRequest('api/orders.php?scope=active');

    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 รีเฟรชคิว';
    }

    if (manual) {
        showToast('🔄 รีเฟรชคิวออเดอร์หน้าร้านเรียบร้อยแล้ว', 'info');
    }

    if (!res.success || !res.data) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">เกิดข้อผิดพลาดในการโหลดคิว</div>';
        return;
    }

    const activeOrders = res.data;
    const badge = document.getElementById('active-orders-count');
    if (badge) badge.textContent = activeOrders.length;

    const filtered = currentStaffQueueFilter === 'ALL' 
        ? activeOrders 
        : activeOrders.filter(o => o.order_status === currentStaffQueueFilter);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border);">✨ ขณะนี้ไม่มีคิวออเดอร์ที่ค้างอยู่</div>';
        return;
    }

    let html = '';
    filtered.forEach(order => {
        let statusClass = 'pending';
        let statusBadge = '⏳ รอดำเนินการ';
        if (order.order_status === 'Preparing') {
            statusClass = 'preparing';
            statusBadge = '🍹 กำลังปั่น';
        } else if (order.order_status === 'Ready') {
            statusClass = 'ready';
            statusBadge = '🎉 พร้อมรับ';
        }

        let itemsHtml = '';
        order.items.forEach(it => {
            const toppings = it.toppings && it.toppings.length > 0 ? ` (+ ${it.toppings.join(', ')})` : '';
            htmlItemsNotes = it.notes ? `<div style="font-size:0.8rem; color:var(--primary); font-weight:700;">📝 ${it.notes}</div>` : '';
            itemsHtml += `
                <div style="padding: 6px 0; border-bottom: 1px dashed var(--border);">
                    <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.95rem;">
                        <span>${it.name} x${it.quantity}</span>
                        <span style="color:var(--brown);">หวาน ${it.sweetness_level}</span>
                    </div>
                    ${toppings ? `<div style="font-size:0.8rem; color:var(--text-muted);">ท็อปปิ้ง: ${it.toppings.join(', ')}</div>` : ''}
                    ${htmlItemsNotes}
                </div>
            `;
        });

        // Status Actions
        let actionButtons = '';
        if (order.order_status === 'Pending') {
            actionButtons = `
                <button class="btn btn-primary" style="font-size:0.85rem; padding:8px 14px;" onclick="updateOrderStatus('${order.id}', 'Preparing')">
                    🍹 เริ่มปั่น
                </button>
            `;
        } else if (order.order_status === 'Preparing') {
            actionButtons = `
                <button class="btn btn-success" style="font-size:0.85rem; padding:8px 14px;" onclick="updateOrderStatus('${order.id}', 'Ready')">
                    🎉 ปั่นเสร็จแล้ว (พร้อมรับ)
                </button>
            `;
        } else if (order.order_status === 'Ready') {
            actionButtons = `
                <button class="btn btn-primary" style="font-size:0.85rem; padding:8px 14px; background:var(--brown);" onclick="updateOrderStatus('${order.id}', 'Completed')">
                    ✅ มอบสินค้าเรียบร้อย (+แต้ม)
                </button>
            `;
        }

        html += `
            <div class="order-queue-card status-${statusClass}">
                <div class="order-queue-header">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:800; font-size:1.15rem; color:var(--brown);">#${order.id}</span>
                            <span class="status-pill ${statusClass}">${statusBadge}</span>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                            👤 ลูกค้า: <strong>${order.customer_name || 'ลูกค้าหน้าร้าน'}</strong> (${order.customer_phone || '-'}) | นัดรับ: <strong>${order.pickup_time || '15 นาที'}</strong>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:1.1rem; font-weight:800; color:var(--primary);">
                            ${order.is_redeemed_free_cup ? '🎁 แลกฟรี 1 แก้ว' : '฿' + parseFloat(order.total_price).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div class="order-queue-items">${itemsHtml}</div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    ${actionButtons}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function filterStaffQueue(status, btn) {
    currentStaffQueueFilter = status;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadStaffQueue();
}

async function updateOrderStatus(orderId, newStatus) {
    const formData = new FormData();
    formData.append('action', 'update_status');
    formData.append('order_id', orderId);
    formData.append('order_status', newStatus);

    const res = await apiRequest('api/orders.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        loadStaffQueue();
    } else {
        showToast(res.message, 'danger');
    }
}

// 2. QR Camera Scanner & Manual Lookup
function initQrScanner() {
    if (html5QrScanner) return;

    if (typeof Html5QrcodeScanner === 'undefined') {
        document.getElementById('qr-reader').innerHTML = '<div style="padding:20px; text-align:center;">โหลด Scanner ไม่สำเร็จ โปรดรีเฟรชหน้าเว็บ</div>';
        return;
    }

    html5QrScanner = new Html5QrcodeScanner("qr-reader", { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true
    });

    html5QrScanner.render((decodedText) => {
        handleQrDecoded(decodedText);
    }, (error) => {
        // scan progress / no qr found in frame
    });
}

function stopQrScanner() {
    if (html5QrScanner) {
        try {
            html5QrScanner.clear();
        } catch (e) {}
        html5QrScanner = null;
    }
}

function handleQrDecoded(decodedText) {
    showToast(`สแกน QR: ${decodedText}`, 'info');
    lookupCustomerData(decodedText);
}

function lookupMemberManual() {
    const q = document.getElementById('manual-search-input').value.trim();
    if (!q) {
        showToast('กรุณากรอกเบอร์โทรหรือรหัสสมาชิก', 'warning');
        return;
    }
    lookupCustomerData(q);
}

async function lookupCustomerData(query) {
    const container = document.getElementById('scanned-customer-result');
    container.innerHTML = '<div style="padding:30px; text-align:center;">⏳ กำลังดึงข้อมูลสมาชิก...</div>';

    const res = await apiRequest(`api/loyalty.php?action=lookup&q=${encodeURIComponent(query)}`);
    if (res.success && res.data) {
        currentScannedCustomer = res.data;
        renderCustomerResult(res.data);
    } else {
        container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--danger);">${res.message || 'ไม่พบข้อมูลสมาชิก'}</div>`;
    }
}

function renderCustomerResult(customer) {
    const container = document.getElementById('scanned-customer-result');
    const pts = parseInt(customer.current_points || 0, 10);
    const canRedeem = pts >= 10;

    let stampsHtml = '';
    for (let i = 1; i <= 10; i++) {
        const isStamped = i <= pts;
        const isFree = i === 10;
        stampsHtml += `
            <div class="stamp-slot ${isStamped ? 'stamped' : ''} ${isFree ? 'free-slot' : ''}" style="width:28px; height:28px; font-size:0.65rem;">
                ${isStamped ? '🍹' : (isFree ? '🎁' : i)}
            </div>
        `;
    }

    container.innerHTML = `
        <div style="text-align: left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                <div>
                    <h4 style="font-size:1.15rem; font-weight:800; color:var(--brown);">${customer.full_name}</h4>
                    <div style="font-size:0.8rem; color:var(--text-muted);">รหัส: <strong>${customer.member_code || '-'}</strong> | โทร: <strong>${customer.phone || '-'}</strong></div>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:1.5rem; font-weight:800; color:var(--primary);">${pts}</span>
                    <span style="font-size:0.8rem; color:var(--text-muted);">/ 10 แต้ม</span>
                </div>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:20px; justify-content:center;">
                ${stampsHtml}
            </div>

            <!-- Action: Award Points -->
            <div style="margin-bottom:16px;">
                <label style="font-size:0.85rem; font-weight:700; color:var(--brown); display:block; margin-bottom:6px;">
                    ➕ เพิ่มแต้มสะสม (1 แก้ว = 1 แต้ม):
                </label>
                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
                    <button class="btn btn-outline" style="padding:10px;" onclick="awardPoints('${customer.id}', 1)">+1 แก้ว</button>
                    <button class="btn btn-outline" style="padding:10px;" onclick="awardPoints('${customer.id}', 2)">+2 แก้ว</button>
                    <button class="btn btn-outline" style="padding:10px;" onclick="awardPoints('${customer.id}', 3)">+3 แก้ว</button>
                    <button class="btn btn-outline" style="padding:10px;" onclick="awardPoints('${customer.id}', 5)">+5 แก้ว</button>
                </div>
            </div>

            <!-- Action: Redeem Free Drink -->
            <button class="btn btn-success btn-block" ${!canRedeem ? 'disabled style="opacity:0.5;"' : ''} style="padding:12px;" onclick="redeemFreeDrink('${customer.id}')">
                🎁 แลกรับเครื่องดื่มฟรี 1 แก้ว (หัก 10 แต้ม)
            </button>
        </div>
    `;
}

async function awardPoints(customerId, cups) {
    const formData = new FormData();
    formData.append('action', 'award_points');
    formData.append('customer_id', customerId);
    formData.append('cups', cups);

    const res = await apiRequest('api/loyalty.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        lookupCustomerData(customerId);
    } else {
        showToast(res.message, 'danger');
    }
}

async function redeemFreeDrink(customerId) {
    if (!confirm('ยืนยันการใช้สิทธิ์แลกเครื่องดื่มฟรี 1 แก้ว (หัก 10 แต้ม) หรือไม่?')) return;

    const formData = new FormData();
    formData.append('action', 'redeem_free_cup');
    formData.append('customer_id', customerId);

    const res = await apiRequest('api/loyalty.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        lookupCustomerData(customerId);
    } else {
        showToast(res.message, 'danger');
    }
}

// 3. Shift Closing Stats Calculation
async function calculateShiftStats() {
    const date = document.getElementById('close-date').value;
    const resOrders = await apiRequest('api/orders.php');

    let cups = 0;
    let freeCups = 0;
    let rev = 0;

    if (resOrders.success && resOrders.data) {
        const todayOrders = resOrders.data.filter(o => o.order_status === 'Completed' && o.created_at.startsWith(date));
        todayOrders.forEach(o => {
            rev += parseFloat(o.total_price || 0);
            if (o.is_redeemed_free_cup) freeCups++;
            o.items.forEach(it => { cups += parseInt(it.quantity || 1, 10); });
        });
    }

    document.getElementById('calc-cups-sold').textContent = `${cups} แก้ว`;
    document.getElementById('calc-free-cups').textContent = `${freeCups} แก้ว`;
    document.getElementById('close-system-revenue').value = rev;
    document.getElementById('close-cash-actual').value = rev;
}

async function submitShiftClosing(e) {
    e.preventDefault();
    const date = document.getElementById('close-date').value;
    const systemRev = parseFloat(document.getElementById('close-system-revenue').value || 0);
    const cashActual = parseFloat(document.getElementById('close-cash-actual').value || 0);
    const notes = document.getElementById('close-notes').value.trim();

    if (!confirm(`ยืนยันการบันทึกรายงานปิดยอดวันที่ ${date} ยอดเงินสดนับได้ ฿${cashActual.toLocaleString()} ใช่หรือไม่?`)) return;

    const formData = new FormData();
    formData.append('action', 'close_shift');
    formData.append('date', date);
    formData.append('cups_sold', parseInt(document.getElementById('calc-cups-sold').textContent, 10) || 0);
    formData.append('free_cups_redeemed', parseInt(document.getElementById('calc-free-cups').textContent, 10) || 0);
    formData.append('total_revenue', systemRev);
    formData.append('cash_actual', cashActual);
    formData.append('notes', notes);

    const btn = document.getElementById('btn-submit-closing');
    btn.disabled = true;

    const res = await apiRequest('api/staff.php', { method: 'POST', body: formData });
    btn.disabled = false;

    if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('close-notes').value = '';
    } else {
        showToast(res.message, 'danger');
    }
}

// Polling queue every 5 seconds
setInterval(() => {
    const queueTab = document.getElementById('staff-tab-queue');
    if (queueTab && queueTab.style.display !== 'none') {
        loadStaffQueue();
    }
}, 5000);

document.addEventListener('DOMContentLoaded', () => {
    loadStaffQueue();
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
