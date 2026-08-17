-- V15: the rest of the Ghanaian cost catalogue, and the regional layer above it.
--
-- ---------------------------------------------------------------------------------------------
-- SAME STANDING AS V11, AND FOR THE SAME REASON.
--
-- Every figure here is an INDICATIVE BASELINE: the right order of magnitude, the right unit, the
-- right trade and the name a Ghanaian estimator would actually write on a bill. None of it is a
-- published schedule of rates, and nothing in this file claims to be one. Rows are written with
-- indicative = true and a source that says so in words, the UI badges them as unconfirmed, and
-- the moment a company imports real rates through /reference-prices/import the real figures win.
--
-- Two things are added:
--
--   1. The trades V11 left out. V11 covered a block-and-render bungalow end to end but stopped
--      there, so a steel-frame warehouse, a solar backup, a CCTV installation or a curtain wall
--      had no catalogue entry at all and resolved to an unpriced line.
--
--   2. A regional layer. Until now every row was national (region null), which meant
--      RateResolver.Origin.REGIONAL_REFERENCE was unreachable code — the branch existed and could
--      never be taken, because no row carried a region to match a company against. Ghana's
--      construction prices are not national: they are a port price plus a haul.
-- ---------------------------------------------------------------------------------------------

-- ------------------------------------------------------------------ the trades V11 left out
insert into platform_prices (country, region, material_name, brand, unit, price, category, source, indicative, effective_date)
values
  -- Structural steel ----------------------------------------------------------------------
  ('Ghana', null, 'Structural steel section, universal beam', null, 'kg', 22.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Angle iron 50x50x5', null, 'length', 285.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Square hollow section 50x50', null, 'length', 240.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Steel roof truss, fabricated and erected', null, 'kg', 34.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Purlin, cold formed Z section', null, 'm', 96.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Holding down bolts and base plate', null, 'no', 420.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Welding electrode 2.5mm', null, 'pack', 95.00, 'Structural Steel', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Anti-rust primer', null, 'litre', 42.00, 'Structural Steel', 'Indicative baseline', true, current_date),

  -- Glazing and aluminium cladding ---------------------------------------------------------
  ('Ghana', null, 'Aluminium composite panel cladding', null, 'm2', 620.00, 'Wall Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Curtain wall glazing, 12mm toughened', null, 'm2', 1450.00, 'Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Glass balustrade with stainless rail', null, 'm', 1850.00, 'Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Aluminium framed glass door', null, 'm2', 980.00, 'Doors', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Roller shutter door, manual', null, 'm2', 1350.00, 'Doors', 'Indicative baseline', true, current_date),

  -- Air conditioning and ventilation --------------------------------------------------------
  ('Ghana', null, 'Split air conditioner 1.5HP, inverter', null, 'no', 5200.00, 'HVAC', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Split air conditioner 2.5HP, inverter', null, 'no', 8500.00, 'HVAC', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ceiling cassette air conditioner 3HP', null, 'no', 14500.00, 'HVAC', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Air conditioner installation kit and piping', null, 'no', 950.00, 'HVAC', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Extractor fan, wall mounted', null, 'no', 320.00, 'HVAC', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Air conditioning technician, day rate', null, 'day', 380.00, 'HVAC', 'Indicative baseline', true, current_date),

  -- Solar and power backup, which most Ghanaian jobs now carry ------------------------------
  ('Ghana', null, 'Solar panel 550W monocrystalline', null, 'no', 2200.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Hybrid inverter 5kVA', null, 'no', 9800.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Lithium battery 5kWh', null, 'no', 16500.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Solar mounting rail and clamps', null, 'set', 1450.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Change-over switch 63A', null, 'no', 480.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Standby generator 10 KVA, silent, supply', null, 'no', 42000.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Automatic transfer switch', null, 'no', 3400.00, 'Electrical', 'Indicative baseline', true, current_date),

  -- Security systems -------------------------------------------------------------------------
  ('Ghana', null, 'CCTV camera, 5MP dome', null, 'no', 780.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Network video recorder, 8 channel with 2TB drive', null, 'no', 3900.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Cat6 data cable', null, 'roll', 1350.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Electric fence, energiser and wire', null, 'm', 420.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Intercom with gate release', null, 'no', 2600.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Automatic sliding gate motor', null, 'no', 8500.00, 'Security Systems', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Razor wire, concertina', null, 'm', 68.00, 'Security Systems', 'Indicative baseline', true, current_date),

  -- Drainage ---------------------------------------------------------------------------------
  ('Ghana', null, 'Precast U-drain 300mm', null, 'm', 320.00, 'Drainage', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Precast U-drain 600mm', null, 'm', 560.00, 'Drainage', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Culvert pipe 600mm', null, 'm', 680.00, 'Drainage', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Soakaway pit, constructed', null, 'no', 4800.00, 'Drainage', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Gully trap with grating', null, 'no', 420.00, 'Drainage', 'Indicative baseline', true, current_date),

  -- Kitchen and fitted joinery ----------------------------------------------------------------
  ('Ghana', null, 'Kitchen cabinet, MDF carcass with doors', null, 'm', 3200.00, 'Kitchen', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Granite worktop', null, 'm2', 1250.00, 'Kitchen', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Built-in wardrobe', null, 'm2', 1450.00, 'Carpentry', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Water heater, 50 litre', null, 'no', 1850.00, 'Plumbing', 'Indicative baseline', true, current_date),

  -- Fencing and landscaping --------------------------------------------------------------------
  ('Ghana', null, 'Chain link fence with concrete posts', null, 'm', 285.00, 'Fencing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Topsoil', null, 'trip', 850.00, 'Landscaping', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ornamental shrubs and planting', null, 'no', 45.00, 'Landscaping', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Interlocking paving, laying labour', null, 'm2', 45.00, 'Labour', 'Indicative baseline', true, current_date),

  -- Professional and statutory, which a contractor carries but often forgets to price -----------
  ('Ghana', null, 'Architectural drawings and approvals', null, 'lot', 12000.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Structural design and drawings', null, 'lot', 9500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Environmental permit', null, 'lot', 4500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Site survey and soil investigation', null, 'lot', 7500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Performance bond and guarantees', null, 'lot', 6800.00, 'Preliminaries', 'Indicative baseline', true, current_date);

-- ------------------------------------------------------------------------- the regional layer
--
-- A Ghanaian rate is a landed price plus a haul, and the two move in opposite directions as you
-- go inland. Rather than retype the catalogue five times, each regional row is derived from its
-- national parent by one of three factors, and which factor applies is a property of where the
-- item comes from:
--
--   HAULED     imported or factory goods that land at Tema or Takoradi and are trucked inland —
--              cement, reinforcement, roofing sheet, tiles, plywood, ready-mix. Dearest in
--              Tamale, cheapest at the ports.
--   LOCAL      quarried, moulded or sawn near the point of use — sand, chippings, quarry dust,
--              sandcrete block, timber — plus the haulage services themselves. Cheapest away
--              from Accra, where demand and the distance to Shai Hills both push it up.
--   LABOUR     trade day rates, which track the local cost of living rather than any freight.
--
-- Greater Accra sits at 1.00 on all three because the V11 catalogue was written at Accra levels.
-- Its rows are still inserted: a company in Accra should match a regional row rather than fall
-- through to the national one, so that what the estimate says about the origin of a rate is true.
--
-- These factors are a stated model, not a survey. They are honest about being a model — the row
-- carries "derived from the national indicative baseline" as its source, so nobody mistakes a
-- computed figure for a quoted one.
with sensitivity(material_name, kind) as (
  values
    -- Landed at the port, then trucked.
    ('Portland cement 50kg', 'HAULED'),
    ('Iron rod 8mm high yield', 'HAULED'),
    ('Iron rod 10mm high yield', 'HAULED'),
    ('Iron rod 12mm high yield', 'HAULED'),
    ('Iron rod 16mm high yield', 'HAULED'),
    ('Iron rod 20mm high yield', 'HAULED'),
    ('Iron rod 25mm high yield', 'HAULED'),
    ('BRC mesh A142', 'HAULED'),
    ('BRC mesh A193', 'HAULED'),
    ('Aluzinc roofing sheet 0.45mm', 'HAULED'),
    ('IBR roofing sheet 0.40mm', 'HAULED'),
    ('Corrugated aluminium sheet', 'HAULED'),
    ('Stone-coated roofing tile', 'HAULED'),
    ('Ceramic floor tile 400x400', 'HAULED'),
    ('Porcelain floor tile 600x600', 'HAULED'),
    ('Porcelain floor tile 800x800', 'HAULED'),
    ('Ceramic wall tile 300x600', 'HAULED'),
    ('Tile adhesive 25kg', 'HAULED'),
    ('Marine plywood 18mm', 'HAULED'),
    ('Plywood 12mm', 'HAULED'),
    ('Emulsion paint, 4 gallon', 'HAULED'),
    ('Gloss oil paint, 4 gallon', 'HAULED'),
    ('Ready-mix concrete, grade 25', 'HAULED'),
    ('Ready-mix concrete, grade 30', 'HAULED'),
    ('PVC pipe 110mm', 'HAULED'),
    ('PPR pipe 25mm', 'HAULED'),
    ('Water closet, close coupled', 'HAULED'),
    ('Polytank 2000 litre', 'HAULED'),
    ('Electrical cable 2.5mm single core', 'HAULED'),
    ('Split air conditioner 1.5HP, inverter', 'HAULED'),
    ('Solar panel 550W monocrystalline', 'HAULED'),
    ('Hybrid inverter 5kVA', 'HAULED'),

    -- Quarried, moulded or sawn near where it is used, and the trucks that move it.
    ('Sharp sand', 'LOCAL'),
    ('Pit sand', 'LOCAL'),
    ('Granite chippings 3/4 inch', 'LOCAL'),
    ('Granite chippings 1/2 inch', 'LOCAL'),
    ('Quarry dust', 'LOCAL'),
    ('Hardcore filling, 150mm', 'LOCAL'),
    ('Sandcrete block 4 inch hollow', 'LOCAL'),
    ('Sandcrete block 5 inch hollow', 'LOCAL'),
    ('Sandcrete block 6 inch hollow', 'LOCAL'),
    ('Sandcrete block 8 inch hollow', 'LOCAL'),
    ('Sandcrete block 6 inch solid', 'LOCAL'),
    ('Interlocking paving block 60mm', 'LOCAL'),
    ('Wawa timber 2x4', 'LOCAL'),
    ('Wawa timber 2x6', 'LOCAL'),
    ('Odum timber 2x4', 'LOCAL'),
    ('Roofing timber, purlins 2x4', 'LOCAL'),
    ('Cart away surplus excavated material', 'LOCAL'),
    ('Tipper truck hire, 10 tonne', 'LOCAL'),
    ('Water tanker delivery', 'LOCAL'),
    ('Transport to site', 'LOCAL'),
    ('Topsoil', 'LOCAL'),

    -- Priced by the day, and paid out of the local economy.
    ('Mason, day rate', 'LABOUR'),
    ('Carpenter, day rate', 'LABOUR'),
    ('Steel bender, day rate', 'LABOUR'),
    ('Tiler, day rate', 'LABOUR'),
    ('Painter, day rate', 'LABOUR'),
    ('Plumber, day rate', 'LABOUR'),
    ('Electrician, day rate', 'LABOUR'),
    ('Welder, day rate', 'LABOUR'),
    ('General labourer, day rate', 'LABOUR'),
    ('Site foreman, day rate', 'LABOUR'),
    ('Security, night, day rate', 'LABOUR'),
    ('Tiling labour', 'LABOUR'),
    ('Blockwork labour', 'LABOUR'),
    ('Painting labour, two coats', 'LABOUR'),
    ('Plastering labour', 'LABOUR'),
    ('Excavation in ordinary soil', 'LABOUR'),
    ('Cement sand plaster, internal', 'LABOUR'),
    ('Cement sand plaster, external', 'LABOUR'),
    ('Floor screed 40mm', 'LABOUR')
),
market(region, city, hauled, local_supply, labour) as (
  values
    -- Tema is the landing point and Accra the deepest market, so this is the reference column.
    ('Greater Accra', 'Accra',    1.00, 1.00, 1.00),
    -- A port city too, so goods land near Accra levels, while aggregate and labour are cheaper.
    ('Western',       'Takoradi', 1.01, 0.95, 0.95),
    -- Coastal sand is close at hand; everything manufactured still comes through Tema.
    ('Central',       'Cape Coast', 1.02, 0.92, 0.88),
    -- Inland haul on manufactured goods, but Kumasi is the country's timber and quarry market.
    ('Ashanti',       'Kumasi',   1.04, 0.88, 0.92),
    -- The longest haul in the country, against the lowest local supply and labour costs.
    ('Northern',      'Tamale',   1.12, 0.80, 0.78)
)
insert into platform_prices (country, region, city, material_name, brand, unit, price, category,
                             source, indicative, effective_date)
select
  parent.country,
  market.region,
  market.city,
  parent.material_name,
  parent.brand,
  parent.unit,
  round(parent.price * case sensitivity.kind
                         when 'HAULED' then market.hauled
                         when 'LOCAL'  then market.local_supply
                         else               market.labour
                       end, 2),
  parent.category,
  'Derived from the national indicative baseline',
  true,
  parent.effective_date
from platform_prices parent
join sensitivity on sensitivity.material_name = parent.material_name
cross join market
where parent.country = 'Ghana'
  and parent.region is null
  and parent.source = 'Indicative baseline';
