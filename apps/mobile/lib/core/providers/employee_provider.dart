import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'auth_provider.dart';

class Employee {
  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String personalPhone;
  final String? photo;
  final String? designationId;
  final String? departmentId;
  final String? joiningDate;

  const Employee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    required this.personalPhone,
    this.photo,
    this.designationId,
    this.departmentId,
    this.joiningDate,
  });

  factory Employee.fromJson(Map<String, dynamic> j) => Employee(
        id: j['id'] as String,
        employeeCode: j['employeeCode'] as String,
        firstName: j['firstName'] as String,
        lastName: j['lastName'] as String,
        personalPhone: j['personalPhone'] as String? ?? '',
        photo: j['photo'] as String?,
        designationId: j['designationId'] as String?,
        departmentId: j['departmentId'] as String?,
        joiningDate: j['joiningDate'] as String?,
      );

  String get fullName => '$firstName $lastName';
}

final employeeProvider = FutureProvider.autoDispose<Employee?>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState.value == null) return null;
  try {
    final api = ref.read(apiClientProvider);
    final r = await api.get('/employees/me');
    final data = r.data['data'] ?? r.data;
    return Employee.fromJson(data as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
});
