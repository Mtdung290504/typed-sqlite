import { Database, Table } from "./typed-sqlite";

const users = new Table({ version: 1, name: "users" }, {
    id: { type: "INTEGER", primaryKey: true },
    age: { type: "INTEGER" },
    salary: { type: "REAL" },
    name: { type: "TEXT" },
});

const posts = new Table({ version: 1, name: 'posts' }, {
    id: { type: "INTEGER", primaryKey: true, autoIncrement: true },
    ownerId: {
        type: "INTEGER", foreignKey: {
            reference: {
                table: 'users',
                column: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'SET NULL',
        }
    }
}, { createIfNotExist: true });

const database = new Database([users, posts]);

const rows1 = await database
    .from("users")
    .select(
        "users.id AS UID",
        "users.salary",
        "MAX(users.salary) AS maxSalary"
    )
    .execute();

const rows2 = await database
    .from("users")
    .join(posts, "users.id = posts.ownerId")
    .select(
        "users.id",
        "posts.id",
        "MAX(users.salary) AS maxSalary",
        "COUNT(posts.ownerId)"
    )
    .execute();

const rows3 = await database
    .from("users")
    .select("MAX(users.salary) AS maxSalary", "COUNT(*) AS totalCount")
    .execute();

const rows4 = await database
    .from("users")
    // .join(posts, "users.id = posts.ownerId")
    .select('*')
    .execute()