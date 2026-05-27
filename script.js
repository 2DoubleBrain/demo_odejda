// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let products = [];
let categories = [];
let subcategories = {};
let shopConfig = {};
let cart = [];
let currentPage = 'shop';
let currentGender = 'all';
let currentCategory = 'all';
let currentSubcategory = 'all';
let currentSize = 'all';

// Переменные для модального окна
let currentProduct = null;
let selectedSize = null;
let selectedPrice = null;
let selectedQuantity = 1;

// ============ КОНФИГУРАЦИЯ ============
const genders = [
    { id: 'all', name: 'Все', icon: '👥' },
    { id: 'boy', name: 'Мальчик', icon: '👦' },
    { id: 'girl', name: 'Девочка', icon: '👧' },
    { id: 'man', name: 'Мужчина', icon: '👨' },
    { id: 'woman', name: 'Женщина', icon: '👩' }
];

// Размеры для одежды
const clothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
// Размеры для обуви
const shoeSizes = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

// Структура подкатегорий
const defaultSubcategories = {
    "Одежда": ["Джинсы", "Брюки", "Футболки", "Рубашки", "Свитеры", "Куртки", "Платья", "Юбки", "Шорты"],
    "Обувь": ["Кеды и кроссовки", "Шлепанцы", "Тапочки", "Ботинки", "Сапоги", "Туфли"],
    "Аксессуары": ["Бижутерия", "Брелоки", "Головные уборы", "Перчатки", "Варежки", "Солнцезащитные очки", "Сумки", "Шарфы", "Ремни", "Кошельки"]
};

// ============ ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ ============
function getUserInfo() {
    let userName = 'Неизвестный';
    let userId = 'Неизвестно';
    let userUsername = 'Нет username';
    let userPhone = 'Не указан';
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            userName = user.first_name || '';
            if (user.last_name) userName += ' ' + user.last_name;
            if (!userName.trim()) userName = 'Пользователь';
            userId = user.id || 'Неизвестно';
            userUsername = user.username ? '@' + user.username : 'Нет username';
        }
    }
    
    const savedUser = localStorage.getItem('nova_user_info');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.userPhone) userPhone = parsed.userPhone;
        if (!userName || userName === 'Неизвестный') {
            userName = parsed.userName;
            userUsername = parsed.userUsername;
        }
    }
    return { userName, userId, userUsername, userPhone };
}

function saveUserInfo(phoneNumber = null) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            let userName = user.first_name || '';
            if (user.last_name) userName += ' ' + user.last_name;
            if (!userName.trim()) userName = 'Пользователь';
            const existing = localStorage.getItem('nova_user_info');
            let existingPhone = null;
            if (existing) {
                const parsed = JSON.parse(existing);
                existingPhone = parsed.userPhone;
            }
            const userInfo = {
                userName: userName,
                userId: user.id,
                userUsername: user.username ? '@' + user.username : 'Нет username',
                userPhone: phoneNumber || existingPhone || 'Не указан'
            };
            localStorage.setItem('nova_user_info', JSON.stringify(userInfo));
        }
    }
}

