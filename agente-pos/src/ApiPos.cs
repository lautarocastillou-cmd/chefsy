using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Web.Script.Serialization;

namespace AgentePOS
{
    // API universal para cualquier sistema POS.
    //   POST /print       bytes crudos (ESC/POS) en el cuerpo
    //   POST /print       header X-Pos-Printer para elegir impresora puntual
    //   GET  /health      estado completo
    //   GET  /diagnostico chequeos auto-explicativos
    //   GET/POST /config  tipografia
    internal static class ApiPos
    {
        public static void Salud(NetworkStream stream)
        {
            var usaPredeterminada = string.IsNullOrEmpty(Estado.Impresora);
            var nombre = usaPredeterminada ? RawPrinter.ObtenerImpresoraPredeterminada() : Estado.Impresora;
            var esRed = ImpresoraRed.EsDireccion(nombre);

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":").Append(string.IsNullOrEmpty(nombre) ? "false" : "true");
            respuesta.Append(",\"agente\":true");
            respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");

            if (esRed)
            {
                // Impresora de red: no hay driver ni cola de Windows que mirar.
                // Se prueba el puerto TCP para saber si responde ahora mismo.
                string errorRed;
                var disponible = ImpresoraRed.Disponible(nombre, out errorRed);
                respuesta.Append(",\"printer\":\"").Append(ServidorHttp.EscapeJson(nombre)).Append("\"");
                respuesta.Append(",\"red\":true");
                respuesta.Append(",\"defaultPrinter\":false");
                respuesta.Append(",\"disponible\":").Append(disponible ? "true" : "false");
                respuesta.Append(",\"estado\":\"").Append(disponible ? "En red" : "Sin respuesta").Append("\"");
                if (!disponible && !string.IsNullOrEmpty(errorRed))
                {
                    respuesta.Append(",\"error\":\"").Append(ServidorHttp.EscapeJson(errorRed)).Append("\"");
                }
            }
            else if (string.IsNullOrEmpty(nombre))
            {
                respuesta.Append(",\"error\":\"No hay impresora configurada ni predeterminada en Windows.\"");
            }
            else
            {
                respuesta.Append(",\"printer\":\"").Append(ServidorHttp.EscapeJson(nombre)).Append("\"");
                respuesta.Append(",\"defaultPrinter\":").Append(usaPredeterminada ? "true" : "false");

                string errorInfo;
                var info = RawPrinter.ObtenerInfo(nombre, out errorInfo);
                if (info != null)
                {
                    respuesta.Append(",\"puerto\":\"").Append(ServidorHttp.EscapeJson(info.Puerto)).Append("\"");
                    respuesta.Append(",\"driver\":\"").Append(ServidorHttp.EscapeJson(info.Driver)).Append("\"");
                    respuesta.Append(",\"trabajos\":").Append(info.Trabajos.ToString(CultureInfo.InvariantCulture));
                    respuesta.Append(",\"estadoCodigo\":").Append(info.Estado.ToString(CultureInfo.InvariantCulture));
                    respuesta.Append(",\"estado\":\"").Append(ServidorHttp.EscapeJson(RawPrinter.DescribirEstado(info.Estado))).Append("\"");
                    respuesta.Append(",\"offline\":").Append(RawPrinter.EstaOffline(info.Estado) ? "true" : "false");
                    respuesta.Append(",\"papelAgotado\":").Append(RawPrinter.TienePapelAgotado(info.Estado) ? "true" : "false");
                    respuesta.Append(",\"atasco\":").Append(RawPrinter.TieneAtasco(info.Estado) ? "true" : "false");
                }
                else
                {
                    respuesta.Append(",\"error\":\"").Append(ServidorHttp.EscapeJson(errorInfo)).Append("\"");
                }
            }

            var spooler = RawPrinter.EstadoServicioSpooler();
            respuesta.Append(",\"spoolerCorriendo\":").Append(spooler == 4 ? "true" : "false");
            respuesta.Append(",\"spoolerEstado\":\"").Append(ServidorHttp.EscapeJson(RawPrinter.DescribirServicioSpooler())).Append("\"");

