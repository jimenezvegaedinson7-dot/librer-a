import Foundation

struct PaymentStatus: Codable, Equatable {
    let id: String?
    let status: String?
    let orderStatus: String?
    let statusDetail: String?
    let externalReference: String?
    let paymentStatus: String?
    let paymentStatusDetail: String?
    let totalAmount: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case status
        case orderStatus = "order_status"
        case statusDetail = "status_detail"
        case externalReference = "external_reference"
        case paymentStatus = "payment_status"
        case paymentStatusDetail = "payment_status_detail"
        case totalAmount = "total_amount"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeFlexibleStringIfPresent(forKey: .id)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        orderStatus = try container.decodeIfPresent(String.self, forKey: .orderStatus)
        statusDetail = try container.decodeIfPresent(String.self, forKey: .statusDetail)
        externalReference = try container.decodeIfPresent(String.self, forKey: .externalReference)
        paymentStatus = try container.decodeIfPresent(String.self, forKey: .paymentStatus)
        paymentStatusDetail = try container.decodeIfPresent(String.self, forKey: .paymentStatusDetail)
        totalAmount = try container.decodeFlexibleDoubleIfPresent(forKey: .totalAmount)
    }
}
