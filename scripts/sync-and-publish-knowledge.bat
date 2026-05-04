@echo off
:: sync-and-publish-knowledge.bat
:: Lanca o pipeline de sync e publicacao do knowledge no Firestore.
::
:: Uso:
::   sync-and-publish-knowledge.bat
::   sync-and-publish-knowledge.bat --dry-run
::   sync-and-publish-knowledge.bat --only <dashboardId>
::   sync-and-publish-knowledge.bat --dry-run --only <dashboardId>
::   sync-and-publish-knowledge.bat --yes            (pula confirmacao LIVE)
::
:: Flags aceitas: --dry-run/-DryRun  --only/-Only  --yes/-Yes

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-and-publish-knowledge.ps1" %*
