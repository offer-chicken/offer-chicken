document.addEventListener("DOMContentLoaded", async function () {

    // =========================================================
    // MEAT SHOP - MAIN SCRIPT
    // =========================================================

    // =========================================================
    // CART DATA
    // =========================================================

    let cart =
        JSON.parse(localStorage.getItem("meatShopCart")) || [];


    // =========================================================
    // BACKEND API
    // =========================================================

    const API_BASE = (() => {

        const configuredBase =
            window.MEATSHOP_API_URL || "";

        if (configuredBase) {
            return configuredBase.replace(/\/$/, "");
        }

        if (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        ) {
            return "http://localhost:5000";
        }

        return "";

    })();

    const PRODUCTS_API_URL =
        API_BASE
            ? `${API_BASE}/api/products`
            : "/api/products";

    let productsFromDatabase = [];


    // =========================================================
    // PAGE ELEMENTS
    // =========================================================

    const cartCount =
        document.getElementById("cart-count");

    const cartButton =
        document.querySelector(".cart-button");

    const searchInput =
        document.getElementById("search-input");

    const productCards =
        document.querySelectorAll(".product-card");


    // =========================================================
    // NORMALIZE TEXT
    // =========================================================

    function normalizeText(value) {

        return String(value || "")
            .normalize("NFKC")
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    }


    // =========================================================
    // GET PRODUCT NAME FROM HTML CARD
    // =========================================================

    function getCardProductName(card) {

        let productName =
            card.getAttribute("data-product-key") ||
            card.getAttribute("data-product") ||
            "";

        if (!productName) {

            const title =
                card.querySelector(".dynamic-product-name") ||
                card.querySelector("h3") ||
                card.querySelector("h2");

            if (title) {
                productName = title.textContent;
            }

        }

        return normalizeText(productName);

    }


    // =========================================================
    // FIND DATABASE PRODUCT
    // =========================================================

    function findDatabaseProduct(card) {

        const htmlName =
            getCardProductName(card);

        if (!htmlName) {
            return null;
        }


        // -----------------------------------------------------
        // 1. EXACT MATCH
        // -----------------------------------------------------

        let product =
            productsFromDatabase.find(function (item) {

                return (
                    normalizeText(item.name) ===
                    htmlName
                );

            });


        if (product) {
            return product;
        }


        // -----------------------------------------------------
        // 2. REMOVE ALL NON-ALPHANUMERIC CHARACTERS
        // -----------------------------------------------------

        const compactHtmlName =
            htmlName.replace(/[^a-z0-9]/g, "");


        product =
            productsFromDatabase.find(function (item) {

                const databaseName =
                    normalizeText(item.name)
                        .replace(/[^a-z0-9]/g, "");

                return (
                    databaseName ===
                    compactHtmlName
                );

            });


        if (product) {
            return product;
        }


        // -----------------------------------------------------
        // 3. CONTAINS MATCH
        // -----------------------------------------------------

        product =
            productsFromDatabase.find(function (item) {

                const databaseName =
                    normalizeText(item.name);

                return (
                    databaseName.includes(htmlName) ||
                    htmlName.includes(databaseName)
                );

            });


        if (product) {
            return product;
        }


        // -----------------------------------------------------
        // 4. SAFE ALIAS MATCH
        // -----------------------------------------------------

        const aliases = {

            "chickencurrycut":
                "chicken curry cut",

            "chickenbreastboneless":
            "chicken-breast",

            "wholechicken":
                "whole chicken",

            "chickenlegpiece":
                "chicken leg piece",

            "chickentandooricut":
                "chicken tandoori cut",

            "muttoncurr ycut":
                "mutton curry cut",

            "muttoncurrycut":
                "mutton curry cut",

            "muttonboneless":
                "mutton boneless",

            "fresheggs":
                "fresh eggs"

        };


        const aliasKey =
            htmlName.replace(/[^a-z0-9]/g, "");


        if (aliases[aliasKey]) {

            const aliasName =
                aliases[aliasKey];

            product =
                productsFromDatabase.find(function (item) {

                    return (
                        normalizeText(item.name) ===
                        normalizeText(aliasName)
                    );

                });

        }


        return product || null;

    }


    // =========================================================
    // SET BUTTONS TO LOADING
    // =========================================================

    document
        .querySelectorAll(".add-cart")
        .forEach(function (button) {

            button.disabled = true;
            button.textContent = "Loading...";
            button.style.opacity = "0.65";

        });


    // =========================================================
    // LOAD PRODUCTS FROM BACKEND
    // =========================================================

    async function loadDatabaseProducts() {

        try {

            console.log(
                "Loading products from:",
                PRODUCTS_API_URL
            );


            const response =
                await fetch(PRODUCTS_API_URL);


            if (!response.ok) {

                throw new Error(
                    "Backend returned HTTP " +
                    response.status
                );

            }


            const result =
                await response.json();


            console.log(
                "Backend response:",
                result
            );


            if (
                !result ||
                result.success !== true ||
                !Array.isArray(result.products)
            ) {

                throw new Error(
                    "Invalid products response"
                );

            }


            productsFromDatabase =
                result.products;


            console.log(
                "Products loaded:",
                productsFromDatabase
            );


            syncProductCards();


        } catch (error) {

            console.error(
                "Product loading error:",
                error
            );


            document
                .querySelectorAll(".add-cart")
                .forEach(function (button) {

                    button.disabled = true;
                    button.textContent = "Try Again";
                    button.style.opacity = "1";

                });

        }

    }


    // =========================================================
    // SYNC PRODUCTS WITH HTML
    // =========================================================

    function syncProductCards() {

        productCards.forEach(function (card) {

            const product =
                findDatabaseProduct(card);


            const addButton =
                card.querySelector(".add-cart");


            const htmlName =
                getCardProductName(card);


            // -------------------------------------------------
            // PRODUCT NOT FOUND
            // -------------------------------------------------

            if (!product) {

                console.warn(
                    "Could not match HTML product:",
                    htmlName
                );


                if (addButton) {

                    addButton.disabled = true;
                    addButton.textContent = "Product Error";
                    addButton.style.opacity = "0.75";

                }

                return;

            }


            // -------------------------------------------------
            // PRODUCT FOUND
            // -------------------------------------------------

            console.log(
                "Matched:",
                htmlName,
                "=>",
                product.name,
                "| Available:",
                product.available
            );


            card.dataset.productId =
                product.id;


            // -------------------------------------------------
            // NAME
            // -------------------------------------------------

            const nameElement =
                card.querySelector(
                    ".dynamic-product-name"
                );


            if (nameElement) {

                nameElement.textContent =
                    product.name;

            }


            // -------------------------------------------------
            // PRICE
            // -------------------------------------------------

            const priceElement =
                card.querySelector(
                    ".dynamic-product-price"
                ) ||
                card.querySelector(".price");


            if (priceElement) {

                const category =
                    normalizeText(product.category);


                const suffix =
                    category === "eggs"
                        ? "/ pack"
                        : "/ kg";


                priceElement.innerHTML =
                    "₹" +
                    Number(product.price || 0).toFixed(0) +
                    " <span>" +
                    suffix +
                    "</span>";

            }


            // -------------------------------------------------
            // DESCRIPTION
            // -------------------------------------------------

            const descriptionElement =
                card.querySelector(
                    ".dynamic-product-description"
                );


            if (
                descriptionElement &&
                product.description
            ) {

                descriptionElement.textContent =
                    product.description;

            }


            // -------------------------------------------------
            // IMAGE
            // -------------------------------------------------

            const imageElement =
                card.querySelector(
                    ".dynamic-product-image"
                ) ||
                card.querySelector(
                    ".product-image img"
                );


            if (
                imageElement &&
                product.image
            ) {

                imageElement.src =
                    product.image;

                imageElement.alt =
                    product.name;

            }


            // -------------------------------------------------
            // AVAILABILITY
            // -------------------------------------------------

            if (addButton) {

                if (product.available === false) {

                    addButton.disabled = true;
                    addButton.textContent = "Unavailable";
                    addButton.style.opacity = "0.65";

                } else {

                    addButton.disabled = false;
                    addButton.textContent = "🛒 Add to Cart";
                    addButton.style.opacity = "1";

                }

            }

        });

    }


    // =========================================================
    // CART OVERLAY
    // =========================================================

    const cartOverlay =
        document.createElement("div");


    cartOverlay.className =
        "cart-overlay";


    cartOverlay.innerHTML = `

        <div class="cart-panel">

            <div class="cart-header">

                <div>

                    <h2>🛒 Your Cart</h2>

                    <p id="cart-items-title">
                        0 items
                    </p>

                </div>

                <button
                    id="close-cart"
                    type="button"
                >
                    ×
                </button>

            </div>


            <div
                id="cart-items"
                class="cart-items"
            ></div>


            <div class="cart-footer">

                <div class="cart-summary-row">
                    <span>Subtotal</span>
                    <strong id="cart-subtotal">
                        ₹0
                    </strong>
                </div>


                <div class="cart-summary-row">
                    <span>Delivery</span>
                    <strong id="cart-delivery">
                        FREE
                    </strong>
                </div>


                <div class="cart-summary-row total-row">
                    <span>Total</span>
                    <strong id="cart-total">
                        ₹0
                    </strong>
                </div>


                <button
                    id="checkout-button"
                    type="button"
                >
                    Proceed to Checkout
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(cartOverlay);


    const cartItemsContainer =
        document.getElementById("cart-items");


    const closeCartButton =
        document.getElementById("close-cart");


    const checkoutButton =
        document.getElementById("checkout-button");


    // =========================================================
    // CART CSS
    // =========================================================

    const cartStyle =
        document.createElement("style");


    cartStyle.textContent = `

        .cart-overlay {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.45);
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: 0.3s;
        }

        .cart-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .cart-panel {
            position: absolute;
            top: 0;
            right: 0;
            width: 430px;
            max-width: 95%;
            height: 100%;
            background: white;
            display: flex;
            flex-direction: column;
            box-shadow: -8px 0 30px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: 0.35s;
        }

        .cart-overlay.active .cart-panel {
            transform: translateX(0);
        }

        .cart-header {
            background: #c91418;
            color: white;
            padding: 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .cart-header h2 {
            margin: 0;
            font-size: 22px;
        }

        .cart-header p {
            margin: 5px 0 0;
            font-size: 13px;
        }

        #close-cart {
            width: 38px;
            height: 38px;
            border: none;
            border-radius: 50%;
            background: white;
            color: #c91418;
            font-size: 27px;
            cursor: pointer;
        }

        .cart-items {
            flex: 1;
            overflow-y: auto;
            padding: 18px;
        }

        .empty-cart {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #666;
        }

        .empty-cart-icon {
            font-size: 55px;
            margin-bottom: 15px;
        }

        .empty-cart h3 {
            color: #222;
            margin: 0 0 8px;
        }

        .cart-item {
            display: flex;
            gap: 12px;
            padding: 13px 0;
            border-bottom: 1px solid #eee;
        }

        .cart-item-image {
            width: 75px;
            height: 75px;
            border-radius: 9px;
            object-fit: cover;
            background: #f5f5f5;
        }

        .cart-item-details {
            flex: 1;
        }

        .cart-item-details h3 {
            font-size: 14px;
            margin: 0 0 5px;
        }

        .cart-item-weight {
            font-size: 12px;
            color: #666;
            margin-bottom: 7px;
        }

        .cart-item-price {
            color: #c91418;
            font-weight: 800;
            font-size: 14px;
        }

        .cart-item-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 9px;
        }

        .cart-quantity {
            display: flex;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }

        .cart-quantity button {
            width: 27px;
            height: 27px;
            border: none;
            background: white;
            cursor: pointer;
        }

        .cart-quantity span {
            min-width: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-left: 1px solid #eee;
            border-right: 1px solid #eee;
        }

        .remove-item {
            border: none;
            background: transparent;
            color: #c91418;
            cursor: pointer;
        }

        .cart-footer {
            padding: 20px;
            border-top: 1px solid #eee;
            background: white;
        }

        .cart-summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .cart-summary-row span {
            color: #555;
        }

        .total-row {
            border-top: 1px solid #eee;
            padding-top: 14px;
            margin-top: 10px;
            font-size: 18px;
        }

        .total-row strong {
            color: #c91418;
        }

        #checkout-button {
            width: 100%;
            height: 48px;
            margin-top: 10px;
            border: none;
            border-radius: 7px;
            background: #c91418;
            color: white;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
        }

        @media (max-width: 500px) {
            .cart-panel {
                width: 100%;
                max-width: 100%;
            }
        }

    `;


    document.head.appendChild(cartStyle);


    // =========================================================
    // SAVE CART
    // =========================================================

    function saveCart() {

        localStorage.setItem(
            "meatShopCart",
            JSON.stringify(cart)
        );

    }


    // =========================================================
    // UPDATE CART COUNT
    // =========================================================

    function updateCartCount() {

        let totalItems = 0;

        cart.forEach(function (item) {

            totalItems +=
                Number(item.quantity) || 0;

        });


        if (cartCount) {

            cartCount.textContent =
                totalItems;

        }

    }


    // =========================================================
    // OPEN CART
    // =========================================================

    function openCart() {

        renderCart();

        cartOverlay.classList.add("active");

        document.body.style.overflow =
            "hidden";

    }


    // =========================================================
    // CLOSE CART
    // =========================================================

    function closeCart() {

        cartOverlay.classList.remove("active");

        document.body.style.overflow = "";

    }


    if (cartButton) {

        cartButton.addEventListener(
            "click",
            openCart
        );

    }


    if (closeCartButton) {

        closeCartButton.addEventListener(
            "click",
            closeCart
        );

    }


    cartOverlay.addEventListener(
        "click",
        function (event) {

            if (event.target === cartOverlay) {

                closeCart();

            }

        }
    );


    // =========================================================
    // RENDER CART
    // =========================================================

    function renderCart() {

        if (!cartItemsContainer) {
            return;
        }


        cartItemsContainer.innerHTML = "";


        let subtotal = 0;
        let totalQuantity = 0;


        if (cart.length === 0) {

            cartItemsContainer.innerHTML = `

                <div class="empty-cart">

                    <div class="empty-cart-icon">
                        🛒
                    </div>

                    <h3>Your cart is empty</h3>

                    <p>
                        Add some fresh meat
                        to get started.
                    </p>

                </div>

            `;

        }


        cart.forEach(function (item, index) {

            const itemPrice =
                Number(item.price) || 0;

            const itemQuantity =
                Number(item.quantity) || 1;

            const itemTotal =
                itemPrice * itemQuantity;


            subtotal += itemTotal;
            totalQuantity += itemQuantity;


            const itemElement =
                document.createElement("div");


            itemElement.className =
                "cart-item";


            itemElement.innerHTML = `

                <img
                    class="cart-item-image"
                    src="${item.image || ""}"
                    alt="${item.name || ""}"
                >

                <div class="cart-item-details">

                    <h3>
                        ${item.name}
                    </h3>

                    <div class="cart-item-weight">
                        ${item.weight}
                    </div>

                    <div class="cart-item-price">
                        ₹${itemTotal}
                    </div>

                    <div class="cart-item-actions">

                        <div class="cart-quantity">

                            <button
                                class="cart-minus"
                                data-index="${index}"
                                type="button"
                            >
                                −
                            </button>

                            <span>
                                ${itemQuantity}
                            </span>

                            <button
                                class="cart-plus"
                                data-index="${index}"
                                type="button"
                            >
                                +
                            </button>

                        </div>

                        <button
                            class="remove-item"
                            data-index="${index}"
                            type="button"
                        >
                            Remove
                        </button>

                    </div>

                </div>

            `;


            cartItemsContainer.appendChild(
                itemElement
            );

        });


        let delivery = 0;


        if (
            subtotal > 0 &&
            subtotal < 500
        ) {

            delivery = 40;

        }


        const total =
            subtotal + delivery;


        const itemsTitle =
            document.getElementById(
                "cart-items-title"
            );


        if (itemsTitle) {

            itemsTitle.textContent =
                totalQuantity +
                (
                    totalQuantity === 1
                        ? " item"
                        : " items"
                );

        }


        const subtotalElement =
            document.getElementById(
                "cart-subtotal"
            );


        if (subtotalElement) {

            subtotalElement.textContent =
                "₹" + subtotal;

        }


        const deliveryElement =
            document.getElementById(
                "cart-delivery"
            );


        if (deliveryElement) {

            deliveryElement.textContent =
                delivery === 0
                    ? "FREE"
                    : "₹" + delivery;

        }


        const totalElement =
            document.getElementById(
                "cart-total"
            );


        if (totalElement) {

            totalElement.textContent =
                "₹" + total;

        }


        document
            .querySelectorAll(".cart-plus")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                button.dataset.index
                            );

                        if (cart[index]) {

                            cart[index].quantity++;

                        }

                        saveCart();
                        updateCartCount();
                        renderCart();

                    }
                );

            });


        document
            .querySelectorAll(".cart-minus")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                button.dataset.index
                            );


                        if (!cart[index]) {
                            return;
                        }


                        if (
                            cart[index].quantity > 1
                        ) {

                            cart[index].quantity--;

                        } else {

                            cart.splice(index, 1);

                        }


                        saveCart();
                        updateCartCount();
                        renderCart();

                    }
                );

            });


        document
            .querySelectorAll(".remove-item")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                button.dataset.index
                            );


                        cart.splice(index, 1);

                        saveCart();
                        updateCartCount();
                        renderCart();

                    }
                );

            });

    }


    // =========================================================
    // PRODUCT QUANTITY BUTTONS
    // =========================================================

    productCards.forEach(function (card) {

        const minus =
            card.querySelector(".minus");

        const plus =
            card.querySelector(".plus");

        const number =
            card.querySelector(".quantity span");


        if (plus && number) {

            plus.addEventListener(
                "click",
                function () {

                    let value =
                        Number(number.textContent) || 1;

                    value++;

                    number.textContent =
                        value;

                }
            );

        }


        if (minus && number) {

            minus.addEventListener(
                "click",
                function () {

                    let value =
                        Number(number.textContent) || 1;


                    if (value > 1) {

                        value--;

                        number.textContent =
                            value;

                    }

                }
            );

        }

    });


    // =========================================================
    // WEIGHT BUTTONS
    // =========================================================

    productCards.forEach(function (card) {

        const buttons =
            card.querySelectorAll(
                ".weight-buttons button"
            );


        buttons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    buttons.forEach(function (item) {

                        item.classList.remove(
                            "selected"
                        );

                    });


                    button.classList.add(
                        "selected"
                    );

                }
            );

        });

    });


    // =========================================================
    // ADD TO CART
    // =========================================================

    productCards.forEach(function (card) {

        const addButton =
            card.querySelector(".add-cart");


        if (!addButton) {
            return;
        }


        addButton.addEventListener(
            "click",
            function () {

                const databaseProduct =
                    findDatabaseProduct(card);


                if (!databaseProduct) {

                    alert(
                        "Product information is still loading. Please try again."
                    );

                    return;

                }


                if (
                    databaseProduct.available === false
                ) {

                    alert(
                        "This product is currently unavailable."
                    );

                    return;

                }


                const name =
                    databaseProduct.name;


                const price =
                    Number(databaseProduct.price) || 0;


                const quantityElement =
                    card.querySelector(
                        ".quantity span"
                    );


                const quantity =
                    quantityElement
                        ? Number(
                            quantityElement.textContent
                        ) || 1
                        : 1;


                const selectedWeightButton =
                    card.querySelector(
                        ".weight-buttons .selected"
                    );


                let selectedWeight =
                    "1 KG";


                if (selectedWeightButton) {

                    selectedWeight =
                        selectedWeightButton
                            .textContent
                            .trim();

                }


                const imageElement =
                    card.querySelector(
                        ".dynamic-product-image"
                    ) ||
                    card.querySelector(
                        ".product-image img"
                    );


                const image =
                    imageElement
                        ? imageElement.src
                        : databaseProduct.image;


                const existing =
                    cart.find(function (item) {

                        return (
                            item.name === name &&
                            item.weight === selectedWeight
                        );

                    });


                if (existing) {

                    existing.quantity +=
                        quantity;

                    existing.price =
                        price;

                    existing.image =
                        image;

                } else {

                    cart.push({

                        id:
                            databaseProduct.id,

                        name:
                            name,

                        price:
                            price,

                        quantity:
                            quantity,

                        weight:
                            selectedWeight,

                        image:
                            image

                    });

                }


                saveCart();
                updateCartCount();


                if (quantityElement) {

                    quantityElement.textContent =
                        "1";

                }


                const originalText =
                    addButton.innerHTML;


                addButton.innerHTML =
                    "✓ Added";


                addButton.style.background =
                    "#198754";


                setTimeout(function () {

                    addButton.innerHTML =
                        originalText;

                    addButton.style.background =
                        "";

                }, 1000);

            }
        );

    });


    // =========================================================
    // SEARCH
    // =========================================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                const searchText =
                    normalizeText(
                        searchInput.value
                    );


                productCards.forEach(function (card) {

                    const productName =
                        normalizeText(
                            getCardProductName(card)
                        );


                    if (
                        productName.includes(searchText)
                    ) {

                        card.style.display = "";

                    } else {

                        card.style.display = "none";

                    }

                });

            }
        );

    }


    // =========================================================
    // CHECKOUT
    // =========================================================

    if (checkoutButton) {

        checkoutButton.addEventListener(
            "click",
            function () {

                if (cart.length === 0) {

                    alert(
                        "Your cart is empty."
                    );

                    return;

                }


                window.location.href =
                    "checkout.html";

            }
        );

    }


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    await loadDatabaseProducts();

    updateCartCount();

});