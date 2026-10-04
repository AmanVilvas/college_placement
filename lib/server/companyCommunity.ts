export const eligibleDriveSql = `
  lower(trim(d.status)) in ('open', 'closing soon')
  and (d.application_deadline is null or d.application_deadline >= current_date)
  and case when jsonb_typeof(d.eligibility->'branches') = 'array'
    then jsonb_array_length(d.eligibility->'branches') = 0 or d.eligibility->'branches' ? s.department
    else true end
  and coalesce(nullif(d.eligibility->>'minCGPA', '')::numeric, nullif(d.eligibility->>'min_cgpa', '')::numeric, 0) <= coalesce(s.cgpa, 0)
  and coalesce(nullif(d.eligibility->>'maxBacklogs', '')::integer, nullif(d.eligibility->>'max_backlogs', '')::integer, 2147483647) >= coalesce(s.backlogs, 0)
`;
