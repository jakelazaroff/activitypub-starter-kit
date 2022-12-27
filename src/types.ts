import { array, assign, optional, string, type } from "superstruct";

export const Object = type({
  id: string(),
  type: string(),
  to: optional(array(string())),
  bto: optional(array(string())),
  cc: optional(array(string())),
  bcc: optional(array(string())),
});

export const Actor = assign(
  Object,
  type({
    inbox: string(),
    outbox: optional(string()),
    followers: optional(string()),
    following: optional(string()),
    endpoints: optional(
      type({
        sharedInbox: optional(string()),
      })
    ),
    publicKey: optional(
      type({
        publicKeyPem: string(),
      })
    ),
  })
);

export const Activity = assign(
  Object,
  type({ actor: string(), object: Object })
);
