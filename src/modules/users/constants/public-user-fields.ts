/**
 * Public profile projection for query-builder joins.
 *
 * Endpoints that embed another user's record (listing search, listing detail,
 * …) must select ONLY these columns. Joining the full entity leaks
 * credentials and PII: refresh_token (session takeover), email, phone number,
 * Ghana Card number, home address.
 *
 * Usage:
 *   qb.leftJoin('listing.user', 'user').addSelect(publicUserFields('user'))
 */
export const publicUserFields = (alias = 'user'): string[] => [
  `${alias}.id`,
  `${alias}.first_name`,
  `${alias}.last_name`,
  `${alias}.profile_picture`,
  `${alias}.bio`,
  `${alias}.city`,
  `${alias}.region`,
  `${alias}.rating`,
  `${alias}.total_ratings`,
  `${alias}.total_exchanges`,
  `${alias}.created_at`,
];
