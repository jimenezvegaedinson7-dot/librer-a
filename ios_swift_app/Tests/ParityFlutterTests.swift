import Foundation
import XCTest
@testable import LibreriaSecureApp

/// Paridad con Flutter: seguimiento por tipo de entrega, promociones,
/// zonas de Pallasca y contratos de pago y recuperación.
final class ParityFlutterTests: XCTestCase {
    private let decoder = JSONDecoder()

    // MARK: Seguimiento

    func testPickupAndDeliveryHaveTheirOwnSteps() {
        let pickup = OrderTracking(id: 41, sale: "pagada", delivery: "listo_recojo", type: "tienda")
        XCTAssertEqual(pickup.steps.map(\.label), ["Recibido", "Preparando", "Listo", "Recogido"])
        XCTAssertEqual(pickup.title, "Listo para recoger")
        XCTAssertTrue(pickup.message.contains("#41"))
        XCTAssertEqual(pickup.steps.first(where: \.current)?.key, "listo_recojo")

        let delivery = OrderTracking(id: 7, sale: "pagada", delivery: "en_camino", type: "domicilio")
        XCTAssertEqual(delivery.steps.map(\.label), ["Recibido", "Preparando", "En camino", "Entregado"])
        XCTAssertEqual(delivery.title, "Tu pedido va en camino")
        XCTAssertEqual(delivery.steps.filter(\.done).count, 3)
    }

    func testFinalStepIsNamedByDeliveryType() {
        XCTAssertEqual(OrderTracking(id: 1, sale: "entregada", delivery: "entregado", type: "tienda").title, "Pedido recogido")
        XCTAssertEqual(OrderTracking(id: 1, sale: "entregada", delivery: "entregado", type: "domicilio").title, "Pedido entregado")
    }

    func testUnpaidHasNoDoneStepsAndCancelledHasNoSteps() {
        let waiting = OrderTracking(id: 8, sale: "pendiente", delivery: "pendiente", type: "domicilio")
        XCTAssertEqual(waiting.title, "Esperando pago")
        XCTAssertFalse(waiting.steps.contains(where: \.done))

        let cancelled = OrderTracking(id: 9, sale: "cancelada", delivery: "cancelado", type: "tienda")
        XCTAssertEqual(cancelled.tone, .cancelled)
        XCTAssertTrue(cancelled.steps.isEmpty)
    }

    // MARK: Promociones

    func testActiveDiscountUsesFinalPriceAndExpiredOneDoesNot() throws {
        let json = """
        {"id_libro":1,"titulo":"Oferta","precio":"50.00","precio_final":"40.00",
         "descuento_vigente":1,"descuento_porcentaje_efectivo":20,"descuento_hasta":"2999-12-31",
         "stock":3,"estado":1}
        """.data(using: .utf8)!
        let book = try decoder.decode(Book.self, from: json)
        XCTAssertEqual(book.precioCompra, 40, accuracy: 0.001)
        XCTAssertTrue(book.enOferta)
        XCTAssertEqual(book.porcentajeOferta, 20)
        XCTAssertEqual(CartItem(book: book, quantity: 2).subtotalCents, 8000)

        let expired = Book(idLibro: 2, titulo: "Vencida", precio: 50, stock: 1,
                           precioFinal: 40, descuentoVigente: true, descuentoHasta: "2000-01-01")
        XCTAssertEqual(expired.precioCompra, 50, accuracy: 0.001)
        XCTAssertFalse(expired.enOferta)
    }

    func testNewBadgeOnlyDuringThirtyDays() {
        let now = Date()
        let iso = ISO8601DateFormatter()
        let recent = Book(idLibro: 3, titulo: "Reciente", precio: 10, stock: 1,
                          creadoEn: iso.string(from: now.addingTimeInterval(-5 * 86_400)), esNuevo: true)
        let old = Book(idLibro: 4, titulo: "Antiguo", precio: 10, stock: 1,
                       creadoEn: iso.string(from: now.addingTimeInterval(-45 * 86_400)), esNuevo: true)
        XCTAssertTrue(recent.nuevo(en: now))
        XCTAssertFalse(old.nuevo(en: now))
    }

