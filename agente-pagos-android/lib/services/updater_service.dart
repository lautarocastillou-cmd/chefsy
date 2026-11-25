import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

class EstadoOta {
  final bool disponible;
  final int? parcheActual;
  final String mensaje;
  final bool listoParaReiniciar;

  const EstadoOta({
    required this.disponible,
    required this.parcheActual,
    required this.mensaje,
    required this.listoParaReiniciar,
  });
}

class UpdaterService {
  final ShorebirdUpdater _updater = ShorebirdUpdater();

  Future<int?> leerParcheActual() async {
    try {
      if (!_updater.isAvailable) return null;
      final patch = await _updater.readCurrentPatch();
      return patch?.number;
    } catch (_) {
      return null;
    }
  }

  Future<EstadoOta> verificarYDescargar({
    void Function(String mensaje)? onProgreso,
  }) async {
    try {
      if (!_updater.isAvailable) {
        return const EstadoOta(
          disponible: false,
          parcheActual: null,
          mensaje: 'OTA inactivo (compilado sin Shorebird release)',
          listoParaReiniciar: false,
        );
      }

      final patchActual = await _updater.readCurrentPatch();
      final status = await _updater.checkForUpdate();

      if (status == UpdateStatus.restartRequired) {
        return EstadoOta(
          disponible: true,
          parcheActual: patchActual?.number,
          mensaje: 'Actualización lista. Reiniciá la app para aplicarla.',
          listoParaReiniciar: true,
        );
      }

      if (status == UpdateStatus.outdated) {
        onProgreso?.call('Descargando parche OTA...');
        await _updater.update();
        return EstadoOta(
          disponible: true,
          parcheActual: patchActual?.number,
          mensaje: 'Parche descargado. Reiniciá la app para activarlo.',
          listoParaReiniciar: true,
        );
      }

      return EstadoOta(
        disponible: true,
        parcheActual: patchActual?.number,
        mensaje: patchActual != null
            ? 'Al día · Parche #${patchActual.number}'
            : 'Al día · Versión base',
        listoParaReiniciar: false,
      );
    } catch (e) {
      debugPrint('[Shorebird Pagos] Error OTA: $e');
      return const EstadoOta(
        disponible: false,
        parcheActual: null,
        mensaje: 'No se pudo consultar OTA (revisá tu conexión)',
        listoParaReiniciar: false,
      );
    }
  }
}
