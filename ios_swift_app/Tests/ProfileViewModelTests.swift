import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class ProfileViewModelTests: XCTestCase {
    func testLoadsProfileSuccessfully() async throws {
        let user = ProfileTestFixtures.user()
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(profileService: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertEqual(viewModel.user?.idUsuario, 1)
        XCTAssertEqual(viewModel.user?.nombre, "Juan")
        XCTAssertEqual(viewModel.user?.apellido, "Pérez")
        XCTAssertEqual(viewModel.user?.email, "juan.perez@example.com")
    }

    func testLoadsProfileWithPhotoURL() async throws {
        let user = ProfileTestFixtures.userWithPhotoURL
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertNotNil(viewModel.user?.fotoPerfil)
        XCTAssertTrue(viewModel.user!.fotoPerfil!.contains("cloudinary"))
    }

    func testLoadsProfileWithCloudinaryPath() async throws {
        let user = ProfileTestFixtures.userWithCloudinaryPath
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertNotNil(viewModel.user?.fotoPerfil)
    }

    func testLoadsProfileWith2FAEnabled() async throws {
        let user = ProfileTestFixtures.userWith2FAEnabled
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertTrue(viewModel.user!.twoFactorEnabled)
    }

    func testLoadsProfileWith2FADisabled() async throws {
        let user = ProfileTestFixtures.userWith2FADisabled
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertFalse(viewModel.user!.twoFactorEnabled)
    }

    func testLoadsProfileWithVerifiedEmail() async throws {
        let user = ProfileTestFixtures.userVerifiedEmail
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertNotNil(viewModel.user?.emailVerifiedAt)
    }

    func testLoadsProfileWithUnverifiedEmail() async throws {
        let user = ProfileTestFixtures.userUnverifiedEmail
        let service = ProfileSequenceMock([.success(user)])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertNil(viewModel.user?.emailVerifiedAt)
    }

    func testRefreshUpdatesProfile() async throws {
        let firstUser = ProfileTestFixtures.user(nombre: "Juan", email: "juan@viejo.com")
        let secondUser = ProfileTestFixtures.user(nombre: "Pedro", email: "pedro@nuevo.com")
        let service = ProfileSequenceMock([
            .success(firstUser),
            .success(secondUser)
        ])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()
        XCTAssertEqual(viewModel.user?.nombre, "Juan")

        await viewModel.refresh()
        XCTAssertEqual(viewModel.user?.nombre, "Pedro")
    }

    func testRefreshFailureKeepsPreviousProfile() async throws {
        let user = ProfileTestFixtures.user(id: 1, nombre: "Juan")
        let service = ProfileSequenceMock([
            .success(user),
            .failure(APIError.server(statusCode: 503, message: nil))
        ])
        let viewModel = ProfileViewModel(service: service)

        await viewModel.loadInitial()
        await viewModel.refresh()

        XCTAssertEqual(viewModel.user?.id, 1)
        assertError(viewModel.state)
    }

    func testUnauthorizedError() async {
        await assertProfileError(.unauthorized("Sesión expirada"), containing: "sesión")
    }

    func testForbiddenError() async {
        await assertProfileError(.forbidden(nil), containing: "autorización")
    }

    func testNotFoundError() async {
        await assertProfileError(.notFound(nil), containing: "encontrar")
    }

    func testRateLimitError() async {
        await assertProfileError(.rateLimited(nil), containing: "demasiadas")
    }

    func testServerError() async {
        await assertProfileError(.server(statusCode: 503, message: nil), containing: "servidor")
    }

    func testConnectivityError() async {
        await assertProfileError(
            .connectivity(URLError(.notConnectedToInternet)),
            containing: "conexión"
        )
    }

    private func assertProfileError(
        _ error: APIError,
        containing text: String? = nil
    ) async {
        let viewModel = ProfileViewModel(
            service: ProfileSequenceMock([.failure(error)])
        )
        await viewModel.loadInitial()
        assertError(viewModel.state, containing: text)
    }

    private func assertError(
        _ state: ProfileViewModel.ProfileState,
        containing text: String? = nil,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard case .error(let message) = state else {
            return XCTFail("Se esperaba estado de error.", file: file, line: line)
        }
        if let text {
            XCTAssertTrue(message.localizedCaseInsensitiveContains(text), file: file, line: line)
        }
    }
}

private class ProfileSequenceMock: ProfileService {
    private var results: [Result<User, Error>]

    init(_ results: [Result<User, Error>]) {
        self.results = results
    }

    override func profile() async throws -> User {
        guard !results.isEmpty else { throw APIError.notFound(nil) }
        return try results.removeFirst().get()
    }
}