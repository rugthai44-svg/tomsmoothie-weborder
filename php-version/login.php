<?php
// login.php - Auth Portal
require_once __DIR__ . '/includes/auth.php';

$user = getCurrentUser();
if ($user) {
    header('Location: index.php');
    exit;
}

include __DIR__ . '/includes/header.php';
?>

<div style="max-width: 480px; margin: 20px auto;">
    <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 30px; box-shadow: var(--shadow-md);">
        
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 3rem; margin-bottom: 8px;">🍹</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--brown);">ยินดีต้อนรับสู่ร้านน้ำปั่นพี่ต้อม</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">เข้าสู่ระบบสั่งเครื่องดื่มและสะสมแต้มแลกฟรี</p>
        </div>

        <!-- Mode Toggle (Login vs Register for Customer) -->
        <div id="auth-mode-toggle" style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; font-size: 0.9rem; font-weight: 700;">
            <span id="tab-login-btn" style="color: var(--primary); cursor: pointer; border-bottom: 2px solid var(--primary); padding-bottom: 4px;" onclick="toggleAuthMode('login')">เข้าสู่ระบบ</span>
            <span id="tab-register-btn" style="color: var(--text-muted); cursor: pointer; padding-bottom: 4px;" onclick="toggleAuthMode('register')">สมัครสมาชิกใหม่</span>
        </div>

        <!-- 1. LOGIN FORM -->
        <form id="login-form" onsubmit="handleLoginSubmit(event)">
            <div class="form-group">
                <label>อีเมล (Email)</label>
                <input type="email" id="login-email" class="form-control" placeholder="name@example.com" required>
            </div>

            <div class="form-group">
                <label>รหัสผ่าน (Password)</label>
                <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 0.85rem;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="remember-me" checked> จำรหัสผ่านไว้
                </label>
            </div>

            <button type="submit" id="btn-login-submit" class="btn btn-primary btn-block" style="padding: 12px; font-size: 1rem;">
                เข้าสู่ระบบ
            </button>
        </form>

        <!-- 2. REGISTER FORM (Customer Only) -->
        <form id="register-form" style="display: none;" onsubmit="handleRegisterSubmit(event)">
            <div class="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input type="text" id="reg-fullname" class="form-control" placeholder="คุณสมชาย ใจดี" required>
            </div>

            <div class="form-group">
                <label>เบอร์โทรศัพท์ (สำหรับสะสมแต้มหน้าร้าน)</label>
                <input type="tel" id="reg-phone" class="form-control" placeholder="081-234-5678" required>
            </div>

            <div class="form-group">
                <label>อีเมล</label>
                <input type="email" id="reg-email" class="form-control" placeholder="name@example.com" required>
            </div>

            <div class="form-group">
                <label>รหัสผ่าน</label>
                <input type="password" id="reg-password" class="form-control" placeholder="อย่างน้อย 6 ตัวอักษร" required>
            </div>

            <button type="submit" id="btn-reg-submit" class="btn btn-primary btn-block" style="padding: 12px; font-size: 1rem; background: var(--brown);">
                สมัครสมาชิก & เริ่มสะสมแต้ม
            </button>
        </form>

    </div>
</div>

<script>

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login-btn');
    const tabReg = document.getElementById('tab-register-btn');

    if (mode === 'login') {
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
        tabLogin.style.color = 'var(--primary)';
        tabLogin.style.borderBottom = '2px solid var(--primary)';
        tabReg.style.color = 'var(--text-muted)';
        tabReg.style.borderBottom = 'none';
    } else {
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
        tabReg.style.color = 'var(--primary)';
        tabReg.style.borderBottom = '2px solid var(--primary)';
        tabLogin.style.color = 'var(--text-muted)';
        tabLogin.style.borderBottom = 'none';
    }
}


async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('btn-login-submit');

    btn.disabled = true;
    btn.textContent = 'กำลังเข้าสู่ระบบ...';

    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', email);
    formData.append('password', password);

    const res = await apiRequest('api/auth.php', {
        method: 'POST',
        body: formData
    });

    btn.disabled = false;
    btn.textContent = 'เข้าสู่ระบบ';

    if (res.success) {
        showToast(res.message, 'success');
        setTimeout(() => {
            window.location.href = res.redirect || 'index.php';
        }, 500);
    } else {
        showToast(res.message, 'danger');
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const btn = document.getElementById('btn-reg-submit');

    btn.disabled = true;
    btn.textContent = 'กำลังสมัครสมาชิก...';

    const formData = new FormData();
    formData.append('action', 'register');
    formData.append('full_name', fullName);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('password', password);

    const res = await apiRequest('api/auth.php', {
        method: 'POST',
        body: formData
    });

    btn.disabled = false;
    btn.textContent = 'สมัครสมาชิก & เริ่มสะสมแต้ม';

    if (res.success) {
        showToast(res.message, 'success');
        setTimeout(() => {
            window.location.href = res.redirect || 'customer.php';
        }, 500);
    } else {
        showToast(res.message, 'danger');
    }
}
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
