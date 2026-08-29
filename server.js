const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const orderRoutes = require("./backend/routes/orderRoutes");
const productRoutes = require("./backend/routes/productRoutes");

const app = express();
const rootDir = __dirname;
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(rootDir));

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

app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;