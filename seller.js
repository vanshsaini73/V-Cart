let sellerSession = null;
try {
    sellerSession = window.VCartSession.get();
} catch (error) {
    console.error('Could not read the seller session.', error);
}

window.VCartCloud.requireRole('seller').then((authorized) => {
    if (!authorized) {
        window.location.replace('sellerlogin.html');
        return;
    }
    window.VCartCloud.migrateLegacySellerProducts().then((imported) => {
        if (imported) alert(`${imported} existing product(s) were sent to admin review for cross-device sync.`);
    }).catch((error) => {
        console.error('Could not migrate existing seller products.', error);
        alert(error.message || 'Could not sync existing seller products. Please retry.');
    });
}).catch((error) => {
    console.error('Could not verify the seller session.', error);
    alert(error.message || 'Could not verify the seller session.');
    window.location.replace('sellerlogin.html');
});

if (!sellerSession || sellerSession.role !== 'seller') {
    window.location.replace('sellerlogin.html');
} else {
const navLinks = document.querySelectorAll('.nav-links a[data-section]');
const contentSections = document.querySelectorAll('.content-section');
const listingTabs = document.querySelectorAll('.listing-tab');
const listingPanels = document.querySelectorAll('.listing-panel');
const myListingTabs = document.querySelectorAll('.mylisting-tab');
const myListingPanels = document.querySelectorAll('.mylisting-subpanel');
const inventoryTabs = document.querySelectorAll('.inventory-tab');
const inventoryPanels = document.querySelectorAll('.inventory-panel');
const orderTabs = document.querySelectorAll('.order-tab');
const orderPanels = document.querySelectorAll('.order-panel');
const addProductForm = document.querySelector('.add-product-form');
const sellerProductRequests = document.querySelector('#seller-product-requests');
const sellerActiveProducts = document.querySelector('#seller-active-products');
const sellerBlockedProducts = document.querySelector('#seller-blocked-products');
const logoutBtn = document.querySelector('.logout-btn');
const sellerProfileForm = document.querySelector('#seller-profile-form');
const profileEditButton = document.querySelector('#profile-edit-btn');

if (sellerProfileForm && profileEditButton) {
    const profileFields = sellerProfileForm.querySelectorAll('input');
    const profilePhotoInput = document.querySelector('#seller-profile-photo');
    const profilePhotoImage = document.querySelector('#seller-photo-image');
    const headerProfilePhoto = document.querySelector('#seller-header-photo');
    const profilePhotoControls = document.querySelector('#seller-photo-controls');
    const profileStatus = document.querySelector('#profile-save-status');
    let profilePhoto = typeof sellerSession.profilePhoto === 'string' ? sellerSession.profilePhoto : '';

    profileFields.forEach((field) => {
        if (field.name && typeof sellerSession[field.name] === 'string') {
            field.value = sellerSession[field.name];
        }
    });
    const sellerName = document.querySelector('.profile-name');
    const headerInitials = document.querySelector('#seller-header-initials');
    const profileInitials = document.querySelector('#seller-photo-initials');

    function updateSellerPhoto(imageData) {
        profilePhoto = imageData || '';
        [profilePhotoImage, headerProfilePhoto].forEach((image) => {
            if (!image) return;
            image.hidden = !profilePhoto;
            image.src = profilePhoto;
        });
    }

    function updateSellerName(name) {
        const initials = (name || 'Seller').trim().split(/\s+/)
            .filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S';
        if (sellerName) sellerName.textContent = name || 'Seller';
        if (headerInitials) headerInitials.textContent = initials;
        if (profileInitials) profileInitials.textContent = initials;
    }

    updateSellerName(sellerSession.sellerName);
    updateSellerPhoto(profilePhoto);

    profileEditButton.addEventListener('click', () => {
        profilePhotoControls?.classList.add('is-editing');
        profileFields.forEach((field) => {
            if (field.type === 'file') {
                field.disabled = false;
            } else {
                field.readOnly = false;
            }
        });
        if (profileStatus) {
            profileStatus.textContent = '';
            delete profileStatus.dataset.i18nMessage;
        }
    });

    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', () => {
            const [file] = profilePhotoInput.files;
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                if (profileStatus) profileStatus.textContent = 'Please choose an image file.';
                profilePhotoInput.value = '';
                return;
            }
            if (file.size > 1024 * 1024) {
                if (profileStatus) profileStatus.textContent = 'Choose an image smaller than 1 MB.';
                profilePhotoInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.addEventListener('load', () => {
                if (typeof reader.result !== 'string') {
                    if (profileStatus) profileStatus.textContent = 'Could not read this image. Please try another file.';
                    return;
                }
                updateSellerPhoto(reader.result);
                if (profileStatus) profileStatus.textContent = 'Photo selected. Save your profile to keep the change.';
            });
            reader.addEventListener('error', () => {
                console.error('Could not read the selected seller profile photo.', reader.error);
                if (profileStatus) profileStatus.textContent = 'Could not read this image. Please try another file.';
            });
            reader.readAsDataURL(file);
        });
    }

    sellerProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const profileData = Object.fromEntries(new FormData(sellerProfileForm).entries());
        profileData.profilePhoto = profilePhoto;
        try {
            await window.VCartSellers.updateProfile(sellerSession.email, profileData);
            sellerSession = window.VCartSession.get();
            profileFields.forEach((field) => {
                if (field.type === 'file') {
                    field.disabled = true;
                } else {
                    field.readOnly = true;
                }
            });
            profilePhotoControls?.classList.remove('is-editing');
            updateSellerName(sellerSession.sellerName);
            profilePhotoInput.value = '';
            if (profileStatus) {
                profileStatus.dataset.i18nMessage = 'Seller details saved.';
                profileStatus.textContent = window.dashboardTranslate('Seller details saved.');
            }
        } catch (error) {
            console.error('Could not save seller profile.', error);
            if (profileStatus) {
                profileStatus.textContent = error.message || 'Could not save seller details. Please try again.';
            }
        }
    });
}

