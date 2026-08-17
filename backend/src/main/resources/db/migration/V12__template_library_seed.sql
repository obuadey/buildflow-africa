-- V12: the shared template and assembly library.
--
-- Same standing as the rates in V11: the compositions are real Ghanaian practice, the quantities
-- are the ones a quantity surveyor would recognise, and every row is marked indicative because the
-- platform is supplying it rather than a named document. A template carries no prices at all — it
-- describes what work a job contains, and the company's own rates decide what it costs.
--
-- Template quantities are per one unit of the template's own unit, so a 180 m2 bungalow and a
-- 95 m2 bungalow scale from the same rows.

do $$
declare
  t uuid;
  s uuid;
begin
  -- ------------------------------------------------------------ 3-bedroom bungalow, per m2 GFA
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('3-bedroom bungalow, single storey', 'Residential',
          'Sandcrete block on strip foundation with an aluzinc pitched roof. Quantities are per '
          'square metre of gross floor area.', 'm2', 10)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Preliminaries', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Site setup, hoarding and security', 'Preliminaries', 'LABOUR', 0.006, 'lot', 0, 1),
    (s, 'Setting out and profiles', 'Preliminaries', 'LABOUR', 0.006, 'lot', 0, 2),
    (s, 'Waste removal and site cleaning', 'Preliminaries', 'LABOUR', 0.006, 'lot', 0, 3);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Substructure', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.35, 'm3', 0, 1),
    (s, 'Anti-termite soil treatment', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 2),
    (s, 'Hardcore filling, 150mm', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Concrete blinding, 50mm', 'Concrete Works', 'MATERIAL', 1.00, 'm2', 0, 4),
    (s, 'Damp proof membrane 1000 gauge', 'Concrete Works', 'MATERIAL', 1.00, 'm2', 5, 5),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.12, 'm3', 3, 6),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 1.10, 'length', 5, 7),
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 4.00, 'pcs', 5, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Superstructure', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 12.00, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.90, 'bag', 3, 2),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.020, 'trip', 0, 3),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.06, 'm3', 3, 4),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 0.90, 'length', 5, 5),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 2.40, 'm2', 0, 6);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Roofing', 4) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Aluzinc roofing sheet 0.45mm', 'Roofing', 'MATERIAL', 1.30, 'm2', 8, 1),
    (s, 'Roofing timber, purlins 2x4', 'Roofing', 'MATERIAL', 2.20, 'm', 5, 2),
    (s, 'Roofing nails with washers', 'Roofing', 'MATERIAL', 0.15, 'kg', 0, 3),
    (s, 'Fascia board', 'Roofing', 'MATERIAL', 0.15, 'm', 5, 4),
    (s, 'Carpenter, day rate', 'Labour', 'LABOUR', 0.12, 'day', 0, 5);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Finishes', 5) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Cement sand plaster, internal', 'Plastering', 'MATERIAL', 2.20, 'm2', 0, 1),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 1.10, 'm2', 0, 2),
    (s, 'Floor screed 40mm', 'Plastering', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Ceramic floor tile 400x400', 'Finishes', 'MATERIAL', 1.00, 'm2', 10, 4),
    (s, 'Tile adhesive 25kg', 'Finishes', 'MATERIAL', 0.22, 'bag', 5, 5),
    (s, 'PVC ceiling board', 'Finishes', 'MATERIAL', 1.00, 'm2', 5, 6),
    (s, 'Emulsion paint, 4 gallon', 'Painting', 'MATERIAL', 0.06, 'bucket', 5, 7),
    (s, 'Wall putty 20kg', 'Painting', 'MATERIAL', 0.16, 'bag', 5, 8),
    (s, 'Painting labour, two coats', 'Labour', 'LABOUR', 3.30, 'm2', 0, 9);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Doors and windows', 6) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Flush door with frame, 900mm', 'Doors and Windows', 'MATERIAL', 0.035, 'no', 0, 1),
    (s, 'Metal security door', 'Doors and Windows', 'MATERIAL', 0.006, 'no', 0, 2),
    (s, 'Aluminium sliding window', 'Doors and Windows', 'MATERIAL', 0.12, 'm2', 0, 3),
    (s, 'Burglar proof, mild steel', 'Doors and Windows', 'MATERIAL', 0.12, 'm2', 0, 4),
    (s, 'Door lock set', 'Doors and Windows', 'MATERIAL', 0.035, 'no', 0, 5);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Services', 7) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'PPR pipe 20mm', 'Plumbing', 'MATERIAL', 0.08, 'length', 5, 1),
    (s, 'PVC pipe 110mm', 'Plumbing', 'MATERIAL', 0.04, 'length', 5, 2),
    (s, 'Water closet, close coupled', 'Plumbing', 'MATERIAL', 0.012, 'no', 0, 3),
    (s, 'Wash hand basin with pedestal', 'Plumbing', 'MATERIAL', 0.012, 'no', 0, 4),
    (s, 'Polytank 1000 litre', 'Plumbing', 'MATERIAL', 0.006, 'no', 0, 5),
    (s, 'Electrical cable 2.5mm single core', 'Electrical', 'MATERIAL', 0.012, 'roll', 0, 6),
    (s, 'PVC conduit 20mm', 'Electrical', 'MATERIAL', 0.20, 'length', 5, 7),
    (s, 'Socket outlet, double 13A', 'Electrical', 'MATERIAL', 0.06, 'no', 0, 8),
    (s, 'Switch, one gang', 'Electrical', 'MATERIAL', 0.04, 'no', 0, 9),
    (s, 'LED panel light 18W', 'Electrical', 'MATERIAL', 0.05, 'no', 0, 10),
    (s, 'Plumber, day rate', 'Labour', 'LABOUR', 0.04, 'day', 0, 11),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 0.05, 'day', 0, 12);

  -- ------------------------------------------------------------ 2-bedroom bungalow, per m2 GFA
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('2-bedroom bungalow, single storey', 'Residential',
          'A smaller version of the same construction. Wall and service quantities per square '
          'metre run slightly higher, because a small plan has more wall for its floor area.',
          'm2', 20)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Substructure', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.40, 'm3', 0, 1),
    (s, 'Anti-termite soil treatment', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 2),
    (s, 'Hardcore filling, 150mm', 'Earthworks', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Damp proof membrane 1000 gauge', 'Concrete Works', 'MATERIAL', 1.00, 'm2', 5, 4),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.13, 'm3', 3, 5),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 1.20, 'length', 5, 6),
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 4.50, 'pcs', 5, 7);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Superstructure and roofing', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 13.50, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 1.00, 'bag', 3, 2),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.022, 'trip', 0, 3),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 0.95, 'length', 5, 4),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 2.70, 'm2', 0, 5),
    (s, 'Aluzinc roofing sheet 0.45mm', 'Roofing', 'MATERIAL', 1.35, 'm2', 8, 6),
    (s, 'Roofing timber, purlins 2x4', 'Roofing', 'MATERIAL', 2.30, 'm', 5, 7),
    (s, 'Carpenter, day rate', 'Labour', 'LABOUR', 0.13, 'day', 0, 8);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Finishes and services', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Cement sand plaster, internal', 'Plastering', 'MATERIAL', 2.40, 'm2', 0, 1),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 1.20, 'm2', 0, 2),
    (s, 'Floor screed 40mm', 'Plastering', 'MATERIAL', 1.00, 'm2', 0, 3),
    (s, 'Ceramic floor tile 400x400', 'Finishes', 'MATERIAL', 1.00, 'm2', 10, 4),
    (s, 'Tile adhesive 25kg', 'Finishes', 'MATERIAL', 0.22, 'bag', 5, 5),
    (s, 'PVC ceiling board', 'Finishes', 'MATERIAL', 1.00, 'm2', 5, 6),
    (s, 'Emulsion paint, 4 gallon', 'Painting', 'MATERIAL', 0.065, 'bucket', 5, 7),
    (s, 'Flush door with frame, 900mm', 'Doors and Windows', 'MATERIAL', 0.040, 'no', 0, 8),
    (s, 'Aluminium sliding window', 'Doors and Windows', 'MATERIAL', 0.13, 'm2', 0, 9),
    (s, 'Electrical cable 2.5mm single core', 'Electrical', 'MATERIAL', 0.014, 'roll', 0, 10),
    (s, 'Water closet, close coupled', 'Plumbing', 'MATERIAL', 0.014, 'no', 0, 11);

  -- --------------------------------------------------- 4-bedroom two-storey house, per m2 GFA
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('4-bedroom house, two storey', 'Residential',
          'Framed construction with a suspended reinforced concrete floor. The suspended slab is '
          'what separates this from a bungalow, and it carries most of the extra cost.', 'm2', 30)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Substructure and frame', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.28, 'm3', 0, 1),
    (s, 'Hardcore filling, 150mm', 'Earthworks', 'MATERIAL', 0.55, 'm2', 0, 2),
    (s, 'Ready-mix concrete, grade 30', 'Concrete Works', 'MATERIAL', 0.22, 'm3', 3, 3),
    (s, 'Iron rod 16mm high yield', 'Reinforcement', 'MATERIAL', 0.85, 'length', 5, 4),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 1.60, 'length', 5, 5),
    (s, 'Binding wire', 'Reinforcement', 'MATERIAL', 0.35, 'kg', 0, 6),
    (s, 'Steel bender, day rate', 'Labour', 'LABOUR', 0.10, 'day', 0, 7);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Suspended slab and formwork', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Marine plywood 18mm', 'Formwork', 'MATERIAL', 0.12, 'sheet', 10, 1),
    (s, 'Wawa timber 2x4', 'Formwork', 'MATERIAL', 0.55, 'length', 10, 2),
    (s, 'Adjustable steel prop, hire', 'Formwork', 'EQUIPMENT', 1.20, 'day', 0, 3),
    (s, 'Wire nails, assorted', 'Formwork', 'MATERIAL', 0.12, 'kg', 0, 4),
    (s, 'Carpenter, day rate', 'Labour', 'LABOUR', 0.14, 'day', 0, 5),
    (s, 'Poker vibrator hire', 'Equipment', 'EQUIPMENT', 0.04, 'day', 0, 6);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Walling, roofing and finishes', 3) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 11.00, 'pcs', 5, 1),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.85, 'bag', 3, 2),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 2.20, 'm2', 0, 3),
    (s, 'Aluzinc roofing sheet 0.45mm', 'Roofing', 'MATERIAL', 0.70, 'm2', 8, 4),
    (s, 'Cement sand plaster, internal', 'Plastering', 'MATERIAL', 2.10, 'm2', 0, 5),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 0.95, 'm2', 0, 6),
    (s, 'Porcelain floor tile 600x600', 'Finishes', 'MATERIAL', 1.00, 'm2', 10, 7),
    (s, 'Tile adhesive 25kg', 'Finishes', 'MATERIAL', 0.22, 'bag', 5, 8),
    (s, 'POP ceiling with cornice', 'Finishes', 'MATERIAL', 1.00, 'm2', 5, 9),
    (s, 'Emulsion paint, 4 gallon', 'Painting', 'MATERIAL', 0.06, 'bucket', 5, 10),
    (s, 'Aluminium casement window', 'Doors and Windows', 'MATERIAL', 0.14, 'm2', 0, 11),
    (s, 'Flush door with frame, 900mm', 'Doors and Windows', 'MATERIAL', 0.030, 'no', 0, 12);

  -- ----------------------------------------------------------- Perimeter wall and gate, per m
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Perimeter wall and gate', 'External Works',
          'Blockwork boundary wall on a strip footing, measured per metre of wall run. The gate '
          'is priced separately, as its size varies more than anything else here.', 'm', 40)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Wall', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Excavation in ordinary soil', 'Earthworks', 'LABOUR', 0.30, 'm3', 0, 1),
    (s, 'Ready-mix concrete, grade 25', 'Concrete Works', 'MATERIAL', 0.09, 'm3', 3, 2),
    (s, 'Iron rod 12mm high yield', 'Reinforcement', 'MATERIAL', 0.70, 'length', 5, 3),
    (s, 'Sandcrete block 6 inch hollow', 'Blockwork', 'MATERIAL', 22.00, 'pcs', 5, 4),
    (s, 'Portland cement 50kg', 'Concrete Works', 'MATERIAL', 0.85, 'bag', 3, 5),
    (s, 'Sharp sand', 'Concrete Works', 'MATERIAL', 0.020, 'trip', 0, 6),
    (s, 'Blockwork labour', 'Labour', 'LABOUR', 2.20, 'm2', 0, 7),
    (s, 'Cement sand plaster, external', 'Plastering', 'MATERIAL', 4.40, 'm2', 0, 8),
    (s, 'Textured exterior paint, 4 gallon', 'Painting', 'MATERIAL', 0.09, 'bucket', 5, 9);

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Gate', 2) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Metal gate, sliding', 'External Works', 'SUBCONTRACTOR', 0.09, 'm2', 0, 1),
    (s, 'Welder, day rate', 'Labour', 'LABOUR', 0.05, 'day', 0, 2);

  -- --------------------------------------------------------- Borehole and water storage, each
  insert into platform_templates (name, category, description, unit, sort_order)
  values ('Borehole and water storage', 'External Works',
          'Drilled borehole with a submersible pump and elevated storage. Priced as one '
          'installation, since depth is the only figure that really moves and it is not known '
          'until the rig is on site.', 'no', 50)
  returning id into t;

  insert into platform_template_sections (template_id, name, sort_order)
  values (t, 'Installation', 1) returning id into s;
  insert into platform_template_items (section_id, description, category, cost_type, quantity, unit, waste_percent, sort_order) values
    (s, 'Borehole drilling and casing', 'External Works', 'SUBCONTRACTOR', 1.00, 'no', 0, 1),
    (s, 'Submersible pump 1HP', 'External Works', 'MATERIAL', 1.00, 'no', 0, 2),
    (s, 'Polytank 2000 litre', 'Plumbing', 'MATERIAL', 2.00, 'no', 0, 3),
    (s, 'PPR pipe 25mm', 'Plumbing', 'MATERIAL', 6.00, 'length', 5, 4),
    (s, 'Gate valve 20mm', 'Plumbing', 'MATERIAL', 4.00, 'no', 0, 5),
    (s, 'Armoured cable 16mm 4-core', 'Electrical', 'MATERIAL', 25.00, 'm', 5, 6),
    (s, 'Plumber, day rate', 'Labour', 'LABOUR', 3.00, 'day', 0, 7),
    (s, 'Electrician, day rate', 'Labour', 'LABOUR', 2.00, 'day', 0, 8);
