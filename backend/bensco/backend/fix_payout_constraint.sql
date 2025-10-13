-- Remove old payout constraint to allow multiple payouts per client-cycle
ALTER TABLE payouts_payoutmodel DROP CONSTRAINT IF EXISTS one_payout_per_client_cycle;

-- Add new constraint that only prevents multiple pending/approved payouts
ALTER TABLE payouts_payoutmodel 
ADD CONSTRAINT one_pending_payout_per_client_cycle 
UNIQUE (client_id, cycle_id) 
WHERE (payout_type = 'client_specific' AND status IN ('pending', 'approved'));