const productParams = new URLSearchParams(window.location.search);

function getProductSpecifications() {
    const savedSpecs = productParams.get("specs");
    if (!savedSpecs) {
        return [];
    }

    try {
        const specifications = JSON.parse(savedSpecs);
        if (!Array.isArray(specifications)) {
            throw new Error("Product specifications must be a list.");
        }

        return specifications.filter(item =>
            Array.isArray(item)
            && item.length >= 2
            && typeof item[0] === "string"
            && typeof item[1] === "string"
            && item[0].trim()
            && item[1].trim()
        );
    } catch (error) {
        console.error("Could not load product specifications.", error);
        return [];
    }
}

function renderProductSpecifications(specifications) {
    const table = document.querySelector("#detail-specifications");
    const tableBody = document.querySelector("#detail-specifications-body");
    tableBody.replaceChildren();

    specifications.forEach(([label, value]) => {
        const row = document.createElement("tr");
        const heading = document.createElement("th");
        const detail = document.createElement("td");
        heading.scope = "row";
        heading.textContent = label.trim();
        detail.textContent = value.trim();
        row.append(heading, detail);
        tableBody.append(row);
    });

    table.hidden = specifications.length === 0;
}

function renderProductDescription(description) {
    const section = document.querySelector("#detail-description");
    const descriptionGrid = document.querySelector("#detail-description-content");
    descriptionGrid.replaceChildren();

    let sections;
    try {
        sections = JSON.parse(description);
    } catch (error) {
        sections = description.split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean);
    }

    if (!Array.isArray(sections)) {
        sections = [];
    }

    sections.forEach(item => {
        if (typeof item === "string") {
            const feature = document.createElement("p");
            feature.className = "description-value";
            feature.textContent = item;
            descriptionGrid.append(feature);
            return;
        }

        if (!item || typeof item.heading !== "string" || !Array.isArray(item.items)) {
            return;
        }

        const subsection = document.createElement("section");
        subsection.className = "description-section";
        const heading = document.createElement("h2");
        heading.className = "heading";
        heading.textContent = item.heading;
        const rows = document.createElement("div");
        rows.className = "description-rows";

        item.items.forEach(detail => {
            if (!detail || typeof detail.value !== "string" || !detail.value.trim()) {
                return;
            }

            const row = document.createElement("div");
            row.className = "description-row";
            if (detail.value.length > 55) {
                row.classList.add("description-row-wide");
            }

            if (typeof detail.label === "string" && detail.label.trim()) {
                const label = document.createElement("p");
                label.className = "sub-heading";
                label.textContent = detail.label;
                row.append(label);
            }

            const value = document.createElement("p");
            value.className = "heading-details";
            value.textContent = detail.value;
            row.append(value);
            rows.append(row);
        });

        subsection.append(heading, rows);
        descriptionGrid.append(subsection);
    });

    section.hidden = descriptionGrid.childElementCount === 0
        && !descriptionGrid.textContent.trim();
}

function syncFavoriteButton(button) {
    const product = window.VCartWishlist.getProduct(document.querySelector(".product"));
    const isFavorite = window.VCartWishlist.getAll().some(item => item.id === product.id);
    button.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
    button.setAttribute("aria-pressed", String(isFavorite));
    button.innerHTML = `<i class="fa-${isFavorite ? "solid" : "regular"} fa-heart" aria-hidden="true"></i>`;
}

function setupFavoriteButton() {
    const imageContainer = document.querySelector(".product-img");
    const button = document.createElement("button");
    button.className = "favorite-button";
    button.type = "button";

    try {
        syncFavoriteButton(button);
    } catch (error) {
        console.error("Could not load the wishlist.", error);
        alert("Could not load your wishlist. Check browser storage and refresh the page.");
        return;
    }

    button.addEventListener("click", () => {
        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        try {
            window.VCartWishlist.toggle(window.VCartWishlist.getProduct(document.querySelector(".product")));
            syncFavoriteButton(button);
        } catch (error) {
            console.error("Could not update the wishlist.", error);
            alert("Could not update your wishlist. Check browser storage and try again.");
        }
    });

    window.addEventListener("vcart:wishlistchange", () => {
        try {
            syncFavoriteButton(button);
        } catch (error) {
            console.error("Could not sync the wishlist heart.", error);
            alert("Could not sync the wishlist heart. Check browser storage and refresh the page.");
        }
    });
    window.addEventListener("storage", event => {
        if (event.key === "vcartWishlist") {
            try {
                syncFavoriteButton(button);
            } catch (error) {
                console.error("Could not sync the wishlist heart.", error);
                alert("Could not sync the wishlist heart. Check browser storage and refresh the page.");
            }
        }
    });
    imageContainer.append(button);
}

