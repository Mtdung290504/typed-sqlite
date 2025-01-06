/**Kiểu dữ liệu của cột */
type Types = "INTEGER" | "REAL" | "TEXT" | "BLOB"

/**Tùy chọn xử lý khi tham chiếu foreign key được thay đổi/xóa  */
type OnColumnChangeOptions = "CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"

/**Tùy chọn collate của cột */
type CollateOptions = "BINARY" | "NOCASE" | "RTRIM"

/**Giá trị mặc định của cột, bao gồm chuỗi, số, null hoặc các hàm đặc biệt */
type DefaultValue = number | "CURRENT_TIMESTAMP" | "CURRENT_DATE" | "CURRENT_TIME" | null

/**Map ánh xạ kiểu dữ liệu SQLite về JS */
type TypeMappingMap<T extends Types> = {
    "INTEGER": number
    "REAL": number
    "TEXT": string
    "BLOB": Blob
}[T]

type ForeignKeyReference<TableName extends string, ColumnName extends string> = {
    /**Tên bảng tham chiếu */
    table: TableName

    /**Tên cột tham chiếu */
    column: ColumnName
}

type ForeignKey = {
    /**Bảng và tên cột tham chiếu */
    reference: ForeignKeyReference<string, string>

    /**Tùy chọn xử lý khi tham chiếu foreign key được update */
    onUpdate: OnColumnChangeOptions

    /**Tùy chọn xử lý khi tham chiếu foreign key bị delete */
    onDelete: OnColumnChangeOptions
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

/**Kiểu ánh xạ cột sang JS */
type ResolveColumnType<Column extends ColumnDefinition> = Column extends { type: infer T extends Types }
    ? TypeMappingMap<T>
    : never;

export class Table<Name extends string, Columns extends Record<string, ColumnDefinition>> {
    /**Phiên bản schema của bảng, quyết định xem cơ sở dữ liệu nên được reset hay không */
    version: number;

    /**Tên bảng */
    name: Name;

    /**Các cột của bảng */
    private _columns: Columns;

    /**
     * Khởi tạo instance Table, dùng làm cơ sở cho database
     * @param version - Phiên bản schema, khi thay đổi version, reset toàn bộ database
     * @param name - Tên bảng
     * @param columns - Các cột của bảng
     */
    constructor(version: number, name: Name, columns: Columns)

    /**
     * Hàm `select` trả về mảng các object đại diện cho các "row" của kết quả truy vấn
     * @param keys - Danh sách các cột cần select, dạng `table.column` hoặc `table.column AS alias`
     * @returns Mảng các object đại diện cho các "row" của kết quả truy vấn với mỗi thuộc tính là cột
     */
    select<
        SelectedKeys extends (
            | `${Name}.${Extract<keyof Columns, string>}` // Không alias
            | `${Name}.${Extract<keyof Columns, string>} AS ${string}` // Có alias
        )[]
    >(
        ...keys: SelectedKeys
    ): Array<{
        [Key in SelectedKeys[number]as Key extends `${Name}.${infer ColumnName} AS ${infer Alias}`
        ? Alias // Dùng alias làm key nếu có
        : Key]: Key extends `${Name}.${infer ColumnName} AS ${string}`
        ? ResolveColumnType<Columns[ColumnName & keyof Columns]>
        : Key extends `${Name}.${infer ColumnName}`
        ? ResolveColumnType<Columns[ColumnName & keyof Columns]>
        : never;
    }>
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
    constructor(...tables: Tables)

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