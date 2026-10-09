const navlinks = document.querySelectorAll(".navlink");
const productContainer = document.querySelector('.products');

try {
	const catalog = Array.from(document.querySelectorAll('.product')).map((product, index) => ({
		name: product.querySelector('.product-details div')?.textContent.trim() || `Product ${index + 1}`,
		price: product.querySelector('.product-details div:nth-child(2)')?.textContent.trim() || '',
		image: product.querySelector('img')?.getAttribute('src') || ''
	}));
	window.VCartProducts.syncCatalog(catalog).catch((error) => {
		console.error('Could not update the saved storefront catalog count.', error);
	});
} catch (error) {
	console.error('Could not update the saved storefront catalog count.', error);
}

async function renderApprovedProducts() {
	if (!productContainer) return;
	try {
		const products = (await window.VCartProducts.list())
			.filter((product) => product.status !== 'Blocked');
		productContainer.querySelectorAll('[data-approved-product]').forEach((product) => product.remove());

		products.slice().reverse().forEach((product) => {
			const card = document.createElement('div');
			card.className = 'product';
			card.dataset.approvedProduct = product.requestId;

			const imageContainer = document.createElement('div');
			imageContainer.className = 'product-image';
			const image = document.createElement('img');
			const firstImage = Array.isArray(product.images) ? product.images[0] : '';
			image.src = typeof firstImage === 'string' && firstImage.startsWith('data:image/')
				? firstImage
				: 'images/images.jpg';
			image.alt = `${product.name || 'Product'} image`;
			imageContainer.append(image);

			const details = document.createElement('div');
			details.className = 'product-details';
			const name = document.createElement('div');
			name.textContent = product.name || 'Product';
			const price = document.createElement('div');
			price.textContent = `₹${product.price || ''}`;
			details.append(name, price);
			card.append(imageContainer, details);
			productContainer.append(card);
		});
	} catch (error) {
		console.error('Could not load approved storefront products.', error);
		const message = document.createElement('p');
		message.setAttribute('role', 'alert');
		message.textContent = 'Could not load products. Check your internet connection and Supabase setup, then refresh.';
		productContainer.replaceChildren(message);
	}
}

window.addEventListener('vshop:storage', (event) => {
	if (event.detail?.key === 'vshopProducts') {
		renderApprovedProducts();
	}
});

window.addEventListener('storage', (event) => {
	if (event.key === 'vshopProducts') {
		renderApprovedProducts();
	}
});

renderApprovedProducts();

            navlinks.forEach(navlink => {
                navlink.addEventListener("click", () => {
                    navlinks.forEach(item => item.classList.remove("active"));
                    navlink.classList.add("active");
                });
            });