const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const storePath = path.join(__dirname, "..", "data", "auth-store.json");
const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthSecret() {
    return process.env.AUTH_SECRET ||
        process.env.RAZORPAY_KEY_SECRET ||
        "the-offer-meat-shop-local-secret";
}

function emptyStore() {
    return {
        users: [],
        otps: []
    };
}

function readStore() {
    try {
        if (!fs.existsSync(storePath)) {
            return emptyStore();
        }

        const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));

        return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            otps: Array.isArray(parsed.otps) ? parsed.otps : []
        };
    } catch (error) {
        console.error("Auth store read error:", error);
        return emptyStore();
    }
}

function writeStore(store) {
    const folder = path.dirname(storePath);

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length === 12 && digits.indexOf("91") === 0) {
        return digits.slice(2);
    }

    return digits;
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function publicUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        role: user.role || "customer"
    };
}

function findUser(store, phone, email, role) {
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = normalizeEmail(email);

    return store.users.find(function (user) {
        if (role && user.role !== role) {
            return false;
        }

        if (cleanPhone && user.phone === cleanPhone) {
            return true;
        }

        if (cleanEmail && user.email === cleanEmail) {
            return true;
        }

        return false;
    }) || null;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return salt + ":" + hash;
}

function verifyPassword(password, stored) {
    if (!stored || String(stored).indexOf(":") < 0) {
        return false;
    }

    const parts = String(stored).split(":");
    const salt = parts[0];
    const hash = parts[1];
    const check = crypto.scryptSync(String(password), salt, 64).toString("hex");

    const hashBuffer = Buffer.from(hash, "hex");
    const checkBuffer = Buffer.from(check, "hex");

    if (hashBuffer.length !== checkBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(hashBuffer, checkBuffer);
}

function hashOtp(code, target, purpose) {
    return crypto
        .createHash("sha256")
        .update(String(code) + "|" + String(target) + "|" + String(purpose) + "|" + getAuthSecret())
        .digest("hex");
}

function signSession(user) {
    const payload = Buffer.from(JSON.stringify({
        id: user.id,
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        role: user.role || "customer",
        exp: Date.now() + SESSION_TTL_MS
    })).toString("base64url");

    const signature = crypto
        .createHmac("sha256", getAuthSecret())
        .update(payload)
        .digest("base64url");

    return payload + "." + signature;
}

function readSession(token) {
    if (!token || String(token).indexOf(".") < 0) {
        return null;
    }

    const parts = String(token).split(".");
    const payload = parts[0];
    const signature = parts[1];
    const expected = crypto
        .createHmac("sha256", getAuthSecret())
        .update(payload)
        .digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

        if (!data.exp || data.exp < Date.now()) {
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
}

function createOtp(phone, email, purpose) {
    const store = readStore();
    const targetPhone = normalizePhone(phone);
    const targetEmail = normalizeEmail(email);
    const target = targetPhone || targetEmail;

    if (!target) {
        throw new Error("Phone or email is required");
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const now = Date.now();

    store.otps = store.otps.filter(function (item) {
        return item.expiresAt > now && item.target !== target;
    });

    store.otps.push({
        target: target,
        phone: targetPhone,
        email: targetEmail,
        purpose: purpose,
        hash: hashOtp(code, target, purpose),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0
    });

    writeStore(store);

    console.log(
        "OTP generated for",
        purpose,
        target,
        "code:",
        code
    );

    return {
        target: target,
        phone: targetPhone,
        email: targetEmail,
        debugOtp: process.env.NODE_ENV === "production" ? undefined : code
    };
}

function consumeOtp(phone, email, purpose, code) {
    const store = readStore();
    const targetPhone = normalizePhone(phone);
    const targetEmail = normalizeEmail(email);
    const target = targetPhone || targetEmail;
    const now = Date.now();

    const otp = store.otps.find(function (item) {
        return item.target === target && item.purpose === purpose;
    });

    if (!otp) {
        throw new Error("No OTP found. Please request a new code.");
    }

    if (otp.expiresAt < now) {
        throw new Error("OTP has expired. Please request a new code.");
    }

    otp.attempts += 1;

    if (otp.attempts > 5) {
        store.otps = store.otps.filter(function (item) {
            return item !== otp;
        });
        writeStore(store);
        throw new Error("Too many incorrect OTP attempts.");
    }

    const expected = hashOtp(String(code || "").trim(), target, purpose);

    if (expected !== otp.hash) {
        writeStore(store);
        throw new Error("Invalid OTP. Please try again.");
    }

    store.otps = store.otps.filter(function (item) {
        return item !== otp;
    });

    writeStore(store);

    return {
        phone: targetPhone,
        email: targetEmail
    };
}

function upsertUser(details) {
    const store = readStore();
    const phone = normalizePhone(details.phone);
    const email = normalizeEmail(details.email);
    const role = details.role || "customer";

    let user = findUser(store, phone, email, role);

    if (!user) {
        user = {
            id: role + "-" + Date.now(),
            role: role,
            name: details.name || "",
            phone: phone,
            email: email,
            passwordHash: "",
            createdAt: new Date().toISOString()
        };
        store.users.push(user);
    }

    if (details.name) {
        user.name = details.name;
    }

    if (phone) {
        user.phone = phone;
    }

    if (email) {
        user.email = email;
    }

    if (details.password) {
        if (String(details.password).length < 6) {
            throw new Error("Password must be at least 6 characters.");
        }

        user.passwordHash = hashPassword(details.password);
    }

    user.updatedAt = new Date().toISOString();
    writeStore(store);

    return user;
}

function loginWithPassword(phone, email, password, role) {
    const store = readStore();
    const user = findUser(store, phone, email, role || "customer");

    if (!user || !user.passwordHash) {
        throw new Error("No password is set for this account. Use OTP to log in and set one.");
    }

    if (!verifyPassword(password, user.passwordHash)) {
        throw new Error("Incorrect phone/email or password.");
    }

    return user;
}

module.exports = {
    normalizePhone,
    normalizeEmail,
    publicUser,
    createOtp,
    consumeOtp,
    upsertUser,
    loginWithPassword,
    signSession,
    readSession,
    findUser: function (phone, email, role) {
        return findUser(readStore(), phone, email, role);
    }
};
