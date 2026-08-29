const SUPABASE_URL = "https://oobdmxipmztbsbhtlggt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYmRteGlwbXp0YnNiaHRsZ2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIyMzY3NCwiZXhwIjoyMTAyNzk5Njc0fQ.n1awOr74EYLt8pf9OysmlWVWte1C1OiYPKIUZUXLawM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("admin-login-form");

    const emailInput =
        document.getElementById("admin-email");

    const passwordInput =
        document.getElementById("admin-password");

    const message =
        document.getElementById("login-message");


    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            message.textContent =
                "Signing in...";

            message.style.color =
                "#555";


            try {

                const {
                    data,
                    error
                } = await supabaseClient.auth.signInWithPassword({

                    email: email,

                    password: password

                });


                if (error) {

                    throw error;

                }


                if (!data.session) {

                    throw new Error(
                        "Login session was not created."
                    );

                }


                message.textContent =
                    "Login successful. Opening dashboard...";

                message.style.color =
                    "#198754";


                setTimeout(
                    function () {

                        window.location.href =
                            "admin.html";

                    },
                    500
                );


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                message.textContent =
                    error.message ||
                    "Unable to sign in.";

                message.style.color =
                    "#c91418";

            }

        }
    );

});