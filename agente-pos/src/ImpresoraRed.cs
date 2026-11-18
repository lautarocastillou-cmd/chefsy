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
        // Solo acepta IPv4 dotted-quad estricta y unicast imprimible: fuera
        // loopback, 0.0.0.0, multicast y broadcast. Evita que un token valido
        // se use para mandar bytes a servicios locales o a Internet.
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

            // IPv6 no se soporta: el separador de puerto seria ambiguo.
            if (resto.IndexOf(':') != resto.LastIndexOf(':'))
            {
                error = "Solo se aceptan direcciones IPv4 (por ejemplo LAN://192.168.1.50:9100).";
                return false;
            }

            var separador = resto.LastIndexOf(':');
            if (separador >= 0)
            {
                ipTexto = resto.Substring(0, separador).Trim();
                var puertoTexto = resto.Substring(separador + 1).Trim();
                if (puertoTexto.Length > 0)
                {
                    if (!int.TryParse(puertoTexto, NumberStyles.None, CultureInfo.InvariantCulture, out puerto)
                        || puerto <= 0 || puerto > 65535)
                    {
                        error = "El puerto de la impresora de red no es valido.";
                        return false;
                    }
                }
            }

            if (!EsIpv4Estricta(ipTexto))
            {
                error = "La direccion IP de la impresora de red no es valida. Usa el formato 192.168.1.50.";
                return false;
            }

            IPAddress ip;
            if (!IPAddress.TryParse(ipTexto, out ip) || ip.AddressFamily != AddressFamily.InterNetwork)
            {
                error = "La direccion IP de la impresora de red no es valida.";
                return false;
            }

            var bytes = ip.GetAddressBytes();
            if (bytes[0] == 0 || bytes[0] == 127 || bytes[0] >= 224)
            {
                error = "La direccion debe ser una IP de red local (no loopback, multicast ni broadcast).";
                return false;
            }

            destino = new Destino();
            destino.Ip = bytes[0].ToString(CultureInfo.InvariantCulture) + "."
                + bytes[1].ToString(CultureInfo.InvariantCulture) + "."
                + bytes[2].ToString(CultureInfo.InvariantCulture) + "."
                + bytes[3].ToString(CultureInfo.InvariantCulture);
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
                cliente = ConectarAbierto(destino.Ip, destino.Puerto, TimeoutEnvioMs);
                if (cliente == null)
                {
                    error = "No se pudo conectar a " + Formatear(destino.Ip, destino.Puerto)
                        + ". Verifica que la comandera este encendida y en la misma red.";
                    return false;
                }

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
                Cerrar(cliente);
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
        // Usa un CountdownEvent: encola un work item por host y espera a que
        // todos terminen, con un tope de tiempo global para no colgar el
        // hilo HTTP si el ThreadPool esta saturado. Bloqueante a proposito.
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
                error = "No hay ninguna red local para escanear (sin interfaz Ethernet o Wi-Fi activa).";
                return encontrados;
            }

            var candado = new object();
            var semaforo = new Semaphore(HilosScan, HilosScan);
            var pendientes = new CountdownEvent(hosts.Count);

            foreach (var ip in hosts)
            {
                ThreadPool.QueueUserWorkItem(delegate(object estado)
                {
                    var ipObjetivo = (string)estado;
                    try
                    {
                        semaforo.WaitOne();
                        try
                        {
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
                        }
                        finally
                        {
                            semaforo.Release();
                        }
                    }
                    catch
                    {
                        // Un host con problemas no debe abortar el escaneo.
                    }
                    finally
                    {
                        try
                        {
                            pendientes.Signal();
                        }
                        catch
                        {
                        }
                    }
                }, ip);
            }

            // Tope global: un poco mas que el peor caso teorico.
            var topeMs = (hosts.Count / HilosScan + 2) * TimeoutConexionMs * 2;
            if (!pendientes.Wait(topeMs))
            {
                Estado.Log("Escaneo LAN: se agoto el tiempo con "
                    + pendientes.CurrentCount.ToString(CultureInfo.InvariantCulture) + " host(s) pendiente(s).");
            }

            encontrados.Sort(delegate(Hallazgo a, Hallazgo b)
            {
                return string.Compare(a.Ip, b.Ip, StringComparison.OrdinalIgnoreCase);
            });

            return encontrados;
        }

        private static bool EsIpv4Estricta(string texto)
        {
            if (string.IsNullOrEmpty(texto))
            {
                return false;
            }

            var partes = texto.Split('.');
            if (partes.Length != 4)
            {
                return false;
            }

            foreach (var parte in partes)
            {
                if (parte.Length == 0 || parte.Length > 3)
                {
                    return false;
                }

                foreach (var c in parte)
                {
                    if (c < '0' || c > '9')
                    {
                        return false;
                    }
                }

                int valor;
                if (!int.TryParse(parte, NumberStyles.None, CultureInfo.InvariantCulture, out valor)
                    || valor < 0 || valor > 255)
                {
                    return false;
                }
            }

            return true;
        }

        // Conecta y devuelve el cliente abierto, o null si no llego en el
        // tiempo. Cierra siempre el wait handle del BeginConnect (si no, cada
        // intento deja un handle hasta que pase el GC).
        private static TcpClient ConectarAbierto(string ip, int puerto, int timeoutMs)
        {
            var cliente = new TcpClient();
            IAsyncResult conectado = null;
            try
            {
                conectado = cliente.BeginConnect(ip, puerto, null, null);
                if (!conectado.AsyncWaitHandle.WaitOne(timeoutMs))
                {
                    Cerrar(cliente);
                    return null;
                }

                cliente.EndConnect(conectado);
                return cliente;
            }
            catch
            {
                Cerrar(cliente);
                return null;
            }
            finally
            {
                if (conectado != null)
                {
                    try
                    {
                        conectado.AsyncWaitHandle.Close();
                    }
                    catch
                    {
                    }
                }
            }
        }

        private static bool PuertoAbierto(string ip, int puerto)
        {
            var cliente = ConectarAbierto(ip, puerto, TimeoutConexionMs);
            if (cliente == null)
            {
                return false;
            }

            Cerrar(cliente);
            return true;
        }

        private static void Cerrar(TcpClient cliente)
        {
            if (cliente == null)
            {
                return;
            }

            try
            {
                cliente.Close();
            }
            catch
            {
            }
        }

        // Hosts candidatos: interfaces Ethernet o Wi-Fi activas, con IP IPv4.
        // Se escanean aunque no tengan gateway (un local con switch e IP fija
        // es un caso tipico); se excluyen adaptadores virtuales y VPN por tipo
        // y descripcion. Tope MaxHosts para no tardar de mas.
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

                if (interfaz.NetworkInterfaceType != NetworkInterfaceType.Ethernet
                    && interfaz.NetworkInterfaceType != NetworkInterfaceType.Wireless80211)
                {
                    continue;
                }

                var descripcion = (interfaz.Description ?? "").ToLowerInvariant();
                if (descripcion.Contains("virtual")
                    || descripcion.Contains("vmware")
                    || descripcion.Contains("hyper-v")
                    || descripcion.Contains("vbox")
                    || descripcion.Contains("tap-")
                    || descripcion.Contains("vpn")
                    || descripcion.Contains("tunnel"))
                {
                    continue;
                }

                var propiedades = interfaz.GetIPProperties();
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

                    // /31 (RFC 3021): las dos direcciones son usables.
                    // Otras mascaras: se salta red y broadcast.
                    var total = 1 << bitsHost;
                    var limite = bitsHost == 1 ? total : total - 1;
                    for (var offset = 1; offset < limite; offset++)
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
