# Storage Strategy

## Buckets
- `request-attachments`: supporting documents from requesters
- `fuel-receipts`: fuel receipts linked to `fuel_logs`
- `incident-files`: incident photos and supporting media
- `vehicle-documents`: OR/CR, registration scans, and internal vehicle files
- `insurance-policies`: policy attachments and renewals
- `driver-licenses`: license scans and renewals

## Path Convention
```text
{branch_code}/{record_type}/{record_id}/{timestamp}-{original_filename}
```

## Access Rules
- Keep buckets private by default.
- Use signed URLs for viewing and short-lived download access.
- Restrict uploads to authenticated users.
- Enforce branch scoping in storage object policies where possible.

## Validation
- Images and PDFs only for regulated documents.
- Max size per file: 10 MB for images, 20 MB for PDF bundles.
- Sanitize filenames and preserve metadata in Postgres, not in the object name.