end $$;

-- ------------------------------------------------------------------------------- assemblies
-- A unit rate build-up: what one square metre or one metre of a given element actually consumes.
do $$
declare
  a uuid;
begin
  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Blockwork wall, 6 inch hollow', 'Blockwork', 'm2',
          'Nominal 450x225x150 block laid in cement mortar, both faces left ready for plaster.', 10)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Sandcrete block 6 inch hollow', 'MATERIAL', 10.00, 'pcs', 5, 1),
    (a, 'Portland cement 50kg', 'MATERIAL', 0.30, 'bag', 3, 2),
    (a, 'Sharp sand', 'MATERIAL', 0.005, 'trip', 0, 3),
    (a, 'Blockwork labour', 'LABOUR', 1.00, 'm2', 0, 4);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Strip foundation, 600mm wide', 'Concrete Works', 'm',
          'Excavation, mass concrete footing and blockwork up to damp proof course.', 20)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Excavation in ordinary soil', 'LABOUR', 0.45, 'm3', 0, 1),
    (a, 'Ready-mix concrete, grade 25', 'MATERIAL', 0.15, 'm3', 3, 2),
    (a, 'Iron rod 12mm high yield', 'MATERIAL', 0.80, 'length', 5, 3),
    (a, 'Sandcrete block 6 inch hollow', 'MATERIAL', 10.00, 'pcs', 5, 4),
    (a, 'Mason, day rate', 'LABOUR', 0.15, 'day', 0, 5);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Reinforced concrete slab, 150mm', 'Concrete Works', 'm2',
          'Suspended slab including formwork, props and reinforcement.', 30)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Ready-mix concrete, grade 25', 'MATERIAL', 0.15, 'm3', 3, 1),
    (a, 'Iron rod 12mm high yield', 'MATERIAL', 1.20, 'length', 5, 2),
    (a, 'Binding wire', 'MATERIAL', 0.08, 'kg', 0, 3),
    (a, 'Marine plywood 18mm', 'MATERIAL', 0.12, 'sheet', 10, 4),
    (a, 'Wawa timber 2x4', 'MATERIAL', 0.50, 'length', 10, 5),
    (a, 'Adjustable steel prop, hire', 'EQUIPMENT', 1.00, 'day', 0, 6),
    (a, 'Carpenter, day rate', 'LABOUR', 0.12, 'day', 0, 7),
    (a, 'Steel bender, day rate', 'LABOUR', 0.10, 'day', 0, 8),
    (a, 'Poker vibrator hire', 'EQUIPMENT', 0.03, 'day', 0, 9);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Cement sand plaster, both faces', 'Plastering', 'm2',
          'Measured per square metre of wall, covering both sides.', 40)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Portland cement 50kg', 'MATERIAL', 0.18, 'bag', 3, 1),
    (a, 'Sharp sand', 'MATERIAL', 0.003, 'trip', 0, 2),
    (a, 'Plastering labour', 'LABOUR', 2.00, 'm2', 0, 3);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Floor screed, 40mm', 'Plastering', 'm2', 'Levelling screed ready to receive a finish.', 50)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Portland cement 50kg', 'MATERIAL', 0.15, 'bag', 3, 1),
    (a, 'Sharp sand', 'MATERIAL', 0.004, 'trip', 0, 2),
    (a, 'Mason, day rate', 'LABOUR', 0.05, 'day', 0, 3);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Porcelain floor tiling, 600x600', 'Finishes', 'm2',
          'Tiles bedded in adhesive on a screeded floor, grouted and cleaned.', 60)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Porcelain floor tile 600x600', 'MATERIAL', 1.00, 'm2', 10, 1),
    (a, 'Tile adhesive 25kg', 'MATERIAL', 0.22, 'bag', 5, 2),
    (a, 'Tile grout 5kg', 'MATERIAL', 0.06, 'bag', 5, 3),
    (a, 'Tiling labour', 'LABOUR', 1.00, 'm2', 0, 4);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Emulsion painting, two coats', 'Painting', 'm2',
          'Putty, sanding and two coats on a plastered wall.', 70)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Wall putty 20kg', 'MATERIAL', 0.05, 'bag', 5, 1),
    (a, 'Emulsion paint, 4 gallon', 'MATERIAL', 0.02, 'bucket', 5, 2),
    (a, 'Sandpaper', 'MATERIAL', 0.10, 'sheet', 0, 3),
    (a, 'Painting labour, two coats', 'LABOUR', 1.00, 'm2', 0, 4);

  insert into platform_assemblies (name, category, unit, notes, sort_order)
  values ('Aluzinc roof covering', 'Roofing', 'm2',
          'Sheet, purlins and fixings on an existing truss. Sheet allows for side and end lap.', 80)
  returning id into a;
  insert into platform_assembly_items (assembly_id, description, cost_type, quantity, unit, waste_percent, sort_order) values
    (a, 'Aluzinc roofing sheet 0.45mm', 'MATERIAL', 1.15, 'm2', 8, 1),
    (a, 'Roofing timber, purlins 2x4', 'MATERIAL', 1.40, 'm', 5, 2),
    (a, 'Roofing nails with washers', 'MATERIAL', 0.15, 'kg', 0, 3),
    (a, 'Carpenter, day rate', 'LABOUR', 0.12, 'day', 0, 4);
end $$;
