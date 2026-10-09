const navLinks = document.querySelectorAll('.nav-links a[data-section]');
const contentSections = document.querySelectorAll('.content-section');
const userList = document.getElementById('user-list');
const sellerList = document.getElementById('seller-list');
const sellerApprovalList = document.getElementById('seller-approval-list');
const userDetailsDialog = document.getElementById('user-details-dialog');
const userDetailsContent = document.getElementById('user-details-content');
const adminProductRequests = document.getElementById('admin-product-requests');
const adminManagedProducts = document.getElementById('admin-managed-products');
const dashboardCounts = {
	users: document.getElementById('total-users'),
	sellers: document.getElementById('total-sellers'),
	products: document.getElementById('total-products')
};

window.VCartCloud.requireRole('admin').then((authorized) => {
	if (!authorized) window.location.replace('userlogin.html');
}).catch((error) => {
	console.error('Could not verify administrator access.', error);
	window.location.replace('userlogin.html');
});

async function renderDashboardCounts() {
	try {
		const counts = await window.VCartAccounts.getDashboardCounts();
		Object.entries(dashboardCounts).forEach(([key, element]) => {
			element.textContent = counts[key].toLocaleString();
		});
	} catch (error) {
		console.error('Could not load admin dashboard counts.', error);
		Object.values(dashboardCounts).forEach((element) => {
			element.textContent = '--';
		});
	}
}

function appendSellerAvatar(cell, seller) {
	cell.className = 'user-profile-cell';
	const avatar = document.createElement('span');
	avatar.className = 'user-avatar';
	avatar.textContent = (seller.sellerName || 'Seller')
		.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
	if (typeof seller.profilePhoto === 'string' && seller.profilePhoto.startsWith('data:image/')) {
		const profileImage = document.createElement('img');
		profileImage.className = 'user-avatar-image';
		profileImage.src = seller.profilePhoto;
		profileImage.alt = `${seller.sellerName || 'Seller'} profile`;
		profileImage.addEventListener('error', () => profileImage.remove());
		avatar.append(profileImage);
	}
	cell.append(avatar);
}

function appendSellerIdentity(row, seller) {
	const profileCell = document.createElement('td');
	appendSellerAvatar(profileCell, seller);
	row.append(profileCell);
	[seller.sellerName, seller.email, seller.phone, seller.businessName]
		.forEach((value) => {
			const cell = document.createElement('td');
			cell.textContent = value || '-';
			row.append(cell);
		});
}

function appendSellerActionButton(container, action, label, dataName, dataValue, className) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = className;
	button.dataset.action = action;
	button.dataset[dataName] = dataValue;
	button.textContent = label;
	container.append(button);
}

async function renderSellers() {
	if (!sellerList) return;
	try {
		const sellers = await window.VCartSellers.list();
		sellerList.replaceChildren();
		sellers.slice().reverse().forEach((seller) => {
			const row = document.createElement('tr');
			appendSellerIdentity(row, seller);
			const statusCell = document.createElement('td');
			statusCell.textContent = seller.isBlocked ? 'Blocked' : 'Active';
			row.append(statusCell);

			const actionCell = document.createElement('td');
			actionCell.className = 'action-btn';
			appendSellerActionButton(actionCell, 'details', 'Details', 'email', seller.email, 'details-btn');
			appendSellerActionButton(actionCell, seller.isBlocked ? 'unblock' : 'block',
				seller.isBlocked ? 'Unblock' : 'Block', 'email', seller.email, 'block-btn');
			appendSellerActionButton(actionCell, 'delete', 'Delete', 'email', seller.email, 'delete-btn');
			row.append(actionCell);
			sellerList.append(row);
		});
		if (!sellers.length) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 7;
			cell.textContent = 'No approved sellers yet.';
			row.append(cell);
			sellerList.append(row);
		}
	} catch (error) {
		console.error('Could not load registered sellers for the admin panel.', error);
		sellerList.replaceChildren();
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 7;
		cell.textContent = 'Could not load sellers. Check the Supabase connection and refresh the page.';
		row.append(cell);
		sellerList.append(row);
	}
}

