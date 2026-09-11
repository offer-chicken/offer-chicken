const express = require("express");
const {
    createOtp,
    consumeOtp,
    upsertUser,
    loginWithPassword,
    signSession,
    readSession,
    publicUser,
    findUser
} = require("../utils/authStore");

const router = express.Router();

function getIdentifier(body) {
    return {
        phone: body.phone,
        email: body.email,
        purpose: body.purpose || "customer_login",
        name: body.name,
        password: body.password,
        otp: body.otp
    };
}

function allowedPurpose(purpose) {
    return [
        "customer_login",
        "customer_signup",
        "admin_login"
    ].indexOf(purpose) !== -1;
}

function roleFromPurpose(purpose) {
    return purpose === "admin_login" ? "admin" : "customer";
}

router.post("/send-otp", function (req, res) {
    try {
        const input = getIdentifier(req.body);

        if (!allowedPurpose(input.purpose)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP purpose"
            });
        }

        if (input.purpose === "customer_signup") {
            if (!input.name || String(input.name).trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter your name to create an account."
                });
            }
        }

        if (input.purpose === "customer_login") {
            const existing = findUser(
                input.phone,
                input.email,
                "customer"
            );

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "No account found. Use New to The Offer Meat Shop to sign up."
                });
            }
        }

        const result = createOtp(input.phone, input.email, input.purpose);

        return res.json({
            success: true,
            message: "OTP sent. Check your phone/email, or the server log while testing.",
            target: result.target,
            debugOtp: result.debugOtp
        });
    } catch (error) {
        console.error("Send OTP error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Unable to send OTP"
        });
    }
});

router.post("/verify-otp", function (req, res) {
    try {
        const input = getIdentifier(req.body);

        if (!input.otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is required"
            });
        }

        const verified = consumeOtp(
            input.phone,
            input.email,
            input.purpose,
            input.otp
        );

        const role = roleFromPurpose(input.purpose);
        const existing = findUser(verified.phone, verified.email, role);

        if (input.purpose === "customer_login" && !existing) {
            return res.status(404).json({
                success: false,
                verified: true,
                needsSignup: true,
                message: "No account found. Create one from New to The Offer Meat Shop."
            });
        }

        const user = existing || upsertUser({
            name: input.name || "",
            phone: verified.phone,
            email: verified.email,
            role: role
        });

        const needsPassword = !user.passwordHash;
        const token = signSession(user);

        return res.json({
            success: true,
            verified: true,
            needsPassword: needsPassword,
            token: token,
            user: publicUser(user),
            message: needsPassword
                ? "OTP verified. Set a password for next time."
                : "OTP verified. You are signed in."
        });
    } catch (error) {
        console.error("Verify OTP error:", error);

        return res.status(400).json({
            success: false,
            verified: false,
            message: error.message || "Unable to verify OTP"
        });
    }
});

router.post("/set-password", function (req, res) {
    try {
        const token = req.body.token || "";
        const session = readSession(token);

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Please verify OTP before setting a password."
            });
        }

        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        if (!password || String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        const user = upsertUser({
            name: req.body.name || session.name,
            phone: session.phone,
            email: session.email,
            role: session.role,
            password: password
        });

        return res.json({
            success: true,
            token: signSession(user),
            user: publicUser(user),
            message: "Password saved. You can log in with it next time."
        });
    } catch (error) {
        console.error("Set password error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Unable to save password"
        });
    }
});

router.post("/login", function (req, res) {
    try {
        const input = getIdentifier(req.body);
        const role = req.body.role === "admin" ? "admin" : "customer";

        if (!input.password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        const user = loginWithPassword(
            input.phone,
            input.email,
            input.password,
            role
        );

        return res.json({
            success: true,
            token: signSession(user),
            user: publicUser(user),
            message: "Login successful"
        });
    } catch (error) {
        console.error("Password login error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Unable to log in"
        });
    }
});

router.get("/me", function (req, res) {
    const header = req.headers.authorization || "";
    const token = header.indexOf("Bearer ") === 0
        ? header.slice(7)
        : req.query.token;

    const session = readSession(token);

    if (!session) {
        return res.status(401).json({
            success: false,
            message: "Not signed in"
        });
    }

    return res.json({
        success: true,
        user: publicUser(session)
    });
});

module.exports = router;
