<?php
// customer.php - Customer Portal
require_once __DIR__ . '/includes/auth.php';
$user = requireLogin('CUSTOMER');

$pdo = getDB();

// Fetch Menu Items
$stmtMenu = $pdo->query("SELECT * FROM menu_items ORDER BY category ASC, total_sold_count DESC");
$menuItems = $stmtMenu->fetchAll();

// Filter Best Sellers (Smoothies & drinks)
$drinkItems = array_filter($menuItems, function($i) {
    return in_array($i['category'], ['Smoothie', 'Iced', 'Hot']);
});
$toppings = array_filter($menuItems, function($i) {
    return $i['category'] === 'Topping' && $i['is_available'];
});

usort($drinkItems, function($a, $b) {
    return $b['total_sold_count'] - $a['total_sold_count'];
});
$bestSellers = array_slice($drinkItems, 0, 5);

include __DIR__ . '/includes/header.php';
?>

<div class="customer-portal-container">
    
    <!-- Top Nav Tabs -->
    <div class="nav-tabs" id="customer-nav-tabs">
        <button class="nav-tab active" onclick="switchCustomerTab('menu')">
            <i data-lucide="coffee"></i> เมนูเครื่องดื่ม
        </button>
        <button class="nav-tab" onclick="switchCustomerTab('orders')">
            <i data-lucide="clock"></i> ติดตามออเดอร์
        </button>
        <button class="nav-tab" onclick="switchCustomerTab('card')">
            <i data-lucide="award"></i> บัตรสะสมแต้ม
        </button>
        <button class="nav-tab" onclick="switchCustomerTab('history')">
            <i data-lucide="file-text"></i> ประวัติแต้ม
        </button>
    </div>

    <!-- ==================== TAB 1: MENU & ORDERING ==================== -->
    <div id="tab-content-menu" class="tab-pane">
        
        <!-- Member Points Quick Banner -->
        <div style="background: var(--brown-pale); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem;">🎁</span>
                <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--brown);">แต้มสะสมของคุณ: <strong style="color: var(--primary); font-size: 1.1rem;"><?= (int)$user['current_points'] ?> / 10</strong> แต้ม</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        <?= $user['current_points'] >= 10 ? '🎉 คุณมีสิทธิ์แลกเครื่องดื่มฟรี 1 แก้วได้เลย!' : 'สะสมครบ 10 แต้ม แลกรับเครื่องดื่มฟรี 1 แก้ว' ?>
                    </div>
                </div>
            </div>
            <button class="btn btn-outline" style="font-size: 0.8rem; padding: 6px 12px; background: #fff;" onclick="switchCustomerTab('card')">
                ดูบัตรสมาชิก
            </button>
        </div>

        <!-- 5 Best Sellers Carousel / List -->
        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--brown); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                🔥 5 เมนูขายดีประจำร้าน
            </h3>
            <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;">
                <?php foreach ($bestSellers as $b): ?>
                    <div style="min-width: 150px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border); padding: 12px; text-align: center; cursor: pointer; flex-shrink: 0;" onclick='openCustomizer(<?= json_encode($b) ?>)'>
                        <div style="font-size: 2.2rem;"><?= $b['image_url'] ?: '🥤' ?></div>
                        <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 4px 0;"><?= htmlspecialchars($b['name']) ?></div>
                        <div style="font-size: 0.9rem; font-weight: 800; color: var(--primary);">฿<?= number_format($b['base_price'], 0) ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Category Filter Pills -->
        <div class="category-pills">
            <button class="category-pill active" onclick="filterCategory('ALL', this)">🍹 ทั้งหมด</button>
            <button class="category-pill" onclick="filterCategory('Smoothie', this)">🍊 ผลไม้ปั่น (Smoothie)</button>
            <button class="category-pill" onclick="filterCategory('Iced', this)">🧋 เครื่องดื่มเย็น (Iced)</button>
            <button class="category-pill" onclick="filterCategory('Hot', this)">☕ เครื่องดื่มร้อน (Hot)</button>
        </div>

        <!-- Menu Grid -->
        <div class="menu-grid" id="menu-grid-container">
            <?php foreach ($drinkItems as $item): ?>
                <div class="menu-card <?= !$item['is_available'] ? 'out-of-stock' : '' ?>" data-category="<?= htmlspecialchars($item['category']) ?>">
                    <?php if ($item['is_popular']): ?>
                        <div class="menu-badge-popular">🔥 ยอดนิยม</div>
                    <?php endif; ?>
                    <div class="menu-emoji"><?= $item['image_url'] ?: '🥤' ?></div>
                    <div>
                        <div class="menu-title"><?= htmlspecialchars($item['name']) ?></div>
                        <div class="menu-price">฿<?= number_format($item['base_price'], 0) ?></div>
                    </div>
                    <button class="btn-order-add" <?= !$item['is_available'] ? 'disabled' : '' ?> onclick='openCustomizer(<?= json_encode($item) ?>)'>
                        <?= $item['is_available'] ? '➕ สั่งเครื่องดื่ม' : '❌ สินค้าหมดชั่วคราว' ?>
                    </button>
                </div>
            <?php endforeach; ?>
        </div>

    </div>

    <!-- ==================== TAB 2: ORDER TRACKING ==================== -->
    <div id="tab-content-orders" class="tab-pane" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">📋 รายการสั่งซื้อของคุณ</h3>
            <button id="btn-refresh-customer-orders" class="btn btn-outline" style="font-size: 0.8rem; padding: 4px 10px;" onclick="loadCustomerOrders(true)">
                🔄 รีเฟรชคิว
            </button>
        </div>

        <div id="customer-orders-list">
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                ⏳ กำลังโหลดรายการสั่งซื้อ...
            </div>
        </div>
    </div>

    <!-- ==================== TAB 3: DIGITAL STAMP CARD ==================== -->
    <div id="tab-content-card" class="tab-pane" style="display: none;">
        
        <!-- 10-Slot Stamp Card -->
        <div class="stamp-card-container">
            <div class="stamp-card-header">
                <div>
                    <h2>บัตรสะสมแต้มดิจิทัล 10 แก้ว</h2>
                    <p>สะสม 1 แก้ว = 1 แต้ม (ครบ 10 แต้ม ฟรี 1 แก้ว)</p>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 1.5rem; font-weight: 800; color: #ffd700;"><?= (int)$user['current_points'] ?></span>
                    <span style="font-size: 0.9rem; color: #fff;">/ 10</span>
                </div>
            </div>

            <!-- Stamp Slots -->
            <div class="stamp-grid">
                <?php for ($i = 1; $i <= 10; $i++): 
                    $isStamped = $i <= $user['current_points'];
                    $isFree = $i === 10;
                ?>
                    <div class="stamp-slot <?= $isStamped ? 'stamped' : '' ?> <?= $isFree ? 'free-slot' : '' ?>">
                        <?php if ($isStamped): ?>
                            <span style="font-size: 1.4rem;">🍹</span>
                        <?php else: ?>
                            <span><?= $isFree ? '🎁 ฟรี!' : $i ?></span>
                        <?php endif; ?>
                    </div>
                <?php endfor; ?>
            </div>

            <div style="font-size: 0.8rem; text-align: center; color: #e0d0c5;">
                <?php if ($user['current_points'] >= 10): ?>
                    🎉 <strong>ยินดีด้วย!</strong> คุณสะสมครบ 10 แต้มแล้ว สามารถกดใช้สิทธิ์แลกฟรีในหน้าสั่งซื้อ หรือยื่น QR หน้าร้านได้ทันที
                <?php else: ?>
                    ขาดอีก <strong><?= 10 - ($user['current_points'] % 10) ?> แต้ม</strong> จะได้รับสิทธิ์แลกเครื่องดื่มฟรี 1 แก้ว
                <?php endif; ?>
            </div>
        </div>

        <!-- Member QR Code for Counter Scan -->
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 24px; text-align: center; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
            <h4 style="font-size: 1rem; font-weight: 800; color: var(--brown); margin-bottom: 4px;">QR Code สมาชิกสำหรับสะสมแต้มหน้าร้าน</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">ยื่น QR Code นี้ให้พนักงานสแกนเมื่อซื้อเครื่องดื่มที่หน้าร้าน</p>
            
            <div id="member-qr-code-box" style="display: inline-block; padding: 12px; background: #fff; border: 2px solid var(--border); border-radius: var(--radius-md);"></div>
            
            <div style="margin-top: 12px; font-size: 0.9rem; font-weight: 700; color: var(--brown);">
                รหัสสมาชิก: <span style="color: var(--primary); font-family: monospace;"><?= htmlspecialchars($user['member_code'] ?: 'CUST001') ?></span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
                เบอร์โทรศัพท์: <?= htmlspecialchars($user['phone'] ?: '-') ?>
            </div>
        </div>

    </div>

    <!-- ==================== TAB 4: POINTS HISTORY ==================== -->
    <div id="tab-content-history" class="tab-pane" style="display: none;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown); margin-bottom: 16px;">📜 ประวัติการสะสมและแลกแต้ม</h3>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>วันที่ / เวลา</th>
                        <th>ประเภท</th>
                        <th>แต้ม</th>
                        <th>รายละเอียด</th>
                    </tr>
                </thead>
                <tbody id="customer-transactions-tbody">
                    <tr><td colspan="4" style="text-align:center;">กำลังโหลดประวัติ...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- Floating Cart Bar -->
