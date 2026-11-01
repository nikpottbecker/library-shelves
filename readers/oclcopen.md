# oclcopen

OCLC OPEN "OPAC Portal" on DotNetNuke.

- Search: `POST /Mediensuche/Erweiterte-Suche` with the page's form fields and a media group. The catalog answers with a `searchhash`, which keeps working without a session.
- Lists: `/Mediensuche/Einfache-Suche?searchhash=…&top=y&pagesize=50&page=n`. Size 50 is honoured.
- Availability: one `POST …/SearchService.asmx/GetAvailability` per title, so a full copy costs about one request per title.
- Media groups come from the catalog's menu and differ per library.
- The catalog has no cover images and no genres in its result list. A library's own cover files were missing in the test.

- The form path differs per library: `/Mediensuche/Erweiterte-Suche`, `/Erweiterte-Suche` or `/Suche/…`.
- Availability differs per version: `d.IsAvail` or `d.Avail.Available`.

## Tested (1 Nov 2026)

Plan plus first page worked for Bad Dürkheim, Celle, Geldern, Gescher, Hachenburg, Heidelberg, Lahnstein, Lehrte, Münster Überwasser, Oranienburg, Remscheid, Rendsburg, Rüsselsheim, Wiesbaden and Wittenberg.

Essen fails: its advanced search has no media group menu at the three known paths.
