protocol ActivityServicing {
    func myActivity() async throws -> [Activity]
}

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

protocol ReservationServicing {
    func myReservations() async throws -> [Reservation]
}

protocol ReservationDetailServicing {
    func reservation(id: Int) async throws -> Reservation
}

extension ActivityService: ActivityServicing {}
extension PurchaseService: PurchaseServicing {}
extension PurchaseService: PurchaseDetailServicing {}
extension PaymentService: PaymentStatusServicing {}
extension ReservationService: ReservationServicing {}
extension ReservationService: ReservationDetailServicing {}
