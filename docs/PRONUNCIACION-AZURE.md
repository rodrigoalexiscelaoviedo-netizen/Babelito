# Pronunciación real (Azure Speech)

Con las claves de Azure cargadas, **Listen & repeat** (ShadowingBlock) puntúa la pronunciación de verdad
(0–100 global, exactitud, fluidez, completitud y color por palabra). Sin claves, la app sigue como antes
(compara el texto reconocido por el navegador). Solo inglés.

## Cómo funciona
1. Al montar el bloque, la app consulta `pronunciation-assess` con un cuerpo vacío: `501` = sin Azure, `400` = disponible.
2. Si está disponible, graba el audio en paralelo al reconocimiento, lo convierte a WAV 16 kHz mono y lo envía.
3. La función valida la sesión, llama a la API REST de Pronunciation Assessment y devuelve el JSON. La clave nunca sale del servidor.

## Configuración (una vez)
1. Azure Portal → crear recurso **Speech** (plan **F0**, gratis). Región cercana (p. ej. West Europe).
2. En el recurso: **Keys and Endpoint** → copiar **KEY 1** y la **Location/Region** (p. ej. `westeurope`).
3. Supabase → Edge Functions → Secrets: guardar `AZURE_SPEECH_KEY` y `AZURE_SPEECH_REGION`.
4. La función `pronunciation-assess` ya está desplegada (Verify JWT desactivado: valida la sesión ella misma).

## Archivos
- `supabase/functions/pronunciation-assess/index.ts`
- `src/lib/pronunciationAssess.ts` (+ `src/__tests__/pronunciationAssess.test.ts`)
- `src/components/ShadowingBlock.tsx`