            respuesta.Append(",\"port\":").Append(Estado.Puerto.ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"uptimeSegundos\":")
                .Append(((long)(DateTime.Now - Estado.Inicio).TotalSeconds).ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"autoSanar\":").Append(Estado.AutoSanar ? "true" : "false");
            respuesta.Append(",\"tipografia\":{\"configurada\":").Append(string.IsNullOrEmpty(Tipografia.Json) ? "false" : "true");
            if (!string.IsNullOrEmpty(Tipografia.Actualizada))
            {
                respuesta.Append(",\"actualizada\":\"").Append(ServidorHttp.EscapeJson(Tipografia.Actualizada)).Append("\"");
            }
            respuesta.Append("}");

            if (!string.IsNullOrEmpty(Estado.UltimoError))
            {
                respuesta.Append(",\"ultimoError\":\"").Append(ServidorHttp.EscapeJson(Estado.UltimoError)).Append("\"");
                respuesta.Append(",\"ultimoErrorHora\":\"").Append(ServidorHttp.EscapeJson(Estado.UltimoErrorHora)).Append("\"");
            }

            respuesta.Append("}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void VerConfig(NetworkStream stream)
        {
            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");

            if (string.IsNullOrEmpty(Tipografia.Json))
            {
                respuesta.Append(",\"configurada\":false");
            }
            else
            {
                respuesta.Append(",\"configurada\":true");
                respuesta.Append(",\"actualizada\":\"").Append(ServidorHttp.EscapeJson(Tipografia.Actualizada)).Append("\"");
                respuesta.Append(",\"tipografia\":").Append(Tipografia.Json);
            }

            respuesta.Append("}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void GuardarConfig(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!ServidorHttp.LeerCuerpo(stream, headers, Estado.MaxConfigBytes, out body))
            {
                return;
            }

            try
            {
                string error;
                Tipografia.GuardarDesdeJson(Encoding.UTF8.GetString(body), out error);
                Estado.Log("Tipografia guardada.");

                var respuesta = new StringBuilder();
                respuesta.Append("{\"ok\":true");
                respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");
                respuesta.Append(",\"actualizada\":\"").Append(ServidorHttp.EscapeJson(Tipografia.Actualizada)).Append("\"");
                respuesta.Append(",\"tipografia\":").Append(Tipografia.Json);
                respuesta.Append("}");
                ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
            }
            catch (Exception ex)
            {
                Estado.RegistrarError("No se pudo guardar la tipografia: " + ex.Message);
                Estado.Log("Error guardando tipografia: " + ex.Message);
                ServidorHttp.ResponderError(stream, 400, "La configuracion de tipografia no es valida.");
            }
        }

        public static void Imprimir(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!ServidorHttp.LeerCuerpo(stream, headers, Estado.MaxBodyBytes, out body))
            {
                return;
            }

            string printerHeader;
            var impresora = headers.TryGetValue("X-Pos-Printer", out printerHeader) && !string.IsNullOrEmpty(printerHeader.Trim())
                ? printerHeader.Trim()
                : Estado.Impresora;

            if (string.IsNullOrEmpty(impresora))
            {
                impresora = RawPrinter.ObtenerImpresoraPredeterminada();
            }

            if (string.IsNullOrEmpty(impresora))
            {
                ServidorHttp.ResponderError(stream, 500,
                    "No hay impresora configurada ni predeterminada en Windows. Abrí el panel para elegir una.");
                return;
            }

            string error;
            if (ImpresoraRed.EsDireccion(impresora))
            {
                // Impresion directa TCP 9100: no pasa por el spooler, no hay
                // error 1722 que sanar y no hace falta driver instalado.
                if (!ImpresoraRed.Enviar(impresora, body, out error))
                {
                    Estado.RegistrarError("Impresion LAN en '" + impresora + "': " + error);
                    Estado.Log("Error imprimiendo por red en '" + impresora + "': " + error);
                    ServidorHttp.ResponderError(stream, 500, error);
                    return;
                }

                Estado.Log("Impresion LAN enviada a '" + impresora + "' ("
                    + body.Length.ToString(CultureInfo.InvariantCulture) + " bytes).");

                var respuestaRed = new StringBuilder();
                respuestaRed.Append("{\"ok\":true");
                respuestaRed.Append(",\"printer\":\"").Append(ServidorHttp.EscapeJson(impresora)).Append("\"");
                respuestaRed.Append(",\"red\":true");
                respuestaRed.Append(",\"bytes\":").Append(body.Length.ToString(CultureInfo.InvariantCulture));
                respuestaRed.Append("}");
                ServidorHttp.ResponderJson(stream, 200, respuestaRed.ToString());
                return;
            }

            // No deja imprimir en impresoras virtuales de Windows (OneNote, XPS,
            // Print to PDF, Fax, puertos archivo/nulo). No son comanderas térmicas
            // y el usuario pensaría que imprimió cuando no echó papel.
            string errorInfo;
            var infoVirtual = RawPrinter.ObtenerInfo(impresora, out errorInfo);
            if (infoVirtual != null && RawPrinter.EsImpresoraVirtual(infoVirtual.Nombre, infoVirtual.Puerto, infoVirtual.Driver))
            {
                Estado.RegistrarError("Impresion rechazada en '" + impresora + "': impresora virtual.");
                Estado.Log("Impresion rechazada en '" + impresora + "': es una impresora virtual de Windows.");
                ServidorHttp.ResponderError(stream, 400,
                    "No se puede imprimir en '" + impresora + "'. No es una comandera térmica real. Elegí una impresora USB o de red desde el panel.");
                return;
            }

            int codigoWin32;
            if (!RawPrinter.Enviar(body, impresora, out error, out codigoWin32))
            {
                Estado.RegistrarError("Impresion en '" + impresora + "': " + error);
                Estado.Log("Error imprimiendo en '" + impresora + "' (win32 " + codigoWin32.ToString(CultureInfo.InvariantCulture) + "): " + error);

                if (Estado.AutoSanar && Sanador.DeberiaSanar(codigoWin32))
                {
                    try
                    {
                        Sanador.SolicitarSanacion();
                        error += " | Se lanzo una reparacion automatica: acepta el permiso de administrador y reintenta en unos segundos.";
                    }
                    catch (Exception ex)
                    {
                        Estado.Log("Auto-sanacion rechazada: " + ex.Message);
                    }
                }

                ServidorHttp.ResponderError(stream, 500, error);
                return;
            }

            Estado.Log("Impresion enviada a '" + impresora + "' ("
                + body.Length.ToString(CultureInfo.InvariantCulture) + " bytes).");

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"printer\":\"").Append(ServidorHttp.EscapeJson(impresora)).Append("\"");
            respuesta.Append(",\"bytes\":").Append(body.Length.ToString(CultureInfo.InvariantCulture));
            respuesta.Append("}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        // Imprime una pagina de prueba con la tipografia de comanda.
        // Lo usan el panel, la bandeja y el instalador.
        public static bool ImprimirPrueba(out string error)
        {
            var impresora = Estado.Impresora;
            if (string.IsNullOrEmpty(impresora))
            {
                impresora = RawPrinter.ObtenerImpresoraPredeterminada();
            }
            if (string.IsNullOrEmpty(impresora))
            {
                error = "No hay impresora configurada ni predeterminada.";
                return false;
            }

            var bytes = ConstruirPrueba();
            if (ImpresoraRed.EsDireccion(impresora))
            {
                if (!ImpresoraRed.Enviar(impresora, bytes, out error))
                {
                    Estado.RegistrarError("Prueba LAN en '" + impresora + "': " + error);
                    Estado.Log("Error imprimiendo prueba por red en '" + impresora + "': " + error);
                    return false;
                }

                Estado.Log("Prueba LAN enviada a '" + impresora + "' ("
                    + bytes.Length.ToString(CultureInfo.InvariantCulture) + " bytes).");
                error = null;
                return true;
            }

            // No deja imprimir prueba en impresoras virtuales de Windows.
            string errorInfoPrueba;
            var infoVirtualPrueba = RawPrinter.ObtenerInfo(impresora, out errorInfoPrueba);
            if (infoVirtualPrueba != null && RawPrinter.EsImpresoraVirtual(infoVirtualPrueba.Nombre, infoVirtualPrueba.Puerto, infoVirtualPrueba.Driver))
            {
                Estado.RegistrarError("Prueba rechazada en '" + impresora + "': impresora virtual.");
                Estado.Log("Prueba rechazada en '" + impresora + "': es una impresora virtual de Windows.");
                error = "No se puede imprimir prueba en '" + impresora + "'. No es una comandera térmica real. Elegí una impresora USB o de red desde el panel.";
                return false;
            }

            int codigoWin32;
            if (!RawPrinter.Enviar(bytes, impresora, out error, out codigoWin32))
            {
                Estado.RegistrarError("Prueba en '" + impresora + "': " + error);
                Estado.Log("Error imprimiendo prueba en '" + impresora + "': " + error);
                return false;
            }

            Estado.Log("Prueba enviada a '" + impresora + "' ("
                + bytes.Length.ToString(CultureInfo.InvariantCulture) + " bytes).");
            error = null;
            return true;
        }

        // Pagina de prueba ESC/POS respetando la tipografia configurada.
        public static byte[] ConstruirPrueba()
        {
            var documento = Tipografia.Comanda;

            using (var memoria = new MemoryStream())
            {
                // ESC @ inicializa
                memoria.Write(new byte[] { 27, 64 }, 0, 2);

                // ESC M n fuente A/B
                memoria.WriteByte(27);
                memoria.WriteByte(77);
                memoria.WriteByte((byte)(string.Equals(documento.Fuente, "B", StringComparison.OrdinalIgnoreCase) ? 1 : 0));

                // GS ! n: alto*16 + ancho (0 = normal)
                var tamano = (byte)(((Math.Min(documento.Alto, 4) - 1) * 16) + (Math.Min(documento.Ancho, 4) - 1));
                memoria.WriteByte(29);
                memoria.WriteByte(33);
                memoria.WriteByte(tamano);

                // ESC SP n interletrado
                memoria.WriteByte(27);
                memoria.WriteByte(32);
                memoria.WriteByte((byte)documento.Interletrado);

                // ESC 3 n interlineado
                memoria.WriteByte(27);
                memoria.WriteByte(51);
                memoria.WriteByte((byte)documento.Interlineado);

                // ESC a 1 centrado
                memoria.WriteByte(27);
                memoria.WriteByte(97);
                memoria.WriteByte(1);

                EscribirTexto(memoria, "\nAGENTE POS\n");
                EscribirTexto(memoria, "PRUEBA DE IMPRESION\n");
                EscribirTexto(memoria, "v" + Estado.Version + "\n");
                EscribirTexto(memoria, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) + "\n");
                EscribirTexto(memoria, "\nSi lees esto, la comandera\nimprime correctamente.\n\n\n\n");

                // ESC a 0 izquierda
                memoria.WriteByte(27);
                memoria.WriteByte(97);
                memoria.WriteByte(0);

                // GS V B 0 corte de papel
                memoria.WriteByte(29);
                memoria.WriteByte(86);
                memoria.WriteByte(66);
                memoria.WriteByte(0);

                return memoria.ToArray();
            }
        }

        private static void EscribirTexto(MemoryStream memoria, string texto)
        {
            var bytes = Encoding.ASCII.GetBytes(texto);
            memoria.Write(bytes, 0, bytes.Length);
        }

        public static void Diagnostico(NetworkStream stream)
        {
            var checks = new List<string>();
            var hayError = false;

            checks.Add(CheckJson(
                "puerto", "Puerto local", "ok",
                "El agente escucha en 127.0.0.1:" + Estado.Puerto.ToString(CultureInfo.InvariantCulture) + ".", null));

            var configOk = File.Exists(Estado.ConfigPath);
            checks.Add(CheckJson(
                "configuracion", "Archivo de configuracion",
                configOk ? "ok" : "error",
                configOk ? "config.ini presente en " + Estado.BaseDir + "." : "No se encontro config.ini.",
                configOk ? null : "Reinstala el agente para regenerar la configuracion."));
            if (!configOk)
            {
                hayError = true;
            }

            var tokenOk = !string.IsNullOrEmpty(Estado.Token);
            checks.Add(CheckJson(
                "token", "Token de acceso", tokenOk ? "ok" : "error",
                tokenOk ? "El agente tiene un token configurado." : "El agente no tiene token.",
                tokenOk ? null : "Reinstala el agente o edita config.ini."));
            if (!tokenOk)
            {
                hayError = true;
            }

            var nombre = string.IsNullOrEmpty(Estado.Impresora) ? RawPrinter.ObtenerImpresoraPredeterminada() : Estado.Impresora;
            var esRed = ImpresoraRed.EsDireccion(nombre);

            var spooler = RawPrinter.EstadoServicioSpooler();
            if (esRed)
            {
                // La impresora de red no usa el spooler: su estado no debe
                // teñir el diagnostico de rojo ni sugerir un UAC de "Sanar".
                checks.Add(CheckJson("spooler", "Servicio de cola de impresion", "aviso",
                    "No aplica: la impresora configurada es de red (TCP directo).",
                    null));
            }
            else if (spooler == 4)
            {
                checks.Add(CheckJson("spooler", "Servicio de cola de impresion", "ok",
                    "El servicio Cola de impresion esta corriendo.", null));
            }
            else if (spooler == 1)
            {
                hayError = true;
                checks.Add(CheckJson("spooler", "Servicio de cola de impresion", "error",
                    "El servicio Cola de impresion esta detenido.",
                    "Toca 'Sanar' en el panel (o el menu del icono en la bandeja): repara e inicia el servicio con permisos de administrador."));
            }
            else
            {
                checks.Add(CheckJson("spooler", "Servicio de cola de impresion", "aviso",
                    "No se pudo verificar el estado del servicio (" + RawPrinter.DescribirServicioSpooler() + ").",
                    "Abri services.msc y busca 'Cola de impresion'."));
            }

            string errorLista;
            var impresoras = RawPrinter.ListarImpresoras(out errorLista);
            if (esRed)
            {
                checks.Add(CheckJson(
                    "enumeracion", "Impresoras instaladas", "aviso",
                    "No aplica: la impresora configurada es de red.",
                    null));
            }
            else if (impresoras == null)
            {
                hayError = true;
                checks.Add(CheckJson(
                    "enumeracion", "Impresoras instaladas", "error",
                    "No se pudieron enumerar las impresoras: " + errorLista,
                    "Verifica que el servicio Cola de impresion este corriendo (toca 'Sanar')."));
            }
            else
            {
                checks.Add(CheckJson(
                    "enumeracion", "Impresoras instaladas", "ok",
                    "Se encontraron " + impresoras.Count.ToString(CultureInfo.InvariantCulture) + " impresora(s).", null));
            }

            if (string.IsNullOrEmpty(nombre))
            {
                hayError = true;
                checks.Add(CheckJson(
                    "impresora", "Impresora configurada", "error",
                    "No hay impresora configurada ni predeterminada en Windows.",
                    "Abrí el panel, elegí tu comandera en la seccion Impresoras y toca 'Usar en el agente'."));
            }
            else
            {
                if (esRed)
                {
                    string errorRed;
                    if (ImpresoraRed.Disponible(nombre, out errorRed))
                    {
                        checks.Add(CheckJson(
                            "impresora", "Impresora configurada", "ok",
                            "'" + nombre + "' responde en la red.",
                            null));
                    }
                    else
                    {
                        hayError = true;
                        checks.Add(CheckJson(
                            "impresora", "Impresora configurada", "error",
                            "'" + nombre + "': " + errorRed,
                            "Revisa que la comandera este encendida, con cable de red o Wi-Fi, y en la misma red que esta PC."));
                    }
                }
                else
                {
                    string errorInfo;
                    var info = RawPrinter.ObtenerInfo(nombre, out errorInfo);
                    if (info == null)
                    {
                        hayError = true;
                        checks.Add(CheckJson(
                            "impresora", "Impresora configurada", "error",
                            "No se pudo abrir '" + nombre + "': " + errorInfo,
                            "Verifica que la impresora exista en Windows, que el cable este conectado y que el servicio Cola de impresion este corriendo (toca 'Sanar')."));
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
                                "impresora", "Impresora configurada", "error",
                                detalle + " Estado: " + estado + ".",
                                "Revisa el cable USB, la alimentacion y el puerto. Si es USB, proba en otro puerto."));
                        }
                        else if (RawPrinter.TienePapelAgotado(info.Estado))
                        {
                            hayError = true;
                            checks.Add(CheckJson(
                                "impresora", "Impresora configurada", "error",
                                detalle + " Estado: " + estado + ".",
                                "Carga un rollo nuevo y presiona el boton de avance (feed) de la impresora."));
                        }
                        else if (RawPrinter.TieneAtasco(info.Estado))
                        {
                            hayError = true;
                            checks.Add(CheckJson(
                                "impresora", "Impresora configurada", "error",
                                detalle + " Estado: " + estado + ".",
                                "Abre la tapa, retira el papel atascado y vuelve a cerrarla."));
                        }
                        else if (RawPrinter.EstaPausada(info.Estado))
                        {
                            checks.Add(CheckJson(
                                "impresora", "Impresora configurada", "aviso",
                                detalle + " Estado: " + estado + ".",
                                "En Configuracion > Impresoras, abre la cola y toca 'Reanudar'."));
                        }
                        else
                        {
                            checks.Add(CheckJson(
                                "impresora", "Impresora configurada", "ok",
                                detalle + " Estado: " + estado + ".", null));
                        }

                        if (info.Trabajos > 5)
                        {
                            checks.Add(CheckJson(
                                "cola", "Cola de impresion", "aviso",
                                "Hay " + info.Trabajos.ToString(CultureInfo.InvariantCulture) + " trabajos esperando.",
                                "Si la impresora ya imprimio, cancela los trabajos viejos desde la cola de Windows para liberar la comandera."));
                        }
                    }
                }
            }

