const customerNavLinks = document.querySelectorAll('.navbar .nav-item[data-section]');
const customerSections = document.querySelectorAll('.content-section');
const wishlistProducts = document.getElementById('wishlist-products');
const wishlistEmptyMessage = document.getElementById('wishlist-empty');

function showCustomerSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (!section || !section.classList.contains('content-section')) return;

	customerSections.forEach((item) => {
		const isActive = item === section;
		item.classList.toggle('active', isActive);
		item.hidden = !isActive;
	});

	customerNavLinks.forEach((link) => {
		const isActive = link.dataset.section === sectionId;
		link.classList.toggle('active', isActive);
		link.setAttribute('aria-pressed', String(isActive));
	});

	if (sectionId === 'my-wishlist') {
		renderWishlist();
	}
}

function renderWishlist() {
	if (!wishlistProducts || !wishlistEmptyMessage) return;

	let items;
	try {
		items = window.VCartWishlist.getAll();
	} catch (error) {
		console.error('Could not load the wishlist.', error);
		wishlistProducts.replaceChildren();
		wishlistEmptyMessage.textContent = 'Could not load your wishlist. Check browser storage and try again.';
		wishlistEmptyMessage.hidden = false;
		return;
	}

	wishlistProducts.replaceChildren();
	wishlistEmptyMessage.hidden = items.length > 0;
	wishlistEmptyMessage.textContent = 'Your wishlist is empty.';

	items.forEach((item) => {
		const card = document.createElement('article');
		card.className = 'wishlist-card';

		const detailsUrl = new URL('product-details.html', window.location.href);
		detailsUrl.search = new URLSearchParams({
			image: item.image,
			oldPrice: item.oldPrice || item.price,
			discount: item.discount || '0% OFF',
			price: item.price,
			name: item.name,
			category: item.category || '',
			description: typeof item.description === 'string'
				? item.description
				: JSON.stringify(item.description || []),
			specs: JSON.stringify(item.specs || [])
		}).toString();
		const productLink = document.createElement('a');
		productLink.className = 'wishlist-product-link';
		productLink.href = detailsUrl.toString();

		const image = document.createElement('img');
		image.className = 'wishlist-image';
		image.src = item.image;
		image.alt = item.name;

		const details = document.createElement('div');
		details.className = 'wishlist-details';

		const name = document.createElement('h3');
		name.textContent = item.name;

		const price = document.createElement('p');
		price.textContent = item.price;

		const removeButton = document.createElement('button');
		removeButton.className = 'wishlist-remove-button';
		removeButton.type = 'button';
		removeButton.dataset.productId = item.id;
		removeButton.setAttribute('aria-label', `Remove ${item.name} from wishlist`);
		removeButton.setAttribute('aria-pressed', 'true');
		removeButton.innerHTML = '<i class="fa-solid fa-heart" aria-hidden="true"></i>';

		details.append(name, price);
		productLink.append(image, details);
		card.append(productLink, removeButton);
		wishlistProducts.append(card);
	});

	window.applyDashboardLanguage?.();
}

customerNavLinks.forEach((link) => {
	link.addEventListener('click', () => {
		const sectionId = link.dataset.section;
		showCustomerSection(sectionId);
		window.history.replaceState(null, '', `#${sectionId}`);
	});
});

wishlistProducts?.addEventListener('click', (event) => {
	const button = event.target.closest('.wishlist-remove-button');
	if (!button) return;
	if (!window.VCartAccountSession.requireCustomer()) return;

	try {
		window.VCartWishlist.remove(button.dataset.productId);
		renderWishlist();
	} catch (error) {
		console.error('Could not update the wishlist.', error);
		alert('Could not update your wishlist. Check browser storage and try again.');
	}
});

window.addEventListener('vcart:wishlistchange', renderWishlist);
window.addEventListener('storage', (event) => {
	if (event.key === 'vcartWishlist') {
		renderWishlist();
	}
});

showCustomerSection('dashboard');