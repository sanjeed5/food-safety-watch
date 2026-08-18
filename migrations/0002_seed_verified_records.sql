INSERT INTO sources (id, title, publisher, url, published_at, source_type, accessed_at) VALUES
  (
    'src-tnie-2026-08-07-star-hotels',
    'FDA seizes over 500kg of unsafe food in star hotels in Bengaluru',
    'The New Indian Express',
    'https://www.newindianexpress.com/cities/bengaluru/2026/Aug/08/fda-seizes-over-500kg-of-unsafe-food-in-star-hotels-in-bengaluru',
    '2026-08-07',
    'news',
    '2026-08-19'
  );

INSERT INTO establishments (id, name, branch, address, locality, latitude, longitude, identity_confidence) VALUES
  ('est-lalit-ashok', 'The Lalit Ashok', 'Annex South', 'Kumara Krupa Road', 'High Grounds', 12.9922443, 77.5818903, 'exact'),
  ('est-shangri-la-bengaluru', 'Shangri-La Bengaluru', NULL, 'Palace Road', 'Vasanth Nagar', 12.9919953, 77.5881995, 'exact'),
  ('est-four-seasons-bengaluru', 'Four Seasons Hotel Bengaluru', NULL, '8 Bellary Road', 'Ganganagar', 13.0191154, 77.5851502, 'exact'),
  ('est-vivanta-whitefield', 'Vivanta Bengaluru', 'Whitefield', 'Whitefield Road', 'Pattandur Agrahara', 12.9867021, 77.7376107, 'exact'),
  ('est-taj-yeshwantpur', 'Taj Yeshwantpur', NULL, 'Tumkur Road', 'Goraguntepalya', 13.0291616, 77.5409258, 'exact');

INSERT INTO inspection_events (
  id, establishment_id, inspection_date, authority, finding_summary, action_summary,
  outcome_type, current_status, evidence_grade, reviewed_at, is_published
) VALUES
  (
    'evt-lalit-ashok-2026-08-07',
    'est-lalit-ashok',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The report listed meat, vegetables and milk among items identified at Annex South. The hotel said the meat and frozen products were not spoiled or unfit, and that the milk was one day past its best-before date and already marked for withdrawal.',
    'The report says officials seized 76 kg of meat, 200 kg of vegetables and 32 litres of milk.',
    'seizure',
    'The hotel disputed descriptions of spoiled food, said it was cooperating, and reported reinforcing storage and date-monitoring processes. No later regulatory outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:42:15+05:30',
    1
  ),
  (
    'evt-shangri-la-2026-08-07',
    'est-shangri-la-bengaluru',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The report listed 15 kg of meat among items identified during the inspection drive.',
    'The report says officials seized 15 kg of meat.',
    'seizure',
    'No later response or enforcement outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:42:15+05:30',
    1
  ),
  (
    'evt-four-seasons-2026-08-07',
    'est-four-seasons-bengaluru',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The report listed 19 kg of meat among items identified during the inspection drive.',
    'The report says officials confiscated 19 kg of meat.',
    'seizure',
    'No later response or enforcement outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:42:15+05:30',
    1
  ),
  (
    'evt-vivanta-whitefield-2026-08-07',
    'est-vivanta-whitefield',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The report described 3 kg of bakery products as expired. IHCL separately said reports alleging rotten food at its Bengaluru hotels were false and that no food samples were taken.',
    'The report says officials seized and destroyed 3 kg of bakery products.',
    'seizure',
    'IHCL disputed allegations of rotten food. No later regulatory outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:42:15+05:30',
    1
  ),
  (
    'evt-taj-yeshwantpur-2026-08-07',
    'est-taj-yeshwantpur',
    '2026-08-07',
    'Karnataka Food Safety and Drug Administration',
    'The report listed 72 kg of meat and fish among items identified during the drive. IHCL separately said no rotten meat or fish was found at its Bengaluru hotels and that no food samples were taken.',
    'The report says officials seized 72 kg of meat and fish.',
    'seizure',
    'IHCL disputed allegations of rotten food. No later regulatory outcome is included in the cited report.',
    'reported',
    '2026-08-19T04:42:15+05:30',
    1
  );

INSERT INTO event_sources (event_id, source_id, role, claim_note) VALUES
  ('evt-lalit-ashok-2026-08-07', 'src-tnie-2026-08-07-star-hotels', 'primary', 'Supports the reported quantities, hotel clarification and inspection-drive context.'),
  ('evt-shangri-la-2026-08-07', 'src-tnie-2026-08-07-star-hotels', 'primary', 'Supports the reported 15 kg seizure.'),
  ('evt-four-seasons-2026-08-07', 'src-tnie-2026-08-07-star-hotels', 'primary', 'Supports the reported 19 kg confiscation.'),
  ('evt-vivanta-whitefield-2026-08-07', 'src-tnie-2026-08-07-star-hotels', 'primary', 'Supports the reported bakery-product action and IHCL response.'),
  ('evt-taj-yeshwantpur-2026-08-07', 'src-tnie-2026-08-07-star-hotels', 'primary', 'Supports the reported 72 kg seizure and IHCL response.');
