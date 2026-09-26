import Foundation

protocol TokenProviding {
    func accessToken() async throws -> String?
}

final class APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let tokenProvider: TokenProviding
    private let sessionExpirationCoordinator: SessionExpirationCoordinator
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(
        environment: AppEnvironment = AppEnvironment(),
        session: URLSession? = nil,
        tokenProvider: TokenProviding,
        sessionExpirationCoordinator: SessionExpirationCoordinator
    ) {
        baseURL = environment.baseURL
        self.tokenProvider = tokenProvider
        self.sessionExpirationCoordinator = sessionExpirationCoordinator

        if let session {
            self.session = session
        } else {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.timeoutIntervalForRequest = 30
            configuration.timeoutIntervalForResource = 60
            configuration.waitsForConnectivity = true
            self.session = URLSession(configuration: configuration)
        }

        encoder = JSONEncoder()
        decoder = JSONDecoder()
    }

    func send<Response: Decodable>(_ endpoint: APIEndpoint<Response>) async throws -> Response {
        let request: URLRequest
        do {
            request = try await makeRequest(for: endpoint)
        } catch let error as APIError {
            if endpoint.requiresAuthorization, case .unauthorized(let message) = error {
                await sessionExpirationCoordinator.notify(message: message)
            }
            throw error
        }
        return try await perform(
            request,
            requiresAuthorization: endpoint.requiresAuthorization
                && endpoint.expiresSessionOnUnauthorized
        )
    }

    /// Envía un archivo como `multipart/form-data` (foto de perfil).
    func upload<Response: Decodable>(
        _ responseType: Response.Type,
        method: HTTPMethod,
        pathComponents: [String],
        fieldName: String,
        fileName: String,
        mimeType: String,
        fileData: Data
    ) async throws -> Response {
        let endpoint = APIEndpoint<Response>(method: method, pathComponents: pathComponents)
        var request: URLRequest
        do {
            request = try await makeRequest(for: endpoint)
        } catch let error as APIError {
            if case .unauthorized(let message) = error {
                await sessionExpirationCoordinator.notify(message: message)
            }
            throw error
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        body.append(Data("--\(boundary)\r\n".utf8))
        body.append(Data("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n".utf8))
        body.append(Data("Content-Type: \(mimeType)\r\n\r\n".utf8))
        body.append(fileData)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))
        request.httpBody = body
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        return try await perform(request, requiresAuthorization: true)
    }

    private func perform<Response: Decodable>(
        _ request: URLRequest,
        requiresAuthorization: Bool
    ) async throws -> Response {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            throw APIError.connectivity(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unexpectedStatus(-1)
        }

        let serverMessage = try? decoder.decode(APIStatusPayload.self, from: data)
        guard (200...299).contains(httpResponse.statusCode) else {
            let error = mapHTTPError(
                statusCode: httpResponse.statusCode,
                message: serverMessage?.mensaje
            )
            if requiresAuthorization, case .unauthorized(let message) = error {
                await sessionExpirationCoordinator.notify(message: message)
            }
            throw error
        }

        if serverMessage?.success == false {
            throw APIError.api(
                statusCode: httpResponse.statusCode,
                message: serverMessage?.mensaje ?? "La operación no pudo completarse."
            )
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    private func makeRequest<Response>(for endpoint: APIEndpoint<Response>) async throws -> URLRequest {
        guard let components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false),
              components.scheme != nil,
              components.host != nil,
              let base = components.url else {
            throw APIError.invalidURL
        }

        var url = base
        for component in endpoint.pathComponents {
            guard !component.isEmpty else { throw APIError.invalidURL }
            url.appendPathComponent(component)
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = endpoint.body {
            do {
                request.httpBody = try encoder.encode(body)
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            } catch {
                throw APIError.requestEncoding(error)
            }
        }

        if endpoint.requiresAuthorization {
            guard let token = try await tokenProvider.accessToken(), !token.isEmpty else {
                throw APIError.unauthorized(nil)
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func mapHTTPError(statusCode: Int, message: String?) -> APIError {
        switch statusCode {
        case 401: return .unauthorized(message)
        case 403: return .forbidden(message)
        case 404: return .notFound(message)
        case 429: return .rateLimited(message)
        case 500...599: return .server(statusCode: statusCode, message: message)
        default:
            if let message { return .api(statusCode: statusCode, message: message) }
            return .unexpectedStatus(statusCode)
        }
    }
}
