# Insure-It

Insure-It is an IT asset management and device verification system designed to help institutions register, track, assign, verify, and manage their IT equipment from one central system.

The project was developed as part of our BSc Information Technology final-year project.

Rather than acting as an insurance claims platform, Insure-It focuses on maintaining accurate records of institutional IT assets and providing information that can be used for internal asset management and insurance-related reporting.

## The Problem

Institutions may manage hundreds or thousands of IT devices such as laptops, desktops, monitors, tablets, networking equipment, and other electronic assets.

Keeping accurate records of these devices can become difficult when information is spread across spreadsheets, paperwork, departments, or separate systems.

This can create problems such as:

- Incorrect or outdated asset records
- Difficulty identifying devices
- Duplicate device registrations
- Unclear device ownership or assignment
- Difficulty determining where a device is located
- Poor records when equipment is lost, damaged, repaired, or retired
- Difficulty preparing accurate asset information for insurance purposes

Insure-It aims to provide a central system for managing this information.

---

# Core Features

## Device Registration

IT staff can register devices and store information such as:

- Device name
- Serial number
- Model
- Brand
- Device type
- Location
- Device status

New devices are initially registered with an `available` status.

Serial numbers are checked to prevent duplicate devices from being registered.

---

## OCR Serial Number Detection

Insure-It includes an OCR service that allows a user to upload or capture an image of a device label.

The OCR service analyses the image and attempts to identify the device's serial number automatically.

This reduces the need for IT staff to manually enter long serial numbers when registering equipment.

The backend currently exposes OCR functionality through:

`POST /api/ocr/serial-number`

A batch OCR endpoint is also available for processing multiple images:

`POST /api/ocr/serial-number/batch`

---

## Device Inventory

Registered devices can be retrieved from the system and displayed as part of the institution's asset inventory.

Device information includes the associated brand and device type rather than exposing unnecessary database information directly to the client.

Example:

```json
{
  "id": "device-uuid",
  "name": "Dell Latitude 5420",
  "serialNumber": "DL5420SN123",
  "brandName": "Dell",
  "deviceTypeName": "Laptop"
}
```

---

## Device Assignment

Insure-It is designed to track the assignment of institutional devices to users.

This allows the organisation to maintain a record of:

- Which device was assigned
- Who the device was assigned to
- When the assignment occurred
- Whether the device has been returned
- The current status of the device

This provides greater accountability for institutional equipment.

---

## Device Status Tracking

Devices can move through different states during their lifecycle.

Supported device states include:

- `available`
- `assigned`
- `repair`
- `lost`
- `retired`

This makes it possible to distinguish between equipment that is available for use and equipment that is currently assigned, unavailable, missing, or no longer active.

---

## Insurance and Reporting Support

Insure-It is not designed to process insurance claims directly.

Instead, the system maintains accurate device and asset information that can support an institution's insurance processes.

The stored information can be used to determine which devices exist within the organisation and generate insurer-ready asset information and reports.

---

# System Architecture

Insure-It is separated into several components.

```text
                   ┌─────────────────────┐
                   │      Frontend       │
                   │   React Interface   │
                   └──────────┬──────────┘
                              │
                         REST API
                              │
                   ┌──────────▼──────────┐
                   │    Spring Boot      │
                   │      Backend        │
                   │                     │
                   │ Controllers         │
                   │ Services            │
                   │ Repositories        │
                   │ DTOs / Entities     │
                   └──────┬────────┬─────┘
                          │        │
                 ┌────────▼───┐ ┌──▼────────────┐
                 │ PostgreSQL │ │  OCR Service  │
                 │  Supabase  │ │ Serial Number │
                 └────────────┘ │  Detection    │
                                └───────────────┘
```

The frontend communicates with the backend through REST API endpoints.

The Spring Boot backend contains the main business logic and communicates with the PostgreSQL database hosted through Supabase.

OCR functionality is exposed through the backend and is used during device registration and verification workflows.

---

# Technology Stack

### Backend

- Java
- Spring Boot
- Spring Web
- Spring Data JPA
- Hibernate
- Maven

### Database

- PostgreSQL
- Supabase

### Frontend

- React
- JavaScript
- REST API integration

### OCR

- Image-based serial number detection
- Groq-powered OCR integration
- Batch OCR processing

### Development Tools

- IntelliJ IDEA
- Visual Studio Code
- Git
- GitHub
- Postman

---

# Backend Structure

The backend follows a layered architecture.

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

### Controllers

Controllers expose REST API endpoints and handle incoming HTTP requests.

### Services

Services contain the main business logic of the application.

