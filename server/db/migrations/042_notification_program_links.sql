-- Messages about a programme ("Nieuw oefenprogramma", "Programma bijgewerkt") used to point at the
-- home page, so "Bekijken" did not open the programme. New messages carry the programme's own link;
-- this gives the older ones theirs, where exactly one programme of that patient is named in the text.
UPDATE notifications n
   SET link = '/p/programma/' || m.program_id
  FROM (
    SELECT n2.id AS notification_id, min(p.id::text) AS program_id
      FROM notifications n2
      JOIN patients pt ON pt.user_id = n2.user_id
      JOIN programs p ON p.patient_id = pt.id AND p.is_template = false
     WHERE n2.link = '/p'
       AND n2.kind IN ('program_assigned', 'program_updated')
       AND position('"' || p.title || '"' in n2.body) > 0
     GROUP BY n2.id
    HAVING count(*) = 1
  ) m
 WHERE n.id = m.notification_id;
