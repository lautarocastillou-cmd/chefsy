package xyz.chefsy.chefsy_pagos_listener

import android.content.Context
import android.content.Intent
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "chefsy.pagos/listener"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                val prefs = getSharedPreferences(
                    PagosNotificationListenerService.PREFS_NAME,
                    Context.MODE_PRIVATE
                )
                when (call.method) {
                    "estaPermisoActivo" -> {
                        val enabled = Settings.Secure.getString(
                            contentResolver,
                            "enabled_notification_listeners"
                        ) ?: ""
                        result.success(enabled.contains(packageName))
                    }
                    "abrirAjustesPermiso" -> {
                        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        result.success(true)
                    }
                    "obtenerConfig" -> {
                        result.success(
                            mapOf(
                                "activo" to prefs.getBoolean(PagosNotificationListenerService.KEY_ACTIVO, true),
                                "endpoint" to (prefs.getString(
                                    PagosNotificationListenerService.KEY_ENDPOINT,
                                    PagosNotificationListenerService.DEFAULT_ENDPOINT
                                ) ?: PagosNotificationListenerService.DEFAULT_ENDPOINT),
                                "token" to (prefs.getString(
                                    PagosNotificationListenerService.KEY_TOKEN,
                                    PagosNotificationListenerService.DEFAULT_TOKEN
                                ) ?: PagosNotificationListenerService.DEFAULT_TOKEN)
                            )
                        )
                    }
                    "guardarConfig" -> {
                        val activo = call.argument<Boolean>("activo") ?: true
                        val endpoint = call.argument<String>("endpoint")?.trim()
                            ?.takeIf { it.isNotEmpty() }
                            ?: PagosNotificationListenerService.DEFAULT_ENDPOINT
                        val token = call.argument<String>("token")?.trim()
                            ?.takeIf { it.isNotEmpty() }
                            ?: PagosNotificationListenerService.DEFAULT_TOKEN

                        prefs.edit()
                            .putBoolean(PagosNotificationListenerService.KEY_ACTIVO, activo)
                            .putString(PagosNotificationListenerService.KEY_ENDPOINT, endpoint)
                            .putString(PagosNotificationListenerService.KEY_TOKEN, token)
                            .apply()
                        result.success(true)
                    }
                    "obtenerLogs" -> {
                        result.success(prefs.getString(PagosNotificationListenerService.KEY_LOGS, "[]") ?: "[]")
                    }
                    "limpiarLogs" -> {
                        prefs.edit().putString(PagosNotificationListenerService.KEY_LOGS, "[]").apply()
                        result.success(true)
                    }
                    "enviarPrueba" -> {
                        val monto = call.argument<String>("monto") ?: "15.000"
                        val remitente = call.argument<String>("remitente") ?: "Cliente Prueba"
                        PagosNotificationListenerService.enviarAlBackend(
                            applicationContext,
                            "com.mercadopago.wallet",
                            "¡Recibiste dinero!",
                            "Recibiste una transferencia de $remitente por \$ $monto"
                        ) { ok, msg ->
                            runOnUiThread {
                                result.success(mapOf("ok" to ok, "mensaje" to msg))
                            }
                        }
                    }
                    "reiniciarApp" -> {
                        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                        if (launchIntent != null) {
                            launchIntent.addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            )
                            startActivity(launchIntent)
                            Runtime.getRuntime().exit(0)
                        }
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
