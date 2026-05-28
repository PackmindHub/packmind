<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: Changelog

Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links. :
* Ensure all released versions have their corresponding comparison links defined at the bottom of the CHANGELOG.MD file in the format [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z
* Format all release dates using the ISO 8601 date format YYYY-MM-DD (e.g., 2025-11-21) to ensure consistent and internationally recognized date representation
* Maintain an [Unreleased] section at the top of the changelog with its corresponding link at the bottom pointing to HEAD to track ongoing changes between releases

Full standard is available here for further request: [Changelog](../../.packmind/standards/changelog.md)

# Standard: Compliance - Logging Personal Information

Enforce masking of personal information in TypeScript logs, using a standard first-6-characters-plus-* format for emails and similar patterns for other identifiers, to protect user privacy, comply with data protection regulations, and reduce security risks when handling user-related log entries. :
* Never log personal information in clear text across all log levels. Always mask sensitive data such as emails, phone numbers, IP addresses, and other personally identifiable information before logging.
* Use the standard masking format of first 6 characters followed by "*" for logging user emails. This ensures consistency across the codebase and makes it easier to audit logs for compliance.

Full standard is available here for further request: [Compliance - Logging Personal Information](../../.packmind/standards/compliance-logging-personal-information.md)

# Standard: Packmind Proprietary

Prohibit imports from '@packmind/editions' in proprietary codebases to prevent unintended use of open-source–only modules and ensure proper licensing boundaries. :
* Never import something from '@packmind/editions', this is for OSS only

Full standard is available here for further request: [Packmind Proprietary](../../.packmind/standards/packmind-proprietary.md)

# Standard: Typescript good practices

Enforce TypeScript error and DTO conventions by prohibiting Object.setPrototypeOf in custom errors and requiring intersection types (DomainType & { extraField: T }) for presentation DTO enrichment to improve reliability and catch domain-field drift at compile time. :
* Do not use `Object.setPrototypeOf` when defining errors.
* When defining a presentation DTO that enriches a domain type, use an intersection type (`DomainType & { extraField: T }`) instead of manually re-declaring the domain type's fields, so that structural drift is caught at compile time.

Full standard is available here for further request: [Typescript good practices](../../.packmind/standards/typescript-good-practices.md)
<!-- end: Packmind standards -->