using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace AgentePOS
{
    // Auto-actualizacion: descarga un manifiesto version.json desde el origen
    // configurado, verifica SHA-256 del binario nuevo y se reemplaza a si
    // mismo con un script temporal. En la version universal el origen viene
    // vacio por defecto (la actualizacion queda desactivada hasta que se
    // configure un servidor de distribucion propio).
    internal static class Actualizacion
    {
        public static void Procesar(NetworkStream stream, Dictionary<string, string> headers)
        {
            // Consumir el cuerpo antes de responder: si el cliente manda un POST
            // con body y el servidor contesta y cierra, algunos clientes ven un
            // reset de conexion en lugar de la respuesta.
            if (!ServidorHttp.DrenarCuerpo(stream, headers))
            {
                return;
            }

            if (string.IsNullOrEmpty(Estado.OrigenActualizacion))
            {
                ServidorHttp.ResponderError(stream, 403,
                    "Este agente no tiene origen de actualizacion configurado.");
                return;
            }

            Uri origen;
            if (!Uri.TryCreate(Estado.OrigenActualizacion, UriKind.Absolute, out origen))
            {
                ServidorHttp.ResponderError(stream, 500,
                    "El origen de actualizacion configurado no es una URL valida.");
                return;
            }
            if (!(origen.Scheme == Uri.UriSchemeHttps || (origen.Scheme == Uri.UriSchemeHttp && origen.IsLoopback)))
            {
                ServidorHttp.ResponderError(stream, 500,
                    "El origen de actualizacion debe ser HTTPS (o localhost para pruebas).");
                return;
            }

            try
            {
                var urlManifiesto = new Uri(origen, "version.json");
                var texto = DescargarTexto(urlManifiesto, 64 * 1024, 15000);

                var serializer = new JavaScriptSerializer();
                var datos = serializer.Deserialize<Dictionary<string, object>>(texto);
                if (datos == null)
                {
                    throw new Exception("El manifiesto de actualizacion esta vacio.");
                }

                var versionNueva = LeerTexto(datos, "version");
                var hashEsperado = LeerTexto(datos, "sha256").ToLowerInvariant();
                if (string.IsNullOrEmpty(versionNueva) || hashEsperado.Length != 64)
                {
                    throw new Exception("El manifiesto de actualizacion no tiene version o sha256 validos.");
                }

                if (!VersionMayor(versionNueva, Estado.Version))
                {
                    ServidorHttp.ResponderJson(stream, 200,
                        "{\"ok\":true,\"actualizado\":false,\"actual\":\""
                        + ServidorHttp.EscapeJson(Estado.Version)
                        + "\",\"version\":\"" + ServidorHttp.EscapeJson(versionNueva) + "\"}");
                    return;
                }

                var urlBinario = new Uri(origen, "AgentePOS.exe");
                var bytes = DescargarBytes(urlBinario, Estado.MaxUpdateBytes, 30000);
                if (bytes.Length < 4096 || bytes[0] != (byte)'M' || bytes[1] != (byte)'Z')
                {
                    throw new Exception("El archivo descargado no parece un ejecutable de Windows.");
                }

                var hashCalculado = HashSha256(bytes);
                if (!string.Equals(hashCalculado, hashEsperado, StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception("La verificacion SHA-256 no coincide. Se cancelo la actualizacion.");
                }

                var exeActual = Path.Combine(Estado.BaseDir, "AgentePOS.exe");
                var exeNuevo = Path.Combine(Estado.BaseDir, "AgentePOS.nuevo.exe");
                var backup = Path.Combine(Estado.BaseDir, "AgentePOS.exe.bak");
                var script = Path.Combine(Estado.BaseDir, "actualizar.cmd");

                File.WriteAllBytes(exeNuevo, bytes);
                if (File.Exists(exeActual))
                {
                    File.Copy(exeActual, backup, true);
                }

                var pidActual = Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture);
                var contenido = "@echo off\r\n"
                    + "set intentos=0\r\n"
                    + ":esperar\r\n"
                    + "tasklist /FI \"PID eq " + pidActual + "\" /NH | find \"AgentePOS.exe\" >nul\r\n"
                    + "if errorlevel 1 goto listo\r\n"
                    + "set /a intentos+=1\r\n"
                    + "if %intentos% GEQ 30 goto listo\r\n"
                    + "ping -n 2 127.0.0.1 >nul\r\n"
                    + "goto esperar\r\n"
                    + ":listo\r\n"
                    + "copy /y \"" + exeNuevo + "\" \"" + exeActual + "\" >nul\r\n"
                    + "start \"\" \"" + exeActual + "\"\r\n"
                    + "del \"" + exeNuevo + "\" >nul 2>&1\r\n"
                    + "del \"%~f0\" >nul 2>&1\r\n";
                File.WriteAllText(script, contenido, new UTF8Encoding(false));

                var info = new ProcessStartInfo();
                info.FileName = "cmd.exe";
                info.Arguments = "/c \"" + script + "\"";
                info.WorkingDirectory = Estado.BaseDir;
                info.CreateNoWindow = true;
                info.UseShellExecute = false;

                // Cerrar el listener ANTES de lanzar cmd: si se hereda el socket,
                // el puerto queda tomado por un listener fantasma que nunca acepta
                // conexiones y el agente nuevo no recibe trafico.
                Estado.Deteniendo = true;
                try
                {
                    if (Estado.Listener != null)
                    {
                        Estado.Listener.Stop();
                    }
                }
                catch
                {
                }

                Process.Start(info);

                Estado.Log("Actualizacion a " + versionNueva + " descargada ("
                    + bytes.Length.ToString(CultureInfo.InvariantCulture) + " bytes). Reiniciando agente.");

                var respuesta = new StringBuilder();
                respuesta.Append("{\"ok\":true,\"actualizado\":true");
                respuesta.Append(",\"actual\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");
                respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(versionNueva)).Append("\"");
                respuesta.Append(",\"bytes\":").Append(bytes.Length.ToString(CultureInfo.InvariantCulture));
                respuesta.Append(",\"reiniciando\":true}");
                ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());

                // Dar tiempo a que el cliente reciba la respuesta y que el .cmd
                // reemplace el ejecutable bloqueado por este proceso.
                Thread.Sleep(400);
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                Estado.RegistrarError("Actualizacion: " + ex.Message);
                Estado.Log("Error de actualizacion: " + ex.Message);
                ServidorHttp.ResponderError(stream, 500, ex.Message);
            }
        }

        private static byte[] DescargarBytes(Uri url, int maximo, int timeoutMs)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Timeout = timeoutMs;
            request.ReadWriteTimeout = timeoutMs;
            request.UserAgent = Estado.NombreProducto + "/" + Estado.Version;
            request.AllowAutoRedirect = true;

            using (var response = (HttpWebResponse)request.GetResponse())
            {
                if (!MismoHost(response.ResponseUri.Host, url.Host))
                {
                    throw new Exception("La descarga fue redirigida a un host no permitido: "
                        + response.ResponseUri.Host);
                }

                using (var stream = response.GetResponseStream())
                {
                    if (stream == null)
                    {
                        throw new Exception("No se pudo leer la respuesta del servidor.");
                    }

                    using (var memoria = new MemoryStream())
                    {
                        var buffer = new byte[8192];
                        int leidos;
                        while ((leidos = stream.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            if (memoria.Length + leidos > maximo)
                            {
                                throw new Exception("El archivo de actualizacion supera el tamano maximo permitido.");
                            }
                            memoria.Write(buffer, 0, leidos);
                        }
                        return memoria.ToArray();
                    }
                }
            }
        }

        private static bool MismoHost(string primero, string segundo)
        {
            if (string.Equals(primero, segundo, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return string.Equals(primero, "www." + segundo, StringComparison.OrdinalIgnoreCase)
                || string.Equals(segundo, "www." + primero, StringComparison.OrdinalIgnoreCase);
        }

        private static string DescargarTexto(Uri url, int maximo, int timeoutMs)
        {
            return Encoding.UTF8.GetString(DescargarBytes(url, maximo, timeoutMs));
        }

        private static string HashSha256(byte[] bytes)
        {
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(bytes);
                var sb = new StringBuilder(hash.Length * 2);
                foreach (var b in hash)
                {
                    sb.Append(b.ToString("x2", CultureInfo.InvariantCulture));
                }
                return sb.ToString();
            }
        }

        private static string LeerTexto(Dictionary<string, object> datos, string clave)
        {
            object valor;
            if (datos == null || !datos.TryGetValue(clave, out valor) || valor == null)
            {
                return "";
            }
            return Convert.ToString(valor, CultureInfo.InvariantCulture).Trim();
        }

        private static bool VersionMayor(string candidata, string actual)
        {
            var nueva = ParsearVersion(candidata);
            var vigente = ParsearVersion(actual);
            var largo = Math.Max(nueva.Length, vigente.Length);

            for (var i = 0; i < largo; i++)
            {
                var a = i < nueva.Length ? nueva[i] : 0;
                var b = i < vigente.Length ? vigente[i] : 0;
                if (a > b) return true;
                if (a < b) return false;
            }

            return false;
        }

        private static int[] ParsearVersion(string texto)
        {
            var partes = (texto ?? "").Split('.');
            var numeros = new List<int>();
            foreach (var parte in partes)
            {
                int numero;
                if (!int.TryParse(parte, NumberStyles.Integer, CultureInfo.InvariantCulture, out numero))
                {
                    numero = 0;
                }
                numeros.Add(numero);
            }
            return numeros.ToArray();
        }
    }
}
