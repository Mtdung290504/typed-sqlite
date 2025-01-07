import { Database, QueryBuilder, Table } from "./typed-sqlite";

const users = new Table({ version: 1, name: "users" }, {
    id: { type: "INTEGER", primaryKey: true },
    age: { type: "INTEGER" },
    salary: { type: "REAL" },
    name: { type: "TEXT" },
});

const posts = new Table({ version: 1, name: 'posts' }, {
    id: { type: "INTEGER", primaryKey: true, autoIncrement: true },
    ownerId: { type: "INTEGER", foreignKey: {
        reference: {
            table: 'users',
            column: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'SET NULL',
    } }
}, { createIfNotExist: true });

const database = new Database([users, posts]);
const queryBuilder = new QueryBuilder(database.getTable('users'));

queryBuilder.select('COUNT(*) AS totalUsers').forEach(row => {})
queryBuilder.select('users.id AS UID', 'users.name AS name').forEach(row => {})
queryBuilder.select('AVG(users.salary) AS avgSalary').forEach(row => {})