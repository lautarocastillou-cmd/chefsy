using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AgentePOS
{
    // Estado global compartido por todos los modulos del agente.
    // Producto universal: un solo ejecutable portable, sin dependencias,
    // que imprime en cualquier comandera via el spooler de Windows.
    internal static class Estado
    {
        public const string Version = "2.1.0";
        public const string NombreProducto = "AgentePOS";
        public const string TituloProducto = "Agente POS";
        public const int PuertoPorDefecto = 9191;

        public const int MaxBodyBytes = 2 * 1024 * 1024;
        public const int MaxConfigBytes = 32 * 1024;
        public const int MaxUpdateBytes = 5 * 1024 * 1024;

        public static string BaseDir = "";
        public static string ConfigPath = "";
        public static string LogPath = "";
        public static string TipografiaPath = "";

        public static int Puerto = PuertoPorDefecto;
        public static string Token = "";
        public static string Impresora = "";
        // Origen de auto-actualizacion: vacio por defecto en la version
        // universal. Se puede apuntar a cualquier URL que publique
        // version.json + ejecutable firmado por hash.
        public static string OrigenActualizacion = "";
        public static bool AutoSanar = true;

        public static readonly object LogLock = new object();
        public static readonly DateTime Inicio = DateTime.Now;
        public static string UltimoError = "";
        public static string UltimoErrorHora = "";
        public static volatile bool Deteniendo = false;
        public static TcpListener Listener = null;

        public static void CargarConfiguracion()
        {
            if (!File.Exists(ConfigPath))
            {
                return;
            }

            foreach (var linea in File.ReadAllLines(ConfigPath))
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
                    if (int.TryParse(valor, NumberStyles.Integer, CultureInfo.InvariantCulture, out puerto)
                        && puerto > 0 && puerto < 65536)
                    {
                        Puerto = puerto;
                    }
                }
                else if (clave == "token")
                {
                    Token = valor;
                }
                else if (clave == "impresora")
                {
                    Impresora = valor;
                }
                else if (clave == "origen_actualizacion")
                {
                    if (!string.IsNullOrWhiteSpace(valor))
                    {
                        OrigenActualizacion = valor.Trim().TrimEnd('/');
                    }
                }
                else if (clave == "auto_sanar")
                {
                    AutoSanar = valor != "0" && string.Equals(valor, "true", StringComparison.OrdinalIgnoreCase);
                }
            }
        }

        public static void GuardarConfiguracion()
        {
            var sb = new StringBuilder();
            sb.AppendLine("# Configuracion de Agente POS");
            sb.AppendLine("# No compartas este archivo: contiene el token de acceso.");
            sb.AppendLine("puerto=" + Puerto.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("token=" + Token);
            sb.AppendLine("impresora=" + Impresora);
            sb.AppendLine("origen_actualizacion=" + OrigenActualizacion);
            sb.AppendLine("auto_sanar=" + (AutoSanar ? "1" : "0"));
            File.WriteAllText(ConfigPath, sb.ToString(), new UTF8Encoding(false));
        }

        public static string GenerarToken()
        {
            var bytes = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(bytes);
            }

            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        public static void RegistrarError(string mensaje)
        {
            UltimoError = mensaje;
            UltimoErrorHora = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }

        public static void Log(string mensaje)
        {
            try
            {
                lock (LogLock)
                {
                    var archivo = new FileInfo(LogPath);
                    if (archivo.Exists && archivo.Length > 256 * 1024)
                    {
                        File.WriteAllText(LogPath, "");
                    }

                    var linea = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                        + " " + mensaje + Environment.NewLine;
                    File.AppendAllText(LogPath, linea, new UTF8Encoding(false));
                }
            }
            catch
            {
                // El log nunca debe tumbar al agente.
            }
        }
    }

    // Punto de entrada. Modo especial: AgentePOS.exe --sanar
    // corre una reparacion del sistema con permisos elevados y sale.
    internal static class Program
    {
        private static int Main(string[] args)
        {
            Estado.BaseDir = AppDomain.CurrentDomain.BaseDirectory;
            Estado.ConfigPath = Path.Combine(Estado.BaseDir, "config.ini");
            Estado.LogPath = Path.Combine(Estado.BaseDir, "agent.log");
            Estado.TipografiaPath = Path.Combine(Estado.BaseDir, "tipografia.json");

            if (args.Length > 0 && string.Equals(args[0], "--sanar", StringComparison.OrdinalIgnoreCase))
            {
                return Sanador.EjecutarSanacion();
            }

            bool createdNew;
            using (var mutex = new Mutex(true, "AgentePOS", out createdNew))
            {
                if (!createdNew)
                {
                    Estado.Log("Ya hay una instancia del agente en ejecucion. Saliendo.");
                    return 0;
                }

                try
                {
                    Tipografia.CargarDesdeDisco();
                    Estado.CargarConfiguracion();

                    if (string.IsNullOrEmpty(Estado.Token))
                    {
                        Estado.Token = Estado.GenerarToken();
                        Estado.GuardarConfiguracion();
                    }

                    Estado.Log("Iniciando agente " + Estado.Version
                        + " en 127.0.0.1:" + Estado.Puerto.ToString(CultureInfo.InvariantCulture) + ".");

                    var hiloServidor = new Thread(ServidorHttp.Escuchar);
                    hiloServidor.IsBackground = true;
                    hiloServidor.Start();

                    if (Bandeja.Disponible())
                    {
                        Application.EnableVisualStyles();
                        Application.SetCompatibleTextRenderingDefault(false);
                        Application.Run(new Bandeja());
                    }
                    else
                    {
                        // Sin escritorio (sesion de servicio, server core, etc.):
                        // el servidor HTTP mantiene vivo el proceso.
                        Thread.Sleep(Timeout.Infinite);
                    }

                    return 0;
                }
                catch (Exception ex)
                {
                    Estado.Log("Error fatal: " + ex.ToString());
                    return 1;
                }
            }
        }
    }

    // Icono en bandeja: abre el panel, imprime prueba, sana y gestiona
    // el arranque automatico. No necesita consola ni ventanas.
    internal sealed class Bandeja : ApplicationContext
    {
        private const string ClaveRun = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string ValorRun = "AgentePOS";

        private readonly NotifyIcon _notificador;
        private readonly ToolStripMenuItem _itemInicio;

        public static bool Disponible()
        {
            try
            {
                return SystemInformation.UserInteractive;
            }
            catch
            {
                return false;
            }
        }

        public Bandeja()
        {
            var menu = new ContextMenuStrip();

            menu.Items.Add("Abrir panel", null, delegate { AbrirPanel(); });
            menu.Items.Add("Imprimir prueba", null, delegate { ImprimirPrueba(); });
            menu.Items.Add("Sanar impresora", null, delegate { Sanador.SolicitarSanacionConAviso(); });
            menu.Items.Add(new ToolStripSeparator());

            _itemInicio = new ToolStripMenuItem("Iniciar con Windows");
            _itemInicio.Checked = InicioAutomaticoActivado();
            _itemInicio.Click += delegate { AlternarInicioAutomatico(); };
            menu.Items.Add(_itemInicio);

            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir", null, delegate { Salir(); });

            _notificador = new NotifyIcon();
            _notificador.Icon = CrearIcono();
            _notificador.Text = Estado.TituloProducto + " v" + Estado.Version;
            _notificador.ContextMenuStrip = menu;
            _notificador.Visible = true;
            // Un clic simple izquierdo tambien abre el panel: es lo que todo
            // el mundo espera de un icono de bandeja.
            _notificador.MouseClick += delegate(object remitente, MouseEventArgs e)
            {
                if (e.Button == MouseButtons.Left)
                {
                    AbrirPanel();
                }
            };
            _notificador.DoubleClick += delegate { AbrirPanel(); };
        }

        // Abre el panel en el navegador predeterminado con dos intentos:
        // shell (asociacion http://) y, si no hay asociacion configurada,
        // explorer.exe que delega igual en el navegador.
        private void AbrirPanel()
        {
            var url = "http://127.0.0.1:" + Estado.Puerto.ToString(CultureInfo.InvariantCulture) + "/panel";

            Exception primero = null;
            try
            {
                Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
                return;
            }
            catch (Exception ex)
            {
                primero = ex;
            }

            try
            {
                Process.Start("explorer.exe", url);
                return;
            }
            catch
            {
            }

            Estado.Log("No se pudo abrir el panel: " + (primero != null ? primero.Message : "desconocido"));
            Aviso("No se pudo abrir el panel. Copia esta URL en tu navegador: " + url, ToolTipIcon.Error);
        }

        private void ImprimirPrueba()
        {
            string error;
            var resultado = ApiPos.ImprimirPrueba(out error);
            if (resultado)
            {
                Aviso("Prueba enviada a la impresora.", ToolTipIcon.Info);
            }
            else
            {
                Aviso("No se pudo imprimir la prueba: " + error, ToolTipIcon.Error);
            }
        }

        private void Aviso(string texto, ToolTipIcon tipo)
        {
            try
            {
                _notificador.ShowBalloonTip(4000, Estado.TituloProducto, texto, tipo);
            }
            catch
            {
                Estado.Log(texto);
            }
        }

        private static bool InicioAutomaticoActivado()
        {
            try
            {
                using (var clave = Registry.CurrentUser.OpenSubKey(ClaveRun, false))
                {
                    if (clave == null)
                    {
                        return false;
                    }
                    var valor = clave.GetValue(ValorRun) as string;
                    return !string.IsNullOrEmpty(valor);
                }
            }
            catch
            {
                return false;
            }
        }

        private void AlternarInicioAutomatico()
        {
            try
            {
                var activar = !InicioAutomaticoActivado();
                using (var clave = Registry.CurrentUser.CreateSubKey(ClaveRun))
                {
                    if (activar)
                    {
                        var exe = Process.GetCurrentProcess().MainModule.FileName;
                        clave.SetValue(ValorRun, "\"" + exe + "\"");
                    }
                    else
                    {
                        clave.DeleteValue(ValorRun, false);
                    }
                }

                _itemInicio.Checked = activar;
                Estado.Log("Inicio automatico con Windows: " + (activar ? "activado" : "desactivado") + ".");
            }
            catch (Exception ex)
            {
                Estado.Log("No se pudo cambiar el inicio automatico: " + ex.Message);
            }
        }

        private void Salir()
        {
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

            try
            {
                _notificador.Visible = false;
            }
            catch
            {
            }

            Estado.Log("Agente detenido desde la bandeja.");
            Application.Exit();
        }

        private static Icon CrearIcono()
        {
            try
            {
                using (var bmp = new Bitmap(64, 64))
                using (var g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    using (var brocha = new SolidBrush(Color.FromArgb(255, 255, 122, 26)))
                    {
                        g.FillEllipse(brocha, 2, 2, 60, 60);
                    }

                    using (var fuente = new Font("Segoe UI", 36f, FontStyle.Bold, GraphicsUnit.Pixel))
                    using (var brochaBlanca = new SolidBrush(Color.White))
                    {
                        var medida = g.MeasureString("P", fuente);
                        g.DrawString("P", fuente, brochaBlanca,
                            32f - medida.Width / 2f, 32f - medida.Height / 2f);
                    }

                    return Icon.FromHandle(bmp.GetHicon());
                }
            }
            catch
            {
                return SystemIcons.Application;
            }
        }
    }
}
