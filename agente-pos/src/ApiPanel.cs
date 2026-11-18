using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Sockets;
using System.Text;
using System.Web.Script.Serialization;

namespace AgentePOS
{
    // Endpoints que consume el panel web servido por el propio agente.
    // Todos exigen token (X-Pos-Token) como el resto de la API.
    internal static class ApiPanel
    {
        // Cache corto de disponibilidad de la impresora LAN: el panel refresca
        // seguido y no queremos pagar 350 ms de conexion en cada /api/estado.
        private static readonly object CandadoRed = new object();
        private static DateTime _redComprobado = DateTime.MinValue;
        private static string _redDireccion = "";
        private static bool _redDisponible;

        private static bool RedDisponible(string direccion)
        {
            lock (CandadoRed)
            {
                if (string.Equals(_redDireccion, direccion, StringComparison.OrdinalIgnoreCase)
                    && DateTime.Now - _redComprobado < TimeSpan.FromSeconds(5))
                {
                    return _redDisponible;
                }

                string error;
                _redDisponible = ImpresoraRed.Disponible(direccion, out error);
                _redDireccion = direccion;
                _redComprobado = DateTime.Now;
                return _redDisponible;
            }
        }

        public static void ResponderEstado(NetworkStream stream)
        {
            var usaPredeterminada = string.IsNullOrEmpty(Estado.Impresora);
            var nombre = usaPredeterminada ? RawPrinter.ObtenerImpresoraPredeterminada() : Estado.Impresora;
            var esRed = ImpresoraRed.EsDireccion(nombre);
            var spooler = RawPrinter.EstadoServicioSpooler();

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"version\":\"").Append(ServidorHttp.EscapeJson(Estado.Version)).Append("\"");
            respuesta.Append(",\"titulo\":\"").Append(ServidorHttp.EscapeJson(Estado.TituloProducto)).Append("\"");
            respuesta.Append(",\"puerto\":").Append(Estado.Puerto.ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"impresora\":\"").Append(ServidorHttp.EscapeJson(Estado.Impresora)).Append("\"");
            respuesta.Append(",\"impresoraResuelta\":\"").Append(ServidorHttp.EscapeJson(nombre ?? "")).Append("\"");
            respuesta.Append(",\"esRed\":").Append(esRed ? "true" : "false");
            if (esRed)
            {
                respuesta.Append(",\"disponibleRed\":").Append(RedDisponible(nombre) ? "true" : "false");
            }
            respuesta.Append(",\"usaPredeterminada\":").Append(usaPredeterminada ? "true" : "false");
            respuesta.Append(",\"spoolerCorriendo\":").Append(spooler == 4 ? "true" : "false");
            respuesta.Append(",\"spoolerEstado\":\"").Append(ServidorHttp.EscapeJson(RawPrinter.DescribirServicioSpooler())).Append("\"");
            respuesta.Append(",\"autoSanar\":").Append(Estado.AutoSanar ? "true" : "false");
            respuesta.Append(",\"baseDir\":\"").Append(ServidorHttp.EscapeJson(Estado.BaseDir)).Append("\"");
            respuesta.Append(",\"uptimeSegundos\":")
                .Append(((long)(DateTime.Now - Estado.Inicio).TotalSeconds).ToString(CultureInfo.InvariantCulture));
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

