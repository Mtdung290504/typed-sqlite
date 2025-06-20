class Database {
    from(tableName) {
        return new QueryBuilder(tableName);
    }

    insertInto(tableName, columns) {
        return new InsertBuilder(tableName, columns);
    }

    update(tableName) {
        return new UpdateBuilder(tableName);
    }

    deleteFrom(tableName) {
        return new DeleteBuilder(tableName);
    }

    executeRawQuery(sql) {
        console.log("Executing SQL Query:", sql);
        return [];
    }

    executeRawUpdate(sql) {
        console.log("Executing SQL Update:", sql);
        return true;
    }
}

class QueryBuilder {
    constructor(tableName) {
        this._table = tableName;
        this._selectColumns = [];
        this._joins = [];
        this._conditions = "";
        this._groupBy = "";
        this._having = "";
        this._order = "";
        this._limitOffset = "";
    }

    select(...columns) {
        this._selectColumns = columns;
        return this;
    }

    selectDistinct(...columns) {
        this._selectColumns = columns;
        this._distinct = true;
        return this;
    }

    innerJoin(tableName, onCondition) {
        this._joins.push(`INNER JOIN ${tableName} ON ${onCondition}`);
        return this;
    }

    leftJoin(tableName, onCondition) {
        this._joins.push(`LEFT JOIN ${tableName} ON ${onCondition}`);
        return this;
    }

    crossJoin(tableName) {
        this._joins.push(`CROSS JOIN ${tableName}`);
        return this;
    }

    where(condition) {
        this._conditions = condition;
        return this;
    }

    groupBy(...columns) {
        this._groupBy = `GROUP BY ${columns.join(", ")}`;
        return this;
    }

    having(condition) {
        this._having = `HAVING ${condition}`;
        return this;
    }

    orderBy(...columns) {
        this._order = `ORDER BY ${columns.join(", ")}`;
        return this;
    }

    limit(count, offset) {
        this._limitOffset = `LIMIT ${count}`;
        if (offset) {
            this._limitOffset += ` OFFSET ${offset}`;
        }
        return this;
    }

    union(queryBuilder) {
        this._unionQuery = queryBuilder.exportToSql();
        return this;
    }

    unionAll(queryBuilder) {
        this._unionAllQuery = queryBuilder.exportToSql();
        return this;
    }

    exportToSql() {
        const selectClause = this._selectColumns.length ? this._selectColumns.join(", ") : "*";
        const sqlParts = [
            `SELECT ${this._distinct ? "DISTINCT " : ""}${selectClause} FROM ${this._table}`,
            ...this._joins,
            this._conditions ? `WHERE ${this._conditions}` : "",
            this._groupBy,
            this._having,
            this._order,
            this._limitOffset,
        ];

        let sql = sqlParts.filter(Boolean).join(" ");
        if (this._unionQuery) sql += ` UNION ${this._unionQuery}`;
        if (this._unionAllQuery) sql += ` UNION ALL ${this._unionAllQuery}`;

        return sql;
    }
}

class InsertBuilder {
    constructor(tableName, columns) {
        this._table = tableName;
        this._columns = columns;
    }

    exportToSql() {
        const columns = this._columns.join(", ");
        const placeholders = this._columns.map(() => "?").join(", ");
        return `INSERT INTO ${this._table} (${columns}) VALUES (${placeholders})`;
    }
}

class UpdateBuilder {
    constructor(tableName) {
        this._table = tableName;
        this._setCommands = [];
        this._conditions = "";
    }

    set(...commands) {
        this._setCommands = commands;
        return this;
    }

    where(condition) {
        this._conditions = condition;
        return this;
    }

    exportToSql() {
        const setClause = this._setCommands.join(", ");
        return `UPDATE ${this._table} SET ${setClause} ${this._conditions ? `WHERE ${this._conditions}` : ""}`;
    }
}

class DeleteBuilder {
    constructor(tableName) {
        this._table = tableName;
        this._conditions = "";
    }

    where(condition) {
        this._conditions = condition;
        return this;
    }

    exportToSql() {
        return `DELETE FROM ${this._table} ${this._conditions ? `WHERE ${this._conditions}` : ""}`;
    }
}

// Example Usage
const db = new Database();

// Query Example
const query = db
    .from("users")
    .select("id", "name", "email")
    .where("age > 18")
    .orderBy("name ASC")
    .limit(10)
    .exportToSql();
console.log("Generated Query SQL:", query);

// Insert Example
const insert = db.insertInto("users", ["name", "email", "age"]).exportToSql();
console.log("Generated Insert SQL:", insert);

// Update Example
const update = db
    .update("users")
    .set("name = 'John Doe'", "email = 'john@example.com'")
    .where("id = 1")
    .exportToSql();
console.log("Generated Update SQL:", update);

// Delete Example
const del = db.deleteFrom("users").where("id = 1").exportToSql();
console.log("Generated Delete SQL:", del);