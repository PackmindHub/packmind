# Packmind Commands Index

This file contains all available coding commands that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Commands

- [Create handoff](commands/create-handoff.md) : Generate a structured handoff Markdown document from the current conversation with key sections and saved under `./tmp/handoffs/` to enable fast, accurate agent context transfer when handing off ongoing work to another agent.
- [Creating End-User Documentation for Packmind](commands/creating-end-user-documentation-for-packmind.md) : Create user-focused Packmind documentation within `apps/doc/` that explains features in clear task-oriented language without technical implementation details to help end users accomplish specific goals effectively when adding or updating guides for new or existing functionality.
- [Resume handoff](commands/resume-handoff.md) : Resume work from a handoff document by parsing its scope, context, progress, and next steps so you can seamlessly continue execution with full situational awareness whenever you pick up a task started by someone else or from an earlier session.
- [Update Handoff](commands/update-handoff.md) : Update an existing handoff document with the current session's progress, preserving prior work history while refreshing status and next steps. Falls back to creating a new handoff if no source file is found.


---

*This file was automatically generated from deployed command versions.*