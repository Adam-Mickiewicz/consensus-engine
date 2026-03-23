-- Migracja 039: Predictive Analytics — widoki SQL
--
-- Trzy widoki obliczane dynamicznie (CURRENT_DATE) per zapytanie:
--   crm_predictive_ltv          — predykcja LTV i następnego zakupu per klient
--   crm_predictive_summary      — agregaty dla całej bazy
--   crm_next_purchase_calendar  — pogrupowane tygodniowo dla wykresu kalendarza

-- ─── 1. crm_predictive_ltv ───────────────────────────────────────────────────
--
-- Model oparty na historycznym rytmie klienta:
--   avg_days_between_orders = (last_order - first_order) / (orders_count - 1)
--   predicted_next_order    = last_order + avg_days_between_orders
--   purchase_probability_30d:
--     80% — przewidywany zakup mieści się w oknie 0–30 dni
--     maleje o ~3% za każdy dzień po terminie (minimum 10%)
--     20%  — klienci z tylko jednym zamówieniem (brak rytmu)
--     40%  — przewidywany zakup dalej niż 30 dni
--
-- Wymagane: orders_count >= 2 (brak rytmu dla jednego zamówienia)

CREATE OR REPLACE VIEW crm_predictive_ltv AS
SELECT
  c.client_id,
  c.legacy_segment,
  c.risk_level,
  c.ltv                                                         AS current_ltv,
  c.orders_count,
  c.last_order,
  c.first_order,
  c.ulubiony_swiat,

  -- Średni odstęp między zamówieniami w dniach
  ROUND(
    EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
    / 86400.0
    / NULLIF(c.orders_count - 1, 0)
  )                                                             AS avg_days_between_orders,

  -- Przewidywana data następnego zakupu
  (
    c.last_order::date
    + ROUND(
        EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
        / 86400.0
        / NULLIF(c.orders_count - 1, 0)
      )::int
  )                                                             AS predicted_next_order,

  -- Dni do przewidywanego zakupu (ujemne = spóźniony)
  (
    c.last_order::date
    + ROUND(
        EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
        / 86400.0
        / NULLIF(c.orders_count - 1, 0)
      )::int
  ) - CURRENT_DATE                                              AS days_to_next_order,

  -- Przewidywany LTV za 12 miesięcy (proporcjonalne tempo wzrostu × 1 rok)
  ROUND(
    c.ltv
    / NULLIF(
        EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
        / 86400.0 / 365.0,
        0
      )
    * (
        EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
        / 86400.0 / 365.0 + 1.0
      )
  , 2)                                                          AS predicted_ltv_12m,

  -- Średnia wartość zamówienia
  ROUND(c.ltv / NULLIF(c.orders_count, 0), 2)                  AS avg_order_value,

  -- Prawdopodobieństwo zakupu w ciągu 30 dni (0–100)
  CASE
    WHEN c.orders_count < 2
      THEN 20

    WHEN (
      c.last_order::date
      + ROUND(
          EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
          / 86400.0 / NULLIF(c.orders_count - 1, 0)
        )::int
    ) BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      THEN 80

    WHEN (
      c.last_order::date
      + ROUND(
          EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
          / 86400.0 / NULLIF(c.orders_count - 1, 0)
        )::int
    ) < CURRENT_DATE
      THEN GREATEST(
        10,
        60 - (
          CURRENT_DATE - (
            c.last_order::date
            + ROUND(
                EXTRACT(EPOCH FROM (c.last_order::timestamp - c.first_order::timestamp))
                / 86400.0 / NULLIF(c.orders_count - 1, 0)
              )::int
          )
        ) / 3
      )

    ELSE 40
  END                                                           AS purchase_probability_30d

FROM clients_360 c
WHERE c.orders_count >= 2
  AND c.first_order IS NOT NULL
  AND c.last_order  IS NOT NULL
  AND c.last_order  > c.first_order  -- wyklucz edge case gdy daty identyczne
ORDER BY purchase_probability_30d DESC;


-- ─── 2. crm_predictive_summary ───────────────────────────────────────────────
--
-- Agregaty na poziomie całej bazy — używane w Hero KPI cards

CREATE OR REPLACE VIEW crm_predictive_summary AS
SELECT
  COUNT(*)                                                      AS clients_with_prediction,
  COUNT(*) FILTER (WHERE days_to_next_order BETWEEN 0 AND 30)  AS buying_soon,
  COUNT(*) FILTER (WHERE days_to_next_order BETWEEN -30 AND 0) AS overdue,
  COUNT(*) FILTER (WHERE purchase_probability_30d >= 70)        AS high_probability,
  ROUND(AVG(predicted_ltv_12m))                                 AS avg_predicted_ltv_12m,
  ROUND(SUM(predicted_ltv_12m))                                 AS total_predicted_ltv_12m,
  -- Prognozowany przychód z klientów kupujących w ciągu 30 dni
  ROUND(SUM(avg_order_value) FILTER (WHERE days_to_next_order BETWEEN 0 AND 30))
                                                                AS revenue_next_30d
FROM crm_predictive_ltv;


-- ─── 3. crm_next_purchase_calendar ───────────────────────────────────────────
--
-- Tygodniowy kalendarz przychodów — dane do wykresu słupkowego
-- Zakres: -4 tygodnie temu do +24 tygodnie w przód

CREATE OR REPLACE VIEW crm_next_purchase_calendar AS
SELECT
  DATE_TRUNC('week', predicted_next_order)                      AS week,
  COUNT(*)                                                      AS clients,
  ROUND(SUM(avg_order_value))                                   AS expected_revenue,
  ARRAY_AGG(client_id ORDER BY purchase_probability_30d DESC)
    FILTER (WHERE purchase_probability_30d >= 60)               AS high_prob_clients
FROM crm_predictive_ltv
WHERE predicted_next_order
      BETWEEN CURRENT_DATE - INTERVAL '28 days'
          AND CURRENT_DATE + INTERVAL '168 days'
GROUP BY 1
ORDER BY 1;
