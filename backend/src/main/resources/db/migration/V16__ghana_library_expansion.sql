-- V16: the commercial half of the shared library.
--
-- V12 shelved residential work — bungalows, a two-storey house, a wall, a borehole. A Ghanaian
-- contractor's other half of the order book is a warehouse, a school block, a shop or office fit-out
-- and, increasingly, a solar backup on a building that already exists. Those had nothing to start
-- from, so an estimator building one began at an empty page.
--
-- Same standing as V12, and worth repeating: a template carries no prices at all. It says what work
-- a job contains and in what quantity; the company's own rates decide what that costs. Quantities
-- are per one unit of the template's own unit, so one row set covers a 300 m2 warehouse and a
-- 1,200 m2 one. Every row is indicative because the platform supplied it rather than a named
-- document.

do $$
declare
  t uuid;
  s uuid;
begin
  -- ------------------------------------------------ Steel portal frame warehouse, per m2 GFA
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Warehouse, steel portal frame', 'Commercial',
          'Single-span steel frame on pad foundations, blockwork to sill height with sheeting '
          'above, and a power-floated ground slab. Quantities are per square metre of covered '
          'floor area.', 'm2', 60)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Preliminaries', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Site setup, hoarding and security', 'Preliminaries', 'LABOUR', 0.0022, 'lot', 0, 1),
    (s, 'Setting out and profiles', 'Preliminaries', 'LABOUR', 0.0022, 'lot', 0, 2),
    (s, 'Structural design and drawings', 'Preliminaries', 'SUBCONTRACTOR', 0.0022, 'lot', 0, 3),
    (s, 'Site survey and soil investigation', 'Preliminaries', 'SUBCONTRACTOR', 0.0022, 'lot', 0, 4);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Substructure and slab', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.18, 'm3', 0, 1),
    (s, 'Hardcore filling, 150mm', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 2),
    (s, 'Damp proof membrane 1000 gauge', 'Concrete Works', 'MATERIAL', 1.05, 'm2', 5, 3),
    (s, 'Ready-mix concrete, grade 30', 'Concrete Works', 'MATERIAL', 0.17, 'm3', 3, 4),
    (s, 'BRC mesh A193', 'Reinforcement', 'MATERIAL', 0.09, 'sheet', 5, 5),
    (s, 'Iron rod 16mm high yield', 'Reinforcement', 'MATERIAL', 0.35, 'length', 5, 6),
    (s, 'Holding down bolts and base plate', 'Structural Steel', 'MATERIAL', 0.02, 'no', 0, 7),
    (s, 'Floor screed 40mm', 'Plastering', 'LABOUR', 1.00, 'm2', 0, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Steel frame and roof', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Structural steel section, universal beam', 'Structural Steel', 'MATERIAL', 28.00, 'kg', 3, 1),
    (s, 'Steel roof truss, fabricated and erected', 'Structural Steel', 'SUBCONTRACTOR', 12.00, 'kg', 3, 2),
    (s, 'Purlin, cold formed Z section', 'Structural Steel', 'MATERIAL', 1.10, 'm', 5, 3),
    (s, 'Anti-rust primer', 'Structural Steel', 'MATERIAL', 0.09, 'litre', 5, 4),
    (s, 'IBR roofing sheet 0.40mm', 'Roofing', 'MATERIAL', 1.12, 'm2', 8, 5),
    (s, 'Roof insulation foil', 'Roofing', 'MATERIAL', 1.10, 'm2', 5, 6),
    (s, 'Ridge cap', 'Roofing', 'MATERIAL', 0.06, 'm', 5, 7),
    (s, 'Rain gutter, aluminium', 'Roofing', 'MATERIAL', 0.09, 'm', 5, 8),
    (s, 'Welder, day rate', 'Labour', 'LABOUR', 0.05, 'day', 0, 9),
    (s, 'Scaffolding hire, per bay', 'Equipment', 'EQUIPMENT', 0.30, 'day', 0, 10);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Walls and openings', 4) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 5.50, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.22, 'bag', 3, 2),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.006, 'trip', 0, 3),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 0.55, 'm2', 0, 4),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 1.10, 'm2', 0, 5),
    (s, 'Aluminium composite panel cladding', 'Wall Finishes', 'MATERIAL', 0.35, 'm2', 8, 6),
    (s, 'Roller shutter door, manual', 'Doors', 'SUBCONTRACTOR', 0.035, 'm2', 0, 7),
    (s, 'Aluminium sliding window', 'Doors and Windows', 'MATERIAL', 0.04, 'm2', 0, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Services', 5) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Electrical cable 4mm single core', 'Electrical', 'MATERIAL', 0.006, 'roll', 0, 1),
    (s, 'Armoured cable 16mm 4-core', 'Electrical', 'MATERIAL', 0.12, 'm', 5, 2),
    (s, 'LED panel light 18W', 'Electrical', 'MATERIAL', 0.05, 'no', 0, 3),
    (s, 'Distribution board, 12 way', 'Electrical', 'MATERIAL', 0.002, 'no', 0, 4),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 0.02, 'day', 0, 5),
    (s, 'Precast U-drain 300mm', 'Drainage', 'MATERIAL', 0.09, 'm', 0, 6),
    (s, 'CCTV camera, 5MP dome', 'Security Systems', 'MATERIAL', 0.006, 'no', 0, 7);

  -- ------------------------------------------------------ Classroom block, 3 units, per m2 GFA
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Classroom block, 3 units', 'Institutional',
          'Three classrooms with a front veranda, sandcrete block on strip foundation under an '
          'aluzinc pitched roof, finished to the standard a district education directorate '
          'expects. Quantities are per square metre of gross floor area.', 'm2', 70)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Preliminaries', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Site setup, hoarding and security', 'Preliminaries', 'LABOUR', 0.0043, 'lot', 0, 1),
    (s, 'Setting out and profiles', 'Preliminaries', 'LABOUR', 0.0043, 'lot', 0, 2),
    (s, 'Waste removal and site cleaning', 'Preliminaries', 'LABOUR', 0.0043, 'lot', 0, 3);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Substructure', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.30, 'm3', 0, 1),
    (s, 'Anti-termite soil treatment', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 2),
    (s, 'Hardcore filling, 150mm', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Concrete blinding, 50mm', 'Concrete Works', 'MATERIAL', 1.00, 'm2', 0, 4),
    (s, 'Damp proof membrane 1000 gauge', 'Concrete Works', 'MATERIAL', 1.00, 'm2', 5, 5),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.11, 'm3', 3, 6),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 0.95, 'length', 5, 7),
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 3.60, 'pcs', 5, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Superstructure', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 9.50, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.80, 'bag', 3, 2),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.018, 'trip', 0, 3),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.05, 'm3', 3, 4),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 0.75, 'length', 5, 5),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 2.10, 'm2', 0, 6),
    (s, 'Marine plywood 18mm', 'Formwork', 'MATERIAL', 0.06, 'sheet', 10, 7),
    (s, 'Wawa timber 2x4', 'Formwork', 'MATERIAL', 0.35, 'length', 10, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Roofing', 4) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Aluzinc roofing sheet 0.45mm', 'Roofing', 'MATERIAL', 1.35, 'm2', 8, 1),
    (s, 'Roofing timber, purlins 2x4', 'Roofing', 'MATERIAL', 2.40, 'm', 5, 2),
    (s, 'Roofing nails with washers', 'Roofing', 'MATERIAL', 0.16, 'kg', 0, 3),
    (s, 'Fascia board', 'Roofing', 'MATERIAL', 0.18, 'm', 5, 4),
    (s, 'Rain gutter, aluminium', 'Roofing', 'MATERIAL', 0.14, 'm', 5, 5),
    (s, 'Carpenter, day rate', 'Labour', 'LABOUR', 0.13, 'day', 0, 6);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Finishes', 5) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Cement sand plaster, internal', 'Plastering', 'MATERIAL', 2.60, 'm2', 0, 1),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 1.40, 'm2', 0, 2),
    (s, 'Floor screed 40mm', 'Plastering', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Ceramic floor tile 400x400', 'Finishes', 'MATERIAL', 0.30, 'm2', 10, 4),
    (s, 'PVC ceiling board', 'Finishes', 'MATERIAL', 1.00, 'm2', 5, 5),
    (s, 'Emulsion paint, 4 gallon', 'Painting', 'MATERIAL', 0.10, 'bucket', 5, 6),
    (s, 'Wall putty 20kg', 'Painting', 'MATERIAL', 0.20, 'bag', 5, 7),
    (s, 'Painting labour, two coats', 'Labour', 'LABOUR', 4.00, 'm2', 0, 8),
    (s, 'Flush door with frame, 900mm', 'Doors and Windows', 'MATERIAL', 0.02, 'no', 0, 9),
    (s, 'Aluminium sliding window', 'Doors and Windows', 'MATERIAL', 0.22, 'm2', 0, 10),
    (s, 'Burglar proof, mild steel', 'Doors and Windows', 'MATERIAL', 0.22, 'm2', 0, 11);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Services and external', 6) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'PVC conduit 20mm', 'Electrical', 'MATERIAL', 0.30, 'length', 5, 1),
    (s, 'Electrical cable 2.5mm single core', 'Electrical', 'MATERIAL', 0.004, 'roll', 0, 2),
    (s, 'LED panel light 18W', 'Electrical', 'MATERIAL', 0.06, 'no', 0, 3),
    (s, 'Ceiling fan', 'Electrical', 'MATERIAL', 0.03, 'no', 0, 4),
    (s, 'Socket outlet, double 13A', 'Electrical', 'MATERIAL', 0.04, 'no', 0, 5),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 0.03, 'day', 0, 6),
    (s, 'Concrete apron, 100mm', 'External Works', 'MATERIAL', 0.20, 'm2', 0, 7);

  -- ------------------------------------------------------------ Office fit-out, per m2 of floor
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Office or retail fit-out', 'Commercial',
          'Fitting out a shell: partitions, suspended ceiling, floor finish, lighting, power, '
          'air conditioning and a small wet area. Assumes the structure, envelope and incoming '
          'services already exist. Quantities are per square metre of lettable floor.', 'm2', 80)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Preliminaries', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Setting out and profiles', 'Preliminaries', 'LABOUR', 0.012, 'lot', 0, 1),
    (s, 'Waste removal and site cleaning', 'Preliminaries', 'LABOUR', 0.012, 'lot', 0, 2);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Partitions and ceiling', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 4 inch hollow', 'Blockwork', 'MATERIAL', 3.20, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.25, 'bag', 3, 2),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.006, 'trip', 0, 3),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 0.40, 'm2', 0, 4),
    (s, 'Cement sand plaster, internal', 'Plastering', 'MATERIAL', 0.80, 'm2', 0, 5),
    (s, 'Gypsum board ceiling', 'Finishes', 'MATERIAL', 1.00, 'm2', 8, 6),
    (s, 'Curtain wall glazing, 12mm toughened', 'Windows', 'SUBCONTRACTOR', 0.06, 'm2', 0, 7);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Finishes', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Floor screed 40mm', 'Plastering', 'MATERIAL', 1.00, 'm2', 0, 1),
    (s, 'Porcelain floor tile 600x600', 'Finishes', 'MATERIAL', 1.00, 'm2', 10, 2),
    (s, 'Tile adhesive 25kg', 'Finishes', 'MATERIAL', 0.22, 'bag', 5, 3),
    (s, 'Tile grout 5kg', 'Finishes', 'MATERIAL', 0.06, 'bag', 5, 4),
    (s, 'Skirting tile', 'Finishes', 'MATERIAL', 0.45, 'm', 5, 5),
    (s, 'Tiling labour', 'Labour', 'LABOUR', 1.00, 'm2', 0, 6),
    (s, 'Wall putty 20kg', 'Painting', 'MATERIAL', 0.12, 'bag', 5, 7),
    (s, 'Emulsion paint, 4 gallon', 'Painting', 'MATERIAL', 0.06, 'bucket', 5, 8),
    (s, 'Painting labour, two coats', 'Labour', 'LABOUR', 2.20, 'm2', 0, 9),
    (s, 'Flush door with frame, 900mm', 'Doors and Windows', 'MATERIAL', 0.03, 'no', 0, 10);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Services', 4) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'PVC conduit 20mm', 'Electrical', 'MATERIAL', 0.45, 'length', 5, 1),
    (s, 'Electrical cable 2.5mm single core', 'Electrical', 'MATERIAL', 0.010, 'roll', 0, 2),
    (s, 'LED panel light 18W', 'Electrical', 'MATERIAL', 0.12, 'no', 0, 3),
    (s, 'Socket outlet, double 13A', 'Electrical', 'MATERIAL', 0.12, 'no', 0, 4),
    (s, 'Switch, one gang', 'Electrical', 'MATERIAL', 0.05, 'no', 0, 5),
    (s, 'Distribution board, 12 way', 'Electrical', 'MATERIAL', 0.01, 'no', 0, 6),
    (s, 'Cat6 data cable', 'Security Systems', 'MATERIAL', 0.004, 'roll', 0, 7),
    (s, 'Split air conditioner 2.5HP, inverter', 'HVAC', 'MATERIAL', 0.03, 'no', 0, 8),
    (s, 'Air conditioner installation kit and piping', 'HVAC', 'MATERIAL', 0.03, 'no', 0, 9),
    (s, 'Extractor fan, wall mounted', 'HVAC', 'MATERIAL', 0.01, 'no', 0, 10),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 0.04, 'day', 0, 11),
    (s, 'Water closet, close coupled', 'Plumbing', 'MATERIAL', 0.008, 'no', 0, 12),
    (s, 'Wash hand basin with pedestal', 'Plumbing', 'MATERIAL', 0.008, 'no', 0, 13),
    (s, 'PPR pipe 20mm', 'Plumbing', 'MATERIAL', 0.10, 'length', 5, 14),
    (s, 'PVC pipe 110mm', 'Plumbing', 'MATERIAL', 0.04, 'length', 5, 15),
    (s, 'Plumber, day rate', 'Labour', 'LABOUR', 0.02, 'day', 0, 16);

  -- ------------------------------------------------- Solar backup installation, per installation
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Solar backup installation, 5kVA', 'Electrical',
          'Roof-mounted array with a hybrid inverter, lithium storage and a change-over on an '
          'existing building. Priced as one installation: the array size is the figure that '
          'moves, and it is set by the load survey rather than by the floor area.', 'no', 90)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Equipment', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Solar panel 550W monocrystalline', 'Electrical', 'MATERIAL', 10.00, 'no', 0, 1),
    (s, 'Hybrid inverter 5kVA', 'Electrical', 'MATERIAL', 1.00, 'no', 0, 2),
    (s, 'Lithium battery 5kWh', 'Electrical', 'MATERIAL', 2.00, 'no', 0, 3),
    (s, 'Solar mounting rail and clamps', 'Electrical', 'MATERIAL', 2.00, 'set', 0, 4),
    (s, 'Change-over switch 63A', 'Electrical', 'MATERIAL', 1.00, 'no', 0, 5),
    (s, 'Miniature circuit breaker', 'Electrical', 'MATERIAL', 6.00, 'no', 0, 6),
    (s, 'Earthing rod and clamp', 'Electrical', 'MATERIAL', 1.00, 'no', 0, 7);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Installation', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Armoured cable 16mm 4-core', 'Electrical', 'MATERIAL', 30.00, 'm', 5, 1),
    (s, 'PVC conduit 20mm', 'Electrical', 'MATERIAL', 8.00, 'length', 5, 2),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 4.00, 'day', 0, 3),
    (s, 'General labourer, day rate', 'Labour', 'LABOUR', 4.00, 'day', 0, 4),
    (s, 'Scaffolding hire, per bay', 'Equipment', 'EQUIPMENT', 6.00, 'day', 0, 5),
    (s, 'Transport to site', 'Equipment', 'EQUIPMENT', 1.00, 'trip', 0, 6);
