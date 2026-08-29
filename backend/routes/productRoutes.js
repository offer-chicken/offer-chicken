const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();


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


        res.json({
            success: true,
            products: data || []
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