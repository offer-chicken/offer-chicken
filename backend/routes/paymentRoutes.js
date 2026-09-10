const crypto = require("crypto");
const express = require("express");
const { getRazorpayClient, getPublicKeyId } = require("../utils/razorpayClient");
const { saveShopOrder } = require("../utils/orders");

const router = express.Router();

function isRazorpayAuthError(error) {
    const statusCode = Number(
        error && (error.statusCode || error.status)
    );

    const message = String(
        (error && error.error && error.error.description) ||
        (error && error.message) ||
        ""
    ).toLowerCase();

    return (
        statusCode === 401 ||
        message.includes("authentication") ||
        message.includes("invalid key")
    );
}

function signaturesMatch(orderId, paymentId, razorpaySignature, keySecret) {
    const payload = orderId + "|" + paymentId;
    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

    const expectedBuffer = Buffer.from(expected, "utf8");
    const receivedBuffer = Buffer.from(String(razorpaySignature || ""), "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/* =========================
   PUBLIC CONFIG
   GET /api/config
========================= */

router.get("/config", function (req, res) {
    res.json({
        success: true,
        razorpayKeyId: getPublicKeyId(),
        supabaseUrl: process.env.MEATSHOP_SUPABASE_URL || process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.MEATSHOP_SUPABASE_ANON_KEY || ""
    });
});

/* =========================
   CREATE RAZORPAY ORDER
   POST /api/create-order
========================= */

router.post("/create-order", async function (req, res) {
    try {
        const amount = Number(req.body.amount);
        const currency = String(req.body.currency || "INR").toUpperCase();
        const receipt = String(req.body.receipt || ("rcpt_" + Date.now())).slice(0, 40);

        if (!Number.isFinite(amount) || amount < 100) {
            return res.status(400).json({
                success: false,
                message: "Amount must be at least 100 paise"
            });
        }

        const razorpay = getRazorpayClient();

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount),
            currency: currency,
            receipt: receipt,
            notes: {
                source: "the-offer-meat-shop"
            }
        });

        console.log("Razorpay order created:", razorpayOrder.id);

        return res.json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: getPublicKeyId()
        });
    } catch (error) {
        console.error("Create Razorpay order error:", error);

        if (isRazorpayAuthError(error)) {
            return res.status(401).json({
                success: false,
                message: "Razorpay authentication failed"
            });
        }

        return res.status(500).json({
            success: false,
            message: (error && error.error && error.error.description) ||
                error.message ||
                "Unable to create Razorpay order"
        });
    }
});

/* =========================
   VERIFY PAYMENT SIGNATURE
   POST /api/verify-payment
========================= */

router.post("/verify-payment", async function (req, res) {
    try {
        const razorpayOrderId = req.body.razorpay_order_id;
        const razorpayPaymentId = req.body.razorpay_payment_id;
        const razorpaySignature = req.body.razorpay_signature;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                verified: false,
                message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
            });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            return res.status(500).json({
                success: false,
                verified: false,
                message: "Razorpay secret is not configured"
            });
        }

        const isValid = signaturesMatch(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            keySecret
        );

        if (!isValid) {
            console.warn("Razorpay signature mismatch", {
                razorpayOrderId,
                razorpayPaymentId
            });

            return res.status(400).json({
                success: false,
                verified: false,
                message: "Payment signature mismatch"
            });
        }

        let savedOrder = null;

        if (req.body.order) {
            savedOrder = await saveShopOrder(req.body.order, {
                paymentStatus: "paid",
                razorpayOrderId: razorpayOrderId,
                razorpayPaymentId: razorpayPaymentId,
                status: "Order Placed"
            });
        }

        return res.json({
            success: true,
            verified: true,
            message: "Payment verified successfully",
            order: savedOrder
        });
    } catch (error) {
        console.error("Verify payment error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            verified: false,
            message: error.message || "Unable to verify payment"
        });
    }
});

module.exports = router;
