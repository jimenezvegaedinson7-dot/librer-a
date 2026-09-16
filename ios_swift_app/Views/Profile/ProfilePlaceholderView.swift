import SwiftUI

struct ProfilePlaceholderView: View {
    let user: User

    var body: some View {
        NavigationStack {
            List {
                LabeledContent("Nombre", value: "\(user.nombre) \(user.apellido)")
                LabeledContent("Correo", value: user.email)
                LabeledContent("Rol", value: user.rol)
            }
            .navigationTitle("Perfil")
        }
    }
}
