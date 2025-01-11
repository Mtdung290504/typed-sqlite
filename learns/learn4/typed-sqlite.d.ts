import sqlite3 from "sqlite3";

/**Kiểu dữ liệu của cột */
type Types = "INTEGER" | "REAL" | "TEXT" | "BLOB"

/**Tùy chọn xử lý khi tham chiếu foreign key được thay đổi/xóa */
type OnColumnChangeOptions = "CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"

/**Tùy chọn collate của cột */
type CollateOptions = "BINARY" | "NOCASE" | "RTRIM"

/**Giá trị mặc định của cột, bao gồm chuỗi, số, null hoặc các hàm đặc biệt */
type DefaultValue = number | null | (string & {}) | "CURRENT_TIMESTAMP" | "CURRENT_DATE" | "CURRENT_TIME"

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
    type: Types,
    notNull?: boolean;
    unique?: boolean;
    primaryKey?: boolean;
    check?: string;
    collate?: CollateOptions;
    foreignKey?: ForeignKey;
    defaultValue?: DefaultValue;
}

/**Kiểm tra xem Columns có cột nào là primaryKey hay không */
type HasPrimaryKey<Columns> = keyof {
    [K in keyof Columns as Columns[K] extends { primaryKey: true } ? K : never]: true;
} extends never
    ? false
    : true;

export class Table<Name extends string, Columns extends Record<string, ColumnDefinition>> {
    /**Phiên bản schema của bảng, quyết định xem cơ sở dữ liệu nên được reset hay không */
    version: number;

    /**Tên bảng */
    name: Name;

    /**Các cột của bảng */
    columns: Columns;

    /**
     * Khởi tạo instance Table, dùng làm cơ sở cho database sqlite
     * @param metadata - Các dữ liệu cần thiết của bảng, gồm phiên bản và tên, khi bất kỳ bảng nào thay đổi phiên bản, reset toàn bộ database
     * @param columns - Định nghĩa các cột của bảng
     * @param createOptions - Tùy chọn tạo bảng, gồm createIfNotExist
     */
    constructor(
        metadata: { version: number, name: Name },
        columns: Columns,
        createOptions?: HasPrimaryKey<Columns> extends true
            ? { createIfNotExist?: true | undefined; withoutRowId?: true | undefined }
            : { createIfNotExist?: true | undefined }
    )
}

export class Database<Tables extends Table<any, any>[]> {
    /** Tất cả các bảng */
    tables: {
        [K in Tables[number]as K["name"]]: K;
    };

    sqliteDb: sqlite3.Database;

    /**
     * Khởi tạo instance của Database
     * @param {typeof Tables} tables - Mảng các đối tượng `Table`
     */
    constructor(tables: Tables)

    /**
     * Khởi tạo database `sqlite3`
     * @param filename - Đường dẫn đến file .db
     * @param callback - Callback gọi khi có lỗi xảy ra trong quá trình tạo Database
     */
    createDatabase(filename: string, callback?: (err: Error | null) => void): this

    /**
     * Khởi tạo database `sqlite3`
     * @param filename - Đường dẫn đến file .db
     * @param mode - Chế độ mở của database `sqlite3`
     * @param callback - Callback gọi khi có lỗi xảy ra trong quá trình tạo Database
     */
    createDatabase(filename: string, mode?: number, callback?: (err: Error | null) => void): this

    /**
     * Tạo một QueryBuilder từ tên bảng
     * @param tableName Tên bảng
     * @returns QueryBuilder cho bảng đó
     */
    queryFrom<Name extends Tables[number]["name"]>(
        tableName: Name
    ): Name extends keyof this["tables"]
        ? Query<
            this, Name & string,
            this["tables"][Name] extends Table<any, infer Columns> ? Columns : never
        >
        : never;

    /** 
     * Lấy về bảng trong database theo tên
     * @deprecated
     **/
    table<Name extends keyof this["tables"]>(name: Name): this["tables"][Name]