        public static void ResponderImpresoras(NetworkStream stream)
        {
            string errorLista;
            var impresoras = RawPrinter.ListarImpresoras(out errorLista);
            if (impresoras == null)
            {
                ServidorHttp.ResponderError(stream, 500, "No se pudieron listar las impresoras: " + errorLista);
                return;
            }

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true,\"impresoras\":[");
            for (var i = 0; i < impresoras.Count; i++)
            {
                var info = impresoras[i];
                if (i > 0)
                {
                    respuesta.Append(",");
                }

                respuesta.Append("{\"nombre\":\"").Append(ServidorHttp.EscapeJson(info.Nombre)).Append("\"");
                respuesta.Append(",\"puerto\":\"").Append(ServidorHttp.EscapeJson(info.Puerto)).Append("\"");
                respuesta.Append(",\"driver\":\"").Append(ServidorHttp.EscapeJson(info.Driver)).Append("\"");
                respuesta.Append(",\"trabajos\":").Append(info.Trabajos.ToString(CultureInfo.InvariantCulture));
                respuesta.Append(",\"estadoCodigo\":").Append(info.Estado.ToString(CultureInfo.InvariantCulture));
                respuesta.Append(",\"estado\":\"").Append(ServidorHttp.EscapeJson(RawPrinter.DescribirEstado(info.Estado))).Append("\"");
                respuesta.Append(",\"offline\":").Append(RawPrinter.EstaOffline(info.Estado) ? "true" : "false");
                respuesta.Append(",\"papelAgotado\":").Append(RawPrinter.TienePapelAgotado(info.Estado) ? "true" : "false");
                respuesta.Append(",\"atasco\":").Append(RawPrinter.TieneAtasco(info.Estado) ? "true" : "false");
                respuesta.Append(",\"pausada\":").Append(RawPrinter.EstaPausada(info.Estado) ? "true" : "false");
                respuesta.Append(",\"predeterminada\":").Append(info.Predeterminada ? "true" : "false");
                respuesta.Append(",\"configurada\":").Append(
                    string.Equals(info.Nombre, Estado.Impresora, StringComparison.OrdinalIgnoreCase) ? "true" : "false");
                respuesta.Append("}");
            }
            respuesta.Append("]}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void ElegirImpresora(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!ServidorHttp.LeerCuerpo(stream, headers, Estado.MaxConfigBytes, out body))
            {
                return;
            }

            Dictionary<string, object> datos;
            string nombre;
            if (!LeerCuerpoJson(body, out datos) || !LeerTexto(datos, "nombre", out nombre))
            {
                ServidorHttp.ResponderError(stream, 400, "Falta el nombre de la impresora.");
                return;
            }

            nombre = nombre.Trim();
            if (nombre.Length == 0 || nombre.Length > 200)
            {
                ServidorHttp.ResponderError(stream, 400, "El nombre de la impresora no es valido.");
                return;
            }

            // Impresora de red: no tiene que existir en Windows. Se valida el
            // formato LAN://ip:puerto y se normaliza (IP y puerto canonicos).
            if (ImpresoraRed.EsDireccion(nombre))
            {
                ImpresoraRed.Destino destino;
                string errorRed;
                if (!ImpresoraRed.Parsear(nombre, out destino, out errorRed))
                {
                    ServidorHttp.ResponderError(stream, 400, errorRed);
                    return;
                }

                nombre = ImpresoraRed.Formatear(destino.Ip, destino.Puerto);
                Estado.Impresora = nombre;
                Estado.GuardarConfiguracion();
                Estado.Log("Impresora de red configurada desde el panel: '" + nombre + "'.");

                ServidorHttp.ResponderJson(stream, 200,
                    "{\"ok\":true,\"impresora\":\"" + ServidorHttp.EscapeJson(nombre) + "\",\"red\":true}");
                return;
            }

            // Solo se acepta una impresora que exista: evita tokens de nombre
            // mal tipeados que despues no imprimen nada y nadie sabe por que.
            string errorLista;
            var impresoras = RawPrinter.ListarImpresoras(out errorLista);
            var existe = false;
            if (impresoras != null)
            {
                foreach (var info in impresoras)
                {
                    if (string.Equals(info.Nombre, nombre, StringComparison.OrdinalIgnoreCase))
                    {
                        existe = true;
                        nombre = info.Nombre; // nombre exacto tal como lo devuelve Windows
                        break;
                    }
                }
            }

            if (!existe)
            {
                ServidorHttp.ResponderError(stream, 400,
                    "La impresora '" + nombre + "' no aparece instalada en Windows. Toca Refrescar y elegila de la lista.");
                return;
            }

            Estado.Impresora = nombre;
            Estado.GuardarConfiguracion();
            Estado.Log("Impresora configurada desde el panel: '" + nombre + "'.");

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"impresora\":\"").Append(ServidorHttp.EscapeJson(nombre)).Append("\"");
            respuesta.Append("}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void DefinirPredeterminada(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!ServidorHttp.LeerCuerpo(stream, headers, Estado.MaxConfigBytes, out body))
            {
                return;
            }

            Dictionary<string, object> datos;
            string nombre;
            if (!LeerCuerpoJson(body, out datos) || !LeerTexto(datos, "nombre", out nombre))
            {
                ServidorHttp.ResponderError(stream, 400, "Falta el nombre de la impresora.");
                return;
            }

            string error;
            if (!RawPrinter.DefinirPredeterminada(nombre.Trim(), out error))
            {
                ServidorHttp.ResponderError(stream, 500, error);
                return;
            }

            Estado.Log("Predeterminada de Windows definida desde el panel: '" + nombre.Trim() + "'.");
            ServidorHttp.ResponderJson(stream, 200,
                "{\"ok\":true,\"predeterminada\":\"" + ServidorHttp.EscapeJson(nombre.Trim()) + "\"}");
        }

        public static void ResponderPrueba(NetworkStream stream)
        {
            string error;
            if (ApiPos.ImprimirPrueba(out error))
            {
                ServidorHttp.ResponderJson(stream, 200,
                    "{\"ok\":true,\"mensaje\":\"Prueba enviada a la impresora.\"}");
                return;
            }

            ServidorHttp.ResponderError(stream, 500, error);
        }

