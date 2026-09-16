import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidRequest(String)
    case requestEncoding(Error)
    case unauthorized(String?)
    case forbidden(String?)
    case notFound(String?)
    case rateLimited(String?)
    case server(statusCode: Int, message: String?)
    case api(statusCode: Int, message: String)
    case connectivity(URLError)
    case decoding(Error)
    case unexpectedStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "No se pudo construir la URL de la solicitud."
        case .invalidRequest(let message):
            return message
        case .requestEncoding:
            return "No se pudo preparar la solicitud."
        case .unauthorized(let message):
            return message ?? "La sesión no es válida o ha expirado."
        case .forbidden(let message):
            return message ?? "No tienes permisos para realizar esta acción."
        case .notFound(let message):
            return message ?? "El recurso solicitado no existe."
        case .rateLimited(let message):
            return message ?? "Hay demasiadas solicitudes. Intenta nuevamente más tarde."
        case .server(_, let message):
            return message ?? "El servidor no pudo completar la solicitud."
        case .api(_, let message):
            return message
        case .connectivity(let error):
            return error.localizedDescription
        case .decoding:
            return "La respuesta del servidor no tiene el formato esperado."
        case .unexpectedStatus(let statusCode):
            return "Respuesta HTTP inesperada (\(statusCode))."
        }
    }
}