    /**
     * Thực thi lệnh truy vấn tùy chỉnh của bạn trong trường hợp thư viện chưa hỗ trợ
     * @param sql - Câu lệnh truy vấn chứa các dấu `?`
     * @param params - Các tham số để truyền vào các dấu `?`
     * @returns Kết quả truy vấn dưới dạng mảng đối tượng, mỗi đối tượng có các thuộc tính là các column được truy vấn
     * @throws {Error} Nếu truy vấn gặp lỗi
     */
    executeRawQuery(sql: string, params: any[]): any[]

    /**
     * Thực thi lệnh DML tùy chỉnh của bạn trong trường hợp thư viện chưa hỗ trợ
     * @param sql - Câu lệnh truy vấn chứa các dấu `?`
     * @param params - Các tham số để truyền vào các dấu `?`
     * @returns Kết quả thực thi
     * @throws {Error} Nếu lệnh DML gặp lỗi
     */
    executeRawUpdate(sql: string, params: any[]): any
}

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
type NumericSQLFunctions = "AVG" | "SUM" | "MIN" | "MAX";

/** Hàm SQL không giới hạn kiểu dữ liệu */
type GeneralSQLFunctions = "COUNT";

/** Kiểm tra xem cột có phải kiểu số (INTEGER hoặc REAL) không */
type IsNumericColumn<Column extends ColumnDefinition> =
    Column["type"] extends "INTEGER" | "REAL" ? true : false;

/** Hàm SQL hợp lệ trên cột */
type SQLKey<
    TableName extends string,
    Columns extends Record<string, ColumnDefinition>
