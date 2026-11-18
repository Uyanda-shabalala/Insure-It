/**
 * JPA mappings for the existing public database tables.
 * Columns are required unless the supplied schema marks them nullable.
 * UUID foreign keys are mapped as unidirectional many-to-one relationships.
 * User IDs must be supplied from the authentication provider; other IDs use UUID generation.
 * Required timestamps must be supplied by the caller (no schema defaults were specified).
 *
 * PostgreSQL RLS policies are managed in the database, not by these mappings.
 * The JDBC connection must establish the appropriate authenticated role and auth.uid()
 * context for the supplied policies to apply; HTTP Basic authentication alone does not do so.
 */
package com.insureit.models;
