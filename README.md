# Insure-It

A mobile-friendly device insurance tracker app. Users photograph serial numbers of computing devices, OCR extracts the data via the Claude API, and records are stored with insurance provider details.

## Tech Stack

| Layer | Technology |
|----|----|
| Web Frontend | React |
| Android App | Kotlin |
| Backend API | Spring Boot (Java) |
| OCR | Anthropic Claude API |
| Auth + Database | Supabase + PostgreSQL |

## Team

| Role | Members |
|----|----|
| Frontend | Kens, Mo |
| Backend | Uyanda, Malose, Akil, Keke|
| Machine Learning/Analytics | Thendo|

## Project Structure

```
insure-it/
ÃÄÄ frontend/        <-- React web app
ÃÄÄ backend/         <-- Spring Boot API
ÃÄÄ .gitignore
ÀÄÄ README.md
```

## Getting Started

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Meeting Schedule
