using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

namespace AgentePOS
{
    // Tipografia por documento (comanda / ticket): fuente, tamano,
    // interletrado, interlineado y espacio entre items. La guarda el agente
    // en tipografia.json y la puede sincronizar el panel o cualquier web.
    internal static class Tipografia
    {
        public sealed class Documento
        {
            public string Fuente = "A";
            public int Ancho = 1;
            public int Alto = 1;
            public int Interletrado = 1;
            public int Interlineado = 8;
            public int EspacioItems = 0;
            public int AnchoPapel = 80; // 58 o 80 mm
        }

        public static Documento Comanda = PorDefecto(true);
        public static Documento Ticket = PorDefecto(false);
        public static string Json = "";
        public static string Actualizada = "";

        public static Documento PorDefecto(bool comanda)
        {
            var documento = new Documento();
            documento.Fuente = "A";
            documento.Ancho = 1;
            documento.Alto = 1;
            documento.Interletrado = 1;
            documento.Interlineado = 8;
            documento.EspacioItems = comanda ? 1 : 0;
            documento.AnchoPapel = 80;
            return documento;
        }

        public static void CargarDesdeDisco()
        {
            if (!File.Exists(Estado.TipografiaPath))
            {
                return;
            }

            try
            {
                var texto = File.ReadAllText(Estado.TipografiaPath, Encoding.UTF8);
                var serializer = new JavaScriptSerializer();
                var datos = serializer.Deserialize<Dictionary<string, object>>(texto);
                if (datos == null)
                {
                    return;
                }

                Comanda = LeerDocumento(datos, "comanda", true);
                Ticket = LeerDocumento(datos, "ticket", false);
                Json = serializer.Serialize(Serializar());
                Actualizada = new FileInfo(Estado.TipografiaPath).LastWriteTime
                    .ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
            }
            catch (Exception ex)
            {
                Estado.Log("No se pudo leer tipografia.json: " + ex.Message);
            }
        }

        public static Documento LeerDocumento(Dictionary<string, object> raiz, string clave, bool comanda)
        {
            var documento = PorDefecto(comanda);
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
            documento.AnchoPapel = Limitar(LeerEntero(datos, "anchoPapel", documento.AnchoPapel), 58, 80);
            return documento;
        }

        // Guarda una tipografia enviada por JSON (acepta raiz o {tipografia:{...}}).
        public static void GuardarDesdeJson(string texto, out string error)
        {
            error = null;
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

            Comanda = LeerDocumento(raiz, "comanda", true);
            Ticket = LeerDocumento(raiz, "ticket", false);
            Json = serializer.Serialize(Serializar());
            Actualizada = DateTimeOffset.Now.ToString("o");
            File.WriteAllText(Estado.TipografiaPath, Json, new UTF8Encoding(false));
            Estado.Log("Tipografia actualizada.");
        }

        public static Dictionary<string, object> Serializar()
        {
            var raiz = new Dictionary<string, object>();
            raiz["comanda"] = SerializarDocumento(Comanda);
            raiz["ticket"] = SerializarDocumento(Ticket);
            return raiz;
        }

        private static Dictionary<string, object> SerializarDocumento(Documento documento)
        {
            var datos = new Dictionary<string, object>();
            datos["fuente"] = documento.Fuente;
            datos["ancho"] = documento.Ancho;
            datos["alto"] = documento.Alto;
            datos["interletrado"] = documento.Interletrado;
            datos["interlineado"] = documento.Interlineado;
            datos["espacioItems"] = documento.EspacioItems;
            datos["anchoPapel"] = documento.AnchoPapel;
            return datos;
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
    }
}
