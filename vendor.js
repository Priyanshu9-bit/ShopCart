/**
 * Panda Pooja Samagri - Vendor Portal & Admin Logic
 * Handles Authentication (Admin & Vendor credentials), New Vendor Registration,
 * Product Posting, Item Deletion/Removal, Inventory Management, and Live Audio Orders.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current state
    let currentUser = Auth.getCurrentUser();
    let currentUploadedImageBase64 = '';
    let soundEnabled = localStorage.getItem('panda_sound_enabled') !== 'false';

    // Top Level Sections
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');

    // Auth Elements
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabReg = document.getElementById('btn-tab-reg');
    const authLoginPane = document.getElementById('auth-login-pane');
    const authRegPane = document.getElementById('auth-reg-pane');
    const formLogin = document.getElementById('form-login');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const btnFillAdmin = document.getElementById('btn-fill-admin');
    const btnFillVendor = document.getElementById('btn-fill-vendor');
    const formVendorReg = document.getElementById('form-vendor-reg');
    const linkGotoReg = document.getElementById('link-goto-reg');
    const linkGotoLogin = document.getElementById('link-goto-login');

    // Dashboard Header Elements
    const userDisplayName = document.getElementById('user-display-name');
    const userRoleBadge = document.getElementById('user-role-badge');
    const welcomeUserName = document.getElementById('welcome-user-name');
    const welcomeShopName = document.getElementById('welcome-shop-name');
    const btnLogout = document.getElementById('btn-logout');

    // Dashboard Tabs
    const tabButtons = document.querySelectorAll('.vendor-tab-btn');
    const tabPanes = document.querySelectorAll('.vendor-tab-pane');
    const tabBtnAdminVendors = document.getElementById('tab-btn-admin-vendors');
    const badgeVendorsCount = document.getElementById('badge-vendors-count');

    // Stats Elements
    const statProductsCount = document.getElementById('stat-products-count');
    const statOrdersCount = document.getElementById('stat-orders-count');
    const statRevenueTotal = document.getElementById('stat-revenue-total');
    const statPendingOrders = document.getElementById('stat-pending-orders');
    const badgeProdCount = document.getElementById('badge-prod-count');
    const badgeOrdersCount = document.getElementById('badge-orders-count');

    // Form Add Product
    const formAddProduct = document.getElementById('form-add-product');
    const fileInput = document.getElementById('prod-image-file');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const previewWrapper = document.getElementById('preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');
    const inputImageUrl = document.getElementById('prod-image-url');

    // Containers
    const vendorProductsTbody = document.getElementById('vendor-products-tbody');
    const vendorNoProducts = document.getElementById('vendor-no-products');
    const vendorOrdersContainer = document.getElementById('vendor-orders-container');
    const vendorNoOrders = document.getElementById('vendor-no-orders');
    const adminVendorsTbody = document.getElementById('admin-vendors-tbody');
    const btnQuickAddMore = document.getElementById('btn-quick-add-more');
    const btnEmptyGoAdd = document.getElementById('btn-empty-go-add');

    // Audio & Toast
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const btnTestSound = document.getElementById('btn-test-sound');
    const liveToast = document.getElementById('live-order-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastDesc = document.getElementById('toast-desc');
    const btnToastView = document.getElementById('btn-toast-view');

    // ----------------------------------------------------
    // AUTHENTICATION & SESSION MANAGEMENT
    // ----------------------------------------------------
    function checkAuthStatus() {
        currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            authSection.style.display = 'flex';
            dashboardSection.style.display = 'none';
        } else {
            authSection.style.display = 'none';
            dashboardSection.style.display = 'block';

            // Populate User Details
            userDisplayName.textContent = currentUser.name;
            userRoleBadge.textContent = currentUser.role;
            if (currentUser.role === 'Admin') {
                userRoleBadge.className = 'user-role-tag admin';
                tabBtnAdminVendors.style.display = 'inline-flex';
            } else {
                userRoleBadge.className = 'user-role-tag';
                tabBtnAdminVendors.style.display = 'none';
            }

            welcomeUserName.textContent = currentUser.name;
            welcomeShopName.textContent = currentUser.shopName || 'Panda Pooja Samagri';

            // Render Dashboard Data
            renderVendorProducts();
            renderVendorOrders();
            renderAdminVendorsList();
            updateDashboardStats();
        }
    }

    // Switch between Login and Registration tabs
    function switchAuthTab(targetTab) {
        if (targetTab === 'auth-reg-pane') {
            btnTabLogin.classList.remove('active');
            btnTabReg.classList.add('active');
            authLoginPane.style.display = 'none';
            authRegPane.style.display = 'block';
        } else {
            btnTabReg.classList.remove('active');
            btnTabLogin.classList.add('active');
            authRegPane.style.display = 'none';
            authLoginPane.style.display = 'block';
        }
    }

    btnTabLogin.addEventListener('click', () => switchAuthTab('auth-login-pane'));
    btnTabReg.addEventListener('click', () => switchAuthTab('auth-reg-pane'));
    linkGotoReg.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('auth-reg-pane'); });
    linkGotoLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('auth-login-pane'); });

    // Quick Fill Demo Credentials
    btnFillAdmin.addEventListener('click', () => {
        loginUsernameInput.value = 'Priyanshu Panda';
        loginPasswordInput.value = 'raja@12345';
        loginErrorMsg.style.display = 'none';
    });

    btnFillVendor.addEventListener('click', () => {
        loginUsernameInput.value = 'Panda Pooja Samagri';
        loginPasswordInput.value = 'ananta@123';
        loginErrorMsg.style.display = 'none';
    });

    // Handle Login Submit
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        const result = Auth.login(username, password);
        if (result.success) {
            loginErrorMsg.style.display = 'none';
            formLogin.reset();
            checkAuthStatus();
        } else {
            loginErrorMsg.textContent = result.message;
            loginErrorMsg.style.display = 'block';
        }
    });

    // Handle New Vendor Registration Submit
    formVendorReg.addEventListener('submit', (e) => {
        e.preventDefault();

        const regData = {
            name: document.getElementById('reg-name').value.trim(),
            shopName: document.getElementById('reg-shopname').value.trim(),
            ownerName: document.getElementById('reg-ownername').value.trim(),
            phone: document.getElementById('reg-phone').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            address: document.getElementById('reg-address').value.trim(),
            pincode: document.getElementById('reg-pincode').value.trim(),
            gstNo: document.getElementById('reg-gst').value.trim(),
            category: document.getElementById('reg-category').value,
            password: document.getElementById('reg-password').value.trim()
        };

        const newVendor = Auth.saveVendorRegistration(regData);

        // Auto login newly registered vendor
        Auth.login(newVendor.username, newVendor.password);
        formVendorReg.reset();

        alert(`🎉 Welcome ${newVendor.shopName}! Your shop has been registered successfully. You can now post items to the store.`);
        checkAuthStatus();
    });

    // Handle Logout
    btnLogout.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of the vendor portal?')) {
            Auth.logout();
            checkAuthStatus();
        }
    });

    // ----------------------------------------------------
    // DASHBOARD TAB SWITCHING
    // ----------------------------------------------------
    function switchDashboardTab(tabId) {
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchDashboardTab(tabId);
        });
    });

    if (btnQuickAddMore) btnQuickAddMore.addEventListener('click', () => switchDashboardTab('tab-add-product'));
    if (btnEmptyGoAdd) btnEmptyGoAdd.addEventListener('click', () => switchDashboardTab('tab-add-product'));

    // ----------------------------------------------------
    // AUDIO NOTIFICATIONS & TOAST
    // ----------------------------------------------------
    function updateSoundButtonUI() {
        if (soundEnabled) {
            btnToggleSound.textContent = '🔊 Audio: ON';
            btnToggleSound.style.background = 'rgba(27,138,90,0.15)';
            btnToggleSound.style.color = '#1b8a5a';
            btnToggleSound.style.borderColor = '#1b8a5a';
        } else {
            btnToggleSound.textContent = '🔇 Audio: MUTED';
            btnToggleSound.style.background = 'rgba(207,58,58,0.15)';
            btnToggleSound.style.color = '#cf3a3a';
            btnToggleSound.style.borderColor = '#cf3a3a';
        }
    }

    btnToggleSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('panda_sound_enabled', soundEnabled);
        updateSoundButtonUI();
    });

    btnTestSound.addEventListener('click', () => {
        playSacredChime();
        showLiveToast({
            id: 'TEST',
            totalAmount: 499,
            customer: { name: 'Test Customer' },
            items: [{ title: 'Pure Bhimseni Kapoor' }]
        });
    });

    function showLiveToast(order) {
        toastTitle.textContent = `Order #${order.id}`;
        toastDesc.textContent = `${order.customer?.name || 'Customer'} ordered ${order.items?.length || 1} item(s) • ₹${order.totalAmount}`;
        liveToast.classList.add('show');

        btnToastView.onclick = () => {
            liveToast.classList.remove('show');
            switchDashboardTab('tab-live-orders');
            const card = document.getElementById(`order-card-${order.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth' });
                card.classList.add('new-arrival');
            }
        };

        setTimeout(() => {
            liveToast.classList.remove('show');
        }, 8000);
    }

    // ----------------------------------------------------
    // ITEM IMAGE UPLOAD (Local Base64 FileReader)
    // ----------------------------------------------------
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                currentUploadedImageBase64 = evt.target.result;
                imagePreview.src = currentUploadedImageBase64;
                dropzonePrompt.style.display = 'none';
                previewWrapper.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    btnRemovePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        currentUploadedImageBase64 = '';
        fileInput.value = '';
        imagePreview.src = '';
        previewWrapper.style.display = 'none';
        dropzonePrompt.style.display = 'block';
    });

    // ----------------------------------------------------
    // ITEM POSTING (Publish Item to Store)
    // ----------------------------------------------------
    formAddProduct.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('prod-name').value.trim();
        const category = document.getElementById('prod-category').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const mrpVal = document.getElementById('prod-mrp').value;
        const mrp = mrpVal ? parseFloat(mrpVal) : null;
        const stock = parseInt(document.getElementById('prod-stock').value) || 0;
        const unit = document.getElementById('prod-unit').value.trim() || '1 Unit';
        const desc = document.getElementById('prod-desc').value.trim();
        
        let finalImage = currentUploadedImageBase64 || inputImageUrl.value.trim() || '';

        const newProduct = {
            title: name,
            category: category,
            price: price,
            mrp: mrp,
            stock: stock,
            unit: unit,
            image: finalImage,
            description: desc,
            inStock: stock > 0,
            vendorName: currentUser ? (currentUser.shopName || currentUser.name) : 'Panda Pooja Samagri'
        };

        Store.saveProduct(newProduct);

        // Reset Form
        formAddProduct.reset();
        currentUploadedImageBase64 = '';
        previewWrapper.style.display = 'none';
        dropzonePrompt.style.display = 'block';

        alert(`✅ "${name}" has been published to your store! Customers can now view and purchase it.`);
        
        renderVendorProducts();
        updateDashboardStats();
        switchDashboardTab('tab-manage-products');
    });

    // ----------------------------------------------------
    // RENDER PRODUCTS & REMOVE ITEM CAPABILITY
    // ----------------------------------------------------
    function renderVendorProducts() {
        const products = Store.getProducts();
        badgeProdCount.textContent = products.length;

        if (products.length === 0) {
            vendorProductsTbody.innerHTML = '';
            vendorNoProducts.style.display = 'block';
            return;
        }

        vendorNoProducts.style.display = 'none';
        vendorProductsTbody.innerHTML = products.map(prod => {
            const hasImg = !!prod.image;
            const imgHtml = hasImg 
                ? `<img src="${prod.image}" class="v-prod-thumb" alt="${escapeHtml(prod.title)}">`
                : `<div class="v-prod-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🪔</div>`;

            const discountBadge = (prod.mrp && prod.mrp > prod.price)
                ? `<span style="font-size:0.75rem; color:#1b8a5a; font-weight:700;"> (${Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)}% OFF)</span>`
                : '';

            return `
                <tr id="v-row-${prod.id}">
                    <td>
                        <div class="v-prod-preview">
                            ${imgHtml}
                            <div>
                                <div style="font-weight:700; color:var(--text-main);">${escapeHtml(prod.title)}</div>
                                <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(prod.unit || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="v-badge" style="background:var(--surface-light); color:var(--primary); font-weight:700;">
                            ${escapeHtml(prod.category)}
                        </span>
                    </td>
                    <td>
                        <strong>${formatCurrency(prod.price)}</strong>
                        ${prod.mrp ? `<br><small style="text-decoration:line-through;color:#999;">${formatCurrency(prod.mrp)}</small>` : ''}
                        ${discountBadge}
                    </td>
                    <td>
                        <span class="v-badge ${prod.stock > 0 ? 'in-stock' : 'out-stock'}">
                            ${prod.stock > 0 ? `In Stock (${prod.stock})` : 'Out of Stock'}
                        </span>
                    </td>
                    <td style="color:var(--text-muted); font-size:0.8rem;">
                        ${formatDate(prod.createdAt)}
                    </td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="v-action-btn" onclick="quickEditStock('${prod.id}')" title="Edit Price or Stock">
                                ✏️ Edit
                            </button>
                            <!-- PROMINENT REMOVE ITEM BUTTON -->
                            <button class="v-action-btn delete" onclick="deleteProductItem('${prod.id}')" title="Remove Item From Shop">
                                🗑️ Remove
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // REMOVE PRODUCT FUNCTION
    window.deleteProductItem = function(productId) {
        const products = Store.getProducts();
        const p = products.find(item => item.id === productId);
        const itemName = p ? p.title : 'this item';

        if (confirm(`⚠️ Are you sure you want to REMOVE "${itemName}"?\n\nThis item will be deleted and will immediately disappear from the customer storefront.`)) {
            Store.deleteProduct(productId);
            renderVendorProducts();
            updateDashboardStats();
            alert(`🗑️ "${itemName}" has been successfully removed from the shop!`);
        }
    };

    window.quickEditStock = function(productId) {
        const products = Store.getProducts();
        const p = products.find(item => item.id === productId);
        if (!p) return;

        const newPrice = prompt(`Enter new selling price (₹) for "${p.title}":`, p.price);
        if (newPrice !== null && !isNaN(newPrice) && Number(newPrice) > 0) {
            const newStock = prompt(`Enter stock quantity for "${p.title}":`, p.stock);
            if (newStock !== null && !isNaN(newStock) && Number(newStock) >= 0) {
                p.price = parseFloat(newPrice);
                p.stock = parseInt(newStock);
                p.inStock = p.stock > 0;
                Store.saveProduct(p);
                renderVendorProducts();
                alert('Item updated successfully!');
            }
        }
    };

    // ----------------------------------------------------
    // RENDER LIVE ORDERS
    // ----------------------------------------------------
    function renderVendorOrders() {
        const orders = Store.getOrders();
        badgeOrdersCount.textContent = orders.length;

        if (orders.length === 0) {
            vendorOrdersContainer.innerHTML = '';
            vendorNoOrders.style.display = 'block';
            return;
        }

        vendorNoOrders.style.display = 'none';
        vendorOrdersContainer.innerHTML = orders.map(order => {
            const statusClass = (order.status || 'pending').toLowerCase().replace(/\s+/g, '');
            const rawPhone = (order.customer.phone || '').replace(/[^0-9]/g, '');
            const phoneForWa = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
            const waMsg = encodeURIComponent(`Namaste ${order.customer.name}! Greetings from Panda Pooja Samagri. Your order #${order.id} for ₹${order.totalAmount} is confirmed!`);
            const waUrl = `https://wa.me/${phoneForWa}?text=${waMsg}`;

            const itemsHtml = order.items.map(it => `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>• ${escapeHtml(it.title)} <strong>× ${it.quantity}</strong></span>
                    <span style="font-weight:600;">${formatCurrency(it.price * it.quantity)}</span>
                </div>
            `).join('');

            return `
                <div class="order-card-vendor" id="order-card-${order.id}">
                    <div class="order-top-row">
                        <div>
                            <span class="order-id-badge">#${order.id}</span>
                            <span style="font-size:0.82rem; color:var(--text-muted); margin-left:8px;">
                                Placed on ${formatDate(order.createdAt)}
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="order-status-pill ${statusClass}">${order.status}</span>
                            <span class="v-badge" style="background:#f4f4f4; color:#333;">${order.paymentMethod}</span>
                        </div>
                    </div>

                    <div class="order-details-grid">
                        <div class="order-items-sublist">
                            <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">
                                Items Ordered (${order.items.length})
                            </div>
                            ${itemsHtml}
                            <div style="border-top:1px dashed var(--border-light); padding-top:8px; margin-top:8px; display:flex; justify-content:space-between; font-weight:800; color:var(--text-main);">
                                <span>Total Amount:</span>
                                <span style="color:var(--primary); font-size:1.05rem;">${formatCurrency(order.totalAmount)}</span>
                            </div>
                        </div>

                        <div class="order-cust-info">
                            <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase;">
                                Customer & Delivery Info
                            </div>
                            <div style="font-size:0.95rem; font-weight:700; color:var(--text-main);">${escapeHtml(order.customer.name)}</div>
                            <div>📞 Phone: <strong>${escapeHtml(order.customer.phone)}</strong></div>
                            <div style="margin-top:4px;">
                                📍 Address: ${escapeHtml(order.deliveryAddress.street)}, ${escapeHtml(order.deliveryAddress.city)} - ${escapeHtml(order.deliveryAddress.pincode)}
                            </div>
                            ${order.notes ? `<div style="margin-top:4px; font-style:italic;">Note: ${escapeHtml(order.notes)}</div>` : ''}
                        </div>
                    </div>

                    <div class="order-actions-row">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Status:</label>
                            <select class="form-control" style="width:auto; padding:6px 10px; font-size:0.84rem;" onchange="changeOrderStatus('${order.id}', this.value)">
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>📦 Packing</option>
                                <option value="OutForDelivery" ${order.status === 'OutForDelivery' ? 'selected' : ''}>🚚 Out for Delivery</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                            </select>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <a href="${waUrl}" target="_blank" class="v-action-btn" style="background:#eafaf1; color:#1b8a5a; border-color:#1b8a5a; text-decoration:none;">
                                💬 WhatsApp Customer
                            </a>
                            <button class="v-action-btn delete" onclick="deleteCustomerOrder('${order.id}')" title="Cancel/Remove Order">
                                🗑️ Remove Order
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.changeOrderStatus = function(orderId, newStatus) {
        Store.updateOrderStatus(orderId, newStatus);
        renderVendorOrders();
        updateDashboardStats();
    };

    window.deleteCustomerOrder = function(orderId) {
        if (confirm(`Are you sure you want to remove order #${orderId}?`)) {
            Store.deleteOrder(orderId);
            renderVendorOrders();
            updateDashboardStats();
        }
    };

    // ----------------------------------------------------
    // RENDER REGISTERED VENDORS (Admin View)
    // ----------------------------------------------------
    function renderAdminVendorsList() {
        const registered = Auth.getRegisteredVendors();
        badgeVendorsCount.textContent = registered.length + 1; // +1 for default vendor

        const defaultVendorRow = `
            <tr>
                <td><strong>Panda Pooja Samagri</strong></td>
                <td>Ananta Panda <br><small>Default Store</small></td>
                <td><span style="font-family:monospace;">22AAAAA0000A1Z5</span></td>
                <td>Main Temple Ghat, Varanasi</td>
                <td>Pooja Samagri & Essentials</td>
                <td>Founding Vendor</td>
                <td><span class="v-badge in-stock">Active</span></td>
            </tr>
        `;

        const registeredRows = registered.map(v => `
            <tr>
                <td><strong>${escapeHtml(v.shopName)}</strong></td>
                <td>${escapeHtml(v.ownerName)} <br><small>📞 ${escapeHtml(v.phone)}</small></td>
                <td><span style="font-family:monospace;">${escapeHtml(v.gstNo || 'Not Provided')}</span></td>
                <td>${escapeHtml(v.address)} (${escapeHtml(v.pincode)})</td>
                <td>${escapeHtml(v.category)}</td>
                <td>${formatDate(v.registeredAt)}</td>
                <td><span class="v-badge in-stock">${v.status || 'Active'}</span></td>
            </tr>
        `).join('');

        adminVendorsTbody.innerHTML = defaultVendorRow + registeredRows;
    }

    // ----------------------------------------------------
    // DASHBOARD STATS
    // ----------------------------------------------------
    function updateDashboardStats() {
        const products = Store.getProducts();
        const orders = Store.getOrders();

        statProductsCount.textContent = products.length;
        statOrdersCount.textContent = orders.length;

        const totalRev = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        statRevenueTotal.textContent = formatCurrency(totalRev);

        const pending = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
        statPendingOrders.textContent = pending;
    }

    // ----------------------------------------------------
    // REAL-TIME EVENT LISTENER (Incoming Orders)
    // ----------------------------------------------------
    Store.on((event) => {
        if (!event) return;

        if (event.type === 'ORDER_PLACED') {
            const order = event.payload;
            if (soundEnabled) playSacredChime();
            showLiveToast(order);
            renderVendorOrders();
            updateDashboardStats();
        } else if (event.type === 'PRODUCT_UPDATED' || event.type === 'PRODUCT_DELETED') {
            renderVendorProducts();
            updateDashboardStats();
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize Auth & UI
    updateSoundButtonUI();
    checkAuthStatus();
});
