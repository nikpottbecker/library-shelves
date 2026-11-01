# Library Shelves

Filme und Spiele öffentlicher Büchereien auf einem durchsuchbaren Regal, inspiriert von [Nomad Library](https://library.nomadovernormal.com). Nomad liest vor allem US-Kataloge. Dieses Projekt ergänzt Kataloge, die dort fehlen, zum Beispiel OCLC OPEN aus dem deutschsprachigen Raum. Es ist kein Projekt von Nomad Library und keiner Bücherei.

**Website:** https://nikpottbecker.github.io/library-shelves/

## So funktioniert es

1. Ein **Reader** in `readers/` übersetzt ein Katalogsystem in einheitliche Zeilen.
2. `libraries.json` listet die Büchereien.
3. GitHub Actions liest sie alle drei Tage mit einer Anfrage pro Sekunde und veröffentlicht das Regal.

Fällt eine Bücherei aus, bleibt ihr letzter Stand online.

Bewertungen und Genres stammen aus den [nicht kommerziellen IMDb-Datensätzen](https://developer.imdb.com/non-commercial-datasets/). Information courtesy of IMDb (https://www.imdb.com). Used with permission. Poster von [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.

## Mitmachen

- **Nur Bücherei melden:** [Issue öffnen](https://github.com/nikpottbecker/library-shelves/issues/new?template=library.yml).
- **System schon vorhanden:** `node tools/detect.mjs <Katalog-Link>` ausführen, die Zeile in `libraries.json` eintragen und Pull Request öffnen.
- **Neues System:** siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

**English:** A shelf of the films and games at public libraries, for catalogs that Nomad Library does not read yet. Add your library to `libraries.json`, or write a reader for its catalog system. See [CONTRIBUTING.md](CONTRIBUTING.md).