            if (string.IsNullOrEmpty(Estado.OrigenActualizacion))
            {
                checks.Add(CheckJson(
                    "actualizacion", "Actualizacion automatica", "aviso",
                    "Desactivada: no hay origen configurado.",
                    "Si tenes un servidor de distribucion propio, defini origen_actualizacion en config.ini."));
            }
            else
            {
                Uri origen;
                if (Uri.TryCreate(Estado.OrigenActualizacion, UriKind.Absolute, out origen)
                    && (origen.Scheme == Uri.UriSchemeHttps || origen.IsLoopback))
                {
                    checks.Add(CheckJson("actualizacion", "Actualizacion automatica", "ok",
                        "Origen: " + Estado.OrigenActualizacion + ".", null));
                }
                else
                {
                    checks.Add(CheckJson("actualizacion", "Actualizacion automatica", "aviso",
                        "El origen de actualizacion no es valido: " + Estado.OrigenActualizacion,
                        "Revisa origen_actualizacion en config.ini."));
                }
            }

            if (string.IsNullOrEmpty(Tipografia.Json))
            {
                checks.Add(CheckJson(
                    "tipografia", "Tipografia", "aviso",
                    "Todavia no se configuro la tipografia.",
                    "En el panel, seccion Tipografia, ajusta y toca 'Guardar e imprimir'."));
            }
            else
            {
                checks.Add(CheckJson(
                    "tipografia", "Tipografia", "ok",
                    "Tipografia guardada el " + Tipografia.Actualizada + ".", null));
            }

