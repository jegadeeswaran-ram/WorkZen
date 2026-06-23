import 'package:flutter/material.dart';

class HrShell extends StatelessWidget {
  final Widget child;
  const HrShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: child);
  }
}