> = {
    [K in keyof Columns & string]:
    // Nếu là cột số, cho phép các hàm SQL dành cho số và COUNT
    IsNumericColumn<Columns[K]> extends true
    ? `${NumericSQLFunctions | GeneralSQLFunctions}(${TableName}.${K})`
    // Nếu không phải cột số, chỉ cho phép COUNT
    : `${GeneralSQLFunctions}(${TableName}.${K})`;
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

/** Helper type hỗ trợ resolve kiểu cho select * sau khi join nhiều bảng */
type FlattenIntersection<T> = (
    T extends any ? (x: T) => void : never
) extends (x: infer R) => void
    ? R
    : never;

/** Helper type hỗ trợ resolve kiểu cho select * sau khi join nhiều bảng */
type MergeJoinedTables<Tables extends Record<string, Record<string, ColumnDefinition>>> = FlattenIntersection<{
    [K in keyof Tables]: {
        [Column in keyof Tables[K] & string as `${Extract<K, string>}.${Column}`]: ResolveColumnType<Tables[K][Column]>;
    };
}[keyof Tables]>;

/** Lớp QueryBuilder */
export class Query<
    DB extends Database<any>,
    Name extends string,
    Columns extends Record<string, ColumnDefinition>,
    SelectedKeys extends (
        | "*"
        | `${Name}.${Extract<keyof Columns, string>}`
        | `${Name}.${Extract<keyof Columns, string>} AS ${string}`
        | SQLKey<Name, Columns>
        | `${SQLKey<Name, Columns>} AS ${string}`
        | `COUNT(*)`
        | `COUNT(*) AS ${string}`
        | `${keyof JoinedTables & string}.${string}`
        | `${keyof JoinedTables & string}.${string} AS ${string}`
    )[] = [],
    JoinedTables extends Record<string, Record<string, ColumnDefinition>> = {}
> {
    /** Bảng được liên kết với QueryBuilder */
    private table: Table<Name, Columns>;

    /** Đối tượng Database */
    database: DB;

    /** Các cột được chọn */
    private selectedColumns: SelectedKeys;

    /** Các bảng được join */
    private joinedTables: JoinedTables;

    constructor(database: DB, table: Table<Name, Columns>)

    /**
     * Thêm một bảng `INNER JOIN` vào truy vấn
     * @param tableName Tên bảng cần join
     * @param on Điều kiện join (ON)
     * @returns Trả về QueryBuilder mới với bảng đã được join
     */
    innerJoin<TableName extends keyof DB["tables"] & string>(
        tableName: TableName,
        on: string
    ): Query<
        DB, Name, Columns, SelectedKeys, JoinedTables & {
            [K in TableName]: DB["tables"][K] extends Table<any, infer Columns>
            ? Columns
            : never;
        }
    >

    /**
     * Thêm một bảng `LEFT JOIN` vào truy vấn
     * @param tableName Tên bảng cần join
     * @param on Điều kiện join (ON)
     * @returns Trả về QueryBuilder mới với bảng đã được join
     */
    leftJoin<TableName extends keyof DB["tables"] & string>(
        tableName: TableName,
        on: string
    ): Query<
        DB, Name, Columns, SelectedKeys, JoinedTables & {
            [K in TableName]: DB["tables"][K] extends Table<any, infer Columns>
            ? Columns
            : never;
        }
    >

    /**
     * Thêm một bảng `CROSS JOIN` vào truy vấn
     * @param tableName Tên bảng cần join
     * @returns Trả về QueryBuilder mới với bảng đã được join
     */
    crossJoin<TableName extends keyof DB["tables"] & string>(
        tableName: TableName
    ): Query<
        DB, Name, Columns, SelectedKeys, JoinedTables & {
            [K in TableName]: DB["tables"][K] extends Table<any, infer Columns>
            ? Columns
            : never;
        }
    >

    /**
     * Chọn các cột từ bảng cho câu lệnh truy vấn
     * @param columns Các cột cần select
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
        ...columns: Keys
    ): Query<DB, Name, Columns, Keys, JoinedTables>

    /**
     * Chọn các cột từ bảng cho câu lệnh truy vấn distinct
     * @param columns Các cột cần select distinct
     * @returns Trả về chính QueryBuilder
     */
    selectDistinct<Keys extends (
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
        ...columns: Keys
    ): Query<DB, Name, Columns, Keys, JoinedTables>

    /**
     * Đặt điều kiện where cho câu lệnh truy vấn
     * @param condition - Điều kiện WHERE của truy vấn có chứa các dấu `?`
     */
    where(condition: string): this

    /**
     * Đặt điều kiện having cho câu lệnh truy vấn
     * @param condition - Điều kiện HAVING của truy vấn có chứa các dấu `?`
     */
    having(condition: string): this

    groupBy<Keys extends (
        "*" extends SelectedKeys[number]
        ? keyof JoinedTables extends never
        ? keyof {
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        }
        : keyof ({
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        } & MergeJoinedTables<JoinedTables>)
        : keyof JoinedTables extends never
        ? keyof {
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
        : keyof {
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
    )>(...columns: Keys[]): this

    orderBy<Keys extends (
        "*" extends SelectedKeys[number]
        ? keyof JoinedTables extends never
        ? `${keyof {
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        }} ${'ASC' | 'DESC'}`
        : `${Extract<keyof ({
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        } & MergeJoinedTables<JoinedTables>), string>} ${'ASC' | 'DESC'}`
        : keyof JoinedTables extends never
        ? `${keyof {
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
        }} ${'ASC' | 'DESC'}`
        : `${keyof {
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
        }} ${'ASC' | 'DESC'}`
    )>(...columns: Keys[]): this;

    limit(count: number, offset?: number): this

    /**
     * Trả về câu lệnh SQL đã được tạo
     * @return Trả về chuỗi câu lệnh truy vấn SQL
     */
    export(): string

    /**
     * Thực thi câu truy vấn và trả về kết quả
     * @param params - Các param cần truyền vào truy vấn
     * @returns Trả về kết quả truy vấn ở dạng mảng với mỗi phần tử mảng là một object với các thuộc tính là các cột được select
     */
    execute(params?: any[]): Promise<
        "*" extends SelectedKeys[number]
        ? keyof JoinedTables extends never
        ? Array<{
            [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
        }>
        : Array<
            {
                [K in keyof Columns & string as `${Name}.${K}`]: ResolveColumnType<Columns[K]>;
            } & MergeJoinedTables<JoinedTables>
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