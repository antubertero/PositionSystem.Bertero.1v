import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  await dotenv.load(fileName: '.env');
  runApp(const ControlPersonalApp());
}

class ControlPersonalApp extends StatelessWidget {
  const ControlPersonalApp({super.key});

  @override
  Widget build(BuildContext context) {
    final apiBase = dotenv.env['API_BASE_URL'] ?? 'https://example.com';
    return MaterialApp(
      title: 'Control Personal',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: Scaffold(
        appBar: AppBar(title: const Text('Control Personal')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.people, size: 64),
              const SizedBox(height: 16),
              const Text('Esqueleto móvil listo para integrar'),
              const SizedBox(height: 8),
              Text('API Base: $apiBase'),
            ],
          ),
        ),
      ),
    );
  }
}
