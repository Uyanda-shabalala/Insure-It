# Employee API

Base path: `/api/employees`. Uses the application's existing security configuration.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/employees` | 200, employee response array |
| GET | `/api/employees/{id}` | 200, employee response |
| PUT | `/api/employees/{id}` | 200, replaced employee response |

PUT accepts this JSON body:

```json
{
  "employeeNumber": "EMP001",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "department": "IT"
}
```

Responses contain these fields plus the generated UUID `id`. Employee number
and full name are required and cannot be blank. Email and department are optional;
blank values become null. Text values are trimmed. PUT replaces all details,
so omitted optional fields are cleared. Missing employees return 404. Invalid
request bodies, missing required fields, and malformed UUID paths return 400.

The entity does not declare employee numbers or email addresses unique; this API
does not add uniqueness restrictions. Create/delete service methods are internal;
no POST or DELETE controller routes are exposed by the imported backend.
