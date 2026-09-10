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

    function apiUrl(path) {
        return API_BASE ? `${API_BASE}${path}` : path;
    }

    const cart =
        JSON.parse(localStorage.getItem("meatShopCart")) || [];

    const itemsContainer =
        document.getElementById("checkout-items");

    const checkoutMessage =
        document.getElementById("checkout-message");

    const placeOrderButton =
        document.getElementById("place-order");

    let subtotal = 0;
    let razorpayKeyId = "";


    function showCheckoutMessage(text, isError) {
        if (!checkoutMessage) {
            if (isError) {
                alert(text);
            }
            return;
        }

        checkoutMessage.textContent = text;
        checkoutMessage.className = isError
            ? "checkout-message error"
            : "checkout-message success";
        checkoutMessage.style.display = text ? "block" : "none";
    }


    function setPlaceOrderState(disabled, label) {
        if (!placeOrderButton) {
            return;
        }

        placeOrderButton.disabled = disabled;
        placeOrderButton.textContent = label;
    }


    function selectedPaymentValue() {
        const payment = document.querySelector('input[name="payment"]:checked');
        return payment ? payment.value : "";
    }


    function updatePlaceOrderLabel() {
        if (selectedPaymentValue() === "online") {
            setPlaceOrderState(false, "Pay with Razorpay");
        } else {
            setPlaceOrderState(false, "Place Order");
        }
    }


    function paymentLabel(method) {
        return method === "cod"
            ? "Cash on Delivery"
            : "Online Payment";
    }


    function saveSuccessOrder(backendOrder) {
        const successOrder = {
            orderNumber: backendOrder.orderId,
            customer: backendOrder.customer,
            paymentMethod: backendOrder.paymentMethod,
            paymentStatus: backendOrder.paymentStatus || "",
            items: backendOrder.items,
            subtotal: backendOrder.subtotal,
            delivery: backendOrder.delivery,
            total: backendOrder.total,
            orderDate: backendOrder.createdAt
        };

        localStorage.setItem(
            "meatShopLastOrder",
            JSON.stringify(successOrder)
        );

        return successOrder;
    }


    function buildWhatsappMessage(orderData, orderId) {
        const whatsappItems = cart
            .map(function (item) {
                return `${item.name} (${item.weight}) x ${item.quantity} = ₹${item.price * item.quantity}`;
            })
            .join("\n");

        return [
            "New THE OFFER MEAT SHOP Order",
            `Order number: ${orderId}`,
            "",
            "Customer details:",
            `Name: ${orderData.customer.name}`,
            `Phone: ${orderData.customer.phone}`,
            `Address: ${orderData.customer.address}`,
            `City: ${orderData.customer.city}`,
            `Pincode: ${orderData.customer.pincode}`,
            "",
            "Items:",
            whatsappItems,
            "",
            `Subtotal: ₹${orderData.subtotal}`,
            `Delivery: ${orderData.delivery === 0 ? "FREE" : "₹" + orderData.delivery}`,
            `Total: ₹${orderData.total}`,
            `Payment: ${paymentLabel(orderData.paymentMethod)}`
        ].join("\n");
    }


    function goToSuccessPage(whatsappMessage) {
        localStorage.removeItem("meatShopCart");

        if (whatsappMessage) {
            localStorage.setItem("meatShopWhatsappMessage", whatsappMessage);
        }

        window.location.href = "order-success.html";
    }


    async function loadPublicConfig() {
        try {
            const response = await fetch(apiUrl("/api/config"));
            const result = await response.json();

            if (result && result.razorpayKeyId) {
                razorpayKeyId = result.razorpayKeyId;
            }
        } catch (error) {
            console.error("Public config load error:", error);
        }
    }


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


    document.querySelectorAll('input[name="payment"]').forEach(function (input) {
        input.addEventListener("change", updatePlaceOrderLabel);
    });

    updatePlaceOrderLabel();
    loadPublicConfig();


    /* =========================
       PLACE ORDER
    ========================= */

    placeOrderButton.addEventListener(
        "click",
        async function () {

            showCheckoutMessage("", false);

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
                selectedPaymentValue();


            /* =========================
               VALIDATION
            ========================= */

            if (cart.length === 0) {
                alert("Your cart is empty.");
                return;
            }

            if (!name) {
                alert("Please enter your full name.");
                document.getElementById("customer-name").focus();
                return;
            }

            if (!phone) {
                alert("Please enter your phone number.");
                document.getElementById("customer-phone").focus();
                return;
            }

            if (!/^[0-9]{10}$/.test(phone)) {
                alert("Please enter a valid 10-digit phone number.");
                document.getElementById("customer-phone").focus();
                return;
            }

            if (!address) {
                alert("Please enter your delivery address.");
                document.getElementById("customer-address").focus();
                return;
            }

            if (!city) {
                alert("Please enter your city.");
                document.getElementById("customer-city").focus();
                return;
            }

            if (!/^[0-9]{6}$/.test(pincode)) {
                alert("Please enter a valid 6-digit pincode.");
                document.getElementById("customer-pincode").focus();
                return;
            }

            if (!payment) {
                alert("Please select a payment method.");
                return;
            }


            const orderData = {
                customer: {
                    name: name,
                    phone: phone,
                    address: address,
                    city: city,
                    pincode: pincode
                },
                paymentMethod: payment,
                items: cart,
                subtotal: subtotal,
                delivery: delivery,
                total: total
            };


            /* =========================
               CASH ON DELIVERY
            ========================= */

            if (payment === "cod") {

                setPlaceOrderState(true, "Placing Order...");

                try {

                    const response = await fetch(apiUrl("/api/orders"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(orderData)
                    });

                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(
                            result.message || "Unable to place order."
                        );
                    }

                    const backendOrder = result.order;
                    saveSuccessOrder(backendOrder);
                    goToSuccessPage(
                        buildWhatsappMessage(orderData, backendOrder.orderId)
                    );

                } catch (error) {

                    console.error("Order submission error:", error);
                    showCheckoutMessage(
                        error.message || "Unable to place the order right now.",
                        true
                    );
                    updatePlaceOrderLabel();

                }

                return;

            }


            /* =========================
               RAZORPAY ONLINE PAYMENT
            ========================= */

            if (typeof window.Razorpay !== "function") {
                showCheckoutMessage(
                    "Razorpay checkout is still loading. Please wait a moment and try again.",
                    true
                );
                return;
            }

            const amountInPaise = Math.round(Number(total) * 100);

            if (amountInPaise < 100) {
                showCheckoutMessage(
                    "The order total is too low for online payment.",
                    true
                );
                return;
            }

            setPlaceOrderState(true, "Opening Payment...");

            try {

                const orderResponse = await fetch(apiUrl("/api/create-order"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        amount: amountInPaise,
                        currency: "INR",
                        receipt: ("MS-" + Date.now()).slice(0, 40)
                    })
                });

                const orderResult = await orderResponse.json();

                if (orderResponse.status === 401) {
                    throw new Error("Razorpay authentication failed.");
                }

                if (!orderResponse.ok || !orderResult.success) {
                    throw new Error(
                        orderResult.message || "Unable to start online payment."
                    );
                }

                const checkoutKey = orderResult.key_id || razorpayKeyId;

                if (!checkoutKey) {
                    throw new Error("Razorpay key is not configured.");
                }

                const razorpayCheckout = new window.Razorpay({
                    key: checkoutKey,
                    amount: orderResult.amount,
                    currency: orderResult.currency,
                    name: "The Offer Meat Shop",
                    description: "Fresh meat order",
                    order_id: orderResult.order_id,
                    prefill: {
                        name: name,
                        contact: phone
                    },
                    notes: {
                        customer_city: city
                    },
                    theme: {
                        color: "#c91418"
                    },
                    modal: {
                        ondismiss: function () {
                            showCheckoutMessage(
                                "Payment was cancelled. Your cart is still saved.",
                                true
                            );
                            updatePlaceOrderLabel();
                        }
                    },
                    handler: async function (response) {

                        setPlaceOrderState(true, "Verifying Payment...");

                        try {

                            const verifyResponse = await fetch(
                                apiUrl("/api/verify-payment"),
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_signature: response.razorpay_signature,
                                        order: orderData
                                    })
                                }
                            );

                            const verifyResult = await verifyResponse.json();

                            if (!verifyResponse.ok || !verifyResult.success) {
                                throw new Error(
                                    verifyResult.message ||
                                    "Payment could not be verified."
                                );
                            }

                            const backendOrder = verifyResult.order;

                            if (!backendOrder) {
                                throw new Error(
                                    "Payment was verified, but the order was not saved. Please contact the shop with payment id " +
                                    response.razorpay_payment_id
                                );
                            }

                            saveSuccessOrder(backendOrder);
                            goToSuccessPage(
                                buildWhatsappMessage(
                                    orderData,
                                    backendOrder.orderId
                                )
                            );

                        } catch (verifyError) {

                            console.error("Payment verify error:", verifyError);
                            showCheckoutMessage(
                                verifyError.message ||
                                "Payment verification failed. Do not pay again until you contact the shop.",
                                true
                            );
                            updatePlaceOrderLabel();

                        }

                    }
                });

                razorpayCheckout.on("payment.failed", function (response) {
                    const failed = response && response.error
                        ? response.error
                        : {};

                    console.error("Razorpay payment.failed:", failed);

                    showCheckoutMessage(
                        failed.description ||
                        "Payment failed. Please try again or choose Cash on Delivery.",
                        true
                    );

                    updatePlaceOrderLabel();
                });

                razorpayCheckout.open();

            } catch (error) {

                console.error("Razorpay checkout error:", error);
                showCheckoutMessage(
                    error.message || "Unable to start online payment.",
                    true
                );
                updatePlaceOrderLabel();

            }

        }
    );

});
