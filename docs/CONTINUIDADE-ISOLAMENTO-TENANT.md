# Continuidade — isolamento por tenant (GeoPop app)

Arquivo de estado do agente noturno. **Este é o único ponto de retomada:** quem entra
sem contexto lê este arquivo, executa o próximo item pendente e atualiza esta página no
mesmo commit. Não confie em memória de sessão anterior — ela não existe.

## Requisito de produto (inegociável)

Isolamento por tenant é **absoluto**: um usuário só autentica e só lê dados do tenant ao
qual está vinculado. Vale para **qualquer** nível de acesso, inclusive administrador —
admin do tenant A não entra no app do tenant B nem lê um registro de lá. Não existe
usuário global nem "modo suporte". Qualquer resposta 200 com dado de outro tenant é
incidente de segurança, não bug comum.

Cenários de aceite (do plano de cobertura E2E, §5.11):

| ID | Cenário | Onde se prova |
|---|---|---|
| TENA-01 | Login cross-tenant recusado: build do tenant A + credencial **correta** de usuário do tenant B → autenticação falha, permanece no login, nenhum token gravado | app + API |
| TENA-02 | Idem com credencial de **administrador** do tenant B (e admin do portal): não entra | app + API |
| TENA-03 | Usuário do tenant A sem favorecido vinculado entra e vê **frota vazia** — nunca veículo de outro assinante | app |
| TENA-04 | Com sessão do tenant B, buscar placa do tenant A → "Nenhum veículo encontrado"; cercas, eventos, percursos e alertas só do próprio tenant | app |
| TENA-05 | Acesso por ID direto (`geopop://veiculos/{id do tenant A}` com sessão B) → "Veículo não encontrado." | app + API |
| TENA-06 | Logout do A → login do B: listas só com dado de B, sem resquício no cache do React Query | app |
| TENA-07 | Logout limpa `TOKEN_KEY`, `USER_KEY` e `TENANT_KEY`; o próximo login não herda o subdomínio anterior | app |
| TENA-08 | Token do tenant A + header `X-Tenant-Subdomain: B` → 401/403, nunca 200 com dado de B | **API (curl)** |
| TENA-09 | Build do tenant B instalado sobre sessão do tenant A não reaproveita a sessão antiga | app |

## Já feito (06/08/2026) — não refazer

Fechado o vazamento no cliente: o app **não usa mais o tenant do build** depois de
autenticado (antes, `X-Tenant-Subdomain = TENANT_KEY ?? EXPO_PUBLIC_DEFAULT_TENANT`
fazia um usuário logado sem `TENANT_KEY` consultar dados sob o subdomínio do build).

- [`src/services/api.ts`](../src/services/api.ts) — duas instâncias axios:
  - `publicApi`: só login, cadastro e `/tenant/by-subdomain`. Usa `BUILD_TENANT`
    (`EXPO_PUBLIC_DEFAULT_TENANT`) e remove `Authorization` via
    `config.headers.delete('Authorization')` — em `AxiosHeaders`, `delete obj.Authorization`
    é no-op silencioso.
  - `api` (autenticada): exige `TOKEN_KEY` **e** `TENANT_KEY`; faltando qualquer um,
    **aborta** a requisição com `MissingTenantError`, chama `clearSession()` e dispara o
    `unauthorizedHandler`. Sem fallback de build. Helpers exportados: `clearSession()` e
    `getSessionTenant()` (devolve `null`, nunca o tenant do build).
- [`src/stores/auth.ts`](../src/stores/auth.ts) — `signIn` sem `subdominio` lança
  `TENANT_AUSENTE_MSG` e não grava nada; `hydrate` descarta sessão sem tenant ou com
  `subdominio` divergente do `TENANT_KEY`.
- [`app/(auth)/login.tsx`](../app/(auth)/login.tsx) — `signIn` dentro do `mutationFn`:
  falha de tenant cai no `onError`, mostra `Alert` e o usuário **permanece no login**.
- [`app/(auth)/cadastro.tsx`](../app/(auth)/cadastro.tsx) — migrado para `publicApi`.
- [`app/(app)/index.tsx`](../app/(app)/index.tsx) — SignalR usa `getSessionTenant()`; sem
  tenant não conecta (`setConnected(false)`), em vez do antigo
  `?? process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default'`.

Verificado com `npx tsc --noEmit` limpo e com um script que replica os interceptors
contra um servidor HTTP local: público manda tenant do build e nenhum `Authorization`;
autenticado sem `TENANT_KEY` aborta e limpa a sessão; autenticado completo manda o
tenant da sessão.

