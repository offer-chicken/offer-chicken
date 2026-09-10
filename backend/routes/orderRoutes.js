const express = require("express");
const supabase = require("../config/supabase");
const { saveShopOrder } = require("../utils/orders");
const { mergeOrders, updateLocalOrderStatus } = require("../utils/localStore");

const router = express.Router();


/* =========================
   CREATE ORDER
   POST /api/orders
========================= */

router.post("/", async (req, res) => {

    try {

        const order = req.body;

        const savedOrder = await saveShopOrder(order, {
            paymentStatus: order.paymentMethod === "online" ? "paid" : "cod"
        });

        res.status(201).json({
            success: true,
            message: "Order saved successfully",
            order: savedOrder
        });

    } catch (error) {

        console.error(
            "Order Server Error:",
            error
        );

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });

    }

});


/* =========================
   GET ALL ORDERS
   GET /api/orders
========================= */

router.get("/", async (req, res) => {

    try {

        const {
            data,
            error
        } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Supabase Fetch Error:",
                error
            );

            return res.json({
                success: true,
                orders: mergeOrders([])
            });

        }


        res.json({

            success: true,

            orders: mergeOrders(data || [])

        });

    } catch (error) {

        console.error(
            "Fetch Orders Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });

    }

});



/* =========================
   UPDATE ORDER STATUS
   PUT /api/orders/:id/status
========================= */

router.put("/:id/status", async (req, res) => {

    try {

        const orderId =
            req.params.id;

        const status =
            req.body.status;


        const allowedStatuses = [
            "Order Placed",
            "Confirmed",
            "Preparing",
            "Out for Delivery",
            "Delivered"
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid order status"
            });

        }


        const {
            data,
            error
        } = await supabase
            .from("orders")
            .update({
                status: status
            })
            .eq("id", orderId)
            .select()
            .single();


        if (error) {

            console.error(
                "Status Update Error:",
                error
            );

            const localOrder = updateLocalOrderStatus(orderId, status);

            if (localOrder) {
                return res.json({
                    success: true,
                    message: "Order status updated successfully",
                    order: localOrder
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update order status"
            });

        }


        if (!data) {
            const localOrder = updateLocalOrderStatus(orderId, status);

            if (localOrder) {
                return res.json({
                    success: true,
                    message: "Order status updated successfully",
                    order: localOrder
                });
            }

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order status updated successfully",
            order: data
        });

    } catch (error) {

        console.error(
            "Status Server Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });

    }

});


module.exports = router;
