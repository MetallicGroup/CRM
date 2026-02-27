-- Redenumește semantic câmpul Procent Comision în Venit productie (text liber).
-- Coloana rămâne procent_comision în DB; doar tipul se schimbă din enum în varchar.
ALTER TABLE clients
  ALTER COLUMN procent_comision TYPE varchar(100) USING procent_comision::text;
