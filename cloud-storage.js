(() => {
	const legacyProducts = window.VCartProducts;
	const legacyProductRequests = window.VCartProductRequests;
	const legacySession = window.VCartSession;
	let client;

	function getClient() {
		if (!client) {
			if (!window.supabase?.createClient || !window.VCartSupabaseConfig?.url || !window.VCartSupabaseConfig?.anonKey) {
				throw new Error('Supabase is not configured. Check the Supabase scripts and project settings.');
			}
			client = window.supabase.createClient(
				window.VCartSupabaseConfig.url,
				window.VCartSupabaseConfig.anonKey
			);
			client
				.channel('vcart-record-changes')
				.on('postgres_changes', { event: '*', schema: 'public', table: 'vcart_records' }, () => {
					['vshopCustomers', 'vshopSellers', 'vshopSellerRequests', 'vshopProducts',
						'vshopProductRequests', 'vshopCatalogProducts'].forEach(notifyStorageChange);
				})
				.subscribe((status, error) => {
					if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
						console.error('Could not subscribe to live VCart updates.', error || status);
					}
				});
		}
		return client;
	}

	function notifyStorageChange(key) {
		window.dispatchEvent(new CustomEvent('vshop:storage', { detail: { key } }));
	}

	function throwIfError(result) {
		if (result.error) throw result.error;
		return result.data;
	}

	function normalizeAccount(row) {
		return { ...row.data, id: row.owner_id, role: row.role, status: row.status, isBlocked: row.status === 'Blocked' };
	}

	async function getCurrentUser() {
		const { data, error } = await getClient().auth.getSession();
		if (error) throw error;
		return data.session?.user || null;
	}

	async function getAccountById(userId) {
		const result = await getClient()
			.from('vcart_records')
			.select('*')
			.eq('record_type', 'account')
			.eq('owner_id', userId)
			.maybeSingle();
		return throwIfError(result);
	}

	async function getOwnAccount() {
		const user = await getCurrentUser();
		if (!user) throw new Error('Please sign in to continue.');
		const row = await getAccountById(user.id);
		if (!row) throw new Error('The signed-in account profile is missing.');
		return { user, row };
	}

	function saveSession(row) {
		const session = normalizeAccount(row);
		window.VCartSession.set(session);
		return session;
	}

	async function listRows(recordType, filters = {}) {
		let query = getClient().from('vcart_records').select('*').eq('record_type', recordType);
		if (filters.role) query = query.eq('role', filters.role);
		if (filters.status) query = query.eq('status', filters.status);
		const result = await query.order('created_at', { ascending: true });
		return throwIfError(result);
	}

	function recordData(row) {
		return { ...row.data, requestId: row.record_id, status: row.status, sellerId: row.owner_id };
	}

	function readLegacyList(key) {
		const stored = localStorage.getItem(key);
		if (stored === null) return [];
		const records = JSON.parse(stored);
		if (!Array.isArray(records)) throw new TypeError(`The saved ${key} data is invalid.`);
		return records;
	}

	function findLegacyAccount(email, role) {
		const keys = role === 'customer' ? ['vshopCustomers'] : ['vshopSellers', 'vshopSellerRequests'];
		for (const key of keys) {
			const account = readLegacyList(key).find((item) =>
				typeof item.email === 'string' && item.email.toLowerCase() === email.toLowerCase()
			);
			if (account) return account;
		}
		return null;
	}

	async function importLegacyAccount(row) {
		if (row.data.legacyDataImported) return row;
		const legacy = findLegacyAccount(row.data.email, row.role);
		if (!legacy) return row;
		const {
			password: ignoredPassword,
			isBlocked: ignoredBlockFlag,
			status: ignoredStatus,
			requestId: ignoredRequestId,
			requestedAt: ignoredRequestedAt,
			reviewedAt: ignoredReviewedAt,
			...legacyData
		} = legacy;
		return updateAccountData(row, {
			...legacyData,
			...row.data,
			email: row.data.email,
			legacyDataImported: true
		});
	}

	async function findAccountByEmail(email, role) {
		let query = getClient()
			.from('vcart_records')
			.select('*')
			.eq('record_type', 'account')
			.eq('data->>email', email.trim().toLowerCase());
		if (role) query = query.eq('role', role);
		const result = await query.maybeSingle();
		return throwIfError(result);
	}

	async function updateAccountData(row, data) {
		const result = await getClient()
			.from('vcart_records')
			.update({ data })
			.eq('record_type', 'account')
			.eq('record_id', row.record_id)
			.select('*')
			.single();
		const updated = throwIfError(result);
		saveSession(updated);
		notifyStorageChange(updated.role === 'customer' ? 'vshopCustomers' : 'vshopSellers');
		return updated;
	}

	async function authenticate(identifier, password, expectedRole) {
		const email = identifier.trim().toLowerCase();
		if (!email.includes('@')) return { status: 'email_required', customer: null, seller: null };

		const { data, error } = await getClient().auth.signInWithPassword({ email, password });
		if (error) {
			if (/email not confirmed/i.test(error.message)) {
				return { status: 'unconfirmed', customer: null, seller: null };
			}
			if (/invalid login credentials/i.test(error.message)) {
				return { status: 'invalid', customer: null, seller: null };
			}
			throw error;
		}
		let row = await getAccountById(data.user.id);
		if (!row) throw new Error('No account profile was found for this login.');
		if (expectedRole && row.role !== expectedRole && row.role !== 'admin') {
			await getClient().auth.signOut();
			legacySession.clear();
			return { status: 'invalid', customer: null, seller: null };
		}
		if (row.status === 'Blocked') {
			await getClient().auth.signOut();
			legacySession.clear();
			return { status: 'blocked', customer: null, seller: null };
		}
		if (row.status === 'Rejected') {
			await getClient().auth.signOut();
			legacySession.clear();
			return { status: 'rejected', customer: null, seller: null };
		}
		row = await importLegacyAccount(row);
		const session = saveSession(row);
		if (row.role === 'seller' && row.status !== 'Approved') {
			return { status: 'pending', seller: session, applicationComplete: Boolean(row.data.businessName) };
		}
		return {
			status: 'authenticated',
			customer: row.role === 'customer' ? session : null,
			seller: row.role === 'seller' ? session : null,
			account: session
		};
	}

	async function registerCustomer(customer) {
		if (!customer || typeof customer !== 'object' ||
			['name', 'email', 'mobile', 'dob', 'gender', 'password'].some((field) =>
				typeof customer[field] !== 'string' || !customer[field].trim())) {
			throw new TypeError('All customer details are required.');
		}
		if (await getCurrentUser()) throw new Error('Sign out before creating another account.');
		const metadata = {
			role: 'customer',
			name: customer.name.trim(),
			email: customer.email.trim().toLowerCase(),
			mobile: customer.mobile.trim(),
			dob: customer.dob,
			gender: customer.gender
		};
		const { data, error } = await getClient().auth.signUp({
			email: metadata.email,
			password: customer.password,
			options: { data: metadata }
		});
		if (error) {
			if (error.code === '23505' || /already registered|already exists/i.test(error.message)) return false;
			throw error;
		}
		if (data.user?.identities?.length === 0) return false;
		if (!data.user) throw new Error('Supabase did not return the created customer account.');
		if (data.session) {
			const row = await getAccountById(data.user.id);
			if (!row) throw new Error('Account created, but the profile trigger did not create its profile.');
			saveSession(row);
		}
		return { registered: true, confirmationRequired: !data.session };
	}

	async function registerSeller(seller) {
		const requiredFields = ['sellerName', 'email', 'phone', 'businessName', 'businessType',
			'businessAddress', 'pan', 'accountHolder', 'accountNumber', 'ifsc', 'password'];
		if (!seller || typeof seller !== 'object' ||
			requiredFields.some((field) => typeof seller[field] !== 'string' || !seller[field].trim())) {
			throw new TypeError('Complete all required seller, business, tax, bank, and password details.');
		}
		if (seller.password.length < 8) throw new TypeError('Password must be at least 8 characters long.');
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

		let user;
		const currentUser = await getCurrentUser();
		if (currentUser && currentUser.email?.toLowerCase() !== seller.email.trim().toLowerCase()) {
			throw new Error('Sign out before creating a seller account.');
		}
		if (currentUser && currentUser.email?.toLowerCase() === seller.email.trim().toLowerCase()) {
			user = currentUser;
			const ownRow = await getAccountById(user.id);
			if (!ownRow || ownRow.role !== 'seller') {
				throw new Error('Sign out before creating a seller account.');
			}
			if (ownRow.data.businessName) return false;
		} else {
			const { data, error } = await getClient().auth.signUp({
				email: seller.email.trim().toLowerCase(),
				password: seller.password,
				options: {
					data: {
						role: 'seller',
						sellerName: seller.sellerName.trim(),
						email: seller.email.trim().toLowerCase(),
						phone: seller.phone.trim()
					}
				}
			});
			if (error) {
				if (error.code === '23505' || /already registered|already exists/i.test(error.message)) return false;
				throw error;
			}
			if (data.user?.identities?.length === 0) return false;
			if (!data.user) throw new Error('Supabase did not return the created seller account.');
			user = data.user;
			if (!data.session) {
				return { registered: true, confirmationRequired: true };
			}
		}

		const row = await getAccountById(user.id);
		if (!row || row.role !== 'seller') {
			throw new Error('Seller account profile could not be loaded.');
		}
		const data = {
			...row.data,
			sellerName: seller.sellerName.trim(),
			email: seller.email.trim().toLowerCase(),
			phone: seller.phone.trim(),
			businessName: seller.businessName.trim(),
			businessType: seller.businessType.trim(),
			businessAddress: seller.businessAddress.trim(),
			pan: seller.pan.trim().toUpperCase(),
			gstin: seller.gstin.trim().toUpperCase(),
			accountHolder: seller.accountHolder.trim(),
			accountNumber: seller.accountNumber.trim(),
			ifsc: seller.ifsc.trim().toUpperCase()
		};
		await updateAccountData(row, data);
		return true;
	}

	window.VCartCloud = Object.freeze({
		async requireRole(role) {
			const { row } = await getOwnAccount();
			if (row.status === 'Blocked' || (row.role === 'seller' && row.status !== 'Approved') ||
				row.role !== role) {
				await window.VCartSession.clear();
				return false;
			}
			saveSession(row);
			return true;
		},
		async refreshSession() {
			const { data, error } = await getClient().auth.getSession();
			if (error) throw error;
			if (!data.session) {
				legacySession.clear();
				return null;
			}
			const row = await getAccountById(data.session.user.id);
			if (!row) throw new Error('The signed-in account profile is missing.');
			return saveSession(row);
		},
		async migrateLegacySellerProducts() {
			const { user, row } = await getOwnAccount();
			if (row.role !== 'seller' || row.status !== 'Approved') return 0;
			const migrationKey = `vshopCloudProductMigration:${user.id}`;
			if (localStorage.getItem(migrationKey) === 'complete') return 0;

			const [oldProducts, oldRequests, cloudProducts, cloudRequests] = await Promise.all([
				legacyProducts.list(),
				legacyProductRequests.list(),
				window.VCartProducts.list(),
				window.VCartProductRequests.list()
			]);
			const knownLegacyIds = new Set(
				[...cloudProducts, ...cloudRequests]
					.map((record) => record.legacyRequestId)
					.filter((id) => typeof id === 'string')
			);
			const sellerName = row.data.sellerName?.trim().toLowerCase();
			const legacyRecords = [
				...oldProducts.filter((product) => product.status !== 'Blocked'),
				...oldRequests.filter((request) => request.status === 'Pending')
			];
			let imported = 0;
			for (const product of legacyRecords) {
				if (!product.requestId || knownLegacyIds.has(product.requestId) ||
					typeof product.sellerName !== 'string' ||
					product.sellerName.trim().toLowerCase() !== sellerName) {
					continue;
				}
				const { requestId: ignoredRequestId, status: ignoredStatus, ...details } = product;
				await window.VCartProductRequests.submit({
					...details,
					legacyRequestId: product.requestId
				});
				knownLegacyIds.add(product.requestId);
				imported += 1;
			}
			localStorage.setItem(migrationKey, 'complete');
			return imported;
		}
	});

	window.VCartSession = Object.freeze({
		get: () => legacySession.get(),
		set: (session) => legacySession.set(session),
		async clear() {
			const { error } = await getClient().auth.signOut();
			if (error) throw error;
			legacySession.clear();
		}
	});

	window.VCartAccounts = Object.freeze({
		async getDashboardCounts() {
			const [accounts, products, catalog] = await Promise.all([
				listRows('account'),
				window.VCartProducts.list(),
				legacyProducts.getCatalog()
			]);
			return {
				users: accounts.filter((row) => row.role === 'customer').length,
				sellers: accounts.filter((row) => row.role === 'seller' && row.status === 'Approved').length,
				products: products.length + catalog.length
			};
		},
		async list() {
			return (await listRows('account', { role: 'customer' })).map(normalizeAccount);
		},
		register: registerCustomer,
		authenticate(identifier, password) {
			return authenticate(identifier, password, 'customer');
		},
		async updateProfile(email, profile) {
			const { row } = await getOwnAccount();
			if (row.role !== 'customer' || row.data.email !== email) throw new Error('The customer account could not be found.');
			if (profile.email.trim().toLowerCase() !== row.data.email.toLowerCase()) {
				throw new Error('The sign-in email cannot be changed from this profile form.');
			}
			await updateAccountData(row, { ...row.data, ...profile, email: row.data.email });
		},
		getSection(email, section) {
			if (!['addresses', 'settings'].includes(section)) throw new TypeError('The customer section is invalid.');
			const session = window.VCartSession.get();
			if (session?.role !== 'customer' || session.email !== email) {
				throw new Error('The customer account could not be found.');
			}
			return session[section] || null;
		},
		async saveSection(email, section, data) {
			if (!['addresses', 'settings'].includes(section) || !data || typeof data !== 'object' || Array.isArray(data)) {
				throw new TypeError('The customer section data is invalid.');
			}
			const { row } = await getOwnAccount();
			if (row.role !== 'customer' || row.data.email !== email) throw new Error('The customer account could not be found.');
			await updateAccountData(row, { ...row.data, [section]: data });
		},
		async setBlocked(email, isBlocked) {
			const row = await findAccountByEmail(email, 'customer');
			if (!row) return false;
			const result = await getClient().from('vcart_records')
				.update({ status: isBlocked ? 'Blocked' : 'Active' })
				.eq('record_type', 'account').eq('record_id', row.record_id);
			throwIfError(result);
			notifyStorageChange('vshopCustomers');
			return true;
		},
		async delete(email) {
			const result = await getClient().rpc('vcart_admin_delete_account', { target_email: email });
			notifyStorageChange('vshopCustomers');
			return throwIfError(result);
		}
	});

	window.VCartSellers = Object.freeze({
		async list() {
			return (await listRows('account', { role: 'seller' }))
				.filter((row) => row.status === 'Approved' || row.status === 'Blocked')
				.map(normalizeAccount);
		},
		async listRequests() {
			return (await listRows('account', { role: 'seller' }))
				.filter((row) => row.status === 'Pending' || row.status === 'Rejected')
				.map((row) => ({ ...normalizeAccount(row), requestId: row.owner_id, requestedAt: row.created_at }));
		},
		register: registerSeller,
		authenticate(identifier, password) {
			return authenticate(identifier, password, 'seller');
		},
		async setRequestStatus(requestId, status) {
			if (!['Approved', 'Rejected'].includes(status)) throw new TypeError('Seller request status must be Approved or Rejected.');
			const result = await getClient().from('vcart_records')
				.update({ status })
				.eq('record_type', 'account').eq('record_id', requestId).eq('role', 'seller').eq('status', 'Pending')
				.select('record_id');
			const updated = throwIfError(result).length > 0;
			if (updated) notifyStorageChange('vshopSellers');
			return updated;
		},
		async setBlocked(email, isBlocked) {
			const row = await findAccountByEmail(email, 'seller');
			if (!row) return false;
			const status = isBlocked ? 'Blocked' : 'Approved';
			const result = await getClient().from('vcart_records')
				.update({ status }).eq('record_type', 'account').eq('record_id', row.record_id);
			throwIfError(result);
			notifyStorageChange('vshopSellers');
			return true;
		},
		async delete(email) {
			const result = await getClient().rpc('vcart_admin_delete_account', { target_email: email });
			notifyStorageChange('vshopSellers');
			return throwIfError(result);
		},
		async updateProfile(email, profile) {
			const { row } = await getOwnAccount();
			if (row.role !== 'seller' || row.data.email !== email) throw new Error('The seller account could not be found.');
			if (profile.email.trim().toLowerCase() !== row.data.email.toLowerCase()) {
				throw new Error('The sign-in email cannot be changed from this profile form.');
			}
			const updatedData = { ...row.data, ...profile };
			delete updatedData.password;
			await updateAccountData(row, updatedData);
			return true;
		}
	});

	window.VCartProducts = Object.freeze({
		async list() {
			return (await listRows('product')).map(recordData);
		},
		getCatalog: () => legacyProducts.getCatalog(),
		syncCatalog: (products) => legacyProducts.syncCatalog(products),
		async add(product) {
			if (!product || typeof product !== 'object' ||
				['name', 'price', 'category', 'stock'].some((field) =>
					typeof product[field] !== 'string' || !product[field].trim())) {
				throw new TypeError('All product details are required.');
			}
			const { user } = await getOwnAccount();
			const requestId = `PRD-${crypto.randomUUID()}`;
			const result = await getClient().from('vcart_records').insert({
				record_type: 'product', record_id: requestId, owner_id: user.id,
				status: 'Active', data: product
			});
			throwIfError(result);
			notifyStorageChange('vshopProducts');
		},
		async setBlocked(requestId, isBlocked) {
			const result = await getClient().from('vcart_records')
				.update({ status: isBlocked ? 'Blocked' : 'Active' })
				.eq('record_type', 'product').eq('record_id', requestId).select('record_id');
			const updated = throwIfError(result).length > 0;
			if (updated) notifyStorageChange('vshopProducts');
			return updated;
		},
		async delete(requestId) {
			const result = await getClient().from('vcart_records')
				.delete().eq('record_type', 'product').eq('record_id', requestId).select('record_id');
			const deleted = throwIfError(result).length > 0;
			if (deleted) notifyStorageChange('vshopProducts');
			return deleted;
		}
	});

	window.VCartProductRequests = Object.freeze({
		async list() {
			return (await listRows('product_request')).map(recordData);
		},
		async delete(requestId) {
			const result = await getClient().from('vcart_records')
				.delete().eq('record_type', 'product_request').eq('record_id', requestId).select('record_id');
			const deleted = throwIfError(result).length > 0;
			if (deleted) notifyStorageChange('vshopProductRequests');
			return deleted;
		},
		async submit(product) {
			if (!product || typeof product !== 'object' ||
				['name', 'companyName', 'color', 'price', 'category', 'stock', 'description']
					.some((field) => typeof product[field] !== 'string' || !product[field].trim()) ||
				!Array.isArray(product.images) || product.images.length < 2 || product.images.length > 5 ||
				product.images.some((image) => typeof image !== 'string' || !image.startsWith('data:image/') || image.length > 1_400_000)) {
				throw new TypeError('Valid product details and 2 to 5 product images are required.');
			}
			const { user, row } = await getOwnAccount();
			if (row.role !== 'seller' || row.status !== 'Approved') {
				throw new Error('Only approved sellers can submit products.');
			}
			const requestId = `REQ-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
			const request = {
				...product, requestId, sellerName: row.data.sellerName || 'Seller',
				uploadedAt: new Date().toISOString(), status: 'Pending'
			};
			const result = await getClient().from('vcart_records').insert({
				record_type: 'product_request', record_id: requestId, owner_id: user.id,
				status: 'Pending', data: request
			});
			throwIfError(result);
			notifyStorageChange('vshopProductRequests');
			return request;
		},
		async accept(requestId) {
			const request = (await this.list()).find((item) => item.requestId === requestId);
			if (!request || request.status !== 'Approved') return false;
			const result = await getClient().from('vcart_records')
				.update({ data: { ...request, sellerAcceptedAt: new Date().toISOString() } })
				.eq('record_type', 'product_request').eq('record_id', requestId);
			throwIfError(result);
			return true;
		},
		async setStatus(requestId, status) {
			if (!['Approved', 'Rejected'].includes(status)) throw new TypeError('Product approval status must be Approved or Rejected.');
			const result = await getClient().rpc('vcart_review_product_request', {
				target_request_id: requestId,
				decision: status
			});
			const updated = throwIfError(result);
			if (!updated) return false;
			notifyStorageChange(status === 'Approved' ? 'vshopProducts' : 'vshopProductRequests');
			return true;
		}
	});
})();
