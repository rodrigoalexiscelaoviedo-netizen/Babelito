# Babelito Multiidioma — Estado y Próximas Tandas

## ✅ Completado (Commits en origin/main)

### TANDA 1: Contenido Catalán Bootstrap
**Commit:** `586e307` — feat(tanda-1): Catalan language content bootstrap

- 15 historias catalanas (stories table)
- 80 chunks/diálogos catalanes
- 200 palabras de vocabulario catalán (user_vocabulary bootstrap)
- 12 sounds catalanes hardcodeados en `src/lib/catalanSounds.ts`
- 10 patrones listening catalanes en `src/lib/catalanListeningPatterns.ts`

**Pendiente manual:** Ejecutar `npm run seed:catalan` o `npx ts-node src/scripts/seed-catalan.ts` para insertar datos en Supabase.

---

### TANDA 2: Motor de Voz ca-ES
**Commit:** `20f6bf9` — feat(tanda-2): Add ca-ES language support to useSpeechCapture

**Cambios:**
- `src/lib/useSpeechCapture.ts`:
  - Función `getLangCode(learningLanguage, englishVariant)` mapea idiomas a BCP47
  - Firma: `useSpeechCapture(learningLanguage, englishVariant?, opts)`
- `src/lib/types.ts`: Agregado `learning_language?: string` a Profile
- Actualizados 5 componentes:
  - `src/pages/Conversation.tsx`
  - `src/pages/Roleplay.tsx`
  - `src/pages/Diagnostic.tsx`
  - `src/pages/Review.tsx`
  - `src/components/ShadowingBlock.tsx`

**Resultado:** Web Speech API reconoce `ca-ES` cuando usuario elige Catalán.

---

### TANDA 3: Coach Multiidioma
**Commit:** `c849cc9` — feat(tanda-3): Add multilingual coach prompts (English/Catalan)

**Cambios:**
- `src/lib/buildSystemPrompt.ts`:
  - `buildConversationPrompt()` → dispatcher por idioma
  - Nuevo `buildCatalanConversationPrompt()` (coach en catalán, correcciones en español)
  - `buildCorrectionPrompt(profile, learningLanguage)` → multiidioma
  - `buildRoleplayPrompt(..., learningLanguage)` → multiidioma
- Actualizados callsites:
  - `src/pages/Conversation.tsx`: pasa `learning_language` + adapta hint
  - `src/pages/Roleplay.tsx`: pasa `learning_language`
  - `src/pages/Correction.tsx`: pasa `learning_language`

**Resultado:** Coach habla catalán cuando user.learning_language === 'ca'.

---

## ⏳ Falta Implementar (Tandas 4-7)

### TANDA 4: UI Settings para Elegir Idioma
**Objetivo:** Interfaz para que usuario elija "Inglés" o "Catalán"

**Archivos a modificar:**
- `src/pages/Settings.tsx` o `src/pages/Profile.tsx` (buscar dónde está settings actual)
- Agregar dropdown: "Aprender: Inglés / Catalán"
- Al cambiar:
  - Actualizar `profiles.learning_language = 'en'` o `'ca'`
  - Refrescar app (recargar datos)
  - Opcionalmente resetear racha

**Queries Supabase:**
```typescript
await supabase
  .from("profiles")
  .update({ learning_language: selectedLanguage })
  .eq("id", profile.id);
```

---

### TANDA 5: Filtrado de Contenido por Idioma
**Objetivo:** Que todas las queries de contenido filtren por `language = user.learning_language`

**Componentes/Módulos a modificar:**
- `src/pages/Conversation.tsx` — getTodayLesson
- `src/pages/Roleplay.tsx` — getRoleplayScenarios
- `src/pages/Home.tsx` — getTodayLesson
- `src/components/Stories.tsx` — getStories
- `src/components/Chunks.tsx` — getChunks
- `src/pages/Review.tsx` — getReviewItems
- Cualquier módulo que lea: stories, chunks, user_vocabulary, review_items, session_reports, daily_lessons

