-- Migration 040: AI Usage Log
-- Stores every callAI() invocation with token counts and computed cost

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id              bigserial PRIMARY KEY,
  called_at       timestamptz NOT NULL DEFAULT now(),
  endpoint        text,                          -- e.g. 'ai-insights', 'sock-brief'
  model           text        NOT NULL,
  input_tokens    integer     NOT NULL DEFAULT 0,
  output_tokens   integer     NOT NULL DEFAULT 0,
  cost_usd        numeric(12, 6) NOT NULL DEFAULT 0,  -- computed on write
  error           text                           -- NULL = success
);

CREATE INDEX ai_usage_log_called_at_idx ON ai_usage_log (called_at DESC);
CREATE INDEX ai_usage_log_model_idx     ON ai_usage_log (model);
CREATE INDEX ai_usage_log_endpoint_idx  ON ai_usage_log (endpoint);

COMMENT ON TABLE ai_usage_log IS 'Audit log of every AI API call — model, tokens, cost';
