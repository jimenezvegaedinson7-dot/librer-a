import Foundation

enum LoginResult {
    case authenticated(user: User, token: String)
    case requiresTwoFactor(temporaryToken: String, message: String?)
}

final class AuthService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func login(email: String, password: String) async throws -> LoginResult {
        let response = try await client.send(
            APIEndpoint<AuthResponse>.login(.init(email: email, password: password))
        )
        return try parse(response)
    }

    func verifyTwoFactor(temporaryToken: String, code: String) async throws -> LoginResult {
        let request = TwoFactorLoginRequest(twoFactorToken: temporaryToken, codigo: code)
        let response = try await client.send(APIEndpoint<AuthResponse>.verifyTwoFactor(request))
        return try parse(response)
    }

    private func parse(_ response: AuthResponse) throws -> LoginResult {
        if response.requiresTwoFactor == true,
           let temporaryToken = response.twoFactorToken,
           !temporaryToken.isEmpty {
            return .requiresTwoFactor(
                temporaryToken: temporaryToken,
                message: response.mensaje
            )
        }

        guard let user = response.data,
              let token = response.token,
              !token.isEmpty else {
            throw APIError.decoding(
                DecodingError.dataCorrupted(
                    .init(codingPath: [], debugDescription: "La autenticación no incluyó usuario y JWT definitivo.")
                )
            )
        }
        return .authenticated(user: user, token: token)
    }
}
