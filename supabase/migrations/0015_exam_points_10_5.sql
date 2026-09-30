-- Bump exam scoring: A on Exam 2 -> 10, B on Exam 1 -> 5.
-- Past entries only record category='exam' + a points value (no A/B flag), so
-- A vs B is inferred from the old default value. Any exam entry a moderator gave
-- a custom (non-default) value is left untouched.
update score_entries set points = 10 where category = 'exam' and points = 2;
update score_entries set points = 5  where category = 'exam' and points = 1;
