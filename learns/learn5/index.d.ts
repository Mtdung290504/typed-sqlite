export class Database {
    from(tableName: string): QueryBuilder

    insertInto(tableName: string, columns: string[]): InsertBuilder

    update(tableName: string): UpdateBuilder

    deleteFrom(tableName: string): DeleteBuilder

    executeRawQuery(sql: string): any[]

    executeRawUpdate(sql: string): any
}

export class QueryBuilder {
    innerJoin(tableName: string, onCondition: string): this

    leftJoin(tableName: string, onCondition: string): this

    crossJoin(tableName: string): this

    select(...columns: string[]): this

    selectDistinct(...columns: string[]): this

    where(condition: string): this

    having(condition: string): this

    groupBy(...columns: string[]): this

    orderBy(...columns: string[]): this

    limit(count: number, offset?: number): this

    executeQuery(...params: any[]): any[]

    exportToSql(): string

    exportToFn(): typeof this['executeQuery']
}

export class InsertBuilder {
    executeUpdate(...params: any[]): any

    exportToSql(): string

    exportToFn(): typeof this['executeUpdate']
}

export class UpdateBuilder {
    set(...setCommands: string[]): this

    where(condition: string): this

    executeUpdate(...params: any[]): any

    exportToSql(): string

    exportToFn(): typeof this['executeUpdate']
}

export class DeleteBuilder {
    where(condition: string): this

    executeUpdate(...params: any[]): any

    exportToSql(): string

    exportToFn(): typeof this['executeUpdate']
}