using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;

namespace AgentePOS
{
    // Servidor HTTP crudo sobre TcpListener en 127.0.0.1. Sin dependencias.
    // Enrutado:
    //   GET  /panel        panel web (sin token, con origen permitido)
    //   GET  /health       estado (token)
    //   GET  /config       tipografia guardada (token)
    //   POST /config       guardar tipografia (token)
    //   GET  /diagnostico  chequeos (token)
    //   POST /print        imprimir bytes crudos (token)
    //   POST /update       auto-actualizacion (token, si hay origen)
    //   GET  /api/estado   resumen para el panel (token)
    //   GET  /api/impresoras  listar impresoras (token)
    //   POST /api/impresora   elegir impresora del agente (token)
    //   POST /api/predeterminada  definir predeterminada de Windows (token)
    //   POST /api/prueba      imprimir pagina de prueba (token)
    //   POST /api/sanar       reparar spooler con elevacion (token)
    //   GET  /api/spooler     estado del servicio de cola (token)
    //   GET  /api/lan-scan    descubrir impresoras de red 9100 (token)
    //   POST /api/ajustes     auto_sanar (token)
    internal static class ServidorHttp
    {
        public static void Escuchar()
        {
            Estado.Listener = new TcpListener(IPAddress.Loopback, Estado.Puerto);
            // Permite reabrir el puerto inmediatamente despues de una actualizacion:
            // las conexiones anteriores quedan en TIME_WAIT y sin esta opcion
            // el agente nuevo no podria bindear hasta que expiren.
            Estado.Listener.Server.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            Estado.Listener.Start(10);

            while (true)
            {
                TcpClient client = null;
                try
                {
                    client = Estado.Listener.AcceptTcpClient();
                }
                catch (Exception ex)
                {
                    if (Estado.Deteniendo)
                    {
                        break;
                    }
                    Estado.Log("Error aceptando conexion: " + ex.Message);
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
                        Estado.Log("Error atendiendo cliente: " + ex.Message);
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
                if (ruta.Length > 1 && ruta.EndsWith("/", StringComparison.Ordinal))
                {
                    ruta = ruta.TrimEnd('/');
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

                    headers[linea.Substring(0, indice).Trim()] = linea.Substring(indice + 1).Trim();
                }

                if (metodo == "OPTIONS")
                {
                    ResponderPreflight(stream, headers);
                    return;
                }

                if (metodo == "GET" && (ruta == "/panel" || ruta == "/"))
                {
                    PanelHtml.Servir(stream, headers);
                    return;
                }

                if (!TokenValido(headers))
                {
                    ResponderError(stream, 401, "Token del agente incorrecto o ausente.", headers);
                    return;
                }

                switch (ruta)
                {
                    case "/health":
                        if (metodo == "GET") { ApiPos.Salud(stream); return; }
                        break;

                    case "/config":
                        if (metodo == "GET") { ApiPos.VerConfig(stream); return; }
                        if (metodo == "POST") { ApiPos.GuardarConfig(stream, headers); return; }
                        break;

                    case "/diagnostico":
                        if (metodo == "GET") { ApiPos.Diagnostico(stream); return; }
                        break;

                    case "/print":
                        if (metodo == "POST") { ApiPos.Imprimir(stream, headers); return; }
                        break;

                    case "/update":
                        if (metodo == "POST") { Actualizacion.Procesar(stream, headers); return; }
                        break;

                    case "/api/estado":
                        if (metodo == "GET") { ApiPanel.ResponderEstado(stream); return; }
                        break;

                    case "/api/impresoras":
                        if (metodo == "GET") { ApiPanel.ResponderImpresoras(stream); return; }
                        break;

                    case "/api/impresora":
                        if (metodo == "POST") { ApiPanel.ElegirImpresora(stream, headers); return; }
                        break;

                    case "/api/predeterminada":
                        if (metodo == "POST") { ApiPanel.DefinirPredeterminada(stream, headers); return; }
                        break;

                    case "/api/prueba":
                        if (metodo == "POST") { ApiPanel.ResponderPrueba(stream); return; }
                        break;

                    case "/api/sanar":
                        if (metodo == "POST") { ApiPanel.ResponderSanar(stream); return; }
                        break;

                    case "/api/spooler":
                        if (metodo == "GET") { ApiPanel.ResponderSpooler(stream); return; }
                        break;

                    case "/api/lan-scan":
                        if (metodo == "GET") { ApiPanel.ResponderLanScan(stream); return; }
                        break;

                    case "/api/ajustes":
                        if (metodo == "POST") { ApiPanel.GuardarAjustes(stream, headers); return; }
                        break;
                }

                ResponderError(stream, 404, "Ruta no encontrada.");
            }
        }

        private static bool TokenValido(Dictionary<string, string> headers)
        {
            string recibido;
            if (!headers.TryGetValue("X-Pos-Token", out recibido))
            {
                return false;
            }

            return string.Equals(recibido, Estado.Token, StringComparison.Ordinal);
        }

        public static string LeerLinea(NetworkStream stream, int maximo)
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

        public static bool LeerCuerpo(NetworkStream stream, Dictionary<string, string> headers, int maximo, out byte[] body)
        {
            body = null;

            string valorContentLength;
            if (!headers.TryGetValue("Content-Length", out valorContentLength))
            {
                ResponderError(stream, 411, "Falta Content-Length.");
                return false;
            }

            int contentLength;
            if (!int.TryParse(valorContentLength, NumberStyles.Integer, CultureInfo.InvariantCulture, out contentLength)
                || contentLength <= 0)
            {
                ResponderError(stream, 400, "El cuerpo de la solicitud esta vacio.");
                return false;
            }

            if (contentLength > maximo)
            {
                ResponderError(stream, 413, "El cuerpo de la solicitud es demasiado grande.");
                return false;
            }

            string expect;
            if (headers.TryGetValue("Expect", out expect)
                && string.Equals(expect, "100-continue", StringComparison.OrdinalIgnoreCase))
            {
                var cien = Encoding.ASCII.GetBytes("HTTP/1.1 100 Continue\r\n\r\n");
                stream.Write(cien, 0, cien.Length);
                stream.Flush();
            }

            body = new byte[contentLength];
            var leidos = 0;
            while (leidos < contentLength)
            {
                var n = stream.Read(body, leidos, contentLength - leidos);
                if (n <= 0)
                {
                    ResponderError(stream, 400, "La conexion se cerro antes de recibir el cuerpo.");
                    body = null;
                    return false;
                }
                leidos += n;
            }

            return true;
        }

        public static bool DrenarCuerpo(NetworkStream stream, Dictionary<string, string> headers)
        {
            string valorContentLength;
            if (!headers.TryGetValue("Content-Length", out valorContentLength))
            {
                return true;
            }

            int contentLength;
            if (!int.TryParse(valorContentLength, NumberStyles.Integer, CultureInfo.InvariantCulture, out contentLength)
                || contentLength <= 0)
            {
                return true;
            }

            if (contentLength > Estado.MaxConfigBytes)
            {
                ResponderError(stream, 413, "El cuerpo de la solicitud es demasiado grande.");
                return false;
            }

            var buffer = new byte[Math.Min(contentLength, 8192)];
            var restante = contentLength;
            while (restante > 0)
            {
                var n = stream.Read(buffer, 0, Math.Min(buffer.Length, restante));
                if (n <= 0)
                {
                    return false;
                }
                restante -= n;
            }

            return true;
        }

        public static void ResponderPreflight(NetworkStream stream, Dictionary<string, string> headers = null)
        {
            var sb = new StringBuilder();
            sb.Append("HTTP/1.1 204 No Content\r\n");
            sb.Append(CabecerasCors(headers));
            sb.Append("Content-Length: 0\r\n");
            sb.Append("Connection: close\r\n");
            sb.Append("\r\n");

            var bytes = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(bytes, 0, bytes.Length);
            stream.Flush();
        }

        public static void ResponderError(NetworkStream stream, int codigo, string mensaje, Dictionary<string, string> headers = null)
        {
            var body = new StringBuilder();
            body.Append("{\"ok\":false,\"error\":\"").Append(EscapeJson(mensaje)).Append("\"}");
            ResponderTexto(stream, codigo, body.ToString(), headers);
        }

        public static void ResponderJson(NetworkStream stream, int codigo, string json, Dictionary<string, string> headers = null)
        {
            ResponderTexto(stream, codigo, json, headers);
        }

        public static void ResponderTexto(NetworkStream stream, int codigo, string body, Dictionary<string, string> headers = null)
        {
            EscribirRespuesta(stream, codigo, "application/json; charset=utf-8", body, headers);
        }

        public static void ResponderHtml(NetworkStream stream, int codigo, string html, Dictionary<string, string> headers = null)
        {
            EscribirRespuesta(stream, codigo, "text/html; charset=utf-8", html, headers);
        }

        private static void EscribirRespuesta(NetworkStream stream, int codigo, string contentType, string body, Dictionary<string, string> headers)
        {
            var bodyBytes = Encoding.UTF8.GetBytes(body);
            var sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(codigo.ToString(CultureInfo.InvariantCulture))
                .Append(' ').Append(EstadoHttp(codigo)).Append("\r\n");
            sb.Append("Content-Type: ").Append(contentType).Append("\r\n");
            sb.Append("Content-Length: ").Append(bodyBytes.Length.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("Cache-Control: no-store\r\n");
            sb.Append("X-Content-Type-Options: nosniff\r\n");
            sb.Append("X-Robots-Tag: noindex\r\n");
            sb.Append(CabecerasCors(headers));
            sb.Append("Connection: close\r\n");
            sb.Append("\r\n");

            var headerBytes = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(bodyBytes, 0, bodyBytes.Length);
            stream.Flush();
        }

        public static string CabecerasCors(Dictionary<string, string> reqHeaders = null)
        {
            string origin = null;
            if (reqHeaders != null)
            {
                reqHeaders.TryGetValue("Origin", out origin);
            }

            var sb = new StringBuilder();
            if (!string.IsNullOrEmpty(origin))
            {
                sb.Append("Access-Control-Allow-Origin: ").Append(origin).Append("\r\n");
                sb.Append("Vary: Origin\r\n");
            }
            else
            {
                sb.Append("Access-Control-Allow-Origin: *\r\n");
            }

            sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");

            string reqAllowedHeaders;
            if (reqHeaders != null && reqHeaders.TryGetValue("Access-Control-Request-Headers", out reqAllowedHeaders)
                && !string.IsNullOrEmpty(reqAllowedHeaders))
            {
                sb.Append("Access-Control-Allow-Headers: ").Append(reqAllowedHeaders)
                    .Append(", Content-Type, X-Pos-Token, Access-Control-Request-Private-Network\r\n");
            }
            else
            {
                sb.Append("Access-Control-Allow-Headers: Content-Type, X-Pos-Token, Access-Control-Request-Private-Network\r\n");
            }

            sb.Append("Access-Control-Allow-Private-Network: true\r\n");
            sb.Append("Access-Control-Max-Age: 86400\r\n");
            return sb.ToString();
        }

        public static string EstadoHttp(int codigo)
        {
            switch (codigo)
            {
                case 200: return "OK";
                case 204: return "No Content";
                case 400: return "Bad Request";
                case 401: return "Unauthorized";
                case 403: return "Forbidden";
                case 404: return "Not Found";
                case 409: return "Conflict";
                case 411: return "Length Required";
                case 413: return "Payload Too Large";
                case 500: return "Internal Server Error";
                default: return "Error";
            }
        }

        public static string EscapeJson(string texto)
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
    }
}
