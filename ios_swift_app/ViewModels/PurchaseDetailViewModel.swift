import Foundation
import Combine

enum PurchaseContentState: Equatable {
    case idle
    case loading
    case loaded
    case error(String)
}

enum PurchasePaymentState: Equatable {
    case idle
    case loading
    case loaded
    case unavailable(String)
    case error(String)
}

@MainActor
final class PurchaseDetailViewModel: ObservableObject {
    @Published private(set) var purchaseState: PurchaseContentState = .idle
    @Published private(set) var paymentState: PurchasePaymentState = .idle
    @Published private(set) var purchase: Purchase?
    @Published private(set) var salePayment: SalePayment?
    @Published private(set) var remotePaymentStatus: PaymentStatus?
    @Published private(set) var paymentPresentation: PaymentPresentation?
    @Published private(set) var paymentNotice: String?

    let purchaseID: Int

    private let purchaseService: any PurchaseDetailServicing
    private let paymentService: any PaymentStatusServicing
    private var hasLoadedInitially = false
    private var isLoadingPurchase = false
    private var isLoadingPayment = false

    init(
        purchaseID: Int,
        purchaseService: any PurchaseDetailServicing,
        paymentService: any PaymentStatusServicing
    ) {
        self.purchaseID = purchaseID
        self.purchaseService = purchaseService
        self.paymentService = paymentService
    }

    func loadInitial() async {
        guard !hasLoadedInitially else { return }
        await reload()
    }

    func reload() async {
        guard !isLoadingPurchase else { return }
        isLoadingPurchase = true
        hasLoadedInitially = true
        purchaseState = .loading
        defer { isLoadingPurchase = false }

        do {
            let loadedPurchase = try await purchaseService.purchase(id: purchaseID)
            purchase = loadedPurchase
            purchaseState = .loaded
            await loadPayment()
        } catch {
            purchaseState = .error(PurchaseErrorMessage.detail(error))
        }
    }

    func retryPayment() async {
        await loadPayment()
    }

    private func loadPayment() async {
        guard let purchase, !isLoadingPayment else { return }
        isLoadingPayment = true
        paymentState = .loading
        paymentNotice = nil
        defer { isLoadingPayment = false }

        let loadedSalePayment: SalePayment
        do {
            loadedSalePayment = try await purchaseService.paymentForSale(id: purchaseID)
            salePayment = loadedSalePayment
            remotePaymentStatus = nil
            paymentPresentation = PaymentPresentation.make(
                purchase: purchase,
                salePayment: loadedSalePayment,
                remoteStatus: nil
            )
        } catch let error as APIError {
            if case .notFound = error {
                salePayment = nil
                remotePaymentStatus = nil
                let fallbackPresentation = PaymentPresentation.make(
                    purchase: purchase,
                    salePayment: nil,
                    remoteStatus: nil
                )
                if fallbackPresentation.hasInformation {
                    paymentPresentation = fallbackPresentation
                    paymentNotice = "No hay detalle adicional de pago disponible."
                    paymentState = .loaded
                } else {
                    paymentPresentation = nil
                    paymentState = .unavailable(
                        "No hay información de pago disponible para esta compra."
                    )
                }
            } else {
                paymentState = .error(PurchaseErrorMessage.payment(error))
            }
            return
        } catch {
            paymentState = .error(PurchaseErrorMessage.payment(error))
            return
        }

        guard let orderID = Self.validOrderID(from: loadedSalePayment) else {
            paymentState = paymentPresentation?.hasInformation == true
                ? .loaded
                : .unavailable("No hay información de pago disponible para esta compra.")
            return
        }

        do {
            let status = try await paymentService.status(orderID: orderID)
            remotePaymentStatus = status
            paymentPresentation = PaymentPresentation.make(
                purchase: purchase,
                salePayment: loadedSalePayment,
                remoteStatus: status
            )
            paymentState = paymentPresentation?.hasInformation == true
                ? .loaded
                : .unavailable("No hay información de pago disponible para esta compra.")
        } catch let error as APIError {
            if case .notFound = error {
                paymentNotice = "No hay un estado adicional de la orden disponible."
                paymentState = paymentPresentation?.hasInformation == true
                    ? .loaded
                    : .unavailable("No hay información de pago disponible para esta compra.")
            } else {
                paymentState = .error(PurchaseErrorMessage.payment(error))
            }
        } catch {
            paymentState = .error(PurchaseErrorMessage.payment(error))
        }
    }

    private static func validOrderID(from payment: SalePayment) -> String? {
        [payment.orderID, payment.payuOrderID].compactMap { value in
            guard let value else { return nil }
            let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return normalized.isEmpty ? nil : normalized
        }.first
    }
}
