using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;

namespace AgentePOS
{
    // Sanador: repara los problemas del sistema que dejan la impresora muerta
    // (spooler detenido o en manual, tipo de inicio cambiado por optimizadores).
    // El proceso normal no tiene permisos, entonces se relanza a si mismo con
    // elevacion UAC en modo --sanar: ese proceso aplica las reparaciones y sale.
    internal static class Sanador
    {
        private static DateTime _ultimoIntento = DateTime.MinValue;
        private static readonly object _lock = new object();

        // Accion visible para el usuario (menu de bandeja / panel).
        public static void SolicitarSanacionConAviso()
        {
            try
            {
                SolicitarSanacion();
            }
            catch (Exception ex)
            {
                Estado.Log("Sanacion cancelada o rechazada: " + ex.Message);
            }
        }

        // Lanza una copia elevada del propio ejecutable. El usuario ve la
        // ventana de UAC y decide. Cancelarla no es un error grave.
        public static void SolicitarSanacion()
        {
            var exe = Process.GetCurrentProcess().MainModule.FileName;
            var info = new ProcessStartInfo();
            info.FileName = exe;
            info.Arguments = "--sanar";
            info.Verb = "runas";
            info.UseShellExecute = true;
            Process.Start(info);
            Estado.Log("Solicite sanacion del sistema con permisos de administrador.");
        }

        // Decide si vale la pena auto-sanar ante un error de impresion
        // (RPC no disponible, servicio detenido, dependencia caida).
        // Limitado a un intento cada 3 minutos para no martillar con UAC.
        public static bool DeberiaSanar(int codigoWin32)
        {
            if (codigoWin32 != 1722 && codigoWin32 != 1068 && codigoWin32 != 1062)
            {
                return false;
            }

            lock (_lock)
            {
                if (DateTime.Now - _ultimoIntento < TimeSpan.FromMinutes(3))
                {
                    return false;
                }
                _ultimoIntento = DateTime.Now;
            }

            return true;
        }

        // Corre dentro de la instancia elevada. Sin UI, silencioso.
        public static int EjecutarSanacion()
        {
            try
            {
                Estado.Log("Modo sanador: aplicando reparaciones con permisos de administrador.");

                // Restaurar el tipo de inicio del spooler: los optimizadores
                // suelen dejarlo en manual o deshabilitado.
                Ejecutar("sc.exe", "config Spooler start= auto");

                // Iniciarlo si no esta corriendo (error 1062/2183 si ya corre: ok).
                Ejecutar("net.exe", "start Spooler");

                Estado.Log("Sanacion terminada.");
                return 0;
            }
            catch (Exception ex)
            {
                Estado.Log("Error en sanacion: " + ex.Message);
                return 1;
            }
        }

        private static void Ejecutar(string exe, string argumentos)
        {
            var info = new ProcessStartInfo();
            info.FileName = exe;
            info.Arguments = argumentos;
            info.CreateNoWindow = true;
            info.UseShellExecute = false;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;

            using (var proceso = Process.Start(info))
            {
                var salida = proceso.StandardOutput.ReadToEnd();
                var errores = proceso.StandardError.ReadToEnd();
                proceso.WaitForExit(30000);

                Estado.Log(exe + " " + argumentos + " -> exit "
                    + proceso.ExitCode.ToString(CultureInfo.InvariantCulture)
                    + (salida.Length > 0 ? " | " + salida.Trim() : "")
                    + (errores.Length > 0 ? " | ERR: " + errores.Trim() : ""));
            }
        }
    }
}
