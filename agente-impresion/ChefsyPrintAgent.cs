using System;
using System.Collections.Generic;
using System.ComponentModel;
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

namespace ChefsyPrintAgent
{
    // Agente local de impresion para Chefsy.
    // Escucha solamente en 127.0.0.1, recibe bytes ESC/POS por HTTP y los
    // manda al spooler de Windows con datatype RAW. No abre dialogos.
    internal static class Program
    {
        private const string Version = "1.3.1";
        private const string MutexName = "ChefsyPrintAgent";
        private const string OrigenActualizacionPorDefecto = "https://chefsy.xyz";
        private const int MaxBodyBytes = 2 * 1024 * 1024;
        private const int MaxConfigBytes = 32 * 1024;
        private const int MaxUpdateBytes = 5 * 1024 * 1024;

        private static string _baseDir;
        private static string _configPath;
        private static string _logPath;
        private static string _tipografiaPath;
        private static int _port = 9187;
        private static string _token = "";
        private static string _printer = "";
        private static readonly object _logLock = new object();
        private static readonly DateTime _inicio = DateTime.Now;
        private static string _tipografiaJson = "";
        private static string _tipografiaActualizada = "";
        private static string _ultimoError = "";
        private static string _ultimoErrorHora = "";
        private static string _origenActualizacion = OrigenActualizacionPorDefecto;
        private static bool _actualizando = false;
        private static volatile bool _deteniendo = false;
        private static TcpListener _listener = null;
        private static DocumentoTipografia _tipografiaComanda = DocumentoPorDefecto(true);
        private static DocumentoTipografia _tipografiaTicket = DocumentoPorDefecto(false);

        private static int Main(string[] args)
        {
            _baseDir = AppDomain.CurrentDomain.BaseDirectory;
            _configPath = Path.Combine(_baseDir, "config.ini");
            _logPath = Path.Combine(_baseDir, "agent.log");
            _tipografiaPath = Path.Combine(_baseDir, "tipografia.json");

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
            _listener = new TcpListener(IPAddress.Loopback, _port);
            // Permite reabrir el puerto inmediatamente despues de una actualizacion:
            // las conexiones HTTP anteriores quedan en TIME_WAIT y sin esta opcion
            // el agente nuevo no podria bindear hasta que expiren.
            _listener.Server.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            _listener.Start(10);

            while (true)
            {
                TcpClient client = null;
                try
                {
                    client = _listener.AcceptTcpClient();
                }
                catch (Exception ex)
                {
                    if (_deteniendo)
                    {
                        break;
                    }
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
                    ResponderPreflight(stream, headers);
                    return;
                }

                if (!TokenValido(headers))
                {
                    ResponderError(stream, 401, "Token del agente incorrecto o ausente.", headers);
                    return;
                }

                if (metodo == "GET" && (ruta == "/health" || ruta == "/health/"))
                {
                    ResponderHealth(stream);
                    return;
                }

                if (metodo == "GET" && (ruta == "/config" || ruta == "/config/"))
                {
                    ResponderConfig(stream);
                    return;
                }

                if (metodo == "POST" && (ruta == "/config" || ruta == "/config/"))
                {
                    ProcesarGuardarConfig(stream, headers);
                    return;
                }

                if (metodo == "GET" && (ruta == "/diagnostico" || ruta == "/diagnostico/"))
                {
                    ResponderDiagnostico(stream);
                    return;
                }

                if (metodo == "POST" && (ruta == "/update" || ruta == "/update/"))
                {
                    ProcesarActualizacion(stream, headers);
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

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":").Append(string.IsNullOrEmpty(nombre) ? "false" : "true");
            respuesta.Append(",\"agente\":true");
            respuesta.Append(",\"version\":\"").Append(EscapeJson(Version)).Append("\"");

            if (string.IsNullOrEmpty(nombre))
            {
                respuesta.Append(",\"error\":\"No hay impresora configurada ni predeterminada en Windows.\"");
            }
            else
            {
                respuesta.Append(",\"printer\":\"").Append(EscapeJson(nombre)).Append("\"");
                respuesta.Append(",\"defaultPrinter\":").Append(usaPredeterminada ? "true" : "false");

                string errorInfo;
                var info = RawPrinter.ObtenerInfo(nombre, out errorInfo);
                if (info != null)
                {
                    respuesta.Append(",\"puerto\":\"").Append(EscapeJson(info.Puerto)).Append("\"");
                    respuesta.Append(",\"driver\":\"").Append(EscapeJson(info.Driver)).Append("\"");
                    respuesta.Append(",\"trabajos\":").Append(info.Trabajos.ToString(CultureInfo.InvariantCulture));
                    respuesta.Append(",\"estadoCodigo\":").Append(info.Estado.ToString(CultureInfo.InvariantCulture));
                    respuesta.Append(",\"estado\":\"").Append(EscapeJson(RawPrinter.DescribirEstado(info.Estado))).Append("\"");
                    respuesta.Append(",\"offline\":").Append(RawPrinter.EstaOffline(info.Estado) ? "true" : "false");
                    respuesta.Append(",\"papelAgotado\":").Append(RawPrinter.TienePapelAgotado(info.Estado) ? "true" : "false");
                    respuesta.Append(",\"atasco\":").Append(RawPrinter.TieneAtasco(info.Estado) ? "true" : "false");
                }
                else
                {
                    respuesta.Append(",\"error\":\"").Append(EscapeJson(errorInfo)).Append("\"");
                }
            }

            respuesta.Append(",\"port\":").Append(_port.ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"uptimeSegundos\":")
                .Append(((long)(DateTime.Now - _inicio).TotalSeconds).ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"origenActualizacion\":\"").Append(EscapeJson(_origenActualizacion)).Append("\"");
            respuesta.Append(",\"autoactualizacion\":true");
            respuesta.Append(",\"tipografia\":{\"configurada\":").Append(string.IsNullOrEmpty(_tipografiaJson) ? "false" : "true");
            if (!string.IsNullOrEmpty(_tipografiaActualizada))
            {
                respuesta.Append(",\"actualizada\":\"").Append(EscapeJson(_tipografiaActualizada)).Append("\"");
            }
            respuesta.Append("}");

            if (!string.IsNullOrEmpty(_ultimoError))
            {
                respuesta.Append(",\"ultimoError\":\"").Append(EscapeJson(_ultimoError)).Append("\"");
                respuesta.Append(",\"ultimoErrorHora\":\"").Append(EscapeJson(_ultimoErrorHora)).Append("\"");
            }

            respuesta.Append("}");
            ResponderJson(stream, 200, respuesta.ToString());
        }

        private static void ResponderConfig(NetworkStream stream)
        {
            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"version\":\"").Append(EscapeJson(Version)).Append("\"");

            if (string.IsNullOrEmpty(_tipografiaJson))
            {
                respuesta.Append(",\"configurada\":false");
            }
            else
            {
                respuesta.Append(",\"configurada\":true");
                respuesta.Append(",\"actualizada\":\"").Append(EscapeJson(_tipografiaActualizada)).Append("\"");
                respuesta.Append(",\"tipografia\":").Append(_tipografiaJson);
            }

            respuesta.Append("}");
            ResponderJson(stream, 200, respuesta.ToString());
        }