    // MARK: Zonas y contratos

    func testDeliveryZonesKeepOnlyActiveWithFare() throws {
        let json = """
        [{"id_zona":1,"nombre":"Centro","tarifa":"5.00","estado":1},
         {"id_zona":2,"nombre":"Inactiva","tarifa":"5.00","estado":0},
         {"id_zona":3,"nombre":"Sin tarifa","tarifa":"0","estado":1}]
        """.data(using: .utf8)!
        let zones = try decoder.decode([DeliveryZone].self, from: json).filter(\.usable)
        XCTAssertEqual(zones.map(\.nombre), ["Centro"])
    }

    func testCreateOrderSendsPallascaZoneAndReference() throws {
        let body = CreateOrderRequest(
            idempotenciaClave: "k",
            items: [CheckoutItemRequest(idLibro: 1, cantidad: 2)],
            tipoEntrega: "domicilio",
            direccion: "Jr. Lima 123",
            idZonaDelivery: 4,
            referencia: "Frente a la plaza",
            clienteTipoDocumento: "DNI",
            clienteDocumento: "12345678"
        )
        let json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(body)) as? [String: Any]
        XCTAssertEqual(json?["id_zona_delivery"] as? Int, 4)
        XCTAssertEqual(json?["referencia"] as? String, "Frente a la plaza")
        XCTAssertNil(json?["id_distrito"])
    }

    func testPasswordResetTravelsWithTokenNotCode() throws {
        let body = ResetPasswordRequest(email: "a@b.pe", resetToken: "permiso", password: "Clave1234")
        let json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(body)) as? [String: Any]
        XCTAssertEqual(json?["reset_token"] as? String, "permiso")
        XCTAssertNil(json?["codigo"])

        let token = try decoder.decode(ResetTokenResponse.self, from: #"{"success":true,"reset_token":"abc"}"#.data(using: .utf8)!)
        XCTAssertEqual(token.resetToken, "abc")
    }

    func testPaymentWindowRecognizesReturnAndGateway() {
        XCTAssertTrue(PaymentSheet.isReturn(URL(string: "https://api.example/api/pagos/respuesta/REF-1?x=1")!))
        XCTAssertFalse(PaymentSheet.isReturn(URL(string: "https://checkout.payulatam.com/ppp-web-gateway-payu/")!))
        XCTAssertTrue(PaymentSheet.isGateway(URL(string: "https://sandbox.checkout.payulatam.com/x")!))
        XCTAssertFalse(PaymentSheet.isGateway(URL(string: "https://payulatam.com.falso.example/x")!))
    }

    func testShakeEffectEndsAtRest() {
        let effect = ShakeEffect(animatableData: 1)
        XCTAssertEqual(effect.effectValue(size: .zero).m31, 0, accuracy: 0.0001)
    }

    // MARK: Colores de texto por tema

    func testTextFollowsThemeWithReadableContrast() {
        let marfil: UInt32 = 0xF6F1E9
        XCTAssertEqual(TextPalette.make(theme: ProfileTheme.resolve("libreria"), background: marfil), .brand)
        for id in ["grafito", "noche", "rosa", "default"] {
            let palette = TextPalette.make(theme: ProfileTheme.resolve(id), background: marfil)
            XCTAssertGreaterThanOrEqual(TextPalette.contrast(palette.primary, marfil), 10, id)
            XCTAssertGreaterThanOrEqual(TextPalette.contrast(palette.secondary, marfil), 6, id)
            XCTAssertGreaterThanOrEqual(TextPalette.contrast(palette.tertiary, marfil), 3.6, id)
            XCTAssertNotEqual(palette.primary, TextPalette.brand.primary, id)
        }
    }
}
