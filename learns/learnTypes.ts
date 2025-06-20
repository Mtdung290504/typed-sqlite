type HasPrimaryKey<Columns> = keyof {
    [K in keyof Columns as Columns[K] extends { primaryKey: true } ? K : never]: true
} extends never ? false : true
// Lý giải
// 'K in keyof Columns': Duyệt qua các key của 'Columns'
// 'as ...': Trong ngữ cảnh mapped type, 'as' sẽ biến đổi key thành gì đó (remaping)
    // ở trên là biến đổi thành K hoặc 'never' phụ thuộc vào kiểu có đạt điều kiện không
    // dễ nhớ: "Hãy thay đổi key này thành một thứ khác"

// Tóm lại, type trên duyệt qua các key K của 'Columns', 
// kiểm tra xem thuộc tính ứng với K của 'Columns' có tồn tại thuộc tính 'primaryKey' mang giá trị 'true' hay không
// nếu có, giữ lại mà không thay đổi gì, nếu không, biến đổi thành 'never' để loại bỏ
// Đến cuối cùng, khi không còn tồn tại bất kỳ key nào không phải never, thì trả về false, nếu còn, trả về true



type ColumnDefinition = {
    type: Types
}
export class Table<Name extends string, Columns extends Record<string, ColumnDefinition>> {
    name: Name
}
export class Database<Tables extends Table<any, any>[]> {
    /** Tất cả các bảng */
    tables: {
        [K in Tables[number] as K["name"]]: K
    }
    // ...
}
// Lý giải
// 'Tables' là mảng các 'Table', mỗi đối tượng 'Table' sẽ có thuộc tính 'name' đại diện cho tên bảng
// 'K in Tables[number]': Lấy kiểu của từng phần tử trong mảng 'Tables' (duyệt qua từng Table trong mảng)
    // Ví dụ 'Tables = [Table<"users", {}>, Table<"posts", {}>]'
    // Thì 'Tables[number] sẽ là Table<"users", {}> | Table<"posts", {}>'
// Tóm lại, sử dụng as để biến từng key kiểu 'Table' thành kiểu của thuộc tính 'name' của nó



type Types = "INTEGER" | "REAL" | "TEXT" | "BLOB"
type TypeMappingMap<T extends Types> = {
    "INTEGER": number
    "REAL": number
    "TEXT": string
    "BLOB": Blob
}[T]
type ResolveColumnType<Column extends ColumnDefinition> =
    Column extends { type: infer T extends Types } ? TypeMappingMap<T> : never
// Lý giải
    /**
     * Note:
     * infer là một từ khóa trong TypeScript, dùng để suy luận (infer) kiểu từ một điều kiện trong Conditional Types
     * Nó hoạt động bên trong biểu thức extends để cho phép trích xuất một kiểu nào đó từ một kiểu phức tạp hơn
     * Cấu trúc cơ bản: 'type Example<T> = T extends { key: infer K } ? K : never'
     */
// Trong đoạn mã, đầu tiên, kiểm tra column có khớp với cấu trúc '{ type: ... }' hay không,
// nếu có, kiểu của thuộc tính 'type' được trích xuất vào T, từ đó resolve được các kiểu SQL về kiểu của JS
// ngoài ra, 'infer T extends Types' ràng buộc thêm T phải có kiểu 'Types'



type NumericSQLFunctions = "AVG" | "SUM" | "MIN" | "MAX";
type GeneralSQLFunctions = "COUNT";
type IsNumericColumn<Column extends ColumnDefinition> =
    Column["type"] extends "INTEGER" | "REAL" ? true : false;
type SQLKey<
    TableName extends string,
    Columns extends Record<string, ColumnDefinition>
> = {
    [K in keyof Columns & string]: // Tương đương với 'K in Extract<keyof Columns, string>'
        IsNumericColumn<Columns[K]> extends true
            ? `${NumericSQLFunctions | GeneralSQLFunctions}(${TableName}.${K})`
            : `${GeneralSQLFunctions}(${TableName}.${K})`;
}[keyof Columns & string] // Tương đương với '[Extract<keyof Columns, string>]'
// Lý giải
// Có thể thay thế 'keyof Columns & string' bằng 'Extract<keyof Columns, string>'
// SQLKey nhìn là dạng {}[], trong lập trình là 1 value duy nhất
    // nhưng với type nó sẽ là tập hợp kiểu tạo thành từ phép union ("|")