<div id="floating-cart-bar" class="floating-cart-bar" style="display: none;" onclick="openCartModal()">
    <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">🛒</span>
        <div>
            <div style="font-weight: 800; font-size: 0.95rem;">ตะกร้าเครื่องดื่ม (<span id="cart-total-count">0</span> แก้ว)</div>
            <div style="font-size: 0.75rem; color: #d1b8ab;">กดเพื่อดูรายละเอียดและสั่งซื้อ</div>
        </div>
    </div>
    <div style="font-weight: 800; font-size: 1.15rem; color: var(--primary-light);">
        ฿<span id="cart-total-price">0</span> ➔
    </div>
</div>

<!-- Drink Customizer Modal -->
<div id="customizer-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span id="customizer-item-emoji" style="font-size: 2rem;">🥤</span>
                <div>
                    <h3 id="customizer-item-name" style="font-size: 1.1rem; font-weight: 800; color: var(--brown);">ชื่อเมนู</h3>
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary);">฿<span id="customizer-base-price">0</span></div>
                </div>
            </div>
            <button class="modal-close" onclick="closeCustomizer()">&times;</button>
        </div>

        <!-- 1. Sweetness Selection -->
        <div style="margin-bottom: 20px;">
            <label style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; display: block;">ระดับความหวาน (Sweetness Level):</label>
            <div class="sweetness-grid">
                <?php 
                $sweetOptions = ['0%', '25%', '50%', '100%', '125%'];
                foreach ($sweetOptions as $s): ?>
                    <button type="button" class="sweetness-pill <?= $s === '100%' ? 'active' : '' ?>" data-sweetness="<?= $s ?>" onclick="selectSweetness('<?= $s ?>')">
                        <input type="radio" name="sweetness" value="<?= $s ?>" <?= $s === '100%' ? 'checked' : '' ?> style="display: none;">
                        <span><?= $s ?></span>
                    </button>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- 2. Topping Selection -->
        <div style="margin-bottom: 20px;">
            <label style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; display: block;">เพิ่มท็อปปิ้ง (+10 บาท/อย่าง):</label>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <?php foreach ($toppings as $top): ?>
                    <label class="topping-card-option">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600;">
                            <input type="checkbox" class="chk-topping" value="<?= htmlspecialchars($top['name']) ?>" onchange="updateCustomizerTotal()">
                            <span><?= $top['image_url'] ?> <?= htmlspecialchars($top['name']) ?></span>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">+฿10</span>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- 3. Notes -->
        <div style="margin-bottom: 20px;">
            <label style="font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; display: block;">หมายเหตุเพิ่มเติม (ถ้ามี):</label>
            <input type="text" id="customizer-notes" class="form-control" placeholder="เช่น หวานน้อยพิเศษ, แยกน้ำแข็ง">
        </div>

        <!-- 4. Quantity Selector -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 12px; background: var(--brown-pale); border-radius: var(--radius-md);">
            <span style="font-weight: 700; font-size: 0.9rem;">จำนวน (แก้ว):</span>
            <div style="display: flex; align-items: center; gap: 12px;">
                <button type="button" class="btn btn-outline" style="width: 34px; height: 34px; padding: 0; font-size: 1.2rem;" onclick="adjustQuantity(-1)">-</button>
                <span id="customizer-quantity" style="font-weight: 800; font-size: 1.2rem; min-width: 24px; text-align: center;">1</span>
                <button type="button" class="btn btn-outline" style="width: 34px; height: 34px; padding: 0; font-size: 1.2rem;" onclick="adjustQuantity(1)">+</button>
            </div>
        </div>

        <button type="button" class="btn btn-primary btn-block" style="padding: 14px;" onclick="confirmAddToCart()">
            ใส่ตะกร้า (฿<span id="customizer-total-price">0</span>)
        </button>
    </div>
