import 'package:flutter_test/flutter_test.dart';
import 'package:chefsy_pagos_listener/main.dart';

void main() {
  testWidgets('Renderiza la pantalla principal del verificador de pagos', (WidgetTester tester) async {
    await tester.pumpWidget(const ChefsyPagosListenerApp());
    expect(find.text('Chefsy · Verificador de Pagos'), findsOneWidget);
  });
}
