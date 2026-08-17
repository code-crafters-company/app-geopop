# Prompt para a IA do App GeoPop — ajustes AGO26 + bug de rota em tempo real

> Cole este documento inteiro como contexto/tarefa para a IA que trabalha no app.
> Ele é autocontido: descreve a arquitetura, o bug prioritário (rota em tempo real
> que não anda no mapa), a validação de GPS, e os itens de layout/UX que faltam.

---

## 0. Contexto do projeto

- **App**: Expo / React Native (TypeScript), roteamento por arquivos (`expo-router`).
  Repo: `C:\Projetos\GeoPop\DevOps\GitHub` (remote github.com/code-crafters-company/app-geopop).
- **Estado global**: Zustand.
  - `src/stores/tracking.ts` — `useTrackingStore`: `vehicles: Record<id, Veiculo>`,
    `connected`, `setVehicles`, `updateVehicle(partial)`, `clear`.
  - `src/stores/auth.ts` — sessão do usuário.
- **Dados**: `@tanstack/react-query` + `axios` (`src/services/api.ts`, base
  `EXPO_PUBLIC_API_URL`, header `X-Tenant-Subdomain`, Bearer do SecureStore).
- **Mapa**: `react-native-maps` (`MapView`, `Marker`, `Polyline`), `PROVIDER_GOOGLE`
  no Android.
- **Tempo real**: `@microsoft/signalr` conectando em `${API_BASE}/hubs/rastreamento`.

### Contrato do tempo real (backend — NÃO mudar, só consumir)
Hub `RastreamentoHub` (`api-geopop/src/GeoPop.Api/Hubs/`):
- O cliente chama `connection.invoke('SubscribeVeiculo', veiculoId)` para cada veículo.
  O hub valida que o veículo é do tenant/CPF do usuário e adiciona a conexão ao
  grupo `veiculo-{veiculoId}`.
- O servidor emite, para o grupo `veiculo-{VeiculoId}`:
  - **`PosicaoAtualizada`** → `{ veiculoId, latitude, longitude, velocidade, ignicao, satellites, bateria, timestamp }`
  - **`VeiculoOffline`** → `{ veiculoId, ultimaPosicao, timestamp }`
- O disparo vem do `TrackerPositionService` (protocolo GT06) quando o rastreador
  reporta. Ou seja: **quando o equipamento anda, o backend emite `PosicaoAtualizada`.**

Hoje o consumo está em `app/(app)/index.tsx` (tela do mapa/Home): conecta, faz
`SubscribeVeiculo` de cada veículo, e no `PosicaoAtualizada` chama
`updateVehicle({ id, latitude, longitude, ultimaVelocidade, ignicao, bateriaPercentual, ultimaPosicao })`.

---

## 1. 🔴 BUG PRIORITÁRIO — a rota/movimento não aparece no mapa em tempo real

**Sintoma relatado:** o rastreador se movimenta (o backend recebe posições novas),
mas **o mapa não mostra o movimento nem desenha a rota** do trajeto em tempo real.

### Diagnóstico (pontos a investigar, em ordem)

1. **Não existe Polyline de trilha na Home.** Em `app/(app)/index.tsx` o `MapView`
   só renderiza `Marker`s — **nunca** desenha um `Polyline` com o caminho percorrido.
   Então "a rota de movimento" simplesmente não é desenhada. **É o item central.**
   - **Correção:** acumular as posições que chegam por `PosicaoAtualizada` em uma
     trilha por veículo (ex.: `trails: Record<veiculoId, {lat,lng}[]>` no
     `tracking.ts`, com limite ~200 pontos por veículo) e renderizar um
     `<Polyline>` do veículo selecionado (ou de todos os "ligados") com essa trilha.
   - Inicializar a trilha com a última posição conhecida ao dar `setVehicles`.

2. **O marcador pode não estar "andando".** Confirmar que, ao `updateVehicle`, o
   `Marker` recebe a nova `coordinate` e se move.
   - No Android, `Marker` com filhos customizados às vezes não reposiciona suave.
     Avaliar `MarkerAnimated` + `AnimatedRegion` (animar do ponto antigo para o novo),
     ou ao menos garantir o reposicionamento (teleporte) a cada update.
   - Garantir que a `key` do `Marker` é estável (o `id`) e que a `coordinate` é um
     objeto novo a cada posição.

3. **Confirmar que os eventos `PosicaoAtualizada` estão realmente CHEGANDO.**
   Adicionar log temporário no handler (`connection.on('PosicaoAtualizada', ...)`) e
   no `onreconnected`/`onclose`. Rodar no emulador/dispositivo e mover um rastreador
   (ou simular) para ver se o app recebe. Se **não** chegar:
   - Verificar o **nome do grupo**: o cliente passa `vehicle.id` no `SubscribeVeiculo`;
     o servidor emite para `veiculo-{VeiculoId}` onde `VeiculoId` é um GUID C#
     (`.ToString()` = minúsculo). Se o `vehicle.id` vindo da API vier em caixa
     diferente, o grupo não bate e **nenhuma** mensagem chega. Normalizar para
     minúsculo dos dois lados se necessário.
   - Verificar se o `SubscribeVeiculo` está sendo chamado para **todos** os veículos
     e **após** a conexão iniciar (hoje há `Promise.all(... invoke('SubscribeVeiculo'))`
     no `start()` e no `onreconnected` — confirmar que roda e não lança `HubException`).
   - Verificar o token/tenant no `accessTokenFactory` e no header do handshake.

