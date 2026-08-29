const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();


/* =========================
   CREATE ORDER
   POST /api/orders
========================= */

router.post("/", async (req, res) => {

    try {

        const order = req.body;


        if (!order) {

            return res.status(400).json({
                success: false,
                message: "Order data is required"
            });

        }


        if (
            !order.customer ||
            !Array.isArray(order.items) ||
            order.items.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Customer details and cart items are required"
            });

        }


        if (
            !order.customer.name ||
            !order.customer.phone ||
            !order.customer.address ||
            !order.customer.city ||
            !order.customer.pincode
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Complete customer details are required"
            });

        }


        const orderId =
            "MS-" + Date.now();


        const orderRow = {

            order_id: orderId,

            customer_name:
                order.customer.name,

            customer_phone:
                order.customer.phone,

            customer_address:
                order.customer.address,

            customer_city:
                order.customer.city,

            customer_pincode:
                order.customer.pincode,

            payment_method:
                order.paymentMethod || "cod",

            items:
                order.items,

            subtotal:
                Number(order.subtotal || 0),

            delivery:
                Number(order.delivery || 0),

            total:
                Number(order.total || 0),

            status:
                "Order Placed"

        };


        const {
            data,
            error
        } = await supabase
            .from("orders")
            .insert([orderRow])
            .select()
            .single();


        if (error) {

            console.error(
                "Supabase Order Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to save order to database"
            });

        }


        console.log(
            "Order saved to Supabase:",
            data.order_id
        );


        res.status(201).json({

            success: true,

            message:
                "Order saved successfully",

            order: {

                orderId:
                    data.order_id,

                customer: {

                    name:
                        data.customer_name,

                    phone:
                        data.customer_phone,

                    address:
                        data.customer_address,

                    city:
                        data.customer_city,

                    pincode:
                        data.customer_pincode

                },

                paymentMethod:
                    data.payment_method,

                items:
                    data.items,

                subtotal:
                    Number(data.subtotal),

                delivery:
                    Number(data.delivery),

                total:
                    Number(data.total),

                status:
                    data.status,

                createdAt:
                    data.created_at

            }

        });

    } catch (error) {

        console.error(
            "Order Server Error:",
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

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch orders"
            });

        }


        res.json({

            success: true,

            orders:
                data || []

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

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update order status"
            });

        }


        res.json({

            success: true,

            message:
                "Order status updated successfully",

            order:
                data

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