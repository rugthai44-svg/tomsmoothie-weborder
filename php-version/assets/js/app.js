// assets/js/app.js - TomSmoothie Client-Side Logic

// 1. Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// 2. Global AJAX Helper
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
        return { success: false, message: error.message };
    }
}

// 3. Cart State Management
class CartManager {
    constructor() {
        this.STORAGE_KEY = 'tomsmoothie_cart';
        this.cart = this.loadCart();
        this.updateUI();
    }

    loadCart() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    saveCart() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cart));
        this.updateUI();
    }

    addItem(item) {
        this.cart.push(item);
        this.saveCart();
        showToast('เพิ่มเครื่องดื่มลงตะกร้าแล้ว!', 'success');
    }

    removeItem(index) {
        this.cart.splice(index, 1);
        this.saveCart();
        this.renderCartModal();
    }

    clear() {
        this.cart = [];
        this.saveCart();
    }

    getTotalPrice() {
        return this.cart.reduce((sum, it) => sum + (it.subtotal_price || 0), 0);
    }

    getTotalCups() {
        return this.cart.reduce((sum, it) => sum + (it.quantity || 1), 0);
    }

    updateUI() {
        const floatingBar = document.getElementById('floating-cart-bar');
        const cartCountBadge = document.getElementById('cart-total-count');
        const cartPriceBadge = document.getElementById('cart-total-price');

        const cups = this.getTotalCups();
        const price = this.getTotalPrice();

        if (cartCountBadge) cartCountBadge.textContent = cups;
        if (cartPriceBadge) cartPriceBadge.textContent = price.toLocaleString();

        if (floatingBar) {
            floatingBar.style.display = cups > 0 ? 'flex' : 'none';
        }
    }

    renderCartModal() {
        const container = document.getElementById('cart-items-container');
        const totalElem = document.getElementById('modal-cart-total-price');
        const countElem = document.getElementById('modal-cart-total-cups');
        const redeemRow = document.getElementById('redeem-free-cup-container');

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--text-muted);">🛒 ตะกร้าของคุณว่างเปล่า</div>';
            if (totalElem) totalElem.textContent = '0';
            if (countElem) countElem.textContent = '0';
            if (redeemRow) redeemRow.style.display = 'none';
            return;
        }

        let html = '';
        this.cart.forEach((it, idx) => {
            const toppingText = it.toppings && it.toppings.length > 0 ? ` + ${it.toppings.join(', ')}` : '';
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.95rem;">${it.name} x${it.quantity}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">หวาน ${it.sweetness_level}${toppingText}</div>
                        ${it.notes ? `<div style="font-size: 0.75rem; color: var(--primary);">📝 ${it.notes}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-weight: 800; color: var(--brown);">฿${it.subtotal_price.toLocaleString()}</span>
                        <button onclick="window.cartManager.removeItem(${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.1rem;">🗑️</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (totalElem) totalElem.textContent = this.getTotalPrice().toLocaleString();
        if (countElem) countElem.textContent = this.getTotalCups();

        // Check if free cup eligible
        if (redeemRow) {
            const userPoints = parseInt(document.getElementById('header-user-points')?.textContent || '0', 10);
            if (userPoints >= 10 && this.getTotalCups() === 1) {
                redeemRow.style.display = 'block';
            } else {
                redeemRow.style.display = 'none';
                const redeemCheckbox = document.getElementById('chk-redeem-free-cup');
                if (redeemCheckbox) redeemCheckbox.checked = false;
            }
        }
    }
}

// Global cart instance
window.cartManager = new CartManager();

// 4. Customizer Modal Logic
let currentCustomizingItem = null;
let selectedSweetness = '100%';
let selectedToppings = [];
let customQuantity = 1;

function openCustomizer(item) {
    if (!item.is_available) {
        showToast('ขออภัย รายการนี้สินค้าหมดชั่วคราว', 'danger');
        return;
    }

    currentCustomizingItem = item;
    selectedSweetness = '100%';
    selectedToppings = [];
    customQuantity = 1;

    document.getElementById('customizer-item-name').textContent = item.name;
    document.getElementById('customizer-item-emoji').textContent = item.image_url || '🥤';
    document.getElementById('customizer-base-price').textContent = item.base_price;
    document.getElementById('customizer-quantity').textContent = '1';
    document.getElementById('customizer-notes').value = '';

    // Reset Sweetness Radios
    selectSweetness('100%');

    // Reset Toppings Checkboxes
    document.querySelectorAll('.chk-topping').forEach(chk => {
        chk.checked = false;
        chk.closest('.topping-card-option')?.classList.remove('active');
    });

    updateCustomizerTotal();
    document.getElementById('customizer-modal').style.display = 'flex';
}

function closeCustomizer() {
    document.getElementById('customizer-modal').style.display = 'none';
    currentCustomizingItem = null;
}

function selectSweetness(level) {
    selectedSweetness = level;
    document.querySelectorAll('input[name="sweetness"]').forEach(radio => {
        radio.checked = radio.value === level;
    });
    document.querySelectorAll('.sweetness-pill').forEach(pill => {
        if (pill.getAttribute('data-sweetness') === level) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    updateCustomizerTotal();
}

function updateCustomizerTotal() {
    if (!currentCustomizingItem) return;

    selectedSweetness = document.querySelector('input[name="sweetness"]:checked')?.value || selectedSweetness || '100%';
    selectedToppings = [];
    document.querySelectorAll('.chk-topping').forEach(chk => {
        const parentCard = chk.closest('.topping-card-option');
        if (chk.checked) {
            selectedToppings.push(chk.value);
            parentCard?.classList.add('active');
        } else {
            parentCard?.classList.remove('active');
        }
    });

    const singlePrice = parseFloat(currentCustomizingItem.base_price) + (selectedToppings.length * 10);
    const totalPrice = singlePrice * customQuantity;

    const totalElem = document.getElementById('customizer-total-price');
    if (totalElem) totalElem.textContent = totalPrice.toLocaleString();
}

function adjustQuantity(delta) {
    customQuantity = Math.max(1, customQuantity + delta);
    document.getElementById('customizer-quantity').textContent = customQuantity;
    updateCustomizerTotal();
}

function confirmAddToCart() {
    if (!currentCustomizingItem) return;

    const singlePrice = parseFloat(currentCustomizingItem.base_price) + (selectedToppings.length * 10);
    const notes = document.getElementById('customizer-notes').value.trim();

    const cartItem = {
        menu_id: currentCustomizingItem.id,
        name: currentCustomizingItem.name,
        base_price: currentCustomizingItem.base_price,
        sweetness_level: selectedSweetness,
        toppings: [...selectedToppings],
        quantity: customQuantity,
        notes: notes,
        subtotal_price: singlePrice * customQuantity
    };

    window.cartManager.addItem(cartItem);
    closeCustomizer();
}

// 5. Checkout & Order Submission
function openCartModal() {
    window.cartManager.renderCartModal();
    document.getElementById('cart-modal').style.display = 'flex';
}

function closeCartModal() {
    document.getElementById('cart-modal').style.display = 'none';
}

async function submitOrder() {
    if (window.cartManager.cart.length === 0) {
        showToast('กรุณาเลือกเครื่องดื่มลงตะกร้าก่อนสั่งซื้อ', 'warning');
        return;
    }

    const pickupTime = document.getElementById('order-pickup-time')?.value || '15 นาที';
    const isRedeemed = document.getElementById('chk-redeem-free-cup')?.checked || false;

    const formData = new FormData();
    formData.append('action', 'create');
    formData.append('items', JSON.stringify(window.cartManager.cart));
    formData.append('pickup_time', pickupTime);
    formData.append('is_redeemed', isRedeemed ? '1' : '0');

    const submitBtn = document.getElementById('btn-confirm-order');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังส่งออเดอร์...';
    }

    const res = await apiRequest('api/orders.php', {
        method: 'POST',
        body: formData
    });

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ยืนยันสั่งซื้อ';
    }

    if (res.success) {
        window.cartManager.clear();
        closeCartModal();
        showToast(res.message, 'success');
        
        // Refresh page or switch to orders tab
        if (typeof switchCustomerTab === 'function') {
            switchCustomerTab('orders');
        } else {
            setTimeout(() => window.location.reload(), 800);
        }
    } else {
        showToast(res.message, 'danger');
    }
}

// 6. QR Code Generator Helper
function generateQrCodeElement(elementId, text, size = 180) {
    const el = document.getElementById(elementId);
    if (!el || typeof QRCode === 'undefined') return;
    el.innerHTML = '';
    new QRCode(el, {
        text: text,
        width: size,
        height: size,
        colorDark: "#2d1c15",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}
