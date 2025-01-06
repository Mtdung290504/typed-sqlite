import SQLyte from "./index.js";

// Ví dụ định nghĩa bảng
const users = SQLyte.createTableModel('users', {
    id: { type: 'INTEGER', primaryKey: true, notNull: true },
    name: { type: 'TEXT', notNull: true },
    email: { type: 'TEXT', unique: true },
});

const orders = SQLyte.createTableModel('orders', {
    id: { type: 'INTEGER', primaryKey: true, notNull: true },
    user_id: {
        type: 'INTEGER',
        notNull: true,
        foreignKey: {
            referencedTable: 'users',
            referencedColumn: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    total: { type: 'REAL', notNull: true },
});

// Tạo DB instance
const db = await new SQLyte({ users, orders }).createDatabase('./db/database.db');