const express = require("express");
const supabase = require("../config/supabase");
const { isPaidOrder, parsePaymentMethod } = require("../utils/orders");
const { mergeOrders } = require("../utils/localStore");

const router = express.Router();

function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function monthLabel(date) {
    return date.toLocaleString("en-IN", {
        month: "short",
        year: "numeric"
    });
}

/* =========================
   MONTHLY REVENUE REPORT
   GET /api/reports/monthly
========================= */

router.get("/monthly", async function (req, res) {
    try {
        const now = new Date();
        const year = Number(req.query.year) || now.getFullYear();
        const month = Number(req.query.month) || (now.getMonth() + 1);

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Monthly report fetch error:", error);
        }

        const orders = mergeOrders(error ? [] : (data || []));
        const buckets = {};

        for (let index = 11; index >= 0; index -= 1) {
            const date = new Date(year, month - 1 - index, 1);
            const key = monthKey(date);

            buckets[key] = {
                key: key,
                label: monthLabel(date),
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                orderCount: 0,
                revenue: 0,
                codRevenue: 0,
                onlineRevenue: 0
            };
        }

        const selectedKey = year + "-" + String(month).padStart(2, "0");
        const selectedOrders = [];

        orders.forEach(function (order) {
            if (!isPaidOrder(order)) {
                return;
            }

            const created = new Date(order.created_at);

            if (isNaN(created.getTime())) {
                return;
            }

            const key = monthKey(created);
            const total = Number(order.total || 0);
            const payment = parsePaymentMethod(order.payment_method);

            if (buckets[key]) {
                buckets[key].orderCount += 1;
                buckets[key].revenue += total;

                if (payment.method === "online") {
                    buckets[key].onlineRevenue += total;
                } else {
                    buckets[key].codRevenue += total;
                }
            }

            if (key === selectedKey) {
                selectedOrders.push(order);
            }
        });

        const months = Object.keys(buckets).map(function (key) {
            const item = buckets[key];

            return {
                ...item,
                revenue: Math.round(item.revenue),
                codRevenue: Math.round(item.codRevenue),
                onlineRevenue: Math.round(item.onlineRevenue)
            };
        });

        const selected = months.find(function (item) {
            return item.key === selectedKey;
        }) || {
            key: selectedKey,
            label: monthLabel(new Date(year, month - 1, 1)),
            year: year,
            month: month,
            orderCount: 0,
            revenue: 0,
            codRevenue: 0,
            onlineRevenue: 0
        };

        return res.json({
            success: true,
            selected: selected,
            months: months,
            orders: selectedOrders
        });
    } catch (error) {
        console.error("Monthly report error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;
