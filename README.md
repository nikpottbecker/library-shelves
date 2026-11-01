# Library Shelves

**Filme und Konsolenspiele deutscher Büchereien auf einem Regal.**
Durchsuche DVDs, Blu-rays und Spiele deiner Stadtbücherei mit Bewertungen, Genres und Verfügbarkeit. Kostenlos, ohne Konto und ohne Tracking.

**[Zur Website](https://nikpottbecker.github.io/library-shelves/)** · [Bücherei vorschlagen](https://github.com/nikpottbecker/library-shelves/issues/new?template=library.yml) · [Mitmachen](#mitmachen)

[![Check](https://github.com/nikpottbecker/library-shelves/actions/workflows/ci.yml/badge.svg)](https://github.com/nikpottbecker/library-shelves/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Warum?

Bücherei-Kataloge sind zum Suchen gebaut, nicht zum Stöbern. Hier siehst du den Filmbestand deiner Bücherei wie in einem Streamingdienst: sortiert nach Bewertung, gefiltert nach Genre und mit einem Klick zum Katalog.

- Suche nach Titel oder Reihe
- Filter nach Genre und „nur verfügbar“
- Bewertungen von IMDb und Poster von TMDB
- Merkliste, die nur in deinem Browser liegt
- Empfehlungen aus deinem Netflix- oder Prime-Video-Verlauf, ausgewertet nur im Browser
- Offene JSON-Daten und [`llms.txt`](https://nikpottbecker.github.io/library-shelves/llms.txt) für KI-Agenten
- Direkter Link zum Titel im Katalog der Bücherei

## Dabei sind

Bad Dürkheim · Celle · Frankfurt · Geldern · Gescher · Hachenburg · Heidelberg · Lahnstein · Lehrte · Mainz · Mannheim · Münster · Oranienburg · Remscheid · Rendsburg · Rüsselsheim · Wiesbaden · Wittenberg

Deine Stadt fehlt? [Schlag sie vor](https://github.com/nikpottbecker/library-shelves/issues/new?template=library.yml).

## Mitmachen

| Du möchtest | So geht's |
|---|---|
| Eine Bücherei melden | [Issue öffnen](https://github.com/nikpottbecker/library-shelves/issues/new?template=library.yml) |
| Eine Bücherei eintragen | `node tools/detect.mjs <Katalog-Link>` ausführen und die Zeile in `libraries.json` ergänzen |
| Ein neues Katalogsystem anbinden | Reader schreiben, siehe [CONTRIBUTING.md](CONTRIBUTING.md) |
| Einen Coding-Agenten einsetzen | [Fertigen Prompt kopieren](prompts/add-library.md) |
| Empfehlungen von deinem KI-Agenten | [Fertigen Prompt kopieren](prompts/recommend.md) |

Unterstützt wird bisher OCLC OPEN (BIBLIOTHECA OPEN). Reader für BIBDIA, LITTERA, aDIS und andere Systeme sind willkommen.

## So funktioniert es

1. Ein **Reader** in `readers/` übersetzt ein Katalogsystem in einheitliche Zeilen.
2. `libraries.json` listet die Büchereien.
3. GitHub Actions liest sie alle drei Tage mit einer Anfrage pro Sekunde und veröffentlicht das Regal.

Fällt eine Bücherei aus, bleibt ihr letzter Stand online. Verbindlich ist immer der Katalog der Bücherei.

## Inspiration und Daten

Inspiriert von [Nomad Library](https://library.nomadovernormal.com), aber kein Projekt von Nomad Library und keiner Bücherei.

Bewertungen und Genres stammen aus den [nicht kommerziellen IMDb-Datensätzen](https://developer.imdb.com/non-commercial-datasets/). Information courtesy of IMDb (https://www.imdb.com). Used with permission. Poster von [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.

Der Code steht unter der [MIT-Lizenz](LICENSE).

---

**English:** Browse the films and console games at German public libraries on one shelf, with ratings, genres and availability. To add a library or a catalog system, see [CONTRIBUTING.md](CONTRIBUTING.md).
