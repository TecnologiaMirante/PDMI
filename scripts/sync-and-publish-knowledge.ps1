# sync-and-publish-knowledge.ps1
#
# Orquestra o pipeline de atualizacao do knowledge no Firestore:
#   1. Extrai knowledge dos arquivos .pbip (TMDL + pages.json)
#   2. Audita a extracao -- para se houver suspeitos
#   3. Publica no Firestore (dashboard_knowledge/{dashboardId})
#
# Uso (na raiz do projeto):
#   .\scripts\sync-and-publish-knowledge.ps1
#   .\scripts\sync-and-publish-knowledge.ps1 --dry-run
#   .\scripts\sync-and-publish-knowledge.ps1 --only <dashboardId>
#   .\scripts\sync-and-publish-knowledge.ps1 --dry-run --only <dashboardId>
#   .\scripts\sync-and-publish-knowledge.ps1 --yes          (pula confirmacao LIVE)
#
# Flags aceitas (todas as formas sao equivalentes):
#   -DryRun  | --dry-run  | /dry-run
#   -Only    | --only     | /only    (requer valor)
#   -Yes     | --yes      | /yes     (pula confirmacao em modo LIVE)

# ── Parse manual de argumentos (suporta --estilo e -Estilo) ──────────────────
$DryRun = $false
$Yes    = $false
$Only   = ""

$i = 0
while ($i -lt $args.Count) {
  $arg = $args[$i].ToString().ToLower()
  switch ($arg) {
    "-dryrun"   { $DryRun = $true }
    "--dry-run" { $DryRun = $true }
    "/dry-run"  { $DryRun = $true }
    "-yes"      { $Yes = $true }
    "--yes"     { $Yes = $true }
    "/yes"      { $Yes = $true }
    "-only" {
      $i++
      if ($i -ge $args.Count) {
        Write-Host "ERRO: --only requer um dashboardId como argumento." -ForegroundColor Red
        Write-Host "Uso: sync-and-publish-knowledge.ps1 --only <dashboardId>"
        exit 1
      }
      $Only = $args[$i].ToString()
    }
    "--only" {
      $i++
      if ($i -ge $args.Count) {
        Write-Host "ERRO: --only requer um dashboardId como argumento." -ForegroundColor Red
        Write-Host "Uso: sync-and-publish-knowledge.ps1 --only <dashboardId>"
        exit 1
      }
      $Only = $args[$i].ToString()
    }
    "/only" {
      $i++
      if ($i -ge $args.Count) {
        Write-Host "ERRO: --only requer um dashboardId como argumento." -ForegroundColor Red
        Write-Host "Uso: sync-and-publish-knowledge.ps1 --only <dashboardId>"
        exit 1
      }
      $Only = $args[$i].ToString()
    }
    default {
      Write-Host ""
      Write-Host "ERRO: parametro desconhecido: $($args[$i])" -ForegroundColor Red
      Write-Host ""
      Write-Host "Uso: sync-and-publish-knowledge.ps1 [opcoes]"
      Write-Host ""
      Write-Host "  --dry-run          Simula sem escrever no Firestore"
      Write-Host "  --only <id>        Processa apenas um dashboardId"
      Write-Host "  --yes              Pula confirmacao em modo LIVE"
      Write-Host ""
      Write-Host "Exemplos:"
      Write-Host "  scripts\sync-and-publish-knowledge.bat --dry-run"
      Write-Host "  scripts\sync-and-publish-knowledge.bat --only niq3HXyV3odhwCRxSHIg"
      Write-Host "  scripts\sync-and-publish-knowledge.bat --yes"
      Write-Host ""
      exit 1
    }
  }
  $i++
}

# ── Setup ─────────────────────────────────────────────────────────────────────
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$sep = "=" * 70

function Write-Step($n, $msg) {
  Write-Host ""
  Write-Host $sep
  Write-Host "  ETAPA $n - $msg"
  Write-Host $sep
}

function Fail($msg) {
  Write-Host ""
  Write-Host "ERRO: $msg" -ForegroundColor Red
  Write-Host ""
  exit 1
}

# ── Cabecalho ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host $sep
if ($DryRun) {
  Write-Host "  sync-and-publish-knowledge  [DRY-RUN]"
} else {
  Write-Host "  sync-and-publish-knowledge  [LIVE]"
}
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
if ($Only) { Write-Host "  Somente: $Only" }
Write-Host $sep

# ── Confirmacao LIVE ──────────────────────────────────────────────────────────
if (-not $DryRun) {
  Write-Host ""
  Write-Host "  MODO LIVE - PUBLICANDO NO FIRESTORE" -ForegroundColor Yellow
  Write-Host ""
  if (-not $Yes) {
    $confirm = Read-Host "  Digite SIM para continuar"
    if ($confirm -ne "SIM") {
      Write-Host ""
      Write-Host "  Operacao cancelada pelo usuario." -ForegroundColor Cyan
      Write-Host ""
      exit 0
    }
  } else {
    Write-Host "  Confirmacao automatica via --yes." -ForegroundColor Yellow
  }
  Write-Host ""
}

# ── Etapa 1: Extracao ─────────────────────────────────────────────────────────
Write-Step 1 "Extraindo knowledge dos arquivos .pbip"

$extractArgs = @("scripts/extract-portal-knowledge.js")
if ($Only) { $extractArgs += "--only"; $extractArgs += $Only }

node @extractArgs
if ($LASTEXITCODE -ne 0) { Fail "Extracao falhou (exit $LASTEXITCODE). Abortando." }

Write-Host ""
Write-Host "OK - Extracao concluida." -ForegroundColor Green

# ── Etapa 2: Auditoria ────────────────────────────────────────────────────────
Write-Step 2 "Auditando extracao"

$auditArgs = @("scripts/audit-pbip-extraction.js")
if ($Only) { $auditArgs += "--only"; $auditArgs += $Only }

node @auditArgs
if ($LASTEXITCODE -ne 0) {
  Fail "Auditoria encontrou suspeitos (exit $LASTEXITCODE). Corrija antes de publicar."
}

Write-Host ""
Write-Host "OK - Auditoria passou, nenhum suspeito encontrado." -ForegroundColor Green

# ── Etapa 3: Publicacao ───────────────────────────────────────────────────────
if ($DryRun) {
  Write-Step 3 "Publicando no Firestore [dry-run]"
} else {
  Write-Step 3 "PUBLICANDO NO FIRESTORE [LIVE]"
}

$publishArgs = @("scripts/publish-knowledge-firestore.js")
if ($DryRun) { $publishArgs += "--dry-run" }
if ($Only)   { $publishArgs += "--only"; $publishArgs += $Only }

node @publishArgs
if ($LASTEXITCODE -ne 0) { Fail "Publicacao falhou (exit $LASTEXITCODE)." }

# ── Resultado final ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host $sep
if ($DryRun) {
  Write-Host "  CONCLUIDO (dry-run) - nenhuma escrita realizada." -ForegroundColor Cyan
} else {
  Write-Host "  CONCLUIDO - pipeline executado com sucesso!" -ForegroundColor Green
}
Write-Host $sep
Write-Host ""
