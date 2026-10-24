/**
 * Panda Pooja Samagri - Shared State, Auth & Real-Time Sync Engine
 * Handles credentials, vendor registrations, LocalStorage persistence, 
 * BroadcastChannel real-time sync, and synthesized sacred temple bell chime.
 */

const STORAGE_KEYS = {
    PRODUCTS: 'panda_vendor_products',
    ORDERS: 'panda_vendor_orders',
    NOTIFICATIONS: 'panda_notifications',
    AUTH_USER: 'panda_current_auth_user',
    REGISTERED_VENDORS: 'panda_registered_vendors'
};

// Default Credentials specified by user
const DEFAULT_ACCOUNTS = [
    {
        username: 'Priyanshu Panda',
        password: 'raja@12345',
        name: 'Priyanshu Panda',
        role: 'Admin',
        shopName: 'Master Administration'
    },
    {
        username: 'Panda Pooja Samagri',
        password: 'ananta@123',
        name: 'Panda Pooja Samagri',
        role: 'Vendor',
        shopName: 'Panda Pooja Samagri'
    }
];

// Initialize Broadcast Channel for instant inter-tab communication
const broadcastChannel = typeof BroadcastChannel !== 'undefined' 
    ? new BroadcastChannel('panda_sync_channel') 
    : null;

// Audio Context for synthesizing a clear, resonant brass temple chime
let audioCtx = null;

function playSacredChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const freqs = [587.33, 880.0, 1174.66, 1760.0]; // D5, A5, D6, A6 harmonics
        
        freqs.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            const volume = 0.25 / (idx + 1);
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + idx * 0.3);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 2.5);
        });
    } catch (e) {
        console.warn('Audio chime could not play automatically:', e);
    }
}

// Authentication Manager
const Auth = {
    getRegisteredVendors: function() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_VENDORS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveVendorRegistration: function(regData) {
        const vendors = this.getRegisteredVendors();
        const newVendor = {
            id: 'VEND-' + Date.now(),
            registeredAt: new Date().toISOString(),
            status: 'Approved', // Auto-approved for smooth access, Admin can manage
            name: regData.name,
            shopName: regData.shopName,
            ownerName: regData.ownerName,
            phone: regData.phone,
            email: regData.email || '',
            address: regData.address,
            pincode: regData.pincode,
            gstNo: regData.gstNo || 'Not Provided',
            category: regData.category || 'Pooja Samagri',
            username: regData.shopName, // Shop name is username
            password: regData.password,
            role: 'Vendor'
        };

        vendors.unshift(newVendor);
        localStorage.setItem(STORAGE_KEYS.REGISTERED_VENDORS, JSON.stringify(vendors));
        return newVendor;
    },

    login: function(username, password) {
        const cleanUser = (username || '').trim();
        const cleanPass = (password || '').trim();

        // 1. Check default admin & vendor accounts
        const defaultMatch = DEFAULT_ACCOUNTS.find(acc => 
            acc.username.toLowerCase() === cleanUser.toLowerCase() && acc.password === cleanPass
        );

        if (defaultMatch) {
            const sessionUser = {
                username: defaultMatch.username,
                name: defaultMatch.name,
                role: defaultMatch.role,
                shopName: defaultMatch.shopName,
                loginTime: new Date().toISOString()
            };
            this.setCurrentUser(sessionUser);
            return { success: true, user: sessionUser };
        }

        // 2. Check newly registered vendors
        const registered = this.getRegisteredVendors();
        const regMatch = registered.find(v => 
            (v.username.toLowerCase() === cleanUser.toLowerCase() || v.phone === cleanUser) && 
            v.password === cleanPass
        );

        if (regMatch) {
            const sessionUser = {
                id: regMatch.id,
                username: regMatch.username,
                name: regMatch.name,
                role: 'Vendor',
                shopName: regMatch.shopName,
                ownerName: regMatch.ownerName,
                loginTime: new Date().toISOString()
            };
            this.setCurrentUser(sessionUser);
            return { success: true, user: sessionUser };
        }

        return { 
            success: false, 
            message: 'Invalid Username or Password! Please verify your login credentials.' 
        };
    },

    getCurrentUser: function() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEYS.AUTH_USER) || localStorage.getItem(STORAGE_KEYS.AUTH_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setCurrentUser: function(user) {
        if (!user) {
            sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER);
            localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        } else {
            sessionStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
            localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
        }
    },

    logout: function() {
        this.setCurrentUser(null);
    }
};

