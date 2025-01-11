import { Database, DefaultValue, Table } from "./typed-sqlite";

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

const postImages = new Table({ version: 1, name: 'postImages' }, {
    id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
    path: { type: 'TEXT' },
    postId: {
        type: 'INTEGER', foreignKey: {
            reference: {
                table: 'posts',
                column: 'id'
            }
        }
    }
})

const database = new Database([users, posts, postImages]);

const test = await database
    .from('users')
    .innerJoin('posts', '')
    // .innerJoin('postImages', '')
    .select(
        'AVG(users.salary) AS avgSalary',
        'users.name AS name',
        'posts.ownerId'
        // 'postImages.path',
        // 'COUNT(postImages.path) AS numberOfImages',
        // 'posts.ownerId',
        // '*'
    )
    // .groupBy('avgSalary')
    .orderBy('posts.ownerId ASC', 'name DESC')
    .execute();

    test.forEach(row => {
        row
    })

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
    .innerJoin('posts', '')
    .select(
        "users.id",
        "posts.id",
        "MAX(users.salary) AS maxSalary",
        "COUNT(posts.id)"
    )
    .execute();

const rows3 = await database
    .from("users")
    .select("MAX(users.salary) AS maxSalary", "COUNT(*) AS totalCount")
    .execute();

const rows4 = await database
    .from("users")
    .innerJoin('posts', "users.id = posts.ownerId")
    .select('*')
    .execute()