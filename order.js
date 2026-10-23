(() => {
    if (!window.VCartAccountSession.requireCustomer()) {
        return;
    }

    const storageKey = "vcartOrders";
    const searchInput = document.getElementById("order-search");
    const filterButtons = Array.from(document.querySelectorAll("[data-order-filter]"));
    const orderList = document.getElementById("order-list");
    const emptyMessage = document.getElementById("no-orders");
    const orderTemplate = document.getElementById("order-card-template");
    const productTemplate = document.getElementById("order-product-template");
    const stepTemplate = document.getElementById("tracking-step-template");
    const confirmationMessage = document.getElementById("order-confirmation");
    const trackingStages = [
        { status: "confirmed", title: "Order confirmed", icon: "fa-check" },
        { status: "packed", title: "Packed and ready", icon: "fa-box" },
        { status: "shipped", title: "In transit", icon: "fa-truck-fast" },
        { status: "delivered", title: "Delivered", icon: "fa-house" }
    ];
    let orders = [];
    let activeFilter = "all";

    function readOrders() {
        const savedOrders = window.sessionStorage.getItem(storageKey);
        if (!savedOrders) {
            return [];
        }

        const parsedOrders = JSON.parse(savedOrders);
        if (!Array.isArray(parsedOrders)) {
            throw new Error("Saved order data is invalid.");
        }
        return parsedOrders.filter(order =>
            order
            && typeof order.id === "string"
            && typeof order.trackingId === "string"
            && Array.isArray(order.products)
        );
    }

    function formatDate(dateValue, options = { day: "numeric", month: "short", year: "numeric" }) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }
        return new Intl.DateTimeFormat("en-IN", options).format(date);
    }

    function formatPrice(priceText, quantity) {
        const amount = Number(String(priceText).replace(/[^\d.]/g, "")) * quantity;
        if (!Number.isFinite(amount)) {
            return priceText;
        }
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function getStatus(order) {
        return trackingStages.some(stage => stage.status === order.status)
            ? order.status
            : "confirmed";
    }

    function renderStatus(order, card) {
        const status = getStatus(order);
        const label = {
            confirmed: ["Order confirmed", "fa-circle-check", "status-processing"],
            packed: ["Packed", "fa-box", "status-processing"],
            shipped: ["On the way", "fa-truck-fast", "status-shipped"],
            delivered: ["Delivered", "fa-circle-check", "status-delivered"]
        }[status];
        const statusPill = card.querySelector("[data-order-status]");
        const icon = document.createElement("i");
        icon.className = `fa-solid ${label[1]}`;
        icon.setAttribute("aria-hidden", "true");
        statusPill.className = `status-pill ${label[2]}`;
        statusPill.append(icon, document.createTextNode(` ${label[0]}`));
    }

    function renderProducts(order, card) {
        const productsContainer = card.querySelector(".order-products");
        order.products.forEach(product => {
            if (!product || typeof product.name !== "string" || typeof product.image !== "string") {
                return;
            }
            const productElement = productTemplate.content.firstElementChild.cloneNode(true);
            const image = productElement.querySelector("[data-product-image]");
            image.src = product.image;
            image.alt = product.name;
            productElement.querySelector("[data-product-name]").textContent = product.name;
            productElement.querySelector("[data-product-quantity]").textContent = String(product.quantity || 1);
            productElement.querySelector("[data-product-price]").textContent =
                formatPrice(product.price, Number(product.quantity) || 1);

            const delivery = productElement.querySelector(".delivery-estimate");
            const label = delivery.querySelector(".estimate-label");
            const estimate = delivery.querySelector("[data-estimated-delivery]");
            const note = delivery.querySelector(".estimate-note");
            if (getStatus(order) === "delivered") {
                label.textContent = "ORDER PLACED";
                estimate.textContent = formatDate(order.createdAt);
                note.textContent = "Order delivered";
                delivery.classList.add("delivered-estimate");
            } else {
                label.textContent = "EXPECTED DELIVERY";
                estimate.textContent = formatDate(order.estimatedDelivery);
                note.textContent = "Estimated delivery";
            }
            productsContainer.append(productElement);
        });
    }

    function renderTracking(order, card) {
        const trackingSteps = card.querySelector(".tracking-steps");
        const statusIndex = trackingStages.findIndex(stage => stage.status === getStatus(order));

        trackingStages.forEach((stage, index) => {
            const step = stepTemplate.content.firstElementChild.cloneNode(true);
            const icon = step.querySelector(".step-icon i");
            const isComplete = index < statusIndex || getStatus(order) === "delivered";
            const isCurrent = index === statusIndex && getStatus(order) !== "delivered";
            const eventDate = order.statusDates?.[stage.status];

            icon.className = `fa-solid ${isComplete ? "fa-check" : stage.icon}`;
            step.querySelector("strong").textContent = stage.title;
            step.querySelector("div span").textContent = eventDate
                ? formatDate(eventDate, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
                : (isCurrent ? formatDate(order.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Pending");
            if (isComplete) {
                step.classList.add("is-complete");
            } else if (isCurrent) {
                step.classList.add("is-current");
            }
            trackingSteps.append(step);
        });

        card.querySelector("[data-tracking-id]").textContent = order.trackingId;
    }

    function makeOrderCard(order) {
        const card = orderTemplate.content.firstElementChild.cloneNode(true);
        card.dataset.status = getStatus(order);
        card.dataset.search = [
            order.id,
            order.trackingId,
            ...order.products.map(product => product?.name || "")
        ].join(" ").toLowerCase();
        card.querySelector("[data-order-id]").textContent = `#${order.id}`;
        card.querySelector("[data-order-date]").textContent = `Placed on ${formatDate(order.createdAt)}`;
        renderStatus(order, card);
        renderProducts(order, card);
        renderTracking(order, card);
        return card;
    }

    function updateCounts() {
        const counts = {
            all: orders.length,
            confirmed: orders.filter(order => ["confirmed", "packed"].includes(getStatus(order))).length,
            shipped: orders.filter(order => getStatus(order) === "shipped").length,
            delivered: orders.filter(order => getStatus(order) === "delivered").length
        };
        Object.entries(counts).forEach(([status, count]) => {
            const countElement = document.querySelector(`[data-filter-count="${status}"]`);
            if (countElement) {
                countElement.textContent = String(count);
            }
        });
    }

    function updateVisibleOrders() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const cards = Array.from(orderList.querySelectorAll(".order-card"));
        let visibleCount = 0;

        cards.forEach(card => {
            const matchesFilter = activeFilter === "all"
                || (activeFilter === "confirmed" && ["confirmed", "packed"].includes(card.dataset.status))
                || card.dataset.status === activeFilter;
            const matchesSearch = card.dataset.search.includes(searchTerm);
            const isVisible = matchesFilter && matchesSearch;
            card.hidden = !isVisible;
            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (orders.length === 0) {
            emptyMessage.textContent = "You haven't placed any orders yet. Your orders will appear here.";
            emptyMessage.hidden = false;
        } else {
            emptyMessage.textContent = "No orders match your search or selected filter.";
            emptyMessage.hidden = visibleCount > 0;
        }
    }

    function renderOrders() {
        orderList.querySelectorAll(".order-card").forEach(card => card.remove());
        orders.forEach(order => orderList.append(makeOrderCard(order)));
        updateCounts();
        updateVisibleOrders();
    }

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.orderFilter;
            filterButtons.forEach(filterButton => {
                const isActive = filterButton === button;
                filterButton.classList.toggle("is-active", isActive);
                filterButton.setAttribute("aria-pressed", String(isActive));
            });
            updateVisibleOrders();
        });
    });

    searchInput.addEventListener("input", updateVisibleOrders);

    orderList.addEventListener("click", event => {
        const button = event.target.closest(".tracking-toggle");
        if (!button) {
            return;
        }

        const panel = button.closest(".order-card").querySelector(".tracking-panel");
        const nextExpandedState = button.getAttribute("aria-expanded") !== "true";
        panel.hidden = !nextExpandedState;
        button.setAttribute("aria-expanded", String(nextExpandedState));
        button.innerHTML = nextExpandedState
            ? 'Hide tracking <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>'
            : 'Track order <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    });

    try {
        orders = readOrders();
        renderOrders();
        const placedOrderId = new URLSearchParams(window.location.search).get("placed");
        if (placedOrderId && orders.some(order => order.id === placedOrderId)) {
            confirmationMessage.hidden = false;
            document.querySelector(`[data-search*="${placedOrderId.toLowerCase()}"]`)?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    } catch (error) {
        console.error("Could not load saved orders.", error);
        emptyMessage.textContent = "Could not load your orders. Check browser storage and refresh the page.";
        emptyMessage.hidden = false;
        filterButtons.forEach(button => {
            button.disabled = true;
        });
        searchInput.disabled = true;
    }
})();
