// import SQLyte from "./index.js";

// // Ví dụ định nghĩa bảng
// const users = SQLyte.createTableModel('users', {
//     id: { type: 'INTEGER', primaryKey: true, notNull: true },
//     name: { type: 'TEXT', notNull: true },
//     email: { type: 'TEXT', unique: true },
// });

// const orders = SQLyte.createTableModel('orders', {
//     id: { type: 'INTEGER', primaryKey: true, notNull: true },
//     user_id: {
//         type: 'INTEGER',
//         notNull: true,
//         foreignKey: {
//             referencedTable: 'users',
//             referencedColumn: 'id',
//             onDelete: 'CASCADE',
//             onUpdate: 'CASCADE',
//         },
//     },
//     total: { type: 'REAL', notNull: true },
// });

// // Tạo DB instance
// const db = await new SQLyte({ users, orders }).createDatabase('./db/database.db');

import sqlite3 from 'sqlite3';

// Khởi tạo database trong bộ nhớ
const db = new sqlite3.Database(':memory:');

// Tạo bảng mẫu và thêm dữ liệu
db.serialize(() => {
    db.run(`
        CREATE TABLE cards (
            number INTEGER,
            pin INTEGER,
            balance REAL,
            ownerId INTEGER
        )
    `);

    db.run(`INSERT INTO cards (number, pin, balance, ownerId) VALUES (123, 111, 1000.5, 1)`);
    db.run(`INSERT INTO cards (number, pin, balance, ownerId) VALUES (456, 222, 500.0, 2)`);

    // Thực thi truy vấn với trùng key
    db.all(`SELECT *, pin FROM cards`, (err, rows) => {
        if (err) throw err;

        console.log('Result without alias:', rows);
    });

    // Thực thi truy vấn với alias
    db.get(`SELECT *, pin AS extra_pin FROM cards`, (err, rows) => {
        if (err) throw err;

        console.log('Result with alias:', rows);
    });

    db.all(`SELECT COUNT(*) FROM cards`, (err, rows) => {
        if (err) throw err;

        console.log('Result select count(*) with db.all:', rows);
    });
});

// Đóng kết nối
db.close();