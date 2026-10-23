const checkoutParams = new URLSearchParams(window.location.search);
const hasCustomerSession = window.VCartAccountSession.requireCustomer();
const isCartCheckout = checkoutParams.get("source") === "cart";
const productImagePattern = /^images\/[A-Za-z0-9 _().-]+\.(?:png|jpe?g|webp)$/i;
const ordersStorageKey = "vcartOrders";
let checkoutItems = [];

function parsePrice(priceText) {
    const amount = Number(String(priceText).replace(/[^\d.]/g, ""));
    return Number.isFinite(amount) ? amount : NaN;
}

function formatPrice(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function isValidProduct(item) {
    return item
        && typeof item.image === "string"
        && productImagePattern.test(item.image)
        && typeof item.name === "string"
        && item.name.trim()
        && typeof item.price === "string"
        && Number.isFinite(parsePrice(item.price))
        && parsePrice(item.price) > 0
        && typeof item.oldPrice === "string"
        && Number.isFinite(parsePrice(item.oldPrice))
        && parsePrice(item.oldPrice) > 0
        && typeof item.discount === "string"
        && item.discount.trim();
}

function showCheckoutError(message) {
    const errorMessage = document.querySelector("#checkout-product-error");
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    document.querySelector(".order-btn button").disabled = true;
    document.querySelectorAll("[data-quantity-change]").forEach(button => {
        button.disabled = true;
    });
}

function loadCartItems() {
    const savedItems = window.sessionStorage.getItem("vcartCheckoutItems");
    if (!savedItems) {
        throw new Error("Checkout items are missing.");
    }

    const items = JSON.parse(savedItems);
    if (!Array.isArray(items) || items.length === 0 || items.some(item =>
        !isValidProduct(item)
        || !Number.isInteger(Number(item.quantity))
        || Number(item.quantity) < 1
    )) {
        throw new Error("Checkout items are invalid.");
    }

    return items;
}

function setProductDetails(item) {
    const productImageElement = document.querySelector("#checkout-product-image");
    productImageElement.src = item.image;
    productImageElement.alt = item.name;
    document.querySelector("#checkout-product-name").textContent = item.name;
    document.querySelector("#checkout-product-price").textContent = item.price;
    document.querySelector("#checkout-product-old-price").textContent = item.oldPrice;
    document.querySelector("#checkout-product-discount").textContent = item.discount;
}

function updatePriceDetails(items) {
    const quantity = items.reduce((total, item) => total + Number(item.quantity), 0);
    const productTotal = items.reduce((total, item) =>
        total + parsePrice(item.oldPrice) * Number(item.quantity), 0);
    const subtotal = items.reduce((total, item) =>
        total + parsePrice(item.price) * Number(item.quantity), 0);

    document.querySelector("#price-product-price").textContent = formatPrice(productTotal);
    document.querySelector("#price-discount").textContent = `−${formatPrice(productTotal - subtotal)}`;
    document.querySelector("#price-final").textContent = formatPrice(subtotal);
    document.querySelector("#price-total").textContent = formatPrice(subtotal);
    document.querySelector("#price-quantity").textContent = String(quantity);
    document.querySelector("#price-delivery").textContent = "Free";
}

function readOrders() {
    const savedOrders = window.sessionStorage.getItem(ordersStorageKey);
    if (!savedOrders) {
        return [];
    }

    const orders = JSON.parse(savedOrders);
    if (!Array.isArray(orders)) {
        throw new Error("Saved order data is invalid.");
    }

    return orders;
}

function createOrderId() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `VC-${datePart}-${randomPart}`;
}

