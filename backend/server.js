const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");

const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
const rootDir = path.join(__dirname, "..");
const PORT = process.env.PORT || 5000;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());

app.use(express.static(rootDir));


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

    res.sendFile(path.join(rootDir, "index.html"));

});

app.get("/admin", (req, res) => {
    res.redirect("/admin/dashboard");
});

app.get("/admin/dashboard", (req, res) => {
    res.sendFile(path.join(rootDir, "admin.html"));
});

app.get("/admin-login", (req, res) => {
    res.sendFile(path.join(rootDir, "admin-login.html"));
});


/* =========================
   ORDER ROUTES
========================= */

app.use(
    "/api/orders",
    orderRoutes
);


/* =========================
   PRODUCT ROUTES
========================= */

app.use(
    "/api/products",
    productRoutes
);


/* =========================
   START SERVER
========================= */

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `Server running at http://localhost:${PORT}`
        );
    });
}

module.exports = app;