-- Delete the incorrectly inserted jumps
DELETE FROM jumps WHERE jump_number BETWEEN 1 AND 28;

-- Insert the exact data from the CSV file without any modifications
INSERT INTO jumps (code, name, description, value, turn_degrees, symbol_image, jump_number) VALUES
('1.201', 'Scissors (with 1 turn)', '�Scissors� forward with bent legs and 360� turn (�cat leap�)', 0.1, '360', NULL, 1),
('1.101', 'Tuck jump (with 1 turn)', 'Tuck jump with 360� turn, take-off from 2 feet ', 0.1, '360', NULL, 2),
('1.301', 'Chupa Chups (with 1 turn)', 'Vertical jump with straight legs and turn, take-off from 2 feet (360 degrees)', 0.1, '360', NULL, 3),
('1.303', 'Chupa Chups (with 2 turns)', 'Vertical jump with straight legs and turn, take-off from 2 feet (720 degrees)', 0.3, '720', NULL, 4),
('1.401', 'Pass� jump (with 1 turn)', 'Vertical jump with bent leg (passe_), with 1 turn', 0.1, '360', NULL, 5),
('1.403', 'Pass� jump (with 2 turns)', 'Vertical jump with bent leg (passe_), with 2 turns', 0.3, '720', NULL, 6),
('1.502', 'Forward leg jump (with half turn)', 'Vertical jump with free leg stretched forward at the horizontal, with half turn ', 0.2, '180', NULL, 7),
('1.503', 'Forward leg jump (with 1 turn)', 'Vertical jump with free leg stretched forward at the horizontal, with 1 turn', 0.3, '360', NULL, 8),
('1.504', 'Forward leg jump (with 1.5 turns)', 'Vertical jump with free leg stretched forward at the horizontal, with 1.5 turns', 0.4, '540', NULL, 9),
('1.505', 'Forward leg jump (with 2 turns)', 'Vertical jump with free leg stretched forward at the horizontal, with 2 turns', 0.5, '720', NULL, 10),
('1.601', 'Sissonne jump (with half turn)', 'Vertical jump with both legs in side split (Russian split), with half turn', 0.1, '180', NULL, 11),
('1.602', 'Sissonne jump (with 1 turn)', 'Vertical jump with both legs in side split (Russian split), with 1 turn', 0.2, '360', NULL, 12),
('1.603', 'Sissonne jump (with 1.5 turns)', 'Vertical jump with both legs in side split (Russian split), with 1.5 turns', 0.3, '540', NULL, 13),
('1.604', 'Sissonne jump (with 2 turns)', 'Vertical jump with both legs in side split (Russian split), with 2 turns', 0.4, '720', NULL, 14),
('1.701', 'Cossack jump (with half turn)', 'Vertical jump with one leg stretched forward at the horizontal and the other leg bent back (Cossack), with half turn', 0.2, '180', NULL, 15),
('1.702', 'Cossack jump (with 1 turn)', 'Vertical jump with one leg stretched forward at the horizontal and the other leg bent back (Cossack), with 1 turn', 0.3, '360', NULL, 16),
('1.703', 'Cossack jump (with 1.5 turns)', 'Vertical jump with one leg stretched forward at the horizontal and the other leg bent back (Cossack), with 1.5 turns', 0.4, '540', NULL, 17),
('1.801', 'Stag leap (with half turn)', 'Forward jump with front leg stretched forward at the horizontal and back leg bent back (stag), with half turn', 0.2, '180', NULL, 18),
('1.802', 'Stag leap (with 1 turn)', 'Forward jump with front leg stretched forward at the horizontal and back leg bent back (stag), with 1 turn', 0.3, '360', NULL, 19),
('1.803', 'Stag leap (with 1.5 turns)', 'Forward jump with front leg stretched forward at the horizontal and back leg bent back (stag), with 1.5 turns', 0.4, '540', NULL, 20),
('1.901', 'Split leap (with half turn)', 'Forward jump with both legs in split position, with half turn', 0.2, '180', NULL, 21),
('1.902', 'Split leap (with 1 turn)', 'Forward jump with both legs in split position, with 1 turn', 0.3, '360', NULL, 22),
('1.903', 'Split leap (with 1.5 turns)', 'Forward jump with both legs in split position, with 1.5 turns', 0.4, '540', NULL, 23),
('1.904', 'Split leap (with 2 turns)', 'Forward jump with both legs in split position, with 2 turns', 0.5, '720', NULL, 24),
('2.101', 'Ring leap (with half turn)', 'Forward jump with both legs in ring position, with half turn', 0.3, '180', NULL, 25),
('2.102', 'Ring leap (with 1 turn)', 'Forward jump with both legs in ring position, with 1 turn', 0.4, '360', NULL, 26),
('2.103', 'Ring leap (with 1.5 turns)', 'Forward jump with both legs in ring position, with 1.5 turns', 0.5, '540', NULL, 27),
('2.201', 'Cabriole', 'Forward jump with both legs stretched forward at the horizontal and beating together', 0.2, NULL, NULL, 28);