</div>

<!-- Cart & Checkout Modal -->
<div id="cart-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--brown);">🛒 รายการในตะกร้า (<span id="modal-cart-total-cups">0</span> แก้ว)</h3>
            <button class="modal-close" onclick="closeCartModal()">&times;</button>
        </div>

        <div id="cart-items-container" style="max-height: 250px; overflow-y: auto; margin-bottom: 16px;"></div>

        <!-- Pickup Time Selection -->
        <div class="form-group">
            <label>เวลานัดรับเครื่องดื่ม:</label>
            <select id="order-pickup-time" class="form-control">
                <option value="10 นาที">ภายใน 10 นาที</option>
                <option value="15 นาที" selected>ภายใน 15 นาที</option>
                <option value="20 นาที">ภายใน 20 นาที</option>
                <option value="30 นาที">ภายใน 30 นาที</option>
            </select>
        </div>

        <!-- Free Drink Redemption Option -->
        <div id="redeem-free-cup-container" style="display: none; background: #fff8e1; border: 1px solid #ffe082; border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 700; color: #b78103;">
                <input type="checkbox" id="chk-redeem-free-cup" onchange="toggleRedeemFreeCup(this)">
                <span>🎁 ใช้สิทธิ์แลกเครื่องดื่มฟรี 1 แก้ว (หัก 10 แต้ม)</span>
            </label>
        </div>

        <!-- Summary -->
        <div style="border-top: 1px dashed var(--border); padding-top: 12px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; color: var(--brown);">
                <span>ยอดรวมทั้งสิ้น:</span>
                <span style="color: var(--primary);">฿<span id="modal-cart-total-price">0</span></span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">* ชำระเงินผ่าน PromptPay หรือเงินสดตอนรับสินค้าที่ร้าน</div>
        </div>

        <button type="button" id="btn-confirm-order" class="btn btn-primary btn-block" style="padding: 14px;" onclick="submitOrder()">
            ยืนยันสั่งซื้อ
        </button>
    </div>
