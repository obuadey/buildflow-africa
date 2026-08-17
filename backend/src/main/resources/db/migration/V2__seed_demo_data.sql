insert into permissions(code) values
  ('clients:write'), ('projects:write'), ('estimates:write'), ('quotations:write'), ('settings:admin')
on conflict do nothing;

insert into material_categories(tenant_id, name) values
  (null, 'Preliminaries'), (null, 'Site Preparation'), (null, 'Earthworks'), (null, 'Foundation'),
  (null, 'Concrete Works'), (null, 'Blockwork'), (null, 'Roofing'), (null, 'Electrical Works'),
  (null, 'Plumbing'), (null, 'Labour'), (null, 'Equipment'), (null, 'Transportation')
on conflict do nothing;

