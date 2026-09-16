import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class PurchaseDetailViewModelTests: XCTestCase {
    func testDecodesDetalleDetallesAndStringNumbers() throws {
        let singular = try PurchaseTestFixtures.purchase(detailKey: "detalle")
        let plural = try PurchaseTestFixtures.purchase(detailKey: "detalles")

        XCTAssertEqual(singular.details.count, 1)
        XCTAssertEqual(plural.details.count, 1)
        XCTAssertEqual(singular.idVenta, 1)
        XCTAssertEqual(singular.details.first?.cantidad, 2)
        XCTAssertEqual(singular.details.first?.precioUnitario, 30)
        XCTAssertEqual(singular.total, 65)
    }

    func testLoadsDetailAndApprovedPayment() async throws {
        let viewModel = makeViewModel(
            purchase: .success(try PurchaseTestFixtures.purchase(paymentStatus: "PENDING")),
            sale: .success(
                try PurchaseTestFixtures.salePayment(consolidatedStatus: "PENDING")
            ),
            status: .success(try PurchaseTestFixtures.paymentStatus(rawStatus: "APPROVED"))
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.purchaseState, .loaded)
        XCTAssertEqual(viewModel.paymentState, .loaded)
        XCTAssertEqual(viewModel.paymentPresentation?.status?.text, "Aprobado")
        XCTAssertEqual(viewModel.paymentPresentation?.status?.tone, .positive)
        XCTAssertEqual(viewModel.paymentPresentation?.method, "PayU")
    }

    func testPendingPaymentPresentation() async throws {
        let presentation = PaymentPresentation.make(
            purchase: try PurchaseTestFixtures.purchase(),
            salePayment: try PurchaseTestFixtures.salePayment(consolidatedStatus: "PENDING"),
            remoteStatus: try PurchaseTestFixtures.paymentStatus(rawStatus: "PENDING")
        )

        XCTAssertEqual(presentation.status?.text, "Pendiente")
        XCTAssertEqual(presentation.status?.tone, .warning)
    }

    func testUnknownPaymentStateRemainsNeutralAndKeepsRawValue() async throws {
        let presentation = PaymentPresentation.make(
            purchase: try PurchaseTestFixtures.purchase(),
            salePayment: try PurchaseTestFixtures.salePayment(consolidatedStatus: "NEW_STATE"),
            remoteStatus: nil
        )

        XCTAssertEqual(presentation.status?.text, "NEW_STATE")
        XCTAssertEqual(presentation.status?.rawValue, "NEW_STATE")
        XCTAssertEqual(presentation.status?.tone, .neutral)
    }

    func testNoPaymentInformationIsUnavailable() async throws {
        let viewModel = makeViewModel(
            purchase: .success(try PurchaseTestFixtures.purchase()),
            sale: .failure(APIError.notFound(nil)),
            status: .failure(APIError.notFound(nil))
        )

        await viewModel.loadInitial()

        guard case .unavailable = viewModel.paymentState else {
            return XCTFail("Se esperaba estado sin información de pago.")
        }
        XCTAssertNotNil(viewModel.purchase)
    }

    func testSalePayment404UsesPaymentInformationAlreadyPresentInPurchase() async throws {
        let viewModel = makeViewModel(
            purchase: .success(
                try PurchaseTestFixtures.purchase(
                    paymentStatus: "PENDING",
                    externalReference: "venta-1"
                )
            ),
            sale: .failure(APIError.notFound(nil)),
            status: .failure(APIError.notFound(nil))
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.paymentState, .loaded)
        XCTAssertEqual(viewModel.paymentPresentation?.status?.text, "Pendiente")
        XCTAssertEqual(viewModel.paymentPresentation?.externalReference, "venta-1")
        XCTAssertEqual(
            viewModel.paymentNotice,
            "No hay detalle adicional de pago disponible."
        )
    }

    func testDeliveryPresentationForDomicileAgencyAndNoShippingCost() throws {
        let domicile = try PurchaseTestFixtures.purchase(
            deliveryType: "domicilio",
            shippingCost: "5.00",
            province: "Lima",
            district: "Miraflores",
            address: "Dirección"
        )
        let agency = try PurchaseTestFixtures.purchase(
            deliveryType: "agencia",
            agency: "Agencia Central"
        )
        let noShippingCost = try PurchaseTestFixtures.purchase(
            deliveryType: "tienda",
            shippingCost: nil
        )

        XCTAssertEqual(PurchasePresentation.deliveryType(domicile.tipoEntrega!).text, "Domicilio")
        XCTAssertEqual(PurchasePresentation.deliveryType(agency.tipoEntrega!).text, "Agencia")
        XCTAssertEqual(PurchasePresentation.deliveryType(noShippingCost.tipoEntrega!).text, "Recojo en tienda")
        XCTAssertNil(noShippingCost.costoEnvio)
    }

    func testPurchaseDetailFailuresFor401403404429ServerAndConnectivity() async throws {
        let errors: [APIError] = [
            .unauthorized("Sesión expirada"),
            .forbidden(nil),
            .notFound(nil),
            .rateLimited(nil),
            .server(statusCode: 503, message: nil),
            .connectivity(URLError(.notConnectedToInternet))
        ]

        for error in errors {
            let viewModel = makeViewModel(
                purchase: .failure(error),
                sale: .failure(error),
                status: .failure(error)
            )
            await viewModel.loadInitial()
            guard case .error = viewModel.purchaseState else {
                return XCTFail("Se esperaba error de detalle para \(error).")
            }
            XCTAssertNil(viewModel.purchase)
        }
    }

    func testPaymentFailuresDoNotHideLoadedPurchase() async throws {
        let errors: [APIError] = [
            .unauthorized("Sesión expirada"),
            .forbidden(nil),
            .rateLimited(nil),
            .server(statusCode: 503, message: nil),
            .connectivity(URLError(.notConnectedToInternet))
        ]

        for error in errors {
            let viewModel = makeViewModel(
                purchase: .success(try PurchaseTestFixtures.purchase()),
                sale: .failure(error),
                status: .failure(error)
            )
            await viewModel.loadInitial()
            XCTAssertEqual(viewModel.purchaseState, .loaded)
            guard case .error = viewModel.paymentState else {
                return XCTFail("Se esperaba error de pago para \(error).")
            }
            XCTAssertNotNil(viewModel.purchase)
        }
    }

    func testRemotePayment404KeepsSalePaymentInformation() async throws {
        let viewModel = makeViewModel(
            purchase: .success(try PurchaseTestFixtures.purchase()),
            sale: .success(
                try PurchaseTestFixtures.salePayment(consolidatedStatus: "PENDING")
            ),
            status: .failure(APIError.notFound(nil))
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.paymentState, .loaded)
        XCTAssertEqual(viewModel.paymentPresentation?.status?.text, "Pendiente")
        XCTAssertNotNil(viewModel.paymentNotice)
    }

    private func makeViewModel(
        purchase: Result<Purchase, Error>,
        sale: Result<SalePayment, Error>,
        status: Result<PaymentStatus, Error>
    ) -> PurchaseDetailViewModel {
        PurchaseDetailViewModel(
            purchaseID: 1,
            purchaseService: PurchaseDetailServiceMock(
                purchaseResult: purchase,
                paymentResult: sale
            ),
            paymentService: PaymentStatusServiceMock(result: status)
        )
    }
}

private actor PurchaseDetailServiceMock: PurchaseDetailServicing {
    let purchaseResult: Result<Purchase, Error>
    let paymentResult: Result<SalePayment, Error>

    init(
        purchaseResult: Result<Purchase, Error>,
        paymentResult: Result<SalePayment, Error>
    ) {
        self.purchaseResult = purchaseResult
        self.paymentResult = paymentResult
    }

    func purchase(id: Int) async throws -> Purchase {
        try purchaseResult.get()
    }

    func paymentForSale(id: Int) async throws -> SalePayment {
        try paymentResult.get()
    }
}

private actor PaymentStatusServiceMock: PaymentStatusServicing {
    let result: Result<PaymentStatus, Error>

    init(result: Result<PaymentStatus, Error>) {
        self.result = result
    }

    func status(orderID: String) async throws -> PaymentStatus {
        try result.get()
    }
}
