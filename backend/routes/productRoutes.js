const express = require("express");
const supabase = require("../config/supabase");
const {
    attachStock,
    adjustStock,
    getRecentMovements,
    isLedgerProduct
} = require("../utils/inventory");
const { detectSchemaFlags } = require("../utils/schema");

const router = express.Router();


/* =========================
   STOCK MOVEMENT HISTORY
   GET /api/products/stock-movements
========================= */

router.get("/stock-movements", async (req, res) => {

    try {

        const movements = await getRecentMovements(80);

        res.json({
            success: true,
            movements: movements
        });

    } catch (error) {

        console.error("Stock movements error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load stock movements"
        });

    }

});


/* =========================
   GET ALL PRODUCTS
========================= */

router.get("/", async (req, res) => {

    try {

        const {
            data,
            error
        } = await supabase
            .from("products")
            .select("*")
            .order("created_at", {
                ascending: true
            });


        if (error) {

            console.error(
                "Supabase Product Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to fetch products"
            });

        }

        const products = await attachStock(data || []);

        res.json({
            success: true,
            products: products
        });

    } catch (error) {

        console.error(
            "Product Server Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }

});


/* =========================
   CREATE PRODUCT
========================= */

router.post("/", async (req, res) => {

    try {

        const {
            name,
            category,
            price,
            image,
            description,
            available,
            stock
        } = req.body;

        if (!name || !category) {
            return res.status(400).json({
                success: false,
                message: "Product name and category are required"
            });
        }

        const flags = await detectSchemaFlags();

        const productRow = {
            name: name,
            category: category,
            price: Number(price || 0),
            image: image || "",
            description: description || "",
            available: available !== false
        };

        if (flags.hasStockColumn) {
            productRow.stock = Number(stock || 0);
        }

        const {
            data,
            error
        } = await supabase
            .from("products")
            .insert([productRow])
            .select()
            .single();

        if (error) {
            console.error("Supabase Product Create Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to add product"
            });
        }

        if (!flags.hasStockColumn && Number(stock) > 0) {
            await adjustStock(data.id, "in", Number(stock), "Opening stock");
            data.stock = Number(stock);
        }

        res.status(201).json({
            success: true,
            message: "Product added successfully",
            product: data
        });

    } catch (error) {

        console.error("Product Create Error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });

    }

});


/* =========================
   STOCK IN / STOCK OUT
   POST /api/products/:id/stock
========================= */

router.post("/:id/stock", async (req, res) => {

    try {

        const productId = req.params.id;
        const type = String(req.body.type || "").toLowerCase();
        const quantity = Number(req.body.quantity);
        const note = String(req.body.note || "").trim();

        const result = await adjustStock(
            productId,
            type,
            quantity,
            note
        );

        res.json({
            success: true,
            message: type === "in"
                ? "Stock added successfully"
                : "Stock reduced successfully",
            stock: result.stock,
            product: result.product
        });

    } catch (error) {

        console.error("Stock movement error:", error);

        res.status(400).json({
            success: false,
            message: error.message || "Unable to update stock"
        });

    }

});


/* =========================
   UPDATE PRODUCT
========================= */

router.put("/:id", async (req, res) => {

    try {

        const productId =
            req.params.id;

        const {
            name,
            category,
            price,
            image,
            description,
            available
        } = req.body;


        const {
            data,
            error
        } = await supabase
            .from("products")
            .update({
                name: name,
                category: category,
                price: Number(price),
                image: image,
                description: description,
                available: Boolean(available)
            })
            .eq("id", productId)
            .select()
            .single();


        if (error) {

            console.error(
                "Supabase Product Update Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to update product"
            });

        }

        if (isLedgerProduct(data)) {
            return res.status(400).json({
                success: false,
                message: "System inventory record cannot be edited here"
            });
        }


        res.json({
            success: true,
            message: "Product updated successfully",
            product: data
        });

    } catch (error) {

        console.error(
            "Product Update Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }

});


module.exports = router;
