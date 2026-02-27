-- Sume cheltuieli care nu se împart la nimeni (fără agent, fără sediu)
-- Ianuarie și Februarie, an 2025 și 2026
SELECT
  an,
  luna,
  SUM(CAST(suma AS NUMERIC)) AS total_ron
FROM cheltuieli_agent
WHERE agent_id IS NULL
  AND sediu_id IS NULL
  AND luna IN (1, 2)
  AND an IN (2025, 2026)
GROUP BY an, luna
ORDER BY an, luna;