async function renderSellerRequests() {
	if (!sellerApprovalList) return;
	try {
		const requests = await window.VCartSellers.listRequests();
		sellerApprovalList.replaceChildren();
		requests.slice().reverse().forEach((request) => {
			const row = document.createElement('tr');
			appendSellerIdentity(row, request);
			const statusCell = document.createElement('td');
			statusCell.textContent = request.status;
			row.append(statusCell);

			const actionCell = document.createElement('td');
			actionCell.className = 'action-btn';
			if (request.status === 'Pending') {
				appendSellerActionButton(actionCell, 'details', 'Details', 'requestId', request.requestId, 'details-btn');
				appendSellerActionButton(actionCell, 'approve', 'Approve', 'requestId', request.requestId, 'approve-btn');
				appendSellerActionButton(actionCell, 'reject', 'Reject', 'requestId', request.requestId, 'reject-btn');
			} else {
				actionCell.textContent = '-';
			}
			row.append(actionCell);
			sellerApprovalList.append(row);
		});
		if (!requests.length) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 7;
			cell.textContent = 'No seller approval requests yet.';
			row.append(cell);
			sellerApprovalList.append(row);
		}
	} catch (error) {
		console.error('Could not load seller approval requests.', error);
		sellerApprovalList.replaceChildren();
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 7;
		cell.textContent = 'Could not load seller requests. Check the Supabase connection and refresh the page.';
		row.append(cell);
		sellerApprovalList.append(row);
	}
}

function appendProductImage(cell, imageData, altText) {
	if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
		cell.textContent = '-';
		return;
	}
	const image = document.createElement('img');
	image.src = imageData;
	image.alt = altText;
	image.className = 'product-table-image';
	cell.append(image);
}

async function renderProductApprovalRequests() {
	if (!adminProductRequests) return;
	try {
		const requests = await window.VCartProductRequests.list();
		adminProductRequests.replaceChildren();
		requests.slice().reverse().forEach((request) => {
			const row = document.createElement('tr');
			const requestCell = document.createElement('td');
			requestCell.textContent = request.requestId;
			row.append(requestCell);

			const imageCell = document.createElement('td');
			appendProductImage(imageCell, request.images?.[0], `${request.name} image`);
			row.append(imageCell);

			[request.name, `₹${request.price}`, request.companyName]
				.forEach((value) => {
					const cell = document.createElement('td');
					cell.textContent = value || '-';
					row.append(cell);
				});

			const statusCell = document.createElement('td');
			statusCell.textContent = request.status === 'Approved'
				? 'Accepted'
				: request.status || '-';
			row.append(statusCell);

			const actionCell = document.createElement('td');
			actionCell.className = 'action-btn';
			const detailsButton = document.createElement('button');
			detailsButton.type = 'button';
			detailsButton.className = 'details-btn';
			detailsButton.dataset.action = 'details';
			detailsButton.dataset.requestId = request.requestId;
			detailsButton.textContent = 'Details';
			actionCell.append(detailsButton);
			if (request.status === 'Pending') {
				['approve', 'reject'].forEach((action) => {
					const button = document.createElement('button');
					button.type = 'button';
					button.className = action === 'approve' ? 'approve-btn' : 'reject-btn';
					button.dataset.action = action;
					button.dataset.requestId = request.requestId;
					button.textContent = action === 'approve' ? 'Approve' : 'Reject';
					actionCell.append(button);
				});
			}
			row.append(actionCell);
			adminProductRequests.append(row);
		});
		if (!requests.length) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 7;
			cell.textContent = 'No product approval requests yet.';
			row.append(cell);
			adminProductRequests.append(row);
		}
	} catch (error) {
		console.error('Could not load product approval requests.', error);
		adminProductRequests.replaceChildren();
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 7;
		cell.textContent = 'Could not load requests. Check the Supabase connection and refresh.';
		row.append(cell);
		adminProductRequests.append(row);
	}
}

