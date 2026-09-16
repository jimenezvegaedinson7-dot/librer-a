import Foundation
@testable import LibreriaSecureApp

enum ProfileTestFixtures {
    static func user(
        id: Int = 1,
        nombre: String = "Juan",
        apellido: String = "Pérez",
        email: String = "juan.perez@example.com",
        telefono: String? = "+52 55 1234 5678",
        fotoPerfil: String? = nil,
        rol: String = "cliente",
        estado: Bool = true,
        fechaRegistro: Date? = nil,
        twoFactorEnabled: Bool = false,
        emailVerifiedAt: Date? = nil
    ) -> User {
        User(
            idUsuario: id,
            nombre: nombre,
            apellido: apellido,
            email: email,
            telefono: telefono,
            fotoPerfil: fotoPerfil,
            rol: rol,
            estado: estado,
            fechaRegistro: fechaRegistro,
            twoFactorEnabled: twoFactorEnabled,
            emailVerifiedAt: emailVerifiedAt
        )
    }

    static var userWithPhotoURL: User {
        user(
            fotoPerfil: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
        )
    }

    static var userWithCloudinaryPath: User {
        user(
            fotoPerfil: "/uploads/profile_pics/juan123.jpg"
        )
    }

    static var userWith2FAEnabled: User {
        user(
            twoFactorEnabled: true
        )
    }

    static var userWith2FADisabled: User {
        user(
            twoFactorEnabled: false
        )
    }

    static var userWith2FAAsOne: User {
        user(
            twoFactorEnabled: true
        )
    }

    static var userUnverifiedEmail: User {
        user(
            emailVerifiedAt: nil
        )
    }

    static var userVerifiedEmail: User {
        user(
            emailVerifiedAt: Date()
        )
    }
}