end $$;

-- --------------------------------------------------------------------------------- assemblies
-- The elements V12's assemblies skipped over. Between them, the two files now cover every element
-- of a frame-and-block building from the footing to the second coat of paint, plus the points that
-- an electrical or plumbing first fix is actually counted in.
do $$
declare
  a uuid;
begin
  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Hardcore bed and blinding', 'Earthworks', 'm2',
          'Compacted hardcore, blinding and membrane, taken to the underside of a ground slab.', 15)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Hardcore filling, 150mm', 'MATERIAL', 1.00, 'm2', 0, 1),
    (a, 'Concrete blinding, 50mm', 'MATERIAL', 1.00, 'm2', 0, 2),
    (a, 'Damp proof membrane 1000 gauge', 'MATERIAL', 1.05, 'm2', 5, 3),
    (a, 'Anti-termite soil treatment', 'MATERIAL', 1.00, 'm2', 0, 4),
    (a, 'Plate compactor hire', 'EQUIPMENT', 0.02, 'day', 0, 5),
    (a, 'General labourer, day rate', 'LABOUR', 0.06, 'day', 0, 6);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Reinforced concrete column, 225x225', 'Concrete Works', 'm',
          'Per metre of column height, including formwork, four bars and links.', 32)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Ready-mix concrete, grade 25', 'MATERIAL', 0.051, 'm3', 5, 1),
    (a, 'Iron rod 12mm high yield', 'MATERIAL', 0.45, 'length', 5, 2),
    (a, 'Iron rod 8mm high yield', 'MATERIAL', 0.25, 'length', 5, 3),
    (a, 'Binding wire', 'MATERIAL', 0.05, 'kg', 0, 4),
    (a, 'Marine plywood 18mm', 'MATERIAL', 0.10, 'sheet', 10, 5),
    (a, 'Wawa timber 2x4', 'MATERIAL', 0.60, 'length', 10, 6),
    (a, 'Carpenter, day rate', 'LABOUR', 0.10, 'day', 0, 7),
    (a, 'Steel bender, day rate', 'LABOUR', 0.08, 'day', 0, 8);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Reinforced concrete beam, 225x450', 'Concrete Works', 'm',
          'Per metre of beam, including soffit and side formwork, main bars and links.', 34)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Ready-mix concrete, grade 25', 'MATERIAL', 0.101, 'm3', 5, 1),
    (a, 'Iron rod 16mm high yield', 'MATERIAL', 0.40, 'length', 5, 2),
    (a, 'Iron rod 8mm high yield', 'MATERIAL', 0.30, 'length', 5, 3),
    (a, 'Binding wire', 'MATERIAL', 0.06, 'kg', 0, 4),
    (a, 'Marine plywood 18mm', 'MATERIAL', 0.14, 'sheet', 10, 5),
    (a, 'Wawa timber 2x6', 'MATERIAL', 0.55, 'length', 10, 6),
    (a, 'Adjustable steel prop, hire', 'EQUIPMENT', 2.00, 'day', 0, 7),
    (a, 'Carpenter, day rate', 'LABOUR', 0.14, 'day', 0, 8),
    (a, 'Steel bender, day rate', 'LABOUR', 0.10, 'day', 0, 9);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Ceramic wall tiling, 300x600', 'Finishes', 'm2',
          'Tiles on a plastered wall in a bathroom or kitchen, grouted and cleaned.', 65)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Ceramic wall tile 300x600', 'MATERIAL', 1.00, 'm2', 10, 1),
    (a, 'Tile adhesive 25kg', 'MATERIAL', 0.20, 'bag', 5, 2),
    (a, 'Tile grout 5kg', 'MATERIAL', 0.05, 'bag', 5, 3),
    (a, 'Tile spacers', 'MATERIAL', 0.05, 'pack', 0, 4),
    (a, 'Tiling labour', 'LABOUR', 1.00, 'm2', 0, 5);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('PVC ceiling with cornice', 'Finishes', 'm2',
          'Board on a timber grid, with cornice measured against a typical room perimeter.', 75)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'PVC ceiling board', 'MATERIAL', 1.00, 'm2', 8, 1),
    (a, 'Wawa timber 2x4', 'MATERIAL', 0.55, 'length', 10, 2),
    (a, 'Wire nails, assorted', 'MATERIAL', 0.05, 'kg', 0, 3),
    (a, 'Carpenter, day rate', 'LABOUR', 0.09, 'day', 0, 4);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Aluminium sliding window, installed', 'Windows', 'm2',
          'Window, burglar proofing and fixing into a formed opening, pointed up on both faces.', 85)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Aluminium sliding window', 'MATERIAL', 1.00, 'm2', 0, 1),
    (a, 'Burglar proof, mild steel', 'MATERIAL', 1.00, 'm2', 0, 2),
    (a, 'Portland cement 50kg', 'MATERIAL', 0.05, 'bag', 3, 3),
    (a, 'Welder, day rate', 'LABOUR', 0.08, 'day', 0, 4),
    (a, 'Mason, day rate', 'LABOUR', 0.05, 'day', 0, 5);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Internal flush door, installed', 'Doors', 'no',
          'Door and frame fixed into a formed opening, with lock and hinges.', 90)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Flush door with frame, 900mm', 'MATERIAL', 1.00, 'no', 0, 1),
    (a, 'Door lock set', 'MATERIAL', 1.00, 'no', 0, 2),
    (a, 'Door hinges, pair', 'MATERIAL', 1.50, 'pair', 0, 3),
    (a, 'Carpenter, day rate', 'LABOUR', 0.25, 'day', 0, 4);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Electrical point, socket outlet', 'Electrical', 'no',
          'One point measured from the board: conduit, cable, back box and accessory. Electrical '
          'first fix is counted in points on site, so this is the unit an estimator works in.', 95)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'PVC conduit 20mm', 'MATERIAL', 2.50, 'length', 5, 1),
    (a, 'Electrical cable 2.5mm single core', 'MATERIAL', 0.05, 'roll', 0, 2),
    (a, 'Socket outlet, double 13A', 'MATERIAL', 1.00, 'no', 0, 3),
    (a, 'Miniature circuit breaker', 'MATERIAL', 0.10, 'no', 0, 4),
    (a, 'Electrician, day rate', 'LABOUR', 0.15, 'day', 0, 5);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Cold water point, PPR', 'Plumbing', 'no',
          'One draw-off point back to the riser: pipe, fittings, isolating valve and chasing.', 100)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'PPR pipe 20mm', 'MATERIAL', 1.20, 'length', 5, 1),
    (a, 'Gate valve 20mm', 'MATERIAL', 1.00, 'no', 0, 2),
    (a, 'Pillar tap', 'MATERIAL', 1.00, 'no', 0, 3),
    (a, 'Plumber, day rate', 'LABOUR', 0.20, 'day', 0, 4),
    (a, 'Mason, day rate', 'LABOUR', 0.05, 'day', 0, 5);
end $$;