function setupOrderButton() {
    const button = document.querySelector(".order-btn");
    button.addEventListener("click", () => {
        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        const checkoutUrl = new URL("checkout.html", window.location.href);
        checkoutUrl.search = new URLSearchParams({
            image: productParams.get("image"),
            oldPrice: productParams.get("oldPrice"),
            discount: productParams.get("discount"),
            price: productParams.get("price"),
            name: productParams.get("name")
        }).toString();
        window.location.href = checkoutUrl.toString();
    });
}

function setupAddToCartButton() {
    const button = document.querySelector(".cart-btn");
    const productId = `${productParams.get("image")}::${productParams.get("price")}`;

    function getCartItems() {
        const savedItems = window.sessionStorage.getItem("vcartCart");
        const cartItems = savedItems ? JSON.parse(savedItems) : [];

        if (!Array.isArray(cartItems)) {
            throw new Error("Saved cart data is invalid.");
        }

        return cartItems;
    }

    function syncCartButton() {
        const isInCart = getCartItems().some(item => item.id === productId);
        button.textContent = isInCart ? "Remove Cart" : "Add to Cart";
        button.setAttribute("aria-pressed", String(isInCart));
    }

    button.addEventListener("click", () => {
        if (!window.VCartAccountSession.requireCustomer()) {
            return;
        }

        const product = {
            id: productId,
            image: productParams.get("image"),
            name: productParams.get("name"),
            price: productParams.get("price"),
            oldPrice: productParams.get("oldPrice"),
            discount: productParams.get("discount"),
            quantity: 1,
            selected: true
        };

        try {
            const cartItems = getCartItems();
            const existingItem = cartItems.find(item => item.id === productId);
            if (existingItem) {
                window.sessionStorage.setItem(
                    "vcartCart",
                    JSON.stringify(cartItems.filter(item => item.id !== productId))
                );
            } else {
                cartItems.push(product);
                window.sessionStorage.setItem("vcartCart", JSON.stringify(cartItems));
            }
            syncCartButton();
        } catch (error) {
            console.error("Could not update the cart.", error);
            alert("Could not update your cart. Check browser storage and try again.");
        }
    });

    window.addEventListener("storage", event => {
        if (event.key === "vcartCart") {
            try {
                syncCartButton();
            } catch (error) {
                console.error("Could not sync the cart button.", error);
                alert("Could not sync your cart button. Check browser storage and refresh the page.");
            }
        }
    });

    try {
        syncCartButton();
    } catch (error) {
        console.error("Could not load the cart button state.", error);
        alert("Could not load your cart. Check browser storage and refresh the page.");
    }
}

if (productParams.has("image")) {
    const imagePath = productParams.get("image");
    const oldPrice = productParams.get("oldPrice");
    const discount = productParams.get("discount");
    const price = productParams.get("price");
    const name = productParams.get("name");
    const description = productParams.get("description") || "[]";
    const specifications = getProductSpecifications();
    const validImagePath = imagePath && /^images\/[A-Za-z0-9 _().-]+\.(?:png|jpe?g|webp)$/i.test(imagePath);

    if (!validImagePath || !oldPrice || !discount || !price || !name) {
        console.error("Could not load product details: product information is invalid.");
    } else {
        document.querySelector("#detail-image").src = imagePath;
        document.querySelector("#detail-image").alt = name;
        document.querySelector(".product").dataset.category = productParams.get("category") || "";
        document.querySelector("#detail-old-price").textContent = oldPrice;
        document.querySelector("#detail-discount").textContent = discount;
        document.querySelector("#detail-price").textContent = price;
        document.querySelector("#detail-name").textContent = name;
        document.querySelector(".product").dataset.description = description;
        renderProductDescription(description);
        document.querySelector(".product").dataset.specs = JSON.stringify(specifications);
        renderProductSpecifications(specifications);
        document.title = `${name} | Product Details`;
        setupFavoriteButton();
        setupAddToCartButton();
        setupOrderButton();
    }
}