async function renderAdminManagedProducts() {
	if (!adminManagedProducts) return;
	try {
		const products = await window.VCartProducts.list();
		adminManagedProducts.replaceChildren();
		products.slice().reverse().forEach((product) => {
			const row = document.createElement('tr');
			const imageCell = document.createElement('td');
			appendProductImage(imageCell, product.images?.[0], `${product.name} image`);
			row.append(imageCell);
			[product.name, `₹${product.price}`, product.color, product.companyName]
				.forEach((value) => {
					const cell = document.createElement('td');
					cell.textContent = value || '-';
					row.append(cell);
				});

			const statusCell = document.createElement('td');
			statusCell.textContent = product.status || 'Active';
			row.append(statusCell);

			const actionCell = document.createElement('td');
			actionCell.className = 'action-btn';
			const blockButton = document.createElement('button');
			blockButton.type = 'button';
			blockButton.className = 'block-btn';
			blockButton.dataset.action = product.status === 'Blocked' ? 'unblock' : 'block';
			blockButton.dataset.productId = product.requestId;
			blockButton.textContent = product.status === 'Blocked' ? 'Unblock' : 'Block';

			const deleteButton = document.createElement('button');
			deleteButton.type = 'button';
			deleteButton.className = 'delete-btn';
			deleteButton.dataset.action = 'delete';
			deleteButton.dataset.productId = product.requestId;
			deleteButton.textContent = 'Delete';
			actionCell.append(blockButton, deleteButton);
			row.append(actionCell);
			adminManagedProducts.append(row);
		});
		if (!products.length) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 7;
			cell.textContent = 'No accepted products yet.';
			row.append(cell);
			adminManagedProducts.append(row);
		}
	} catch (error) {
		console.error('Could not load admin product management list.', error);
		adminManagedProducts.replaceChildren();
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 7;
		cell.textContent = 'Could not load products. Check the Supabase connection and refresh.';
		row.append(cell);
		adminManagedProducts.append(row);
	}
}

if (adminManagedProducts) {
	adminManagedProducts.addEventListener('click', async (event) => {
		const button = event.target.closest('button[data-action][data-product-id]');
		if (!button || !adminManagedProducts.contains(button)) return;
		if (button.dataset.action === 'delete' &&
			!window.confirm('Delete this product permanently?')) return;

		try {
			const succeeded = button.dataset.action === 'delete'
				? await window.VCartProducts.delete(button.dataset.productId)
				: await window.VCartProducts.setBlocked(button.dataset.productId, button.dataset.action === 'block');
			if (!succeeded) {
				alert('This product no longer exists. The list will be refreshed.');
			}
			renderAdminManagedProducts();
			renderDashboardCounts();
		} catch (error) {
			console.error('Could not update the managed product.', error);
			alert('Could not update this product. Check the Supabase connection and try again.');
		}
	});
}

if (adminProductRequests) {
	adminProductRequests.addEventListener('click', async (event) => {
		const button = event.target.closest('button[data-action][data-request-id]');
		if (!button || !adminProductRequests.contains(button)) return;
		if (button.dataset.action === 'details') {
			try {
				await showProductRequestDetails(button.dataset.requestId);
			} catch (error) {
				console.error('Could not load product request details.', error);
				alert('Could not load product details. Please check the Supabase connection and try again.');
			}
			return;
		}
		const status = button.dataset.action === 'approve' ? 'Approved' : 'Rejected';
		try {
			if (!await window.VCartProductRequests.setStatus(button.dataset.requestId, status)) {
				alert('This request has already been reviewed. Refresh the list and try again.');
			}
			renderProductApprovalRequests();
			renderAdminManagedProducts();
			renderDashboardCounts();
		} catch (error) {
			console.error('Could not update product approval status.', error);
			alert('Could not update the request. Check the Supabase connection and try again.');
		}
	});
}

if (sellerApprovalList) {
	sellerApprovalList.addEventListener('click', async (event) => {
		const button = event.target.closest('button[data-action][data-request-id]');
		if (!button || !sellerApprovalList.contains(button)) return;
		if (button.dataset.action === 'details') {
			try {
				await showSellerRequestDetails(button.dataset.requestId);
			} catch (error) {
				console.error('Could not load seller request details.', error);
				alert('Could not load seller request details. Please check the Supabase connection and try again.');
			}
			return;
		}
		const status = button.dataset.action === 'approve' ? 'Approved' : 'Rejected';
		if (status === 'Rejected' && !window.confirm('Reject this seller application?')) return;

		try {
			if (!await window.VCartSellers.setRequestStatus(button.dataset.requestId, status)) {
				alert('This seller request has already been reviewed. Refresh the list and try again.');
			}
			renderSellerRequests();
			renderSellers();
			renderDashboardCounts();
		} catch (error) {
			console.error('Could not update seller approval status.', error);
			alert('Could not update the seller request. Check the Supabase connection and try again.');
		}
	});
}

