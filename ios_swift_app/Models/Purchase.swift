import Foundation

struct Purchase: Codable, Equatable, Identifiable {
    let idVenta: Int
    let idUsuario: Int
    let fechaVenta: Date?
    let total: Double
    let costoEnvio: Double?
    let estado: String
    /// Estado logístico: pendiente, preparando, listo_recojo, en_camino, entregado, cancelado.
    let estadoEntrega: String?
    /// `pallasca` en las compras de la cobertura local.
    let coberturaEntrega: String?
    let zonaDeliveryNombre: String?
    let pagoRevisionMotivo: String?
    let tipoEntrega: String?
    let direccion: String?
    let referencia: String?
    let idDistrito: Int?
    let idAgencia: Int?
    let distrito: String?
    let provincia: String?
    let agencia: String?
    let correoCompra: String?
    let clienteDocumento: String?
    let clienteTipoDocumento: String?
    let externalReference: String?
    let payuOrderID: String?
    let payuPaymentID: String?
    let payuPaymentStatus: String?
    let payuPayerEmail: String?
    let tieneComprobante: Bool?

    /// Propiedad interna normalizada. El backend puede enviar la colección como `detalle` o `detalles`.
    let details: [PurchaseDetail]

    var id: Int { idVenta }

    enum CodingKeys: String, CodingKey {
        case idVenta = "id_venta"
        case idUsuario = "id_usuario"
        case fechaVenta = "fecha_venta"
        case total
        case costoEnvio = "costo_envio"
        case estado
        case estadoEntrega = "estado_entrega"
        case coberturaEntrega = "cobertura_entrega"
        case zonaDeliveryNombre = "zona_delivery_nombre"
        case pagoRevisionMotivo = "pago_revision_motivo"
        case tipoEntrega = "tipo_entrega"
        case direccion
        case referencia
        case idDistrito = "id_distrito"
        case idAgencia = "id_agencia"
        case distrito
        case provincia
        case agencia
        case correoCompra = "correo_compra"
        case clienteDocumento = "cliente_documento"
        case clienteTipoDocumento = "cliente_tipo_documento"
        case externalReference = "external_reference"
        case payuOrderID = "payu_order_id"
        case payuPaymentID = "payu_payment_id"
        case payuPaymentStatus = "payu_payment_status"
        case payuPayerEmail = "payu_payer_email"
        case tieneComprobante = "tiene_comprobante"
        case details = "detalles"
    }

    private enum AlternateDetailKey: String, CodingKey {
        case detalle
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idVenta = try container.decodeFlexibleInt(forKey: .idVenta)
        idUsuario = try container.decodeFlexibleInt(forKey: .idUsuario)
        fechaVenta = try container.decodeFlexibleDateIfPresent(forKey: .fechaVenta)
        total = try container.decodeFlexibleDouble(forKey: .total)
        costoEnvio = try container.decodeFlexibleDoubleIfPresent(forKey: .costoEnvio)
        estado = try container.decode(String.self, forKey: .estado)
        estadoEntrega = try? container.decodeFlexibleStringIfPresent(forKey: .estadoEntrega)
        coberturaEntrega = try? container.decodeFlexibleStringIfPresent(forKey: .coberturaEntrega)
        zonaDeliveryNombre = try? container.decodeFlexibleStringIfPresent(forKey: .zonaDeliveryNombre)
        pagoRevisionMotivo = try? container.decodeFlexibleStringIfPresent(forKey: .pagoRevisionMotivo)
        tipoEntrega = try container.decodeIfPresent(String.self, forKey: .tipoEntrega)
        direccion = try container.decodeIfPresent(String.self, forKey: .direccion)
        referencia = try container.decodeIfPresent(String.self, forKey: .referencia)
        idDistrito = try container.decodeFlexibleIntIfPresent(forKey: .idDistrito)
        idAgencia = try container.decodeFlexibleIntIfPresent(forKey: .idAgencia)
        distrito = try container.decodeIfPresent(String.self, forKey: .distrito)
        provincia = try container.decodeIfPresent(String.self, forKey: .provincia)
        agencia = try container.decodeIfPresent(String.self, forKey: .agencia)
        correoCompra = try container.decodeIfPresent(String.self, forKey: .correoCompra)
        clienteDocumento = try? container.decodeFlexibleStringIfPresent(forKey: .clienteDocumento)
        clienteTipoDocumento = try? container.decodeFlexibleStringIfPresent(forKey: .clienteTipoDocumento)
        externalReference = try container.decodeIfPresent(String.self, forKey: .externalReference)
        payuOrderID = try container.decodeFlexibleStringIfPresent(forKey: .payuOrderID)
        payuPaymentID = try container.decodeFlexibleStringIfPresent(forKey: .payuPaymentID)
        payuPaymentStatus = try container.decodeIfPresent(String.self, forKey: .payuPaymentStatus)
        payuPayerEmail = try container.decodeIfPresent(String.self, forKey: .payuPayerEmail)
        tieneComprobante = try container.decodeFlexibleBoolIfPresent(forKey: .tieneComprobante)

        if let normalized = try container.decodeIfPresent([PurchaseDetail].self, forKey: .details) {
            details = normalized
        } else {
            let alternate = try decoder.container(keyedBy: AlternateDetailKey.self)
            details = try alternate.decodeIfPresent([PurchaseDetail].self, forKey: .detalle) ?? []
        }
    }
}
