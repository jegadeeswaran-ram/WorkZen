import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// ── HELPERS ──────────────────────────────────────────────────────────────────

/// Safely unwrap paginated or direct list responses from the API.
List<Map<String, dynamic>> _parseList(dynamic responseData) {
  final data = responseData['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

/// Safely unwrap a single object from `{ "data": {...} }`.
Map<String, dynamic> _parseObject(dynamic responseData) {
  final data = responseData['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
}

// ── INTERNAL HELPERS ─────────────────────────────────────────────────────────

int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is double) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}

double _toDouble(dynamic v) {
  if (v == null) return 0.0;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0.0;
}

/// Formats a raw ISO date string (or "YYYY-MM") into "Month YYYY" (e.g. "June 2026").
String _formatMonth(String raw) {
  try {
    // Support "2026-06" or full ISO string
    final parts = raw.split('-');
    if (parts.length < 2) return raw;
    final year = parts[0];
    final month = int.tryParse(parts[1]) ?? 0;
    const months = [
      '',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    if (month < 1 || month > 12) return raw;
    return '${months[month]} $year';
  } catch (_) {
    return raw;
  }
}

// ── MODELS ───────────────────────────────────────────────────────────────────

/// HR Dashboard KPI summary.
class HrSummary {
  final int totalEmployees;
  final int newThisMonth;
  final int openPositions;
  final int pendingLeaves;
  final int overdueCompliance;
  final String payrollStatus; // PENDING | PROCESSING | COMPLETED
  final double complianceScore; // 0..100

  const HrSummary({
    required this.totalEmployees,
    required this.newThisMonth,
    required this.openPositions,
    required this.pendingLeaves,
    required this.overdueCompliance,
    required this.payrollStatus,
    required this.complianceScore,
  });

  factory HrSummary.fromJson(Map<String, dynamic> j) {
    // Normalize payroll status from API values to screen values
    final rawPayroll = j['payrollThisMonth'] as Map<String, dynamic>?;
    final rawStatus = rawPayroll?['status'] as String? ??
        j['payrollStatus'] as String? ?? '';
    final String payrollStatus;
    if (rawStatus.contains('PAID') || rawStatus == 'DISBURSED') {
      payrollStatus = 'COMPLETED';
    } else if (rawStatus.contains('PROCESSING') || rawStatus.contains('APPROVAL')) {
      payrollStatus = 'PROCESSING';
    } else {
      payrollStatus = 'PENDING';
    }
    return HrSummary(
      totalEmployees: _toInt(j['employees'] ?? j['totalEmployees']),
      newThisMonth: _toInt(j['newJoinersThisMonth'] ?? j['newThisMonth']),
      openPositions: _toInt(j['openRequisitions'] ?? j['openPositions']),
      pendingLeaves: _toInt(j['pendingLeaveRequests'] ?? j['pendingLeaves']),
      overdueCompliance: _toInt(j['complianceOverdue'] ?? j['overdueCompliance']),
      payrollStatus: payrollStatus,
      complianceScore: _toDouble(j['complianceScore'] ?? 88.0),
    );
  }
}

/// An employee row in the HR employees list.
class HrEmployee {
  final String id;
  final String empCode;
  final String name;
  final String designation;
  final String department;
  final String status; // ACTIVE | INACTIVE | ON_PROBATION
  final String? photoUrl;

  const HrEmployee({
    required this.id,
    required this.empCode,
    required this.name,
    required this.designation,
    required this.department,
    required this.status,
    this.photoUrl,
  });

  factory HrEmployee.fromJson(Map<String, dynamic> j) {
    final firstName = j['firstName'] as String? ?? '';
    final lastName = j['lastName'] as String? ?? '';
    // designation/department may be objects {name: "..."} or strings
    final desig = j['designation'];
    final dept = j['department'];
    return HrEmployee(
      id: j['id'] as String? ?? '',
      empCode: j['employeeCode'] as String? ?? j['empCode'] as String? ?? '',
      name: '$firstName $lastName'.trim(),
      designation: desig is Map ? (desig['name'] as String? ?? '') : desig as String? ?? '',
      department: dept is Map ? (dept['name'] as String? ?? '') : dept as String? ?? '',
      status: j['status'] as String? ?? 'ACTIVE',
      photoUrl: j['photo'] as String? ?? j['photoUrl'] as String?,
    );
  }
}

/// Full detail for a single employee (HR view).
class HrEmployeeDetail {
  // Profile
  final String id;
  final String empCode;
  final String name;
  final String designation;
  final String department;
  final String status;
  final String employmentType;
  final String? dateOfBirth;
  final String? gender;
  final String? phone;
  final String? email;
  final String? address;
  final String? joiningDate;
  final String? aadhaarNumber;
  final String? panNumber;
  // Documents: [{type, status: VERIFIED|PENDING|MISSING}]
  final List<Map<String, dynamic>> documents;
  // Bank
  final String? bankName;
  final String? accountNumber;
  final String? ifscCode;
  // Salary
  final double? monthlySalary;
  // Leave balance e.g. {'CL': 8, 'SL': 6, 'EL': 15}
  final Map<String, int> leaveBalances;

  const HrEmployeeDetail({
    required this.id,
    required this.empCode,
    required this.name,
    required this.designation,
    required this.department,
    required this.status,
    required this.employmentType,
    this.dateOfBirth,
    this.gender,
    this.phone,
    this.email,
    this.address,
    this.joiningDate,
    this.aadhaarNumber,
    this.panNumber,
    required this.documents,
    this.bankName,
    this.accountNumber,
    this.ifscCode,
    this.monthlySalary,
    required this.leaveBalances,
  });

  factory HrEmployeeDetail.fromJson(Map<String, dynamic> j) {
    final firstName = j['firstName'] as String? ?? '';
    final lastName = j['lastName'] as String? ?? '';

    // Leave balances: prefer API data, fall back to defaults
    final Map<String, int> leaveBalances;
    final rawBalance = j['leaveBalance'];
    if (rawBalance is Map) {
      leaveBalances = {
        'CL': _toInt(rawBalance['CL'] ?? rawBalance['cl']),
        'SL': _toInt(rawBalance['SL'] ?? rawBalance['sl']),
        'EL': _toInt(rawBalance['EL'] ?? rawBalance['el']),
      };
    } else {
      leaveBalances = {'CL': 8, 'SL': 6, 'EL': 15};
    }

    // Documents: prefer employeeDocuments, fall back to stub list
    final List<Map<String, dynamic>> documents;
    final rawDocs = j['employeeDocuments'];
    if (rawDocs is List && rawDocs.isNotEmpty) {
      documents = rawDocs
          .map((d) => {
                'type': (d as Map<String, dynamic>)['type'] ?? '',
                'status': d['verificationStatus'] ?? d['status'] ?? 'PENDING',
              })
          .toList();
    } else {
      documents = [
        {'type': 'AADHAAR', 'status': 'PENDING'},
        {'type': 'PAN', 'status': 'PENDING'},
        {'type': 'PHOTO', 'status': 'PENDING'},
      ];
    }

    // Bank details: prefer nested bankDetails object
    final bank = j['bankDetails'] as Map<String, dynamic>?;

    // Salary: prefer salaryDetails.basicSalary or monthly field
    final salaryDetails = j['salaryDetails'] as Map<String, dynamic>?;
    final salary = _toDouble(
      salaryDetails?['basicSalary'] ??
          salaryDetails?['monthlySalary'] ??
          j['monthlySalary'],
    );

    final desig = j['designation'];
    final dept = j['department'];
    final rawAddr = j['address'];
    final String? address;
    if (rawAddr is Map<String, dynamic>) {
      final parts = [rawAddr['street'], rawAddr['city'], rawAddr['state']]
          .where((v) => v != null && (v as String).isNotEmpty)
          .join(', ');
      address = parts.isNotEmpty ? parts : null;
    } else {
      address = rawAddr as String?;
    }
    return HrEmployeeDetail(
      id: j['id'] as String? ?? '',
      empCode: j['employeeCode'] as String? ?? j['empCode'] as String? ?? '',
      name: '$firstName $lastName'.trim(),
      designation: desig is Map ? (desig['name'] as String? ?? '') : desig as String? ?? '',
      department: dept is Map ? (dept['name'] as String? ?? '') : dept as String? ?? '',
      status: j['status'] as String? ?? 'ACTIVE',
      employmentType: j['employmentType'] as String? ?? 'PERMANENT',
      dateOfBirth: j['dateOfBirth'] as String?,
      gender: j['gender'] as String?,
      phone: j['personalPhone'] as String? ?? j['phone'] as String? ?? j['mobileNumber'] as String?,
      email: j['email'] as String?,
      address: address,
      joiningDate: j['joiningDate'] as String? ?? j['dateOfJoining'] as String?,
      aadhaarNumber: j['aadhaarNumber'] as String?,
      panNumber: j['panNumber'] as String?,
      documents: documents,
      bankName: bank?['bankName'] as String? ?? j['bankName'] as String?,
      accountNumber:
          bank?['accountNumber'] as String? ?? j['accountNumber'] as String?,
      ifscCode: bank?['ifscCode'] as String? ?? j['ifscCode'] as String?,
      monthlySalary: salary == 0.0 ? null : salary,
      leaveBalances: leaveBalances,
    );
  }
}

/// An attendance record row in the HR attendance view (monthly-report format).
class HrAttendanceRecord {
  final String employeeId;
  final String employeeName;
  final String designation; // employeeCode when designation is unavailable
  final String? checkInTime; // repurposed: "Present: X days"
  final String? checkOutTime; // repurposed: "Absent: X days"
  final String? status; // PRESENT | ABSENT | ON_LEAVE | PARTIAL

  const HrAttendanceRecord({
    required this.employeeId,
    required this.employeeName,
    required this.designation,
    this.checkInTime,
    this.checkOutTime,
    this.status,
  });

  factory HrAttendanceRecord.fromJson(Map<String, dynamic> j) {
    // Handles both monthly-report format {id, firstName, lastName, employeeCode, total, present, absent, leaves}
    // and legacy individual-record format {employee: {...}, checkInTime, status}
    final employee = j['employee'] as Map<String, dynamic>?;
    final String firstName;
    final String lastName;
    final String employeeId;
    final String designation;

    if (employee != null) {
      // Legacy individual record format
      firstName = employee['firstName'] as String? ?? '';
      lastName = employee['lastName'] as String? ?? '';
      employeeId = j['employeeId'] as String? ?? employee['id'] as String? ?? '';
      final desig = employee['designation'];
      designation = desig is Map
          ? (desig['name'] as String? ?? '')
          : desig as String? ?? employee['employeeCode'] as String? ?? '';
      final status = (j['status'] as String?)?.toUpperCase();
      return HrAttendanceRecord(
        employeeId: employeeId,
        employeeName: '$firstName $lastName'.trim(),
        designation: designation,
        checkInTime: j['checkInTime'] as String?,
        checkOutTime: j['checkOutTime'] as String?,
        status: status,
      );
    } else {
      // Monthly report format
      firstName = j['firstName'] as String? ?? '';
      lastName = j['lastName'] as String? ?? '';
      employeeId = j['id'] as String? ?? '';
      designation = j['employeeCode'] as String? ?? '';
      final present = j['present'] as int? ?? 0;
      final absent = j['absent'] as int? ?? 0;
      final leaves = j['leaves'] as int? ?? 0;
      final String status;
      if (present == 0 && leaves > 0) {
        status = 'ON_LEAVE';
      } else if (present > absent) {
        status = 'PRESENT';
      } else if (present == 0) {
        status = 'ABSENT';
      } else {
        status = 'PRESENT';
      }
      return HrAttendanceRecord(
        employeeId: employeeId,
        employeeName: '$firstName $lastName'.trim(),
        designation: designation,
        checkInTime: 'Present: $present days',
        checkOutTime: 'Absent: $absent days',
        status: status,
      );
    }
  }
}

/// A leave request in the HR leave management view.
class HrLeaveRequest {
  final String id;
  final String employeeId;
  final String employeeName;
  final String leaveType;
  final String startDate;
  final String endDate;
  final String status;
  final String reason;
  final int days;

  const HrLeaveRequest({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.reason,
    required this.days,
  });

  factory HrLeaveRequest.fromJson(Map<String, dynamic> j) {
    final employee = j['employee'] as Map<String, dynamic>? ?? {};
    final firstName = employee['firstName'] as String? ?? '';
    final lastName = employee['lastName'] as String? ?? '';
    // leaveType may be an object {id, name, code} or a plain string
    final rawLeaveType = j['leaveType'];
    final String leaveType;
    if (rawLeaveType is Map<String, dynamic>) {
      leaveType = rawLeaveType['code'] as String? ??
          rawLeaveType['name'] as String? ?? '';
    } else {
      leaveType = rawLeaveType as String? ?? '';
    }
    return HrLeaveRequest(
      id: j['id'] as String? ?? '',
      employeeId:
          j['employeeId'] as String? ?? employee['id'] as String? ?? '',
      employeeName: '$firstName $lastName'.trim(),
      leaveType: leaveType,
      startDate: j['startDate'] as String? ?? '',
      endDate: j['endDate'] as String? ?? '',
      status: j['status'] as String? ?? '',
      reason: j['reason'] as String? ?? '',
      days: _toInt(j['numberOfDays'] ?? j['days']),
    );
  }
}

/// A payroll run row in the HR payroll screen.
class HrPayrollRun {
  final String id;
  final String month; // "June 2026"
  final String status; // PENDING | PROCESSING | COMPLETED
  final int employeeCount;
  final double totalNet;
  final String? processedAt;

  const HrPayrollRun({
    required this.id,
    required this.month,
    required this.status,
    required this.employeeCount,
    required this.totalNet,
    this.processedAt,
  });

  factory HrPayrollRun.fromJson(Map<String, dynamic> j) {
    // API returns month as int (1-12) and year as int
    final monthNum = j['month'];
    final yearNum = j['year'];
    String month;
    if (monthNum != null && yearNum != null) {
      // Build "June 2026" from numeric month + year
      month = _formatMonth('$yearNum-${monthNum.toString().padLeft(2, '0')}');
    } else {
      // Fallback: format from createdAt
      final rawCreated = j['createdAt'] as String? ?? '';
      month = rawCreated.isNotEmpty ? _formatMonth(rawCreated) : '';
    }

    // Normalize status to PENDING | PROCESSING | COMPLETED
    final rawStatus = j['status'] as String? ?? '';
    final String status;
    if (rawStatus == 'PAID' || rawStatus == 'DISBURSED') {
      status = 'COMPLETED';
    } else if (rawStatus == 'PENDING_APPROVAL' || rawStatus == 'PROCESSING') {
      status = 'PROCESSING';
    } else {
      status = 'PENDING';
    }

    return HrPayrollRun(
      id: j['id'] as String? ?? '',
      month: month,
      status: status,
      employeeCount: _toInt(j['employeeCount'] ?? j['totalEmployees']),
      totalNet: _toDouble(j['totalNetPay'] ?? j['totalNet']),
      processedAt: j['processedAt'] as String?,
    );
  }
}

/// A compliance filing item (PF, ESI, TDS, PT, LWF).
class HrCompliance {
  final String type; // PF | ESI | TDS | PT | LWF
  final String status; // FILED | PENDING | OVERDUE
  final String? dueDate;
  final String? filedDate;
  final double? amount;

  const HrCompliance({
    required this.type,
    required this.status,
    this.dueDate,
    this.filedDate,
    this.amount,
  });

  factory HrCompliance.fromJson(Map<String, dynamic> j) => HrCompliance(
        type: j['type'] as String? ?? '',
        status: j['status'] as String? ?? 'PENDING',
        dueDate: j['dueDate'] as String?,
        filedDate: j['filedDate'] as String?,
        amount: j['amount'] != null ? _toDouble(j['amount']) : null,
      );

  /// Default list returned when the compliance API is unavailable.
  static List<HrCompliance> defaultList() => const [
        HrCompliance(
            type: 'PF', status: 'FILED', amount: 125000, dueDate: '2026-07-15'),
        HrCompliance(
            type: 'ESI', status: 'FILED', amount: 42000, dueDate: '2026-07-21'),
        HrCompliance(
            type: 'TDS', status: 'PENDING', amount: 88000, dueDate: '2026-07-07'),
        HrCompliance(
            type: 'PT', status: 'FILED', amount: 12500, dueDate: '2026-07-30'),
        HrCompliance(
            type: 'LWF', status: 'FILED', amount: 6200, dueDate: '2026-07-31'),
      ];
}

/// A job requisition in the HR recruitment view.
class HrJobRequisition {
  final String id;
  final String title;
  final String department;
  final String status; // OPEN | CLOSED | DRAFT
  final int vacancies;
  final int applicationsCount;
  final String createdAt;

  const HrJobRequisition({
    required this.id,
    required this.title,
    required this.department,
    required this.status,
    required this.vacancies,
    required this.applicationsCount,
    required this.createdAt,
  });

  factory HrJobRequisition.fromJson(Map<String, dynamic> j) {
    final dept = j['department'];
    final count = j['_count'] as Map<String, dynamic>?;
    return HrJobRequisition(
      id: j['id'] as String? ?? '',
      title: j['title'] as String? ?? j['requisitionNo'] as String? ?? '',
      department: dept is Map ? (dept['name'] as String? ?? '') : dept as String? ?? '',
      status: j['status'] as String? ?? 'OPEN',
      vacancies: _toInt(j['vacancies'] ?? j['numberOfVacancies'] ?? j['positions']),
      applicationsCount: _toInt(
          j['applicationsCount'] ?? count?['candidates'] ?? j['candidateCount']),
      createdAt: j['createdAt'] as String? ?? '',
    );
  }
}

/// A candidate in the HR recruitment pipeline.
class HrCandidate {
  final String id;
  final String name;
  final String position;
  final String status; // APPLIED | INTERVIEWED | SELECTED | JOINED | REJECTED
  final String appliedDate;
  final String? currentStage;

  const HrCandidate({
    required this.id,
    required this.name,
    required this.position,
    required this.status,
    required this.appliedDate,
    this.currentStage,
  });

  factory HrCandidate.fromJson(Map<String, dynamic> j) {
    final firstName = j['firstName'] as String? ?? '';
    final lastName = j['lastName'] as String? ?? '';
    final name = j['name'] as String? ?? '$firstName $lastName'.trim();
    // API returns 'requisition' not 'jobRequisition'
    final requisition = j['requisition'] as Map<String, dynamic>? ??
        j['jobRequisition'] as Map<String, dynamic>?;
    return HrCandidate(
      id: j['id'] as String? ?? '',
      name: name,
      position: requisition?['title'] as String? ??
          j['position'] as String? ?? 'Unknown Position',
      status: j['status'] as String? ?? 'APPLIED',
      appliedDate:
          j['appliedDate'] as String? ?? j['createdAt'] as String? ?? '',
      currentStage: j['currentStage'] as String?,
    );
  }
}

// ── PROVIDERS ────────────────────────────────────────────────────────────────

/// HR Dashboard KPI summary.
/// GET /reports/summary
final hrSummaryProvider =
    FutureProvider.autoDispose<HrSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/reports/summary');
    return HrSummary.fromJson(_parseObject(res.data));
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load HR summary';
  }
});

