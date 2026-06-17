# 📼 Mixtape

A tool for making real mixtapes — the kind with a beginning, an end, a recipient, and an expiry date. No algorithm, no account, no monthly fee.

[Live demo](#https://flipandspin.vercel.app/create) · [Why we built this](#why-we-built-this) · [Roadmap](#roadmap)

---

## Why we built this

Today, music is being monopolized by big streaming companies that trick us into paying them monthly for math-modeling our tastes, in exchange for global access to any kind of tune or piece of information we might want. But how much of it do we actually need? How much of it, in fact, keeps us from experiencing music in an enjoyable, caring way?

This project is a small, deliberate refusal.

It's a tool for making mixtapes — acting like real ones, with a beginning and an end, given to a specific person, that expires. It's not a source for the algorithm to understand you. It's a space to share care, enjoy music intentionally, and rebuild your connection with it.

We believe the peer-to-peer model is the only way to overthrow monopolies. And if you think closely, that's how we used to shape our music tastes a little earlier than just a decade ago — when a limitation of knowledge made the space for curiosity and exploration to form. That's why we integrated support for your own files, as soon as they're stored anywhere online.

That's why neither Spotify nor Apple Music are integrated in this service. This is not a companion for streaming, or a pretty wrapper for playlists.

## What it is

Flip + Spin lets you build a small, finite collection of tracks — from your own files, the ones available on internet for free or YouTube videos — wrapped as a cassette inside a skeuomorphic cassette player, write a dedication and put the j-card, and send it to one person as a link. 

- No account needed to receive a tape
- No Spotify or Apple Music integration — by design
- No tracking your taste across tapes
- Just a tape, a person, and a deadline

## Features

- **Bring your own files** — use your own audio, stored in a cloud 
- **Youtube Video embeds** — paste a track URL, get a skinnable player
- **Cassette UI** — enjoy sceuomorphic cassette player experience
- **Cover editor** — your own pixel-art j-card insert by image link
- **Drag-to-reorder tracklist** — added usability
- **Dedication note** — a few words printed on the insert, for the one person it's for
- **Share by link or email** — a single UUID link, readable with no login — ressurecting peer-to-peer vibes

## Tech stack

| Layer | Tool |
|---|---|
| Frontend & routing | [SvelteKit](https://kit.svelte.dev/) |
| Database & storage | [Supabase](https://supabase.com/) |
| Scheduled expiry | Supabase `pg_cron` |
| Email delivery | [Resend](https://resend.com/) |
| Hosting & CDN | [Vercel](https://vercel.com/) |

## How it works

1. **Create** — pick your tracks from local files, Bandcamp, or SoundCloud
2. **Design** — skin the cassette, draw a cover, write a dedication
3. **Share** — get a unique link (`/tape/[id]`), send it by email or just paste it somewhere
4. **Listen** — the recipient opens the link, no account required

## [Roadmap](https://github.com/users/lena-mi/projects/5)

- [x] Core stack (SvelteKit + Supabase + Resend + Vercel)
- [x] Local file playback
- [x] Cassette Player UI with spinning reels
- [x] Basic cover support (pixel-art j-card)
- [ ] Drag-to-reorder tracklist
- [x] Dedication note on j-card
- [x] Shareable read-only tape links
- [ ] Auto-expiry sweep

## Contributing

Issues and pull requests are welcome. This is a small project built for a specific feeling — keep that in mind when proposing features. If it starts feeling like a streaming companion, it's probably the wrong direction for this repo.

## License

MIT — see [LICENSE](LICENSE) for details.

---

*No Spotify. No Apple Music. No algorithm. Just a tape, for someone, until it's gone.*
