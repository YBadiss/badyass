Lately I have been working a lot on fighting misinformation online, and allowing anyone to access financial services without sacrificing their privacy. Always with a tinge of crypto of course.

While exploring the space, I have come across two extremely noteworthy projects:

- [Community Notes](https://help.x.com/en/using-x/community-notes), Twitter/X’s bet to make the platform more truthful by letting users add important context or correction to any post.
- [TLSNotary](https://tlsnotary.org/), an Ethereum Foundation project that aims at proving any piece of information that was transferred over a TLS channel.

## Bragging rights

One key feature of CNs is that there is no way to connect your Community identity to your Twitter account. Twitter does not provide any API or link between your account handle and your CN identifier.

![Community note account](./images/community-notes.png "New note, who dis?")

While that is great for privacy and guaranteeing better quality notes on X, it also prevents you from bragging about that juicy note you added to Elon’s latest tweet.

Of course screenshots are not enough, so let’s bring in the big TLS guns.

## Digging for data

There is a specific endpoint that returns a JSON like this one when you open your CN profile page:

```bash
curl 'https://twitter.com/i/api/graphql/JSf0I8AZFRLzAuay4E0eZw/BirdwatchFetchAuthenticatedUserProfile...

"data": {
  "authenticated_user_birdwatch_profile": {
    "alias": "disserting-fire-elephant",
    "can_write_notes": true,
    "is_top_writer": false,
    ...
  }
}
```

It is only possible to get this response back from Twitter if you are indeed **disserting-fire-elephant** and are signed in on the platform.

All Twitter endpoints are served over HTTPS — which means any data is transferred over a TLS channel established between you and Twitter’s backend.

The endpoint we called above is no exception, which means we can use TLSNotary to notarise the data and prove our ownership of this unique CN alias!

![Diagram explaining TLS Notary](./images/tls-notary.png "TLSNotary in (very) short")

All we need to do is: run a Verifier, a Prover, call the Twitter endpoint, and link all of them together to generate a signed proof that anyone can verify.

Small yikes.

## Proof of Community Note

TLSNotary is still in heavy development, and as Rust beginner I was not ready to jump in their codebase and do any kind of heavy-lifting.

Luckily for me, their github already has an [example of running such a process with Twitter as the target Server!](https://github.com/tlsnotary/tlsn/tree/dev/tlsn/examples/twitter)

A tiny bit of fiddling later, and we have [a usable script](https://github.com/YBadiss/tlsn/blob/twitter_cn/tlsn/examples/twitter/twitter_cn.rs) that can be invoked using.

```
RUST_LOG=debug,yamux=info cargo run — release — example twitter_cn
```

The output is a proof in the file twitter_cn_proof.json that you can verify visually at https://tlsnotary.github.io/proof_viz/.

![CN proof visualization](./images/cn-proof.png "Oh no everyone knows my CN alias now")

## Not bad, not good

While the proof is achieved, the process is not user friendly at all for now. I had to go dig into my Twitter network requests, find a bunch of secrets, put them in my .env, run some Rust and a local Verifier service…

The TLSNotary team has a lot planned in their roadmap, and hopefully I’ll soon be able to create a simple website to let you mint Community Notes that you wrote directly on an EVM chain for sweet sweet crypto-social cred.