function showSection(sectionId) {
    contentSections.forEach((section) => {
        section.classList.toggle('active', section.id === sectionId);
    });

    navLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
}

function showListingPanel(panelId) {
    listingPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });

    listingTabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.listingPanel === panelId);
    });
}

function showMyListingPanel(panelId) {
    myListingPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });

    myListingTabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.mylistingPanel === panelId);
    });
}

function showInventoryPanel(panelId) {
    inventoryPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });

    inventoryTabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.inventoryPanel === panelId);
    });
}

function showOrderPanel(panelId) {
    orderPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });

    orderTabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.orderPanel === panelId);
    });
}

navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        showSection(link.dataset.section);

        if (link.dataset.section === 'listings') {
            showListingPanel('mylisting');
            showMyListingPanel('active-listings');
        }

        if (link.dataset.section === 'inventory') {
            showInventoryPanel('all-inventory');
        }

        if (link.dataset.section === 'orders') {
            showOrderPanel('active-orders');
        }

        window.history.replaceState(null, '', `#${link.dataset.section}`);
    });
});

listingTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        showListingPanel(tab.dataset.listingPanel);
        if (tab.dataset.listingPanel === 'mylisting') {
            showMyListingPanel('active-listings');
        }
    });
});

myListingTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        showMyListingPanel(tab.dataset.mylistingPanel);
    });
});

inventoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        showInventoryPanel(tab.dataset.inventoryPanel);
    });
});

orderTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        showOrderPanel(tab.dataset.orderPanel);
    });
});

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

async function renderSellerProductRequests() {
    if (!sellerProductRequests) return;
    try {
        const requests = await window.VCartProductRequests.list();
        sellerProductRequests.replaceChildren();
        requests.slice().reverse().forEach((request) => {
            const row = document.createElement('tr');
            const requestCell = document.createElement('td');
            requestCell.textContent = request.requestId;
            row.append(requestCell);

            const imageCell = document.createElement('td');
            appendProductImage(imageCell, request.images?.[0], `${request.name} image`);
            row.append(imageCell);

            [request.name, `₹${request.price}`, request.color, request.companyName,
                new Date(request.uploadedAt).toLocaleString()].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '-';
                row.append(cell);
            });

            const statusCell = document.createElement('td');
            statusCell.textContent = request.status || '-';
            row.append(statusCell);

            const actionCell = document.createElement('td');
            actionCell.className = 'action-btn';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'request-delete-btn';
            deleteButton.dataset.action = 'delete-request';
            deleteButton.dataset.requestId = request.requestId;
            deleteButton.textContent = 'Delete';
            actionCell.append(deleteButton);
            row.append(actionCell);
            sellerProductRequests.append(row);
        });

        if (!requests.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 9;
            cell.textContent = 'No product approval requests yet.';
            row.append(cell);
            sellerProductRequests.append(row);
        }
    } catch (error) {
        console.error('Could not load seller product approval requests.', error);
        sellerProductRequests.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        cell.textContent = 'Could not load requests. Check the Supabase connection and refresh.';
        row.append(cell);
        sellerProductRequests.append(row);
    }
}

