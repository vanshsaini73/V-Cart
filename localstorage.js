(() => {
	const sessionKey = 'vshopUser';
	const customersKey = 'vshopCustomers';
	const databaseName = 'vshopDatabase';
	const databaseVersion = 1;
	const databaseStore = 'records';
	const productStorageKeys = ['vshopProducts', 'vshopProductRequests', 'vshopCatalogProducts'];
	let databasePromise;
	let migrationPromise;
	const storageChannel = 'BroadcastChannel' in window
		? new BroadcastChannel('vshop-storage')
		: null;

	function openDatabase() {
		if (!databasePromise) {
			databasePromise = new Promise((resolve, reject) => {
				const request = indexedDB.open(databaseName, databaseVersion);
				request.addEventListener('upgradeneeded', () => {
					if (!request.result.objectStoreNames.contains(databaseStore)) {
						request.result.createObjectStore(databaseStore, { keyPath: 'key' });
					}
				});
				request.addEventListener('success', () => resolve(request.result));
				request.addEventListener('error', () => reject(request.error || new Error('Could not open browser storage.')));
				request.addEventListener('blocked', () => reject(new Error('Browser storage upgrade is blocked by another open tab. Close other VCart tabs and retry.')));
			});
		}
		return databasePromise;
	}

	function notifyStorageChange(key) {
		const message = { key };
		window.dispatchEvent(new CustomEvent('vshop:storage', { detail: message }));
		storageChannel?.postMessage(message);
	}

	if (storageChannel) {
		storageChannel.addEventListener('message', (event) => {
			if (event.data && typeof event.data.key === 'string') {
				window.dispatchEvent(new CustomEvent('vshop:storage', { detail: event.data }));
			}
		});
	}

	async function ensureProductDataMigrated() {
		if (!migrationPromise) {
			migrationPromise = (async () => {
				await openDatabase();
				for (const key of productStorageKeys) {
					const savedData = localStorage.getItem(key);
					if (savedData === null) continue;
					const value = JSON.parse(savedData);
					if (!Array.isArray(value)) {
						throw new TypeError(`The saved ${key} data is invalid.`);
					}
					await writeRecord(key, value, false);
					localStorage.removeItem(key);
				}
			})();
		}
		return migrationPromise;
	}

	async function readRecord(key) {
		await ensureProductDataMigrated();
		const database = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction(databaseStore, 'readonly');
			const request = transaction.objectStore(databaseStore).get(key);
			request.addEventListener('success', () => resolve(request.result?.value ?? null));
			request.addEventListener('error', () => reject(request.error || new Error(`Could not read ${key} from browser storage.`)));
			transaction.addEventListener('abort', () => reject(transaction.error || new Error(`Could not read ${key} from browser storage.`)));
		});
	}

	async function writeRecord(key, value, notify = true) {
		const database = await openDatabase();
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(databaseStore, 'readwrite');
			transaction.objectStore(databaseStore).put({ key, value });
			transaction.addEventListener('complete', resolve, { once: true });
			transaction.addEventListener('error', () => reject(transaction.error || new Error(`Could not save ${key} to browser storage.`)), { once: true });
			transaction.addEventListener('abort', () => reject(transaction.error || new Error(`Could not save ${key} to browser storage.`)), { once: true });
		});
		if (notify) notifyStorageChange(key);
	}

	async function deleteRecord(key) {
		const database = await openDatabase();
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(databaseStore, 'readwrite');
			transaction.objectStore(databaseStore).delete(key);
			transaction.addEventListener('complete', resolve, { once: true });
			transaction.addEventListener('error', () => reject(transaction.error || new Error(`Could not delete ${key} from browser storage.`)), { once: true });
			transaction.addEventListener('abort', () => reject(transaction.error || new Error(`Could not delete ${key} from browser storage.`)), { once: true });
		});
		notifyStorageChange(key);
	}

	window.VCartStorage = Object.freeze({
		async estimate() {
			if (!navigator.storage?.estimate) {
				throw new Error('This browser does not provide storage quota information.');
			}
			await ensureProductDataMigrated();
			return navigator.storage.estimate();
		},
		async requestPersistentStorage() {
			if (!navigator.storage?.persist) {
				return false;
			}
			return navigator.storage.persist();
		}
	});

	function getCustomers() {
		const storedCustomers = localStorage.getItem(customersKey);
		if (storedCustomers === null) {
			return [];
		}

		const customers = JSON.parse(storedCustomers);
		if (!Array.isArray(customers)) {
			throw new TypeError('The saved customer list is invalid.');
		}

		return customers;
	}

	function getSellers() {
		const storedSellers = localStorage.getItem('vshopSellers');
		if (storedSellers === null) {
			return [];
		}

		const sellers = JSON.parse(storedSellers);
		if (!Array.isArray(sellers)) {
			throw new TypeError('The saved seller list is invalid.');
		}
		return sellers;
	}

	function getSellerRequests() {
		const storedRequests = localStorage.getItem('vshopSellerRequests');
		if (storedRequests === null) {
			return [];
		}

		const requests = JSON.parse(storedRequests);
		if (!Array.isArray(requests)) {
			throw new TypeError('The saved seller request list is invalid.');
		}
		return requests;
	}

	window.VCartSession = Object.freeze({
		set(session) {
			if (!session || typeof session !== 'object' || typeof session.role !== 'string') {
				throw new TypeError('A session with a role is required.');
			}

			localStorage.setItem(sessionKey, JSON.stringify(session));
		},
		get() {
			const storedSession = localStorage.getItem(sessionKey);
			if (storedSession === null) {
				return null;
			}

			const session = JSON.parse(storedSession);
			if (!session || typeof session !== 'object' || Array.isArray(session) || typeof session.role !== 'string') {
				throw new TypeError('The saved session is invalid.');
			}

			return session;
		},
		clear() {
			localStorage.removeItem(sessionKey);
		}
	});

	window.VCartAccounts = Object.freeze({
		async getDashboardCounts() {
			const customers = getCustomers();
			const storedSellers = localStorage.getItem('vshopSellers');
			const sellers = storedSellers === null ? [] : JSON.parse(storedSellers);
			if (!Array.isArray(sellers)) {
				throw new TypeError('The saved seller list is invalid.');
			}
			const storedSellerProfile = localStorage.getItem('vshopSellerProfile');
			const sellerProfile = storedSellerProfile === null ? null : JSON.parse(storedSellerProfile);
			const products = await window.VCartProducts.list();
			const catalog = await window.VCartProducts.getCatalog();
			if (!Array.isArray(products) || !Array.isArray(catalog)) {
				throw new TypeError('The saved product list is invalid.');
			}

			const hasSavedSellerProfile = sellerProfile &&
				typeof sellerProfile === 'object' &&
				(typeof sellerProfile.sellerName === 'string' && sellerProfile.sellerName.trim() ||
					typeof sellerProfile.email === 'string' && sellerProfile.email.trim()) &&
				!sellers.some((seller) =>
					typeof seller.email === 'string' &&
					seller.email.toLowerCase() === sellerProfile.email?.toLowerCase()
				);
			return {
				users: customers.length,
				sellers: sellers.length + (hasSavedSellerProfile ? 1 : 0),
				products: products.length + catalog.length
			};
		},
		list() {
			return getCustomers().map(({ password, ...customer }) => customer);
		},
		register(customer) {
			if (!customer || typeof customer !== 'object' ||
				['name', 'email', 'mobile', 'dob', 'gender', 'password'].some((field) => typeof customer[field] !== 'string' || !customer[field].trim())) {
				throw new TypeError('All customer details are required.');
			}

			const customers = getCustomers();
			const email = customer.email.trim().toLowerCase();
			const mobile = customer.mobile.trim();
			if (customers.some((account) =>
				account.email.toLowerCase() === email || account.mobile === mobile
			)) {
				return false;
			}

			customers.push({
				...customer,
				name: customer.name.trim(),
				email,
				mobile
			});
			localStorage.setItem(customersKey, JSON.stringify(customers));
			return true;
		},
		authenticate(identifier, password) {
			const normalizedIdentifier = identifier.trim().toLowerCase();
			const customer = getCustomers().find((account) =>
				account.email.toLowerCase() === normalizedIdentifier ||
				account.mobile === identifier.trim()
			);

			if (!customer || customer.password !== password) {
				return { status: 'invalid', customer: null };
			}
			if (customer.isBlocked) {
				return { status: 'blocked', customer: null };
			}

			const { password: savedPassword, ...customerDetails } = customer;
			return { status: 'authenticated', customer: customerDetails };
		},
		updateProfile(email, profile) {
			const customers = getCustomers();
			const customer = customers.find((account) => account.email === email);
			if (!customer) {
				throw new Error('The customer account could not be found.');
			}
			if (!profile || typeof profile !== 'object' ||
				['name', 'email', 'mobile', 'dob', 'gender', 'address', 'profilePhoto'].some((field) => typeof profile[field] !== 'string')) {
				throw new TypeError('The customer profile is invalid.');
			}

			const updatedEmail = profile.email.trim().toLowerCase();
			const updatedMobile = profile.mobile.trim();
			if (!profile.name.trim() || !updatedEmail) {
				throw new TypeError('Name and email are required.');
			}
			if (profile.profilePhoto && !profile.profilePhoto.startsWith('data:image/')) {
				throw new TypeError('The customer profile photo is invalid.');
			}
			if (customers.some((account) =>
				account !== customer &&
				(account.email.toLowerCase() === updatedEmail || (updatedMobile && account.mobile === updatedMobile))
			)) {
				throw new Error('An account with this email or mobile number already exists.');
			}

			Object.assign(customer, {
				...profile,
				name: profile.name.trim(),
				email: updatedEmail,
				mobile: updatedMobile
			});
			localStorage.setItem(customersKey, JSON.stringify(customers));

			const storedSession = localStorage.getItem(sessionKey);
			if (storedSession !== null) {
				const session = JSON.parse(storedSession);
				if (session.role === 'customer' && session.email === email) {
					localStorage.setItem(sessionKey, JSON.stringify({ ...session, ...profile, email: updatedEmail, mobile: updatedMobile }));
				}
			}
		},
		getSection(email, section) {
			if (!['addresses', 'settings'].includes(section)) {
				throw new TypeError('The customer section is invalid.');
			}
			const customer = getCustomers().find((account) => account.email === email);
			if (!customer) {
				throw new Error('The customer account could not be found.');
			}
			return customer[section] || null;
		},
		saveSection(email, section, data) {
			if (!['addresses', 'settings'].includes(section) || !data || typeof data !== 'object' || Array.isArray(data)) {
				throw new TypeError('The customer section data is invalid.');
			}
			const customers = getCustomers();
			const customer = customers.find((account) => account.email === email);
			if (!customer) {
				throw new Error('The customer account could not be found.');
			}
			customer[section] = data;
			localStorage.setItem(customersKey, JSON.stringify(customers));
		},
		setBlocked(email, isBlocked) {
			const customers = getCustomers();
			const customer = customers.find((account) => account.email === email);
			if (!customer) {
				return false;
			}

			customer.isBlocked = Boolean(isBlocked);
			localStorage.setItem(customersKey, JSON.stringify(customers));
			return true;
		},
		delete(email) {
			const customers = getCustomers();
			const remainingCustomers = customers.filter((account) => account.email !== email);
			if (remainingCustomers.length === customers.length) {
				return false;
			}

			localStorage.setItem(customersKey, JSON.stringify(remainingCustomers));
			const storedSession = localStorage.getItem(sessionKey);
			if (storedSession !== null) {
				const session = JSON.parse(storedSession);
				if (session.role === 'customer' && session.email === email) {
					localStorage.removeItem(sessionKey);
				}
			}
			return true;
		}
	});

	window.VCartSellers = Object.freeze({
		list() {
			return getSellers().map(({ password, ...seller }) => seller);
		},
		listRequests() {
			return getSellerRequests().map(({ password, ...request }) => request);
		},
		register(seller) {
			const requiredFields = ['sellerName', 'email', 'phone', 'businessName', 'businessType',
				'businessAddress', 'pan', 'accountHolder', 'accountNumber', 'ifsc', 'password'];
			if (!seller || typeof seller !== 'object' ||
				requiredFields.some((field) => typeof seller[field] !== 'string' || !seller[field].trim())) {
				throw new TypeError('Complete all required seller, business, tax, bank, and password details.');
			}
			if (seller.password.length < 8) {
				throw new TypeError('Password must be at least 8 characters long.');
			}
			if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(seller.pan.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 10-character PAN.');
			}
			if (seller.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(seller.gstin.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 15-character GSTIN or leave it blank.');
			}
			if (!/^[0-9]{9,18}$/.test(seller.accountNumber.trim())) {
				throw new TypeError('Bank account number must contain 9 to 18 digits.');
			}
			if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(seller.ifsc.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 11-character IFSC code.');
			}

			const sellers = getSellers();
			const requests = getSellerRequests();
			const email = seller.email.trim().toLowerCase();
			const phone = seller.phone.trim();
			if (sellers.some((account) =>
				account.email.toLowerCase() === email || account.phone === phone
			) || requests.some((request) =>
				request.status === 'Pending' &&
				(request.email.toLowerCase() === email || request.phone === phone)
			)) {
				return false;
			}

			requests.push({
				...seller,
				requestId: `seller-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				sellerName: seller.sellerName.trim(),
				email,
				phone,
				businessName: seller.businessName.trim(),
				businessType: seller.businessType.trim(),
				businessAddress: seller.businessAddress.trim(),
				pan: seller.pan.trim().toUpperCase(),
				gstin: seller.gstin.trim().toUpperCase(),
				accountHolder: seller.accountHolder.trim(),
				accountNumber: seller.accountNumber.trim(),
				ifsc: seller.ifsc.trim().toUpperCase(),
				status: 'Pending',
				requestedAt: new Date().toISOString()
			});
			localStorage.setItem('vshopSellerRequests', JSON.stringify(requests));
			notifyStorageChange('vshopSellerRequests');
			return true;
		},
		setRequestStatus(requestId, status) {
			if (status !== 'Approved' && status !== 'Rejected') {
				throw new TypeError('Seller request status must be Approved or Rejected.');
			}
			const requests = getSellerRequests();
			const request = requests.find((item) => item.requestId === requestId);
			if (!request || request.status !== 'Pending') {
				return false;
			}

			if (status === 'Approved') {
				const sellers = getSellers();
				if (sellers.some((account) =>
					account.email.toLowerCase() === request.email.toLowerCase() ||
					account.phone === request.phone
				)) {
					throw new Error('A seller account with this email or phone already exists.');
				}
				const { requestId: ignoredRequestId, status: ignoredStatus, requestedAt: ignoredRequestedAt, ...seller } = request;
				sellers.push({ ...seller, isBlocked: false });
				localStorage.setItem('vshopSellers', JSON.stringify(sellers));
				delete request.password;
			} else {
				delete request.password;
			}

			request.status = status;
			request.reviewedAt = new Date().toISOString();
			localStorage.setItem('vshopSellerRequests', JSON.stringify(requests));
			notifyStorageChange('vshopSellerRequests');
			if (status === 'Approved') {
				notifyStorageChange('vshopSellers');
			}
			return true;
		},
		authenticate(identifier, password) {
			const normalizedIdentifier = identifier.trim().toLowerCase();
			const seller = getSellers().find((account) =>
				account.email.toLowerCase() === normalizedIdentifier ||
				account.phone === identifier.trim()
			);
			if (!seller || seller.password !== password) {
				const request = getSellerRequests().find((item) =>
					item.email.toLowerCase() === normalizedIdentifier ||
					item.phone === identifier.trim()
				);
				return {
					status: request?.status === 'Pending' ? 'pending' : request?.status === 'Rejected' ? 'rejected' : 'invalid',
					seller: null
				};
			}
			if (seller.isBlocked) {
				return { status: 'blocked', seller: null };
			}
			const { password: savedPassword, ...sellerDetails } = seller;
			return { status: 'authenticated', seller: sellerDetails };
		},
		setBlocked(email, isBlocked) {
			const sellers = getSellers();
			const seller = sellers.find((account) => account.email === email);
			if (!seller) {
				return false;
			}
			seller.isBlocked = Boolean(isBlocked);
			localStorage.setItem('vshopSellers', JSON.stringify(sellers));
			const storedSession = localStorage.getItem(sessionKey);
			if (storedSession !== null) {
				const session = JSON.parse(storedSession);
				if (session.role === 'seller' && session.email === email && seller.isBlocked) {
					localStorage.removeItem(sessionKey);
				}
			}
			notifyStorageChange('vshopSellers');
			return true;
		},
		delete(email) {
			const sellers = getSellers();
			const remainingSellers = sellers.filter((account) => account.email !== email);
			if (remainingSellers.length === sellers.length) {
				return false;
			}
			localStorage.setItem('vshopSellers', JSON.stringify(remainingSellers));
			const storedSession = localStorage.getItem(sessionKey);
			if (storedSession !== null) {
				const session = JSON.parse(storedSession);
				if (session.role === 'seller' && session.email === email) {
					localStorage.removeItem(sessionKey);
				}
			}
			notifyStorageChange('vshopSellers');
			return true;
		},
		updateProfile(email, profile) {
			const sellers = getSellers();
			const seller = sellers.find((account) => account.email === email);
			if (!seller) {
				throw new Error('The seller account could not be found.');
			}
			const fields = ['sellerName', 'email', 'phone', 'businessName', 'businessType',
				'businessAddress', 'pan', 'gstin', 'accountHolder', 'accountNumber', 'ifsc'];
			if (!profile || typeof profile !== 'object' ||
				fields.some((field) => typeof profile[field] !== 'string')) {
				throw new TypeError('The seller profile is invalid.');
			}

			const updatedEmail = profile.email.trim().toLowerCase();
			const updatedPhone = profile.phone.trim();
			if (fields.some((field) => field !== 'gstin' && !profile[field].trim())) {
				throw new TypeError('Complete all required seller, business, tax, and bank details.');
			}
			if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(profile.pan.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 10-character PAN.');
			}
			if (profile.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(profile.gstin.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 15-character GSTIN or leave it blank.');
			}
			if (!/^[0-9]{9,18}$/.test(profile.accountNumber.trim())) {
				throw new TypeError('Bank account number must contain 9 to 18 digits.');
			}
			if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profile.ifsc.trim().toUpperCase())) {
				throw new TypeError('Enter a valid 11-character IFSC code.');
			}
			if (sellers.some((account) =>
				account !== seller &&
				(account.email.toLowerCase() === updatedEmail || account.phone === updatedPhone)
			)) {
				throw new Error('A seller with this email or phone number already exists.');
			}

			Object.assign(seller, profile, {
				email: updatedEmail,
				phone: updatedPhone,
				pan: profile.pan.trim().toUpperCase(),
				gstin: profile.gstin.trim().toUpperCase(),
				accountNumber: profile.accountNumber.trim(),
				ifsc: profile.ifsc.trim().toUpperCase()
			});
			localStorage.setItem('vshopSellers', JSON.stringify(sellers));
			const session = window.VCartSession.get();
			if (session?.role === 'seller' && session.email === email) {
				const { password, ...sellerDetails } = seller;
				window.VCartSession.set({ ...sellerDetails, role: 'seller' });
			}
			return true;
		}
	});

	window.VCartProducts = Object.freeze({
		async list() {
			const products = await readRecord('vshopProducts') || [];
			if (!Array.isArray(products)) {
				throw new TypeError('The saved product list is invalid.');
			}
			return products;
		},
		async getCatalog() {
			const products = await readRecord('vshopCatalogProducts') || [];
			if (!Array.isArray(products)) {
				throw new TypeError('The saved storefront catalog is invalid.');
			}
			return products;
		},
		async syncCatalog(products) {
			if (!Array.isArray(products) || products.some((product) =>
				!product || typeof product !== 'object' || typeof product.name !== 'string'
			)) {
				throw new TypeError('The storefront catalog is invalid.');
			}

			const currentProducts = await this.getCatalog();
			if (JSON.stringify(currentProducts) !== JSON.stringify(products)) {
				await writeRecord('vshopCatalogProducts', products);
			}
		},
		async add(product) {
			if (!product || typeof product !== 'object' ||
				['name', 'price', 'category', 'stock'].some((field) => typeof product[field] !== 'string' || !product[field].trim())) {
				throw new TypeError('All product details are required.');
			}

			const products = await this.list();
			products.push({ ...product });
			await writeRecord('vshopProducts', products);
		},
		async setBlocked(requestId, isBlocked) {
			if (typeof requestId !== 'string' || !requestId.trim()) {
				throw new TypeError('A product request ID is required.');
			}
			const products = await this.list();
			const product = products.find((item) => item.requestId === requestId);
			if (!product) {
				return false;
			}

			if (isBlocked) {
				product.status = 'Blocked';
				product.blockedAt = new Date().toISOString();
				product.blockReason = 'Blocked by admin';
			} else {
				product.status = 'Active';
				delete product.blockedAt;
				delete product.blockReason;
			}
			await writeRecord('vshopProducts', products);
			return true;
		},
		async delete(requestId) {
			if (typeof requestId !== 'string' || !requestId.trim()) {
				throw new TypeError('A product request ID is required.');
			}
			const products = await this.list();
			const remainingProducts = products.filter((product) => product.requestId !== requestId);
			if (remainingProducts.length === products.length) {
				return false;
			}
			await writeRecord('vshopProducts', remainingProducts);
			return true;
		}
	});

	window.VCartProductRequests = Object.freeze({
		async list() {
			const requests = await readRecord('vshopProductRequests') || [];
			if (!Array.isArray(requests)) {
				throw new TypeError('The saved product approval requests are invalid.');
			}
			return requests;
		},
		async delete(requestId) {
			if (typeof requestId !== 'string' || !requestId.trim()) {
				throw new TypeError('A product request ID is required.');
			}
			const requests = await this.list();
			const remainingRequests = requests.filter((request) => request.requestId !== requestId);
			if (remainingRequests.length === requests.length) {
				return false;
			}
			await writeRecord('vshopProductRequests', remainingRequests);
			return true;
		},
		async submit(product) {
			if (!product || typeof product !== 'object' ||
				['name', 'companyName', 'color', 'price', 'category', 'stock', 'description']
					.some((field) => typeof product[field] !== 'string' || !product[field].trim()) ||
				!Array.isArray(product.images) || product.images.length < 2 || product.images.length > 5 ||
				product.images.some((image) => typeof image !== 'string' || !image.startsWith('data:image/'))) {
				throw new TypeError('Valid product details and 2 to 5 product images are required.');
			}

			const requests = await this.list();
			let requestId;
			do {
				requestId = `REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
			} while (requests.some((request) => request.requestId === requestId));

			const sellerSession = window.VCartSession.get();
			const request = {
				...product,
				requestId,
				sellerName: sellerSession?.role === 'seller' &&
					typeof sellerSession.sellerName === 'string' && sellerSession.sellerName.trim()
					? sellerSession.sellerName.trim()
					: 'Seller',
				uploadedAt: new Date().toISOString(),
				status: 'Pending'
			};
			requests.push(request);
			await writeRecord('vshopProductRequests', requests);
			return request;
		},
		async accept(requestId) {
			const requests = await this.list();
			const request = requests.find((item) => item.requestId === requestId);
			if (!request || request.status !== 'Approved') {
				return false;
			}
			const products = await window.VCartProducts.list();
			if (!products.some((product) => product.requestId === requestId)) {
				throw new Error('The approved product could not be found in the product list.');
			}
			request.sellerAcceptedAt = new Date().toISOString();
			await writeRecord('vshopProductRequests', requests);
			return true;
		},
		async setStatus(requestId, status) {
			if (!['Approved', 'Rejected'].includes(status)) {
				throw new TypeError('Product approval status must be Approved or Rejected.');
			}
			const requests = await this.list();
			const request = requests.find((item) => item.requestId === requestId);
			if (!request || request.status !== 'Pending') {
				return false;
			}
			if (status === 'Approved') {
				const products = await window.VCartProducts.list();
				if (!products.some((product) => product.requestId === requestId)) {
					products.push({
						...request,
						status: 'Active',
						acceptedAt: new Date().toISOString()
					});
					await writeRecord('vshopProducts', products);
				}
			}
			request.status = status;
			request.reviewedAt = new Date().toISOString();
			await writeRecord('vshopProductRequests', requests);
			return true;
		}
	});
})();