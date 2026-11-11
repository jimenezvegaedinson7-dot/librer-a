protocol PurchaseServicing {
    func myPurchases() async throws -> [Purchase]
}

protocol PurchaseDetailServicing {
    func purchase(id: Int) async throws -> Purchase
    func paymentForSale(id: Int) async throws -> SalePayment
}

protocol PaymentStatusServicing {
    func status(orderID: String) async throws -> PaymentStatus
}

extension PurchaseService: PurchaseServicing {}
extension PurchaseService: PurchaseDetailServicing {}
extension PaymentService: PaymentStatusServicing {}
