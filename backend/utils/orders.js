const supabase = require("../config/supabase");
const { detectSchemaFlags } = require("./schema");
const { deductOrderItems } = require("./inventory");
const { saveLocalOrder } = require("./localStore");

function validateOrderPayload(order) {
    if (!order) {
        return "Order data is required";
    }

    if (!order.customer || !Array.isArray(order.items) || order.items.length === 0) {
        return "Customer details and cart items are required";
    }

    if (
        !order.customer.name ||
        !order.customer.phone ||
        !order.customer.address ||
        !order.customer.city ||
        !order.customer.pincode
    ) {
        return "Complete customer details are required";
    }

    return null;
}

function buildOrderRow(order, extras) {
    extras = extras || {};

    const paymentMethod = order.paymentMethod === "online"
        ? "online"
        : "cod";

    return {
        order_id: extras.orderId || ("MS-" + Date.now()),
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        customer_address: order.customer.address,
        customer_city: order.customer.city,
        customer_pincode: order.customer.pincode,
        payment_method: paymentMethod,
        items: order.items,
        subtotal: Number(order.subtotal || 0),
        delivery: Number(order.delivery || 0),
        total: Number(order.total || 0),
        status: extras.status || "Order Placed"
    };
}

function formatOrder(data) {
    return {
        orderId: data.order_id,
        customer: {
            name: data.customer_name,
            phone: data.customer_phone,
            address: data.customer_address,
            city: data.customer_city,
            pincode: data.customer_pincode
        },
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status || (
            String(data.payment_method || "").startsWith("online")
                ? "paid"
                : "cod"
        ),
        razorpayOrderId: data.razorpay_order_id || null,
        razorpayPaymentId: data.razorpay_payment_id || null,
        items: data.items,
        subtotal: Number(data.subtotal),
        delivery: Number(data.delivery),
        total: Number(data.total),
        status: data.status,
        createdAt: data.created_at
    };
}

async function saveShopOrder(order, extras) {
    extras = extras || {};

    const validationError = validateOrderPayload(order);

    if (validationError) {
        const error = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const flags = await detectSchemaFlags();
    const orderRow = buildOrderRow(order, extras);

    if (flags.hasPaymentColumns) {
        orderRow.payment_status = extras.paymentStatus || (
            orderRow.payment_method === "online" ? "paid" : "cod"
        );
        orderRow.razorpay_order_id = extras.razorpayOrderId || null;
        orderRow.razorpay_payment_id = extras.razorpayPaymentId || null;
    } else if (extras.razorpayOrderId || extras.razorpayPaymentId) {
        orderRow.payment_method = [
            "online",
            extras.paymentStatus || "paid",
            extras.razorpayOrderId || "",
            extras.razorpayPaymentId || ""
        ].join("|");
    }

    const { data, error } = await supabase
        .from("orders")
        .insert([orderRow])
        .select()
        .single();

    if (error) {

        console.error("Supabase Order Error:", error);

        if (error.code === "42501") {
            const fallbackOrder = saveLocalOrder(orderRow, {
                orderId: orderRow.order_id,
                customer: {
                    name: orderRow.customer_name,
                    phone: orderRow.customer_phone,
                    address: orderRow.customer_address,
                    city: orderRow.customer_city,
                    pincode: orderRow.customer_pincode
                },
                paymentMethod: orderRow.payment_method,
                paymentStatus: extras.paymentStatus || (
                    orderRow.payment_method === "online" ? "paid" : "cod"
                ),
                razorpayOrderId: extras.razorpayOrderId || null,
                razorpayPaymentId: extras.razorpayPaymentId || null,
                items: orderRow.items,
                subtotal: orderRow.subtotal,
                delivery: orderRow.delivery,
                total: orderRow.total,
                status: orderRow.status,
                createdAt: new Date().toISOString()
            });

            try {
                await deductOrderItems(order.items);
            } catch (stockError) {
                console.error("Stock deduction error:", stockError);
            }

            return fallbackOrder;
        }

        const saveError = new Error("Unable to save order to database");
        saveError.statusCode = 500;
        throw saveError;
    }

    try {
        await deductOrderItems(order.items);
    } catch (stockError) {
        console.error("Stock deduction error:", stockError);
    }

    console.log("Order saved to Supabase:", data.order_id);

    return formatOrder(data);
}

function parsePaymentMethod(value) {
    const raw = String(value || "cod");

    if (raw === "cod" || raw.startsWith("cod")) {
        return {
            method: "cod",
            label: "Cash on Delivery",
            status: "cod"
        };
    }

    const parts = raw.split("|");

    return {
        method: "online",
        label: "Online Payment",
        status: parts[1] || "paid",
        razorpayOrderId: parts[2] || "",
        razorpayPaymentId: parts[3] || ""
    };
}

function isPaidOrder(order) {
    const payment = parsePaymentMethod(order.payment_method);
    const status = String(order.payment_status || payment.status || "").toLowerCase();

    if (payment.method === "cod") {
        return order.status !== "Cancelled";
    }

    return status === "paid";
}

module.exports = {
    validateOrderPayload,
    saveShopOrder,
    formatOrder,
    parsePaymentMethod,
    isPaidOrder
};
