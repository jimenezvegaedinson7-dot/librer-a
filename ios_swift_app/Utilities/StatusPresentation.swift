struct PresentedStatus: Equatable {
    let text: String
    let rawValue: String
    let tone: PresentationTone
}

enum PresentationTone: Equatable {
    case positive
    case warning
    case negative
    case neutral
}
