import sqlite3 from 'sqlite3';

/**
 * @typedef {"INTEGER" | "REAL" | "TEXT" | "BLOB" | "NUMERIC"} SQLiteTableTypes
 */

/**
 * @typedef {Object} ForeignKeyDefinition
 * @property {string} referencedTable Tên bảng tham chiếu
 * @property {string} referencedColumn Tên cột tham chiếu
 * @property {"CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"} [onDelete] Hành động khi xóa dòng liên quan
 * @property {"CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"} [onUpdate] Hành động khi cập nhật dòng liên quan
 */

/**
 * @typedef {Object} ColumnDefinition
 * @property {SQLiteTableTypes} type Kiểu dữ liệu của cột
 * @property {boolean} [notNull] Cột này có bắt buộc không
 * @property {boolean} [primaryKey] Cột này có phải khóa chính không
 * @property {boolean} [unique] Cột này có phải duy nhất không
 * @property {any} [defaultValue] Giá trị mặc định của cột
 * @property {ForeignKeyDefinition} [foreignKey] Định nghĩa khóa ngoại
 */

/**
 * @template {{ [tableName: string]: Table<string, { [columnName: string]: ColumnDefinition }> }} TableSchema
 */
export default class SQLyte {
    /**
     * @private
     * @type {sqlite3.Database}
     */
    _sqlite;

    /**
     * @param {TableSchema} tableSchema - Object với key là tên bảng, value là bảng được tạo từ phương thức static `SQLyte.createTable`
     */
    constructor(tableSchema) {
        this.tableSchema = tableSchema;
    }

    /**
     * @param {string} filepath 
     */
    async createDatabase(filepath) {
        this._sqlite = new sqlite3.Database(filepath);
        const buildQueries = Object.values(this.tableSchema).map(table => table.exportSQL());
        for (const query of buildQueries) {
            await new Promise((resolve, reject) => {
                this._sqlite.run(query, (err) => err ? reject(err) : resolve());
            });
        }
        return this;
    }

    /**
     * @template {string} TableName
     * @template {{ [column: string]: ColumnDefinition }} Fields
     * @param {TableName} name
     * @param {Fields} fields
     * @returns {Table<TableName, Fields>}
     */
    static createTable(name, fields) {
        return new Table(name, fields);
    }

    /**
     * Bắt đầu một truy vấn bằng cách chỉ định bảng
     * @param {string} tableName 
     * @returns {QueryBuilder}
     */
    from(tableName) {
        return new QueryBuilder(this._sqlite, tableName);
    }
}

/**
 * Lớp QueryBuilder để xây dựng và thực thi các truy vấn SQL
 */
class QueryBuilder {
    /**
     * @param {sqlite3.Database} sqlite
     * @param {string} tableName
     */
    constructor(sqlite, tableName) {
        this._sqlite = sqlite;
        this._tableName = tableName;
        this._columns = '*'; // Mặc định là tất cả các cột
        this._conditions = [];
        this._joins = [];
        this._orderBy = '';
        this._limit = null;
    }

    /**
     * Chọn các cột cần truy vấn
     * @param  {...string} columns 
     * @returns {QueryBuilder}
     */
    select(...columns) {
        this._columns = columns.length ? columns.join(', ') : '*';
        return this;
    }

    /**
     * Thêm điều kiện WHERE
     * @param {string} condition 
     * @param {any[]} [params] 
     * @returns {QueryBuilder}
     */
    where(condition, params = []) {
        this._conditions.push({ condition, params });
        return this;
    }

    /**
     * Thêm điều kiện JOIN
     * @param {string} table 
     * @param {string} onCondition 
     * @returns {QueryBuilder}
     */
    join(table, onCondition) {
        this._joins.push(`JOIN ${table} ON ${onCondition}`);
        return this;
    }

    /**
     * Sắp xếp kết quả
     * @param {string} column 
     * @param {"ASC" | "DESC"} [direction="ASC"]
     * @returns {QueryBuilder}
     */
    orderBy(column, direction = 'ASC') {
        this._orderBy = `ORDER BY ${column} ${direction}`;
        return this;
    }

    /**
     * Giới hạn số lượng kết quả trả về
     * @param {number} limit 
     * @returns {QueryBuilder}
     */
    limit(limit) {
        this._limit = `LIMIT ${limit}`;
        return this;
    }

    /**
     * Thực thi truy vấn và trả về kết quả
     * @returns {Promise<any[]>}
     */
    execute() {
        const whereClause = this._conditions.length
            ? `WHERE ${this._conditions.map(c => c.condition).join(' AND ')}`
            : '';
        const query = `
            SELECT ${this._columns}
            FROM ${this._tableName}
            ${this._joins.join(' ')}
            ${whereClause}
            ${this._orderBy}
            ${this._limit || ''}
        `.trim();

        const params = this._conditions.flatMap(c => c.params);

        return new Promise((resolve, reject) => {
            this._sqlite.all(query, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
}

/**
 * @template {string} Name
 * @template {{ [columnName: string]: ColumnDefinition }} Fields
 */
class Table {
    /**
     * @param {Name} name - Tên bảng
     * @param {Fields} fields - Định nghĩa các cột của bảng
     */
    constructor(name, fields) {
        this.name = name;
        this.fields = fields;
    }

    /**
     * Trả về lệnh SQL để tạo bảng
     * @returns {string}
     */
    exportSQL() {
        const columnsSQL = Object.entries(this.fields)
            .map(([column, definition]) => {
                const constraints = [
                    definition.notNull ? "NOT NULL" : "",
                    definition.primaryKey ? "PRIMARY KEY" : "",
                    definition.unique ? "UNIQUE" : "",
                    definition.defaultValue !== undefined ? `DEFAULT ${JSON.stringify(definition.defaultValue)}` : "",
                    definition.foreignKey
                        ? `REFERENCES ${definition.foreignKey.referencedTable}(${definition.foreignKey.referencedColumn})` +
                        (definition.foreignKey.onDelete ? ` ON DELETE ${definition.foreignKey.onDelete}` : "") +
                        (definition.foreignKey.onUpdate ? ` ON UPDATE ${definition.foreignKey.onUpdate}` : "")
                        : "",
                ].filter(Boolean).join(" ");
                return `${column} ${definition.type} ${constraints}`;
            })
            .join(", ");
        return `CREATE TABLE IF NOT EXISTS ${this.name} (${columnsSQL});`;
    }
}