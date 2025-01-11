import typedSqlite from "./typed-sqlite";

const users = new typedSqlite.Table({ version: 1, name: 'users' }, {
    id: { type: "INTEGER", primaryKey: true },
    name: { type: "TEXT", notNull: true },
    email: { type: "TEXT", unique: true },
});

const posts = new typedSqlite.Table({ version: 1, name: "posts" }, {
    id: { type: "INTEGER", primaryKey: true },
    ownerID: {
        type: "INTEGER", 
        foreignKey: {
            reference: {
                table: 'users',
                column: 'id'
            }
        }
    }
}, { createIfNotExist: true });

const db = new typedSqlite.Database([users, posts]);

// const rows = db.getTable('users').select('users.email AS email', 'users.id', 'users.name');
// rows.forEach(row => {
//     console.log(row['users.id'], row.email);
// });

// const allPosts = db.getTable('posts').select('posts.id', 'posts.ownerID AS userID', );
// allPosts.forEach(row => {
//     console.log(row["posts.id"], row.userID);
// })