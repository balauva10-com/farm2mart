INSERT INTO procurement_centers(id,name,agency,address,district,state) VALUES
 ('00000000-0000-0000-0000-000000000001','FCI Warehouse, Perungudi','FCI','Perungudi','Chennai','Tamil Nadu'),
 ('00000000-0000-0000-0000-000000000002','State Procurement Centre, Ambattur','State Procurement','Ambattur','Chennai','Tamil Nadu'),
 ('00000000-0000-0000-0000-000000000003','Cooperative Centre, Madipakkam','Cooperative','Madipakkam','Chennai','Tamil Nadu');
INSERT INTO center_crops(center_id,crop_code) SELECT id, crop FROM procurement_centers CROSS JOIN (VALUES ('wheat'),('paddy'),('cotton')) AS c(crop);
INSERT INTO slots(center_id,start_at,end_at,capacity) SELECT id, current_date + time '07:00', current_date + time '08:00', 30 FROM procurement_centers;
INSERT INTO slots(center_id,start_at,end_at,capacity) SELECT id, current_date + time '08:00', current_date + time '09:00', 30 FROM procurement_centers;
INSERT INTO slots(center_id,start_at,end_at,capacity) SELECT id, current_date + time '09:00', current_date + time '10:00', 30 FROM procurement_centers;
