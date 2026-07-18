# Contratos de API pendentes — App GeoPop Mobile

Documento gerado a partir da análise do doc **"IDÉIAS de TELAS APP - GEOPOP"** e da
validação contra o Swagger real (`https://api.geopop.com.br/swagger/v1/swagger.json`)
em 16/07/2026.

Lista os endpoints que o app **precisa** e que **não existem** ou **não estão acessíveis**
como o app espera. Para cada um: rota sugerida, método, corpo de entrada e retorno esperado.

---

## 1. Auto-cadastro público ✅ RESOLVIDO (endpoint correto) — ⚠️ ambiente

**Tela:** `app/(auth)/cadastro.tsx` — "Crie sua conta GeoPop".

**Endpoint correto (fornecido pelo time em 16/07/2026):**
```
POST /api/v1/usuario-app/registrar
(público, sem Authorization; tenant via header X-Tenant-Subdomain)
```

**Body (entrada):**
```json
{
  "nomeCompleto": "Nome do Assinante",
  "cpfCnpj": "390.533.447-05",
  "email": "assinante@exemplo.com",
  "telefone": "(11) 90000-0000",
  "senhaTemporaria": "123456"
}
```

O app já foi ajustado para usar este endpoint/payload (antes chamava `POST /Usuario`, que
retornava **401** por exigir auth de admin).

### ⚠️ Pendência de ambiente (impede teste local)

O endpoint só existe/funciona no ambiente **`https://api-geopop.codecrafterscompany.com.br`
com tenant `portal`**. Esse host **não resolve em DNS público** (NXDOMAIN via 8.8.8.8), então
não é alcançável desta máquina nem pelo simulador iOS local.

O host que o app usa por padrão (`api.geopop.com.br`, tenant `default`) **não** tem o endpoint
`/usuario-app/registrar` (retorna 404 de rota — não está no Swagger desse host).

**Para rodar o fluxo cadastro→login localmente, é preciso UMA das opções:**
1. Expor `api-geopop.codecrafterscompany.com.br` em DNS público (ou VPN que esta máquina use);
   e apontar `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_DEFAULT_TENANT` para ele + `portal`.
2. Implantar o endpoint `/usuario-app/registrar` também em `api.geopop.com.br` e informar um
   tenant válido lá.

---

## 2. Preferências de notificação (tela Conta) 🟡

**Tela:** `app/(app)/configuracao/conta.tsx` — seção "Notificações" com toggles
(doc seção 8). Hoje a UI já existe, mas o estado é **apenas local** (não persiste), porque
não há endpoint.

Tipos pedidos no doc: Ignição Ligada, Ignição Desligada, Entrada de Cerca, Saída de Cerca,
Resultado de Comando, Troca de Condutor, Excesso de Velocidade, Alarme, Bateria desconectada.

### Contrato esperado

**Ler preferências:**
```
GET /api/v1/usuario-app/preferencias-notificacao?usuarioAppId={uuid}
```
Retorno (200):
```json
{
  "result": {
    "ignicaoLigada": true,
    "ignicaoDesligada": true,
    "entradaCerca": true,
    "saidaCerca": true,
    "resultadoComando": true,
    "trocaCondutor": true,
    "excessoVelocidade": true,
    "alarme": true,
    "bateriaDesconectada": true
  }
}
```

**Salvar preferências:**
```
PUT /api/v1/usuario-app/preferencias-notificacao
```
Body: `{ "usuarioAppId": "uuid", ...mesmos campos booleanos }`
Retorno: `{ "isValid": true, "errors": [] }`

---

## 3. Perfil: "Função" e "Último Login" (tela Conta) 🟡

**Tela:** `app/(app)/configuracao/conta.tsx` — "Informações do Perfil" (doc seção 8).

O doc mostra **Função** e **Último Login**. Hoje:
- **Função**: derivada localmente de `isAppUser` (Usuário/Administrador) — aproximação. O ideal
  é a API retornar o rótulo/nível já resolvido.
- **Último Login**: **não vem** em `POST /api/v1/Auth/login` nem em `usuario-app/by-id`.

### Contrato esperado

Incluir no retorno do login (`RealizarLoginCommandOutput`) e/ou em `GET /usuario-app/by-id`:
```json
{
  "funcao": "Usuário | Administrador | Operador",
  "ultimoLogin": "2026-07-16T10:14:16Z"
}
```

---

## 4. Endereço (local) nos eventos 🟡

**Tela:** `app/(app)/relatorios/eventos.tsx` — doc seção 6 pede "lista dos eventos com nome,
**local** e data". O `GET /api/v1/evento/paginado` retorna apenas `latitude`/`longitude`,
sem endereço resolvido.

**Paliativo atual no app:** exibe as coordenadas e abre o ponto no app de mapas ao tocar.

### Contrato esperado

Incluir no item do evento:
```json
{ "endereco": "Av. Paulista, 1000 - São Paulo/SP" }
```
(mesmo padrão do campo `endereco` já retornado em `/veiculo`).

---

## 5. Formato do campo `pontos` da cerca poligonal ⚠️ CONFIRMAR

**Tela:** `app/(app)/configuracao/cercas.tsx` — criação de cerca tipo Polígono (doc seção 5.1).

O Swagger define `CriarCercaVirtualInput.pontos` como `string` nullable, **sem documentar o
formato**. O app envia (e lê) **JSON**:
```json
"[{\"latitude\":-23.62,\"longitude\":-46.55},{\"latitude\":-23.63,\"longitude\":-46.56},...]"
```
Na leitura o app também tolera o formato `"lat,lng;lat,lng;..."`. **Confirmar com o backend
qual é o formato canônico** e ajustar `parsePontos`/`onSubmit` se necessário.

---

## 6. Cerca com múltiplos veículos 🟡

O app de referência do doc (seção 5.1) tem "Gerenciar Veículos" por cerca (N veículos por
cerca). O modelo atual da API é **1 cerca → 1 veículo** (`veiculoId` no
`CriarCercaVirtualInput`). Para paridade, a API precisaria de tabela de vínculo
cerca↔veículos e endpoints de associação. Sem isso, o app mantém a criação por veículo único.

---

## Endpoints que JÁ existem e são usados corretamente ✅

- **Alterar senha** — `PUT /api/v1/usuario-app/reset-senha` com `{ id, novaSenha }`.
  Usado em `src/hooks/useUsuarioApp.ts` (tela Conta → "Alterar Senha"). Funciona com o token
  do próprio usuário logado.
- **Login** — `POST /api/v1/Auth/login` `{ email, senha }`.
- **Veículos / Eventos / Percursos / Cercas / Notificações / Limite de velocidade** — todos
  presentes no Swagger e já integrados.