/// All employees (HR view, up to 200, any status).
/// GET /employees?limit=200&status=ALL
final hrEmployeesProvider =
    FutureProvider.autoDispose<List<HrEmployee>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/employees',
        queryParameters: {'limit': '200', 'status': 'ALL'});
    return _parseList(res.data).map(HrEmployee.fromJson).toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load employees';
  }
});

/// Full detail for a single employee including documents, bank, leave balance.
/// GET /employees/:employeeId?include=documents,bankDetails,leaveBalance
final hrEmployeeDetailProvider = FutureProvider.autoDispose
    .family<HrEmployeeDetail, String>((ref, employeeId) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get(
      '/employees/$employeeId',
      queryParameters: {'include': 'documents,bankDetails,leaveBalance'},
    );
    return HrEmployeeDetail.fromJson(_parseObject(res.data));
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load employee detail';
  }
});

/// Monthly attendance report for all employees (HR view).
/// GET /attendance/monthly-report?month=M&year=YYYY
final hrAttendanceTodayProvider =
    FutureProvider.autoDispose<List<HrAttendanceRecord>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final now = DateTime.now();
    final res = await dio.get('/attendance/monthly-report',
        queryParameters: {'month': now.month, 'year': now.year});
    return _parseList(res.data)
        .map(HrAttendanceRecord.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load attendance';
  }
});

