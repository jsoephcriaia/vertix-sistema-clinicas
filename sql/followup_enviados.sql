-- ===========================================
-- SISTEMA DE FOLLOW-UP - VERTIX
-- Tabela para registrar follow-ups enviados
-- ===========================================

-- Criar tabela followup_enviados
CREATE TABLE IF NOT EXISTS followup_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,

  -- Tipo de follow-up
  tipo VARCHAR(50) NOT NULL,
  -- Valores: 'lembrete_24h', 'lembrete_dia', 'lembrete_2h', 'pos_consulta', 'reengajamento_48h', 'reengajamento_30d'

  -- Referência ao registro original
  referencia_id UUID NOT NULL, -- agendamento_id ou lead_id
  referencia_tipo VARCHAR(20) NOT NULL, -- 'agendamento' ou 'lead'

  -- Dados do envio
  telefone VARCHAR(20) NOT NULL,
  nome_destinatario VARCHAR(255),
  mensagem TEXT,

  -- Timestamps e status
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'enviado', -- 'enviado', 'erro', 'respondido'
  erro_detalhes TEXT, -- Se status = 'erro', guarda detalhes

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para evitar duplicatas do mesmo tipo para a mesma referência
  CONSTRAINT unique_followup UNIQUE(clinica_id, tipo, referencia_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_followup_clinica ON followup_enviados(clinica_id);
CREATE INDEX IF NOT EXISTS idx_followup_tipo ON followup_enviados(tipo);
CREATE INDEX IF NOT EXISTS idx_followup_referencia ON followup_enviados(referencia_id);
CREATE INDEX IF NOT EXISTS idx_followup_enviado_em ON followup_enviados(enviado_em);

-- Comentários
COMMENT ON TABLE followup_enviados IS 'Registro de mensagens de follow-up enviadas (lembretes, pós-consulta, reengajamento)';
COMMENT ON COLUMN followup_enviados.tipo IS 'Tipo: lembrete_24h, lembrete_dia, lembrete_2h, pos_consulta, reengajamento_48h, reengajamento_30d';
COMMENT ON COLUMN followup_enviados.referencia_tipo IS 'Tipo da referência: agendamento ou lead';

-- ===========================================
-- Adicionar coluna followup_config em clinicas (opcional, para configuração por clínica)
-- ===========================================

-- Verificar se coluna já existe antes de adicionar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinicas' AND column_name = 'followup_config'
  ) THEN
    ALTER TABLE clinicas ADD COLUMN followup_config JSONB DEFAULT '{
      "lembrete_24h": true,
      "lembrete_dia": true,
      "lembrete_2h": false,
      "pos_consulta": true,
      "reengajamento_lead": true,
      "horario_envio_inicio": "08:00",
      "horario_envio_fim": "20:00"
    }';

    COMMENT ON COLUMN clinicas.followup_config IS 'Configurações de follow-up automático da clínica';
  END IF;
END $$;

-- ===========================================
-- Exemplo de queries úteis
-- ===========================================

-- Buscar agendamentos para lembrete 24h (amanhã)
-- SELECT a.*, l.nome, l.telefone, p.nome as procedimento_nome, c.nome as clinica_nome, c.uazapi_instance_token
-- FROM agendamentos a
-- JOIN leads_ia l ON a.lead_id = l.id
-- JOIN procedimentos p ON a.procedimento_id = p.id
-- JOIN clinicas c ON a.clinica_id = c.id
-- WHERE a.status IN ('agendado', 'confirmado')
--   AND DATE(a.data_hora AT TIME ZONE 'America/Sao_Paulo') = (CURRENT_DATE + INTERVAL '1 day')
--   AND c.uazapi_instance_token IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM followup_enviados f
--     WHERE f.referencia_id = a.id
--     AND f.tipo = 'lembrete_24h'
--   );

-- Buscar agendamentos para lembrete no dia (hoje)
-- SELECT a.*, l.nome, l.telefone, p.nome as procedimento_nome, c.nome as clinica_nome, c.uazapi_instance_token
-- FROM agendamentos a
-- JOIN leads_ia l ON a.lead_id = l.id
-- JOIN procedimentos p ON a.procedimento_id = p.id
-- JOIN clinicas c ON a.clinica_id = c.id
-- WHERE a.status IN ('agendado', 'confirmado')
--   AND DATE(a.data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
--   AND c.uazapi_instance_token IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM followup_enviados f
--     WHERE f.referencia_id = a.id
--     AND f.tipo = 'lembrete_dia'
--   );
