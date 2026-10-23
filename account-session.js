(function () {
    const storageKey = "vcartAccountSession";
    const validRoles = new Set(["customer", "user", "seller", "admin"]);

    function set(account) {
        if (!account || !validRoles.has(account.role)) {
            throw new Error("Account session is missing a valid role.");
        }

        window.sessionStorage.setItem(storageKey, JSON.stringify({ role: account.role }));
    }

    function get() {
        const savedSession = window.sessionStorage.getItem(storageKey);
        if (!savedSession) {
            return null;
        }

        const account = JSON.parse(savedSession);
        if (!account || !validRoles.has(account.role)) {
            throw new Error("Saved account session is invalid.");
        }

        return account;
    }

    function clear() {
        [
            "vcartCart",
            "vcartWishlist",
            "vcartCheckoutItems",
            "vcartOrders"
        ].forEach((key) => window.sessionStorage.removeItem(key));
        window.sessionStorage.removeItem(storageKey);
    }

    function requireCustomer() {
        let account;
        try {
            account = get();
        } catch (error) {
            console.error("Could not verify the customer session.", error);
            alert("Could not check your login session. Please try again.");
            return false;
        }

        if (account && ["customer", "user"].includes(account.role)) {
            return true;
        }

        const loginUrl = new URL("userlogin.html", window.location.href);
        loginUrl.searchParams.set("returnTo", window.location.href);
        alert("Please log in with a customer account to continue.");
        window.location.href = loginUrl.toString();
        return false;
    }

    window.VCartAccountSession = { set, get, clear, requireCustomer };

    const accountPages = {
        customer: "user.html",
        user: "user.html",
        seller: "seller.html",
        admin: "sa.html"
    };

    document.querySelectorAll("[data-account-link]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            try {
                const account = get();
                window.location.href = account
                    ? accountPages[account.role]
                    : "userlogin.html";
            } catch (error) {
                console.error("Could not read the account session.", error);
                alert("Could not check your login session. Please try again.");
            }
        });
    });

    document.querySelectorAll("[data-account-logout]").forEach((control) => {
        control.addEventListener("click", (event) => {
            event.preventDefault();
            try {
                clear();
                window.location.href = "index.html";
            } catch (error) {
                console.error("Could not end the account session.", error);
                alert("Could not log out. Please check browser storage and try again.");
            }
        });
    });
})();
