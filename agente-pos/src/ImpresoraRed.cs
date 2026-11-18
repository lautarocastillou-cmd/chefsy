using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading;

namespace AgentePOS
{
    // Impresion directa por TCP al puerto 9100 (ESC/POS raw) y descubrimiento
    // de comanderas en la red local. Cubre las impresoras que NO estan
    // instaladas en Windows: las que si lo estan ya aparecen en EnumPrinters
    // y se imprimen via el spooler (RawPrinter).
    //
    // Direccion canonica: LAN://192.168.1.50:9100
    // (tambien se acepta lan://, con o sin puerto; 9100 es el default).
    internal static class ImpresoraRed
    {
        public const string Prefijo = "LAN://";
        public const int PuertoPorDefecto = 9100;

        // Limites del escaneo. Pensado para un local: una subred /24 tarda
        // pocos segundos; subredes mas grandes se recortan para no colgar
        // el hilo del servidor HTTP.
        private const int MaxHosts = 254;
        private const int TimeoutConexionMs = 350;
        private const int TimeoutEnvioMs = 8000;
        private const int HilosScan = 32;

        public sealed class Destino
        {
            public string Ip;
            public int Puerto;
        }

        public sealed class Hallazgo
        {
            public string Ip;
            public int Puerto;
            public string Direccion;
        }

        public static bool EsDireccion(string texto)
        {
            return !string.IsNullOrEmpty(texto)
                && texto.StartsWith(Prefijo, StringComparison.OrdinalIgnoreCase);
        }

        public static string Formatear(string ip, int puerto)
        {
            return Prefijo + ip + ":" + puerto.ToString(CultureInfo.InvariantCulture);
        }

        // Parsea "LAN://192.168.1.50:9100". Puerto opcional (default 9100).
        // Devuelve false si la IP no es IPv4 valida o el puerto esta fuera de rango.
        public static bool Parsear(string texto, out Destino destino, out string error)
        {
            destino = null;
            error = null;

            if (!EsDireccion(texto))
            {
                error = "La direccion no tiene el formato LAN://ip:puerto.";
                return false;
            }

            var resto = texto.Substring(Prefijo.Length).Trim();
            var ipTexto = resto;
            var puerto = PuertoPorDefecto;

            var separador = resto.LastIndexOf(':');
            if (separador >= 0)
            {
                ipTexto = resto.Substring(0, separador).Trim();
                var puertoTexto = resto.Substring(separador + 1).Trim();
                if (puertoTexto.Length > 0)
                {
                    if (!int.TryParse(puertoTexto, NumberStyles.Integer, CultureInfo.InvariantCulture, out puerto)
                        || puerto <= 0 || puerto > 65535)
                    {
                        error = "El puerto de la impresora de red no es valido.";
                        return false;
                    }
                }
            }

            IPAddress ip;
            if (!IPAddress.TryParse(ipTexto, out ip) || ip.AddressFamily != AddressFamily.InterNetwork)
            {
                error = "La direccion IP de la impresora de red no es valida.";
                return false;
            }

            destino = new Destino();
            destino.Ip = ip.ToString();
            destino.Puerto = puerto;
            return true;
        }

        // Envia bytes crudos por TCP. No abre dialogos ni pasa por el spooler.
        public static bool Enviar(string direccion, byte[] bytes, out string error)
        {
            error = null;

            Destino destino;
            if (!Parsear(direccion, out destino, out error))
            {
                return false;
            }

            TcpClient cliente = null;
            try
            {
                cliente = new TcpClient();
                var conectado = cliente.BeginConnect(destino.Ip, destino.Puerto, null, null);
                if (!conectado.AsyncWaitHandle.WaitOne(TimeoutEnvioMs))
                {
                    error = "No se pudo conectar a " + Formatear(destino.Ip, destino.Puerto)
                        + ". Verifica que la comandera este encendida y en la misma red.";
                    return false;
                }

                cliente.EndConnect(conectado);
                cliente.SendTimeout = TimeoutEnvioMs;
                cliente.ReceiveTimeout = TimeoutEnvioMs;

                var stream = cliente.GetStream();
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush();
                return true;
            }
            catch (Exception ex)
            {
                error = "Error enviando a " + Formatear(destino.Ip, destino.Puerto) + ": " + ex.Message;
                return false;
            }
            finally
            {
                if (cliente != null)
                {
                    try
                    {
                        cliente.Close();
                    }
                    catch
                    {
                    }
                }
            }
        }