type FlattenIntersection<T> = (
    T extends any ? (x: T) => void : never
) extends (x: infer R) => void 
    ? R : never;
type MergeJoinedTables<Tables extends Record<string, Record<string, ColumnDefinition>>> = FlattenIntersection<{
    [K in keyof Tables]: {
        [Column in keyof Tables[K] & string as `${Extract<K, string>}.${Column}`]: ResolveColumnType<Tables[K][Column]>;
    };
}[keyof Tables]>
// Lý giải
// Đầu tiên, về thuật ngữ 'Intersection' và 'Union', giả sử đã có trước 2 type A và B
    // 'Intersection type' là 'A & B' (dễ nhớ: kiểu và)
    // 'Union type' là 'A | B' (dễ nhớ: kiểu hoặc)
// Về kiểu 'FlattenIntersection'
    // Giải quyết mục tiêu biến đổi dưới đây:
        /**
         * type A = { id: number }
         * type B = { name: string }
         * 'type Union = A | B' tức dạng: '{ id: number; } | { name: string; }'
         * thông qua 'type Intersection = FlattenIntersection<Union>;' trở thành dạng: '{ id: number; name: string; }' 
         */
    // Đầu tiên 'T extends any' luôn xảy ra, nên convert T thành dạng (x: T) => void ("phân phối" union type)
    // Ví dụ 'T = A | B' thì trở thành '(x: A) => void | (x: B) => void' (biến mỗi thành phần của T thành một hàm)
    // Sau đó sử dụng infer, trích xuất các thành phần của T khỏi các thành phần đã được convert sẽ thu được dạng Intersection
        // Tại sao lại convert được từ dạng union thành intersection? Tại sao phải chuyển thành hàm trước?
            // Lý giải
            // TypeScript có một quy tắc quan trọng khi làm việc với hàm có union type trong parameter
            // Khi có một union type ở tham số của hàm,
                // TypeScript sẽ tự động chuyển nó thành intersection type để đảm bảo tính an toàn khi gọi hàm
            // Chính vì vậy khi sử dụng infer để trích xuất kiểu tham số của các hàm đã convert thành từ các thành phần của T
                // Nó trích xuất thành dạng intersection
            // Dễ hiểu: Khi kết hợp (x: A) => void | (x: B) => void, để an toàn, 
                // TypeScript coi x là A & B (cả hai hàm phải xử lý được).
// Về kiểu MergeJoinedTables, nó kết hợp toàn bộ các bảng trong một đối tượng key là tên bảng và value là object chứa các cột (Tables)
// '{[K in keyof Tables]: ...}' Đối tượng với key là tên bảng (keyof Tables) coi như lặp qua từng bảng
// '{[K in keyof Tables]: 
//      [Column in keyof Tables[K] & string as `${Extract<K, string>}.${Column}`]: ResolveColumnType<Tables[K][Column]>;
// }' Với mỗi bảng, biến đổi key thành dạng tên_bảng.tên_cột và value là resolve kiểu của cột
// '{[K in keyof Tables]: ...}[keyof Tables]' resolve thành union type
    /**
     * Ví dụ với 
     * Tables: {
     *      users: {
     *          id: { type: "INTEGER" };
     *          name: { type: "TEXT" };
     *      };
     *      posts: {
     *          id: { type: "INTEGER" };
     *          title: { type: "TEXT" };
     *      };
     * }
     */
    // Thì kết quả là:
    /**
     * {
     *      "users.id": number;
     *      "users.name": string;
     * } | {
     *      "posts.id": number;
     *      "posts.title": string;
     * }
     */
    // Sau đó kết quả trên được đưa vào ... trong FlattenIntersection<...>, sẽ resolve ra kết quả cuối cùng của select *



