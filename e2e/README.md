# Testes E2E do GeoPop Mobile

Suite Maestro para Android com login e os fluxos funcionais exigidos no aplicativo.

## Cobertura

| Fluxo | Cobertura |
|---|---|
| `01_login.yaml` | Campos obrigatorios, credencial invalida, login valido e logout |
| `02_mapa.yaml` | Mapa, painel de veiculos, busca, filtros e sino de notificacoes |
| `03_veiculos.yaml` | Selecao no mapa e detalhe com velocidade, ignicao, bateria e localizacao |
| `04_relatorios_eventos.yaml` | Eventos, filtros e navegacao entre relatorios |
| `05_relatorios_percursos.yaml` | Veiculo, periodos de 24h/7/30 dias, mapa e estado vazio |
| `06_cercas_virtuais.yaml` | Criacao no mapa e exclusao da cerca criada pelo teste |
| `07_limite_velocidade.yaml` | Edicao e validacao sem alterar o limite persistido |
| `08_alertas.yaml` | Lista, leitura e marcacao de todas as notificacoes |
| `09_conta.yaml` | Dados da conta, cancelamento e confirmacao de logout |

Cada fluxo limpa o estado local e realiza um novo login. Eles podem ser executados isoladamente ou pela suite `all.yaml`.

## Pre-requisitos

- Java 17 ou superior.
- Android Studio com um emulador iniciado, ou aparelho visivel em `adb devices`.
- Maestro CLI instalado e disponivel no `PATH`.
- Development Build ou APK do GeoPop instalado com o pacote `br.com.codecrafters.geopop`.
- Tenant de teste com pelo menos um veiculo.
- API acessivel pelo dispositivo.

O Expo Go nao possui o `appId` do GeoPop e nao deve ser usado para estes testes.

## Configuracao

Crie `e2e/.env` a partir de `e2e/.env.example` e informe um `UsuarioApp` ativo:

```env
GEOPOP_EMAIL=usuario@teste.com
GEOPOP_SENHA=SenhaTeste123
GEOPOP_PLACA=ABC1D23
```

O tenant pertence a configuracao de build do aplicativo, não ao Maestro. Configure o `.env` do app antes de gerar o APK:

```env
EXPO_PUBLIC_API_URL=https://api.geopop.com.br/api/v1
EXPO_PUBLIC_DEFAULT_TENANT=tenant-teste
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=sua-chave
```

## Provisionar UsuarioApp por CPF/CNPJ

Uma placa existente não pode ser vinculada a um tenant novo sem mover ou duplicar o veículo. Para testar uma placa existente, crie o `UsuarioApp` no mesmo tenant e use o mesmo CPF/CNPJ do favorecido do veículo.

O script consulta a placa, obtém o CPF/CNPJ do favorecido, cria ou valida o usuário e gera `e2e/.env`:

```powershell
.\scripts\provision-e2e-user.ps1 `
  -Tenant "tenant-teste" `
  -Placa "ABC1D23" `
  -AdminEmail "admin@empresa.com" `
  -AdminPassword (Read-Host "Senha admin" -AsSecureString) `
  -UserEmail "e2e@empresa.com" `
  -UserPassword (Read-Host "Senha E2E" -AsSecureString)
```

As senhas não são incluídas no comando nem registradas no console. O arquivo `e2e/.env` permanece ignorado pelo Git.

## Windows

Instale Java 17+, baixe `maestro.zip` na pagina de releases, extraia e adicione a pasta `bin` ao `PATH`. Depois confirme:

```powershell
java -version
maestro --version
adb devices
```

## Execucao

```powershell
npm run e2e:validate
npm run e2e
```

Fluxos individuais:

```powershell
npm run e2e:login
npm run e2e:mapa
npm run e2e:veiculos
npm run e2e:relatorios
npm run e2e:configuracao
npm run e2e:alertas
npm run e2e:conta
```

Relatorio JUnit:

```powershell
maestro test e2e/all.yaml --env-file e2e/.env --format junit --output e2e/report.xml
```

## Validacao dos dados

- A suite cria uma cerca com nome unico e a remove ao final.
- O teste de velocidade usa um valor invalido e cancela o modal, sem alterar o cadastro.
- Notificacoes podem ser marcadas como lidas no tenant de teste.
- O relatorio de percurso aceita tanto historico existente quanto o estado vazio.