if (sellerList) {
	sellerList.addEventListener('click', async (event) => {
		const button = event.target.closest('button[data-action][data-email]');
		if (!button || !sellerList.contains(button)) return;
		if (button.dataset.action === 'details') {
			try {
				await showSellerDetails(button.dataset.email);
			} catch (error) {
				console.error('Could not load registered seller details.', error);
				alert('Could not load seller details. Please check the Supabase connection and try again.');
			}
			return;
		}
		if (button.dataset.action === 'delete' &&
			!window.confirm('Delete this seller account permanently?')) return;

		try {
			const succeeded = button.dataset.action === 'delete'
				? await window.VCartSellers.delete(button.dataset.email)
				: await window.VCartSellers.setBlocked(button.dataset.email, button.dataset.action === 'block');
			if (!succeeded) {
				alert('This seller no longer exists. The list will be refreshed.');
			}
			renderSellers();
			renderDashboardCounts();
		} catch (error) {
			console.error('Could not update the registered seller.', error);
			alert('Could not update this seller. Please check the Supabase connection and try again.');
		}
	});
}

window.addEventListener('storage', (event) => {
	if (event.key === 'vshopSellerRequests') {
		renderSellerRequests();
	}
	if (event.key === 'vshopSellers') {
		renderSellers();
		renderDashboardCounts();
	}
	if (event.key === 'vshopProductRequests') {
		renderProductApprovalRequests();
	}
	if (event.key === 'vshopProducts') {
		renderAdminManagedProducts();
		renderDashboardCounts();
	}
});

window.addEventListener('vshop:storage', (event) => {
	if (event.detail?.key === 'vshopCustomers') {
		renderUsers();
		renderDashboardCounts();
	}
	if (event.detail?.key === 'vshopSellerRequests') {
		renderSellerRequests();
	}
	if (event.detail?.key === 'vshopSellers') {
		renderSellers();
		renderDashboardCounts();
	}
	if (event.detail?.key === 'vshopProductRequests') {
		renderProductApprovalRequests();
	}
	if (event.detail?.key === 'vshopProducts') {
		renderAdminManagedProducts();
		renderDashboardCounts();
	}
	if (event.detail?.key === 'vshopCatalogProducts') {
		renderDashboardCounts();
	}
});

renderProductApprovalRequests();
renderAdminManagedProducts();
renderSellerRequests();
renderSellers();

function addDetailRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'user-detail-row';
    const name = document.createElement('strong');
    name.textContent = label;
    const detail = document.createElement('span');
    detail.textContent = value || '-';
    row.append(name, detail);
    container.append(row);
}

function addDetailsSection(title, values) {
    const section = document.createElement('section');
    section.className = 'user-detail-section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    Object.entries(values).forEach(([label, value]) => addDetailRow(section, label, value));
    userDetailsContent.append(section);
}

async function showUserDetails(email) {
    const user = (await window.VCartAccounts.list()).find((account) => account.email === email);
    if (!user) {
        alert('This user no longer exists. Refresh the user list and try again.');
        renderUsers();
        return;
    }

    userDetailsContent.replaceChildren();
    document.getElementById('user-details-title').textContent = 'User details';
    if (typeof user.profilePhoto === 'string' && user.profilePhoto.startsWith('data:image/')) {
        const photo = document.createElement('img');
        photo.className = 'user-details-photo';
        photo.src = user.profilePhoto;
        photo.alt = `${user.name}'s profile`;
        userDetailsContent.append(photo);
    }
    addDetailsSection('Account', {
        Name: user.name,
        Email: user.email,
        'Mobile number': user.mobile,
        'Date of birth': user.dob,
        Gender: user.gender,
        Status: user.isBlocked ? 'Blocked' : 'Active'
    });
    addDetailsSection('Profile', { Address: user.address });

    const addresses = user.addresses || {};
    ['permanent', 'delivery'].forEach((addressType) => {
        const address = addresses[addressType] || {};
        addDetailsSection(addressType === 'permanent' ? 'Permanent address' : 'Delivery address', {
            Name: address.name,
            'Mobile number': address.mobile,
            Address: address.line,
            City: address.city,
            'PIN code': address.postal
        });
    });

    addDetailsSection('Settings', {
        Language: user.settings?.language
    });
    userDetailsDialog.showModal();
}

