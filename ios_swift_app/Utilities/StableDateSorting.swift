import Foundation

enum StableDateSorting {
    static func descending<Value>(
        _ values: [Value],
        date: KeyPath<Value, Date?>
    ) -> [Value] {
        values.enumerated().sorted { left, right in
            let leftDate = left.element[keyPath: date]
            let rightDate = right.element[keyPath: date]

            switch (leftDate, rightDate) {
            case let (leftDate?, rightDate?) where leftDate != rightDate:
                return leftDate > rightDate
            case (.some, .none):
                return true
            case (.none, .some):
                return false
            default:
                return left.offset < right.offset
            }
        }.map { $0.element }
    }
}
