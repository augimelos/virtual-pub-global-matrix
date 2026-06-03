export type SubscriptionTier = 'none' | 'grid' | 'pit_wall' | 'paddock';
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused';