// ============ ЗАГРУЗКА ДАННЫХ ============
async function loadData() {
    try {
        console.log('Загрузка data.json...');
        const response = await fetch('./data.json?' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные загружены, товаров:', data.products?.length || 0);
        
        products = data.products || [];
        categories = data.categories || ["Одежда", "Обувь", "Аксессуары"];
        subcategories = data.subcategories || defaultSubcategories;
        shopConfig = {
            shopName: data.shopName || 'Nova Fashion',
            contactPhone: data.contactPhone || '+7 (968) 890-07-44',
            managerTgId: data.managerTgId || '5404907427',
            botToken: data.botToken || ''
        };
        
        const savedCart = localStorage.getItem('nova_cart');
        if (savedCart) {
            try {
                cart = JSON.parse(savedCart);
            } catch(e) { cart = []; }
        }
        
        if (window.Telegram && window.Telegram.WebApp) window.Telegram.WebApp.expand();
        
        initApp();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('mainContent').innerHTML = `
            <div style="text-align:center; padding:50px; color:red;">
                ❌ Ошибка загрузки данных<br>
                <small>${error.message}</small><br><br>
                <button onclick="location.reload()" style="padding:10px 20px; background:#1a1a2e; color:white; border:none; border-radius:10px;">↻ Перезагрузить</button>
            </div>
        `;
    }
}

function initApp() {
    saveUserInfo();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (currentPage === 'shop') renderShopPage();
        });
    }
    
    switchPage('shop');
    updateCartBadge();
}

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    if (page === 'shop') renderShopPage();
    else if (page === 'sales') renderSalesPage();
    else if (page === 'cart') renderCartPage();
    else if (page === 'contacts') renderContactsPage();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateCartBadge();
}

// ============ ФИЛЬТРАЦИЯ ============
function getFilteredProducts() {
    let filtered = [...products];
    
    // Фильтр по полу (если not all)
    if (currentGender !== 'all') {
        filtered = filtered.filter(p => p.gender === currentGender);
    }
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // Фильтр по подкатегории
    if (currentSubcategory !== 'all') {
        filtered = filtered.filter(p => p.subcategory === currentSubcategory);
    }
    
    // Фильтр по размеру
    if (currentSize !== 'all') {
        filtered = filtered.filter(p => {
            if (p.sizes && p.sizes.length) {
                return p.sizes.includes(currentSize);
            }
            return false;
        });
    }
    
    return filtered;
}

function getAvailableSubcategories() {
    if (currentCategory === 'all') return [];
    return subcategories[currentCategory] || [];
}

function getAvailableSizes() {
    const filtered = getFilteredProducts();
    const allSizes = new Set();
    filtered.forEach(p => {
        if (p.sizes && p.sizes.length) {
            p.sizes.forEach(s => allSizes.add(s));
        }
    });
    return Array.from(allSizes).sort((a, b) => {
        if (isNaN(parseInt(a)) && !isNaN(parseInt(b))) return 1;
        if (!isNaN(parseInt(a)) && isNaN(parseInt(b))) return -1;
        if (!isNaN(parseInt(a)) && !isNaN(parseInt(b))) return parseInt(a) - parseInt(b);
        return a.localeCompare(b);
    });
}

function resetFilters() {
    currentGender = 'all';
    currentCategory = 'all';
    currentSubcategory = 'all';
    currentSize = 'all';
    renderShopPage();
}

