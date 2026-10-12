# Implementation Plan: Adding 'Concerned Party' Field

## Objective
Add a structured 'Concerned Party' (الطرف المعني) field to transaction records to replace the unstructured information currently embedded in descriptions.

## Proposed Changes

1.  **Data Structure (`src/types.ts`)**:
    - Update the `Transaction` interface to include a `concernedParty` field.
    - `concernedParty` will be an object: `{ name: string; type: 'client' | 'employee' | 'other' }`.

2.  **UI Updates**:
    - Update transaction creation forms (Receipts, Payments, etc.) to include a new input field for 'Concerned Party'.
    - This will be a searchable input/dropdown to select existing clients or employees, or enter a new party name.

3.  **Database Logic (`src/lib/dbService.ts`)**:
    - Update transaction saving functions to handle and store the new `concernedParty` field.

4.  **Migration (Optional)**:
    - Explore parsing existing descriptions to populate the `concernedParty` field for past transactions if patterns are consistent.

## Approval Requested
Please review this plan. Once approved, I will proceed with implementation.