async function renderSellerActiveProducts() {
    if (!sellerActiveProducts) return;
    try {
        const products = (await window.VCartProducts.list()).filter((product) => product.status !== 'Blocked');
        sellerActiveProducts.replaceChildren();
        products.slice().reverse().forEach((product) => {
            const row = document.createElement('tr');
            const imageCell = document.createElement('td');
            appendProductImage(imageCell, product.images?.[0], `${product.name} image`);
            row.append(imageCell);

            [product.requestId, product.name, `₹${product.price}`, product.color, product.companyName,
                product.category, product.stock, product.description, 'Active'].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '-';
                row.append(cell);
            });
            sellerActiveProducts.append(row);
        });
        if (!products.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 10;
            cell.textContent = 'No approved products in your listings yet.';
            row.append(cell);
            sellerActiveProducts.append(row);
        }
    } catch (error) {
        console.error('Could not load seller active products.', error);
        sellerActiveProducts.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 10;
        cell.textContent = 'Could not load products. Check the Supabase connection and refresh.';
        row.append(cell);
        sellerActiveProducts.append(row);
    }
}

async function renderSellerBlockedProducts() {
    if (!sellerBlockedProducts) return;
    try {
        const products = (await window.VCartProducts.list()).filter((product) => product.status === 'Blocked');
        sellerBlockedProducts.replaceChildren();
        products.slice().reverse().forEach((product) => {
            const row = document.createElement('tr');
            const requestCell = document.createElement('td');
            requestCell.textContent = product.requestId || '-';
            row.append(requestCell);

            const imageCell = document.createElement('td');
            appendProductImage(imageCell, product.images?.[0], `${product.name} image`);
            row.append(imageCell);

            [product.name, `₹${product.price}`, product.color, product.status,
                product.blockedAt ? new Date(product.blockedAt).toLocaleDateString() : '-'].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '-';
                row.append(cell);
            });
            sellerBlockedProducts.append(row);
        });
        if (!products.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.textContent = 'No blocked products.';
            row.append(cell);
            sellerBlockedProducts.append(row);
        }
    } catch (error) {
        console.error('Could not load seller blocked products.', error);
        sellerBlockedProducts.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = 'Could not load products. Check the Supabase connection and refresh.';
        row.append(cell);
        sellerBlockedProducts.append(row);
    }
}

if (sellerProductRequests) {
    sellerProductRequests.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('button[data-action="delete-request"][data-request-id]');
        if (deleteButton && sellerProductRequests.contains(deleteButton)) {
            if (!window.confirm('Permanently delete this request?')) return;
            try {
                if (!await window.VCartProductRequests.delete(deleteButton.dataset.requestId)) {
                    alert('This request no longer exists. The list will be refreshed.');
                }
                renderSellerProductRequests();
            } catch (error) {
                console.error('Could not delete the product request.', error);
                alert('Could not delete this request. Check the Supabase connection and try again.');
            }
            return;
        }

        const button = event.target.closest('button[data-request-id]');
        if (!button || !sellerProductRequests.contains(button)) return;
        try {
            if (!await window.VCartProductRequests.accept(button.dataset.requestId)) {
                alert('This request is not approved yet. Refresh the request list and try again.');
                renderSellerProductRequests();
                return;
            }
            renderSellerProductRequests();
            renderSellerActiveProducts();
            alert('Product accepted and added to My Listings.');
        } catch (error) {
            console.error('Could not accept the approved product.', error);
            alert('Could not accept this product. Check the Supabase connection and try again.');
        }
    });
}

window.addEventListener('storage', (event) => {
    if (event.key === 'vshopProductRequests') {
        renderSellerProductRequests();
    }
    if (event.key === 'vshopProducts') {
        renderSellerActiveProducts();
        renderSellerBlockedProducts();
    }
});

window.addEventListener('vshop:storage', (event) => {
    if (event.detail?.key === 'vshopProductRequests') {
        renderSellerProductRequests();
    }
    if (event.detail?.key === 'vshopProducts') {
        renderSellerActiveProducts();
        renderSellerBlockedProducts();
    }
});

renderSellerProductRequests();
renderSellerActiveProducts();
renderSellerBlockedProducts();