async function showSellerDetails(email) {
	const seller = (await window.VCartSellers.list()).find((account) => account.email === email);
	if (!seller) {
		alert('This seller no longer exists. Refresh the seller list and try again.');
		renderSellers();
		return;
	}

	userDetailsContent.replaceChildren();
	document.getElementById('user-details-title').textContent = 'Seller details';
	addDetailsSection('Account', {
		Name: seller.sellerName,
		Email: seller.email,
		'Phone number': seller.phone,
		Status: seller.isBlocked ? 'Blocked' : 'Active'
	});
	addDetailsSection('Business', {
		'Business name': seller.businessName,
		'Business type': seller.businessType,
		Address: seller.businessAddress
	});
	addDetailsSection('Tax details', {
		PAN: seller.pan,
		GSTIN: seller.gstin
	});
	addDetailsSection('Bank details', {
		'Account holder': seller.accountHolder,
		'Account number': seller.accountNumber,
		'IFSC code': seller.ifsc
	});
	userDetailsDialog.showModal();
}

async function showSellerRequestDetails(requestId) {
	const request = (await window.VCartSellers.listRequests()).find((item) => item.requestId === requestId);
	if (!request) {
		alert('This seller request no longer exists. Refresh the request list and try again.');
		renderSellerRequests();
		return;
	}

	userDetailsContent.replaceChildren();
	document.getElementById('user-details-title').textContent = 'Seller request details';
	addDetailsSection('Account', {
		Name: request.sellerName,
		Email: request.email,
		'Phone number': request.phone,
		Status: request.status,
		'Requested at': request.requestedAt
	});
	addDetailsSection('Business', {
		'Business name': request.businessName,
		'Business type': request.businessType,
		Address: request.businessAddress
	});
	addDetailsSection('Tax details', {
		PAN: request.pan,
		GSTIN: request.gstin
	});
	addDetailsSection('Bank details', {
		'Account holder': request.accountHolder,
		'Account number': request.accountNumber,
		'IFSC code': request.ifsc
	});
	userDetailsDialog.showModal();
}

async function showProductRequestDetails(requestId) {
	const request = (await window.VCartProductRequests.list())
		.find((item) => item.requestId === requestId);
	if (!request) {
		alert('This product request no longer exists. Refresh the request list and try again.');
		renderProductApprovalRequests();
		return;
	}

	userDetailsContent.replaceChildren();
	document.getElementById('user-details-title').textContent = 'Product request details';
	addDetailsSection('Product', {
		'Request ID': request.requestId,
		Name: request.name,
		'Company name': request.companyName,
		Price: `₹${request.price || ''}`,
		Color: request.color,
		Category: request.category,
		Stock: request.stock,
		Description: request.description,
		Status: request.status,
		Seller: request.sellerName,
		'Uploaded at': request.uploadedAt ? new Date(request.uploadedAt).toLocaleString() : '-',
		'Reviewed at': request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'
	});

	const images = Array.isArray(request.images)
		? request.images.filter((image) => typeof image === 'string' && image.startsWith('data:image/'))
		: [];
	if (images.length) {
		const section = document.createElement('section');
		section.className = 'user-detail-section';
		const heading = document.createElement('h3');
		heading.textContent = 'Product images';
		const gallery = document.createElement('div');
		gallery.className = 'product-details-gallery';
		images.forEach((source, index) => {
			const image = document.createElement('img');
			image.src = source;
			image.alt = `${request.name || 'Product'} image ${index + 1}`;
			gallery.append(image);
		});
		section.append(heading, gallery);
		userDetailsContent.append(section);
	}
	userDetailsDialog.showModal();
}

