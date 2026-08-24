INSERT INTO sources (id, title, publisher, url, published_at, source_type, accessed_at) VALUES
  (
    'src-it-2026-08-10-skyye',
    'After 5-star hotels, food safety raid at Bengaluru pub, 45-kg rotten meat found',
    'India Today',
    'https://www.indiatoday.in/cities/bengaluru/story/bengaluru-food-safety-raid-skyye-lounge-pub-shut-132-kg-stale-food-seized-karnataka-raid-2967391-2026-08-10',
    '2026-08-10',
    'news',
    '2026-08-24'
  );

INSERT INTO event_sources (event_id, source_id, role, claim_note) VALUES
  (
    'evt-skyye-ub-city-2026-08-09',
    'src-it-2026-08-10-skyye',
    'corroborating',
    'Independently corroborates the exact outlet, kitchen closure, itemized 51 kg disposal and 15 litres of used cooking oil.'
  );

UPDATE inspection_events
SET reviewed_at = '2026-08-24T16:10:00+05:30'
WHERE id = 'evt-skyye-ub-city-2026-08-09';
