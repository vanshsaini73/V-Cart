(() => {
    if (!window.VCartAccountSession.requireCustomer()) {
        return;
    }

    const storageKey = 'vcartCart';
    const cartContainer = document.getElementById('cart-items');
    const itemTemplate = document.getElementById('cart-item-template');
    const emptyMessage = document.querySelector('.cart-empty');
    const priceSummary = document.getElementById('final-price');
    const nextButton = document.querySelector('.next-button');
    const closeButton = document.querySelector('.close-price-button');
    const backdrop = document.querySelector('.price-backdrop');
    const proceedButton = document.querySelector('.checkout-button');
    let cartItems = [];

    function parsePrice(priceText) {
        const amount = Number(String(priceText).replace(/[^\d.]/g, ''));
        return Number.isFinite(amount) ? amount : NaN;
    }

    function formatPrice(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    function readCart() {
        const savedItems = window.sessionStorage.getItem(storageKey);
        if (!savedItems) {
            return [];
        }

        const items = JSON.parse(savedItems);
        if (!Array.isArray(items) || items.some(item =>
            !item
            || typeof item.id !== 'string'
            || typeof item.image !== 'string'
            || typeof item.name !== 'string'
            || typeof item.price !== 'string'
            || typeof item.oldPrice !== 'string'
            || typeof item.discount !== 'string'
            || !Number.isFinite(Number(item.quantity))
        )) {
            throw new Error('Saved cart data is invalid.');
        }

        return items;
    }

    function saveCart() {
        window.sessionStorage.setItem(storageKey, JSON.stringify(cartItems));
    }

    function updatePriceSummary() {
        const selectedItems = cartItems.filter(item => item.selected !== false);
        const quantity = selectedItems.reduce((total, item) => total + Number(item.quantity), 0);
        const productTotal = selectedItems.reduce((total, item) =>
            total + parsePrice(item.oldPrice) * Number(item.quantity), 0);
        const subtotal = selectedItems.reduce((total, item) =>
            total + parsePrice(item.price) * Number(item.quantity), 0);
        const discount = productTotal - subtotal;

        document.getElementById('price-item-count').textContent = String(quantity);
        document.getElementById('price-product-total').textContent = formatPrice(productTotal);
        document.getElementById('price-discount-total').textContent = `−${formatPrice(discount)}`;
        document.getElementById('price-subtotal').textContent = formatPrice(subtotal);
        document.getElementById('price-grand-total').textContent = formatPrice(subtotal);
    }

    function syncWishlistButtons() {
        const wishlistIds = new Set(window.VCartWishlist.getAll().map(item => item.id));
        cartContainer.querySelectorAll('.product').forEach(product => {
            const button = product.querySelector('.wishlist-button');
            button.textContent = wishlistIds.has(product.dataset.cartItemId)
                ? 'Remove from Wishlist'
                : 'Move to Wishlist';
        });
    }

    function renderCart() {
        cartContainer.querySelectorAll('.product').forEach(product => product.remove());
        emptyMessage.hidden = cartItems.length > 0;

        cartItems.forEach(item => {
            const product = itemTemplate.content.firstElementChild.cloneNode(true);
            product.dataset.cartItemId = item.id;
            product.querySelector('.product-image img').src = item.image;
            product.querySelector('.product-image img').alt = item.name;
            product.querySelector('.product-name').textContent = item.name;
            product.querySelector('.product-price del').textContent = item.oldPrice;
            product.querySelector('.current-price').textContent = item.price;
            product.querySelector('.discount-label').textContent = item.discount;
            product.querySelector('.quantity-value').textContent = String(item.quantity);
            const checkbox = product.querySelector('.select-product input');
            checkbox.checked = item.selected !== false;
            checkbox.setAttribute('aria-label', `Select ${item.name}`);
            cartContainer.append(product);
        });

        syncWishlistButtons();
        updatePriceSummary();
    }

    function checkoutItem(item) {
        const checkoutUrl = new URL('checkout.html', window.location.href);
        checkoutUrl.search = new URLSearchParams({
            image: item.image,
            oldPrice: item.oldPrice,
            discount: item.discount,
            price: item.price,
            name: item.name
        }).toString();
        window.location.href = checkoutUrl.toString();
    }

    proceedButton.addEventListener('click', () => {
        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        const selectedItems = cartItems.filter(item => item.selected !== false);
        if (selectedItems.length === 0) {
            alert('Select at least one product to proceed to checkout.');
            return;
        }

        try {
            window.sessionStorage.setItem('vcartCheckoutItems', JSON.stringify(selectedItems));
            window.location.href = new URL('checkout.html?source=cart', window.location.href).toString();
        } catch (error) {
            console.error('Could not start checkout.', error);
            alert('Could not proceed to checkout. Check browser storage and try again.');
        }
    });

    function closePriceSummary() {
        priceSummary.classList.remove('is-open');
        priceSummary.removeAttribute('role');
        priceSummary.removeAttribute('aria-modal');
        backdrop.hidden = true;
        nextButton.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('price-modal-open');
    }

    function openPriceSummary() {
        priceSummary.classList.add('is-open');
        priceSummary.setAttribute('role', 'dialog');
        priceSummary.setAttribute('aria-modal', 'true');
        backdrop.hidden = false;
        nextButton.setAttribute('aria-expanded', 'true');
        document.body.classList.add('price-modal-open');
        closeButton.focus();
    }

    cartContainer.addEventListener('click', event => {
        const button = event.target.closest('button');
        const product = button && button.closest('.product');
        if (!product) {
            return;
        }

        const itemIndex = cartItems.findIndex(item => item.id === product.dataset.cartItemId);
        if (itemIndex === -1) {
            return;
        }

        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        if (button.matches('[data-quantity-change]')) {
            const change = Number(button.dataset.quantityChange);
            cartItems[itemIndex].quantity = Math.max(1, Number(cartItems[itemIndex].quantity) + change);
            product.querySelector('.quantity-value').textContent = String(cartItems[itemIndex].quantity);
            saveCart();
            updatePriceSummary();
        } else if (button.matches('.remove-button')) {
            cartItems.splice(itemIndex, 1);
            saveCart();
            renderCart();
        } else if (button.matches('.wishlist-button')) {
            const item = cartItems[itemIndex];
            try {
                window.VCartWishlist.toggle({
                    id: item.id,
                    image: item.image,
                    name: item.name,
                    price: item.price,
                    oldPrice: item.oldPrice,
                    discount: item.discount,
                    description: item.description || '',
                    category: item.category || ''
                });
            } catch (error) {
                console.error('Could not update the wishlist.', error);
                alert('Could not update your wishlist. Check browser storage and try again.');
            }
        } else if (button.matches('.order-button')) {
            checkoutItem(cartItems[itemIndex]);
        }
    });

    cartContainer.addEventListener('change', event => {
        if (!event.target.matches('.select-product input')) {
            return;
        }

        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        const product = event.target.closest('.product');
        const item = cartItems.find(cartItem => cartItem.id === product.dataset.cartItemId);
        if (item) {
            item.selected = event.target.checked;
            saveCart();
            updatePriceSummary();
        }
    });

    nextButton.addEventListener('click', openPriceSummary);
    closeButton.addEventListener('click', closePriceSummary);
    backdrop.addEventListener('click', closePriceSummary);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && priceSummary.classList.contains('is-open')) {
            closePriceSummary();
            nextButton.focus();
        }
    });

    window.addEventListener('storage', event => {
        if (event.key === storageKey || event.key === 'vcartWishlist') {
            try {
                if (event.key === storageKey) {
                    cartItems = readCart();
                    renderCart();
                } else {
                    syncWishlistButtons();
                }
            } catch (error) {
                console.error('Could not sync the cart.', error);
                alert('Could not sync your cart. Check browser storage and refresh the page.');
            }
        }
    });

    window.addEventListener('vcart:wishlistchange', syncWishlistButtons);

    try {
        cartItems = readCart();
        renderCart();
    } catch (error) {
        console.error('Could not load the cart.', error);
        alert('Could not load your cart. Check browser storage and refresh the page.');
    }
})();
