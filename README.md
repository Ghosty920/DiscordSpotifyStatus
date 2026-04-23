# Discord Spotify Status

Random service to rename you on Discord servers using your current Spotify music.

It uses Spotify's API to fetch what music you're listening to, as well as Discord Selfbot V13 to change your name on server.

## Methods

When installing it (guide below), you'll be prompted for 2 methods.

### Method 1: Spotify Developer App

> [!WARNING]
> As of February 2026, all developer apps created require **Spotify Premium**. [Blog article](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
> 
> You can maybe figure something out if a friend has it and is willing to help.

You can create applications to interact with Spotify's API. This project takes advantage of the "Web API" which can be used to find the music you're currently listening to.

### Method 2:

> [!WARNING]
> This method is not allowed by [Spotify Developer Terms](https://developer.spotify.com/terms) and *could* get your account terminated. (really i have no idea if that could happen, but UAYOR)
>
> I'm **not responsible** for your usage of it.

Do you see how your browser or desktop app is able to see the progress of the music, when it's paused, and interact with it, even if you're listening on another device?

Well we take advantage of it to have the same benefits, aka. see what you're listening to.

## Installation

### Manually with Node.js

You must clone the repository first. You can download it with the button a bit above, or run `git clone https://github.com/Ghosty920/DiscordSpotifyStatus`

1. Have [node.js v24](https://nodejs.org/en/download) installed
2. Run `pnpm install -P --frozen-lockfile` once every update
3. Run `pnpm start` to start it

### With Docker

The image is `ghcr.io/ghosty920/discordspotifystatus`

Idk if you can type stuff in the console in Docker, so at least run it once manually before doing so, just so you have a ready `config.json` file.

Once done, just run `docker compose up -d` to start it in background.

You can also clone the repo if you want a pre-made `compose.yml` file. (you'll have to build the image tho)

## Updating

`git pull` !!

`docker pull ghcr.io/ghosty920/discordspotifystatus:` !!

## Adding servers

You can do so using the `add <ID> [format]` command, with ID being the server id. The default format is `[[DISPLAY]] - [[TITLE]]`

Or you can also open `config.json`, and look at the `GUILDS` part, to do like below:

```json
"GUILDS": {
    "GUILD_ID": "[[DISPLAY]] - [[TITLE]]",
    "ANOTHER_GUILD_ID": "[[ARTIST]] - [[TITLE]]"
}
```

You can use the following placeholders:

- `[[DISPLAY]]` to use your discord global display name
- `[[TITLE]]` to use the music title
- `[[ARTIST]]` to use the music artist's name (doesn't work with Method 2)
- `[[ALBUM]]` to use the music album name (why would someone use this)
