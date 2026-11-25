package xyz.chefsy.chefsy_pagos_listener

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class PagosNotificationListenerService : NotificationListenerService() {

    companion object {
        const val PREFS_NAME = "chefsy_pagos_prefs"
        const val KEY_ACTIVO = "listener_activo"
        const val KEY_ENDPOINT = "endpoint_url"
        const val KEY_TOKEN = "bearer_token"
        const val KEY_LOGS = "ultimos_logs"

        const val DEFAULT_ENDPOINT = "https://chefsy.xyz/api/notificaciones-pagos"
        const val DEFAULT_TOKEN = "chefsy_expo_secure_track_99XQ"

        private val PAQUETES_BILLETERAS = setOf(
            "com.mercadopago.wallet",
            "com.mercadolibre",
            "com.naranjax.app",
            "com.naranjax.naranjax",
            "com.brubank",
            "com.uala",
            "ar.com.uala",
            "com.playdigital.modo",
            "com.personal.pay",
            "ar.com.bancoprovincia.cuentadni",
            "ar.com.bna.app",
            "ar.com.bna.bnamas",
            "ar.com.santander.rio.mbanking",
            "com.galicia.app",
            "com.bbva.nxt_argentina",
            "com.macro.app",
            "com.lemoncash.app",
            "com.prex.argentina"
        )

        private val executor = Executors.newSingleThreadExecutor()

        fun registrarLog(context: Context, paquete: String, resumen: String, estado: String) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val arr = JSONArray(prefs.getString(KEY_LOGS, "[]") ?: "[]")
                val hora = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                val item = JSONObject().apply {
                    put("hora", hora)
                    put("paquete", paquete)
                    put("resumen", resumen.take(140))
                    put("estado", estado)
                }
                val nuevo = JSONArray()
                nuevo.put(item)
                val maxItems = minOf(arr.length(), 29)
                for (i in 0 until maxItems) {
                    nuevo.put(arr.get(i))
                }
                prefs.edit().putString(KEY_LOGS, nuevo.toString()).apply()
            } catch (_: Exception) {
            }
        }

        fun enviarAlBackend(
            context: Context,
            paquete: String,
            titulo: String,
            texto: String,
            onDone: ((Boolean, String) -> Unit)? = null
        ) {
            executor.execute {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val endpoint = prefs.getString(KEY_ENDPOINT, DEFAULT_ENDPOINT) ?: DEFAULT_ENDPOINT
                val token = prefs.getString(KEY_TOKEN, DEFAULT_TOKEN) ?: DEFAULT_TOKEN
                val resumen = listOf(titulo, texto).filter { it.isNotBlank() }.joinToString(" · ")

                var conn: HttpURLConnection? = null
                try {
                    val url = URL(endpoint)
                    conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = 8000
                        readTimeout = 8000
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                        setRequestProperty("Authorization", "Bearer $token")
                    }

                    val payload = JSONObject().apply {
                        put("paquete", paquete)
                        put("titulo", titulo)
                        put("texto", texto)
                    }

                    OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                        writer.write(payload.toString())
                        writer.flush()
                    }

                    val code = conn.responseCode
                    val bodyStr = try {
                        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                        stream?.bufferedReader(Charsets.UTF_8)?.readText() ?: ""
                    } catch (_: Exception) {
                        ""
                    }

                    if (code in 200..299) {
                        val respJson = try { JSONObject(bodyStr) } catch (_: Exception) { JSONObject() }
                        val estado = when {
                            respJson.optBoolean("descartada", false) ->
                                "Ignorada (${respJson.optString("motivo", "no es ingreso")})"
                            respJson.optBoolean("duplicada", false) ->
                                "Duplicada"
                            else -> {
                                val notif = respJson.optJSONObject("notificacion")
                                val monto = notif?.optDouble("monto", 0.0) ?: 0.0
                                val cliente = notif?.optString("pedido_cliente", "") ?: ""
                                if (cliente.isNotBlank()) {
                                    "Enviada ✓ \$${monto.toInt()} · Match: $cliente"
                                } else {
                                    "Enviada ✓ \$${monto.toInt()}"
                                }
                            }
                        }
                        registrarLog(context, paquete, resumen, estado)
                        onDone?.invoke(true, estado)
                    } else {
                        val estado = "Error HTTP $code"
                        registrarLog(context, paquete, resumen, estado)
                        onDone?.invoke(false, estado)
                    }
                } catch (e: Exception) {
                    val estado = "Error red: ${e.javaClass.simpleName}"
                    registrarLog(context, paquete, resumen, estado)
                    onDone?.invoke(false, estado)
                } finally {
                    conn?.disconnect()
                }
            }
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val activo = prefs.getBoolean(KEY_ACTIVO, true)
        if (!activo) return

        val paquete = sbn.packageName ?: return
        if (!PAQUETES_BILLETERAS.contains(paquete.lowercase(Locale.ROOT))) return

        val extras = sbn.notification?.extras ?: return
        val titulo = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val cuerpo = if (bigText.length >= text.length) bigText else text

        if (titulo.isBlank() && cuerpo.isBlank()) return

        enviarAlBackend(applicationContext, paquete, titulo, cuerpo)
    }
}
