import Foundation

struct SalePayment: Codable, Equatable {
    let idVenta: Int
    let externalReference: String?
    let payuOrderID: String?
    let orderID: String?
    let checkoutURL: String?
    let payuPaymentID: String?
    let payuPaymentStatus: String?
    let metodoPago: String?
    let estadoPago: String?
    let fechaPago: Date?
    let estado: String?
    let estadoVenta: String?

    enum CodingKeys: String, CodingKey {
        case idVenta = "id_venta"
        case externalReference = "external_reference"
        case payuOrderID = "payu_order_id"
        case orderID = "order_id"
        case checkoutURL = "checkout_url"
        case payuPaymentID = "payu_payment_id"
        case payuPaymentStatus = "payu_payment_status"
        case metodoPago = "metodo_pago"
        case estadoPago = "estado_pago"
        case fechaPago = "fecha_pago"
        case estado
        case estadoVenta = "estado_venta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idVenta = try container.decodeFlexibleInt(forKey: .idVenta)
        externalReference = try container.decodeIfPresent(String.self, forKey: .externalReference)
        payuOrderID = try container.decodeFlexibleStringIfPresent(forKey: .payuOrderID)
        orderID = try container.decodeFlexibleStringIfPresent(forKey: .orderID)
        checkoutURL = try container.decodeIfPresent(String.self, forKey: .checkoutURL)
        payuPaymentID = try container.decodeFlexibleStringIfPresent(forKey: .payuPaymentID)
        payuPaymentStatus = try container.decodeIfPresent(String.self, forKey: .payuPaymentStatus)
        metodoPago = try container.decodeIfPresent(String.self, forKey: .metodoPago)
        estadoPago = try container.decodeIfPresent(String.self, forKey: .estadoPago)
        fechaPago = try container.decodeFlexibleDateIfPresent(forKey: .fechaPago)
        estado = try container.decodeIfPresent(String.self, forKey: .estado)
        estadoVenta = try container.decodeIfPresent(String.self, forKey: .estadoVenta)
    }
}
