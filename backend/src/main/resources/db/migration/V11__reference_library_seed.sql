-- V11: the starter reference library, and the tables a shared template library needs.
--
-- ---------------------------------------------------------------------------------------------
-- A NOTE ON THE PRICES IN THIS FILE, because it matters more than the figures themselves.
--
-- These rates are INDICATIVE BASELINES. They are the right order of magnitude for Ghanaian
-- construction and they carry the correct units, trades and item names, which is what makes the
-- catalogue useful on the first day. They are NOT a published schedule of rates, and this file
-- does not pretend otherwise: every row is written with indicative = true and a source that says
-- so in words the estimator will read.
--
-- The platform therefore treats them as the weakest kind of evidence. A company's own price book
-- beats them, a supplier quotation beats them, and the UI badges them as unconfirmed. They exist
-- so a new company sees a working product instead of an empty table, and so that the moment real
-- rates are imported through /reference-prices/import, the real figures take over.
--
-- Do not add a row here with a source naming a real published document unless the row genuinely
-- came from it.
-- ---------------------------------------------------------------------------------------------

-- A rate the platform supplied, rather than one a person or a document stands behind.
alter table platform_prices add column if not exists indicative boolean not null default false;

-- Set when an account is created for someone by someone else: a seeded operator, an invited
-- colleague. The credential that created the account must not stay usable indefinitely.
alter table users add column if not exists must_change_password boolean not null default false;

-- ------------------------------------------------------------------ shared template library
-- estimate_templates is tenant-scoped, which is right: a company's templates are its own. These
-- tables are the shared shelf a company copies from, and mirror platform_prices in visibility.
create table if not exists platform_templates (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null,
  category varchar(120),
  description text,
  unit varchar(40) not null default 'item',
  country varchar(80) not null default 'Ghana',
  indicative boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists platform_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references platform_templates(id) on delete cascade,
  name varchar(160) not null,
  sort_order integer not null default 0
);

create table if not exists platform_template_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references platform_template_sections(id) on delete cascade,
  description text not null,
  category varchar(120),
  cost_type varchar(30) not null default 'MATERIAL',
  -- Quantity per one unit of the template's own unit, so a 180 m2 job scales from the same row.
  quantity numeric(19,4) not null default 1,
  unit varchar(40) not null,
  waste_percent numeric(9,4) not null default 0,
  sort_order integer not null default 0
);

create index if not exists idx_platform_template_sections on platform_template_sections(template_id);
create index if not exists idx_platform_template_items on platform_template_items(section_id);