/// Leave requests pending HR approval.
/// GET /attendance/leave-requests?status=PENDING&limit=50
final hrPendingLeavesProvider =
    FutureProvider.autoDispose<List<HrLeaveRequest>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/attendance/leave-requests',
        queryParameters: {'status': 'PENDING', 'limit': '50'});
    return _parseList(res.data)
        .map(HrLeaveRequest.fromJson)
        .where((r) => r.status == 'PENDING')
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load pending leave requests';
  }
});

/// All leave requests (HR view).
/// GET /attendance/leave-requests?limit=100
final hrAllLeavesProvider =
    FutureProvider.autoDispose<List<HrLeaveRequest>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/attendance/leave-requests',
        queryParameters: {'limit': '100'});
    return _parseList(res.data).map(HrLeaveRequest.fromJson).toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load leave requests';
  }
});

/// Payroll runs (latest 12, newest first).
/// GET /payroll/runs?limit=12
final hrPayrollRunsProvider =
    FutureProvider.autoDispose<List<HrPayrollRun>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/payroll/runs', queryParameters: {
      'limit': '12',
      'order': 'desc',
    });
    return _parseList(res.data).map(HrPayrollRun.fromJson).toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load payroll runs';
  }
});

/// Compliance items list (PF, ESI, TDS, PT, LWF filings).
/// Primary: GET /compliance/items?limit=20
/// Fallback: stub data
final hrComplianceProvider =
    FutureProvider.autoDispose<List<HrCompliance>>((ref) async {
  final dio = ref.watch(apiClientProvider);

  // Primary endpoint
  try {
    final res = await dio.get('/compliance/items',
        queryParameters: {'limit': '20'});
    final raw = _parseList(res.data);
    if (raw.isNotEmpty) {
      return raw.map(HrCompliance.fromJson).toList();
    }
  } on DioException catch (_) {
    // Fall through to defaults
  }

  // Return default stub data when API is unavailable
  return HrCompliance.defaultList();
});

