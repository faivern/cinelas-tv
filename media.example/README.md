# Media library layout

Cinelas TV does not ship any media. You point it at your own library.

Create a `media/` directory (git-ignored) next to this one, or set `MEDIA_PATH`
in `.env` to wherever your library actually lives — on the Pi that is usually the
SSD mount, e.g. `MEDIA_PATH=/media`. The compose stack mounts it read-only into
Jellyfin at `/media`.

Jellyfin matches files against TMDB by name, so follow its naming convention:

```
media/
├── movies/
│   └── Movie Name (2005)/
│       └── Movie Name (2005).mkv
└── tv/
    └── Show Name (2011)/
        └── Season 01/
            └── Show Name S01E01.mkv
```

Flat files (`movies/Movie Name (2005).mkv`) also work, but a folder per title is
more reliable for matching and lets you keep subtitles alongside the video.

After adding files, run a library scan from the Jellyfin admin UI at
`http://<host>:8096`.
