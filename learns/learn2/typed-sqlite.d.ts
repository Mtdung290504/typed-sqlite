import sqlite3 from "sqlite3";

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

    /**
     * Tạo một QueryBuilder từ tên bảng
     * @param tableName Tên bảng
     * @returns QueryBuilder cho bảng đó
     */
    from<Name extends Tables[number]["name"]>(
        tableName: Name
    ): Name extends keyof this["tables"]
        ? QueryBuilder<
            Name & string,
            this["tables"][Name] extends Table<any, infer Columns> ? Columns : never
        >
        : never;

    /** 
     * Lấy về bảng trong database theo tên
     **/
    table<Name extends keyof this["tables"]>(name: Name): this["tables"][Name]
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

/** Hàm SQL hợp lệ trên cột */
type SQLKey<
    TableName extends string,
    Columns extends Record<string, ColumnDefinition>
> = {
    [K in keyof Columns & string]: IsNumericColumn<Columns[K]> extends true
    ? `${NumericSQLFunctions}(${TableName}.${K})`
    : never;
}[keyof Columns & string];

/** Hàm SQL hợp lệ trên tất cả các bảng */
type AllSQLKeys<
    Name extends string,
    Columns extends Record<string, ColumnDefinition>,
    JoinedTables extends Record<string, Record<string, ColumnDefinition>>
> = SQLKey<Name, Columns> | {
    [J in keyof JoinedTables & string]: SQLKey<J, JoinedTables[J]>;
}[keyof JoinedTables & string];

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
    Columns extends Record<string, ColumnDefinition>,
    SelectedKeys extends (
        | "*"
        | `${Name}.${Extract<keyof Columns, string>}`
        | `${Name}.${Extract<keyof Columns, string>} AS ${string}`
        | SQLKey<Name, Columns>
        | SQLKeyWithAlias<Name, Columns>
        | `COUNT(*)`
        | `COUNT(*) AS ${string}`
        | `${keyof JoinedTables & string}.${string}`
        | `${keyof JoinedTables & string}.${string} AS ${string}`
    )[] = [],
    JoinedTables extends Record<string, Record<string, ColumnDefinition>> = {}
> {
    /** Bảng được liên kết với QueryBuilder */
    private table: Table<Name, Columns>;

    /** Đối tượng sqlite3.Database */
    private sqliteDb: sqlite3.Database;

    /** Các cột được chọn */
    private selectedColumns: SelectedKeys;

    /** Các bảng được join */
    private joinedTables: JoinedTables;

    constructor(sqliteDb: sqlite3.Database, table: Table<Name, Columns>, joinedTables?: JoinedTables)

    /**
     * Chọn các cột từ bảng
     * @param keys Các cột cần select
     * @returns Trả về chính QueryBuilder
     */
    select<Keys extends (
        | "*"
        | `${Name}.${Extract<keyof Columns, string>}`
        | `${Name}.${Extract<keyof Columns, string>} AS ${string}`
        | {
            [J in keyof JoinedTables & string]: `${J}.${Extract<keyof JoinedTables[J], string>}` |
            `${J}.${Extract<keyof JoinedTables[J], string>} AS ${string}`;
        }[keyof JoinedTables & string]
        | AllSQLKeys<Name, Columns, JoinedTables>
        | `${AllSQLKeys<Name, Columns, JoinedTables>} AS ${string}`
        | `COUNT(*)`
        | `COUNT(*) AS ${string}`
    )[]>(
        ...keys: Keys
    ): QueryBuilder<Name, Columns, Keys, JoinedTables>

    /**
     * Thêm một bảng `JOIN` vào truy vấn
     * @param table Bảng cần join
     * @param on Điều kiện join (ON)
     * @returns Trả về QueryBuilder mới với bảng đã được join
     */
    join<TableName extends string, TableColumns extends Record<string, ColumnDefinition>>(
        table: Table<TableName, TableColumns>,
        on: string
    ): QueryBuilder<
        Name,
        Columns,
        SelectedKeys,
        JoinedTables & { [K in TableName]: TableColumns }
    >

    /**
     * Thực thi câu truy vấn và trả về kết quả
     */
    execute(): Promise<
        "*" extends SelectedKeys[number]

        ? keyof JoinedTables extends never
        ? Array<{
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        }>
        : Array<
            {
                [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
            } & {
                [J in Extract<keyof JoinedTables, string | number>]: {
                    [K in keyof JoinedTables[J] & string as `${J}.${K}`]: ResolveColumnType<
                        JoinedTables[J][K]
                    >;
                };
            }[Extract<keyof JoinedTables, string | number>]
        >
        : keyof JoinedTables extends never
        ? Array<
            {
                [Key in SelectedKeys[number]as Key extends `${Name}.${infer ColumnName} AS ${infer Alias}`
                ? Alias
                : Key extends `${SQLKey<Name, Columns>} AS ${infer Alias}`
                ? Alias
                : Key extends `COUNT(*) AS ${infer Alias}`
                ? Alias
                : Key]: Key extends `${Name}.${infer ColumnName} AS ${string}`
                ? ColumnName extends keyof Columns
                ? ResolveColumnType<Columns[ColumnName]>
                : never
                : Key extends SQLKey<Name, Columns>
                ? number
                : Key extends `${SQLKey<Name, Columns>} AS ${string}`
                ? number
                : Key extends "COUNT(*)"
                ? number
                : Key extends `COUNT(*) AS ${string}`
                ? number
                : Key extends `${Name}.${infer ColumnName}`
                ? ColumnName extends keyof Columns
                ? ResolveColumnType<Columns[ColumnName]>
                : never
                : never;
            }
        >
        : Array<
            {
                [Key in SelectedKeys[number]as Key extends `${Name}.${infer ColumnName} AS ${infer Alias}`
                ? Alias
                : Key extends `${keyof JoinedTables & string}.${infer JoinedColumnName} AS ${infer Alias}`
                ? Alias
                : Key extends `${AllSQLKeys<Name, Columns, JoinedTables>} AS ${infer Alias}`
                ? Alias
                : Key extends `COUNT(*) AS ${infer Alias}`
                ? Alias
                : Key]: Key extends `${Name}.${infer ColumnName} AS ${string}`
                ? ColumnName extends keyof Columns
                ? ResolveColumnType<Columns[ColumnName]>
                : never
                : Key extends `${keyof JoinedTables & string}.${infer JoinedColumnName} AS ${string}`
                ? keyof JoinedTables extends infer JT
                ? JT extends keyof JoinedTables
                ? JoinedColumnName extends keyof JoinedTables[JT]
                ? ResolveColumnType<JoinedTables[JT][JoinedColumnName]>
                : never
                : never
                : never
                : Key extends AllSQLKeys<Name, Columns, JoinedTables>
                ? number
                : Key extends `${AllSQLKeys<Name, Columns, JoinedTables>} AS ${string}`
                ? number
                : Key extends "COUNT(*)"
                ? number
                : Key extends `COUNT(*) AS ${string}`
                ? number
                : Key extends `${Name}.${infer ColumnName}`
                ? ColumnName extends keyof Columns
                ? ResolveColumnType<Columns[ColumnName]>
                : never
                : Key extends `${keyof JoinedTables & string}.${infer JoinedColumnName}`
                ? keyof JoinedTables extends infer JT
                ? JT extends keyof JoinedTables
                ? JoinedColumnName extends keyof JoinedTables[JT]
                ? ResolveColumnType<JoinedTables[JT][JoinedColumnName]>
                : never
                : never
                : never
                : never;
            }
        >
    >
}