const adminNavLinks = document.querySelectorAll('.nav-links [data-section]');
const adminSections = document.querySelectorAll('.content-section');

document.querySelectorAll('.status-btn').forEach((status) => {
	const statusText = status.textContent.trim().toLowerCase();
	const statusClass = {
		active: 'status-active',
		success: 'status-success',
		sucess: 'status-success',
		succes: 'status-success',
		reject: 'status-rejected',
		rejected: 'status-rejected',
		deactivate: 'status-deactivated',
		deactivated: 'status-deactivated',
		pending: 'status-pending',
	}[statusText];

	if (statusClass) status.classList.add(statusClass);
});

function showAdminSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (!section || !section.classList.contains('content-section')) return;

	window.scrollTo(0, 0);

	adminSections.forEach((item) => {
		const isActive = item === section;
		item.classList.toggle('active', isActive);
		item.hidden = !isActive;
	});

	adminNavLinks.forEach((link) => {
		const isActive = link.dataset.section === sectionId;
		link.classList.toggle('active', isActive);
		if (isActive) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

adminNavLinks.forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		const sectionId = link.dataset.section;
		showAdminSection(sectionId);
		window.history.replaceState(null, '', `#${sectionId}`);
	});
});

showAdminSection('dashboard');