create table if not exists platform_assemblies (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null,
  category varchar(120),
  unit varchar(40) not null default 'm2',
  notes text,
  country varchar(80) not null default 'Ghana',
  indicative boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists platform_assembly_items (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references platform_assemblies(id) on delete cascade,
  description varchar(200) not null,
  cost_type varchar(30) not null default 'MATERIAL',
  quantity numeric(19,4) not null default 1,
  unit varchar(40) not null,
  waste_percent numeric(9,4) not null default 0,
  sort_order integer not null default 0
);

create index if not exists idx_platform_assembly_items on platform_assembly_items(assembly_id);

-- ------------------------------------------------------------------ the cost item catalogue
-- Grouped by trade, in the order a building goes up. Units follow Ghanaian site practice:
-- cement and lime by the bag, sand and chippings by the tipper trip, rod by the length,
-- blocks and sheets by the piece, labour by the day.
insert into platform_prices (country, region, material_name, brand, unit, price, category, source, indicative, effective_date)
values
  -- Excavation and earthworks -------------------------------------------------------------
  ('Ghana', null, 'Excavation in ordinary soil', null, 'm3', 42.00, 'Earthworks', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Excavation in hard rock', null, 'm3', 180.00, 'Earthworks', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Backfilling and compaction', null, 'm3', 28.00, 'Earthworks', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Hardcore filling, 150mm', null, 'm2', 55.00, 'Earthworks', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Anti-termite soil treatment', null, 'm2', 18.00, 'Earthworks', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Cart away surplus excavated material', null, 'trip', 620.00, 'Earthworks', 'Indicative baseline', true, current_date),

  -- Concrete works ------------------------------------------------------------------------
  ('Ghana', null, 'Portland cement 50kg', 'Ghacem', 'bag', 118.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Portland cement 50kg', 'Diamond Cement', 'bag', 112.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Portland cement 50kg', 'Dangote', 'bag', 115.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sharp sand', null, 'trip', 1450.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Pit sand', null, 'trip', 1250.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Granite chippings 3/4 inch', null, 'trip', 2100.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Granite chippings 1/2 inch', null, 'trip', 2150.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Quarry dust', null, 'trip', 1150.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ready-mix concrete, grade 25', null, 'm3', 1350.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ready-mix concrete, grade 30', null, 'm3', 1480.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Damp proof membrane 1000 gauge', null, 'm2', 14.00, 'Concrete Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Concrete blinding, 50mm', null, 'm2', 62.00, 'Concrete Works', 'Indicative baseline', true, current_date),

  -- Reinforcement -------------------------------------------------------------------------
  ('Ghana', null, 'Iron rod 8mm high yield', null, 'length', 68.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Iron rod 10mm high yield', null, 'length', 105.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Iron rod 12mm high yield', null, 'length', 152.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Iron rod 16mm high yield', null, 'length', 268.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Iron rod 20mm high yield', null, 'length', 420.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Iron rod 25mm high yield', null, 'length', 655.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Binding wire', null, 'kg', 22.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'BRC mesh A142', null, 'sheet', 480.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'BRC mesh A193', null, 'sheet', 610.00, 'Reinforcement', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Concrete spacer blocks', null, 'pcs', 2.50, 'Reinforcement', 'Indicative baseline', true, current_date),

  -- Blockwork -----------------------------------------------------------------------------
  ('Ghana', null, 'Sandcrete block 4 inch hollow', null, 'pcs', 6.50, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sandcrete block 5 inch hollow', null, 'pcs', 7.60, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sandcrete block 6 inch hollow', null, 'pcs', 8.80, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sandcrete block 8 inch hollow', null, 'pcs', 11.50, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sandcrete block 6 inch solid', null, 'pcs', 10.20, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Interlocking paving block 60mm', null, 'm2', 135.00, 'Blockwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Kerb stone', null, 'pcs', 42.00, 'Blockwork', 'Indicative baseline', true, current_date),

  -- Formwork and carpentry ----------------------------------------------------------------
  ('Ghana', null, 'Marine plywood 18mm', null, 'sheet', 520.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Plywood 12mm', null, 'sheet', 340.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Wawa timber 2x4', null, 'length', 58.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Wawa timber 2x6', null, 'length', 86.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Odum timber 2x4', null, 'length', 145.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Wire nails, assorted', null, 'kg', 18.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Adjustable steel prop, hire', null, 'day', 12.00, 'Formwork', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Formwork oil', null, 'litre', 32.00, 'Formwork', 'Indicative baseline', true, current_date),

  -- Roofing -------------------------------------------------------------------------------
  ('Ghana', null, 'Aluzinc roofing sheet 0.45mm', null, 'm2', 148.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'IBR roofing sheet 0.40mm', null, 'm2', 132.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Corrugated aluminium sheet', null, 'm2', 126.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Stone-coated roofing tile', null, 'm2', 285.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Roofing timber, purlins 2x4', null, 'm', 22.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Roofing nails with washers', null, 'kg', 26.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ridge cap', null, 'm', 68.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Rain gutter, aluminium', null, 'm', 92.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Fascia board', null, 'm', 54.00, 'Roofing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Roof insulation foil', null, 'm2', 26.00, 'Roofing', 'Indicative baseline', true, current_date),

  -- Plastering and screed -----------------------------------------------------------------
  ('Ghana', null, 'Cement sand plaster, internal', null, 'm2', 68.00, 'Plastering', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Cement sand plaster, external', null, 'm2', 78.00, 'Plastering', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Floor screed 40mm', null, 'm2', 74.00, 'Plastering', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Waterproofing compound', null, 'litre', 48.00, 'Plastering', 'Indicative baseline', true, current_date),

  -- Finishes ------------------------------------------------------------------------------
  ('Ghana', null, 'Ceramic floor tile 400x400', null, 'm2', 92.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Porcelain floor tile 600x600', null, 'm2', 138.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Porcelain floor tile 800x800', null, 'm2', 186.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ceramic wall tile 300x600', null, 'm2', 104.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tile adhesive 25kg', null, 'bag', 78.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tile grout 5kg', null, 'bag', 46.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tile spacers', null, 'pack', 14.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Skirting tile', null, 'm', 32.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Terrazzo flooring, in situ', null, 'm2', 210.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'PVC ceiling board', null, 'm2', 96.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'POP ceiling with cornice', null, 'm2', 165.00, 'Finishes', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Gypsum board ceiling', null, 'm2', 142.00, 'Finishes', 'Indicative baseline', true, current_date),

  -- Painting ------------------------------------------------------------------------------
  ('Ghana', null, 'Emulsion paint, 4 gallon', null, 'bucket', 520.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Gloss oil paint, 4 gallon', null, 'bucket', 680.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Textured exterior paint, 4 gallon', null, 'bucket', 890.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Wall putty 20kg', null, 'bag', 118.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Paint primer, 4 gallon', null, 'bucket', 430.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Sandpaper', null, 'sheet', 6.00, 'Painting', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Paint thinner', null, 'litre', 38.00, 'Painting', 'Indicative baseline', true, current_date),

  -- Doors, windows and joinery ------------------------------------------------------------
  ('Ghana', null, 'Flush door with frame, 900mm', null, 'no', 1250.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Panel door with frame, 900mm', null, 'no', 1850.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Metal security door', null, 'no', 3200.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Aluminium sliding window', null, 'm2', 720.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Aluminium casement window', null, 'm2', 810.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Louvre blade glass', null, 'pcs', 26.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Burglar proof, mild steel', null, 'm2', 380.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Door lock set', null, 'no', 185.00, 'Doors and Windows', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Door hinges, pair', null, 'pair', 48.00, 'Doors and Windows', 'Indicative baseline', true, current_date),

  -- Plumbing ------------------------------------------------------------------------------
  ('Ghana', null, 'PVC pipe 110mm', null, 'length', 168.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'PVC pipe 50mm', null, 'length', 72.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'PPR pipe 20mm', null, 'length', 58.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'PPR pipe 25mm', null, 'length', 76.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Water closet, close coupled', null, 'no', 1450.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Wash hand basin with pedestal', null, 'no', 720.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Kitchen sink, stainless double bowl', null, 'no', 980.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Shower mixer set', null, 'no', 620.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Pillar tap', null, 'no', 165.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Polytank 1000 litre', null, 'no', 1350.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Polytank 2000 litre', null, 'no', 2250.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Gate valve 20mm', null, 'no', 78.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Septic tank, 2-chamber, constructed', null, 'no', 12500.00, 'Plumbing', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Manhole with cover', null, 'no', 1450.00, 'Plumbing', 'Indicative baseline', true, current_date),

  -- Electrical ----------------------------------------------------------------------------
  ('Ghana', null, 'Electrical cable 1.5mm single core', null, 'roll', 620.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Electrical cable 2.5mm single core', null, 'roll', 940.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Electrical cable 4mm single core', null, 'roll', 1480.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Armoured cable 16mm 4-core', null, 'm', 185.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'PVC conduit 20mm', null, 'length', 26.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Switch, one gang', null, 'no', 32.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Socket outlet, double 13A', null, 'no', 62.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Distribution board, 12 way', null, 'no', 680.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Miniature circuit breaker', null, 'no', 58.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'LED panel light 18W', null, 'no', 95.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Ceiling fan', null, 'no', 480.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Earthing rod and clamp', null, 'no', 220.00, 'Electrical', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Prepaid meter connection', null, 'no', 1850.00, 'Electrical', 'Indicative baseline', true, current_date),

  -- External works ------------------------------------------------------------------------
  ('Ghana', null, 'Perimeter wall, 6 inch block, per metre', null, 'm', 720.00, 'External Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Metal gate, sliding', null, 'm2', 950.00, 'External Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Concrete apron, 100mm', null, 'm2', 158.00, 'External Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Borehole drilling and casing', null, 'no', 28000.00, 'External Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Submersible pump 1HP', null, 'no', 4200.00, 'External Works', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Landscaping and turfing', null, 'm2', 62.00, 'External Works', 'Indicative baseline', true, current_date),

  -- Labour, quoted by the day as it is engaged on site ------------------------------------
  ('Ghana', null, 'Mason, day rate', null, 'day', 280.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Carpenter, day rate', null, 'day', 280.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Steel bender, day rate', null, 'day', 300.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tiler, day rate', null, 'day', 320.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Painter, day rate', null, 'day', 250.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Plumber, day rate', null, 'day', 330.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Electrician, day rate', null, 'day', 350.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Welder, day rate', null, 'day', 320.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'General labourer, day rate', null, 'day', 130.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Site foreman, day rate', null, 'day', 450.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Security, night, day rate', null, 'day', 120.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tiling labour', null, 'm2', 42.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Blockwork labour', null, 'm2', 55.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Painting labour, two coats', null, 'm2', 28.00, 'Labour', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Plastering labour', null, 'm2', 32.00, 'Labour', 'Indicative baseline', true, current_date),

  -- Plant and equipment hire ---------------------------------------------------------------
  ('Ghana', null, 'Excavator hire, 20 tonne', null, 'day', 3800.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Backhoe loader hire', null, 'day', 2400.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Concrete mixer hire, 1 bag', null, 'day', 420.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Poker vibrator hire', null, 'day', 280.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Plate compactor hire', null, 'day', 350.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Tipper truck hire, 10 tonne', null, 'trip', 680.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Water tanker delivery', null, 'trip', 480.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Scaffolding hire, per bay', null, 'day', 45.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Generator hire, 15 KVA', null, 'day', 620.00, 'Equipment', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Transport to site', null, 'trip', 550.00, 'Equipment', 'Indicative baseline', true, current_date),

  -- Preliminaries ---------------------------------------------------------------------------
  ('Ghana', null, 'Site setup, hoarding and security', null, 'lot', 8500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Site office and store', null, 'lot', 12000.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Temporary water and power', null, 'lot', 4500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Setting out and profiles', null, 'lot', 2800.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Waste removal and site cleaning', null, 'lot', 3200.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Building permit and statutory fees', null, 'lot', 6500.00, 'Preliminaries', 'Indicative baseline', true, current_date),
  ('Ghana', null, 'Contractor all risk insurance', null, 'lot', 5200.00, 'Preliminaries', 'Indicative baseline', true, current_date)
on conflict do nothing;
