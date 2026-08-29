document.addEventListener("DOMContentLoaded", function () {

    const WHATSAPP_NUMBER = "917558148537";

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

    const cart =
        JSON.parse(localStorage.getItem("meatShopCart")) || [];

    const itemsContainer =
        document.getElementById("checkout-items");

    let subtotal = 0;


    /* =========================
       SHOW CART ITEMS
    ========================= */

    if (cart.length === 0) {

        itemsContainer.innerHTML = `
            <div class="empty-checkout">
                <p>Your cart is empty.</p>
            </div>
        `;

    } else {

        cart.forEach(function (item) {

            const itemTotal =
                item.price * item.quantity;

            subtotal += itemTotal;

            const itemElement =
                document.createElement("div");

            itemElement.className =
                "checkout-item";

            itemElement.innerHTML = `

                <img
                    src="${item.image}"
                    alt="${item.name}"
                >

                <div class="checkout-item-info">

                    <strong>
                        ${item.name}
                    </strong>

                    <span>
                        ${item.weight} × ${item.quantity}
                    </span>

                </div>

                <strong>
                    ₹${itemTotal}
                </strong>

            `;

            itemsContainer.appendChild(
                itemElement
            );

        });

    }


    /* =========================
       DELIVERY
    ========================= */

    let delivery = 0;

    if (subtotal > 0 && subtotal < 500) {
        delivery = 40;
    }

    const total =
        subtotal + delivery;


    document.getElementById(
        "checkout-subtotal"
    ).textContent =
        "₹" + subtotal;


    document.getElementById(
        "checkout-delivery"
    ).textContent =
        delivery === 0
            ? "FREE"
            : "₹" + delivery;


    document.getElementById(
        "checkout-total"
    ).textContent =
        "₹" + total;



    /* =========================
       PLACE ORDER
    ========================= */

    const placeOrderButton =
        document.getElementById("place-order");


    placeOrderButton.addEventListener(
        "click",
        async function () {

            /* =========================
               CUSTOMER DETAILS
            ========================= */

            const name =
                document
                    .getElementById("customer-name")
                    .value
                    .trim();


            const phone =
                document
                    .getElementById("customer-phone")
                    .value
                    .trim();


            const address =
                document
                    .getElementById("customer-address")
                    .value
                    .trim();


            const city =
                document
                    .getElementById("customer-city")
                    .value
                    .trim();


            const pincode =
                document
                    .getElementById("customer-pincode")
                    .value
                    .trim();


            const payment =
                document.querySelector(
                    'input[name="payment"]:checked'
                );



            /* =========================
               VALIDATION
            ========================= */

            if (cart.length === 0) {

                alert(
                    "Your cart is empty."
                );

                return;

            }


            if (!name) {

                alert(
                    "Please enter your full name."
                );

                document
                    .getElementById("customer-name")
                    .focus();

                return;

            }


            if (!phone) {

                alert(
                    "Please enter your phone number."
                );

                document
                    .getElementById("customer-phone")
                    .focus();

                return;

            }


            if (!/^[0-9]{10}$/.test(phone)) {

                alert(
                    "Please enter a valid 10-digit phone number."
                );

                document
                    .getElementById("customer-phone")
                    .focus();

                return;

            }


            if (!address) {

                alert(
                    "Please enter your delivery address."
                );

                document
                    .getElementById("customer-address")
                    .focus();

                return;

            }


            if (!city) {

                alert(
                    "Please enter your city."
                );

                document
                    .getElementById("customer-city")
                    .focus();

                return;

            }


            if (!/^[0-9]{6}$/.test(pincode)) {

                alert(
                    "Please enter a valid 6-digit pincode."
                );

                document
                    .getElementById("customer-pincode")
                    .focus();

                return;

            }


            if (!payment) {

                alert(
                    "Please select a payment method."
                );

                return;

            }



            /* =========================
               PREVENT DOUBLE CLICK
            ========================= */

            placeOrderButton.disabled = true;

            placeOrderButton.textContent =
                "Placing Order...";



            /* =========================
               ORDER DATA
            ========================= */

            const orderData = {

                customer: {

                    name: name,

                    phone: phone,

                    address: address,

                    city: city,

                    pincode: pincode

                },

                paymentMethod:
                    payment.value,

                items: cart,

                subtotal: subtotal,

                delivery: delivery,

                total: total

            };



            /* =========================
               SEND ORDER TO BACKEND
            ========================= */

            try {

                const orderApiUrl =
                    API_BASE
                        ? `${API_BASE}/api/orders`
                        : "/api/orders";

                const response =
                    await fetch(orderApiUrl, {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                orderData
                            )
                    });


                const result =
                    await response.json();



                /* =========================
                   BACKEND ERROR
                ========================= */

                if (!response.ok || !result.success) {

                    throw new Error(
                        result.message ||
                        "Unable to place order."
                    );

                }



                /* =========================
                   SAVE BACKEND ORDER
                ========================= */

                const backendOrder =
                    result.order;


                const successOrder = {

                    orderNumber:
                        backendOrder.orderId,

                    customer:
                        backendOrder.customer,

                    paymentMethod:
                        backendOrder.paymentMethod,

                    items:
                        backendOrder.items,

                    subtotal:
                        backendOrder.subtotal,

                    delivery:
                        backendOrder.delivery,

                    total:
                        backendOrder.total,

                    orderDate:
                        backendOrder.createdAt

                };


                localStorage.setItem(
                    "meatShopLastOrder",
                    JSON.stringify(
                        successOrder
                    )
                );

                const whatsappItems = cart
                    .map(function (item) {
                        return `${item.name} (${item.weight}) x ${item.quantity} = ₹${item.price * item.quantity}`;
                    })
                    .join("\n");

                const whatsappMessage = [
                    "New OFFER CHICKEN Order",
                    `Order number: ${backendOrder.orderId}`,
                    "",
                    "Customer details:",
                    `Name: ${name}`,
                    `Phone: ${phone}`,
                    `Address: ${address}`,
                    `City: ${city}`,
                    `Pincode: ${pincode}`,
                    "",
                    "Items:",
                    whatsappItems,
                    "",
                    `Subtotal: ₹${subtotal}`,
                    `Delivery: ${delivery === 0 ? "FREE" : "₹" + delivery}`,
                    `Total: ₹${total}`,
                    `Payment: ${payment.value === "cod" ? "Cash on Delivery" : "Online Payment"}`
                ].join("\n");



                /* =========================
                   CLEAR CART
                ========================= */

                localStorage.removeItem(
                    "meatShopCart"
                );



                /* =========================
                   SUCCESS PAGE
                ========================= */

                window.location.href =
                    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

            } catch (error) {

                console.error(
                    "Order submission error:",
                    error
                );


                alert(
                    "Unable to place the order right now. Please make sure the backend server is running."
                );


                placeOrderButton.disabled =
                    false;


                placeOrderButton.textContent =
                    "Place Order";

            }

        }
    );

});