        private static void ProcesarGuardarConfig(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!LeerCuerpo(stream, headers, MaxConfigBytes, out body))
            {
                return;
            }

            try
            {
                var texto = Encoding.UTF8.GetString(body);
                var serializer = new JavaScriptSerializer();
                var datos = serializer.Deserialize<Dictionary<string, object>>(texto);
                if (datos == null)
                {
                    throw new Exception("JSON vacio.");
                }

                object nodo;
                var raiz = datos;
                if (datos.TryGetValue("tipografia", out nodo))
                {
                    var anidado = nodo as Dictionary<string, object>;
                    if (anidado == null)
                    {
                        throw new Exception("El campo tipografia no es un objeto.");
                    }
                    raiz = anidado;
                }

                var comanda = LeerDocumento(raiz, "comanda", true);
                var ticket = LeerDocumento(raiz, "ticket", false);

                _tipografiaComanda = comanda;
                _tipografiaTicket = ticket;
                _tipografiaJson = serializer.Serialize(SerializarTipografia());
                _tipografiaActualizada = DateTimeOffset.Now.ToString("o");
                File.WriteAllText(_tipografiaPath, _tipografiaJson, new UTF8Encoding(false));
                Log("Tipografia actualizada desde Chefsy.");

                var respuesta = new StringBuilder();
                respuesta.Append("{\"ok\":true");
                respuesta.Append(",\"version\":\"").Append(EscapeJson(Version)).Append("\"");
                respuesta.Append(",\"actualizada\":\"").Append(EscapeJson(_tipografiaActualizada)).Append("\"");
                respuesta.Append(",\"tipografia\":").Append(_tipografiaJson);
                respuesta.Append("}");
                ResponderJson(stream, 200, respuesta.ToString());
            }
            catch (Exception ex)
            {
                RegistrarError("No se pudo guardar la tipografia: " + ex.Message);
                Log("Error guardando tipografia: " + ex.Message);
                ResponderError(stream, 400, "La configuracion de tipografia no es valida.");
            }
        }

