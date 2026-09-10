const Razorpay = require("razorpay");

function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        const error = new Error(
            "Missing Razorpay environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
        );
        error.statusCode = 500;
        throw error;
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
}

function getPublicKeyId() {
    return process.env.RAZORPAY_KEY_ID || "";
}

module.exports = {
    getRazorpayClient,
    getPublicKeyId
};