## Backlog — executar **um item por rodada**, de cima para baixo

- [ ] **1. TENA-09 — sessão não sobrevive a troca de build.**
      Em `hydrate` (`src/stores/auth.ts`), descartar a sessão quando o `TENANT_KEY`
      gravado diferir do tenant do build. Condicionar a `EXPO_PUBLIC_DEFAULT_TENANT`
      estar **explicitamente definido**: com o fallback `'default'` de build de dev, a
      checagem derrubaria toda sessão a cada abertura. Exportar o tenant do build de
      `src/services/api.ts` em vez de reler `process.env` no store.
- [ ] **2. Teste automatizado dos interceptors.**
      O projeto ainda não tem runner de teste (`package.json` sem script `test`). Avaliar
      jest + `jest-expo` com mock de `expo-secure-store`, cobrindo: público usa tenant do
      build; autenticado sem `TENANT_KEY` aborta e limpa sessão; autenticado usa o tenant
      da sessão; `signIn` sem `subdominio` não grava nada; `hydrate` descarta sessão
      divergente. Se introduzir o runner for grande demais para uma rodada, faça só o
      setup nesta e os casos na seguinte, registrando aqui onde parou.
- [ ] **3. Fluxo E2E `e2e/flows/28_isolamento_tenant.yaml` (TENA-01..07).**
      Seguir o padrão dos fluxos existentes em `e2e/`: cabeçalho com "O QUE ESTE FLUXO
      PROVA / REPROVA SE / PERFIL / DADO NECESSÁRIO", `clearKeychain` +
      `launchApp: clearState: true` no início. TENA-01/02 usam credencial de **outro**
      tenant e provam que **não** entra (asserir a mensagem de erro + `login-button`
      ainda visível). Credenciais vêm de variáveis do `e2e/.env` — **nunca** hardcode.
- [ ] **4. Consistência da mensagem de erro do login.**
      A auditoria da suíte aponta que `e2e/flows/01_login.yaml` espera o texto "Erro",
      enquanto a tela redesenhada deveria dizer "Não foi possível entrar" + "E-mail ou
      senha incorretos. Verifique os dados e tente novamente.". Hoje o código mostra
      `Alert.alert('Erro', ...)`. Decidir **um** texto, aplicar em `login.tsx` e alinhar o
      fluxo 01 — TENA-01 depende dessa asserção.
- [ ] **5. TENA-03/04/06 — varredura de cache entre sessões.**
      Confirmar que o logout limpa o `queryClient` (hoje em
      `app/(app)/configuracao/conta.tsx`) e que nenhuma tela mantém dado de veículo,
      cerca, evento ou notificação após troca de usuário. Registrar aqui o que foi
      auditado, arquivo por arquivo.

### Bloqueado — não tentar

- **Lado da API** (recusar login cross-tenant; autorizar pelo vínculo do token e não pelo
  header — TENA-01/02/08). O repositório da API não está neste checkout. Não há como
  fazer daqui: apenas registre a dependência.
- **TENA-08** exige `curl` autenticado contra a API real com credenciais de dois tenants.
  Não rodar contra produção a partir do agente.
- **Nunca** chamar `POST /usuario-app/registrar` em produção como sonda: o endpoint aceita
  qualquer payload e cria registro, sem unicidade nem validação.

## Regras da rodada

1. Leia este arquivo primeiro e escolha **o primeiro item não marcado**. Um item por
   rodada — profundidade acima de volume.
2. Não refaça o que está em "Já feito". Se achar que algo ali está errado, **não desfaça
   em silêncio**: escreva a objeção na seção "Registro de execuções" e pare o item.
3. Rode `npx tsc --noEmit` antes de commitar. Não commite com typecheck quebrado.
4. Marque o item como `[x]`, acrescente uma linha em "Registro de execuções" e commite
   tudo junto na branch de trabalho.
5. Só código do app: nada de credencial, `.env`, chamada a produção ou dado de cliente.
6. Se todo o backlog estiver marcado, **não invente trabalho novo**: registre "backlog
   vazio" e encerre a rodada sem commit.

## Registro de execuções

| Data | Item | O que foi feito | Estado |
|---|---|---|---|
| 06/08/2026 | Cliente sem fallback de build | `publicApi`/`api` separados, `signIn`/`hydrate` exigindo tenant, SignalR sem fallback | ✅ typecheck limpo |
