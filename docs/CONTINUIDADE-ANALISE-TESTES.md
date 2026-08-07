# Continuidade — análise dos testes do app (GeoPop)

Arquivo de estado do agente noturno. **Este é o único ponto de retomada:** quem entra
sem contexto lê este arquivo, executa o próximo item pendente e atualiza esta página no
mesmo commit. Não confie em memória de sessão anterior — ela não existe.

## Escopo — analisar os testes do app, e só isso

O agente **analisa** a suíte de testes do app: os fluxos Maestro em `e2e/`, os scripts
que os rodam e a ausência/presença de teste unitário. Ele lê `app/**` e `src/**` apenas
para conferir se cada asserção corresponde à tela de verdade.

**Permitido:** ler qualquer arquivo; escrever o relatório em
`docs/ANALISE-TESTES-APP.md` e atualizar este arquivo; rodar `npm run e2e:validate`
(validação estática dos `.yaml`) e `npx tsc --noEmit`.

**Proibido:** alterar código de `app/**` e `src/**`; alterar os `.yaml` de `e2e/**` (a
análise **propõe** o diff no relatório, quem aplica é humano); executar fluxos Maestro
(não há device na nuvem e a suíte muta dados reais); tocar em credenciais, `.env` ou API
de produção — incluindo qualquer sonda em `POST /usuario-app/registrar`, que aceita
qualquer payload e cria registro.

**Fora de escopo (não é trabalho deste agente):** o lado da API (recusar login
cross-tenant e autorizar pelo vínculo do token, não pelo header) e mudanças no código do
app, como TENA-09 ou o texto do alerta de erro do login. Quando a análise concluir que
algo assim é necessário, **registre a recomendação no relatório** e siga em frente.

## Contexto — o que mudou no app em 06/08/2026

Necessário para julgar se um teste ainda prova o que diz provar. Isolamento por tenant é
requisito **absoluto**: um usuário — inclusive administrador — só autentica e só lê dados
do tenant ao qual está vinculado. Não existe usuário global nem "modo suporte".

O cliente deixou de usar o tenant do build depois de autenticado (antes,
`X-Tenant-Subdomain = TENANT_KEY ?? EXPO_PUBLIC_DEFAULT_TENANT` fazia um usuário logado
sem `TENANT_KEY` consultar dados sob o subdomínio do build):

- `src/services/api.ts` — `publicApi` (login, cadastro, `/tenant/by-subdomain`: usa o
  tenant do build e nunca envia `Authorization`) separado da instância autenticada `api`,
  que exige `TOKEN_KEY` **e** `TENANT_KEY` e **aborta** com `MissingTenantError`,
  limpando a sessão, em vez de cair no tenant do build. Helpers: `clearSession()` e
  `getSessionTenant()` (devolve `null`, nunca o tenant do build).
- `src/stores/auth.ts` — `signIn` sem `subdominio` lança e não grava nada; `hydrate`
  descarta sessão sem tenant ou com `subdominio` divergente.
- `app/(auth)/login.tsx` — `signIn` dentro do `mutationFn`: a falha cai no `onError`,
  mostra `Alert.alert('Erro', ...)` e o usuário **permanece no login**.
- `app/(app)/index.tsx` — SignalR usa `getSessionTenant()`; sem tenant não conecta.

Cenários de aceite de isolamento, para referência ao avaliar cobertura:

| ID | Cenário |
|---|---|
| TENA-01 | Login cross-tenant recusado: build do tenant A + credencial **correta** de usuário do tenant B → não autentica, permanece no login, nenhum token gravado |
| TENA-02 | Idem com credencial de **administrador** do tenant B (e admin do portal) |
| TENA-03 | Usuário sem favorecido vinculado entra e vê frota vazia — nunca veículo de outro assinante |
| TENA-04 | Com sessão do tenant B, nada do tenant A aparece em veículos, cercas, eventos, percursos e alertas |
| TENA-05 | Acesso por ID direto (`geopop://veiculos/{id do tenant A}` com sessão B) → "Veículo não encontrado." |
| TENA-06 | Logout do A → login do B: listas só com dado de B, sem resquício no cache do React Query |
| TENA-07 | Logout limpa `TOKEN_KEY`, `USER_KEY` e `TENANT_KEY`; o próximo login não herda o subdomínio |
| TENA-08 | Token do tenant A + header `X-Tenant-Subdomain: B` → 401/403 (**verificação de API, fora deste agente**) |
| TENA-09 | Build do tenant B sobre sessão do tenant A não reaproveita a sessão antiga |