For example, device registration includes:

1. Receiving device information
2. Validating the supplied brand
3. Validating the supplied device type
4. Checking whether the serial number already exists
5. Setting the initial device status
6. Saving the device
7. Returning a DeviceResponse DTO

### Repositories

Repositories provide access to PostgreSQL through Spring Data JPA.

### DTOs

DTOs are used to control the information transferred between the API and the client.

This prevents the API from unnecessarily exposing complete database entities.

---

# Device Registration Flow

A typical device registration follows the following process:

```text
User captures/uploads device image
              ↓
        OCR processes image
              ↓
      Serial number detected
              ↓
 Registration form populated
              ↓
User enters/confirms device information
              ↓
      React frontend
              ↓
 POST /api/devices
              ↓
   Device Controller
              ↓
     Device Service
              ↓
Validate Brand + Device Type
              ↓
Check duplicate serial number
              ↓
      Device Repository
              ↓
     PostgreSQL Database
              ↓
 DeviceResponse returned
              ↓
     Frontend updated
```

This represents one of the main end-to-end workflows of Insure-It.

---

# API Overview

Some of the main API areas include:

```text
/api/devices
/api/brands
/api/device-types
/api/ocr
```

### Devices

Used to register, retrieve and manage institutional devices.

### Brands

Provides device brands used when registering equipment.

Examples include Dell, Lenovo, HP and other manufacturers.

### Device Types

Provides categories used to classify equipment.

Examples include:

- Laptop
- Desktop
- Monitor
- Tablet
- Networking Equipment

### OCR

Provides image-processing functionality for extracting serial numbers from device labels.

---

# Database

Insure-It uses PostgreSQL as its primary relational database.

The database stores information relating to areas such as:

- Devices
- Brands
- Device types
- Users
- Device assignments
- Insurance-related asset information

UUIDs are used for identifying major database records.

Foreign keys are used to maintain relationships between records such as devices, brands and device types.

---

# Current Project Status

Insure-It is currently an academic MVP.

The main system components have been developed, although some functionality is still being integrated or expanded.

### Implemented

- Device registration backend
- Device inventory retrieval
- Brand management API
- Device type integration
- PostgreSQL database
- Supabase database hosting
- Serial-number OCR
- Batch OCR backend
- Duplicate serial-number validation
- Device status tracking
- Frontend/backend API integration for core device workflows

### In Progress / Partial

- Complete device assignment workflow
- Batch OCR frontend integration
- Improved frontend/backend integration across all modules
- Reporting functionality
- Soft-delete and device restoration workflow

### Planned

- Role-based access control
- Authentication and authorization improvements
- Admin and IT staff permissions
- Expanded insurance reporting
- Improved audit history
- Mobile application

---

# Role-Based Access Control

Role-based access control is an important planned component of Insure-It.

Different users should not have the same permissions within an institutional asset-management system.

Future roles may include:

```text
ADMIN
IT_STAFF
VIEWER
```

For example, an administrator could manage users and system configuration, while IT staff could register and assign devices.

Read-only users could be restricted to viewing inventory and reports.

This functionality is currently considered part of the next stage of the system rather than a completed MVP feature.

---

# Mobile Application

Insure-It is intended to support a mobile-first workflow for operational tasks such as:

- Scanning device labels
- Capturing device images
- Detecting serial numbers
- Registering equipment
- Verifying devices
- Assigning and returning equipment

The web interface is better suited to management functions such as inventory administration, reporting and viewing institutional asset records.

A native/mobile client can therefore reuse the existing Spring Boot REST API without replacing the backend architecture.

---

# Running the Project

## Backend

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the backend directory and configure the required environment variables/database connection.

Run the Spring Boot application using Maven:

```bash
mvn spring-boot:run
```

The development backend runs on:

```text
http://localhost:3000
```

## Frontend

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend can then communicate with the Spring Boot REST API.

---

# Future Development

Future development of Insure-It will focus on turning the academic MVP into a more complete institutional asset-management platform.

Major areas include role-based access control, stronger authentication, mobile support, complete device assignment and return workflows, reporting, audit trails, improved OCR verification and expanded asset lifecycle management.

---

# Project Purpose

Insure-It demonstrates how technologies such as Java, Spring Boot, React, PostgreSQL and OCR can be combined to solve a practical IT asset-management problem.

The goal is not simply to maintain a list of devices.

The system is designed around the lifecycle of institutional IT equipment:

**Register → Identify → Assign → Track → Verify → Report**

This provides institutions with a clearer and more reliable view of the equipment they own and manage.
