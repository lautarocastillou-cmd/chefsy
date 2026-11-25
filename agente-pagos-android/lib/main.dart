import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/updater_service.dart';

void main() {
  runApp(const ChefsyPagosListenerApp());
}

class ChefsyPagosListenerApp extends StatelessWidget {
  const ChefsyPagosListenerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chefsy Pagos',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2A6348),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const PagosHomeScreen(),
    );
  }
}

class PagosHomeScreen extends StatefulWidget {
  const PagosHomeScreen({super.key});

  @override
  State<PagosHomeScreen> createState() => _PagosHomeScreenState();
}

class _PagosHomeScreenState extends State<PagosHomeScreen> with WidgetsBindingObserver {
  static const _channel = MethodChannel('chefsy.pagos/listener');
  final UpdaterService _updaterService = UpdaterService();

  bool _permisoActivo = false;
  bool _escuchaActiva = true;
  bool _enviandoPrueba = false;
  bool _buscandoOta = false;
  bool _otaListoReiniciar = false;
  String _otaMensaje = '';
  int? _parcheActual;
  String _endpoint = 'https://chefsy.xyz/api/notificaciones-pagos';
  String _token = 'chefsy_expo_secure_track_99XQ';
  List<Map<String, dynamic>> _logs = [];
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _cargarEstado();
    _verificarOta(silencioso: true);
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) => _cargarLogs());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _cargarEstado();
    }
  }

  Future<void> _cargarEstado() async {
    try {
      final permiso = await _channel.invokeMethod<bool>('estaPermisoActivo') ?? false;
      final cfg = await _channel.invokeMethod<Map<dynamic, dynamic>>('obtenerConfig');
      await _cargarLogs();
      if (!mounted) return;
      setState(() {
        _permisoActivo = permiso;
        if (cfg != null) {
          _escuchaActiva = cfg['activo'] == true;
          _endpoint = (cfg['endpoint'] ?? _endpoint).toString();
          _token = (cfg['token'] ?? _token).toString();
        }
      });
    } catch (_) {}
  }

  Future<void> _cargarLogs() async {
    try {
      final raw = await _channel.invokeMethod<String>('obtenerLogs') ?? '[]';
      final decoded = jsonDecode(raw);
      if (decoded is List && mounted) {
        setState(() {
          _logs = decoded
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _verificarOta({bool silencioso = false}) async {
    if (_buscandoOta) return;
    setState(() => _buscandoOta = true);
    try {
      final estado = await _updaterService.verificarYDescargar(
        onProgreso: (msg) {
          if (mounted) setState(() => _otaMensaje = msg);
        },
      );
      if (!mounted) return;
      setState(() {
        _parcheActual = estado.parcheActual;
        _otaListoReiniciar = estado.listoParaReiniciar;
        _otaMensaje = estado.mensaje;
      });
      if (!silencioso && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(estado.mensaje)),
        );
      }
    } finally {
      if (mounted) setState(() => _buscandoOta = false);
    }
  }

  Future<void> _reiniciarParaAplicarOta() async {
    await _channel.invokeMethod('reiniciarApp');
  }

  Future<void> _alternarEscucha(bool valor) async {
    setState(() => _escuchaActiva = valor);
    await _channel.invokeMethod('guardarConfig', {
      'activo': valor,
      'endpoint': _endpoint,
      'token': _token,
    });
  }

  Future<void> _abrirAjustesPermiso() async {
    await _channel.invokeMethod('abrirAjustesPermiso');
  }

  Future<void> _enviarPrueba() async {
    setState(() => _enviandoPrueba = true);
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('enviarPrueba', {
        'monto': '15.000',
        'remitente': 'Prueba Chefsy',
      });
      await _cargarLogs();
      if (!mounted) return;
      final ok = res?['ok'] == true;
      final msg = res?['mensaje']?.toString() ?? 'Listo';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: ok ? const Color(0xFF15803D) : Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) setState(() => _enviandoPrueba = false);
    }
  }

  Future<void> _limpiarLogs() async {
    await _channel.invokeMethod('limpiarLogs');
    await _cargarLogs();
  }

  @override
  Widget build(BuildContext context) {
    final listo = _permisoActivo && _escuchaActiva;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chefsy · Verificador de Pagos'),
        actions: [
          IconButton(
            tooltip: 'Buscar actualización OTA',
            onPressed: _buscandoOta ? null : () => _verificarOta(silencioso: false),
            icon: _buscandoOta
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.system_update_rounded),
          ),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _cargarEstado,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Banner OTA listo para reiniciar
          if (_otaListoReiniciar) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A5F),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF3B82F6)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.bolt_rounded, color: Color(0xFF60A5FA)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _otaMensaje,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _reiniciarParaAplicarOta,
                    child: const Text('Reiniciar'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Tarjeta de estado principal
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: listo ? const Color(0xFF163829) : const Color(0xFF3A2418),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: listo ? const Color(0xFF2A6348) : const Color(0xFFD97706),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      listo ? Icons.verified_user_rounded : Icons.warning_amber_rounded,
                      color: listo ? const Color(0xFF4ADE80) : const Color(0xFFFBBF24),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        listo
                            ? 'Escuchando transferencias en segundo plano'
                            : !_permisoActivo
                                ? 'Falta habilitar permiso de notificaciones'
                                : 'Escucha pausada manualmente',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Captura ingresos de Mercado Pago, Naranja X, Brubank, Ualá, MODO, Cuenta DNI, BNA+, Santander, Galicia, BBVA y Macro y los envía a Chefsy.',
                  style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.78)),
                ),
                if (!_permisoActivo) ...[
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _abrirAjustesPermiso,
                    icon: const Icon(Icons.settings_rounded, size: 18),
                    label: const Text('Habilitar acceso a notificaciones'),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Controles rápidos
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: SwitchListTile(
              title: const Text('Escucha activa'),
              subtitle: Text(
                _parcheActual != null
                    ? 'Shorebird OTA · Parche #$_parcheActual'
                    : (_otaMensaje.isNotEmpty
                        ? _otaMensaje
                        : 'Reenviar transferencias recibidas a chefsy.xyz'),
              ),
              value: _escuchaActiva,
              onChanged: _alternarEscucha,
            ),
          ),

          const SizedBox(height: 8),

          Row(
            children: [
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: _enviandoPrueba ? null : _enviarPrueba,
                  icon: _enviandoPrueba
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded, size: 18),
                  label: const Text('Probar envío (\$15.000)'),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _abrirAjustesPermiso,
                icon: const Icon(Icons.tune_rounded, size: 18),
                label: const Text('Permiso'),
              ),
            ],
          ),

          const SizedBox(height: 20),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Últimas notificaciones detectadas',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              if (_logs.isNotEmpty)
                TextButton(
                  onPressed: _limpiarLogs,
                  child: const Text('Limpiar'),
                ),
            ],
          ),

          const SizedBox(height: 6),

          if (_logs.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Todavía no se capturaron notificaciones. Apenas entre una transferencia (o toques "Probar envío"), va a aparecer acá.',
                style: TextStyle(fontSize: 12, color: Colors.white60),
                textAlign: TextAlign.center,
              ),
            )
          else
            ..._logs.map((item) {
              final estado = item['estado']?.toString() ?? '';
              final esOk = estado.startsWith('Enviada');
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  dense: true,
                  leading: Icon(
                    esOk ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                    color: esOk ? const Color(0xFF4ADE80) : Colors.amberAccent,
                  ),
                  title: Text(
                    item['resumen']?.toString() ?? '-',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    '${item['hora'] ?? ''} · $estado',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