// Data Store Accessors
const Store = {
    // Products (ONLY what vendor posts!)
    getProducts: function() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error reading products:', e);
            return [];
        }
    },

    saveProduct: function(product) {
        const products = this.getProducts();
        if (!product.id) {
            product.id = 'PRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        }
        product.createdAt = product.createdAt || new Date().toISOString();
        product.updatedAt = new Date().toISOString();

        const index = products.findIndex(p => p.id === product.id);
        if (index >= 0) {
            products[index] = product;
        } else {
            products.unshift(product);
        }

        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        this.emit('PRODUCT_UPDATED', { action: index >= 0 ? 'edit' : 'add', product });
        return product;
    },

    // Vendor REMOVE item capability
    deleteProduct: function(productId) {
        let products = this.getProducts();
        const target = products.find(p => p.id === productId);
        products = products.filter(p => p.id !== productId);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        this.emit('PRODUCT_DELETED', { productId, targetTitle: target ? target.title : '' });
        return true;
    },

    // Orders
    getOrders: function() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error reading orders:', e);
            return [];
        }
    },

    createOrder: function(orderData) {
        const orders = this.getOrders();
        const orderId = 'PPS-' + Math.floor(100000 + Math.random() * 900000);
        
        const newOrder = {
            id: orderId,
            createdAt: new Date().toISOString(),
            status: 'Pending', // Pending, Preparing, OutForDelivery, Delivered, Cancelled
            customer: orderData.customer,
            items: orderData.items,
            totalAmount: orderData.totalAmount,
            discount: orderData.discount || 0,
            paymentMethod: orderData.paymentMethod || 'Cash on Delivery',
            paymentStatus: orderData.paymentStatus || 'Pending',
            deliveryAddress: orderData.deliveryAddress,
            notes: orderData.notes || ''
        };

        orders.unshift(newOrder);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

        // Add to notifications
        this.addNotification({
            id: 'NOTIF-' + Date.now(),
            orderId: newOrder.id,
            title: `🔔 New Order Placed: #${newOrder.id}`,
            message: `${newOrder.customer.name} ordered ${newOrder.items.length} item(s) worth ₹${newOrder.totalAmount}`,
            timestamp: new Date().toISOString(),
            read: false,
            order: newOrder
        });

        // Broadcast to vendor app immediately
        this.emit('ORDER_PLACED', newOrder);
        return newOrder;
    },

    deleteOrder: function(orderId) {
        let orders = this.getOrders();
        orders = orders.filter(o => o.id !== orderId);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
        this.emit('ORDER_DELETED', { orderId });
        return true;
    },

    updateOrderStatus: function(orderId, newStatus) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            order.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
            this.emit('ORDER_STATUS_CHANGED', { orderId, status: newStatus });
        }
        return order;
    },

    // Notifications
    getNotifications: function() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addNotification: function(notif) {
        const notifs = this.getNotifications();
        notifs.unshift(notif);
        if (notifs.length > 50) notifs.length = 50;
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    },

    // Real-Time Event Communication
    emit: function(type, payload) {
        const message = { type, payload, timestamp: Date.now() };
        if (broadcastChannel) {
            broadcastChannel.postMessage(message);
        }
        localStorage.setItem('panda_last_event', JSON.stringify(message));
    },

    on: function(callback) {
        if (broadcastChannel) {
            broadcastChannel.onmessage = (event) => {
                if (event.data) callback(event.data);
            };
        }
        window.addEventListener('storage', (e) => {
            if (e.key === 'panda_last_event' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    callback(parsed);
                } catch (err) {}
            }
        });
    }
};

// Utilities
function formatCurrency(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
