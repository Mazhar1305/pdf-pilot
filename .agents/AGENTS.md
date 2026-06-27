# Project-Scoped Rules for pdf-pilot

## 📂 Feature Isolation Policy
- **Avoid Shared File Edits**: To prevent merge conflicts with other developers/interns, avoid modifying global or shared files repeatedly for individual tasks.
- **Isolate Code**: Create feature-specific files for each API feature:
  - Controllers: `controllers/<feature>Controller.js`
  - Models: `models/<Feature>Model.js`
  - Routes: `routes/<feature>Routes.js`
- **Documentation**: If any new files are introduced, clearly document them in the implementation report.