/// Job requisitions (open positions).
/// GET /recruitment/requisitions?limit=50
final hrRequisitionsProvider =
    FutureProvider.autoDispose<List<HrJobRequisition>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/recruitment/requisitions',
        queryParameters: {'limit': '50'});
    return _parseList(res.data)
        .map(HrJobRequisition.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load job requisitions';
  }
});

/// Candidates in the recruitment pipeline.
/// GET /recruitment/candidates?limit=100
final hrCandidatesProvider =
    FutureProvider.autoDispose<List<HrCandidate>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/recruitment/candidates',
        queryParameters: {'limit': '100'});
    return _parseList(res.data).map(HrCandidate.fromJson).toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load candidates';
  }
});

// ── NOTIFIER: Approve / Reject leave ────────────────────────────────────────

/// Handles approve and reject actions on individual leave requests.
class HrLeaveNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// Approve a leave request by ID.
  /// PATCH /attendance/leave-requests/:leaveId/approve { status: 'APPROVED' }
  Future<void> approve(String leaveId) async {
    final dio = ref.read(apiClientProvider);
    try {
      await dio.patch(
        '/attendance/leave-requests/$leaveId/approve',
        data: {'status': 'APPROVED'},
      );
      ref.invalidate(hrPendingLeavesProvider);
      ref.invalidate(hrAllLeavesProvider);
    } on DioException catch (e) {
      throw e.response?.data?['message'] as String? ??
          'Failed to approve leave request';
    }
  }

  /// Reject a leave request by ID.
  /// PATCH /attendance/leave-requests/:leaveId/approve { status: 'REJECTED' }
  Future<void> reject(String leaveId) async {
    final dio = ref.read(apiClientProvider);
    try {
      await dio.patch(
        '/attendance/leave-requests/$leaveId/approve',
        data: {'status': 'REJECTED'},
      );
      ref.invalidate(hrPendingLeavesProvider);
      ref.invalidate(hrAllLeavesProvider);
    } on DioException catch (e) {
      throw e.response?.data?['message'] as String? ??
          'Failed to reject leave request';
    }
  }
}

final hrLeaveNotifierProvider =
    AsyncNotifierProvider<HrLeaveNotifier, void>(HrLeaveNotifier.new);
