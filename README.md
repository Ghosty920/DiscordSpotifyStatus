# Discord Spotify Status

Random service to rename you on Discord servers using your current Spotify music.

It uses Spotify's API to fetch what music you're listening to, as well as Discord Selfbot V13 to change your name on server.

## Installation

You must clone the repository first. You can download it with the button a bit above, or run `git clone https://github.com/Ghosty920/DiscordSpotifyStatus`

### Manually with Node.js

1. Have [node.js v24](https://nodejs.org/en/download) installed
2. Run `pnpm install -P --frozen-lockfile` once every update
3. Run `pnpm start` to start it

### With Docker

Idk if you can type stuff in the console in Docker, so at least run it once manually before doing so, just so you have a ready `config.json` file.

Once done, just run `docker compose up -d` to start it in background.

## Updating

```git pull``` !!

## Adding servers

Yeah no way to do it with the console yet.

Open `config.json`, look at the `GUILDS` part and do like below.

```json
"GUILDS": {
    "GUILD_ID": "[[DISPLAY]] - [[TITLE]]",
    "ANOTHER_GUILD_ID": "[[ARTIST]] - [[TITLE]]"
}
```

You can use the following placeholders:
- `[[DISPLAY]]` to use your discord global display name
- `[[TITLE]]` to use the music title
- `[[ARTIST]]` to use the music artist's name
- `[[ALBUM]]` to use the music album name (why would someone use this)