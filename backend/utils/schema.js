const supabase = require("../config/supabase");

let cachedFlags = null;
let detectPromise = null;

function isMissingColumnError(error) {
    if (!error) {
        return false;
    }

    const code = String(error.code || "");
    const message = String(error.message || "").toLowerCase();

    return (
        code === "42703" ||
        code === "PGRST204" ||
        message.includes("does not exist") ||
        message.includes("schema cache")
    );
}

async function detectSchemaFlags() {
    if (cachedFlags) {
        return cachedFlags;
    }

    if (detectPromise) {
        return detectPromise;
    }

    detectPromise = (async function () {
        const stockProbe = await supabase
            .from("products")
            .select("stock")
            .limit(1);

        const paymentProbe = await supabase
            .from("orders")
            .select("payment_status, razorpay_order_id, razorpay_payment_id")
            .limit(1);

        const movementProbe = await supabase
            .from("stock_movements")
            .select("id")
            .limit(1);

        cachedFlags = {
            hasStockColumn: !stockProbe.error,
            hasPaymentColumns: !paymentProbe.error,
            hasStockMovementsTable: !movementProbe.error
        };

        console.log("Database schema flags:", cachedFlags);

        return cachedFlags;
    })();

    return detectPromise;
}

module.exports = {
    detectSchemaFlags,
    isMissingColumnError
};