## Backlog — executar **um item por rodada**, de cima para baixo

A suíte hoje: `e2e/flows/00_setup.yaml` a `11_lista_veiculos.yaml`, mais `all.yaml`,
`public.yaml`, `setup-test-user.yaml` e os scripts `scripts/validate-maestro.mjs` e
`scripts/run-maestro.mjs`.

- [ ] **1. Asserção que passa sem provar nada — varredura fluxo a fluxo.**
      Para cada `.yaml` de `e2e/flows/`, confrontar cada `assertVisible`/`tapOn` com o
      texto e o `testID` que a tela realmente renderiza hoje. O alvo é o teste que passa
      independentemente do comportamento: asserção sobre o próprio valor do filtro que
      acabou de ser tocado, texto que só aparece no estado de fallback, toque sem
      nenhuma asserção depois. Relatar por fluxo: linha, o que assere, por que não prova,
      e a asserção que deveria estar no lugar. Comece por `01_login.yaml`,
      `02_mapa.yaml`, `03_veiculos.yaml` e `04_relatorios_eventos.yaml`; se não couber
      tudo na rodada, registre onde parou e continue na próxima.
- [ ] **2. Inventário de `testID`: app × suíte.**
      Listar todo `testID` presente em `app/**` e `src/**` e cruzar com os usados em
      `e2e/**`. Sair com três listas: `testID` do app que nenhum fluxo exercita (buraco de
      cobertura), `testID` referenciado nos fluxos que não existe mais no app (teste que
      vai quebrar ou já é morto) e telas inteiras sem fluxo algum.
- [ ] **3. Cobertura de isolamento por tenant na suíte atual.**
      Confrontar TENA-01..07 com o que a suíte cobre hoje e apontar o que falta. Entregar
      a **especificação** do fluxo `28_isolamento_tenant.yaml` — passo a passo, asserções
      literais, variáveis de ambiente necessárias, quais cenários exigem build de outro
      tenant — sem escrever o `.yaml`. Atenção: `clearState` não limpa o Keychain no iOS,
      então todo fluxo de entrada precisa de `clearKeychain` antes do `launchApp`.
- [ ] **4. Teste unitário: diagnóstico e especificação.**
      O `package.json` não tem script `test` nem runner. Avaliar o custo de jest +
      `jest-expo` com mock de `expo-secure-store` e especificar os casos que fecham o
      isolamento sem device: instância pública usa o tenant do build e não envia
      `Authorization`; instância autenticada sem `TENANT_KEY` aborta e limpa a sessão;
      autenticada completa usa o tenant da sessão; `signIn` sem `subdominio` não grava
      nada; `hydrate` descarta sessão divergente. Especificação e recomendação — a
      implementação é decisão humana.
- [ ] **5. Saúde dos scripts da suíte.**
      Rodar `npm run e2e:validate` e reportar a saída. Conferir se os scripts `e2e:*` do
      `package.json` cobrem todos os fluxos de `e2e/flows/` (e o inverso: script que
      aponta para arquivo inexistente) e se `all.yaml`/`public.yaml` continuam coerentes
      com o conteúdo do diretório.

## Regras da rodada

1. Leia este arquivo primeiro e escolha **o primeiro item não marcado**. Um item por
   rodada — profundidade acima de volume.
2. O produto da rodada é análise escrita, não código: acrescente uma seção datada em
   `docs/ANALISE-TESTES-APP.md` (crie o arquivo na primeira rodada).
3. Achado sem localização não serve: cite sempre arquivo e linha, e diga o que
   precisaria quebrar para o teste falhar.
4. Não invente achado para preencher relatório. "Este fluxo está correto" é resultado
   legítimo e deve ser registrado como tal.
5. Marque o item como `[x]`, acrescente uma linha em "Registro de execuções" e commite
   o relatório e este arquivo juntos, na branch de trabalho. Mensagem no padrão
   `docs(testes):`.
6. Se o backlog estiver todo marcado, registre "backlog vazio" e encerre a rodada sem
   commit. Não invente trabalho novo.

## Registro de execuções

| Data | Item | O que foi feito | Estado |
|---|---|---|---|
| 06/08/2026 | — | Escopo definido: análise da suíte de testes do app. Contexto da mudança de isolamento por tenant registrado | ✅ |
