document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = (function () {
        const configuredBase = window.MEATSHOP_API_URL || "";

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
        return API_BASE ? API_BASE + path : path;
    }

    function getCustomer() {
        try {
            return JSON.parse(localStorage.getItem("meatShopCustomer") || "null");
        } catch (error) {
            return null;
        }
    }

    function saveCustomer(data) {
        localStorage.setItem("meatShopCustomer", JSON.stringify(data));
        window.meatShopCustomer = data;
        renderSignedIn();
    }

    function clearCustomer() {
        localStorage.removeItem("meatShopCustomer");
        window.meatShopCustomer = null;
        renderSignedIn();
    }

    function showMessage(text, isError) {
        const message = document.getElementById("account-message");

        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.style.color = isError ? "#c91418" : "#198754";
    }

    function setPanel(panelName) {
        document.querySelectorAll(".account-tab").forEach(function (tab) {
            tab.classList.toggle("active", tab.dataset.panel === panelName);
        });

        document.querySelectorAll(".account-panel").forEach(function (panel) {
            panel.classList.toggle("active", panel.id === "account-panel-" + panelName);
        });
    }

    function renderSignedIn() {
        const customer = getCustomer();
        const signedIn = document.getElementById("account-signed-in");
        const forms = document.getElementById("account-forms");
        const nameLabel = document.getElementById("account-user-name");
        const accountButton = document.querySelector(".account-button");

        if (accountButton) {
            accountButton.title = customer
                ? (customer.name || "My Account")
                : "My Account";
        }

        if (!signedIn || !forms) {
            return;
        }

        if (customer && customer.token) {
            signedIn.classList.add("visible");
            forms.style.display = "none";
            if (nameLabel) {
                nameLabel.textContent = customer.name || customer.phone || "Customer";
            }
        } else {
            signedIn.classList.remove("visible");
            forms.style.display = "block";
        }
    }

    function injectOverlay() {
        if (document.getElementById("account-overlay")) {
            return;
        }

        const overlay = document.createElement("div");
        overlay.id = "account-overlay";
        overlay.className = "account-overlay";
        overlay.innerHTML = `
            <div class="account-card">
                <div class="account-card-header">
                    <div>
                        <h2>My Account</h2>
                        <p>The Offer Meat Shop</p>
                    </div>
                    <button type="button" class="account-close" id="account-close">x</button>
                </div>

                <div id="account-signed-in" class="account-signed-in">
                    <strong id="account-user-name">Customer</strong>
                    <p>You are signed in. Checkout will use your saved details.</p>
                    <div class="account-actions">
                        <button type="button" class="account-primary" id="account-logout">Logout</button>
                    </div>
                </div>

                <div id="account-forms">
                    <div class="account-tabs">
                        <button type="button" class="account-tab active" data-panel="existing">
                            Already a customer?
                        </button>
                        <button type="button" class="account-tab" data-panel="new">
                            New to The Offer Meat Shop?
                        </button>
                    </div>

                    <div id="account-panel-existing" class="account-panel active">
                        <div class="account-field">
                            <label for="login-phone">Phone number</label>
                            <input id="login-phone" type="tel" maxlength="10" placeholder="10-digit mobile number">
                        </div>
                        <div class="account-field">
                            <label for="login-password">Password</label>
                            <input id="login-password" type="password" placeholder="Enter password">
                        </div>
                        <div class="account-field" id="login-otp-field" style="display:none;">
                            <label for="login-otp">OTP</label>
                            <input id="login-otp" type="text" maxlength="6" placeholder="6-digit OTP">
                        </div>
                        <div class="account-field" id="login-new-password-field" style="display:none;">
                            <label for="login-new-password">Set a password</label>
                            <input id="login-new-password" type="password" placeholder="At least 6 characters">
                        </div>
                        <div class="account-actions">
                            <button type="button" class="account-primary" id="login-password-button">
                                Login with password
                            </button>
                            <button type="button" class="account-secondary" id="login-otp-button">
                                Login with OTP
                            </button>
                            <button type="button" class="account-primary" id="login-verify-otp-button" style="display:none;">
                                Verify OTP
                            </button>
                            <button type="button" class="account-primary" id="login-save-password-button" style="display:none;">
                                Save password
                            </button>
                        </div>
                    </div>

                    <div id="account-panel-new" class="account-panel">
                        <div class="account-field">
                            <label for="signup-name">Full name</label>
                            <input id="signup-name" type="text" placeholder="Enter your name">
                        </div>
                        <div class="account-field">
                            <label for="signup-phone">Phone number</label>
                            <input id="signup-phone" type="tel" maxlength="10" placeholder="10-digit mobile number">
                        </div>
                        <div class="account-field">
                            <label for="signup-email">Email (optional)</label>
                            <input id="signup-email" type="email" placeholder="you@example.com">
                        </div>
                        <div class="account-field" id="signup-otp-field" style="display:none;">
                            <label for="signup-otp">OTP</label>
                            <input id="signup-otp" type="text" maxlength="6" placeholder="6-digit OTP">
                        </div>
                        <div class="account-field" id="signup-password-field" style="display:none;">
                            <label for="signup-password">Create password</label>
                            <input id="signup-password" type="password" placeholder="At least 6 characters">
                        </div>
                        <div class="account-field" id="signup-confirm-field" style="display:none;">
                            <label for="signup-confirm">Confirm password</label>
                            <input id="signup-confirm" type="password" placeholder="Re-enter password">
                        </div>
                        <div class="account-actions">
                            <button type="button" class="account-primary" id="signup-send-otp-button">
                                Send OTP
                            </button>
                            <button type="button" class="account-primary" id="signup-verify-button" style="display:none;">
                                Verify OTP and create account
                            </button>
                            <button type="button" class="account-primary" id="signup-save-password-button" style="display:none;">
                                Save password
                            </button>
                        </div>
                    </div>
                </div>

                <p id="account-message" class="account-message"></p>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    async function postAuth(path, body) {
        const response = await fetch(apiUrl(path), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Request failed");
        }

        return result;
    }

    function validPhone(value) {
        return /^[0-9]{10}$/.test(String(value || "").trim());
    }

    injectOverlay();
    renderSignedIn();

    const overlay = document.getElementById("account-overlay");
    const accountButton = document.querySelector(".account-button");

    function openAccount() {
        overlay.classList.add("open");
        showMessage("", false);
        renderSignedIn();
    }

    function closeAccount() {
        overlay.classList.remove("open");
    }

    if (accountButton) {
        accountButton.addEventListener("click", openAccount);
    }

    document.getElementById("account-close").addEventListener("click", closeAccount);

    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            closeAccount();
        }
    });

    document.querySelectorAll(".account-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            setPanel(tab.dataset.panel);
            showMessage("", false);
        });
    });

    document.getElementById("account-logout").addEventListener("click", function () {
        clearCustomer();
        showMessage("You have been logged out.", false);
    });

    document.getElementById("login-password-button").addEventListener("click", async function () {
        const phone = document.getElementById("login-phone").value.trim();
        const password = document.getElementById("login-password").value;

        if (!validPhone(phone)) {
            showMessage("Enter a valid 10-digit phone number.", true);
            return;
        }

        if (!password) {
            showMessage("Enter your password, or use Login with OTP.", true);
            return;
        }

        try {
            const result = await postAuth("/api/auth/login", {
                phone: phone,
                password: password,
                role: "customer"
            });

            saveCustomer({
                token: result.token,
                name: result.user.name,
                phone: result.user.phone,
                email: result.user.email
            });
            showMessage("Welcome back.", false);
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("login-otp-button").addEventListener("click", async function () {
        const phone = document.getElementById("login-phone").value.trim();

        if (!validPhone(phone)) {
            showMessage("Enter a valid 10-digit phone number.", true);
            return;
        }

        try {
            const result = await postAuth("/api/auth/send-otp", {
                phone: phone,
                purpose: "customer_login"
            });

            document.getElementById("login-otp-field").style.display = "block";
            document.getElementById("login-verify-otp-button").style.display = "block";
            showMessage(
                result.debugOtp
                    ? "OTP sent. Test code: " + result.debugOtp
                    : "OTP sent. Enter the 6-digit code.",
                false
            );
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("login-verify-otp-button").addEventListener("click", async function () {
        const phone = document.getElementById("login-phone").value.trim();
        const otp = document.getElementById("login-otp").value.trim();

        try {
            const result = await postAuth("/api/auth/verify-otp", {
                phone: phone,
                otp: otp,
                purpose: "customer_login"
            });

            saveCustomer({
                token: result.token,
                name: result.user.name,
                phone: result.user.phone,
                email: result.user.email
            });

            if (result.needsPassword) {
                document.getElementById("login-new-password-field").style.display = "block";
                document.getElementById("login-save-password-button").style.display = "block";
                showMessage("Signed in. Set a password for faster login next time.", false);
            } else {
                showMessage("Signed in with OTP.", false);
            }
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("login-save-password-button").addEventListener("click", async function () {
        const customer = getCustomer();
        const password = document.getElementById("login-new-password").value;

        if (!customer || !customer.token) {
            showMessage("Verify OTP first.", true);
            return;
        }

        try {
            const result = await postAuth("/api/auth/set-password", {
                token: customer.token,
                password: password
            });

            saveCustomer({
                token: result.token,
                name: result.user.name,
                phone: result.user.phone,
                email: result.user.email
            });
            showMessage("Password saved.", false);
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("signup-send-otp-button").addEventListener("click", async function () {
        const name = document.getElementById("signup-name").value.trim();
        const phone = document.getElementById("signup-phone").value.trim();
        const email = document.getElementById("signup-email").value.trim();

        if (name.length < 2) {
            showMessage("Please enter your full name.", true);
            return;
        }

        if (!validPhone(phone)) {
            showMessage("Enter a valid 10-digit phone number.", true);
            return;
        }

        try {
            const result = await postAuth("/api/auth/send-otp", {
                name: name,
                phone: phone,
                email: email,
                purpose: "customer_signup"
            });

            document.getElementById("signup-otp-field").style.display = "block";
            document.getElementById("signup-verify-button").style.display = "block";
            showMessage(
                result.debugOtp
                    ? "OTP sent. Test code: " + result.debugOtp
                    : "OTP sent. Enter the 6-digit code.",
                false
            );
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("signup-verify-button").addEventListener("click", async function () {
        const name = document.getElementById("signup-name").value.trim();
        const phone = document.getElementById("signup-phone").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const otp = document.getElementById("signup-otp").value.trim();

        try {
            const result = await postAuth("/api/auth/verify-otp", {
                name: name,
                phone: phone,
                email: email,
                otp: otp,
                purpose: "customer_signup"
            });

            saveCustomer({
                token: result.token,
                name: result.user.name,
                phone: result.user.phone,
                email: result.user.email
            });

            document.getElementById("signup-password-field").style.display = "block";
            document.getElementById("signup-confirm-field").style.display = "block";
            document.getElementById("signup-save-password-button").style.display = "block";
            showMessage("Account created. Now set a password.", false);
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    document.getElementById("signup-save-password-button").addEventListener("click", async function () {
        const customer = getCustomer();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById("signup-confirm").value;

        if (!customer || !customer.token) {
            showMessage("Verify OTP first.", true);
            return;
        }

        try {
            const result = await postAuth("/api/auth/set-password", {
                token: customer.token,
                password: password,
                confirmPassword: confirmPassword,
                name: document.getElementById("signup-name").value.trim()
            });

            saveCustomer({
                token: result.token,
                name: result.user.name,
                phone: result.user.phone,
                email: result.user.email
            });
            showMessage("Password saved. You are signed in.", false);
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    window.meatShopCustomer = getCustomer();
});
