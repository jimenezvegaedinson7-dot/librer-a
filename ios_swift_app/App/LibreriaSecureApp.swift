import SwiftUI

@main
struct LibreriaSecureApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .task {
                    await appState.restoreSession()
                }
                .onChange(of: scenePhase) { _, newPhase in
                    switch newPhase {
                    case .active:
                        appState.appDidBecomeActive()
                    case .inactive, .background:
                        appState.appDidLeaveForeground()
                    @unknown default:
                        appState.appDidLeaveForeground()
                    }
                }
        }
    }
}
