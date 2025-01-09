/**Kiểu dữ liệu của cột */
type Types = "INTEGER" | "REAL" | "TEXT" | "BLOB"

/**Tùy chọn xử lý khi tham chiếu foreign key được thay đổi/xóa  */
type OnColumnChangeOptions = "CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"

/**Tùy chọn collate của cột */
type CollateOptions = "BINARY" | "NOCASE" | "RTRIM"

/**Giá trị mặc định của cột, bao gồm chuỗi, số, null hoặc các hàm đặc biệt */
type DefaultValue = number | "CURRENT_TIMESTAMP" | "CURRENT_DATE" | "CURRENT_TIME" | null

type ForeignKey = {
    /**Bảng và tên cột tham chiếu */
    reference: {
        table: string
        column: string
    }

    /**Tùy chọn xử lý khi tham chiếu foreign key được update */
    onUpdate?: OnColumnChangeOptions | undefined

    /**Tùy chọn xử lý khi tham chiếu foreign key bị delete */
    onDelete?: OnColumnChangeOptions | undefined
}

type ColumnDefinition = {
    type: Types
    notNull?: boolean | undefined
    unique?: boolean | undefined
    primaryKey?: boolean | undefined
    autoIncrement?: boolean | undefined
    check?: string | undefined
    collate?: CollateOptions | undefined
    foreignKey?: ForeignKey | undefined
    defaultValue?: DefaultValue
}

export class Table<Name extends string, Columns extends Record<string, ColumnDefinition>> {
    /**Phiên bản schema của bảng, quyết định xem cơ sở dữ liệu nên được reset hay không */
    version: number;

    /**Tên bảng */
    name: Name;

    /**Các cột của bảng */
    columns: Columns;

    /**
     * Khởi tạo instance Table, dùng làm cơ sở cho database sqlite
     * @param metadata - Các dữ liệu cần thiết của bảng, gồm phiên bản và tên, khi thay đổi phiên bản, reset toàn bộ database
     * @param columns - Định nghĩa các cột của bảng
     * @param createOptions - Tùy chọn tạo bảng, gồm createIfNotExist
     */
    constructor(metadata: { version: number, name: Name }, columns: Columns, createOptions?: { createIfNotExist?: boolean })
}

export class Database<Tables extends Table<any, any>[]> {
    /** Tất cả các bảng */
    tables: {
        [K in Tables[number]as K["name"]]: K;
    };

    /**
     * Khởi tạo instance của Database
     * @param {typeof Tables} tables 
     */
    constructor(tables: Tables)

    /**
     * Khởi tạo database `sqlite3`
     * @param filename - Đường dẫn đến file .db
     * @param callback - Callback gọi khi có lỗi xảy ra trong quá trình tạo Database
     */
    createDatabase(filename: string, callback?: (err: Error | null) => void): typeof this

    /**
     * Khởi tạo database `sqlite3`
     * @param filename - Đường dẫn đến file .db
     * @param mode - Chế độ mở của database `sqlite3`
     * @param callback - Callback gọi khi có lỗi xảy ra trong quá trình tạo Database
     */
    createDatabase(filename: string, mode?: number, callback?: (err: Error | null) => void): typeof this

    /** Lấy về bảng theo tên */
    getTable<Name extends keyof this["tables"]>(name: Name): this["tables"][Name]
}

/**Query builders ------------------------------------------------------------------------------------------------------------ */

/**Map ánh xạ kiểu dữ liệu SQLite về JS */
type TypeMappingMap<T extends Types> = {
    "INTEGER": number
    "REAL": number
    "TEXT": string
    "BLOB": Blob
}[T]

/**Kiểu ánh xạ cột sang JS */
type ResolveColumnType<Column extends ColumnDefinition> = Column extends { type: infer T extends Types }
    ? TypeMappingMap<T>
    : never;

/** Danh sách các hàm SQL dành cho số */
type NumericSQLFunctions = "AVG" | "SUM" | "COUNT" | "MIN" | "MAX";

/** Kiểm tra xem cột có phải kiểu số (INTEGER hoặc REAL) không */
type IsNumericColumn<Column extends ColumnDefinition> =
    Column["type"] extends "INTEGER" | "REAL" ? true : false;

/** Hàm SQL hợp lệ trên các cột */
type SQLKey<
    Name extends string,
    Columns extends Record<string, ColumnDefinition>
> = {
    [K in keyof Columns & string]: IsNumericColumn<Columns[K]> extends true
    ? `${NumericSQLFunctions}(${Name}.${K})`
    : never;
}[keyof Columns & string];

/** Alias cho hàm SQL */
type SQLKeyWithAlias<
    Name extends string,
    Columns extends Record<string, ColumnDefinition>
> = `${SQLKey<Name, Columns>} AS ${string}`;

/** Alias cho cột */
type ColumnKeyWithAlias<
    Name extends string,
    Columns extends Record<string, ColumnDefinition>
> = `${Name}.${Extract<keyof Columns, string>} AS ${string}`;

/** Lớp QueryBuilder */
export class QueryBuilder<
    Name extends string,
    Columns extends Record<string, ColumnDefinition>
> {
    /** Bảng được liên kết với QueryBuilder */
    private table: Table<Name, Columns>;

    constructor(table: Table<Name, Columns>)

    /**
     * Hàm select với hỗ trợ `*`, `COUNT(*)`, và các hàm SQL
     * @param keys Các cột cần select hoặc hàm SQL áp dụng trên cột
     * @returns Mảng với mỗi phần tử là object với các thuộc tính đại diện cho các cột được chọn
     */
    select<
        SelectedKeys extends (
            | "*"
            | "COUNT(*)"
            | `COUNT(*) AS ${string}` // Alias cho COUNT(*)
            | `${Name}.${Extract<keyof Columns, string>}` // Cột bình thường
            | SQLKey<Name, Columns> // Hàm SQL
            | ColumnKeyWithAlias<Name, Columns> // Alias cho cột
            | SQLKeyWithAlias<Name, Columns> // Hàm SQL với alias
        )[]
    >(
        ...keys: SelectedKeys
    ): Array<
        "*" extends SelectedKeys[number]
        ? { [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]> }
        : {
            [Key in SelectedKeys[number]as Key extends `${Name}.${infer ColumnName} AS ${infer Alias}`
            ? Alias // Alias của cột
            : Key extends `${SQLKey<Name, Columns>} AS ${infer Alias}`
            ? Alias // Alias của hàm SQL
            : Key extends `COUNT(*) AS ${infer Alias}`
            ? Alias // Alias của COUNT(*)
            : Key]: Key extends `${Name}.${infer ColumnName} AS ${string}`
            ? ColumnName extends keyof Columns
            ? ResolveColumnType<Columns[ColumnName]>
            : never
            : Key extends SQLKey<Name, Columns>
            ? number // Hàm SQL trả về số
            : Key extends "COUNT(*)"
            ? number // COUNT(*) trả về số
            : Key extends `COUNT(*) AS ${string}`
            ? number // COUNT(*) trả về số
            : Key extends `${SQLKey<Name, Columns>} AS ${string}`
            ? number // Alias của hàm SQL cũng trả về số
            : Key extends `${Name}.${infer ColumnName}`
            ? ColumnName extends keyof Columns
            ? ResolveColumnType<Columns[ColumnName]>
            : never
            : never;
        }
    >
}