        public static void ResponderSanar(NetworkStream stream)
        {
            try
            {
                Sanador.SolicitarSanacion();
                ServidorHttp.ResponderJson(stream, 200,
                    "{\"ok\":true,\"mensaje\":\"Acepta el permiso de administrador: el sanador repara el servicio de impresion y cierra.\"}");
            }
            catch (Exception ex)
            {
                Estado.Log("Sanacion rechazada o fallida: " + ex.Message);
                ServidorHttp.ResponderError(stream, 500,
                    "No se pudo iniciar la sanacion: " + ex.Message + ". Cancelaste el permiso de administrador?");
            }
        }

        // Descubre comanderas en la red local probando el puerto 9100.
        // Bloqueante: el panel muestra "Buscando..." mientras responde.
        public static void ResponderLanScan(NetworkStream stream)
        {
            string error;
            var hallazgos = ImpresoraRed.Escanear(out error);
            if (hallazgos == null)
            {
                ServidorHttp.ResponderError(stream, 500, error);
                return;
            }

            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            if (!string.IsNullOrEmpty(error))
            {
                // Escaneo valido pero sin redes: el panel lo muestra como aviso.
                respuesta.Append(",\"aviso\":\"").Append(ServidorHttp.EscapeJson(error)).Append("\"");
            }
            respuesta.Append(",\"hallazgos\":[");
            for (var i = 0; i < hallazgos.Count; i++)
            {
                var hallazgo = hallazgos[i];
                if (i > 0)
                {
                    respuesta.Append(",");
                }
                respuesta.Append("{\"ip\":\"").Append(ServidorHttp.EscapeJson(hallazgo.Ip)).Append("\"");
                respuesta.Append(",\"puerto\":").Append(hallazgo.Puerto.ToString(CultureInfo.InvariantCulture));
                respuesta.Append(",\"direccion\":\"").Append(ServidorHttp.EscapeJson(hallazgo.Direccion)).Append("\"");
                respuesta.Append(",\"configurada\":").Append(
                    string.Equals(hallazgo.Direccion, Estado.Impresora, StringComparison.OrdinalIgnoreCase) ? "true" : "false");
                respuesta.Append("}");
            }
            respuesta.Append("]}");

            Estado.Log("Escaneo LAN: " + hallazgos.Count.ToString(CultureInfo.InvariantCulture) + " hallazgo(s).");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void ResponderSpooler(NetworkStream stream)        {
            var codigo = RawPrinter.EstadoServicioSpooler();
            var respuesta = new StringBuilder();
            respuesta.Append("{\"ok\":true");
            respuesta.Append(",\"codigo\":").Append(codigo.ToString(CultureInfo.InvariantCulture));
            respuesta.Append(",\"corriendo\":").Append(codigo == 4 ? "true" : "false");
            respuesta.Append(",\"estado\":\"").Append(ServidorHttp.EscapeJson(RawPrinter.DescribirServicioSpooler())).Append("\"");
            respuesta.Append("}");
            ServidorHttp.ResponderJson(stream, 200, respuesta.ToString());
        }

        public static void GuardarAjustes(NetworkStream stream, Dictionary<string, string> headers)
        {
            byte[] body;
            if (!ServidorHttp.LeerCuerpo(stream, headers, Estado.MaxConfigBytes, out body))
            {
                return;
            }

            Dictionary<string, object> datos;
            if (!LeerCuerpoJson(body, out datos))
            {
                ServidorHttp.ResponderError(stream, 400, "JSON invalido.");
                return;
            }

            object nodo;
            if (datos.TryGetValue("autoSanar", out nodo))
            {
                Estado.AutoSanar = Convert.ToBoolean(nodo, CultureInfo.InvariantCulture);
            }

            Estado.GuardarConfiguracion();
            Estado.Log("Ajustes guardados desde el panel (autoSanar=" + (Estado.AutoSanar ? "1" : "0") + ").");
            ServidorHttp.ResponderJson(stream, 200,
                "{\"ok\":true,\"autoSanar\":" + (Estado.AutoSanar ? "true" : "false") + "}");
        }

        private static bool LeerCuerpoJson(byte[] body, out Dictionary<string, object> datos)
        {
            datos = null;
            if (body == null || body.Length == 0)
            {
                return false;
            }

            try
            {
                var serializer = new JavaScriptSerializer();
                datos = serializer.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(body));
                return datos != null;
            }
            catch
            {
                return false;
            }
        }

        private static bool LeerTexto(Dictionary<string, object> datos, string clave, out string valor)
        {
            valor = null;
            object nodo;
            if (datos == null || !datos.TryGetValue(clave, out nodo) || nodo == null)
            {
                return false;
            }

            valor = Convert.ToString(nodo, CultureInfo.InvariantCulture);
            return !string.IsNullOrEmpty(valor);
        }
    }
}