        // Solo abre el puerto y lo cierra. Sirve para el diagnostico y para
        // saber si una IP cargada a mano responde, sin mandar bytes.
        public static bool Disponible(string direccion, out string error)
        {
            Destino destino;
            if (!Parsear(direccion, out destino, out error))
            {
                return false;
            }

            if (!PuertoAbierto(destino.Ip, destino.Puerto))
            {
                error = "No responde " + Formatear(destino.Ip, destino.Puerto)
                    + ". Verifica que este encendida y en la misma red.";
                return false;
            }

            error = null;
            return true;
        }

        // Escanea las subredes locales IPv4 buscando el puerto 9100 abierto.
        // Solo interfaces operativas con gateway: evita VPNs raras y adaptadores
        // virtuales sin salida real. Bloqueante: lo llama el hilo HTTP.
        public static List<Hallazgo> Escanear(out string error)
        {
            error = null;
            var encontrados = new List<Hallazgo>();
            var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            List<string> hosts;
            try
            {
                hosts = HostsAEscanear();
            }
            catch (Exception ex)
            {
                error = "No se pudieron leer las interfaces de red: " + ex.Message;
                return null;
            }

            if (hosts.Count == 0)
            {
                error = "No hay ninguna red local para escanear (sin interfaz IPv4 con gateway).";
                return encontrados;
            }

            var indice = 0;
            var pendientes = new List<ManualResetEvent>();
            var candado = new object();

            while (indice < hosts.Count || pendientes.Count > 0)
            {
                while (pendientes.Count < HilosScan && indice < hosts.Count)
                {
                    var ip = hosts[indice];
                    indice++;

                    var hecho = new ManualResetEvent(false);
                    pendientes.Add(hecho);

                    ThreadPool.QueueUserWorkItem(delegate(object estado)
                    {
                        var datos = (object[])estado;
                        var ipObjetivo = (string)datos[0];
                        var senal = (ManualResetEvent)datos[1];

                        if (PuertoAbierto(ipObjetivo, PuertoPorDefecto))
                        {
                            lock (candado)
                            {
                                if (vistos.Add(ipObjetivo))
                                {
                                    var hallazgo = new Hallazgo();
                                    hallazgo.Ip = ipObjetivo;
                                    hallazgo.Puerto = PuertoPorDefecto;
                                    hallazgo.Direccion = Formatear(ipObjetivo, PuertoPorDefecto);
                                    encontrados.Add(hallazgo);
                                }
                            }
                        }

                        senal.Set();
                    }, new object[] { ip, hecho });
                }

                if (pendientes.Count > 0)
                {
                    var senales = pendientes.ToArray();
                    var listo = WaitHandle.WaitAny(senales, 1000);
                    if (listo != WaitHandle.WaitTimeout)
                    {
                        pendientes[listo].Close();
                        pendientes.RemoveAt(listo);
                    }
                    else
                    {
                        for (var i = pendientes.Count - 1; i >= 0; i--)
                        {
                            if (pendientes[i].WaitOne(0))
                            {
                                pendientes[i].Close();
                                pendientes.RemoveAt(i);
                            }
                        }
                    }
                }
            }

            encontrados.Sort(delegate(Hallazgo a, Hallazgo b)
            {
                return string.Compare(a.Ip, b.Ip, StringComparison.OrdinalIgnoreCase);
            });

            return encontrados;
        }

