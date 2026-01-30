-- Atualiza a função de busca para suportar filtro por tipos
-- Agora aceita p_tipos como array de strings opcional

CREATE OR REPLACE FUNCTION buscar_contexto_similar(
  p_clinica_id UUID,
  p_embedding TEXT,
  p_limite INT DEFAULT 5,
  p_tipos TEXT DEFAULT NULL  -- Ex: "procedimento,faq" ou NULL para todos
)
RETURNS TABLE (
  id UUID,
  tipo VARCHAR(50),
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_embedding vector(1536);
  v_tipos TEXT[];
BEGIN
  -- Converter o embedding de texto para vetor
  v_embedding := p_embedding::vector(1536);

  -- Converter string de tipos em array (se fornecido)
  IF p_tipos IS NOT NULL AND p_tipos != '' THEN
    v_tipos := string_to_array(p_tipos, ',');
  ELSE
    v_tipos := NULL;
  END IF;

  RETURN QUERY
  SELECT
    ce.id,
    ce.tipo,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> v_embedding) as similarity
  FROM clinica_embeddings ce
  WHERE ce.clinica_id = p_clinica_id
    AND (v_tipos IS NULL OR ce.tipo = ANY(v_tipos))
  ORDER BY ce.embedding <=> v_embedding
  LIMIT p_limite;
END;
$$;

-- Testar a função com filtro
-- SELECT * FROM buscar_contexto_similar('6108a328-cad1-4098-aede-2617402e3f34', '[0.1, 0.2, ...]'::text, 5, 'procedimento');
-- SELECT * FROM buscar_contexto_similar('6108a328-cad1-4098-aede-2617402e3f34', '[0.1, 0.2, ...]'::text, 5, 'faq,politica');