4. **Re-subscription no reconnect e no foco.** Ao reconectar (rede oscila) ou ao
   voltar para a tela, re-assinar todos os veículos. Conferir o `withAutomaticReconnect`
   e o `onreconnected`.

### Critério de aceite do bug
- Com um rastreador em movimento (real ou simulado no ambiente de dev), o **marcador
  anda no mapa** conforme as posições chegam, e uma **linha (Polyline) vai sendo
  desenhada** mostrando o trajeto em tempo real.
- Ao selecionar um veículo, a câmera acompanha (opcional: `animateToRegion` na nova
  posição do veículo selecionado).

---

## 2. 🛰️ Validação do ponto de GPS

Antes de plotar qualquer posição (Marker/Polyline) e antes de acumular na trilha,
**validar a coordenada**:
- `latitude`/`longitude` numéricos, dentro de faixa (`-90..90`, `-180..180`) e
  **não** `(0,0)` (ponto nulo comum de rastreador sem fix).
- Já existe `hasVeiculoGps(veiculo)` em `src/types` — reusar/estender.
- Posições inválidas **não** entram na trilha nem movem o marcador (mas podem
  atualizar velocidade/ignição/bateria).
- Se o veículo está sem fix, indicar "Sem GPS/sem sinal" no card em vez de plotar 0,0.

---

## 3. Itens de layout/UX que faltam (dos PDFs de teste — AGO26)

Já foram feitos por outra IA (não refazer): botão X no card, endereço via geocoding
(`/geocoding/reverse`, hook `src/hooks/useEndereco.ts`), ícones de status no card,
ignição ao vivo no detalhe, Conta enxuta + excluir conta, "Esqueci minha senha",
eventos com endereço/velocidade. **Faltam:**

- **M1 — Home, placa cortada:** no `Marker` do mapa a placa aparece cortada
  (hoje `vehicle.placa.slice(0,3)`). Mostrar a placa de forma legível (largura maior
  do balão, ou placa completa).
- **M5 — Detalhe, ícone do veículo cortado:** o `Marker` do mapa em
  `app/(app)/veiculos/[id].tsx` está com o ícone cortado. Ajustar tamanho/anchor do
  balão para não cortar.
- **M7 — Tensão da bateria (V):** o doc pede a **tensão** (ex.: "12,32 V") no card e
  no detalhe. Hoje o tipo `Veiculo` só tem `bateriaPercentual`. **Precisa de campo
  novo na API** (ex.: `tensao`/`voltagem`) exposto no DTO de veículo/posição e no
  push `PosicaoAtualizada`. Coordenar com a equipe de backend; enquanto não vier,
  manter o `%`.
- **M9 — Cerca, auto-posicionar:** ao escolher o veículo (placa) na criação de cerca
  (`app/(app)/configuracao/cercas.tsx`), **centralizar o mapa no veículo com zoom**
  (hoje o usuário precisa procurar o local).
- **M10 — Cerca, altura do mapa:** aumentar a altura da área do mapa na tela de cerca.
- **M11 — Cerca, safe area:** os botões de atalho do sistema operacional estão
  **sobrepondo** a tela — respeitar `SafeAreaView`/insets.
- **M12 — Cerca, teclado do raio:** o teclado numérico do campo "raio" **sobrepõe** o
  próprio campo — usar `KeyboardAvoidingView`/scroll para o campo ficar visível ao
  digitar.
- **M16 (ícones nos eventos):** nos eventos, além do endereço/velocidade (já feitos),
  o doc pede ícones de **comunicação** e **ignição**. Isso depende de o item de
  evento carregar esses campos (hoje só há `velocidade`/`lat`/`long`) — **precisa de
  campo novo na projeção de eventos da API**.
- **M17 — Push:** notificações push não chegam. Depende das credenciais do provedor
  de push (OneSignal: App ID + REST Key) — **ainda não disponíveis**. Deixar o fluxo
  cabeado e inativo até as credenciais.

### Referência visual
Os PDFs de teste (com prints) estão em `C:\Users\codec\Downloads\TESTES APP GEOPOP - ANDROID.pdf`.
Os cards de referência (o "alvo" do layout) estão nas imagens do próprio doc.

---

## 4. Regras de trabalho

- **Sem mocks** — usar a API real (`/geocoding/reverse`, SignalR, etc.).
- **Validar rodando**: subir o Expo (`npx expo start`) e testar no emulador/dispositivo
  — especialmente o bug de rota (item 1), a tela de cerca (M9–M12) e o GPS.
- **Typecheck**: `node node_modules/typescript/bin/tsc --noEmit` deve ficar limpo
  (ignorar apenas os erros de *typed-route* do expo-router para `/cadastro`,
  `/termos`, `/esqueci-senha` — somem quando o Expo regenera os tipos).
- Commits pequenos e descritivos; não commitar `node_modules`.
- O endpoint de geocoding (`GET /geocoding/reverse?lat=&lon=`) e o de reset de senha
  (`/Auth/esqueci-senha`, `/Auth/redefinir-senha`) já existem na API.

## 5. Ordem sugerida
1. **Bug de rota em tempo real (item 1)** + **validação de GPS (item 2)** — prioridade.
2. Cerca (M9–M12) — precisa do emulador.
3. M1/M5 (markers) — ajustes visuais.
4. Coordenar com backend os campos novos (M7 tensão; ícones de evento).
5. Push (M17) — quando houver credencial.
