const supabase = require("../config/supabase");
const { detectSchemaFlags } = require("./schema");
const {
    getLocalStock,
    setLocalStock,
    listLocalMovements
} = require("./localStore");

const LEDGER_NAME = "__INVENTORY_LEDGER__";

function roundStock(value) {
    return Math.round((Number(value) || 0) * 1000) / 1000;
}

function parseItemQuantity(item) {
    const quantity = Number(item.quantity || item.qty || 1);

    const weight = String(item.weight || "1");
    const match = weight.match(/(\d+(?:\.\d+)?)/);
    const unitSize = match ? Number(match[1]) : 1;

    return roundStock(quantity * unitSize);
}

function parseLedger(description) {
    try {
        const parsed = JSON.parse(description || "{}");

        return {
            products: parsed.products && typeof parsed.products === "object"
                ? parsed.products
                : {},
            movements: Array.isArray(parsed.movements)
                ? parsed.movements
                : []
        };
    } catch (error) {
        console.error("Inventory ledger parse error:", error);

        return {
            products: {},
            movements: []
        };
    }
}

async function getLedgerRow() {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("name", LEDGER_NAME)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

async function saveLedger(ledger, existingRow) {
    const payload = {
        name: LEDGER_NAME,
        category: "system",
        price: 0,
        image: "",
        description: JSON.stringify(ledger),
        available: false
    };

    if (existingRow && existingRow.id) {
        const { data, error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", existingRow.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    const { data, error } = await supabase
        .from("products")
        .insert([payload])
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

function recordMovement(ledger, productId, type, quantity, note) {
    ledger.movements.unshift({
        productId: String(productId),
        type: type,
        quantity: roundStock(quantity),
        note: note || "",
        createdAt: new Date().toISOString()
    });

    ledger.movements = ledger.movements.slice(0, 300);

    return ledger;
}

async function getStockMap(products) {
    const flags = await detectSchemaFlags();
    const stockMap = {};

    if (flags.hasStockColumn) {
        (products || []).forEach(function (product) {
            stockMap[String(product.id)] = roundStock(product.stock);
        });

        return stockMap;
    }

    const ledgerRow = await getLedgerRow();
    const ledger = parseLedger(ledgerRow ? ledgerRow.description : "{}");

    Object.keys(ledger.products).forEach(function (productId) {
        stockMap[String(productId)] = roundStock(
            ledger.products[productId].stock
        );
    });

    (products || []).forEach(function (product) {
        const localStock = getLocalStock(product.id);

        if (localStock !== null) {
            stockMap[String(product.id)] = roundStock(localStock);
        }
    });

    return stockMap;
}

async function attachStock(products) {
    const visibleProducts = (products || []).filter(function (product) {
        return product.name !== LEDGER_NAME;
    });

    const stockMap = await getStockMap(visibleProducts);

    return visibleProducts.map(function (product) {
        const trackedStock = stockMap[String(product.id)];

        return {
            ...product,
            stock: trackedStock === undefined ? null : trackedStock
        };
    });
}

async function adjustStock(productId, type, quantity, note) {
    const amount = roundStock(quantity);

    if (!productId) {
        throw new Error("Product id is required");
    }

    if (type !== "in" && type !== "out") {
        throw new Error("Stock movement type must be in or out");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Quantity must be greater than 0");
    }

    function applyLocalStock() {
        const currentStock = roundStock(getLocalStock(productId) || 0);
        const nextStock = type === "in"
            ? roundStock(currentStock + amount)
            : roundStock(currentStock - amount);

        if (nextStock < 0) {
            throw new Error("Not enough stock for this product");
        }

        setLocalStock(productId, nextStock, type, amount, note);

        return {
            product: {
                id: productId,
                stock: nextStock
            },
            stock: nextStock,
            type: type,
            quantity: amount
        };
    }

    const flags = await detectSchemaFlags();

    if (flags.hasStockColumn) {
        const { data: product, error: productError } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

        if (productError || !product) {
            return applyLocalStock();
        }

        const currentStock = roundStock(product.stock);
        const nextStock = type === "in"
            ? roundStock(currentStock + amount)
            : roundStock(currentStock - amount);

        if (nextStock < 0) {
            throw new Error("Not enough stock for this product");
        }

        const { data, error } = await supabase
            .from("products")
            .update({
                stock: nextStock,
                available: nextStock > 0 ? true : product.available
            })
            .eq("id", productId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (flags.hasStockMovementsTable) {
            const { error: movementError } = await supabase
                .from("stock_movements")
                .insert([{
                    product_id: productId,
                    movement_type: type,
                    quantity: amount,
                    note: note || ""
                }]);

            if (movementError) {
                console.error("Stock movement insert error:", movementError);
            }
        }

        return {
            product: data,
            stock: nextStock,
            type: type,
            quantity: amount
        };
    }

    const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

    if (productError || !product || product.name === LEDGER_NAME) {
        return applyLocalStock();
    }

    const ledgerRow = await getLedgerRow();
    const ledger = parseLedger(ledgerRow ? ledgerRow.description : "{}");
    const key = String(productId);
    const currentStock = roundStock(
        ledger.products[key] ? ledger.products[key].stock : 0
    );
    const nextStock = type === "in"
        ? roundStock(currentStock + amount)
        : roundStock(currentStock - amount);

    if (nextStock < 0) {
        throw new Error("Not enough stock for this product");
    }

    ledger.products[key] = {
        stock: nextStock,
        name: product.name
    };

    recordMovement(ledger, productId, type, amount, note);

    try {
        await saveLedger(ledger, ledgerRow);
    } catch (error) {
        console.error("Ledger save failed, using local stock store:", error);
        return applyLocalStock();
    }

    if (nextStock === 0 && product.available) {
        await supabase
            .from("products")
            .update({ available: false })
            .eq("id", productId);
    }

    if (type === "in" && nextStock > 0 && product.available === false) {
        await supabase
            .from("products")
            .update({ available: true })
            .eq("id", productId);
    }

    return {
        product: {
            ...product,
            stock: nextStock,
            available: nextStock > 0 ? true : false
        },
        stock: nextStock,
        type: type,
        quantity: amount
    };
}

async function deductOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    for (const item of items) {
        const productId = item.id || item.product_id;

        if (!productId) {
            continue;
        }

        const quantity = parseItemQuantity(item);

        if (quantity <= 0) {
            continue;
        }

        try {
            await adjustStock(
                productId,
                "out",
                quantity,
                "Order sale: " + (item.name || "item")
            );
        } catch (error) {
            console.error("Stock deduction skipped:", error.message || error);
        }
    }
}

async function getRecentMovements(limit) {
    const flags = await detectSchemaFlags();
    const maxItems = Number(limit) || 50;

    if (flags.hasStockMovementsTable) {
        const { data, error } = await supabase
            .from("stock_movements")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(maxItems);

        if (!error && data) {
            return data;
        }
    }

    let remoteMovements = [];

    try {
        const ledgerRow = await getLedgerRow();
        const ledger = parseLedger(ledgerRow ? ledgerRow.description : "{}");
        remoteMovements = ledger.movements;
    } catch (error) {
        console.error("Remote stock movements error:", error);
    }

    return listLocalMovements()
        .concat(remoteMovements)
        .slice(0, maxItems);
}

function isLedgerProduct(product) {
    return Boolean(product && product.name === LEDGER_NAME);
}

module.exports = {
    LEDGER_NAME,
    attachStock,
    adjustStock,
    deductOrderItems,
    getRecentMovements,
    isLedgerProduct,
    parseItemQuantity
};
