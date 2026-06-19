App Name " WorkZen" 
Use Standerd Architecture, and file system
Create Claude.md
then Create Architecture.md, Add Nesscery Skills, agents, Plugins based on project, for testing and knowlage in erp solution skills 
UI/UX detailed need and attractive hovereffects, scrolling, pagnations, elegent

You are a Senior Enterprise Solution Architect, Product Manager, UI/UX Designer, Database Architect, DevOps Engineer, and Full Stack Developer.

Build a complete Enterprise-grade ERP system for a Manpower Supply Company that manages Government Tenders, Contract Labour, Payroll, Compliance, Billing, and Operations.

The solution must be production-ready, scalable, secure, multi-tenant, mobile-responsive, API-first, and suitable for handling thousands of employees and multiple government contracts.

====================================================
TECHNOLOGY STACK
====================================================

Frontend:
- Next.js 15+
- TypeScript
- Tailwind CSS
- Shadcn/UI
- TanStack Query
- Zustand
- React Hook Form
- Zod Validation
- ApexCharts
- PWA Support

Backend:
- Node.js
- NestJS Framework
- TypeScript
- REST API
- GraphQL Support
- JWT Authentication
- RBAC Authorization
- Swagger Documentation
- Redis Cache
- BullMQ Queue Processing

Database:
- PostgreSQL
- Prisma ORM
- Database Migrations
- Optimized Indexing
- Row Level Security

Mobile App:
- Flutter
- Riverpod
- Dio
- Go Router
- Offline Support
- Push Notifications

Storage:
- AWS S3 Compatible Storage

Notifications:
- Email
- SMS
- WhatsApp
- Push Notifications

Deployment:
- Docker
- Kubernetes
- Nginx
- CI/CD Pipeline
- GitHub Actions

====================================================
SYSTEM OVERVIEW
====================================================

Develop an ERP platform for manpower contractors that receive and execute government tenders.

The system must manage:

1. Tender Management
2. Client Management
3. Employee Management
4. Recruitment
5. Deployment
6. Attendance
7. Payroll
8. Compliance
9. Billing
10. Finance
11. Asset Management
12. Reports & Analytics
13. Mobile Workforce Management
14. Document Management
15. Approval Workflow

====================================================
MULTI TENANT ARCHITECTURE
====================================================

Implement:

- SaaS Architecture
- Organization Based Isolation
- Tenant Level Data Security
- Separate Company Settings
- Subscription Plans
- Usage Limits
- Audit Logs

Tables must contain:

tenant_id
created_by
updated_by
created_at
updated_at
deleted_at

====================================================
ROLE BASED ACCESS CONTROL
====================================================

Create roles:

Super Admin

Company Owner

HR Manager

Tender Manager

Operations Manager

Payroll Manager

Finance Manager

Compliance Officer

Recruiter

Site Supervisor

Field Officer

Client User

Employee

Permissions must be configurable.

====================================================
MODULE 1:
TENDER MANAGEMENT
====================================================

Features:

Tender Creation

Tender Tracking

Work Orders

Contract Documents

EMD Management

Security Deposit Tracking

Bid Submission Tracking

Contract Extensions

Renewal Alerts

Performance Reports

Fields:

Tender Number
Department
Tender Name
Tender Value
Bid Date
Award Date
Start Date
End Date
Work Locations
Required Employees
Contract Type
Tender Status

Dashboard:

Active Tenders
Expired Tenders
Upcoming Renewals
Tender Revenue
Tender Profitability

====================================================
MODULE 2:
CLIENT MANAGEMENT
====================================================

Government Departments

PSUs

Private Organizations

Store:

GST
PAN
Address
Contacts
Billing Terms
Contract Documents

Features:

Client Portal
Invoice Download
Attendance View
Reports View

====================================================
MODULE 3:
EMPLOYEE MANAGEMENT
====================================================

Employee Master

Employee Code Auto Generation

Personal Information

Aadhaar

PAN

ESI

PF

UAN

Bank Details

Emergency Contacts

Documents

Photo

Digital Signature

Employment History

Employee Lifecycle

====================================================
MODULE 4:
RECRUITMENT
====================================================

Job Requisition

Candidate Management

Resume Parsing

Interview Scheduling

Selection Tracking

Offer Letter Generation

Joining Workflow

Document Verification

Deployment Preparation

====================================================
MODULE 5:
DEPLOYMENT MANAGEMENT
====================================================

Deploy employees to:

Tender

Department

Location

Site

Shift

Track:

Available Manpower

Vacant Positions

Transfer Requests

Replacement Requests

Manpower Strength

====================================================
MODULE 6:
ATTENDANCE MANAGEMENT
====================================================

