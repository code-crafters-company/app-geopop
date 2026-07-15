param(
    [Parameter(Mandatory = $true)] [string] $Tenant,
    [Parameter(Mandatory = $true)] [string] $Placa,
    [Parameter(Mandatory = $true)] [string] $AdminEmail,
    [Parameter(Mandatory = $true)] [SecureString] $AdminPassword,
    [Parameter(Mandatory = $true)] [string] $UserEmail,
    [Parameter(Mandatory = $true)] [SecureString] $UserPassword,
    [string] $ApiUrl = "https://api.geopop.com.br/api/v1"
)

$ErrorActionPreference = "Stop"

function Get-PlainText([SecureString] $Value) {
    return [System.Net.NetworkCredential]::new("", $Value).Password
}

function Normalize-Document([string] $Value) {
    return $Value -replace "\D", ""
}

function Normalize-Plate([string] $Value) {
    return ($Value -replace "[-\s]", "").ToUpperInvariant()
}

$baseUrl = $ApiUrl.TrimEnd("/")
$tenantHeaders = @{ "X-Tenant-Subdomain" = $Tenant }
$adminPasswordText = Get-PlainText $AdminPassword
$userPasswordText = Get-PlainText $UserPassword
$targetPlate = Normalize-Plate $Placa

$adminLogin = Invoke-RestMethod -Method Post -Uri "$baseUrl/Auth/login" -Headers $tenantHeaders -ContentType "application/json" -Body (@{
    email = $AdminEmail
    senha = $adminPasswordText
} | ConvertTo-Json)

if (-not $adminLogin.accessToken) { throw "Login administrativo não retornou token." }
$headers = @{
    "X-Tenant-Subdomain" = $Tenant
    Authorization = "Bearer $($adminLogin.accessToken)"
}

$vehicles = Invoke-RestMethod -Method Get -Uri "$baseUrl/Veiculo/paginado?PageNumber=0&PageSize=100&Placa=$([uri]::EscapeDataString($targetPlate))" -Headers $headers
$vehicle = @($vehicles.result) | Where-Object { (Normalize-Plate $_.placa) -eq $targetPlate } | Select-Object -First 1
if (-not $vehicle) { throw "Placa '$targetPlate' não encontrada no tenant '$Tenant'." }

$cpfCnpj = Normalize-Document $vehicle.favorecidoCpfCnpj
if (-not $cpfCnpj) { throw "O favorecido da placa '$targetPlate' não possui CPF/CNPJ." }

$users = Invoke-RestMethod -Method Get -Uri "$baseUrl/usuario-app/paginado?PageNumber=0&PageSize=20&Email=$([uri]::EscapeDataString($UserEmail))" -Headers $headers
$user = @($users.result) | Where-Object { $_.email -eq $UserEmail } | Select-Object -First 1

if ($user) {
    if ((Normalize-Document $user.cpfCnpj) -ne $cpfCnpj) {
        throw "O usuário '$UserEmail' já existe com CPF/CNPJ diferente do favorecido da placa."
    }
    if (-not $user.ativado -or $user.status -ne 0) {
        throw "O usuário '$UserEmail' existe, mas não está ativo. Ative-o no portal antes do teste."
    }
    Invoke-RestMethod -Method Put -Uri "$baseUrl/usuario-app/reset-senha" -Headers $headers -ContentType "application/json" -Body (@{
        id = $user.id
        novaSenha = $userPasswordText
    } | ConvertTo-Json) | Out-Null
}
else {
    $created = Invoke-RestMethod -Method Post -Uri "$baseUrl/usuario-app" -Headers $headers -ContentType "application/json" -Body (@{
        nomeCompleto = "Usuário E2E $targetPlate"
        cpfCnpj = $cpfCnpj
        email = $UserEmail
        senhaTemporaria = $userPasswordText
    } | ConvertTo-Json)
    if (-not $created.isValid) { throw "Não foi possível criar o UsuarioApp E2E." }
}

$appLogin = Invoke-RestMethod -Method Post -Uri "$baseUrl/Auth/login" -Headers $tenantHeaders -ContentType "application/json" -Body (@{
    email = $UserEmail
    senha = $userPasswordText
} | ConvertTo-Json)
if (-not $appLogin.accessToken -or -not $appLogin.isAppUser) { throw "Login do UsuarioApp E2E falhou." }

$appHeaders = @{
    "X-Tenant-Subdomain" = $Tenant
    Authorization = "Bearer $($appLogin.accessToken)"
}
$visibleVehicles = Invoke-RestMethod -Method Get -Uri "$baseUrl/Veiculo/paginado?PageNumber=0&PageSize=100" -Headers $appHeaders
$visiblePlates = @($visibleVehicles.result) | ForEach-Object { Normalize-Plate $_.placa }
if ($targetPlate -notin $visiblePlates) { throw "O usuário foi criado, mas a placa vinculada por CPF não foi retornada pela API." }

$envPath = Join-Path $PSScriptRoot "..\e2e\.env"
[System.IO.File]::WriteAllLines($envPath, @(
    "GEOPOP_EMAIL=$UserEmail",
    "GEOPOP_SENHA=$userPasswordText",
    "GEOPOP_PLACA=$targetPlate"
))

"UsuarioApp E2E validado para o tenant '$Tenant' e placa '$targetPlate'."
"Arquivo de ambiente criado em e2e/.env. Configure EXPO_PUBLIC_DEFAULT_TENANT=$Tenant no build do aplicativo."
