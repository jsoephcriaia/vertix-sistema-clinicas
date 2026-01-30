-- ============================================
-- RAG para Vertix - Tabela de Embeddings
-- ============================================

-- 1. Habilitar extensão pgvector (se não estiver)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela de embeddings
CREATE TABLE IF NOT EXISTS clinica_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,

  -- Tipo do conteúdo: 'procedimento', 'faq', 'politica', 'equipe', 'horario'
  tipo VARCHAR(50) NOT NULL,

  -- ID do registro original (para atualização)
  source_id UUID,

  -- Texto original (para debug e exibição)
  content TEXT NOT NULL,

  -- Vetor de embedding (1536 dimensões para OpenAI text-embedding-3-small)
  embedding vector(1536),

  -- Metadados extras (JSON)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_embeddings_clinica ON clinica_embeddings(clinica_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_tipo ON clinica_embeddings(tipo);

-- 4. Índice HNSW para busca vetorial rápida
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON clinica_embeddings
USING hnsw (embedding vector_cosine_ops);

-- 5. Função para buscar documentos similares
CREATE OR REPLACE FUNCTION buscar_contexto_similar(
  p_clinica_id UUID,
  p_embedding vector(1536),
  p_limite INT DEFAULT 5
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
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.tipo,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> p_embedding) as similarity
  FROM clinica_embeddings ce
  WHERE ce.clinica_id = p_clinica_id
  ORDER BY ce.embedding <=> p_embedding
  LIMIT p_limite;
END;
$$;

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_embeddings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_embeddings_updated
  BEFORE UPDATE ON clinica_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embeddings_timestamp();

-- 7. RLS (Row Level Security) para multi-tenant
ALTER TABLE clinica_embeddings ENABLE ROW LEVEL SECURITY;

-- Política: cada clínica só vê seus próprios embeddings
CREATE POLICY "Clinica vê próprios embeddings" ON clinica_embeddings
  FOR ALL
  USING (clinica_id = current_setting('app.current_clinica_id', true)::UUID);

-- Política para service role (bypass RLS)
CREATE POLICY "Service role full access" ON clinica_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Pronto! Agora pode indexar os dados
-- ============================================
