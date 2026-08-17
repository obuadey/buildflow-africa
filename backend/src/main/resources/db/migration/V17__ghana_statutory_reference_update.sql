-- V17: Ghana 2026 statutory references and clearer evidence labels for the shared cost library.
--
-- Construction market rates remain volatile and supplier-specific, so the seeded material rates
-- stay indicative. This migration adds official statutory rows where the values are public and
-- stable, and updates seed-source wording so operators can distinguish a market baseline from a
-- verified Ghana statutory figure.

update platform_prices
set source = 'Ghana market baseline, indicative - verify with supplier quotation before tender'
where country = 'Ghana'
  and indicative = true
  and source in ('Indicative baseline', 'Derived from the national indicative baseline');

insert into platform_prices (country, region, city, material_name, brand, unit, price, category,
                             source, indicative, effective_date)
values
  ('Ghana', null, null, 'National daily minimum wage, statutory floor', null, 'day', 21.77,
   'Labour', 'Fair Wages and Salaries Commission / National Tripartite Committee, 2026 minimum wage',
   false, date '2026-01-01'),
  ('Ghana', null, null, 'VAT standard rate', null, 'percent', 15.00,
   'Tax', 'Ghana Revenue Authority VAT reforms under Value Added Tax Act, 2025 (Act 1151)',
   false, date '2026-01-01'),
  ('Ghana', null, null, 'NHIL levy', null, 'percent', 2.50,
   'Tax', 'Ghana Revenue Authority VAT reforms under Value Added Tax Act, 2025 (Act 1151)',
   false, date '2026-01-01'),
  ('Ghana', null, null, 'GETFund levy', null, 'percent', 2.50,
   'Tax', 'Ghana Revenue Authority VAT reforms under Value Added Tax Act, 2025 (Act 1151)',
   false, date '2026-01-01'),
  ('Ghana', null, null, 'VAT registration threshold for goods businesses', null, 'GHS annual turnover',
   750000.00, 'Tax', 'Ghana Revenue Authority VAT reforms under Value Added Tax Act, 2025 (Act 1151)',
   false, date '2026-01-01')
on conflict do nothing;
