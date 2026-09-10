const fs = require("fs");
const path = require("path");

const storePath = path.join(__dirname, "..", "data", "local-store.json");

function emptyStore() {
    return {
        orders: [],
        stock: {},
        movements: []
    };
}

function readStore() {
    try {
        if (!fs.existsSync(storePath)) {
            return emptyStore();
        }

        const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));

        return {
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
            stock: parsed.stock && typeof parsed.stock === "object"
                ? parsed.stock
                : {},
            movements: Array.isArray(parsed.movements) ? parsed.movements : []
        };
    } catch (error) {
        console.error("Local store read error:", error);
        return emptyStore();
    }
}

function writeStore(store) {
    const folder = path.dirname(storePath);

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    fs.writeFileSync(
        storePath,
        JSON.stringify(store, null, 2),
        "utf8"
    );
}

function saveLocalOrder(orderRow, formattedOrder) {
    const store = readStore();
    const localRow = {
        id: "local-" + Date.now(),
        ...orderRow,
        created_at: new Date().toISOString()
    };

    store.orders.unshift(localRow);
    writeStore(store);

    console.log("Order saved to local store:", localRow.order_id);

    return {
        ...formattedOrder,
        orderId: localRow.order_id,
        createdAt: localRow.created_at
    };
}

function listLocalOrders() {
    return readStore().orders;
}

function updateLocalOrderStatus(orderId, status) {
    const store = readStore();
    const order = store.orders.find(function (item) {
        return String(item.id) === String(orderId);
    });

    if (!order) {
        return null;
    }

    order.status = status;
    writeStore(store);
    return order;
}

function getLocalStock(productId) {
    const store = readStore();
    const key = String(productId);
    return store.stock[key] === undefined ? null : Number(store.stock[key]);
}

function setLocalStock(productId, nextStock, type, quantity, note) {
    const store = readStore();
    const key = String(productId);

    store.stock[key] = nextStock;
    store.movements.unshift({
        productId: key,
        type: type,
        quantity: quantity,
        note: note || "",
        createdAt: new Date().toISOString()
    });
    store.movements = store.movements.slice(0, 300);
    writeStore(store);

    return nextStock;
}

function listLocalMovements() {
    return readStore().movements;
}

function mergeOrders(remoteOrders) {
    const localOrders = listLocalOrders();
    const seen = {};
    const merged = [];

    localOrders.concat(remoteOrders || []).forEach(function (order) {
        const key = String(order.order_id || order.id);

        if (seen[key]) {
            return;
        }

        seen[key] = true;
        merged.push(order);
    });

    merged.sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return merged;
}

module.exports = {
    saveLocalOrder,
    listLocalOrders,
    updateLocalOrderStatus,
    getLocalStock,
    setLocalStock,
    listLocalMovements,
    mergeOrders
};
