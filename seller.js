const sellerNavLinks = document.querySelectorAll('.nav-links [data-section]');
const sellerSections = document.querySelectorAll('.content-section');

function connectSellerTabs({ buttonSelector, panelSelector, scopeSelector, dataKey }) {
	document.querySelectorAll(buttonSelector).forEach((button) => {
		button.addEventListener('click', () => {
			const scope = button.closest(scopeSelector);
			const panelId = button.dataset[dataKey];
			const panels = scope?.querySelectorAll(panelSelector);
			const selectedPanel = Array.from(panels || []).find((panel) => panel.id === panelId);
			if (!selectedPanel) return;

			panels.forEach((panel) => {
				panel.classList.toggle('active', panel === selectedPanel);
			});
			scope.querySelectorAll(buttonSelector).forEach((tab) => {
				const isActive = tab === button;
				tab.classList.toggle('active', isActive);
				tab.setAttribute('aria-pressed', String(isActive));
			});
		});
	});
}

connectSellerTabs({
	buttonSelector: '.tabs [data-listing-panel]',
	panelSelector: '.listing-panel',
	scopeSelector: '#listings',
	dataKey: 'listingPanel'
});
connectSellerTabs({
	buttonSelector: '.mylisting-tabs [data-mylisting-panel]',
	panelSelector: '.mylisting-subpanel',
	scopeSelector: '#mylisting',
	dataKey: 'mylistingPanel'
});
connectSellerTabs({
	buttonSelector: '.tabs [data-inventory-panel]',
	panelSelector: '.inventory-panel',
	scopeSelector: '#inventory',
	dataKey: 'inventoryPanel'
});
connectSellerTabs({
	buttonSelector: '.tabs [data-order-panel]',
	panelSelector: '.order-panel',
	scopeSelector: '#orders',
	dataKey: 'orderPanel'
});

function showSellerSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (!section || !section.classList.contains('content-section')) return;

	sellerSections.forEach((item) => {
		const isActive = item === section;
		item.classList.toggle('active', isActive);
		item.hidden = !isActive;
	});

	sellerNavLinks.forEach((link) => {
		const isActive = link.dataset.section === sectionId;
		link.classList.toggle('active', isActive);
		if (isActive) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

sellerNavLinks.forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		const sectionId = link.dataset.section;
		showSellerSection(sectionId);
		window.history.replaceState(null, '', `#${sectionId}`);
	});
});

showSellerSection('welcome');