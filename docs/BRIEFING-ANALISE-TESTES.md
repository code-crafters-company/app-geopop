# Briefing — análise completa da suíte de testes do app (GeoPop)

Execução **única**. Não é trabalho fatiado em rodadas: a missão é analisar **100% dos
arquivos de teste** listados abaixo em uma só passagem, sem parar no meio e sem deixar
item para depois. Se um arquivo for difícil, analise assim mesmo e registre a dificuldade
— seguir em frente é obrigatório, abandonar não é opção.

## Missão

**Analisar** a suíte de testes do app e entregar um relatório único e completo em
`docs/ANALISE-TESTES-APP.md`. Ler `app/**` e `src/**` é necessário — é assim que se
descobre se cada asserção corresponde à tela que existe hoje.

**Permitido:** ler qualquer arquivo; criar/escrever `docs/ANALISE-TESTES-APP.md`;
rodar `npm install`, `npm run e2e:validate` (validação estática dos `.yaml`) e
`npx tsc --noEmit`.

**Proibido:** alterar código de `app/**` e `src/**`; alterar os `.yaml` de `e2e/**` — o
diff proposto vai **no relatório**, quem aplica é humano; executar fluxos Maestro (não há
device e a suíte muta dados reais); tocar em credenciais, `.env` ou API de produção,
incluindo qualquer sonda em `POST /usuario-app/registrar`, que aceita qualquer payload e
cria registro.

**Fora de escopo:** o lado da API e mudanças no código do app (TENA-09, texto do alerta
de login, etc.). Vira **recomendação** no relatório, nunca commit.

## Cobertura obrigatória — 100% destes 18 arquivos

Nenhum pode ficar sem seção no relatório. Arquivo sem problema recebe a seção mesmo
assim, com o veredito "nada a corrigir" e a justificativa.

**Fluxos** (`e2e/flows/`): `00_setup.yaml`, `01_login.yaml`, `02_mapa.yaml`,
`03_veiculos.yaml`, `04_relatorios_eventos.yaml`, `05_relatorios_percursos.yaml`,
`06_cercas_virtuais.yaml`, `07_limite_velocidade.yaml`, `08_alertas.yaml`,
`09_conta.yaml`, `10_cadastro.yaml`, `11_lista_veiculos.yaml`.

**Suítes e apoio:** `e2e/all.yaml`, `e2e/public.yaml`, `e2e/setup-test-user.yaml`,
`e2e/README.md`, `scripts/validate-maestro.mjs`, `scripts/run-maestro.mjs`.

## O que produzir, na ordem

### 1. Um veredito por fluxo — o item mais importante

Para **cada** um dos 12 fluxos, confrontar cada `assertVisible`/`tapOn`/`inputText` com o
texto e o `testID` que a tela realmente renderiza hoje. O alvo é o teste que passa
independentemente do comportamento:

- asserção sobre o próprio valor do filtro que acabou de ser tocado;
- texto que só aparece no estado de **fallback** (ex.: asserir "Localização" quando a tela
  só mostra isso em "Localização não informada" — ou seja, passa quando o dado **falta**);
- toque sem nenhuma asserção depois;
- asserção de texto que não existe mais na tela redesenhada.

Formato por achado: **arquivo:linha · o que assere · por que não prova nada · o que
deveria asserir · o que precisaria quebrar para o teste falhar**.

### 2. Inventário de `testID`: app × suíte

Cruzar todo `testID` de `app/**` e `src/**` com os usados em `e2e/**`. Três listas:
`testID` do app que nenhum fluxo exercita; `testID` citado nos fluxos que não existe mais
no app (teste morto ou prestes a quebrar); telas inteiras sem fluxo algum.

### 3. Cobertura de isolamento por tenant

Confrontar TENA-01..07 (tabela abaixo) com o que a suíte cobre hoje e apontar o que falta.
Entregar a **especificação** do fluxo `28_isolamento_tenant.yaml` — passo a passo,
asserções literais, variáveis de ambiente necessárias, quais cenários exigem build de
outro tenant — **sem escrever o `.yaml`**. Atenção: `clearState` não limpa o Keychain no
iOS, então todo fluxo de entrada precisa de `clearKeychain` antes do `launchApp`.

### 4. Teste unitário: diagnóstico e especificação

O `package.json` não tem script `test` nem runner. Avaliar o custo de jest + `jest-expo`
com mock de `expo-secure-store` e especificar os casos que fecham o isolamento sem device:
instância pública usa o tenant do build e não envia `Authorization`; instância autenticada
sem `TENANT_KEY` aborta e limpa a sessão; autenticada completa usa o tenant da sessão;
`signIn` sem `subdominio` não grava nada; `hydrate` descarta sessão divergente.
Especificação e recomendação — implementar é decisão humana.

### 5. Saúde dos scripts

Rodar `npm run e2e:validate` e reportar a saída literal. Conferir se os scripts `e2e:*` do
`package.json` cobrem todos os fluxos de `e2e/flows/` (e o inverso: script apontando para
arquivo inexistente) e se `all.yaml`/`public.yaml` continuam coerentes com o diretório.
Ler `scripts/validate-maestro.mjs` e dizer o que ele valida e o que deixa passar.

### 6. Sumário executivo (no topo do relatório)

Tabela `arquivo × veredito × nº de achados × severidade` cobrindo os 18 arquivos, e uma
lista dos 5 problemas mais graves em ordem de impacto.

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

| ID | Cenário de isolamento |
|---|---|
| TENA-01 | Login cross-tenant recusado: build do tenant A + credencial **correta** de usuário do tenant B → não autentica, permanece no login, nenhum token gravado |
| TENA-02 | Idem com credencial de **administrador** do tenant B (e admin do portal) |
| TENA-03 | Usuário sem favorecido vinculado entra e vê frota vazia — nunca veículo de outro assinante |
| TENA-04 | Com sessão do tenant B, nada do tenant A aparece em veículos, cercas, eventos, percursos e alertas |
| TENA-05 | Acesso por ID direto (`geopop://veiculos/{id do tenant A}` com sessão B) → "Veículo não encontrado." |
| TENA-06 | Logout do A → login do B: listas só com dado de B, sem resquício no cache do React Query |
| TENA-07 | Logout limpa `TOKEN_KEY`, `USER_KEY` e `TENANT_KEY`; o próximo login não herda o subdomínio |
| TENA-08 | Token do tenant A + header `X-Tenant-Subdomain: B` → 401/403 (**verificação de API — fora deste trabalho**) |
| TENA-09 | Build do tenant B sobre sessão do tenant A não reaproveita a sessão antiga |

## Regras

1. **Não pare no meio.** Os 18 arquivos e as 6 entregas saem na mesma execução. Se algo
   travar, registre em uma seção "Impedimentos" e continue — nunca encerre com trabalho
   pela metade sem dizer, em texto, o que ficou de fora e por quê.
2. Achado sem localização não serve: sempre arquivo e linha, e sempre o que precisaria
   quebrar para o teste falhar.
3. **Não invente achado para preencher relatório.** "Este fluxo está correto" é resultado
   legítimo e deve constar com a justificativa.
4. Não altere código nem `.yaml`. O relatório propõe; humano aplica.
5. Ao final, commite **apenas** `docs/ANALISE-TESTES-APP.md` (e este briefing, se tiver
   anotado impedimentos nele) na branch de trabalho, mensagem `docs(testes): ...`, e faça
   push. Sem PR.