async function renderUsers() {
    if (!userList) return;
	renderDashboardCounts();

    try {
        const users = await window.VCartAccounts.list();
        userList.replaceChildren();

        if (users.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 8;
            cell.textContent = 'No registered users yet.';
            row.append(cell);
            userList.append(row);
            return;
        }

        users.forEach((user) => {
            const row = document.createElement('tr');
            const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            const profileCell = document.createElement('td');
            profileCell.className = 'user-profile-cell';
            const avatar = document.createElement('span');
            avatar.className = 'user-avatar';
            avatar.textContent = initials || 'U';
            if (typeof user.profilePhoto === 'string' && user.profilePhoto.startsWith('data:image/')) {
                const profileImage = document.createElement('img');
                profileImage.className = 'user-avatar-image';
                profileImage.src = user.profilePhoto;
                profileImage.alt = `${user.name}'s profile`;
                profileImage.addEventListener('error', () => profileImage.remove());
                avatar.append(profileImage);
            }
            profileCell.append(avatar);
            row.append(profileCell);

            [user.name, user.email, user.mobile, user.dob, user.gender, user.isBlocked ? 'Blocked' : 'Active'].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '-';
                row.append(cell);
            });

            const actionCell = document.createElement('td');
            actionCell.className = 'action-btn';
            const blockButton = document.createElement('button');
            blockButton.type = 'button';
            blockButton.className = 'block-btn';
            blockButton.dataset.action = user.isBlocked ? 'unblock' : 'block';
            blockButton.dataset.email = user.email;
            blockButton.textContent = user.isBlocked ? 'Unblock' : 'Block';

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'delete-btn';
            deleteButton.dataset.action = 'delete';
            deleteButton.dataset.email = user.email;
            deleteButton.textContent = 'Delete';

            const detailsButton = document.createElement('button');
            detailsButton.type = 'button';
            detailsButton.className = 'details-btn';
            detailsButton.dataset.action = 'details';
            detailsButton.dataset.email = user.email;
            detailsButton.textContent = 'Details';
            actionCell.append(detailsButton, blockButton, deleteButton);
            row.append(actionCell);
            userList.append(row);
        });
    } catch (error) {
        console.error('Could not load registered users for the admin panel.', error);
        userList.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 8;
        cell.textContent = 'Could not load users. Check the Supabase connection and refresh the page.';
        row.append(cell);
        userList.append(row);
    }
}

if (userList) {
    userList.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action][data-email]');
        if (!button || !userList.contains(button)) return;

        if (button.dataset.action === 'details') {
            try {
                await showUserDetails(button.dataset.email);
            } catch (error) {
                console.error('Could not load registered user details.', error);
                alert('Could not load user details. Please check the Supabase connection and try again.');
            }
            return;
        }

        try {
            const succeeded = button.dataset.action === 'delete'
                ? await window.VCartAccounts.delete(button.dataset.email)
                : await window.VCartAccounts.setBlocked(button.dataset.email, button.dataset.action === 'block');
            if (!succeeded) {
                alert('This user no longer exists. The list will be refreshed.');
            }
            renderUsers();
        } catch (error) {
            console.error('Could not update the registered user.', error);
            alert('Could not update this user. Please check the Supabase connection and try again.');
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'vshopCustomers') {
            renderUsers();
        }
		if (['vshopCustomers', 'vshopSellers', 'vshopSellerProfile', 'vshopProducts', 'vshopCatalogProducts'].includes(event.key)) {
			renderDashboardCounts();
		}
    });

    renderUsers();
}

renderDashboardCounts();

document.getElementById('close-user-details').addEventListener('click', () => userDetailsDialog.close());
userDetailsDialog.addEventListener('click', (event) => {
    if (event.target === userDetailsDialog) {
        userDetailsDialog.close();
    }
});

function showSection(sectionId) {
	contentSections.forEach((section) => {
		section.classList.toggle('active', section.id === sectionId);
	});

	navLinks.forEach((link) => {
		link.classList.toggle('active', link.dataset.section === sectionId);
	});
}

navLinks.forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		showSection(link.dataset.section);
		window.history.replaceState(null, '', `#${link.dataset.section}`);
	});
});

const initialSection = window.location.hash.slice(1);
showSection(document.getElementById(initialSection) ? initialSection : 'dashboard');
