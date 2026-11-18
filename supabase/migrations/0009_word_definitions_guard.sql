-- 0009 · Endurecer la caché compartida de definiciones (word_definitions).
-- Antes, cualquier usuario logueado podía insertar cualquier palabra con
-- cualquier contenido, y esa fila la veían todos. Ahora:
--   1) la inserción pasa por restricciones de formato (largo, idioma, forma del JSON);
--   2) no hay política de update/delete, así que nadie puede pisar filas existentes.
-- Es idempotente: se puede correr más de una vez.

-- Limpiar filas que ya no cumplan el formato antes de poner las restricciones.
delete from public.word_definitions
where char_length(word) not between 1 and 60
   or char_length(lang) > 5
   or jsonb_typeof(data) <> 'object'
   or not (data ? 'translation')
   or char_length(coalesce(data->>'translation', '')) > 200;

alter table public.word_definitions drop constraint if exists word_definitions_word_len;
alter table public.word_definitions add constraint word_definitions_word_len
  check (char_length(word) between 1 and 60);

alter table public.word_definitions drop constraint if exists word_definitions_lang_len;
alter table public.word_definitions add constraint word_definitions_lang_len
  check (char_length(lang) between 2 and 5);

alter table public.word_definitions drop constraint if exists word_definitions_data_shape;
alter table public.word_definitions add constraint word_definitions_data_shape
  check (
    jsonb_typeof(data) = 'object'
    and data ? 'translation'
    and char_length(coalesce(data->>'translation', '')) between 1 and 200
  );

-- Ninguna política de update ni delete: las filas, una vez guardadas, no cambian.
-- La inserción sigue permitida a usuarios logueados, pero solo con el formato validado arriba.
drop policy if exists "definitions insertable" on public.word_definitions;
create policy "definitions insertable" on public.word_definitions
  for insert to authenticated with check (true);