</div>

<!-- Order QR Popup Modal -->
<div id="order-qr-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content" style="text-align: center;">
        <div class="modal-header">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--brown);">QR Code สำหรับรับเครื่องดื่ม</h3>
            <button class="modal-close" onclick="document.getElementById('order-qr-modal').style.display='none'">&times;</button>
        </div>
        <div id="order-pickup-qr-box" style="margin: 20px auto; display: inline-block; padding: 12px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);"></div>
        <div id="order-pickup-qr-id" style="font-weight: 800; color: var(--primary); font-size: 1.1rem; font-family: monospace;"></div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">แสดง QR นี้ให้พนักงานเพื่อรับเครื่องดื่มและสะสมแต้ม</p>
    </div>
</div>

<script>
// Customer Tabs Handler
function switchCustomerTab(tabName) {
    document.querySelectorAll('#customer-nav-tabs .nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    const targetTab = document.getElementById(`tab-content-${tabName}`);
    if (targetTab) targetTab.style.display = 'block';

    const buttons = document.querySelectorAll('#customer-nav-tabs .nav-tab');
    if (tabName === 'menu') buttons[0]?.classList.add('active');
    if (tabName === 'orders') {
        buttons[1]?.classList.add('active');
        loadCustomerOrders();
    }
    if (tabName === 'card') {
        buttons[2]?.classList.add('active');
        generateQrCodeElement('member-qr-code-box', '<?= $user['member_code'] ?: $user['id'] ?>', 160);
    }
    if (tabName === 'history') {
        buttons[3]?.classList.add('active');
        loadCustomerTransactions();
    }
}

// Category filter
function filterCategory(cat, btn) {
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.menu-card').forEach(card => {
        if (cat === 'ALL' || card.getAttribute('data-category') === cat) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Redeem Checkbox UI Toggle
function toggleRedeemFreeCup(chk) {
    const totalElem = document.getElementById('modal-cart-total-price');
    if (chk.checked) {
        totalElem.textContent = '0 (ใช้สิทธิ์ฟรี)';
    } else {
        totalElem.textContent = window.cartManager.getTotalPrice().toLocaleString();
    }
}

// Fetch Customer Orders
async function loadCustomerOrders(manual = false) {
    const container = document.getElementById('customer-orders-list');
    const refreshBtn = document.getElementById('btn-refresh-customer-orders');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '⏳ กำลังโหลด...';
    }

    const res = await apiRequest('api/orders.php');

    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 รีเฟรชคิว';
    }

    if (manual) {
        showToast('🔄 รีเฟรชข้อมูลคิวล่าสุดเรียบร้อยแล้ว', 'info');
    }

    if (!res.success || !res.data || res.data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">คุณยังไม่มีประวัติการสั่งซื้อ</div>';
        return;
    }

    let html = '';
    res.data.forEach(order => {
        const isCompleted = order.order_status === 'Completed';
        const isCancelled = order.order_status === 'Cancelled';
        const isPending = order.order_status === 'Pending';

        let statusClass = 'pending';
        let statusText = '⏳ รอดำเนินการ';
        if (order.order_status === 'Preparing') {
            statusClass = 'preparing';
            statusText = '🍹 กำลังปั่นเครื่องดื่ม';
        } else if (order.order_status === 'Ready') {
            statusClass = 'ready';
            statusText = '🎉 พร้อมรับเครื่องดื่มแล้ว!';
        } else if (isCompleted) {
            statusClass = 'completed';
            statusText = '✅ รับสินค้าเรียบร้อย';
        } else if (isCancelled) {
            statusClass = 'cancelled';
            statusText = '❌ ยกเลิกแล้ว';
        }

        let itemsHtml = '';
        order.items.forEach(it => {
            const toppings = it.toppings && it.toppings.length > 0 ? ` (+ ${it.toppings.join(', ')})` : '';
            itemsHtml += `
                <div class="order-queue-item-row">
                    <span>${it.name} x${it.quantity} <span style="font-size:0.75rem; color:var(--text-muted);">(หวาน ${it.sweetness_level}${toppings})</span></span>
                    <span style="font-weight:700;">฿${parseFloat(it.subtotal_price).toLocaleString()}</span>
                </div>
            `;
        });

        html += `
            <div class="order-queue-card status-${statusClass}">
                <div class="order-queue-header">
                    <div>
                        <span style="font-weight:800; font-size:1rem; color:var(--brown);">#${order.id}</span>
                        <div style="font-size:0.75rem; color:var(--text-muted);">เวลานัดรับ: ${order.pickup_time || '15 นาที'}</div>
                    </div>
                    <span class="status-pill ${statusClass}">${statusText}</span>
                </div>

                <div class="order-queue-items">${itemsHtml}</div>

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border); padding-top:10px;">
                    <div>
                        <span style="font-size:0.85rem; color:var(--text-muted);">ยอดรวม: </span>
                        <strong style="font-size:1.05rem; color:var(--primary);">${order.is_redeemed_free_cup ? '🎁 แลกฟรี' : '฿' + parseFloat(order.total_price).toLocaleString()}</strong>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" style="font-size:0.8rem; padding:4px 10px;" onclick="showOrderQr('${order.id}')">
                            📱 QR รับสินค้า
                        </button>
                        ${isPending ? `
                            <button class="btn btn-danger" style="font-size:0.8rem; padding:4px 10px;" onclick="cancelOrder('${order.id}')">
                                ยกเลิก
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showOrderQr(orderId) {
    document.getElementById('order-pickup-qr-id').textContent = '#' + orderId;
    generateQrCodeElement('order-pickup-qr-box', orderId, 160);
    document.getElementById('order-qr-modal').style.display = 'flex';
}

async function cancelOrder(orderId) {
    if (!confirm(`คุณต้องการยกเลิกออเดอร์ #${orderId} ใช่หรือไม่?`)) return;

    const formData = new FormData();
    formData.append('action', 'cancel');
    formData.append('order_id', orderId);

    const res = await apiRequest('api/orders.php', { method: 'POST', body: formData });
    if (res.success) {
        showToast(res.message, 'success');
        loadCustomerOrders();
    } else {
        showToast(res.message, 'danger');
    }
}

// Fetch Customer Transactions
async function loadCustomerTransactions() {
    const tbody = document.getElementById('customer-transactions-tbody');
    const res = await apiRequest('api/loyalty.php?action=my_transactions');

    if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">ไม่มีประวัติการทำรายการ</td></tr>';
        return;
    }

    let html = '';
    res.data.forEach(t => {
        const isEarn = t.transaction_type === 'EARN';
        const isRedeem = t.transaction_type === 'REDEEM';
        const sign = t.points_change > 0 ? '+' : '';
        const color = isEarn ? 'var(--success)' : (isRedeem ? 'var(--danger)' : 'var(--warning)');

        html += `
            <tr>
                <td style="font-size:0.8rem; color:var(--text-muted);">${t.created_at}</td>
                <td><span class="status-pill ${isEarn ? 'ready' : (isRedeem ? 'cancelled' : 'pending')}">${t.transaction_type}</span></td>
                <td style="font-weight:800; color:${color};">${sign}${t.points_change}</td>
                <td style="font-size:0.85rem;">${t.description || '-'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Auto-polling orders every 6 seconds when orders tab is active
setInterval(() => {
    const ordersTab = document.getElementById('tab-content-orders');
    if (ordersTab && ordersTab.style.display !== 'none') {
        loadCustomerOrders();
    }
}, 6000);

// Initialize QR code on load
document.addEventListener('DOMContentLoaded', () => {
    generateQrCodeElement('member-qr-code-box', '<?= $user['member_code'] ?: $user['id'] ?>', 160);
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
