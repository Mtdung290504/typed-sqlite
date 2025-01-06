import typedSqlite from "./typed-sqlite";

const users = new typedSqlite.Table(1, 'users', {
    id: { type: "INTEGER", primaryKey: true },
    name: { type: "TEXT", notNull: true },
    email: { type: "TEXT", unique: true },
});

const posts= new typedSqlite.Table(1, "posts", {
    id: { type: "INTEGER", primaryKey: true },
    owner: { type: "INTEGER", foreignKey: {
        reference: {
            table: 'users',
            column: 'id'
        }
    }}
});

const db = new typedSqlite.Database(users, posts);

const rows = db.getTable('users').select('users.email AS email', 'users.id');

rows.forEach(row => {
    console.log(row['users.id'], row.email);
})