        private static void ResponderDiagnostico(NetworkStream stream)
        {
            var checks = new List<string>();
            var hayError = false;

            checks.Add(CheckJson(
                "puerto",
                "Puerto local",
                "ok",
                "El agente escucha en 127.0.0.1:" + _port.ToString(CultureInfo.InvariantCulture) + ".",
                null));

            var configOk = File.Exists(_configPath);
            checks.Add(CheckJson(
                "configuracion",
                "Archivo de configuracion",
                configOk ? "ok" : "error",
                configOk ? "config.ini presente en " + _baseDir + "." : "No se encontro config.ini.",
                configOk ? null : "Reinstala el agente para regenerar la configuracion."));
            if (!configOk)
            {
                hayError = true;
            }

            var tokenOk = !string.IsNullOrEmpty(_token);
            checks.Add(CheckJson(
                "token",
                "Token de acceso",
                tokenOk ? "ok" : "error",
                tokenOk ? "El agente tiene un token configurado." : "El agente no tiene token.",
                tokenOk ? null : "Reinstala el agente o edita config.ini."));
            if (!tokenOk)
            {
                hayError = true;
            }

            string errorLista;
            var impresoras = RawPrinter.ListarImpresoras(out errorLista);
            if (impresoras == null)
            {
                hayError = true;
                checks.Add(CheckJson(
                    "spooler",
                    "Servicio de cola de impresion",
                    "error",
                    "No se pudieron enumerar las impresoras: " + errorLista,
                    "Abri services.msc y verifica que 'Print Spooler' este iniciado. Luego reintenta."));
            }
            else
            {
                checks.Add(CheckJson(
                    "spooler",
                    "Servicio de cola de impresion",
                    "ok",
                    "Se encontraron " + impresoras.Count.ToString(CultureInfo.InvariantCulture) + " impresora(s) instaladas.",
                    null));
            }

            var nombre = string.IsNullOrEmpty(_printer) ? RawPrinter.ObtenerImpresoraPredeterminada() : _printer;
            if (string.IsNullOrEmpty(nombre))
            {
                hayError = true;
                checks.Add(CheckJson(
                    "impresora",
                    "Impresora configurada",
                    "error",
                    "No hay impresora configurada ni predeterminada en Windows.",
                    "Instala la comandera en Windows, definila como predeterminada o reinstala el agente con -Impresora \"NOMBRE EXACTO\"."));
            }
            else
            {
                string errorInfo;
                var info = RawPrinter.ObtenerInfo(nombre, out errorInfo);
                if (info == null)
                {
                    hayError = true;
                    checks.Add(CheckJson(
                        "impresora",
                        "Impresora configurada",
                        "error",
                        "No se pudo abrir '" + nombre + "': " + errorInfo,
                        "Verifica que la impresora exista en Windows y que el spooler este corriendo."));
                }
                else
                {
                    var detalle = "'" + nombre + "' en puerto "
                        + (string.IsNullOrEmpty(info.Puerto) ? "desconocido" : info.Puerto)
                        + ", driver " + (string.IsNullOrEmpty(info.Driver) ? "desconocido" : info.Driver)
                        + ", " + info.Trabajos.ToString(CultureInfo.InvariantCulture) + " trabajo(s) en cola.";
                    var estado = RawPrinter.DescribirEstado(info.Estado);

                    if (RawPrinter.EstaOffline(info.Estado))
                    {
                        hayError = true;
                        checks.Add(CheckJson(
                            "impresora",
                            "Impresora configurada",
                            "error",
                            detalle + " Estado: " + estado + ".",
                            "Revisa el cable USB, la alimentacion y el puerto. Si es USB, proba en otro puerto."));
                    }
                    else if (RawPrinter.TienePapelAgotado(info.Estado))
                    {
                        hayError = true;
                        checks.Add(CheckJson(
                            "impresora",
                            "Impresora configurada",
                            "error",
                            detalle + " Estado: " + estado + ".",
                            "Carga un rollo nuevo y presiona el boton de avance (feed) de la impresora."));
                    }
                    else if (RawPrinter.TieneAtasco(info.Estado))
                    {
                        hayError = true;
                        checks.Add(CheckJson(
                            "impresora",
                            "Impresora configurada",
                            "error",
                            detalle + " Estado: " + estado + ".",
                            "Abre la tapa, retira el papel atascado y vuelve a cerrarla."));
                    }
                    else if (RawPrinter.EstaPausada(info.Estado))
                    {
                        checks.Add(CheckJson(
                            "impresora",
                            "Impresora configurada",
                            "aviso",
                            detalle + " Estado: " + estado + ".",
                            "En Configuracion > Impresoras, abre la cola y toca 'Reanudar'."));
                    }
                    else
                    {
                        checks.Add(CheckJson(
                            "impresora",
                            "Impresora configurada",
                            "ok",
                            detalle + " Estado: " + estado + ".",
                            null));
                    }

                    if (info.Trabajos > 5)
                    {
                        checks.Add(CheckJson(
                            "cola",
                            "Cola de impresion",
                            "aviso",
                            "Hay " + info.Trabajos.ToString(CultureInfo.InvariantCulture) + " trabajos esperando.",
                            "Si la impresora ya imprimio, cancela los trabajos viejos desde la cola de Windows para liberar la comandera."));
                    }
                }
            }

            Uri origenActualizacion;
            if (Uri.TryCreate(_origenActualizacion, UriKind.Absolute, out origenActualizacion)
                && (origenActualizacion.Scheme == Uri.UriSchemeHttps || origenActualizacion.IsLoopback))
            {
                checks.Add(CheckJson(
                    "actualizacion",
                    "Actualizacion automatica",
                    "ok",
                    "Origen: " + _origenActualizacion + ".",
                    null));
            }
            else
            {
                checks.Add(CheckJson(
                    "actualizacion",
                    "Actualizacion automatica",
                    "aviso",
                    "El origen de actualizacion no es valido: " + _origenActualizacion,
                    "Revisa origen_actualizacion en config.ini (por defecto https://chefsy.xyz)."));
            }

            if (string.IsNullOrEmpty(_tipografiaJson))
            {
                checks.Add(CheckJson(
                    "tipografia",
                    "Tipografia",
                    "aviso",
                    "El agente todavia no recibio una tipografia desde Chefsy.",
                    "Entra a Configuracion > Impresion > Tipografia y toca 'Sincronizar con el agente'."));
            }
            else
            {
                checks.Add(CheckJson(
                    "tipografia",
                    "Tipografia",
                    "ok",
                    "Tipografia guardada el " + _tipografiaActualizada + ".",
                    null));
            }

            try
            {
                var prueba = Path.Combine(_baseDir, ".chefsy-write-test");
                File.WriteAllText(prueba, "ok");
                File.Delete(prueba);
                checks.Add(CheckJson("disco", "Escritura en disco", "ok", "La carpeta del agente permite escribir.", null));
            }
            catch (Exception ex)
            {
                checks.Add(CheckJson(
                    "disco",
                    "Escritura en disco",
                    "aviso",
                    "No se pudo escribir en la carpeta del agente: " + ex.Message,
                    "Revisa los permisos de " + _baseDir + " o reinstala el agente en tu usuario."));
            }

            if (!string.IsNullOrEmpty(_ultimoError))
            {
                checks.Add(CheckJson(
                    "ultimo_error",
                    "Ultimo error registrado",
                    "aviso",
                    _ultimoError + " (" + _ultimoErrorHora + ")",
                    "Revisa agent.log para el detalle completo."));
            }

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":").Append(hayError ? "false" : "true");
            respuesta.Append(",\"version\":\"").Append(EscapeJson(Version)).Append("\"");
            respuesta.Append(",\"generado\":\"").Append(EscapeJson(DateTimeOffset.Now.ToString("o"))).Append("\"");
            respuesta.Append(",\"checks\":[");
            for (var i = 0; i < checks.Count; i++)
            {
                if (i > 0)
                {
                    respuesta.Append(",");
                }
                respuesta.Append(checks[i]);
            }
            respuesta.Append("]}");
            ResponderJson(stream, 200, respuesta.ToString());
        }

        private static string CheckJson(string id, string titulo, string estado, string detalle, string sugerencia)
        {
            var sb = new StringBuilder();
            sb.Append("{\"id\":\"").Append(EscapeJson(id)).Append("\"");
            sb.Append(",\"titulo\":\"").Append(EscapeJson(titulo)).Append("\"");
            sb.Append(",\"estado\":\"").Append(EscapeJson(estado)).Append("\"");
            sb.Append(",\"detalle\":\"").Append(EscapeJson(detalle)).Append("\"");
            sb.Append(",\"sugerencia\":");
            if (string.IsNullOrEmpty(sugerencia))
            {
                sb.Append("null");
            }
            else
            {
                sb.Append("\"").Append(EscapeJson(sugerencia)).Append("\"");
            }
            sb.Append("}");
            return sb.ToString();
        }

        private static void ProcesarActualizacion(NetworkStream stream, Dictionary<string, string> headers)
        {
            // Consumir el cuerpo antes de responder: si el cliente manda un POST
            // con body y el servidor contesta y cierra, algunos clientes ven un
            // reset de conexion en lugar de la respuesta.
            if (!DrenarCuerpo(stream, headers))
            {
                return;
            }

            if (_actualizando)
            {
                ResponderError(stream, 409, "Ya hay una actualizacion en curso.");
                return;
            }

            _actualizando = true;
            try
            {
                Uri origen;
                if (!Uri.TryCreate(_origenActualizacion, UriKind.Absolute, out origen))
                {
                    throw new Exception("El origen de actualizacion configurado no es una URL valida.");
                }
                if (!(origen.Scheme == Uri.UriSchemeHttps || (origen.Scheme == Uri.UriSchemeHttp && origen.IsLoopback)))
                {
                    throw new Exception("El origen de actualizacion debe ser HTTPS (o localhost para pruebas).");
                }

                var urlManifiesto = new Uri(origen, "agente/version.json");
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

                if (!VersionMayor(versionNueva, Version))
                {
                    ResponderJson(stream, 200,
                        "{\"ok\":true,\"actualizado\":false,\"actual\":\"" + EscapeJson(Version)
                        + "\",\"version\":\"" + EscapeJson(versionNueva) + "\"}");
                    _actualizando = false;
                    return;
                }

                var urlBinario = new Uri(origen, "agente/ChefsyPrintAgent.exe");
                var bytes = DescargarBytes(urlBinario, MaxUpdateBytes, 30000);
                if (bytes.Length < 4096 || bytes[0] != (byte)'M' || bytes[1] != (byte)'Z')
                {
                    throw new Exception("El archivo descargado no parece un ejecutable de Windows.");
                }

                var hashCalculado = HashSha256(bytes);
                if (!string.Equals(hashCalculado, hashEsperado, StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception("La verificacion SHA-256 no coincide. Se cancelo la actualizacion.");
                }

                var exeActual = Path.Combine(_baseDir, "ChefsyPrintAgent.exe");
                var exeNuevo = Path.Combine(_baseDir, "ChefsyPrintAgent.nuevo.exe");
                var backup = Path.Combine(_baseDir, "ChefsyPrintAgent.exe.bak");
                var script = Path.Combine(_baseDir, "actualizar.cmd");

                File.WriteAllBytes(exeNuevo, bytes);
                if (File.Exists(exeActual))
                {
                    File.Copy(exeActual, backup, true);
                }

                var pidActual = Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture);
                var contenido = "@echo off\r\n"
                    + "set intentos=0\r\n"
                    + ":esperar\r\n"
                    + "tasklist /FI \"PID eq " + pidActual + "\" /NH | find \"ChefsyPrintAgent.exe\" >nul\r\n"
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
                info.WorkingDirectory = _baseDir;
                info.CreateNoWindow = true;
                info.UseShellExecute = false;

                // Cerrar el listener ANTES de lanzar cmd: si se hereda el socket,
                // el puerto queda tomado por un listener fantasma que nunca acepta
                // conexiones y el agente nuevo no recibe trafico.
                _deteniendo = true;
                try
                {
                    if (_listener != null)
                    {
                        _listener.Stop();
                    }
                }
                catch
                {
                }

                Process.Start(info);

                Log("Actualizacion a " + versionNueva + " descargada ("
                    + bytes.Length.ToString(CultureInfo.InvariantCulture) + " bytes). Reiniciando agente.");

                var respuesta = new StringBuilder();
                respuesta.Append("{\"ok\":true,\"actualizado\":true");
                respuesta.Append(",\"actual\":\"").Append(EscapeJson(Version)).Append("\"");
                respuesta.Append(",\"version\":\"").Append(EscapeJson(versionNueva)).Append("\"");
                respuesta.Append(",\"bytes\":").Append(bytes.Length.ToString(CultureInfo.InvariantCulture));
                respuesta.Append(",\"reiniciando\":true}");
                ResponderJson(stream, 200, respuesta.ToString());

                // Dar tiempo a que el navegador reciba la respuesta y que el .cmd
                // reemplace el ejecutable bloqueado por este proceso.
                Thread.Sleep(400);
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                _actualizando = false;
                RegistrarError("Actualizacion: " + ex.Message);
                Log("Error de actualizacion: " + ex.Message);
                ResponderError(stream, 500, ex.Message);
            }
        }

        private static byte[] DescargarBytes(Uri url, int maximo, int timeoutMs)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Timeout = timeoutMs;
            request.ReadWriteTimeout = timeoutMs;
            request.UserAgent = "ChefsyPrintAgent/" + Version;
            request.AllowAutoRedirect = true;

            using (var response = (HttpWebResponse)request.GetResponse())
            {
                if (!MismoHost(response.ResponseUri.Host, url.Host))
                {
                    throw new Exception("La descarga fue redirigida a un host no permitido: " + response.ResponseUri.Host);
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

            // Vercel puede redirigir chefsy.xyz <-> www.chefsy.xyz. Se acepta
            // solo el mismo dominio con o sin el prefijo www.
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

        private static void ProcesarImpresion(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!LeerCuerpo(stream, headers, MaxBodyBytes, out body))
            {
                return;
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
                RegistrarError("Impresion en '" + impresora + "': " + error);
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

        private static bool LeerCuerpo(NetworkStream stream, Dictionary<string, string> headers, int maximo, out byte[] body)
        {
            body = null;

            string valorContentLength;
            if (!headers.TryGetValue("Content-Length", out valorContentLength))
            {
                ResponderError(stream, 411, "Falta Content-Length.");
                return false;
            }

            int contentLength;
            if (!int.TryParse(valorContentLength, NumberStyles.Integer, CultureInfo.InvariantCulture, out contentLength) || contentLength <= 0)
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
            if (headers.TryGetValue("Expect", out expect) && string.Equals(expect, "100-continue", StringComparison.OrdinalIgnoreCase))
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

        private static bool DrenarCuerpo(NetworkStream stream, Dictionary<string, string> headers)
        {
            string valorContentLength;
            if (!headers.TryGetValue("Content-Length", out valorContentLength))
            {
                return true;
            }

            int contentLength;
            if (!int.TryParse(valorContentLength, NumberStyles.Integer, CultureInfo.InvariantCulture, out contentLength) || contentLength <= 0)
            {
                return true;
            }

            if (contentLength > MaxConfigBytes)
            {
                ResponderError(stream, 413, "El cuerpo de la solicitud es demasiado grande.");
                return false;
            }

            string expect;
            if (headers.TryGetValue("Expect", out expect) && string.Equals(expect, "100-continue", StringComparison.OrdinalIgnoreCase))
            {
                var cien = Encoding.ASCII.GetBytes("HTTP/1.1 100 Continue\r\n\r\n");
                stream.Write(cien, 0, cien.Length);
                stream.Flush();
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

        private static void RegistrarError(string mensaje)
        {
            _ultimoError = mensaje;
            _ultimoErrorHora = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
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

        private static void ResponderPreflight(NetworkStream stream, Dictionary<string, string> headers = null)
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

        private static void ResponderError(NetworkStream stream, int codigo, string mensaje, Dictionary<string, string> headers = null)
        {
            var body = new StringBuilder();
            body.Append("{\"ok\":false,\"error\":\"").Append(EscapeJson(mensaje)).Append("\"}");
            ResponderTexto(stream, codigo, body.ToString(), headers);
        }

        private static void ResponderJson(NetworkStream stream, int codigo, string json, Dictionary<string, string> headers = null)
        {
            ResponderTexto(stream, codigo, json, headers);
        }

        private static void ResponderTexto(NetworkStream stream, int codigo, string body, Dictionary<string, string> headers = null)
        {
            var bodyBytes = Encoding.UTF8.GetBytes(body);
            var sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(codigo.ToString(CultureInfo.InvariantCulture)).Append(" ").Append(EstadoHttp(codigo)).Append("\r\n");
            sb.Append("Content-Type: application/json; charset=utf-8\r\n");
            sb.Append("Content-Length: ").Append(bodyBytes.Length.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("Cache-Control: no-store\r\n");
            sb.Append("X-Content-Type-Options: nosniff\r\n");
            sb.Append(CabecerasCors(headers));
            sb.Append("Connection: close\r\n");
            sb.Append("\r\n");

            var headerBytes = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(bodyBytes, 0, bodyBytes.Length);
            stream.Flush();
        }

        private static string CabecerasCors(Dictionary<string, string> reqHeaders = null)
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
            if (reqHeaders != null && reqHeaders.TryGetValue("Access-Control-Request-Headers", out reqAllowedHeaders) && !string.IsNullOrEmpty(reqAllowedHeaders))
            {
                sb.Append("Access-Control-Allow-Headers: ").Append(reqAllowedHeaders).Append(", Content-Type, X-Chefsy-Token, X-Chefsy-Printer, Access-Control-Request-Private-Network\r\n");
            }
            else
            {
                sb.Append("Access-Control-Allow-Headers: Content-Type, X-Chefsy-Token, X-Chefsy-Printer, Access-Control-Request-Private-Network\r\n");
            }

            sb.Append("Access-Control-Allow-Private-Network: true\r\n");
            sb.Append("Access-Control-Max-Age: 86400\r\n");
            return sb.ToString();
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

        private sealed class DocumentoTipografia
        {
            public string Fuente = "A";
            public int Ancho = 1;
            public int Alto = 1;
            public int Interletrado = 1;
            public int Interlineado = 8;
            public int EspacioItems = 0;
        }

        private static DocumentoTipografia DocumentoPorDefecto(bool comanda)
        {
            var documento = new DocumentoTipografia();
            documento.Fuente = "A";
            documento.Ancho = 1;
            documento.Alto = 1;
            documento.Interletrado = 1;
            documento.Interlineado = 8;
            documento.EspacioItems = comanda ? 1 : 0;
            return documento;
        }

        private static void CargarTipografia()
        {
            if (!File.Exists(_tipografiaPath))
            {
                return;
            }

            try
            {
                var texto = File.ReadAllText(_tipografiaPath, Encoding.UTF8);
                var serializer = new JavaScriptSerializer();
                var datos = serializer.Deserialize<Dictionary<string, object>>(texto);
                if (datos == null)
                {
                    return;
                }

                _tipografiaComanda = LeerDocumento(datos, "comanda", true);
                _tipografiaTicket = LeerDocumento(datos, "ticket", false);
                _tipografiaJson = serializer.Serialize(SerializarTipografia());
                _tipografiaActualizada = new FileInfo(_tipografiaPath).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
            }
            catch (Exception ex)
            {
                Log("No se pudo leer tipografia.json: " + ex.Message);
            }
        }

        private static DocumentoTipografia LeerDocumento(Dictionary<string, object> raiz, string clave, bool comanda)
        {
            var documento = DocumentoPorDefecto(comanda);
            if (raiz == null)
            {
                return documento;
            }

            object nodo;
            if (!raiz.TryGetValue(clave, out nodo))
            {
                return documento;
            }

            var datos = nodo as Dictionary<string, object>;
            if (datos == null)
            {
                return documento;
            }

            object campo;
            if (datos.TryGetValue("fuente", out campo))
            {
                var fuente = Convert.ToString(campo, CultureInfo.InvariantCulture);
                if (!string.IsNullOrEmpty(fuente) && fuente.Trim().ToUpperInvariant() == "B")
                {
                    documento.Fuente = "B";
                }
            }

            documento.Ancho = Limitar(LeerEntero(datos, "ancho", documento.Ancho), 1, 4);
            documento.Alto = Limitar(LeerEntero(datos, "alto", documento.Alto), 1, 4);
            documento.Interletrado = Limitar(LeerEntero(datos, "interletrado", documento.Interletrado), 0, 8);
            documento.Interlineado = Limitar(LeerEntero(datos, "interlineado", documento.Interlineado), 0, 60);
            documento.EspacioItems = Limitar(LeerEntero(datos, "espacioItems", documento.EspacioItems), 0, 3);
            return documento;
        }

        private static int LeerEntero(Dictionary<string, object> datos, string clave, int porDefecto)
        {
            object valor;
            if (!datos.TryGetValue(clave, out valor) || valor == null)
            {
                return porDefecto;
            }

            try
            {
                return Convert.ToInt32(valor, CultureInfo.InvariantCulture);
            }
            catch
            {
                return porDefecto;
            }
        }

        private static int Limitar(int valor, int minimo, int maximo)
        {
            if (valor < minimo)
            {
                return minimo;
            }
            if (valor > maximo)
            {
                return maximo;
            }
            return valor;
        }

        private static Dictionary<string, object> SerializarDocumento(DocumentoTipografia documento)
        {
            var datos = new Dictionary<string, object>();
            datos["fuente"] = documento.Fuente;
            datos["ancho"] = documento.Ancho;
            datos["alto"] = documento.Alto;
            datos["interletrado"] = documento.Interletrado;
            datos["interlineado"] = documento.Interlineado;
            datos["espacioItems"] = documento.EspacioItems;
            return datos;
        }

        private static Dictionary<string, object> SerializarTipografia()
        {
            var raiz = new Dictionary<string, object>();
            raiz["comanda"] = SerializarDocumento(_tipografiaComanda);
            raiz["ticket"] = SerializarDocumento(_tipografiaTicket);
            return raiz;
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
                else if (clave == "origen_actualizacion")
                {
                    if (!string.IsNullOrWhiteSpace(valor))
                    {
                        _origenActualizacion = valor.Trim().TrimEnd('/');
                    }
                }
            }

            CargarTipografia();
        }

        private static void GuardarConfiguracion()
        {
            var sb = new StringBuilder();
            sb.AppendLine("# Configuracion del agente de impresion Chefsy");
            sb.AppendLine("# No compartas este archivo: contiene el token de acceso.");
            sb.AppendLine("puerto=" + _port.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("token=" + _token);
            sb.AppendLine("impresora=" + _printer);
            sb.AppendLine("origen_actualizacion=" + _origenActualizacion);
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

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool EnumPrinters(int Flags, string Name, int Level, IntPtr pPrinterEnum, int cbBuf, out int pcbNeeded, out int pcReturned);

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool GetPrinter(IntPtr hPrinter, int Level, IntPtr pPrinter, int cbBuf, out int pcbNeeded);

        [StructLayout(LayoutKind.Sequential)]
        private struct PRINTER_INFO_4
        {
            public IntPtr pPrinterName;
            public IntPtr pServerName;
            public uint Attributes;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct PRINTER_INFO_2
        {
            public IntPtr pServerName;
            public IntPtr pPrinterName;
            public IntPtr pShareName;
            public IntPtr pPortName;
            public IntPtr pDriverName;
            public IntPtr pComment;
            public IntPtr pLocation;
            public IntPtr pDevMode;
            public IntPtr pSepFile;
            public IntPtr pPrintProcessor;
            public IntPtr pDatatype;
            public IntPtr pParameters;
            public IntPtr pSecurityDescriptor;
            public uint Attributes;
            public uint Priority;
            public uint DefaultPriority;
            public uint StartTime;
            public uint UntilTime;
            public uint Status;
            public uint cJobs;
            public uint AveragePPM;
        }

        public sealed class InfoImpresora
        {
            public string Nombre;
            public string Puerto;
            public string Driver;
            public string Datatype;
            public uint Estado;
            public uint Trabajos;
            public bool Predeterminada;
        }

        private static string TextoDesdePuntero(IntPtr puntero)
        {
            return puntero == IntPtr.Zero ? "" : Marshal.PtrToStringUni(puntero);
        }

        public static InfoImpresora ObtenerInfo(string nombre, out string error)
        {
            error = null;
            var hPrinter = IntPtr.Zero;

            if (string.IsNullOrEmpty(nombre))
            {
                error = "No hay impresora configurada.";
                return null;
            }

            if (!OpenPrinter(nombre, out hPrinter, IntPtr.Zero))
            {
                error = "No se pudo abrir la impresora '" + nombre + "'. "
                    + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                return null;
            }

            try
            {
                int necesarios;
                GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out necesarios);
                if (necesarios <= 0)
                {
                    error = "Windows no devolvio informacion de la impresora.";
                    return null;
                }

                var buffer = Marshal.AllocHGlobal(necesarios);
                try
                {
                    if (!GetPrinter(hPrinter, 2, buffer, necesarios, out necesarios))
                    {
                        error = "No se pudo leer el estado de '" + nombre + "'. "
                            + new Win32Exception(Marshal.GetLastWin32Error()).Message;
                        return null;
                    }

                    var info = (PRINTER_INFO_2)Marshal.PtrToStructure(buffer, typeof(PRINTER_INFO_2));
                    var resultado = new InfoImpresora();
                    resultado.Nombre = nombre;
                    resultado.Puerto = TextoDesdePuntero(info.pPortName);
                    resultado.Driver = TextoDesdePuntero(info.pDriverName);
                    resultado.Datatype = TextoDesdePuntero(info.pDatatype);
                    resultado.Estado = info.Status;
                    resultado.Trabajos = info.cJobs;
                    return resultado;
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }

        public static List<InfoImpresora> ListarImpresoras(out string error)
        {
            error = null;
            const int flags = 2 | 4; // PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS

            int necesarios = 0;
            int devueltas = 0;
            EnumPrinters(flags, null, 4, IntPtr.Zero, 0, out necesarios, out devueltas);
            if (necesarios <= 0)
            {
                error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
                return null;
            }

            var buffer = Marshal.AllocHGlobal(necesarios);
            try
            {
                if (!EnumPrinters(flags, null, 4, buffer, necesarios, out necesarios, out devueltas))
                {
                    error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
                    return null;
                }

                var predeterminada = ObtenerImpresoraPredeterminada();
                var lista = new List<InfoImpresora>();
                var tamano = Marshal.SizeOf(typeof(PRINTER_INFO_4));

                for (var i = 0; i < devueltas; i++)
                {
                    var puntero = new IntPtr(buffer.ToInt64() + (long)i * tamano);
                    var info4 = (PRINTER_INFO_4)Marshal.PtrToStructure(puntero, typeof(PRINTER_INFO_4));
                    var nombre = TextoDesdePuntero(info4.pPrinterName);
                    if (string.IsNullOrEmpty(nombre))
                    {
                        continue;
                    }

                    string errorInfo;
                    var detalle = ObtenerInfo(nombre, out errorInfo);
                    if (detalle == null)
                    {
                        detalle = new InfoImpresora();
                        detalle.Nombre = nombre;
                        detalle.Puerto = "";
                        detalle.Driver = "";
                        detalle.Datatype = "";
                    }

                    detalle.Predeterminada = string.Equals(nombre, predeterminada, StringComparison.OrdinalIgnoreCase);
                    lista.Add(detalle);
                }

                return lista;
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }

        public static bool EstaOffline(uint estado)
        {
            return (estado & 0x00000080) != 0;
        }

        public static bool TienePapelAgotado(uint estado)
        {
            return (estado & 0x00000010) != 0 || (estado & 0x00000040) != 0;
        }

        public static bool TieneAtasco(uint estado)
        {
            return (estado & 0x00000008) != 0;
        }

        public static bool EstaPausada(uint estado)
        {
            return (estado & 0x00000001) != 0;
        }

        public static string DescribirEstado(uint estado)
        {
            if (estado == 0)
            {
                return "Lista";
            }

            var partes = new List<string>();
            if ((estado & 0x00000001) != 0) partes.Add("En pausa");
            if ((estado & 0x00000002) != 0) partes.Add("Error");
            if ((estado & 0x00000008) != 0) partes.Add("Atasco de papel");
            if ((estado & 0x00000010) != 0) partes.Add("Sin papel");
            if ((estado & 0x00000020) != 0) partes.Add("Alimentacion manual");
            if ((estado & 0x00000040) != 0) partes.Add("Problema de papel");
            if ((estado & 0x00000080) != 0) partes.Add("Desconectada");
            if ((estado & 0x00000200) != 0) partes.Add("Ocupada");
            if ((estado & 0x00000400) != 0) partes.Add("Imprimiendo");
            if ((estado & 0x00000800) != 0) partes.Add("Bandeja llena");
            if ((estado & 0x00001000) != 0) partes.Add("No disponible");
            if ((estado & 0x00002000) != 0) partes.Add("Esperando");
            if ((estado & 0x00004000) != 0) partes.Add("Procesando");
            if ((estado & 0x00008000) != 0) partes.Add("Inicializando");
            if ((estado & 0x00010000) != 0) partes.Add("Calentando");
            if ((estado & 0x00020000) != 0) partes.Add("Toner bajo");
            if ((estado & 0x00040000) != 0) partes.Add("Sin toner");
            if ((estado & 0x00100000) != 0) partes.Add("Requiere intervencion");
            if ((estado & 0x00200000) != 0) partes.Add("Sin memoria");
            if ((estado & 0x00400000) != 0) partes.Add("Puerta abierta");
            if ((estado & 0x00800000) != 0) partes.Add("Servidor desconocido");
            if ((estado & 0x01000000) != 0) partes.Add("Ahorro de energia");

            if (partes.Count == 0)
            {
                return "Estado " + estado.ToString(CultureInfo.InvariantCulture);
            }

            return string.Join(", ", partes.ToArray());
        }

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
