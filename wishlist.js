(function () {
    const storageKey = 'vcartWishlist';

    function getAll() {
        const savedWishlist = window.sessionStorage.getItem(storageKey);
        if (!savedWishlist) {
            return [];
        }

        const items = JSON.parse(savedWishlist);
        if (!Array.isArray(items)) {
            throw new Error('Saved wishlist data is invalid.');
        }

        return items;
    }

    function save(items) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(items));
        window.dispatchEvent(new Event('vcart:wishlistchange'));
    }

    function getProduct(productCard) {
        const detailPageImage = productCard.querySelector('#detail-image');
        const image = detailPageImage || productCard.querySelector('.product-image img');
        const imageSrc = image ? image.getAttribute('src') : '';
        const priceElement = productCard.querySelector(detailPageImage ? '#detail-price' : '.new-price');
        const nameElement = productCard.querySelector(detailPageImage ? '#detail-name' : '.product-name');
        const oldPriceElement = productCard.querySelector(detailPageImage ? '#detail-old-price' : '.old-price');
        const discountElement = productCard.querySelector(detailPageImage ? '#detail-discount' : '.discount');
        const descriptionElement = productCard.querySelector(
            detailPageImage ? '#detail-description-content' : '.product-description'
        );
        const price = priceElement ? priceElement.textContent.trim() : '';
        const name = nameElement ? nameElement.textContent.trim() : '';

        if (!imageSrc || !name) {
            throw new Error('Product is missing an image or name.');
        }

        return {
            id: productCard.dataset.productId || `${imageSrc}::${price}`,
            image: imageSrc,
            name,
            price,
            oldPrice: oldPriceElement ? oldPriceElement.textContent.trim() : price,
            discount: discountElement ? discountElement.textContent.trim() : '0% OFF',
            description: descriptionElement
                ? productCard.dataset.description || descriptionElement.innerText.trim()
                : '',
            category: productCard.dataset.category || '',
            specs: productCard.dataset.specs ? JSON.parse(productCard.dataset.specs) : []
        };
    }

    function toggle(product) {
        const items = getAll();
        const existingIndex = items.findIndex(item => item.id === product.id);

        if (existingIndex !== -1) {
            items.splice(existingIndex, 1);
            save(items);
            return false;
        }

        items.push(product);
        save(items);
        return true;
    }

    function remove(productId) {
        const items = getAll();
        const remainingItems = items.filter(item => item.id !== productId);
        if (remainingItems.length !== items.length) {
            save(remainingItems);
        }
    }

    window.VCartWishlist = { getAll, getProduct, toggle, remove };
})();