            try
            {
                var prueba = Path.Combine(Estado.BaseDir, ".agente-write-test");
                File.WriteAllText(prueba, "ok");
                File.Delete(prueba);
                checks.Add(CheckJson("disco", "Escritura en disco", "ok",
                    "La carpeta del agente permite escribir.", null));
            }
            catch (Exception ex)
            {
                checks.Add(CheckJson(
                    "disco", "Escritura en disco", "aviso",
                    "No se pudo escribir en la carpeta del agente: " + ex.Message,
                    "Revisa los permisos de " + Estado.BaseDir + " o reinstala el agente en tu usuario."));
            }

            if (!string.IsNullOrEmpty(Estado.UltimoError))
            {
                checks.Add(CheckJson(
                    "ultimo_error", "Ultimo error registrado", "aviso",
                    Estado.UltimoError + " (" + Estado.UltimoErrorHora + ")",
                    "Revisa agent.log para el detalle completo."));
            }

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":").Append(hayError ? "false" : "true");
            respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");
            respuesta.Append(",\"generado\":\"").Append(ServidorHttp.EscapeJson(DateTimeOffset.Now.ToString("o"))).Append("\"");
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
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        private static string CheckJson(string id, string titulo, string estado, string detalle, string sugerencia)
        {
            var sb = new StringBuilder();
            sb.Append("{\"id\":\"").Append(ServidorHttp.EscapeJson(id)).Append("\"");
            sb.Append(",\"titulo\":\"").Append(ServidorHttp.EscapeJson(titulo)).Append("\"");
            sb.Append(",\"estado\":\"").Append(ServidorHttp.EscapeJson(estado)).Append("\"");
            sb.Append(",\"detalle\":\"").Append(ServidorHttp.EscapeJson(detalle)).Append("\"");
            sb.Append(",\"sugerencia\":");
            if (string.IsNullOrEmpty(sugerencia))
            {
                sb.Append("null");
            }
            else
            {
                sb.Append("\"").Append(ServidorHttp.EscapeJson(sugerencia)).Append("\"");
            }
            sb.Append("}");
            return sb.ToString();
        }
    }
}
