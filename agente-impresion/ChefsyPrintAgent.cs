using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

namespace ChefsyPrintAgent
{
    // Agente local de impresion para Chefsy.
    // Escucha solamente en 127.0.0.1, recibe bytes ESC/POS por HTTP y los
    // manda al spooler de Windows con datatype RAW. No abre dialogos.
    internal static class Program
    {
        private const string Version = "1.0.0";
        private const string MutexName = "ChefsyPrintAgent";
        private const int MaxBodyBytes = 2 * 1024 * 1024;

        private static string _baseDir;
        private static string _configPath;
        private static string _logPath;
        private static int _port = 9187;
        private static string _token = "";
        private static string _printer = "";
        private static readonly object _logLock = new object();

        private static int Main(string[] args)
        {
            _baseDir = AppDomain.CurrentDomain.BaseDirectory;
            _configPath = Path.Combine(_baseDir, "config.ini");
            _logPath = Path.Combine(_baseDir, "agent.log");

            bool createdNew;
            using (var mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    Log("Ya hay una instancia del agente en ejecucion. Saliendo.");
                    return 0;
                }

                try
                {
                    CargarConfiguracion();

                    if (string.IsNullOrEmpty(_token))
                    {
                        _token = GenerarToken();
                        GuardarConfiguracion();
                    }

                    Log("Iniciando agente " + Version + " en 127.0.0.1:" + _port.ToString(CultureInfo.InvariantCulture) + ".");
                    Escuchar();
                    return 0;
                }
                catch (Exception ex)
                {
                    Log("Error fatal: " + ex.ToString());
                    return 1;
                }
            }
        }

        private static void Escuchar()
        {
            var listener = new TcpListener(IPAddress.Loopback, _port);
            listener.Start(10);

            while (true)
            {
                TcpClient client = null;
                try
                {
                    client = listener.AcceptTcpClient();
                }
                catch (Exception ex)
                {
                    Log("Error aceptando conexion: " + ex.Message);
                    continue;
                }

                using (client)
                {
                    try
                    {
                        AtenderCliente(client);
                    }
                    catch (Exception ex)
                    {
                        Log("Error atendiendo cliente: " + ex.Message);
                    }
                }
            }
        }

        private static void AtenderCliente(TcpClient client)
        {
            client.ReceiveTimeout = 5000;
            client.SendTimeout = 5000;

            using (var stream = client.GetStream())
            {
                stream.ReadTimeout = 5000;
                stream.WriteTimeout = 5000;

                var lineaSolicitud = LeerLinea(stream, 8192);
                if (lineaSolicitud == null)
                {
                    return;
                }

                var partes = lineaSolicitud.Split(' ');
                if (partes.Length < 3)
                {
                    ResponderError(stream, 400, "Solicitud HTTP invalida.");
                    return;
                }

                var metodo = partes[0].ToUpperInvariant();
                var ruta = partes[1];
                var indiceQuery = ruta.IndexOf('?');
                if (indiceQuery >= 0)
                {
                    ruta = ruta.Substring(0, indiceQuery);
                }

                var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                while (true)
                {
                    var linea = LeerLinea(stream, 8192);
                    if (linea == null)
                    {
                        return;
                    }
                    if (linea.Length == 0)
                    {
                        break;
                    }

                    var indice = linea.IndexOf(':');
                    if (indice <= 0)
                    {
                        continue;
                    }

                    var nombre = linea.Substring(0, indice).Trim();
                    var valor = linea.Substring(indice + 1).Trim();
                    headers[nombre] = valor;
                }

                if (metodo == "OPTIONS")
                {
                    ResponderPreflight(stream);
                    return;
                }

                if (!TokenValido(headers))
                {
                    ResponderError(stream, 401, "Token del agente incorrecto o ausente.");
                    return;
                }

                if (metodo == "GET" && (ruta == "/health" || ruta == "/health/"))
                {
                    ResponderHealth(stream);
                    return;
                }

                if (metodo == "POST" && (ruta == "/print" || ruta == "/print/"))
                {
                    ProcesarImpresion(stream, headers);
                    return;
                }

                ResponderError(stream, 404, "Ruta no encontrada.");
            }
        }

