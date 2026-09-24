package com.jimenezvega.libreria

import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.security.MessageDigest

/**
 * Actualizaciones por APK (sin Google Play).
 *
 * Flutter descarga el APK y verifica su SHA-256; aquí se comprueba además que
 * sea la MISMA app (mismo package name), firmada con la MISMA clave y con un
 * versionCode mayor. Solo entonces se abre el instalador oficial de Android,
 * que siempre pide la confirmación del usuario (no hay instalación silenciosa).
 */
class MainActivity : FlutterActivity() {

    private val canal = "com.jimenezvega.libreria/actualizador"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, canal).setMethodCallHandler { call, result ->
            when (call.method) {
                "puedeInstalar" -> result.success(puedeInstalar())
                "abrirPermisoInstalacion" -> {
                    abrirPermisoInstalacion()
                    result.success(null)
                }
                "instalarApk" -> {
                    val ruta = call.argument<String>("ruta")
                    if (ruta == null) {
                        result.error("ARGUMENTO", "Falta la ruta del APK", null)
                    } else {
                        instalarApk(File(ruta), result)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    /** Android 8+ exige que el usuario autorice a esta app a instalar APKs. */
    private fun puedeInstalar(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls()

    private fun abrirPermisoInstalacion() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }
    }

    private fun instalarApk(apk: File, result: MethodChannel.Result) {
        // Solo se instalan archivos descargados por el actualizador.
        val carpeta = File(cacheDir, "actualizaciones").canonicalFile
        val archivo = apk.canonicalFile
        if (archivo.parentFile != carpeta || !archivo.exists()) {
            result.error("RUTA", "El APK no está en la carpeta de actualizaciones", null)
            return
        }

        val instalada = infoPaquete(null)
        val nueva = infoPaquete(archivo.absolutePath)
        if (instalada == null || nueva == null) {
            result.error("APK_INVALIDO", "No se pudo leer el APK descargado", null)
            return
        }
        if (nueva.packageName != packageName) {
            result.error("PAQUETE", "El APK no corresponde a esta aplicación", null)
            return
        }
        if (codigoVersion(nueva) <= codigoVersion(instalada)) {
            result.error("VERSION", "El APK no es una versión más reciente", null)
            return
        }
        if (huellasFirma(nueva) != huellasFirma(instalada)) {
            result.error("FIRMA", "El APK no está firmado con la clave oficial", null)
            return
        }

        val uri = FileProvider.getUriForFile(this, "$packageName.actualizaciones", archivo)
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
        result.success(true)
    }

    @Suppress("DEPRECATION")
    private fun infoPaquete(rutaApk: String?): PackageInfo? {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            PackageManager.GET_SIGNATURES
        }
        return try {
            if (rutaApk == null) {
                packageManager.getPackageInfo(packageName, flags)
            } else {
                packageManager.getPackageArchiveInfo(rutaApk, flags)?.also {
                    // Necesario para que Android lea las firmas del archivo.
                    it.applicationInfo?.sourceDir = rutaApk
                    it.applicationInfo?.publicSourceDir = rutaApk
                }
            }
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun codigoVersion(info: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else info.versionCode.toLong()

    @Suppress("DEPRECATION")
    private fun huellasFirma(info: PackageInfo): Set<String> {
        val firmas = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val datos = info.signingInfo ?: return emptySet()
            if (datos.hasMultipleSigners()) datos.apkContentsSigners else datos.signingCertificateHistory
        } else {
            info.signatures
        } ?: return emptySet()
        val sha = MessageDigest.getInstance("SHA-256")
        return firmas.map { firma -> sha.digest(firma.toByteArray()).joinToString("") { "%02x".format(it) } }.toSet()
    }
}
