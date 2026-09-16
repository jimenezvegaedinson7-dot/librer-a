import Foundation

struct AppEnvironment {
    static let productionBaseURL = URL(string: "https://libreria-api-v9h0.onrender.com")!

    let baseURL: URL

    init(baseURL: URL = AppEnvironment.configuredBaseURL()) {
        self.baseURL = baseURL
    }

    private static func configuredBaseURL() -> URL {
        let processValue = ProcessInfo.processInfo.environment["LIBRERIA_API_BASE_URL"]
        let bundleValue = Bundle.main.object(forInfoDictionaryKey: "LibreriaAPIBaseURL") as? String

        for candidate in [processValue, bundleValue].compactMap({ $0 }) {
            if let url = URL(string: candidate),
               let scheme = url.scheme?.lowercased(),
               ["https", "http"].contains(scheme),
               url.host != nil {
                return url
            }
        }
        return productionBaseURL
    }
}
