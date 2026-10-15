# Groq serial-number REST API

Requires Java 17+ and Maven. From this directory, set environment variables and run:

```powershell
$env:GROQ_API_KEY = 'your-groq-key'
$env:SPRING_SECURITY_USER_NAME = 'insureit'
$env:SPRING_SECURITY_USER_PASSWORD = 'choose-a-password'
mvn spring-boot:run
```

`MY_SECRET_KEY` remains supported as a fallback for the Groq key. The default
`standalone` profile starts without a database. To use persistence later, activate
another profile and configure Spring datasource properties.

`POST http://localhost:8080/api/groq/serial-number` requires HTTP Basic authentication
and `Content-Type: application/json`. Use HTTPS when hosting outside localhost.

```json
{"base64Image":"data:image/jpeg;base64,<base64-encoded-image>"}
```

Accepts JPEG, PNG, and WebP data URLs, or raw base64 (assumed JPEG), up to
4,000,000 base64 characters. Example using an actual local image:

```powershell
$image = [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\images\device.jpg'))
$body = @{ base64Image = $image } | ConvertTo-Json
$credentials = "$($env:SPRING_SECURITY_USER_NAME):$($env:SPRING_SECURITY_USER_PASSWORD)"
$basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($credentials))
Invoke-RestMethod -Uri 'http://localhost:8080/api/groq/serial-number' `
  -Method Post -ContentType 'application/json' `
  -Headers @{ Authorization = "Basic $basic" } -Body $body
```

Successful responses are JSON objects:

```json
{"serialNumber":"ABC123","status":"FOUND"}
```

```json
{"serialNumber":null,"status":"NOT_FOUND"}
```

Errors: 400 for invalid input, 401 for missing/invalid authentication, 413 for
oversized image data, 429 for Groq rate limits, 502 for upstream rejection or invalid
output, and 503 for missing Groq configuration or connection failures/timeouts.

`GROQ_MODEL` overrides the default `qwen/qwen3.8-27b`, documented in
[Groq's vision guide](https://console.groq.com/docs/vision). `GROQ_API_URL` overrides
the chat completions URL. Connection/read timeouts are configurable with
`groq.connect-timeout` and `groq.read-timeout` (defaults: 10s/60s).

Run `mvn test` for integration tests against a local mock Groq server. These tests
do not need a real API key or make billable Groq requests.