if (addProductForm) {
    const imageInputs = Array.from(addProductForm.querySelectorAll('[name="images"]'));
    const imagePreview = document.querySelector('#product-image-preview');
    const productFormStatus = document.querySelector('#product-form-status');
    let previewUrls = [];

    function setProductFormStatus(message, type = '') {
        if (!productFormStatus) return;
        productFormStatus.textContent = message;
        productFormStatus.className = `product-form-status${type ? ` ${type}` : ''}`;
    }

    function readImageAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error(`Could not read image "${file.name}".`));
                }
            });
            reader.addEventListener('error', () => {
                reject(reader.error || new Error(`Could not read image "${file.name}".`));
            });
            reader.readAsDataURL(file);
        });
    }

    function getSelectedImages() {
        return imageInputs
            .map((input) => input.files?.[0])
            .filter((image) => image instanceof File);
    }

    function clearImagePreviews() {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        previewUrls = [];
        imagePreview?.replaceChildren();
    }

    if (imageInputs.length && imagePreview) {
        imageInputs.forEach((input) => {
            input.addEventListener('change', () => {
                clearImagePreviews();
                const images = getSelectedImages();

                if (images.some((image) => !image.type.startsWith('image/'))) {
                    setProductFormStatus('Please select image files only.', 'error');
                    return;
                }
                if (images.some((image) => image.size > 1024 * 1024)) {
                    setProductFormStatus('Each product image must be smaller than 1 MB.', 'error');
                    return;
                }

                images.forEach((image, index) => {
                    const preview = document.createElement('img');
                    const url = URL.createObjectURL(image);
                    previewUrls.push(url);
                    preview.src = url;
                    preview.alt = `Preview of image ${index + 1}: ${image.name}`;
                    imagePreview.append(preview);
                });

                setProductFormStatus(`${images.length} image${images.length === 1 ? '' : 's'} selected.`);
            });
        });
    }

    addProductForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(addProductForm);
        const images = getSelectedImages();
        if (images.length < 2 || images.length > 5) {
            setProductFormStatus('Please select an image in each of the first 2 fields.', 'error');
            return;
        }
        if (images.some((image) => !image.type.startsWith('image/'))) {
            setProductFormStatus('Please select image files only.', 'error');
            return;
        }
        if (images.some((image) => image.size > 1024 * 1024)) {
            setProductFormStatus('Each product image must be smaller than 1 MB.', 'error');
            return;
        }

        const product = {
            name: String(formData.get('name') || '').trim(),
            companyName: String(formData.get('companyName') || '').trim(),
            color: String(formData.get('color') || '').trim(),
            price: String(formData.get('price') || '').trim(),
            category: String(formData.get('category') || '').trim(),
            stock: String(formData.get('stock') || '').trim(),
            description: String(formData.get('description') || '').trim()
        };
        if (Object.values(product).some((value) => !value)) {
            setProductFormStatus('Please complete all product details before submitting.', 'error');
            return;
        }

        const submitButton = addProductForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        setProductFormStatus('Submitting product approval request...');

        Promise.all(images.map(readImageAsDataUrl))
            .then(async (productImages) => {
                const request = await window.VCartProductRequests.submit({ ...product, images: productImages });

                addProductForm.reset();
                clearImagePreviews();
                setProductFormStatus(`Request ${request.requestId} submitted. Status: Pending.`, 'success');
                renderSellerProductRequests();
                showSection('listings');
                showListingPanel('trackrequest');
            })
            .catch((error) => {
                console.error('Could not submit the product approval request.', error);
                setProductFormStatus('Could not submit this request. Check the Supabase connection and try again.', 'error');
            })
            .finally(() => {
                if (submitButton) submitButton.disabled = false;
            });
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await window.VCartSession.clear();
        } catch (error) {
            console.error('Could not clear the seller session.', error);
            alert('Could not log out. Check your internet connection and try again.');
            return;
        }
        window.location.href = 'index.html';
    });
}

const initialSection = window.location.hash.slice(1);
const initialActiveSection = document.getElementById(initialSection) ? initialSection : 'welcome';
showSection(initialActiveSection);

if (initialActiveSection === 'listings') {
    showListingPanel('mylisting');
}
if (initialActiveSection === 'inventory') {
    showInventoryPanel('all-inventory');
}
if (initialActiveSection === 'orders') {
    showOrderPanel('active-orders');
}

showMyListingPanel('active-listings');
}
