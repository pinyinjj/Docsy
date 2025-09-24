# Auto-commit (English message) and push to both remotes: origin and gitea
Param(
    [string]$Message
)

$ErrorActionPreference = "Stop"

function Get-CurrentBranch {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if (-not $branch) { throw "Failed to detect current git branch." }
    return $branch
}

function Get-AutoMessage([string]$branch) {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm"
    $changes = git status --porcelain
    $hasChanges = -not [string]::IsNullOrWhiteSpace($changes)

    if (-not $hasChanges) {
        return "chore: sync branch on $now ($branch)"
    }

    $files = @()
    foreach ($line in ($changes -split "`n")) {
        if ($line.Trim().Length -gt 0) {
            # Format: XY <space> path
            if ($line.Length -gt 3) {
                $files += $line.Substring(3).Trim()
            }
        }
    }
    $count = $files.Count
    $top = ($files | Select-Object -First 5) -join ", "
    return "chore: update site content on $now ($branch) +$count files: $top"
}

try {
    $branch = Get-CurrentBranch

    if (-not $Message -or $Message.Trim().Length -eq 0) {
        $Message = Get-AutoMessage -branch $branch
    }

    $changes = git status --porcelain
    $hasChanges = -not [string]::IsNullOrWhiteSpace($changes)

    if ($hasChanges) {
        git add -A
        git commit -m "$Message" | Out-Null
    } else {
        Write-Host "No changes to commit. Proceeding to push..."
    }

    Write-Host "Pushing to origin ($branch)..."
    git push origin $branch

    Write-Host "Pushing to gitea ($branch)..."
    git push gitea $branch

    Write-Host "Done."
    exit 0
} catch {
    Write-Error $_
    exit 1
}


