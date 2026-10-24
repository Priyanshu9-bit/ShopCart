/**
 * Panda Pooja Samagri - Customer Storefront Logic
 * Renders ONLY items posted in the Vendor portal.
 * Handles category filtering, live search, cart drawer, checkout & order placement.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let cart = [];
    try {
        const rawCart = localStorage.getItem('panda_customer_cart');
        if (rawCart) cart = JSON.parse(rawCart);
    } catch (e) {
        cart = [];
    }

    let activeCategory = 'ALL';
    let searchQuery = '';
    let appliedDiscountPercent = 0;
    let selectedPaymentMethod = 'UPI';
    let currentQuickViewProduct = null;

    // DOM Elements
    const productsGrid = document.getElementById('store-products-grid');
    const storeEmptyState = document.getElementById('store-empty-state');
    const storeItemCount = document.getElementById('store-item-count');
    const searchInput = document.getElementById('store-search-input');
    const categoryChips = document.querySelectorAll('.category-chips .cat-btn');

    // Cart Elements
    const headerCartCount = document.getElementById('header-cart-count');
    const btnOpenCart = document.getElementById('btn-open-cart');
    const btnCloseCart = document.getElementById('btn-close-cart');
    const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const drawerItemsCount = document.getElementById('drawer-items-count');
    const billSubtotal = document.getElementById('bill-subtotal');
    const rowDiscount = document.getElementById('row-discount');
    const billDiscount = document.getElementById('bill-discount');
    const billGrandTotal = document.getElementById('bill-grand-total');
    const couponInput = document.getElementById('coupon-input');
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const couponAppliedMsg = document.getElementById('coupon-applied-msg');
    const btnProceedCheckout = document.getElementById('btn-proceed-checkout');

    // Quick View Modal
    const quickviewModal = document.getElementById('quickview-modal');
    const btnCloseQv = document.getElementById('btn-close-qv');
    const qvImg = document.getElementById('qv-img');
    const qvNoImg = document.getElementById('qv-no-img');
    const qvCategory = document.getElementById('qv-category');
    const qvName = document.getElementById('qv-name');
    const qvPrice = document.getElementById('qv-price');
    const qvMrp = document.getElementById('qv-mrp');
    const qvDiscount = document.getElementById('qv-discount');
    const qvUnit = document.getElementById('qv-unit');
    const qvStock = document.getElementById('qv-stock');
    const qvDesc = document.getElementById('qv-desc');
    const qvBtnAdd = document.getElementById('qv-btn-add');

    // Checkout Modal
    const checkoutModal = document.getElementById('checkout-modal');
    const btnCloseCheckout = document.getElementById('btn-close-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    const payOptUpi = document.getElementById('pay-opt-upi');
    const payOptCod = document.getElementById('pay-opt-cod');
    const upiDetailsWrap = document.getElementById('upi-details-wrap');
    const checkoutPayAmount = document.getElementById('checkout-pay-amount');

    // Success Receipt Modal
    const orderSuccessModal = document.getElementById('order-success-modal');
    const btnCloseSuccess = document.getElementById('btn-close-success');
    const receiptOrderId = document.getElementById('receipt-order-id');
    const receiptCustomerName = document.getElementById('receipt-customer-name');
    const receiptTotalAmount = document.getElementById('receipt-total-amount');
    const receiptPaymentMethod = document.getElementById('receipt-payment-method');
    const receiptAddress = document.getElementById('receipt-address');
    const btnReceiptWhatsapp = document.getElementById('btn-receipt-whatsapp');

    // ----------------------------------------------------
    // Render Products Grid (Only Vendor-Posted Items)
    // ----------------------------------------------------
    function renderProducts() {
        const allProducts = Store.getProducts();

        // Filter by category and search
        let filtered = allProducts.filter(item => {
            const matchesCat = (activeCategory === 'ALL') || (item.category === activeCategory);
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || 
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q));
            return matchesCat && matchesSearch;
        });

        storeItemCount.textContent = `Showing ${filtered.length} of ${allProducts.length} Items`;

        if (allProducts.length === 0) {
            productsGrid.innerHTML = '';
            storeEmptyState.style.display = 'block';
            return;
        }

        storeEmptyState.style.display = 'none';

        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: #fff; border-radius: 12px; border: 1px dashed var(--border-light);">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
                    <h3>No items found matching "${escapeHtml(searchQuery)}"</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Try selecting a different category or clearing your search term.</p>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = filtered.map(prod => {
            const hasImg = !!prod.image;
            const imgHtml = hasImg
                ? `<img src="${prod.image}" alt="${escapeHtml(prod.title)}" loading="lazy">`
                : `<div class="product-no-img">🪔</div>`;

            const isOutOfStock = prod.stock <= 0;
            const discountBadge = (prod.mrp && prod.mrp > prod.price)
                ? `<span class="p-badge discount">${Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)}% OFF</span>`
                : '';

            const stockBadge = isOutOfStock
                ? `<span class="p-badge out">Out of Stock</span>`
                : (prod.stock <= 5 
                    ? `<span class="p-badge low">Only ${prod.stock} Left</span>` 
                    : `<span class="p-badge stock">Pure & Vedic</span>`);

            return `
                <article class="product-card" id="card-${prod.id}">
                    <div class="product-img-box" onclick="openQuickView('${prod.id}')" style="cursor: pointer;">
                        <div class="product-badge-overlay">
                            ${stockBadge}
                            ${discountBadge}
                        </div>
                        ${imgHtml}
                    </div>

                    <div class="product-body">
                        <div class="product-category-tag">${escapeHtml(prod.category)}</div>
                        <h3 class="product-title" onclick="openQuickView('${prod.id}')" style="cursor: pointer;" title="${escapeHtml(prod.title)}">
                            ${escapeHtml(prod.title)}
                        </h3>
                        <p class="product-desc">${escapeHtml(prod.description || 'Authentic ritual pooja samagri directly from our shop.')}</p>

                        <div class="price-row">
                            <span class="current-price">${formatCurrency(prod.price)}</span>
                            ${prod.mrp ? `<span class="original-price">${formatCurrency(prod.mrp)}</span>` : ''}
                            ${prod.unit ? `<span style="font-size:0.8rem; color:var(--text-muted); margin-left:auto;">${escapeHtml(prod.unit)}</span>` : ''}
                        </div>

                        <div class="product-actions">
                            <button class="btn-add-cart" onclick="addToCart('${prod.id}')" ${isOutOfStock ? 'disabled' : ''}>
                                ${isOutOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
                            </button>
                            <button class="btn-quick-view" onclick="openQuickView('${prod.id}')" title="Quick View Details">
                                👁️
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // Category & Search Filters
    // ----------------------------------------------------
    categoryChips.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryChips.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            renderProducts();
        });
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProducts();
    });

    // ----------------------------------------------------
    // Cart Logic
    // ----------------------------------------------------
    function saveCart() {
        localStorage.setItem('panda_customer_cart', JSON.stringify(cart));
        updateCartUI();
    }

    function updateCartUI() {
        const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        headerCartCount.textContent = totalItemsCount;
        drawerItemsCount.textContent = totalItemsCount;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🛒</div>
                    <h4>Your Cart is Empty</h4>
                    <p style="font-size: 0.88rem; margin-top: 6px;">Add sacred pooja essentials to proceed.</p>
                </div>
            `;
            billSubtotal.textContent = '₹0';
            billGrandTotal.textContent = '₹0';
            btnProceedCheckout.disabled = true;
            btnProceedCheckout.style.opacity = '0.6';
            return;
        }

        btnProceedCheckout.disabled = false;
        btnProceedCheckout.style.opacity = '1';

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = Math.round(subtotal * (appliedDiscountPercent / 100));
        const grandTotal = Math.max(0, subtotal - discount);

        billSubtotal.textContent = formatCurrency(subtotal);
        if (discount > 0) {
            rowDiscount.style.display = 'flex';
            billDiscount.textContent = `-${formatCurrency(discount)} (${appliedDiscountPercent}%)`;
        } else {
            rowDiscount.style.display = 'none';
        }
        billGrandTotal.textContent = formatCurrency(grandTotal);

        cartItemsContainer.innerHTML = cart.map(item => {
            const imgHtml = item.image 
                ? `<img src="${item.image}" alt="${escapeHtml(item.title)}">` 
                : `<div style="font-size: 1.6rem;">🪔</div>`;

            return `
                <div class="cart-item-row" id="cart-row-${item.id}">
                    <div class="cart-item-img">
                        ${imgHtml}
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-title">${escapeHtml(item.title)}</div>
                        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
                        <div class="cart-qty-ctrls">
                            <button class="qty-btn" onclick="updateItemQty('${item.id}', -1)">-</button>
                            <span class="qty-num">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateItemQty('${item.id}', 1)">+</button>
                            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:8px;">
                                Total: <strong>${formatCurrency(item.price * item.quantity)}</strong>
                            </span>
                        </div>
                    </div>
                    <button class="btn-remove-item" onclick="removeFromCart('${item.id}')" title="Remove Item">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
    }

    window.addToCart = function(productId) {
        const products = Store.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (product.stock <= 0) {
            alert('Sorry, this item is currently out of stock!');
            return;
        }

        const existing = cart.find(it => it.id === productId);
        if (existing) {
            if (existing.quantity >= product.stock) {
                alert(`Maximum available stock reached (${product.stock} units).`);
                return;
            }
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                unit: product.unit,
                quantity: 1
            });
        }

        saveCart();
        openCartDrawer();
    };

    window.updateItemQty = function(productId, delta) {
        const item = cart.find(it => it.id === productId);
        if (!item) return;

        const products = Store.getProducts();
        const product = products.find(p => p.id === productId);
        const maxStock = product ? product.stock : 999;

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQty > maxStock) {
            alert(`Only ${maxStock} items available in stock.`);
            return;
        }

        item.quantity = newQty;
        saveCart();
    };

    window.removeFromCart = function(productId) {
        cart = cart.filter(it => it.id !== productId);
        saveCart();
    };

    function openCartDrawer() {
        cartDrawerOverlay.classList.add('active');
    }

    function closeCartDrawer() {
        cartDrawerOverlay.classList.remove('active');
    }

    btnOpenCart.addEventListener('click', openCartDrawer);
    btnCloseCart.addEventListener('click', closeCartDrawer);
    cartDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === cartDrawerOverlay) closeCartDrawer();
    });

    // ----------------------------------------------------
    // Coupon Code
    // ----------------------------------------------------
    btnApplyCoupon.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        if (code === 'SHUBH10' || code === 'PRASAD') {
            appliedDiscountPercent = 10;
            couponAppliedMsg.style.display = 'block';
            couponAppliedMsg.textContent = `✨ Coupon '${code}' Applied: 10% Sacred Blessing Discount!`;
            updateCartUI();
        } else if (code) {
            alert('Invalid coupon code. Try code "SHUBH10" for 10% blessing discount!');
        }
    });

    // ----------------------------------------------------
    // Quick View Modal
    // ----------------------------------------------------
    window.openQuickView = function(productId) {
        const products = Store.getProducts();
        const p = products.find(item => item.id === productId);
        if (!p) return;

        currentQuickViewProduct = p;

        if (p.image) {
            qvImg.src = p.image;
            qvImg.style.display = 'block';
            qvNoImg.style.display = 'none';
        } else {
            qvImg.style.display = 'none';
            qvNoImg.style.display = 'block';
        }

        qvCategory.textContent = p.category;
        qvName.textContent = p.title;
        qvPrice.textContent = formatCurrency(p.price);
        
        if (p.mrp && p.mrp > p.price) {
            qvMrp.textContent = formatCurrency(p.mrp);
            qvMrp.style.display = 'inline';
            qvDiscount.textContent = `${Math.round(((p.mrp - p.price) / p.mrp) * 100)}% OFF`;
            qvDiscount.style.display = 'inline-block';
        } else {
            qvMrp.style.display = 'none';
            qvDiscount.style.display = 'none';
        }

        qvUnit.textContent = p.unit || '1 Unit';
        qvStock.textContent = p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock';
        qvStock.style.color = p.stock > 0 ? '#1b8a5a' : '#cf3a3a';
        qvDesc.textContent = p.description || 'Panda Pooja Samagri brings you pure and blessed essentials for all sacred Hindu rituals.';

        qvBtnAdd.disabled = p.stock <= 0;
        qvBtnAdd.textContent = p.stock > 0 ? '🛒 Add to Sacred Cart' : 'Out of Stock';

        quickviewModal.classList.add('active');
    };

    btnCloseQv.addEventListener('click', () => quickviewModal.classList.remove('active'));
    quickviewModal.addEventListener('click', (e) => {
        if (e.target === quickviewModal) quickviewModal.classList.remove('active');
    });

    qvBtnAdd.addEventListener('click', () => {
        if (currentQuickViewProduct) {
            addToCart(currentQuickViewProduct.id);
            quickviewModal.classList.remove('active');
        }
    });

    // ----------------------------------------------------
    // Checkout Flow
    // ----------------------------------------------------
    btnProceedCheckout.addEventListener('click', () => {
        if (cart.length === 0) return;
        closeCartDrawer();

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = Math.round(subtotal * (appliedDiscountPercent / 100));
        const grandTotal = Math.max(0, subtotal - discount);

        checkoutPayAmount.textContent = formatCurrency(grandTotal);
        checkoutModal.classList.add('active');
    });

    btnCloseCheckout.addEventListener('click', () => checkoutModal.classList.remove('active'));
    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) checkoutModal.classList.remove('active');
    });

    payOptUpi.addEventListener('click', () => {
        selectedPaymentMethod = 'UPI';
        payOptUpi.classList.add('active');
        payOptCod.classList.remove('active');
        upiDetailsWrap.style.display = 'block';
    });

    payOptCod.addEventListener('click', () => {
        selectedPaymentMethod = 'Cash on Delivery';
        payOptCod.classList.add('active');
        payOptUpi.classList.remove('active');
        upiDetailsWrap.style.display = 'none';
    });

    // Handle Order Submission
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = Math.round(subtotal * (appliedDiscountPercent / 100));
        const grandTotal = Math.max(0, subtotal - discount);

        const orderData = {
            customer: {
                name: document.getElementById('cust-name').value.trim(),
                phone: document.getElementById('cust-phone').value.trim()
            },
            deliveryAddress: {
                street: document.getElementById('cust-street').value.trim(),
                city: document.getElementById('cust-city').value.trim(),
                pincode: document.getElementById('cust-pincode').value.trim()
            },
            notes: document.getElementById('cust-notes').value.trim(),
            items: cart.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: grandTotal,
            discount: discount,
            paymentMethod: selectedPaymentMethod,
            paymentStatus: selectedPaymentMethod === 'UPI' ? 'Paid (Simulated UPI)' : 'Pending (COD)'
        };

        // Create Order & Broadcast to Vendor App!
        const placedOrder = Store.createOrder(orderData);

        // Deduct inventory stock locally
        const products = Store.getProducts();
        placedOrder.items.forEach(orderedItem => {
            const p = products.find(prod => prod.id === orderedItem.id);
            if (p) {
                p.stock = Math.max(0, p.stock - orderedItem.quantity);
                p.inStock = p.stock > 0;
                Store.saveProduct(p);
            }
        });

        // Clear Cart
        cart = [];
        saveCart();
        checkoutForm.reset();
        checkoutModal.classList.remove('active');

        // Show Blessed Receipt
        showReceipt(placedOrder);
        renderProducts();
    });

    function showReceipt(order) {
        receiptOrderId.textContent = `#${order.id}`;
        receiptCustomerName.textContent = order.customer.name;
        receiptTotalAmount.textContent = formatCurrency(order.totalAmount);
        receiptPaymentMethod.textContent = order.paymentMethod;
        receiptAddress.textContent = `${order.deliveryAddress.street}, ${order.deliveryAddress.city} (${order.deliveryAddress.pincode})`;

        // WhatsApp message link
        const msg = encodeURIComponent(`🙏 Namaste! I have placed an order #${order.id} on Panda Pooja Samagri for ₹${order.totalAmount}. Delivery Address: ${order.deliveryAddress.street}, ${order.deliveryAddress.city}. Please confirm.`);
        btnReceiptWhatsapp.href = `https://wa.me/?text=${msg}`;

        orderSuccessModal.classList.add('active');
    }

    btnCloseSuccess.addEventListener('click', () => {
        orderSuccessModal.classList.remove('active');
    });

    // ----------------------------------------------------
    // Real-Time Event Listener for Customer Storefront
    // ----------------------------------------------------
    Store.on((event) => {
        if (!event) return;

        // When vendor adds, updates, or deletes a product, refresh storefront live
        if (event.type === 'PRODUCT_UPDATED' || event.type === 'PRODUCT_DELETED') {
            if (event.type === 'PRODUCT_DELETED' && event.payload && event.payload.productId) {
                cart = cart.filter(it => it.id !== event.payload.productId);
                saveCart();
            }
            renderProducts();
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

    // Initial Load
    renderProducts();
    updateCartUI();
});
