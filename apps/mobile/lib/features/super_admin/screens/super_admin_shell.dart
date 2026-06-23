import 'package:flutter/material.dart';

class SuperAdminShell extends StatelessWidget {
  final Widget child;
  const SuperAdminShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: child);
  }
}
