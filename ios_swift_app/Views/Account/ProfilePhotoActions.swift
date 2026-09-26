import PhotosUI
import SwiftUI
import UIKit

/// Avatar predefinido: un emoji sobre un color (mismos que Flutter).
struct AvatarPreset: Identifiable, Hashable {
    let emoji: String
    let rgb: UInt32

    var id: String { emoji }
    var color: Color { Color(rgb: rgb) }

    static let all: [AvatarPreset] = [
        AvatarPreset(emoji: "🦁", rgb: 0xFFB74D),
        AvatarPreset(emoji: "🐼", rgb: 0x90A4AE),
        AvatarPreset(emoji: "🦊", rgb: 0xFF8A65),
        AvatarPreset(emoji: "🐸", rgb: 0x81C784),
        AvatarPreset(emoji: "🐙", rgb: 0x7986CB),
        AvatarPreset(emoji: "🦉", rgb: 0xA1887F),
        AvatarPreset(emoji: "🐯", rgb: 0xFFA726),
        AvatarPreset(emoji: "🦄", rgb: 0xF06292),
        AvatarPreset(emoji: "🐧", rgb: 0x64B5F6),
        AvatarPreset(emoji: "🐨", rgb: 0x9575CD),
    ]
}

private struct AvatarPresetView: View {
    let preset: AvatarPreset
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(preset.color)
            Text(preset.emoji).font(.system(size: size * 0.52))
        }
        .frame(width: size, height: size)
    }
}

enum ProfilePhoto {
    static let maxBytes = 5 * 1024 * 1024

    /// PNG de 256×256 del avatar (como `generarAvatarPng` en Flutter).
    @MainActor
    static func avatarPNG(_ preset: AvatarPreset) -> Data? {
        let renderer = ImageRenderer(content: AvatarPresetView(preset: preset, size: 256))
        renderer.scale = 1
        return renderer.uiImage?.pngData()
    }

    /// Convierte la imagen elegida a JPEG y aplica los límites de Flutter.
    static func jpeg(from data: Data) throws -> Data {
        guard let image = UIImage(data: data) else {
            throw PhotoError.message("Solo se permiten imágenes JPG, PNG o WEBP.")
        }
        return try jpeg(from: image)
    }

    static func jpeg(from image: UIImage) throws -> Data {
        guard let jpeg = image.jpegData(compressionQuality: 0.85) else {
            throw PhotoError.message("No se pudo seleccionar la imagen.")
        }
        guard jpeg.count <= maxBytes else {
            throw PhotoError.message("La imagen supera el tamaño máximo de 5 MB.")
        }
        return jpeg
    }

    enum PhotoError: LocalizedError {
        case message(String)
        var errorDescription: String? {
            if case .message(let text) = self { return text }
            return nil
        }
    }
}

extension View {
    /// Menú "Elegir avatar / Subir imagen / Tomar foto" y la subida al backend.
    func profilePhotoActions(
        isPresented: Binding<Bool>,
        uploading: Binding<Bool>,
        onMessage: @escaping (String) -> Void
    ) -> some View {
        modifier(ProfilePhotoActionsModifier(isPresented: isPresented, uploading: uploading, onMessage: onMessage))
    }
}

private struct ProfilePhotoActionsModifier: ViewModifier {
    @Binding var isPresented: Bool
    @Binding var uploading: Bool
    let onMessage: (String) -> Void

    @EnvironmentObject private var appState: AppState
    @State private var showAvatars = false
    @State private var showLibrary = false
    @State private var showCamera = false
    @State private var libraryItem: PhotosPickerItem?

    private var cameraAvailable: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    func body(content: Content) -> some View {
        content
            .confirmationDialog("Foto de perfil", isPresented: $isPresented, titleVisibility: .visible) {
                Button("Elegir avatar") { showAvatars = true }
                Button("Subir imagen") { showLibrary = true }
                if cameraAvailable {
                    Button("Tomar foto") { showCamera = true }
                }
                Button("Cancelar", role: .cancel) { }
            } message: {
                Text("Elige un avatar o usa una foto propia.")
            }
            .photosPicker(isPresented: $showLibrary, selection: $libraryItem, matching: .images)
            .onChange(of: libraryItem) { _, item in
                guard let item else { return }
                libraryItem = nil
                Task {
                    await upload {
                        guard let data = try await item.loadTransferable(type: Data.self) else {
                            throw ProfilePhoto.PhotoError.message("No se pudo seleccionar la imagen.")
                        }
                        return (try ProfilePhoto.jpeg(from: data), "image/jpeg")
                    }
                }
            }
            .sheet(isPresented: $showAvatars) {
                AvatarPickerSheet { preset in
                    showAvatars = false
                    Task {
                        await upload {
                            guard let png = await ProfilePhoto.avatarPNG(preset) else {
                                throw ProfilePhoto.PhotoError.message("No se pudo generar el avatar.")
                            }
                            return (png, "image/png")
                        }
                    }
                }
                .presentationDetents([.medium])
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { image in
                    showCamera = false
                    guard let image else { return }
                    Task { await upload { (try ProfilePhoto.jpeg(from: image), "image/jpeg") } }
                }
                .ignoresSafeArea()
            }
    }

    private func upload(_ makeFile: () async throws -> (Data, String)) async {
        uploading = true
        defer { uploading = false }
        do {
            let (data, mimeType) = try await makeFile()
            let updated = try await appState.accountService.uploadPhoto(data, mimeType: mimeType)
            appState.updateUser(updated)
            onMessage("Foto de perfil actualizada.")
        } catch let error as ProfilePhoto.PhotoError {
            onMessage(error.localizedDescription)
        } catch {
            let detail = error.localizedDescription
            onMessage(detail.isEmpty ? "No se pudo actualizar la foto." : detail)
        }
    }
}

/// Galería de avatares con vista previa (hoja "Elegir avatar").
private struct AvatarPickerSheet: View {
    let onChoose: (AvatarPreset) -> Void
    @State private var selected = AvatarPreset.all[0]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 5)

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Elegir avatar").font(.serif(22))
            HStack(spacing: 14) {
                AvatarPresetView(preset: selected, size: 64)
                Text("Se generará una imagen con el avatar elegido.")
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
            }
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(AvatarPreset.all) { preset in
                    Button { selected = preset } label: {
                        AvatarPresetView(preset: preset, size: 50)
                            .overlay(Circle().stroke(preset == selected ? Brand.tinta : .clear, lineWidth: 3))
                    }
                    .accessibilityLabel("Avatar \(preset.emoji)")
                    .accessibilityAddTraits(preset == selected ? .isSelected : [])
                }
            }
            Button("Usar este avatar") { onChoose(selected) }
                .buttonStyle(BrandButtonStyle())
        }
        .padding(20)
    }
}

/// Cámara del sistema (UIImagePickerController).
private struct CameraPicker: UIViewControllerRepresentable {
    let onFinish: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraDevice = .front
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onFinish: (UIImage?) -> Void
        init(onFinish: @escaping (UIImage?) -> Void) { self.onFinish = onFinish }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            onFinish(info[.originalImage] as? UIImage)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onFinish(nil)
        }
    }
}
