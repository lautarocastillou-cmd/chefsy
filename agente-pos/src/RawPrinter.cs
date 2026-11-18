using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

namespace AgentePOS
{
    // Acceso al spooler de Windows via winspool.drv. Sin dependencias.
    // Es la via que funciona con cualquier comandera cuyo driver permita
    // datatype RAW (POS-80, Xprinter, Epson, Unnion, Bematech, etc.).
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
        private static extern bool SetDefaultPrinter(string pPrinterName);

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool EnumPrinters(int Flags, string Name, int Level, IntPtr pPrinterEnum, int cbBuf, out int pcbNeeded, out int pcReturned);

        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool GetPrinter(IntPtr hPrinter, int Level, IntPtr pPrinter, int cbBuf, out int pcbNeeded);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr OpenSCManager(string lpMachineName, string lpDatabaseName, int dwDesiredAccess);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr OpenService(IntPtr hSCManager, string lpServiceName, int dwDesiredAccess);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool QueryServiceStatus(IntPtr hService, out SERVICE_STATUS lpServiceStatus);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool CloseServiceHandle(IntPtr hSCObject);

        [StructLayout(LayoutKind.Sequential)]
        private struct SERVICE_STATUS
        {
            public int dwServiceType;
            public int dwCurrentState;
            public int dwControlsAccepted;
            public int dwWin32ExitCode;
            public int dwServiceSpecificExitCode;
            public int dwCheckPoint;
            public int dwWaitHint;
        }

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

        // Estado del servicio "Spooler": 4 RUNNING, 1 STOPPED, -1 desconocido.
        public static int EstadoServicioSpooler()
        {
            // SC_MANAGER_CONNECT
            var scm = OpenSCManager(null, null, 0x0001);
            if (scm == IntPtr.Zero)
            {
                return -1;
            }

            try
            {
                // SERVICE_QUERY_STATUS
                var servicio = OpenService(scm, "Spooler", 0x0004);
                if (servicio == IntPtr.Zero)
                {
                    return -1;
                }

                try
                {
                    SERVICE_STATUS estado;
                    if (!QueryServiceStatus(servicio, out estado))
                    {
                        return -1;
                    }
                    return estado.dwCurrentState;
                }
                finally
                {
                    CloseServiceHandle(servicio);
                }
            }
            finally
            {
                CloseServiceHandle(scm);
            }
        }

        public static string DescribirServicioSpooler()
        {
            var codigo = EstadoServicioSpooler();
            switch (codigo)
            {
                case 4: return "Corriendo";
                case 1: return "Detenido";
                case 2: return "Iniciando";
                case 3: return "Deteniendose";
                case 5: case 6: case 7: return "Transicion";
                case -1: return "Desconocido";
                default: return "Estado " + codigo.ToString(CultureInfo.InvariantCulture);
            }
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
                    + MensajeWin32(Marshal.GetLastWin32Error());
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
                            + MensajeWin32(Marshal.GetLastWin32Error());
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
                error = MensajeWin32(Marshal.GetLastWin32Error());
                return null;
            }

            var buffer = Marshal.AllocHGlobal(necesarios);
            try
            {
                if (!EnumPrinters(flags, null, 4, buffer, necesarios, out necesarios, out devueltas))
                {
                    error = MensajeWin32(Marshal.GetLastWin32Error());
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

        public static bool DefinirPredeterminada(string nombre, out string error)
        {
            error = null;

            if (string.IsNullOrEmpty(nombre))
            {
                error = "Falta el nombre de la impresora.";
                return false;
            }

            if (!SetDefaultPrinter(nombre))
            {
                error = "No se pudo definir '" + nombre + "' como predeterminada. "
                    + MensajeWin32(Marshal.GetLastWin32Error());
                return false;
            }

            return true;
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

        public static bool Enviar(byte[] bytes, string impresora, out string error, out int codigoWin32)
        {
            error = null;
            codigoWin32 = 0;
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
                    codigoWin32 = Marshal.GetLastWin32Error();
                    error = "No se pudo abrir la impresora '" + impresora + "'. "
                        + MensajeWin32(codigoWin32);
                    return false;
                }

                var documento = new DOC_INFO_1();
                documento.pDocName = "Agente POS";
                documento.pOutputFile = null;
                documento.pDatatype = "RAW";

                var trabajo = StartDocPrinter(hPrinter, 1, ref documento);
                if (trabajo == 0)
                {
                    codigoWin32 = Marshal.GetLastWin32Error();
                    error = "Windows no pudo iniciar el trabajo de impresion. "
                        + MensajeWin32(codigoWin32);
                    return false;
                }
                documentoIniciado = true;

                if (!StartPagePrinter(hPrinter))
                {
                    codigoWin32 = Marshal.GetLastWin32Error();
                    error = "Windows no pudo iniciar la pagina de impresion. "
                        + MensajeWin32(codigoWin32);
                    return false;
                }
                paginaIniciada = true;

                int escritos;
                if (!WritePrinter(hPrinter, bytes, bytes.Length, out escritos))
                {
                    codigoWin32 = Marshal.GetLastWin32Error();
                    error = "Windows no pudo escribir en la impresora. "
                        + MensajeWin32(codigoWin32);
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

        public static string MensajeWin32(int codigo)
        {
            if (codigo == 1722)
            {
                return "El servidor RPC no esta disponible (el servicio Cola de impresion esta detenido).";
            }
            if (codigo == 1068)
            {
                return "Un servicio del que depende la Cola de impresion no esta corriendo.";
            }
            if (codigo == 1062)
            {
                return "El servicio Cola de impresion no ha sido iniciado.";
            }
            if (codigo == 1801)
            {
                return "El nombre de la impresora no es valido para Windows.";
            }
            if (codigo == 5)
            {
                return "Acceso denegado.";
            }

            return new Win32Exception(codigo).Message;
        }
    }
}
