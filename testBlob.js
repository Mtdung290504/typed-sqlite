import sqlite3 from 'sqlite3';

// Tạo database SQLite trong bộ nhớ
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    // Tạo bảng với cột BLOB
    db.run("CREATE TABLE test_blob (id INTEGER, data BLOB)");

    // Chèn dữ liệu BLOB (dưới dạng Buffer trong Node.js)
    const buffer = Buffer.from("Hello, this is a test BLOB!", "utf8");
    db.run("INSERT INTO test_blob (id, data) VALUES (?, ?)", [1, buffer], function (err) {
        if (err) {
            return console.error("Error inserting BLOB:", err.message);
        }
        console.log("Inserted BLOB with ID:", this.lastID);
    });

    // Truy vấn lại giá trị từ cột BLOB
    db.get("SELECT id, data FROM test_blob WHERE id = 1", (err, row) => {
        if (err) {
            return console.error("Error fetching BLOB:", err.message);
        }
        console.log("Retrieved row:", row);
        console.log(row.data instanceof Buffer);
        // Kiểm tra kiểu dữ liệu trả về
        if (Buffer.isBuffer(row.data)) {
            console.log("The 'data' column is a Buffer in Node.js!");
        } else {
            console.log("The 'data' column is NOT a Buffer. It is:", typeof row.data);
        }

        // // In nội dung BLOB nếu là Buffer
        // if (Buffer.isBuffer(row.data)) {
        //     console.log("Content of BLOB:", row.data.toString("utf8"));
        // }
    });
});

// Đóng database khi hoàn tất
db.close();