const SUPABASE_URL = "https://oobdmxipmztbsbhtlggt.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYmRteGlwbXp0YnNiaHRsZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjM2NzQsImV4cCI6MjEwMjc5OTY3NH0.vw1d1BTfkaj_RvsHo0hj5L7w308m4H9iX8FKUX6MILI";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const loginForm =
            document.getElementById(
                "admin-login-form"
            );

        const emailInput =
            document.getElementById(
                "admin-email"
            );

        const passwordInput =
            document.getElementById(
                "admin-password"
            );

        const message =
            document.getElementById(
                "login-message"
            );


        // Make sure the login form exists
        if (!loginForm) {

            console.error(
                "Admin login form was not found."
            );

            return;
        }


        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;


                // Basic validation
                if (!email) {

                    message.textContent =
                        "Please enter your email.";

                    message.style.color =
                        "#c91418";

                    emailInput.focus();

                    return;
                }


                if (!password) {

                    message.textContent =
                        "Please enter your password.";

                    message.style.color =
                        "#c91418";

                    passwordInput.focus();

                    return;
                }


                message.textContent =
                    "Signing in...";

                message.style.color =
                    "#555";


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signInWithPassword({

                                email: email,

                                password: password

                            });


                    // Supabase login error
                    if (error) {

                        throw error;

                    }


                    // Make sure session exists
                    if (!data || !data.session) {

                        throw new Error(
                            "Login session was not created."
                        );

                    }


                    console.log(
                        "Admin login successful."
                    );


                    message.textContent =
                        "Login successful. Opening dashboard...";

                    message.style.color =
                        "#198754";


                    // Open admin dashboard
                    setTimeout(
                        function () {

                            window.location.href =
                                "/admin/admin.html";

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

    }
);