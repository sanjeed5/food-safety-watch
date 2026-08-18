ALTER TABLE establishments ADD COLUMN location_source_url TEXT;

UPDATE establishments SET location_source_url = 'https://www.openstreetmap.org/way/38870571' WHERE id = 'est-lalit-ashok';
UPDATE establishments SET location_source_url = 'https://www.openstreetmap.org/way/437536498' WHERE id = 'est-shangri-la-bengaluru';
UPDATE establishments SET location_source_url = 'https://www.openstreetmap.org/node/7232185449' WHERE id = 'est-four-seasons-bengaluru';
UPDATE establishments SET location_source_url = 'https://www.openstreetmap.org/way/250998789' WHERE id = 'est-vivanta-whitefield';
UPDATE establishments SET location_source_url = 'https://www.openstreetmap.org/way/781538806' WHERE id = 'est-taj-yeshwantpur';

INSERT INTO sources (id, title, publisher, url, published_at, source_type, accessed_at) VALUES
  (
    'src-dh-2026-08-07-star-hotels',
    'Expired products, unhygienic handling, fungal vegetables: Food department finds several lapses at star hotels in Bengaluru',
    'Deccan Herald',
    'https://www.deccanherald.com/india/karnataka/bengaluru/food-safety-teams-inspect-star-hotels-in-bengaluru-find-violations-4103443',
    '2026-08-07',
    'news',
    '2026-08-19'
  ),
  (
    'src-ie-2026-08-08-star-hotels',
    'Expired meat, veggies with fungus: What officials found at 6 Bengaluru 5-star hotels',
    'The Indian Express',
    'https://indianexpress.com/article/cities/bangalore/bengaluru-hotel-food-safety-inspection-expired-meat-milk-seized-10823532/',
    '2026-08-08',
    'news',
    '2026-08-19'
  ),
  (
    'src-ie-2026-08-10-skyye',
    'Bengaluru’s Skyye Lounge restaurant shut, 45kg rotten meat, food found',
    'The Indian Express',
    'https://indianexpress.com/article/cities/bangalore/bengaluru-food-safety-raid-skyye-ub-city-rotten-meat-seized-10826071/',
    '2026-08-10',
    'news',
    '2026-08-19'
  );

INSERT INTO event_sources (event_id, source_id, role, claim_note) VALUES
  ('evt-lalit-ashok-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'corroborating', 'Corroborates the itemized seizure and records the hotel response.'),
  ('evt-shangri-la-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'corroborating', 'Corroborates the named 15 kg seizure without assigning an outlet-specific condition.'),
  ('evt-four-seasons-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'corroborating', 'Corroborates the named 19 kg confiscation without assigning an outlet-specific condition.'),
  ('evt-vivanta-whitefield-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'corroborating', 'Corroborates the bakery-product action and records the IHCL response.'),
  ('evt-taj-yeshwantpur-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'corroborating', 'Corroborates the meat and fish seizure and records the IHCL response.'),
  ('evt-lalit-ashok-2026-08-07', 'src-ie-2026-08-08-star-hotels', 'corroborating', 'Corroborates the itemized seizure and reproduces the hotel clarification.'),
  ('evt-vivanta-whitefield-2026-08-07', 'src-ie-2026-08-08-star-hotels', 'corroborating', 'Corroborates the bakery-product seizure.'),
  ('evt-taj-yeshwantpur-2026-08-07', 'src-ie-2026-08-08-star-hotels', 'corroborating', 'Corroborates the meat and fish seizure.');

INSERT INTO establishments (
  id, name, branch, address, locality, latitude, longitude, identity_confidence, location_source_url
) VALUES
  (
    'est-radisson-blu-atria',
    'Radisson Blu Atria Bengaluru',
    'The Atria',
    '1 Palace Road',
    'High Grounds',
    12.9800049,
    77.5861048,
    'exact',
    'https://www.openstreetmap.org/way/208693753'
  ),
  (
    'est-skyye-ub-city',
    'Skyye Lounge',
    '16th floor, UB City',
    '24 Vittal Mallya Road',
    'Shanthala Nagar',
    12.9723304,
    77.5961063,
    'exact',
    'https://www.openstreetmap.org/way/38773290'
  );

INSERT INTO inspection_events (
  id, establishment_id, inspection_date, authority, finding_summary, action_summary,
  outcome_type, current_status, evidence_grade, reviewed_at, is_published
) VALUES
  (
    'evt-radisson-blu-atria-2026-08-07',
    'est-radisson-blu-atria',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The cited reports attributed 105 kg of expired food articles to this inspection: 50 kg of chicken, 25 kg of meat, 23 kg of fish and 7 kg of vegetables.',
    'The reports say officials seized the listed food articles.',
    'seizure',
    'No later response or enforcement outcome is included in the cited reports.',
    'reported',
    '2026-08-19T04:59:53+05:30',
    1
  ),
  (
    'evt-skyye-ub-city-2026-08-09',
    'est-skyye-ub-city',
    '2026-08-09',
    'Karnataka Food Safety and Drug Administration with civic officials',
    'Officials quoted by The Indian Express reported an unhygienic kitchen, 45 kg of rotten or fungus-affected meat, 6 kg of vegetable cutlets deemed unfit, expired milk and curd, and 15 litres of used cooking oil.',
    'The report says the kitchen was shut, 51 kg of food was discarded or destroyed, and 15 litres of used cooking oil was disposed of.',
    'closure',
    'The report says calls seeking a response went unanswered. No later reopening or enforcement outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:59:53+05:30',
    1
  );

INSERT INTO event_sources (event_id, source_id, role, claim_note) VALUES
  ('evt-radisson-blu-atria-2026-08-07', 'src-dh-2026-08-07-star-hotels', 'primary', 'Supports the exact hotel identity, itemized expired-food finding and seizure.'),
  ('evt-radisson-blu-atria-2026-08-07', 'src-ie-2026-08-08-star-hotels', 'corroborating', 'Corroborates the exact hotel identity and itemized seizure.'),
  ('evt-skyye-ub-city-2026-08-09', 'src-ie-2026-08-10-skyye', 'primary', 'Supports the exact outlet, inspection date, itemized findings, disposal and kitchen closure.');
