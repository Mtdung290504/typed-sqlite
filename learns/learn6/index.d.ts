// Note cần xử lý null, cột không có not null phải trả về kết quả có thể null

type Types = "INTEGER" | "REAL" | "TEXT" | "BLOB"
type OnColumnChangeOptions = "CASCADE" | "SET NULL" | "NO ACTION" | "RESTRICT"
type CollateOptions = "BINARY" | "NOCASE" | "RTRIM"
type DefaultValue = number | null | (string & {}) | "CURRENT_TIMESTAMP" | "CURRENT_DATE" | "CURRENT_TIME"

type ForeignKey<
    TableName extends string,
    ColumnName extends string,
> = {
    reference: `${TableName}.${ColumnName}`
    onUpdate?: OnColumnChangeOptions
    onDelete?: OnColumnChangeOptions
}

type ColumnDefinition = {
    type: Types
    notNull?: true
    unique?: true
    primaryKey?: true
    check?: string
    collate?: CollateOptions
    foreignKey?: ForeignKey<string, string>
    defaultValue?: DefaultValue
    autoIncrement?: true
}

export class Table<
    Name extends string,
    TableSchema extends Record<string, ColumnDefinition>,
> {
    name: Name
    columns: TableSchema
    constructor(name: Name, columns: TableSchema)
}