        private static void ResponderHealth(NetworkStream stream)
        {
            var usaPredeterminada = string.IsNullOrEmpty(_printer);
            var nombre = usaPredeterminada ? RawPrinter.ObtenerImpresoraPredeterminada() : _printer;

            if (string.IsNullOrEmpty(nombre))
            {
                ResponderJson(stream, 200, "{\"ok\":false,\"version\":\"" + Version + "\",\"error\":\"No hay impresora configurada ni predeterminada en Windows.\"}");
                return;
            }

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"version\":\"").Append(EscapeJson(Version)).Append("\"");
            respuesta.Append(",\"printer\":\"").Append(EscapeJson(nombre)).Append("\"");
            respuesta.Append(",\"defaultPrinter\":").Append(usaPredeterminada ? "true" : "false");
            respuesta.Append(",\"port\":").Append(_port.ToString(CultureInfo.InvariantCulture));
            respuesta.Append("}");
            ResponderJson(stream, 200, respuesta.ToString());
        }

        private static void ProcesarImpresion(NetworkStream stream, Dictionary<string, string> headers)
        {
            string valorContentLength;
            if (!headers.TryGetValue("Content-Length", out valorContentLength))
            {
                ResponderError(stream, 411, "Falta Content-Length.");
                return;
            }

            int contentLength;
            if (!int.TryParse(valorContentLength, NumberStyles.Integer, CultureInfo.InvariantCulture, out contentLength) || contentLength <= 0)
            {
                ResponderError(stream, 400, "El cuerpo de la impresion esta vacio.");
                return;
            }

            if (contentLength > MaxBodyBytes)
            {
                ResponderError(stream, 413, "El cuerpo de la impresion es demasiado grande.");
                return;
            }

            string expect;
            if (headers.TryGetValue("Expect", out expect) && string.Equals(expect, "100-continue", StringComparison.OrdinalIgnoreCase))
            {
                var cien = Encoding.ASCII.GetBytes("HTTP/1.1 100 Continue\r\n\r\n");
                stream.Write(cien, 0, cien.Length);
                stream.Flush();
            }

            var body = new byte[contentLength];
            var leidos = 0;
            while (leidos < contentLength)
            {
                var n = stream.Read(body, leidos, contentLength - leidos);
                if (n <= 0)
                {
                    ResponderError(stream, 400, "La conexion se cerro antes de recibir el cuerpo.");
                    return;
                }
                leidos += n;
            }

            string printerHeader;
            var impresora = headers.TryGetValue("X-Chefsy-Printer", out printerHeader) && !string.IsNullOrEmpty(printerHeader.Trim())
                ? printerHeader.Trim()
                : _printer;

            if (string.IsNullOrEmpty(impresora))
            {
                impresora = RawPrinter.ObtenerImpresoraPredeterminada();
            }

            if (string.IsNullOrEmpty(impresora))
            {
                ResponderError(stream, 500, "No hay impresora configurada ni predeterminada en Windows.");
                return;
            }

            string error;
            if (!RawPrinter.Enviar(body, impresora, out error))
            {
                Log("Error imprimiendo en '" + impresora + "': " + error);
                ResponderError(stream, 500, error);
                return;
            }

            Log("Comanda enviada a '" + impresora + "' (" + body.Length.ToString(CultureInfo.InvariantCulture) + " bytes).");

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"printer\":\"").Append(EscapeJson(impresora)).Append("\"");
            respuesta.Append(",\"bytes\":").Append(body.Length.ToString(CultureInfo.InvariantCulture));
            respuesta.Append("}");
            ResponderJson(stream, 200, respuesta.ToString());
        }

        private static bool TokenValido(Dictionary<string, string> headers)
        {
            string recibido;
            if (!headers.TryGetValue("X-Chefsy-Token", out recibido))
            {
                return false;
            }

            return string.Equals(recibido, _token, StringComparison.Ordinal);
        }

        private static string LeerLinea(NetworkStream stream, int maximo)
        {
            var bytes = new List<byte>(128);

            while (bytes.Count < maximo)
            {
                var b = stream.ReadByte();
                if (b < 0)
                {
                    return bytes.Count == 0 ? null : Encoding.ASCII.GetString(bytes.ToArray());
                }

                if (b == 10)
                {
                    if (bytes.Count > 0 && bytes[bytes.Count - 1] == 13)
                    {
                        bytes.RemoveAt(bytes.Count - 1);
                    }
                    return Encoding.ASCII.GetString(bytes.ToArray());
                }

                bytes.Add((byte)b);
            }

            return Encoding.ASCII.GetString(bytes.ToArray());
        }

        private static void ResponderPreflight(NetworkStream stream)
        {
            var headers = new StringBuilder();
            headers.Append("HTTP/1.1 204 No Content\r\n");
            headers.Append(CabecerasCors());
            headers.Append("Content-Length: 0\r\n");
            headers.Append("Connection: close\r\n");
            headers.Append("\r\n");

            var bytes = Encoding.ASCII.GetBytes(headers.ToString());
            stream.Write(bytes, 0, bytes.Length);
            stream.Flush();
        }

        private static void ResponderError(NetworkStream stream, int codigo, string mensaje)
        {
            var body = new StringBuilder();
            body.Append("{\"ok\":false,\"error\":\"").Append(EscapeJson(mensaje)).Append("\"}");
            ResponderTexto(stream, codigo, body.ToString());
        }

        private static void ResponderJson(NetworkStream stream, int codigo, string json)
        {
            ResponderTexto(stream, codigo, json);
        }

        private static void ResponderTexto(NetworkStream stream, int codigo, string body)
        {
            var bodyBytes = Encoding.UTF8.GetBytes(body);
            var headers = new StringBuilder();
            headers.Append("HTTP/1.1 ").Append(codigo.ToString(CultureInfo.InvariantCulture)).Append(" ").Append(EstadoHttp(codigo)).Append("\r\n");
            headers.Append("Content-Type: application/json; charset=utf-8\r\n");
            headers.Append("Content-Length: ").Append(bodyBytes.Length.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            headers.Append("Cache-Control: no-store\r\n");
            headers.Append("X-Content-Type-Options: nosniff\r\n");
            headers.Append(CabecerasCors());
            headers.Append("Connection: close\r\n");
            headers.Append("\r\n");

            var headerBytes = Encoding.ASCII.GetBytes(headers.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(bodyBytes, 0, bodyBytes.Length);
            stream.Flush();
        }

        private static string CabecerasCors()
        {
            return "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                + "Access-Control-Allow-Headers: Content-Type, X-Chefsy-Token, X-Chefsy-Printer\r\n"
                + "Access-Control-Allow-Private-Network: true\r\n"
                + "Access-Control-Max-Age: 86400\r\n";
        }

        private static string EstadoHttp(int codigo)
        {
            switch (codigo)
            {
                case 200: return "OK";
                case 204: return "No Content";
                case 400: return "Bad Request";
                case 401: return "Unauthorized";
                case 404: return "Not Found";
                case 411: return "Length Required";
                case 413: return "Payload Too Large";
                case 500: return "Internal Server Error";
                default: return "Error";
            }
        }

        private static string EscapeJson(string texto)
        {
            if (texto == null)
            {
                return "";
            }

            var sb = new StringBuilder(texto.Length + 8);
            foreach (var c in texto)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 32)
                        {
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        }
                        else
                        {
                            sb.Append(c);
                        }
                        break;
                }
            }
            return sb.ToString();
        }

        private static void CargarConfiguracion()
        {
            if (!File.Exists(_configPath))
            {
                return;
            }

            foreach (var linea in File.ReadAllLines(_configPath))
            {
                var texto = linea.Trim();
                if (texto.Length == 0 || texto.StartsWith("#") || texto.StartsWith(";"))
                {
                    continue;
                }

                var indice = texto.IndexOf('=');
                if (indice <= 0)
                {
                    continue;
                }

                var clave = texto.Substring(0, indice).Trim().ToLowerInvariant();
                var valor = texto.Substring(indice + 1).Trim();

                if (clave == "puerto")
                {
                    int puerto;
                    if (int.TryParse(valor, NumberStyles.Integer, CultureInfo.InvariantCulture, out puerto) && puerto > 0 && puerto < 65536)
                    {
                        _port = puerto;
                    }
                }
                else if (clave == "token")
                {
                    _token = valor;
                }
                else if (clave == "impresora")
                {
                    _printer = valor;
                }
            }
        }

        private static void GuardarConfiguracion()
        {
            var sb = new StringBuilder();
            sb.AppendLine("# Configuracion del agente de impresion Chefsy");
            sb.AppendLine("# No compartas este archivo: contiene el token de acceso.");
            sb.AppendLine("puerto=" + _port.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("token=" + _token);
            sb.AppendLine("impresora=" + _printer);
            File.WriteAllText(_configPath, sb.ToString(), new UTF8Encoding(false));
        }

        private static string GenerarToken()
        {
            var bytes = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(bytes);
            }

            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static void Log(string mensaje)
        {
            try
            {
                lock (_logLock)
                {
                    var archivo = new FileInfo(_logPath);
                    if (archivo.Exists && archivo.Length > 256 * 1024)
                    {
                        File.WriteAllText(_logPath, "");
                    }

                    var linea = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                        + " " + mensaje + Environment.NewLine;
                    File.AppendAllText(_logPath, linea, new UTF8Encoding(false));
                }
            }
            catch
            {
                // El log nunca debe tumbar al agente.
            }
        }
    }

    internal static class RawPrinter
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct DOC_INFO_1
        {
            [MarshalAs(UnmanagedType.LPWStr)]
            public string pDocName;

            [MarshalAs(UnmanagedType.LPWStr)]
            public string pOutputFile;

            [MarshalAs(UnmanagedType.LPWStr)]
            public string pDatatype;
        }

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOC_INFO_1 pDocInfo);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool WritePrinter(IntPtr hPrinter, [In] byte[] pBuf, int cbBuf, out int pcWritten);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool GetDefaultPrinter(StringBuilder pszBuffer, ref int pcchBuffer);

        public static string ObtenerImpresoraPredeterminada()
        {
            var buffer = new StringBuilder(1024);
            var tamano = buffer.Capacity;

            if (GetDefaultPrinter(buffer, ref tamano))
            {
                return buffer.ToString();
            }

            if (tamano > buffer.Capacity)
            {
                buffer = new StringBuilder(tamano);
                if (GetDefaultPrinter(buffer, ref tamano))
                {
                    return buffer.ToString();
                }
            }

            return null;
        }

        public static bool Enviar(byte[] bytes, string impresora, out string error)
        {
            error = null;
            var hPrinter = IntPtr.Zero;
            var documentoIniciado = false;
            var paginaIniciada = false;

            if (bytes == null || bytes.Length == 0)
            {
                error = "No hay datos para imprimir.";
                return false;
            }

            if (string.IsNullOrEmpty(impresora))
            {
                error = "No hay impresora configurada.";
                return false;
            }

            try
            {
                if (!OpenPrinter(impresora, out hPrinter, IntPtr.Zero))
                {
                    error = "No se pudo abrir la impresora '" + impresora + "'. "
                        + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                    return false;
                }

                var documento = new DOC_INFO_1();
                documento.pDocName = "Chefsy Comanda";
                documento.pOutputFile = null;
                documento.pDatatype = "RAW";

                var trabajo = StartDocPrinter(hPrinter, 1, ref documento);
                if (trabajo == 0)
                {
                    error = "Windows no pudo iniciar el trabajo de impresion. "
                        + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                    return false;
                }
                documentoIniciado = true;

                if (!StartPagePrinter(hPrinter))
                {
                    error = "Windows no pudo iniciar la pagina de impresion. "
                        + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                    return false;
                }
                paginaIniciada = true;

                int escritos;
                if (!WritePrinter(hPrinter, bytes, bytes.Length, out escritos))
                {
                    error = "Windows no pudo escribir en la impresora. "
                        + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                    return false;
                }

                if (escritos != bytes.Length)
                {
                    error = "Se enviaron " + escritos.ToString(CultureInfo.InvariantCulture)
                        + " de " + bytes.Length.ToString(CultureInfo.InvariantCulture) + " bytes.";
                    return false;
                }

                return true;
            }
            finally
            {
                if (paginaIniciada)
                {
                    EndPagePrinter(hPrinter);
                }
                if (documentoIniciado)
                {
                    EndDocPrinter(hPrinter);
                }
                if (hPrinter != IntPtr.Zero)
                {
                    ClosePrinter(hPrinter);
                }
            }
        }
    }
}