function placeOrder(event) {
    event.preventDefault();

    if (!window.VCartAccountSession.requireCustomer()) {
        return;
    }

    if (checkoutItems.length === 0 || checkoutItems.some(item => !isValidProduct(item))) {
        showCheckoutError("Product details are missing or invalid. Please go back and select your products again.");
        return;
    }

    const submitButton = document.querySelector(".order-btn button");
    submitButton.disabled = true;

    try {
        let remainingCartItems;
        if (isCartCheckout) {
            const savedCart = window.sessionStorage.getItem("vcartCart");
            if (savedCart) {
                const cartItems = JSON.parse(savedCart);
                if (!Array.isArray(cartItems)) {
                    throw new Error("Saved cart data is invalid.");
                }
                const purchasedIds = new Set(checkoutItems.map(item => item.id));
                remainingCartItems = cartItems.filter(item => !purchasedIds.has(item.id));
            }
        }

        const now = new Date();
        const estimatedDelivery = new Date(now);
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);
        const order = {
            id: createOrderId(),
            trackingId: `VCX${Date.now().toString().slice(-10)}`,
            status: "confirmed",
            createdAt: now.toISOString(),
            estimatedDelivery: estimatedDelivery.toISOString(),
            products: checkoutItems.map(item => ({
                image: item.image,
                name: item.name.trim(),
                price: item.price,
                oldPrice: item.oldPrice,
                discount: item.discount,
                quantity: Number(item.quantity)
            })),
            customer: {
                firstName: document.getElementById("first-name").value.trim(),
                lastName: document.getElementById("last-name").value.trim(),
                mobile: document.getElementById("mobile").value.trim(),
                email: document.getElementById("email").value.trim(),
                address: [
                    document.getElementById("street").value.trim(),
                    document.getElementById("landmark").value.trim(),
                    document.getElementById("city").value.trim(),
                    document.getElementById("state").value.trim(),
                    document.getElementById("pin-code").value.trim()
                ].filter(Boolean).join(", ")
            },
            paymentMethod: document.querySelector('input[name="payment"]:checked')?.value || "cod"
        };

        const orders = readOrders();
        orders.unshift(order);
        window.sessionStorage.setItem(ordersStorageKey, JSON.stringify(orders));

        if (isCartCheckout) {
            try {
                if (remainingCartItems) {
                    window.sessionStorage.setItem(
                        "vcartCart",
                        JSON.stringify(remainingCartItems)
                    );
                }
                window.sessionStorage.removeItem("vcartCheckoutItems");
            } catch (error) {
                console.error("Order was placed, but the cart could not be cleared.", error);
            }
        }

        const customerName = order.customer.firstName;
        document.querySelector("#order-success-title").textContent =
            customerName ? `Thank you, ${customerName}!` : "Thank you!";
        document.querySelector("#track-order-link").href =
            `order.html?placed=${encodeURIComponent(order.id)}`;
        document.querySelector("#order-success-dialog").showModal();
    } catch (error) {
        console.error("Could not place the order.", error);
        submitButton.disabled = false;
        alert("Could not place your order. Please check browser storage and try again.");
    }
}

function setupCartCheckout() {
    const productSection = document.querySelector("#checkout-product-section");
    const backButton = document.querySelector("#back-to-product");
    backButton.href = "cart.html";

    let items;
    try {
        items = loadCartItems();
    } catch (error) {
        console.error("Could not load checkout items.", error);
        productSection.querySelector(".product-details").hidden = true;
        showCheckoutError("Cart items are missing or invalid. Please return to your cart and try again.");
        return;
    }

    if (items.length !== 1) {
        checkoutItems = items;
        productSection.hidden = true;
        document.querySelectorAll("[data-quantity-change]").forEach(button => {
            button.disabled = true;
        });
        updatePriceDetails(items);
        return;
    }

    const item = items[0];
    checkoutItems = [item];
    setProductDetails(item);
    const quantityOutput = document.querySelector("#product-quantity");
    quantityOutput.value = String(item.quantity);

    function refreshSingleItemPrice() {
        item.quantity = Number(quantityOutput.value);
        updatePriceDetails([item]);
    }

    refreshSingleItemPrice();
    document.querySelectorAll("[data-quantity-change]").forEach(button => {
        button.addEventListener("click", () => {
            const currentQuantity = Number(quantityOutput.value);
            const change = Number(button.dataset.quantityChange);
            quantityOutput.value = String(Math.max(1, currentQuantity + change));
            refreshSingleItemPrice();
        });
    });
}

function setupDirectCheckout() {
    const item = {
        image: checkoutParams.get("image"),
        name: checkoutParams.get("name"),
        price: checkoutParams.get("price"),
        oldPrice: checkoutParams.get("oldPrice"),
        discount: checkoutParams.get("discount"),
        quantity: 1
    };

    if (!isValidProduct(item)) {
        showCheckoutError("Product details are missing or invalid. Please go back and select a product again.");
        return;
    }

    checkoutItems = [item];
    setProductDetails(item);
    document.querySelector("#back-to-product").href =
        `product-details.html${window.location.search}`;

    const quantityOutput = document.querySelector("#product-quantity");
    function refreshSingleItemPrice() {
        item.quantity = Number(quantityOutput.value);
        updatePriceDetails([item]);
    }

    refreshSingleItemPrice();
    document.querySelectorAll("[data-quantity-change]").forEach(button => {
        button.addEventListener("click", () => {
            const currentQuantity = Number(quantityOutput.value);
            const change = Number(button.dataset.quantityChange);
            quantityOutput.value = String(Math.max(1, currentQuantity + change));
            refreshSingleItemPrice();
        });
    });
}

if (hasCustomerSession) {
    if (isCartCheckout) {
        setupCartCheckout();
    } else {
        setupDirectCheckout();
    }

    document.querySelector("form").addEventListener("submit", placeOrder);
} else {
    document.querySelector("form").hidden = true;
}