// ============ ЛОГИКА КОРЗИНЫ ============
function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function saveCart() {
    localStorage.setItem('nova_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function getVariantType(product) {
    if (product.sizes && product.sizes.length > 0) {
        return { type: 'sizes', label: 'Выберите размер', items: product.sizes };
    }
    return null;
}

// ============ ОТПРАВКА ЗАКАЗА В TELEGRAM ============
async function sendOrderToTelegram(orderText) {
    if (!shopConfig.botToken) {
        console.log('Бот не настроен');
        alert('⚠️ Заказ создан, но бот не настроен. Сообщите менеджеру.');
        return;
    }
    try {
        const response = await fetch(`https://api.telegram.org/bot${shopConfig.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: shopConfig.managerTgId, text: orderText, parse_mode: 'HTML' })
        });
        const result = await response.json();
        if (result.ok) console.log('Заказ отправлен');
        else console.error('Ошибка:', result.description);
    } catch(error) { console.error('Ошибка:', error); }
}

// ============ ФОРМА ОФОРМЛЕНИЯ ЗАКАЗА ============
function openCheckoutForm() {
    if (cart.length === 0) { alert('Корзина пуста'); return; }
    const userInfo = getUserInfo();
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Оформление заказа</h3>
                <button class="close-modal" onclick="closeCheckoutModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="orderForm" class="checkout-form">
                    <div class="form-group"><label>ФИО *</label><input type="text" id="fullName" placeholder="Иванов Иван Иванович" required></div>
                    <div class="form-group"><label>Город *</label><input type="text" id="city" placeholder="Москва" required></div>
                    <div class="form-group"><label>Адрес доставки *</label><textarea id="address" placeholder="Улица, дом, квартира/офис" required></textarea></div>
                    <div class="form-group"><label>Номер телефона *</label><input type="tel" id="phone" placeholder="+7 (999) 123-45-67" value="${userInfo.userPhone !== 'Не указан' ? userInfo.userPhone : ''}" required></div>
                    <div class="form-group"><label>Комментарий</label><textarea id="comment" placeholder="Дополнительная информация..."></textarea></div>
                    <button type="submit" class="submit-order-btn">✅ Подтвердить заказ</button>
                </form>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    const form = document.getElementById('orderForm');
    if (form) form.onsubmit = (e) => { e.preventDefault(); submitOrder(); };
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
}

function submitOrder() {
    const fullName = document.getElementById('fullName')?.value.trim();
    const city = document.getElementById('city')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const comment = document.getElementById('comment')?.value.trim();
    if (!fullName) { alert('Введите ФИО'); return; }
    if (!city) { alert('Введите город'); return; }
    if (!address) { alert('Введите адрес'); return; }
    if (!phone) { alert('Введите телефон'); return; }
    
    const userInfo = getUserInfo();
    let order = '🛍️ <b>НОВЫЙ ЗАКАЗ (Nova Fashion)</b>\n\n━━━━━━━━━━━━━━━━\n<b>📋 ДАННЫЕ ПОКУПАТЕЛЯ</b>\n━━━━━━━━━━━━━━━━\n';
    order += `👤 <b>ФИО:</b> ${fullName}\n🏙️ <b>Город:</b> ${city}\n📍 <b>Адрес:</b> ${address}\n📞 <b>Телефон:</b> ${phone}\n📱 <b>Telegram:</b> ${userInfo.userUsername}\n🆔 <b>ID:</b> <code>${userInfo.userId}</code>\n`;
    if (comment) order += `💬 <b>Комментарий:</b> ${comment}\n`;
    order += `━━━━━━━━━━━━━━━━\n\n<b>🛒 СОСТАВ ЗАКАЗА</b>\n━━━━━━━━━━━━━━━━\n`;
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        order += `📦 ${item.name}\n   💰 ${item.price}₽ × ${item.quantity} = ${itemTotal}₽\n`;
        if (item.selectedSize) order += `   👕 Размер: ${item.selectedSize}\n`;
        order += `\n`;
    });
    order += `━━━━━━━━━━━━━━━━\n<b>💰 ИТОГО: ${total}₽</b>\n\n📅 ${new Date().toLocaleString('ru-RU')}`;
    
    sendOrderToTelegram(order);
    alert('✅ Заказ оформлен! Менеджер свяжется с вами.');
    cart = [];
    saveCart();
    closeCheckoutModal();
    if (currentPage === 'cart') renderCartPage();
    updateCartBadge();
}

// ============ ОТОБРАЖЕНИЕ ============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderProductCard(product) {
    let displayPrice = product.price || 0;
    const productJson = JSON.stringify(product).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
    const rightContent = product.sale ? '<span class="sale-badge">🔥 SALE</span>' : '<span class="sale-placeholder"></span>';
    
    let genderIcon = '';
    if (product.gender === 'boy') genderIcon = '👦 ';
    else if (product.gender === 'girl') genderIcon = '👧 ';
    else if (product.gender === 'man') genderIcon = '👨 ';
    else if (product.gender === 'woman') genderIcon = '👩 ';
    
    return `
        <div class="product-card" onclick='openProductModal(${productJson})'>
            <img src="${product.photo || 'https://placehold.co/300x200/eee/999?text=No+Image'}" class="product-image" onerror="this.src='https://placehold.co/300x200/eee/999?text=No+Image'">
            <div class="product-info">
                <div class="product-name">${genderIcon}${escapeHtml(product.name)}</div>
                <div class="product-price-wrapper">
                    <span class="product-price">${displayPrice}₽</span>
                    ${rightContent}
                </div>
                <button class="open-btn">Выбрать размер</button>
            </div>
        </div>
    `;
}

function renderFilters() {
    const availableSubcategories = getAvailableSubcategories();
    const availableSizes = getAvailableSizes();
    
    let html = `
        <div class="filters-container">
            <div class="filter-section">
                <div class="filter-title">👥 Для кого</div>
                <div class="filter-buttons">
                    ${genders.map(g => `<button class="filter-btn ${currentGender === g.id ? 'active' : ''}" data-filter="gender" data-value="${g.id}">${g.icon} ${g.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="filter-section">
                <div class="filter-title">📁 Категория</div>
                <div class="filter-buttons">
                    <button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" data-filter="category" data-value="all">📦 Все</button>
                    ${categories.map(c => `<button class="filter-btn ${currentCategory === c ? 'active' : ''}" data-filter="category" data-value="${c}">${c === 'Одежда' ? '👕' : c === 'Обувь' ? '👟' : '🧢'} ${c}</button>`).join('')}
                </div>
            </div>
            
            ${currentCategory !== 'all' && availableSubcategories.length > 0 ? `
            <div class="filter-section">
                <div class="filter-title">📂 Подкатегория</div>
                <div class="filter-buttons">
                    <button class="filter-btn ${currentSubcategory === 'all' ? 'active' : ''}" data-filter="subcategory" data-value="all">Все</button>
                    ${availableSubcategories.map(s => `<button class="filter-btn ${currentSubcategory === s ? 'active' : ''}" data-filter="subcategory" data-value="${s}">📌 ${s}</button>`).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="filter-section">
                <div class="filter-title">📏 Размер</div>
                <div class="filter-buttons">
                    <button class="filter-btn ${currentSize === 'all' ? 'active' : ''}" data-filter="size" data-value="all">Все размеры</button>
                    ${availableSizes.map(s => `<button class="filter-btn ${currentSize === s ? 'active' : ''}" data-filter="size" data-value="${s}">${s}</button>`).join('')}
                </div>
            </div>
            
            <div class="filter-reset">
                <button class="reset-btn" onclick="resetFilters()">🔄 Сбросить все фильтры</button>
            </div>
        </div>
    `;
    
    return html;
}

function renderShopPage() {
    if (!products.length) {
        document.getElementById('mainContent').innerHTML = '<div style="text-align:center; padding:50px">Загрузка товаров...</div>';
        return;
    }
    
    const filtered = getFilteredProducts();
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    let searched = filtered;
    if (searchTerm) {
        searched = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm)));
    }
    
    const popular = searched.filter(p => p.popular);
    const other = searched.filter(p => !p.popular);
    
    let html = renderFilters();
    html += `<div class="products-count">Найдено товаров: ${searched.length}</div>`;
    
    if (popular.length) html += `<h2 class="section-title">⭐ Популярное</h2><div class="products-grid">${popular.map(p => renderProductCard(p)).join('')}</div>`;
    if (other.length) html += `<h2 class="section-title">📦 Все товары</h2><div class="products-grid">${other.map(p => renderProductCard(p)).join('')}</div>`;
    if (!searched.length) html += `<div style="text-align:center;padding:50px">🔍 Ничего не найдено<br><small>Попробуйте изменить фильтры</small></div>`;
    
    document.getElementById('mainContent').innerHTML = html;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = btn.dataset.filter;
            const value = btn.dataset.value;
            
            if (filterType === 'gender') {
                currentGender = value;
                currentSubcategory = 'all';
                currentSize = 'all';
            }
            if (filterType === 'category') {
                currentCategory = value;
                currentSubcategory = 'all';
                currentSize = 'all';
            }
            if (filterType === 'subcategory') currentSubcategory = value;
            if (filterType === 'size') currentSize = value;
            
            renderShopPage();
        });
    });
}

function renderSalesPage() {
    if (!products.length) { document.getElementById('mainContent').innerHTML = '<div style="text-align:center; padding:50px">Загрузка...</div>'; return; }
    const saleProducts = products.filter(p => p.sale === true);
    let html = renderFilters();
    html += `<h2 class="section-title">🔥 Акции</h2><div class="products-grid">${saleProducts.length ? saleProducts.map(p => renderProductCard(p)).join('') : '<div style="text-align:center;padding:50px">Нет товаров по акции</div>'}</div>`;
    document.getElementById('mainContent').innerHTML = html;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = btn.dataset.filter;
            const value = btn.dataset.value;
            if (filterType === 'gender') currentGender = value;
            if (filterType === 'category') currentCategory = value;
            if (filterType === 'subcategory') currentSubcategory = value;
            if (filterType === 'size') currentSize = value;
            renderSalesPage();
        });
    });
}

function renderCartPage() {
    if (!cart.length) {
        document.getElementById('mainContent').innerHTML = `<div style="min-height: 60vh; display: flex; align-items: center; justify-content: center;"><div class="empty-cart">🛒 Корзина пуста</div></div>`;
        return;
    }
    let total = getCartTotal();
    let html = `<h2 class="section-title">🛒 Корзина</h2><div class="cart-items-list">`;
    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        html += `<div class="cart-item"><div class="cart-item-info"><div class="cart-item-title">${escapeHtml(item.name)}</div><div class="cart-item-price">${item.price}₽ × ${item.quantity} = ${itemTotal}₽</div><div class="cart-item-details">${item.selectedSize ? `📏 Размер: ${item.selectedSize}` : ''}</div></div><div class="cart-item-controls"><button class="quantity-btn" data-idx="${idx}" data-delta="-1">−</button><span>${item.quantity}</span><button class="quantity-btn" data-idx="${idx}" data-delta="1">+</button><button class="remove-item" data-idx="${idx}">🗑️</button></div></div>`;
    });
    html += `</div><div class="cart-total"><h3>Итого: ${total}₽</h3><button class="checkout-btn" id="checkoutBtn">✅ Оформить заказ</button></div>`;
    document.getElementById('mainContent').innerHTML = html;
    
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            const delta = parseInt(btn.dataset.delta);
            const newQty = cart[idx].quantity + delta;
            if (newQty <= 0) cart.splice(idx, 1);
            else cart[idx].quantity = newQty;
            saveCart();
            renderCartPage();
            updateCartBadge();
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => { 
            cart.splice(parseInt(btn.dataset.idx), 1); 
            saveCart(); 
            renderCartPage(); 
            updateCartBadge();
        });
    });
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutForm);
}

function renderContactsPage() {
    const phone = shopConfig.contactPhone || "+7 (999) 123-45-67";
    document.getElementById('mainContent').innerHTML = `<div class="contacts-page"><h2 class="section-title">📞 Контакты</h2><div class="contact-phone">${phone}</div><p>Свяжитесь с нами любым удобным способом</p><p style="margin-top:20px; color:#888">Работаем ежедневно 10:00-21:00</p></div>`;
}

// ============ МОДАЛЬНОЕ ОКНО ТОВАРА ============
function openProductModal(product) {
    currentProduct = product;
    selectedSize = null;
    selectedPrice = product.price;
    selectedQuantity = 1;
    
    const variantInfo = getVariantType(product);
    
    let sizesHtml = '';
    if (variantInfo && variantInfo.items && variantInfo.items.length) {
        sizesHtml = `<div id="step1Container">
            <div class="step-title"><span class="step-number">1</span> ${variantInfo.label}</div>
            <div class="variants-grid" id="sizesGrid">
                ${variantInfo.items.map(s => `<button class="variant-option" data-size="${s}">${s}</button>`).join('')}
            </div>
        </div>`;
    }
    
    const modal = document.getElementById('modalOverlay');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="back-modal-btn" id="backModalBtn">← Назад</button>
                <h3 id="modalTitle">${escapeHtml(product.name)}</h3>
                <button class="close-modal" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <img src="${product.photo || 'https://placehold.co/300x200/eee/999?text=No+Image'}" class="modal-image" onerror="this.src='https://placehold.co/300x200/eee/999?text=No+Image'">
                <p style="color:#666; margin-bottom:10px;">${escapeHtml(product.description || '')}</p>
                <p style="font-size:18px; font-weight:bold; color:#e74c3c; margin-bottom:15px;">${product.price} ₽</p>
                ${sizesHtml}
                <div id="quantityContainer" style="display:none;">
                    <div class="step-title"><span class="step-number">2</span> Выберите количество</div>
                    <div class="quantity-selector">
                        <label>Количество:</label>
                        <div class="quantity-controls">
                            <button class="quantity-btn-modal" id="decreaseQty">−</button>
                            <span class="quantity-value" id="quantityValue">1</span>
                            <button class="quantity-btn-modal" id="increaseQty">+</button>
                        </div>
                    </div>
                    <div class="total-amount" id="totalAmount">
                        Итого: <span id="totalSum">${product.price}</span> ₽
                    </div>
                </div>
                <button class="add-to-cart-btn disabled" id="addToCartBtn">⬅️ Сначала выберите размер</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    
    const backBtn = document.getElementById('backModalBtn');
    if (backBtn) backBtn.onclick = () => closeModal();
    
    function updateTotalDisplay() {
        const totalSpan = document.getElementById('totalSum');
        if (totalSpan && selectedPrice) {
            totalSpan.textContent = selectedPrice * selectedQuantity;
        }
    }
    
    function setupQuantityButtons() {
        const decreaseBtn = document.getElementById('decreaseQty');
        const increaseBtn = document.getElementById('increaseQty');
        const quantitySpan = document.getElementById('quantityValue');
        if (decreaseBtn && increaseBtn && quantitySpan) {
            const newDec = decreaseBtn.cloneNode(true);
            const newInc = increaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(newDec, decreaseBtn);
            increaseBtn.parentNode.replaceChild(newInc, increaseBtn);
            newDec.onclick = () => { 
                if (selectedQuantity > 1) { 
                    selectedQuantity--; 
                    quantitySpan.textContent = selectedQuantity; 
                    updateTotalDisplay(); 
                } 
            };
            newInc.onclick = () => { 
                selectedQuantity++; 
                quantitySpan.textContent = selectedQuantity; 
                updateTotalDisplay(); 
            };
        }
        updateTotalDisplay();
    }
    
    if (variantInfo && variantInfo.items && variantInfo.items.length) {
        setTimeout(() => {
            document.querySelectorAll('.variant-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.variant-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedSize = btn.dataset.size;
                    
                    const quantityContainer = document.getElementById('quantityContainer');
                    if (quantityContainer) quantityContainer.style.display = 'block';
                    
                    document.getElementById('addToCartBtn').textContent = '🛒 Добавить в корзину';
                    document.getElementById('addToCartBtn').classList.remove('disabled');
                    setupQuantityButtons();
                });
            });
        }, 50);
    }
    
    const addBtn = document.getElementById('addToCartBtn');
    addBtn.onclick = () => {
        if (!selectedSize) { 
            alert('Сначала выберите размер'); 
            return; 
        }
        
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            selectedSize: selectedSize,
            quantity: selectedQuantity
        });
        
        saveCart();
        alert(`✅ ${selectedQuantity} шт "${product.name}" (размер ${selectedSize}) добавлено в корзину`);
        closeModal();
        if (currentPage === 'cart') renderCartPage();
        updateCartBadge();
    };
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
}

// ============ ЗАПУСК ============
loadData();
