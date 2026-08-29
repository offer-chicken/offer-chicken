document.addEventListener("DOMContentLoaded", function () {

    /* =========================================================
       API URLS
    ========================================================= */

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

    const API_URL =
        API_BASE
            ? `${API_BASE}/api/orders`
            : "/api/orders";

    const PRODUCTS_API_URL =
        API_BASE
            ? `${API_BASE}/api/products`
            : "/api/products";


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const ordersTableBody =
        document.getElementById("orders-table-body");

    const refreshOrdersButton =
        document.getElementById("refresh-orders");

    const refreshProductsButton =
        document.getElementById("refresh-products");

    const productsList =
        document.getElementById("products-list");

    const totalOrders =
        document.getElementById("total-orders");

    const totalRevenue =
        document.getElementById("total-revenue");

    const pendingOrders =
        document.getElementById("pending-orders");

    const totalCustomers =
        document.getElementById("total-customers");

    const customerList =
        document.getElementById("customer-list");


    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       FORMAT ORDER DATE / TIME
    ========================================================= */

    function formatOrderDateTime(order) {

        const dateValue =
            order.created_at ||
            order.createdAt ||
            order.order_date ||
            order.order_time;

        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (isNaN(date.getTime())) {
            return escapeHTML(dateValue);
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }


    /* =========================================================
       MAKE SURE TABLE HEADERS ARE CORRECT
    ========================================================= */

    function setupOrderTableHeaders() {

        const table =
            ordersTableBody
                ? ordersTableBody.closest("table")
                : null;

        if (!table) {
            return;
        }

        const thead =
            table.querySelector("thead");

        if (!thead) {
            return;
        }

        const headerRow =
            thead.querySelector("tr");

        if (!headerRow) {
            return;
        }

        headerRow.innerHTML = `

            <th>
                Order ID
            </th>

            <th>
                Date & Time
            </th>

            <th>
                Customer
            </th>

            <th>
                Phone
            </th>

            <th>
                Ordered Items
            </th>

            <th>
                Total
            </th>

            <th>
                Payment
            </th>

            <th>
                Status
            </th>

            <th>
                Action
            </th>

        `;
    }


    /* =========================================================
       LOAD ORDERS
    ========================================================= */

    async function loadOrders() {

        if (ordersTableBody) {

            ordersTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="loading-cell"
                    >
                        Loading orders...
                    </td>

                </tr>

            `;
        }

        try {

            console.log(
                "Fetching orders:",
                API_URL
            );

            const response =
                await fetch(API_URL);

            if (!response.ok) {

                throw new Error(
                    "Orders server returned " +
                    response.status
                );
            }

            const result =
                await response.json();

            console.log(
                "Orders response:",
                result
            );

            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Unable to load orders"
                );
            }

            const orders =
                Array.isArray(result.orders)
                    ? result.orders
                    : [];


            /* Newest orders first */

            orders.sort(function (a, b) {

                const dateA =
                    new Date(
                        a.created_at || 0
                    ).getTime();

                const dateB =
                    new Date(
                        b.created_at || 0
                    ).getTime();

                return dateB - dateA;

            });


            setupOrderTableHeaders();

            renderOrders(orders);

            updateDashboardStats(orders);

            renderCustomers(orders);

        } catch (error) {

            console.error(
                "LOAD ORDERS ERROR:",
                error
            );

            if (ordersTableBody) {

                ordersTableBody.innerHTML = `

                    <tr>

                        <td
                            colspan="9"
                            class="empty-cell"
                        >

                            Unable to load orders.

                            <br>

                            <small>
                                ${escapeHTML(
                                    error.message ||
                                    "Check that the backend server is running."
                                )}
                            </small>

                        </td>

                    </tr>

                `;
            }

        }
    }


    /* =========================================================
       RENDER ORDER ITEMS
    ========================================================= */

    function renderOrderItems(order) {

        if (
            !Array.isArray(order.items) ||
            order.items.length === 0
        ) {

            return `
                <span style="
                    color:#888;
                ">
                    No items
                </span>
            `;

        }


        return order.items.map(function (item) {

            const name =
                item.name ||
                item.product_name ||
                item.title ||
                "Unknown Product";


            const quantity =
                Number(
                    item.quantity ||
                    item.qty ||
                    1
                );


            const weight =
                item.weight
                    ? ` (${escapeHTML(item.weight)})`
                    : "";


            return `

                <div style="
                    margin-bottom:7px;
                    line-height:1.45;
                ">

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    ${weight}

                    <span style="
                        color:#d71920;
                        font-weight:600;
                    ">
                        × ${quantity}
                    </span>

                </div>

            `;

        }).join("");

    }


    /* =========================================================
       RENDER ORDERS
    ========================================================= */

    function renderOrders(orders) {

        if (!ordersTableBody) {
            return;
        }

        ordersTableBody.innerHTML = "";


        if (
            !orders ||
            orders.length === 0
        ) {

            ordersTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty-cell"
                    >
                        No orders found.
                    </td>

                </tr>

            `;

            return;
        }


        orders.forEach(function (order) {

            const row =
                document.createElement("tr");


            const status =
                order.status ||
                "Order Placed";


            const payment =
                order.payment_method === "cod"
                    ? "Cash on Delivery"
                    : "Online Payment";


            const dateTime =
                formatOrderDateTime(order);


            const itemsHTML =
                renderOrderItems(order);


            row.innerHTML = `

                <!-- ORDER ID -->

                <td>

                    <strong>
                        ${escapeHTML(
                            order.order_id ||
                            "—"
                        )}
                    </strong>

                </td>


                <!-- DATE & TIME -->

                <td>

                    <div style="
                        white-space:nowrap;
                        font-size:13px;
                        line-height:1.4;
                    ">

                        <strong>
                            ${dateTime}
                        </strong>

                    </div>

                </td>


                <!-- CUSTOMER -->

                <td>

                    ${escapeHTML(
                        order.customer_name ||
                        "—"
                    )}

                </td>


                <!-- PHONE -->

                <td>

                    ${escapeHTML(
                        order.customer_phone ||
                        "—"
                    )}

                </td>


                <!-- ORDERED ITEMS -->

                <td>

                    <div style="
                        min-width:190px;
                    ">

                        ${itemsHTML}

                    </div>

                </td>


                <!-- TOTAL -->

                <td class="order-total">

                    <strong>
                        ₹${Number(
                            order.total || 0
                        ).toFixed(0)}
                    </strong>

                </td>


                <!-- PAYMENT -->

                <td>

                    ${escapeHTML(payment)}

                </td>


                <!-- STATUS -->

                <td>

                    <span class="order-status">

                        ${escapeHTML(status)}

                    </span>

                </td>


                <!-- ACTION -->

                <td>

                    <select
                        class="status-select"
                        data-order-id="${escapeHTML(
                            order.id
                        )}"
                    >

                        <option
                            value="Order Placed"
                            ${status === "Order Placed"
                                ? "selected"
                                : ""}
                        >
                            Order Placed
                        </option>


                        <option
                            value="Confirmed"
                            ${status === "Confirmed"
                                ? "selected"
                                : ""}
                        >
                            Confirmed
                        </option>


                        <option
                            value="Preparing"
                            ${status === "Preparing"
                                ? "selected"
                                : ""}
                        >
                            Preparing
                        </option>


                        <option
                            value="Out for Delivery"
                            ${status === "Out for Delivery"
                                ? "selected"
                                : ""}
                        >
                            Out for Delivery
                        </option>


                        <option
                            value="Delivered"
                            ${status === "Delivered"
                                ? "selected"
                                : ""}
                        >
                            Delivered
                        </option>

                    </select>

                </td>

            `;


            ordersTableBody.appendChild(row);

        });


        attachStatusEvents();

    }


    /* =========================================================
       DASHBOARD STATS
    ========================================================= */

    function updateDashboardStats(orders) {

        let revenue = 0;

        let pending = 0;

        const customers =
            new Set();


        orders.forEach(function (order) {

            revenue +=
                Number(
                    order.total || 0
                );


            if (
                order.status !== "Delivered"
            ) {

                pending++;

            }


            if (order.customer_phone) {

                customers.add(
                    String(
                        order.customer_phone
                    ).trim()
                );

            }

        });


        if (totalOrders) {

            totalOrders.textContent =
                orders.length;

        }


        if (totalRevenue) {

            totalRevenue.textContent =
                "₹" +
                revenue.toFixed(0);

        }


        if (pendingOrders) {

            pendingOrders.textContent =
                pending;

        }


        if (totalCustomers) {

            totalCustomers.textContent =
                customers.size;

        }

    }


    /* =========================================================
       CUSTOMERS
    ========================================================= */

    function renderCustomers(orders) {

        if (!customerList) {
            return;
        }

        customerList.innerHTML = "";


        if (
            !orders ||
            orders.length === 0
        ) {

            customerList.innerHTML = `

                <div class="empty-message">
                    No customer information available.
                </div>

            `;

            return;
        }


        const customerMap =
            new Map();


        orders.forEach(function (order) {

            const phone =
                order.customer_phone
                    ? String(
                        order.customer_phone
                    ).trim()
                    : "";


            if (!phone) {
                return;
            }


            customerMap.set(
                phone,
                order
            );

        });


        if (customerMap.size === 0) {

            customerList.innerHTML = `

                <div class="empty-message">
                    No customer information available.
                </div>

            `;

            return;
        }


        customerMap.forEach(
            function (order) {

                const card =
                    document.createElement("div");


                card.className =
                    "customer-card";


                const name =
                    order.customer_name ||
                    "Unknown Customer";


                const phone =
                    order.customer_phone ||
                    "—";


                const address =
                    order.customer_address ||
                    "—";


                const city =
                    order.customer_city ||
                    "";


                const pincode =
                    order.customer_pincode ||
                    "";


                let location =
                    address;


                if (city) {

                    location +=
                        ", " + city;

                }


                if (pincode) {

                    location +=
                        " - " + pincode;

                }


                card.innerHTML = `

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    <span>
                        📞 ${escapeHTML(phone)}
                    </span>

                    <span>
                        📍 ${escapeHTML(location)}
                    </span>

                `;


                customerList.appendChild(card);

            }
        );

    }


    /* =========================================================
       ORDER STATUS UPDATE
    ========================================================= */

    function attachStatusEvents() {

        const selectors =
            document.querySelectorAll(
                ".status-select"
            );


        selectors.forEach(
            function (select) {

                select.addEventListener(
                    "change",
                    async function () {

                        const orderId =
                            select.dataset.orderId;


                        const newStatus =
                            select.value;


                        select.disabled =
                            true;


                        try {

                            const response =
                                await fetch(
                                    `${API_URL}/${orderId}/status`,
                                    {
                                        method: "PUT",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                status:
                                                    newStatus
                                            })
                                    }
                                );


                            const result =
                                await response.json();


                            if (
                                !response.ok ||
                                !result.success
                            ) {

                                throw new Error(
                                    result.message ||
                                    "Unable to update order status"
                                );

                            }


                            await loadOrders();


                        } catch (error) {

                            console.error(
                                "STATUS UPDATE ERROR:",
                                error
                            );


                            alert(
                                "Unable to update order status."
                            );


                            await loadOrders();

                        }

                    }
                );

            }
        );

    }


    /* =========================================================
       LOAD PRODUCTS
    ========================================================= */

    async function loadProducts() {

        if (!productsList) {
            return;
        }


        productsList.innerHTML = `

            <div class="loading-cell">
                Loading products...
            </div>

        `;


        try {

            console.log(
                "Fetching products:",
                PRODUCTS_API_URL
            );


            const response =
                await fetch(
                    PRODUCTS_API_URL
                );


            if (!response.ok) {

                throw new Error(
                    "Products server returned " +
                    response.status
                );

            }


            const result =
                await response.json();


            console.log(
                "Products response:",
                result
            );


            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Unable to load products"
                );

            }


            const products =
                Array.isArray(result.products)
                    ? result.products
                    : [];


            renderProducts(products);


        } catch (error) {

            console.error(
                "LOAD PRODUCTS ERROR:",
                error
            );


            productsList.innerHTML = `

                <div class="empty-message">

                    Unable to load products.

                    <br>

                    <small>
                        Check that the backend server is running.
                    </small>

                </div>

            `;

        }

    }


    /* =========================================================
       RENDER PRODUCTS
    ========================================================= */

    function renderProducts(products) {

        if (!productsList) {
            return;
        }


        productsList.innerHTML = "";


        if (
            !products ||
            products.length === 0
        ) {

            productsList.innerHTML = `

                <div class="empty-message">
                    No products found.
                </div>

            `;

            return;
        }


        products.forEach(
            function (product) {

                const card =
                    document.createElement("div");


                card.className =
                    "info-card";


                let imageHTML = "";


                if (product.image) {

                    let imagePath =
                        String(
                            product.image
                        );


                    if (
                        !imagePath.startsWith(
                            "http"
                        ) &&
                        !imagePath.startsWith("/")
                    ) {

                        imagePath =
                            "../" +
                            imagePath;

                    }


                    imageHTML = `

                        <img
                            src="${escapeHTML(imagePath)}"
                            alt="${escapeHTML(
                                product.name ||
                                "Product"
                            )}"
                            style="
                                width:100%;
                                height:150px;
                                object-fit:contain;
                                border-radius:10px;
                                background:#f5f5f5;
                                margin-bottom:12px;
                            "
                            onerror="
                                this.style.display='none';
                            "
                        >

                    `;

                } else {

                    imageHTML = `

                        <div style="
                            height:150px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:55px;
                            background:#f5f5f5;
                            border-radius:10px;
                            margin-bottom:12px;
                        ">
                            🍖
                        </div>

                    `;

                }


                card.innerHTML = `

                    ${imageHTML}


                    <strong>
                        ${escapeHTML(
                            product.name ||
                            "Unnamed Product"
                        )}
                    </strong>


                    <span>
                        ${escapeHTML(
                            product.category ||
                            "—"
                        )}
                    </span>


                    <span>
                        ₹${Number(
                            product.price || 0
                        ).toFixed(0)}
                    </span>


                    <span>
                        ${
                            product.available
                                ? "✅ Available"
                                : "❌ Unavailable"
                        }
                    </span>


                    <div style="
                        display:flex;
                        gap:8px;
                        margin-top:10px;
                        flex-wrap:wrap;
                    ">

                        <button
                            type="button"
                            class="edit-product-button"
                            data-product-id="${product.id}"
                            style="
                                cursor:pointer;
                            "
                        >
                            ✏️ Edit Product
                        </button>


                        <button
                            type="button"
                            class="delete-product-button"
                            data-product-id="${product.id}"
                            style="
                                cursor:pointer;
                            "
                        >
                            🗑️
                        </button>

                    </div>

                `;


                productsList.appendChild(card);

            }
        );


        attachProductEvents(products);

    }


    /* =========================================================
       PRODUCT EVENTS
    ========================================================= */

    function attachProductEvents(products) {

        const editButtons =
            document.querySelectorAll(
                ".edit-product-button"
            );


        editButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const productId =
                            Number(
                                button.dataset.productId
                            );


                        const product =
                            products.find(
                                function (item) {

                                    return (
                                        Number(item.id) ===
                                        productId
                                    );

                                }
                            );


                        if (!product) {
                            return;
                        }


                        openProductModal(
                            product
                        );

                    }
                );

            }
        );


        const deleteButtons =
            document.querySelectorAll(
                ".delete-product-button"
            );


        deleteButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    async function () {

                        const productId =
                            Number(
                                button.dataset.productId
                            );


                        const product =
                            products.find(
                                function (item) {

                                    return (
                                        Number(item.id) ===
                                        productId
                                    );

                                }
                            );


                        if (!product) {
                            return;
                        }


                        const confirmed =
                            confirm(
                                `Delete "${product.name}"?`
                            );


                        if (!confirmed) {
                            return;
                        }


                        alert(
                            "Delete is not enabled yet. We can add it next."
                        );

                    }
                );

            }
        );

    }


    /* =========================================================
       PRODUCT MODAL
    ========================================================= */

    function createProductModal() {

        if (
            document.getElementById(
                "product-modal-overlay"
            )
        ) {

            return;

        }


        const overlay =
            document.createElement("div");


        overlay.id =
            "product-modal-overlay";


        overlay.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.55);
            display:none;
            align-items:center;
            justify-content:center;
            z-index:99999;
            padding:20px;
        `;


        overlay.innerHTML = `

            <div
                id="product-modal-box"
                style="
                    width:100%;
                    max-width:520px;
                    background:white;
                    border-radius:18px;
                    padding:25px;
                    box-shadow:0 20px 60px rgba(0,0,0,0.25);
                    max-height:90vh;
                    overflow-y:auto;
                "
            >

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:20px;
                ">

                    <div>

                        <h2
                            id="product-modal-title"
                            style="
                                margin:0;
                                font-size:24px;
                            "
                        >
                            Add Product
                        </h2>

                        <p style="
                            margin:5px 0 0;
                            color:#777;
                        ">
                            Add or update your store product
                        </p>

                    </div>


                    <button
                        type="button"
                        id="close-product-modal"
                        style="
                            border:0;
                            background:#f1f1f1;
                            width:38px;
                            height:38px;
                            border-radius:50%;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <form id="product-form">

                    <input
                        type="hidden"
                        id="product-id"
                    >


                    <label style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    ">
                        Product Name
                    </label>

                    <input
                        id="product-name"
                        type="text"
                        placeholder="Example: Chicken Wings"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:9px;
                            margin-bottom:15px;
                            box-sizing:border-box;
                        "
                    >


                    <label style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    ">
                        Category
                    </label>

                    <input
                        id="product-category"
                        type="text"
                        placeholder="Example: chicken"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:9px;
                            margin-bottom:15px;
                            box-sizing:border-box;
                        "
                    >


                    <label style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    ">
                        Price
                    </label>

                    <input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Example: 350"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:9px;
                            margin-bottom:15px;
                            box-sizing:border-box;
                        "
                    >


                    <label style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    ">
                        Image Path
                    </label>

                    <input
                        id="product-image"
                        type="text"
                        placeholder="Example: images/chicken-wings.jpg"
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:9px;
                            margin-bottom:15px;
                            box-sizing:border-box;
                        "
                    >


                    <label style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    ">
                        Description
                    </label>

                    <textarea
                        id="product-description"
                        rows="3"
                        placeholder="Product description"
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:9px;
                            margin-bottom:15px;
                            box-sizing:border-box;
                            resize:vertical;
                        "
                    ></textarea>


                    <label style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        margin-bottom:20px;
                        cursor:pointer;
                    ">

                        <input
                            id="product-available"
                            type="checkbox"
                            checked
                        >

                        <span>
                            Product is available
                        </span>

                    </label>


                    <div style="
                        display:flex;
                        gap:10px;
                        justify-content:flex-end;
                    ">

                        <button
                            type="button"
                            id="cancel-product-button"
                            style="
                                padding:11px 20px;
                                border:1px solid #ddd;
                                background:white;
                                border-radius:9px;
                                cursor:pointer;
                            "
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            id="save-product-button"
                            style="
                                padding:11px 22px;
                                border:0;
                                background:#d71920;
                                color:white;
                                border-radius:9px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Save Product
                        </button>

                    </div>

                </form>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        document
            .getElementById(
                "close-product-modal"
            )
            .addEventListener(
                "click",
                closeProductModal
            );


        document
            .getElementById(
                "cancel-product-button"
            )
            .addEventListener(
                "click",
                closeProductModal
            );


        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    overlay
                ) {

                    closeProductModal();

                }

            }
        );


        document
            .getElementById(
                "product-form"
            )
            .addEventListener(
                "submit",
                saveProduct
            );

    }


    /* =========================================================
       OPEN ADD PRODUCT MODAL
    ========================================================= */

    function openAddProductModal() {

        createProductModal();


        const form =
            document.getElementById(
                "product-form"
            );


        form.reset();


        document
            .getElementById(
                "product-id"
            )
            .value = "";


        document
            .getElementById(
                "product-available"
            )
            .checked = true;


        document
            .getElementById(
                "product-modal-title"
            )
            .textContent =
            "Add Product";


        document
            .getElementById(
                "save-product-button"
            )
            .textContent =
            "Add Product";


        document
            .getElementById(
                "product-modal-overlay"
            )
            .style.display =
            "flex";


        setTimeout(
            function () {

                document
                    .getElementById(
                        "product-name"
                    )
                    .focus();

            },
            100
        );

    }


    /* =========================================================
       OPEN EDIT PRODUCT MODAL
    ========================================================= */

    function openProductModal(product) {

        createProductModal();


        document
            .getElementById(
                "product-id"
            )
            .value =
            product.id || "";


        document
            .getElementById(
                "product-name"
            )
            .value =
            product.name || "";


        document
            .getElementById(
                "product-category"
            )
            .value =
            product.category || "";


        document
            .getElementById(
                "product-price"
            )
            .value =
            product.price || 0;


        document
            .getElementById(
                "product-image"
            )
            .value =
            product.image || "";


        document
            .getElementById(
                "product-description"
            )
            .value =
            product.description || "";


        document
            .getElementById(
                "product-available"
            )
            .checked =
            Boolean(product.available);


        document
            .getElementById(
                "product-modal-title"
            )
            .textContent =
            "Edit Product";


        document
            .getElementById(
                "save-product-button"
            )
            .textContent =
            "Save Changes";


        document
            .getElementById(
                "product-modal-overlay"
            )
            .style.display =
            "flex";

    }


    /* =========================================================
       CLOSE PRODUCT MODAL
    ========================================================= */

    function closeProductModal() {

        const modal =
            document.getElementById(
                "product-modal-overlay"
            );


        if (modal) {

            modal.style.display =
                "none";

        }

    }


    /* =========================================================
       SAVE / ADD / UPDATE PRODUCT
    ========================================================= */

    async function saveProduct(event) {

        event.preventDefault();


        const productId =
            document
                .getElementById(
                    "product-id"
                )
                .value
                .trim();


        const name =
            document
                .getElementById(
                    "product-name"
                )
                .value
                .trim();


        const category =
            document
                .getElementById(
                    "product-category"
                )
                .value
                .trim();


        const price =
            Number(
                document
                    .getElementById(
                        "product-price"
                    )
                    .value
            );


        const image =
            document
                .getElementById(
                    "product-image"
                )
                .value
                .trim();


        const description =
            document
                .getElementById(
                    "product-description"
                )
                .value
                .trim();


        const available =
            document
                .getElementById(
                    "product-available"
                )
                .checked;


        if (!name) {

            alert(
                "Please enter the product name."
            );

            return;

        }


        if (!category) {

            alert(
                "Please enter the product category."
            );

            return;

        }


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            alert(
                "Please enter a valid price."
            );

            return;

        }


        const button =
            document.getElementById(
                "save-product-button"
            );


        button.disabled =
            true;


        button.textContent =
            productId
                ? "Saving..."
                : "Adding...";


        const productData = {

            name:
                name,

            category:
                category,

            price:
                price,

            image:
                image,

            description:
                description,

            available:
                available

        };


        try {

            const url =
                productId
                    ? `${PRODUCTS_API_URL}/${productId}`
                    : PRODUCTS_API_URL;


            const method =
                productId
                    ? "PUT"
                    : "POST";


            const response =
                await fetch(
                    url,
                    {
                        method:
                            method,

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                productData
                            )
                    }
                );


            const result =
                await response.json();


            console.log(
                "Product save response:",
                result
            );


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Unable to save product"
                );

            }


            closeProductModal();


            await loadProducts();


            alert(
                productId
                    ? "Product updated successfully!"
                    : "Product added successfully!"
            );


        } catch (error) {

            console.error(
                "SAVE PRODUCT ERROR:",
                error
            );


            alert(
                error.message ||
                "Unable to save product."
            );

        } finally {

            button.disabled =
                false;

            button.textContent =
                productId
                    ? "Save Changes"
                    : "Add Product";

        }

    }


    /* =========================================================
       ADD PRODUCT BUTTON
    ========================================================= */

    function attachAddProductButton() {

        const possibleButtons = [

            document.getElementById(
                "add-product-button"
            ),

            document.getElementById(
                "add-product"
            )

        ];


        const addButton =
            possibleButtons.find(
                function (button) {

                    return Boolean(button);

                }
            );


        if (!addButton) {

            console.warn(
                "Add Product button not found."
            );

            return;

        }


        addButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openAddProductModal();

            }
        );

    }


    /* =========================================================
       REFRESH BUTTONS
    ========================================================= */

    if (refreshOrdersButton) {

        refreshOrdersButton.addEventListener(
            "click",
            function () {

                loadOrders();

            }
        );

    }


    if (refreshProductsButton) {

        refreshProductsButton.addEventListener(
            "click",
            function () {

                loadProducts();

            }
        );

    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    setupOrderTableHeaders();

    createProductModal();

    attachAddProductButton();

    loadOrders();

    loadProducts();

});