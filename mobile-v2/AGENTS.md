# AGENTS.md — KM One Mobile

## Contexto do projeto

Este projeto é o app mobile do KM One, feito com React Native/Expo e código nativo Android.

O radar Android usa:

- Accessibility Service para detectar Uber/99.
- Overlay flutuante para exibir status sobre outros apps.
- MediaProjection para captura de tela.
- ImageReader + VirtualDisplay para frames.
- ML Kit OCR para leitura de texto.
- Parser nativo para extrair dados de ofertas.

## Estado técnico validado

O radar Android já foi validado de ponta a ponta com oferta real do Uber.

Exemplo validado:

- Categoria: UberX
- Valor: R$ 14,53
- Pickup: 3 min / 1.3 km
- Viagem: 13 min / 6.2 km
- Parser confidence: 0.96

## Regras críticas

1. Não usar `ImageReader.onImageAvailable` como mecanismo principal de captura.
   - Neste device/setup, o callback só disparou uma vez.
   - A captura contínua deve usar polling.

2. `captureAcquireMode` deve permanecer como `polling`.

3. Não reativar restart automático agressivo da MediaProjection.
   - Tentativas de recriar MediaProjection/VirtualDisplay automaticamente geraram SecurityException.
   - Se a MediaProjection morrer, pedir nova permissão ao usuário.

4. Não reutilizar `resultData` antigo para criar uma nova MediaProjection.

5. Não chamar `createVirtualDisplay` múltiplas vezes na mesma sessão sem entender o ciclo de vida.
   - Evitar recriação automática.
   - Se precisar alterar isso, documentar o motivo e validar no aparelho.

6. Fechar sempre cada `Image` adquirida.
   - `image.close()` deve estar em `finally`.
   - `openImageCount` deve voltar para 0.
   - `totalImagesClosed` deve acompanhar o total de frames processados.

7. Não fechar `ImageReader` nem liberar `VirtualDisplay` após cada frame.
   - Isso só deve acontecer ao parar a sessão/captura.

8. Alterações em `android/` precisam continuar protegidas pelo config plugin.
   - Arquivo: `plugins/withKmOneAndroidNative.js`
   - Config: `app.json`

9. Não confiar no `expo prebuild` como fonte de verdade das alterações nativas.
   - Se alterar Manifest, Gradle, MainApplication ou services nativos, atualizar também o config plugin.

## Arquivos críticos

### Nativo Android

- `android/app/src/main/java/com/lucastrevvos/kmone/overlay/OfferCaptureService.kt`
- `android/app/src/main/java/com/lucastrevvos/kmone/overlay/OfferOverlayRuntime.kt`
- `android/app/src/main/java/com/lucastrevvos/kmone/overlay/OfferOverlayModule.kt`
- `android/app/src/main/java/com/lucastrevvos/kmone/overlay/OfferAccessibilityService.kt`
- `android/app/src/main/java/com/lucastrevvos/kmone/overlay/OfferOverlayPackage.kt`
- `android/app/src/main/res/xml/offer_accessibility_service.xml`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`
- `android/app/src/main/java/com/lucastrevvos/kmone/MainApplication.kt`

### Bridge/frontend

- `src/features/offerRadar/overlayBridge.ts`
- `src/features/offerRadar/types.ts`
- `src/state/useOfferRadarStore.ts`
- `src/screens/Configuracoes.tsx`
- `src/screens/Home.tsx`

### Proteção contra prebuild

- `plugins/withKmOneAndroidNative.js`
- `app.json`

## Comandos de validação

Após mudanças nativas Android, rodar:

```bash
cd android
./gradlew :app:compileDebugKotlin
```
