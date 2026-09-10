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
    const message = document.getElementById("login-message");

    if (!loginForm || !emailInput || !passwordInput || !message) {
        console.error("Admin login form was not found.");
        return;
    }

    const supabaseClient = await createAdminSupabaseClient();

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
            message.textContent = "Please enter your email.";
            message.style.color = "#c91418";
            emailInput.focus();
            return;
        }

        if (!password) {
            message.textContent = "Please enter your password.";
            message.style.color = "#c91418";
            passwordInput.focus();
            return;
        }

        message.textContent = "Signing in...";
        message.style.color = "#555";

        try {
            if (!supabaseClient || !supabaseClient.auth) {
                throw new Error("Supabase client failed to initialize.");
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            if (!data || !data.session) {
                throw new Error("Login session was not created.");
            }

            sessionStorage.setItem("offerChickenAdminAuth", "true");
            message.textContent = "Login successful. Opening dashboard...";
            message.style.color = "#198754";

            setTimeout(function () {
                window.location.replace("/admin/dashboard");
            }, 500);
        } catch (error) {
            console.error("Login error:", error);
            sessionStorage.removeItem("offerChickenAdminAuth");
            message.textContent = error.message || "Unable to sign in.";
            message.style.color = "#c91418";
        }
    });
});