**Patrón general:**
```typescript
// Antes:
const { data: stories } = await supabase.from('stories').select('*');

// Después:
const { data: stories } = await supabase
  .from('stories')
  .select('*')
  .eq('language', userLanguage);  // ← NUEVO FILTRO
```

---

### TANDA 6: Hardcoding de Sounds y Listening en UI
**Objetivo:** Mostrar 12 sounds y 10 patrones listening correctos según idioma

**Archivos a crear/modificar:**
- Buscar/crear `src/components/Sounds.tsx`
- Buscar/crear `src/components/Listening.tsx`

**Lógica:**
```typescript
import { catalanSounds } from '../lib/catalanSounds';
import { englishSounds } from '../lib/englishSounds'; // asumir que existe

const sounds = learningLanguage === 'ca' ? catalanSounds : englishSounds;

import { catalanListeningPatterns } from '../lib/catalanListeningPatterns';
import { englishListeningPatterns } from '../lib/englishListeningPatterns'; // asumir que existe

const patterns = learningLanguage === 'ca' ? catalanListeningPatterns : englishListeningPatterns;
```

---

### TANDA 7: Testing End-to-End
**Objetivo:** Verificar el flujo completo en navegador (NO código, puro testing manual)

**Checklist de usuario:**
1. Crear usuario nuevo con `learning_language='ca'`
2. Verificar Settings muestra "Catalán" seleccionado ✓
3. Home: Tríada diaria muestra contenido en catalán ✓
4. Talk: Coach responde EN CATALÁN, correcciones EN ESPAÑOL ✓
5. Stories: Carga 15 historias catalanas (no inglés) ✓
6. Chunks: 80 chunks catalanes ✓
7. Sounds: 12 sounds catalanes visibles ✓
8. Listening: 10 patrones catalanes ✓
9. Review: Items en catalán, speak-to-review funciona ✓
10. Progress: Racha cuenta solo catalán si no practicó inglés ✓
11. Cambiar a "Inglés": Contenido cambia a inglés ✓

---

## Notas Técnicas

### Profile type (definido)
```typescript
interface Profile {
  // ... campos existentes ...
  learning_language?: string; // 'en' o 'ca', defaults to 'en'
}
```

### Mapeo de idiomas
- `'en'` → `en-US` o `en-GB` (según english_variant)
- `'ca'` → `ca-ES`

### Coach behavior
- **Inglés:** Coach en inglés, todo en inglés
- **Catalán:** Coach en catalán, correcciones en ESPAÑOL (para claridad)

### Seed data (no ejecutado aún)
Script `src/scripts/seed-catalan.ts` lista para correr cuando sea.

---

## Comandos útiles

```bash
# Ver estado de git
git log --oneline | head -5

# Buildear
npm run build

# Grabar cambios (con identidad noreply GitHub)
git add <files>
git commit -m "feat: description"
# (automáticamente usa email noreply según CLAUDE.md)

# Push a origin
git push origin main
```

---

## Próximas sesiones

1. **Sesión 2:** TANDA 4 (Settings UI) + TANDA 5 (Filtrado contenido)
2. **Sesión 3:** TANDA 6 (Sounds/Listening en UI) + TANDA 7 (Testing)

Cada sesión = 2 tandas, ~15-30 min por tanda.

---

## Context para Nueva Conversación

Copia esto a la nueva sesión de Code:

```
# Estado actual
- 3 tandas completadas (commits 586e307, 20f6bf9, c849cc9 en main)
- Voice capture: ca-ES funcional
- Coach: habla catalán cuando learning_language='ca'
- Contenido: 15 historias, 80 chunks, 200 palabras, 12 sounds, 10 patrones listening listos para seed

# Próximo paso
TANDA 4: UI en Settings para elegir idioma (Inglés/Catalán)
- Buscar dónde está Settings (probablemente src/pages/Settings.tsx o src/pages/Profile.tsx)
- Agregar dropdown para learning_language
- Actualizar profiles.learning_language en Supabase
- Opcionalmente resetear racha al cambiar idioma

# Luego
TANDA 5: Filtrar todas las queries de contenido por language = user.learning_language
```