        private static bool PuertoAbierto(string ip, int puerto)
        {
            TcpClient cliente = null;
            try
            {
                cliente = new TcpClient();
                var conectado = cliente.BeginConnect(ip, puerto, null, null);
                if (!conectado.AsyncWaitHandle.WaitOne(TimeoutConexionMs))
                {
                    return false;
                }

                cliente.EndConnect(conectado);
                return cliente.Connected;
            }
            catch
            {
                return false;
            }
            finally
            {
                if (cliente != null)
                {
                    try
                    {
                        cliente.Close();
                    }
                    catch
                    {
                    }
                }
            }
        }

        // Hosts candidatos: por cada interfaz IPv4 operativa con gateway,
        // recorre la subred derivada de la mascara. Se salta la propia IP,
        // la de red y la de broadcast. Tope MaxHosts para no tardar de mas.
        private static List<string> HostsAEscanear()
        {
            var hosts = new List<string>();
            var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var interfaz in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (interfaz.OperationalStatus != OperationalStatus.Up)
                {
                    continue;
                }
                if (interfaz.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                {
                    continue;
                }

                var propiedades = interfaz.GetIPProperties();
                if (propiedades.GatewayAddresses == null || propiedades.GatewayAddresses.Count == 0)
                {
                    continue;
                }

                foreach (var unicast in propiedades.UnicastAddresses)
                {
                    if (unicast.Address.AddressFamily != AddressFamily.InterNetwork)
                    {
                        continue;
                    }

                    var mascara = unicast.IPv4Mask;
                    if (mascara == null)
                    {
                        continue;
                    }

                    var ipBytes = unicast.Address.GetAddressBytes();
                    var mascaraBytes = mascara.GetAddressBytes();
                    if (ipBytes.Length != 4 || mascaraBytes.Length != 4)
                    {
                        continue;
                    }

                    var bitsHost = BitsDeHost(mascaraBytes);
                    // /32 no tiene vecinos. Mas grande que /24 (oficina, VPN)
                    // se recorta a la /24 de nuestra propia IP: alcanza para
                    // un local y no convierte el escaneo en minutos.
                    if (bitsHost <= 0)
                    {
                        continue;
                    }
                    if (bitsHost > 8)
                    {
                        mascaraBytes = new byte[] { 255, 255, 255, 0 };
                        bitsHost = 8;
                    }

                    var total = 1 << bitsHost;
                    for (var offset = 1; offset < total - 1; offset++)
                    {
                        if (hosts.Count >= MaxHosts)
                        {
                            return hosts;
                        }

                        var candidato = new byte[4];
                        for (var b = 0; b < 4; b++)
                        {
                            var hostByte = (offset >> ((3 - b) * 8)) & 0xFF;
                            candidato[b] = (byte)((ipBytes[b] & mascaraBytes[b]) | (hostByte & ~mascaraBytes[b]));
                        }

                        var texto = candidato[0].ToString(CultureInfo.InvariantCulture) + "."
                            + candidato[1].ToString(CultureInfo.InvariantCulture) + "."
                            + candidato[2].ToString(CultureInfo.InvariantCulture) + "."
                            + candidato[3].ToString(CultureInfo.InvariantCulture);

                        if (string.Equals(texto, unicast.Address.ToString(), StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        if (vistos.Add(texto))
                        {
                            hosts.Add(texto);
                        }
                    }
                }
            }

            return hosts;
        }

        private static int BitsDeHost(byte[] mascara)
        {
            var bits = 0;
            var enHost = false;
            for (var i = 0; i < mascara.Length; i++)
            {
                for (var bit = 7; bit >= 0; bit--)
                {
                    var prendido = (mascara[i] & (1 << bit)) != 0;
                    if (!prendido)
                    {
                        enHost = true;
                    }
                    else if (enHost)
                    {
                        // Mascara no contigua: no se puede derivar una subred.
                        return -1;
                    }

                    if (enHost)
                    {
                        bits++;
                    }
                }
            }
            return bits;
        }
    }
}
