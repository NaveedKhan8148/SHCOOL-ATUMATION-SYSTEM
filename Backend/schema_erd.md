# Database Schema ERD

This Entity-Relationship Diagram defines the unified system schema for the School Management System, combining users, roles, academics, and operations into a complete relational design.

```mermaid
erDiagram
    Users {
        int id PK
        string role "ENUM: ADMIN, TEACHER, STUDENT, PARENT"
        string email UK
        string password
        string status "ACTIVE, INACTIVE"
        datetime created_at
    }

    Teacher {
        int id PK
        int user_id FK
        string name
        string cnic_number
        string contact_number
        string subject
        date date_of_joining
        string address
    }

    Student {
        int id PK
        int user_id FK
        string roll_no
        string student_name
        string address
        date date_of_joining
        int class_id FK
    }

    Parent {
        int id PK
        int user_id FK
        string name
        string cnic_no
        string contact_number
    }

    StudentParent {
        int id PK
        int student_id FK
        int parent_id FK
        string relationship "Father, Mother, Guardian"
    }

    Class {
        int id PK
        string name "e.g. CS-101"
        int class_teacher_id FK "Teacher ID"
    }

    Attendance {
        int id PK
        int student_id FK
        int class_id FK
        date date
        string status "ENUM: Present, Absent, Late"
    }

    Fees {
        int id PK
        int student_id FK
        string fee_type "Tuition, Lab, Library"
        decimal amount
        date due_date
        string status "ENUM: Paid, Pending, Overdue"
        date paid_date
    }

    Result {
        int id PK
        int student_id FK
        int class_id FK
        string subject
        int marks
        string grade
        string semester
    }

    Timetable {
        int id PK
        int class_id FK
        int teacher_id FK
        string day_of_week
        string time_slot
        string subject
        string room_location
    }

    AcademicWarning {
        int id PK
        int student_id FK
        string rule_violated
        string detail_description
        date warning_date
    }

    Users ||--o| Teacher : "1:1"
    Users ||--o| Student : "1:1"
    Users ||--o| Parent : "1:1"

    Class ||--o{ Student : "1:N"
    Teacher ||--o{ Class : "1:N (Class Teacher)"

    Student ||--o{ StudentParent : "1:N"
    Parent ||--o{ StudentParent : "1:N"

    Student ||--o{ Attendance : "1:N"
    Class ||--o{ Attendance : "1:N"

    Student ||--o{ Fees : "1:N"

    Student ||--o{ Result : "1:N"
    Class ||--o{ Result : "1:N"

    Class ||--o{ Timetable : "1:N"
    Teacher ||--o{ Timetable : "1:N"

    Student ||--o{ AcademicWarning : "1:N"
```
