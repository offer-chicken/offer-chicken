const DEFAULT_SUPABASE_URL = "https://oobdmxipmztbsbhtlggt.supabase.co";

const DEFAULT_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYmRteGlwbXp0YnNiaHRsZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjM2NzQsImV4cCI6MjEwMjc5OTY3NH0.vw1d1BTfkaj_RvsHo0hj5L7w308m4H9iX8FKUX6MILI";


async function createAdminSupabaseClient() {
    let supabaseUrl = DEFAULT_SUPABASE_URL;
    let supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

    try {
        const response = await fetch("/api/config");
        const config = await response.json();

        if (config.supabaseUrl && config.supabaseAnonKey) {
            supabaseUrl = config.supabaseUrl;
            supabaseAnonKey = config.supabaseAnonKey;
        }
    } catch (error) {
        console.warn("Using fallback admin auth config:", error);
    }

    return window.supabase.createClient(
        supabaseUrl,
        supabaseAnonKey
    );
}


document.addEventListener("DOMContentLoaded", async function () {
    const loginForm = document.getElementById("admin-login-form");
    const emailInput = document.getElementById("admin-email");
    const passwordInput = document.getElementById("admin-password");
    const otpInput = document.getElementById("admin-otp");
    const newPasswordInput = document.getElementById("admin-new-password");
    const message = document.getElementById("login-message");
    const passwordField = document.getElementById("admin-password-field");
    const otpField = document.getElementById("admin-otp-field");
    const newPasswordField = document.getElementById("admin-new-password-field");
    const submitButton = document.getElementById("admin-submit-button");
    const sendOtpButton = document.getElementById("admin-send-otp-button");
    const savePasswordButton = document.getElementById("admin-save-password-button");
    const tabPassword = document.getElementById("admin-tab-password");
    const tabOtp = document.getElementById("admin-tab-otp");

    if (!loginForm || !emailInput || !message) {
        console.error("Admin login form was not found.");
        return;
    }

    let mode = "password";
    let otpToken = "";
    const supabaseClient = await createAdminSupabaseClient();

    function setMessage(text, isError) {
        message.textContent = text || "";
        message.style.color = isError ? "#c91418" : "#198754";
    }

    function setMode(nextMode) {
        mode = nextMode;
        const isOtp = nextMode === "otp";

        tabPassword.classList.toggle("active", !isOtp);
        tabOtp.classList.toggle("active", isOtp);
        passwordField.style.display = isOtp ? "none" : "block";
        otpField.style.display = isOtp ? "block" : "none";
        sendOtpButton.style.display = isOtp ? "block" : "none";
        submitButton.textContent = isOtp ? "Verify OTP" : "Login";
        setMessage("", false);
    }

    function goToDashboard() {
        sessionStorage.setItem("offerChickenAdminAuth", "true");
        setMessage("Login successful. Opening dashboard...", false);
        setTimeout(function () {
            window.location.replace("/admin/dashboard");
        }, 400);
    }

    tabPassword.addEventListener("click", function () {
        setMode("password");
    });

    tabOtp.addEventListener("click", function () {
        setMode("otp");
    });

    sendOtpButton.addEventListener("click", async function () {
        const email = emailInput.value.trim();

        if (!email) {
            setMessage("Please enter your email.", true);
            emailInput.focus();
            return;
        }

        setMessage("Sending OTP...", false);

        try {
            const response = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    purpose: "admin_login"
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to send OTP");
            }

            setMessage(
                result.debugOtp
                    ? "OTP sent. Test code: " + result.debugOtp
                    : "OTP sent. Enter the 6-digit code.",
                false
            );
        } catch (error) {
            setMessage(error.message, true);
        }
    });

    savePasswordButton.addEventListener("click", async function () {
        const password = newPasswordInput.value;

        if (!otpToken) {
            setMessage("Verify OTP before setting a password.", true);
            return;
        }

        try {
            const response = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: otpToken,
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to save password");
            }

            setMessage("Password saved. You can use it next time.", false);
            goToDashboard();
        } catch (error) {
            setMessage(error.message, true);
        }
    });

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
            setMessage("Please enter your email.", true);
            emailInput.focus();
            return;
        }

        if (mode === "otp") {
            const otp = otpInput.value.trim();

            if (!otp) {
                setMessage("Enter the OTP, or click Send OTP first.", true);
                return;
            }

            setMessage("Verifying OTP...", false);

            try {
                const response = await fetch("/api/auth/verify-otp", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        otp: otp,
                        purpose: "admin_login"
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "OTP verification failed");
                }

                otpToken = result.token;

                if (result.needsPassword) {
                    newPasswordField.style.display = "block";
                    savePasswordButton.style.display = "block";
                    setMessage("OTP verified. Set a password for next time, or continue.", false);
                    return;
                }

                goToDashboard();
            } catch (error) {
                setMessage(error.message, true);
            }

            return;
        }

        if (!password) {
            setMessage("Please enter your password, or use Login with OTP.", true);
            passwordInput.focus();
            return;
        }

        setMessage("Signing in...", false);

        try {
            if (supabaseClient && supabaseClient.auth) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (!error && data && data.session) {
                    goToDashboard();
                    return;
                }
            }

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: "admin"
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to sign in.");
            }

            goToDashboard();
        } catch (error) {
            console.error("Login error:", error);
            sessionStorage.removeItem("offerChickenAdminAuth");
            setMessage(error.message || "Unable to sign in.", true);
        }
    });
});