Attendance Methods:

GPS Attendance

Mobile Attendance

Biometric Integration

QR Attendance

Face Recognition Ready

Features:

Shift Management

Roster Planning

Overtime

Late Mark

Leave

Holiday Calendar

Geo-fencing

Attendance Approval Workflow

====================================================
MODULE 7:
PAYROLL MANAGEMENT
====================================================

Payroll Engine

Components:

Basic

DA

HRA

Special Allowance

Overtime

Incentives

Bonus

Deductions

PF

ESI

PT

TDS

Advance Recovery

Loan Recovery

Generate:

Payslips

Salary Registers

Bank Transfer Files

Compliance Reports

====================================================
MODULE 8:
COMPLIANCE MANAGEMENT
====================================================

Labour Compliance

PF

ESI

Professional Tax

TDS

Contract Labour License

Labour Welfare Fund

Generate:

Challans

Returns

Compliance Calendar

Expiry Alerts

Document Repository

====================================================
MODULE 9:
BILLING MANAGEMENT
====================================================

Attendance Based Billing

Contract Based Billing

Employee Based Billing

Generate:

Tax Invoices

Debit Notes

Credit Notes

Recurring Invoices

GST Reports

Track:

Payments

Outstanding

Aging Reports

====================================================
MODULE 10:
FINANCE MANAGEMENT
====================================================

Accounts Receivable

Accounts Payable

Expenses

Income

Bank Accounts

Cash Book

General Ledger

Profit & Loss

Balance Sheet

Cash Flow

Cost Center Accounting

Tender Wise Profitability

====================================================
MODULE 11:
ASSET MANAGEMENT
====================================================

Uniforms

Safety Equipment

ID Cards

Laptops

Mobiles

Issue & Return

Damage Tracking

Inventory Reports

====================================================
MODULE 12:
DOCUMENT MANAGEMENT
====================================================

Store:

Tender Documents

Employee Documents

Invoices

Contracts

Compliance Files

Features:

Versioning

Access Control

Document Expiry Alerts

OCR Search

====================================================
MODULE 13:
WORKFLOW ENGINE
====================================================

Create configurable approval workflows.

Examples:

Employee Joining Approval

Payroll Approval

Invoice Approval

Expense Approval

Tender Approval

Multi-Level Approval

====================================================
MODULE 14:
REPORTS & ANALYTICS
====================================================

Real-time dashboards.

Reports:

Employee Reports

Attendance Reports

Payroll Reports

Tender Reports

Revenue Reports

Profitability Reports

Compliance Reports

Billing Reports

Finance Reports

Export:

PDF

Excel

CSV

====================================================
MOBILE APPLICATION
====================================================

Flutter App

Roles:

Employee

Supervisor

Manager

Features:

Attendance

Leave Requests

Payslips

Notifications

Documents

Location Tracking

Task Assignment

Approvals

Offline Sync

====================================================
AI FEATURES
====================================================

AI Attendance Anomaly Detection

AI Payroll Validation

AI Invoice Verification

AI Tender Profitability Forecast

AI Workforce Demand Prediction

AI Compliance Alerts

AI Chat Assistant

====================================================
SECURITY
====================================================

JWT Authentication

Refresh Tokens

RBAC

Audit Logs

Data Encryption

API Rate Limiting

IP Restrictions

2FA

Session Management

GDPR Ready

====================================================
DATABASE DESIGN
====================================================

Generate:

Complete PostgreSQL Schema

ER Diagram

Prisma Models

Indexes

Constraints

Foreign Keys

Triggers

Stored Procedures

====================================================
API DEVELOPMENT
====================================================

Generate:

REST APIs

GraphQL APIs

Swagger Documentation

Request Validation

Response Standards

Error Handling

Pagination

Filtering

Search

Sorting

====================================================
UI/UX REQUIREMENTS
====================================================

Create:

Modern SaaS Dashboard

Enterprise Admin Panel

Responsive Layout

Dark Mode

Accessibility Standards

Professional Color Palette

Advanced Data Tables

Charts & Analytics

Notification Center

====================================================
DELIVERABLES
====================================================

Generate:

1. Complete System Architecture
2. Database Schema
3. Prisma Models
4. NestJS Backend Structure
5. Next.js Frontend Structure
6. Flutter Mobile Structure
7. API Documentation
8. RBAC Matrix
9. UI Wireframes
10. Module Wise Development Plan
11. Docker Configuration
12. Kubernetes Configuration
13. CI/CD Setup
14. Production Deployment Guide

Generate the project in enterprise-grade coding standards with clean architecture, SOLID principles, scalable folder structure, reusable components, testing strategy, and production-ready implementation.