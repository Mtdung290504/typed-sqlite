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
    static createTableModel(name, fields) {
        return new Table(name, fields);
    }
}

/**
 * @template Table
 */
class QueryBuilder {
    constructor() {
        
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