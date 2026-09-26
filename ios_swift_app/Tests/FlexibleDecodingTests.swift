import Foundation
import XCTest
@testable import LibreriaSecureApp

final class FlexibleDecodingTests: XCTestCase {
    private let decoder = JSONDecoder()

    func testDecodesNumbersEncodedAsStrings() throws {
        let json = """
        {
            "id_libro":"12",
            "titulo":"Swift seguro",
            "isbn":null,
            "descripcion":null,
            "precio":"49.90",
            "stock":"7",
            "portada":null,
            "id_autor":"3",
            "autor":"Autora",
            "id_categoria":"2",
            "categoria":"Tecnología",
            "estado":"1"
        }
        """.data(using: .utf8)!

        let book = try decoder.decode(Book.self, from: json)

        XCTAssertEqual(book.idLibro, 12)
        XCTAssertEqual(book.precio, 49.90, accuracy: 0.001)
        XCTAssertEqual(book.stock, 7)
        XCTAssertEqual(book.idAutor, 3)
    }

    func testDecodesFlexibleBooleans() throws {
        let template = """
        {
            "id_usuario":1,
            "nombre":"Ada",
            "apellido":"Lovelace",
            "email":"ada@example.com",
            "telefono":null,
            "foto_perfil":null,
            "rol":"cliente",
            "estado":STATE,
            "fecha_registro":null,
            "two_factor_enabled":TWO_FACTOR,
            "email_verified_at":null
        }
        """

        let variants = [("true", "0", true, false), ("1", "\"1\"", true, true), ("\"0\"", "false", false, false)]
        for (state, twoFactor, expectedState, expectedTwoFactor) in variants {
            let source = template
                .replacingOccurrences(of: "STATE", with: state)
                .replacingOccurrences(of: "TWO_FACTOR", with: twoFactor)
            let user = try decoder.decode(User.self, from: Data(source.utf8))
            XCTAssertEqual(user.estado, expectedState)
            XCTAssertEqual(user.twoFactorEnabled, expectedTwoFactor)
        }
    }

    func testDecodesSupportedDateFormats() throws {
        let json = """
        {
            "id_usuario":"5",
            "nombre":"Linus",
            "apellido":"Torvalds",
            "email":"linus@example.com",
            "telefono":null,
            "foto_perfil":null,
            "rol":"cliente",
            "estado":1,
            "fecha_registro":"2026-09-15T10:20:30.123Z",
            "two_factor_enabled":0,
            "email_verified_at":"2026-09-15"
        }
        """.data(using: .utf8)!

        let user = try decoder.decode(User.self, from: json)

        XCTAssertNotNil(user.fechaRegistro)
        XCTAssertNotNil(user.emailVerifiedAt)
    }

    func testNormalizesDetalleAndDetalles() throws {
        let base = """
        {
            "id_venta":"8",
            "id_usuario":"5",
            "fecha_venta":"2026-09-15T10:20:30Z",
            "total":"25.00",
            "costo_envio":null,
            "estado":"pagada",
            "tipo_entrega":null,
            "direccion":null,
            "referencia":null,
            "id_distrito":null,
            "id_agencia":null,
            "distrito":null,
            "provincia":null,
            "agencia":null,
            "correo_compra":null,
            "external_reference":null,
            "payu_order_id":null,
            "payu_payment_id":null,
            "payu_payment_status":null,
            "payu_payer_email":null,
            "tiene_comprobante":"0",
            "DETAIL_KEY":[{
                "id_detalle":null,
                "id_libro":"3",
                "titulo":"Libro",
                "cantidad":"2",
                "precio_unitario":"10.00",
                "subtotal":"20.00"
            }]
        }
        """

        for key in ["detalle", "detalles"] {
            let source = base.replacingOccurrences(of: "DETAIL_KEY", with: key)
            let purchase = try decoder.decode(Purchase.self, from: Data(source.utf8))
            XCTAssertEqual(purchase.details.count, 1)
            XCTAssertEqual(purchase.details.first?.cantidad, 2)
        }
    }
}
