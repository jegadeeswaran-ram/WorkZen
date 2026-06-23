import 'package:flutter/material.dart';

class SaSiteDetailScreen extends StatelessWidget {
  final String siteId;
  const SaSiteDetailScreen({super.key, required this.siteId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('SA Site Detail: $siteId')),
    );
  }
}
