import Foundation
@testable import LibreriaSecureApp

enum PurchaseTestFixtures {
    static func purchase(
        id: Int = 1,
        date: String? = "2026-09-15T10:00:00Z",
        detailKey: String = "detalles",
        details: Bool = true,
        saleStatus: String = "pendiente",
        paymentStatus: String? = nil,
        externalReference: String? = nil,
        deliveryType: String? = nil,
        shippingCost: String? = nil,
        province: String? = nil,
        district: String? = nil,
        address: String? = nil,
        reference: String? = nil,
        agency: String? = nil,
        hasReceipt: Any? = nil
    ) throws -> Purchase {
        var payload: [String: Any] = [
            "id_venta": String(id),
            "id_usuario": "7",
            "fecha_venta": jsonValue(date),
            "total": "65.00",
            "estado": saleStatus
        ]
        if details {
            payload[detailKey] = [[
                "id_detalle": "10",
                "id_libro": "20",
                "titulo": "Libro de prueba",
                "cantidad": "2",
                "precio_unitario": "30.00",
                "subtotal": "60.00"
            ]]
        }
        payload["payu_payment_status"] = jsonValue(paymentStatus)
        payload["external_reference"] = jsonValue(externalReference)
        payload["tipo_entrega"] = jsonValue(deliveryType)
        payload["costo_envio"] = jsonValue(shippingCost)
        payload["provincia"] = jsonValue(province)
        payload["distrito"] = jsonValue(district)
        payload["direccion"] = jsonValue(address)
        payload["referencia"] = jsonValue(reference)
        payload["agencia"] = jsonValue(agency)
        payload["tiene_comprobante"] = hasReceipt ?? NSNull()
        return try decode(Purchase.self, payload)
    }

    static func salePayment(
        id: Int = 1,
        orderID: String? = "9001",
        paymentStatus: String? = nil,
        consolidatedStatus: String? = nil,
        method: String? = "payu"
    ) throws -> SalePayment {
        let payload: [String: Any] = [
            "id_venta": String(id),
            "external_reference": "venta-\(id)",
            "payu_order_id": jsonValue(orderID),
            "order_id": jsonValue(orderID),
            "payu_payment_id": "payment-\(id)",
            "payu_payment_status": jsonValue(paymentStatus),
            "metodo_pago": jsonValue(method),
            "estado_pago": jsonValue(consolidatedStatus),
            "fecha_pago": NSNull(),
            "estado": "pendiente",
            "estado_venta": "pendiente"
        ]
        return try decode(SalePayment.self, payload)
    }

    static func paymentStatus(
        rawStatus: String,
        id: String = "9001"
    ) throws -> PaymentStatus {
        let payload: [String: Any] = [
            "id": id,
            "status": rawStatus,
            "order_status": rawStatus,
            "status_detail": NSNull(),
            "external_reference": "venta-1",
            "payment_status": rawStatus,
            "payment_status_detail": NSNull(),
            "total_amount": "65.00"
        ]
        return try decode(PaymentStatus.self, payload)
    }

    private static func decode<Value: Decodable>(
        _ type: Value.Type,
        _ payload: [String: Any]
    ) throws -> Value {
        let data = try JSONSerialization.data(withJSONObject: payload)
        return try JSONDecoder().decode(type, from: data)
    }

    private static func jsonValue(_ value: String?) -> Any {
        if let value { return value }
        return NSNull()
    }
}
