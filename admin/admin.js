document.addEventListener("DOMContentLoaded", function () {

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

    const API_URL = API_BASE ? `${API_BASE}/api/orders` : "/api/orders";
    const PRODUCTS_API_URL = API_BASE ? `${API_BASE}/api/products` : "/api/products";

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


    /* =========================
       LOAD ORDERS
    ========================= */

    async function loadOrders() {

        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    Loading orders...
                </td>
            </tr>
        `;

        try {

            const response =
                await fetch(API_URL);

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to load orders"
                );
            }

            const orders =
                Array.isArray(result.orders)
                    ? result.orders
                    : [];

            renderOrders(orders);
            updateDashboardStats(orders);
            renderCustomers(orders);

        } catch (error) {

            console.error(
                "Admin order loading error:",
                error
            );

            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Unable to load orders.
                    </td>
                </tr>
            `;
        }
    }


    /* =========================
       RENDER ORDERS
    ========================= */

    function renderOrders(orders) {

        ordersTableBody.innerHTML = "";

        if (orders.length === 0) {

            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
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
                order.status || "Order Placed";

            const payment =
                order.payment_method === "cod"
                    ? "Cash on Delivery"
                    : "Online Payment";

            row.innerHTML = `

                <td>
                    <strong>${order.order_id || "—"}</strong>
                </td>

                <td>
                    ${order.customer_name || "—"}
                </td>

                <td>
                    ${order.customer_phone || "—"}
                </td>

                <td class="order-total">
                    ₹${Number(order.total || 0)}
                </td>

                <td>
                    ${payment}
                </td>

                <td>
                    <span class="order-status">
                        ${status}
                    </span>
                </td>

                <td>
                    <select
                        class="status-select"
                        data-order-id="${order.id}"
                    >
                        <option value="Order Placed"
                            ${status === "Order Placed" ? "selected" : ""}>
                            Order Placed
                        </option>

                        <option value="Confirmed"
                            ${status === "Confirmed" ? "selected" : ""}>
                            Confirmed
                        </option>

                        <option value="Preparing"
                            ${status === "Preparing" ? "selected" : ""}>
                            Preparing
                        </option>

                        <option value="Out for Delivery"
                            ${status === "Out for Delivery" ? "selected" : ""}>
                            Out for Delivery
                        </option>

                        <option value="Delivered"
                            ${status === "Delivered" ? "selected" : ""}>
                            Delivered
                        </option>
                    </select>
                </td>
            `;

            ordersTableBody.appendChild(row);
        });

        attachStatusEvents();
    }


    /* =========================
       DASHBOARD STATS
    ========================= */

    function updateDashboardStats(orders) {

        let revenue = 0;
        let pending = 0;

        const customers = new Set();

        orders.forEach(function (order) {

            revenue += Number(order.total || 0);

            if (order.status !== "Delivered") {
                pending++;
            }

            if (order.customer_phone) {
                customers.add(order.customer_phone);
            }
        });

        totalOrders.textContent = orders.length;
        totalRevenue.textContent = "₹" + revenue;
        pendingOrders.textContent = pending;
        totalCustomers.textContent = customers.size;
    }


    /* =========================
       CUSTOMERS
    ========================= */

    function renderCustomers(orders) {

        customerList.innerHTML = "";

        if (orders.length === 0) {

            customerList.innerHTML = `
                <div class="empty-message">
                    No customer information available.
                </div>
            `;

            return;
        }

        const customerMap = new Map();

        orders.forEach(function (order) {

            const phone = order.customer_phone;

            if (!phone) {
                return;
            }

            if (!customerMap.has(phone)) {
                customerMap.set(phone, order);
            }
        });

        customerMap.forEach(function (order) {

            const card =
                document.createElement("div");

            card.className = "customer-card";

            card.innerHTML = `

                <strong>
                    ${order.customer_name || "Unknown"}
                </strong>

                <span>
                    📞 ${order.customer_phone || "—"}
                </span>

                <span>
                    📍 ${order.customer_address || "—"},
                    ${order.customer_city || ""}
                    - ${order.customer_pincode || ""}
                </span>
            `;

            customerList.appendChild(card);
        });
    }


    /* =========================
       ORDER STATUS
    ========================= */

    function attachStatusEvents() {

        const selectors =
            document.querySelectorAll(".status-select");

        selectors.forEach(function (select) {

            select.addEventListener(
                "change",
                async function () {

                    const orderId =
                        select.dataset.orderId;

                    const newStatus =
                        select.value;

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

                        if (!response.ok || !result.success) {

                            throw new Error(
                                result.message ||
                                "Unable to update status"
                            );
                        }

                        await loadOrders();

                    } catch (error) {

                        console.error(
                            "Status update error:",
                            error
                        );

                        alert(
                            "Unable to update order status."
                        );

                        await loadOrders();
                    }
                }
            );
        });
    }


    /* =========================
       LOAD PRODUCTS
    ========================= */

    async function loadProducts() {

        productsList.innerHTML = `
            <div class="loading-cell">
                Loading products...
            </div>
        `;

        try {

            const response =
                await fetch(PRODUCTS_API_URL);

            const result =
                await response.json();

            if (!response.ok || !result.success) {

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
                "Product loading error:",
                error
            );

            productsList.innerHTML = `
                <div class="empty-message">
                    Unable to load products.
                </div>
            `;
        }
    }


    /* =========================
       RENDER PRODUCTS
    ========================= */

    function renderProducts(products) {

        productsList.innerHTML = "";

        if (products.length === 0) {

            productsList.innerHTML = `
                <div class="empty-message">
                    No products found.
                </div>
            `;

            return;
        }

        products.forEach(function (product) {

            const card =
                document.createElement("div");

            card.className = "info-card";

            card.innerHTML = `

                ${
                    product.image
                        ? `
                            <img
                                src="../${product.image}"
                                alt="${product.name}"
                                style="
                                    width:100%;
                                    height:150px;
                                    object-fit:contain;
                                    border-radius:8px;
                                    background:#f5f5f5;
                                    margin-bottom:10px;
                                "
                            >
                          `
                        : `
                            <div
                                style="
                                    font-size:40px;
                                    margin-bottom:10px;
                                "
                            >
                                🍖
                            </div>
                          `
                }

                <strong>
                    ${product.name}
                </strong>

                <span>
                    ${product.category}
                </span>

                <span>
                    ₹${Number(product.price).toFixed(0)}
                </span>

                <span>
                    ${
                        product.available
                            ? "✅ Available"
                            : "❌ Unavailable"
                    }
                </span>

                <button
                    type="button"
                    class="edit-product-button"
                    data-product-id="${product.id}"
                >
                    ✏️ Edit Product
                </button>
            `;

            productsList.appendChild(card);
        });

        attachProductEditEvents(products);
    }


    /* =========================
       EDIT PRODUCT
    ========================= */

    function attachProductEditEvents(products) {

        const editButtons =
            document.querySelectorAll(
                ".edit-product-button"
            );

        editButtons.forEach(function (button) {

            button.addEventListener(
                "click",
                async function () {

                    const productId =
                        Number(
                            button.dataset.productId
                        );

                    const product =
                        products.find(function (item) {
                            return item.id === productId;
                        });

                    if (!product) {
                        return;
                    }


                    const newName =
                        prompt(
                            "Product name:",
                            product.name
                        );

                    if (newName === null) {
                        return;
                    }


                    const newPrice =
                        prompt(
                            "Product price:",
                            product.price
                        );

                    if (newPrice === null) {
                        return;
                    }


                    const parsedPrice =
                        Number(newPrice);

                    if (
                        !Number.isFinite(parsedPrice) ||
                        parsedPrice < 0
                    ) {

                        alert(
                            "Please enter a valid price."
                        );

                        return;
                    }


                    const newAvailability =
                        confirm(
                            "Click OK if this product should be available.\n\nClick Cancel to mark it unavailable."
                        );


                    try {

                        const response =
                            await fetch(
                                `${PRODUCTS_API_URL}/${productId}`,
                                {
                                    method: "PUT",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify({

                                            name:
                                                newName.trim(),

                                            category:
                                                product.category,

                                            price:
                                                parsedPrice,

                                            image:
                                                product.image,

                                            description:
                                                product.description,

                                            available:
                                                newAvailability
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
                                "Unable to update product"
                            );

                        }


                        alert(
                            "Product updated successfully."
                        );


                        await loadProducts();


                    } catch (error) {

                        console.error(
                            "Product update error:",
                            error
                        );


                        alert(
                            "Unable to update product."
                        );

                    }
                }
            );

        });
    }


    /* =========================
       REFRESH
    ========================= */

    if (refreshOrdersButton) {

        refreshOrdersButton.addEventListener(
            "click",
            loadOrders
        );
    }


    if (refreshProductsButton) {

        refreshProductsButton.addEventListener(
            "click",
            loadProducts
        );
    }


    /* =========================
       INITIAL LOAD
    ========================= */

    loadOrders();

    loadProducts();

});