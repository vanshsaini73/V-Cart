const navlinks = document.querySelectorAll(".navlink");
const noProductsMessage = document.querySelector(".no-products");
const productsContainer = document.querySelector(".products");

function getProductDescription(description) {
    const sections = [];
    let currentSection = null;
    let pendingLabel = "";

    Array.from(description.children).forEach(element => {
        if (element.matches(".heading")) {
            currentSection = {
                heading: element.textContent.trim(),
                items: []
            };
            sections.push(currentSection);
            pendingLabel = "";
            return;
        }

        if (!currentSection) {
            currentSection = { heading: "Features", items: [] };
            sections.push(currentSection);
        }

        if (element.matches(".sub-heading")) {
            pendingLabel = element.textContent.trim();
        } else if (element.matches(".heading-details")) {
            currentSection.items.push({
                label: pendingLabel,
                value: element.textContent.trim()
            });
            pendingLabel = "";
        } else if (element.matches("li")) {
            currentSection.items.push({
                label: "",
                value: element.textContent.trim()
            });
        } else if (element.textContent.trim()) {
            currentSection.items.push({
                label: pendingLabel,
                value: element.textContent.trim()
            });
            pendingLabel = "";
        }
    });

    return sections.filter(section => section.items.length > 0);
}

function addFavoriteButton(product) {
    const image = product.querySelector(".product-image");
    if (!image || image.querySelector(".favorite-button")) {
        return;
    }

    let isFavorite = false;
    try {
        const productInfo = window.VCartWishlist.getProduct(product);
        isFavorite = window.VCartWishlist.getAll().some(item => item.id === productInfo.id);
    } catch (error) {
        console.error("Could not load the wishlist.", error);
        alert("Could not load your wishlist. Check browser storage and refresh the page.");
    }

    const button = document.createElement("button");
    button.className = "favorite-button";
    button.type = "button";
    button.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
    button.setAttribute("aria-pressed", String(isFavorite));
    button.innerHTML = `<i class="fa-${isFavorite ? "solid" : "regular"} fa-heart" aria-hidden="true"></i>`;
    image.append(button);
}

function addFavoriteButtons(root) {
    if (root.matches(".product")) {
        addFavoriteButton(root);
    }

    root.querySelectorAll(".product").forEach(addFavoriteButton);
}

addFavoriteButtons(productsContainer);

const productObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node instanceof Element) {
                addFavoriteButtons(node);
            }
        });
    });
});

productObserver.observe(productsContainer, { childList: true, subtree: true });

productsContainer.addEventListener("click", event => {
    const button = event.target.closest(".favorite-button");
    if (!button) {
        return;
    }

    const product = button.closest(".product");
    if (!product) {
        return;
    }

    if (!window.VCartAccountSession.requireCustomer()) {
        return;
    }

    try {
        window.VCartWishlist.toggle(window.VCartWishlist.getProduct(product));
    } catch (error) {
        console.error("Could not update the wishlist.", error);
        alert("Could not update your wishlist. Check browser storage and try again.");
    }
});

productsContainer.addEventListener("click", event => {
    if (event.target.closest(".favorite-button")) {
        return;
    }

    const product = event.target.closest(".product");
    if (!product) {
        return;
    }

    const image = product.querySelector(".product-image img");
    const oldPrice = product.querySelector(".old-price");
    const discount = product.querySelector(".discount");
    const price = product.querySelector(".new-price");
    const name = product.querySelector(".product-name");
    const description = product.querySelector(".product-description");

    if (!image || !oldPrice || !discount || !price || !name || !description) {
        console.error("Could not open product details: product information is incomplete.");
        return;
    }

    const detailsUrl = new URL("product-details.html", window.location.href);
    detailsUrl.search = new URLSearchParams({
        image: image.getAttribute("src"),
        oldPrice: oldPrice.textContent.trim(),
        discount: discount.textContent.trim(),
        price: price.textContent.trim(),
        name: name.textContent.trim(),
        category: product.dataset.category,
        description: JSON.stringify(getProductDescription(description)),
        specs: product.dataset.specs || "[]"
    }).toString();
    window.location.href = detailsUrl.toString();
});

function syncFavoriteButtons() {
    try {
        const savedProductIds = new Set(window.VCartWishlist.getAll().map(item => item.id));
        productsContainer.querySelectorAll(".product").forEach(product => {
            const button = product.querySelector(".favorite-button");
            if (!button) {
                return;
            }

            const isFavorite = savedProductIds.has(window.VCartWishlist.getProduct(product).id);
            button.setAttribute("aria-pressed", String(isFavorite));
            button.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
            button.innerHTML = `<i class="fa-${isFavorite ? "solid" : "regular"} fa-heart" aria-hidden="true"></i>`;
        });
    } catch (error) {
        console.error("Could not sync wishlist hearts.", error);
        alert("Could not sync wishlist hearts. Check browser storage and refresh the page.");
    }
}

window.addEventListener("vcart:wishlistchange", syncFavoriteButtons);
window.addEventListener("storage", event => {
    if (event.key === "vcartWishlist") {
        syncFavoriteButtons();
    }
});

navlinks.forEach(navlink => {
    navlink.addEventListener("click", () => {
        const selectedCategory = navlink.dataset.category;
        let visibleProductCount = 0;

        window.scrollTo({ top: 0, behavior: "smooth" });
        navlinks.forEach(item => item.classList.toggle("active", item === navlink));

        productsContainer.querySelectorAll(".product").forEach(product => {
            const isVisible = selectedCategory === "all"
                || product.dataset.category === selectedCategory;

            product.hidden = !isVisible;
            if (isVisible) {
                visibleProductCount += 1;
            }
        });

        noProductsMessage.hidden = visibleProductCount > 0;
    });
});