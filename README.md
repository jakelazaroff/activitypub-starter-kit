# ActivityPub Starter Kit

A tiny, single user ActivityPub server.

Although you can use this in production as-is, it’s really meant to be a starting point for your own ActivityPub projects. Here, some ideas to get you going:

- Allow people to follow your blog on Mastodon.
- Follow accounts and save links they post to a reading list.
- Automatically post if your website goes down.
- Whatever you can dream up!￼

ActivityPub Stater Kit is easy to extend — built on Express with only a few dependencies.

## Local Development

￼First, copy the `.env.default` file as `.env` and fill out the missing variables:

- `ACCOUNT` is the account name (the “alice” part of `https://example.com/alice`).
- `HOSTNAME` is the domain at which other servers will be able to find yours on the public internet (the “example.com” part of `@name@example.com`).

Once you have the `.env` file filled out, just run `npm dev` and you’re off to the races!

### Getting Online

In order to test how other servers interact with yours, you’ll need to make it available on the real internet.

You can use a service like [ngrok](https://ngrok.com/) to quickly and safely get your server online. Sign up for an account, install the command line tool and then run this command:

```sh
ngrok http 3000
```

ngrok will give you a public URL that looks something like `https://2698179b-26eb-4493-8e2e-a79f40b3e964.ngrok.io`. Set the `HOSTNAME` variable in your `.env` file to everything after the `https://` (in this example, `2698179b-26eb-4493-8e2e-a79f40b3e964.ngrok.io`).

To find your account in another Fediverse app such as Mastodon, search for your account name and the ngrok URL you just put in your `HOSTNAME` variable. So if your account name were “alice”, you’d search for your actor alice (`https://2698179b-26eb-4493-8e2e-a79f40b3e964.ngrok.io/alice`) or `@alice@2698179b-26eb-4493-8e2e-a79f40b3e964.ngrok.io`.

## Doing Stuff

ActivityPub Starter Kit doesn’t have a GUI — although you could make one! Instead, there’s an API that you can use. The activities that it supports are posting and following/unfollowing.

### Posting

`POST /admin/create` adds a [`Create` activity](https://www.w3.org/TR/activitypub/#create-activity-outbox) to your outbox and notifies all your followers. The request body must be JSON and is used as the activity `object`. The only required field is `type`. You can omit fields that the server already knows, such as `@context`, `attributedTo`, `published` and `cc`.

For example, you could send a POST request containing the following body:

```json
{
  "object": {
    "type": "Note",
    "content": "Lorem ipsum dolor sit amet."
  }
}
```

That will add this activity to your outbox:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "id": "https://example.com/alice/post/123",
  "actor": "https://example.com/alice",
  "published": "2022-12-34T12:34:56Z",
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "cc": ["https://example.com/alice/followers"],
  "object": {
    "id": "https://example.com/alice/post/456",
    "type": "Note",
    "attributedTo": "https://example.com/alice",
    "content": "Lorem ipsum dolor sit amet.",
    "published": "2022-12-34T12:34:56Z",
    "to": ["https://www.w3.org/ns/activitystreams#Public"],
    "cc": ["https://example.com/alice/followers"]
  }
}
```

In addition, it will send this activity to each of your followers, with the top-level `cc` array replaced with their inbox address.

ActivityPub Starter Kit provides sensible defaults for everything in the `Create` activity outside of the `object` property, but you can override them by supplying those properties alongside `object`. For example, if you wanted to backdate a post, you could supply your own `published` date:

```json
{
  "published": "2019-12-34T12:34:56Z",
  "object": {
    "type": "Note",
    "content": "Lorem ipsum dolor sit amet.",
    "published": "2019-12-34T12:34:56Z"
  }
}
```

### Following

`POST /admin/follow/:actor` follows another Fediverse account. This should cause them to send a request to your inbox whenever they post something. `:actor` should be replaced with the full actor ID; for example, to follow the account `https://example.com/bob`, you’d send a POST request to `/admin/follow/https://example.com/bob`

`DELETE /admin/follow/:actor` unfollows another Fediverse account. This should cause them to stop sending requests to your inbox whenever they post something. As with the previous endpoint, `:actor` should be replaced with the full actor ID; for example, to unfollow the account `https://example.com/bob`, you’d send a DELETE request to `/admin/follow/https://example.com/bob`

## Deploying to Production

When you deploy a real server on the public internet, there are a few more environment variables you’ll need to define:

- `PUBLIC_KEY` and `PRIVATE_KEY` make up the key pair that your server will use to prove that it’s really making requests that appear to come from your domain. This prevents other servers from impersonating you!
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` prevent intruders from accessing the admin endpoints. You’ll need to supply these credentials using [HTTP basic authentication](https://swagger.io/docs/specification/2-0/authentication/basic-authentication/).

If you need help creating a key pair, [here's a guide on how to do it](https://stackoverflow.com/a/44474607).

## Integration Test Harness

The kit can be used to stand up a test server for client integration testing. To install, execute the following in your client project:

```sh
npm i -D activitypub-starter-kit
```

Then, you can setup a test instance with something like the following snippet:

```js
const app = ActivityPubApp.testApp();

app.start();

// ... tests

// cleanup
app.stop();
```

This will configure, start and shutdown a test instance on `http://localhost:3000`.
